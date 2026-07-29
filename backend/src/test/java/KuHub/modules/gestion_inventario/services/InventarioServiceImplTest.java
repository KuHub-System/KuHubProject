package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.entity.*;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.repository.InventarioRepository;
import KuHub.modules.gestion_inventario.repository.MovimientoRepository;
import KuHub.modules.gestion_inventario.repository.ProductoRepository;
import KuHub.modules.gestion_usuario.service.UsuarioService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventarioServiceImplTest {

    @Mock private InventarioRepository inventarioRepository;
    @Mock private ProductoRepository productoRepository;
    @Mock private MovimientoRepository movimientoRepository;
    @Mock private CategoriaService categoriaService;
    @Mock private UnidadMedidaService unidadMedidaService;
    @Mock private MovimientoService movimientoService;
    @Mock private UsuarioService usuarioService;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks
    private InventarioServiceImpl inventarioService;

    @Test
    void test1FindByIdExisting() {
        Inventario inv = new Inventario();
        inv.setIdInventario(1);
        inv.setStock(BigDecimal.valueOf(100));

        when(inventarioRepository.findById(1)).thenReturn(Optional.of(inv));

        Inventario result = inventarioService.findById(1);

        assertNotNull(result);
        assertEquals(1, result.getIdInventario());
    }

    @Test
    void test2FindByIdNotFound() {
        when(inventarioRepository.findById(999)).thenReturn(Optional.empty());

        assertThrows(GestionInventarioException.class,
            () -> inventarioService.findById(999));
    }

    @Test
    void test3SearchInventory() {
        SearchDTO dto = new SearchDTO();
        dto.setTerm("test");
        dto.setPage(1);

        when(inventarioRepository.countSearchInventory("test")).thenReturn(0L);
        when(inventarioRepository.searchInventoryPage("test", 20, 0)).thenReturn(java.util.List.of());

        var result = inventarioService.searchInventory(dto);

        assertNotNull(result);
    }

    @Test
    void test4SearchByCodigo() {
        SearchDTO dto = new SearchDTO();
        dto.setTerm("COD001");
        dto.setPage(1);

        when(inventarioRepository.countSearchInventarioByCodProduct("COD001")).thenReturn(0L);
        when(inventarioRepository.searchInventarioByCodProductPage("COD001", 20, 0)).thenReturn(java.util.List.of());

        var result = inventarioService.searchInventoryByCodProducto(dto);

        assertNotNull(result);
    }

    @Test
    void test5FilteredSearch() {
        var filter = new KuHub.modules.gestion_inventario.dtos.request.FilterInventoryPageDTO();
        filter.setPage(1);

        when(inventarioRepository.countInventarioFiltered(false, null, false, null, false, false))
            .thenReturn(0L);
        when(inventarioRepository.findInventoryPage(false, null, false, null, false, false, true, 20, 0))
            .thenReturn(java.util.List.of());

        var result = inventarioService.findPagedInventory(filter);

        assertNotNull(result);
    }

    @Test
    void test6MassiveSearch() {
        SearchDTO dto = new SearchDTO();

        when(inventarioRepository.countBulkInventoryFiltered("")).thenReturn(0L);
        when(inventarioRepository.bulkProductInventoryListingPage("", 20, 0)).thenReturn(java.util.List.of());

        var result = inventarioService.findByMassiveInventoryPaginated(dto);

        assertNotNull(result);
    }

    @Test
    void test7GetFilters() throws Exception {
        var filters = new KuHub.modules.gestion_inventario.dtos.response.record.InventoryFilters(
            java.util.List.of(
                new KuHub.modules.gestion_inventario.dtos.response.record.InventoryFilters.SimpleFilter(1, "Cat1")
            ),
            java.util.List.of(
                new KuHub.modules.gestion_inventario.dtos.response.record.InventoryFilters.SimpleFilter(1, "kg")
            )
        );

        when(inventarioRepository.getFiltersInventory()).thenReturn("{}");
        when(objectMapper.readValue("{}", KuHub.modules.gestion_inventario.dtos.response.record.InventoryFilters.class))
            .thenReturn(filters);

        var result = inventarioService.findFiltersInventory();

        assertNotNull(result);
        assertEquals(1, result.categorias().size());
    }

    @Test
    void test8SaveProduct() {
        var dto = new KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductCreateDTO();
        dto.setNombreProducto("Testprod");   // capitalizarPalabras("Testprod") → "Testprod"
        dto.setCodigoProducto("TP001");
        dto.setStock(BigDecimal.valueOf(50));
        dto.setStockLimit(BigDecimal.valueOf(10));
        dto.setIdCategoria((short) 1);
        dto.setIdUnidadMedida((short) 1);

        // capitalizarPalabras("Testprod") → "Testprod"; no existe ningún producto (activo o no) con ese nombre
        when(productoRepository.findByNombreProducto("Testprod")).thenReturn(Optional.empty());
        when(productoRepository.existsBycodProductoAndActivo("TP001", true)).thenReturn(false);
        when(categoriaService.findById((short) 1)).thenReturn(new Categoria());
        when(unidadMedidaService.findById((short) 1)).thenReturn(new UnidadMedida());
        when(productoRepository.save(org.mockito.ArgumentMatchers.any())).thenReturn(new Producto());

        // El servicio asigna el resultado de save() a newInventario y luego accede a getStock()
        Inventario savedInv = new Inventario();
        savedInv.setStock(BigDecimal.valueOf(50));
        when(inventarioRepository.save(org.mockito.ArgumentMatchers.any())).thenReturn(savedInv);

        when(usuarioService.findUserByToken()).thenReturn(new KuHub.modules.gestion_usuario.entity.Usuario());
        // movimientoService.save() es void — no requiere stubbing (no-op por defecto)

        boolean result = inventarioService.saveInventoryWithProduct(dto);

        assertTrue(result);
    }

    @Test
    void test9SaveProductReactivatesInactiveProductAndInventory() {
        // Producto y su inventario fueron eliminados lógicamente (activo=false) y comparten el mismo nombre
        var dto = new KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductCreateDTO();
        dto.setNombreProducto("Testprod");
        dto.setCodigoProducto("TP001");
        dto.setStock(BigDecimal.valueOf(30));
        dto.setStockLimit(BigDecimal.valueOf(5));
        dto.setIdCategoria((short) 1);
        dto.setIdUnidadMedida((short) 1);

        Producto productoInactivo = new Producto();
        productoInactivo.setIdProducto(7);
        productoInactivo.setNombreProducto("Testprod");
        productoInactivo.setCodProducto("TP001");
        productoInactivo.setActivo(false);

        Inventario inventarioInactivo = new Inventario();
        inventarioInactivo.setIdInventario(3);
        inventarioInactivo.setProducto(productoInactivo);
        inventarioInactivo.setStock(BigDecimal.ZERO);
        inventarioInactivo.setActivo(false);

        when(categoriaService.findById((short) 1)).thenReturn(new Categoria());
        when(unidadMedidaService.findById((short) 1)).thenReturn(new UnidadMedida());
        when(productoRepository.findByNombreProducto("Testprod")).thenReturn(Optional.of(productoInactivo));
        // Mismo código que ya tenía → no dispara la validación de código duplicado
        when(productoRepository.save(org.mockito.ArgumentMatchers.any())).thenAnswer(inv -> inv.getArgument(0));
        when(inventarioRepository.findByProducto_IdProducto(7)).thenReturn(Optional.of(inventarioInactivo));
        when(inventarioRepository.save(org.mockito.ArgumentMatchers.any())).thenAnswer(inv -> inv.getArgument(0));
        when(usuarioService.findUserByToken()).thenReturn(new KuHub.modules.gestion_usuario.entity.Usuario());

        boolean result = inventarioService.saveInventoryWithProduct(dto);

        assertTrue(result);
        // Se reactivó el producto y el inventario existentes en vez de crear registros nuevos
        assertTrue(productoInactivo.getActivo());
        assertTrue(inventarioInactivo.getActivo());
        assertEquals(0, inventarioInactivo.getStock().compareTo(BigDecimal.valueOf(30)));
        verify(inventarioRepository, org.mockito.Mockito.never()).save(org.mockito.ArgumentMatchers.argThat(
                i -> i != inventarioInactivo));
    }

    @Test
    void test10SaveProductConflictWhenActiveProductExists() {
        // Ya existe un producto ACTIVO con el mismo nombre → debe seguir siendo un conflicto real
        var dto = new KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductCreateDTO();
        dto.setNombreProducto("Testprod");
        dto.setCodigoProducto("TP001");
        dto.setStock(BigDecimal.valueOf(10));
        dto.setStockLimit(BigDecimal.valueOf(5));
        dto.setIdCategoria((short) 1);
        dto.setIdUnidadMedida((short) 1);

        Producto productoActivo = new Producto();
        productoActivo.setIdProducto(9);
        productoActivo.setNombreProducto("Testprod");
        productoActivo.setActivo(true);

        when(categoriaService.findById((short) 1)).thenReturn(new Categoria());
        when(unidadMedidaService.findById((short) 1)).thenReturn(new UnidadMedida());
        when(productoRepository.findByNombreProducto("Testprod")).thenReturn(Optional.of(productoActivo));

        assertThrows(GestionInventarioException.class,
                () -> inventarioService.saveInventoryWithProduct(dto));
    }

    @Test
    void test11UpdateProduct() {
        // Categoria y UnidadMedida con IDs iguales a los del DTO para evitar cambios innecesarios
        Categoria cat = new Categoria();
        cat.setIdCategoria((short) 1);
        UnidadMedida um = new UnidadMedida();
        um.setIdUnidad((short) 1);

        // Producto con los mismos datos que el DTO (sin cambios) para que las validaciones pasen sin queries extra
        Producto prod = new Producto();
        prod.setNombreProducto("Test");   // capitalizarPalabras("Test") → "Test"
        prod.setCodProducto("TP001");
        prod.setCategoria(cat);
        prod.setUnidadMedida(um);

        Inventario inv = new Inventario();
        inv.setIdInventario(1);
        inv.setStock(BigDecimal.valueOf(100));
        inv.setProducto(prod);

        var dto = new KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductUpdateDTO();
        dto.setIdInventario(1);
        dto.setIdProducto(1);
        dto.setNombreProducto("Test");
        dto.setCodigoProducto("TP001");
        dto.setStock(BigDecimal.valueOf(100));
        dto.setStockLimit(BigDecimal.valueOf(10));
        dto.setIdCategoria((short) 1);
        dto.setIdUnidadMedida((short) 1);
        // delta = null → bloque de movimiento no se ejecuta

        // Object[] con valores reales para InventoryItem.fromRow (12 columnas)
        Object[] row = new Object[12];
        row[0]  = "Test";                     // nombreProducto
        row[1]  = "TP001";                    // codProducto
        row[2]  = null;                        // descripcionProducto
        row[3]  = "Categoria";                 // nombreCategoria
        row[4]  = BigDecimal.valueOf(100);     // stock
        row[5]  = BigDecimal.valueOf(10);      // stockLimit
        row[6]  = "kg";                        // nombreUnidad
        row[7]  = Boolean.FALSE;               // esFraccionario
        row[8]  = 1;                           // idInventario
        row[9]  = 1;                           // idProducto
        row[10] = 1;                           // idCategoria
        row[11] = 1;                           // idUnidad

        when(inventarioRepository.findByIdInventoryWithProductActive(1, true))
            .thenReturn(Optional.of(inv));
        when(inventarioRepository.save(org.mockito.ArgumentMatchers.any()))
            .thenReturn(inv);
        when(inventarioRepository.findByIdToInventoryPage(1))
            .thenReturn(java.util.Collections.singletonList(row));

        Object result = inventarioService.updateInventoryWithProduct(dto);

        assertNotNull(result);
    }

    @Test
    void test12BulkProcess() {
        Inventario inv = new Inventario();
        inv.setIdInventario(1);
        inv.setStock(BigDecimal.valueOf(100));
        inv.setProducto(new Producto());

        var requests = java.util.List.of(
            new KuHub.modules.gestion_inventario.dtos.response.record.BulkInventoryProcess.ItemRequest(
                1, BigDecimal.valueOf(50), BigDecimal.valueOf(100), "ENTRADA_INVENTARIO",
                null, null, null, null
            )
        );

        when(inventarioRepository.findAllByIdsWithProductsActive(java.util.List.of(1)))
            .thenReturn(java.util.List.of(inv));
        when(usuarioService.findUserByToken())
            .thenReturn(new KuHub.modules.gestion_usuario.entity.Usuario());
        when(movimientoService.buildMovementForBulkUpdate(
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.any()
        )).thenReturn(
            KuHub.modules.gestion_inventario.dtos.response.record.BulkMovementResult.success(
                new Movimiento()
            )
        );
        when(inventarioRepository.saveAll(org.mockito.ArgumentMatchers.any()))
            .thenReturn(java.util.List.of(inv));
        when(movimientoRepository.saveAll(org.mockito.ArgumentMatchers.any()))
            .thenReturn(java.util.List.of());

        var result = inventarioService.processBulkInventoryUpdate(requests);

        assertNotNull(result);
    }

    @Test
    void test13SoftDelete() {
        Inventario inv = new Inventario();
        inv.setIdInventario(1);
        inv.setStock(BigDecimal.ZERO);
        inv.setProducto(new Producto());

        when(inventarioRepository.findById(1)).thenReturn(Optional.of(inv));
        when(productoRepository.save(org.mockito.ArgumentMatchers.any()))
            .thenReturn(new Producto());
        when(inventarioRepository.save(org.mockito.ArgumentMatchers.any()))
            .thenReturn(inv);

        boolean result = inventarioService.softDeleteByInventoryWithProduct(1);

        assertTrue(result);
    }

    @Test
    void test14SoftDeleteFail() {
        Inventario inv = new Inventario();
        inv.setIdInventario(1);
        inv.setStock(BigDecimal.valueOf(50));
        inv.setProducto(new Producto());

        when(inventarioRepository.findById(1)).thenReturn(Optional.of(inv));

        assertThrows(GestionInventarioException.class,
            () -> inventarioService.softDeleteByInventoryWithProduct(1));
    }
}
