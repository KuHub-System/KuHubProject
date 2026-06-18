package KuHub.modules.gestion_soporte.controller;

import KuHub.modules.gestion_soporte.dtos.request.SoporteCreateDTO;
import KuHub.modules.gestion_soporte.dtos.response.SoporteCreateResponseDTO;
import KuHub.modules.gestion_soporte.service.SoporteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/soporte")
@RequiredArgsConstructor
public class SoporteController {

    private final SoporteService soporteService;

    /**
     * POST /api/v1/soporte
     * Registra un nuevo ticket de soporte / reporte de error enviado por el usuario.
     * ✅ En uso: Consumido por enviarTicketSoporte en soporte-service.ts (modal de soporte del header).
     */
    @PostMapping
    public ResponseEntity<SoporteCreateResponseDTO> crearTicket(
            @Validated @RequestBody SoporteCreateDTO request) {
        return ResponseEntity
                .status(201)
                .body(soporteService.crearTicket(request));
    }
}
