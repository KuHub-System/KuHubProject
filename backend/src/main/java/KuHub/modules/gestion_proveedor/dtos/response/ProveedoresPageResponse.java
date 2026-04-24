package KuHub.modules.gestion_proveedor.dtos.response;

import java.util.List;

/**
 * Record de response para listar proveedores con paginación asimétrica (20/10).
 * Incluye metadatos de paginación (página actual, total de páginas, total de registros).
 */
public record ProveedoresPageResponse(
        List<ProveedorListDTO> data,
        Integer page,
        Integer pageSize,
        Integer totalPaginas,
        Long totalRegistros
) {}
