package KuHub.modules.gestion_notificacion.service;

import KuHub.modules.gestion_notificacion.dtos.response.NotificacionResumenDTO;
import KuHub.modules.gestion_orden_pedido.service.OrdenPedidoService;
import KuHub.modules.gestion_pedido.services.PedidoService;
import KuHub.modules.gestion_solicitud.service.SolicitudService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificacionServiceImpl implements NotificacionService {

    /**Services*/
    @Autowired
    private SolicitudService solicitudService;

    @Autowired
    private PedidoService pedidoService;

    @Autowired
    private OrdenPedidoService ordenPedidoService;

    @Override
    @Transactional(readOnly = true)
    public NotificacionResumenDTO obtenerResumen() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();

        boolean canSolicitudes = hasAnyRole(authorities,
                "ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS", "PROFESOR_A_CARGO", "DOCENTE");
        boolean canPedidos = hasAnyRole(authorities,
                "ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS");
        boolean canOrdenPedido = hasAnyRole(authorities,
                "ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS", "ENCARGADO_BODEGA");

        return new NotificacionResumenDTO(
                canSolicitudes  ? solicitudService.obtenerNotificacionesPorSemana()          : List.of(),
                canSolicitudes  ? solicitudService.obtenerNotificacionesAceptadasPorSemana() : List.of(),
                canPedidos      ? pedidoService.obtenerNotificacionesPedidosPendientes()     : List.of(),
                canOrdenPedido  ? ordenPedidoService.obtenerNotificacionesPedidosSinOp()     : List.of(),
                canOrdenPedido  ? ordenPedidoService.obtenerNotificacionesEntregas()         : List.of()
        );
    }

    // Normaliza quitando prefijo ROLE_ para comparar independientemente del formato del token JWT.
    private boolean hasAnyRole(Collection<? extends GrantedAuthority> authorities, String... roles) {
        Set<String> normalized = authorities.stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .collect(Collectors.toSet());
        return Arrays.stream(roles).anyMatch(normalized::contains);
    }
}
