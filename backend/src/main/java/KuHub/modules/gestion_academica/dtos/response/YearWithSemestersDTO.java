package KuHub.modules.gestion_academica.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class YearWithSemestersDTO {
    private Short anio;
    private List<Short> semestres;
}
