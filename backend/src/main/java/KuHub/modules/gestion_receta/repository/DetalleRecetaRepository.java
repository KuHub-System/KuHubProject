package KuHub.modules.gestion_receta.repository;

import KuHub.modules.gestion_receta.entity.DetalleReceta;
import KuHub.modules.gestion_receta.entity.Receta;
import KuHub.modules.gestion_receta.projection.DetalleRecetaIdProductoProjection;
import feign.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DetalleRecetaRepository extends JpaRepository<DetalleReceta, Integer> {
    /**
     * Sincroniza manualmente la secuencia de la tabla `detalle_receta`.
     *
     * Esta consulta actualiza el valor de la secuencia
     * `detalle_receta_id_detalle_receta_seq` para que coincida con el valor máximo
     * actualmente registrado en la columna `id_detalle_receta`.
     *
     * ¿Por qué es necesario?
     * - Cuando se insertan registros manualmente, mediante scripts SQL, migraciones,
     *   cargas masivas (COPY) o restauraciones parciales, la secuencia puede quedar
     *   desfasada respecto a los IDs reales de la tabla.
     * - Si la secuencia queda con un número menor al máximo existente, los próximos
     *   INSERTs generarán un ID repetido, causando un error de clave primaria duplicada.
     *
     * ¿Qué hace exactamente?
     * - Obtiene MAX(id_detalle_receta) desde la tabla `detalle_receta`.
     * - Establece el valor interno de la secuencia para que el próximo `nextval()`
     *   continúe desde ese número.
     *
     * Esto garantiza que los nuevos registros usen IDs válidos, consecutivos y no
     * colisionen con los datos ya existentes.
     */

    @Query(
            value = "SELECT setval('detalle_receta_id_detalle_receta_seq', (SELECT COALESCE(MAX(id_detalle_receta), 1) FROM detalle_receta))",
            nativeQuery = true
    )
    Integer syncSeqDetalleReceta();
    List<DetalleReceta> findAllByReceta(Receta receta);

    /**
     * Obtiene los productos y sus cantidades asociados a una receta específica.
     *
     * ¿Qué hace exactamente?
     * - Selecciona únicamente dos campos del detalle de la receta:
     *      • idProducto  → identificador del producto asociado.
     *      • cantProducto → cantidad del producto dentro de la receta.
     * - La consulta filtra por el `idReceta` indicado.
     * - Solo devuelve productos activos (`producto.activo = true`), evitando así
     *   incluir ingredientes deshabilitados o eliminados lógicamente.
     *
     * ¿Para qué sirve?
     * - Es utilizado para cargar los ingredientes de una receta de forma ligera y eficiente,
     *   sin traer entidades completas.
     */
    @Query("""
        SELECT d.producto.idProducto AS idProducto,
               d.cantProducto AS cantProducto
        FROM DetalleReceta d
        WHERE d.receta.idReceta = :idReceta
          AND d.producto.activo = true
    """)
    List<DetalleRecetaIdProductoProjection> findAllIdProductoAndCantidadByReceta(
            @Param("idReceta") Integer idReceta
    );

    /**
     * Actualiza la cantidad de un producto específico dentro de una receta.
     *
     * ¿Qué hace exactamente?
     * - Modifica el campo `cantProducto` en la entidad `DetalleReceta`.
     * - La actualización se aplica únicamente al registro cuyo `id_receta` coincida
     *   con el parámetro `idReceta` y cuyo `id_producto` sea igual al parámetro `idProducto`.
     *
     * ¿Para qué sirve?
     * - Permite actualizar la cantidad de un ingrediente en una receta sin necesidad
     *   de eliminar y volver a insertar el detalle completo.
     * - Es útil cuando el usuario modifica una receta y cambia la cantidad de un
     *   producto ya existente.
     */
    @Modifying
    @Query("""
       UPDATE DetalleReceta d
       SET d.cantProducto = :cant
       WHERE d.receta.idReceta = :idReceta
       AND d.producto.idProducto = :idProducto
       """)
    void updateQuantityByIdRecetaAndIdProducto(
            @Param("idReceta") Integer idReceta,
            @Param("idProducto") Integer idProducto,
            @Param("cant") Double cant
    );

    /**
     * Elimina registros específicos de la tabla `detalle_receta` según la receta y
     * un conjunto de productos asociados.
     *
     * ¿Qué hace exactamente?
     * - Borra todos los DetalleReceta cuyo `id_receta` coincida con el parámetro `idReceta`.
     * - Además, solo elimina aquellos detalles cuyo `id_producto` esté dentro de la lista
     *   `idsProducto`.
     *
     * ¿Para qué sirve?
     * - Permite eliminar de una receta únicamente ciertos productos, sin afectar los demás.
     * - Es usado cuando se está editando una receta y se requiere eliminar ingredientes
     *   específicos.
     */
    @Modifying
    @Query("DELETE FROM DetalleReceta d " +
            "WHERE d.receta.idReceta = :idReceta " +
            "AND d.producto.idProducto IN :idsProducto")
    void deleteByRecetaAndProductoIds(@Param("idReceta") Integer idReceta,
                                      @Param("idsProducto") List<Integer> idsProducto);

}
