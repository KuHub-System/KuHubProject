package KuHub.modules.gestion_usuario.dtos.record;

import java.util.stream.Collectors;
import java.util.stream.Stream;

public record UserIdNameDTO(Integer id, String nombreCompleto) {
    public static UserIdNameDTO crearDesdeDatos(Integer id, String n, String sn, String ap, String am) {
        String nombreFinal = Stream.of(n, sn, ap, am)
                .filter(val -> val != null && !val.isBlank())
                .collect(Collectors.joining(" "));

        return new UserIdNameDTO(id, nombreFinal);
    }
}
