package msvc_Movimiento.controller;



import msvc_Movimiento.dtos.MovimientoDTO;
import msvc_Movimiento.service.MovimientoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/movimiento")
@Validated
public class MovimientoController {

    @Autowired
    private MovimientoService movimientoService;

    @PostMapping
    public ResponseEntity<MovimientoDTO> crear(@RequestBody MovimientoDTO movimientoDTO) {
        return new ResponseEntity<>(movimientoService.crearMovimiento(movimientoDTO), HttpStatus.CREATED);
    }

    @GetMapping("/producto/{idproducto}")
    public ResponseEntity<List<MovimientoDTO>> findByIdProducto(@PathVariable Long idproducto) {
        return ResponseEntity
                .ok(movimientoService.findByIdProducto(idproducto));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovimientoDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(movimientoService.findById(id));
    }

    @GetMapping("/inventario/{idInventario}")
    public ResponseEntity<List<MovimientoDTO>> obtenerPorIdInventario(@PathVariable Long idInventario) {
        return ResponseEntity.ok(movimientoService.findByIdInventario(idInventario));
    }

    @GetMapping
    public ResponseEntity<List<MovimientoDTO>> listarTodos() {
        return ResponseEntity.ok(movimientoService.findAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<MovimientoDTO> actualizar(@PathVariable Long id, @RequestBody MovimientoDTO dto) {
        return ResponseEntity.ok(movimientoService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        movimientoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}