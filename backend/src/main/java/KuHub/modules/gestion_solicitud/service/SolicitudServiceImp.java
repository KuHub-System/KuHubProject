package KuHub.modules.gestion_solicitud.service;

import KuHub.modules.gestion_academica.entity.Semana;
import KuHub.modules.gestion_academica.repository.AsignaturaRepository;
import KuHub.modules.gestion_pedido.entity.Pedido;
import KuHub.modules.gestion_pedido.repository.DetallePedidoRepository;
import KuHub.modules.gestion_pedido.repository.PedidoRepository;
import KuHub.modules.gestion_pedido.repository.PedidoSolicitudRepository;
import KuHub.modules.pedido_semana_a_bodega.services.DetallePedidoSemanaBodegaService;
import KuHub.modules.gestion_sistema.entity.GestionSistema;
import KuHub.modules.gestion_sistema.repository.GestionSistemaRepository;
import KuHub.modules.gestion_solicitud.dtos.request.record.ChangeSolicitationStatus;
import KuHub.modules.gestion_solicitud.dtos.request.record.MassiveSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.record.ProyeccionAbastecimiento;
import KuHub.modules.gestion_solicitud.exception.GestionSolicitudException;
import KuHub.modules.gestion_solicitud.dtos.respose.record.CourseForSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.record.DashboardConsolidado;
import KuHub.modules.gestion_solicitud.dtos.request.*;
import KuHub.modules.gestion_solicitud.dtos.respose.projection.ResultsMassSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.respose.record.RecipeSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.record.SolicitationManagement;
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
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class SolicitudServiceImp implements SolicitudService {

    /**Repositories*/
    @Autowired
    private SolicitudRepository solicitudRepository;
    @Autowired
    private SemanaRepository semanaRepository;
    @Autowired
    private AsignaturaRepository asignaturaRepository;
    @Autowired
    private MotivoRechazoRepository motivoRechazoRepository;
    @Autowired
    private PedidoRepository pedidoRepository;
    @Autowired
    private DetallePedidoRepository detallePedidoRepository;
    @Autowired
    private PedidoSolicitudRepository pedidoSolicitudRepository;
    @Autowired
    private GestionSistemaRepository gestionSistemaRepository;

    /**Services*/
    @Autowired
    private DetallePedidoSemanaBodegaService detallePedidoSemanaBodegaService;
    @Autowired
    private UsuarioService usuarioService;

    /**Others*/
    @Autowired
    private ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    @Override
    public Solicitud findById(Integer idSolicitud) {
        return solicitudRepository.findById(idSolicitud).orElseThrow((
        ) -> new RuntimeException("Solicitud no encontrada"));
    }

    @Transactional(readOnly = true)
    @Override
    public List<CourseForSolicitation> findCourseWithSectionsAndBlocksRaw() {

        List<Object[]> rawResults = solicitudRepository.findCourseWithSectionsAndBlocksRaw();
        List<CourseForSolicitation> responseList = new ArrayList<>();

        for (Object[] row : rawResults) {

            String seccionesJson = row[2].toString();
            List<CourseForSolicitation.SectionDTO> secciones;
            try {
                secciones = objectMapper.readValue(
                        seccionesJson,
                        new TypeReference<List<CourseForSolicitation.SectionDTO>>() {}
                );
            } catch (Exception e) {
                throw new RuntimeException("Error al mapear el JSON de secciones: " + seccionesJson, e);
            }

            responseList.add(new CourseForSolicitation(
                    ((Number) row[1]).intValue(), // idAsignatura
                    (String) row[0],              // nombreAsignatura
                    secciones
            ));
        }
        return responseList;
    }

    @Transactional(readOnly = true)
    @Override
    public List<RecipeSolicitation> findActiveRecipesWithDetailsRaw() {

        List<Object[]> rawResults = solicitudRepository.findActiveRecipesWithDetailsRaw();
        List<RecipeSolicitation> responseList = new ArrayList<>();

        for (Object[] row : rawResults) {
            String detallesJsonb = row[2].toString();
            List<RecipeSolicitation.RecipeDetailsDTO> detalles;
            try {
                detalles = objectMapper.readValue(
                        detallesJsonb,
                        new TypeReference<List<RecipeSolicitation.RecipeDetailsDTO>>() {}
                );
            } catch (Exception e) {
                throw new RuntimeException("Error al mapear JSONB de receta detalles: " + detallesJsonb, e);
            }
            responseList.add(new RecipeSolicitation(
                    ((Number) row[0]).intValue(),                                // idReceta
                    (String) row[1],                                             // nombreReceta
                    row[3] != null ? ((Number) row[3]).intValue() : null,        // idSemana
                    detalles
            ));
        }
        return responseList;
    }


    @Transactional
    @Override
    public List<SolicitationManagement> findSolicitationsPerWeekRaw(DateRangeDTO request) {

        // 1. Auto-rechazar solicitudes con fecha vencida antes de retornar
        int vencidas = solicitudRepository.rechazarSolicitudesVencidas();
        if (vencidas > 0) {
            log.info("Auto-rechazo por fecha vencida: {} solicitud(es) rechazada(s) automáticamente.", vencidas);
        }

        // 2. Ejecutamos la "Súper Consulta" usando las fechas que vienen en el DTO
        List<Object[]> rawResults = solicitudRepository.findSolicitationsPerWeekRaw(
                request.getFechaInicio(),
                request.getFechaFin()
        );
        List<SolicitationManagement> responseList = new ArrayList<>();

        // 3. Iteramos y mapeamos los resultados
        for (Object[] row : rawResults) {
            // row[7] -> productos_solicitados
            List<SolicitationManagement.ProductDetailDTO> productos;
            try {
                productos = row[7] != null
                        ? objectMapper.readValue(row[7].toString(),
                        new TypeReference<List<SolicitationManagement.ProductDetailDTO>>() {})
                        : new ArrayList<>();
            } catch (Exception e) {
                productos = new ArrayList<>();
            }
            // row[8] -> asignatura_detalle
            SolicitationManagement.CourseDetailsDTO courseDetails = null;
            try {
                if (row[8] != null) {
                    courseDetails = objectMapper.readValue(
                            row[8].toString(),
                            SolicitationManagement.CourseDetailsDTO.class
                    );
                }
            } catch (Exception e) {
                throw new RuntimeException("Error crítico al mapear asignatura_detalle: " + row[8], e);
            }
            responseList.add(new SolicitationManagement(
                    ((java.sql.Date) row[0]).toLocalDate(),              // fechaSolicitada
                    (String) row[1],                                      // nombreReceta
                    (Integer) row[2],                                     // idSolicitud
                    row[3] != null ? ((Number) row[3]).intValue() : null, // idReceta
                    row[4] != null ? ((Number) row[4]).intValue() : null, // idReservaSala
                    row[5].toString(),                                    // estadoSolicitud
                    row[6] != null ? row[6].toString() : "",             // observaciones
                    productos,
                    courseDetails,
                    row[9] != null ? row[9].toString() : null            // motivoRechazo
            ));
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
     * @param payloadList Lista de DTOs ({@link }) que contiene la estructura
     * jerárquica de asignaturas, secciones, horarios, recetas y deltas a procesar.
     * @return {@link ResultsMassSolicitationView} Proyección con las métricas finales del proceso
     * (total de solicitudes creadas y total de detalles procesados).
     * @throws RuntimeException Si ocurre un error de serialización (Jackson) al intentar convertir
     * la lista de objetos a su representación JSON.
     */
    @Override
    @Transactional
    public ResultsMassSolicitationView saveMass(List<MassiveSolicitation> payloadList) {
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
    public boolean changeMassiveStatus(ChangeSolicitationStatus request) {

        // 0. Validar estados inmutables
        List<Integer> todosLosIds = request.estadosSolicitudes().stream()
                .map(ChangeSolicitationStatus.StatusItemDTO::idSolicitud)
                .toList();

        if (solicitudRepository.existsByIdSolicitudInAndEstadoInmutable(todosLosIds)) {
            throw new GestionSolicitudException(
                    "No es posible cambiar el estado de solicitudes en estado EN_PEDIDO o PROCESADO."
            );
        }

        int totalEsperados = request.estadosSolicitudes().size();
        int totalActualizados = 0;

        // 1. Separar ACEPTADAS del resto
        List<Integer> idsAceptadas = request.estadosSolicitudes().stream()
                .filter(i -> "ACEPTADA".equals(StringUtils.normalizeToEnumKey(i.estado())))
                .map(ChangeSolicitationStatus.StatusItemDTO::idSolicitud)
                .toList();

        List<ChangeSolicitationStatus.StatusItemDTO> otrosEstados = request.estadosSolicitudes().stream()
                .filter(i -> !"ACEPTADA".equals(StringUtils.normalizeToEnumKey(i.estado())))
                .toList();

        // 2. Procesar ACEPTADAS según configuración del sistema
        if (!idsAceptadas.isEmpty()) {
            GestionSistema config = gestionSistemaRepository.findById(2)
                    .orElseThrow(() -> new RuntimeException("Configuración del sistema no encontrada."));

            if (Boolean.TRUE.equals(config.getSolicitudesEnPedido())) {
                // Con boolean activo: incorporar al pedido y pasar a EN_PEDIDO
                Integer idPedido = procesarPedidoDesdeAceptadas(idsAceptadas, request.idSemana());
                totalActualizados += solicitudRepository.updateMassiveStateSolicitation(idsAceptadas, Solicitud.EstadoSolicitud.EN_PEDIDO);
                log.info("Solicitudes {} incorporadas al pedido {} con estado EN_PEDIDO.", idsAceptadas, idPedido);
            } else {
                // Sin boolean: flujo normal → ACEPTADA, pendiente de gestión de pedido
                totalActualizados += solicitudRepository.updateMassiveStateSolicitation(idsAceptadas, Solicitud.EstadoSolicitud.ACEPTADA);
            }
        }

        // 3. Procesar otros estados (RECHAZADA, etc.)
        Map<String, List<Integer>> idsPorEstado = otrosEstados.stream()
                .collect(Collectors.groupingBy(
                        item -> StringUtils.normalizeToEnumKey(item.estado()),
                        Collectors.mapping(ChangeSolicitationStatus.StatusItemDTO::idSolicitud, Collectors.toList())
                ));

        for (Map.Entry<String, List<Integer>> entry : idsPorEstado.entrySet()) {
            String estadoNormalizado = entry.getKey();
            List<Integer> listaIds = entry.getValue();
            if (estadoNormalizado != null && !estadoNormalizado.isEmpty() && !listaIds.isEmpty()) {
                totalActualizados += solicitudRepository.updateMassiveStateSolicitation(listaIds, Solicitud.EstadoSolicitud.valueOf(estadoNormalizado));
            } else {
                throw new IllegalArgumentException("Se detectó un estado inválido en la petición masiva.");
            }
        }

        // 4. Validación de integridad
        if (totalActualizados != totalEsperados) {
            log.error("ROLLBACK ACTIVADO — Se esperaban {} actualizaciones, BD reportó {}.", totalEsperados, totalActualizados);
            throw new RuntimeException("Inconsistencia de datos: Se esperaba actualizar "
                    + totalEsperados + " solicitudes, pero se encontraron " + totalActualizados);
        }

        // 5. Guardar motivos para RECHAZADA
        for (ChangeSolicitationStatus.StatusItemDTO item : request.estadosSolicitudes()) {
            if ("RECHAZADA".equals(StringUtils.normalizeToEnumKey(item.estado()))
                    && item.motivo() != null && !item.motivo().isBlank()) {
                motivoRechazoRepository.upsertMotivo(item.idSolicitud(), item.motivo().trim());
                log.info("Motivo de rechazo guardado para solicitud ID {}.", item.idSolicitud());
            }
        }

        log.info("Actualización masiva exitosa. {} solicitudes actualizadas.", totalActualizados);
        return true;
    }

    private Integer procesarPedidoDesdeAceptadas(List<Integer> idsAceptadas, Integer idSemana) {
        if (idSemana == null) {
            throw new GestionSolicitudException(
                    "Se requiere idSemana cuando solicitudesEnPedido está activado.");
        }

        Semana semana = semanaRepository.findById(idSemana)
                .orElseThrow(() -> new GestionSolicitudException(
                        "Semana con ID " + idSemana + " no encontrada."));

        // Buscar pedido activo en el rango de la semana o crear uno nuevo
        Integer idPedido = pedidoRepository
                .findIdPedidoActivoEnRango(semana.getFechaInicio(), semana.getFechaFin())
                .orElseGet(() -> {
                    Pedido nuevo = new Pedido();
                    nuevo.setFechaInicioPedido(semana.getFechaInicio());
                    nuevo.setFechaFinPedido(semana.getFechaFin());
                    nuevo.setEstadoPedido(Pedido.EstadoPedidoType.PENDIENTE);
                    return pedidoRepository.save(nuevo).getIdPedido();
                });

        // Vincular cada solicitud al pedido y agregar sus productos
        for (Integer idSolicitud : idsAceptadas) {
            pedidoSolicitudRepository.insertIfNotExists(idPedido, idSolicitud);
            detallePedidoRepository.upsertDetallesFromSolicitud(idPedido, idSolicitud);
        }

        return idPedido;
    }

    /** Rechaza automáticamente solicitudes PENDIENTES con fecha vencida. Se ejecuta diariamente a las 03:00 AM. */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void rechazarVencidasScheduled() {
        int rechazadas = solicitudRepository.rechazarSolicitudesVencidas();
        if (rechazadas > 0) {
            log.info("[Scheduler] Auto-rechazo nocturno: {} solicitud(es) vencida(s) rechazada(s).", rechazadas);
        }
    }

    @Transactional(readOnly = true)
    @Override
    public DashboardConsolidado obtenerDashboard(DateRangeDTO request) {

        // 1. Obtener y mapear la lista de solicitudes (Consulta A)
        List<Object[]> rawSolicitudes = solicitudRepository.findSolicitudesParaDashboard(request.getFechaInicio(), request.getFechaFin());
        List<DashboardConsolidado.SolicitudDashboardDTO> listaSolicitudes = new ArrayList<>();

        for (Object[] row : rawSolicitudes) {
            try {
                // Parsear el JSON de la columna 4 al Record AsignaturaDetalleDTO
                String jsonAsignaturaDetalle = (row[4] != null) ? row[4].toString() : "{}";

                DashboardConsolidado.AsignaturaDetalleDTO asignaturaDetalle =
                        objectMapper.readValue(jsonAsignaturaDetalle, DashboardConsolidado.AsignaturaDetalleDTO.class);

                listaSolicitudes.add(new DashboardConsolidado.SolicitudDashboardDTO(
                        ((Number) row[0]).intValue(),                 // idSolicitud
                        ((java.sql.Date) row[1]).toLocalDate(),       // fechaSolicitada
                        (String) row[2],                              // nombreReceta
                        (String) row[3],                              // observaciones
                        asignaturaDetalle                             // JSON Parseado correctamente
                ));
            } catch (Exception e) {
                log.error("Error parseando detalle de la solicitud ID: {}", row[0], e);
            }
        }

        // 2. Obtener y parsear el JSON del consolidado global (Consulta B)
        String jsonConsolidado = solicitudRepository.findConsolidadoGlobalJson(request.getFechaInicio(), request.getFechaFin());
        List<DashboardConsolidado.ProductoConsolidadoDTO> listaConsolidado = new ArrayList<>();

        try {
            if (jsonConsolidado != null && !jsonConsolidado.isEmpty()) {
                listaConsolidado = objectMapper.readValue(
                        jsonConsolidado,
                        new TypeReference<List<DashboardConsolidado.ProductoConsolidadoDTO>>() {}
                );
            }
        } catch (Exception e) {
            log.error("Error parseando el consolidado global", e);
        }

        // 3. Empaquetar y retornar
        return new DashboardConsolidado(listaSolicitudes, listaConsolidado);
    }

    /**
     * Obtiene la proyección de abastecimiento consolidada de productos cuyas solicitudes
     * tienen estado EN_PEDIDO, filtradas por rango de fechas (fecha_solicitada).
     * Agrupa por categoría y nombre de producto, sumando cantidades totales solicitadas.
     *
     * @param request DTO con fechaInicio y fechaFin del rango a consultar.
     * @return {@link ProyeccionAbastecimiento} con la lista de productos consolidados.
     */
    @Transactional(readOnly = true)
    @Override
    public ProyeccionAbastecimiento findProyeccionAbastecimiento(DateRangeDTO request) {

        // 1. Validar fechas
        if (request.getFechaInicio() == null || request.getFechaFin() == null) {
            log.warn("Fechas nulas en solicitud de proyección de abastecimiento");
            return new ProyeccionAbastecimiento(new ArrayList<>());
        }

        // 2. Ejecutar la consulta nativa que retorna un único JSON string
        String jsonRaw = null;
        try {
            jsonRaw = solicitudRepository.findProyeccionAbastecimientoJson(
                    request.getFechaInicio(),
                    request.getFechaFin()
            );
            log.info("Consulta proyección abastecimiento completada. Resultado nulo: {}", jsonRaw == null);
        } catch (Exception e) {
            log.error("Error ejecutando consulta de proyección abastecimiento", e);
            return new ProyeccionAbastecimiento(new ArrayList<>());
        }

        // 3. Si no hay datos, retornar lista vacía
        List<ProyeccionAbastecimiento.ProductoAbastecimientoItem> items = new ArrayList<>();

        try {
            if (jsonRaw != null && !jsonRaw.isBlank()) {
                items = objectMapper.readValue(
                        jsonRaw,
                        new TypeReference<List<ProyeccionAbastecimiento.ProductoAbastecimientoItem>>() {}
                );
                log.info("Proyección abastecimiento parseada: {} productos", items.size());
            }
        } catch (JsonProcessingException e) {
            log.error("Error parseando JSON de proyección. JSON recibido: {}", jsonRaw, e);
            return new ProyeccionAbastecimiento(new ArrayList<>());
        }

        // 4. Empaquetar y retornar
        return new ProyeccionAbastecimiento(items);
    }

}
