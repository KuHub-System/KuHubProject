package KuHub.modules.gestion_academica.dtos.dtomodel;

import KuHub.modules.gestion_academica.dtos.response.BookTImeBlocksDTO;
import KuHub.modules.gestion_academica.entity.Seccion;
import jakarta.persistence.Column;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SectionCreateDTO {
    @NotNull
    private Integer idAsignatura;
    @NotEmpty
    @Column(length = 100)
    private String nombreSeccion;
    private Seccion.EstadoSeccion estadoSeccion;//remover
    @NotNull
    private Integer idUsuarioDocente;
    private String NombreCompletoDocente;//remover
    @NotNull
    private Integer capacidadMaxInscritos;
    @NotNull
    private Integer cantInscritos;
    @NotEmpty
    @Valid//tiene que poder asignar al menos un horario!
    private List<BookTImeBlocksDTO> bloquesHorarios;
    private Boolean crearSala;//remover

}
