package KuHub.modules.gestion_inventario.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Configuración de categorías por tipo de abastecimiento.
 * Una categoría puede pertenecer a INVENTARIO, BODEGA_TRANSITO, ambos o ninguno.
 * Valores válidos de tipo_abastecimiento: 'INVENTARIO', 'BODEGA_TRANSITO'
 *
 * -- Tipo ENUM y cast implícito (ejecutar antes de la tabla):
 * CREATE TYPE tipo_abastecimiento AS ENUM ('INVENTARIO', 'BODEGA_TRANSITO');
 * CREATE CAST (varchar AS tipo_abastecimiento) WITH INOUT AS IMPLICIT;
 *
 * CREATE TABLE categoria_abastecimiento (
 *     id_categoria        SMALLINT            NOT NULL REFERENCES categoria(id_categoria),
 *     tipo_abastecimiento tipo_abastecimiento NOT NULL,
 *     PRIMARY KEY (id_categoria, tipo_abastecimiento)
 * );
 *
 * -- DROP (orden inverso):
 * DROP TABLE IF EXISTS categoria_abastecimiento CASCADE;
 * DROP CAST  IF EXISTS (varchar AS tipo_abastecimiento);
 * DROP TYPE  IF EXISTS tipo_abastecimiento;
 */
@Entity
@Table(name = "categoria_abastecimiento")
@IdClass(CategoriaAbastecimientoId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CategoriaAbastecimiento {

    @Id
    @Column(name = "id_categoria")
    private Short idCategoria;

    @Id
    @Column(name = "tipo_abastecimiento", length = 30)
    private String tipoAbastecimiento;
}
