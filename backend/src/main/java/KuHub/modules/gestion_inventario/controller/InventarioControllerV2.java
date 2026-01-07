package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.assemblers.InventarioModelAssembler;
import KuHub.modules.gestion_inventario.dtos.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.InventoryWithProductResponseAnswerUpdateDTO;
import KuHub.modules.gestion_inventario.entity.Inventario;
import KuHub.modules.gestion_inventario.services.InventarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.MediaTypes;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@Validated
@RequestMapping("/api/v2/inventario")
@Tag(name = "Inventario HATEOAS", description = "Operaciones de gestión de inventario con hypermedia links")
public class InventarioControllerV2 {

    @Autowired
    private InventarioService inventarioService;

    @Autowired
    private InventarioModelAssembler inventarioModelAssembler;

    @GetMapping("/{id}")
    @Operation(
            summary = "Obtener inventario por ID",
            description = "Retorna un registro de inventario específico según su ID"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Inventario encontrado exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Inventario.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Inventario no encontrado"
            )
    })
    public ResponseEntity<EntityModel<Inventario>> findById(
            @Parameter(description = "ID del inventario", required = true)
            @PathVariable Integer id) {
        
        Inventario inventario = inventarioService.findById(id);
        EntityModel<Inventario> entityModel = inventarioModelAssembler.toModel(inventario);
        
        return ResponseEntity.status(HttpStatus.OK).body(entityModel);
    }

    @GetMapping("/id-activo/{id}/{activo}")
    @Operation(
            summary = "Obtener inventario por ID y estado de producto",
            description = "Retorna un inventario específico filtrando por el estado activo del producto asociado"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Inventario encontrado",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Inventario.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Inventario no encontrado o producto con estado diferente"
            )
    })
    public ResponseEntity<EntityModel<Inventario>> findByIdInventoryWithProductActive(
            @Parameter(description = "ID del inventario", required = true)
            @PathVariable Integer id,
            @Parameter(description = "Estado del producto asociado", required = true)
            @PathVariable Boolean activo) {
        
        Inventario inventario = inventarioService.findByIdInventoryWithProductActive(id, activo);
        EntityModel<Inventario> entityModel = inventarioModelAssembler.toModel(inventario);
        
        return ResponseEntity.status(HttpStatus.OK).body(entityModel);
    }

    @GetMapping
    @Operation(
            summary = "Obtener todos los inventarios",
            description = "Retorna lista completa de todos los registros de inventario"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de inventarios obtenida exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Inventario.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<Inventario>>> findAll() {
        List<EntityModel<Inventario>> inventarios = inventarioService.findAll()
                .stream()
                .map(inventarioModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<Inventario>> collectionModel = CollectionModel.of(
                inventarios,
                linkTo(methodOn(InventarioControllerV2.class).findAll()).withSelfRel(),
                linkTo(methodOn(InventarioControllerV2.class).findInventoriesWithProductsActive(true)).withRel("inventarios-activos")
        );

        return ResponseEntity.status(HttpStatus.OK).body(collectionModel);
    }

    @GetMapping("/activo/{activo}")
    @Operation(
            summary = "Obtener inventarios por estado de producto",
            description = "Retorna inventarios cuyo producto asociado tiene un estado activo específico"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Inventarios filtrados exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Inventario.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<Inventario>>> findInventoriesWithProductsActive(
            @Parameter(description = "Estado del producto (true/false)", required = true)
            @PathVariable Boolean activo) {
        
        List<EntityModel<Inventario>> inventarios = inventarioService.findInventoriesWithProductsActive(activo)
                .stream()
                .map(inventarioModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<Inventario>> collectionModel = CollectionModel.of(
                inventarios,
                linkTo(methodOn(InventarioControllerV2.class).findInventoriesWithProductsActive(activo)).withSelfRel(),
                linkTo(methodOn(InventarioControllerV2.class).findAll()).withRel("todos-inventarios")
        );

        return ResponseEntity.status(HttpStatus.OK).body(collectionModel);
    }

    @GetMapping("/inventarios-activos-ordenados")
    @Operation(
            summary = "Obtener inventarios activos ordenados",
            description = "Retorna lista de inventarios activos ordenados por nombre de producto"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista obtenida exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = InventoryWithProductResponseAnswerUpdateDTO.class)
                    )
            )
    })
    public ResponseEntity<List<InventoryWithProductResponseAnswerUpdateDTO>> findAllActiveInventoryOrderedByName() {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(inventarioService.findAllActiveInventoryOrderedByName());
    }

    @PostMapping("/crear-con-producto")
    @Operation(
            summary = "Crear inventario con producto",
            description = "Crea un nuevo registro de inventario junto con su producto asociado"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Inventario creado exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = InventoryWithProductCreateDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos en la solicitud"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos del inventario y producto a crear",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = InventoryWithProductCreateDTO.class)
            )
    )
    public ResponseEntity<InventoryWithProductCreateDTO> save(
            @Valid @RequestBody InventoryWithProductCreateDTO inventarioRequest) {
        
        InventoryWithProductCreateDTO nuevoInventario = inventarioService.save(inventarioRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoInventario);
    }

    @PutMapping("/actualizar-con-producto")
    @Operation(
            summary = "Actualizar inventario con producto",
            description = "Actualiza un registro de inventario existente y su producto asociado"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Inventario actualizado exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = InventoryWithProductResponseAnswerUpdateDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "ID de inventario requerido o datos inválidos"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Inventario no encontrado"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos actualizados del inventario y producto",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = InventoryWithProductResponseAnswerUpdateDTO.class)
            )
    )
    public ResponseEntity<InventoryWithProductResponseAnswerUpdateDTO> updateInventoryWithProduct(
            @RequestBody InventoryWithProductResponseAnswerUpdateDTO inventarioRequest) {

        if (inventarioRequest.getIdInventario() == null) {
            throw new IllegalArgumentException("El ID de Inventario es requerido para la actualización.");
        }

        InventoryWithProductResponseAnswerUpdateDTO actualizado = 
                inventarioService.updateInventoryWithProduct(inventarioRequest);
        
        return ResponseEntity.status(HttpStatus.OK).body(actualizado);
    }

    @PutMapping("/desactivar/{id_inventario}")
    @Operation(
            summary = "Desactivar inventario (eliminación lógica)",
            description = "Cambia el estado activo del producto asociado a FALSE"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Inventario desactivado exitosamente"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Inventario no encontrado"
            )
    })
    public ResponseEntity<Void> updateActiveValueProductFalse(
            @Parameter(description = "ID del inventario a desactivar", required = true)
            @PathVariable Integer id_inventario) {

        inventarioService.updateActiveValueProductFalse(id_inventario);
        return ResponseEntity.status(HttpStatus.OK).build();
    }
}