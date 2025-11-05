package KuHub.modules.inventario.services;

import KuHub.modules.inventario.dtos.InventoryWithProductCreateRequestDTO;
import KuHub.modules.inventario.entity.Inventario;
import KuHub.modules.inventario.exceptions.InventarioException;
import KuHub.modules.inventario.repository.InventarioRepository;
import KuHub.modules.producto.entity.Producto;
import KuHub.modules.producto.service.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InventarioServiceImpl implements InventarioService {

    @Autowired
    private InventarioRepository inventarioRepository;

    @Autowired
    private ProductoService productoService;

    @Transactional
    public void sincronizarSecuenciaInventario() {
        Long nuevoValor = inventarioRepository.sincronizarSecuencia();
        System.out.println("Secuencia de inventario sincronizada. Nuevo valor: " + nuevoValor);
    }

    @Transactional
    @Override
    public List<Inventario> findAll() {
        return inventarioRepository.findAll();
    }

    @Transactional
    @Override
    public List<Inventario> findInventoriesWithProductsActive(Boolean activo){
        return inventarioRepository.findInventoriesWithProductsActive(activo);
    }

    @Transactional
    @Override
    public Inventario findById(Long id) {
        return inventarioRepository.findById(id).orElseThrow(
                () -> new InventarioException("No se encontro el producto con el id: " + id)
        );
    }

    @Transactional
    @Override
    public Inventario findByIdInventoryWithProductActive(Long idInventario,Boolean activo){
        return inventarioRepository.findByIdInventoryWithProductActive(idInventario,activo).orElseThrow(
                () -> new InventarioException("No se encontro el producto con el id: " + idInventario)
        );
    }

    @Transactional
    @Override
    public Inventario  save (InventoryWithProductCreateRequestDTO inventarioRequest){
        sincronizarSecuenciaInventario();
        //validar que el stock no es negativo
        if (inventarioRequest.getStock() < 0 ){
            throw new InventarioException("El inventario no puede ser negativo");
        }
        //validar que el stock minimo no es negativo
        if (inventarioRequest.getStockMinimo() < 0){
            throw new InventarioException("El estoque minimo no puede ser negativo");
        }

        //crear objeto producto
        Producto producto = new Producto(null,null,
                inventarioRequest.getNombreProducto(),inventarioRequest.getCategoria(), inventarioRequest.getUnidadMedida(),
                null,null);
        //la validacion esta en el metodo en service

        //como el metodo retorna el producto, puedo obtener el id para crear el inventario
        Producto newProducto = productoService.save(producto);

        //crear objeto de inventario vazio
        Inventario inventario = new Inventario();
        inventario.setIdProducto(newProducto.getIdProducto());
        inventario.setProducto(newProducto);
        inventario.setStock(inventarioRequest.getStock());
        inventario.setStockLimitMin(inventarioRequest.getStockMinimo());

        return inventarioRepository.save(inventario);
    }

    //HAY QUE CREAR INVENTARIO CON PRODUCTO EXISTENTE PERO ACTUALMENTE NO TIENE ESTA FUNCIONALIDAD DE EL FRONT

    

    //DELETAR INVENTARIO ES DESABILITAR EL PRODUCTO DE ACTIVO TRUE A FALSE, PORQUE SOLAMENTE SE MOSTRAR EL INVENTARIO DE PRODUCTOS EN TRUE
    @Transactional
    @Override
    public void deleteById(Long id) {
        Inventario inventario = inventarioRepository.findById(id).orElseThrow(
                ()-> new InventarioException("No se encontro el producto con el id: " + id)
        );

        if (inventario.getStock() != 0 ){
            new InventarioException("Existe producto disponible en el inventario ");
        }

        //deletar producto logicamente para desabilitar la visualizacion de este producto en el inventario
        productoService.deleteById(inventario.getIdProducto());

    }

}
