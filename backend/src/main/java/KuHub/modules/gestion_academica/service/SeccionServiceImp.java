package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.record.CheckAvailability;
import KuHub.modules.gestion_academica.dtos.request.BookTimeBlocksDTO;
import KuHub.modules.gestion_academica.dtos.request.SectionCreateDTO;
import KuHub.modules.gestion_academica.dtos.request.SectionUpdateDTO;
import KuHub.modules.gestion_academica.entity.*;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.repository.DocenteSeccionRepository;
import KuHub.modules.gestion_academica.repository.ReservaSalaRepository;
import KuHub.modules.gestion_academica.repository.SeccionRepository;
import KuHub.modules.gestion_usuario.service.RolService;
import KuHub.modules.gestion_usuario.service.UsuarioService;
import KuHub.utils.StringUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Slf4j
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
    private ReservaSalaRepository reservaSalaRepository;

    @Autowired
    private BloqueHorarioService bloqueHorarioService;

    @Autowired
    private DocenteSeccionRepository docenteSeccionRepository;

    @Autowired
    private RolService rolService;

    public Seccion findById (Integer idSection){
        return seccionRepository.findById(idSection).orElseThrow(
                () -> new GestionAcademicaException("Seccion con la id no encontrada"
                , HttpStatus.NOT_FOUND)
        );
    }

    @Transactional
    @Override
    public boolean createSection (SectionCreateDTO request) {
        /***Parsear antes de validar */
        String nombreSeccion = StringUtils.normalizeSpaces(request.getNombreSeccion());

        /**Validar duplicidad de nombre de la seccion en la misma asignatura*/
        if (seccionRepository.existsByAsignaturaTrueAndSeccionTrueAndNombreSeccionIlike(
                request.getIdAsignatura(), StringUtils.normalizeSpaces(nombreSeccion))) {
            throw new GestionAcademicaException("Ya existe una seccion con el nombre: " + nombreSeccion
                    + " en misma asignatura la asignatura: ", HttpStatus.CONFLICT
            );
        }

        /**Crear objeto seccion*/
        Seccion newSection = new Seccion();
        newSection.setIdAsignatura(request.getIdAsignatura());
        newSection.setNombreSeccion(nombreSeccion);
        newSection.setCapacidadMax(request.getCapacidadMax());
        newSection.setCantInscritos(request.getCantInscritos());
        String enumKey = StringUtils.normalizeToEnumKey(request.getEstadoSeccion());
        try {
            if (enumKey != null) {
                newSection.setEstadoSeccion(Seccion.EstadoSeccion.valueOf(enumKey));
            }
        } catch (IllegalArgumentException e) {
            // Si el frontend envía algo que no existe, asignamos un default seguro
            newSection.setEstadoSeccion(Seccion.EstadoSeccion.ACTIVA);
        }
        /**Crear en la bbdd*/
        Seccion savedSection = seccionRepository.save(newSection);

        /** Valdar disponibilidad para reservar bloques */
        for (BookTimeBlocksDTO B : request.getBloquesHorarios()) {

            /** Validar disponibilidad del bloque y retorno del tipo enun formateado*/
            CheckAvailability check = reservaSalaService.validatedThatTheBlockIsNotReserved(
                    B.getIdSala(),
                    B.getDiaSemana(), // El String crudo
                    B.getNumeroBloque()
            );
            if (!check.isAvailable()) {
                throw new GestionAcademicaException(
                        "El bloque " + B.getNumeroBloque() +
                                " ya está reservado para una sala en una seccion", HttpStatus.CONFLICT
                );
            }

            /** Crear y guardar la reserva */
            ReservaSala newReservation = new ReservaSala();
            newReservation.setSeccion(savedSection);
            newReservation.setIdSala(B.getIdSala());
            newReservation.setIdBloque(B.getIdBloque());
            newReservation.setDiaSemana(check.enumDay());

            reservaSalaService.save(newReservation);
        }

        /**Asiganar el usuario docente a seccion*/
        DocenteSeccion newTeaching = new DocenteSeccion();
        newTeaching.setSeccion(savedSection);
        newTeaching.setIdUsuario(request.getIdUsuarioDocente());
        docenteSeccionRepository.save(newTeaching);

        return true;
    }

    @Transactional
    @Override
    public boolean updateSection (SectionUpdateDTO request) {
        Seccion oldSeccion = findById(request.getIdSeccion());
        boolean changes = false;
        /***Parsear antes de validar */
        String nombreSeccion = StringUtils.normalizeSpaces(request.getNombreSeccion());
        if (!oldSeccion.getNombreSeccion().equals(nombreSeccion)) {
            if (seccionRepository.existsByAsignaturaTrueAndSeccionTrueAndNombreSeccionIlike(
                    request.getIdAsignatura(), StringUtils.normalizeSpaces(nombreSeccion))) {
                throw new GestionAcademicaException("Ya existe una seccion con el nombre: " + nombreSeccion
                        + " en misma asignatura la asignatura: ", HttpStatus.CONFLICT
                );
            }
            oldSeccion.setNombreSeccion(nombreSeccion);
            changes = true;
        }
        if (!oldSeccion.getCapacidadMax().equals(request.getCapacidadMax())) {
            oldSeccion.setCapacidadMax(request.getCapacidadMax());
            changes = true;
        }
        if (!oldSeccion.getCantInscritos().equals(request.getCantInscritos())) {
            oldSeccion.setCantInscritos(request.getCantInscritos());
            changes = true;
        }

        String enumKey = StringUtils.normalizeToEnumKey(request.getEstadoSeccion());

        if (enumKey != null) {
            try {
                Seccion.EstadoSeccion nuevoEstado = Seccion.EstadoSeccion.valueOf(enumKey);
                if (oldSeccion.getEstadoSeccion() != nuevoEstado) {
                    oldSeccion.setEstadoSeccion(nuevoEstado);
                    changes = true;
                }
            } catch (IllegalArgumentException e) {
                throw new GestionAcademicaException("El estado '" + enumKey + "' no es válido."
                        , HttpStatus.BAD_REQUEST);
            }
        }

        /**guardar cambios en la bbdd*/
        if (changes) {
            seccionRepository.save(oldSeccion);
        }

        // ==========================================================
        // PROCESAR DELTAS: - ELIMINAR BLOQUES (Borrado lógico masivo)
        // ==========================================================
        log.info("Revisando deltas de eliminación... IDs recibidos desde frontend: {}", request.getIdsReservasEliminar());
        if (request.getIdsReservasEliminar() != null && !request.getIdsReservasEliminar().isEmpty()) {
            log.info("Entró al proceso de eliminación masiva. Ejecutando query para los IDs: {}", request.getIdsReservasEliminar());
            // Ejecutamos y capturamos el número de filas afectadas
            int filasAfectadas = reservaSalaRepository.deactivateReservationsMass(request.getIdsReservasEliminar());

            // Registramos en la consola del backend
            log.info("Se intentaron eliminar {} reservas. Filas realmente desactivadas: {} para la Sección ID: {}",
                    request.getIdsReservasEliminar().size(),
                    filasAfectadas,
                    oldSeccion.getIdSeccion());

            // Opcional: Podrías lanzar un warning si no coinciden
            if (filasAfectadas != request.getIdsReservasEliminar().size()) {
                log.warn("¡Atención! Algunas reservas enviadas para eliminar ya estaban inactivas o no existen.");
            }
        }else {
            // 3. LOG ELSE: Para estar seguros de que el if está saltando
            log.info("No se ejecutará eliminación. La lista de IDs viene nula o vacía.");
        }

        // ==========================================================
        // PROCESAR DELTAS:  AGREGAR NUEVOS BLOQUES
        // ==========================================================

        if (request.getBloquesNuevos() != null && !request.getBloquesNuevos().isEmpty()) {
            for (BookTimeBlocksDTO nuevoBloque : request.getBloquesNuevos()) {

                String diaNormalizado = StringUtils.normalizeToEnumKey(nuevoBloque.getDiaSemana());
                if (reservaSalaRepository.isOccupiedRoom(nuevoBloque.getIdSala(), diaNormalizado, nuevoBloque.getIdBloque())) {
                    throw new GestionAcademicaException(
                            String.format("La sala seleccionada ya está ocupada el %s en el bloque %d.",
                                    StringUtils.enumToHumanText(diaNormalizado), // Lo volvemos legible ("Lunes")
                                    nuevoBloque.getNumeroBloque()),
                            HttpStatus.CONFLICT
                    );
                }

                ReservaSala.DiaSemana diaEnum;
                try {
                    diaEnum = ReservaSala.DiaSemana.valueOf(diaNormalizado);
                } catch (IllegalArgumentException e) {
                    throw new GestionAcademicaException(
                            "El día de la semana '" + nuevoBloque.getDiaSemana() + "' no es válido.",
                            HttpStatus.BAD_REQUEST
                    );
                }

                // 3. Si está libre, preparamos la entidad para guardar
                ReservaSala newReservation = new ReservaSala();
                newReservation.setIdSeccion(oldSeccion.getIdSeccion());
                newReservation.setIdSala(nuevoBloque.getIdSala());
                newReservation.setIdBloque(nuevoBloque.getIdBloque());
                newReservation.setDiaSemana(diaEnum);

                try {
                    reservaSalaRepository.save(newReservation);
                } catch (DataIntegrityViolationException e) {
                    // Si dos usuarios pasaron el 'if' al mismo milisegundo, la Base de Datos
                    // usará el Índice Único para bloquear a uno de ellos y caerá aquí.
                    log.error("Error de concurrencia: Índice único bloqueó la inserción.", e);
                    throw new GestionAcademicaException(
                        "Error de concurrencia: El horario fue ocupado por otro usuario en este instante.",
                        HttpStatus.CONFLICT
                    );
                }
            }
        }
        return true;
    }

    @Transactional
    @Override
    public boolean softDelete(Integer id)   {
        // Ejecutamos el UPDATE directo y capturamos cuántas filas se modificaron
        int filasAfectadas = seccionRepository.softDeleteSeccionById(id);
        // Si es 0, significa que la ID no existe en la BD o ya estaba con activo = false
        if (filasAfectadas == 0) {
            throw new GestionAcademicaException(
                    "La sección con el id: " + id + " no existe o ya fue eliminada anteriormente.",
                    HttpStatus.NOT_FOUND
            );
        }
        return true; // Retornamos true indicando éxito total
    }




    /**
    @Transactional(readOnly = true)
    @Override
    public Seccion findByIdAndActiveIsTrueEntity(Integer id){
        return seccionRepository.findByIdSeccionAndActivoTrue(id).orElseThrow(
                () -> new GestionAcademicaException("La seccion con el id: " + id + " no existe" , HttpStatus.NOT_FOUND)
        );
    }



    @Transactional(readOnly = true)
    @Override
    public List<Seccion> findAllSeccionsSeccionList(List<Integer> seccionesIds){
        return seccionRepository.findAllById(seccionesIds);
    }


    /**


     @Transactional(readOnly = true)
     @Override
     public SeccionEntityResponseDTO findById(Integer id) {
     Seccion seccion = seccionRepository.findById(id).orElseThrow(
     () -> new GestionAcademicaException("La seccion con el id: " + id + " no existe" , HttpStatus.NOT_FOUND)
     );
     return convertirADTO(seccion);
     }

     @Transactional(readOnly = true)
     @Override
     public SeccionEntityResponseDTO findByIdAndActiveIsTrueResponseDTO(Integer id){
     Seccion seccion = seccionRepository.findByIdSeccionAndActivoTrue(id).orElseThrow(
     () -> new GestionAcademicaException("La seccion con el id: " + id + " no existe" , HttpStatus.NOT_FOUND)
     );
     return convertirADTO(seccion);
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
            throw new GestionAcademicaException("Debe indicar una asignatura válida" , HttpStatus.NOT_FOUND);
        }

        if(!asignaturaService.existsByIdAsignaturaAndTrue(seccion.getAsignatura().getIdAsignatura())){
            throw new GestionAcademicaException("La asignatura con el id: " + seccion.getAsignatura().getIdAsignatura() + " no existe" , HttpStatus.NOT_FOUND);
        }

        if (seccion.getNombreSeccion() == null || seccion.getNombreSeccion().isBlank()) {
            throw new GestionAcademicaException("El nombre de la sección no puede estar vacío" , HttpStatus.NOT_FOUND);
        }

        String parsearNombre = StringUtils.normalizeSpaces(seccion.getNombreSeccion());
        if(seccionRepository.existsByAsignaturaTrueAndSeccionTrueAndNombreSeccionIlike(seccion.getAsignatura().getIdAsignatura(), parsearNombre)){
            throw new GestionAcademicaException("Ya existe una seccion con el nombre: " + seccion.getNombreSeccion()
                    + " en misma asignatura la asignatura: " + seccion.getAsignatura().getNombreAsignatura(), HttpStatus.NOT_FOUND);
        }

        if(seccion.getCapacidadMax() < 0 || seccion.getCantInscritos() < 0 ){
            throw new GestionAcademicaException("La capacidad maxima y cantidad de incritos no pueden ser negativas", HttpStatus.NOT_FOUND);
        }

        if(seccion.getCantInscritos()>seccion.getCapacidadMax()){
            seccion.setCantInscritos(seccion.getCapacidadMax());
        }

        seccion.setNombreSeccion(parsearNombre);
        seccion.setActivo(true);
        Seccion section = seccionRepository.save(seccion);
        return convertirADTO(section);
    }




    /**
    @Transactional
    @Override
    public SectionAnswerUpdateDTO updateSection(SectionAnswerUpdateDTO dto){

        /**validar capacidad maxima y cantidad de inscritos
        if (dto.getCantInscritos() < 0 || dto.getCapacidadMaxInscritos() < 0){
            throw new GestionAcademicaException("La capacidad maxima y cantidad de incritos no pueden ser negativas", HttpStatus.NOT_FOUND);
        }

        if (dto.getCantInscritos() > dto.getCapacidadMaxInscritos()){
            throw new GestionAcademicaException("La cantidad de inscritos no puede ser mayor a la capacidad maxima", HttpStatus.NOT_FOUND);
        }

        Seccion seccion = findByIdAndActiveIsTrueEntity(dto.getIdSeccion());

        /**Validar existencia de asignatura y que este activa
        if ( dto.getIdAsignatura()!= null) {
            if (!asignaturaService.existsByIdAsignaturaAndTrue(dto.getIdAsignatura())){
                throw new GestionAcademicaException("La asignatura con el id: " + dto.getIdAsignatura() + " no existe", HttpStatus.NOT_FOUND);
            }
        }else {
            throw new GestionAcademicaException("Debe indicar una asignatura válida", HttpStatus.NOT_FOUND);
        }


/**Validar duplicidad de nombre de la seccion en la misma asignatura
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
                                " en la asignatura: " + dto.getIdAsignatura(), HttpStatus.NOT_FOUND
                );
            }

            // Actualizar el nombre manteniendo el formato original (solo normalizando espacios)
            seccion.setNombreSeccion(nuevoNombreNormalizado);
            dto.setNombreSeccion(seccion.getNombreSeccion());
        }

        /**Validar existencia de usuario y que sea docente o profesor
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
            throw new GestionAcademicaException("Los usuario registrados a la seccion solo pueden ser docentes o profesores", HttpStatus.NOT_FOUND);
        }

        /**Obtener tabla intermedia DocenteSeccion y actualizar si hay cambios
        DocenteSeccion dulce = docenteSeccionService.findByIdSeccionEntity(seccion.getIdSeccion());

        if (dulce.getUsuario().getIdUsuario() != dto.getIdDocente()){
            dulce.setUsuario(docente);
            dulce.setFechaAsignacion(LocalDate.now());
        }
        docenteSeccionService.save(dulce);
        dto.setNombreCompletoDocente(usuarioService.formatearNombreCompleto(docente));

        /**Actualizar seccion
        seccion.setCapacidadMax(dto.getCapacidadMaxInscritos());
        seccion.setCantInscritos(dto.getCantInscritos());
        seccionRepository.save(seccion);


        /** Procesar cambios en bloques horarios
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
            for (BookTImeBlocksDTO B : dto.getBloquesHorarios()) {
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
            for (BookTImeBlocksDTO B : dto.getBloquesHorarios()) {

                /** Normalizar el día
                ReservaSala.DiaSemana diaSemanaEnum =
                        ReservaSala.DiaSemana.valueOf(B.getDiaSemana().name().toUpperCase());

                Sala sala;
                boolean esNuevaReserva = false;

                /** Determinar si necesitamos crear una sala nueva
                if (Boolean.TRUE.equals(dto.getCrearSala()) && B.getIdSala() == null) {

                    // Validar que se proporcionen los datos necesarios para crear la sala
                    if (B.getCodSala() == null || B.getCodSala().isBlank()) {
                        throw new GestionAcademicaException(
                                "Debe proporcionar el código de sala para crear una nueva sala en el bloque " + B.getNumeroBloque(), HttpStatus.NOT_FOUND
                        );
                    }
                    if (B.getNombreSala() == null || B.getNombreSala().isBlank()) {
                        throw new GestionAcademicaException(
                                "Debe proporcionar el nombre de sala para crear una nueva sala en el bloque " + B.getNumeroBloque(), HttpStatus.NOT_FOUND
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
                                "No se pudo crear la sala para el bloque " + B.getNumeroBloque(), HttpStatus.NOT_FOUND
                        );
                    }

                    esNuevaReserva = true; // Siempre es nueva si acabamos de crear la sala

                } else {

                    /** Si no se crea sala, debe existir una
                    if (B.getIdSala() == null) {
                        throw new GestionAcademicaException(
                                "No se indicó idSala para el bloque " + B.getNumeroBloque() +
                                        ". Si desea crear una nueva sala, active la opción 'crearSala'", HttpStatus.NOT_FOUND
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

                /** Actualizar datos en el DTO para la respuesta
                B.setIdSala(sala.getIdSala());
                B.setNombreSala(sala.getNombreSala());
                B.setCodSala(sala.getCodSala());

                /** Solo procesar si es una nueva reserva
                if (esNuevaReserva) {

                    /** Validar disponibilidad del bloque
                    boolean disponible = reservaSalaService.validatedThatTheBlockIsNotReserved(
                            sala.getIdSala(),
                            diaSemanaEnum.name(),
                            B.getNumeroBloque()
                    );

                    if (!disponible) {
                        throw new GestionAcademicaException(
                                "El bloque " + B.getNumeroBloque() +
                                        " del día " + diaSemanaEnum.name() +
                                        " ya está reservado para la sala '" + sala.getNombreSala() + "'", HttpStatus.NOT_FOUND
                        );
                    }

                    /** Obtener bloque horario
                    BloqueHorario bloqueHorario = bloqueHorarioService.findById(B.getNumeroBloque());

                    /** Crear y guardar la nueva reserva
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

    }*/


}
