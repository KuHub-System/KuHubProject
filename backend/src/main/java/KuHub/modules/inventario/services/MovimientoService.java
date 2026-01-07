package KuHub.modules.inventario.services;

import KuHub.modules.inventario.dtos.MotionAnswerDTO;
import KuHub.modules.inventario.dtos.MotionCreateDTO;
import KuHub.modules.inventario.dtos.MotionFilterRequestDTO;

import java.util.List;

public interface MovimientoService {
    MotionAnswerDTO saveMotion (MotionCreateDTO m);
    List<MotionAnswerDTO> findAllMotionFilter (MotionFilterRequestDTO filter);
}
