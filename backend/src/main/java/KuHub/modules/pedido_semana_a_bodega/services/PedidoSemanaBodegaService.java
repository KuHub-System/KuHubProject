package KuHub.modules.pedido_semana_a_bodega.services;

import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.dto.RecipeWithDetailsCreateDTO;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.CountRecipesAndStatusView;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.record.RecipesPage;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.RecipeWithDetailsUpdateDTO;
import KuHub.modules.pedido_semana_a_bodega.entity.PedidoSemanaBodega;

public interface PedidoSemanaBodegaService {
    PedidoSemanaBodega findById(Integer id);
    CountRecipesAndStatusView countRecipesAndStatus();
    RecipesPage findAllRecipesPaginated(Integer pageRequested);
    RecipesPage findAllWithDetailsAndSearchPaging(SearchDTO searchDto);
    boolean saveRecipeWithDetails(RecipeWithDetailsCreateDTO dto);
    boolean updateRecipeWithDetails (RecipeWithDetailsUpdateDTO request);
    boolean changeStatus(Integer idReceta);
    boolean softDeleteRecipeWithDetails(Integer idReceta);


}
