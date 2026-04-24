package KuHub.modules.gestion_proveedor.dtos.validators;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Anotación de validación para precios en formato chileno.
 * Soporta: 1.234,567 | 1.234 | 1234,567 | 1234.567 | 1234
 */
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ChileanPriceValidator.class)
public @interface ValidChileanPrice {
    String message() default "Formato de precio inválido. Use formatos chilenos: 1.234,567 | 1.234 | 1234,567";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
