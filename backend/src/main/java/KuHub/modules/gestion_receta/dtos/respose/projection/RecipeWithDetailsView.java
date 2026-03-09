package KuHub.modules.gestion_receta.dtos.respose.projection;

import org.springframework.beans.factory.annotation.Value;

public interface RecipeWithDetailsView {
    @Value("#{target.idReceta}")
    Integer getIdReceta();

    @Value("#{target.nombreReceta}")
    String getNombreReceta();

    @Value("#{target.descripcionReceta}")
    String getDescripcionReceta();

    @Value("#{target.instruccionesReceta}")
    String getInstruccionesReceta();

    @Value("#{target.estadoReceta}")
    String getEstadoReceta();

    @Value("#{target.totalIngredientes}")
    Long getTotalIngredientes();

    @Value("#{target.detallesJson}")
    String getDetallesJson();
}
