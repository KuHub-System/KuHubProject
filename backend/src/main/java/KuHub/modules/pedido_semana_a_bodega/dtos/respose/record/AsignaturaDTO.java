package KuHub.modules.pedido_semana_a_bodega.dtos.respose.record;

public record AsignaturaDTO(
        Integer idAsignatura,  // [0]
        String nombreAsignatura, // [1]
        String codAsignatura     // [2]
) {
    public static AsignaturaDTO fromRow(Object[] row) {
        return new AsignaturaDTO(
                ((Number) row[0]).intValue(),
                (String) row[1],
                (String) row[2]
        );
    }
}
