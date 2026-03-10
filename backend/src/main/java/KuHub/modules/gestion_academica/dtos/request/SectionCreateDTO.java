package KuHub.modules.gestion_academica.dtos.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.util.List;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SectionCreateDTO {
    @NotNull(message = "La asignatura es obligatoria")
    private Integer idAsignatura;

    @NotBlank(message = "El nombre de la sección no puede estar vacío")
    @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
    private String nombreSeccion;

    @NotBlank(message = "El estado de la sección es obligatorio")
    private String estadoSeccion;

    @NotNull(message = "El docente es obligatorio")
    private Integer idUsuarioDocente;

    @NotNull(message = "La capacidad máxima es obligatoria")
    @Positive(message = "La capacidad debe ser un número positivo")
    private Short capacidadMax;

    @NotNull(message = "La cantidad de inscritos es obligatoria")
    @Positive(message = "La cantidad de inscritos debe ser un número positivo")
    private Short cantInscritos;

    @NotEmpty(message = "Debe asignar al menos un horario")
    @Valid
    private List<BookTImeBlocksDTO> bloquesHorarios;
}
