package KuHub.modules.gestion_proveedor.dtos.response;

/**
 * Record para responder con los detalles de un día de entrega de un proveedor.
 * Se usa en ProveedorDetalleDTO para listar todos los días configurados.
 */
public record DiaEntregaResponseDTO(
        Integer idDiaEntrega,
        String diaSemana,
        String horaInicioEntrega,
        String horaFinEntrega
) {
}
