package KuHub.modules.gestion_orden_pedido.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.List;

/** Respuesta del endpoint de abastecimiento: OPs CONFIRMADA agrupadas por OP → día de entrega → categoría → productos. */
public record AbastecimientoProveedorDTO(List<OrdenAbastecimiento> ordenes) {

    public record OrdenAbastecimiento(
            @JsonProperty("idOrdenPedido")       Integer idOrdenPedido,
            @JsonProperty("idPedido")            Integer idPedido,
            @JsonProperty("idProveedor")         Integer idProveedor,
            @JsonProperty("nombreDistribuidora") String nombreDistribuidora,
            @JsonProperty("nombreProveedor")     String nombreProveedor,
            @JsonProperty("telefonoProveedor")   String telefonoProveedor,
            @JsonProperty("emailProveedor")      String emailProveedor,
            @JsonProperty("entregas")            List<EntregaDia> entregas
    ) {}

    public record EntregaDia(
            @JsonProperty("fechaEntrega") String fechaEntrega,
            @JsonProperty("categorias")   List<CategoriaEntrega> categorias
    ) {}

    public record CategoriaEntrega(
            @JsonProperty("nombreCategoria") String nombreCategoria,
            @JsonProperty("productos")       List<ProductoEntrega> productos
    ) {}

    public record ProductoEntrega(
            @JsonProperty("idDetalleOrdenPedido") Long idDetalleOrdenPedido,
            @JsonProperty("idProducto")           Integer idProducto,
            @JsonProperty("nombreProducto")       String nombreProducto,
            @JsonProperty("abreviatura")          String abreviatura,
            @JsonProperty("esFraccionario")       Boolean esFraccionario,
            @JsonProperty("cantidadSolicitada")   BigDecimal cantidadSolicitada,
            @JsonProperty("marcaProducto")        String marcaProducto,
            @JsonProperty("entregado")            Boolean entregado,
            @JsonProperty("idInventario")         Integer idInventario,
            @JsonProperty("stock")                BigDecimal stock
    ) {}
}
