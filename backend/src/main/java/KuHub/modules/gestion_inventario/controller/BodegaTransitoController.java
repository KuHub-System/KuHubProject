package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.request.dto.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.SearchDTO;
import KuHub.modules.gestion_inventario.dtos.response.WarehousesPageDTO;
import KuHub.modules.gestion_inventario.services.BodegaTransitoService;
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
}
