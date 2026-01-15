package KuHub.modules.gestion_solicitud.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor@NoArgsConstructor@Getter@Setter
public class DetalleAnswerDTO {
    private Integer idProducto;
    private Double cantidad;
    private String observaciones;
}
