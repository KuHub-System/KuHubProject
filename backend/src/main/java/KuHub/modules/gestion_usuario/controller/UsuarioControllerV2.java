package KuHub.modules.gestion_usuario.controller;

import KuHub.modules.gestion_usuario.assemblers.UsuarioModelAssembler;
import KuHub.modules.gestion_usuario.dtos.*;
import KuHub.modules.gestion_usuario.service.UsuarioService;
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
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/api/v2/usuarios")
@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Usuarios HATEOAS", description = "Gestión completa de usuarios con hypermedia links")
public class UsuarioControllerV2 {

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private UsuarioModelAssembler usuarioModelAssembler;

    @GetMapping
    @Operation(
            summary = "Obtener todos los usuarios",
            description = "Retorna lista completa de usuarios registrados en el sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de usuarios obtenida exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = UsuarioResponseDTO.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<UsuarioResponseDTO>>> obtenerTodos() {
        List<EntityModel<UsuarioResponseDTO>> usuarios = usuarioService.obtenerTodos()
                .stream()
                .map(usuarioModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<UsuarioResponseDTO>> collectionModel = CollectionModel.of(
                usuarios,
                linkTo(methodOn(UsuarioControllerV2.class).obtenerTodos()).withSelfRel(),
                linkTo(methodOn(UsuarioControllerV2.class).obtenerActivos()).withRel("usuarios-activos"),
                linkTo(methodOn(UsuarioControllerV2.class).obtenerEstadisticas()).withRel("estadisticas")
        );

        return ResponseEntity.ok(collectionModel);
    }

    @GetMapping("/activos")
    @Operation(
            summary = "Obtener usuarios activos",
            description = "Retorna únicamente los usuarios con estado activo"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de usuarios activos obtenida exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = UsuarioResponseDTO.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<UsuarioResponseDTO>>> obtenerActivos() {
        List<EntityModel<UsuarioResponseDTO>> usuarios = usuarioService.obtenerActivos()
                .stream()
                .map(usuarioModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<UsuarioResponseDTO>> collectionModel = CollectionModel.of(
                usuarios,
                linkTo(methodOn(UsuarioControllerV2.class).obtenerActivos()).withSelfRel(),
                linkTo(methodOn(UsuarioControllerV2.class).obtenerTodos()).withRel("todos-usuarios")
        );

        return ResponseEntity.ok(collectionModel);
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Obtener usuario por ID",
            description = "Retorna los datos de un usuario específico según su identificador"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Usuario encontrado exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = UsuarioResponseDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Usuario no encontrado"
            )
    })
    public ResponseEntity<EntityModel<UsuarioResponseDTO>> obtenerPorId(
            @Parameter(description = "ID del usuario", required = true)
            @PathVariable Integer id) {
        
        UsuarioResponseDTO usuario = usuarioService.obtenerPorId(id);
        EntityModel<UsuarioResponseDTO> entityModel = usuarioModelAssembler.toModel(usuario);
        
        return ResponseEntity.ok(entityModel);
    }

    @GetMapping("/email/{email}")
    @Operation(
            summary = "Obtener usuario por email",
            description = "Busca y retorna un usuario según su dirección de email"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Usuario encontrado",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = UsuarioResponseDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Usuario no encontrado"
            )
    })
    public ResponseEntity<EntityModel<UsuarioResponseDTO>> obtenerPorEmail(
            @Parameter(description = "Email del usuario", required = true)
            @PathVariable String email) {
        
        UsuarioResponseDTO usuario = usuarioService.obtenerPorEmail(email);
        EntityModel<UsuarioResponseDTO> entityModel = usuarioModelAssembler.toModel(usuario);
        
        return ResponseEntity.ok(entityModel);
    }

    @GetMapping("/buscar")
    @Operation(
            summary = "Buscar usuarios",
            description = "Busca usuarios por coincidencias en nombre o email"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Búsqueda realizada exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = UsuarioResponseDTO.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<UsuarioResponseDTO>>> buscar(
            @Parameter(description = "Término de búsqueda", required = true)
            @RequestParam String q) {
        
        List<EntityModel<UsuarioResponseDTO>> usuarios = usuarioService.buscar(q)
                .stream()
                .map(usuarioModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<UsuarioResponseDTO>> collectionModel = CollectionModel.of(
                usuarios,
                linkTo(methodOn(UsuarioControllerV2.class).buscar(q)).withSelfRel(),
                linkTo(methodOn(UsuarioControllerV2.class).obtenerTodos()).withRel("todos-usuarios")
        );

        return ResponseEntity.ok(collectionModel);
    }

    @GetMapping("/rol/{idRol}")
    @Operation(
            summary = "Obtener usuarios por rol",
            description = "Retorna todos los usuarios que tienen un rol específico"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Usuarios obtenidos exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = UsuarioResponseDTO.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<UsuarioResponseDTO>>> obtenerPorRol(
            @Parameter(description = "ID del rol", required = true)
            @PathVariable Integer idRol) {
        
        List<EntityModel<UsuarioResponseDTO>> usuarios = usuarioService.obtenerPorRol(idRol)
                .stream()
                .map(usuarioModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<UsuarioResponseDTO>> collectionModel = CollectionModel.of(
                usuarios,
                linkTo(methodOn(UsuarioControllerV2.class).obtenerPorRol(idRol)).withSelfRel(),
                linkTo(methodOn(UsuarioControllerV2.class).obtenerTodos()).withRel("todos-usuarios")
        );

        return ResponseEntity.ok(collectionModel);
    }

    @PostMapping
    @Operation(
            summary = "Crear nuevo usuario",
            description = "Registra un nuevo usuario en el sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Usuario creado exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = UsuarioResponseDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos en la solicitud"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "El usuario ya existe"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos del usuario a crear",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = UsuarioRequestDTO.class)
            )
    )
    public ResponseEntity<EntityModel<UsuarioResponseDTO>> crear(
            @Valid @RequestBody UsuarioRequestDTO usuarioRequestDTO) {
        
        UsuarioResponseDTO nuevoUsuario = usuarioService.crear(usuarioRequestDTO);
        EntityModel<UsuarioResponseDTO> entityModel = usuarioModelAssembler.toModel(nuevoUsuario);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(entityModel);
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Actualizar usuario",
            description = "Actualiza los datos de un usuario existente"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Usuario actualizado exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = UsuarioResponseDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Usuario no encontrado"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos actualizados del usuario",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = UsuarioUpdateDTO.class)
            )
    )
    public ResponseEntity<EntityModel<UsuarioResponseDTO>> actualizar(
            @Parameter(description = "ID del usuario a actualizar", required = true)
            @PathVariable Integer id,
            @Valid @RequestBody UsuarioUpdateDTO usuarioUpdateDTO) {
        
        UsuarioResponseDTO usuarioActualizado = usuarioService.actualizar(id, usuarioUpdateDTO);
        EntityModel<UsuarioResponseDTO> entityModel = usuarioModelAssembler.toModel(usuarioActualizado);
        
        return ResponseEntity.ok(entityModel);
    }

    @PatchMapping("/{id}/desactivar")
    @Operation(
            summary = "Desactivar usuario",
            description = "Cambia el estado del usuario a inactivo"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "204",
                    description = "Usuario desactivado exitosamente"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Usuario no encontrado"
            )
    })
    public ResponseEntity<Void> desactivar(
            @Parameter(description = "ID del usuario a desactivar", required = true)
            @PathVariable Integer id) {
        
        usuarioService.desactivar(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/activar")
    @Operation(
            summary = "Activar usuario",
            description = "Cambia el estado del usuario a activo"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "204",
                    description = "Usuario activado exitosamente"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Usuario no encontrado"
            )
    })
    public ResponseEntity<Void> activar(
            @Parameter(description = "ID del usuario a activar", required = true)
            @PathVariable Integer id) {
        
        usuarioService.activar(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Eliminar usuario permanentemente",
            description = "Elimina físicamente un usuario de la base de datos"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "204",
                    description = "Usuario eliminado exitosamente"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Usuario no encontrado"
            )
    })
    public ResponseEntity<Void> eliminar(
            @Parameter(description = "ID del usuario a eliminar", required = true)
            @PathVariable Integer id) {
        
        usuarioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/cambiar-contrasena")
    @Operation(
            summary = "Cambiar contraseña",
            description = "Permite actualizar la contraseña de un usuario"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "204",
                    description = "Contraseña cambiada exitosamente"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Usuario no encontrado"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Nueva contraseña inválida"
            )
    })
    public ResponseEntity<Void> cambiarContrasena(
            @Parameter(description = "ID del usuario", required = true)
            @PathVariable Integer id,
            @RequestBody Map<String, String> body) {
        
        String nuevaContrasena = body.get("nuevaContrasena");
        usuarioService.cambiarContrasena(id, nuevaContrasena);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/foto")
    @Operation(
            summary = "Actualizar foto de perfil",
            description = "Permite subir o actualizar la foto de perfil del usuario"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Foto actualizada exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = UsuarioResponseDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Usuario no encontrado"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Archivo inválido"
            )
    })
    public ResponseEntity<EntityModel<UsuarioResponseDTO>> actualizarFotoPerfil(
            @Parameter(description = "ID del usuario", required = true)
            @PathVariable Integer id,
            @Parameter(description = "Archivo de imagen", required = true)
            @RequestParam("foto") MultipartFile foto) {
        
        UsuarioResponseDTO usuarioActualizado = usuarioService.actualizarFotoPerfil(id, foto);
        EntityModel<UsuarioResponseDTO> entityModel = usuarioModelAssembler.toModel(usuarioActualizado);
        
        return ResponseEntity.ok(entityModel);
    }

    @GetMapping("/estadisticas")
    @Operation(
            summary = "Obtener estadísticas de usuarios",
            description = "Retorna métricas y estadísticas generales sobre los usuarios del sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Estadísticas obtenidas exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = UsuarioEstadisticasDTO.class)
                    )
            )
    })
    public ResponseEntity<UsuarioEstadisticasDTO> obtenerEstadisticas() {
        UsuarioEstadisticasDTO estadisticas = usuarioService.obtenerEstadisticas();
        return ResponseEntity.ok(estadisticas);
    }
}