package KuHub.modules.gestion_proveedor.dtos.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * DTO de request para actualizar un proveedor existente.
 * Permite actualización parcial de todos los campos editables.
 */
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class ProveedorUpdateDTO {

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

    /** Estado: DISPONIBLE o NO_DISPONIBLE. */
    private String estadoProveedor;
}
