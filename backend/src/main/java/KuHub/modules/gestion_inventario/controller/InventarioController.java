package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.request.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.dtos.response.dto.StockSyncWarningDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkInventoriesPage;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkInventoryProcess;
import KuHub.modules.gestion_inventario.dtos.response.record.InventoriesPage;
import KuHub.modules.gestion_inventario.dtos.response.record.InventoryFilters;
import KuHub.modules.gestion_inventario.exceptions.StockDesincronizadoException;
import KuHub.modules.gestion_inventario.exceptions.StockInsuficienteException;
import KuHub.modules.gestion_inventario.services.InventarioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@Validated
@RequestMapping("/api/v1/inventario")
public class InventarioController {

    @Autowired
    private InventarioService inventarioService;

    /**
     * Retorna los combos de filtros disponibles (categorías y unidades de medida)
     * usados al cargar la página de inventario.
     * ✅ En uso: Endpoint consumido por el frontend.
     */
    @GetMapping("/filters")
    public ResponseEntity<InventoryFilters> findFiltersInventory() {
        return ResponseEntity
                .status(200)
                .body(inventarioService.findFiltersInventory());
    }

    /**
     * Lista paginada de productos con stock formateado para cargar opciones
     * y detalles lógicos del control de producto masivo.
     * ✅ En uso: Endpoint consumido por el frontend.
     */
    @PostMapping("/massive-producto-inventory-listing")
    public ResponseEntity<BulkInventoriesPage> massiveProductInventoryListing(
            @RequestBody SearchDTO request){
        return ResponseEntity
                .status(200)
                .body(inventarioService.findByMassiveInventoryPaginated(request));
    }

    /**
     * Busca inventario paginado por nombre o descripción del producto.
     * ✅ En uso: Endpoint consumido por el frontend.
     */
    @PostMapping("/search-inventory")
    public ResponseEntity<InventoriesPage> searchInventory(
            @RequestBody SearchDTO request
    ) {
        return ResponseEntity
                .status(200)
                .body(inventarioService.searchInventory(request)
        );
    }

    /**
     * Lista el inventario paginado aplicando filtros dinámicos opcionales.
     * ✅ En uso: Endpoint consumido por el frontend.
     */
    @PostMapping("/paged-inventory")
    public ResponseEntity<InventoriesPage> findPagedInventory(
            @RequestBody FilterInventoryPageDTO request
    ) {
        return ResponseEntity.status(200)
                .body(inventarioService.findPagedInventory(request));
    }

    /**
     * Busca inventario paginado por código de producto.
     * ✅ En uso: Endpoint consumido por el frontend.
     */
    @PostMapping("/search-inventory-by-code")
    public ResponseEntity<InventoriesPage> searchInventoryByCodProducto(
            @RequestBody SearchDTO request
    ){
        return ResponseEntity
            .status(200)
            .body(inventarioService.searchInventoryByCodProducto(request));
    }

    /**
     * Crea un producto con su inventario asociado.
     * ✅ En uso: Endpoint consumido por el frontend.
     */
     @PostMapping("/create-inventory-with-product")
        public ResponseEntity<Boolean> saveInventoryWithProduct(
         @Valid @RequestBody
         InventoryWithProductCreateDTO request){
             return ResponseEntity
                 .status(201)
                 .body(inventarioService.saveInventoryWithProduct(request));
     }


    /**
     * Actualiza inventario con producto, registrando el movimiento según tipo.
     * Maneja desincronización de stock y stock insuficiente retornando respuestas diferenciadas.
     * ✅ En uso: Endpoint consumido por el frontend.
     */
     @PatchMapping("/update-inventory-with-product")
        public ResponseEntity<?> updateInventoryWithProduct(
             @Validated @RequestBody InventoryWithProductUpdateDTO request){
        try {
            Object result = inventarioService.updateInventoryWithProduct(request);
            return ResponseEntity
                     .status(200)
                     .body(result);
        } catch (StockDesincronizadoException ex) {
            // Instanciamos tu nuevo DTO pasándole el mensaje y el item
            StockSyncWarningDTO responseBody = new StockSyncWarningDTO(
                    ex.getMessage(),
                    ex.getInventoryItem()
            );
            // Devolvemos la respuesta usando el status de la excepción (409)
            return ResponseEntity
                    .status(ex.getStatus())
                    .body(responseBody);
        }catch(StockInsuficienteException ex) {
             // 3. Caso 422: Stock insuficiente (NO SE GUARDÓ EN BD - Rollback)
             StockSyncWarningDTO responseBody = new StockSyncWarningDTO(
                     ex.getMessage(),
                     ex.getInventoryItem()
             );
             return ResponseEntity.status(ex.getStatus()).body(responseBody);
         }
     }

    /**
     * Procesa la actualización masiva de stock para una lista de inventarios,
     * retornando el resultado clasificado por exitosos, advertencias y errores.
     * ✅ En uso: Consumido por el bucle del modal de procesos masivos en el frontend.
     */
    @PatchMapping("/bulk-update-inventory-stock")
    public ResponseEntity<BulkInventoryProcess> updateBulkInventoryStock(
            @Validated @RequestBody List<BulkInventoryProcess.ItemRequest> request) {
        BulkInventoryProcess result = inventarioService.processBulkInventoryUpdate(request);

        return ResponseEntity
                .status(200)
                .body(result);
    }

    /**
     * Realiza la eliminación lógica del inventario y su producto si el stock es cero.
     * ✅ En uso: Endpoint consumido por el frontend.
     */
    @DeleteMapping("/soft-delete-inventory-with-product/{idInventario}")
        public ResponseEntity<Boolean> softDeleteInventoryWithProduct(
                @PathVariable Integer idInventario){
         return ResponseEntity
                 .status(204)
                 .body(inventarioService.softDeleteByInventoryWithProduct(idInventario));
    }


}
