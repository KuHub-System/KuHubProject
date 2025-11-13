package KuHub.modules.inventario.services;

import KuHub.modules.inventario.dtos.InventoryWithProductCreateDTO;
import KuHub.modules.inventario.dtos.InventoryWithProductResponseAnswerUpdateDTO;
import KuHub.modules.inventario.entity.Inventario;
import KuHub.modules.inventario.exceptions.InventarioException;
import KuHub.modules.inventario.repository.InventarioRepository;
import KuHub.modules.producto.entity.Producto;
import KuHub.modules.producto.repository.ProductoRepository;
import KuHub.modules.producto.service.ProductoService;
import KuHub.utils.StringUtils;
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

    @Autowired
    private ProductoRepository productoRepository;

    @Transactional
    public void syncSeq() {
        Integer nuevoValor = inventarioRepository.syncSeq();
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
    public Inventario findById(Integer id) {
        return inventarioRepository.findById(id).orElseThrow(
                () -> new InventarioException("No se encontro el producto con el id: " + id)
        );
    }

    @Transactional
    @Override
    public Inventario findByIdInventoryWithProductActive(Integer idInventario,Boolean activo){
        return inventarioRepository.findByIdInventoryWithProductActive(idInventario,activo).orElseThrow(
                () -> new InventarioException("No se encontro el producto con el id: " + idInventario)
        );
    }

    @Transactional
    @Override
    public List<InventoryWithProductResponseAnswerUpdateDTO> findAllActiveInventoryOrderedByName(){
        return inventarioRepository.findAllActiveInventoryOrderedByName();
    }


    @Transactional
    @Override
    public InventoryWithProductCreateDTO save (InventoryWithProductCreateDTO inventarioRequest){
        syncSeq();
        //validar que el stock no es negativo
        if (inventarioRequest.getStock() < 0 ){
            throw new InventarioException("El inventario no puede ser negativo");
        }
        //validar que el stock minimo no es negativo
        if (inventarioRequest.getStockLimitMin() < 0){
            throw new InventarioException("El stock mínimo no puede ser negativo");
        }

        if (productoService.existProductByName(inventarioRequest.getNombreProducto())){
            throw new InventarioException("El producto ya existe");
        }

        // Crear producto con los atributos obtenidos en el frontend y guardarlo
        Producto newProducto = productoService.save(
                new Producto(null,null,inventarioRequest.getDescripcionProducto(),inventarioRequest.getNombreProducto(),
                        inventarioRequest.getNombreCategoria(), inventarioRequest.getUnidadMedida(), true, null));

        //Crear inventario de producto con los atributos obtenidos en el frontend y guardarlo
        Inventario newInventario = inventarioRepository.save(
                new Inventario(null,newProducto.getIdProducto(),newProducto,inventarioRequest.getStock(),
                        inventarioRequest.getStockLimitMin() ));
        //retornamos el inventario con los ids para comprobar guardado
        inventarioRequest.setIdInventario(newInventario.getIdInventario());
        inventarioRequest.setIdProducto(newProducto.getIdProducto());
        return inventarioRequest;
    }

    @Transactional
    @Override
    public InventoryWithProductCreateDTO updateInventoryWithProduct(InventoryWithProductCreateDTO inventarioRequest){
        //validar que producto e inventario existen
        Inventario inventario = inventarioRepository.findByIdInventoryWithProductActive(
                Math.toIntExact(Long.valueOf(inventarioRequest.getIdInventario())),true).orElseThrow(
                ()->new InventarioException("El inventario no existe")
        );
        Producto producto = productoService.findByIdProductoAndActivoTrue(Math.toIntExact(Long.valueOf(inventarioRequest.getIdProducto())));

        //---VALIDACIONES DE PRODUCTO--
        //validar que no existe un producto con el mismo nombre antes de actualizar
        String actualizarNombreProducto = StringUtils.capitalizarPalabras(inventarioRequest.getNombreProducto());
        if(producto.getNombreProducto().equals(actualizarNombreProducto)){
            throw new InventarioException("El producto con el nombre " + producto.getNombreProducto() + " ya existe");
        }
        //Todavía no existe atributo para el cód de producto en el frontend para validar

        //---VALIDACIONES DE INVENTARIO--
        if (inventarioRequest.getStockLimitMin() != null && inventarioRequest.getStockLimitMin() < 0) {
            throw new InventarioException("El stock mínimo no puede ser negativo");
        }

        if (inventarioRequest.getStock() != null && inventarioRequest.getStock() < 0) {
            throw new InventarioException("El stock no puede ser negativo");
        }

        //Después de validado se actualiza
        producto.setNombreProducto(actualizarNombreProducto);
        productoRepository.save(producto);

        //PENDIENTE -- IMPLEMENTAR AJUSTE O MOVIMIENTO --
        inventario.setStock(inventarioRequest.getStock());
        inventario.setStockLimitMin(inventarioRequest.getStockLimitMin());
        inventarioRepository.save(inventario);

        return inventarioRequest;
    }



    //ELIMINAR INVENTARIO ES DESHABILITAR EL PRODUCTO DE ACTIVO TRUE A FALSE, PORQUE SOLAMENTE SE MUESTRA EL INVENTARIO DE PRODUCTOS EN TRUE
    @Transactional
    @Override
    public void updateActiveValueProductFalse(Integer id) {
        Inventario inventario = inventarioRepository.findById(id).orElseThrow(
                ()-> new InventarioException("No se encontró el producto con el id: " + id)
        );

        if (inventario.getStock() != 0 ){
            new InventarioException("Existe producto disponible en el inventario ");
        }

        //eliminar producto lógicamente para deshabilitar la visualización de este producto en el inventario
        productoService.deleteById(inventario.getIdProducto());

    }



}
