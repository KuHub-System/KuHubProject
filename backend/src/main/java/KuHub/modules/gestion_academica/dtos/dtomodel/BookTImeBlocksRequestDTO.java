package KuHub.modules.gestion_academica.dtos.dtomodel;

import KuHub.modules.gestion_academica.entity.ReservaSala;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class BookTImeBlocksRequestDTO {
    @NotNull
    private Integer numeroBloque;
    @NotNull
    private String horaInicio;
    @NotNull
    private String horaFin;
    @NotNull
    private ReservaSala.DiaSemana diaSemana;
    @NotNull
    private Integer idSala;
    @NotEmpty
    private String codSala;
    @NotEmpty
    private String nombreSala;
}
