package KuHub.modules.dashboard.dto;

public record ProductoCriticoDTO(
    String nombreProducto,
    double stock,
    double stockLimit,
    String categoria,
    String unidad
) {}
