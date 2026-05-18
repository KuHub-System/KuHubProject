package KuHub.modules.gestion_proveedor.dtos.request;

import lombok.*;

/**
 * DTO para actualizar precio y metadata de un producto en un proveedor.
 * Al menos uno de precioNeto o precioConIva es obligatorio — el service deriva el otro.
 * Se obtiene el idProveedorProducto del path: PATCH /proveedor/productos/{idProveedorProducto}
 */
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class ProveedorProductoUpdateDTO {

    private String marcaProducto;

    private String formatoContenido;

    private String precioNeto;

    private String precioConIva;
}
