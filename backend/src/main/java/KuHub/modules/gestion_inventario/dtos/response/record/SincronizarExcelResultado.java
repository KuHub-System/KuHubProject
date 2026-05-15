package KuHub.modules.gestion_inventario.dtos.response.record;

import java.math.BigDecimal;
import java.util.List;

public record SincronizarExcelResultado(
        List<ResultadoItem> resultados,
        int totalSincronizados,
        int totalNoEncontrados,
        int totalFilasProcesadas,
        String nombreHojaLeida,
        int colNombreDetectada,
        int colStockDetectada
) {
    public record ResultadoItem(
            int fila,
            String nombreExcel,
            Integer idInventario,
            Integer idProducto,
            String nombreProducto,
            BigDecimal stockExcel,
            BigDecimal stockAnterior,
            String unidadMedidaExcel,
            Short idUnidadMedida,
            String estado
    ) {}
}
