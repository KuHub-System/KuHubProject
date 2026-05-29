package KuHub.modules.gestion_solicitud.services;

import KuHub.modules.gestion_academica.repository.AsignaturaRepository;
import KuHub.modules.gestion_academica.repository.SemanaRepository;
import KuHub.modules.gestion_pedido.repository.DetallePedidoRepository;
import KuHub.modules.gestion_pedido.repository.PedidoRepository;
import KuHub.modules.gestion_pedido.repository.PedidoSolicitudRepository;
import KuHub.modules.gestion_sistema.entity.GestionSistema;
import KuHub.modules.gestion_sistema.repository.GestionSistemaRepository;
import KuHub.modules.gestion_solicitud.dtos.request.DateRangeDTO;
import KuHub.modules.gestion_solicitud.dtos.request.record.ChangeSolicitationStatus;
import KuHub.modules.gestion_solicitud.dtos.request.record.MassiveSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.projection.ResultsMassSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.respose.record.CourseForSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.record.DashboardConsolidado;
import KuHub.modules.gestion_solicitud.dtos.respose.record.AbastecimientoBodegaDTO;
import KuHub.modules.gestion_solicitud.dtos.respose.record.RecipeSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.record.SolicitationManagement;
import KuHub.modules.gestion_solicitud.entity.Solicitud;
import KuHub.modules.gestion_solicitud.repository.MotivoRechazoRepository;
import KuHub.modules.gestion_solicitud.repository.SolicitudRepository;
import KuHub.modules.gestion_solicitud.service.SolicitudServiceImp;
import KuHub.modules.gestion_usuario.service.UsuarioService;
import KuHub.modules.pedido_semana_a_bodega.services.DetallePedidoSemanaBodegaService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SolicitudServiceImplTest {

    @Mock private SolicitudRepository solicitudRepository;
    @Mock private SemanaRepository semanaRepository;
    @Mock private AsignaturaRepository asignaturaRepository;
    @Mock private MotivoRechazoRepository motivoRechazoRepository;
    @Mock private PedidoRepository pedidoRepository;
    @Mock private DetallePedidoRepository detallePedidoRepository;
    @Mock private PedidoSolicitudRepository pedidoSolicitudRepository;
    @Mock private GestionSistemaRepository gestionSistemaRepository;
    @Mock private DetallePedidoSemanaBodegaService detallePedidoSemanaBodegaService;
    @Mock private UsuarioService usuarioService;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks
    private SolicitudServiceImp solicitudService;

    @Test
    void test1FindByIdExisting() {
        Solicitud sol = new Solicitud();
        sol.setIdSolicitud(1);

        when(solicitudRepository.findById(1)).thenReturn(Optional.of(sol));

        Solicitud result = solicitudService.findById(1);

        assertNotNull(result);
        assertEquals(1, result.getIdSolicitud());
    }

    @Test
    void test2FindByIdNotFound() {
        when(solicitudRepository.findById(999)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
            () -> solicitudService.findById(999));
    }

    @Test
    void test3FindCourseWithSectionsAndBlocksRaw() throws Exception {
        // row: [0]=nombreAsignatura, [1]=idAsignatura, [2]=seccionesJson
        Object[] row = new Object[3];
        row[0] = "Matematica";
        row[1] = 1;
        row[2] = "[]";

        when(solicitudRepository.findCourseWithSectionsAndBlocksRaw())
            .thenReturn(java.util.Collections.singletonList(row));
        // TypeReference es una clase anónima; each `new TypeReference<>(){}` es una instancia distinta,
        // por eso se usa any(TypeReference.class) en lugar de la instancia específica
        when(objectMapper.readValue(eq("[]"), any(TypeReference.class)))
            .thenReturn(List.of());

        List<CourseForSolicitation> result = solicitudService.findCourseWithSectionsAndBlocksRaw();

        assertNotNull(result);
        assertEquals(1, result.size());
    }

    @Test
    void test4FindActiveRecipesWithDetailsRaw() throws Exception {
        // row: [0]=idReceta, [1]=nombreReceta, [2]=detallesJson, [3]=idSemana, [4]=idAsignatura
        Object[] row = new Object[5];
        row[0] = 1;
        row[1] = "Pasta Carbonara";
        row[2] = "[]";
        row[3] = 1;
        row[4] = 1;

        when(solicitudRepository.findActiveRecipesWithDetailsRaw(1))
            .thenReturn(java.util.Collections.singletonList(row));
        when(objectMapper.readValue(eq("[]"), any(TypeReference.class)))
            .thenReturn(List.of());

        List<RecipeSolicitation> result = solicitudService.findActiveRecipesWithDetailsRaw(1);

        assertNotNull(result);
        assertEquals(1, result.size());
    }

    @Test
    void test5FindSolicitationsPerWeekRaw() throws Exception {
        // row: [0]=fechaSolicitada, [1]=nombreReceta, [2]=idSolicitud, [3]=idReceta,
        //      [4]=idReservaSala, [5]=estadoSolicitud, [6]=observaciones,
        //      [7]=productos_solicitados (json), [8]=asignatura_detalle (json), [9]=motivoRechazo
        Object[] row = new Object[10];
        row[0] = java.sql.Date.valueOf(LocalDate.of(2026, 5, 13));
        row[1] = "Pasta";
        row[2] = 1;
        row[3] = 1;
        row[4] = 1;
        row[5] = "ACEPTADA";
        row[6] = "Sin observaciones";
        row[7] = "[]";
        row[8] = "{}";
        row[9] = null;

        DateRangeDTO dto = new DateRangeDTO();
        dto.setFechaInicio(LocalDate.of(2026, 5, 1));
        dto.setFechaFin(LocalDate.of(2026, 5, 31));

        when(solicitudRepository.rechazarSolicitudesVencidas()).thenReturn(0);
        when(solicitudRepository.findSolicitationsPerWeekRaw(
            dto.getFechaInicio(), dto.getFechaFin()
        )).thenReturn(java.util.Collections.singletonList(row));
        // row[7] -> readValue(String, TypeReference<List<ProductDetailDTO>>)
        when(objectMapper.readValue(eq("[]"), any(TypeReference.class)))
            .thenReturn(List.of());
        // row[8] -> readValue(String, Class<CourseDetailsDTO>)
        when(objectMapper.readValue(eq("{}"), eq(SolicitationManagement.CourseDetailsDTO.class)))
            .thenReturn(null);

        List<SolicitationManagement> result = solicitudService.findSolicitationsPerWeekRaw(dto);

        assertNotNull(result);
        assertEquals(1, result.size());
    }

    @Test
    void test6SaveMass() throws Exception {
        List<MassiveSolicitation> payloadList = List.of();

        // ResultsMassSolicitationView retorna Integer, no Long
        ResultsMassSolicitationView viewMock = new ResultsMassSolicitationView() {
            @Override
            public Integer getTotalSolicitudes() { return 1; }
            @Override
            public Integer getTotalDetalles() { return 5; }
        };

        when(objectMapper.writeValueAsString(payloadList)).thenReturn("[]");
        when(solicitudRepository.ejecutarSolicitudMasivaRaw("[]")).thenReturn(viewMock);

        ResultsMassSolicitationView result = solicitudService.saveMass(payloadList);

        assertNotNull(result);
    }

    @Test
    void test7ChangeMassiveStatus() {
        // Caso: una solicitud ACEPTADA, solicitudesEnPedido=false → flujo ACEPTADA directo
        var statusItem = new ChangeSolicitationStatus.StatusItemDTO(1, "ACEPTADA", null);
        var request = new ChangeSolicitationStatus(List.of(statusItem), 1);

        GestionSistema config = new GestionSistema();
        config.setSolicitudesEnPedido(false);

        when(solicitudRepository.existsByIdSolicitudInAndEstadoInmutable(List.of(1)))
            .thenReturn(false);
        when(gestionSistemaRepository.findById(2))
            .thenReturn(Optional.of(config));
        // updateMassiveStateSolicitation se llama con idsAceptadas=[1] y ACEPTADA
        when(solicitudRepository.updateMassiveStateSolicitation(any(), any()))
            .thenReturn(1);

        boolean result = solicitudService.changeMassiveStatus(request);

        assertTrue(result);
    }

    @Test
    void test8ObtenerDashboard() throws Exception {
        // row Consulta A: [0]=idSolicitud, [1]=fechaSolicitada, [2]=nombreReceta,
        //                 [3]=observaciones, [4]=jsonAsignaturaDetalle
        Object[] row = new Object[5];
        row[0] = 1;
        row[1] = java.sql.Date.valueOf(LocalDate.of(2026, 5, 13));
        row[2] = "Pasta";
        row[3] = "Observacion";
        row[4] = "{}";

        DateRangeDTO dto = new DateRangeDTO();
        dto.setFechaInicio(LocalDate.of(2026, 5, 1));
        dto.setFechaFin(LocalDate.of(2026, 5, 31));

        when(solicitudRepository.findSolicitudesParaDashboard(dto.getFechaInicio(), dto.getFechaFin()))
            .thenReturn(java.util.Collections.singletonList(row));
        // row[4] -> readValue(String, Class<AsignaturaDetalleDTO>)
        when(objectMapper.readValue(eq("{}"), eq(DashboardConsolidado.AsignaturaDetalleDTO.class)))
            .thenReturn(null);
        // Consulta B -> readValue(String, TypeReference<List<ProductoConsolidadoDTO>>)
        when(solicitudRepository.findConsolidadoGlobalJson(dto.getFechaInicio(), dto.getFechaFin()))
            .thenReturn("[]");
        when(objectMapper.readValue(eq("[]"), any(TypeReference.class)))
            .thenReturn(List.of());

        DashboardConsolidado result = solicitudService.obtenerDashboard(dto);

        assertNotNull(result);
    }

    @Test
    void test9ObtenerAbastecimientoBodega() {
        DateRangeDTO dto = new DateRangeDTO();
        dto.setFechaInicio(LocalDate.of(2026, 5, 1));
        dto.setFechaFin(LocalDate.of(2026, 5, 31));

        when(solicitudRepository.findAbastecimientoBodegaJson(
            dto.getFechaInicio(), dto.getFechaFin()
        )).thenReturn(null);

        AbastecimientoBodegaDTO result = solicitudService.obtenerAbastecimientoBodega(dto);

        assertNotNull(result);
        assertNotNull(result.solicitudes());
    }
}
