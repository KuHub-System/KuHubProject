package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.ChangeProductsToAnotherCategoryDTO;
import KuHub.modules.gestion_inventario.dtos.request.ChangeStatusActiveCategoriaDTO;
import KuHub.modules.gestion_inventario.dtos.request.CreateCategoriaDTO;
import KuHub.modules.gestion_inventario.dtos.request.UpdateCategoriaDTO;
import KuHub.modules.gestion_inventario.dtos.response.proyeccion.CategoriaView;
import KuHub.modules.gestion_inventario.entity.Categoria;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.repository.CategoriaRepository;
import KuHub.modules.gestion_inventario.repository.ProductoRepository;
import KuHub.utils.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoriaServiceImp implements CategoriaService{

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Override
    @Transactional(readOnly = true)
    public Boolean existsByIdCategoria(Short idCategoria){
        return categoriaRepository.existsByIdCategoria(idCategoria);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Categoria> findAll (){
        return categoriaRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoriaView> findAllPage(){
        return categoriaRepository.findCategoriasCantProductoAsociados();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Categoria> findAllEnable() {
        return categoriaRepository.findAllByActivo(true);
    }


    @Override
    @Transactional(readOnly = true)
    public Categoria findById (Short idcategoria){
        return categoriaRepository.findById(idcategoria).orElseThrow(
                ()-> new GestionInventarioException("No existe la categoria con el id: " + idcategoria
                    , HttpStatus.NOT_FOUND)
        );
    }

    @Override
    @Transactional
    public boolean createCategoria (CreateCategoriaDTO newCat){
        if (newCat.getNombreCategoria() == null || newCat.getNombreCategoria().isBlank()) {
            throw new GestionInventarioException("El nombre de la categoría es obligatorio"
                    ,HttpStatus.NOT_ACCEPTABLE);
        }

        String capNombre = StringUtils.capitalizarPalabras(newCat.getNombreCategoria());
        if(categoriaRepository.existsByNombreCategoria(capNombre)){
            throw new GestionInventarioException("Ya existe una categoria con el nombre: " + capNombre
                    ,HttpStatus.CONFLICT);
        }
        Categoria newCategoria = new Categoria();
        newCategoria.setNombreCategoria(capNombre);
        categoriaRepository.save(newCategoria);
        return true;
    }

    @Override
    @Transactional
    public boolean updateCategoria(UpdateCategoriaDTO updateCat) {

        String capNombre = StringUtils.capitalizarPalabras(updateCat.getNombreCategoria());
        if (categoriaRepository.existsByNombreCategoriaIgnoreCaseAndIdCategoriaNot(
                capNombre, updateCat.getIdCategoria())) {

            throw new GestionInventarioException("Ya existe una categoria con el nombre: " + capNombre
                    ,HttpStatus.CONFLICT);
        }
        Categoria oldCat = findById(updateCat.getIdCategoria());

        if (!oldCat.getNombreCategoria().equals(capNombre)) {
            oldCat.setNombreCategoria(capNombre);
            categoriaRepository.save(oldCat);
            return true;
        }

        return false;
    }

    @Override
    @Transactional
    public void changeStatusCategoria (ChangeStatusActiveCategoriaDTO dto){
        Categoria categoria = findById(dto.getIdCategoria());
        categoria.setActivo(dto.getEnable());
        categoriaRepository.save(categoria);
    }

    /**Metodo para transferir productos de una categoria a otra*/
    @Override
    @Transactional
    public String changeProductsToAnotherCategory (ChangeProductsToAnotherCategoryDTO dto){
        Categoria oldCat = findById(dto.getOldIdCategoria());
        Categoria newCat = findById(dto.getNewIdCategoria());

        // 1️⃣ Validaciones básicas
        if (oldCat.getIdCategoria().equals(newCat.getIdCategoria())) {
            return "La categoría de origen y destino son iguales. No se realizaron cambios.";
        }

        // 2️⃣ Ejecutar actualización masiva
        int updatedRows = productoRepository.actualizarCategoriaMasivo(oldCat.getIdCategoria(), newCat.getIdCategoria());

        // 3️⃣ Respuesta
        if (updatedRows == 0) {
            return "No se encontraron productos en la categoría " + oldCat.getIdCategoria() + " para mover.";
        }

        return "Se movieron " + updatedRows + " productos desde la categoría "
                + oldCat.getNombreCategoria() + " a la categoría " + newCat.getNombreCategoria() + ".";

    }

    /**Metodo para eliminar una categoria si no tiene productos asociados*/
    @Override
    @Transactional
    public boolean deleteCategoria(Short idCategoria){
        Categoria categoria = findById(idCategoria);
        if (productoRepository.existsByCategoria_IdCategoria(idCategoria)){
            throw new GestionInventarioException("No se puede eliminar la categoria porque tiene productos asociados"
                ,HttpStatus.NOT_ACCEPTABLE);
        }else {
            categoriaRepository.deleteById(idCategoria);
            return true;
        }
    }

}
