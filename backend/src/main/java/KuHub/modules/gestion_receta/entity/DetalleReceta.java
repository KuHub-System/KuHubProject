package KuHub.modules.gestion_receta.entity;

import KuHub.modules.gestion_inventario.entity.Producto;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name ="detalle_receta", uniqueConstraints = {
        @UniqueConstraint(name = "uq_receta_producto", columnNames = {"id_receta", "id_producto"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "receta")
public class DetalleReceta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_detalle_receta", nullable = false)
    private Integer idDetalleReceta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_receta", nullable = false)
    private Receta receta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    // Cambiado a BigDecimal para NUMERIC(10, 3)
    @Column(name = "cant_producto", nullable = false, precision = 10, scale = 3)
    private BigDecimal cantProducto;

    /**
     * Método para asignar la Receta usando solo su ID.
     * Útil para ahorrar una consulta a la base de datos al guardar.
     */
    public void setRecetaById(Integer idReceta) {
        this.receta = new Receta();
        this.receta.setIdReceta(idReceta);
    }

    /**
     * Método para asignar el Producto usando solo su ID.
     */
    public void setProductoById(Integer idProducto) {
        this.producto = new Producto();
        this.producto.setIdProducto(idProducto);
    }

    /** ACTUALIZADO 05/03/26
     * CREATE TABLE detalle_receta (
     *     id_detalle_receta INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     *     id_receta INTEGER NOT NULL,
     *     id_producto INTEGER NOT NULL,
     *     cant_producto NUMERIC(10, 3) NOT NULL CHECK (cant_producto >= 0),
     *     FOREIGN KEY (id_receta) REFERENCES receta(id_receta) ON DELETE CASCADE,
     *     FOREIGN KEY (id_producto) REFERENCES producto(id_producto),
     *     UNIQUE(id_receta, id_producto)
     * );*/


}
