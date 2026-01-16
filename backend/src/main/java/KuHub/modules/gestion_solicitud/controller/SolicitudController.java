package KuHub.modules.gestion_solicitud.controller;

import KuHub.modules.gestion_solicitud.dtos.*;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.ManagementSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.SectionAvailabilityView;
import KuHub.modules.gestion_solicitud.service.SolicitudService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/solicitud")
@Validated
public class SolicitudController {

    @Autowired
    private SolicitudService solicitudService;

    @PostMapping("/management-solicitations-filter")
    public ResponseEntity<List<ManagementSolicitationView>> getManagementSolicitations(
            @RequestBody ManagementFilterRequestDTO filter
    ) {

        return ResponseEntity
                .status(200)
                .body(solicitudService.findManagementSolicitations(filter));
    }

    @GetMapping("/selectors-for-management-solicitation") // OJO: Escribe bien "management" esta vez
    public ResponseEntity<ManagementSolicitationSelectorsDTO> getSelectorsForManagement() {
        ManagementSolicitationSelectorsDTO selectors = solicitudService.getSelectorsForManagement();
        return ResponseEntity.ok(selectors);
    }

    @PostMapping("/check-section-availability")
    public ResponseEntity<List<SectionAvailabilityView>> checkSectionAvailability(
            @RequestBody CheckSectionAvailabilityRequestDTO r
            ){
        return ResponseEntity
                .status(200)
                .body(solicitudService.checkSectionAvailability(r));
    }

    @PostMapping("/save-solicitation")
    public ResponseEntity<Void> saveSolicitation(
            @RequestBody SolicitationCreateRequestDTO r
            ){
        solicitudService.saveSolicitation(r);
        return ResponseEntity
                .status(201)
                .build();
    }


}
