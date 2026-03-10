package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.dtomodel.*;
import KuHub.modules.gestion_academica.dtos.response.BookTImeBlocksDTO;
import KuHub.modules.gestion_academica.dtos.response.CourserAnswerDTGOD;
import KuHub.modules.gestion_academica.dtos.response.CourserPageDTGOD;
import KuHub.modules.gestion_academica.dtos.response.SectionAnswerUpdateDTO;
import KuHub.modules.gestion_academica.entity.Asignatura;
import KuHub.modules.gestion_academica.entity.AsignaturaProfesorCargo;
import KuHub.modules.gestion_academica.entity.ReservaSala;
import KuHub.modules.gestion_academica.entity.Seccion;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.repository.AsignaturaProfesorCargoRepository;
import KuHub.modules.gestion_academica.repository.AsignaturaRepository;
import KuHub.modules.gestion_usuario.entity.Usuario;
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
import java.util.stream.Collectors;

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

                        List<BookTImeBlocksDTO> bloques = new ArrayList<>();

                        if (bloquesMap != null) {
                            for (Map<String, Object> bloqueMap : bloquesMap) {
                                BookTImeBlocksDTO bloque = new BookTImeBlocksDTO();

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

        /** Asigna el profesor a la asignatura */
        AsignaturaProfesorCargo newCourserUser = new AsignaturaProfesorCargo();
        newCourserUser.setAsignatura(savedCourse);
        newCourserUser.setIdUsuario(request.getIdUsuarioGestorAsignatura());
        asignaturaProfesorCargoRepository.save(newCourserUser);

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
            throw new GestionAcademicaException("El usuario con el id: " + co.getIdProfesor() + " no es un profesor" , HttpStatus.NOT_FOUND);
        }

        /** Obtener el registro profesor–asignatura */
        AsignaturaProfesorCargo apc = asignaturaProfesorCargoService
                .findByAsignaturaProfesorCargoByIdAsignatura(co.getIdAsignatura());

        /** Validar y actualizar nombre de asignatura */
        if(!asignatura.getNombreAsignatura().equals(StringUtils.capitalizarPalabras(co.getNombreAsignatura()))){
            if (asignaturaRepository.existsByNombreAsignaturaAndActivoIsTrue(StringUtils.capitalizarPalabras(co.getNombreAsignatura()))){
                throw new GestionAcademicaException("Ya existe una asignatura con el nombre: " + StringUtils.capitalizarPalabras(co.getNombreAsignatura()) , HttpStatus.NOT_FOUND);
            }
            asignatura.setNombreAsignatura(StringUtils.capitalizarPalabras(co.getNombreAsignatura()));
        }

        /** Validar y actualizar código de asignatura */
        if(!asignatura.getCodAsignatura().equals(StringUtils.normalizeSpaces(co.getCodAsignatura()))){
            if (asignaturaRepository.existsByCodAsignaturaAndActivoIsTrueIgnoreAccents(StringUtils.normalizeSpaces(co.getCodAsignatura()))){
                throw new GestionAcademicaException("Ya existe una asignatura con el codigo: " + StringUtils.normalizeSpaces(co.getCodAsignatura()) , HttpStatus.NOT_FOUND);
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
