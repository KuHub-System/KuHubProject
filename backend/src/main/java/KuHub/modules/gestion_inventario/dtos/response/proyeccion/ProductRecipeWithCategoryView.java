package KuHub.modules.gestion_inventario.dtos.response.proyeccion;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonPropertyOrder({
        "nombreProducto",
        "nombreUnidad",
        "abreviatura",
        "esFraccionario",
        "idProducto",
        "idUnidad",
        "idCategoria",
        "nombreCategoria"
})
public interface ProductRecipeWithCategoryView {
    String  getNombreProducto();
    String  getNombreUnidad();
    String  getAbreviatura();
    Boolean getEsFraccionario();
    Integer getIdProducto();
    Integer getIdUnidad();
    Integer getIdCategoria();
    String  getNombreCategoria();
}
