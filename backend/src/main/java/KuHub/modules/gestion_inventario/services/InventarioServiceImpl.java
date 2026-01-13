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
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Slf4j
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
        // 1. Validaciones de negocio
        if (inventarioRequest.getStock() < 0 ){
            throw new InventarioException("El inventario no puede ser negativo");
        }
        if (inventarioRequest.getStockLimitMin() < 0){
            throw new InventarioException("El stock mínimo no puede ser negativo");
        }
        if (productoService.existProductByName(StringUtils.capitalizarPalabras(inventarioRequest.getNombreProducto()))){
            throw new InventarioException("El producto ya existe");
        }

        // 2. Crear y guardar el Producto
        Producto newProducto = productoService.save(
                new Producto(null, null, inventarioRequest.getDescripcionProducto(),
                        StringUtils.capitalizarPalabras(inventarioRequest.getNombreProducto()),
                        StringUtils.capitalizarPalabras(inventarioRequest.getNombreCategoria()),
                        inventarioRequest.getUnidadMedida().toUpperCase(), true));

        // 3. Crear y guardar el Inventario
        Inventario newInventario = inventarioRepository.save(
                new Inventario(null, newProducto.getIdProducto(), newProducto,
                        inventarioRequest.getStock(),
                        inventarioRequest.getStockLimitMin()));

        // 4. CREAR MOVIMIENTO DE ENTRADA INICIAL
        // Solo creamos el movimiento si el stock inicial es mayor a 0 (o siempre, según prefieras)
        movimientoService.saveMotion(new MotionCreateDTO(
                newInventario.getIdInventario(),
                inventarioRequest.getStock(),
                inventarioRequest.getStockLimitMin(),
                "ENTRADA",
                "Carga inicial de inventario por creación de producto"
        ));

        // 5. Preparar respuesta
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

        // Validar si realmente hubo cambios antes de proceder
        // 1. Verificar si hay cambios en los DATOS del producto
        boolean huboCambiosEnProducto = !producto.getNombreProducto().equals(nuevoNombre) ||
                !java.util.Objects.equals(producto.getDescripcionProducto(), req.getDescripcionProducto()) ||
                !producto.getNombreCategoria().equals(req.getNombreCategoria()) ||
                !producto.getUnidadMedida().equals(req.getUnidadMedida()) ||
                !java.util.Objects.equals(inventario.getStockLimitMin(), req.getStockLimitMin()) ||
                !java.util.Objects.equals(inventario.getStock(), req.getStock());

        // 2. Si hay cambios en texto/minimo, actualizamos las entidades
        if (huboCambiosEnProducto) {
            producto.setNombreProducto(nuevoNombre);
            producto.setDescripcionProducto(req.getDescripcionProducto());
            producto.setNombreCategoria(req.getNombreCategoria());
            producto.setUnidadMedida(req.getUnidadMedida());
            productoRepository.save(producto);

            if (req.getStockLimitMin() != null) {
                inventario.setStockLimitMin(req.getStockLimitMin());
                inventarioRepository.save(inventario);
            }
        }

        // 3. FUERA del IF: Siempre creamos el movimiento de AJUSTE
        // Esto garantiza que aunque el stock sea el mismo, quede el registro en la tabla movimientos
        movimientoService.saveMotion(new MotionCreateDTO(
                inventario.getIdInventario(),
                req.getStock(),        // Valor enviado desde el front
                req.getStockLimitMin(),
                "AJUSTE",
                "Verificación/Ajuste manual de inventario"
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
            throw new InventarioException("Existe producto disponible en el inventario ");
        }

        //eliminar producto lógicamente para deshabilitar la visualización de este producto en el inventario
        productoService.deleteById(inventario.getIdProducto());

    }



}
