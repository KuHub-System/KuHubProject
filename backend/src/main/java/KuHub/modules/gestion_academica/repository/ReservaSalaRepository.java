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
              AND r.dia_semana::text = :diaSemana
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
          AND rs.dia_semana::text = :diaSemana
          AND rs.id_bloque = :idBloque 
          AND rs.activo = true
    """, nativeQuery = true)
    boolean isOccupiedRoom(
            @Param("idSala") Integer idSala,
            @Param("diaSemana") String diaSemana,
            @Param("idBloque") Integer idBloque
    );













    List<ReservaSala> findBySeccion_IdSeccion(Integer idSeccion);

    /**
     * Obtiene todas las reservas activas como columnas individuales.
     * Ordenado por hora_inicio del bloque para mostrar en orden cronológico.
     * Mapear con ReservaActivaView.fromRow(row).
     */
    @Query(value = """
        SELECT
            a.nombre_asignatura,                 -- [0]
            s.nombre_seccion,                    -- [1]
            sl.nombre_sala,                      -- [2]
            sl.cod_sala,                         -- [3]
            rs.dia_semana::text,                 -- [4]
            bh.numero_bloque,                    -- [5]
            TO_CHAR(bh.hora_inicio, 'HH24:MI'),  -- [6]
            TO_CHAR(bh.hora_fin,    'HH24:MI')   -- [7]
        FROM reserva_sala rs
        JOIN seccion s    ON s.id_seccion    = rs.id_seccion
        JOIN asignatura a ON a.id_asignatura = s.id_asignatura
        JOIN sala sl      ON sl.id_sala      = rs.id_sala
        JOIN bloque_horario bh ON bh.id_bloque = rs.id_bloque
        WHERE rs.activo = TRUE
        ORDER BY bh.hora_inicio ASC
    """, nativeQuery = true)
    List<Object[]> findAllReservasActivasRaw();


}
