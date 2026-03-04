package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.request.dto.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.SearchDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.ValidateTransitStockDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.WarehouseWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.response.WarehousePageDTO;
import KuHub.modules.gestion_inventario.dtos.response.WarehousesPageDTO;
import KuHub.modules.gestion_inventario.services.BodegaTransitoService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/v1/bodega-transito")
public class BodegaTransitoController {

    @Autowired
    private BodegaTransitoService bodegaTransitoService;

    /**
     * 🔍 Búsqueda de bodega por nombre o descripción
     * ✅ En uso: Consumido por el buscador general del frontend.
     */
    @PostMapping("/search-bodega")
    public ResponseEntity<WarehousesPageDTO> searchTransitWarehousePage(
            @RequestBody SearchDTO request
    ) {
        return ResponseEntity
                .status(200)
                .body(bodegaTransitoService.searchTransitWarehousePage(
                        request.getTerm(),
                        request.getPage()
                ));
    }

    /**
     * 🔍 Búsqueda de bodega por código de producto
     * ✅ En uso: Consumido por el input "Buscar código..." en el frontend.
     */
    @PostMapping("/search-by-cod-producto")
    public ResponseEntity<WarehousesPageDTO> searchWarehouseByCodProduct(
            @RequestBody SearchDTO request
    ) {
        return ResponseEntity
                .status(200)
                .body(bodegaTransitoService.searchWarehouseByCodProduct(
                        request.getTerm(),
                        request.getPage()
                ));
    }

    /**
     * 📋 Listado paginado dinámico con filtros (Categoría, Unidad, Stock Bajo)
     * ✅ En uso: Carga inicial de la página y filtros avanzados.
     */
    @PostMapping("/paged-bodega")
    public ResponseEntity<WarehousesPageDTO> getPagedTransitWarehouse(
            @RequestBody FilterInventoryPageDTO filter
    ) {
        return ResponseEntity
                .status(200)
                .body(bodegaTransitoService.getPagedTransitWarehouse(filter));
    }

    /**
     * 🛡️ Control de validación para Bodega de Tránsito
     * Verifica conflictos de edición en paralelo antes de realizar el PATCH.
     */
    @PostMapping("/validate-stock-before-updating")
    public ResponseEntity<?> validateStockBeforeUpdating(
            @Validated @RequestBody ValidateTransitStockDTO request) {

        Object result = bodegaTransitoService.validateTransitStockBeforeUpdating(request);

        // Si retorna un WarehousePageDTO, hubo un conflicto (409 Conflict)
        if (result instanceof WarehousePageDTO) {
            return ResponseEntity
                    .status(409)
                    .body(result);
        }
        return ResponseEntity
                .status(200)
                .body(result);
    }

    /**Actualiza bodega de transito con producto, creando movimiento segun tipo, una vez validado
     * ✅ En uso: Endpoint consumido por el frontend.*/
    @PatchMapping("/update-warehouse-with-product")
        public ResponseEntity<Boolean> updateTransitWarehouseWithProduct(
            @Validated @RequestBody WarehouseWithProductUpdateDTO request){
        return ResponseEntity
                .status(200)
                .body(bodegaTransitoService.updateTransitWarehouseWithProduct(request));
    }
}
