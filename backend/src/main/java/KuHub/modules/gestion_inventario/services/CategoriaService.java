package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.CreateCategoriaDTO;
import KuHub.modules.gestion_inventario.entity.Categoria;

import java.util.List;

public interface CategoriaService {

    Boolean existsByIdCategoria(Short idCategoria);
    Categoria findById (Short idcategoria);
    List<Categoria> findAll ();
    boolean createCategoria (CreateCategoriaDTO c);
}
