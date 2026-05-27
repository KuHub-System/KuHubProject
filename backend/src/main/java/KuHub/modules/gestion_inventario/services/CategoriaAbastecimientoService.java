package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.CategoriaAbastecimientoItemDTO;
import KuHub.modules.gestion_inventario.dtos.response.CategoriaAbastecimientoDTO;

import java.util.List;

public interface CategoriaAbastecimientoService {

    /** Retorna todas las categorías activas con sus flags de abastecimiento. */
    List<CategoriaAbastecimientoDTO> findAllCategoriaConfig();

    /** Reemplaza la configuración de abastecimiento para cada categoría de la lista. */
    boolean updateCategoriaAbastecimiento(List<CategoriaAbastecimientoItemDTO> items);
}
