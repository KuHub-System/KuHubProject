package KuHub.modules.gestion_pedido.repository;

import KuHub.modules.gestion_pedido.entity.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

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
                                                'nombreReceta', COALESCE(rec.nombre_receta, 'Sin receta'),
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
                                    LEFT JOIN receta rec ON rec.id_receta = sol.id_receta
                                    WHERE ps3.id_pedido = ped.id_pedido
                                ) AS detalles_solicitudes
                            FROM detalle_pedido dp
                            JOIN producto prod ON prod.id_producto = dp.id_producto
                            JOIN unidad_medida uni ON uni.id_unidad = prod.id_unidad
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
                                    'nombreReceta', COALESCE(rec.nombre_receta, 'Sin receta'),
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
                        LEFT JOIN receta rec ON rec.id_receta = sol.id_receta
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
                                    'stockBodegaTransito', COALESCE(bt.stock, 0),
                                    'stockInventarioPrincipal', COALESCE(inv.stock, 0),
                                    'diferenciaTransito', COALESCE(bt.stock, 0) - dp.cant_producto_pedido,
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
                        LEFT JOIN inventario inv ON inv.id_producto = dp.id_producto AND inv.activo = true
                        LEFT JOIN bodega_transito bt ON bt.id_inventario = inv.id_inventario AND bt.activo = true
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

}
