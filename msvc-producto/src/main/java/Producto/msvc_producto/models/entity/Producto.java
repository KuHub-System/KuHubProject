package Producto.msvc_producto.models.entity;

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
    @Column(name = "id_producto",nullable = false)
    private Long idProducto;

    @Column(name="nombre_producto",nullable = false,unique = true)
    @NotBlank(message = "El campo nombre del producto no puede ser vacio")
    private String nombreProducto;

    @Column(name="unidad_medida" , nullable = false)
    @NotBlank(message = "El campo unidad medida no puede ser vacio")
    private String unidadMedida;

    @ManyToOne
    @JoinColumn(name="id_categoria")
    private Categoria categoria;


}
