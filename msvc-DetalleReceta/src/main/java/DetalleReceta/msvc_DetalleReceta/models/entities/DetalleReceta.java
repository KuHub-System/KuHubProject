package DetalleReceta.msvc_DetalleReceta.models.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Entity
@Table(name = "detalle_receta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class DetalleReceta {

    @Id
    @GeneratedValue
    @Column(name="id_detalle_receta")
    private Long idDetalleReceta;

    @Column(name="id_receta")
    @NotNull(message = "El campo id receta no puede ser vacio")
    private Long idReceta;

    @Column(name="id_producto")
    @NotNull(message = "El campo id producto no puede ser vacio")
    private Long idProducto;

    @Column(name="cantidad_unidad_medida")
    @NotNull(message = "El campo cantidad no puede ser vacio")
    private Float cantidadDetalleReceta;
}

