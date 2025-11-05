package KuHub.modules.screens.inventario_screen.service;

import KuHub.modules.inventario.dtos.InventoryWithProductCreateRequestDTO;

public interface InventarioScreenService {

    String btnCrearProductoConInventario(InventoryWithProductCreateRequestDTO inventarioRequest);
}
