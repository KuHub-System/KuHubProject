package KuHub.modules.gestion_academica.repository;

import KuHub.modules.gestion_academica.entity.Seccion;
import feign.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeccionRepository extends JpaRepository <Seccion, Integer> {

    /**
     * Comprueba si existe una sección activa para una asignatura activa,
     * aplicando normalización para ignorar mayúsculas/minúsculas, tildes
     * y símbolos (espacios, guiones, etc.).
     *
     * IMPORTANTE:
     * - Esta query usa la función unaccent(); asegúrate de tener la extensión
     *   instalada en la base de datos (CREATE EXTENSION IF NOT EXISTS unaccent;).
     * - Los parámetros esperados son:
     *     :idAsignatura   -> id de la asignatura (Integer)
     *     :nombreSeccion  -> nombre de la sección (String)
     *
     * La lógica es IDENTICA a la consulta SQL original proporcionada:
     *  - comprueba que tanto la asignatura como la sección estén activas (TRUE)
     *  - normaliza nombre_seccion y el parámetro para comparar sin acentos,
     *    sin símbolos y sin distinguir mayúsculas/minúsculas.
     */
    @Query(
            value = """
    SELECT COUNT(*) > 0
    FROM seccion c
    JOIN asignatura a ON c.id_asignatura = a.id_asignatura
        WHERE a.id_asignatura = :idAsignatura
          AND c.activo = TRUE AND a.activo = TRUE
          AND regexp_replace(
                  public.unaccent(c.nombre_seccion::text),
                  '[^a-zA-Z0-9]+',
                  '',
                  'g'
              )
          ILIKE regexp_replace(
                  public.unaccent(:nombreSeccion),
                  '[^a-zA-Z0-9]+',
                  '',
                  'g'
              )
      """,
            nativeQuery = true
    )
    Boolean existsByAsignaturaTrueAndSeccionTrueAndNombreSeccionIlike(
            @Param("idAsignatura") Integer idAsignatura,
            @Param("nombreSeccion") String nombreSeccion
    );



    Boolean existsByIdSeccionAndActivoTrue(Integer idSeccion);
    Optional<Seccion> findByIdSeccionAndActivoTrue(Integer idSeccion);
    List<Seccion> findAllByActivoTrue();


    /**
     * Obtiene una sección con todas sus reservas en bloques horarios
     * usando JSON para agrupar reservas por sección.
     */
    @Query(
            value = """
            SELECT
                s.*,
                u.*,
                json_agg(
                    json_build_object(
                        'numeroBloque', b.numero_bloque,
                        'horaInicio', to_char(b.hora_inicio, 'HH24:MI:SS'),
                        'horaFin', to_char(b.hora_fin, 'HH24:MI:SS'),
                        'diaSemana', r.dia_semana,
                        'idSala', sa.id_sala,
                        'codSala', sa.cod_sala,
                        'nombreSala', sa.nombre_sala
                    )
                ) AS bloques_horarios
            FROM seccion s
            JOIN docente_seccion dc 
                ON dc.id_seccion = s.id_seccion
            JOIN usuario u 
                ON u.id_usuario = dc.id_usuario
            LEFT JOIN reserva_sala r 
                ON r.id_seccion = s.id_seccion
            LEFT JOIN bloque_horario b 
                ON b.id_bloque = r.id_bloque
            LEFT JOIN sala sa 
                ON sa.id_sala = r.id_sala
            WHERE s.id_seccion = :idSeccion
              AND s.activo = TRUE
            GROUP BY s.id_seccion, u.id_usuario
            ORDER BY MIN(b.numero_bloque)
        """,
            nativeQuery = true
    )
    Object findSectionWithReservationsById(@Param("idSeccion") Integer idSeccion);


    /**
     * Obtiene todas las asignaturas con sus secciones y todas las reservas asociadas a cada sección.
     * Esta consulta usa un LEFT JOIN LATERAL para traer todas las reservas, bloques y salas por sección.
     */
    @Query(
            value = """
        SELECT
            a.*,
            s.*,
            rs.*  -- todas las reservas y datos de sala y bloque
        FROM asignatura a
        JOIN seccion s ON s.id_asignatura = a.id_asignatura
        LEFT JOIN LATERAL (
            SELECT 
                r.*,
                b.*,
                sa.* 
            FROM reserva_sala r
            JOIN bloque_horario b ON b.id_bloque = r.id_bloque
            JOIN sala sa ON sa.id_sala = r.id_sala
            WHERE r.id_seccion = s.id_seccion
        ) rs ON TRUE
        WHERE a.activo = TRUE
          AND s.activo = TRUE
        ORDER BY s.id_seccion;
    """,
            nativeQuery = true
    )
    List<Object[]> findAllAsignaturasConSeccionesYReservas();

    Optional<Seccion> findByAsignaturaIdAsignaturaAndActivoTrueAndNombreSeccionIgnoreCase(
            Integer idAsignatura,
            String nombreSeccion
    );
}
