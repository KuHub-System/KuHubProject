package KuHub.modules.gestion_solicitud.service;

import KuHub.modules.gestion_solicitud.dtos.*;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.ManagementSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.SectionAvailabilityView;
import KuHub.modules.gestion_solicitud.dtos.record.DashboardConsolidadoResponse;
import KuHub.modules.gestion_solicitud.dtos.request.*;
import KuHub.modules.gestion_solicitud.dtos.respose.ResultsMassSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.respose.SolicitationManagementDTO;
import KuHub.modules.gestion_solicitud.entity.Solicitud;

import java.time.LocalDate;
import java.util.List;

public interface SolicitudService {
    Solicitud findById(Integer idSolicitud);
    List<CourseForSolicitationDTO> findCourseWithSectionsAndBlocksRaw();
    List<RecipeSolicitationDTO> findActiveRecipesWithDetailsRaw();
    ResultsMassSolicitationView saveMass(List<MassiveSolicitationDTO> payloadList);
    List<SolicitationManagementDTO> findSolicitationsPerWeekRaw(DateRangeDTO request);
    DashboardConsolidadoResponse obtenerDashboard(DateRangeDTO request);
    boolean changeMassiveStatus(ChangeSolicitationStatusDTO request);

    //List<ManagementSolicitationView> findManagementSolicitations(ManagementFilterRequestDTO filter);
    //List<SectionAvailabilityView> checkSectionAvailability (CheckSectionAvailabilityRequestDTO r);
    //void updateSolicitationStatus(SolicitationStatusUpdateDTO dto);
    //void saveSolicitation(SolicitationCreateRequestDTO request);
    //ManagementSolicitationSelectorsDTO getSelectorsForManagement();
}
