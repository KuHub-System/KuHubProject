package KuHub.modules.gestion_inventario.dtos.request.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateUnidadDTO {
    @NotBlank(message = "El nombre de la unidad es obligatorio")
    private String nombreUnidad;
    @NotBlank(message = "La abreviatura de la unidad es obligatoria")
    private String abreviatura;
}
