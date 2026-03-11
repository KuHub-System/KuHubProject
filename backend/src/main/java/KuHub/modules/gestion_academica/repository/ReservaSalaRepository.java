package KuHub.modules.gestion_academica.repository;

import KuHub.modules.gestion_academica.dtos.request.projection.NumberBlockProjection;
import KuHub.modules.gestion_academica.entity.ReservaSala;
import feign.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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
              AND r.activo = TRUE
              AND r.dia_semana = cast(:diaSemana AS dia_semana_type)
    """, nativeQuery = true)
    List<NumberBlockProjection> findDistinctRersevaActivoTrueBySalaIdSalaAndSalaActivoTrueAndDiaSemana(
            @Param("idSala") Integer idSala,
            @Param("diaSemana") String diaSemana
    );

    /**Desactiva las reservas para el cambios de estado activo=false para tornar los horarios disponibles en el sistema
     * para este dia y sala */
    @Modifying
    @Query("UPDATE ReservaSala rs SET rs.activo = false WHERE rs.idReservaSala IN :ids AND rs.activo = true")
    int deactivateReservationsMass(@Param("ids") List<Integer> ids);



    /** Verificamos si existe una reserva ACTIVA para esa sala, día y bloque*/
    @Query(value = """
        SELECT CASE WHEN COUNT(rs.id_reserva_sala) > 0 THEN true ELSE false END 
        FROM reserva_sala rs 
        WHERE rs.id_sala = :idSala 
          AND rs.dia_semana = CAST(:diaSemana AS dia_semana_type) 
          AND rs.id_bloque = :idBloque 
          AND rs.activo = true
    """, nativeQuery = true)
    boolean isOccupiedRoom(
            @Param("idSala") Integer idSala,
            @Param("diaSemana") String diaSemana,
            @Param("idBloque") Integer idBloque
    );













    List<ReservaSala> findBySeccion_IdSeccion(Integer idSeccion);


}
