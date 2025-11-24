package KuHub.modules.gestionusuario.controller;

import KuHub.modules.gestionusuario.dtos.LoginRequestDTO;
import KuHub.modules.gestionusuario.dtos.LoginResponseDTO;
import KuHub.modules.gestionusuario.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller REST para autenticación
 * Endpoints: /api/v1/auth
 */
@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    @Autowired
    private UsuarioService usuarioService;

    /**
     * POST /api/v1/auth/login
     * Realiza el login de un usuario
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO loginRequestDTO) {
        LoginResponseDTO response = usuarioService.login(loginRequestDTO);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/auth/logout
     * Cierra la sesión (placeholder - el logout es manejado en el frontend)
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        // En una implementación real con JWT, aquí se invalidaría el token
        return ResponseEntity.noContent().build();
    }
}