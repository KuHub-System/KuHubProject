package KuHub.modules.gestion_academica.dtos.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class WeekReasignDTO {

    @NotNull(message = "El anio es obligatorio")
    private Short anio;

    @NotNull(message = "El semestre es obligatorio")
    @Min(value = 1, message = "El semestre debe ser 1 o 2")
    @Max(value = 2, message = "El semestre debe ser 1 o 2")
    private Short semestre;

    @NotNull(message = "La nueva fecha de inicio es obligatoria")
    private LocalDate nuevaFechaInicio; // YYYY-MM-DD (debe ser lunes)
}
