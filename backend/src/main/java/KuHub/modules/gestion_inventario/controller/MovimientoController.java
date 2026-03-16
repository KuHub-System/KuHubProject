package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.response.dto.MotionFilterRequestDTO;
import KuHub.modules.gestion_inventario.dtos.response.dto.PaginatedMotionDTO;
import KuHub.modules.gestion_inventario.services.MovimientoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@Validated
@RequestMapping("/api/v1/movimiento")
public class MovimientoController {

    @Autowired
    private MovimientoService movimientoService;

    /**
     * Lista paginada de movimientos aplicando filtros dinámicos opcionales.
     * ✅ En uso: Endpoint consumido por el frontend.
     */
    @PostMapping("/find-all-motion-with-filter")
    public ResponseEntity<PaginatedMotionDTO> findAllMotionWithFilter(@RequestBody MotionFilterRequestDTO m){
        return ResponseEntity
                .status(200)
                .body(movimientoService.findAllMotionWithFilter(m));
    }




}
