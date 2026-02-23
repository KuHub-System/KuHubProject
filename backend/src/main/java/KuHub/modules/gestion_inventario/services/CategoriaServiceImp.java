package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.CreateCategoriaDTO;
import KuHub.modules.gestion_inventario.dtos.request.UpdateCategoriaDTO;
import KuHub.modules.gestion_inventario.entity.Categoria;
import KuHub.modules.gestion_inventario.exceptions.InventarioException;
import KuHub.modules.gestion_inventario.repository.CategoriaRepository;
import KuHub.utils.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.bouncycastle.asn1.x500.style.RFC4519Style.c;

@Service
public class CategoriaServiceImp implements CategoriaService{

    @Autowired
    private CategoriaRepository categoriaRepository;

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
    public Categoria findById (Short idcategoria){
        return categoriaRepository.findById(idcategoria).orElseThrow(
                ()-> new InventarioException("No existe la categoria con el id: " + idcategoria)
        );
    }

    @Override
    @Transactional
    public boolean createCategoria (CreateCategoriaDTO newCat){
        String capNombre = StringUtils.capitalizarPalabras(newCat.getNombreCategoria());
        if(categoriaRepository.existsByNombreCategoria(capNombre)){
            throw new InventarioException("Ya existe una categoria con el nombre: " + capNombre);
        }
        Categoria newCategoria = new Categoria();
        newCategoria.setNombreCategoria(capNombre);
        categoriaRepository.save(newCategoria);
        return true;
    }

    @Override
    @Transactional
    public boolean updateCategoria (UpdateCategoriaDTO oldCat){
        String capNombre = StringUtils.capitalizarPalabras(oldCat.getNombreCategoria());
        if(categoriaRepository.existsByNombreCategoriaIsNot(capNombre)){
            throw new InventarioException("Ya existe una categoria con el nombre: " + capNombre);
        }

    }
}
