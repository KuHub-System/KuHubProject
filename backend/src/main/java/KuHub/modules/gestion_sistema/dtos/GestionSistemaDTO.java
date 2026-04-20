package KuHub.modules.gestion_sistema.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GestionSistemaDTO {

    /**
     * Cuando es TRUE, al aceptar una solicitud se crea/actualiza
     * automáticamente el pedido de la semana correspondiente.
     */
    private Boolean solicitudesEnPedido;
}
