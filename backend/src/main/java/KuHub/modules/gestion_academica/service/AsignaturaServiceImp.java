package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.dtomodel.*;
import KuHub.modules.gestion_academica.entity.Asignatura;
import KuHub.modules.gestion_academica.entity.AsignaturaProfesorCargo;
import KuHub.modules.gestion_academica.entity.ReservaSala;
import KuHub.modules.gestion_academica.entity.Seccion;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.repository.AsignaturaProfesorCargoRepository;
import KuHub.modules.gestion_academica.repository.AsignaturaRepository;
import KuHub.modules.gestion_usuario.entity.Usuario;
import KuHub.modules.gestion_usuario.service.UsuarioService;
import KuHub.utils.StringUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AsignaturaServiceImp implements AsignaturaService{

    @Autowired
    private AsignaturaRepository asignaturaRepository;

    @Autowired
    private AsignaturaProfesorCargoService asignaturaProfesorCargoService;

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private AsignaturaProfesorCargoRepository asignaturaProfesorCargoRepository;


    private final ObjectMapper objectMapper;

    @Autowired
    public AsignaturaServiceImp(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    @Override
    public Asignatura findById(Integer id) {
        return asignaturaRepository.findById(id).orElseThrow(
                ()-> new GestionAcademicaException("La asignatura con el id: " + id + " no existe")
        );
    }

    @Transactional(readOnly = true)
    @Override
    public Boolean existsByIdAsignatura(Integer id){
        return asignaturaRepository.existsByIdAsignatura(id);
    }

    @Transactional(readOnly = true)
    @Override
    public Boolean existsByIdAsignaturaAndTrue(Integer id){
        return asignaturaRepository.existsByIdAsignaturaAndActivoTrue(id);
    }

    @Transactional(readOnly = true)
    @Override
    public List<Asignatura> findAll() {
        return asignaturaRepository.findAll();
    }

    /** Obtiene todas las asignaturas activas junto con su profesor asignado */
    @Override
    @Transactional(readOnly = true)
    public List<CourserAnswerDTGOD> findAllCourserActiveTrueWithSeccion() {
        log.info("Iniciando búsqueda de todas las asignaturas activas con sus secciones y horarios");

        List<Object[]> rawResults = asignaturaRepository.findAllCourserActiveTrueRaw();
        List<CourserAnswerDTGOD> coursers = new ArrayList<>();

        for (Object[] row : rawResults) {
            try {
                CourserAnswerDTGOD courser = new CourserAnswerDTGOD();

                // Mapeo de campos simples
                courser.setIdAsignatura((Integer) row[0]);
                courser.setCodAsignatura((String) row[1]);
                courser.setNombreAsignatura((String) row[2]);
                courser.setIdCompletoProfesor((Integer) row[3]);
                courser.setNombreProfesor((String) row[4]);
                courser.setDescripcionAsignatura((String) row[5]);

                // Procesamiento del JSON de secciones
                String seccionesJson = (String) row[6];

                if (seccionesJson != null && !seccionesJson.equals("[]")) {
                    // Convertir JSON a lista de mapas
                    List<Map<String, Object>> seccionesMap = objectMapper.readValue(
                            seccionesJson,
                            new TypeReference<List<Map<String, Object>>>() {}
                    );

                    List<SectionAnswerUpdateDTO> secciones = new ArrayList<>();

                    for (Map<String, Object> seccionMap : seccionesMap) {
                        SectionAnswerUpdateDTO seccion = new SectionAnswerUpdateDTO();

                        // Mapeo de campos de sección
                        seccion.setIdSeccion((Integer) seccionMap.get("idSeccion"));
                        seccion.setIdAsignatura((Integer) seccionMap.get("idAsignatura"));
                        seccion.setNombreSeccion((String) seccionMap.get("nombreSeccion"));

                        // Mapeo del enum EstadoSeccion
                        String estadoStr = (String) seccionMap.get("estadoSeccion");
                        if (estadoStr != null) {
                            seccion.setEstadoSeccion(Seccion.EstadoSeccion.valueOf(estadoStr));
                        }

                        seccion.setIdDocente((Integer) seccionMap.get("idDocente"));
                        seccion.setNombreCompletoDocente((String) seccionMap.get("nombreCompletoDocente"));
                        seccion.setCapacidadMaxInscritos((Integer) seccionMap.get("capacidadMaxInscritos"));
                        seccion.setCantInscritos((Integer) seccionMap.get("cantInscritos"));

                        // Procesamiento de bloques horarios
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> bloquesMap = (List<Map<String, Object>>) seccionMap.get("bloquesHorarios");

                        List<BookTImeBlocksRequestDTO> bloques = new ArrayList<>();

                        if (bloquesMap != null) {
                            for (Map<String, Object> bloqueMap : bloquesMap) {
                                BookTImeBlocksRequestDTO bloque = new BookTImeBlocksRequestDTO();

                                bloque.setNumeroBloque((Integer) bloqueMap.get("numeroBloque"));
                                bloque.setHoraInicio((String) bloqueMap.get("horaInicio"));
                                bloque.setHoraFin((String) bloqueMap.get("horaFin"));

                                // Mapeo del enum DiaSemana
                                String diaStr = (String) bloqueMap.get("diaSemana");
                                if (diaStr != null) {
                                    bloque.setDiaSemana(ReservaSala.DiaSemana.valueOf(diaStr));
                                }

                                bloque.setIdSala((Integer) bloqueMap.get("idSala"));
                                bloque.setCodSala((String) bloqueMap.get("codSala"));
                                bloque.setNombreSala((String) bloqueMap.get("nombreSala"));

                                bloques.add(bloque);
                            }
                        }

                        seccion.setBloquesHorarios(bloques);
                        secciones.add(seccion);
                    }

                    courser.setSecciones(secciones);
                } else {
                    courser.setSecciones(new ArrayList<>());
                }

                coursers.add(courser);

            } catch (Exception e) {
                log.error("Error al procesar asignatura: {}", e.getMessage(), e);
                throw new RuntimeException("Error al procesar los datos de asignaturas", e);
            }
        }

        log.info("Se encontraron {} asignaturas activas", coursers.size());
        return coursers;
    }

    @Transactional
    @Override
    public Asignatura save (Asignatura asignatura){

        String parsearCod = StringUtils.normalizeSpaces(asignatura.getCodAsignatura());
        String parsearNombre = StringUtils.capitalizarPalabras(asignatura.getNombreAsignatura());
        if (asignaturaRepository.existsByCodAsignaturaAndActivoIsTrueIgnoreAccents(parsearCod)){
            throw new GestionAcademicaException("Ya existe un codigo de asignatura con el valor: " + parsearCod);
        }
        if (asignaturaRepository.existsByNombreAsignaturaAndCodAsignaturaAndActivoIsTrue(parsearNombre, parsearCod)){
            throw new GestionAcademicaException("Ya existe asignatura con el nombre: " + parsearNombre + " y el codigo: " + parsearCod);
        }

        asignatura.setNombreAsignatura(parsearNombre);
        asignatura.setCodAsignatura(parsearCod);
        asignatura.setActivo(true);
        return asignaturaRepository.save(asignatura);
    }

    /** Método para crear una asignatura con su profesor asignado */
    @Transactional
    @Override
    public CourseCreateDTO createCourse (CourseCreateDTO c){

        /**
         * Verifica si ya existe una asignatura activa con el mismo nombre.
         * La comparación considera mayúsculas/minúsculas y capitaliza las palabras.
         */
        if (asignaturaRepository.existsByNombreAsignaturaAndActivoIsTrue(
                StringUtils.capitalizarPalabras(c.getNombreAsignatura()))
        ) {
            throw new GestionAcademicaException("Ya existe una asignatura con el nombre: " + StringUtils.capitalizarPalabras(c.getNombreAsignatura()));
        }

        /**
         * Verifica si ya existe una asignatura activa con el mismo código.
         * La comparación ignora acentos, mayúsculas/minúsculas, espacios duplicados y símbolos especiales.
         */
        if (asignaturaRepository.existsByCodAsignaturaAndActivoIsTrueIgnoreAccents(
                StringUtils.normalizeSpaces(c.getCodAsignatura())
        )){
            throw new GestionAcademicaException("Ya existe una asignatura con el codigo: " + StringUtils.normalizeSpaces(c.getCodAsignatura()) );
        }

        /** Obtiene el profesor asociado al id proporcionado */
        Usuario usuario = usuarioService.obtenerPorIdEntidad(c.getIdProfesor());

        /** Crea y guarda la asignatura */
        Asignatura asignatura = asignaturaRepository.save(new Asignatura(
                null,
                StringUtils.normalizeSpaces(c.getCodAsignatura()),
                StringUtils.capitalizarPalabras(c.getNombreAsignatura()),
                true,
                c.getDescripcionAsignatura()
        ));

        /** Asigna el profesor a la asignatura */
        asignaturaProfesorCargoRepository.save(new AsignaturaProfesorCargo(
                null,
                asignatura,
                usuario,
                null
        ));

        /** Setea valores formateados en el DTO de retorno */
        c.setNombreProfesor(usuarioService.formatearNombreCompleto(usuario));
        c.setCodAsignatura(StringUtils.normalizeSpaces(c.getCodAsignatura()));
        c.setNombreAsignatura(StringUtils.capitalizarPalabras(c.getNombreAsignatura()));
        return c;
    }

    /**
     * Actualiza una asignatura y su profesor a cargo.
     * - Valida que el profesor exista y tenga rol de profesor (rol 4)
     * - Valida nombre y código sin duplicar existentes activos
     * - Actualiza datos capitalizados / normalizados
     * - Cambia el profesor a cargo si es diferente
     */
    @Transactional
    @Override
    public CourseUpdateDTO updateCourser (CourseUpdateDTO co){
        /** Buscar asignatura por ID */
        Asignatura asignatura = findById(co.getIdAsignatura());

        /** Buscar profesor por ID */
        Usuario profesor = usuarioService.obtenerPorIdEntidad(co.getIdProfesor());

        /** Validar que el usuario tiene rol de profesor (rol 4) */
        if (!profesor.getRol().getIdRol().equals(4)){
            throw new GestionAcademicaException("El usuario con el id: " + co.getIdProfesor() + " no es un profesor");
        }

        /** Obtener el registro profesor–asignatura */
        AsignaturaProfesorCargo apc = asignaturaProfesorCargoService
                .findByAsignaturaProfesorCargoByIdAsignatura(co.getIdAsignatura());

        /** Validar y actualizar nombre de asignatura */
        if(!asignatura.getNombreAsignatura().equals(StringUtils.capitalizarPalabras(co.getNombreAsignatura()))){
            if (asignaturaRepository.existsByNombreAsignaturaAndActivoIsTrue(StringUtils.capitalizarPalabras(co.getNombreAsignatura()))){
                throw new GestionAcademicaException("Ya existe una asignatura con el nombre: " + StringUtils.capitalizarPalabras(co.getNombreAsignatura()));
            }
            asignatura.setNombreAsignatura(StringUtils.capitalizarPalabras(co.getNombreAsignatura()));
        }

        /** Validar y actualizar código de asignatura */
        if(!asignatura.getCodAsignatura().equals(StringUtils.normalizeSpaces(co.getCodAsignatura()))){
            if (asignaturaRepository.existsByCodAsignaturaAndActivoIsTrueIgnoreAccents(StringUtils.normalizeSpaces(co.getCodAsignatura()))){
                throw new GestionAcademicaException("Ya existe una asignatura con el codigo: " + StringUtils.normalizeSpaces(co.getCodAsignatura()));
            }
            asignatura.setCodAsignatura(StringUtils.normalizeSpaces(co.getCodAsignatura()));
        }

        /** Actualizar descripción si cambió */
        if(!asignatura.getDescripcion().equals(co.getDescripcionAsignatura())){
            asignatura.setDescripcion(co.getDescripcionAsignatura());
        }

        /** Guardar asignatura actualizada */
        asignaturaRepository.save(asignatura);

        /** Si el profesor cambió, actualizar la relación y la fecha */
        if (!apc.getUsuario().getIdUsuario().equals(profesor.getIdUsuario())){
            apc.setUsuario(profesor);
            apc.setFechaAsignacion(LocalDateTime.now());
            asignaturaProfesorCargoRepository.save(apc);
        }

        /** Setear valores actualizados para retornar */
        // pendiente co.getNombreCompletoProfesor(usuarioService.formatearNombreCompleto(profesor));
        co.setCodAsignatura(StringUtils.normalizeSpaces(co.getCodAsignatura()));
        co.setNombreAsignatura(StringUtils.capitalizarPalabras(co.getNombreAsignatura()));
        return co;
    }


    @Transactional
    @Override
    public void softDeleteCourse (Integer id){
        Asignatura asignatura = findById(id);
        asignatura.setActivo(false);
        asignaturaRepository.save(asignatura);
    }
}
