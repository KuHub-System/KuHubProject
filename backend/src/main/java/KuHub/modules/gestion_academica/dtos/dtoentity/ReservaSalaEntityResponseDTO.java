package KuHub.modules.gestion_academica.dtos.dtoentity;

import KuHub.modules.gestion_academica.entity.ReservaSala;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class ReservaSalaEntityResponseDTO {

    private Integer idReservaSala;
    private Integer idSeccion;
    private Integer idSala;
    private Integer idBloqueHorario;
    private ReservaSala.DiaSemana diaSemana;

}
