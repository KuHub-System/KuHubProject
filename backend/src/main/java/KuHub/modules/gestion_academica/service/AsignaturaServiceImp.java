package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.dtomodel.*;
import KuHub.modules.gestion_academica.dtos.request.CourseCreateDTO;
import KuHub.modules.gestion_academica.dtos.request.CourseUpdateDTO;
import KuHub.modules.gestion_academica.dtos.response.CourserAnswerDTGOD;
import KuHub.modules.gestion_academica.dtos.response.CourserPageDTGOD;
import KuHub.modules.gestion_academica.dtos.response.SectionAnswerUpdateDTO;
import KuHub.modules.gestion_academica.dtos.response.SectionBlockDTO;
import KuHub.modules.gestion_academica.entity.Asignatura;
import KuHub.modules.gestion_academica.entity.AsignaturaProfesorCargo;
import KuHub.modules.gestion_academica.entity.Seccion;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.repository.AsignaturaProfesorCargoRepository;
import KuHub.modules.gestion_academica.repository.AsignaturaRepository;
import KuHub.modules.gestion_usuario.service.UsuarioService;
import KuHub.utils.PaginationUtils;
import KuHub.utils.StringUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AsignaturaServiceImp implements AsignaturaService{

    @Autowired
    private AsignaturaRepository asignaturaRepository;


    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private AsignaturaProfesorCargoRepository asignaturaProfesorCargoRepository;


    private final ObjectMapper objectMapper;

    @Autowired
    public AsignaturaServiceImp(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }


    /** Obtiene todas las asignaturas activas junto con su profesor asignado */
    @Override
    @Transactional(readOnly = true)
    public CourserPageDTGOD findAllCourserActiveTrueWithSeccion(Integer pageRequested) {
        log.info("Iniciando búsqueda paginada de asignaturas activas con sus secciones y horarios Página solicitada: {}", pageRequested);

        long totalRegistros = asignaturaRepository.countActiveAsignaturas();

        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(pageRequested, totalRegistros);
        log.info("Paginación calculada: Limit {} | Offset {}", paging.limit(), paging.offset());

        List<Object[]> rawResults = asignaturaRepository.findAllCourserActiveTrueRaw(paging.limit(), paging.offset());
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

                        List<SectionBlockDTO> bloques = new ArrayList<>();

                        if (bloquesMap != null) {
                            for (Map<String, Object> bloqueMap : bloquesMap) {
                                SectionBlockDTO bloque = new SectionBlockDTO();
                                bloque.setIdReservaSala((Integer) bloqueMap.get("idReservaSala"));
                                bloque.setNumeroBloque((Integer) bloqueMap.get("numeroBloque"));
                                bloque.setHoraInicio((String) bloqueMap.get("horaInicio"));
                                bloque.setHoraFin((String) bloqueMap.get("horaFin"));

                                // CORRECCIÓN: Asignar el valor recuperado al DTO
                                String diaStr = (String) bloqueMap.get("diaSemana");
                                bloque.setDiaSemana(diaStr);

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

        CourserPageDTGOD pageResponse = new CourserPageDTGOD();
        pageResponse.setContent(coursers);
        pageResponse.setPage(paging.page());
        pageResponse.setLimit(paging.limit());
        pageResponse.setTotalPages(paging.totalPages());
        pageResponse.setTotalElements(totalRegistros);

        log.info("Página {} cargada con {} asignaturas de un total de {}",
                paging.page(), coursers.size(), totalRegistros);

        return pageResponse;
    }

    /** Método para crear una asignatura con su profesor asignado */
    @Transactional
    @Override
    public boolean createCourse (CourseCreateDTO request){

        /**
         * Verifica si ya existe una asignatura activa con el mismo nombre.
         * La comparación considera mayúsculas/minúsculas y capitaliza las palabras.
         */
        String nombreAsignatura = StringUtils.capitalizarPalabras(request.getNombreAsignatura());
        String codAsinatura =StringUtils.normalizeSpaces(request.getCodAsignatura());
        if (asignaturaRepository.existsByNombreAsignaturaAndActivoIsTrue(nombreAsignatura)) {
            throw new GestionAcademicaException("Ya existe una asignatura con el nombre: " + nombreAsignatura
                    , HttpStatus.CONFLICT);
        }

        /**
         * Verifica si ya existe una asignatura activa con el mismo código.
         * La comparación ignora acentos, mayúsculas/minúsculas, espacios duplicados y símbolos especiales.
         */
        if (asignaturaRepository.existsByCodAsignaturaAndActivoIsTrueIgnoreAccents(codAsinatura)){
            throw new GestionAcademicaException("Ya existe una asignatura con el codigo: "+ codAsinatura
                    , HttpStatus.CONFLICT);
        }

        /** Crea y guarda la asignatura */
        Asignatura newCourse = new Asignatura();
        newCourse.setNombreAsignatura(nombreAsignatura);
        newCourse.setCodAsignatura(codAsinatura);

        String descRaw = request.getDescripcionAsignatura();
        if (descRaw != null && !descRaw.trim().isEmpty()) {
            // Normalizamos espacios para eliminar saltos de línea raros o espacios dobles
            newCourse.setDescripcion(StringUtils.normalizeSpaces(descRaw));
        }

        Asignatura savedCourse = asignaturaRepository.save(newCourse);

        /**
         * Asigna el profesor a cargo de la asignatura.
         * REGLA DE NEGOCIO: solo 1 profesor a cargo por asignatura.
         * La tabla asignatura_profesor_cargo es M:M por diseño (escalabilidad futura),
         * pero el servicio restringe la creación a una única asignación por asignatura.
         * La BD refuerza esto con UNIQUE(id_asignatura).
         */
        AsignaturaProfesorCargo newCourserUser = new AsignaturaProfesorCargo();
        newCourserUser.setAsignatura(savedCourse);
        newCourserUser.setIdUsuario(request.getIdUsuarioGestorAsignatura());
        asignaturaProfesorCargoRepository.save(newCourserUser);

        return true;
    }

    /**
     * Actualiza una asignatura y su profesor a cargo.
     * - Valida nombre y código sin duplicar existentes activos
     * - Actualiza datos capitalizados / normalizados
     * - Cambia el profesor a cargo si es diferente
     */
    @Transactional
    @Override
    public boolean updateCourser(CourseUpdateDTO request){

        /**Obtner asignatura anterior para comparar diferencias*/
        Asignatura oldCourse = findById(request.getIdAsignatura());

        /**
         * Si cambio verifica si ya existe una asignatura activa con el mismo nombre.
         * La comparación considera mayúsculas/minúsculas y capitaliza las palabras.
         */
        String nombreAsignatura = StringUtils.capitalizarPalabras(request.getNombreAsignatura());
        String codAsinatura =StringUtils.normalizeSpaces(request.getCodAsignatura());

        if (!oldCourse.getNombreAsignatura().equals(nombreAsignatura)){
            if (asignaturaRepository.existsByNombreAsignaturaAndActivoIsTrue(nombreAsignatura)) {
                throw new GestionAcademicaException("Ya existe una asignatura con el nombre: " + nombreAsignatura
                        , HttpStatus.CONFLICT);
            }
            oldCourse.setNombreAsignatura(nombreAsignatura);
        }
        if (!oldCourse.getCodAsignatura().equals(codAsinatura)){
            if (asignaturaRepository.existsByCodAsignaturaAndActivoIsTrueIgnoreAccents(codAsinatura)){
                throw new GestionAcademicaException("Ya existe una asignatura con el codigo: "+ codAsinatura
                        , HttpStatus.CONFLICT);
            }
            oldCourse.setCodAsignatura(codAsinatura);
        }

        String descRaw = (request.getDescripcionAsignatura() != null) ? request.getDescripcionAsignatura().trim() : "";
        if (!Objects.equals(oldCourse.getDescripcion(), descRaw)) {
            oldCourse.setDescripcion(descRaw);
        }

        /**
         * Obtener la asignación actual profesor–asignatura y actualizar si cambió.
         * REGLA DE NEGOCIO: 1 solo profesor a cargo por asignatura (M:M en BD, 1:1 en negocio).
         * Se actualiza el registro existente en lugar de crear uno nuevo para mantener
         * la restricción UNIQUE(id_asignatura) de la BD y el historial de la asignación.
         */
        AsignaturaProfesorCargo apc = asignaturaProfesorCargoRepository
            .findByAsignatura_IdAsignatura(request.getIdAsignatura())
            .orElseThrow(() -> new GestionAcademicaException("Relación asignatura-profesor no encontrada", HttpStatus.NOT_FOUND));

        /**Guardar cambios*/
        asignaturaRepository.save(oldCourse);

        if (!request.getIdUsuarioGestorAsignatura().equals(apc.getUsuario().getIdUsuario())){
            apc.setIdUsuario(request.getIdUsuarioGestorAsignatura());
            apc.setFechaAsignacion(LocalDateTime.now());
            asignaturaProfesorCargoRepository.save(apc);
        }

        return true;
    }


    @Transactional
    @Override
    public boolean softDeleteCourse(Integer id) {
        // Ejecutamos la query directa de actualización
        int rowsAffected = asignaturaRepository.softDeleteAsignaturaById(id);

        if (rowsAffected == 0) {
            throw new GestionAcademicaException(
                "Error al eliminar: No se encontró la asignatura con ID " + id,
                HttpStatus.NOT_FOUND
            );
        }
        return true;
    }












    @Transactional(readOnly = true)
    @Override
    public Asignatura findById(Integer id) {
        return asignaturaRepository.findById(id).orElseThrow(
                ()-> new GestionAcademicaException("La asignatura con el id: " + id + " no existe" , HttpStatus.NOT_FOUND)
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



    @Override
    @Transactional(readOnly = true)
    public List<CourseSolicitationResponseDTO> findCourserForSolicitation() {
        // 1. Ejecutar la consulta nativa que definimos antes
        List<Object[]> rawData = asignaturaRepository.findCourserForSolicitation();

        // Jackson para convertir el String JSON a objetos Java
        ObjectMapper objectMapper = new ObjectMapper();

        return rawData.stream().map(fila -> {
            try {
                Integer id = (Integer) fila[0];
                String nombre = (String) fila[1];
                String seccionesJson = (String) fila[2];

                // Convertimos el JSON String de la BD a List<SeccionSolicitationDTO>
                List<SeccionSolicitationDTO> secciones = objectMapper.readValue(seccionesJson,
                        new TypeReference<List<SeccionSolicitationDTO>>() {});

                return new CourseSolicitationResponseDTO(id, nombre, secciones);
            } catch (Exception e) {
                log.error("Error al procesar JSON de secciones para asignatura: {}", fila[1], e);
                throw new RuntimeException("Error en el procesamiento de datos de asignaturas");
            }
        }).collect(Collectors.toList());
    }

    @Transactional
    @Override
    public Asignatura save (Asignatura asignatura){

        String parsearCod = StringUtils.normalizeSpaces(asignatura.getCodAsignatura());
        String parsearNombre = StringUtils.capitalizarPalabras(asignatura.getNombreAsignatura());
        if (asignaturaRepository.existsByCodAsignaturaAndActivoIsTrueIgnoreAccents(parsearCod)){
            throw new GestionAcademicaException("Ya existe un codigo de asignatura con el valor: " + parsearCod , HttpStatus.NOT_FOUND);
        }
        if (asignaturaRepository.existsByNombreAsignaturaAndCodAsignaturaAndActivoIsTrue(parsearNombre, parsearCod)){
            throw new GestionAcademicaException("Ya existe asignatura con el nombre: " + parsearNombre + " y el codigo: " + parsearCod , HttpStatus.NOT_FOUND);
        }

        asignatura.setNombreAsignatura(parsearNombre);
        asignatura.setCodAsignatura(parsearCod);
        asignatura.setActivo(true);
        return asignaturaRepository.save(asignatura);
    }







}
