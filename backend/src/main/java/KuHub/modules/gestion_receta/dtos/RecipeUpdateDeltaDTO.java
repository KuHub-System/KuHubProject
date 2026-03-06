package KuHub.modules.gestion_receta.dtos;

import KuHub.modules.gestion_receta.dtos.respose.RecipeItemCreateDTO;
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

    private List<RecipeItemCreateDTO> itemsAgregados;
    private List<RecipeItemCreateDTO> itemsModificados;
    private List<Integer> idsItemsEliminados;
}
