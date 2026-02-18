package KuHub.modules.gestion_inventario.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "categoria")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Categoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_categoria")
    private Short idCategoria; // Usamos Short para mapear el SMALLINT de SQL

    @Column(name = "nombre_categoria", length = 50, nullable = false, unique = true)
    private String nombreCategoria;

    @Column(name = "activo")
    private Boolean activo = true;

    /** CREACION 17/02/26
     * CREATE TABLE categoria (
     *     -- SMALLINT ocupa solo 2 bytes (rango hasta 32,767)
     *     id_categoria SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     *     nombre_categoria VARCHAR(50) NOT NULL UNIQUE,
     *     activo BOOLEAN DEFAULT TRUE
     * );
     * */
}
