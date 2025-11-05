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

    @Transactional
    @Override
    public List<Producto> findAll() {
        return productoRepository.findAll();
    }

    @Transactional
    @Override
    public List<Producto> findByActivo(Boolean activo){
        return productoRepository.findByActivo(activo);
    }

    @Transactional
    @Override
    public void sincronizarSecuenciaProducto() {
        Long nuevoValor = productoRepository.sincronizarSecuencia();
        System.out.println("Secuencia sincronizada. Nuevo valor: " + nuevoValor);
    }

    @Transactional
    @Override
    public Producto findById(Long id){
        return productoRepository.findById(id).orElseThrow(
                ()-> new ProductoNotFoundException(id)
        );
    }

    @Transactional
    @Override
    public Producto findByIdProductoAndActivo(Long id, Boolean activo){
        return productoRepository.findByIdProductoAndActivo(id,activo).orElseThrow(
                ()-> new ProductoNotFoundException(id)
        );
    }

    @Transactional(readOnly = true)
    @Override
    public Producto findByNombreProducto(String nombre){
        return productoRepository.findByNombreProducto(nombre).orElseThrow(
                ()-> new ProductoNotFoundException(nombre)
        );
    }

    @Transactional
    @Override
    public List<String> findDistinctCategoriaAndActivoTrue(){
        return productoRepository.findDistinctCategoriaByActivoTrue();
    }

    @Transactional
    @Override
    public List<String> findDistinctUnidadMedidaByActivoTrue(){
        return productoRepository.findDistinctUnidadMedidaByActivoTrue();
    }

    @Transactional
    @Override
    public Producto findByNombreProductoAndActivo(String nombreProducto, Boolean activo){
        return productoRepository.findByNombreProductoAndActivo(nombreProducto,activo).orElseThrow(
                ()-> new ProductoNotFoundException(nombreProducto)
        );
    }

    @Transactional
    @Override
    public Producto save (Producto producto) {
        sincronizarSecuenciaProducto();
        //capotalizar nombre producto para luego comparar en la base de datos
        String nombreProductoCap = StringUtils.capitalizarPalabras(producto.getNombreProducto());

        //validar que no exista producto con ese nombre
        if (productoRepository.findByNombreProducto(nombreProductoCap).isPresent()){
            throw new ProductoExistenteException(nombreProductoCap);
        }
        //validar que no exista producto activo en TRUE con ese codigo
        if(productoRepository.existsBycodProductoAndActivo(producto.getCodProducto(),true)){
            throw new ProductoException("El codigo del producto "+producto.getCodProducto()+" ya existe");
        }


        //guardar en el objeto el nombre categoria captalizado
        producto.setNombreCategoria(StringUtils.capitalizarPalabras(producto.getNombreCategoria()));
        //guardar en el objeto el nombre capitalizado
        producto.setNombreProducto(nombreProductoCap);
        //guardar en el objeto la unidades en mayusculas
        producto.setUnidadMedida(producto.getUnidadMedida().toUpperCase());

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

        if (!nombrePActual.equals(nombrePNuevo) &&
                productoRepository.existsByNombreProducto(nombrePNuevo)) {
            throw new ProductoExistenteException(nombrePNuevo);
        }

        P.setNombreProducto(nombrePNuevo);
        P.setUnidadMedida(productoRequest.getUnidadMedida());
        return productoRepository.save(P);
    }

    @Transactional
    @Override
    public Producto updateById(Long id, ProductoUpdateRequest productoRequest){

        Producto P = productoRepository.findById(id).orElseThrow(() ->
                new ProductoNotFoundException(id));

        String nombrePNuevo = StringUtils.capitalizarPalabras(productoRequest.getNombreProductoNuevo());

        if (!P.getNombreProducto().equals(nombrePNuevo) &&
                productoRepository.existsByNombreProducto(nombrePNuevo)) {
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
    public void deleteById(Long id)  {
        Producto producto = productoRepository.findById(id).orElseThrow(
                () -> new ProductoNotFoundException(id));

        //eliminar de maneira logica
        producto.setActivo(false);
        productoRepository.save(producto);
    }

}
