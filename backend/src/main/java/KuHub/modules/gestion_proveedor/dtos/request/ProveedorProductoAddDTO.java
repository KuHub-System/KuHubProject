package KuHub.modules.gestion_proveedor.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * DTO de request para asignar un producto a un proveedor.
 * Al menos uno de precioNeto o precioConIva es obligatorio — el service deriva el otro.
 * Los precios aceptan formato chileno (1.234,567) o americano (1234.567).
 */
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class ProveedorProductoAddDTO {

    @NotNull(message = "El ID del producto es obligatorio")
    private Integer idProducto;

    private String marcaProducto;

    private String formatoContenido;

    private String precioNeto;

    private String precioConIva;
}
