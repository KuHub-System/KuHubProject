package KuHub.modules.gestion_inventario.dtos.response.record;

import java.math.BigDecimal;
import java.util.List;

/**
 * Resultado del descuento de stock disponible (salida de bodega de tránsito).
 * Por cada producto indica cómo terminó el descuento, para que el frontend pueda
 * avisar al usuario de sincronizaciones por procesos en paralelo.
 */
public record RestarDisponibleResult(List<ItemResult> resultados) {

    /**
     * estado:
     *  - "OK":            se descontó la cantidad solicitada; el disponible coincidía con la vista.
     *  - "SINCRONIZADO":  se descontó, pero el disponible real difería de lo que veía el usuario.
     *  - "INSUFICIENTE":  un proceso en paralelo dejó el disponible por debajo; NO se descontó nada.
     */
    public record ItemResult(
            Integer idProducto,
            String estado,
            BigDecimal disponibleReal,
            BigDecimal restado
    ) {}
}
