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

    /**
     * Cuando es TRUE, en los diálogos de "¿Registrar como stock disponible?"
     * (Inventario y Bodega de Tránsito, individual y masivo) se retira la opción
     * "Continuar sin registrar" — solo quedan Cancelar o Registrar disponibles.
     */
    private Boolean disponibleObligatorio;
}
