package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.response.dto.MotionFilterRequestDTO;
import KuHub.modules.gestion_inventario.dtos.response.dto.PaginatedMotionDTO;
import KuHub.modules.gestion_inventario.services.MovimientoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * Controller REST para gestión de Movimientos de Inventario
 * Endpoints: /api/v1/movimiento
 * ✅ En uso: Este controlador permite listar movimientos de inventario con filtros avanzados 
 * (producto, responsable, tipo, rango de fechas).
 * Consumido por movimiento-service.ts en el frontend.
 */
@RestController
@Validated
@RequestMapping("/api/v1/movimiento")
public class MovimientoController {

    @Autowired
    private MovimientoService movimientoService;

    /**
     * Obtiene una lista paginada de movimientos de inventario aplicando filtros dinámicos.
     * ✅ En uso: Consumido por findMovimientosConFiltros en movimiento-service.ts.
     */
    @PostMapping("/find-all-motion-with-filter")
    public ResponseEntity<PaginatedMotionDTO> findAllMotionWithFilter(@RequestBody MotionFilterRequestDTO m){
        return ResponseEntity
                .status(200)
                .body(movimientoService.findAllMotionWithFilter(m));
    }




}
