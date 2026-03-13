package KuHub.modules.gestion_solicitud.service;

import KuHub.modules.gestion_academica.repository.AsignaturaRepository;
import KuHub.modules.gestion_receta.services.DetalleRecetaService;
import KuHub.modules.gestion_solicitud.dtos.*;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.*;
import KuHub.modules.gestion_solicitud.dtos.request.*;
import KuHub.modules.gestion_solicitud.dtos.respose.CourseDetailsDTO;
import KuHub.modules.gestion_solicitud.dtos.respose.ProductDetailSolicitationDTO;
import KuHub.modules.gestion_solicitud.dtos.respose.ResultsMassSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.respose.SolicitationManagementDTO;
import KuHub.modules.gestion_solicitud.entity.Solicitud;
import KuHub.modules.gestion_solicitud.repository.MotivoRechazoRepository;
import KuHub.modules.gestion_solicitud.repository.SolicitudRepository;
import KuHub.modules.gestion_usuario.service.UsuarioService;
import KuHub.modules.gestion_academica.repository.SemanaRepository;
import KuHub.utils.StringUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class SolicitudServiceImp implements SolicitudService{

    @Autowired
    private SolicitudRepository solicitudRepository;
    @Autowired
    private DetalleRecetaService detalleRecetaService;
    @Autowired
    private UsuarioService usuarioService;
    @Autowired
    private SemanaRepository semanaRepository;
    @Autowired
    private AsignaturaRepository asignaturaRepository;
    @Autowired
    private MotivoRechazoRepository motivoRechazoRepository;
    @Autowired
    private ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    @Override
    public Solicitud findById(Integer idSolicitud){
        return solicitudRepository.findById(idSolicitud).orElseThrow((
        ) -> new RuntimeException("Solicitud no encontrada"));
    }

    @Transactional(readOnly = true)
    @Override
    public List<CourseForSolicitationDTO> findCourseWithSectionsAndBlocksRaw() {
        List<Object[]> rawResults = solicitudRepository.findCourseWithSectionsAndBlocksRaw();
        List<CourseForSolicitationDTO> responseList = new ArrayList<>();

        for (Object[] row : rawResults) {
            CourseForSolicitationDTO courseDTO = new CourseForSolicitationDTO();

            // row[0] es nombre_asignatura, row[1] es id_asignatura
            courseDTO.setNombreAsignatura((String) row[0]);
            courseDTO.setIdAsignatura(((Number) row[1]).intValue());
            // row[2] es el JSON de secciones anidadas
            String seccionesJson = row[2].toString();
            try {
                // Jackson lee el String y lo convierte en la Lista de Secciones (y Bloques adentro)
                List<SectionForSolicitationDTO> seccionesList = objectMapper.readValue(
                        seccionesJson,
                        new TypeReference<List<SectionForSolicitationDTO>>() {}
                );
                courseDTO.setSecciones(seccionesList);
            } catch (Exception e) {
                throw new RuntimeException("Error al mapear el JSON de secciones: " + seccionesJson, e);
            }
            responseList.add(courseDTO);
        }
        return responseList;
    }

    @Transactional(readOnly = true)
    @Override
    public List<RecipeSolicitationDTO> findActiveRecipesWithDetailsRaw() {

        List<Object[]> rawResults = solicitudRepository.findActiveRecipesWithDetailsRaw();
        List<RecipeSolicitationDTO> responseList = new ArrayList<>();

        for (Object[] row : rawResults) {
            RecipeSolicitationDTO dto = new RecipeSolicitationDTO();

            // Mapeamos el ID y el Nombre
            dto.setIdReceta(((Number) row[0]).intValue());
            dto.setNombreReceta((String) row[1]);
            // Mapeamos el JSONB a la lista de detalles
            String detallesJsonb = row[2].toString();
            try {
                List<RecipeDetailsSolicitationDTO> detallesList = objectMapper.readValue(
                        detallesJsonb,
                        new TypeReference<List<RecipeDetailsSolicitationDTO>>() {}
                );
                dto.setDetalles(detallesList);
            } catch (Exception e) {
                throw new RuntimeException("Error al mapear JSONB de receta detalles: " + detallesJsonb, e);
            }
            responseList.add(dto);
        }
        return responseList;
    }


    @Transactional(readOnly = true)
    @Override
    public List<SolicitationManagementDTO> findSolicitationsPerWeekRaw(DateRangeDTO request) {

        // 1. Ejecutamos la "Súper Consulta" usando las fechas que vienen en el DTO
        List<Object[]> rawResults = solicitudRepository.findSolicitationsPerWeekRaw(
                request.getFechaInicio(),
                request.getFechaFin()
        );
        List<SolicitationManagementDTO> responseList = new ArrayList<>();

        // 2. Iteramos y mapeamos los resultados
        for (Object[] row : rawResults) {
            SolicitationManagementDTO dto = new SolicitationManagementDTO();
            // row[0] -> fecha_solicitada
            dto.setFechaSolicitada(((java.sql.Date) row[0]).toLocalDate());
            // row[1] -> nombre_receta
            dto.setNombreReceta((String) row[1]);
            // row[2] -> id_solicitud
            dto.setIdSolicitud((Integer) row[2]);
            // row[3] -> id_receta (Manejo de Long/Integer de JPA)
            dto.setIdReceta(row[3] != null ? ((Number) row[3]).intValue() : null);
            // row[4] -> id_reserva_sala
            dto.setIdReservaSala(row[4] != null ? ((Number) row[4]).intValue() : null);
            // row[5] -> estado_solicitud
            dto.setEstadoSolicitud(row[5].toString());
            // row[6] -> observaciones
            dto.setObservaciones(row[6] != null ? row[6].toString() : "");
            // --- Mapeo de JSONs ---
            // row[7] -> productos_solicitados (Lista de insumos)
            try {
                if (row[7] != null) {
                    List<ProductDetailSolicitationDTO> productos = objectMapper.readValue(
                            row[7].toString(),
                            new TypeReference<List<ProductDetailSolicitationDTO>>() {}
                    );
                    dto.setProductos(productos);
                } else {
                    dto.setProductos(new ArrayList<>());
                }
            } catch (Exception e) {
                dto.setProductos(new ArrayList<>()); // Fallback por si el JSON falla
            }
            // row[8] -> asignatura_detalle (Estructura de la clase)
            try {
                if (row[8] != null) {
                    CourseDetailsDTO courseDetails = objectMapper.readValue(
                            row[8].toString(),
                            CourseDetailsDTO.class
                    );
                    dto.setAsignaturaDetalle(courseDetails);
                }
            } catch (Exception e) {
                throw new RuntimeException("Error crítico al mapear asignatura_detalle: " + row[8], e);
            }
            responseList.add(dto);
        }
        return responseList;
    }

    /**
     * Procesa y guarda de manera masiva múltiples solicitudes de insumos y sus detalles.
     * <p>
     * Este método optimiza el rendimiento delegando la lógica de negocio intensiva directamente
     * al motor de base de datos (PostgreSQL). Serializa la lista de solicitudes a un formato JSON crudo
     * y lo envía a una función PL/pgSQL encargada de realizar el "Súper Cálculo".
     * </p>
     * <b>Operaciones realizadas por la Base de Datos:</b>
     * <ul>
     * <li>Cálculo dinámico del multiplicador de porciones (inscritos / 20 base).</li>
     * <li>Procesamiento de "Deltas": omisión de productos eliminados, actualización de modificados e inserción de nuevos.</li>
     * <li>Aplicación de reglas de redondeo estricto (hacia arriba) para unidades no fraccionarias.</li>
     * <li>Filtrado de seguridad para ignorar productos inactivos.</li>
     * <li>Inserción masiva en las tablas particionadas de {@code solicitud} y {@code detalle_solicitud}.</li>
     * </ul>
     *
     * @param payloadList Lista de DTOs ({@link MassiveSolicitationDTO}) que contiene la estructura
     * jerárquica de asignaturas, secciones, horarios, recetas y deltas a procesar.
     * @return {@link ResultsMassSolicitationView} Proyección con las métricas finales del proceso
     * (total de solicitudes creadas y total de detalles procesados).
     * @throws RuntimeException Si ocurre un error de serialización (Jackson) al intentar convertir
     * la lista de objetos a su representación JSON.
     */
    @Override
    @Transactional
    public ResultsMassSolicitationView saveMass(List<MassiveSolicitationDTO> payloadList) {
        try {
            // 1. Convertimos la lista de DTOs a un String JSON
            String jsonPayload = objectMapper.writeValueAsString(payloadList);

            // 2. Ejecutamos la función en la base de datos y retornamos directamente la interfaz
            return solicitudRepository.ejecutarSolicitudMasivaRaw(jsonPayload);

        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error crítico al serializar el payload de solicitudes masivas", e);
        }
    }

    @Override
    @Transactional
    public boolean changeMassiveStatus(ChangeSolicitationStatusDTO request) {

        // 1. Sabemos exactamente cuántas solicitudes deberíamos actualizar
        int totalEsperados = request.getEstadosSolicitudes().size();
        int totalActualizados = 0;

        // 2. Agrupamos los IDs por estado
        Map<String, List<Integer>> idsPorEstado = request.getEstadosSolicitudes().stream()
                .collect(Collectors.groupingBy(
                        item -> StringUtils.normalizeToEnumKey(item.getEstado()),
                        Collectors.mapping(SolicitationStatusItemDTO::getIdSolicitud, Collectors.toList())
                ));

        // 3. Ejecutamos los UPDATES masivos y sumamos las filas afectadas
        for (Map.Entry<String, List<Integer>> entry : idsPorEstado.entrySet()) {
            String estadoNormalizado = entry.getKey();
            List<Integer> listaIds = entry.getValue();

            if (estadoNormalizado != null && !estadoNormalizado.isEmpty() && !listaIds.isEmpty()) {
                // El repositorio nos devuelve cuántas filas se afectaron en este grupo
                int filasAfectadas = solicitudRepository.updateMassiveStateSolicitation(listaIds, estadoNormalizado);
                totalActualizados += filasAfectadas;
            } else {
                throw new IllegalArgumentException("Se detectó un estado inválido en la petición masiva.");
            }
        }

        // 4. Validación de integridad
        if (totalActualizados != totalEsperados) {
            /* OJO AQUÍ: Como estamos en un @Transactional, si lanzamos una excepción
               (RuntimeException), PostgreSQL hará un ROLLBACK automático.
               Es decir, si mandaron 10 IDs y solo existían 8 en la base de datos,
               la base de datos deshace los 8 cambios para proteger la integridad. */
            log.error("ROLLBACK ACTIVADO - Inconsistencia de datos. Se esperaban actualizar {} solicitudes, pero la BD reportó" +
                    " {}", totalEsperados, totalActualizados);

            throw new RuntimeException("Inconsistencia de datos: Se esperaba actualizar "
                    + totalEsperados + " solicitudes, pero se encontraron " + totalActualizados);
        }
        log.info("Actualización masiva exitosa. Se actualizaron {} solicitudes correctamente.", totalActualizados);
        return true;
    }


    /**
    @Transactional
    @Override
    public void updateSolicitationStatus(SolicitationStatusUpdateDTO dto) {

        // 1. Reutilizamos tu método findById (Si falla, lanza la Excepción automáticamente)
        Solicitud solicitud = this.findById(dto.getIdSolicitud());

        // 2. Validación de Estado PROCESADO (Regla de negocio: si ya está cerrada no se toca)
        if (solicitud.getEstadoSolicitud() == Solicitud.EstadoSolicitud.PROCESADO) {
            throw new GestionSolicitudException("No se puede modificar una solicitud que ya está PROCESADA.");
        }

        // 3. Normalización y Conversión segura usando tu StringUtils
        String estadoKey = StringUtils.normalizeToEnumKey(dto.getEstado());

        Solicitud.EstadoSolicitud nuevoEstado;
        try {
            nuevoEstado = Solicitud.EstadoSolicitud.valueOf(estadoKey);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new GestionSolicitudException("El estado enviado no es válido: " + dto.getEstado());
        }

        // 4. Lógica Específica según el nuevo estado
        if (nuevoEstado == Solicitud.EstadoSolicitud.RECHAZADA) {
            // A. Validación: Obligatorio tener motivo
            if (dto.getMotivoRechazo() == null || dto.getMotivoRechazo().isBlank()) {
                throw new GestionSolicitudException("Para RECHAZAR una solicitud, debe ingresar un motivo.");
            }

            // B. Guardar en tabla separada (motivo_rechazo_solicitud)
            MotivoRechazoSolicitud rechazo = MotivoRechazoSolicitud.builder()
                    .idSolicitud(solicitud.getIdSolicitud())
                    .motivo(StringUtils.normalizeSpaces(dto.getMotivoRechazo()))
                    .build();

            motivoRechazoRepository.save(rechazo);

        } else if (nuevoEstado == Solicitud.EstadoSolicitud.ACEPTADA) {
            // Opcional: Podrías querer borrar un motivo de rechazo previo si existiera
            // pero dado que es un historial, dejarlo o borrarlo depende de tu regla de negocio.
        }

        // 5. Actualizar el estado en la tabla principal
        solicitud.setEstadoSolicitud(nuevoEstado);
        solicitudRepository.save(solicitud);
    }

    @Transactional(readOnly = true)
    @Override
    public List<ManagementSolicitationView> findManagementSolicitations(ManagementFilterRequestDTO filter) {

        // Si el filtro es nulo total, mandamos todo null
        if (filter == null) {
            return solicitudRepository.findManagementSolicitations(null, null, null, null);
        }

        // 1. Procesamos los IDs numéricos (convierte 0 en null)
        Integer idDocente = processIdFilter(filter.getIdDocente());
        Integer idSemana = processIdFilter(filter.getIdSemana());
        Integer idAsignatura = processIdFilter(filter.getIdAsignatura());

        // 2. Procesamos el Estado (convierte "Todos" en null y normaliza texto)
        String estadoProcesado = processEstadoFilter(filter.getEstadoSolicitud());

        return solicitudRepository.findManagementSolicitations(
                idDocente,
                idSemana,
                idAsignatura,
                estadoProcesado
        );
    }

// =========================================================================
// MÉTODOS PRIVADOS DE CONTROL Y PARSEO
// =========================================================================

    /**
     * Controla los filtros numéricos (IDs).
     * Regla: Si es NULL o es 0 (valor por defecto de "Select"), retorna NULL para ignorar el filtro en SQL.

    private Integer processIdFilter(Integer id) {
        if (id == null || id == 0) {
            return null;
        }
        return id;
    }

    /**
     * Controla el filtro de Estado (String).
     * Regla 1: Si es NULL, Vacío, "0" o contiene "TODOS", retorna NULL.
     * Regla 2: Si es un valor válido, lo normaliza a formato ENUM (Mayúsculas, sin tildes, guiones bajos).

    private String processEstadoFilter(String rawEstado) {
        if (rawEstado == null || rawEstado.isBlank()) {
            return null;
        }

        // Normalizamos temporalmente para chequear si es la opción "Todos"
        // "Todos los estados" -> "TODOS LOS ESTADOS" o "0"
        String checkValue = rawEstado.trim().toUpperCase();

        if (checkValue.equals("0") || checkValue.contains("TODOS")) {
            return null; // El WHERE (:estado IS NULL) hará el trabajo
        }

        // Si llegamos aquí, es un estado real (ej: "Pendiente", "Aceptada")
        // Usamos tu utilidad para convertirlo a "PENDIENTE", "ACEPTADA", etc.
        return StringUtils.normalizeToEnumKey(rawEstado);
    }


    @Transactional(readOnly = true)
    @Override
    public ManagementSolicitationSelectorsDTO getSelectorsForManagement() {
        // 1. Obtener Semanas (Usando la proyección nativa que arreglamos antes)
        List<WeekIdDescripcionView> semanas = semanaRepository.findAllForSelector();

        // 2. Obtener Asignaturas (Asegúrate de tener este método o uno similar en tu repo)
        // Podría ser findAllProjectedBy() o algo similar que devuelva CourseSolicitationSelectView
        List<CourseSolicitationSelectView> asignaturas = asignaturaRepository.findAllActiveForSelector();

        // 3. Obtener Docentes (Usuarios con rol docente)
        // Asegúrate de tener un método que devuelva UserIdAndCompleteNameDTO
        List<UsersToManageCourseOrSectionView> docentes = usuarioService.usersAssignedToSection();

        // 4. Construir y retornar el DTO
        ManagementSolicitationSelectorsDTO response = new ManagementSolicitationSelectorsDTO();
        response.setSemanas(semanas);
        response.setAsignaturas(asignaturas);


        return response;
    }

    @Transactional(readOnly = true)
    @Override
    public List<SectionAvailabilityView> checkSectionAvailability (CheckSectionAvailabilityRequestDTO r){
        return solicitudRepository.checkSectionAvailability(r.getIdSemana(),r.getIdsSecciones());
    }

    /**
    @Transactional
    @Override
    public void saveSolicitation(SolicitationCreateRequestDTO request){

        // Llamamos al método que creamos antes. Esto valida el token y trae el ID real.
        UserIdNameDTO usuarioLogueado = usuarioService.getUsuarioConectado();

        // Guardamos el ID en una variable para usarla más abajo en el bucle
        Integer idUsuarioAutenticado = usuarioLogueado.id();

        // ========================================================================================
        // 1. PREPARACIÓN DE DATOS (FUERA DEL BUCLE)
        // ========================================================================================

        // 1.1. MAPEO DE ADICIONALES (CANTIDADES FRONT)
        Map<Integer, Double> mapCantidadesFront = new HashMap<>();
        if (request.getItemsAdicionales() != null && !request.getItemsAdicionales().isEmpty()) {
            mapCantidadesFront = request.getItemsAdicionales().stream()
                    .collect(Collectors.toMap(
                            AdditionalItemCreateRequestDTO::getIdProducto,
                            AdditionalItemCreateRequestDTO::getCantidadAdicional,
                            Double::sum
                    ));
        }

        // 1.2. CONTEXTO DE PRODUCTOS ADICIONALES (FUSIÓN FRONT + BBDD)
        Map<Integer, ContextoProductoUnidad> mapaContextoAdicionales = new HashMap<>();

        if (!mapCantidadesFront.isEmpty()) {
            // Obtenemos IDs
            List<Integer> idsProductos = new ArrayList<>(mapCantidadesFront.keySet());

            // Consultamos UNIDADES a la BD (Una sola vez)
            List<ProductoUnidadView> unidadesView = solicitudRepository.FindUnidadesByIds(idsProductos);

            // FUSIÓN: BD (Unidad) + FRONT (Cantidad)
            for (ProductoUnidadView view : unidadesView) {
                Integer id = view.getIdProducto();
                Double cantidadTotalDelFront = mapCantidadesFront.get(id);

                mapaContextoAdicionales.put(id, new ContextoProductoUnidad(
                        id,
                        view.getUnidadMedida(), // Dato de BBDD
                        cantidadTotalDelFront   // Dato del Front
                ));
            }
        }

        // 1.3. PREPARAR RECETA (FILTRADO)
        List<DetalleReceta> listaRecetaFiltrada = new ArrayList<>();
        if (request.getIdReceta() != null) {
            List<DetalleReceta> listaCompleta = detalleRecetaService.findAllByIdReceta(request.getIdReceta());
            List<Integer> idsEliminados = request.getDetalleRecetaIdsEliminados();

            if (idsEliminados != null && !idsEliminados.isEmpty()) {
                listaRecetaFiltrada = listaCompleta.stream()
                        .filter(d -> !idsEliminados.contains(d.getIdDetalleReceta()))
                        .collect(Collectors.toList());
            } else {
                listaRecetaFiltrada = listaCompleta;
            }
        }

        // 1.4. CONTEXTO DE SECCIONES (FUSIÓN FRONT + BBDD)
        List<Integer> idsSecciones = request.getSecciones().stream()
                .map(SectionsForSolicitationRequestDTO::getIdSeccion)
                .collect(Collectors.toList());

        List<SeccionInscritosView> inscritosView = solicitudRepository.findInscritosByIds(idsSecciones);

        Map<Integer, Integer> mapaInscritosBD = inscritosView.stream()
                .collect(Collectors.toMap(SeccionInscritosView::getIdSeccion, SeccionInscritosView::getNumInscritos));

        List<ContextoSeccion> listaContextoSecciones = new ArrayList<>();
        for (SectionsForSolicitationRequestDTO ss : request.getSecciones()) {
            Integer inscritos = mapaInscritosBD.getOrDefault(ss.getIdSeccion(), 0);
            listaContextoSecciones.add(new ContextoSeccion(
                    ss.getIdSeccion(),
                    ss.getFechaCalculadaSolicitud(),
                    inscritos
            ));
        }

        // ========================================================================================
        // 2. PROCESAMIENTO
        // ========================================================================================
        List<Solicitud> listaParaGuardar = new ArrayList<>();

        for (ContextoSeccion ctx : listaContextoSecciones) {

            Solicitud solicitud = new Solicitud();
            solicitud.setIdUsuarioGestorSolicitud(idUsuarioAutenticado);
            solicitud.setIdSeccion(ctx.getIdSeccion());
            solicitud.setFechaSolicitada(ctx.getFechaSolicitada());
            solicitud.setObservaciones(request.getObservaciones());
            solicitud.setEstadoSolicitud(Solicitud.EstadoSolicitud.PENDIENTE);

            Set<Integer> idsAdicionalesProcesados = new HashSet<>();

            // A. PROCESAR PRODUCTOS DE LA RECETA
            for (DetalleReceta dr : listaRecetaFiltrada) {
                DetalleSolicitud detalle = new DetalleSolicitud();
                Integer idProducto = dr.getProducto().getIdProducto();

                BigDecimal cantidadBase = dr.getCantProducto();
                String observacionFinal = null;

                // Fusión usando el Mapa Contexto (Ya tiene la info necesaria)
                if (mapaContextoAdicionales.containsKey(idProducto)) {
                    ContextoProductoUnidad ctxProd = mapaContextoAdicionales.get(idProducto);

                    Double cantAdicional = ctxProd.getCantidadAdicional();
                    cantidadBase.add(cantAdicional;

                    observacionFinal = String.format("Se adicionaron %.2f unidades (base) al producto", cantAdicional);
                    idsAdicionalesProcesados.add(idProducto);
                }

                // Cálculo y Redondeo
                Double cantidadEscalada = (cantidadBase / 20.0) * ctx.getNumInscritos();

                /**if ("UNIDAD".equalsIgnoreCase(dr.getProducto().getUnidadMedida())) {
                    cantidadEscalada = Math.ceil(cantidadEscalada);
                } else {
                    // CAMBIO: Usamos 3 decimales en lugar de 2
                    // Esto permite guardar cantidades como 0.125 Kg (125 gramos) sin perder precisión
                    cantidadEscalada = BigDecimal.valueOf(cantidadEscalada)
                            .setScale(3, RoundingMode.HALF_UP)
                            .doubleValue();
                }

                detalle.setIdProducto(idProducto);
                detalle.setCantProductoSolicitud(cantidadEscalada);
                detalle.setObservacion(observacionFinal);

                solicitud.addDetalle(detalle);
            }

            // B. PROCESAR ADICIONALES PUROS (OPTIMIZADO - SIN CONSULTA INTERNA)
            for (ContextoProductoUnidad ctxProd : mapaContextoAdicionales.values()) {

                if (!idsAdicionalesProcesados.contains(ctxProd.getIdProducto())) {
                    DetalleSolicitud detalleExtra = new DetalleSolicitud();

                    // 1. Asignamos producto SOLO con la referencia (FK)
                    // Como el ID existe (porque lo buscamos en el paso 1.2), esto es seguro.
                    detalleExtra.setIdProducto(ctxProd.getIdProducto());

                    // 2. Calculamos usando los datos del CONTEXTO (Ram)
                    Double cantidadBase = ctxProd.getCantidadAdicional();
                    Double cantidadEscalada = (cantidadBase / 20.0) * ctx.getNumInscritos();

                    // 3. Redondeo usando la unidad del CONTEXTO (Ram)
                    if ("UNIDAD".equalsIgnoreCase(ctxProd.getUnidadaMedida())) {
                        cantidadEscalada = Math.ceil(cantidadEscalada);
                    } else {
                        // CAMBIO: Usamos 3 decimales en lugar de 2
                        // Esto permite guardar cantidades como 0.125 Kg (125 gramos) sin perder precisión
                        cantidadEscalada = BigDecimal.valueOf(cantidadEscalada)
                                .setScale(3, RoundingMode.HALF_UP)
                                .doubleValue();
                    }

                    detalleExtra.setCantProductoSolicitud(cantidadEscalada);
                    detalleExtra.setObservacion("Adicional");

                    solicitud.addDetalle(detalleExtra);
                }
            }

            listaParaGuardar.add(solicitud);
        }

        // ========================================================================================
        // 3. GUARDADO
        // ========================================================================================
        System.out.println("Lista para guardar: " + listaParaGuardar.size());
        solicitudRepository.saveAll(listaParaGuardar);
        System.out.println("¡Guardado completado!");
    }

    @Getter
    @AllArgsConstructor
    private static class ContextoSeccion {
        private Integer idSeccion;
        private LocalDate fechaSolicitada;
        private Integer numInscritos;
    }

    @Getter
    @AllArgsConstructor
    private static class ContextoProductoUnidad {
        private Integer idProducto;
        private String unidadaMedida;
        private Double cantidadAdicional;
    }
    */
}
