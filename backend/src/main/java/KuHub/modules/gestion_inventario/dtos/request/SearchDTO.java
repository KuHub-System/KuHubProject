package KuHub.modules.gestion_inventario.dtos.request;

import lombok.Data;

@Data
public class SearchDTO {
    private String term;
    private Integer page;
}
