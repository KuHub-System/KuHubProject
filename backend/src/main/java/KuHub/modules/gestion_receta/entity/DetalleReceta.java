package KuHub.modules.gestion_receta.entity;

import KuHub.modules.producto.entity.Producto;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name ="detalle_receta", uniqueConstraints = {
        @UniqueConstraint(name = "uq_receta_producto", columnNames = {"id_receta", "id_producto"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class DetalleReceta {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "detalle_receta_seq")
    @SequenceGenerator(
            name = "detalle_receta_seq",
            sequenceName = "detalle_receta_id_detalle_receta_seq",
            allocationSize = 1
    )
    @Column(name = "id_detalle_receta", nullable = false)
    private Integer idDetalleReceta;

    /**
     * Mapea la columna id_receta como una relación directa a la entidad Receta.
     * Es "ManyToOne" porque muchos detalles de receta pertenecen a UNA receta.
     * FetchType.LAZY es una buena práctica para que no cargue la receta
     * completa a menos que se la pidas explícitamente.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_receta", nullable = false) // Este es el FOREIGN KEY
    private Receta receta;

    /**
     * Mapea la columna id_producto como una relación a la entidad Producto.
     * (Asumiendo que tienes una entidad 'Producto' en este mismo paquete).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto", nullable = false) // Este es el FOREIGN KEY
    private Producto producto;

    /**
     * Mapea la columna cant_producto.
     * Se usa Double porque en tu SQL es DOUBLE PRECISION.
     */
    @Column(name = "cant_producto", nullable = false)
    private Double cantProducto;

    /**-- Tabla detalle_receta
     CREATE TABLE detalle_receta (
     id_detalle_receta SERIAL PRIMARY KEY,
     id_receta INTEGER NOT NULL,
     id_producto INTEGER NOT NULL,
     cant_producto DOUBLE PRECISION NOT NULL,
     FOREIGN KEY (id_receta) REFERENCES receta(id_receta),
     FOREIGN KEY (id_producto) REFERENCES producto(id_producto),
     UNIQUE(id_receta, id_producto)
     );*/
}
