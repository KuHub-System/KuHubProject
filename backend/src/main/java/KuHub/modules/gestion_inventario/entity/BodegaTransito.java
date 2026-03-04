package KuHub.modules.gestion_inventario.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Entidad que representa la bodega de tránsito para movimientos temporales de stock.
 * Mantiene una relación uno a uno con el inventario principal.
 */
@Entity
@Table(name = "bodega_transito")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BodegaTransito {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_bodega_transito")
    private Integer idBodegaTransito;

    @OneToOne
    @JoinColumn(name = "id_inventario", nullable = false, unique = true)
    private Inventario inventario;

    @Column(nullable = false, precision = 10, scale = 3)
    private BigDecimal stock;

    @Column(name = "stock_limit", precision = 10, scale = 3)
    private BigDecimal stockLimit;

    @Column(nullable = false)
    private Boolean activo = true;

    // --- MÉTODO AYUDANTE (Patrón Setter Inteligente) ---
    /**
     * Permite asignar el inventario a la bodega de tránsito usando solo el ID (Integer).
     * Útil cuando recibes un JSON de traslado o quieres ahorrar una consulta previa a la DB.
     */
    public void setInventarioId(Integer id) {
        if (id != null) {
            this.inventario = new Inventario();
            this.inventario.setIdInventario(id); //
        }
    }

    /** * CREADO 03/03/26
     * -- Tabla bodega_transito
     CREATE TABLE bodega_transito (
     id_bodega_transito INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     id_inventario INTEGER NOT NULL,
     stock NUMERIC(10, 3) NOT NULL CHECK (stock >= 0),
     stock_limit NUMERIC(10, 3) CHECK (stock_limit IS NULL OR stock_limit >= 0),
     activo BOOLEAN NOT NULL DEFAULT TRUE,

     CONSTRAINT uk_transito_inventario UNIQUE (id_inventario),
     CONSTRAINT fk_bodega_transito_inventario
     FOREIGN KEY (id_inventario) REFERENCES inventario(id_inventario)
     ON UPDATE CASCADE ON DELETE RESTRICT
     );
     */
}