package KuHub.modules.gestion_inventario.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Clave compuesta para CategoriaAbastecimiento.
 * PK: (id_categoria, tipo_abastecimiento)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CategoriaAbastecimientoId implements Serializable {
    private Short  idCategoria;
    private String tipoAbastecimiento;
}
