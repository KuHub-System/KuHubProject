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
}
