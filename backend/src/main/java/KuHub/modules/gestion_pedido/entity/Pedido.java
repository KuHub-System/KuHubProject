package KuHub.modules.gestion_pedido.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "pedido")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pedido")
    private Integer idPedido;

    @Column(name = "fecha_inicio_pedido", nullable = false)
    private LocalDate fechaInicioPedido;

    @Column(name = "fecha_fin_pedido", nullable = false)
    private LocalDate fechaFinPedido;

    @Column(name = "fecha_registro", insertable = false, updatable = false)
    private LocalDateTime fechaRegistro;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_pedido", nullable = false)
    private EstadoPedidoType estadoPedido;

    // Relación inversa opcional para navegar hacia los detalles
    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL)
    private List<DetallePedido> detalles;

    // ─── ENUM DE ESTADO (debe coincidir con estado_pedido_type en PostgreSQL) ──
    public enum EstadoPedidoType {
        PENDIENTE,
        APROVADO,
        RECHAZADO
    }


}
