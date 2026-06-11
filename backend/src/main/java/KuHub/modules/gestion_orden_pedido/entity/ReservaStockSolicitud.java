package KuHub.modules.gestion_orden_pedido.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Reserva de stock disponible para una solicitud: registra cuánto de un producto se cubrió
 * desde el stock existente (en vez de pedirlo al proveedor) al generar la OP con "cubrir con
 * disponible". Sirve para que ese stock deje de aparecer como disponible en cálculos futuros.
 *
 * Se cuenta solo mientras la solicitud está EN_PEDIDO; al pasar a PROCESADA o RECHAZADA deja de
 * restar automáticamente (el cálculo filtra por estado), sin necesidad de borrarla.
 */
@Entity
@Table(name = "reserva_stock_solicitud",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_reserva_sol_prod",
                        columnNames = {"id_solicitud", "id_producto"})
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class ReservaStockSolicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reserva")
    private Integer idReserva;

    @Column(name = "id_solicitud", nullable = false)
    private Integer idSolicitud;

    @Column(name = "id_producto", nullable = false)
    private Integer idProducto;

    @Column(name = "cantidad", nullable = false, precision = 10, scale = 3)
    private BigDecimal cantidad;

    @Column(name = "fecha_reserva", nullable = false, columnDefinition = "DATE")
    private LocalDate fechaReserva = LocalDate.now();

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}
