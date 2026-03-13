package KuHub.modules.gestion_inventario.dtos.response.proyeccion;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonPropertyOrder({
        "nombreProducto",
        "nombreUnidad",
        "abreviatura",
        "esFraccionario",
        "idProducto",
        "idUnidad"
})
public interface ProductRecipeView {
    String getNombreProducto();
    String getNombreUnidad();
    String getAbreviatura();
    Boolean getEsFraccionario();
    Integer getIdProducto();
    Integer getIdUnidad();

}
