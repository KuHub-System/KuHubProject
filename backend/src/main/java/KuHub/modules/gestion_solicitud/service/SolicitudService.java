package KuHub.modules.gestion_solicitud.service;

import KuHub.modules.gestion_solicitud.dtos.request.record.ChangeSolicitationStatus;
import KuHub.modules.gestion_solicitud.dtos.request.record.MassiveSolicitation;
import KuHub.modules.gestion_solicitud.dtos.request.record.RejectEnPedidoDTO;
import KuHub.modules.gestion_solicitud.dtos.respose.record.CourseForSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.record.DashboardConsolidado;
import KuHub.modules.gestion_solicitud.dtos.respose.record.AbastecimientoBodegaDTO;
import KuHub.modules.gestion_solicitud.dtos.respose.record.NotificacionSemanaDTO;
import KuHub.modules.gestion_solicitud.dtos.request.*;
import KuHub.modules.gestion_solicitud.dtos.respose.projection.ResultsMassSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.respose.record.RecipeSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.record.SolicitationManagement;
import KuHub.modules.gestion_solicitud.entity.Solicitud;

import java.util.List;

public interface SolicitudService {
    Solicitud findById(Integer idSolicitud);
    long contarPendientes();
    List<NotificacionSemanaDTO> obtenerNotificacionesPorSemana();
    List<NotificacionSemanaDTO> obtenerNotificacionesAceptadasPorSemana();
    List<CourseForSolicitation> findCourseWithSectionsAndBlocksRaw();
    List<RecipeSolicitation> findActiveRecipesWithDetailsRaw(Integer idAsignatura);
    ResultsMassSolicitationView saveMass(List<MassiveSolicitation> payloadList);
    List<SolicitationManagement> findSolicitationsPerWeekRaw(DateRangeDTO request);
    DashboardConsolidado obtenerDashboard(DateRangeDTO request);
    boolean changeMassiveStatus(ChangeSolicitationStatus request);
    boolean rechazarSolicitudEnPedido(RejectEnPedidoDTO request);
    AbastecimientoBodegaDTO obtenerAbastecimientoBodega(DateRangeDTO request);
    int marcarEnviadosBodega(List<Integer> ids);
}
