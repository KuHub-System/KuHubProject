package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.dto.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.response.WarehousePageDTO;
import KuHub.modules.gestion_inventario.dtos.response.WarehousesPageDTO;
import KuHub.modules.gestion_inventario.repository.BodegaTransitoRepository;
import KuHub.utils.PaginationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BodegaTransitoServiceImpl implements BodegaTransitoService{

    @Autowired
    private BodegaTransitoRepository bodegaTransitoRepository;

    // =========================================================================================
    // MÉTODOS PÚBLICOS DE BÚSQUEDA Y PAGINACIÓN
    // =========================================================================================

    /**
     * Búsqueda por nombre o descripción en la bodega de tránsito.
     */
    @Override
    @Transactional(readOnly = true)
    public WarehousesPageDTO searchTransitWarehousePage(String searchTerm, Integer pageRequested) {
        String term = normalize(searchTerm);

        long totalRegistros = bodegaTransitoRepository.countSearchTransitWarehouse(term);

        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(pageRequested, totalRegistros);

        List<Object[]> rows = bodegaTransitoRepository.searchTransitWarehousePage(
                term,
                paging.limit(),
                paging.offset()
        );

        return buildResponse(rows, paging, totalRegistros);
    }

    /**
     * Búsqueda por código de producto en la bodega de tránsito.
     */
    @Override
    @Transactional(readOnly = true)
    public WarehousesPageDTO searchWarehouseByCodProduct(String codProducto, Integer pageRequested) {
        String term = normalize(codProducto);

        // 1. Conteo total basado en el código
        long totalRegistros = bodegaTransitoRepository.countSearchWarehouseByCodProduct(term);

        // 2. Cálculo de paginación asimétrica (20/10)
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(pageRequested, totalRegistros);

        // 3. Consulta de datos con todos los atributos
        List<Object[]> rows = bodegaTransitoRepository.searchWarehouseByCodProductPage(
                term,
                paging.limit(),
                paging.offset()
        );

        return buildResponse(rows, paging, totalRegistros);
    }

    /**
     * Búsqueda dinámica con filtros combinados en la bodega de tránsito.
     */
    @Override
    @Transactional(readOnly = true)
    public WarehousesPageDTO getPagedTransitWarehouse(FilterInventoryPageDTO filter) {

        Integer[] categoriasIds = (filter.getCategoriasIds() == null || filter.getCategoriasIds().isEmpty())
                ? null
                : filter.getCategoriasIds().toArray(new Integer[0]);

        Integer[] unidadesIds = (filter.getUnidadesIds() == null || filter.getUnidadesIds().isEmpty())
                ? null
                : filter.getUnidadesIds().toArray(new Integer[0]);

        boolean useCategorias = categoriasIds != null && categoriasIds.length > 0;
        boolean useUnidades   = unidadesIds   != null && unidadesIds.length > 0;
        boolean soloStockBajo = Boolean.TRUE.equals(filter.getSoloStockBajo());

        long totalRegistros = bodegaTransitoRepository.countTransitWarehouseFiltered(
                useCategorias,
                categoriasIds,
                useUnidades,
                unidadesIds,
                soloStockBajo
        );

        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(filter.getPage(), totalRegistros);

        List<Object[]> rows = bodegaTransitoRepository.findTransitWarehousePage(
                useCategorias,
                categoriasIds,
                useUnidades,
                unidadesIds,
                soloStockBajo,
                paging.limit(),
                paging.offset()
        );

        return buildResponse(rows, paging, totalRegistros);
    }


    // =========================================================================================
    // <------ TODOS MÉTODOS PRIVADOS ------>
    // =========================================================================================

    /** Normalización reutilizable (searchTerm) */
    private String normalize(String value) {
        return (value == null || value.trim().isEmpty())
                ? ""
                : value.trim();
    }

    /** Factory del response (evita repetir el constructor) */
    private WarehousesPageDTO buildResponse(List<Object[]> rows, PaginationUtils.PagingResult paging, long total) {
        return new WarehousesPageDTO(
                mapRows(rows),
                paging.page(),
                paging.limit(),
                paging.totalPages(),
                total
        );
    }

    /** Mapeo de rows → DTO */
    private List<WarehousePageDTO> mapRows(List<Object[]> rows) {
        return rows.stream()
                .map(this::mapToWarehousePageDTO)
                .collect(Collectors.toList());
    }

    /**
     * MÉTODOS PRIVADOS PARA MAPEO
     * Los índices coinciden exactamente con el SELECT de la consulta nativa
     */
    private WarehousePageDTO mapToWarehousePageDTO(Object[] row) {
        return new WarehousePageDTO(
                ((Number) row[8]).intValue(),  // idBodegaTransito
                ((Number) row[9]).intValue(),  // idInventario
                ((Number) row[10]).intValue(), // idProducto
                (String) row[0],               // nombreProducto
                (String) row[1],               // codProducto
                (String) row[2],               // descripcionProducto
                ((Number) row[11]).intValue(), // idCategoria
                (String) row[3],               // nombreCategoria
                ((Number) row[12]).intValue(), // idUnidad
                (String) row[6],               // nombreUnidad
                (Boolean) row[7],              // esFraccionario
                (BigDecimal) row[4],           // stock (en tránsito)
                (BigDecimal) row[5]            // stockLimit (en tránsito)
        );
    }
}
