package KuHub.modules.gestion_pedido.dtos.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

/**
 * DTO para solicitar resumen histórico de pedidos.
 * Los estados se envían como CSV (ej: "APROBADO,ENTREGADO").
 */
@Getter @Setter @ToString @NoArgsConstructor @AllArgsConstructor
public class ResumenHistoricoRequestDTO {

    @NotNull(message = "La fecha de inicio es obligatoria")
    private LocalDate fechaInicio;

    @NotNull(message = "La fecha de fin es obligatoria")
    private LocalDate fechaFin;

    @NotBlank(message = "Los estados son obligatorios (CSV: APROBADO,ENTREGADO)")
    private String estadosCsv;
}
