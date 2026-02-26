package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.dto.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.MotionCreateDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.InventoryWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.response.InventoriesPageDTO;
import KuHub.modules.gestion_inventario.dtos.response.InventoryFiltersDTO;
import KuHub.modules.gestion_inventario.dtos.response.InventoryPageDTO;
import KuHub.modules.gestion_inventario.entity.Categoria;
import KuHub.modules.gestion_inventario.entity.Inventario;
import KuHub.modules.gestion_inventario.entity.Producto;
import KuHub.modules.gestion_inventario.entity.UnidadMedida;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.exceptions.InventarioException;
import KuHub.modules.gestion_inventario.repository.InventarioRepository;
import KuHub.modules.gestion_inventario.repository.ProductoRepository;
import KuHub.utils.StringUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
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
public class InventarioServiceImpl implements InventarioService {

    @Autowired
    private InventarioRepository inventarioRepository;

    @Autowired
    private ProductoService productoService;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private CategoriaService categoriaService;

    @Autowired
    private UnidadMedidaService unidadMedidaService;

    @Autowired
    private MovimientoService movimientoService;

    @Autowired
    private ObjectMapper objectMapper;


    @Transactional(readOnly = true)
    @Override
    public Inventario findById(Integer id) {
        return inventarioRepository.findById(id).orElseThrow(
                () -> new GestionInventarioException("No se encontro el producto con el id: " + id , HttpStatus.NOT_FOUND)
        );
    }

    /*****************************************************************************************
     * BUSQUEDA DE INVENTARIO CON PAGINACION DINAMICA ASIMETRICA (20/10 ITEMS)
     * - METODO-Realiza la localización de productos mediante búsqueda por nombre o
     * descripción, retornando 20 resultados en la carga inicial y 10 en las siguientes
     * para optimizar el rendimiento y la experiencia de usuario.
     * - METODO-Realiza calculo y consulta dinamica para filtros seleccionados (20/10 ITEMS)
     *****************************************************************************************/

    /**
     * 🔹 COMBOS DE FILTROS (CATEGORIA + UNIDADES), USADO PARA SELECCION MULTIPLA
     */
    @Override
    @Transactional(readOnly = true)
    public InventoryFiltersDTO getFiltersInventory() {

        String json = inventarioRepository.getFiltersInventory();

        try {
            return objectMapper.readValue(json, InventoryFiltersDTO.class);
        } catch (Exception e) {
            throw new GestionInventarioException("Error parseando filtros de inventario", HttpStatus.NOT_ACCEPTABLE);
        }
    }

    /**
     * METODO PARA LISTAR INVENTARIO POR NOMBRE O DESCRIPCION DE PRODUCTO
     * */
    @Override
    @Transactional(readOnly = true)
    public InventoriesPageDTO searchInventory(String searchTerm, Integer pageRequested) {

        String term = normalize(searchTerm);

        long totalRegistros = inventarioRepository.countSearchInventario(term);

        Paging paging = buildPaging(pageRequested, totalRegistros);

        List<Object[]> rows = inventarioRepository.searchInventarioPage(
                term,
                paging.limit,
                paging.offset
        );

        return buildResponse(rows, paging, totalRegistros);
    }

    /**
     * METODO PARA LISTAR EL INVENTARIO POR CODIGO DE PRODUCTO
     * */
    @Override
    @Transactional(readOnly = true)
    public InventoriesPageDTO searchInventoryByCodProducto(String codProducto, Integer pageRequested) {

        String term = normalize(codProducto);

        long totalRegistros = inventarioRepository.countSearchInventarioByCodProducto(term);

        Paging paging = buildPaging(pageRequested, totalRegistros);

        List<Object[]> rows = inventarioRepository.searchInventarioByCodProductoPage(
                term,
                paging.limit,
                paging.offset
        );

        return buildResponse(rows, paging, totalRegistros);
    }

    /**
     * METODO PARA LISTAR EL INVENTARIO CON CONSULTA DINAMICA SEGUN FILTRO O NO
     * */
    @Override
    @Transactional(readOnly = true)
    public InventoriesPageDTO getPagedInventory(FilterInventoryPageDTO filter) {

        Integer[] categoriasIds = (filter.getCategoriasIds() == null || filter.getCategoriasIds().isEmpty())
                ? null
                : filter.getCategoriasIds().toArray(new Integer[0]);

        Integer[] unidadesIds = (filter.getUnidadesIds() == null || filter.getUnidadesIds().isEmpty())
                ? null
                : filter.getUnidadesIds().toArray(new Integer[0]);

        boolean useCategorias = categoriasIds != null && categoriasIds.length > 0;
        boolean useUnidades   = unidadesIds   != null && unidadesIds.length > 0;
        boolean soloStockBajo = Boolean.TRUE.equals(filter.getSoloStockBajo());

        long totalRegistros = inventarioRepository.countInventarioFiltered(
                useCategorias,
                categoriasIds,
                useUnidades,
                unidadesIds,
                soloStockBajo
        );

        Paging paging = buildPaging(filter.getPage(), totalRegistros);

        List<Object[]> rows = inventarioRepository.findInventarioPage(
                useCategorias,
                categoriasIds,
                useUnidades,
                unidadesIds,
                soloStockBajo,
                paging.limit,
                paging.offset
        );
        return buildResponse(rows, paging, totalRegistros);
    }

    /**
     * METODO PARA CREAR PRODUCTO Y INVENTARIO, SI EL STOCK ASIGNADO ES MAYOR QUE [0] SE CREA UN MOVIMIENTO DE ENTRADA
     * */
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
            crearMovimientoInventario(
                    "ENTRADA",
                    newInventario,
                    newInventario.getStock(),
                    "ENTRADA INICIAL EN CREACIÓN DE PRODUCTO EN INVENTARIO -> "
                            + newProducto.getNombreProducto()
            );
        }
        return true;
    }

    @Transactional
    @Override
    public boolean updateInventoryWithProduct (InventoryWithProductUpdateDTO request){
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
        if (!oldProducto.getDescripcionProducto().equals(request.getDescripcionProducto())){
            oldProducto.setDescripcionProducto(request.getDescripcionProducto());
        }

        /**Validaciones de Categoria y Unidad de Medida, la consulta del opcion lista todas las categorias y unidades de medida activas en la bbdd*/
        if (!oldInventario.getProducto().getCategoria().getIdCategoria().equals(request.getIdCategoria())){
            oldProducto.setCategoriaId(request.getIdCategoria());
        }
        if (!oldInventario.getProducto().getUnidadMedida().getIdUnidad().equals(request.getIdUnidadMedida())){
            oldProducto.setUnidadMedidaId(request.getIdUnidadMedida());
        }

        /**Validar Stocks*/
        if (!oldInventario.getStock().equals(request.getStock())){
            oldInventario.setStock(request.getStock());
            if (oldInventario.getStock().compareTo(BigDecimal.ZERO) > 0) {
                crearMovimientoInventario(
                        "AJUSTE",
                        oldInventario,
                        oldInventario.getStock(),
                        "AJUSTE DE STOCK POR ACTUALIZACIÓN DE INVENTARIO"
                );
            }
        }
        if (!oldInventario.getStockLimit().equals(request.getStockLimit())){
            oldInventario.setStockLimit(request.getStockLimit());
        }






        return true;
    }

    private void crearMovimientoInventario(
            String tipoMovimiento,
            Inventario inventario,
            BigDecimal stockMovimiento,
            String observacion
    ) {
        MotionCreateDTO motion = new MotionCreateDTO();
        motion.setTipoMovimiento(tipoMovimiento);
        motion.setIdInventario(inventario.getIdInventario());
        motion.setStockMovimiento(stockMovimiento);
        motion.setObservacion(observacion);

        // Enviamos el inventario para evitar otra consulta a la DB
        boolean validar = movimientoService.saveMotion(motion, inventario);
        if (!validar) {
            throw new InventarioException("No se pudo crear el movimiento de inventario");
        }
    }

    /**Normalización reutilizable (searchTerm / codProducto)*/
    private String normalize(String value) {
        return (value == null || value.trim().isEmpty())
                ? ""
                : value.trim();
    }

    /** Factory del response (evita repetir el constructor)*/
    private InventoriesPageDTO buildResponse(
            List<Object[]> rows,
            Paging paging,
            long totalRegistros
    ) {
        return new InventoriesPageDTO(
                mapRows(rows),
                paging.page,
                paging.limit,
                paging.totalPages,
                totalRegistros
        );
    }

    /** Mapeo de rows → DTO*/
    private List<InventoryPageDTO> mapRows(List<Object[]> rows) {
        return rows.stream()
                .map(this::mapToInventoryPageDTO)
                .collect(Collectors.toList());
    }

    /**
     * METODOS PRIVADO PARA MAPEO
     * */
    private InventoryPageDTO mapToInventoryPageDTO(Object[] row) {
        return new InventoryPageDTO(
                ((Number) row[7]).intValue(), // idInventario
                ((Number) row[8]).intValue(), // idProducto
                (String) row[0],              // nombreProducto
                (String) row[1],              // codProducto
                (String) row[2],              // descripcionProducto
                ((Number) row[9]).intValue(), // idCategoria
                (String) row[3],              // nombreCategoria
                ((Number) row[10]).intValue(), // idUnidad
                (String) row[6],               // nombreUnidad
                (BigDecimal) row[4],           // stock
                (BigDecimal) row[5]            // stockLimit
        );
    }

    /**
     * METODOS PRIVADOS PARA MENEJO IMPLEMENTADO EN LA LOGICA DE GESTION DE PAGINACION Y LISTADO DINAMICO
     * */
    private int calculateTotalPages(long totalRegistros) {
        if (totalRegistros <= 0) {
            return 0;
        }
        if (totalRegistros <= 20) {
            return 1;
        }
        return 1 + (int) Math.ceil((totalRegistros - 20) / 10.0);
    }

    /**Cálculo único de paginación asimétrica (20 / 10)*/
    private Paging buildPaging(Integer pageRequested, long totalRegistros) {

        int totalPages = calculateTotalPages(totalRegistros);

        int page = (pageRequested != null && pageRequested > 0) ? pageRequested : 1;
        if (page > totalPages && totalPages > 0) {
            page = totalPages;
        }

        int limit;
        int offset;

        if (page == 1) {
            limit = 20;
            offset = 0;
        } else {
            limit = 10;
            offset = 20 + (page - 2) * 10;
        }
        return new Paging(page, limit, offset, totalPages);
    }

    /**DTO interno para paginación (simple y efectivo)*/
    private static class Paging {
        int page;
        int limit;
        int offset;
        int totalPages;

        Paging(int page, int limit, int offset, int totalPages) {
            this.page = page;
            this.limit = limit;
            this.offset = offset;
            this.totalPages = totalPages;
        }
    }

    /**
    @Transactional(readOnly = true)
    @Override
    public List<Inventario> findAll() {
        return inventarioRepository.findAll();
    }

    @Transactional(readOnly = true)
    @Override
    public List<Inventario> findInventoriesWithProductsActive(Boolean activo){
        return inventarioRepository.findInventoriesWithProductsActive(activo);
    }



    @Transactional(readOnly = true)
    @Override
    public Inventario findByIdInventoryWithProductActive(Integer idInventario,Boolean activo){
        return inventarioRepository.findByIdInventoryWithProductActive(idInventario,activo).orElseThrow(
                () -> new InventarioException("No se encontro el producto con el id: " + idInventario)
        );
    }

    @Transactional(readOnly = true)
    @Override
    public boolean existInventory (Integer id){
        return inventarioRepository.existsById(id);
    }

    @Transactional(readOnly = true)
    @Override
    public List<InventoryWithProductResponseAnswerUpdateDTO> findAllActiveInventoryOrderedByName(){
        return inventarioRepository.findAllActiveInventoryOrderedByName();
    }


    @Transactional
    @Override
    public InventoryWithProductCreateDTO save (InventoryWithProductCreateDTO inventarioRequest){
        // 1. Validaciones de negocio
        if (inventarioRequest.getStock() < 0 ){
            throw new InventarioException("El inventario no puede ser negativo");
        }
        if (inventarioRequest.getStockLimitMin() < 0){
            throw new InventarioException("El stock mínimo no puede ser negativo");
        }
        if (productoService.existProductByName(StringUtils.capitalizarPalabras(inventarioRequest.getNombreProducto()))){
            throw new InventarioException("El producto ya existe");
        }

        // 2. Crear y guardar el Producto
        Producto newProducto = productoService.save(
                new Producto(null, null, inventarioRequest.getDescripcionProducto(),
                        StringUtils.capitalizarPalabras(inventarioRequest.getNombreProducto()),
                        StringUtils.capitalizarPalabras(inventarioRequest.getNombreCategoria()),
                        inventarioRequest.getUnidadMedida().toUpperCase(), true));

        // 3. Crear y guardar el Inventario
        Inventario newInventario = inventarioRepository.save(
                new Inventario(null, newProducto.getIdProducto(), newProducto,
                        inventarioRequest.getStock(),
                        inventarioRequest.getStockLimitMin()));

        // 4. CREAR MOVIMIENTO DE ENTRADA INICIAL
        // Solo creamos el movimiento si el stock inicial es mayor a 0 (o siempre, según prefieras)
        movimientoService.saveMotion(new MotionCreateDTO(
                newInventario.getIdInventario(),
                inventarioRequest.getStock(),
                inventarioRequest.getStockLimitMin(),
                "ENTRADA",
                "Carga inicial de inventario por creación de producto"
        ));

        // 5. Preparar respuesta
        inventarioRequest.setIdInventario(newInventario.getIdInventario());
        inventarioRequest.setIdProducto(newProducto.getIdProducto());

        return inventarioRequest;
    }


    @Transactional
    @Override
    public InventoryWithProductResponseAnswerUpdateDTO updateInventoryWithProduct(InventoryWithProductResponseAnswerUpdateDTO req){

        // Validar existencia
        Inventario inventario = inventarioRepository.findByIdInventoryWithProductActive(
                req.getIdInventario(), true
        ).orElseThrow(() -> new InventarioException("El inventario no existe"));

        Producto producto = productoService.findByIdProductoAndActivoTrue(
                req.getIdProducto()
        );

        // Validación nombre
        String nuevoNombre = StringUtils.capitalizarPalabras(req.getNombreProducto());

        // Si el nombre CAMBIÓ → validar duplicado
        if (!producto.getNombreProducto().equals(nuevoNombre) &&
                productoRepository.existsByNombreProductoAndIdProductoIsNot(nuevoNombre, req.getIdProducto())) {

            throw new InventarioException("El producto con el nombre " + nuevoNombre + " ya existe");
        }

        // Validaciones inventario
        if (req.getStockLimitMin() != null && req.getStockLimitMin() < 0)
            throw new InventarioException("El stock mínimo no puede ser negativo");

        if (req.getStock() != null && req.getStock() < 0)
            throw new InventarioException("El stock no puede ser negativo");

        // Validar si realmente hubo cambios antes de proceder
        // 1. Verificar si hay cambios en los DATOS del producto
        boolean huboCambiosEnProducto = !producto.getNombreProducto().equals(nuevoNombre) ||
                !java.util.Objects.equals(producto.getDescripcionProducto(), req.getDescripcionProducto()) ||
                !producto.getNombreCategoria().equals(req.getNombreCategoria()) ||
                !producto.getUnidadMedida().equals(req.getUnidadMedida()) ||
                !java.util.Objects.equals(inventario.getStockLimitMin(), req.getStockLimitMin()) ||
                !java.util.Objects.equals(inventario.getStock(), req.getStock());

        // 2. Si hay cambios en texto/minimo, actualizamos las entidades
        if (huboCambiosEnProducto) {
            producto.setNombreProducto(nuevoNombre);
            producto.setDescripcionProducto(req.getDescripcionProducto());
            producto.setNombreCategoria(req.getNombreCategoria());
            producto.setUnidadMedida(req.getUnidadMedida());
            productoRepository.save(producto);

            if (req.getStockLimitMin() != null) {
                inventario.setStockLimitMin(req.getStockLimitMin());
                inventarioRepository.save(inventario);
            }
        }

        // 3. FUERA del IF: Siempre creamos el movimiento de AJUSTE
        // Esto garantiza que aunque el stock sea el mismo, quede el registro en la tabla movimientos
        movimientoService.saveMotion(new MotionCreateDTO(
                inventario.getIdInventario(),
                req.getStock(),        // Valor enviado desde el front
                req.getStockLimitMin(),
                "AJUSTE",
                "Verificación/Ajuste manual de inventario"
        ));

        return req;
    }




    //ELIMINAR INVENTARIO ES DESHABILITAR EL PRODUCTO DE ACTIVO TRUE A FALSE, PORQUE SOLAMENTE SE MUESTRA EL INVENTARIO DE PRODUCTOS EN TRUE
    @Transactional
    @Override
    public void updateActiveValueProductFalse(Integer id) {
        Inventario inventario = inventarioRepository.findById(id).orElseThrow(
                ()-> new InventarioException("No se encontró el producto con el id: " + id)
        );

        if (inventario.getStock() != 0 ){
            throw new InventarioException("Existe producto disponible en el inventario ");
        }

        //eliminar producto lógicamente para deshabilitar la visualización de este producto en el inventario
        productoService.deleteById(inventario.getIdProducto());

    }
    */


}
