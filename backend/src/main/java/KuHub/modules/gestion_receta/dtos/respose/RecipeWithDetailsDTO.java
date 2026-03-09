package KuHub.modules.gestion_receta.dtos.respose;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder // Útil para crear el objeto en el Stream
public class RecipeWithDetailsDTO {
    private Integer idReceta;
    private String nombreReceta;
    private String descripcionReceta;
    private String instruccionesReceta;
    private String estadoReceta;
    private Long totalIngredientes;
    private List<RecipeItemAnswerDTO> detalles;
}
