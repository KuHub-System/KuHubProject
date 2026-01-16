package KuHub.modules.gestion_solicitud.service;

import KuHub.modules.gestion_solicitud.dtos.*;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.ManagementSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.SectionAvailabilityView;

import java.util.List;

public interface SolicitudService {
    List<ManagementSolicitationView> findManagementSolicitations(ManagementFilterRequestDTO filter);
    List<SectionAvailabilityView> checkSectionAvailability (CheckSectionAvailabilityRequestDTO r);
    void saveSolicitation(SolicitationCreateRequestDTO request);
    ManagementSolicitationSelectorsDTO getSelectorsForManagement();
}
