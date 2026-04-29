package KuHub.modules.pedido_semana_a_bodega.dtos.projection;

public interface RecipeDetailsView {

    // De la tabla detalle_receta
    Integer getIdDetalleReceta();
    Integer getIdProducto();
    Double getCantProducto();

    // De la tabla producto (JOIN)
    String getUnidadMedida();
}
