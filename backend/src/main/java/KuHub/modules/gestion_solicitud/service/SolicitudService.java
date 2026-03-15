package KuHub.modules.gestion_solicitud.service;

import KuHub.modules.gestion_solicitud.dtos.request.record.ChangeSolicitationStatusRequest;
import KuHub.modules.gestion_solicitud.dtos.request.record.MassiveSolicitationRequest;
import KuHub.modules.gestion_solicitud.dtos.respose.record.CourseForSolicitationResponse;
import KuHub.modules.gestion_solicitud.dtos.respose.record.DashboardConsolidadoResponse;
import KuHub.modules.gestion_solicitud.dtos.request.*;
import KuHub.modules.gestion_solicitud.dtos.respose.projection.ResultsMassSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.respose.record.RecipeSolicitationResponse;
import KuHub.modules.gestion_solicitud.dtos.respose.record.SolicitationManagementResponse;
import KuHub.modules.gestion_solicitud.entity.Solicitud;

import java.util.List;

public interface SolicitudService {
    Solicitud findById(Integer idSolicitud);
    List<CourseForSolicitationResponse> findCourseWithSectionsAndBlocksRaw();
    List<RecipeSolicitationResponse> findActiveRecipesWithDetailsRaw();;
    ResultsMassSolicitationView saveMass(List<MassiveSolicitationRequest> payloadList);
    List<SolicitationManagementResponse> findSolicitationsPerWeekRaw(DateRangeDTO request);
    DashboardConsolidadoResponse obtenerDashboard(DateRangeDTO request);
    boolean changeMassiveStatus(ChangeSolicitationStatusRequest request);

}
