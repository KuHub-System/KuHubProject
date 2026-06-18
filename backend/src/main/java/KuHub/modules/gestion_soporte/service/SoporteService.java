package KuHub.modules.gestion_soporte.service;

import KuHub.modules.gestion_soporte.dtos.request.SoporteCreateDTO;
import KuHub.modules.gestion_soporte.dtos.response.SoporteCreateResponseDTO;

public interface SoporteService {

    /** Crea un nuevo ticket de soporte asociado al usuario autenticado (obtenido del token). */
    SoporteCreateResponseDTO crearTicket(SoporteCreateDTO dto);
}
