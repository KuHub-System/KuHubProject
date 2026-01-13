package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.MotionAnswerDTO;
import KuHub.modules.gestion_inventario.dtos.MotionCreateDTO;
import KuHub.modules.gestion_inventario.dtos.MotionFilterRequestDTO;
import KuHub.modules.gestion_inventario.services.MovimientoService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@Validated
@RequestMapping("/api/v1/movimiento")
public class MovimientoController {

    @Autowired
    private MovimientoService movimientoService;

    @PostMapping("/find-all-motion-filter")
    public ResponseEntity<List<MotionAnswerDTO>> findAllMotionFilter(@RequestBody MotionFilterRequestDTO m){
        return ResponseEntity
                .status(200)
                .body(movimientoService.findAllMotionFilter(m));
    }


    @PostMapping("/create-motion")
    public ResponseEntity<MotionAnswerDTO> createMotion(@RequestBody @Valid MotionCreateDTO m) {
        // Al llamar a saveMotion, el servicio se encarga de ver quién está logueado
        return ResponseEntity
                .status(201)
                .body(movimientoService.saveMotion(m));
    }



}
