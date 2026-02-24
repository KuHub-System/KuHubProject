package KuHub.modules.gestion_inventario.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SimpleFilterDTO {
    private Integer id;
    private String nombre;
}
