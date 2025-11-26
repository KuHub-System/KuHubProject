package KuHub.modules.gestion_academica.repository;

import KuHub.modules.gestion_academica.dtos.projection.NumberBlockProjection;
import KuHub.modules.gestion_academica.entity.ReservaSala;
import feign.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReservaSalaRepository extends JpaRepository<ReservaSala, Integer> {

    /**
     * Obtiene la lista de bloques horarios reservados para una sala específica en un día de la semana dado.
     *
     * La consulta:
     * - Selecciona los números de bloque (b.numero_bloque) sin repetir.
     * - Realiza JOIN entre reserva de sala, sala y bloque horario.
     * - Filtra por:
     *      - ID de la sala (`idSala`)
     *      - Sala activa (`s.activo = true`)
     *      - Día de la semana (`r.dia_semana`), casteado al tipo ENUM del backend (`dia_semana_type`)
     *
     * @param idSala     ID de la sala a consultar.
     * @param diaSemana  Día de la semana (string que se castea al tipo enum de la base).
     * @return Lista de bloques horarios reservados (proyección NumberBlockProjection).
     */
    @Query(value = """
        SELECT DISTINCT b.numero_bloque AS bloqueHorarioNumeroBloque
        FROM reserva_sala r
        JOIN sala s ON s.id_sala = r.id_sala
        JOIN bloque_horario b on r.id_bloque = b.id_bloque
            WHERE r.id_sala = :idSala
              AND s.activo = TRUE
              AND r.dia_semana = cast(:diaSemana AS dia_semana_type)
""", nativeQuery = true)
    List<NumberBlockProjection> findDistinctBySalaIdSalaAndSalaActivoTrueAndDiaSemana(
            @Param("idSala") Integer idSala,
            @Param("diaSemana") String diaSemana
    );

    List<ReservaSala> findBySeccion_IdSeccion(Integer idSeccion);


}
