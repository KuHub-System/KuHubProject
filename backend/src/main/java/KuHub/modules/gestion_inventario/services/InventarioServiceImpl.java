package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.InventoryWithProductResponseAnswerUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.MotionCreateDTO;
import KuHub.modules.gestion_inventario.entity.Inventario;
import KuHub.modules.gestion_inventario.exceptions.InventarioException;
import KuHub.modules.gestion_inventario.repository.InventarioRepository;
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

    @Autowired
    private MovimientoService movimientoService;

    @Transactional(readOnly = true)
    @Override
    public List<Inventario> findAll() {
        return inventarioRepository.findAll();
    }

    @Transactional(readOnly = true)
    @Override
    public List<Inventario> findInventoriesWithProductsActive(Boolean activo){
        return inventarioRepository.findInventoriesWithProductsActive(activo);
    }

    @Transactional(readOnly = true)
    @Override
    public Inventario findById(Integer id) {
        return inventarioRepository.findById(id).orElseThrow(
                () -> new InventarioException("No se encontro el producto con el id: " + id)
        );
    }

    @Transactional(readOnly = true)
    @Override
    public Inventario findByIdInventoryWithProductActive(Integer idInventario,Boolean activo){
        return inventarioRepository.findByIdInventoryWithProductActive(idInventario,activo).orElseThrow(
                () -> new InventarioException("No se encontro el producto con el id: " + idInventario)
        );
    }

    @Transactional(readOnly = true)
    @Override
    public boolean existInventory (Integer id){
        return inventarioRepository.existsById(id);
    }

    @Transactional(readOnly = true)
    @Override
    public List<InventoryWithProductResponseAnswerUpdateDTO> findAllActiveInventoryOrderedByName(){
        return inventarioRepository.findAllActiveInventoryOrderedByName();
    }


    @Transactional
    @Override
    public InventoryWithProductCreateDTO save (InventoryWithProductCreateDTO inventarioRequest){
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
    public InventoryWithProductResponseAnswerUpdateDTO updateInventoryWithProduct(InventoryWithProductResponseAnswerUpdateDTO req){

        // Validar existencia
        Inventario inventario = inventarioRepository.findByIdInventoryWithProductActive(
                req.getIdInventario(), true
        ).orElseThrow(() -> new InventarioException("El inventario no existe"));

        Producto producto = productoService.findByIdProductoAndActivoTrue(
                req.getIdProducto()
        );

        // Validación nombre
        String nuevoNombre = StringUtils.capitalizarPalabras(req.getNombreProducto());

        // Si el nombre CAMBIÓ → validar duplicado
        if (!producto.getNombreProducto().equals(nuevoNombre) &&
                productoRepository.existsByNombreProductoAndIdProductoIsNot(nuevoNombre, req.getIdProducto())) {

            throw new InventarioException("El producto con el nombre " + nuevoNombre + " ya existe");
        }

        // Validaciones inventario
        if (req.getStockLimitMin() != null && req.getStockLimitMin() < 0)
            throw new InventarioException("El stock mínimo no puede ser negativo");

        if (req.getStock() != null && req.getStock() < 0)
            throw new InventarioException("El stock no puede ser negativo");

        // ---- ACTUALIZAR PRODUCTO ----
        producto.setNombreProducto(nuevoNombre);
        producto.setDescripcionProducto(req.getDescripcionProducto());  // ← FALTABA
        producto.setNombreCategoria(req.getNombreCategoria());
        producto.setUnidadMedida(req.getUnidadMedida());
        productoRepository.save(producto);

        //-----CREAR MOVIMIENTO DE AJUSTE AL MOMENTO DEFAULT POR ADMIN QUE REALIZA EL UPDATE
        movimientoService.saveMotion(new MotionCreateDTO(
                1,
                inventario.getIdInventario(),
                req.getStock(),
                req.getStockLimitMin(),
                "AJUSTE",
                null
        ));

        return req;
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
