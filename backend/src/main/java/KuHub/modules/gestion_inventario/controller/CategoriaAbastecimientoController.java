package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.request.CategoriaAbastecimientoItemDTO;
import KuHub.modules.gestion_inventario.dtos.response.CategoriaAbastecimientoDTO;
import KuHub.modules.gestion_inventario.services.CategoriaAbastecimientoService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@Validated
@RequestMapping("/api/v1/categoria-abastecimiento")
public class CategoriaAbastecimientoController {

    @Autowired
    private CategoriaAbastecimientoService categoriaAbastecimientoService;

    /**
     * Lista todas las categorías activas con sus flags de abastecimiento.
     * ✅ En uso: Consumido por obtenerConfigAbastecimientoService en inventario-service.ts.
     */
    @GetMapping
    public ResponseEntity<List<CategoriaAbastecimientoDTO>> findAllCategoriaConfig() {
        return ResponseEntity
                .status(200)
                .body(categoriaAbastecimientoService.findAllCategoriaConfig());
    }

    /**
     * Reemplaza la configuración de abastecimiento para la lista de categorías enviada.
     * ✅ En uso: Consumido por actualizarConfigAbastecimientoService en inventario-service.ts.
     */
    @PutMapping
    public ResponseEntity<Boolean> updateCategoriaAbastecimiento(
            @Valid @RequestBody List<@Valid CategoriaAbastecimientoItemDTO> items) {
        return ResponseEntity
                .status(200)
                .body(categoriaAbastecimientoService.updateCategoriaAbastecimiento(items));
    }
}
