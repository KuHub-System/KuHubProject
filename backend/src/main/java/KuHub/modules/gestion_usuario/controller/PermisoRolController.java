package KuHub.modules.gestion_usuario.controller;

import KuHub.modules.gestion_usuario.dtos.PermisoMatrizDTO;
import KuHub.modules.gestion_usuario.dtos.PermisoRolRequestDTO;
import KuHub.modules.gestion_usuario.dtos.PermisoRolResponseDTO;
import KuHub.modules.gestion_usuario.service.PermisoRolService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller REST para gestión de permisos por rol.
 *
 * Endpoints:
 *  GET  /api/v1/permisos/matrix        → Matriz completa de permisos (solo ADMINISTRADOR)
 *  GET  /api/v1/permisos/rol/{idRol}   → Permisos de un rol concreto (autenticado)
 *  POST /api/v1/permisos               → Crear permiso             (solo ADMINISTRADOR)
 *  PUT  /api/v1/permisos/{id}          → Actualizar permiso         (solo ADMINISTRADOR)
 *  POST /api/v1/permisos/upsert        → Crear o actualizar permiso (solo ADMINISTRADOR)
 */
@RestController
@RequestMapping("/api/v1/permisos")
public class PermisoRolController {

    private final PermisoRolService permisoRolService;

    @Autowired
    public PermisoRolController(PermisoRolService permisoRolService) {
        this.permisoRolService = permisoRolService;
    }

    /**
     * Devuelve la matriz completa de permisos, agrupada por código de módulo.
     * Solo accesible por el rol ADMINISTRADOR.
     */
    @GetMapping("/matrix")
    public ResponseEntity<Map<String, List<PermisoMatrizDTO>>> getPermissionMatrix() {
        return ResponseEntity.ok(permisoRolService.getPermissionMatrix());
    }

    /**
     * Devuelve los permisos de un rol específico.
     * Accesible por cualquier usuario autenticado (para cargar sus propios permisos).
     */
    @GetMapping("/rol/{idRol}")
    public ResponseEntity<List<PermisoRolResponseDTO>> getPermisosByRol(@PathVariable Integer idRol) {
        return ResponseEntity.ok(permisoRolService.getPermisosByRol(idRol));
    }

    /**
     * Crea un nuevo permiso para un Rol × Módulo.
     * Solo ADMINISTRADOR.
     */
    @PostMapping
    public ResponseEntity<PermisoRolResponseDTO> crear(@Valid @RequestBody PermisoRolRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(permisoRolService.crearPermiso(request));
    }

    /**
     * Actualiza un permiso existente por su ID.
     * Solo ADMINISTRADOR.
     */
    @PutMapping("/{id}")
    public ResponseEntity<PermisoRolResponseDTO> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody PermisoRolRequestDTO request) {
        return ResponseEntity.ok(permisoRolService.actualizarPermiso(id, request));
    }

    /**
     * Crea o actualiza (upsert) el permiso para un Rol × Módulo.
     * Solo ADMINISTRADOR.
     */
    @PostMapping("/upsert")
    public ResponseEntity<PermisoRolResponseDTO> upsert(@Valid @RequestBody PermisoRolRequestDTO request) {
        return ResponseEntity.ok(permisoRolService.upsertPermiso(request));
    }
}
