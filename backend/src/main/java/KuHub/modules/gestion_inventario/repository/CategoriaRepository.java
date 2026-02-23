package KuHub.modules.gestion_inventario.repository;

import KuHub.modules.gestion_inventario.dtos.response.CategoriaView;
import KuHub.modules.gestion_inventario.entity.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoriaRepository extends JpaRepository<Categoria, Short> {

    List<Categoria> findAllByActivo(Boolean activo);
    Boolean existsByIdCategoria(Short idCategoria);
    Boolean existsByNombreCategoria(String nombreCategoria);
    boolean existsByNombreCategoriaIgnoreCaseAndIdCategoriaNot(String nombreCategoria, Short idCategoria);
    @Query(value = """
        SELECT
            c.id_categoria      AS idCategoria,
            c.nombre_categoria  AS nombreCategoria,
            c.activo            AS activo,
            COUNT(p.id_producto) AS asociados
        FROM categoria c
        LEFT JOIN producto p
            ON p.id_categoria = c.id_categoria
        GROUP BY c.id_categoria
        """, nativeQuery = true)
    List<CategoriaView> findCategoriasCantProductoAsociados();
}
