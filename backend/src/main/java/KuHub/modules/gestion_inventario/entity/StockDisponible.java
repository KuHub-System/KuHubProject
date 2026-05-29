package KuHub.modules.gestion_inventario.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Registra sobrantes físicos detectados en bodega de tránsito que no están
 * asociados a ningún pedido o solicitud vigente.
 * Se puebla cuando el usuario procesa un TRASLADO y detecta diferencias
 * entre la cantidad solicitada y la cantidad enviada.
 *
 * CREATE TABLE stock_disponible (
 *   id_stock_disponible SERIAL PRIMARY KEY,
 *   id_producto         INTEGER NOT NULL REFERENCES producto(id_producto),
 *   id_pedido           INTEGER REFERENCES pedido(id_pedido),
 *   id_solicitud        INTEGER REFERENCES solicitud(id_solicitud),
 *   cantidad            DECIMAL(10,3) NOT NULL CHECK (cantidad >= 0),
 *   tipo_disponible     tipo_abastecimiento NOT NULL DEFAULT 'INVENTARIO',
 *   fecha_registro      DATE NOT NULL DEFAULT CURRENT_DATE,
 *   activo              BOOLEAN NOT NULL DEFAULT TRUE
 * );
 */
@Entity
@Table(name = "stock_disponible")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockDisponible {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_stock_disponible")
    private Integer idStockDisponible;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    @Column(name = "id_pedido")
    private Integer idPedido;

    @Column(name = "id_solicitud")
    private Integer idSolicitud;

    @Column(name = "cantidad", nullable = false, precision = 10, scale = 3)
    private BigDecimal cantidad;

    @Column(name = "tipo_disponible", length = 20, nullable = false)
    private String tipoDisponible = "INVENTARIO";

    @Column(name = "fecha_registro")
    private LocalDate fechaRegistro = LocalDate.now();

    @Column(name = "activo")
    private Boolean activo = true;
}
