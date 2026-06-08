package KuHub.modules.pedido_semana_a_bodega.services;

import KuHub.modules.pedido_semana_a_bodega.dtos.request.SearchPedidoSemanaBodegaDTO;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.dto.PedidoSemanaBodegaWithDetailsCreateDTO;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.CountPedidoSemanaBodegaAndStatusView;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection.AsignaturaActivaView;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.record.ImportarExcelResultado;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.record.PedidoSemanaBodegasPage;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.PedidoSemanaBodegaWithDetailsUpdateDTO;
import KuHub.modules.pedido_semana_a_bodega.entity.PedidoSemanaBodega;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface PedidoSemanaBodegaService {
    PedidoSemanaBodega findById(Integer id);
    CountPedidoSemanaBodegaAndStatusView countRecipesAndStatus();
    PedidoSemanaBodegasPage findAllRecipesPaginated(Integer pageRequested, Integer idSemana, Integer idAsignatura, String estadoPedido);
    PedidoSemanaBodegasPage findAllWithDetailsAndSearchPaging(SearchPedidoSemanaBodegaDTO searchDto);
    boolean saveRecipeWithDetails(PedidoSemanaBodegaWithDetailsCreateDTO dto);
    boolean updateRecipeWithDetails (PedidoSemanaBodegaWithDetailsUpdateDTO request);
    boolean changeStatus(Integer idReceta);
    boolean softDeleteRecipeWithDetails(Integer idReceta);
    ImportarExcelResultado importarExcelProductos(MultipartFile archivo, String nombreHoja);
    List<AsignaturaActivaView> obtenerAsignaturasActivas();
}
