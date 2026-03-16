package KuHub.modules.gestion_receta.dtos.request.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RecipeWithDetailsCreateDTO {

    @NotBlank(message = "El nombre de la receta es obligatorio")
    private String nombreReceta;
    private String descripcionReceta;
    @Valid
    @NotEmpty(message = "La lista de items no puede estar vacía")
    private List<@Valid RecipeItemDTO> listaItems;
    private String instrucciones;

    @NotBlank(message = "El estado es obligatorio")
    private String estadoReceta;
}
