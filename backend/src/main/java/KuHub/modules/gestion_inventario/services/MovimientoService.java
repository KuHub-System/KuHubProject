package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.response.dto.MotionFilterRequestDTO;
import KuHub.modules.gestion_inventario.dtos.response.dto.PaginatedMotionDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkMovementResult;
import KuHub.modules.gestion_inventario.entity.BodegaTransito;
import KuHub.modules.gestion_inventario.entity.Inventario;
import KuHub.modules.gestion_inventario.entity.Movimiento;
import KuHub.modules.gestion_usuario.entity.Usuario;

import java.math.BigDecimal;

public interface MovimientoService {
    PaginatedMotionDTO findAllMotionWithFilter(MotionFilterRequestDTO request);
    boolean motionInUpdateInventory(Inventario oldInventory,BigDecimal delta,
                                    String typeMotion,Boolean ajustePositivo   // null para todos los tipos excepto AJUSTE_INVENTARIO
    );
    BulkMovementResult buildMovementForBulkUpdate(
            Inventario oldInventory,
            BigDecimal delta,
            String typeMotion,
            Usuario currentUser
    );
    boolean motionInUpdateTransitWarehouse(BodegaTransito oldTransit, BigDecimal newStock, String typeMotion);
    void save (Movimiento m);

}
