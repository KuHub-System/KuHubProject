package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.dto.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.ValidateTransitStockDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.WarehouseWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.response.WarehousePageDTO;
import KuHub.modules.gestion_inventario.dtos.response.WarehousesPageDTO;
import KuHub.modules.gestion_inventario.entity.BodegaTransito;
import KuHub.modules.gestion_inventario.entity.Inventario;
import KuHub.modules.gestion_inventario.entity.Producto;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.repository.BodegaTransitoRepository;
import KuHub.modules.gestion_inventario.repository.ProductoRepository;
import KuHub.utils.PaginationUtils;
import KuHub.utils.StringUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BodegaTransitoServiceImpl implements BodegaTransitoService{
    /**Services*/
    @Autowired
    private MovimientoService movimientoService;
    /**Repositories*/
    @Autowired
    private BodegaTransitoRepository bodegaTransitoRepository;
    @Autowired
    private ProductoRepository productoRepository;

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
        boolean ocultarAgotados = Boolean.TRUE.equals(filter.getOcultarAgotados());
        boolean orderAsc = true;
        if (Boolean.TRUE.equals(filter.getIsDesc())) {
            orderAsc = false;
        } else if (Boolean.TRUE.equals(filter.getIsAsc())) {
            orderAsc = true;
        }


        long totalRegistros = bodegaTransitoRepository.countTransitWarehouseFiltered(
                useCategorias, categoriasIds,
                useUnidades, unidadesIds,
                soloStockBajo, ocultarAgotados
        );

        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(filter.getPage(), totalRegistros);

        List<Object[]> rows = bodegaTransitoRepository.findTransitWarehousePage(
                useCategorias,
                categoriasIds,
                useUnidades,
                unidadesIds,
                soloStockBajo,
                ocultarAgotados,
                orderAsc,
                paging.limit(),
                paging.offset()
        );

        return buildResponse(rows, paging, totalRegistros);
    }

    /**Metodo para validar el stock con el id, antes de enviar el update para vereficar que no sofriran cambios en paralo
     * sincronizando con el retorno exato si hay cambio y reveficar si no eliminan el iten en medio proceso*/
    @Transactional(readOnly = true)
    @Override
    public Object validateTransitStockBeforeUpdating(ValidateTransitStockDTO request) {

        // 1. Caso: El registro fue eliminado (activo = false) en paralelo
        if (bodegaTransitoRepository.existsByIdBodegaTransitoAndActivo(request.getIdBodegaTransito(), false)) {
            throw new GestionInventarioException(
                    "El registro en tránsito fue eliminado por otro usuario antes de procesar la petición",
                    HttpStatus.GONE // 410 Gone
            );
        }

        // 2. Caso: El stock fue actualizado por otro usuario (traslado, devolución o ajuste)
        if (!bodegaTransitoRepository.existsByIdBodegaTransitoAndStock(request.getIdBodegaTransito(), request.getValidateStock())) {

            // Obtenemos el registro con los 13 campos
            Object[] row = bodegaTransitoRepository.findSingleTransitById(request.getIdBodegaTransito())
                    .orElseThrow(() -> new GestionInventarioException("Error al sincronizar datos"
                            , HttpStatus.NOT_FOUND));

            // Retornamos un único WarehousePageDTO usando tu método de mapeo privado
            return mapToWarehousePageDTO(row);
        }

        return true; // No hay conflictos, el PATCH puede proceder
    }

    /**
     * Metodo para actualizar la bodega de tránsito con validaciones de producto e inventario.
     * Sigue la estructura de updateInventoryWithProduct pero enfocado en el stock en tránsito.
     * ademas del metodo que realizar movimientos
     */
    @Transactional
    @Override
    public boolean updateTransitWarehouseWithProduct(WarehouseWithProductUpdateDTO request) {
        // Obtener el registro de tránsito y sus relaciones
        BodegaTransito oldTransit = bodegaTransitoRepository.findById(request.getIdBodegaTransito())
                .orElseThrow(() -> new GestionInventarioException("El registro en tránsito no existe", HttpStatus.NOT_FOUND));

        Inventario oldInventario = oldTransit.getInventario();
        Producto oldProducto = oldInventario.getProducto();

        // Validaciones de Producto (Idéntico a tu ejemplo para mantener consistencia)
        String nombreProducto = StringUtils.capitalizarPalabras(request.getNombreProducto());
        String codigoProducto = StringUtils.normalizeSpaces(request.getCodigoProducto());

        if (!oldProducto.getNombreProducto().equals(nombreProducto)) {
            if (productoRepository.existsByNombreProducto(nombreProducto)) {
                throw new GestionInventarioException("El producto ya existe", HttpStatus.CONFLICT);
            }
            oldProducto.setNombreProducto(nombreProducto);
        }

        if (codigoProducto != null && !codigoProducto.isBlank()) {
            if (!codigoProducto.equals(oldProducto.getCodProducto())) {
                if (productoRepository.existsBycodProductoAndActivo(codigoProducto, true)) {
                    throw new GestionInventarioException("El código de producto ya está en uso", HttpStatus.CONFLICT);
                }
                oldProducto.setCodProducto(codigoProducto);
            }
        }

        if (!java.util.Objects.equals(oldProducto.getDescripcionProducto(), request.getDescripcionProducto())) {
            oldProducto.setDescripcionProducto(request.getDescripcionProducto());
        }

        // Validaciones de Categoría y Unidad
        if (!oldProducto.getCategoria().getIdCategoria().equals(request.getIdCategoria())) {
            oldProducto.setCategoriaId(request.getIdCategoria());
        }
        if (!oldProducto.getUnidadMedida().getIdUnidad().equals(request.getIdUnidadMedida())) {
            oldProducto.setUnidadMedidaId(request.getIdUnidadMedida());
        }

        // Validar Stock en Tránsito y generar movimiento personalizado
        if (!oldTransit.getStock().equals(request.getStock())) {
            // Llamada al nuevo método en MovimientoService exclusivo para tránsito
            boolean validar = movimientoService.motionInUpdateTransitWarehouse(oldTransit, request.getStock(), request.getTipoMovimiento());
            if (validar) {
                log.info("Bodega de Tránsito actualizada y movimiento de [{}] registrado. Producto: '{}' | Nuevo Stock Tránsito: {}",
                        request.getTipoMovimiento().toUpperCase(),
                        oldProducto.getNombreProducto(),
                        request.getStock());
            }
            oldTransit.setStock(request.getStock());
        }

        if (!oldTransit.getStockLimit().equals(request.getStockLimit())) {
            oldTransit.setStockLimit(request.getStockLimit());
        }

        bodegaTransitoRepository.save(oldTransit);
        return true;
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
