package KuHub.modules.gestion_inventario.repository;

import KuHub.modules.gestion_inventario.entity.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoriaRepository extends JpaRepository<Categoria, Short> {

    Boolean existsByIdCategoria(Short idCategoria);
    Boolean existsByNombreCategoria(String nombreCategoria);
    Boolean existsByNombreCategoriaIsNot (String nombreCategoria);
}
