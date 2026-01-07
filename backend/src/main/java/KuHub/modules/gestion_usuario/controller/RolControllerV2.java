package KuHub.modules.gestion_usuario.controller;

import KuHub.modules.gestion_usuario.assemblers.RolModelAssembler;
import KuHub.modules.gestion_usuario.dtos.RolRequestDTO;
import KuHub.modules.gestion_usuario.dtos.RolResponseDTO;
import KuHub.modules.gestion_usuario.service.RolService;
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
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/api/v2/roles")
@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Roles HATEOAS", description = "Gestión de roles y permisos con hypermedia links")
public class RolControllerV2 {

    @Autowired
    private RolService rolService;

    @Autowired
    private RolModelAssembler rolModelAssembler;

    @GetMapping
    @Operation(
            summary = "Obtener todos los roles",
            description = "Retorna lista completa de todos los roles del sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de roles obtenida exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = RolResponseDTO.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<RolResponseDTO>>> obtenerTodos() {
        List<EntityModel<RolResponseDTO>> roles = rolService.obtenerTodos()
                .stream()
                .map(rolModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<RolResponseDTO>> collectionModel = CollectionModel.of(
                roles,
                linkTo(methodOn(RolControllerV2.class).obtenerTodos()).withSelfRel(),
                linkTo(methodOn(RolControllerV2.class).obtenerActivos()).withRel("roles-activos")
        );

        return ResponseEntity.ok(collectionModel);
    }

    @GetMapping("/activos")
    @Operation(
            summary = "Obtener roles activos",
            description = "Retorna únicamente los roles con estado activo"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de roles activos obtenida exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = RolResponseDTO.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<RolResponseDTO>>> obtenerActivos() {
        List<EntityModel<RolResponseDTO>> roles = rolService.obtenerActivos()
                .stream()
                .map(rolModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<RolResponseDTO>> collectionModel = CollectionModel.of(
                roles,
                linkTo(methodOn(RolControllerV2.class).obtenerActivos()).withSelfRel(),
                linkTo(methodOn(RolControllerV2.class).obtenerTodos()).withRel("todos-roles")
        );

        return ResponseEntity.ok(collectionModel);
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Obtener rol por ID",
            description = "Retorna los datos de un rol específico según su identificador"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Rol encontrado exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = RolResponseDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Rol no encontrado"
            )
    })
    public ResponseEntity<EntityModel<RolResponseDTO>> obtenerPorId(
            @Parameter(description = "ID del rol", required = true)
            @PathVariable Integer id) {
        
        RolResponseDTO rol = rolService.obtenerPorId(id);
        EntityModel<RolResponseDTO> entityModel = rolModelAssembler.toModel(rol);
        
        return ResponseEntity.ok(entityModel);
    }

    @GetMapping("/nombre/{nombre}")
    @Operation(
            summary = "Obtener rol por nombre",
            description = "Busca y retorna un rol según su nombre exacto"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Rol encontrado",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = RolResponseDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Rol no encontrado"
            )
    })
    public ResponseEntity<EntityModel<RolResponseDTO>> obtenerPorNombre(
            @Parameter(description = "Nombre del rol", required = true)
            @PathVariable String nombre) {
        
        RolResponseDTO rol = rolService.obtenerPorNombre(nombre);
        EntityModel<RolResponseDTO> entityModel = rolModelAssembler.toModel(rol);
        
        return ResponseEntity.ok(entityModel);
    }

    @PostMapping
    @Operation(
            summary = "Crear nuevo rol",
            description = "Registra un nuevo rol en el sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Rol creado exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = RolResponseDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos en la solicitud"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "El rol ya existe"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos del rol a crear",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = RolRequestDTO.class)
            )
    )
    public ResponseEntity<EntityModel<RolResponseDTO>> crear(
            @Valid @RequestBody RolRequestDTO rolRequestDTO) {
        
        RolResponseDTO nuevoRol = rolService.crear(rolRequestDTO);
        EntityModel<RolResponseDTO> entityModel = rolModelAssembler.toModel(nuevoRol);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(entityModel);
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Actualizar rol",
            description = "Actualiza los datos de un rol existente"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Rol actualizado exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = RolResponseDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Rol no encontrado"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos actualizados del rol",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = RolRequestDTO.class)
            )
    )
    public ResponseEntity<EntityModel<RolResponseDTO>> actualizar(
            @Parameter(description = "ID del rol a actualizar", required = true)
            @PathVariable Integer id,
            @Valid @RequestBody RolRequestDTO rolRequestDTO) {
        
        RolResponseDTO rolActualizado = rolService.actualizar(id, rolRequestDTO);
        EntityModel<RolResponseDTO> entityModel = rolModelAssembler.toModel(rolActualizado);
        
        return ResponseEntity.ok(entityModel);
    }

    @PatchMapping("/{id}/desactivar")
    @Operation(
            summary = "Desactivar rol",
            description = "Cambia el estado del rol a inactivo"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "204",
                    description = "Rol desactivado exitosamente"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Rol no encontrado"
            )
    })
    public ResponseEntity<Void> desactivar(
            @Parameter(description = "ID del rol a desactivar", required = true)
            @PathVariable Integer id) {
        
        rolService.desactivar(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/activar")
    @Operation(
            summary = "Activar rol",
            description = "Cambia el estado del rol a activo"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "204",
                    description = "Rol activado exitosamente"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Rol no encontrado"
            )
    })
    public ResponseEntity<Void> activar(
            @Parameter(description = "ID del rol a activar", required = true)
            @PathVariable Integer id) {
        
        rolService.activar(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Eliminar rol permanentemente",
            description = "Elimina físicamente un rol de la base de datos"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "204",
                    description = "Rol eliminado exitosamente"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Rol no encontrado"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "No se puede eliminar el rol porque tiene usuarios asociados"
            )
    })
    public ResponseEntity<Void> eliminar(
            @Parameter(description = "ID del rol a eliminar", required = true)
            @PathVariable Integer id) {
        
        rolService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/existe/{nombre}")
    @Operation(
            summary = "Verificar existencia de rol",
            description = "Verifica si existe un rol con el nombre especificado"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Verificación completada",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Boolean.class)
                    )
            )
    })
    public ResponseEntity<Boolean> existePorNombre(
            @Parameter(description = "Nombre del rol a verificar", required = true)
            @PathVariable String nombre) {
        
        boolean existe = rolService.existePorNombre(nombre);
        return ResponseEntity.ok(existe);
    }
}