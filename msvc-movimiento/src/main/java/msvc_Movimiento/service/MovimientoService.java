package msvc_Movimiento.service;


import msvc_Movimiento.dtos.MovimientoDTO;

import java.util.List;

public interface MovimientoService {

    MovimientoDTO crearMovimiento(MovimientoDTO movimientoDTO);
    MovimientoDTO findById(Long id);
    List<MovimientoDTO> findAll();
    List<MovimientoDTO> findByIdInventario(Long idInventario);
    MovimientoDTO update(Long id, MovimientoDTO movimientoDTO);
    List<MovimientoDTO> findByIdProducto(Long idproducto);
    void delete(Long id);
}
