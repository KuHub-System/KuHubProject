package KuHub.modules.dashboard.controller;

import KuHub.modules.dashboard.dto.*;
import KuHub.modules.dashboard.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/admin")
    public ResponseEntity<DashboardAdminDTO> getAdmin(Authentication auth) {
        if (!hasAnyRole(auth, "ADMINISTRADOR", "CO_ADMINISTRADOR"))
            return ResponseEntity.status(403).build();
        return ResponseEntity.ok(dashboardService.getDashboardAdmin());
    }

    @GetMapping("/inventario")
    public ResponseEntity<DashboardInventarioDTO> getInventario(Authentication auth) {
        if (!hasAnyRole(auth, "ADMINISTRADOR", "CO_ADMINISTRADOR", "ENCARGADO_BODEGA", "ASISTENTE_BODEGA"))
            return ResponseEntity.status(403).build();
        return ResponseEntity.ok(dashboardService.getDashboardInventario());
    }

    @GetMapping("/gestor")
    public ResponseEntity<DashboardGestorDTO> getGestor(Authentication auth) {
        if (!hasAnyRole(auth, "ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS"))
            return ResponseEntity.status(403).build();
        return ResponseEntity.ok(dashboardService.getDashboardGestor());
    }

    @GetMapping("/recetas")
    public ResponseEntity<DashboardRecetasDTO> getRecetas(Authentication auth) {
        if (!hasAnyRole(auth, "ADMINISTRADOR", "CO_ADMINISTRADOR", "PROFESOR_A_CARGO", "DOCENTE"))
            return ResponseEntity.status(403).build();
        return ResponseEntity.ok(dashboardService.getDashboardRecetas());
    }

    private boolean hasAnyRole(Authentication auth, String... roles) {
        if (auth == null) return false;
        Set<String> userRoles = auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .collect(Collectors.toSet());
        return Arrays.stream(roles).anyMatch(userRoles::contains);
    }
}
