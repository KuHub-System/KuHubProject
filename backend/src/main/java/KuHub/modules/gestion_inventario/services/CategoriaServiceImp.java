package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.repository.CategoriaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoriaServiceImp implements CategoriaService{

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Override
    @Transactional(readOnly = true)
    public Boolean existsByIdCategoria(Short idCategoria){
        return categoriaRepository.existsByIdCategoria(idCategoria);
    }
}
