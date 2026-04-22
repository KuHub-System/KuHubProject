package KuHub.modules.gestion_sistema.controller;

import KuHub.modules.gestion_sistema.dtos.GestionSistemaDTO;
import KuHub.modules.gestion_sistema.service.GestionSistemaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/gestion-sistema")
@RequiredArgsConstructor
public class GestionSistemaController {
    private final GestionSistemaService gestionSistemaService;

    /**
     * GET /api/gestion-sistema/configuracion
     * Obtiene la configuración activa del sistema.
     */
    @GetMapping("/configuracion")
    public ResponseEntity<GestionSistemaDTO> getConfiguracion() {
        return ResponseEntity.ok(gestionSistemaService.getConfiguracionActiva());
    }

    /**
     * PATCH /api/gestion-sistema/configuracion
     * Actualiza parcialmente la configuración activa del sistema.
     */
    @PatchMapping("/configuracion")
    public ResponseEntity<GestionSistemaDTO> updateConfiguracion(
            @RequestBody GestionSistemaDTO dto) {
        return ResponseEntity.ok(gestionSistemaService.updateConfiguracionActiva(dto));
    }

    /**
     * POST /api/gestion-sistema/restaurar
     * Restaura la configuración activa a los valores predeterminados.
     */
    @PostMapping("/restaurar")
    public ResponseEntity<GestionSistemaDTO> restaurarConfiguracion() {
        return ResponseEntity.ok(gestionSistemaService.restaurarConfiguracion());
    }
}
