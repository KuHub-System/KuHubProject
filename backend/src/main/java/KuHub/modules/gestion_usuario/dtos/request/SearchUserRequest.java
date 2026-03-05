package KuHub.modules.gestion_usuario.dtos.request;

import lombok.Data;

@Data
public class SearchUserRequest {
    private String term;
    private Integer page;
}