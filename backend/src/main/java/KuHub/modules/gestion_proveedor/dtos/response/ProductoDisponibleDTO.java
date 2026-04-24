package KuHub.modules.gestion_proveedor.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

/**
 * DTO de respuesta para productos disponibles que pueden ser asignados a un proveedor.
 * Incluye información de producto, categoría y unidad de medida.
 * Deserializa desde JSON con snake_case (id_producto, nombre_producto, etc.)
 */
@JsonPropertyOrder({
        "idProducto",
        "nombreProducto",
        "idCategoria",
        "nombreCategoria",
        "idUnidad",
        "nombreUnidad",
        "abreviatura",
        "esFraccionario"
})
public record ProductoDisponibleDTO(
        @JsonProperty("id_producto") Integer idProducto,
        @JsonProperty("nombre_producto") String nombreProducto,
        @JsonProperty("id_categoria") Short idCategoria,
        @JsonProperty("nombre_categoria") String nombreCategoria,
        @JsonProperty("id_unidad") Short idUnidad,
        @JsonProperty("nombre_unidad") String nombreUnidad,
        @JsonProperty("abreviatura") String abreviatura,
        @JsonProperty("es_fraccionario") Boolean esFraccionario
) {
    /**
     * Factory method para construir desde un Object[] de consulta nativa.
     */
    public static ProductoDisponibleDTO fromRow(Object[] row) {
        return new ProductoDisponibleDTO(
                ((Number) row[0]).intValue(),
                (String) row[1],
                ((Number) row[2]).shortValue(),
                (String) row[3],
                ((Number) row[4]).shortValue(),
                (String) row[5],
                (String) row[6],
                (Boolean) row[7]
        );
    }
}
