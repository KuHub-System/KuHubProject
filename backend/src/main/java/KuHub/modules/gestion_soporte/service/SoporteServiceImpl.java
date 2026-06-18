package KuHub.modules.gestion_soporte.service;

import KuHub.modules.gestion_soporte.dtos.request.SoporteCreateDTO;
import KuHub.modules.gestion_soporte.dtos.response.SoporteCreateResponseDTO;
import KuHub.modules.gestion_soporte.entity.EstadoSoporte;
import KuHub.modules.gestion_soporte.entity.SoporteTicket;
import KuHub.modules.gestion_soporte.entity.TipoEquipoSoporte;
import KuHub.modules.gestion_soporte.repository.SoporteTicketRepository;
import KuHub.modules.gestion_usuario.entity.Usuario;
import KuHub.modules.gestion_usuario.service.UsuarioService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SoporteServiceImpl implements SoporteService {

    /**Repositories*/
    @Autowired
    private SoporteTicketRepository soporteTicketRepository;

    /**Services*/
    @Autowired
    private UsuarioService usuarioService;

    @Override
    @Transactional
    public SoporteCreateResponseDTO crearTicket(SoporteCreateDTO dto) {
        // Usuario que reporta: se obtiene del token (no se confía en el frontend).
        Usuario usuarioActual = usuarioService.findUserByToken();

        SoporteTicket ticket = new SoporteTicket();
        ticket.setUsuario(usuarioActual);
        ticket.setTipoEquipo(dto.getTipoEquipo());
        // equipo_otro solo tiene sentido cuando el tipo de equipo es OTRO.
        ticket.setEquipoOtro(dto.getTipoEquipo() == TipoEquipoSoporte.OTRO ? dto.getEquipoOtro() : null);
        ticket.setSistemaOperativo(dto.getSistemaOperativo());
        ticket.setTipoError(dto.getTipoError());
        ticket.setDescripcion(dto.getDescripcion());
        ticket.setUrlOrigen(dto.getUrlOrigen());
        ticket.setEstado(EstadoSoporte.ABIERTO);

        SoporteTicket guardado = soporteTicketRepository.save(ticket);
        log.info("Ticket de soporte #{} creado por usuario id={}", guardado.getIdSoporte(), usuarioActual.getIdUsuario());

        return new SoporteCreateResponseDTO(guardado.getIdSoporte(), guardado.getEstado().name());
    }
}
