package KuHub.modules.gestion_solicitud.repository;

import KuHub.modules.gestion_solicitud.dtos.proyeccion.ManagementSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.ProductoUnidadView;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.SeccionInscritosView;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.SectionAvailabilityView;
import KuHub.modules.gestion_solicitud.entity.Solicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SolicitudRepository extends JpaRepository<Solicitud, Integer> {


    @Query(value = """
        SELECT  
            S.id_solicitud AS idSolicitud,
            CONCAT_WS(' ', U.p_nombre, U.s_nombre, U.app_paterno, U.app_materno) AS nombreProfesor,
            A.nombre_asignatura AS nombreAsignatura,
            S.fecha_solicitada AS fechaSolicitada,  
            CASE 
                WHEN S.id_receta IS NULL THEN 'RECETA NO ASIGNADA' 
                ELSE R.nombre_receta 
            END AS nombreReceta,
            S.estado_solicitud AS estadoSolicitud,
            COALESCE(C.cantidad_productos, 0) AS totalProductos
        FROM solicitud S
        LEFT JOIN semanas SM ON S.fecha_solicitada BETWEEN SM.fecha_inicio AND SM.fecha_fin
        LEFT JOIN receta R ON R.id_receta = S.id_receta 
        JOIN seccion SC ON S.id_seccion = SC.id_seccion
        JOIN asignatura A ON A.id_asignatura = SC.id_asignatura
        JOIN docente_seccion DC ON DC.id_seccion = S.id_seccion 
        JOIN usuario U ON U.id_usuario = DC.id_usuario
        LEFT JOIN (
            SELECT id_solicitud, COUNT(*) AS cantidad_productos
            FROM detalle_solicitud
            GROUP BY id_solicitud
        ) C ON C.id_solicitud = S.id_solicitud
        WHERE 
            (:idDocente IS NULL OR U.id_usuario = :idDocente)
            AND 
            (:idSemana IS NULL OR SM.id_semana = :idSemana)
            AND 
            (:idAsignatura IS NULL OR A.id_asignatura = :idAsignatura)
            AND
            (:estadoSolicitud IS NULL OR S.estado_solicitud = CAST(:estadoSolicitud AS estado_solicitud_type))
        ORDER BY S.fecha_solicitada DESC
    """, nativeQuery = true)
    List<ManagementSolicitationView> findManagementSolicitations(
            @Param("idDocente") Integer idDocente,
            @Param("idSemana") Integer idSemana,
            @Param("idAsignatura") Integer idAsignatura,
            @Param("estadoSolicitud") String estadoSolicitud // Nuevo parámetro
    );

    @Query(value = """
        SELECT DISTINCT
            rs.id_seccion AS id_seccion,
            sc.nombre_seccion AS nombre_seccion,
            rs.dia_semana AS dia_semana,
            
            -- 1. Cálculo de la fecha exacta
            (s.fecha_inicio + CASE rs.dia_semana
                WHEN 'LUNES' THEN 0
                WHEN 'MARTES' THEN 1
                WHEN 'MIERCOLES' THEN 2
                WHEN 'JUEVES' THEN 3
                WHEN 'VIERNES' THEN 4
                WHEN 'SABADO' THEN 5
                WHEN 'DOMINGO' THEN 6
                ELSE 0 END
            ) AS fecha_calculada_solicitud,

            -- 2. Aviso si YA EXISTE una solicitud
            CASE 
                WHEN EXISTS (
                    SELECT 1 
                    FROM solicitud sol 
                    WHERE sol.id_seccion = rs.id_seccion 
                    AND sol.fecha_solicitada = (
                        s.fecha_inicio + CASE rs.dia_semana
                            WHEN 'LUNES' THEN 0
                            WHEN 'MARTES' THEN 1
                            WHEN 'MIERCOLES' THEN 2
                            WHEN 'JUEVES' THEN 3
                            WHEN 'VIERNES' THEN 4
                            WHEN 'SABADO' THEN 5
                            WHEN 'DOMINGO' THEN 6
                            ELSE 0 END
                    )
                ) 
                THEN 'Solicitud previamente registrada' 
                ELSE NULL 
            END AS mensaje_aviso

        FROM reserva_sala rs
        JOIN seccion sc ON sc.id_seccion = rs.id_seccion
        JOIN semanas s ON s.id_semana = :idSemana
        WHERE rs.id_seccion IN (:idsSecciones)
        ORDER BY rs.id_seccion
    """, nativeQuery = true)
    List<SectionAvailabilityView> checkSectionAvailability(
            @Param("idSemana") Integer idSemana,
            @Param("idsSecciones") List<Integer> idsSecciones
    );

    @Query(value = "SELECT id_seccion AS idSeccion, cant_inscritos AS numInscritos " +
            "FROM seccion WHERE id_seccion IN :ids", nativeQuery = true)
    List<SeccionInscritosView> findInscritosByIds(@Param("ids") List<Integer> ids);

    @Query(value = "SELECT id_producto AS idProducto, unidad_medida AS unidadMedida FROM producto WHERE id_producto IN :ids", nativeQuery = true)
    List<ProductoUnidadView> FindUnidadesByIds(@Param("ids") List<Integer> ids);

}
