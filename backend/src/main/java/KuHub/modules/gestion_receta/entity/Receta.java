package KuHub.modules.gestion_receta.entity;

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
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_receta")
    private Integer idReceta;

    @Column(name = "nombre_receta", nullable = false, length = 100)
    private String nombreReceta;

    // Cambiado a TEXT para permitir nulos y gran longitud sin límite de 5000
    @Column(name = "descripcion_receta", columnDefinition = "TEXT")
    private String descripcionReceta;

    // Sincronizado el nombre de la columna con el SQL ('instrucciones')
    @Column(name = "instrucciones", columnDefinition = "TEXT")
    private String instruccionesReceta;

    // Sincronizado con 'activo BOOLEAN NOT NULL'
    @Column(name = "activo", nullable = false)
    private Boolean activoReceta = true;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "estado_receta",
            columnDefinition = "estado_receta_type",
            nullable = false
    )
    private EstadoRecetaType estadoReceta;


    public enum EstadoRecetaType {
        ACTIVO,
        INACTIVO
    }

    /** ACTUALIZADO 05/03/26
     * CREATE TABLE receta (
     *     id_receta INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,--ASUMINDO QUE LA RECETA ESTA DISENADA PARA 20 PERSONAS
     *     nombre_receta VARCHAR(100) NOT NULL,
     *     descripcion_receta TEXT,
     *     instrucciones TEXT,
     *     activo BOOLEAN NOT NULL,
     *     estado_receta estado_receta_type NOT NULL
     * ); */

}