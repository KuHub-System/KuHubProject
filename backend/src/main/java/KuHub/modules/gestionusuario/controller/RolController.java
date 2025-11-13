package KuHub.modules.gestionusuario.controller;

import KuHub.modules.gestionusuario.dtos.RolRequestDTO;
import KuHub.modules.gestionusuario.dtos.RolResponseDTO;
import KuHub.modules.gestionusuario.service.RolService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * Controller REST para gestión de Roles
 * Endpoints: /api/v1/roles
 */
@RestController
@RequestMapping("/api/v1/roles")
@CrossOrigin(origins = "http://localhost:5173")
public class RolController {

    @Autowired
    private RolService rolService;

    /**
     * GET /api/v1/roles
     * Obtiene todos los roles
     */
    @GetMapping
    public ResponseEntity<List<RolResponseDTO>> obtenerTodos() {
        List<RolResponseDTO> roles = rolService.obtenerTodos();
        return ResponseEntity.ok(roles);
    }

    /**
     * GET /api/v1/roles/activos
     * Obtiene solo los roles activos
     */
    @GetMapping("/activos")
    public ResponseEntity<List<RolResponseDTO>> obtenerActivos() {
        List<RolResponseDTO> roles = rolService.obtenerActivos();
        return ResponseEntity.ok(roles);
    }

    /**
     * GET /api/v1/roles/{id}
     * Obtiene un rol por su ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<RolResponseDTO> obtenerPorId(@PathVariable Integer id) {
        RolResponseDTO rol = rolService.obtenerPorId(id);
        return ResponseEntity.ok(rol);
    }

    /**
     * GET /api/v1/roles/nombre/{nombre}
     * Obtiene un rol por su nombre
     */
    @GetMapping("/nombre/{nombre}")
    public ResponseEntity<RolResponseDTO> obtenerPorNombre(@PathVariable String nombre) {
        RolResponseDTO rol = rolService.obtenerPorNombre(nombre);
        return ResponseEntity.ok(rol);
    }

    /**
     * POST /api/v1/roles
     * Crea un nuevo rol
     */
    @PostMapping
    public ResponseEntity<RolResponseDTO> crear(@Valid @RequestBody RolRequestDTO rolRequestDTO) {
        RolResponseDTO nuevoRol = rolService.crear(rolRequestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoRol);
    }

    /**
     * PUT /api/v1/roles/{id}
     * Actualiza un rol existente
     */
    @PutMapping("/{id}")
    public ResponseEntity<RolResponseDTO> actualizar(
            @PathVariable Integer id,
            @Valid @RequestBody RolRequestDTO rolRequestDTO) {
        RolResponseDTO rolActualizado = rolService.actualizar(id, rolRequestDTO);
        return ResponseEntity.ok(rolActualizado);
    }

    /**
     * PATCH /api/v1/roles/{id}/desactivar
     * Desactiva un rol
     */
    @PatchMapping("/{id}/desactivar")
    public ResponseEntity<Void> desactivar(@PathVariable Integer id) {
        rolService.desactivar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * PATCH /api/v1/roles/{id}/activar
     * Activa un rol
     */
    @PatchMapping("/{id}/activar")
    public ResponseEntity<Void> activar(@PathVariable Integer id) {
        rolService.activar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * DELETE /api/v1/roles/{id}
     * Elimina un rol permanentemente
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        rolService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/v1/roles/existe/{nombre}
     * Verifica si existe un rol con ese nombre
     */
    @GetMapping("/existe/{nombre}")
    public ResponseEntity<Boolean> existePorNombre(@PathVariable String nombre) {
        boolean existe = rolService.existePorNombre(nombre);
        return ResponseEntity.ok(existe);
    }
}