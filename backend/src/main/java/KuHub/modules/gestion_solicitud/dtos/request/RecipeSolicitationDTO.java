package KuHub.modules.gestion_solicitud.dtos.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecipeSolicitationDTO {
    private Integer idReceta;
    private String nombreReceta;
    private List<RecipeDetailsSolicitationDTO> detalles;
}
