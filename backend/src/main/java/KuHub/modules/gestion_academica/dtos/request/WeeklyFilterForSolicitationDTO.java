package KuHub.modules.gestion_academica.dtos.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WeeklyFilterForSolicitationDTO {

    @NotNull(message = "El año (anio) es requerido para la consulta.")
    @Min(value = 2020, message = "El año debe ser igual o mayor a 2020.")
    @Max(value = 2100, message = "El año excede el límite permitido.")
    private Short anio;

    @NotNull(message = "El semestre es requerido para la consulta.")
    @Min(value = 1, message = "El semestre mínimo es 1.")
    @Max(value = 2, message = "El semestre máximo es 2.")
    private Short semestre;
}
