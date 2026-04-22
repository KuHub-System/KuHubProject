-- ============================================================
-- NOTA BASE DE DATOS - KuHub v2
-- Tabla: gestion_sistema
-- Descripción: Tabla de configuración global del sistema.
--              Siempre existirán exactamente 2 filas:
--              - id=1: configuración DEFAULT (no se modifica, sirve para restaurar)
--              - id=2: configuración ACTIVA (la que el sistema lee y el usuario modifica)
-- ============================================================

CREATE TABLE IF NOT EXISTS gestion_sistema (
    id                      SERIAL PRIMARY KEY,
    solicitudes_en_pedido   BOOLEAN NOT NULL DEFAULT FALSE,
    descripcion             VARCHAR(255)
);

-- INSERT 1: Configuración predeterminada (NO SE MODIFICA NUNCA)
INSERT INTO gestion_sistema (id, solicitudes_en_pedido, descripcion)
VALUES (1, FALSE, 'Configuración predeterminada del sistema - NO MODIFICAR');

-- INSERT 2: Configuración activa (la que el usuario puede cambiar desde el panel)
INSERT INTO gestion_sistema (id, solicitudes_en_pedido, descripcion)
VALUES (2, FALSE, 'Configuración activa del sistema');

-- ============================================================
-- FUNCIÓN + TRIGGER: Manejo automático de pedidos al aceptar solicitud
-- Cuando solicitudes_en_pedido = TRUE y se acepta una solicitud,
-- se verifica si existe un pedido en el rango de la semana.
-- Si NO existe → se crea el pedido con los productos de la solicitud.
-- Si SÍ existe → se agregan/suman los productos al pedido existente.
-- Finalmente se cambia el estado de la solicitud a 'EN_PEDIDO'.
-- ============================================================

-- Función que maneja la lógica de inserción/actualización de pedido
CREATE OR REPLACE FUNCTION fn_solicitud_a_pedido()
RETURNS TRIGGER AS $$
DECLARE
    v_solicitudes_en_pedido BOOLEAN;
    v_pedido_id             INTEGER;
    v_semana_inicio         DATE;
    v_semana_fin            DATE;
    v_id_semana             INTEGER;
BEGIN
    -- Solo actuar cuando el estado cambia a 'ACEPTADA'
    IF NEW.estado_solicitud <> 'ACEPTADA' OR OLD.estado_solicitud = 'ACEPTADA' THEN
        RETURN NEW;
    END IF;

    -- Leer configuración activa (id=2)
    SELECT solicitudes_en_pedido
    INTO v_solicitudes_en_pedido
    FROM gestion_sistema
    WHERE id = 2;

    -- Si la funcionalidad está desactivada, no hacer nada
    IF v_solicitudes_en_pedido IS FALSE OR v_solicitudes_en_pedido IS NULL THEN
        RETURN NEW;
    END IF;

    -- Obtener la semana asociada a la solicitud (via reserva_sala → semana)
    SELECT s.id_semana, s.fecha_inicio, s.fecha_fin
    INTO v_id_semana, v_semana_inicio, v_semana_fin
    FROM reserva_sala rs
    JOIN semana s ON s.id_semana = rs.id_semana
    WHERE rs.id_reserva_sala = NEW.id_reserva_sala;

    -- Buscar si ya existe un pedido en el rango de esa semana
    SELECT p.id_pedido
    INTO v_pedido_id
    FROM pedido p
    WHERE p.fecha_inicio_semana = v_semana_inicio
      AND p.fecha_fin_semana    = v_semana_fin
      AND p.estado_pedido NOT IN ('Cancelado')
    LIMIT 1;

    -- Si NO existe pedido → crear uno nuevo
    IF v_pedido_id IS NULL THEN
        INSERT INTO pedido (fecha_inicio_semana, fecha_fin_semana, id_semana, estado_pedido)
        VALUES (v_semana_inicio, v_semana_fin, v_id_semana, 'EnCurso')
        RETURNING id_pedido INTO v_pedido_id;
    END IF;

    -- Insertar o sumar productos de la solicitud al pedido
    INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad)
    SELECT
        v_pedido_id,
        ps.id_producto,
        ps.cantidad
    FROM producto_solicitud ps
    WHERE ps.id_solicitud = NEW.id_solicitud
    ON CONFLICT (id_pedido, id_producto)
    DO UPDATE SET cantidad = detalle_pedido.cantidad + EXCLUDED.cantidad;

    -- Cambiar estado de la solicitud a EN_PEDIDO
    NEW.estado_solicitud := 'EN_PEDIDO';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se ejecuta BEFORE UPDATE en solicitud
DROP TRIGGER IF EXISTS trg_solicitud_a_pedido ON solicitud;

CREATE TRIGGER trg_solicitud_a_pedido
    BEFORE UPDATE ON solicitud
    FOR EACH ROW
    EXECUTE FUNCTION fn_solicitud_a_pedido();

-- ============================================================
-- NOTA IMPORTANTE:
-- Los nombres de tablas y columnas (pedido, detalle_pedido,
-- reserva_sala, semana, detalle_solicitud, solicitud) deben
-- coincidir con los nombres reales en la base de datos.
-- ============================================================

-- ============================================================
-- CONSTRAINT: Unicidad de producto por pedido en detalle_pedido
-- Requerida para que el ON CONFLICT del upsert funcione.
-- Ejecutar una sola vez en cada entorno (ya aplicado en dev).
-- ============================================================
ALTER TABLE detalle_pedido
    ADD CONSTRAINT uq_detalle_pedido_pedido_producto UNIQUE (id_pedido, id_producto);
