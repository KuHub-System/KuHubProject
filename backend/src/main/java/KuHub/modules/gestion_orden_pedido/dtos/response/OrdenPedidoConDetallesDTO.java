package KuHub.modules.gestion_orden_pedido.dtos.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Detalle completo de una Orden de Pedido incluyendo todas sus líneas de entrega. */
public record OrdenPedidoConDetallesDTO(
        Integer idOrdenPedido,
        Integer idPedido,
        LocalDate fechaInicioPedido,
        LocalDate fechaFinPedido,
        Integer idProveedor,
        String nombreDistribuidora,
        String nombreProveedor,
        String telefonoProveedor,
        String emailProveedor,
        String direccionProveedor,
        LocalDateTime fechaCreacion,
        String estadoOrdenPedido,
        String observaciones,
        BigDecimal totalNeto,
        BigDecimal totalConIva,
        List<DetalleItemDTO> detalles
) {
    public record DetalleItemDTO(
            Long idDetalleOrdenPedido,
            Integer idProducto,
            String nombreProducto,
            String nombreCategoria,
            String abreviatura,
            String nombreUnidad,
            Boolean esFraccionario,
            BigDecimal cantidadSolicitada,
            BigDecimal precioNetoUnitario,
            BigDecimal precioConIvaUnitario,
            LocalDate fechaEntrega,
            Boolean entregado,
            String formatoContenido,
            String observacion   // porciones de solicitud: "pc1 2x(5)/ pc2 10"
    ) {}
}
