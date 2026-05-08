package KuHub.modules.gestion_solicitud.repository;

import KuHub.modules.gestion_solicitud.dtos.respose.projection.ResultsMassSolicitationView;
import KuHub.modules.gestion_solicitud.entity.Solicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SolicitudRepository extends JpaRepository<Solicitud, Integer> {


    /**Obtiene las asignaturas que tiene al menos una seccion con el estado ACTIVO y con bloques de horarios asignados o sea
     * reservas de sala para dia semana asigando, para cargar en la pagina de solicitud*/
    @Query(value = """
            SELECT 
                a.nombre_asignatura,
                a.id_asignatura,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id_seccion', s.id_seccion, 
                        'nombre_seccion', s.nombre_seccion,
                        'id_usuario', u.id_usuario,
                        'nombre_docente', CONCAT_WS(' ', 
                            NULLIF(TRIM(u.p_nombre), ''), 
                            NULLIF(TRIM(u.s_nombre), ''), 
                            NULLIF(TRIM(u.app_paterno), ''), 
                            NULLIF(TRIM(u.app_materno), '')
                        ),
                        'cant_inscritos', s.cant_inscritos,
                        'capacidad_max', s.capacidad_max,
                        'horarios', (
                            SELECT json_agg(
                                json_build_object(
                                    'idReservaSala', rs.id_reserva_sala,
                                    'numeroBloque', b.id_bloque,
                                    'horaInicio', to_char(b.hora_inicio, 'HH24:MI:SS'),
                                    'horaFin', to_char(b.hora_fin, 'HH24:MI:SS'),
                                    'diaSemana', rs.dia_semana,
                                    'idSala', sa.id_sala,
                                    'codSala', sa.cod_sala,
                                    'nombreSala', sa.nombre_sala
                                ) ORDER BY rs.dia_semana ASC, b.id_bloque ASC
                            )
                            FROM reserva_sala rs
                            INNER JOIN bloque_horario b ON b.id_bloque = rs.id_bloque
                            INNER JOIN sala sa ON sa.id_sala = rs.id_sala
                            WHERE rs.id_seccion = s.id_seccion 
                              AND rs.activo = true
                              AND sa.activo = true
                        ),
                         'solicitudes', ( 
                             SELECT COALESCE(
                                 json_agg(f.fecha_solicitada),
                                 '[]'::json
                             )
                             FROM (
                                 SELECT DISTINCT fecha_solicitada
                                 FROM solicitud
                                 WHERE id_seccion = s.id_seccion
                                 ORDER BY fecha_solicitada DESC
                             ) f
                         )
                    ) ORDER BY s.nombre_seccion ASC 
                ) AS secciones
            FROM asignatura a
            INNER JOIN seccion s ON s.id_asignatura = a.id_asignatura 
            INNER JOIN docente_seccion ds ON ds.id_seccion = s.id_seccion  
            INNER JOIN usuario u ON u.id_usuario = ds.id_usuario
            WHERE a.activo = true 
              AND s.activo = true
              AND s.estado_seccion = 'ACTIVA'
              AND EXISTS (
                  SELECT 1 
                  FROM reserva_sala rs
                  WHERE rs.id_seccion = s.id_seccion
                  AND rs.activo = true
                  AND s.activo = true
              )
            GROUP BY a.id_asignatura, a.nombre_asignatura
            ORDER BY a.nombre_asignatura ASC
            """, nativeQuery = true)
    List<Object[]> findCourseWithSectionsAndBlocksRaw();

    /**Obtiene los pedidos semana bodega con estado ACTIVO para usarlos en solicitud,
     * muestra todos los productos asignados; los eliminados lógicamente se mostrarán
     * como no disponibles en el frontend.
     * Si idAsignatura es null retorna todos; si tiene valor filtra por asignatura.*/
    @Query(value = """
            SELECT
                r.id_pedido_semana_bodega AS idReceta,          -- [0]
                r.nombre_pedido_semana_bodega AS nombreReceta,   -- [1]
                COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'nombreProducto', p.nombre_producto,
                            'cantProducto', d.cant_producto,
                            'abreviatura', u.abreviatura,
                            'esFraccionario', u.es_fraccionario,
                            'activo', p.activo,
                            'idDetallePedidoSemana', d.id_detalle_pedido_semana,
                            'idProducto', p.id_producto,
                            'idUnidad', u.id_unidad,
                            'observacion', d.observacion
                        )
                    ) FILTER (WHERE d.id_detalle_pedido_semana IS NOT NULL),
                    '[]'::jsonb
                ) AS detallesJson,                               -- [2]
                r.id_semana AS idSemana,                         -- [3]
                r.id_asignatura AS idAsignatura                  -- [4]
            FROM pedido_semana_bodega r
            LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = r.id_pedido_semana_bodega
            LEFT JOIN producto p ON d.id_producto = p.id_producto
            LEFT JOIN unidad_medida u ON u.id_unidad = p.id_unidad
            WHERE r.activo = true
            AND r.estado_pedido = 'ACTIVO'
            AND (:idAsignatura IS NULL OR r.id_asignatura = :idAsignatura)
            GROUP BY r.id_pedido_semana_bodega, r.nombre_pedido_semana_bodega, r.id_semana, r.id_asignatura
            ORDER BY r.nombre_pedido_semana_bodega ASC
            """, nativeQuery = true)
    List<Object[]> findActiveRecipesWithDetailsRaw(@Param("idAsignatura") Integer idAsignatura);

    /**Llama la funcion para crear solicitudes masivas retornado valores de filas insertadas*/
    @Query(value = """
            SELECT 
                total_solicitudes AS totalSolicitudes, 
                total_detalles AS totalDetalles 
            FROM generar_solicitudes_masivas(CAST(:payload AS jsonb))
            """, nativeQuery = true)
    ResultsMassSolicitationView ejecutarSolicitudMasivaRaw(@Param("payload") String payload);


    @Query(value = """
        SELECT
            so.fecha_solicitada,                                                       -- [0]
            COALESCE(rc.nombre_pedido_semana_bodega, 'Sin receta') AS nombre_receta, -- [1]
            so.id_solicitud,                                                           -- [2]
            so.id_pedido_semana_bodega,                                                -- [3]
            so.id_reserva_sala,                                           -- [4]
            so.estado_solicitud,                                          -- [5]
            so.observaciones,                                             -- [6]
           (
               SELECT COALESCE(
                   json_agg(
                       json_build_object(
                           'nombreProducto', p.nombre_producto,
                           'cantidad', ds.cant_producto_solicitud,
                           'unidad', u.nombre_unidad,
                           'observacion', ds.observacion
                       )
                   ),
                   '[]'::json
               )
               FROM detalle_solicitud ds
               JOIN producto p ON p.id_producto = ds.id_producto
               JOIN unidad_medida u ON u.id_unidad = p.id_unidad
               WHERE ds.id_solicitud = so.id_solicitud
           ) AS productos_solicitados,                                    -- [7]
            JSON_BUILD_OBJECT(
                'nombre_asignatura', a.nombre_asignatura,
                'id_asignatura', a.id_asignatura,
                'seccion', JSON_BUILD_OBJECT(
                    'id_seccion', s.id_seccion,
                    'nombre_seccion', s.nombre_seccion,
                    'id_usuario', u.id_usuario,
                    'nombre_docente', CONCAT_WS(' ',
                        NULLIF(TRIM(u.p_nombre), ''),
                        NULLIF(TRIM(u.s_nombre), ''),
                        NULLIF(TRIM(u.app_paterno), ''),
                        NULLIF(TRIM(u.app_materno), '')
                    ),
                    'cant_inscritos', s.cant_inscritos,
                    'capacidad_max', s.capacidad_max,
                    'horarios', (
                        SELECT COALESCE(
                            json_agg(
                                json_build_object(
                                    'numeroBloque', b.id_bloque,
                                    'horaInicio', to_char(b.hora_inicio, 'HH24:MI:SS'),
                                    'horaFin', to_char(b.hora_fin, 'HH24:MI:SS'),
                                    'nombreSala', sa.nombre_sala || '-' || sa.cod_sala
                                ) ORDER BY b.id_bloque ASC
                            ),
                            '[]'::json
                        )
                        FROM reserva_sala rs_detail
                        INNER JOIN reserva_sala rs_ref ON rs_ref.id_reserva_sala = so.id_reserva_sala
                        INNER JOIN bloque_horario b ON b.id_bloque = rs_detail.id_bloque
                        INNER JOIN sala sa ON sa.id_sala = rs_detail.id_sala
                        WHERE rs_detail.id_seccion = rs_ref.id_seccion
                          AND rs_detail.id_sala = rs_ref.id_sala
                          AND rs_detail.dia_semana = rs_ref.dia_semana
                          AND rs_detail.activo = true
                          AND sa.activo = true
                    )
                )
            ) AS asignatura_detalle,                                      -- [8]
            CASE WHEN so.estado_solicitud = 'RECHAZADA'
                 THEN mrs.motivo
                 ELSE NULL
            END AS motivo_rechazo                                         -- [9]
        FROM solicitud so
        LEFT JOIN pedido_semana_bodega rc ON rc.id_pedido_semana_bodega = so.id_pedido_semana_bodega
        LEFT JOIN motivo_rechazo_solicitud mrs ON mrs.id_solicitud = so.id_solicitud
        JOIN seccion s ON s.id_seccion = so.id_seccion
        JOIN asignatura a ON a.id_asignatura = s.id_asignatura
        JOIN docente_seccion dc ON dc.id_seccion = s.id_seccion
        JOIN usuario u ON u.id_usuario = dc.id_usuario
        WHERE so.fecha_solicitada BETWEEN :fechaInicio AND :fechaFin
        ORDER BY so.fecha_solicitada ASC, so.estado_solicitud ASC;
        """, nativeQuery = true)
    List<Object[]> findSolicitationsPerWeekRaw(@Param("fechaInicio") LocalDate fechaInicio, @Param("fechaFin") LocalDate fechaFin);

    /**
     * Rechaza automáticamente las solicitudes PENDIENTES con fecha vencida
     * e inserta el motivo de rechazo correspondiente en un solo paso.
     * Devuelve el número de filas rechazadas.
     */
    @Modifying
    @Query(value = """
        WITH rechazadas AS (
            UPDATE solicitud
            SET estado_solicitud = 'RECHAZADA'::estado_solicitud_type
            WHERE estado_solicitud = 'PENDIENTE'::estado_solicitud_type
              AND fecha_solicitada < CURRENT_DATE
            RETURNING id_solicitud
        )
        INSERT INTO motivo_rechazo_solicitud (id_solicitud, motivo)
        SELECT r.id_solicitud, 'Solicitud rechazada automáticamente: la fecha de la clase ha expirado.'
        FROM rechazadas r
        ON CONFLICT (id_solicitud) DO NOTHING
    """, nativeQuery = true)
    int rechazarSolicitudesVencidas();


    @Modifying
    @Query("UPDATE Solicitud s SET s.estadoSolicitud = :estado WHERE s.idSolicitud IN (:ids)")
    int updateMassiveStateSolicitation(@Param("ids") List<Integer> ids, @Param("estado") Solicitud.EstadoSolicitud estado);

    /** Verifica si alguna de las solicitudes indicadas tiene estado EN_PEDIDO o PROCESADO (inmutables). */
    @Query(value = """
            SELECT EXISTS (
                SELECT 1 FROM solicitud
                WHERE id_solicitud IN (:ids)
                  AND estado_solicitud IN ('EN_PEDIDO', 'PROCESADO')
            )
            """, nativeQuery = true)
    boolean existsByIdSolicitudInAndEstadoInmutable(@Param("ids") List<Integer> ids);



    /**Super consulta nada a declara suerte! !*/
    @Query(value = """
        SELECT 
            sol.id_solicitud,
            sol.fecha_solicitada,
            COALESCE(rec.nombre_pedido_semana_bodega, 'Sin receta') AS nombre_receta,
            sol.observaciones, 
            JSON_BUILD_OBJECT(
                'nombre_asignatura', asig.nombre_asignatura,
                'id_asignatura', asig.id_asignatura,
                'seccion', JSON_BUILD_OBJECT(
                    'id_seccion', sec.id_seccion,
                    'nombre_seccion', sec.nombre_seccion,
                    'id_usuario', usr.id_usuario,
                    'nombre_docente', CONCAT_WS(' ',
                        NULLIF(TRIM(usr.p_nombre), ''),
                        NULLIF(TRIM(usr.s_nombre), ''),
                        NULLIF(TRIM(usr.app_paterno), ''),
                        NULLIF(TRIM(usr.app_materno), '')
                    ),
                    'cant_inscritos', sec.cant_inscritos,
        
                    -- Cantidad de productos asociados a esta solicitud
                    'cant_productos', (
                        SELECT COUNT(ds_count.id_producto)
                        FROM detalle_solicitud ds_count
                        WHERE ds_count.id_solicitud = sol.id_solicitud 
                    ),
        
                    -- Lista de productos de la solicitud
                    'productos_solicitados', (
                        SELECT COALESCE(
                            json_agg(
                                json_build_object(
                                    'nombreProducto', prod.nombre_producto,
                                    'cantidad', det_sol.cant_producto_solicitud,
                                    'unidad_abreviada', uni.abreviatura,
                                    'observacion', det_sol.observacion
                                ) ORDER BY prod.nombre_producto ASC
                            ),
                            '[]'::json
                        )
                        FROM detalle_solicitud det_sol
                        JOIN producto prod ON prod.id_producto = det_sol.id_producto
                        JOIN unidad_medida uni ON uni.id_unidad = prod.id_unidad
                        WHERE det_sol.id_solicitud = sol.id_solicitud 
                    ),
        
                    -- Horarios con lógica de "Huecos e Islas"
                    'horarios', (
                        SELECT COALESCE(
                            (
                                SELECT json_build_object(
                                    'nombreSala', MAX(islas_agrupadas.sala),
                                    'rangoHoras', string_agg(islas_agrupadas.rango, ' / ' ORDER BY min_inicio)
                                )
                                FROM (
                                    SELECT
                                        sala,
                                        MIN(hora_inicio) AS min_inicio,
                                        to_char(MIN(hora_inicio), 'HH24:MI') || ' - ' || to_char(MAX(hora_fin), 'HH24:MI') AS rango
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
                                ) islas_agrupadas
                            ),
                            '{}'::json
                        )
                    )
                )
            ) AS asignatura_detalle
        FROM solicitud sol
        LEFT JOIN pedido_semana_bodega rec ON rec.id_pedido_semana_bodega = sol.id_pedido_semana_bodega
        JOIN seccion sec ON sec.id_seccion = sol.id_seccion
        JOIN asignatura asig ON asig.id_asignatura = sec.id_asignatura
        JOIN docente_seccion doc_sec ON doc_sec.id_seccion = sec.id_seccion
        JOIN usuario usr ON usr.id_usuario = doc_sec.id_usuario
        WHERE sol.fecha_solicitada BETWEEN :fechaInicio AND :fechaFin
          AND sol.estado_solicitud = 'ACEPTADA'
          AND sol.id_solicitud NOT IN (SELECT id_solicitud FROM pedido_solicitud)
        ORDER BY sol.fecha_solicitada ASC;
    """, nativeQuery = true)
    List<Object[]> findSolicitudesParaDashboard(@Param("fechaInicio") LocalDate fechaInicio, @Param("fechaFin") LocalDate fechaFin);


    @Query(value = """
        SELECT COALESCE(
            json_agg(
                json_build_object(
                    'idProducto', agg.id_producto,
                    'nombreProducto', agg.nombre_producto,
                    'cantidadTotal', agg.cantidad_total,
                    'unidad', agg.unidad,
                    'totalSecciones', agg.total_secciones,
                    'detalles', agg.detalles_secciones
                ) ORDER BY agg.nombre_producto ASC
            ),
            '[]'::json
        ) AS json_productos_consolidados
        FROM (
            SELECT\s
                prod.id_producto,
                prod.nombre_producto,
                SUM(det_sol.cant_producto_solicitud) AS cantidad_total,
                uni.nombre_unidad AS unidad,
                COUNT(DISTINCT sol.id_seccion) AS total_secciones,
                -- Sub-arreglo de las solicitudes específicas para este producto
                json_agg(
                    json_build_object(
                        'idSolicitud', sol.id_solicitud,
                        'fechaSolicitada', sol.fecha_solicitada,
                        'nombreSeccion', sec.nombre_seccion,
                        'nombreAsignatura', asig.nombre_asignatura,
                        'nombreDocente', CONCAT_WS(' ', NULLIF(TRIM(usr.p_nombre), ''), NULLIF(TRIM(usr.app_paterno), '')),
                        'cantidad', det_sol.cant_producto_solicitud,
                        'observacion', det_sol.observacion,
                        'alumnos', sec.cant_inscritos,
                        'nombreSala', (
                            SELECT sala.nombre_sala
                            FROM reserva_sala res_sal
                            JOIN sala sala ON sala.id_sala = res_sal.id_sala
                            WHERE res_sal.id_reserva_sala = sol.id_reserva_sala
                            LIMIT 1
                        ),
                        'rangoHoras', (
                            SELECT string_agg(rango, ' / ' ORDER BY min_inicio)
                            FROM (
                                SELECT MIN(hora_inicio) AS min_inicio,
                                       to_char(MIN(hora_inicio), 'HH24:MI') || '-' || to_char(MAX(hora_fin), 'HH24:MI') AS rango
                                FROM (
                                    SELECT bloq.hora_inicio, bloq.hora_fin,
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
                ) AS detalles_secciones
        
            FROM solicitud sol
            JOIN detalle_solicitud det_sol ON det_sol.id_solicitud = sol.id_solicitud 
            JOIN producto prod ON prod.id_producto = det_sol.id_producto
            JOIN unidad_medida uni ON uni.id_unidad = prod.id_unidad
            JOIN seccion sec ON sec.id_seccion = sol.id_seccion
            JOIN asignatura asig ON asig.id_asignatura = sec.id_asignatura
            JOIN docente_seccion doc_sec ON doc_sec.id_seccion = sec.id_seccion
            JOIN usuario usr ON usr.id_usuario = doc_sec.id_usuario
        
            WHERE sol.fecha_solicitada BETWEEN :fechaInicio AND :fechaFin
              AND sol.estado_solicitud = 'ACEPTADA'
              AND sol.id_solicitud NOT IN (SELECT id_solicitud FROM pedido_solicitud)
            GROUP BY prod.id_producto, prod.nombre_producto, uni.nombre_unidad
        ) agg;
        """, nativeQuery = true)
    String findConsolidadoGlobalJson(@Param("fechaInicio") LocalDate fechaInicio, @Param("fechaFin") LocalDate fechaFin);

    /**
     * Obtiene la proyección de abastecimiento consolidada de productos cuyas solicitudes
     * tienen estado EN_PEDIDO, filtradas por rango de fechas (fecha_solicitada).
     * Retorna un único JSON con el arreglo de productos agrupados por categoría y nombre.
     */
    @Query(value = """
        SELECT jsonb_agg(
            jsonb_build_object(
                'idProducto',              p.id_producto,
                'nombreProducto',          p.nombre_producto,
                'nombreUnidad',            um.nombre_unidad,
                'abreviatura',             um.abreviatura,
                'esFraccionario',          um.es_fraccionario,
                'nombreCategoria',         c.nombre_categoria,
                'cantidadTotalSolicitada', sub_total.total_solicitado,
                'idInventario',            inv.id_inventario,
                'stock',                   inv.stock
            ) ORDER BY c.nombre_categoria ASC, p.nombre_producto ASC
        ) AS proyeccion_abastecimiento
        FROM (
            SELECT ds.id_producto,
                   SUM(ds.cant_producto_solicitud) AS total_solicitado
            FROM detalle_solicitud ds
            INNER JOIN solicitud s ON s.id_solicitud = ds.id_solicitud
            WHERE s.estado_solicitud = 'EN_PEDIDO'
              AND s.fecha_solicitada BETWEEN :fechaInicio AND :fechaFin
            GROUP BY ds.id_producto
        ) sub_total
        INNER JOIN producto      p  ON p.id_producto  = sub_total.id_producto AND p.activo = TRUE
        INNER JOIN unidad_medida um ON um.id_unidad    = p.id_unidad
        INNER JOIN categoria     c  ON c.id_categoria  = p.id_categoria
        INNER JOIN inventario    inv ON inv.id_producto = p.id_producto AND inv.activo = TRUE
        """, nativeQuery = true)
    String findProyeccionAbastecimientoJson(@Param("fechaInicio") LocalDate fechaInicio,
                                            @Param("fechaFin") LocalDate fechaFin);

}
