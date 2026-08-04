-- =====================================================================================
-- ConexionXD_v3.sql
-- Script incremental — NO reemplaza ni reinicializa ConexionXD_v2.sql.
-- Diseñado para ejecutarse de forma AISLADA contra una base de datos ya existente
-- (dev primero, producción después), sin tocar tablas, tipos ni datos.
-- =====================================================================================

/* ====================================================================================
 * FIX — 2026-07-29
 * FUNCION: generar_solicitudes_masivas
 *
 * BUG: el renombramiento de terminologia "receta" -> "pedido semana a bodega" en la
 * rama desarrolo_2026 cambio los campos del DTO MassiveSolicitation.java
 * (idReceta -> idPedidoSemanaBodega, idDetalleReceta -> idDetallePedidoSemana), pero
 * esta funcion seguia leyendo las llaves JSON viejas ('idReceta', 'idDetalleReceta').
 * Como esas llaves ya no existen en el payload serializado por Jackson,
 * v_id_receta quedaba NULL y el BLOQUE A (base de productos de la plantilla del
 * pedido semanal) nunca matcheaba: la cabecera de `solicitud` se creaba bien, pero
 * `detalle_solicitud` quedaba vacio.
 *
 * FIX: se actualizan las 3 llaves JSON leidas para que coincidan con los campos
 * actuales del DTO, y se renombra la variable interna v_id_receta ->
 * v_id_pedido_semana_bodega por consistencia. Sin cambios de firma ni de tablas.
 *
 * Nota: no se necesita DROP FUNCTION previo — CREATE OR REPLACE reemplaza en el
 * mismo lugar porque la firma identificadora (JSONB, INTEGER) no cambia; los OUT
 * no cuentan para la resolucion de sobrecarga en Postgres.
 * ==================================================================================== */

CREATE OR REPLACE FUNCTION generar_solicitudes_masivas(
    p_payload JSONB,
    p_solicitud_id_existente INTEGER DEFAULT NULL,
    OUT total_solicitudes INTEGER,
    OUT total_detalles INTEGER
)
AS $$
DECLARE
    -- Variables para el Loop Externo (Lista de MassiveSolicitationDTO)
    v_solicitud_masiva JSONB;
    v_id_pedido_semana_bodega INTEGER;
    v_observacion_general TEXT; -- <---(solicitud)

    -- Variables para el Loop Interno (Lista de secciones)
    v_seccion JSONB;
    v_id_seccion INTEGER;
    v_id_usuario INTEGER;
    v_cant_inscritos INTEGER;
    v_fecha_solicitada DATE;
    v_id_reserva_sala INTEGER;
    v_multiplicador NUMERIC(10, 4);

    v_id_solicitud INTEGER;
    v_filas_insertadas INTEGER;
BEGIN
    -- Inicializamos los contadores de salida
    total_solicitudes := 0;
    total_detalles := 0;

    -- =========================================================================
    -- LOOP EXTERNO: Recorremos el Array de MassiveSolicitationDTO
    -- =========================================================================
    FOR v_solicitud_masiva IN SELECT * FROM jsonb_array_elements(p_payload)
    LOOP
        -- Extraemos los datos generales de ESTA asignatura/pedido semana a bodega específica
        v_id_pedido_semana_bodega := (v_solicitud_masiva->>'idPedidoSemanaBodega')::INTEGER;
        -- Extraemos la observación general para toda la solicitud
        v_observacion_general := v_solicitud_masiva->>'observacionesGenerales';

        -- =========================================================================
        -- LOOP INTERNO: Recorremos las secciones de ESTA solicitud masiva
        -- =========================================================================
        FOR v_seccion IN SELECT * FROM jsonb_array_elements(v_solicitud_masiva->'secciones')
        LOOP
            v_id_seccion := (v_seccion->>'idSeccion')::INTEGER;
            v_id_usuario := (v_seccion->>'idUsuario')::INTEGER;
            v_cant_inscritos := (v_seccion->>'cantInscritos')::INTEGER;

            -- Tomamos la fecha del primer horario de esta sección
            v_fecha_solicitada := (v_seccion->'horarios'->0->>'fechaSolicitadaCalculada')::DATE;

            --  Extraemos el id de la reserva del primer horario enviado en el JSON
            v_id_reserva_sala := (v_seccion->'horarios'->0->>'idReservaSala')::INTEGER;

            -- CÁLCULO #1: El Multiplicador
            v_multiplicador := v_cant_inscritos / 20.0;

            -- Insertamos la Cabecera de la Solicitud
            INSERT INTO solicitud (
                id_usuario_gestor_solicitud,
                id_seccion,
                id_pedido_semana_bodega,
                id_reserva_sala,
                fecha_solicitada,
                observaciones,
                estado_solicitud
            ) VALUES (
                v_id_usuario,
                v_id_seccion,
                v_id_pedido_semana_bodega,
                v_id_reserva_sala,
                v_fecha_solicitada,
                v_observacion_general,
                'PENDIENTE'
            ) RETURNING id_solicitud INTO v_id_solicitud;

            -- Sumamos 1 al contador de solicitudes
            total_solicitudes := total_solicitudes + 1;

            -- INSERTAMOS LOS DETALLES (Productos), Filtros, Fracciones y Redondeo
            INSERT INTO detalle_solicitud (
                id_solicitud,
                id_producto,
                cant_producto_solicitud,
                observacion
            )
            SELECT
                v_id_solicitud,
                fp.id_producto,
                -- REDONDEO SEGÚN EL TIPO DE UNIDAD
                CASE
                    WHEN u.es_fraccionario = true THEN
                        (fp.cant_base * v_multiplicador)::NUMERIC(10,3)
                    ELSE
                        CEIL(fp.cant_base * v_multiplicador)::NUMERIC(10,3)
                END,
				fp.observacion --<--- Variable extraída por cada producto
            FROM (
                -- BLOQUE A: Base intacta
                SELECT
					dr.id_producto,
					dr.cant_producto AS cant_base,
					dr.observacion
                FROM detalle_pedido_semana_bodega dr
                WHERE v_id_pedido_semana_bodega IS NOT NULL
                  AND dr.id_pedido_semana_bodega = v_id_pedido_semana_bodega
                  AND NOT EXISTS (
                      SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_solicitud_masiva->'deltas'->'eliminados', '[]'::jsonb)) e
                      WHERE CASE
                          WHEN p_solicitud_id_existente IS NOT NULL THEN
                              EXISTS (
                                  SELECT 1 FROM detalle_solicitud ds
                                  WHERE ds.id_solicitud = p_solicitud_id_existente
                                    AND ds.id_detalle_solicitud = e::INTEGER
                              )
                          ELSE
                              e::INTEGER = dr.id_detalle_pedido_semana
                      END
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM jsonb_array_elements(COALESCE(v_solicitud_masiva->'deltas'->'modificados', '[]'::jsonb)) m
                      WHERE (m->>'idDetallePedidoSemana')::INTEGER = dr.id_detalle_pedido_semana
                  )

                UNION ALL

                -- BLOQUE B: Modificados
                SELECT
					 dr.id_producto,
					(m->>'cantProducto')::NUMERIC AS cant_base,
					 CASE
					   WHEN m->>'observacion' IS NOT NULL THEN m->>'observacion'
					   ELSE dr.observacion
					 END AS observacion
                FROM jsonb_array_elements(COALESCE(v_solicitud_masiva->'deltas'->'modificados', '[]'::jsonb)) m
                JOIN detalle_pedido_semana_bodega dr ON dr.id_detalle_pedido_semana = (m->>'idDetallePedidoSemana')::INTEGER
                WHERE v_id_pedido_semana_bodega IS NOT NULL

                UNION ALL

                -- BLOQUE C: Nuevos
                SELECT
					(n->>'idProducto')::INTEGER,
					(n->>'cantProducto')::NUMERIC AS cant_base,
					 n->>'observacion' AS observacion
                FROM jsonb_array_elements(COALESCE(v_solicitud_masiva->'deltas'->'nuevos', '[]'::jsonb)) n

            ) AS fp
            JOIN producto p ON p.id_producto = fp.id_producto
            JOIN unidad_medida u ON u.id_unidad = p.id_unidad
            WHERE p.activo = true;

            -- Obtenemos cuántos detalles reales se insertaron en este ciclo y sumamos al total
            GET DIAGNOSTICS v_filas_insertadas = ROW_COUNT;
            total_detalles := total_detalles + v_filas_insertadas;

        END LOOP; -- Fin Loop Interno (Secciones)
    END LOOP; -- Fin Loop Externo (Asignaturas/PedidoSemanaBodega)
END;
$$ LANGUAGE plpgsql;

/* ====================================================================================
 * RENOMBRAMIENTO — 2026-08-04
 * MÓDULO: GESTION_SOLICITUDES → GESTION_SOLICITUDES_CONGLOMERADO (codigo_modulo Y nombre_modulo)
 *
 * CONTEXTO: Gestión de Solicitudes y Conglomerado de Pedidos se fusionaron en pestañas
 * dentro de una sola página (frontend/src/pages/gestion-solicitudes.tsx, pestañas
 * "Revisar solicitudes" / "Conglomerado de pedidos"). El codigo_modulo GESTION_SOLICITUDES
 * ya no describe bien esa vista fusionada — se renombra a GESTION_SOLICITUDES_CONGLOMERADO
 * porque la vista puede representar el permiso de una pestaña o la otra. Sembrado
 * originalmente en:
 *   no_tocar/ConexionXD_v2.sql:998   (INSERT INTO modulo ... VALUES, bloque :992-1014)
 *
 * id_modulo NO cambia (es la PK real; codigo_modulo solo tiene UNIQUE), así que los FK de
 * permiso_rol sembrados en ConexionXD_v2.sql para este módulo siguen intactos sin más
 * cambios en esa tabla.
 *
 * Como codigo_modulo es un literal de texto usado fuera de la BD (no solo un id), este
 * rename también se replicó a mano en el resto del stack — si se vuelve a renombrar este
 * módulo en el futuro, actualizar los mismos 4 lugares:
 *   - backend/src/main/java/KuHub/modules/gestion_usuario/service/PermisoRolServiceImpl.java:167
 *   - backend/src/main/java/KuHub/config/security/permission/DynamicPermissionInterceptor.java:138-139
 *   - frontend/src/types/usuario/permissions.types.ts (ModuleKey, MODULE_LABELS, MODULE_ICONS, PAGE_TO_MODULE)
 *   - frontend/src/pages/gestion-usuarios.tsx (MODULE_GROUPS, MODULE_CHILDREN, AGGREGATE_MODULES)
 *
 * Se actualiza solo el nombre del módulo PADRE. Los códigos hijos que ya identifican
 * claramente a qué sección pertenecen NO se renombran (siguen colgando del mismo id_modulo
 * padre, solo cambió su codigo_modulo/nombre_modulo):
 *   - GEST_SOL_GESTIONAR, GEST_SOL_RECHAZAR   → ConexionXD_v2.sql:1361-1362
 *     ("G. Solicitudes · Gestionar Estados" / "G. Solicitudes · Rechazar")
 *   [ACTUALIZACIÓN — ver bloque "FUSIÓN" más abajo: CONGLOMERADO_PEDIDOS ya no existe como
 *   codigo_modulo independiente, se eliminó y sus hijos pasaron a colgar de
 *   GESTION_SOLICITUDES_CONGLOMERADO. Se deja este párrafo tal como se escribió el mismo día
 *   para no reescribir historia — la decisión avanzó en la misma sesión.]
 *   - CONG_VISTA_APROBACION, CONG_VISTA_CRONOGRAMA, CONG_VISTA_TOTALES,
 *     CONG_VISTA_CATEGORIAS                   → ConexionXD_v2.sql:1295-1298
 *   - CONG_APROBAR_PEDIDO, CONG_RECHAZAR_PEDIDO → ConexionXD_v2.sql:1405-1406
 *     (todos con prefijo "Conglom. · ..." — ya autoexplicativos)
 * ==================================================================================== */

UPDATE modulo
SET codigo_modulo = 'GESTION_SOLICITUDES_CONGLOMERADO',
    nombre_modulo = 'Gestión Solicitudes y Conglomerado'
WHERE codigo_modulo = 'GESTION_SOLICITUDES';

/* ====================================================================================
 * FUSIÓN — 2026-08-04
 * MÓDULO ELIMINADO: CONGLOMERADO_PEDIDOS (se fusiona dentro de GESTION_SOLICITUDES_CONGLOMERADO)
 *
 * CONTEXTO: GESTION_SOLICITUDES_CONGLOMERADO pasa a ser el único módulo PADRE de ambas
 * pestañas (Revisar solicitudes / Conglomerado de pedidos). Ya no hace falta un segundo
 * codigo_modulo de página para Conglomerado — sus 6 hijos (CONG_VISTA_APROBACION,
 * CONG_VISTA_CRONOGRAMA, CONG_VISTA_TOTALES, CONG_VISTA_CATEGORIAS, CONG_APROBAR_PEDIDO,
 * CONG_RECHAZAR_PEDIDO) pasan a colgar directamente de GESTION_SOLICITUDES_CONGLOMERADO
 * (ver MODULE_CHILDREN en frontend/src/pages/gestion-usuarios.tsx). Esto es seguro porque
 * los permisos de rol de ambos módulos ya eran IDÉNTICOS antes de este cambio: Administrador
 * y Co-Administrador con CRUD completo, Gestor de Pedidos con Ver/Crear/Editar (sin
 * Eliminar), y el resto de roles sin acceso — ver ConexionXD_v2.sql:1301-1313 (grant
 * compartido GESTION_PEDIDOS/GESTION_SOLICITUDES/CONGLOMERADO_PEDIDOS) y :1409-1436 (grant
 * de CONG_APROBAR_PEDIDO/CONG_RECHAZAR_PEDIDO). No se pierde ninguna combinación rol×acceso
 * al fusionar.
 *
 * Sembrado originalmente en:
 *   no_tocar/ConexionXD_v2.sql:999    (INSERT INTO modulo, bloque :992-1014)
 *   no_tocar/ConexionXD_v2.sql:1301-1313 (permiso_rol compartido con GESTION_PEDIDOS/GESTION_SOLICITUDES)
 *
 * id_modulo de CONGLOMERADO_PEDIDOS se elimina de la tabla `modulo` — hay que borrar primero
 * sus filas de `permiso_rol` porque `permiso_rol.id_modulo` no tiene ON DELETE CASCADE
 * (REFERENCES modulo(id_modulo) simple, ConexionXD_v2.sql:976), así que el DELETE del padre
 * fallaría por violación de FK si se intenta antes.
 *
 * Replicado también en:
 *   - backend/src/main/java/KuHub/config/security/permission/DynamicPermissionInterceptor.java
 *     (líneas 105-106, 143-145 — CONGLOMERADO_PEDIDOS → GESTION_SOLICITUDES_CONGLOMERADO)
 *   - backend/src/main/java/KuHub/modules/gestion_usuario/service/PermisoRolServiceImpl.java:167
 *     (se quita CONGLOMERADO_PEDIDOS del Set — GESTION_SOLICITUDES_CONGLOMERADO ya cubre ese caso)
 *   - frontend/src/types/usuario/permissions.types.ts (ModuleKey, MODULE_LABELS, MODULE_ICONS,
 *     PAGE_TO_MODULE — 'conglomerado-pedidos' ahora también mapea a GESTION_SOLICITUDES_CONGLOMERADO)
 *   - frontend/src/pages/gestion-usuarios.tsx (MODULE_GROUPS, MODULE_CHILDREN, SUBMODULES,
 *     SECTION_HEADERS, AGGREGATE_MODULES)
 *   - frontend/src/__tests__/pages/roles-permisos.test.tsx (RP-09, réplica local del cascade)
 * ==================================================================================== */

-- Guarda de seguridad (informativa, NO bloquea): avisa si algún rol tiene permisos DISTINTOS
-- entre CONGLOMERADO_PEDIDOS y GESTION_SOLICITUDES_CONGLOMERADO en la BD real (no solo en el
-- seed). Ya se detectó y revisó una diferencia conocida el 2026-08-04: ASISTENTE_BODEGA tenía
-- puede_leer=TRUE en GESTION_SOLICITUDES (id_modulo=5) y puede_leer=FALSE en CONGLOMERADO_PEDIDOS
-- (id_modulo=6) — inofensivo, porque el DELETE de abajo solo borra las filas de permiso_rol del
-- id_modulo que se elimina (CONGLOMERADO_PEDIDOS); la fila de GESTION_SOLICITUDES_CONGLOMERADO
-- (ex id_modulo=5, la que sobrevive) nunca se toca, así que ese TRUE no se pierde con la fusión.
-- Se deja como NOTICE (no EXCEPTION) para no bloquear la ejecución del script, pero sigue
-- avisando si aparece una diferencia nueva en el futuro.
DO $$
DECLARE
    v_diff_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_diff_count
    FROM rol r
    LEFT JOIN permiso_rol pr_conglom ON pr_conglom.id_rol = r.id_rol
        AND pr_conglom.id_modulo = (SELECT id_modulo FROM modulo WHERE codigo_modulo = 'CONGLOMERADO_PEDIDOS')
    LEFT JOIN permiso_rol pr_solconglom ON pr_solconglom.id_rol = r.id_rol
        AND pr_solconglom.id_modulo = (SELECT id_modulo FROM modulo WHERE codigo_modulo = 'GESTION_SOLICITUDES_CONGLOMERADO')
    WHERE COALESCE(pr_conglom.puede_leer, FALSE)       IS DISTINCT FROM COALESCE(pr_solconglom.puede_leer, FALSE)
       OR COALESCE(pr_conglom.puede_crear, FALSE)      IS DISTINCT FROM COALESCE(pr_solconglom.puede_crear, FALSE)
       OR COALESCE(pr_conglom.puede_actualizar, FALSE) IS DISTINCT FROM COALESCE(pr_solconglom.puede_actualizar, FALSE)
       OR COALESCE(pr_conglom.puede_eliminar, FALSE)   IS DISTINCT FROM COALESCE(pr_solconglom.puede_eliminar, FALSE);

    IF v_diff_count > 0 THEN
        RAISE NOTICE 'AVISO: % rol(es) tienen permisos distintos entre CONGLOMERADO_PEDIDOS y GESTION_SOLICITUDES_CONGLOMERADO. La fila que sobrevive (GESTION_SOLICITUDES_CONGLOMERADO) no se modifica, así que no se pierde nada de esa fila — solo se descartan los valores de la fila eliminada (CONGLOMERADO_PEDIDOS).', v_diff_count;
    END IF;
END $$;

DELETE FROM permiso_rol
WHERE id_modulo = (SELECT id_modulo FROM modulo WHERE codigo_modulo = 'CONGLOMERADO_PEDIDOS');

DELETE FROM modulo
WHERE codigo_modulo = 'CONGLOMERADO_PEDIDOS';

/* ====================================================================================
 * NUEVO PERMISO — 2026-08-04
 * MÓDULO: GEST_SOL_VISTA ("G. Solicitudes") — hijo de GESTION_SOLICITUDES_CONGLOMERADO
 *
 * CONTEXTO: hasta ahora la pestaña "Revisar solicitudes" no tenía un permiso propio de
 * visibilidad — cualquiera con acceso a la página veía la pestaña, y solo los botones
 * de acción (Gestionar Estados / Rechazar) estaban gateados por GEST_SOL_GESTIONAR /
 * GEST_SOL_RECHAZAR. GEST_SOL_VISTA agrega ese control, con 3 estados (a diferencia de
 * CONG_VISTA_APROBACION que solo tiene 2 — Sin Acceso/Lectura):
 *   - Sin permiso → la pestaña "Revisar solicitudes" no se muestra.
 *   - Lectura     → se ve la pestaña y la lista de solicitudes, pero los botones de
 *                   acción se rigen igual que antes por GEST_SOL_GESTIONAR/RECHAZAR.
 *   - Escritura   → además de ver, actúa como si tuviera GEST_SOL_GESTIONAR concedido
 *                   (aunque ese permiso puntual no esté marcado aparte).
 *
 * Replicado en frontend:
 *   - frontend/src/types/usuario/permissions.types.ts (ModuleKey, MODULE_LABELS, MODULE_ICONS)
 *   - frontend/src/pages/gestion-usuarios.tsx (MODULE_GROUPS, MODULE_CHILDREN, SUBMODULES,
 *     AGGREGATE_MODULES — usa TriStateCell por estar en AGGREGATE_MODULES)
 *   - frontend/src/pages/gestion-solicitudes.tsx (gatea el <Tab key="solicitudes">, y
 *     sol_Gestionar = GEST_SOL_GESTIONAR OR canUpdate(GEST_SOL_VISTA))
 *
 * No requiere cambios en backend: ningún endpoint queda gateado por este código — es un
 * permiso puramente de UI (visibilidad de pestaña), igual que sus hermanos
 * GEST_SOL_GESTIONAR/GEST_SOL_RECHAZAR no gatean rutas del backend directamente (la
 * escritura real de /api/v1/solicitud sigue gobernada por SOLICITUD / GESTION_SOLICITUDES_
 * CONGLOMERADO a nivel de página, ver DynamicPermissionInterceptor.java:138-139).
 * ==================================================================================== */

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES (
    'GEST_SOL_VISTA',
    'G. Solicitudes · Revisar Solicitudes',
    'Controla si la pestaña Revisar Solicitudes se muestra; Escritura equivale a tener Gestionar Estados concedido',
    'lucide:eye',
    82
)
ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo = 'GEST_SOL_VISTA'
  AND m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- GESTOR_PEDIDOS → Escritura sin Eliminar (mismo patrón que GEST_SOL_GESTIONAR/RECHAZAR)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'GESTOR_PEDIDOS' LIMIT 1), m.id_modulo, TRUE, TRUE, TRUE, FALSE
FROM modulo m
WHERE m.codigo_modulo = 'GEST_SOL_VISTA'
  AND m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=FALSE;

-- Resto de roles → sin acceso
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('PROFESOR_A_CARGO', 'DOCENTE', 'ENCARGADO_BODEGA', 'ASISTENTE_BODEGA')
  AND m.codigo_modulo = 'GEST_SOL_VISTA'
  AND m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- Renombramiento — 2026-08-04: si el INSERT de arriba ya corrió con el nombre viejo
-- ("G. Solicitudes"), este UPDATE lo deja en línea con el resto de los hermanos de la
-- pestaña ("G. Solicitudes · Gestionar Estados" / "G. Solicitudes · Rechazar"). Si el
-- INSERT corre por primera vez ya con el nombre nuevo, este UPDATE no encuentra
-- diferencia y no hace nada.
UPDATE modulo
SET nombre_modulo = 'G. Solicitudes · Revisar Solicitudes'
WHERE codigo_modulo = 'GEST_SOL_VISTA';

/* ====================================================================================
 * NUEVO PERMISO — 2026-08-04
 * MÓDULO: CONG_VISTA_PEDIDO ("Conglom. · Conglomerado de Pedidos") — hijo de
 * GESTION_SOLICITUDES_CONGLOMERADO, y a la vez padre de los 6 códigos existentes de la
 * pestaña Conglomerado.
 *
 * CONTEXTO: mismo patrón que GEST_SOL_VISTA (ver bloque "NUEVO PERMISO" más arriba), pero
 * para la pestaña "Conglomerado de pedidos", que hasta ahora tampoco tenía un permiso
 * propio de visibilidad — cualquiera con acceso a la página veía la pestaña, y solo las
 * 4 sub-vistas (CONG_VISTA_APROBACION/CRONOGRAMA/TOTALES/CATEGORIAS) y las 2 acciones
 * (CONG_APROBAR_PEDIDO/CONG_RECHAZAR_PEDIDO) tenían gate propio. 3 estados:
 *   - Sin permiso → la pestaña "Conglomerado de pedidos" no se muestra.
 *   - Lectura     → se ve la pestaña; cada sub-vista sigue rigiéndose de forma
 *                   independiente por su propio CONG_VISTA_* (sin cambios ahí).
 *   - Escritura   → cascada Escritura a los 6 hijos existentes (4 vistas + 2 acciones),
 *                   igual que GEST_SOL_VISTA cascadea a GEST_SOL_GESTIONAR/RECHAZAR.
 *
 * Replicado en frontend:
 *   - frontend/src/types/usuario/permissions.types.ts (ModuleKey, MODULE_LABELS, MODULE_ICONS)
 *   - frontend/src/pages/gestion-usuarios.tsx (MODULE_GROUPS, MODULE_CHILDREN ×2 — como hijo
 *     del padre de la página, y como padre de los 6 códigos de Conglomerado — SUBMODULES,
 *     AGGREGATE_MODULES, SECTION_HEADERS)
 *   - frontend/src/pages/gestion-solicitudes.tsx (gatea el <Tab key="pedido">, y reemplaza
 *     el cálculo de "tiene acceso a Conglomerado" — antes un OR de los 4 CONG_VISTA_* —
 *     por un solo canRead(CONG_VISTA_PEDIDO), igual en sidebar.tsx)
 *
 * No requiere cambios en backend, mismo motivo que GEST_SOL_VISTA: es un permiso puramente
 * de UI, ningún endpoint queda gateado por este código.
 * ==================================================================================== */

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES (
    'CONG_VISTA_PEDIDO',
    'Conglom. · Conglomerado de Pedidos',
    'Controla si la pestaña Conglomerado de Pedidos se muestra; Escritura equivale a tener todas sus vistas y acciones concedidas',
    'lucide:layers',
    83
)
ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo = 'CONG_VISTA_PEDIDO'
  AND m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- GESTOR_PEDIDOS → Escritura sin Eliminar (mismo patrón que CONG_APROBAR_PEDIDO/RECHAZAR_PEDIDO)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'GESTOR_PEDIDOS' LIMIT 1), m.id_modulo, TRUE, TRUE, TRUE, FALSE
FROM modulo m
WHERE m.codigo_modulo = 'CONG_VISTA_PEDIDO'
  AND m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=FALSE;

-- Resto de roles → sin acceso
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('PROFESOR_A_CARGO', 'DOCENTE', 'ENCARGADO_BODEGA', 'ASISTENTE_BODEGA')
  AND m.codigo_modulo = 'CONG_VISTA_PEDIDO'
  AND m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;
