package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.request.ChangeStatusActiveUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.request.ChangeProductsToAnotherUnidadMedidaDTO;
import KuHub.modules.gestion_inventario.dtos.request.CreateUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.request.UpdateUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.response.proyeccion.UnidadMedidaView;
import KuHub.modules.gestion_inventario.entity.UnidadMedida;
import KuHub.modules.gestion_inventario.services.UnidadMedidaServiceImp;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/unidad-medida")
@Validated
public class UnidadMedidaController {

    @Autowired
    private UnidadMedidaServiceImp unidadMedidaService;

    /**✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @GetMapping("/find-all-view")
    public ResponseEntity<List<UnidadMedidaView>> findAllView(){
        return ResponseEntity
                .status(200)
                .body(unidadMedidaService.findAllWithAsociados());
    }

    /**❌FUNCIONAL PERO NO IMPLEMENTADO EN EL FRONT*/
    @GetMapping()
    public ResponseEntity<List<UnidadMedida>> findAll(){
        return ResponseEntity
                .status(200)
                .body(unidadMedidaService.findAll());
    }

    /**✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @GetMapping("/find-all-active-true")
    public ResponseEntity<List<UnidadMedida>> findAllActiveTrue(){
        return ResponseEntity
                .status(200)
                .body(unidadMedidaService.findAllActiveTrue());
    }

    /**✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @PostMapping()
    public ResponseEntity<Boolean> create
            (@Validated @RequestBody CreateUnidadDTO request){
        return ResponseEntity
                .status(201)
                .body(unidadMedidaService.createUnidad(request));
    }

    /**✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @PatchMapping()
    public ResponseEntity<Boolean> update
            (@Validated @RequestBody UpdateUnidadDTO request){
        return ResponseEntity
                .status(200)
                .body(unidadMedidaService.updateUnidad(request));
    }

    /**✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @PatchMapping("/update-unidad-status")
    public ResponseEntity<Void> updateUnidadStatus(
            @Validated @RequestBody ChangeStatusActiveUnidadDTO request
            ){
        unidadMedidaService.changeStatusEnable(request);
        return ResponseEntity.noContent().build();
    }

    /**✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @PutMapping()
    public ResponseEntity<String> changeProductsToAnotherUnidadMedida(
            @Validated @RequestBody ChangeProductsToAnotherUnidadMedidaDTO request){
        return ResponseEntity
                .status(200)
                .body(unidadMedidaService.changeProductsToAnotherUnidadMedida(request));
    }

    /**✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @DeleteMapping("/{idUnidadMedida}")
    public ResponseEntity<Void> deleteByIdUnidadMedida(
            @PathVariable Short idUnidadMedida){
        unidadMedidaService.deleteUnidad(idUnidadMedida);
        return ResponseEntity.noContent().build();
    }

}
