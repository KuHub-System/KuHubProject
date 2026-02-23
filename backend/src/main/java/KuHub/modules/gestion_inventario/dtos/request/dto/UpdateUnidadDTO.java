package KuHub.modules.gestion_inventario.dtos.request.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateUnidadDTO {
    @NotNull(message = "El idUnidadMedida es obligatorio")
    private Short idUnidadMedida;
    @NotBlank(message = "El nombre de la unidad es obligatorio")
    private String nombreUnidad;
    @NotBlank(message = "La abreviatura de la unidad es obligatoria")
    private String abreviatura;
}
