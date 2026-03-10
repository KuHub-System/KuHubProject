package KuHub.modules.gestion_academica.dtos.response;

import lombok.Data;

import java.util.List;

@Data
public class CourserPageDTGOD {
    private List<CourserAnswerDTGOD> content;
    private int page;
    private int limit;
    private int totalPages;
    private long totalElements;
}
