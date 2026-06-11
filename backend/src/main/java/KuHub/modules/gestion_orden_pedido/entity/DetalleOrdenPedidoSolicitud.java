package KuHub.modules.gestion_orden_pedido.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Entidad puente que vincula una línea de entrega de una Orden de Pedido
 * ({@link DetalleOrdenPedido}) con las solicitudes que abastece y cuánto aporta cada una.
 *
 * Permite rastrear, por línea (producto + fecha de entrega), qué solicitudes cubre la entrega
 * y derivar las asignaturas involucradas (solicitud → reserva_sala → asignatura). La diferencia
 * entre la cantidad de la línea y la suma de {@code cantidadAtribuida} es el ajuste manual (±)
 * sin dueño (compra de más o recorte por stock existente).
 */
@Entity
@Table(name = "detalle_orden_pedido_solicitud",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_dop_solicitud",
                        columnNames = {"id_detalle_orden_pedido", "id_solicitud"})
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class DetalleOrdenPedidoSolicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_dop_solicitud")
    private Integer idDopSolicitud;

    @Column(name = "id_detalle_orden_pedido", nullable = false)
    private Integer idDetalleOrdenPedido;

    @Column(name = "id_solicitud", nullable = false)
    private Integer idSolicitud;

    @Column(name = "cantidad_atribuida", nullable = false, precision = 10, scale = 3)
    private BigDecimal cantidadAtribuida;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}
