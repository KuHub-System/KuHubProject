package KuHub.modules.gestion_proveedor.dtos.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import KuHub.modules.gestion_proveedor.dtos.validators.ValidChileanPrice;

/**
 * DTO para actualizar el precio de un producto en un proveedor.
 *
 * El precioProducto acepta múltiples formatos chilenos:
 * - 1.234,567 (punto=miles, coma=decimal)
 * - 1.234 (entero con separador de miles)
 * - 1234,567 (sin separador de miles)
 * - 1234.567 (formato americano)
 * - 1234 (entero simple)
 *
 * La conversión a BigDecimal se realiza en el service usando ChileanPriceUtils.
 * El idProveedorProducto es la PK de la relación proveedor-producto.
 * Se obtiene de los path parameters de la URL: PATCH /proveedor/productos/{idProveedorProducto}
 */
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class ProveedorProductoUpdateDTO {

    @NotNull(message = "El precio es obligatorio")
    @NotBlank(message = "El precio no puede estar en blanco")
    @ValidChileanPrice(message = "Formato de precio inválido. Use: 1.234,567 | 1.234 | 1234,567 | 1234")
    private String precioProducto;
}
