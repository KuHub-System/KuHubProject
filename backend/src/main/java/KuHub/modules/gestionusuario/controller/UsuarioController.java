package KuHub.modules.gestionusuario.controller;

import KuHub.modules.gestionusuario.dtos.*;
import KuHub.modules.gestionusuario.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/**
 * Controller REST para gestión de Usuarios
 * Endpoints: /api/v1/usuarios
 */
@RestController
@RequestMapping("/api/v1/usuarios")
@CrossOrigin(origins = "http://localhost:5173")
public class UsuarioController {

    @Autowired
    private UsuarioService usuarioService;

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
     * PATCH /api/v1/usuarios/{id}/cambiar-contrasena
     * Cambia la contraseña de un usuario
     */
    @PatchMapping("/{id}/cambiar-contrasena")
    public ResponseEntity<Void> cambiarContrasena(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body) {
        String nuevaContrasena = body.get("nuevaContrasena");
        usuarioService.cambiarContrasena(id, nuevaContrasena);
        return ResponseEntity.noContent().build();
    }

    /**
     * PATCH /api/v1/usuarios/{id}/foto-perfil
     * Actualiza la foto de perfil
     */
    @PatchMapping("/{id}/foto-perfil")
    public ResponseEntity<UsuarioResponseDTO> actualizarFotoPerfil(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body) {
        String fotoPerfil = body.get("fotoPerfil");
        UsuarioResponseDTO usuario = usuarioService.actualizarFotoPerfil(id, fotoPerfil);
        return ResponseEntity.ok(usuario);
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