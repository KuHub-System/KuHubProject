package KuHub.modules.gestion_proveedor.dtos.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.List;

/**
 * =====================================================
 * DTO MAESTRO PARA COTIZACIÓN AGRUPADA POR PROVEEDOR
 * =====================================================
 *
 * Estructura jerárquica (basada en consulta SQL nativa):
 *
 * CotizacionProveedorDTO (maestro)
 * └── ProveedorGrupo
 *     ├── Información del proveedor
 *     └── CategoriaGrupo[]
 *         └── ProductoJson[]
 *
 * Los proveedores SIN relación se agrupan al final (idProveedor = null).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class CotizacionProveedorDTO {

    /**
     * Registro maestro: lista de proveedores agrupados con su cotización.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CotizacionResponse(
            @JsonProperty("cotizacion") List<ProveedorGrupo> cotizacion
    ) {
        public static CotizacionResponse fromJson(String jsonStr) {
            List<ProveedorGrupo> proveedores = parseProveedores(jsonStr);
            return new CotizacionResponse(proveedores);
        }

        private static List<ProveedorGrupo> parseProveedores(String jsonStr) {
            // Placeholder: será procesado en el service con ObjectMapper
            return List.of();
        }
    }

    /**
     * Proveedor con sus datos de contacto y categorías de productos.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProveedorGrupo(
            @JsonProperty("idProveedor") Integer idProveedor,
            @JsonProperty("nombreDistribuidora") String nombreDistribuidora,
            @JsonProperty("nombreProveedor") String nombreProveedor,
            @JsonProperty("telefono") String telefono,
            @JsonProperty("email") String email,
            @JsonProperty("totalProductos") Integer totalProductos,
            @JsonProperty("categorias") List<CategoriaGrupo> categorias
    ) {}

    /**
     * Categoría dentro de un proveedor con lista de productos.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CategoriaGrupo(
            @JsonProperty("idCategoria") Integer idCategoria,
            @JsonProperty("nombreCategoria") String nombreCategoria,
            @JsonProperty("productos") List<ProductoJson> productos
    ) {}

    /**
     * Producto con cantidad solicitada, precio unitario y subtotal.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProductoJson(
            @JsonProperty("idProducto") Integer idProducto,
            @JsonProperty("nombreProducto") String nombreProducto,
            @JsonProperty("abreviatura") String abreviatura,
            @JsonProperty("cantidadTotal") BigDecimal cantidadTotal,
            @JsonProperty("precioUnitario") BigDecimal precioUnitario,
            @JsonProperty("subtotal") BigDecimal subtotal
    ) {}
}
