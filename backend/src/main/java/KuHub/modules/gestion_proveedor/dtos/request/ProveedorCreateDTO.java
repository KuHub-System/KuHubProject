package KuHub.modules.gestion_proveedor.dtos.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * DTO de request para crear un nuevo proveedor.
 * Todas las validaciones se declaran aquí para evitar if-validations en el service.
 */
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class ProveedorCreateDTO {

    @Pattern(
            regexp = "^(\\d{1,2}\\.\\d{3}\\.\\d{3}-[\\dkK]|\\d{7,8}-[\\dkK])?$",
            message = "El RUT debe tener formato válido chileno (ej: 12.345.678-9 o 12345678-9)"
    )
    @Size(max = 13, message = "El RUT no puede exceder 13 caracteres")
    private String rutProveedor;

    @NotBlank(message = "El nombre de la distribuidora es obligatorio")
    @Size(max = 100, message = "El nombre de la distribuidora no puede exceder 100 caracteres")
    private String nombreDistribuidora;

    @NotBlank(message = "El nombre del proveedor (contacto) es obligatorio")
    @Size(max = 100, message = "El nombre del proveedor no puede exceder 100 caracteres")
    private String nombreProveedor;

    @NotBlank(message = "El teléfono del proveedor es obligatorio")
    @Size(max = 20, message = "El teléfono no puede exceder 20 caracteres")
    private String telefonoProveedor;

    @Email(message = "El email debe tener un formato válido")
    @Size(max = 150, message = "El email no puede exceder 150 caracteres")
    private String emailProveedor;

    /** Estado inicial: DISPONIBLE o NO_DISPONIBLE. Si es null, el backend asigna DISPONIBLE. */
    private String estadoProveedor;
}
