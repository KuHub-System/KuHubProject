package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.dtos.request.WarehouseWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkWarehouseProcess;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkWarehousesPage;
import KuHub.modules.gestion_inventario.dtos.response.record.WarehousesPage;
import KuHub.modules.gestion_inventario.entity.BodegaTransito;
import KuHub.modules.gestion_inventario.entity.Inventario;
import KuHub.modules.gestion_inventario.entity.Producto;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.exceptions.StockDesincronizadoException;
import KuHub.modules.gestion_inventario.exceptions.StockInsuficienteException;
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
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BodegaTransitoServiceImpl implements BodegaTransitoService{
    /**Services*/
    @Autowired
    private MovimientoService movimientoService;
    @Autowired
    private InventarioService inventarioService;
    /**Repositories*/
    @Autowired
    private BodegaTransitoRepository bodegaTransitoRepository;
    @Autowired
    private ProductoRepository productoRepository;

    // =========================================================================================
    // MÉTODOS PÚBLICOS DE BÚSQUEDA Y PAGINACIÓN
    // =========================================================================================

    /**
     * Busca un registro individual de bodega de tránsito por ID y lo mapea
     * al formato de vista del frontend.
     */
    @Override
    @Transactional(readOnly = true)
    public WarehousesPage.WarehouseItem findSingleWarehouseById(Integer idBodegaTransito) {
        Object[] rawRow = bodegaTransitoRepository.findSingleTransitById(idBodegaTransito)
                .orElseThrow(() -> new GestionInventarioException(
                        "Error al buscar el registro actualizado", HttpStatus.NOT_FOUND));

        Object[] rowToUse = (rawRow.length == 1 && rawRow[0] instanceof Object[])
                ? (Object[]) rawRow[0]
                : rawRow;

        return WarehousesPage.WarehouseItem.fromRow(rowToUse);
    }

    /**
     * Lista paginada de bodega de tránsito buscando por nombre o descripción del producto.
     */
    @Override
    @Transactional(readOnly = true)
    public WarehousesPage searchTransitWarehousePage(SearchDTO request) {
        String term = normalize(request.getTerm());

        long totalRegistros = bodegaTransitoRepository.countSearchTransitWarehouse(term);

        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(request.getPage(), totalRegistros);

        List<Object[]> rows = bodegaTransitoRepository.searchTransitWarehousePage(
                term,
                paging.limit(),
                paging.offset()
        );

        return WarehousesPage.of(rows, paging, totalRegistros);
    }

    /**
     * Lista paginada de bodega de tránsito buscando por código de producto.
     */
    @Override
    @Transactional(readOnly = true)
    public WarehousesPage  searchWarehouseByCodProduct(SearchDTO request) {
        //corresponde al codigo del producto
        String term = normalize(request.getTerm());

        // 1. Conteo total basado en el código
        long totalRegistros = bodegaTransitoRepository.countSearchWarehouseByCodProduct(term);

        // 2. Cálculo de paginación asimétrica (20/10)
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(request.getPage(), totalRegistros);

        // 3. Consulta de datos con todos los atributos
        List<Object[]> rows = bodegaTransitoRepository.searchWarehouseByCodProductPage(
                term,
                paging.limit(),
                paging.offset()
        );

        return WarehousesPage.of(rows, paging, totalRegistros);
    }

    /**
     * Lista paginada de bodega de tránsito con filtros dinámicos opcionales:
     * categorías, unidades, stock bajo y ocultamiento de agotados.
     */
    @Override
    @Transactional(readOnly = true)
    public WarehousesPage  findPagedTransitWarehouse(FilterInventoryPageDTO filter) {

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

        return WarehousesPage.of(rows, paging, totalRegistros);
    }


    /**
     * Crea un producto nuevo junto con su inventario (stock=0) y su registro en bodega de tránsito,
     * registrando una ENTRADA_BODEGA si el stock inicial es mayor a cero.
     */
    @Transactional
    @Override
    public WarehousesPage.WarehouseItem createBodegaConProducto(InventoryWithProductCreateDTO request) {
        Inventario newInventario = inventarioService.createProductAndInventory(request);

        BodegaTransito newBodega = new BodegaTransito();
        newBodega.setInventario(newInventario);
        newBodega.setStock(BigDecimal.ZERO);
        newBodega.setStockLimit(request.getStockLimit());
        newBodega = bodegaTransitoRepository.save(newBodega);

        if (request.getStock() != null && request.getStock().compareTo(BigDecimal.ZERO) > 0) {
            movimientoService.motionInUpdateTransitWarehouse(newBodega, request.getStock(), "ENTRADA_BODEGA");
            newBodega = bodegaTransitoRepository.save(newBodega);
        }

        log.info("Nuevo producto en bodega: '{}' | stock inicial: {}",
                newInventario.getProducto().getNombreProducto(), newBodega.getStock());
        return findSingleWarehouseById(newBodega.getIdBodegaTransito());
    }

    /**
     * Actualiza la bodega de tránsito con validaciones de producto, categoría y unidad.
     * Aplica el movimiento correspondiente según el tipo, maneja desincronización de stock
     * y stock insuficiente retornando el item actualizado para sincronizar el frontend.
     */
    @Transactional(noRollbackFor = StockDesincronizadoException.class)
    @Override
    public Object updateTransitWarehouseWithProduct(WarehouseWithProductUpdateDTO request) {
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

        // ── Validar y aplicar movimiento de stock (solo si se envió delta) ──────────────────
        BigDecimal stockReal = oldTransit.getStock();
        boolean desincronizado = false;

        if (request.getDelta() != null && request.getTipoMovimiento() != null && !request.getTipoMovimiento().isBlank()) {
            desincronizado = stockReal.compareTo(request.getStockEnVista()) != 0;

            String tipoKey = StringUtils.normalizeToEnumKey(request.getTipoMovimiento());
            boolean esSalida = tipoKey.equals("SALIDA_BODEGA") || tipoKey.equals("MERMA_BODEGA") || tipoKey.equals("DEVOLUCION");

            BigDecimal nuevoStock;
            if (tipoKey.equals("AJUSTE_BODEGA")) {
                nuevoStock = request.getDelta(); // Ajuste absoluto: el delta es el valor final deseado
            } else {
                nuevoStock = esSalida
                        ? stockReal.subtract(request.getDelta())
                        : stockReal.add(request.getDelta());
            }

            // ❌ Stock insuficiente — Rollback automático y envía objeto para el modal
            if (nuevoStock.compareTo(BigDecimal.ZERO) < 0) {
                Object item = findSingleWarehouseById(request.getIdBodegaTransito());
                String msg = desincronizado
                        ? "El stock en tránsito cambió. El stock real (" + stockReal + ") es insuficiente para la operación."
                        : "El stock actual en tránsito (" + stockReal + ") es insuficiente para la operación.";
                throw new StockInsuficienteException(msg, item);
            }

            // ⚠️ Desincronizado pero operable — Log interno
            if (desincronizado) {
                log.warn("Desincronización en Tránsito. Stock vista: {} | Stock real: {} | Producto: {}",
                        request.getStockEnVista(), stockReal, oldProducto.getNombreProducto());
            }

            // Generar movimiento y actualizar stock (solo si hubo un cambio real)
            if (stockReal.compareTo(nuevoStock) != 0) {
                boolean validar = movimientoService.motionInUpdateTransitWarehouse(
                        oldTransit,
                        request.getDelta(),
                        request.getTipoMovimiento()
                );
                if (validar) {
                    log.info("Bodega de Tránsito actualizada y movimiento de [{}] registrado. Producto: '{}' | Stock: {} → {}",
                            request.getTipoMovimiento().toUpperCase(),
                            oldProducto.getNombreProducto(),
                            stockReal,
                            oldTransit.getStock());
                }
            }
        }

        if (!java.util.Objects.equals(oldTransit.getStockLimit(), request.getStockLimit())) {
            oldTransit.setStockLimit(request.getStockLimit());
        }

        bodegaTransitoRepository.save(oldTransit);

        // Recuperar el ítem actualizado para enviarlo al frontend
        WarehousesPage.WarehouseItem updatedItem = findSingleWarehouseById(request.getIdBodegaTransito());

        // Lanzar la excepción 409 si hubo desincronización (No hace Rollback)
        if (desincronizado) {
            String msg = String.format(
                    "El stock en tránsito cambió mientras realizabas la operación. El valor que veías (%s) ya no era el actual. La operación se realizó correctamente usando el stock actualizado (%s).",
                    request.getStockEnVista(),
                    stockReal
            );
            throw new StockDesincronizadoException(msg, updatedItem, HttpStatus.CONFLICT);
        }

        // Retorna el item actualizado (200 OK)
        return updatedItem;
    }

    // =========================================================================================
    // MÉTODOS DE CONTROL MASIVO
    // =========================================================================================

    /**
     * Lista paginada de bodega de tránsito para el proceso masivo, filtrando por nombre o código.
     */
    @Transactional(readOnly = true)
    @Override
    public BulkWarehousesPage findByMassiveBodegaPaginated(SearchDTO request) {
        String term = normalize(request.getTerm());
        long total = bodegaTransitoRepository.countMassiveBodegaListing(term);
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(request.getPage(), total);
        List<Object[]> rows = bodegaTransitoRepository.findMassiveBodegaListing(term, paging.limit(), paging.offset());
        return BulkWarehousesPage.of(rows, paging, total);
    }

    /**
     * Procesa actualizaciones masivas de stock para la bodega de tránsito.
     * Cada ítem se procesa de forma independiente: los ítems inválidos van a errores
     * sin impedir que los demás se procesen. Los ítems con desincronización van a advertencias.
     */
    @Override
    public BulkWarehouseProcess processBulkWarehouseUpdate(List<BulkWarehouseProcess.ItemRequest> requests) {
        List<BulkWarehouseProcess.ItemResult> exitosos    = new ArrayList<>();
        List<BulkWarehouseProcess.ItemResult> advertencias = new ArrayList<>();
        List<BulkWarehouseProcess.ItemResult> errores     = new ArrayList<>();

        for (BulkWarehouseProcess.ItemRequest req : requests) {
            BodegaTransito bodega = bodegaTransitoRepository.findById(req.idBodegaTransito()).orElse(null);
            if (bodega == null) {
                errores.add(new BulkWarehouseProcess.ItemResult(
                        req.idBodegaTransito(), "ID " + req.idBodegaTransito(),
                        BigDecimal.ZERO, "Registro de bodega no encontrado"));
                continue;
            }

            String nombre    = bodega.getInventario().getProducto().getNombreProducto();
            BigDecimal stockReal = bodega.getStock();
            String tipoKey = StringUtils.normalizeToEnumKey(req.tipoMovimiento());
            boolean esSalida = tipoKey.equals("SALIDA_BODEGA") || tipoKey.equals("MERMA_BODEGA") || tipoKey.equals("DEVOLUCION");

            BigDecimal nuevoStock = tipoKey.equals("AJUSTE_BODEGA")
                    ? req.delta()
                    : esSalida ? stockReal.subtract(req.delta()) : stockReal.add(req.delta());

            if (nuevoStock.compareTo(BigDecimal.ZERO) < 0) {
                errores.add(new BulkWarehouseProcess.ItemResult(
                        req.idBodegaTransito(), nombre, stockReal,
                        "Stock insuficiente (actual: " + stockReal + ")"));
                continue;
            }

            boolean desincronizado = stockReal.compareTo(req.stockEnVista()) != 0;

            try {
                movimientoService.motionInUpdateTransitWarehouse(bodega, req.delta(), req.tipoMovimiento());
                bodegaTransitoRepository.save(bodega);
                log.info("Bulk Bodega [{}]: '{}' | {} → {}",
                        req.tipoMovimiento(), nombre, stockReal, bodega.getStock());
            } catch (Exception e) {
                log.error("Error en bulk bodega ítem {}: {}", req.idBodegaTransito(), e.getMessage());
                errores.add(new BulkWarehouseProcess.ItemResult(
                        req.idBodegaTransito(), nombre, stockReal,
                        "Error al procesar: " + e.getMessage()));
                continue;
            }

            if (desincronizado) {
                log.warn("Bulk Bodega desync {}: vista={} real={}",
                        req.idBodegaTransito(), req.stockEnVista(), stockReal);
                advertencias.add(new BulkWarehouseProcess.ItemResult(
                        req.idBodegaTransito(), nombre, bodega.getStock(),
                        "Stock desincronizado — operación aplicada al real (" + stockReal + ")"));
            } else {
                exitosos.add(new BulkWarehouseProcess.ItemResult(
                        req.idBodegaTransito(), nombre, bodega.getStock(), "OK"));
            }
        }

        return new BulkWarehouseProcess(exitosos, advertencias, errores);
    }

    // =========================================================================================
    // <------ TODOS MÉTODOS PRIVADOS ------>
    // =========================================================================================


    /**
     * Normaliza un término de búsqueda eliminando espacios y retornando
     * cadena vacía si es nulo o en blanco.
     */
    private String normalize(String value) {
        return (value == null || value.trim().isEmpty())
                ? ""
                : value.trim();
    }

}
