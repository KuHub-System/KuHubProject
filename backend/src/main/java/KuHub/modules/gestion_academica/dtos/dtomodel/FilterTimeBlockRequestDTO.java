package KuHub.modules.gestion_academica.dtos.dtomodel;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class FilterTimeBlockRequestDTO {

    private Integer idSala;
    @NotBlank
    private String diaSemana;

}
