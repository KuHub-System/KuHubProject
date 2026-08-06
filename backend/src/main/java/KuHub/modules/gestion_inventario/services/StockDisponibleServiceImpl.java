package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.response.record.DisponibleInventarioPage;
import KuHub.modules.gestion_inventario.dtos.response.record.DisponibleRealPage;
import KuHub.modules.gestion_inventario.dtos.response.record.SobranteBodegaPeriodoPage;
import KuHub.modules.gestion_inventario.repository.StockDisponibleRepository;
import KuHub.utils.PaginationUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class StockDisponibleServiceImpl implements StockDisponibleService {

    /**Repositories*/
    @Autowired
    private StockDisponibleRepository stockDisponibleRepository;

    @Override
    @Transactional(readOnly = true)
    public DisponibleRealPage listarDisponibleReal(String busqueda, Integer idCategoria, int page) {
        long total = stockDisponibleRepository.countDisponibleReal(idCategoria, busqueda);
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(page, total);
        List<Object[]> rows = stockDisponibleRepository.findDisponibleRealPaginado(
                idCategoria, busqueda, paging.limit(), paging.offset());
        return DisponibleRealPage.of(rows, paging, total);
    }

    @Override
    @Transactional(readOnly = true)
    public DisponibleInventarioPage listarDisponibleInventario(String busqueda, Integer idCategoria, int page) {
        long total = stockDisponibleRepository.countDisponibleInventario(idCategoria, busqueda);
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(page, total);
        List<Object[]> rows = stockDisponibleRepository.findDisponibleInventarioPaginado(
                idCategoria, busqueda, paging.limit(), paging.offset());
        return DisponibleInventarioPage.of(rows, paging, total);
    }

    @Override
    @Transactional(readOnly = true)
    public SobranteBodegaPeriodoPage listarBodegaTransitoPeriodo(
            LocalDate fechaInicio, LocalDate fechaFin, int page, Integer idCategoria, String busqueda) {
        long total = stockDisponibleRepository.countSobranteBodegaTransitoPeriodo(fechaInicio, fechaFin, idCategoria, busqueda);
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(page, total);
        List<Object[]> rows = stockDisponibleRepository.findSobranteBodegaTransitoPeriodoPaginado(
                fechaInicio, fechaFin, idCategoria, busqueda, paging.limit(), paging.offset());
        return SobranteBodegaPeriodoPage.of(rows, paging, total);
    }
}
