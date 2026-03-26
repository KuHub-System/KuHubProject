package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.request.ChangeStatusActiveUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.request.ChangeProductsToAnotherUnidadMedidaDTO;
import KuHub.modules.gestion_inventario.dtos.request.CreateUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.request.UpdateUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.response.proyeccion.UnidadMedidaView;
import KuHub.modules.gestion_inventario.entity.UnidadMedida;
import KuHub.modules.gestion_inventario.services.UnidadMedidaServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Unidades de Medida
 * Endpoints: /api/v1/unidad-medida
 * ✅ En uso: Este controlador gestiona el CRUD de unidades de medida, incluyendo la validación 
 * de productos asociados y la transferencia de productos entre unidades.
 * Consumido por unidad-medida-service.ts en el frontend.
 */
@RestController
@RequestMapping("/api/v1/unidad-medida")
@Validated
public class UnidadMedidaController {

    @Autowired
    private UnidadMedidaServiceImpl unidadMedidaService;

    /**
     * Obtiene todas las unidades de medida incluyendo el conteo de productos asociados.
     * ✅ En uso: Consumido por obtenerUnidadesService en unidad-medida-service.ts.
     */
    @GetMapping("/find-all-view")
    public ResponseEntity<List<UnidadMedidaView>> findAllView(){
        return ResponseEntity
                .status(200)
                .body(unidadMedidaService.findAllWithAsociados());
    }

    /**
     * Obtiene el listado básico de todas las unidades de medida.
     * ⚠️ Sin uso aparente: El frontend utiliza find-all-view para obtener datos adicionales.
     */
    @GetMapping()
    public ResponseEntity<List<UnidadMedida>> findAll(){
        return ResponseEntity
                .status(200)
                .body(unidadMedidaService.findAll());
    }

    /**
     * Obtiene la lista de unidades de medida que se encuentran activas.
     * ✅ En uso: Consumido por obtenerUnidadesActivasService en unidad-medida-service.ts.
     */
    @GetMapping("/find-all-active-true")
    public ResponseEntity<List<UnidadMedida>> findAllActiveTrue(){
        return ResponseEntity
                .status(200)
                .body(unidadMedidaService.findAllActiveTrue());
    }

    /**
     * Crea una nueva unidad de medida en el sistema.
     * ✅ En uso: Consumido por crearUnidadService en unidad-medida-service.ts.
     */
    @PostMapping()
    public ResponseEntity<Boolean> create
            (@Validated @RequestBody CreateUnidadDTO request){
        return ResponseEntity
                .status(201)
                .body(unidadMedidaService.createUnidad(request));
    }

    /**
     * Actualiza la información de una unidad de medida existente.
     * ✅ En uso: Consumido por actualizarUnidadService en unidad-medida-service.ts.
     */
    @PatchMapping()
    public ResponseEntity<Boolean> update
            (@Validated @RequestBody UpdateUnidadDTO request){
        return ResponseEntity
                .status(200)
                .body(unidadMedidaService.updateUnidad(request));
    }

    /**
     * Alterna el estado de activación de una unidad de medida.
     * ✅ En uso: Consumido por cambiarEstadoUnidadService en unidad-medida-service.ts.
     */
    @PatchMapping("/update-unidad-status")
    public ResponseEntity<Void> updateUnidadStatus(
            @Validated @RequestBody ChangeStatusActiveUnidadDTO request
            ){
        unidadMedidaService.changeStatusEnable(request);
        return ResponseEntity.noContent().build();
    }

    /**
     * Reasocia todos los productos de una unidad de medida a otra unidad de destino.
     * ✅ En uso: Consumido por transferirProductosUnidadService en unidad-medida-service.ts.
     */
    @PutMapping()
    public ResponseEntity<String> changeProductsToAnotherUnidadMedida(
            @Validated @RequestBody ChangeProductsToAnotherUnidadMedidaDTO request){
        return ResponseEntity
                .status(200)
                .body(unidadMedidaService.changeProductsToAnotherUnidadMedida(request));
    }

    /**
     * Elimina una unidad de medida del sistema por su ID.
     * ✅ En uso: Consumido por eliminarUnidadService en unidad-medida-service.ts.
     */
    @DeleteMapping("/{idUnidadMedida}")
    public ResponseEntity<Void> deleteByIdUnidadMedida(
            @PathVariable Short idUnidadMedida){
        unidadMedidaService.deleteUnidad(idUnidadMedida);
        return ResponseEntity.noContent().build();
    }

}
