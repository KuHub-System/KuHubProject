package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.dto.ChangeProductsToAnotherCategoryDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.ChangeStatusActiveCategoriaDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.CreateCategoriaDTO;
import KuHub.modules.gestion_inventario.dtos.request.UpdateCategoriaDTO;
import KuHub.modules.gestion_inventario.dtos.response.proyeccion.CategoriaView;
import KuHub.modules.gestion_inventario.entity.Categoria;

import java.util.List;

public interface CategoriaService {

    Boolean existsByIdCategoria(Short idCategoria);
    Categoria findById (Short idcategoria);
    List<Categoria> findAll ();
    List<CategoriaView> findAllPage();
    List<Categoria> findAllEnable();// VALOR TRUE
    String changeProductsToAnotherCategory (ChangeProductsToAnotherCategoryDTO dto);
    boolean createCategoria (CreateCategoriaDTO c);
    boolean updateCategoria (UpdateCategoriaDTO oldCat);
    void changeStatusCategoria (ChangeStatusActiveCategoriaDTO dto);
    boolean deleteCategoria(Short idCategoria);
}
