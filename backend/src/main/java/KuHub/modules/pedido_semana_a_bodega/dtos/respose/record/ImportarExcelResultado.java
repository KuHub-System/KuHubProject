package KuHub.modules.pedido_semana_a_bodega.dtos.respose.record;

import java.math.BigDecimal;
import java.util.List;

public record ImportarExcelResultado(
        List<ResultadoItem> resultados,
        int totalOk,
        int totalNoEncontrados,
        int numeroSemanaExcel
) {
    /** estado: "ok" si el producto fue encontrado en BD, "no_encontrado" si no existe. */
    public record ResultadoItem(
            int fila,
            String nombreExcel,
            Integer idProducto,
            String nombreProducto,
            String nombreUnidadMedida,
            BigDecimal cantidad,
            String observacion,
            String estado
    ) {}
}
