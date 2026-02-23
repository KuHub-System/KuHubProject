package KuHub.modules.gestion_inventario.dtos.request;

import lombok.Data;

@Data
public class UpdateCategoriaDTO {
    private Short idCategoria;
    private String nombreCategoria;
    private boolean activo;
}
