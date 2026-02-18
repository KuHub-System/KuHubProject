package KuHub.modules.gestion_inventario.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name ="producto")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_producto")
    private Integer idProducto;

    @Column(name = "cod_producto", length = 25, unique = true)
    private String codProducto;

    @Column(name = "descripcion_producto", columnDefinition = "TEXT")
    private String descripcionProducto;

    @Column(name = "nombre_producto", length = 100, nullable = false, unique = true)
    @NotBlank(message = "El campo nombre del producto no puede ser vacío")
    private String nombreProducto;

    // --- RELACIÓN CON CATEGORÍA ---
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_categoria", nullable = false)
    private Categoria categoria;

    // --- RELACIÓN CON UNIDAD DE MEDIDA (CORREGIDO) ---
    // Ya no es String, ahora es una relación ManyToOne
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_unidad", nullable = false)
    private UnidadMedida unidadMedida;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    // --- MÉTODOS DINÁMICOS (SETTERS INTELIGENTES) ---

    /**
     * Permite asignar la categoría usando solo el ID (Short).
     */
    public void setCategoriaId(Short id) {
        if (id != null) {
            this.categoria = new Categoria();
            this.categoria.setIdCategoria(id);
        }
    }

    /**
     * Permite asignar la unidad de medida usando solo el ID (Short).
     */
    public void setUnidadMedidaId(Short id) {
        if (id != null) {
            this.unidadMedida = new UnidadMedida();
            this.unidadMedida.setIdUnidad(id);
        }
    }

    /** * COMENTARIO DE REFERENCIA SQL ACTUALIZADO 17/02/26
     * CREATE TABLE producto (
     * id_producto INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     * cod_producto VARCHAR(25),
     * descripcion_producto TEXT,
     * nombre_producto VARCHAR(100) NOT NULL UNIQUE,
     * id_categoria SMALLINT NOT NULL,
     * id_unidad SMALLINT NOT NULL, -- Relación con unidad_medida
     * activo BOOLEAN DEFAULT TRUE,
     * CONSTRAINT fk_categoria_producto FOREIGN KEY (id_categoria) REFERENCES categoria (id_categoria),
     * CONSTRAINT fk_unidad_producto FOREIGN KEY (id_unidad) REFERENCES unidad_medida (id_unidad)
     * );
     */
}
