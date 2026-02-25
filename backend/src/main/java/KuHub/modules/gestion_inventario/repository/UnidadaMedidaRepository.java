package KuHub.modules.gestion_inventario.repository;

import KuHub.modules.gestion_inventario.dtos.response.proyeccion.UnidadMedidaView;
import KuHub.modules.gestion_inventario.entity.UnidadMedida;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface UnidadaMedidaRepository extends JpaRepository<UnidadMedida, Short>{
    Boolean existsByIdUnidad(Short idUnidadMedida);
    boolean existsByNombreUnidad(String nombreUnidad);
    boolean existsByAbreviatura(String abreviatura);
    boolean existsByNombreUnidadIgnoreCaseAndIdUnidadNot(
            String nombreUnidad, Short idUnidadMedida);

    boolean existsByAbreviaturaIgnoreCaseAndIdUnidadNot(
            String abreviatura, Short idUnidadMedida);
    boolean existsByAbreviaturaIgnoreCase(String abreviatura);;

    List<UnidadMedida> findByActivo(Boolean activo);

    @Query("""
        SELECT 
            u.idUnidad AS idUnidad,
            u.nombreUnidad AS nombreUnidad,
            u.abreviatura AS abreviatura,
            u.activo AS activo,
            COUNT(p.idProducto) AS asociados
        FROM UnidadMedida u
        LEFT JOIN Producto p 
            ON p.unidadMedida.idUnidad = u.idUnidad
        GROUP BY 
            u.idUnidad, u.nombreUnidad, u.abreviatura, u.activo
    """)
    List<UnidadMedidaView> findAllWithAsociados();
}
