package KuHub.modules.pedido_semana_a_bodega.services;

import KuHub.modules.gestion_academica.repository.AsignaturaRepository;
import KuHub.modules.gestion_academica.repository.SemanaRepository;
import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.repository.ProductoRepository;
import KuHub.modules.gestion_inventario.services.ProductoService;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.CountPedidoSemanaBodegaAndStatusView;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.PedidoSemanaBodegaWithDetailsUpdateDTO;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.dto.PedidoSemanaBodegaItemDTO;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.dto.PedidoSemanaBodegaWithDetailsCreateDTO;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection.AsignaturaActivaView;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection.DetailsByUpdateView;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.record.PedidoSemanaBodegasPage;
import KuHub.modules.pedido_semana_a_bodega.entity.DetallePedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.entity.PedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.exceptions.PedidoSemanaBodegaException;
import KuHub.modules.pedido_semana_a_bodega.repository.DetallePedidoSemanaBodegaRepository;
import KuHub.modules.pedido_semana_a_bodega.repository.PedidoSemanaBodegaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PedidoSemanaBodegaServiceImpTest {

    @Mock private PedidoSemanaBodegaRepository recetaRepository;
    @Mock private DetallePedidoSemanaBodegaRepository detallePedidoSemanaBodegaRepository;
    @Mock private ProductoRepository productoRepository;
    @Mock private AsignaturaRepository asignaturaRepository;
    @Mock private SemanaRepository semanaRepository;
    @Mock private ProductoService productoService;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks
    private PedidoSemanaBodegaServiceImp service;

    // ─── findById ────────────────────────────────────────────────────────────

    @Test
    void test01FindByIdExisting() {
        // Arrange
        PedidoSemanaBodega pedido = new PedidoSemanaBodega();
        pedido.setIdPedidoSemanaBodega(1);
        pedido.setNombrePedido("Pedido Test");
        when(recetaRepository.findById(1)).thenReturn(Optional.of(pedido));

        // Act
        PedidoSemanaBodega result = service.findById(1);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getIdPedidoSemanaBodega());
    }

    @Test
    void test02FindByIdNotFound() {
        // Arrange
        when(recetaRepository.findById(999)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(PedidoSemanaBodegaException.class, () -> service.findById(999));
    }

    // ─── countRecipesAndStatus ───────────────────────────────────────────────

    @Test
    void test03CountRecipesAndStatus() {
        // Arrange
        CountPedidoSemanaBodegaAndStatusView view = mock(CountPedidoSemanaBodegaAndStatusView.class);
        when(view.getTotalPedidos()).thenReturn(10L);
        when(view.getTotal_activos()).thenReturn(7L);
        when(view.getTotal_inactivos()).thenReturn(3L);
        when(recetaRepository.countRecipesAndStatus()).thenReturn(view);

        // Act
        CountPedidoSemanaBodegaAndStatusView result = service.countRecipesAndStatus();

        // Assert
        assertNotNull(result);
        assertEquals(10L, result.getTotalPedidos());
        assertEquals(7L, result.getTotal_activos());
        assertEquals(3L, result.getTotal_inactivos());
    }

    // ─── findAllRecipesPaginated ─────────────────────────────────────────────

    @Test
    void test04FindAllRecipesPaginatedNoFilters() {
        // Arrange
        when(recetaRepository.countByActivoTrue()).thenReturn(0L);
        when(recetaRepository.findAllWithDetailsPaging(anyInt(), anyInt())).thenReturn(List.of());

        // Act
        PedidoSemanaBodegasPage result = service.findAllRecipesPaginated(1, null, null);

        // Assert
        assertNotNull(result);
        assertTrue(result.content().isEmpty());
    }

    @Test
    void test05FindAllRecipesPaginatedBySemana() {
        // Arrange
        when(recetaRepository.countByActivoTrueAndIdSemana(1)).thenReturn(0L);
        when(recetaRepository.findAllWithDetailsPagingByIdSemana(eq(1), anyInt(), anyInt())).thenReturn(List.of());

        // Act
        PedidoSemanaBodegasPage result = service.findAllRecipesPaginated(1, 1, null);

        // Assert
        assertNotNull(result);
    }

    @Test
    void test06FindAllRecipesPaginatedByAsignatura() {
        // Arrange
        when(recetaRepository.countByActivoTrueAndIdAsignatura(2)).thenReturn(0L);
        when(recetaRepository.findAllWithDetailsPagingByIdAsignatura(eq(2), anyInt(), anyInt())).thenReturn(List.of());

        // Act
        PedidoSemanaBodegasPage result = service.findAllRecipesPaginated(1, null, 2);

        // Assert
        assertNotNull(result);
    }

    @Test
    void test07FindAllRecipesPaginatedBySemanaAndAsignatura() {
        // Arrange
        when(recetaRepository.countByActivoTrueAndIdSemanaAndIdAsignatura(1, 2)).thenReturn(0L);
        when(recetaRepository.findAllWithDetailsPagingByIdSemanaAndIdAsignatura(eq(1), eq(2), anyInt(), anyInt())).thenReturn(List.of());

        // Act
        PedidoSemanaBodegasPage result = service.findAllRecipesPaginated(1, 1, 2);

        // Assert
        assertNotNull(result);
    }

    // ─── findAllWithDetailsAndSearchPaging ───────────────────────────────────

    @Test
    void test08SearchPagingNoFilters() {
        // Arrange
        SearchDTO dto = new SearchDTO();
        dto.setTerm(null);
        dto.setPage(1);
        when(recetaRepository.countWithSearch("")).thenReturn(0L);
        when(recetaRepository.findAllWithDetailsAndSearch(eq(""), anyInt(), anyInt())).thenReturn(List.of());

        // Act
        PedidoSemanaBodegasPage result = service.findAllWithDetailsAndSearchPaging(dto);

        // Assert
        assertNotNull(result);
    }

    @Test
    void test09SearchPagingBySemana() {
        // Arrange
        SearchDTO dto = new SearchDTO();
        dto.setTerm("arroz");
        dto.setPage(1);
        dto.setIdSemana(3);
        when(recetaRepository.countWithSearchAndIdSemana("arroz", 3)).thenReturn(0L);
        when(recetaRepository.findAllWithDetailsAndSearchByIdSemana(eq("arroz"), eq(3), anyInt(), anyInt())).thenReturn(List.of());

        // Act
        PedidoSemanaBodegasPage result = service.findAllWithDetailsAndSearchPaging(dto);

        // Assert
        assertNotNull(result);
    }

    @Test
    void test10SearchPagingByAsignatura() {
        // Arrange
        SearchDTO dto = new SearchDTO();
        dto.setTerm("");
        dto.setPage(1);
        dto.setIdAsignatura(5);
        when(recetaRepository.countWithSearchAndIdAsignatura("", 5)).thenReturn(0L);
        when(recetaRepository.findAllWithDetailsAndSearchByIdAsignatura(eq(""), eq(5), anyInt(), anyInt())).thenReturn(List.of());

        // Act
        PedidoSemanaBodegasPage result = service.findAllWithDetailsAndSearchPaging(dto);

        // Assert
        assertNotNull(result);
    }

    @Test
    void test11SearchPagingBySemanaAndAsignatura() {
        // Arrange
        SearchDTO dto = new SearchDTO();
        dto.setTerm("pollo");
        dto.setPage(1);
        dto.setIdSemana(2);
        dto.setIdAsignatura(4);
        when(recetaRepository.countWithSearchAndIdSemanaAndIdAsignatura("pollo", 2, 4)).thenReturn(0L);
        when(recetaRepository.findAllWithDetailsAndSearchByIdSemanaAndIdAsignatura(eq("pollo"), eq(2), eq(4), anyInt(), anyInt())).thenReturn(List.of());

        // Act
        PedidoSemanaBodegasPage result = service.findAllWithDetailsAndSearchPaging(dto);

        // Assert
        assertNotNull(result);
    }

    // ─── saveRecipeWithDetails ───────────────────────────────────────────────

    @Test
    void test12SaveRecipeWithDetailsSuccess() {
        // Arrange
        PedidoSemanaBodegaItemDTO item = new PedidoSemanaBodegaItemDTO(1, BigDecimal.valueOf(2), null);
        PedidoSemanaBodegaWithDetailsCreateDTO dto = new PedidoSemanaBodegaWithDetailsCreateDTO(
                "Pedido Semana", null, List.of(item), "ACTIVO", null, null
        );

        when(recetaRepository.existsByNombrePedidoAndActivoTrue("Pedido Semana")).thenReturn(false);

        PedidoSemanaBodega saved = new PedidoSemanaBodega();
        saved.setIdPedidoSemanaBodega(1);
        when(recetaRepository.save(any())).thenReturn(saved);
        when(detallePedidoSemanaBodegaRepository.save(any())).thenReturn(new DetallePedidoSemanaBodega());

        // Act
        boolean result = service.saveRecipeWithDetails(dto);

        // Assert
        assertTrue(result);
        verify(recetaRepository).save(any(PedidoSemanaBodega.class));
        verify(detallePedidoSemanaBodegaRepository).save(any(DetallePedidoSemanaBodega.class));
    }

    @Test
    void test13SaveRecipeWithDetailsConflictName() {
        // Arrange
        PedidoSemanaBodegaItemDTO item = new PedidoSemanaBodegaItemDTO(1, BigDecimal.ONE, null);
        PedidoSemanaBodegaWithDetailsCreateDTO dto = new PedidoSemanaBodegaWithDetailsCreateDTO(
                "Pedido Existente", null, List.of(item), "ACTIVO", null, null
        );
        when(recetaRepository.existsByNombrePedidoAndActivoTrue("Pedido Existente")).thenReturn(true);

        // Act & Assert
        PedidoSemanaBodegaException ex = assertThrows(PedidoSemanaBodegaException.class,
                () -> service.saveRecipeWithDetails(dto));
        assertEquals(org.springframework.http.HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    void test14SaveRecipeWithDetailsSemanaInexistente() {
        // Arrange
        PedidoSemanaBodegaItemDTO item = new PedidoSemanaBodegaItemDTO(1, BigDecimal.ONE, null);
        PedidoSemanaBodegaWithDetailsCreateDTO dto = new PedidoSemanaBodegaWithDetailsCreateDTO(
                "Pedido Con Semana", null, List.of(item), "ACTIVO", 99, null
        );
        when(recetaRepository.existsByNombrePedidoAndActivoTrue("Pedido Con Semana")).thenReturn(false);
        when(semanaRepository.existsById(99)).thenReturn(false);

        // Act & Assert
        PedidoSemanaBodegaException ex = assertThrows(PedidoSemanaBodegaException.class,
                () -> service.saveRecipeWithDetails(dto));
        assertEquals(org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY, ex.getStatus());
    }

    @Test
    void test15SaveRecipeWithDetailsAsignaturaInexistente() {
        // Arrange
        PedidoSemanaBodegaItemDTO item = new PedidoSemanaBodegaItemDTO(1, BigDecimal.ONE, null);
        PedidoSemanaBodegaWithDetailsCreateDTO dto = new PedidoSemanaBodegaWithDetailsCreateDTO(
                "Pedido Con Asignatura", null, List.of(item), "ACTIVO", null, 88
        );
        when(recetaRepository.existsByNombrePedidoAndActivoTrue("Pedido Con Asignatura")).thenReturn(false);
        when(asignaturaRepository.existsByIdAsignaturaAndActivoTrue(88)).thenReturn(false);

        // Act & Assert
        PedidoSemanaBodegaException ex = assertThrows(PedidoSemanaBodegaException.class,
                () -> service.saveRecipeWithDetails(dto));
        assertEquals(org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY, ex.getStatus());
    }

    @Test
    void test16SaveConsolidaDuplicados() {
        // Arrange — dos items con mismo idProducto: deben consolidarse en un solo detalle
        PedidoSemanaBodegaItemDTO item1 = new PedidoSemanaBodegaItemDTO(1, BigDecimal.valueOf(3), null);
        PedidoSemanaBodegaItemDTO item2 = new PedidoSemanaBodegaItemDTO(1, BigDecimal.valueOf(2), "obs");
        PedidoSemanaBodegaWithDetailsCreateDTO dto = new PedidoSemanaBodegaWithDetailsCreateDTO(
                "Pedido Dup", null, List.of(item1, item2), "ACTIVO", null, null
        );
        when(recetaRepository.existsByNombrePedidoAndActivoTrue("Pedido Dup")).thenReturn(false);
        PedidoSemanaBodega saved = new PedidoSemanaBodega();
        saved.setIdPedidoSemanaBodega(2);
        when(recetaRepository.save(any())).thenReturn(saved);
        when(detallePedidoSemanaBodegaRepository.save(any())).thenReturn(new DetallePedidoSemanaBodega());

        // Act
        boolean result = service.saveRecipeWithDetails(dto);

        // Assert — solo un save de detalle (consolidado)
        assertTrue(result);
        verify(detallePedidoSemanaBodegaRepository, times(1)).save(any(DetallePedidoSemanaBodega.class));
    }

    // ─── changeStatus ────────────────────────────────────────────────────────

    @Test
    void test17ChangeStatusSuccess() {
        // Arrange
        when(recetaRepository.toggleRecipeStatus(1)).thenReturn(1);

        // Act
        boolean result = service.changeStatus(1);

        // Assert
        assertTrue(result);
    }

    @Test
    void test18ChangeStatusNotFound() {
        // Arrange
        when(recetaRepository.toggleRecipeStatus(999)).thenReturn(0);

        // Act & Assert
        PedidoSemanaBodegaException ex = assertThrows(PedidoSemanaBodegaException.class,
                () -> service.changeStatus(999));
        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND, ex.getStatus());
    }

    // ─── updateRecipeWithDetails ─────────────────────────────────────────────

    @Test
    void test19UpdateRecipeWithDetailsSuccess() {
        // Arrange
        PedidoSemanaBodega oldRecipe = new PedidoSemanaBodega();
        oldRecipe.setIdPedidoSemanaBodega(1);
        oldRecipe.setNombrePedido("Pedido Test");
        oldRecipe.setEstadoPedido(PedidoSemanaBodega.EstadoPedidoSemana.ACTIVO);
        when(recetaRepository.findById(1)).thenReturn(Optional.of(oldRecipe));
        when(recetaRepository.save(any())).thenReturn(oldRecipe);

        DetailsByUpdateView detailView = mock(DetailsByUpdateView.class);
        when(detailView.getIdDetalle()).thenReturn(10);
        when(detailView.getIdProducto()).thenReturn(5);
        when(detailView.getCantidad()).thenReturn(BigDecimal.valueOf(1));
        when(detallePedidoSemanaBodegaRepository.findDetailsForUpdate(1)).thenReturn(List.of(detailView));

        PedidoSemanaBodegaWithDetailsUpdateDTO request = new PedidoSemanaBodegaWithDetailsUpdateDTO();
        request.setIdPedidoSemanaBodega(1);
        request.setNombrePedido("Pedido Test");
        request.setEstadoPedido("ACTIVO");

        // Act
        boolean result = service.updateRecipeWithDetails(request);

        // Assert
        assertTrue(result);
        verify(recetaRepository).save(any(PedidoSemanaBodega.class));
    }

    @Test
    void test20UpdateConflictName() {
        // Arrange — nombre en minúsculas → capitalizarPalabras lo cambia → verifica duplicado
        PedidoSemanaBodega oldRecipe = new PedidoSemanaBodega();
        oldRecipe.setIdPedidoSemanaBodega(1);
        oldRecipe.setNombrePedido("Pedido Test");
        oldRecipe.setEstadoPedido(PedidoSemanaBodega.EstadoPedidoSemana.ACTIVO);
        when(recetaRepository.findById(1)).thenReturn(Optional.of(oldRecipe));
        when(recetaRepository.existsByNombrePedidoAndActivoTrue("Pedido Duplicado")).thenReturn(true);

        PedidoSemanaBodegaWithDetailsUpdateDTO request = new PedidoSemanaBodegaWithDetailsUpdateDTO();
        request.setIdPedidoSemanaBodega(1);
        request.setNombrePedido("pedido duplicado"); // minúsculas → capitaliza → conflicto
        request.setEstadoPedido("ACTIVO");

        // Act & Assert
        PedidoSemanaBodegaException ex = assertThrows(PedidoSemanaBodegaException.class,
                () -> service.updateRecipeWithDetails(request));
        assertEquals(org.springframework.http.HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    void test21UpdateSemanaInexistente() {
        // Arrange
        PedidoSemanaBodega oldRecipe = new PedidoSemanaBodega();
        oldRecipe.setIdPedidoSemanaBodega(1);
        oldRecipe.setNombrePedido("Pedido Test");
        oldRecipe.setEstadoPedido(PedidoSemanaBodega.EstadoPedidoSemana.ACTIVO);
        oldRecipe.setIdSemana(null);
        when(recetaRepository.findById(1)).thenReturn(Optional.of(oldRecipe));
        when(semanaRepository.existsById(77)).thenReturn(false);

        PedidoSemanaBodegaWithDetailsUpdateDTO request = new PedidoSemanaBodegaWithDetailsUpdateDTO();
        request.setIdPedidoSemanaBodega(1);
        request.setNombrePedido("Pedido Test");
        request.setEstadoPedido("ACTIVO");
        request.setIdSemana(77);

        // Act & Assert
        PedidoSemanaBodegaException ex = assertThrows(PedidoSemanaBodegaException.class,
                () -> service.updateRecipeWithDetails(request));
        assertEquals(org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY, ex.getStatus());
    }

    // ─── softDeleteRecipeWithDetails ─────────────────────────────────────────

    @Test
    void test22SoftDeleteSuccess() {
        // Arrange
        when(recetaRepository.softDeleteRecipeById(1)).thenReturn(1);

        // Act
        boolean result = service.softDeleteRecipeWithDetails(1);

        // Assert
        assertTrue(result);
    }

    @Test
    void test23SoftDeleteNotFound() {
        // Arrange
        when(recetaRepository.softDeleteRecipeById(999)).thenReturn(0);

        // Act
        boolean result = service.softDeleteRecipeWithDetails(999);

        // Assert
        assertFalse(result);
    }

    // ─── obtenerAsignaturasActivas ────────────────────────────────────────────

    @Test
    void test24ObtenerAsignaturasActivas() {
        // Arrange
        AsignaturaActivaView view = mock(AsignaturaActivaView.class);
        when(view.getIdAsignatura()).thenReturn(1);
        when(view.getNombreAsignatura()).thenReturn("Cocina Básica");
        when(recetaRepository.findAllAsignaturasActivas()).thenReturn(List.of(view));

        // Act
        List<AsignaturaActivaView> result = service.obtenerAsignaturasActivas();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(1, result.get(0).getIdAsignatura());
        assertEquals("Cocina Básica", result.get(0).getNombreAsignatura());
    }
}
