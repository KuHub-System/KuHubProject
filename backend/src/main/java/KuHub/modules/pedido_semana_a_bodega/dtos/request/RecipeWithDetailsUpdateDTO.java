package KuHub.modules.pedido_semana_a_bodega.dtos.request;

import KuHub.modules.pedido_semana_a_bodega.dtos.request.dto.RecipeItemDTO;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RecipeWithDetailsUpdateDTO {
    @NotNull(message = "El ID de la receta es obligatorio")
    @Positive(message = "El ID de la receta debe ser un número positivo")
    private Integer idReceta;

    @NotBlank(message = "El nombre de la receta es obligatorio")
    @Size(max = 100, message = "El nombre de la receta no puede superar los 100 caracteres")
    private String nombreReceta;

    // Campos opcionales (no llevan @NotBlank ni @NotNull)
    private String descripcionReceta;

    private String instruccionesReceta;

    @NotBlank(message = "El estado de la receta es obligatorio")
    private String estadoReceta;

    // --- Arrays de Deltas para los Ingredientes ---

    // Inicializamos las listas para evitar NullPointerException si el frontend envía null
    @Valid // Obligatorio para que valide los atributos internos de RecipeItemDTO
    private List<RecipeItemDTO> newItems = new ArrayList<>();

    @Valid
    private List<RecipeItemDTO> updateItems = new ArrayList<>();

    private List<Integer> deleteItems = new ArrayList<>();
}
