package KuHub.modules.gestion_receta.dtos;

import KuHub.modules.gestion_receta.dtos.respose.RecipeItemDTO;
import KuHub.modules.gestion_receta.entity.Receta;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class RecipeUpdateDeltaDTO {
    @NotNull
    private Integer idReceta;
    private boolean cambioReceta;
    private String nombreReceta;
    private String descripcionReceta;
    private String instrucciones;
    private Receta.EstadoRecetaType estadoReceta;

    private List<RecipeItemDTO> itemsAgregados;
    private List<RecipeItemDTO> itemsModificados;
    private List<Integer> idsItemsEliminados;
}
