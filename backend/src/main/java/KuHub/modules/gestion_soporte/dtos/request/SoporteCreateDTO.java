package KuHub.modules.gestion_soporte.dtos.request;

import KuHub.modules.gestion_soporte.entity.TipoEquipoSoporte;
import KuHub.modules.gestion_soporte.entity.TipoErrorSoporte;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class SoporteCreateDTO {

    @NotNull(message = "El tipo de equipo es obligatorio")
    private TipoEquipoSoporte tipoEquipo;

    @Size(max = 100, message = "El equipo no puede exceder los 100 caracteres")
    private String equipoOtro;

    @NotBlank(message = "El sistema operativo es obligatorio")
    @Size(max = 50, message = "El sistema operativo no puede exceder los 50 caracteres")
    private String sistemaOperativo;

    @NotNull(message = "El tipo de error es obligatorio")
    private TipoErrorSoporte tipoError;

    @NotBlank(message = "La descripción es obligatoria")
    @Size(min = 10, max = 4000, message = "La descripción debe tener entre 10 y 4000 caracteres")
    private String descripcion;

    @Size(max = 255, message = "La URL de origen no puede exceder los 255 caracteres")
    private String urlOrigen;
}
