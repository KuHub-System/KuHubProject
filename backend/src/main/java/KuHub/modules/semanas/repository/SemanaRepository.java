package KuHub.modules.semanas.repository;

import KuHub.modules.semanas.entity.Semana;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SemanaRepository extends JpaRepository<Semana, Integer> {

    // Consulta con parámetro dinámico para el año
    @Query(value = "SELECT * FROM semanas " +
                    "WHERE fecha_fin >= CURRENT_DATE " +
                    "AND anio BETWEEN EXTRACT(YEAR FROM CURRENT_DATE) AND :anioFin " +
                    "ORDER BY fecha_inicio ASC",
                    nativeQuery = true)
    List<Semana> findWeekActiveForYear(@Param("anioFin") Integer yearEnd);;
}
