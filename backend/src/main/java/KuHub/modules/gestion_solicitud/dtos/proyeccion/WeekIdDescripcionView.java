package KuHub.modules.gestion_solicitud.dtos.proyeccion;

public interface WeekIdDescripcionView {
    // Mapea la columna "ID" de tu consulta
    Integer getId();

    // Mapea el alias "ETIQUETA_SEMANA" (Spring convierte snake_case a camelCase automáticamente)
    String getEtiquetaSemana();
}
