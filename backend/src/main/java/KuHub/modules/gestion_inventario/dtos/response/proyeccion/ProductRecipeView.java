package KuHub.modules.gestion_inventario.dtos.response.proyeccion;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonPropertyOrder({
        "nombreProducto",
        "nombreUnidad",
        "esFraccionario",
        "idProducto",
        "idUnidad"
})
public interface ProductRecipeView {
    String getNombreProducto();
    String getNombreUnidad();
    Boolean getEsFraccionario();

    // Lógica interna al final
    Integer getIdProducto();
    Integer getIdUnidad();
}
