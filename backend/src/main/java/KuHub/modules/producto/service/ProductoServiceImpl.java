package KuHub.modules.producto.service;

import KuHub.modules.producto.dtos.ProductoUpdateRequest;
import KuHub.modules.producto.entity.Producto;
import KuHub.modules.producto.exceptions.ProductoException;
import KuHub.modules.producto.exceptions.ProductoExistenteException;
import KuHub.modules.producto.exceptions.ProductoNotFoundException;
import KuHub.modules.producto.repository.ProductoRepository;
import KuHub.utils.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProductoServiceImpl implements ProductoService{


    @Autowired
    private ProductoRepository productoRepository;


    @Transactional(readOnly = true)
    @Override
    public List<Producto> findAll() {
        return productoRepository.findAll();
    }

    @Transactional(readOnly = true)
    @Override
    public List<Producto> findByActivo(Boolean activo){
        return productoRepository.findByActivo(activo);
    }

    @Transactional(readOnly = true)
    @Override
    public Producto findById(Integer id){
        return productoRepository.findById(id).orElseThrow(
                ()-> new ProductoNotFoundException(id)
        );
    }

    @Transactional(readOnly = true)
    @Override
    public Producto findByIdProductoAndActivoTrue(Integer id_producto){
        return productoRepository.findByIdProductoAndActivoTrue(id_producto).orElseThrow(
                ()-> new ProductoNotFoundException(id_producto)
        );
    }

    @Transactional(readOnly = true)
    @Override
    public Producto findByNombreProducto(String nombre){
        return productoRepository.findByNombreProducto(nombre).orElseThrow(
                ()-> new ProductoNotFoundException(nombre)
        );
    }

    @Transactional(readOnly = true)
    @Override
    public List<String> findDistinctCategoriaAndActivoTrue(){
        return productoRepository.findDistinctCategoriaByActivoTrue();
    }

    @Transactional(readOnly = true)
    @Override
    public List<String> findDistinctUnidadMedidaByActivoTrue(){
        return productoRepository.findDistinctUnidadMedidaByActivoTrue();
    }

    @Transactional(readOnly = true)
    @Override
    public Producto findByNombreProductoAndActivo(String nombreProducto, Boolean activo){
        return productoRepository.findByNombreProductoAndActivo(nombreProducto,activo).orElseThrow(
                ()-> new ProductoNotFoundException(nombreProducto)
        );
    }

    @Transactional(readOnly = true)
    @Override
    public Boolean existProductByName (String nombreProducto){
        return productoRepository.existsByNombreProducto(nombreProducto);
    }


    @Transactional
    @Override
    public Producto save (Producto producto) {
        //capitalizar nombre producto para luego comparar en la base de datos
        String nombreProductoCap = StringUtils.capitalizarPalabras(producto.getNombreProducto());

        //validar que no exista producto con ese nombre
        if (productoRepository.findByNombreProducto(nombreProductoCap).isPresent()){
            throw new ProductoExistenteException(nombreProductoCap);
        }
        //validar que no exista producto activo en TRUE con el mismo código
        if (producto.getCodProducto() != null) {
            if (productoRepository.existsBycodProductoAndActivo(producto.getCodProducto(), true)) {
                throw new ProductoException("El código del producto " + producto.getCodProducto() + " ya existe");
            }
        }

        //guardar en el objeto el nombre categoría capitalizado
        producto.setNombreCategoria(StringUtils.capitalizarPalabras(producto.getNombreCategoria()));
        //guardar en el objeto el nombre capitalizado
        producto.setNombreProducto(nombreProductoCap);
        //guardar en el objeto las unidades en mayúsculas
        producto.setUnidadMedida(producto.getUnidadMedida().toUpperCase());
        //activo con true
        producto.setActivo(true);

        return productoRepository.save(producto);
    }

    @Transactional
    @Override
    public Producto updateByName(String nombreProductoActual , ProductoUpdateRequest productoRequest) {

        String nombrePActual = StringUtils.capitalizarPalabras(nombreProductoActual);
        String nombrePNuevo = StringUtils.capitalizarPalabras(productoRequest.getNombreProductoNuevo());

        Producto P = productoRepository.findByNombreProducto(nombrePActual).orElseThrow(
                ()-> new ProductoNotFoundException(nombrePActual)
        );

        if (!P.getNombreProducto().equals(nombrePNuevo) &&
                productoRepository.existsByNombreProductoAndIdProductoIsNot(nombrePNuevo, P.getIdProducto())) {
            throw new ProductoExistenteException(nombrePNuevo);
        }

        P.setNombreProducto(nombrePNuevo);
        P.setUnidadMedida(productoRequest.getUnidadMedida());
        return productoRepository.save(P);
    }

    @Transactional
    @Override
    public Producto updateById(Integer id, ProductoUpdateRequest productoRequest){

        Producto P = productoRepository.findById(id).orElseThrow(() ->
                new ProductoNotFoundException(id));

        String nombrePNuevo = StringUtils.capitalizarPalabras(productoRequest.getNombreProductoNuevo());

        if (!P.getNombreProducto().equals(nombrePNuevo) &&
                productoRepository.existsByNombreProductoAndIdProductoIsNot(nombrePNuevo, P.getIdProducto())) {
            throw new ProductoExistenteException(nombrePNuevo);
        }

        P.setNombreProducto(nombrePNuevo);
        P.setUnidadMedida(productoRequest.getUnidadMedida());
        return productoRepository.save(P);
    }

    // Eliminacion logica de producto por nombre
    @Transactional
    @Override
    public void deleteByName(String nombreProducto) {

        String nombreProductoCapitalizado = StringUtils.capitalizarPalabras(nombreProducto);

        Producto producto = productoRepository.findByNombreProducto(nombreProductoCapitalizado).orElseThrow(
                ()-> new ProductoNotFoundException(nombreProductoCapitalizado)
        );

        //VEREFICAR COMO AFECATARA A OTROS PRODUCTOS

        //eliminar de manera logica
        producto.setActivo(false);
        productoRepository.save(producto);
    }

    @Transactional
    @Override
    public void deleteById(Integer id)  {
        Producto producto = productoRepository.findById(id).orElseThrow(
                () -> new ProductoNotFoundException(id));

        //eliminar de maneira logica
        producto.setActivo(false);
        productoRepository.save(producto);
    }

}
