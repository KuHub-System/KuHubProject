package KuHub.modules.gestion_academica.dtos.dtomodel;


import KuHub.modules.gestion_academica.entity.Seccion;
import jakarta.persistence.Column;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class SectionAnswerUpdateDTO {
    @NotNull
    private Integer idSeccion;
    @NotNull
    private Integer idAsignatura;
    @NotEmpty
    @Column(length = 100)
    private String nombreSeccion;
    private Seccion.EstadoSeccion estadoSeccion;
    @NotNull
    private Integer idDocente;
    private String NombreCompletoDocente;
    @NotNull
    private Integer capacidadMaxInscritos;
    @NotNull
    private Integer cantInscritos;
    @NotEmpty
    @Valid
    private List<BookTImeBlocksRequestDTO> bloquesHorarios;
    private Boolean crearSala;
}
