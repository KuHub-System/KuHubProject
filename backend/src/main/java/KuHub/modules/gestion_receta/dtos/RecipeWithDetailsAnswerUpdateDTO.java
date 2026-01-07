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
public class RecipeWithDetailsAnswerUpdateDTO {

    @NotNull
    private Integer idReceta;
    @NotBlank
    private String nombreReceta;
    private String descripcionReceta;
    @NotEmpty(message = "La lista de items no puede estar vacía")
    @Valid
    private List<RecipeItemDTO> listaItems;
    private String instrucciones;
    @NotNull(message = "El estado de la receta no puede ser nulo")
    private Receta.EstadoRecetaType estadoReceta;

    private boolean cambioReceta;
    private boolean cambioDetalles;

}
