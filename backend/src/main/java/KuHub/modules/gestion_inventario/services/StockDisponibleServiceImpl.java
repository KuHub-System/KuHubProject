package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.RegistrarDisponibleDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.StockDisponiblePage;
import KuHub.modules.gestion_inventario.entity.Producto;
import KuHub.modules.gestion_inventario.entity.StockDisponible;
import KuHub.modules.gestion_inventario.repository.ProductoRepository;
import KuHub.modules.gestion_inventario.repository.StockDisponibleRepository;
import KuHub.utils.PaginationUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class StockDisponibleServiceImpl implements StockDisponibleService {

    /**Repositories*/
    @Autowired
    private StockDisponibleRepository stockDisponibleRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Override
    @Transactional
    public void registrar(List<RegistrarDisponibleDTO> items) {
        List<StockDisponible> entidades = new ArrayList<>();
        for (RegistrarDisponibleDTO dto : items) {
            Producto producto = productoRepository.findById(dto.idProducto())
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + dto.idProducto()));
            StockDisponible sd = new StockDisponible();
            sd.setProducto(producto);
            sd.setIdSolicitud(dto.idSolicitud());
            sd.setIdPedido(dto.idPedido());
            sd.setCantidad(dto.cantidad());
            // Si no viene tipo, la entidad conserva su default 'INVENTARIO'.
            if (dto.tipoDisponible() != null && !dto.tipoDisponible().isBlank()) {
                sd.setTipoDisponible(dto.tipoDisponible());
            }
            entidades.add(sd);
        }
        stockDisponibleRepository.saveAll(entidades);
        log.info("StockDisponible: {} registro(s) guardado(s)", entidades.size());
    }

    @Override
    @Transactional(readOnly = true)
    public StockDisponiblePage listar(String tipo, int page) {
        long total = stockDisponibleRepository.countByTipoAndActivo(tipo);
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(page, total);
        List<Object[]> rows = stockDisponibleRepository.findByTipoPaginado(tipo, paging.limit(), paging.offset());
        return StockDisponiblePage.of(rows, paging, total);
    }
}
