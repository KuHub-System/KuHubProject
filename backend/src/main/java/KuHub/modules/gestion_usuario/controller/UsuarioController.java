package KuHub.modules.gestion_usuario.controller;

import KuHub.modules.gestion_usuario.dtos.*;
import KuHub.modules.gestion_usuario.dtos.response.proyection.UsersToManageCourseOrSectionView;
import KuHub.modules.gestion_usuario.dtos.request.CreateUser;
import KuHub.modules.gestion_usuario.dtos.request.FindUsersRequest;
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
 * ✅ En uso: Este controlador es fundamental para la gestión de usuarios,
 * consumido principalmente por usuario-service.ts y auth-service.ts en el frontend.
 * Maneja operaciones de listado paginado, búsqueda por filtros, creación, actualización,
 * eliminación y cambio de contraseña.
 */
@RestController
@RequestMapping("/api/v1/usuarios")
public class UsuarioController {

    @Autowired
    private UsuarioService usuarioService;

    /**
     * Obtiene la lista de usuarios habilitados para gestionar asignaturas.
     * ✅ En uso: Consumido por obtenerUsuariosGestoresAsignaturaService en usuario-service.ts.
     */
    @GetMapping( "/users-to-manager-course")
    public ResponseEntity<List<UsersToManageCourseOrSectionView>> usersToManageCourse(){
        return ResponseEntity
                .status(200)
                .body(usuarioService.usersToManageCourse());
    }

    /**
     * Obtiene la lista de usuarios habilitados para ser asignados a una sección.
     * ✅ En uso: Consumido por obtenerUsuariosAsignadosSeccionService en usuario-service.ts.
     */
    @GetMapping("/users-assigned-to-section")
    public  ResponseEntity<List<UsersToManageCourseOrSectionView>>  usersAssignedToSection(){
        return ResponseEntity
                .status(200)
                .body(usuarioService.usersAssignedToSection());

    }

    /**
     * Obtiene todos los usuarios con paginación optimizada para el formato del frontend.
     * Acepta filtro opcional por rol en el body.
     * ✅ En uso: Consumido por obtenerUsuariosPaginadosService en usuario-service.ts.
     */
    @PostMapping("/find-all-users-with-pagination")
    public ResponseEntity<PaginatedUsersDTO> findAllUsersWithPagination(
            @RequestBody(required = false) FindUsersRequest request) {
        return ResponseEntity
                .status(200)
                .body(usuarioService.findAllUsersWithPagination(request));
    }

    /**
     * Obtiene el estado de conexión (email + último acceso + activo) de todos los usuarios.
     * Endpoint ligero para refrescar solo la columna "Estado" del frontend sin re-paginar.
     * ✅ En uso: Consumido por obtenerEstadoUsuariosService en usuario-service.ts.
     */
    @GetMapping("/online-status")
    public ResponseEntity<List<UserStatusView>> findUsersStatus() {
        return ResponseEntity
                .status(200)
                .body(usuarioService.findUsersStatus());
    }

    /**
     * Busca usuarios filtrados por nombre o email con paginación.
     * ✅ En uso: Consumido por buscarUsuariosService en usuario-service.ts.
     */
    @PostMapping("/find-users-by-filter")
    public ResponseEntity<PaginatedUsersDTO> findUsersByFilter(
            @RequestBody SearchUserRequest request) {
        return ResponseEntity
                .status(200)
                .body(usuarioService.searchUsers(request));
    }

    /**
     * Crea un nuevo usuario en el sistema.
     * ✅ En uso: Consumido por crearUsuarioService en usuario-service.ts.
     */
    @PostMapping("/create-user")
    public ResponseEntity<Boolean> createUser (
            @Validated @RequestBody CreateUser request){
        return ResponseEntity
                .status(201)
                .body(usuarioService.createUser(request));
    }

    /**
     * Actualiza la información de un usuario existente buscando por su email actual.
     * ✅ En uso: Consumido por actualizarUsuarioService en usuario-service.ts.
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
     * Desactiva un usuario del sistema buscando por su email único.
     * ✅ En uso: Consumido por eliminarUsuarioService en usuario-service.ts.
     */
    @DeleteMapping("/delete-user/{email}")
    public ResponseEntity<Boolean> deleteUser (
            @PathVariable String email){
        return ResponseEntity
                .status(204)
                .body(usuarioService.deleteUser(email));
    }

















    /**
     * Obtiene todos los usuarios del sistema.
     * ⚠️ Sin uso aparente: El frontend utiliza preferentemente la versión paginada.
     */
    @GetMapping
    public ResponseEntity<List<UsuarioResponseDTO>> obtenerTodos() {
        List<UsuarioResponseDTO> usuarios = usuarioService.obtenerTodos();
        return ResponseEntity.ok(usuarios);
    }

    /**
     * Obtiene solo los usuarios que están activos.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/activos")
    public ResponseEntity<List<UsuarioResponseDTO>> obtenerActivos() {
        List<UsuarioResponseDTO> usuarios = usuarioService.obtenerActivos();
        return ResponseEntity.ok(usuarios);
    }

    /**
     * Obtiene los detalles de un usuario específico por su ID.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/{id}")
    public ResponseEntity<UsuarioResponseDTO> obtenerPorId(@PathVariable Integer id) {
        UsuarioResponseDTO usuario = usuarioService.obtenerPorId(id);
        return ResponseEntity.ok(usuario);
    }

    /**
     * Obtiene un usuario buscando por su dirección de correo electrónico.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/email/{email}")
    public ResponseEntity<UsuarioResponseDTO> obtenerPorEmail(@PathVariable String email) {
        UsuarioResponseDTO usuario = usuarioService.obtenerPorEmail(email);
        return ResponseEntity.ok(usuario);
    }

    /**
     * Busca usuarios filtrando por nombre o email (vía query param).
     * ⚠️ Sin uso aparente: El frontend utiliza find-users-by-filter.
     */
    @GetMapping("/buscar")
    public ResponseEntity<List<UsuarioResponseDTO>> buscar(@RequestParam String q) {
        List<UsuarioResponseDTO> usuarios = usuarioService.buscar(q);
        return ResponseEntity.ok(usuarios);
    }

    /**
     * Obtiene la lista de usuarios que poseen un rol determinado.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/rol/{idRol}")
    public ResponseEntity<List<UsuarioResponseDTO>> obtenerPorRol(@PathVariable Integer idRol) {
        List<UsuarioResponseDTO> usuarios = usuarioService.obtenerPorRol(idRol);
        return ResponseEntity.ok(usuarios);
    }





    /**
     * Crea un nuevo usuario (método estándar).
     * ⚠️ Sin uso aparente: El frontend utiliza /create-user.
     */
    @PostMapping
    public ResponseEntity<UsuarioResponseDTO> crear(@Valid @RequestBody UsuarioRequestDTO usuarioRequestDTO) {
        UsuarioResponseDTO nuevoUsuario = usuarioService.crear(usuarioRequestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoUsuario);
    }

    /**
     * Actualiza un usuario existente por su ID.
     * ⚠️ Sin uso aparente: El frontend utiliza /update-user/{currentEmail}.
     */
    @PutMapping("/{id}")
    public ResponseEntity<UsuarioResponseDTO> actualizar(
            @PathVariable Integer id,
            @Valid @RequestBody UsuarioUpdateDTO usuarioUpdateDTO) {
        UsuarioResponseDTO usuarioActualizado = usuarioService.actualizar(id, usuarioUpdateDTO);
        return ResponseEntity.ok(usuarioActualizado);
    }

    /**
     * Cambia el estado de un usuario a inactivo por su ID.
     * ⚠️ Sin uso aparente: El frontend utiliza /delete-user/{email}.
     */
    @PatchMapping("/{id}/desactivar")
    public ResponseEntity<Void> desactivar(@PathVariable Integer id) {
        usuarioService.desactivar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Cambia el estado de un usuario a activo por su ID.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @PatchMapping("/{id}/activar")
    public ResponseEntity<Void> activar(@PathVariable Integer id) {
        usuarioService.activar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Elimina permanentemente un usuario del sistema.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        usuarioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Permite al usuario autenticado cambiar su propia contraseña.
     * ✅ En uso: Consumido por cambiarPasswordService en auth-service.ts.
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
     * Actualiza la foto de perfil del usuario autenticado.
     * ⚠️ Discrepancia: El frontend (auth-service.ts) busca "/foto-perfil" (PATCH), 
     * mientras que este endpoint es "/perfil/foto" (PUT).
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
     * Obtiene métricas generales sobre los usuarios del sistema.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/estadisticas")
    public ResponseEntity<UsuarioEstadisticasDTO> obtenerEstadisticas() {
        UsuarioEstadisticasDTO estadisticas = usuarioService.obtenerEstadisticas();
        return ResponseEntity.ok(estadisticas);
    }
}