package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.InventoryWithProductResponseAnswerUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.MotionCreateDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.InventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.InventoryPageResponseDTO;
import KuHub.modules.gestion_inventario.dtos.response.InventoryFiltersDTO;
import KuHub.modules.gestion_inventario.entity.Inventario;
import KuHub.modules.gestion_inventario.exceptions.InventarioException;
import KuHub.modules.gestion_inventario.repository.InventarioRepository;
import KuHub.modules.gestion_inventario.entity.Producto;
import KuHub.modules.gestion_inventario.repository.ProductoRepository;
import KuHub.utils.StringUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

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
    private MovimientoService movimientoService;

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public InventoryPageResponseDTO getPagedInventory(FilterInventoryPageDTO filter) {

        Integer[] categoriasIds = (filter.getCategoriasIds() == null || filter.getCategoriasIds().isEmpty())
                ? null
                : filter.getCategoriasIds().toArray(new Integer[0]);

        Integer[] unidadesIds = (filter.getUnidadesIds() == null || filter.getUnidadesIds().isEmpty())
                ? null
                : filter.getUnidadesIds().toArray(new Integer[0]);

        // 🔍 LOGS (clave para debug)
        log.debug("📦 getPagedInventory");
        log.debug("➡️ categoriasIds = {}", categoriasIds == null ? "null" : Arrays.toString(categoriasIds));
        log.debug("➡️ unidadesIds   = {}", unidadesIds == null ? "null" : Arrays.toString(unidadesIds));
        log.debug("➡️ soloStockBajo = {}", filter.getSoloStockBajo());
        log.debug("➡️ page          = {}", filter.getPage());

        boolean useCategorias = categoriasIds != null && categoriasIds.length > 0;
        boolean useUnidades   = unidadesIds   != null && unidadesIds.length > 0;
        boolean soloStockBajo = Boolean.TRUE.equals(filter.getSoloStockBajo());

        // 1️⃣ COUNT
        long totalRegistros = inventarioRepository.countInventarioFiltered(
                useCategorias,
                categoriasIds,
                useUnidades,
                unidadesIds,
                soloStockBajo
        );

        // 2️⃣ TOTAL PÁGINAS
        int totalPaginas = calcularTotalPaginas(totalRegistros);

        // 3️⃣ página solicitada
        int page = filter.getPage() != null && filter.getPage() > 0
                ? filter.getPage()
                : 1;

        if (page > totalPaginas && totalPaginas > 0) {
            page = totalPaginas;
        }

        // 4️⃣ offset / limit
        int limit;
        int offset;

        if (page == 1) {
            limit = 20;
            offset = 0;
        } else {
            limit = 10;
            offset = 20 + (page - 2) * 10;
        }

        // 5️⃣ data
        List<Object[]> rows = inventarioRepository.findInventarioPage(
                useCategorias,
                categoriasIds,
                useUnidades,
                unidadesIds,
                soloStockBajo,
                limit,
                offset
        );

        List<InventoryPageDTO> data = new ArrayList<>();

        for (Object[] r : rows) {
            data.add(new InventoryPageDTO(
                    ((Number) r[5]).intValue(), // id_inventario
                    ((Number) r[6]).intValue(), // id_producto
                    (String) r[0],              // nombre_producto
                    ((Number) r[7]).intValue(), // id_categoria (SMALLINT)
                    (String) r[1],              // nombre_categoria
                    ((Number) r[8]).intValue(), // id_unidad (SMALLINT)
                    (String) r[4],              // nombre_unidad
                    (BigDecimal) r[2],          // stock
                    (BigDecimal) r[3]           // stock_limit
            ));
        }

        return new InventoryPageResponseDTO(
                data,
                page,
                limit,
                totalPaginas,
                totalRegistros
        );
    }

    private int calcularTotalPaginas(long totalRegistros) {
        if (totalRegistros <= 0) {
            return 0;
        }
        if (totalRegistros <= 20) {
            return 1;
        }
        return 1 + (int) Math.ceil((totalRegistros - 20) / 10.0);
    }

    /**
     * 🔹 Combos de filtros (categorías + unidades)
     */
    @Override
    @Transactional(readOnly = true)
    public InventoryFiltersDTO getFiltersInventory() {

        String json = inventarioRepository.getFiltersInventory();

        try {
            return objectMapper.readValue(json, InventoryFiltersDTO.class);
        } catch (Exception e) {
            throw new RuntimeException("Error parseando filtros de inventario", e);
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
    public Inventario findById(Integer id) {
        return inventarioRepository.findById(id).orElseThrow(
                () -> new InventarioException("No se encontro el producto con el id: " + id)
        );
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
