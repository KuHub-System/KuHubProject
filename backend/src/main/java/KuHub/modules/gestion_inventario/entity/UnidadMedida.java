package KuHub.modules.gestion_inventario.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entidad que representa la Unidad de Medida (KG, UNIDAD, LITRO, etc.)
 * Mapea la tabla 'unidad_medida' en PostgreSQL
 */
@Entity
@Table(name = "unidad_medida")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UnidadMedida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_unidad")
    private Short idUnidad; // Mapea el SMALLINT de la BD

    @Column(name = "nombre_unidad", length = 30, nullable = false, unique = true)
    private String nombreUnidad;

    @Column(name = "abreviatura", length = 10, nullable = false, unique = true)
    private String abreviatura;

    @Column(name = "es_fraccionario", nullable = false)
    private Boolean esFraccionario;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    /**CREADO 17/02/26
     * CREATE TABLE unidad_medida (
     *     id_unidad SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     *     nombre_unidad VARCHAR(30) NOT NULL UNIQUE, -- Ej: 'Kilogramo'
     *     activo BOOLEAN DEFAULT TRUE
     * );*/
}
