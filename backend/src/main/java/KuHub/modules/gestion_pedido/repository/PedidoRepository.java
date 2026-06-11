package KuHub.modules.gestion_pedido.repository;

import KuHub.modules.gestion_pedido.entity.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Integer> {

    // =====================================================
    // CONSULTA 1: Lista de pedidos completos con detalles JSON
    // Envuelto en json_agg → siempre 1 fila con JSON array
    // Retorna: String → deserializar a List<PedidoCompletoJson>
    // =====================================================
    @Query(value = """
        SELECT COALESCE(
            json_agg(
                json_build_object(
                    'idPedido', ped.id_pedido,
                    'fechaInicioPedido', ped.fecha_inicio_pedido,
                    'fechaFinPedido', ped.fecha_fin_pedido,
                    'fechaRegistro', ped.fecha_registro,
                    'estadoPedido', ped.estado_pedido,
        
                    'totalSolicitudes', (
                        SELECT COUNT(*)
                        FROM pedido_solicitud ps
                        WHERE ps.id_pedido = ped.id_pedido
                    ),
        
                    'totalProductos', (
                        SELECT COUNT(*)
                        FROM detalle_pedido dp
                        WHERE dp.id_pedido = ped.id_pedido
                    ),
        
                    'productos', (
                        SELECT COALESCE(
                            json_agg(
                                json_build_object(
                                    'idProducto', agg.id_producto,
                                    'nombreProducto', agg.nombre_producto,
                                    'idCategoria', agg.id_categoria,
                                    'nombreCategoria', agg.nombre_categoria,
                                    'cantidadTotalPedido', agg.cant_producto_pedido,
                                    'unidad', agg.nombre_unidad,
                                    'abreviatura', agg.abreviatura,
                                    'totalSecciones', agg.total_secciones,
                                    'detallesPorSolicitud', agg.detalles_solicitudes
                                ) ORDER BY agg.nombre_producto ASC
                            ),
                            '[]'::json
                        )
                        FROM (
                            SELECT
                                dp.id_producto,
                                prod.nombre_producto,
                                cat.id_categoria,
                                cat.nombre_categoria,
                                dp.cant_producto_pedido,
                                uni.nombre_unidad,
                                uni.abreviatura,
                                (
                                    SELECT COUNT(DISTINCT sol.id_seccion)
                                    FROM pedido_solicitud ps2
                                    JOIN solicitud sol ON sol.id_solicitud = ps2.id_solicitud
                                    JOIN detalle_solicitud ds ON ds.id_solicitud = sol.id_solicitud
                                    WHERE ps2.id_pedido = ped.id_pedido
                                      AND ds.id_producto = dp.id_producto
                                ) AS total_secciones,
                                (
                                    SELECT COALESCE(
                                        json_agg(
                                            json_build_object(
                                                'idSolicitud', sol.id_solicitud,
                                                'fechaSolicitada', sol.fecha_solicitada,
                                                'nombreSeccion', sec.nombre_seccion,
                                                'nombreAsignatura', asig.nombre_asignatura,
                                                'nombreDocente', CONCAT_WS(' ',
                                                    NULLIF(TRIM(usr.p_nombre), ''),
                                                    NULLIF(TRIM(usr.app_paterno), '')
                                                ),
                                                'cantidad', ds.cant_producto_solicitud,
                                                'unidadAbreviada', uni.abreviatura,
                                                'observacion', ds.observacion,
                                                'alumnos', sec.cant_inscritos,
                                                'nombreReceta', COALESCE(rec.nombre_pedido_semana_bodega, 'Sin receta'),
                                                'nombreSala', (
                                                    SELECT sala.nombre_sala || '-' || sala.cod_sala
                                                    FROM reserva_sala res_sal
                                                    JOIN sala sala ON sala.id_sala = res_sal.id_sala
                                                    WHERE res_sal.id_reserva_sala = sol.id_reserva_sala
                                                    LIMIT 1
                                                ),
                                                'rangoHoras', (
                                                    SELECT string_agg(rango, ' / ' ORDER BY min_inicio)
                                                    FROM (
                                                        SELECT
                                                            MIN(hora_inicio) AS min_inicio,
                                                            to_char(MIN(hora_inicio), 'HH24:MI') || '-' ||
                                                            to_char(MAX(hora_fin), 'HH24:MI') AS rango
                                                        FROM (
                                                            SELECT
                                                                bloq.hora_inicio,
                                                                bloq.hora_fin,
                                                                bloq.id_bloque - CAST(ROW_NUMBER() OVER (ORDER BY bloq.id_bloque ASC) AS INT) AS grp
                                                            FROM reserva_sala res_sal
                                                            INNER JOIN reserva_sala rs_ref ON rs_ref.id_reserva_sala = sol.id_reserva_sala
                                                            INNER JOIN bloque_horario bloq ON bloq.id_bloque = res_sal.id_bloque
                                                            WHERE res_sal.id_seccion = rs_ref.id_seccion
                                                              AND res_sal.id_sala = rs_ref.id_sala
                                                              AND res_sal.dia_semana = rs_ref.dia_semana
                                                              AND res_sal.activo = true
                                                        ) islas
                                                        GROUP BY grp
                                                    ) rangos
                                                )
                                            ) ORDER BY sol.fecha_solicitada ASC
                                        ),
                                        '[]'::json
                                    )
                                    FROM pedido_solicitud ps3
                                    JOIN solicitud sol ON sol.id_solicitud = ps3.id_solicitud
                                    JOIN detalle_solicitud ds ON ds.id_solicitud = sol.id_solicitud
                                                             AND ds.id_producto = dp.id_producto
                                    JOIN seccion sec ON sec.id_seccion = sol.id_seccion
                                    JOIN asignatura asig ON asig.id_asignatura = sec.id_asignatura
                                    JOIN docente_seccion doc_sec ON doc_sec.id_seccion = sec.id_seccion
                                    JOIN usuario usr ON usr.id_usuario = doc_sec.id_usuario
                                    LEFT JOIN pedido_semana_bodega rec ON rec.id_pedido_semana_bodega = sol.id_pedido_semana_bodega
                                    WHERE ps3.id_pedido = ped.id_pedido
                                ) AS detalles_solicitudes
                            FROM detalle_pedido dp
                            JOIN producto prod ON prod.id_producto = dp.id_producto
                            JOIN unidad_medida uni ON uni.id_unidad = prod.id_unidad
                            JOIN categoria cat ON cat.id_categoria = prod.id_categoria
                            WHERE dp.id_pedido = ped.id_pedido
                        ) agg
                    ),
        
                    'solicitudesVinculadas', (
                        SELECT COALESCE(
                            json_agg(
                                json_build_object(
                                    'idSolicitud', sol.id_solicitud,
                                    'fechaSolicitada', sol.fecha_solicitada,
                                    'estadoSolicitud', sol.estado_solicitud,
                                    'nombreReceta', COALESCE(rec.nombre_pedido_semana_bodega, 'Sin receta'),
                                    'observaciones', sol.observaciones,
                                    'seccion', json_build_object(
                                        'idSeccion', sec.id_seccion,
                                        'nombreSeccion', sec.nombre_seccion,
                                        'nombreAsignatura', asig.nombre_asignatura,
                                        'nombreDocente', CONCAT_WS(' ',
                                            NULLIF(TRIM(usr.p_nombre), ''),
                                            NULLIF(TRIM(usr.s_nombre), ''),
                                            NULLIF(TRIM(usr.app_paterno), ''),
                                            NULLIF(TRIM(usr.app_materno), '')
                                        ),
                                        'cantInscritos', sec.cant_inscritos
                                    ),
                                    'cantProductos', (
                                        SELECT COUNT(ds.id_producto)
                                        FROM detalle_solicitud ds
                                        WHERE ds.id_solicitud = sol.id_solicitud
                                    ),
                                    'productosSolicitados', (
                                        SELECT COALESCE(
                                            json_agg(
                                                json_build_object(
                                                    'nombreProducto', prod.nombre_producto,
                                                    'cantidad', ds.cant_producto_solicitud,
                                                    'unidadAbreviada', uni_p.abreviatura,
                                                    'observacion', ds.observacion
                                                ) ORDER BY prod.nombre_producto ASC
                                            ),
                                            '[]'::json
                                        )
                                        FROM detalle_solicitud ds
                                        JOIN producto prod ON prod.id_producto = ds.id_producto
                                        JOIN unidad_medida uni_p ON uni_p.id_unidad = prod.id_unidad
                                        WHERE ds.id_solicitud = sol.id_solicitud
                                    ),
                                    'horarios', (
                                        SELECT COALESCE(
                                            (
                                                SELECT json_build_object(
                                                    'nombreSala', MAX(ia.sala),
                                                    'rangoHoras', string_agg(ia.rango, ' / ' ORDER BY min_inicio)
                                                )
                                                FROM (
                                                    SELECT sala,
                                                        MIN(hora_inicio) AS min_inicio,
                                                        to_char(MIN(hora_inicio), 'HH24:MI') || ' - ' ||
                                                        to_char(MAX(hora_fin), 'HH24:MI') AS rango
                                                    FROM (
                                                        SELECT
                                                            sala.nombre_sala || '-' || sala.cod_sala AS sala,
                                                            bloq.hora_inicio,
                                                            bloq.hora_fin,
                                                            bloq.id_bloque - CAST(ROW_NUMBER() OVER (ORDER BY bloq.id_bloque ASC) AS INT) AS grp
                                                        FROM reserva_sala res_sal
                                                        INNER JOIN reserva_sala rs_ref ON rs_ref.id_reserva_sala = sol.id_reserva_sala
                                                        INNER JOIN bloque_horario bloq ON bloq.id_bloque = res_sal.id_bloque
                                                        INNER JOIN sala sala ON sala.id_sala = res_sal.id_sala
                                                        WHERE res_sal.id_seccion = rs_ref.id_seccion
                                                          AND res_sal.id_sala = rs_ref.id_sala
                                                          AND res_sal.dia_semana = rs_ref.dia_semana
                                                          AND res_sal.activo = true
                                                          AND sala.activo = true
                                                    ) islas
                                                    GROUP BY sala, grp
                                                ) ia
                                            ),
                                            '{}'::json
                                        )
                                    )
                                ) ORDER BY sol.fecha_solicitada ASC
                            ),
                            '[]'::json
                        )
                        FROM pedido_solicitud ps
                        JOIN solicitud sol ON sol.id_solicitud = ps.id_solicitud
                        LEFT JOIN pedido_semana_bodega rec ON rec.id_pedido_semana_bodega = sol.id_pedido_semana_bodega
                        JOIN seccion sec ON sec.id_seccion = sol.id_seccion
                        JOIN asignatura asig ON asig.id_asignatura = sec.id_asignatura
                        JOIN docente_seccion doc_sec ON doc_sec.id_seccion = sec.id_seccion
                        JOIN usuario usr ON usr.id_usuario = doc_sec.id_usuario
                        WHERE ps.id_pedido = ped.id_pedido
                    )
                ) ORDER BY ped.id_pedido ASC
            ),
            '[]'::json
        ) AS pedidos_completos_json
        FROM pedido ped
        WHERE ped.fecha_inicio_pedido <= :fechaFin
          AND ped.fecha_fin_pedido >= :fechaInicio
        """, nativeQuery = true)
    String findPedidoConDetallesJson(
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );


    // =====================================================
    // CONSULTA 2: Lista de pedidos con productos consolidados
    // Ya estaba con json_agg → siempre 1 fila
    // Retorna: String → deserializar a List<PedidoResumenListaJson>
    // =====================================================
    @Query(value = """
        SELECT COALESCE(
            json_agg(
                json_build_object(
                    'idPedido', ped.id_pedido,
                    'fechaInicioPedido', ped.fecha_inicio_pedido,
                    'fechaFinPedido', ped.fecha_fin_pedido,
                    'fechaRegistro', ped.fecha_registro,
                    'estadoPedido', ped.estado_pedido,
        
                    'totalSolicitudes', (
                        SELECT COUNT(*)
                        FROM pedido_solicitud ps
                        WHERE ps.id_pedido = ped.id_pedido
                    ),
        
                    'totalProductosDistintos', (
                        SELECT COUNT(*)
                        FROM detalle_pedido dp
                        WHERE dp.id_pedido = ped.id_pedido
                    ),
        
                    'productosConsolidados', (
                        SELECT COALESCE(
                            json_agg(
                                json_build_object(
                                    'idProducto', dp.id_producto,
                                    'nombreProducto', prod.nombre_producto,
                                    'cantidadTotal', dp.cant_producto_pedido,
                                    'unidad', uni.nombre_unidad,
                                    'abreviatura', uni.abreviatura,
                                    'totalSecciones', (
                                        SELECT COUNT(DISTINCT sol.id_seccion)
                                        FROM pedido_solicitud ps2
                                        JOIN solicitud sol ON sol.id_solicitud = ps2.id_solicitud
                                        JOIN detalle_solicitud ds ON ds.id_solicitud = sol.id_solicitud
                                        WHERE ps2.id_pedido = ped.id_pedido
                                          AND ds.id_producto = dp.id_producto
                                    ),
                                    'detalles', (
                                        SELECT COALESCE(
                                            json_agg(
                                                json_build_object(
                                                    'idSolicitud', sol.id_solicitud,
                                                    'fechaSolicitada', sol.fecha_solicitada,
                                                    'nombreSeccion', sec.nombre_seccion,
                                                    'nombreAsignatura', asig.nombre_asignatura,
                                                    'nombreDocente', CONCAT_WS(' ',
                                                        NULLIF(TRIM(usr.p_nombre), ''),
                                                        NULLIF(TRIM(usr.app_paterno), '')
                                                    ),
                                                    'cantidad', ds.cant_producto_solicitud,
                                                    'observacion', ds.observacion,
                                                    'alumnos', sec.cant_inscritos,
                                                    'nombreSala', (
                                                        SELECT sala.nombre_sala
                                                        FROM reserva_sala rs
                                                        JOIN sala sala ON sala.id_sala = rs.id_sala
                                                        WHERE rs.id_reserva_sala = sol.id_reserva_sala
                                                        LIMIT 1
                                                    ),
                                                    'rangoHoras', (
                                                        SELECT string_agg(rango, ' / ' ORDER BY min_inicio)
                                                        FROM (
                                                            SELECT
                                                                MIN(hora_inicio) AS min_inicio,
                                                                to_char(MIN(hora_inicio), 'HH24:MI') || '-' ||
                                                                to_char(MAX(hora_fin), 'HH24:MI') AS rango
                                                            FROM (
                                                                SELECT
                                                                    bloq.hora_inicio,
                                                                    bloq.hora_fin,
                                                                    bloq.id_bloque - CAST(ROW_NUMBER() OVER (ORDER BY bloq.id_bloque ASC) AS INT) AS grp
                                                                FROM reserva_sala res_sal
                                                                INNER JOIN reserva_sala rs_ref ON rs_ref.id_reserva_sala = sol.id_reserva_sala
                                                                INNER JOIN bloque_horario bloq ON bloq.id_bloque = res_sal.id_bloque
                                                                WHERE res_sal.id_seccion = rs_ref.id_seccion
                                                                  AND res_sal.id_sala = rs_ref.id_sala
                                                                  AND res_sal.dia_semana = rs_ref.dia_semana
                                                                  AND res_sal.activo = true
                                                            ) islas
                                                            GROUP BY grp
                                                        ) rangos
                                                    )
                                                ) ORDER BY sol.fecha_solicitada ASC
                                            ),
                                            '[]'::json
                                        )
                                        FROM pedido_solicitud ps3
                                        JOIN solicitud sol ON sol.id_solicitud = ps3.id_solicitud
                                        JOIN detalle_solicitud ds ON ds.id_solicitud = sol.id_solicitud
                                                                 AND ds.id_producto = dp.id_producto
                                        JOIN seccion sec ON sec.id_seccion = sol.id_seccion
                                        JOIN asignatura asig ON asig.id_asignatura = sec.id_asignatura
                                        JOIN docente_seccion doc_sec ON doc_sec.id_seccion = sec.id_seccion
                                        JOIN usuario usr ON usr.id_usuario = doc_sec.id_usuario
                                        WHERE ps3.id_pedido = ped.id_pedido
                                    )
                                ) ORDER BY prod.nombre_producto ASC
                            ),
                            '[]'::json
                        )
                        FROM detalle_pedido dp
                        JOIN producto prod ON prod.id_producto = dp.id_producto
                        JOIN unidad_medida uni ON uni.id_unidad = prod.id_unidad
                        WHERE dp.id_pedido = ped.id_pedido
                    )
                ) ORDER BY ped.fecha_inicio_pedido ASC
            ),
            '[]'::json
        ) AS pedidos_json
        FROM pedido ped
        WHERE ped.fecha_inicio_pedido <= :fechaFin
          AND ped.fecha_fin_pedido >= :fechaInicio
        """, nativeQuery = true)
    String findPedidosPorRangoJson(
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );


    // =====================================================
    // CONSULTA 3: Lista de resúmenes de aprobación con stock
    // Envuelto en json_agg → siempre 1 fila con JSON array
    // Retorna: String → deserializar a List<PedidoAprobacionJson>
    // =====================================================
    @Query(value = """
        SELECT COALESCE(
            json_agg(
                json_build_object(
                    'idPedido', ped.id_pedido,
                    'estadoPedido', ped.estado_pedido,
                    'fechaInicioPedido', ped.fecha_inicio_pedido,
                    'fechaFinPedido', ped.fecha_fin_pedido,
        
                    'productos', (
                        SELECT COALESCE(
                            json_agg(
                                json_build_object(
                                    'idProducto', dp.id_producto,
                                    'nombreProducto', prod.nombre_producto,
                                    'cantidadPedido', dp.cant_producto_pedido,
                                    'unidad', uni.nombre_unidad,
                                    'abreviatura', uni.abreviatura,
                                    'categoria', cat.nombre_categoria,
                                    -- Reservado: stock ya reservado a las solicitudes de ESTE pedido para el producto.
                                    'reservado', COALESCE((
                                        SELECT SUM(rss.cantidad)
                                        FROM reserva_stock_solicitud rss
                                        JOIN pedido_solicitud ps2 ON ps2.id_solicitud = rss.id_solicitud
                                        WHERE ps2.id_pedido = ped.id_pedido
                                          AND rss.id_producto = dp.id_producto
                                          AND rss.activo = TRUE
                                    ), 0),
                                    -- Solicitado al proveedor (firme): OP CONFIRMADA o RECIBIDA del pedido.
                                    'solicitadoFirme', COALESCE((
                                        SELECT SUM(dopf.cantidad_solicitada)
                                        FROM detalle_orden_pedido dopf
                                        JOIN orden_pedido opf ON opf.id_orden_pedido = dopf.id_orden_pedido
                                        WHERE opf.id_pedido = ped.id_pedido
                                          AND dopf.id_producto = dp.id_producto
                                          AND dopf.activo = TRUE
                                          AND opf.activo = TRUE
                                          AND opf.estado_orden_pedido::text IN ('CONFIRMADA', 'RECIBIDA')
                                    ), 0),
                                    -- Solicitado al proveedor (en revisión): OP PENDIENTE o ENVIADA del pedido.
                                    'solicitadoRevision', COALESCE((
                                        SELECT SUM(dopr.cantidad_solicitada)
                                        FROM detalle_orden_pedido dopr
                                        JOIN orden_pedido opr ON opr.id_orden_pedido = dopr.id_orden_pedido
                                        WHERE opr.id_pedido = ped.id_pedido
                                          AND dopr.id_producto = dp.id_producto
                                          AND dopr.activo = TRUE
                                          AND opr.activo = TRUE
                                          AND opr.estado_orden_pedido::text IN ('PENDIENTE', 'ENVIADA')
                                    ), 0),
                                    -- Disponible real = inventario + bodega de tránsito − demanda comprometida − reservas
                                    -- (solicitudes EN_PEDIDO). Puede ser negativo (faltante); el frontend lo limita a 0.
                                    'disponibleReal', COALESCE((
                                        SELECT COALESCE(inv2.stock, 0) + COALESCE(bt2.stock, 0)
                                             - COALESCE((
                                                 SELECT SUM(ds2.cant_producto_solicitud)
                                                 FROM detalle_solicitud ds2
                                                 WHERE ds2.id_producto = dp.id_producto
                                                   AND ds2.id_solicitud IN (
                                                     SELECT dops2.id_solicitud
                                                     FROM detalle_orden_pedido_solicitud dops2
                                                     JOIN detalle_orden_pedido dop2 ON dop2.id_detalle_orden_pedido = dops2.id_detalle_orden_pedido
                                                     JOIN solicitud s2 ON s2.id_solicitud = dops2.id_solicitud
                                                     WHERE dops2.activo = TRUE AND dop2.activo = TRUE AND dop2.entregado = TRUE
                                                       AND dop2.id_producto = dp.id_producto
                                                       AND s2.estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type
                                                   )
                                             ), 0)
                                             - COALESCE((
                                                 SELECT SUM(r2.cantidad)
                                                 FROM reserva_stock_solicitud r2
                                                 JOIN solicitud sr2 ON sr2.id_solicitud = r2.id_solicitud
                                                 WHERE r2.activo = TRUE
                                                   AND r2.id_producto = dp.id_producto
                                                   AND sr2.estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type
                                             ), 0)
                                        FROM inventario inv2
                                        LEFT JOIN bodega_transito bt2 ON bt2.id_inventario = inv2.id_inventario AND bt2.activo = TRUE
                                        WHERE inv2.activo = TRUE AND inv2.id_producto = dp.id_producto
                                        LIMIT 1
                                    ), 0),
                                    'totalSecciones', (
                                        SELECT COUNT(DISTINCT sol.id_seccion)
                                        FROM pedido_solicitud ps
                                        JOIN solicitud sol ON sol.id_solicitud = ps.id_solicitud
                                        JOIN detalle_solicitud ds ON ds.id_solicitud = sol.id_solicitud
                                        WHERE ps.id_pedido = ped.id_pedido
                                          AND ds.id_producto = dp.id_producto
                                    )
                                ) ORDER BY prod.nombre_producto ASC
                            ),
                            '[]'::json
                        )
                        FROM detalle_pedido dp
                        JOIN producto prod ON prod.id_producto = dp.id_producto
                        JOIN unidad_medida uni ON uni.id_unidad = prod.id_unidad
                        JOIN categoria cat ON cat.id_categoria = prod.id_categoria
                        WHERE dp.id_pedido = ped.id_pedido
                    )
                ) ORDER BY ped.id_pedido ASC
            ),
            '[]'::json
        ) AS pedidos_aprobacion_json
        FROM pedido ped
        WHERE ped.fecha_inicio_pedido <= :fechaFin
          AND ped.fecha_fin_pedido >= :fechaInicio
        """, nativeQuery = true)
    String findPedidoResumenAprobacionJson(
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );


    // =====================================================
    // CONSULTA 4: Entregas diarias para Bodega de Tránsito
    // Dos grupos de solicitudes:
    //   1) pedido APROBADO  + solicitud EN_PEDIDO   → habilita btn "Preparar Entrega"
    //   2) pedido APROBADO  + solicitud PROCESADO   → historial (pedido aún en semana activa)
    //   3) pedido ENTREGADO + solicitud PROCESADO   → historial (semana ya finalizada)
    // El frontend distingue acción vs historial por estadoSolicitud (EN_PEDIDO o PROCESADO).
    // Pedido pasa a ENTREGADO automáticamente cuando fecha_fin_pedido < hoy (scheduler + lazy).
    // Incluye stockTransito y diferencia por producto
    // Retorna: String → deserializar a List<EntregaDiariaJson>
    // =====================================================
    @Query(value = """
        SELECT COALESCE(
            json_agg(
                json_build_object(
                    'fecha',            dia.fecha_solicitada,
                    'totalSolicitudes', dia.total_sol,
                    'salas', (
                        SELECT COALESCE(
                            json_agg(
                                json_build_object(
                                    'idSala',    sal.id_sala,
                                    'nombreSala', sal.nombre_sala,
                                    'codSala',   sal.cod_sala,
                                    'solicitudes', (
                                        SELECT COALESCE(
                                            json_agg(
                                                json_build_object(
                                                    'idSolicitud',     sol_e.id_solicitud,
                                                    'estadoSolicitud', sol_e.estado_solicitud,
                                                    'horaInicio',      to_char(bh_e.hora_inicio, 'HH24:MI'),
                                                    'rangoHoras', (
                                                        SELECT string_agg(rango, ' / ' ORDER BY min_inicio)
                                                        FROM (
                                                            SELECT
                                                                MIN(hora_inicio) AS min_inicio,
                                                                to_char(MIN(hora_inicio), 'HH24:MI') || ' - ' ||
                                                                to_char(MAX(hora_fin),    'HH24:MI') AS rango
                                                            FROM (
                                                                SELECT
                                                                    bh_r.hora_inicio,
                                                                    bh_r.hora_fin,
                                                                    bh_r.id_bloque - CAST(ROW_NUMBER() OVER (ORDER BY bh_r.id_bloque ASC) AS INT) AS grp
                                                                FROM reserva_sala rs_r
                                                                INNER JOIN reserva_sala rs_ref
                                                                    ON rs_ref.id_reserva_sala = sol_e.id_reserva_sala
                                                                INNER JOIN bloque_horario bh_r
                                                                    ON bh_r.id_bloque = rs_r.id_bloque
                                                                WHERE rs_r.id_seccion = rs_ref.id_seccion
                                                                  AND rs_r.id_sala    = rs_ref.id_sala
                                                                  AND rs_r.dia_semana = rs_ref.dia_semana
                                                                  AND rs_r.activo     = true
                                                            ) islas_r
                                                            GROUP BY grp
                                                        ) rangos_r
                                                    ),
                                                    'nombreSeccion',    sec_e.nombre_seccion,
                                                    'nombreAsignatura',  asig_e.nombre_asignatura,
                                                    'nombreDocente',    CONCAT_WS(' ',
                                                        NULLIF(TRIM(usr_e.p_nombre),    ''),
                                                        NULLIF(TRIM(usr_e.app_paterno), '')
                                                    ),
                                                    'cantInscritos',  sec_e.cant_inscritos,
                                                    'nombreReceta',   COALESCE(rec_e.nombre_pedido_semana_bodega, 'Sin receta'),
                                                    'observaciones',  sol_e.observaciones,
                                                    'productos', (
                                                        SELECT COALESCE(
                                                            json_agg(
                                                                json_build_object(
                                                                    'idProducto',      prod_e.id_producto,
                                                                    'nombreProducto',  prod_e.nombre_producto,
                                                                    'cantidad',        ds_e.cant_producto_solicitud,
                                                                    'unidadAbreviada', uni_e.abreviatura,
                                                                    'esFraccionario',  uni_e.es_fraccionario,
                                                                    'observacion',     ds_e.observacion,
                                                                    'stockTransito',   COALESCE(bt_e.stock, 0),
                                                                    'diferencia',      COALESCE(bt_e.stock, 0) - ds_e.cant_producto_solicitud
                                                                ) ORDER BY prod_e.nombre_producto ASC
                                                            ),
                                                            '[]'::json
                                                        )
                                                        FROM detalle_solicitud ds_e
                                                        JOIN producto          prod_e ON prod_e.id_producto   = ds_e.id_producto
                                                        JOIN unidad_medida     uni_e  ON uni_e.id_unidad      = prod_e.id_unidad
                                                        LEFT JOIN inventario   inv_e  ON inv_e.id_producto    = prod_e.id_producto AND inv_e.activo = true
                                                        LEFT JOIN bodega_transito bt_e ON bt_e.id_inventario = inv_e.id_inventario AND bt_e.activo = true
                                                        WHERE ds_e.id_solicitud = sol_e.id_solicitud
                                                    )
                                                ) ORDER BY bh_e.hora_inicio ASC
                                            ),
                                            '[]'::json
                                        )
                                        FROM pedido             ped_e
                                        JOIN pedido_solicitud   ps_e   ON ps_e.id_pedido      = ped_e.id_pedido
                                        JOIN solicitud          sol_e  ON sol_e.id_solicitud  = ps_e.id_solicitud
                                        JOIN reserva_sala       rs_e   ON rs_e.id_reserva_sala = sol_e.id_reserva_sala
                                        JOIN bloque_horario     bh_e   ON bh_e.id_bloque      = rs_e.id_bloque
                                        JOIN seccion            sec_e  ON sec_e.id_seccion     = sol_e.id_seccion
                                        JOIN asignatura         asig_e ON asig_e.id_asignatura = sec_e.id_asignatura
                                        JOIN docente_seccion    doc_e  ON doc_e.id_seccion     = sec_e.id_seccion
                                        JOIN usuario            usr_e  ON usr_e.id_usuario     = doc_e.id_usuario
                                        LEFT JOIN pedido_semana_bodega rec_e ON rec_e.id_pedido_semana_bodega = sol_e.id_pedido_semana_bodega
                                        WHERE (
                                                  (ped_e.estado_pedido = 'APROBADO'  AND sol_e.estado_solicitud = 'EN_PEDIDO')
                                               OR (ped_e.estado_pedido IN ('APROBADO', 'ENTREGADO') AND sol_e.estado_solicitud = 'PROCESADO')
                                              )
                                          AND sol_e.id_reserva_sala  IS NOT NULL
                                          AND sol_e.fecha_solicitada = dia.fecha_solicitada
                                          AND rs_e.id_sala           = sal.id_sala
                                    )
                                ) ORDER BY sal.nombre_sala ASC
                            ),
                            '[]'::json
                        )
                        FROM LATERAL (
                            SELECT DISTINCT s.id_sala, s.nombre_sala, s.cod_sala
                            FROM pedido            p_s
                            JOIN pedido_solicitud  ps_s  ON ps_s.id_pedido      = p_s.id_pedido
                            JOIN solicitud         sol_s ON sol_s.id_solicitud  = ps_s.id_solicitud
                            JOIN reserva_sala      rs_s  ON rs_s.id_reserva_sala = sol_s.id_reserva_sala
                            JOIN sala              s     ON s.id_sala            = rs_s.id_sala
                            WHERE (
                                      (p_s.estado_pedido = 'APROBADO'  AND sol_s.estado_solicitud = 'EN_PEDIDO')
                                   OR (p_s.estado_pedido IN ('APROBADO', 'ENTREGADO') AND sol_s.estado_solicitud = 'PROCESADO')
                                  )
                              AND sol_s.id_reserva_sala  IS NOT NULL
                              AND sol_s.fecha_solicitada = dia.fecha_solicitada
                        ) sal
                    )
                ) ORDER BY dia.fecha_solicitada ASC
            ),
            '[]'::json
        ) AS entregas_diarias_json
        FROM (
            SELECT
                sol.fecha_solicitada,
                COUNT(DISTINCT sol.id_solicitud) AS total_sol
            FROM pedido            ped
            JOIN pedido_solicitud  ps  ON ps.id_pedido     = ped.id_pedido
            JOIN solicitud         sol ON sol.id_solicitud = ps.id_solicitud
            WHERE (
                      (ped.estado_pedido = 'APROBADO'  AND sol.estado_solicitud = 'EN_PEDIDO')
                   OR (ped.estado_pedido IN ('APROBADO', 'ENTREGADO') AND sol.estado_solicitud = 'PROCESADO')
                  )
              AND sol.id_reserva_sala  IS NOT NULL
              AND sol.fecha_solicitada BETWEEN :fechaInicio AND :fechaFin
            GROUP BY sol.fecha_solicitada
        ) dia
        """, nativeQuery = true)
    String findEntregasDiariasJson(
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin")   LocalDate fechaFin
    );


    // =====================================================
    // NOTIFICACIONES: pedidos PENDIENTE agrupados por semana académica
    // Retorna [idSemana, nombreSemana, fechaInicio, fechaFin, anio, semestre, cantidadPendientes]
    // =====================================================
    /** Agrupa pedidos con estado PENDIENTE por semana académica (join por rango de fechas del pedido).
     *  Retorna filas [idSemana, nombreSemana, fechaInicio, fechaFin, anio, semestre, cantidadPendientes]. */
    @Query(value = """
            SELECT
                sm.id_semana,              -- [0]
                sm.nombre_semana,          -- [1]
                sm.fecha_inicio,           -- [2]
                sm.fecha_fin,              -- [3]
                sm.anio,                   -- [4]
                sm.semestre,               -- [5]
                COUNT(*) AS cantidad_pendientes  -- [6]
            FROM pedido p
            JOIN semanas sm ON p.fecha_inicio_pedido = sm.fecha_inicio
                           AND p.fecha_fin_pedido    = sm.fecha_fin
            WHERE p.estado_pedido = 'PENDIENTE'::estado_pedido_type
            GROUP BY sm.id_semana, sm.nombre_semana, sm.fecha_inicio, sm.fecha_fin, sm.anio, sm.semestre
            ORDER BY sm.fecha_inicio ASC
            """, nativeQuery = true)
    List<Object[]> findPedidosPendientesPorSemana();

    // =====================================================
    // BÚSQUEDA: pedido activo en rango de fechas de semana
    // Excluye RECHAZADO y ENTREGADO
    // =====================================================
    /** Busca el id del pedido disponible (sin orden vigente) en el rango de fechas dado.
     *  Excluye pedidos RECHAZADO/ENTREGADO y pedidos que ya tienen una orden_pedido
     *  con estado distinto a CANCELADA (PENDIENTE, ENVIADA, CONFIRMADA, RECIBIDA). */
    @Query(value = """
        SELECT p.id_pedido FROM pedido p
        WHERE p.fecha_inicio_pedido = :fechaInicio
          AND p.fecha_fin_pedido    = :fechaFin
          AND p.estado_pedido NOT IN ('RECHAZADO', 'ENTREGADO')
          AND NOT EXISTS (
              SELECT 1 FROM orden_pedido op
              WHERE op.id_pedido = p.id_pedido
                AND op.estado_orden_pedido <> 'CANCELADA'
          )
        LIMIT 1
        """, nativeQuery = true)
    Optional<Integer> findIdPedidoActivoEnRango(@Param("fechaInicio") LocalDate fechaInicio, @Param("fechaFin") LocalDate fechaFin);

    // =====================================================
    // UPDATE MASIVO: cambia el estado de N pedidos a la vez
    // Retorna número de filas afectadas
    // =====================================================
    @Modifying
    @Query(value = """
        UPDATE pedido
        SET estado_pedido = CAST(:estado AS estado_pedido_type)
        WHERE id_pedido IN (:ids)
        """, nativeQuery = true)
    int updateMassiveStatePedido(@Param("ids") List<Integer> ids, @Param("estado") String estado);

    // =====================================================
    // AUTO-ENTREGADO: pedidos APROBADOS cuya fecha_fin_pedido ya pasó
    // Retorna número de filas actualizadas
    // =====================================================
    /** Transiciona a ENTREGADO los pedidos APROBADOS cuya fecha_fin_pedido ya pasó. */
    @Modifying
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Query(value = """
        UPDATE pedido
        SET estado_pedido = 'ENTREGADO'::estado_pedido_type
        WHERE estado_pedido = 'APROBADO'::estado_pedido_type
          AND fecha_fin_pedido < CURRENT_DATE
        """, nativeQuery = true)
    int marcarPedidosEntregadosPorFecha();

    // =====================================================
    // RESUMEN HISTÓRICO: Agregaciones de productos por rango de fechas y estados
    // Usa jsonb_build_object para estructura tipada
    // =====================================================
    /** Obtiene resumen histórico de productos consumidos en pedidos dentro de un rango de fechas y estados. */
    @Query(value = """
        SELECT jsonb_build_object(
            'fechaInicio', CAST(:fechaInicio AS TEXT),
            'fechaFin',    CAST(:fechaFin AS TEXT),
            'estados',     to_jsonb(string_to_array(trim(:estadosCsv), ',')::text[]),

            'totalProductosDistintos', (
                SELECT COUNT(DISTINCT dp.id_producto)
                FROM detalle_pedido dp
                JOIN pedido p ON p.id_pedido = dp.id_pedido
                WHERE p.fecha_inicio_pedido BETWEEN :fechaInicio AND :fechaFin
                  AND p.estado_pedido::text = ANY(string_to_array(trim(:estadosCsv), ',')::text[])
            ),

            'totalPedidos', (
                SELECT COUNT(DISTINCT p.id_pedido)
                FROM pedido p
                WHERE p.fecha_inicio_pedido BETWEEN :fechaInicio AND :fechaFin
                  AND p.estado_pedido::text = ANY(string_to_array(trim(:estadosCsv), ',')::text[])
            ),

            'productos', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'idProducto',      prod.id_producto,
                        'codProducto',     prod.cod_producto,
                        'nombreProducto',  prod.nombre_producto,
                        'unidadMedida',    um.nombre_unidad,
                        'abreviatura',     um.abreviatura,
                        'cantidadTotal',   resumen.cantidad_total
                    )
                    ORDER BY resumen.cantidad_total DESC
                )
                FROM (
                    SELECT
                        dp.id_producto,
                        SUM(dp.cant_producto_pedido)  AS cantidad_total
                    FROM detalle_pedido dp
                    JOIN pedido p ON p.id_pedido = dp.id_pedido
                    WHERE p.fecha_inicio_pedido BETWEEN :fechaInicio AND :fechaFin
                      AND p.estado_pedido::text = ANY(string_to_array(trim(:estadosCsv), ',')::text[])
                    GROUP BY dp.id_producto
                ) resumen
                JOIN producto prod ON prod.id_producto = resumen.id_producto
                LEFT JOIN unidad_medida um ON um.id_unidad = prod.id_unidad
            ), '[]'::jsonb)
        ) AS resultado
        """, nativeQuery = true)
    String obtenerResumenHistoricoJSON(
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin,
            @Param("estadosCsv") String estadosCsv
    );

}
