package KuHub.modules.gestion_inventario.repository;

import KuHub.modules.gestion_inventario.entity.UnidadMedida;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UnidadaMedidaRepository extends JpaRepository<UnidadMedida, Short>{
    Boolean existsByIdUnidad(Short idUnidadMedida);
}
