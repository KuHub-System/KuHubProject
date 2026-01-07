package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.MotionAnswerDTO;
import KuHub.modules.gestion_inventario.dtos.MotionCreateDTO;
import KuHub.modules.gestion_inventario.dtos.MotionFilterRequestDTO;

import java.util.List;

public interface MovimientoService {
    MotionAnswerDTO saveMotion (MotionCreateDTO m);
    List<MotionAnswerDTO> findAllMotionFilter (MotionFilterRequestDTO filter);
}
