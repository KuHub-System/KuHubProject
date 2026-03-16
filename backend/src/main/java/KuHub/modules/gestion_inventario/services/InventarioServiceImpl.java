package KuHub.modules.gestion_inventario.services;

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

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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

        // ── Validar stock con delta ───────────────────────────────────────
        BigDecimal stockReal  = oldInventario.getStock();
        boolean desincronizado = stockReal.compareTo(request.getStockEnVista()) != 0;

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

            // ¡Aquí usamos la nueva excepción!
            throw new StockInsuficienteException(msg, item);
        }

        // ⚠️ Desincronizado pero operable — ejecutamos con stock real
        if (desincronizado) {
            log.warn("Desincronización detectada. Stock en vista: {} | Stock real: {} | Producto: {}",
                    request.getStockEnVista(), stockReal,
                    oldInventario.getProducto().getNombreProducto());
        }

        if (stockReal.compareTo(BigDecimal.ZERO) != 0 || request.getDelta().compareTo(BigDecimal.ZERO) != 0) {
            boolean validar = movimientoService.motionInUpdateInventory(
                    oldInventario,
                    request.getDelta(),
                    request.getTipoMovimiento(),
                    request.getAjustePositivo()   // null si no es ajuste
            );
            if (validar) {
                log.info("Movimiento [{}] registrado. Producto: '{}' | Stock: {} → {}",
                        request.getTipoMovimiento().toUpperCase(),
                        oldInventario.getProducto().getNombreProducto(),
                        stockReal,
                        oldInventario.getStock()); // ya fue seteado dentro del método
            }
        }

        if (!oldInventario.getStockLimit().equals(request.getStockLimit())) {
            oldInventario.setStockLimit(request.getStockLimit());
        }

        inventarioRepository.save(oldInventario);

        InventoriesPage.InventoryItem updatedItem = findSingleInventoryById(request.getIdInventario());
        // Si estaba desincronizado, devolvemos un Map con el item y un mensaje de advertencia
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

}
