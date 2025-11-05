package KuHub.modules.screens.inventario_screen.controller;

import KuHub.modules.inventario.dtos.InventoryWithProductCreateRequestDTO;
import KuHub.modules.inventario.exceptions.InventarioException;
import KuHub.modules.screens.inventario_screen.service.InventarioScreenService;
import feign.Body;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.repository.query.Param;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/inventario-screen")
public class InventarioScreenController {

    @Autowired
    private InventarioScreenService inventarioScreenService;

    @PostMapping("/btn-crear-producto-con-inventario")
    public ResponseEntity<?> btnCrearProductoConInventario(
            @Valid @RequestBody InventoryWithProductCreateRequestDTO inventarioRequest){
        try {
            // ✅ Capturas y retornas el mensaje
            String mensaje = this.inventarioScreenService.btnCrearProductoConInventario(inventarioRequest);
            return ResponseEntity.ok(mensaje); // ✅ Retornas el mensaje
        } catch (InventarioException e) {
            // ✅ Capturas la excepción específica y retornas su mensaje
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e){
            // ✅ Para otras excepciones, mensaje genérico
            return ResponseEntity.status(500).body("Error interno del servidor: " + e.getMessage());
        }
    }


}
