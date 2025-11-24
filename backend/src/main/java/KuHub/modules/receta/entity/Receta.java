package KuHub.modules.receta.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "receta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class Receta {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receta_seq")
    @SequenceGenerator(
            name = "receta_seq",
            sequenceName = "receta_id_receta_seq",
            allocationSize = 1
    )
    @Column(name = "id_receta", nullable = false)
    private Integer idReceta;

    @Column(name = "nombre_receta", nullable = false, length = 100)
    private String nombreReceta;

    @Column(name = "descripcion_receta", length = 5000)
    private String descripcionReceta;

    @Column(name = "instrucciones", length = 5000)
    private String instruccionesReceta;

    @Column(name = "activo")
    private Boolean activoReceta = true;

    // ⭐ SOLO ESTO — El CAST ya hace TODO.
    @Enumerated(EnumType.STRING)
    @Column(
            name = "estado_receta",
            columnDefinition = "estado_receta_type",
            nullable = false
    )
    private EstadoRecetaType estadoReceta;

    @Lob
    @Column(
            name = "foto_receta",
            columnDefinition = "BYTEA",
            insertable = false,
            updatable = false
    )
    private byte[] fotoReceta;



    public enum EstadoRecetaType {
        ACTIVO,
        INACTIVO
    }
}