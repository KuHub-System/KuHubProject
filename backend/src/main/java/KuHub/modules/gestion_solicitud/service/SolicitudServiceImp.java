package KuHub.modules.gestion_solicitud.service;

import KuHub.modules.gestion_academica.repository.AsignaturaRepository;
import KuHub.modules.gestion_receta.services.DetalleRecetaService;
import KuHub.modules.gestion_solicitud.dtos.request.record.ChangeSolicitationStatus;
import KuHub.modules.gestion_solicitud.dtos.request.record.MassiveSolicitation;
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
    public List<RecipeSolicitation> findActiveRecipesWithDetailsRaw()  {

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
                    ((Number) row[0]).intValue(), // idReceta
                    (String) row[1],              // nombreReceta
                    detalles
            ));
        }
        return responseList;
    }


    @Transactional(readOnly = true)
    @Override
    public List<SolicitationManagement> findSolicitationsPerWeekRaw(DateRangeDTO request) {

        // 1. Ejecutamos la "Súper Consulta" usando las fechas que vienen en el DTO
        List<Object[]> rawResults = solicitudRepository.findSolicitationsPerWeekRaw(
                request.getFechaInicio(),
                request.getFechaFin()
        );
        List<SolicitationManagement> responseList = new ArrayList<>();

        // 2. Iteramos y mapeamos los resultados
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
                    ((java.sql.Date) row[0]).toLocalDate(),   // fechaSolicitada
                    (String) row[1],                          // nombreReceta
                    (Integer) row[2],                         // idSolicitud
                    row[3] != null ? ((Number) row[3]).intValue() : null, // idReceta
                    row[4] != null ? ((Number) row[4]).intValue() : null, // idReservaSala
                    row[5].toString(),                        // estadoSolicitud
                    row[6] != null ? row[6].toString() : "", // observaciones
                    productos,
                    courseDetails
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

        // 0. Validar que ninguna solicitud esté en estado inmutable (EN_PEDIDO o PROCESADO)
        List<Integer> todosLosIds = request.estadosSolicitudes().stream()
                .map(ChangeSolicitationStatus.StatusItemDTO::idSolicitud)
                .toList();

        if (solicitudRepository.existsByIdSolicitudInAndEstadoInmutable(todosLosIds)) {
            throw new GestionSolicitudException(
                    "No es posible cambiar el estado de solicitudes en estado EN_PEDIDO o PROCESADO."
            );
        }

        // 1. Sabemos exactamente cuántas solicitudes deberíamos actualizar
        int totalEsperados = request.estadosSolicitudes().size();
        int totalActualizados = 0;

        // 2. Agrupamos los IDs por estado
        Map<String, List<Integer>> idsPorEstado = request.estadosSolicitudes().stream()
                .collect(Collectors.groupingBy(
                        item -> StringUtils.normalizeToEnumKey(item.estado()),
                        Collectors.mapping(
                                ChangeSolicitationStatus.StatusItemDTO::idSolicitud,
                                Collectors.toList()
                        )
                ));

        // 3. Ejecutamos los UPDATES masivos y sumamos las filas afectadas
        for (Map.Entry<String, List<Integer>> entry : idsPorEstado.entrySet()) {
            String estadoNormalizado = entry.getKey();
            List<Integer> listaIds = entry.getValue();

            if (estadoNormalizado != null && !estadoNormalizado.isEmpty() && !listaIds.isEmpty()) {
                int filasAfectadas = solicitudRepository.updateMassiveStateSolicitation(listaIds, estadoNormalizado);
                totalActualizados += filasAfectadas;
            } else {
                throw new IllegalArgumentException("Se detectó un estado inválido en la petición masiva.");
            }
        }

        // 4. Validación de integridad
        if (totalActualizados != totalEsperados) {
            log.error("ROLLBACK ACTIVADO - Inconsistencia de datos. Se esperaban actualizar {} solicitudes, pero la BD reportó" +
                    " {}", totalEsperados, totalActualizados);
            throw new RuntimeException("Inconsistencia de datos: Se esperaba actualizar "
                    + totalEsperados + " solicitudes, pero se encontraron " + totalActualizados);
        }

        log.info("Actualización masiva exitosa. Se actualizaron {} solicitudes correctamente.", totalActualizados);
        return true;
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

}
