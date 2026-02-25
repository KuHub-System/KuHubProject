package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.dto.ChangeStatusActiveUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.ChangeProductsToAnotherUnidadMedidaDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.CreateUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.UpdateUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.response.proyeccion.UnidadMedidaView;
import KuHub.modules.gestion_inventario.entity.UnidadMedida;

import java.util.List;

public interface UnidadMedidaService {
    Boolean existsByIdUnidadMedida(Short idUnidadMedida);
    UnidadMedida findById(Short idUnidadMedida);
    List<UnidadMedida> findAll();
    List<UnidadMedida> findAllActiveTrue();
    List<UnidadMedidaView> findAllWithAsociados();
    boolean createUnidad(CreateUnidadDTO dto);
    boolean updateUnidad(UpdateUnidadDTO dto);
    String changeProductsToAnotherUnidadMedida(
            ChangeProductsToAnotherUnidadMedidaDTO dto);
    void changeStatusEnable (ChangeStatusActiveUnidadDTO dto);
    void deleteUnidad(Short idUnidad);
}
