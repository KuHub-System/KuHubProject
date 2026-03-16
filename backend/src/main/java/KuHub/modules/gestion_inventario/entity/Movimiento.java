package KuHub.modules.gestion_inventario.entity;

import KuHub.modules.gestion_usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "movimiento")
@NoArgsConstructor
@AllArgsConstructor
@Data
public class Movimiento {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_movimiento")
    private Integer idMovimiento;

    // --- RELACIONES (ManyToOne) ---

    @ManyToOne(fetch = FetchType.LAZY) // Lazy es mejor para rendimiento en historiales
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_inventario", nullable = false)
    private Inventario inventario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_bodega_transito", nullable = true)
    private BodegaTransito bodegaTransito;

    // --- DATOS DEL MOVIMIENTO ---

    // Usamos BigDecimal para coincidir con NUMERIC(10, 3)
    @Column(name = "stock_movimiento", nullable = false, precision = 10, scale = 3)
    private BigDecimal stockMovimiento;

    // Mapeamos el ENUM de Postgres a String en Java
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_movimiento", nullable = false)
    private TipoMovimiento tipoMovimiento;

    @CreationTimestamp
    @Column(name = "fecha_movimiento", nullable = false, updatable = false)
    private LocalDateTime fechaMovimiento;

    // Coincide con TEXT en Postgres
    @Column(name = "observacion", columnDefinition = "TEXT")
    private String observacion;

    public enum TipoMovimiento {
        ENTRADA_INVENTARIO,
        ENTRADA_BODEGA,
        SALIDA_INVENTARIO,
        SALIDA_BODEGA,
        DEVOLUCION,
        MERMA_INVENTARIO,
        MERMA_BODEGA,
        AJUSTE_INVENTARIO,
        AJUSTE_BODEGA,
        TRASLADO
    }

    // --- MÉTODOS AYUDANTES (Setters Inteligentes) ---

    /**
     * Permite asignar el usuario responsable usando solo su ID.
     */
    public void setUsuarioId(Integer id) {
        if (id != null) {
            this.usuario = new Usuario();
            this.usuario.setIdUsuario(id);
        }
    }

    /**
     * Permite asignar el inventario afectado usando solo su ID.
     */
    public void setInventarioId(Integer id) {
        if (id != null) {
            this.inventario = new Inventario();
            this.inventario.setIdInventario(id);
        }
    }

    /**
     *  Permite asignar la bodega de tránsito afectada usando solo su ID.
     */
    public void setIdBodegaTransito(Integer id) {
        if (id != null) {
            this.bodegaTransito = new BodegaTransito();
            this.bodegaTransito.setIdBodegaTransito(id);
        }
    }
}
