package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.MotionAnswerDTO;
import KuHub.modules.gestion_inventario.dtos.MotionCreateDTO;
import KuHub.modules.gestion_inventario.dtos.MotionFilterRequestDTO;
import KuHub.modules.gestion_inventario.entity.Inventario;

import java.util.List;

public interface MovimientoService {
    boolean saveMotion(MotionCreateDTO m, Inventario inventario);



    //MotionAnswerDTO saveMotion (MotionCreateDTO m);
    //List<MotionAnswerDTO> findAllMotionFilter (MotionFilterRequestDTO filter);
}
