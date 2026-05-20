package KuHub.modules.gestion_proveedor.dtos.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

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

    @NotBlank(message = "El RUT del proveedor es obligatorio")
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

    @NotBlank(message = "El email del proveedor es obligatorio")
    @Email(message = "El email debe tener un formato válido")
    @Size(max = 150, message = "El email no puede exceder 150 caracteres")
    private String emailProveedor;

    /** Dirección del proveedor (opcional). Se usa como C3 en la plantilla Excel. */
    @Size(max = 255, message = "La dirección no puede exceder 255 caracteres")
    private String direccionProveedor;

    /** Estado inicial: DISPONIBLE o NO_DISPONIBLE. Si es null, el backend asigna DISPONIBLE. */
    private String estadoProveedor;

    /** Lista de días de entrega del proveedor (opcional al crear). */
    @Valid
    private List<DiaEntregaDTO> diasEntrega;
}
