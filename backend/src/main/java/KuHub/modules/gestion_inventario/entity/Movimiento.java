package KuHub.modules.gestion_inventario.entity;

import KuHub.modules.gestion_usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "movimiento")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@ToString
public class Movimiento {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_movimiento")
    private Integer idMovimiento;

    // Relación con Usuario
    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    // CAMBIO IMPORTANTE: Relación con Inventario en lugar de Producto
    @ManyToOne
    @JoinColumn(name = "id_inventario", nullable = false)
    private Inventario inventario;

    @Column(name = "stock_movimiento", nullable = false)
    private Double stockMovimiento;

    // Asumiendo que tienes un Enum en Java para esto
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_movimiento", nullable = false)
    private TipoMovimiento tipoMovimiento;

    @CreationTimestamp // Esto llena la fecha automáticamente al guardar
    @Column(name = "fecha_movimiento", updatable = false)
    private LocalDateTime fechaMovimiento;

    // Nuevo campo opcional
    @Column(name = "observacion")
    private String observacion;

    public enum TipoMovimiento {
        ENTRADA,
        SALIDA,
        DEVOLUCION,
        MERMA,
        AJUSTE
    }

}
