package KuHub.modules.gestion_inventario.dtos.request;

import lombok.Data;

@Data
public class CreateCategoriaDTO {
    private String nombreCategoria;
    private String abreviatura;
}
