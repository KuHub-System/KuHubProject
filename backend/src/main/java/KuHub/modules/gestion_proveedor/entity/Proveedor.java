package KuHub.modules.gestion_proveedor.entity;

import KuHub.modules.gestion_proveedor.enums.EstadoProveedor;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Mapea tabla proveedor */
@Entity
@Table(name = "proveedor")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "productos")
public class Proveedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_proveedor")
    private Integer idProveedor;

    @Column(name = "nombre_proveedor", length = 100, nullable = false)
    private String nombreProveedor;

    @Column(name = "nombre_distribuidora", length = 100, nullable = false)
    private String nombreDistribuidora;

    @Column(name = "rut_proveedor", length = 13, unique = true)
    private String rutProveedor;

    @Column(name = "email_proveedor", length = 150)
    private String emailProveedor;

    @Column(name = "telefono_proveedor", length = 20, nullable = false)
    private String telefonoProveedor;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_proveedor", nullable = false, columnDefinition = "estado_provedor_type")
    private EstadoProveedor estadoProveedor = EstadoProveedor.DISPONIBLE;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false, updatable = false, columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @OneToMany(mappedBy = "proveedor", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = false)
    private List<ProveedorProducto> productos = new ArrayList<>();

    @OneToMany(mappedBy = "proveedor", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<ProveedorDiaEntrega> diasEntrega = new ArrayList<>();
}
