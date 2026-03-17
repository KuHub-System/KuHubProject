package KuHub.modules.gestion_pedido.controller;

import KuHub.modules.gestion_pedido.record.CreateOrder;
import KuHub.modules.gestion_pedido.services.PedidoService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/v1/pedido")
public class PedidoController {

    @Autowired
    private PedidoService pedidoService;

    @PostMapping("/consolidate-order")
    public ResponseEntity<Boolean> consolidateOrder(
            @Validated @RequestBody CreateOrder request){
        return ResponseEntity
                .status(201)
                .body(pedidoService.consolidateOrder(request));
    }
}
