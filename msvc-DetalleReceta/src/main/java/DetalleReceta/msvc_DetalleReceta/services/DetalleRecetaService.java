package DetalleReceta.msvc_DetalleReceta.services;

import DetalleReceta.msvc_DetalleReceta.dtos.DetalleRecetaIUpdateQuantityRequestDTO;
import DetalleReceta.msvc_DetalleReceta.dtos.DetalleRecetaResponseDTO;
import DetalleReceta.msvc_DetalleReceta.models.entities.DetalleReceta;

import java.util.List;

public interface DetalleRecetaService {
    DetalleReceta findByIdDetalleReceta(Long IdDetalleReceta);
    List<DetalleReceta> findAllDetalleRecetas();
    List<DetalleRecetaResponseDTO> findAllDetalleRecetasConDetalles ();
    List<DetalleRecetaResponseDTO> findAllByIdRecetaConDetalles(Long idReceta);
    DetalleRecetaResponseDTO findByIdRecetasConDetalles(Long idDetalleReceta);
    DetalleReceta saveDetalleReceta(DetalleReceta detalleReceta);
    DetalleReceta detalleRecetaUpdateQuantity
            (Long id, DetalleRecetaIUpdateQuantityRequestDTO quantityRequest);
    void deletarTodoByIdReceta (Long idReceta);
    void deleteByidDetalleReceta(Long idDetalleReceta);
    boolean existsByIdReceta(Long idReceta);
    boolean existProductoInDetalleReceta(Long idProducto);
    List<DetalleRecetaResponseDTO> AsociarProductosAReceta(String nombreReceta);
    List<DetalleReceta> saveAll(String nombreReceta, List<DetalleReceta> detalleRecetas);
}
