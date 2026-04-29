package KuHub.modules.pedido_semana_a_bodega.dtos.respose.record;

import java.math.BigDecimal;

public record DetailsByUpdateRec(
        Integer idDetalle,
        Integer idProducto,
        BigDecimal cantidad
) {}
