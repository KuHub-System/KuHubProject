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
