package Producto.msvc_producto.services;

import Producto.msvc_producto.exceptions.CategoriaNotFoundException;
import Producto.msvc_producto.models.entity.Categoria;
import Producto.msvc_producto.repositories.CategoriaRepository;
import Producto.msvc_producto.repositories.ProductoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoriaServiceImpl implements CategoriaService {

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private ProductoRepository productoRepository;


    @Override
    public Categoria findById(Long idCategoria) {
        return this.categoriaRepository.findById(idCategoria).orElseThrow(
                () -> new CategoriaNotFoundException(idCategoria)
        );
    }

    @Override
    public List<Categoria> findAll() {
        return this.categoriaRepository.findAll();
    }

    @Override
    public Categoria save(Categoria categoria) {
        return this.categoriaRepository.save(categoria);
    }

    @Override
    public void delete(Long idCategoria) {
        if(this.categoriaRepository.existsById(idCategoria)) {
            throw new CategoriaNotFoundException(idCategoria);
        }

        if(this.productoRepository.existsByCategoriaIdCategoria(idCategoria)){
            throw new IllegalStateException("No se puede eliminar la categoria ya que contiene productos aún");
        }
        else{
            this.categoriaRepository.deleteById(idCategoria);
        }
    }



    @Override
    public Categoria updateNombreCategoria(Categoria categoria) {
        if(this.categoriaRepository.findById(categoria.getIdCategoria()).isPresent()){
            return this.categoriaRepository.save(categoria);
        }
        else{
            throw new CategoriaNotFoundException(categoria.getIdCategoria());
        }
    }
}
