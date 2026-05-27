package KuHub.modules.gestion_inventario.repository;

import KuHub.modules.gestion_inventario.dtos.response.proyeccion.ProductRecipeView;
import KuHub.modules.gestion_inventario.dtos.response.proyeccion.ProductRecipeWithCategoryView;
import KuHub.modules.gestion_inventario.entity.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Integer> {
    /**
     * Obtiene la lista de productos activos con su unidad de medida
     * para ser seleccionados en el formulario de recetas.
     */
    @Query(value = """
        SELECT 
            p.nombre_producto AS "nombreProducto", 
            u.nombre_unidad AS "nombreUnidad", 
            u.abreviatura AS "abreviatura", 
            u.es_fraccionario AS "esFraccionario", 
            p.id_producto AS "idProducto", 
            u.id_unidad AS "idUnidad" 
        FROM producto p 
        JOIN unidad_medida u ON p.id_unidad = u.id_unidad 
        WHERE p.activo = true 
        ORDER BY p.nombre_producto ASC
        """, nativeQuery = true)
    List<ProductRecipeView> findAllActiveForRecipe();

    /**
     * Igual que findAllActiveForRecipe pero incluye idCategoria y nombreCategoria.
     * ✅ En uso: endpoint /find-all-product-active-for-option-with-category (solicitud.tsx).
     */
    @Query(value = """
        SELECT
            p.nombre_producto  AS "nombreProducto",
            u.nombre_unidad    AS "nombreUnidad",
            u.abreviatura      AS "abreviatura",
            u.es_fraccionario  AS "esFraccionario",
            p.id_producto      AS "idProducto",
            u.id_unidad        AS "idUnidad",
            c.id_categoria     AS "idCategoria",
            c.nombre_categoria AS "nombreCategoria"
        FROM producto p
        JOIN unidad_medida u ON p.id_unidad      = u.id_unidad
        JOIN categoria     c ON p.id_categoria   = c.id_categoria
        WHERE p.activo = true
        ORDER BY c.nombre_categoria ASC, p.nombre_producto ASC
        """, nativeQuery = true)
    List<ProductRecipeWithCategoryView> findAllActiveForRecipeWithCategory();

    /**
    @Query("SELECT DISTINCT p.unidadMedida FROM Producto p WHERE p.activo = true")
    List<String> findDistinctUnidadMedidaByActivoTrue();*/

    Optional<Producto> findByNombreProducto(String nombreProducto);
    Optional<Producto> findByIdProductoAndActivoTrue(Integer id_producto);
    Optional<Producto> findByNombreProductoAndActivo(String nombreProducto, Boolean activo);

    /**
     * Busca un producto activo por nombre ignorando mayúsculas/minúsculas.
     * ✅ En uso: sincronización de precios desde Excel (ProveedorServiceImpl.sincronizarPreciosExcel).
     */
    Optional<Producto> findByNombreProductoIgnoreCaseAndActivoTrue(String nombreProducto);


    List<Producto> findByActivo(Boolean activo);
    boolean existsByNombreProductoAndIdProductoIsNot(String nombreProducto, Integer idProducto);
    boolean existsByNombreProducto(String nombreProducto);
    boolean existsByNombreProductoAndActivoTrue(String nombreProducto);
    boolean existsBycodProductoAndActivo(String codProducto, Boolean activo);
    boolean existsByIdProducto(Integer idProducto);
    boolean existsByCategoria_IdCategoria(Short idCategoria);
    boolean existsByUnidadMedida_IdUnidad(Short idUnidad);

    @Modifying
    @Transactional
    @Query("""
           UPDATE Producto p
           SET p.categoria.idCategoria = :categoriaDestino
           WHERE p.categoria.idCategoria = :categoriaOrigen
           """)
    int actualizarCategoriaMasivo(
            @Param("categoriaOrigen") Short categoriaOrigen,
            @Param("categoriaDestino") Short categoriaDestino
    );

    @Modifying
    @Transactional
    @Query("""
       UPDATE Producto p
       SET p.unidadMedida.idUnidad = :unidadDestino
       WHERE p.unidadMedida.idUnidad = :unidadOrigen
       """)
    int actualizarUnidadMedidaMasivo(
            @Param("unidadOrigen") Short unidadOrigen,
            @Param("unidadDestino") Short unidadDestino
    );

    // Cambia "Id" por "IdProducto"
    List<Producto> findAllByIdProductoInAndActivoTrue(Collection<Integer> ids);;
    //List<Producto> findByCategoriaIdCategoria(Long idCategoria);
    //boolean existsByCategoriaIdCategoria(Long idCategoria);

    Optional<Producto> findByNombreProductoAndCategoria_IdCategoriaAndActivoTrue(String nombreProducto, Short idCategoria);
}
