package KuHub.modules.gestion_proveedor.dtos.validators;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import KuHub.utils.ChileanPriceUtils;

/**
 * Validador de precios en formato chileno.
 * Usa ChileanPriceUtils para verificar si el formato es válido.
 */
public class ChileanPriceValidator implements ConstraintValidator<ValidChileanPrice, String> {

    @Override
    public void initialize(ValidChileanPrice annotation) {
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // Si el valor es null o vacío, dejamos que @NotNull se encargue
        if (value == null || value.isBlank()) {
            return true;
        }

        // Validar que sea un formato chileno válido
        boolean isValid = ChileanPriceUtils.isValidChileanPrice(value);

        if (!isValid) {
            // Personalizar el mensaje de error con detalles del formato inválido
            String mensaje = String.format(
                "El precio '%s' tiene un formato inválido. Formatos válidos: 1.234,567 (chileno) | 1.234 (con miles) | 1234,567 (sin miles) | 1234 (entero)",
                value
            );
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(mensaje)
                    .addConstraintViolation();
        }

        return isValid;
    }
}
