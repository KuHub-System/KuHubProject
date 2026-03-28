package KuHub.modules.dashboard.service;

import KuHub.modules.dashboard.dto.*;

public interface DashboardService {
    DashboardAdminDTO getDashboardAdmin();
    DashboardInventarioDTO getDashboardInventario();
    DashboardGestorDTO getDashboardGestor();
    DashboardRecetasDTO getDashboardRecetas();
}
