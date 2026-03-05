package KuHub.modules.gestion_inventario.dtos.response.proyeccion;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.math.BigDecimal;

/**
 * Proyección para listado masivo de inventario.
 * Define el orden exacto de las llaves en el JSON de respuesta.
 */
@JsonPropertyOrder({
        "nombreProducto",
        "detalles",
        "stock",
        "esFraccionario",
        "idInventario",
        "idProducto"
})
public interface ProductInventoryBulkView {
    String getNombreProducto();
    String getDetalles();
    BigDecimal getStock();
    Boolean getEsFraccionario();
    Integer getIdInventario();
    Integer getIdProducto();
}
