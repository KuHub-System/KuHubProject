package KuHub.modules.inventario.entity;

import KuHub.modules.producto.entity.Producto;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Entity
@Table(name = "inventario")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@ToString
public class Inventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_inventario")
    private Integer idInventario;

    @NotNull(message = "El producto es obligatorio")
    @Column(name = "id_producto", nullable = false, unique = true)
    private Integer idProducto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto", insertable = false, updatable = false)
    @JsonIgnore
    private Producto producto;

    @NotNull(message = "El stock no puede ser nulo")
    @Min(value = 0, message = "El stock no puede ser negativo")
    @Column(name = "stock", nullable = false)
    private Double stock;

    @Min(value = 0, message = "El stock mínimo no puede ser negativo")
    @Column(name = "stock_limit_min")
    private Double stockLimitMin;


    /**-- Tabla inventario
     CREATE TABLE inventario (
     id_inventario INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     id_producto INTEGER NOT NULL,
     stock DOUBLE PRECISION NOT NULL CHECK (stock >= 0),
     stock_limit_min DOUBLE PRECISION CHECK (stock_limit_min IS NULL OR stock_limit_min >= 0),
     stock_limit_max DOUBLE PRECISION CHECK (stock_limit_max IS NULL OR stock_limit_max >= 0),
     FOREIGN KEY (id_producto) REFERENCES producto(id_producto),
     UNIQUE(id_producto)
     );
     */

}