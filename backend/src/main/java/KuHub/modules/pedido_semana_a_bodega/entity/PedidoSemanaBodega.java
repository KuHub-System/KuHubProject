package KuHub.modules.pedido_semana_a_bodega.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "pedido_semana_bodega")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class PedidoSemanaBodega {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pedido_semana_bodega")
    private Integer idPedidoSemanaBodega;

    @Column(name = "nombre_pedido", nullable = false, length = 100)
    private String nombrePedido;

    @Column(name = "descripcion_pedido", columnDefinition = "TEXT")
    private String descripcionPedido;

    @Column(name = "instrucciones", columnDefinition = "TEXT")
    private String instrucciones;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "estado_pedido",
            columnDefinition = "estado_pedido_semana_bodega",
            nullable = false
    )
    private EstadoPedidoSemana estadoPedido;


    public enum EstadoPedidoSemana {
        ACTIVO,
        INACTIVO
    }

}