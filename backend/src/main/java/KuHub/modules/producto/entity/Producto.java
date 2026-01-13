package KuHub.modules.producto.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name ="producto")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_producto", nullable = false)
    private Integer idProducto;

    @Column(name="cod_producto",unique = true)
    private String codProducto;

    @Column(name = "descripcion_producto")
    private String descripcionProducto;

    @Column(name="nombre_producto",nullable = false,unique = true)
    @NotBlank(message = "El campo nombre del producto no puede ser vacio")
    private String nombreProducto;

    @Column(name="nombre_categoria",nullable = false)
    @NotBlank(message = "El campo categoria no puede ser vacio")
    private String nombreCategoria;

    @Column(name="unidad_medida" , nullable = false)
    @NotBlank(message = "El campo unidad medida no puede ser vacio")
    private String unidadMedida;

    @Column(name="activo",nullable = false)
    private Boolean activo = true;


}
