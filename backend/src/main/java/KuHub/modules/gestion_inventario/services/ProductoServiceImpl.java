package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.response.proyeccion.ProductRecipeView;
import KuHub.modules.gestion_inventario.entity.Producto;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.repository.ProductoRepository;
import KuHub.utils.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

@Service
public class ProductoServiceImpl implements ProductoService {

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private CategoriaService categoriaService;

    @Autowired
    private UnidadMedidaService unidadMedidaService;

    @Transactional(readOnly = true)
    @Override // ❌ Sin uso: Implementado por contrato del servicio y buenas prácticas; actualmente no es invocado por ningún controlador.
    public List<Producto> findAll() {
        return productoRepository.findAll();
    }

    @Transactional(readOnly = true)
    @Override // ❌ Sin uso: Implementado por contrato del servicio y buenas prácticas; actualmente no es invocado por ningún controlador.
    public List<Producto> findByActivo(Boolean activo){
        return productoRepository.findByActivo(activo);
    }

    @Transactional(readOnly = true)
    @Override // ❌ Sin uso: Implementado por contrato del servicio y buenas prácticas; actualmente no es invocado por ningún controlador.
    public Producto findById(Integer id){
        return productoRepository.findById(id).orElseThrow(
                ()-> new GestionInventarioException("No existe el producto con el id: " + id + "", HttpStatus.NOT_FOUND)
        );
    }

    /** Usado en option para crear receta*/
    @Transactional(readOnly = true)
    @Override// ✅ En uso: Método invocado por el controlador.
    public List<ProductRecipeView> findAllActiveForRecipe(){
        return productoRepository.findAllActiveForRecipe();
    }

    @Transactional(readOnly = true)
    @Override //✅ En uso: Método invocado por el controlador.
    public Producto findByIdProductoAndActivoTrue(Integer id_producto){
        return productoRepository.findByIdProductoAndActivoTrue(id_producto).orElseThrow(
                ()-> new GestionInventarioException("No existe el producto con el id: " + id_producto + "", HttpStatus.NOT_FOUND)
        );
    }

    @Transactional(readOnly = true)
    @Override//✅ En uso: Método invocado por el controlador.
    public List<Producto> findAllByIdInAndActivoTrue(Collection<Integer> ids){
        return productoRepository.findAllByIdProductoInAndActivoTrue(ids);
    }

    @Transactional(readOnly = true)
    @Override//✅ En uso: Método invocado por el controlador.
    public Producto findByNombreProducto(String nombre){
        return productoRepository.findByNombreProducto(nombre).orElseThrow(
                ()-> new GestionInventarioException("No existe el producto con el nombre: " + nombre + "", HttpStatus.NOT_FOUND)
        );
    }

    @Transactional(readOnly = true)
    @Override//✅ En uso: Método invocado por el controlador.
    public Producto findByNombreProductoAndActivo(String nombreProducto, Boolean activo){
        return productoRepository.findByNombreProductoAndActivo(nombreProducto,activo).orElseThrow(
                ()-> new GestionInventarioException("No existe el producto con el nombre: " + nombreProducto + "", HttpStatus.NOT_FOUND)
        );
    }

    @Transactional(readOnly = true)
    @Override//✅ En uso: Método invocado por el controlador.
    public Boolean existProductByName (String nombreProducto){
        return productoRepository.existsByNombreProducto(nombreProducto);
    }

    @Transactional(readOnly = true)
    @Override // ❌ Sin uso: Implementado por contrato del servicio y buenas prácticas; actualmente no es invocado por ningún controlador.
    public Boolean existProductoById (Integer id){
        return productoRepository.existsById(id);
    }

    @Transactional
    @Override // ❌ Sin uso: Implementado por contrato del servicio y buenas prácticas; actualmente no es invocado por ningún controlador.
    public Producto save (Producto producto) {
        //capitalizar nombre producto para luego comparar en la base de datos
        String nombreProductoCap = StringUtils.capitalizarPalabras(producto.getNombreProducto());

        //validar que no exista producto con ese nombre
        if (productoRepository.findByNombreProducto(nombreProductoCap).isPresent()){
            throw new GestionInventarioException("Ya existe un producto con este nombre"
                ,HttpStatus.NOT_FOUND);
        }
        //validar que no exista producto activo en TRUE con el mismo código
        if (producto.getCodProducto() != null) {
            if (productoRepository.existsBycodProductoAndActivo(producto.getCodProducto(), true)) {
                throw new GestionInventarioException("El código del producto " + producto.getCodProducto() + " ya existe"
                    ,HttpStatus.CONFLICT);
            }
        }
        if (producto.getCategoria() != null) {
            if (!categoriaService.existsByIdCategoria(producto.getCategoria().getIdCategoria())){
                throw new GestionInventarioException("La categoria no existe!! contacte el adminitrador"
                    ,HttpStatus.CONFLICT);
            }
        }
        if (producto.getUnidadMedida() != null) {
            if(!unidadMedidaService.existsByIdUnidadMedida(producto.getUnidadMedida().getIdUnidad())){
                throw new GestionInventarioException("La unidad de medida no existe!! contacte el adminitrador"
                    ,HttpStatus.CONFLICT);
            }
        }

        producto.setNombreProducto(nombreProductoCap);

        //activo con true
        producto.setActivo(true);

        return productoRepository.save(producto);
    }

    // Eliminacion logica de producto por nombre
    @Transactional
    @Override// ✅ En uso: Método invocado por el controlador.
    public void deleteByName(String nombreProducto) {

        String nombreProductoCapitalizado = StringUtils.capitalizarPalabras(nombreProducto);

        Producto producto = productoRepository.findByNombreProducto(nombreProductoCapitalizado).orElseThrow(
                ()-> new GestionInventarioException("No existe el producto con el nombre: " + nombreProductoCapitalizado + "", HttpStatus.CONFLICT)
        );

        //VEREFICAR COMO AFECATARA A OTROS PRODUCTOS
        //eliminar de manera logica
        producto.setActivo(false);
        productoRepository.save(producto);
    }

    @Transactional
    @Override// ❌ Sin uso: Implementado por contrato del servicio y buenas prácticas; actualmente no es invocado por ningún controlador.
    public void deleteById(Integer id)  {
        Producto producto = productoRepository.findById(id).orElseThrow(
                () -> new GestionInventarioException("El producto con el id " + id + " no encontrado"
                    ,HttpStatus.NOT_FOUND));

        //eliminar de maneira logica
        producto.setActivo(false);
        productoRepository.save(producto);
    }

}
