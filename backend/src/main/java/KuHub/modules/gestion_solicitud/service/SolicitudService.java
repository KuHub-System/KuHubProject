package KuHub.modules.gestion_solicitud.service;

import KuHub.modules.gestion_solicitud.dtos.*;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.ManagementSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.SectionAvailabilityView;
import KuHub.modules.gestion_solicitud.entity.Solicitud;

import java.util.List;

public interface SolicitudService {
    Solicitud findById(Integer idSolicitud);
    List<ManagementSolicitationView> findManagementSolicitations(ManagementFilterRequestDTO filter);
    List<SectionAvailabilityView> checkSectionAvailability (CheckSectionAvailabilityRequestDTO r);
    void updateSolicitationStatus(SolicitationStatusUpdateDTO dto);
    void saveSolicitation(SolicitationCreateRequestDTO request);
    ManagementSolicitationSelectorsDTO getSelectorsForManagement();
}
