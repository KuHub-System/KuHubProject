package KuHub.modules.gestion_academica.dtos.record;

/**
 * Vista de una reserva de sala activa.
 * Construida desde consulta nativa con columnas individuales (ver ReservaSalaRepository).
 * Mapeada con fromRow(Object[] row) en ReservaSalaServiceImp — sin ObjectMapper.
 */
public record ReservaActivaView(
        String nombreAsignatura,  // row[0]
        String nombreSeccion,     // row[1]
        String nombreSala,        // row[2]
        String codSala,           // row[3]
        String diaSemana,         // row[4]
        Integer numeroBloque,     // row[5]
        String horaInicio,        // row[6]
        String horaFin            // row[7]
) {
    public static ReservaActivaView fromRow(Object[] row) {
        return new ReservaActivaView(
                (String) row[0],
                (String) row[1],
                (String) row[2],
                (String) row[3],
                (String) row[4],
                ((Number) row[5]).intValue(),
                row[6].toString(),
                row[7].toString()
        );
    }
}
