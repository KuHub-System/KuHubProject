package KuHub.modules.gestion_academica.repository;

import KuHub.modules.gestion_solicitud.dtos.proyeccion.WeekIdDescripcionView;
import KuHub.modules.gestion_academica.entity.Semana;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SemanaRepository extends JpaRepository<Semana, Integer> {



    /**
     * Obtiene la lista de años únicos registrados en el sistema.
     * Los ordenamos de forma descendente para que el año más reciente aparezca primero en tu filtro.
     */
    @Query(value =
        "SELECT DISTINCT anio FROM semanas " +
            "WHERE anio >= EXTRACT(YEAR FROM CURRENT_DATE) " +
            "ORDER BY anio ASC",
        nativeQuery = true)
    List<Short> findDistinctAniosFromNow();

    List<Semana> findByAnioOrderByFechaInicioAsc(Short anio);;

    List<Semana> findByAnioAndSemestreOrderByFechaInicioAsc(Short anio, Short semestre);

    @Query(value =
        "SELECT anio, " +
            "JSON_AGG(DISTINCT semestre ORDER BY semestre ASC) AS semestres " +
            "FROM semanas " +
            "GROUP BY anio " +
            "ORDER BY anio ASC",
        nativeQuery = true)
    List<Object[]> findAniosAndSemestresRaw();


    /**Validaciones boleanas*/
    boolean existsBySemestreAndAnio(Short semestre, Short anio);
    boolean existsByFechaInicio(LocalDate fechaInicio);
    // Si quieres ser ultra específico con el nombre (Semana 1, etc)
    boolean existsByNombreSemanaAndSemestreAndAnio(String nombreSemana, Short semestre, Short anio);
    @Query("SELECT COUNT(s) > 0 FROM Semana s " +
            "WHERE (s.fechaInicio <= :fechaFin AND s.fechaFin >= :fechaInicio)")
    boolean existeTraslapeDeFechas(@Param("fechaInicio") LocalDate fechaInicio,
                                   @Param("fechaFin") LocalDate fechaFin);











    // Consulta con parámetro dinámico para el año
    @Query(value = """
            SELECT * FROM semanas 
            WHERE fecha_fin >= CURRENT_DATE 
            AND anio BETWEEN EXTRACT(YEAR FROM CURRENT_DATE) AND :anioFin 
            ORDER BY fecha_inicio ASC
    """, nativeQuery = true)
    List<Semana> findWeekActiveForYear(@Param("anioFin") Integer yearEnd);

    @Query(value = """
            SELECT 
                ID_SEMANA AS ID, 
                NOMBRE_SEMANA || ' - S' || SEMESTRE || ' - '|| ANIO AS ETIQUETA_SEMANA 
            FROM SEMANAS
            ORDER BY ID DESC
            """, nativeQuery = true)
    List<WeekIdDescripcionView> findAllForSelector();
}
