package KuHub.modules.gestion_academica.sevice;

import KuHub.modules.gestion_academica.dtos.dtoentity.SeccionEntityResponseDTO;
import KuHub.modules.gestion_academica.dtos.dtomodel.BookTImeBlocksRequestDTO;
import KuHub.modules.gestion_academica.dtos.dtomodel.SectionAnswerUpdateDTO;
import KuHub.modules.gestion_academica.dtos.dtomodel.SectionCreateDTO;
import KuHub.modules.gestion_academica.entity.*;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.repository.SeccionRepository;
import KuHub.modules.gestionusuario.entity.Usuario;
import KuHub.modules.gestionusuario.service.RolService;
import KuHub.modules.gestionusuario.service.UsuarioService;
import KuHub.utils.StringUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SeccionServiceImp implements SeccionService{

    @Autowired
    private SeccionRepository seccionRepository;

    @Autowired
    private AsignaturaService asignaturaService;

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private SalaService salaService;

    @Autowired
    private ReservaSalaService reservaSalaService;

    @Autowired
    private BloqueHorarioService bloqueHorarioService;

    @Autowired
    private DocenteSeccionService docenteSeccionService;

    @Autowired
    private RolService rolService;

    @Transactional(readOnly = true)
    @Override
    public SeccionEntityResponseDTO findById(Integer id) {
        Seccion seccion = seccionRepository.findById(id).orElseThrow(
                () -> new GestionAcademicaException("La seccion con el id: " + id + " no existe")
        );
        return convertirADTO(seccion);
    }

    @Transactional(readOnly = true)
    @Override
    public SeccionEntityResponseDTO findByIdAndActiveIsTrueResponseDTO(Integer id){
        Seccion seccion = seccionRepository.findByIdSeccionAndActivoTrue(id).orElseThrow(
                () -> new GestionAcademicaException("La seccion con el id: " + id + " no existe")
        );
        return convertirADTO(seccion);
    }

    @Transactional(readOnly = true)
    @Override
    public Seccion findByIdAndActiveIsTrueEntity(Integer id){
        return seccionRepository.findByIdSeccionAndActivoTrue(id).orElseThrow(
                () -> new GestionAcademicaException("La seccion con el id: " + id + " no existe")
        );
    }

    @Transactional(readOnly = true)
    @Override
    public List<SeccionEntityResponseDTO> findAll() {
        return seccionRepository.findAll()
                .stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    @Transactional
    @Override
    public List<SeccionEntityResponseDTO> findAllByActivoTrue(){
        return seccionRepository.findAllByActivoTrue()
                .stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    @Transactional
    @Override
    public SeccionEntityResponseDTO save(Seccion seccion) {
        if (seccion.getAsignatura() == null || seccion.getAsignatura().getIdAsignatura() == null) {
            throw new GestionAcademicaException("Debe indicar una asignatura válida");
        }

        if(!asignaturaService.existsByIdAsignaturaAndTrue(seccion.getAsignatura().getIdAsignatura())){
            throw new GestionAcademicaException("La asignatura con el id: " + seccion.getAsignatura().getIdAsignatura() + " no existe");
        }

        if (seccion.getNombreSeccion() == null || seccion.getNombreSeccion().isBlank()) {
            throw new GestionAcademicaException("El nombre de la sección no puede estar vacío");
        }

        String parsearNombre = StringUtils.normalizeSpaces(seccion.getNombreSeccion());
        if(seccionRepository.existsByAsignaturaTrueAndSeccionTrueAndNombreSeccionIlike(seccion.getAsignatura().getIdAsignatura(), parsearNombre)){
            throw new GestionAcademicaException("Ya existe una seccion con el nombre: " + seccion.getNombreSeccion() + " en misma asignatura la asignatura: " + seccion.getAsignatura().getNombreAsignatura());
        }

        if(seccion.getCapacidadMax() < 0 || seccion.getCantInscritos() < 0 ){
            throw new GestionAcademicaException("La capacidad maxima y cantidad de incritos no pueden ser negativas");
        }

        if(seccion.getCantInscritos()>seccion.getCapacidadMax()){
            seccion.setCantInscritos(seccion.getCapacidadMax());
        }

        seccion.setNombreSeccion(parsearNombre);
        seccion.setActivo(true);
        Seccion section = seccionRepository.save(seccion);
        return convertirADTO(section);
    }

    @Transactional
    @Override
    public SectionAnswerUpdateDTO createSection (SectionCreateDTO dto){
        SectionAnswerUpdateDTO dtoResponse = new SectionAnswerUpdateDTO();

        /***validar capacidad maxima y cantidad de inscritos */
        if (dto.getCantInscritos() < 0 || dto.getCapacidadMaxInscritos() < 0){
            throw new GestionAcademicaException("La capacidad maxima y cantidad de incritos no pueden ser negativas");
        }
        dtoResponse.setCapacidadMaxInscritos(dto.getCapacidadMaxInscritos());

        if (dto.getCantInscritos() > dto.getCapacidadMaxInscritos()){
            throw new GestionAcademicaException("La cantidad de inscritos no puede ser mayor a la capacidad maxima");
        }
        dtoResponse.setCantInscritos(dto.getCantInscritos());

        /**Validar existencia de asignatura y que este activa*/
        if ( dto.getIdAsignatura()!= null) {
            if (!asignaturaService.existsByIdAsignaturaAndTrue(dto.getIdAsignatura())){
                throw new GestionAcademicaException("La asignatura con el id: " + dto.getIdAsignatura() + " no existe");
            }
        }else {
            throw new GestionAcademicaException("Debe indicar una asignatura válida");
        }
        dtoResponse.setIdAsignatura(dto.getIdAsignatura());

        /**Validar duplicidad de nombre de la seccion en la misma asignatura*/
        if (dto.getNombreSeccion() != null && !dto.getNombreSeccion().isBlank()) {

            if(seccionRepository.existsByAsignaturaTrueAndSeccionTrueAndNombreSeccionIlike(
                    dto.getIdAsignatura(),
                    StringUtils.normalizeSpaces(dto.getNombreSeccion()))
            ) {
                throw new GestionAcademicaException("Ya existe una seccion con el nombre: " + dto.getNombreSeccion()
                                            + " en misma asignatura la asignatura: " + dto.getIdAsignatura()
                );
            }
        }else {
            throw new GestionAcademicaException("No se puede crear una seccion sin nombre");
        }
        dtoResponse.setNombreSeccion(StringUtils.normalizeSpaces(dto.getNombreSeccion()));

        /**Validar existencia de usuario y que sea docente o profesor */
        Usuario docente = usuarioService.obtenerPorIdEntidad(dto.getIdUsuarioDocente());
        boolean esActivo = docente.getActivo();
        boolean esRolValido = false;
        try {
            Seccion.RolValido.valueOf(docente.getRol().getNombreRol().toUpperCase());
            esRolValido = true; // Si no lanza excepción, el rol es válido
        } catch (IllegalArgumentException e) {
            esRolValido = false; // Rol no permitido
        }
        if(!esRolValido || !esActivo){
            throw new GestionAcademicaException("Los usuario registrados a la seccion solo pueden ser docentes o profesores");
        }
        dtoResponse.setIdDocente(docente.getIdUsuario());

        /**Crear seccion*/
        Seccion seccion = seccionRepository.save( new Seccion(
                null,
                asignaturaService.findById(dto.getIdAsignatura()),
                StringUtils.normalizeSpaces(dto.getNombreSeccion()),
                dto.getCapacidadMaxInscritos(),
                dto.getCantInscritos(),
                true,
                Seccion.EstadoSeccion.ACTIVA));
        dtoResponse.setIdSeccion(seccion.getIdSeccion());

        List<BookTImeBlocksRequestDTO> bloqueResponse = new ArrayList<>();
        /** Procesa siempre los bloques (crea sala sólo cuando corresponde)*/
        if (dto.getBloquesHorarios() != null) {
            /**
             * Procesa los bloques de tiempo de la sección,
             * creando sala solo si corresponde, pero siempre validando los bloques.
             */

            for (BookTImeBlocksRequestDTO B : dto.getBloquesHorarios()) {

                /** Normalizamos el día */
                ReservaSala.DiaSemana diaSemanaEnum =
                        ReservaSala.DiaSemana.valueOf(
                                B.getDiaSemana().toString().toUpperCase()
                        );

                Sala sala;

                /**
                 * Si se indicó crear sala y el bloque NO tiene idSala,
                 * entonces debemos crear una nueva.
                 */
                if (dto.getCrearSala() && B.getIdSala() == null) {

                    sala = salaService.save(
                            new Sala(
                                    null,
                                    B.getCodSala(),
                                    StringUtils.capitalizarPalabras(B.getNombreSala()),
                                    true
                            )
                    );

                    if (sala == null || sala.getIdSala() == null) {
                        throw new GestionAcademicaException(
                                "No se pudo crear la sala para el bloque " + B.getNumeroBloque()
                        );
                    }

                } else {

                    /** Si no se crea sala, debe existir una */
                    if (B.getIdSala() == null) {
                        throw new GestionAcademicaException(
                                "No se indicó idSala para el bloque " + B.getNumeroBloque()
                        );
                    }

                    sala = salaService.findById(B.getIdSala());
                }
                B.setIdSala(sala.getIdSala());
                B.setNombreSala(sala.getNombreSala());
                B.setCodSala(sala.getCodSala());

                /** Validar disponibilidad del bloque */
                boolean disponible = reservaSalaService.validatedThatTheBlockIsNotReserved(
                        sala.getIdSala(),
                        diaSemanaEnum.name(),
                        B.getNumeroBloque()
                );

                if (!disponible) {
                    throw new GestionAcademicaException(
                            "El bloque " + B.getNumeroBloque() +
                                    " ya está reservado para una sala en una seccion"
                    );
                }

                /** Obtener bloque horario */
                BloqueHorario bloqueHorario = bloqueHorarioService.findById(B.getNumeroBloque());

                /** Crear y guardar la reserva */
                ReservaSala reservaSala = new ReservaSala(
                        null,
                        seccion,
                        sala,
                        bloqueHorario,
                        diaSemanaEnum
                );

                reservaSalaService.save(reservaSala);
                bloqueResponse.add(B);
            }
        }
        dtoResponse.setBloquesHorarios(bloqueResponse);

        /**SE INSETA a la tabla intermedia DocenteSeccion, el save no tiene restricciones, en un futuro puede ser que si
         * esto significa que pueda cambiar el guadardo, la otra opcion es llamar el repo justo en esta parte */
        docenteSeccionService.save(new DocenteSeccion(
                null,
                docente,
                seccion,
                null
        ));


        /**Estos atributos son meramente visuale, debido en las tablas se asignan valores por defecto*/
        /**Obtener nombre completo del docente usando metodo*/
        dtoResponse.setNombreCompletoDocente(usuarioService.formatearNombreCompleto(docente));
        /**Asignar valores por defecto*/
        dtoResponse.setEstadoSeccion(Seccion.EstadoSeccion.ACTIVA);

        return dtoResponse;
    }



    @Transactional
    @Override
    public SectionAnswerUpdateDTO updateSection(SectionAnswerUpdateDTO dto){

        /**validar capacidad maxima y cantidad de inscritos*/
        if (dto.getCantInscritos() < 0 || dto.getCapacidadMaxInscritos() < 0){
            throw new GestionAcademicaException("La capacidad maxima y cantidad de incritos no pueden ser negativas");
        }

        if (dto.getCantInscritos() > dto.getCapacidadMaxInscritos()){
            throw new GestionAcademicaException("La cantidad de inscritos no puede ser mayor a la capacidad maxima");
        }

        Seccion seccion = findByIdAndActiveIsTrueEntity(dto.getIdSeccion());

        /**Validar existencia de asignatura y que este activa*/
        if ( dto.getIdAsignatura()!= null) {
            if (!asignaturaService.existsByIdAsignaturaAndTrue(dto.getIdAsignatura())){
                throw new GestionAcademicaException("La asignatura con el id: " + dto.getIdAsignatura() + " no existe");
            }
        }else {
            throw new GestionAcademicaException("Debe indicar una asignatura válida");
        }


/**Validar duplicidad de nombre de la seccion en la misma asignatura*/
        if (dto.getNombreSeccion() != null && !dto.getNombreSeccion().isBlank()) {
            String nuevoNombreNormalizado = StringUtils.normalizeSpaces(dto.getNombreSeccion());

            // Buscar si existe otra sección con el mismo nombre en la misma asignatura
            Optional<Seccion> seccionConMismoNombre = seccionRepository
                    .findByAsignaturaIdAsignaturaAndActivoTrueAndNombreSeccionIgnoreCase(
                            dto.getIdAsignatura(),
                            nuevoNombreNormalizado
                    );

            // Si existe una sección con ese nombre Y no es la misma que estoy actualizando
            if (seccionConMismoNombre.isPresent() &&
                    !seccionConMismoNombre.get().getIdSeccion().equals(dto.getIdSeccion())) {
                throw new GestionAcademicaException(
                        "Ya existe otra seccion con el nombre: " + dto.getNombreSeccion() +
                                " en la asignatura: " + dto.getIdAsignatura()
                );
            }

            // Actualizar el nombre manteniendo el formato original (solo normalizando espacios)
            seccion.setNombreSeccion(nuevoNombreNormalizado);
            dto.setNombreSeccion(seccion.getNombreSeccion());
        }

        /**Validar existencia de usuario y que sea docente o profesor*/
        Usuario docente = usuarioService.obtenerPorIdEntidad(dto.getIdDocente());
        boolean esActivo = docente.getActivo();
        boolean esRolValido = false;
        try {
            Seccion.RolValido.valueOf(docente.getRol().getNombreRol().toUpperCase());
            esRolValido = true; // Si no lanza excepción, el rol es válido
        } catch (IllegalArgumentException e) {
            esRolValido = false; // Rol no permitido
        }
        if(!esRolValido || !esActivo){
            throw new GestionAcademicaException("Los usuario registrados a la seccion solo pueden ser docentes o profesores");
        }

        /**Obtener tabla intermedia DocenteSeccion y actualizar si hay cambios*/
        DocenteSeccion dulce = docenteSeccionService.findByIdSeccionEntity(seccion.getIdSeccion());

        if (dulce.getUsuario().getIdUsuario() != dto.getIdDocente()){
            dulce.setUsuario(docente);
            dulce.setFechaAsignacion(LocalDate.now());
        }
        docenteSeccionService.save(dulce);
        dto.setNombreCompletoDocente(usuarioService.formatearNombreCompleto(docente));

        /**Actualizar seccion*/
        seccion.setCapacidadMax(dto.getCapacidadMaxInscritos());
        seccion.setCantInscritos(dto.getCantInscritos());
        seccionRepository.save(seccion);


        /** Procesar cambios en bloques horarios */
        if (dto.getBloquesHorarios() != null) {

            // Obtener reservas actuales de la sección
            List<ReservaSala> reservasActuales = reservaSalaService.findAllReserveByIdSeccion(dto.getIdSeccion());

            // Si el array viene vacío, eliminar todas las reservas
            if (dto.getBloquesHorarios().isEmpty()) {
                for (ReservaSala reserva : reservasActuales) {
                    reservaSalaService.deleteReserveById(reserva.getIdReservaSala());
                }
                return dto; // Retornar inmediatamente, no hay nada más que procesar
            }

            // Crear un mapa de reservas actuales con clave única: idSala-diaSemana-numeroBloque
            Map<String, ReservaSala> reservasActualesMap = reservasActuales.stream()
                    .collect(Collectors.toMap(
                            r -> r.getSala().getIdSala() + "-" +
                                    r.getDiaSemana().name() + "-" +
                                    r.getBloqueHorario().getNumeroBloque(),
                            r -> r
                    ));

            // Crear un Set con las claves de las nuevas reservas
            Set<String> reservasNuevasKeys = new HashSet<>();

            // Primera pasada: identificar las claves de las nuevas reservas
            for (BookTImeBlocksRequestDTO B : dto.getBloquesHorarios()) {
                ReservaSala.DiaSemana diaSemanaEnum =
                        ReservaSala.DiaSemana.valueOf(B.getDiaSemana().name().toUpperCase());

                // Solo usar idSala si existe, no generar claves temporales aquí
                if (B.getIdSala() != null) {
                    String clave = B.getIdSala() + "-" +
                            diaSemanaEnum.name() + "-" +
                            B.getNumeroBloque();
                    reservasNuevasKeys.add(clave);
                }
                // Si idSala es null, significa que se va a crear una sala nueva,
                // por lo tanto no puede existir en reservasActuales y no necesitamos la clave
            }

            // Identificar y eliminar reservas que ya no están
            List<ReservaSala> reservasAEliminar = reservasActuales.stream()
                    .filter(r -> {
                        String key = r.getSala().getIdSala() + "-" +
                                r.getDiaSemana().name() + "-" +
                                r.getBloqueHorario().getNumeroBloque();
                        return !reservasNuevasKeys.contains(key);
                    })
                    .collect(Collectors.toList());

            // Eliminar reservas obsoletas
            for (ReservaSala reservaAEliminar : reservasAEliminar) {
                reservaSalaService.deleteReserveById(reservaAEliminar.getIdReservaSala());
            }

            // Procesar cada bloque horario del DTO
            for (BookTImeBlocksRequestDTO B : dto.getBloquesHorarios()) {

                /** Normalizar el día */
                ReservaSala.DiaSemana diaSemanaEnum =
                        ReservaSala.DiaSemana.valueOf(B.getDiaSemana().name().toUpperCase());

                Sala sala;
                boolean esNuevaReserva = false;

                /** Determinar si necesitamos crear una sala nueva */
                if (Boolean.TRUE.equals(dto.getCrearSala()) && B.getIdSala() == null) {

                    // Validar que se proporcionen los datos necesarios para crear la sala
                    if (B.getCodSala() == null || B.getCodSala().isBlank()) {
                        throw new GestionAcademicaException(
                                "Debe proporcionar el código de sala para crear una nueva sala en el bloque " + B.getNumeroBloque()
                        );
                    }
                    if (B.getNombreSala() == null || B.getNombreSala().isBlank()) {
                        throw new GestionAcademicaException(
                                "Debe proporcionar el nombre de sala para crear una nueva sala en el bloque " + B.getNumeroBloque()
                        );
                    }

                    // Crear la nueva sala
                    sala = salaService.save(
                            new Sala(
                                    null,
                                    B.getCodSala(),
                                    StringUtils.capitalizarPalabras(B.getNombreSala()),
                                    true
                            )
                    );

                    if (sala == null || sala.getIdSala() == null) {
                        throw new GestionAcademicaException(
                                "No se pudo crear la sala para el bloque " + B.getNumeroBloque()
                        );
                    }

                    esNuevaReserva = true; // Siempre es nueva si acabamos de crear la sala

                } else {

                    /** Si no se crea sala, debe existir una */
                    if (B.getIdSala() == null) {
                        throw new GestionAcademicaException(
                                "No se indicó idSala para el bloque " + B.getNumeroBloque() +
                                        ". Si desea crear una nueva sala, active la opción 'crearSala'"
                        );
                    }

                    // Obtener la sala existente
                    sala = salaService.findById(B.getIdSala());

                    // Verificar si esta reserva ya existe
                    String claveReserva = sala.getIdSala() + "-" +
                            diaSemanaEnum.name() + "-" +
                            B.getNumeroBloque();

                    esNuevaReserva = !reservasActualesMap.containsKey(claveReserva);
                }

                /** Actualizar datos en el DTO para la respuesta */
                B.setIdSala(sala.getIdSala());
                B.setNombreSala(sala.getNombreSala());
                B.setCodSala(sala.getCodSala());

                /** Solo procesar si es una nueva reserva */
                if (esNuevaReserva) {

                    /** Validar disponibilidad del bloque */
                    boolean disponible = reservaSalaService.validatedThatTheBlockIsNotReserved(
                            sala.getIdSala(),
                            diaSemanaEnum.name(),
                            B.getNumeroBloque()
                    );

                    if (!disponible) {
                        throw new GestionAcademicaException(
                                "El bloque " + B.getNumeroBloque() +
                                        " del día " + diaSemanaEnum.name() +
                                        " ya está reservado para la sala '" + sala.getNombreSala() + "'"
                        );
                    }

                    /** Obtener bloque horario */
                    BloqueHorario bloqueHorario = bloqueHorarioService.findById(B.getNumeroBloque());

                    /** Crear y guardar la nueva reserva */
                    ReservaSala nuevaReserva = new ReservaSala(
                            null,
                            seccion,
                            sala,
                            bloqueHorario,
                            diaSemanaEnum
                    );

                    reservaSalaService.save(nuevaReserva);
                }
            }
        }

        return dto;

    }



    @Transactional
    @Override
    public void softDelete(Integer id) {
        Seccion seccion = seccionRepository.findById(id).orElseThrow(
                () -> new GestionAcademicaException("La seccion con el id: " + id + " no existe")
        );
        seccion.setActivo(false);
        seccionRepository.save(seccion);
    }

    private SeccionEntityResponseDTO convertirADTO(Seccion seccion){
        return new SeccionEntityResponseDTO(
                seccion.getIdSeccion(),
                seccion.getAsignatura().getIdAsignatura(),
                seccion.getNombreSeccion(),
                seccion.getCapacidadMax(),
                seccion.getCantInscritos(),
                seccion.getActivo(),
                seccion.getEstadoSeccion().name()
        );
    }
}
