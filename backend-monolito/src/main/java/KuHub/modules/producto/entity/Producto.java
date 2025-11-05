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
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "producto_seq")
    @SequenceGenerator(name = "producto_seq", sequenceName = "producto_id_producto_seq", allocationSize = 1)
    @Column(name = "id_producto", nullable = false)
    private Long idProducto;

    @Column(name="cod_producto",unique = true)
    private String codProducto;

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

    @Column(name="foto_producto")
    private byte[] fotoProducto;

    /**-- Tabla producto
     CREATE TABLE producto (
     id_producto SERIAL PRIMARY KEY,
     cod_producto VARCHAR(30),
     nombre_producto VARCHAR(100) NOT NULL,
     nombre_categoria VARCHAR(100) NOT NULL,
     unidad_medida VARCHAR(50) NOT NULL,
     activo BOOLEAN DEFAULT TRUE, --soft delete
     foto_producto BYTEA
     );*/
}
