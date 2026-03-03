package KuHub.modules.gestion_inventario.dtos.request.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class UpdateUnidadDTO extends CreateUnidadDTO{
    @NotNull(message = "El idUnidadMedida es obligatorio")
    private Short idUnidadMedida;
}
