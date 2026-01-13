package KuHub.modules.gestion_receta.dtos;

import KuHub.modules.gestion_receta.entity.Receta;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class RecipeWithDetailsAnswerDTO {

    private Integer idReceta;
    private String nombreReceta;
    private String descripcionReceta;
    private List<RecipeItemAnswerDTO> listaItems;
    private String instrucciones;
    private Receta.EstadoRecetaType estadoReceta;


}
