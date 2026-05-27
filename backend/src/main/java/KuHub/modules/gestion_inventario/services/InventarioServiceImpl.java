package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.ConfirmarNuevosExcelDTO;
import KuHub.modules.gestion_inventario.dtos.request.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.*;
import KuHub.modules.gestion_inventario.entity.*;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.exceptions.StockDesincronizadoException;
import KuHub.modules.gestion_inventario.exceptions.StockInsuficienteException;
import KuHub.modules.gestion_inventario.repository.InventarioRepository;
import KuHub.modules.gestion_inventario.repository.MovimientoRepository;
import KuHub.modules.gestion_inventario.repository.ProductoRepository;
import KuHub.modules.gestion_usuario.entity.Usuario;
import KuHub.modules.gestion_usuario.service.UsuarioService;
import KuHub.utils.PaginationUtils;
import KuHub.utils.StringUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InventarioServiceImpl implements InventarioService {

    /**Repositories*/
    @Autowired
    private InventarioRepository inventarioRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private MovimientoRepository movimientoRepository;
    /**Services*/
    @Autowired
    private CategoriaService categoriaService;

    @Autowired
    private UnidadMedidaService unidadMedidaService;

    @Autowired
    private MovimientoService movimientoService;

    @Autowired
    private UsuarioService usuarioService;
    /**Others*/
    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Busca un inventario por su ID y lanza excepción si no existe.
     */
    @Transactional(readOnly = true)
    @Override
    public Inventario findById(Integer id) {
        return inventarioRepository.findById(id).orElseThrow(
                () -> new GestionInventarioException("No se encontro el producto con el id: " + id , HttpStatus.NOT_FOUND)
        );
    }

    /**
     * Recupera un inventario específico y lo mapea directamente a un DTO que es usando para listar en la page de inventario.
     * Usado para retornar el inventario para sincronizacion a la tentativa de update por causa de actualizaciones en paralelo.
     */
    @Transactional(readOnly = true)
    public InventoriesPage.InventoryItem  findSingleInventoryById(Integer idInventario) {
        //Llamada al repositorio con List
        List<Object[]> results = inventarioRepository.findByIdToInventoryPage(idInventario);
        if (results.isEmpty()) {
            throw new GestionInventarioException(
                    "El inventario con ID " + idInventario + " no existe o está inactivo",
                    HttpStatus.NOT_FOUND
            );
        }
        //Extraemos la primera (y única) fila
        return InventoriesPage.InventoryItem.fromRow(results.get(0));
    }

    /*****************************************************************************************
     * BUSQUEDA DE INVENTARIO CON PAGINACION DINAMICA ASIMETRICA (20/10 ITEMS)
     * - METODO-Realiza la localización de productos mediante búsqueda por nombre o
     * descripción, retornando 20 resultados en la carga inicial y 10 en las siguientes
     * para optimizar el rendimiento y la experiencia de usuario.
     * - METODO-Realiza calculo y consulta dinamica para filtros seleccionados (20/10 ITEMS)
     *****************************************************************************************/

    /**
     * Retorna los combos de filtros disponibles (categorías y unidades de medida)
     * para selección múltiple en el listado de inventario.
     */
    @Override
    @Transactional(readOnly = true)
    public InventoryFilters findFiltersInventory() {

        String json = inventarioRepository.getFiltersInventory();
        try {
            return objectMapper.readValue(json, InventoryFilters.class);
        } catch (Exception e) {
            throw new GestionInventarioException("Error parseando filtros de inventario", HttpStatus.NOT_ACCEPTABLE);
        }
    }

    /**
     * Lista el inventario paginado buscando por nombre o descripción del producto.
     */
    @Override
    @Transactional(readOnly = true)
    public InventoriesPage searchInventory(SearchDTO request) {
        String term = normalize(request.getTerm());
        long total  = inventarioRepository.countSearchInventory(term);
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(request.getPage(), total);

        return InventoriesPage.of(
                inventarioRepository.searchInventoryPage(term, paging.limit(), paging.offset()),
                paging, total
        );
    }

    /**
     * Lista el inventario paginado buscando por código de producto.
     */
    @Override
    @Transactional(readOnly = true)
    public InventoriesPage  searchInventoryByCodProducto(SearchDTO request) {
        //getTerm tiene el valor del codigo del producto
        String term = normalize(request.getTerm());
        long total  = inventarioRepository.countSearchInventarioByCodProduct(term);
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(request.getPage(), total);

        return InventoriesPage.of(
                inventarioRepository.searchInventarioByCodProductPage(term, paging.limit(), paging.offset()),
                paging, total
        );
    }

    /**
     * Lista el inventario paginado con filtros dinámicos opcionales: categorías,
     * unidades de medida, stock bajo y ocultamiento de agotados.
     */
    @Override
    @Transactional(readOnly = true)
    public InventoriesPage findPagedInventory(FilterInventoryPageDTO filter) {

        Integer[] categoriasIds = toArray(filter.getCategoriasIds());
        Integer[] unidadesIds   = toArray(filter.getUnidadesIds());

        boolean ocultarAgotados = Boolean.TRUE.equals(filter.getOcultarAgotados());
        boolean soloStockBajo   = Boolean.TRUE.equals(filter.getSoloStockBajo());
        boolean useCategorias   = categoriasIds != null;
        boolean useUnidades     = unidadesIds   != null;
        boolean orderAsc        = !Boolean.TRUE.equals(filter.getIsDesc());

        long total = inventarioRepository.countInventarioFiltered(
                useCategorias, categoriasIds,
                useUnidades,   unidadesIds,
                soloStockBajo, ocultarAgotados
        );

        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(filter.getPage(), total);

        return InventoriesPage.of(
                inventarioRepository.findInventoryPage(
                        useCategorias, categoriasIds,
                        useUnidades,   unidadesIds,
                        soloStockBajo, ocultarAgotados,
                        orderAsc, paging.limit(), paging.offset()
                ),
                paging, total
        );
    }

    /**
     * Consulta masiva paginada de productos con stock formateado, usada para
     * cargar el modal de control de stock en operaciones masivas.
     */
    @Override
    @Transactional(readOnly = true)
    public BulkInventoriesPage  findByMassiveInventoryPaginated(SearchDTO request) {
        String  term          = (request.getTerm() == null) ? "" : request.getTerm().trim();
        Integer pageRequested = (request.getPage() != null) ? request.getPage() : 1;

        long totalRegistros = inventarioRepository.countBulkInventoryFiltered(term);
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(pageRequested, totalRegistros);

        List<BulkInventoriesPage.ProductInventoryBulkView> rows =
                inventarioRepository.bulkProductInventoryListingPage(term, paging.limit(), paging.offset());

        return BulkInventoriesPage.of(rows, paging, totalRegistros);
    }

    /**
     * Crea un producto con su inventario asociado. Si el stock inicial es mayor a 0,
     * registra automáticamente un movimiento de entrada inicial.
     */
    @Transactional
    @Override
    public boolean saveInventoryWithProduct (InventoryWithProductCreateDTO request){
        String nombreProducto = StringUtils.capitalizarPalabras(request.getNombreProducto());
        String codigoProducto = StringUtils.normalizeSpaces(request.getCodigoProducto());
        // 1. Validaciones de negocio
        if (productoRepository.existsByNombreProducto(nombreProducto)){
            throw new GestionInventarioException("El producto ya existe", HttpStatus.CONFLICT);
        }
        if (codigoProducto != null && !codigoProducto.isBlank()) {
            if (productoRepository.existsBycodProductoAndActivo(codigoProducto, true)) {
                throw new GestionInventarioException("El código '" + codigoProducto + "' ya está asignado a otro producto activo", HttpStatus.CONFLICT);
            }
        }
        Categoria categoria = categoriaService.findById(request.getIdCategoria());
        UnidadMedida unidadMedida = unidadMedidaService.findById(request.getIdUnidadMedida());

        //Crear Producto
        Producto newProducto = new Producto();
        newProducto.setNombreProducto(nombreProducto);
        newProducto.setCodProducto(codigoProducto);
        newProducto.setDescripcionProducto(request.getDescripcionProducto());
        newProducto.setCategoria(categoria);
        newProducto.setUnidadMedida(unidadMedida);
        productoRepository.save(newProducto);

        //Crear y guardar el Inventario
        Inventario newInventario = new Inventario();
        newInventario.setStockLimit(request.getStockLimit());
        newInventario.setStock(request.getStock());
        newInventario.setProducto(newProducto);
        newInventario = inventarioRepository.save(newInventario);

        // CREAR MOVIMIENTO DE ENTRADA INICIAL
        // Solo creamos el movimiento si el stock inicial es mayor a 0
        if (newInventario.getStock().compareTo(BigDecimal.ZERO) > 0) {
            Movimiento motion = new Movimiento();
            motion.setUsuario(usuarioService.findUserByToken());
            motion.setInventario(newInventario);
            motion.setStockMovimiento(newInventario.getStock());
            motion.setTipoMovimiento(Movimiento.TipoMovimiento.ENTRADA_INVENTARIO);
            motion.setObservacion("ENTRADA INICIAL DE PRODUCTO: " + newProducto.getNombreProducto());
            movimientoService.save(motion);
        }
        return true;
    }

    /**
     * Crea un producto con su inventario en stock=0, sin registrar movimiento de entrada.
     * Usado por BodegaTransitoService para crear el inventario base antes de asignar bodega.
     */
    @Transactional
    @Override
    public Inventario createProductAndInventory(InventoryWithProductCreateDTO request) {
        String nombreProducto = StringUtils.capitalizarPalabras(request.getNombreProducto());
        String codigoProducto = StringUtils.normalizeSpaces(request.getCodigoProducto());
        if (productoRepository.existsByNombreProducto(nombreProducto)) {
            throw new GestionInventarioException("El producto ya existe", HttpStatus.CONFLICT);
        }
        if (codigoProducto != null && !codigoProducto.isBlank()) {
            if (productoRepository.existsBycodProductoAndActivo(codigoProducto, true)) {
                throw new GestionInventarioException("El código '" + codigoProducto + "' ya está asignado a otro producto activo", HttpStatus.CONFLICT);
            }
        }
        Categoria categoria = categoriaService.findById(request.getIdCategoria());
        UnidadMedida unidadMedida = unidadMedidaService.findById(request.getIdUnidadMedida());

        Producto newProducto = new Producto();
        newProducto.setNombreProducto(nombreProducto);
        newProducto.setCodProducto(codigoProducto);
        newProducto.setDescripcionProducto(request.getDescripcionProducto());
        newProducto.setCategoria(categoria);
        newProducto.setUnidadMedida(unidadMedida);
        productoRepository.save(newProducto);

        Inventario newInventario = new Inventario();
        newInventario.setStockLimit(request.getStockLimit());
        newInventario.setStock(BigDecimal.ZERO);
        newInventario.setProducto(newProducto);
        return inventarioRepository.save(newInventario);
    }

    /**
     * Actualiza un inventario y su producto asociado aplicando el delta de stock
     * según el tipo de movimiento. Detecta y maneja desincronización de stock
     * entre la vista del usuario y el valor real en base de datos.
     */
    @Transactional(noRollbackFor = StockDesincronizadoException.class)
    @Override
    public Object updateInventoryWithProduct (InventoryWithProductUpdateDTO request){
        Inventario oldInventario = inventarioRepository.findByIdInventoryWithProductActive(request.getIdInventario(),true).orElseThrow(
                () -> new GestionInventarioException("El inventario no existe", HttpStatus.NOT_FOUND)
        );

        Producto oldProducto = oldInventario.getProducto();
        String nombreProducto = StringUtils.capitalizarPalabras(request.getNombreProducto());
        String codigoProducto = StringUtils.normalizeSpaces(request.getCodigoProducto());

        /**Validaciones de producto*/
        if (!oldInventario.getProducto().getNombreProducto().equals(nombreProducto)){
            if (productoRepository.existsByNombreProducto(nombreProducto)){
                throw new GestionInventarioException("El producto ya existe", HttpStatus.CONFLICT);
            }else {
                oldProducto.setNombreProducto(nombreProducto);
            }
        }
        if (codigoProducto != null && !codigoProducto.isBlank()) {
            if (!codigoProducto.equals(oldProducto.getCodProducto())) {
                if (productoRepository.existsBycodProductoAndActivo(codigoProducto,true)){
                    throw new GestionInventarioException("El codigo de producto ya esta en uso", HttpStatus.CONFLICT);
                }else {
                    oldProducto.setCodProducto(codigoProducto);
                }
            }
        }
        if (!java.util.Objects.equals(oldProducto.getDescripcionProducto(), request.getDescripcionProducto())) {
            oldProducto.setDescripcionProducto(request.getDescripcionProducto());
        }
        /**Validaciones de Categoria y Unidad de Medida, la consulta del opcion lista todas las categorias y unidades de medida activas en la bbdd*/
        if (!oldInventario.getProducto().getCategoria().getIdCategoria().equals(request.getIdCategoria())){
            oldProducto.setCategoriaId(request.getIdCategoria());
        }
        if (!oldInventario.getProducto().getUnidadMedida().getIdUnidad().equals(request.getIdUnidadMedida())){
            oldProducto.setUnidadMedidaId(request.getIdUnidadMedida());
        }

        // ── Validar y aplicar movimiento de stock (solo si se envió delta) ──────
        BigDecimal stockReal  = oldInventario.getStock();
        boolean desincronizado = false;

        if (request.getDelta() != null && request.getTipoMovimiento() != null && !request.getTipoMovimiento().isBlank()) {
            desincronizado = stockReal.compareTo(request.getStockEnVista()) != 0;

            String tipoKey = StringUtils.normalizeToEnumKey(request.getTipoMovimiento());
            boolean esSalida = tipoKey.equals("SALIDA_INVENTARIO") || tipoKey.equals("MERMA_INVENTARIO");

            BigDecimal nuevoStock = esSalida
                    ? stockReal.subtract(request.getDelta())
                    : stockReal.add(request.getDelta());

            // ❌ Stock insuficiente — retorna objeto para recargar el modal
            if (nuevoStock.compareTo(BigDecimal.ZERO) < 0) {
                InventoriesPage.InventoryItem item = findSingleInventoryById(request.getIdInventario());
                String msg = desincronizado
                        ? "El stock cambió mientras realizabas la operación. El stock disponible actual (" + stockReal + ") no es suficiente para realizar la acción requerida."
                        : "El stock disponible (" + stockReal + ") no es suficiente para realizar la acción requerida.";
                throw new StockInsuficienteException(msg, item);
            }

            // ⚠️ Desincronizado pero operable — ejecutamos con stock real
            if (desincronizado) {
                log.warn("Desincronización detectada. Stock en vista: {} | Stock real: {} | Producto: {}",
                        request.getStockEnVista(), stockReal,
                        oldInventario.getProducto().getNombreProducto());
            }

            boolean validar = movimientoService.motionInUpdateInventory(
                    oldInventario,
                    request.getDelta(),
                    request.getTipoMovimiento(),
                    request.getAjustePositivo()
            );
            if (validar) {
                log.info("Movimiento [{}] registrado. Producto: '{}' | Stock: {} → {}",
                        request.getTipoMovimiento().toUpperCase(),
                        oldInventario.getProducto().getNombreProducto(),
                        stockReal,
                        oldInventario.getStock());
            }
        }

        if (!java.util.Objects.equals(oldInventario.getStockLimit(), request.getStockLimit())) {
            oldInventario.setStockLimit(request.getStockLimit());
        }

        inventarioRepository.save(oldInventario);

        InventoriesPage.InventoryItem updatedItem = findSingleInventoryById(request.getIdInventario());
        // Si estaba desincronizado, devolvemos el item con advertencia
        if (desincronizado) {
            String msg = String.format(
                    "El stock cambió mientras realizabas la operación. El valor que veías (%s) ya no era el actual. La operación se realizó correctamente usando el stock actualizado (%s).",
                    request.getStockEnVista(),
                    stockReal
            );
            throw new StockDesincronizadoException(msg, updatedItem, HttpStatus.CONFLICT);
        }

        // Retorna el item actualizado para que el frontend sincronice la vista
        return findSingleInventoryById(request.getIdInventario());//<--updateInventario

    }

    /**
     * Procesa una actualización masiva de inventarios, registrando movimientos
     * y clasificando cada resultado como exitoso, advertencia o error.
     * Aplica persistencia masiva al final para mayor eficiencia.
     */
    @Transactional
    @Override
    public BulkInventoryProcess processBulkInventoryUpdate(List<BulkInventoryProcess.ItemRequest> requests) {
        // 1. Carga masiva de inventarios para evitar consultas individuales (N+1)
        List<Integer> ids = requests.stream().map(BulkInventoryProcess.ItemRequest::idInventario).toList();
        Map<Integer, Inventario> inventarioMap = inventarioRepository.findAllByIdsWithProductsActive(ids)
                .stream().collect(Collectors.toMap(Inventario::getIdInventario, i -> i));

        List<Inventario> inventariosToSave = new ArrayList<>();
        List<Movimiento> movimientosToSave = new ArrayList<>();

        List<BulkInventoryProcess.ItemResult> exitosos = new ArrayList<>();
        List<BulkInventoryProcess.ItemResult> advertencias = new ArrayList<>();
        List<BulkInventoryProcess.ItemResult> errores = new ArrayList<>();

        Usuario currentUser = usuarioService.findUserByToken();

        // 2. Procesamiento
        for (BulkInventoryProcess.ItemRequest req : requests) {
            Inventario inv = inventarioMap.get(req.idInventario());

            if (inv == null) {
                errores.add(new BulkInventoryProcess.ItemResult(req.idInventario(), "N/A", BigDecimal.ZERO, "Inventario no encontrado"));
                continue;
            }

            BigDecimal stockRealAntes = inv.getStock();
            boolean desincronizado = stockRealAntes.compareTo(req.stockEnVista()) != 0;

            // Delegar lógica de cálculo y creación de objeto movimiento
            BulkMovementResult result = movimientoService.buildMovementForBulkUpdate(
                    inv, req.delta(), req.tipoMovimiento(), currentUser
            );

            if (result.hasError()) {
                errores.add(new BulkInventoryProcess.ItemResult(
                        inv.getIdInventario(), inv.getProducto().getNombreProducto(),
                        stockRealAntes, result.errorMessage()
                ));
            } else {
                // Éxito: Agregamos a listas de persistencia masiva
                inventariosToSave.add(inv);
                movimientosToSave.add(result.movimiento());

                String msg = desincronizado
                        ? "El stock cambió y la operación se realizó usando el stock actual (" + stockRealAntes + ")"
                        : "Operación realizada correctamente";

                BulkInventoryProcess.ItemResult resDto = new BulkInventoryProcess.ItemResult(
                        inv.getIdInventario(), inv.getProducto().getNombreProducto(), inv.getStock(), msg);

                if (desincronizado) advertencias.add(resDto);
                else exitosos.add(resDto);
            }
        }

        // 3. Persistencia Masiva Final (Eficiencia pura)
        if (!inventariosToSave.isEmpty()) inventarioRepository.saveAll(inventariosToSave);
        if (!movimientosToSave.isEmpty()) movimientoRepository.saveAll(movimientosToSave);

        return new BulkInventoryProcess(exitosos, advertencias, errores);
    }

    /**
     * Realiza la eliminación lógica del inventario y su producto asociado.
     * Solo es posible si el stock actual es igual a cero.
     */
    @Transactional
    @Override
    public boolean softDeleteByInventoryWithProduct(Integer idInventario){
        Inventario oldInventory = findById(idInventario);
        if(oldInventory.getStock().compareTo(BigDecimal.ZERO)==0){
            // Desactivamos Producto
            Producto producto = oldInventory.getProducto();
            producto.setActivo(false);
            productoRepository.save(producto);
            // Desactivamos Inventario
            oldInventory.setActivo(false);
            inventarioRepository.save(oldInventory);
            return true;
        }else{
            throw new GestionInventarioException("Para eliminar el item del inventario el stock tiene que ser 0", HttpStatus.CONFLICT);
        }
    }

    @Transactional
    @Override
    public SincronizarExcelResultado sincronizarInventarioDesdeExcel(
            MultipartFile archivo, String nombreHoja, Short idCategoria, int filaInicio, int filaFin) {

        log.info("[SyncExcel-SVC] Iniciando — archivo='{}' size={}bytes hoja='{}' cat={} filas={}-{}",
                archivo.getOriginalFilename(), archivo.getSize(), nombreHoja, idCategoria, filaInicio, filaFin);

        if (archivo.isEmpty())
            throw new GestionInventarioException("El archivo Excel está vacío.", HttpStatus.BAD_REQUEST);

        List<UnidadMedida> unidadesActivas = unidadMedidaService.findAllActiveTrue();
        log.info("[SyncExcel-SVC] Unidades activas cargadas: {}", unidadesActivas.size());

        Usuario currentUser = usuarioService.findUserByToken();
        DataFormatter formatter = new DataFormatter();

        List<SincronizarExcelResultado.ResultadoItem> resultados = new ArrayList<>();
        List<Inventario> inventariosToSave = new ArrayList<>();
        List<Movimiento> movimientosToSave = new ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(archivo.getInputStream())) {
            log.info("[SyncExcel-SVC] Workbook abierto — hojas disponibles: {}", workbook.getNumberOfSheets());
            Sheet sheet;
            if (nombreHoja != null && !nombreHoja.isBlank()) {
                sheet = workbook.getSheet(nombreHoja);
                if (sheet == null)
                    throw new GestionInventarioException(
                            "No se encontró la hoja '" + nombreHoja + "' en el archivo.", HttpStatus.BAD_REQUEST);
            } else {
                sheet = workbook.getSheetAt(workbook.getActiveSheetIndex());
            }
            log.info("[SyncExcel-SVC] Hoja seleccionada: '{}'", sheet.getSheetName());

            // Header row: filaInicio - 2 (0-based: una fila antes del inicio de datos).
            // Math.max(0,...) garantiza que si filaInicio=1 aún se lea la fila 0 como cabecera.
            int headerIdx = Math.max(0, filaInicio - 2);
            Row headerRow = sheet.getRow(headerIdx);

            int colNombre = -1, colUnidad = -1;
            int idxTotal = -1, idxCantidad = -1, idxInicial = -1;

            if (headerRow != null) {
                for (int c = 0; c < headerRow.getLastCellNum(); c++) {
                    String h = excelCellText(headerRow.getCell(c), formatter).toUpperCase().strip();
                    if (colNombre == -1 && (h.contains("INSUMO") || h.contains("PRODUTO") || h.contains("PRODUCTO")))
                        colNombre = c;
                    if (colUnidad == -1 && (h.replace(" ", "").contains("U/MEDIDA") || h.equals("UNIDAD") || h.equals("MEDIDA")))
                        colUnidad = c;
                    if (h.equals("TOTAL") && idxTotal == -1)         idxTotal    = c;
                    if (h.contains("CANTIDAD") && idxCantidad == -1) idxCantidad = c;
                    if (h.equals("INICIAL") && idxInicial == -1)     idxInicial  = c;
                }
            }

            int colStock = idxTotal >= 0 ? idxTotal : idxCantidad >= 0 ? idxCantidad : idxInicial >= 0 ? idxInicial : 0;
            if (colNombre == -1) colNombre = 2;
            if (colUnidad == -1) colUnidad = 1;

            log.info("[SyncExcel-SVC] Columnas detectadas — nombre=col{} unidad=col{} stock=col{} (TOTAL={} CANTIDAD={} INICIAL={})",
                    (char)('A' + colNombre), (char)('A' + colUnidad), (char)('A' + colStock),
                    idxTotal, idxCantidad, idxInicial);

            int idxDataInicio = filaInicio - 1;
            int idxDataFin    = filaFin - 1;
            log.info("[SyncExcel-SVC] Procesando filas POI {}-{} ({} filas)", idxDataInicio, idxDataFin, idxDataFin - idxDataInicio + 1);

            for (int i = idxDataInicio; i <= idxDataFin; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String nombreRaw = excelCellText(row.getCell(colNombre), formatter).trim();
                if (nombreRaw.isBlank()) continue;

                BigDecimal stockExcel = excelParseCantidad(row.getCell(colStock));
                if (stockExcel == null) continue;

                String nombreCapitalizado = StringUtils.capitalizarPalabras(nombreRaw);
                String unidadRaw = excelCellText(row.getCell(colUnidad), formatter).trim();
                String unidadCapitalizada = StringUtils.capitalizarPalabras(unidadRaw);
                int filaNro = i + 1;

                Short idUnidadMatcheada = null;
                for (UnidadMedida u : unidadesActivas) {
                    if (StringUtils.capitalizarPalabras(u.getNombreUnidad()).equals(unidadCapitalizada)
                            || (u.getAbreviatura() != null && u.getAbreviatura().equalsIgnoreCase(unidadRaw))) {
                        idUnidadMatcheada = u.getIdUnidad();
                        break;
                    }
                }

                Optional<Producto> productoOpt = productoRepository
                        .findByNombreProductoAndActivo(nombreCapitalizado, true);

                if (productoOpt.isEmpty()) {
                    log.debug("[SyncExcel-NE] fila={} buscado='{}' cat={}", filaNro, nombreCapitalizado, idCategoria);
                    resultados.add(new SincronizarExcelResultado.ResultadoItem(
                            filaNro, nombreRaw, null, null, null,
                            stockExcel, null, unidadCapitalizada, idUnidadMatcheada, "no_encontrado"
                    ));
                    continue;
                }

                Producto producto = productoOpt.get();
                Optional<Inventario> invOpt = inventarioRepository
                        .findByProducto_IdProductoAndActivoTrue(producto.getIdProducto());

                if (invOpt.isEmpty()) {
                    resultados.add(new SincronizarExcelResultado.ResultadoItem(
                            filaNro, nombreRaw, null, producto.getIdProducto(), producto.getNombreProducto(),
                            stockExcel, null, unidadCapitalizada, idUnidadMatcheada, "no_encontrado"
                    ));
                    continue;
                }

                Inventario inv = invOpt.get();
                BigDecimal stockAnterior = inv.getStock();

                Movimiento mov = new Movimiento();
                mov.setUsuario(currentUser);
                mov.setInventario(inv);
                mov.setStockMovimiento(stockExcel);
                mov.setTipoMovimiento(Movimiento.TipoMovimiento.AJUSTE_INVENTARIO);
                mov.setObservacion("sincronizacion excel");

                inv.setStock(stockExcel);
                inventariosToSave.add(inv);
                movimientosToSave.add(mov);

                resultados.add(new SincronizarExcelResultado.ResultadoItem(
                        filaNro, nombreRaw, inv.getIdInventario(), producto.getIdProducto(),
                        producto.getNombreProducto(), stockExcel, stockAnterior,
                        unidadCapitalizada, idUnidadMatcheada, "ok"
                ));
            }

            if (!inventariosToSave.isEmpty()) inventarioRepository.saveAll(inventariosToSave);
            if (!movimientosToSave.isEmpty()) movimientoRepository.saveAll(movimientosToSave);

            long totalSinc = resultados.stream().filter(r -> "ok".equals(r.estado())).count();
            long totalNE   = resultados.stream().filter(r -> "no_encontrado".equals(r.estado())).count();

            log.info("[SyncExcel] Hoja='{}' cat={} filas={}-{}: {} sincronizados, {} no encontrados",
                    sheet.getSheetName(), idCategoria, filaInicio, filaFin, totalSinc, totalNE);

            return new SincronizarExcelResultado(
                    resultados, (int) totalSinc, (int) totalNE,
                    resultados.size(), sheet.getSheetName(), colNombre, colStock
            );

        } catch (IOException e) {
            log.error("[SyncExcel] Error al leer archivo: {}", e.getMessage());
            throw new GestionInventarioException("No se pudo procesar el archivo Excel.", HttpStatus.BAD_REQUEST);
        }
    }

    @Transactional
    @Override
    public int confirmarNuevosProductosExcel(List<ConfirmarNuevosExcelDTO.ItemNuevo> items) {
        if (items == null || items.isEmpty()) return 0;

        Usuario currentUser = usuarioService.findUserByToken();
        List<Movimiento> movimientosToSave = new ArrayList<>();
        int contador = 0;

        for (ConfirmarNuevosExcelDTO.ItemNuevo item : items) {
            String nombreCapitalizado = StringUtils.capitalizarPalabras(item.nombre());
            if (productoRepository.existsByNombreProductoAndActivoTrue(nombreCapitalizado)) {
                log.debug("[ConfirmarNuevos] Producto activo ya existe, omitiendo: '{}'", nombreCapitalizado);
                continue;
            }
            if (item.idUnidadMedida() == null || item.idUnidadMedida() == 0) {
                log.warn("[ConfirmarNuevos] idUnidadMedida inválido para '{}', omitiendo", nombreCapitalizado);
                continue;
            }

            Categoria categoria = categoriaService.findById(item.idCategoria());
            UnidadMedida unidadMedida = unidadMedidaService.findById(item.idUnidadMedida());

            Producto producto = new Producto();
            producto.setNombreProducto(nombreCapitalizado);
            producto.setCategoria(categoria);
            producto.setUnidadMedida(unidadMedida);
            producto = productoRepository.save(producto);

            BigDecimal stockInicial = (item.stock() != null && item.stock().compareTo(BigDecimal.ZERO) > 0)
                    ? item.stock().setScale(3, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            Inventario inventario = new Inventario();
            inventario.setProducto(producto);
            inventario.setStock(stockInicial);
            inventario = inventarioRepository.save(inventario);

            Movimiento mov = new Movimiento();
            mov.setUsuario(currentUser);
            mov.setInventario(inventario);
            mov.setStockMovimiento(stockInicial);
            mov.setTipoMovimiento(Movimiento.TipoMovimiento.ENTRADA_INVENTARIO);
            mov.setObservacion("sincronizacion del inventario");
            movimientosToSave.add(mov);

            contador++;
        }

        if (!movimientosToSave.isEmpty()) movimientoRepository.saveAll(movimientosToSave);
        log.info("[SyncExcel] Nuevos confirmados: {} productos creados", contador);
        return contador;
    }

    /**<------TODOS METODOS PRIVADOS------>*/

    /**
     * Normaliza un término de búsqueda eliminando espacios y retornando
     * cadena vacía si es nulo o en blanco.
     */
    private String normalize(String value) {
        return (value == null || value.trim().isEmpty()) ? "" : value.trim();
    }

    /**
     * Convierte una lista de IDs a array. Retorna null si la lista es nula o vacía,
     * usado para determinar si se aplica el filtro en la consulta dinámica.
     */
    private Integer[] toArray(List<Integer> ids) {
        return (ids == null || ids.isEmpty()) ? null : ids.toArray(new Integer[0]);
    }

    private String excelCellText(Cell cell, DataFormatter formatter) {
        if (cell == null) return "";
        return formatter.formatCellValue(cell);
    }

    private BigDecimal excelParseCantidad(Cell cell) {
        if (cell == null || cell.getCellType() == CellType.BLANK) return null;
        CellType type = cell.getCellType();
        if (type == CellType.FORMULA) {
            type = cell.getCachedFormulaResultType();
        }
        BigDecimal result = null;
        if (type == CellType.NUMERIC) {
            result = BigDecimal.valueOf(cell.getNumericCellValue());
        } else if (type == CellType.STRING) {
            String val = cell.getStringCellValue().trim().replace(",", ".");
            if (val.isBlank()) return null;
            try { result = new BigDecimal(val); } catch (NumberFormatException e) { return null; }
        }
        if (result == null) return null;
        // Redondear a máximo 3 decimales (la BD acepta hasta 3 con punto).
        // Clampear a 0 para evitar floating-point negativo de fórmulas (ej. 5-5 = -4.4E-16).
        result = result.setScale(3, RoundingMode.HALF_UP);
        if (result.compareTo(BigDecimal.ZERO) < 0) result = BigDecimal.ZERO;
        return result;
    }

}
