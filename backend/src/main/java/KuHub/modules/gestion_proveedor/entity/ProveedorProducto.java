package KuHub.modules.gestion_proveedor.entity;

import KuHub.modules.gestion_inventario.entity.Producto;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entidad JPA que representa la relación y el catálogo de productos ofrecidos por un Proveedor.
 * Mapea la relación muchos a muchos entre Proveedor y Producto, almacenando los datos de
 * la marca asignada, el formato de contenido del insumo, y la cotización específica
 * detallando el precio neto, el precio con IVA calculado y el estado activo/inactivo de la oferta.
 */
@Entity
@Table(name = "proveedor_producto")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class ProveedorProducto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_proveedor_producto")
    private Long idProveedorProducto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_proveedor", nullable = false)
    private Proveedor proveedor;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    @Column(name = "marca_producto", length = 200)
    private String marcaProducto;

    @Column(name = "formato_contenido", length = 100)
    private String formatoContenido;

    @Column(name = "precio_neto", nullable = false, precision = 10, scale = 3)
    private BigDecimal precioNeto;

    @Column(name = "precio_con_iva", nullable = false, precision = 10, scale = 3)
    private BigDecimal precioConIva;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    public void setIdProveedor(Integer id) {
        if (id != null) {
            this.proveedor = new Proveedor();
            this.proveedor.setIdProveedor(id);
        }
    }

    public void setIdProducto(Integer id) {
        if (id != null) {
            this.producto = new Producto();
            this.producto.setIdProducto(id);
        }
    }
}
