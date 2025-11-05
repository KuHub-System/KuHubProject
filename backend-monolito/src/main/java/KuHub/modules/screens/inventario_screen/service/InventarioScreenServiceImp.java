package KuHub.modules.screens.inventario_screen.service;

import KuHub.modules.inventario.dtos.InventoryWithProductCreateRequestDTO;
import KuHub.modules.inventario.services.InventarioService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class InventarioScreenServiceImp implements InventarioScreenService {

    @Autowired
    private InventarioService inventarioService;

    @Transactional
    @Override
    public String btnCrearProductoConInventario(InventoryWithProductCreateRequestDTO inventarioRequest){

        //llamar el metodo crear producto con inventario
        inventarioService.save(inventarioRequest);
        return void.class.getSimpleName();
    }
}
