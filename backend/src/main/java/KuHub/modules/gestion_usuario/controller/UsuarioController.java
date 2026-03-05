package KuHub.modules.gestion_usuario.controller;

import KuHub.modules.gestion_usuario.dtos.*;
import KuHub.modules.gestion_usuario.dtos.request.CreateUser;
import KuHub.modules.gestion_usuario.dtos.request.SearchUserRequest;
import KuHub.modules.gestion_usuario.dtos.request.UpdateUser;
import KuHub.modules.gestion_usuario.dtos.response.PaginatedUsersDTO;
import KuHub.modules.gestion_usuario.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Controller REST para gestión de Usuarios
 * Endpoints: /api/v1/usuarios
 */
@RestController
@RequestMapping("/api/v1/usuarios")
public class UsuarioController {

    @Autowired
    private UsuarioService usuarioService;


    /**
     * Endpoint para listar usuarios con el formato requerido por el frontend.
     * ✅ En uso: Endpoint consumido por el frontend.
     */
    @PostMapping("/find-all-users-with-pagination")
    public ResponseEntity<PaginatedUsersDTO> findAllUsersWithPagination(@RequestBody(required = false) Integer page) {
        return ResponseEntity
                .status(200)
                .body(usuarioService.findAllUsersWithPagination(page));
    }

    /**
     * Busca usuarios filtrados por nombre o email con paginación asimétrica.
     * @param request Objeto con el término de búsqueda y la página solicitada.
     * ✅ En uso: Endpoint consumido por el frontend.
     */
    @PostMapping("/find-users-by-filter")
    public ResponseEntity<PaginatedUsersDTO> findUsersByFilter(
            @RequestBody SearchUserRequest request) {
        return ResponseEntity
                .status(200)
                .body(usuarioService.searchUsers(request));
    }

    /**
     * Endpoint para creacion del usuario formato frontend
     * ✅ En uso: Endpoint consumido por el frontend.
     */
    @PostMapping("/create-user")
    public ResponseEntity<Boolean> createUser (
            @Validated @RequestBody CreateUser request){
        return ResponseEntity
                .status(201)
                .body(usuarioService.createUser(request));
    }

    /**
     * Endpoint para actualizacion del usuario formato frontend
     * ✅ En uso: Endpoint consumido por el frontend.
     */
    @PatchMapping("/update-user/{currentEmail}")
    public ResponseEntity<Boolean> updateUser (
            @PathVariable String currentEmail,
            @Validated @RequestBody UpdateUser request){
        return ResponseEntity
                .status(200)
                .body(usuarioService.updateUser(currentEmail,request));
    }

    /**
     * Endpoint para delectar del usuario con el email unico evitando uso de id para formato frontend
     * ✅ En uso: Endpoint consumido por el frontend.
     */
    @DeleteMapping("/delete-user/{email}")
    public ResponseEntity<Boolean> deleteUser (
            @PathVariable String email){
        return ResponseEntity
                .status(204)
                .body(usuarioService.deleteUser(email));
    }
















    /**
     * GET /api/v1/usuarios
     * Obtiene todos los usuarios
     */
    @GetMapping
    public ResponseEntity<List<UsuarioResponseDTO>> obtenerTodos() {
        List<UsuarioResponseDTO> usuarios = usuarioService.obtenerTodos();
        return ResponseEntity.ok(usuarios);
    }

    /**
     * GET /api/v1/usuarios/activos
     * Obtiene solo los usuarios activos
     */
    @GetMapping("/activos")
    public ResponseEntity<List<UsuarioResponseDTO>> obtenerActivos() {
        List<UsuarioResponseDTO> usuarios = usuarioService.obtenerActivos();
        return ResponseEntity.ok(usuarios);
    }

    /**
     * GET /api/v1/usuarios/{id}
     * Obtiene un usuario por su ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<UsuarioResponseDTO> obtenerPorId(@PathVariable Integer id) {
        UsuarioResponseDTO usuario = usuarioService.obtenerPorId(id);
        return ResponseEntity.ok(usuario);
    }

    /**
     * GET /api/v1/usuarios/email/{email}
     * Obtiene un usuario por su email
     */
    @GetMapping("/email/{email}")
    public ResponseEntity<UsuarioResponseDTO> obtenerPorEmail(@PathVariable String email) {
        UsuarioResponseDTO usuario = usuarioService.obtenerPorEmail(email);
        return ResponseEntity.ok(usuario);
    }

    /**
     * GET /api/v1/usuarios/buscar?q=termino
     * Busca usuarios por nombre o email
     */
    @GetMapping("/buscar")
    public ResponseEntity<List<UsuarioResponseDTO>> buscar(@RequestParam String q) {
        List<UsuarioResponseDTO> usuarios = usuarioService.buscar(q);
        return ResponseEntity.ok(usuarios);
    }

    /**
     * GET /api/v1/usuarios/rol/{idRol}
     * Obtiene usuarios por rol
     */
    @GetMapping("/rol/{idRol}")
    public ResponseEntity<List<UsuarioResponseDTO>> obtenerPorRol(@PathVariable Integer idRol) {
        List<UsuarioResponseDTO> usuarios = usuarioService.obtenerPorRol(idRol);
        return ResponseEntity.ok(usuarios);
    }

    @GetMapping("/docentes-activos")
    public ResponseEntity<List<UserIdAndCompleteNameDTO>> obtenerDocentesYProfesoresActivos(){
        List<UserIdAndCompleteNameDTO> usuarios = usuarioService.obtenerDocentesYProfesoresActivos();
        return ResponseEntity.ok(usuarios);

    }

    @GetMapping( "/profesores-a-cargo/")
    public ResponseEntity<List<UserIdAndCompleteNameDTO>> obtenerTodosProfesorACargo(){
        List<UserIdAndCompleteNameDTO> profes = usuarioService.obtenerTodosProfesorACargo();
        return ResponseEntity.ok(profes);
    }

    /**
     * POST /api/v1/usuarios
     * Crea un nuevo usuario
     */
    @PostMapping
    public ResponseEntity<UsuarioResponseDTO> crear(@Valid @RequestBody UsuarioRequestDTO usuarioRequestDTO) {
        UsuarioResponseDTO nuevoUsuario = usuarioService.crear(usuarioRequestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoUsuario);
    }

    /**
     * PUT /api/v1/usuarios/{id}
     * Actualiza un usuario existente
     */
    @PutMapping("/{id}")
    public ResponseEntity<UsuarioResponseDTO> actualizar(
            @PathVariable Integer id,
            @Valid @RequestBody UsuarioUpdateDTO usuarioUpdateDTO) {
        UsuarioResponseDTO usuarioActualizado = usuarioService.actualizar(id, usuarioUpdateDTO);
        return ResponseEntity.ok(usuarioActualizado);
    }

    /**
     * PATCH /api/v1/usuarios/{id}/desactivar
     * Desactiva un usuario
     */
    @PatchMapping("/{id}/desactivar")
    public ResponseEntity<Void> desactivar(@PathVariable Integer id) {
        usuarioService.desactivar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * PATCH /api/v1/usuarios/{id}/activar
     * Activa un usuario
     */
    @PatchMapping("/{id}/activar")
    public ResponseEntity<Void> activar(@PathVariable Integer id) {
        usuarioService.activar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * DELETE /api/v1/usuarios/{id}
     * Elimina un usuario permanentemente
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        usuarioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Cambia la contraseña de un usuario
     */
    @PatchMapping("/cambiar-contrasena")
    public ResponseEntity<Void> cambiarContrasena(
            @Valid @RequestBody ChangePasswordRequestDTO request,
            Authentication authentication
    ) {
        System.out.println("=== INICIO cambiarContrasena ===");
        System.out.println("Authentication: " + authentication);
        System.out.println("Principal: " + (authentication != null ? authentication.getPrincipal() : "null"));
        System.out.println("Authorities: " + (authentication != null ? authentication.getAuthorities() : "null"));
        System.out.println("Is Authenticated: " + (authentication != null ? authentication.isAuthenticated() : "false"));

        if (authentication == null || !authentication.isAuthenticated()) {
            System.out.println("❌ ERROR: Authentication es NULL o no está autenticado");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String usernameDelToken = authentication.getName();
        System.out.println("✅ Usuario autenticado: " + usernameDelToken);
        System.out.println("✅ Datos recibidos: PassActual=" + request.getPasswordActual() + ", Nueva=" + request.getNuevaPassword());

        Integer idUsuarioReal = usuarioService.buscarIdPorUsername(usernameDelToken);

        if (idUsuarioReal == null) {
            System.out.println("❌ ERROR: No se encontró ID para el usuario: " + usernameDelToken);
            return ResponseEntity.notFound().build();
        }

        System.out.println("✅ ID encontrado en BD: " + idUsuarioReal);

        usuarioService.cambiarContrasena(
                idUsuarioReal,
                request.getPasswordActual(),
                request.getNuevaPassword(),
                request.getConfirmacionPassword()
        );

        System.out.println("✅ Contraseña cambiada exitosamente");
        return ResponseEntity.noContent().build();
    }

    /**
     * PUT /api/v1/usuarios/{id}/foto
     * Actualiza la foto de perfil de un usuario
     */
    @PutMapping("/perfil/foto")
    public ResponseEntity<?> actualizarFotoPerfil(@RequestParam("foto") MultipartFile foto) {
        try {
            // Ya no pasamos el ID, el servicio lo obtiene del token
            UsuarioResponseDTO usuarioActualizado = usuarioService.actualizarFotoPerfil(foto);
            return ResponseEntity.ok(usuarioActualizado);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al actualizar la foto de perfil");
        }
    }

    /**
     * GET /api/v1/usuarios/estadisticas
     * Obtiene estadísticas de usuarios
     */
    @GetMapping("/estadisticas")
    public ResponseEntity<UsuarioEstadisticasDTO> obtenerEstadisticas() {
        UsuarioEstadisticasDTO estadisticas = usuarioService.obtenerEstadisticas();
        return ResponseEntity.ok(estadisticas);
    }
}