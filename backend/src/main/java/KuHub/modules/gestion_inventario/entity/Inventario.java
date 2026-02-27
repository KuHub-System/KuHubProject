package KuHub.modules.gestion_inventario.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "inventario")
@NoArgsConstructor
@AllArgsConstructor
@Data
public class Inventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_inventario")
    private Integer idInventario;

    // --- RELACIÓN ONE-TO-ONE (Dueña de la columna) ---
    // Al ser Option 1, eliminamos el campo 'Integer idProducto' duplicado.
    @NotNull(message = "El producto es obligatorio")
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_producto", nullable = false, unique = true)
    private Producto producto;

    // --- CAMPOS NUMÉRICOS ---
    @NotNull(message = "El stock no puede ser nulo")
    @Min(value = 0, message = "El stock no puede ser negativo")
    @Column(name = "stock", nullable = false, precision = 10, scale = 3)
    private BigDecimal stock;

    @Min(value = 0, message = "El stock límite no puede ser negativo")
    @Column(name = "stock_limit", precision = 10, scale = 3)
    private BigDecimal stockLimit;

    @Column(name = "activo")
    private Boolean activo = true;


    // --- MÉTODO AYUDANTE (Patrón Setter Inteligente) ---
    /**
     * Permite asignar el producto al inventario usando solo el ID (Integer).
     * Útil cuando recibes un JSON { "productoId": 10, "stock": 100 }
     */
    public void setProductoId(Integer id) {
        if (id != null) {
            this.producto = new Producto();
            this.producto.setIdProducto(id);
        }
    }


    /** ACTUALIZADO 17/02/26
     * -- Tabla inventario
     CREATE TABLE inventario (
     id_inventario INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     id_producto INTEGER NOT NULL,
     stock NUMERIC(10, 3) NOT NULL CHECK (stock >= 0),
     stock_limit NUMERIC(10, 3) CHECK (stock_limit IS NULL OR stock_limit >= 0),

     CONSTRAINT fk_inventario_producto
     FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
     ON UPDATE CASCADE ON DELETE RESTRICT,
     UNIQUE(id_producto)

     );
     */

}