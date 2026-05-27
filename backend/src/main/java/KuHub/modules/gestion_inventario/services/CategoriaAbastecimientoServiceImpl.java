package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.CategoriaAbastecimientoItemDTO;
import KuHub.modules.gestion_inventario.dtos.response.CategoriaAbastecimientoDTO;
import KuHub.modules.gestion_inventario.repository.CategoriaAbastecimientoRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
public class CategoriaAbastecimientoServiceImpl implements CategoriaAbastecimientoService {

    /**Repositories*/
    @Autowired
    private CategoriaAbastecimientoRepository categoriaAbastecimientoRepository;

    /**Others*/
    @Autowired
    private ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public List<CategoriaAbastecimientoDTO> findAllCategoriaConfig() {
        String jsonStr = categoriaAbastecimientoRepository.findAllCategoriaConfigJson();
        if (jsonStr == null || jsonStr.isBlank() || "null".equals(jsonStr) || "[]".equals(jsonStr)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(jsonStr, new TypeReference<List<CategoriaAbastecimientoDTO>>() {});
        } catch (Exception e) {
            log.error("JSON={} | Error={}", jsonStr, e.getMessage());
            return List.of();
        }
    }

    @Override
    @Transactional
    public boolean updateCategoriaAbastecimiento(List<CategoriaAbastecimientoItemDTO> items) {
        for (CategoriaAbastecimientoItemDTO item : items) {
            categoriaAbastecimientoRepository.deleteByIdCategoriaCustom(item.getIdCategoria());
            if (Boolean.TRUE.equals(item.getInventario())) {
                categoriaAbastecimientoRepository.insertCategoriaAbastecimiento(
                        item.getIdCategoria(), "INVENTARIO");
            }
            if (Boolean.TRUE.equals(item.getBodegaTransito())) {
                categoriaAbastecimientoRepository.insertCategoriaAbastecimiento(
                        item.getIdCategoria(), "BODEGA_TRANSITO");
            }
        }
        return true;
    }
}
