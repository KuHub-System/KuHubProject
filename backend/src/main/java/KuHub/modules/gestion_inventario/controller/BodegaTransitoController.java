package KuHub.modules.gestion_inventario.controller;

import KuHub.config.security.service.DynamicPermissionService;
import KuHub.modules.gestion_inventario.dtos.request.ConfirmarNuevosExcelDTO;
import KuHub.modules.gestion_inventario.dtos.request.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.dtos.request.WarehouseWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.dtos.response.dto.StockSyncWarningDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkWarehouseProcess;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkWarehousesPage;
import KuHub.modules.gestion_inventario.dtos.response.record.SincronizarExcelResultado;
import KuHub.modules.gestion_inventario.dtos.response.record.WarehousesPage;
import KuHub.modules.gestion_inventario.exceptions.StockDesincronizadoException;
import KuHub.modules.gestion_inventario.exceptions.StockInsuficienteException;
import KuHub.modules.gestion_inventario.services.BodegaTransitoService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Controller REST para gestión de Bodega de Tránsito
 * Endpoints: /api/v1/bodega-transito
 * ✅ En uso: Este controlador gestiona la vista y actualización del stock en la bodega de tránsito, 
 * incluyendo búsquedas paginadas por nombre y código.
 * Consumido por bodega-transito-service.ts en el frontend.
 */
@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/v1/bodega-transito")
public class BodegaTransitoController {

    @Autowired
    private BodegaTransitoService bodegaTransitoService;

    @Autowired
    private DynamicPermissionService dynamicPermissionService;

    /**
     * Para cada idProducto recibido, garantiza que exista inventario y bodega_transito con stock=0.
     * Usado por el modal de confirmación cuando no hay coincidencias en el Abastecimiento de Bodega.
     * ✅ En uso: Consumido por inicializarDesdeAbastecimientoService en bodega-transito-service.ts.
     * Acceso dinámico: verificado contra permiso_rol (BODEGA_TRANSITO write).
     */
    @PostMapping("/inicializar-desde-abastecimiento")
    public ResponseEntity<?> inicializarDesdeAbastecimiento(
            @RequestBody List<Integer> idsProducto,
            Authentication authentication) {
        if (!dynamicPermissionService.check(authentication, "BODEGA_TRANSITO", "write")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            List<WarehousesPage.WarehouseItem> result = bodegaTransitoService.inicializarDesdeAbastecimiento(idsProducto);
            return ResponseEntity.status(201).body(result);
        } catch (GestionInventarioException ex) {
            return ResponseEntity.status(ex.getStatus()).body(java.util.Map.of("message", ex.getMessage()));
        }
    }

    /**
     * Retorna los registros activos de bodega de tránsito para una lista de IDs de inventario.
     * Lookup directo sin paginación: evita el límite asimétrico de PaginationUtils.
     * ✅ En uso: Consumido por obtenerBodegaByInventarioIdsService en bodega-transito-service.ts.
     */
    @PostMapping("/find-by-inventario-ids")
    public ResponseEntity<List<WarehousesPage.WarehouseItem>> findBodegaByInventarioIds(
            @RequestBody List<Integer> inventarioIds) {
        return ResponseEntity.ok(bodegaTransitoService.findBodegaByInventarioIds(inventarioIds));
    }

    /**
     * Crea un producto nuevo con su inventario (stock=0) y su registro en bodega de tránsito,
     * aplicando ENTRADA_BODEGA si el stock inicial es mayor a cero.
     * ✅ En uso: Consumido por crearBodegaConProductoService en bodega-transito-service.ts.
     * Acceso dinámico: verificado contra permiso_rol (BODEGA_TRANSITO write).
     */
    @PostMapping("/create-bodega-con-producto")
    public ResponseEntity<?> createBodegaConProducto(
            @Validated @RequestBody InventoryWithProductCreateDTO request,
            Authentication authentication) {
        if (!dynamicPermissionService.check(authentication, "BODEGA_TRANSITO", "write")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            WarehousesPage.WarehouseItem result = bodegaTransitoService.createBodegaConProducto(request);
            return ResponseEntity.status(201).body(result);
        } catch (GestionInventarioException ex) {
            return ResponseEntity.status(ex.getStatus()).body(java.util.Map.of("message", ex.getMessage()));
        }
    }

    /**
     * Busca productos en la bodega de tránsito que coincidan con un término en nombre o descripción.
     * ✅ En uso: Consumido por buscarBodegaTransitoService en bodega-transito-service.ts.
     */
    @PostMapping("/search-bodega")
    public ResponseEntity<WarehousesPage> searchTransitWarehousePage(
            @RequestBody SearchDTO request
    ) {
        return ResponseEntity
                .status(200)
                .body(bodegaTransitoService.searchTransitWarehousePage(request));
    }

    /**
     * Busca productos en la bodega de tránsito por su código específico.
     * ✅ En uso: Consumido por buscarBodegaTransitoPorCodigoService en bodega-transito-service.ts.
     */
    @PostMapping("/search-by-cod-producto")
    public ResponseEntity<WarehousesPage> searchWarehouseByCodProduct(
            @RequestBody SearchDTO request
    ) {
        return ResponseEntity
                .status(200)
                .body(bodegaTransitoService.searchWarehouseByCodProduct(request));
    }

    /**
     * Obtiene una lista paginada de productos en la bodega de tránsito con filtros dinámicos.
     * ✅ En uso: Consumido por obtenerBodegaPaginadaService en bodega-transito-service.ts.
     */
    @PostMapping("/paged-bodega")
    public ResponseEntity<WarehousesPage> findPagedTransitWarehouse(
            @RequestBody FilterInventoryPageDTO filter
    ) {
        return ResponseEntity
                .status(200)
                .body(bodegaTransitoService.findPagedTransitWarehouse(filter));
    }

    /**
     * Lista productos de bodega de tránsito con búsqueda paginada para el proceso masivo.
     * ✅ En uso: Consumido por obtenerBulkBodegaListingService en bodega-transito-service.ts.
     */
    @PostMapping("/massive-warehouse-listing")
    public ResponseEntity<BulkWarehousesPage> massiveWarehouseListing(
            @RequestBody SearchDTO request) {
        return ResponseEntity
                .status(200)
                .body(bodegaTransitoService.findByMassiveBodegaPaginated(request));
    }

    /**
     * Procesa actualizaciones de stock masivas para la bodega de tránsito.
     * ✅ En uso: Consumido por bulkUpdateBodegaStockService en bodega-transito-service.ts.
     */
    @PatchMapping("/bulk-update-warehouse-stock")
    public ResponseEntity<BulkWarehouseProcess> updateBulkWarehouseStock(
            @Validated @RequestBody List<BulkWarehouseProcess.ItemRequest> request) {
        return ResponseEntity
                .status(200)
                .body(bodegaTransitoService.processBulkWarehouseUpdate(request));
    }

    /**
     * Sincroniza el stock de bodega de tránsito desde un Excel.
     * Los productos encontrados reciben AJUSTE_BODEGA; los no encontrados se retornan para confirmación.
     * ✅ En uso: Consumido por sincronizarBodegaTransitoDesdeExcelService en bodega-transito-service.ts.
     */
    @PostMapping(value = "/sincronizar-excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SincronizarExcelResultado> sincronizarBodegaDesdeExcel(
            @RequestParam("archivo") MultipartFile archivo,
            @RequestParam(value = "nombreHoja", required = false) String nombreHoja,
            @RequestParam("idCategoria") Short idCategoria,
            @RequestParam("filaInicio") int filaInicio,
            @RequestParam("filaFin") int filaFin) {
        SincronizarExcelResultado resultado = bodegaTransitoService.sincronizarBodegaDesdeExcel(
                archivo, nombreHoja, idCategoria, filaInicio, filaFin);
        return ResponseEntity.status(200).body(resultado);
    }

    /**
     * Confirma la creación de productos no encontrados en la sincronización Excel de bodega.
     * Crea producto + inventario(stock=0) + bodega para los que no existen; aplica ENTRADA_BODEGA.
     * ✅ En uso: Consumido por confirmarNuevosBodegaExcelService en bodega-transito-service.ts.
     */
    @PostMapping("/sincronizar-excel/confirmar-nuevos")
    public ResponseEntity<Integer> confirmarNuevosBodegaExcel(
            @RequestBody List<ConfirmarNuevosExcelDTO.ItemNuevo> items) {
        return ResponseEntity.status(201)
                .body(bodegaTransitoService.confirmarNuevosBodegaExcel(items));
    }

    /**
     * Actualiza un producto en la bodega de tránsito y ajusta su stock, manejando validaciones.
     * ✅ En uso: Consumido por actualizarBodegaTransitoConProductoService en bodega-transito-service.ts.
     * Acceso dinámico: verificado contra permiso_rol (BODEGA_TRANSITO write).
     */
    @PatchMapping("/update-warehouse-with-product")
        public ResponseEntity<?> updateTransitWarehouseWithProduct(
            @Validated @RequestBody WarehouseWithProductUpdateDTO request,
            Authentication authentication){
        if (!dynamicPermissionService.check(authentication, "BODEGA_TRANSITO", "write")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            Object result = bodegaTransitoService.updateTransitWarehouseWithProduct(request);
            return ResponseEntity
                    .status(200)
                    .body(result);

        }catch (StockDesincronizadoException ex) {
            // ⚠️ 409: Desincronizado pero Operable (SÍ SE GUARDÓ)
            StockSyncWarningDTO responseBody = new StockSyncWarningDTO(ex.getMessage(), ex.getInventoryItem());
            return ResponseEntity
                    .status(200)
                    .body(responseBody);
        }catch(StockInsuficienteException ex) {
            // ❌ 422: Stock insuficiente (NO SE GUARDÓ EN BD - Rollback automático)
            StockSyncWarningDTO responseBody = new StockSyncWarningDTO(ex.getMessage(), ex.getInventoryItem());
            return ResponseEntity
                    .status(200)
                    .body(responseBody);
        }
    }
}
