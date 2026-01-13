package KuHub.modules.gestion_receta.dtos.projection;

public interface RecipeDetailsView {

    // De la tabla detalle_receta
    Integer getIdDetalleReceta();
    Integer getIdProducto();
    Double getCantProducto();

    // De la tabla producto (JOIN)
    String getUnidadMedida();
}
