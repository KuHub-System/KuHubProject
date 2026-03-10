package KuHub.modules.gestion_academica.dtos.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class WeekGeneratorDTO {
    @NotNull(message = "La fecha de inicio es obligatoria")
    private LocalDate fechaInicio;

    // Se inicializa en 18 por defecto. Si el JSON no lo envía, este será el valor.
    @Min(value = 1, message = "Debe generar al menos 1 semana")
    @Max(value = 52, message = "No puede generar más de un año de semanas")
    private Integer cantidadSemanas = 18;

    @NotNull(message = "El semestre es obligatorio")
    @Min(value = 1, message = "El semestre debe ser 1 o 2")
    @Max(value = 2, message = "El semestre debe ser 1 o 2")
    private Short semestre;
}
