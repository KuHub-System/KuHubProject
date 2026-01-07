package KuHub.utils;

import java.util.Arrays;
import java.util.stream.Collectors;

public class StringUtils {

    public static String capitalizarPalabras(String texto) {
        if (texto == null || texto.isBlank()) return texto;

        return Arrays.stream(texto.trim().split("\\s+"))
                .map(p -> p.substring(0, 1).toUpperCase() + p.substring(1).toLowerCase())
                .collect(Collectors.joining(" "));
    }

    /**
     * Normaliza los espacios en un texto:
     *  * 1. Elimina todos los espacios al inicio y al final.
     *  * 2. Reduce cualquier grupo de espacios consecutivos en el medio a un solo espacio.
     *  * 3. No altera mayúsculas/minúsculas.
     */
    public static String normalizeSpaces(String texto) {
        if (texto == null) return null;
        /**trim() quita espacios al inicio y final
        replaceAll("\\s+", " ") reduce múltiples espacios internos a uno solo*/
        return texto.trim().replaceAll("\\s+", " ");
    }

    /**
     * Elimina las tildes de un texto.
     * Ejemplo: "MÁS RECIENTES" -> "MAS RECIENTES"
     */
    public static String removeAccents(String texto) {
        if (texto == null) return null;

        // Método manual (Rápido y explícito, como pediste)
        return texto
                .replace("Á", "A").replace("á", "a")
                .replace("É", "E").replace("é", "e")
                .replace("Í", "I").replace("í", "i")
                .replace("Ó", "O").replace("ó", "o")
                .replace("Ú", "U").replace("ú", "u");

        // Opción PRO: Si prefieres usar java.text.Normalizer (cubre más casos):
        // String nfdNormalizedString = Normalizer.normalize(texto, Normalizer.Form.NFD);
        // Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        // return pattern.matcher(nfdNormalizedString).replaceAll("");
    }

    /**
     * Prepara un texto "humano" para ser usado como clave de Enum o DB.
     * Pasa a mayúsculas.
     * Reemplaza espacios por guion bajo (_).
     * Quita las tildes.
     * Ejemplo: "Más Recientes" -> "MAS_RECIENTES"
     */
    public static String normalizeToEnumKey(String texto) {
        if (texto == null || texto.isBlank()) return null;

        String normalizado = texto.trim().toUpperCase();
        normalizado = normalizado.replace(" ", "_");

        return removeAccents(normalizado);
    }
}
