package KuHub.modules.gestion_solicitud.service;

import KuHub.modules.gestion_solicitud.dtos.CheckSectionAvailabilityRequestDTO;
import KuHub.modules.gestion_solicitud.dtos.ManagementSolicitationSelectorsDTO;
import KuHub.modules.gestion_solicitud.dtos.SolicitationAnswerDTO;
import KuHub.modules.gestion_solicitud.dtos.SolicitationCreateRequestDTO;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.SectionAvailabilityView;

import java.util.List;

public interface SolicitudService {
    List<SectionAvailabilityView> checkSectionAvailability (CheckSectionAvailabilityRequestDTO r);
    void saveSolicitation(SolicitationCreateRequestDTO request);
    ManagementSolicitationSelectorsDTO getSelectorsForManagement();
}
