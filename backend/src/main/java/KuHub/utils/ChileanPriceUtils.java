package KuHub.utils;

import java.math.BigDecimal;

/**
 * Utilidad para parsear y validar precios en formato chileno.
 * Soporta múltiples formatos: 1.234,567 | 1.234 | 1234,567 | 1234.567 | 1234
 */
public class ChileanPriceUtils {

    /**
     * Parsea un precio en formato chileno y retorna un BigDecimal.
     *
     * Soporta:
     * - 1.234,567 (formato chileno completo: punto=miles, coma=decimal)
     * - 1.234     (entero con separadores de miles)
     * - 1234,567  (sin separador de miles, coma=decimal)
     * - 1234.567  (formato americano: punto=decimal)
     * - 1234      (entero simple)
     *
     * @param input String con el precio a parsear
     * @return BigDecimal con el valor parseado
     * @throws IllegalArgumentException si el formato es inválido
     */
    public static BigDecimal parseChileanPrice(String input) {
        if (input == null || input.isBlank()) {
            throw new IllegalArgumentException("El precio no puede estar vacío. Formatos válidos: 1.234,567 | 1.234 | 1234,567 | 1234");
        }

        String cleaned = input.trim();

        // Si tiene coma y puntos: asumir formato chileno 1.234,567
        if (cleaned.contains(",") && cleaned.contains(".")) {
            int lastDot = cleaned.lastIndexOf('.');
            int lastComma = cleaned.lastIndexOf(',');

            // Validar que la coma sea después del punto (coma como decimal)
            if (lastComma > lastDot) {
                try {
                    // Remover puntos (miles) y reemplazar coma por punto (decimal)
                    String normalized = cleaned.replace(".", "").replace(",", ".");
                    return new BigDecimal(normalized);
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException(
                        "Formato de precio inválido: '" + input + "'. Use: 1.234,567"
                    );
                }
            } else {
                throw new IllegalArgumentException(
                    "Formato de precio inválido: '" + input + "'. La coma debe ser decimal y el punto separador de miles. Use: 1.234,567"
                );
            }
        }

        // Si solo tiene coma: 1234,567 (chileno sin miles)
        if (cleaned.contains(",") && !cleaned.contains(".")) {
            try {
                String normalized = cleaned.replace(",", ".");
                return new BigDecimal(normalized);
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException(
                    "Formato de precio inválido: '" + input + "'. Use: 1234,567"
                );
            }
        }

        // Si solo tiene punto: ambiguo, pero seguir lógica de separador de miles
        if (cleaned.contains(".") && !cleaned.contains(",")) {
            // Si termina con 3 dígitos después del punto (1.234), es separador de miles
            if (cleaned.matches(".*\\.\\d{3}$")) {
                try {
                    return new BigDecimal(cleaned.replace(".", ""));
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException(
                        "Formato de precio inválido: '" + input + "'. Use: 1.234 (entero) o 1234.567 (decimal americano)"
                    );
                }
            }
            // Si termina con 1 o 2 dígitos (1.5 o 1.56), es decimal americano
            if (cleaned.matches(".*\\.\\d{1,2}$")) {
                try {
                    return new BigDecimal(cleaned);
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException(
                        "Formato de precio inválido: '" + input + "'. Use: 1234.567 (decimal americano)"
                    );
                }
            }
            // Defecto: asumir separador de miles
            try {
                return new BigDecimal(cleaned.replace(".", ""));
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException(
                    "Formato de precio inválido: '" + input + "'"
                );
            }
        }

        // Sin separadores: número entero
        try {
            return new BigDecimal(cleaned);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(
                "Formato de precio inválido: '" + input + "'. Use un número válido"
            );
        }
    }

    /**
     * Valida si un string es un precio en formato válido chileno.
     *
     * @param input String a validar
     * @return true si es un formato válido, false en caso contrario
     */
    public static boolean isValidChileanPrice(String input) {
        if (input == null || input.isBlank()) {
            return false;
        }

        try {
            parseChileanPrice(input);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
