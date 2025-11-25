package KuHub.modules.producto.controller;

import KuHub.modules.producto.assemblers.ProductoModelAssembler;
import KuHub.modules.producto.dtos.ProductoUpdateRequest;
import KuHub.modules.producto.entity.Producto;
import KuHub.modules.producto.service.ProductoService;
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
@RequestMapping("/api/v2/productos")
@Validated
@Tag(name = "Productos HATEOAS", description = "Operaciones CRUD de Productos con hypermedia links")
public class ProductoControllerV2 {

    @Autowired
    private ProductoService productoService;

    @Autowired
    private ProductoModelAssembler productoModelAssembler;

    @GetMapping
    @Operation(
            summary = "Obtener todos los productos",
            description = "Retorna una lista de todos los productos disponibles en el sistema, independiente de su estado activo"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de productos obtenida exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Producto.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<Producto>>> findAllProducts() {
        List<EntityModel<Producto>> productos = productoService.findAll()
                .stream()
                .map(productoModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<Producto>> collectionModel = CollectionModel.of(
                productos,
                linkTo(methodOn(ProductoControllerV2.class).findAllProducts()).withSelfRel(),
                linkTo(methodOn(ProductoControllerV2.class).findByActive(true)).withRel("productos-activos"),
                linkTo(methodOn(ProductoControllerV2.class).findByActive(false)).withRel("productos-inactivos")
        );

        return ResponseEntity.status(HttpStatus.OK).body(collectionModel);
    }

    @GetMapping("/activo/{activo}")
    @Operation(
            summary = "Obtener productos por estado",
            description = "Retorna todos los productos filtrados por su estado activo (true/false)"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Productos filtrados exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Producto.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<Producto>>> findByActive(
            @Parameter(description = "Estado del producto (true=activo, false=inactivo)", required = true)
            @PathVariable Boolean activo) {
        
        List<EntityModel<Producto>> productos = productoService.findByActivo(activo)
                .stream()
                .map(productoModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<Producto>> collectionModel = CollectionModel.of(
                productos,
                linkTo(methodOn(ProductoControllerV2.class).findByActive(activo)).withSelfRel(),
                linkTo(methodOn(ProductoControllerV2.class).findAllProducts()).withRel("todos-productos")
        );

        return ResponseEntity.status(HttpStatus.OK).body(collectionModel);
    }

    @GetMapping("/id/{id}")
    @Operation(
            summary = "Obtener producto por ID",
            description = "Retorna un producto específico según su ID, independiente de su estado"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Producto encontrado exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Producto.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Producto no encontrado con el ID especificado"
            )
    })
    public ResponseEntity<EntityModel<Producto>> findProductById(
            @Parameter(description = "ID único del producto", required = true)
            @PathVariable Integer id) {
        
        Producto producto = productoService.findById(id);
        EntityModel<Producto> entityModel = productoModelAssembler.toModel(producto);
        
        return ResponseEntity.status(HttpStatus.OK).body(entityModel);
    }

    @GetMapping("/categorias-activas")
    @Operation(
            summary = "Obtener categorías de productos activos",
            description = "Retorna lista de categorías distintas de productos activos"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Categorías obtenidas exitosamente"
            )
    })
    public ResponseEntity<List<String>> findByCategoriaNameProductActive() {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(productoService.findDistinctCategoriaAndActivoTrue());
    }

    @GetMapping("/unidades-medida-activas")
    @Operation(
            summary = "Obtener unidades de medida de productos activos",
            description = "Retorna lista de unidades de medida distintas de productos activos"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Unidades de medida obtenidas exitosamente"
            )
    })
    public ResponseEntity<List<String>> findByUnidadMedidaProductActive() {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(productoService.findDistinctUnidadMedidaByActivoTrue());
    }

    @GetMapping("/activo/id/{id_producto}")
    @Operation(
            summary = "Obtener producto activo por ID",
            description = "Retorna un producto específico solo si está activo"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Producto activo encontrado",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Producto.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Producto no encontrado o inactivo"
            )
    })
    public ResponseEntity<EntityModel<Producto>> findProductByIdAndActive(
            @Parameter(description = "ID del producto", required = true)
            @PathVariable Integer id_producto) {
        
        Producto producto = productoService.findByIdProductoAndActivoTrue(id_producto);
        EntityModel<Producto> entityModel = productoModelAssembler.toModel(producto);
        
        return ResponseEntity.status(HttpStatus.OK).body(entityModel);
    }

    @GetMapping("/nombre/{nombreProducto}")
    @Operation(
            summary = "Buscar producto por nombre",
            description = "Retorna un producto según su nombre exacto"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Producto encontrado",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Producto.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Producto no encontrado"
            )
    })
    public ResponseEntity<EntityModel<Producto>> findProductoByName(
            @Parameter(description = "Nombre exacto del producto", required = true)
            @PathVariable String nombreProducto) {
        
        Producto producto = productoService.findByNombreProducto(nombreProducto);
        EntityModel<Producto> entityModel = productoModelAssembler.toModel(producto);
        
        return ResponseEntity.status(HttpStatus.OK).body(entityModel);
    }

    @PostMapping
    @Operation(
            summary = "Crear nuevo producto",
            description = "Crea un nuevo producto en el sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Producto creado exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Producto.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos en la solicitud"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "El producto ya existe"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos del producto a crear",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = Producto.class)
            )
    )
    public ResponseEntity<EntityModel<Producto>> save(
            @Valid @RequestBody Producto producto) {
        
        Producto nuevoProducto = productoService.save(producto);
        EntityModel<Producto> entityModel = productoModelAssembler.toModel(nuevoProducto);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(entityModel);
    }

    @PutMapping("/id/{id}")
    @Operation(
            summary = "Actualizar producto por ID",
            description = "Actualiza los datos de un producto existente según su ID"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Producto actualizado exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Producto.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Producto no encontrado"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos actualizados del producto",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = ProductoUpdateRequest.class)
            )
    )
    public ResponseEntity<EntityModel<Producto>> updateProductoById(
            @Parameter(description = "ID del producto a actualizar", required = true)
            @PathVariable Integer id,
            @Validated @RequestBody ProductoUpdateRequest productoUpdateRequest) {
        
        Producto productoActualizado = productoService.updateById(id, productoUpdateRequest);
        EntityModel<Producto> entityModel = productoModelAssembler.toModel(productoActualizado);
        
        return ResponseEntity.status(HttpStatus.OK).body(entityModel);
    }

    @PutMapping("/soft-delete/id/{id}")
    @Operation(
            summary = "Eliminación lógica de producto por ID",
            description = "Desactiva un producto cambiando su estado activo a FALSE"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "204",
                    description = "Producto desactivado exitosamente"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Producto no encontrado"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "Conflicto al desactivar el producto"
            )
    })
    public ResponseEntity<Void> deleteProductoById(
            @Parameter(description = "ID del producto a desactivar", required = true)
            @PathVariable Integer id) {
        
        productoService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}