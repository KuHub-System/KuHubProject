package KuHub.modules.gestion_proveedor.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * DTO para recibir un día de entrega del proveedor.
 * Se usa como elemento de la lista diasEntrega en ProveedorCreateDTO y ProveedorUpdateDTO.
 */
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class DiaEntregaDTO {

    @NotBlank(message = "El día de la semana es obligatorio")
    private String diaSemana;

    /** Hora de inicio de entrega en formato HH:mm o HH:mm:ss (opcional). */
    private String horaInicio;

    /** Hora de fin de entrega en formato HH:mm o HH:mm:ss (opcional). */
    private String horaFin;
}
