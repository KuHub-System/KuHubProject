package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.MotionAnswerDTO;
import KuHub.modules.gestion_inventario.dtos.MotionCreateDTO;
import KuHub.modules.gestion_inventario.dtos.MotionFilterRequestDTO;
import KuHub.modules.gestion_inventario.entity.Inventario;
import KuHub.modules.gestion_inventario.entity.Movimiento;

import java.math.BigDecimal;
import java.util.List;

public interface MovimientoService {
    boolean saveMotion(MotionCreateDTO m, Inventario inventario);
    boolean motionInUpdateInventory(Inventario oldInventory, BigDecimal newStock, String typeMotion);
    void save (Movimiento m);

    //MotionAnswerDTO saveMotion (MotionCreateDTO m);
    //List<MotionAnswerDTO> findAllMotionFilter (MotionFilterRequestDTO filter);
}
