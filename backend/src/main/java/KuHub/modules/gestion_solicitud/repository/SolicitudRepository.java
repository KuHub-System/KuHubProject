package KuHub.modules.gestion_solicitud.repository;

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
