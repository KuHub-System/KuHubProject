package KuHub.modules.gestion_usuario.controller;

import KuHub.modules.gestion_usuario.dtos.RolRequestDTO;
import KuHub.modules.gestion_usuario.dtos.RolResponseDTO;
import KuHub.modules.gestion_usuario.service.RolService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * Controller REST para gestión de Roles
 * Endpoints: /api/v1/roles
 * ⚠️ No está en uso actualmente: El frontend gestiona los roles y permisos de forma local 
 * (ver src/pages/gestion-roles.tsx y src/services/roles-helper.ts en el frontend).
 * Este controlador proporciona operaciones CRUD para roles que podrían ser integradas en el futuro.
 */
@RestController
@RequestMapping("/api/v1/roles")
@CrossOrigin(origins = "http://localhost:5173")
public class RolController {

    @Autowired
    private RolService rolService;

    /**
     * Obtiene todos los roles registrados en el sistema.
     * ⚠️ Sin uso aparente en el frontend actual (se gestionan localmente).
     */
    @GetMapping
    public ResponseEntity<List<RolResponseDTO>> obtenerTodos() {
        List<RolResponseDTO> roles = rolService.obtenerTodos();
        return ResponseEntity.ok(roles);
    }

    /**
     * Obtiene solo la lista de roles que están activos.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/activos")
    public ResponseEntity<List<RolResponseDTO>> obtenerActivos() {
        List<RolResponseDTO> roles = rolService.obtenerActivos();
        return ResponseEntity.ok(roles);
    }

    /**
     * Obtiene los detalles de un rol específico por su ID.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/{id}")
    public ResponseEntity<RolResponseDTO> obtenerPorId(@PathVariable Integer id) {
        RolResponseDTO rol = rolService.obtenerPorId(id);
        return ResponseEntity.ok(rol);
    }

    /**
     * Obtiene un rol buscando por su nombre exacto.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/nombre/{nombre}")
    public ResponseEntity<RolResponseDTO> obtenerPorNombre(@PathVariable String nombre) {
        RolResponseDTO rol = rolService.obtenerPorNombre(nombre);
        return ResponseEntity.ok(rol);
    }

    /**
     * Registra un nuevo rol en el sistema.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @PostMapping
    public ResponseEntity<RolResponseDTO> crear(@Valid @RequestBody RolRequestDTO rolRequestDTO) {
        RolResponseDTO nuevoRol = rolService.crear(rolRequestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoRol);
    }

    /**
     * Actualiza la información de un rol existente por su ID.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @PutMapping("/{id}")
    public ResponseEntity<RolResponseDTO> actualizar(
            @PathVariable Integer id,
            @Valid @RequestBody RolRequestDTO rolRequestDTO) {
        RolResponseDTO rolActualizado = rolService.actualizar(id, rolRequestDTO);
        return ResponseEntity.ok(rolActualizado);
    }

    /**
     * Cambia el estado de un rol a inactivo por su ID.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @PatchMapping("/{id}/desactivar")
    public ResponseEntity<Void> desactivar(@PathVariable Integer id) {
        rolService.desactivar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Cambia el estado de un rol a activo por su ID.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @PatchMapping("/{id}/activar")
    public ResponseEntity<Void> activar(@PathVariable Integer id) {
        rolService.activar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Elimina permanentemente un rol del sistema por su ID.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        rolService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Verifica la existencia de un rol mediante su nombre.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/existe/{nombre}")
    public ResponseEntity<Boolean> existePorNombre(@PathVariable String nombre) {
        boolean existe = rolService.existePorNombre(nombre);
        return ResponseEntity.ok(existe);
    }
}