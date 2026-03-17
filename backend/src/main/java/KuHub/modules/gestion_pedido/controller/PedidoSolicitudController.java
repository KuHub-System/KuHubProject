package KuHub.modules.gestion_pedido.controller;

import KuHub.modules.gestion_pedido.services.PedidoSolicitudService;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@AllArgsConstructor
@Validated
@RequestMapping("/api/v1/pedido-solicitud")
public class PedidoSolicitudController {

    @Autowired
    private PedidoSolicitudService pedidoSolicitudService;
}
