package KuHub.modules.gestion_academica.repository;

import KuHub.modules.gestion_academica.entity.Asignatura;
import feign.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AsignaturaRepository extends JpaRepository <Asignatura, Integer> {
    Boolean existsByIdAsignatura(Integer id);
    Boolean existsByIdAsignaturaAndActivoTrue(Integer id);

    Boolean existsByNombreAsignaturaAndActivoIsTrue(String nombreAsignatura);
    Boolean existsByNombreAsignaturaAndCodAsignaturaAndActivoIsTrue(String nombreAsignatura, String codAsignatura);
    List<Asignatura> findAllByActivoTrue();

    /**
     * Verifica si existe alguna asignatura activa cuyo código coincida con el dado,
     * ignorando mayúsculas/minúsculas, acentos, espacios múltiples y caracteres especiales.
     * Solo considera asignaturas con activo = TRUE.
     *
     * @param codAsignatura Código de asignatura a validar.
     * @return true si existe una coincidencia, false en caso contrario.
     */
    @Query(
            value = """
        SELECT COUNT(*) > 0
        FROM asignatura a
        WHERE a.activo = TRUE
          AND regexp_replace(
                  public.unaccent(a.cod_asignatura::text),
                  '[^a-zA-Z0-9]+',
                  '',
                  'g'
              )
          ILIKE regexp_replace(
                  public.unaccent(:codAsignatura),
                  '[^a-zA-Z0-9]+',
                  '',
                  'g'
              )
    """,
            nativeQuery = true
    )
    Boolean existsByCodAsignaturaAndActivoIsTrueIgnoreAccents
            (@Param("codAsignatura") String codAsignatura);

    /**
     * Obtiene todas las asignaturas activas junto con su profesor asignado.
     *
     * Esta consulta realiza un JOIN explícito entre la entidad Asignatura y la
     * entidad AsignaturaProfesorCargo para recuperar, en una sola operación,
     * tanto la información de la asignatura como el usuario asociado como profesor.
     *
     * Retorna una lista de arreglos de objetos (Object[]) donde:
     *   - [0] = Asignatura
     *   - [1] = Usuario (profesor a cargo)
     *
     * Se incluyen únicamente las asignaturas cuyo campo "activo" es TRUE.
     */
    @Query("""
    SELECT a, apc.usuario
    FROM Asignatura a
    JOIN AsignaturaProfesorCargo apc ON apc.asignatura.idAsignatura = a.idAsignatura
    WHERE a.activo = true
""")
    List<Object[]> findAllAsignaturasWithProfesor();


    @Query(value = """
        SELECT 
            a.id_asignatura AS idAsignatura,
            a.cod_asignatura AS codAsignatura,
            a.nombre_asignatura AS nombreAsignatura,
            u.id_usuario AS idCompletoProfesor,
            u.p_nombre ||' '|| u.s_nombre ||' '|| u.app_paterno ||' '|| u.app_materno AS nombreProfesor,
            a.descripcion AS descripcionAsignatura,
            COALESCE(
                json_agg(
                    DISTINCT jsonb_build_object(
                        'idSeccion', s.id_seccion,
                        'idAsignatura', s.id_asignatura,
                        'nombreSeccion', s.nombre_seccion,
                        'estadoSeccion', s.estado_seccion,
                        'idDocente', u_docente.id_usuario,
                        'nombreCompletoDocente', u_docente.p_nombre ||' '|| u_docente.s_nombre ||' '|| u_docente.app_paterno ||' '|| u_docente.app_materno,
                        'capacidadMaxInscritos', s.capacidad_max,
                        'cantInscritos', s.cant_inscritos,
                        'bloquesHorarios', COALESCE((
                            SELECT json_agg(
                                json_build_object(
                                    'numeroBloque', b.id_bloque,
                                    'horaInicio', to_char(b.hora_inicio, 'HH24:MI:SS'),
                                    'horaFin', to_char(b.hora_fin, 'HH24:MI:SS'),
                                    'diaSemana', rs.dia_semana,
                                    'idSala', sa.id_sala,
                                    'codSala', sa.cod_sala,
                                    'nombreSala', sa.nombre_sala
                                )
                                ORDER BY b.id_bloque, rs.dia_semana
                            )
                            FROM reserva_sala rs
                            JOIN bloque_horario b ON b.id_bloque = rs.id_bloque
                            JOIN sala sa ON sa.id_sala = rs.id_sala
                            WHERE rs.id_seccion = s.id_seccion
                        ), '[]'::json)
                    )
                ) FILTER (WHERE s.id_seccion IS NOT NULL),
                '[]'::json
            ) AS secciones
        FROM asignatura a
        JOIN asignatura_profesor_cargo apc 
            ON apc.id_asignatura = a.id_asignatura
        JOIN usuario u
            ON u.id_usuario = apc.id_usuario
        LEFT JOIN seccion s
            ON s.id_asignatura = a.id_asignatura
            AND s.activo = TRUE
        LEFT JOIN docente_seccion dc 
            ON dc.id_seccion = s.id_seccion
        LEFT JOIN usuario u_docente
            ON u_docente.id_usuario = dc.id_usuario
        WHERE a.activo = TRUE
        GROUP BY 
            a.id_asignatura,
            a.cod_asignatura,
            a.nombre_asignatura,
            u.id_usuario,
            u.p_nombre,
            u.s_nombre,
            u.app_paterno,
            u.app_materno,
            a.descripcion
        ORDER BY a.id_asignatura
        """, nativeQuery = true)
    List<Object[]> findAllCourserActiveTrueRaw();

    @Query(value = "SELECT a.id_asignatura, a.nombre_asignatura, " +
                    "CAST(JSON_AGG(JSON_BUILD_OBJECT(" +
                    "'idSeccion', s.id_seccion, " +
                    "'nombreSeccion', s.nombre_seccion, " +
                    "'cantInscritos', s.cant_inscritos)) AS TEXT) AS secciones " +
                    "FROM asignatura a " +
                    "JOIN seccion s ON s.id_asignatura = a.id_asignatura " +
                    "WHERE s.activo = TRUE " +
                    "GROUP BY a.id_asignatura, a.nombre_asignatura",
                    nativeQuery = true)
    List<Object[]> findCourserForSolicitation();


}
