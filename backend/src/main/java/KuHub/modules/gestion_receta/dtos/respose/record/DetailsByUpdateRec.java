package KuHub.modules.gestion_receta.dtos.respose.record;

import java.math.BigDecimal;

public record DetailsByUpdateRec(
        Integer idDetalle,
        Integer idProducto,
        BigDecimal cantidad
) {}
