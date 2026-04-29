package KuHub.modules.pedido_semana_a_bodega.controller;

import KuHub.modules.pedido_semana_a_bodega.entity.DetallePedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.exceptions.PedidoSemanaBodegaException;
import KuHub.modules.pedido_semana_a_bodega.services.DetallePedidoSemanaBodegaService;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/detalle-pedido-semana-bodega")
@Validated
public class DetallePedidoSemanaBodegaController {

    @Autowired
    private DetallePedidoSemanaBodegaService detallePedidoSemanaBodegaService;























    @GetMapping("/find-by-id/{id}")
    public ResponseEntity<DetallePedidoSemanaBodega> findById(@PathVariable Integer id){
        return ResponseEntity
                .status(200)
                .body(detallePedidoSemanaBodegaService.findById(id));
    }

    @GetMapping("/find-all/")
    public ResponseEntity<Iterable<DetallePedidoSemanaBodega>> findAll(){
        return ResponseEntity
                .status(200)
                .body(detallePedidoSemanaBodegaService.findAll());
    }

    @PostMapping("/create-details-recipe/")
    public ResponseEntity<DetallePedidoSemanaBodega> save(@RequestBody DetallePedidoSemanaBodega detalleReceta){
        return ResponseEntity
                .status(201)
                .body(detallePedidoSemanaBodegaService.save(detalleReceta));
    }




    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable @NotNull Integer id) {
        try {
            detallePedidoSemanaBodegaService.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (PedidoSemanaBodegaException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        } catch (Exception ex) {
            // opcional: log.error("Error eliminando detalleReceta id=" + id, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
