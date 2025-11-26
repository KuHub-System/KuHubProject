package KuHub.modules.gestion_academica.dtos.dtomodel;

import lombok.*;

@Getter@Setter@AllArgsConstructor@NoArgsConstructor@ToString
public class SalaRequestDTO {
    private String codSala;
    private String nombreSala;
    private Boolean activo;
}
