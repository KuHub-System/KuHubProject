package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.RegistrarDisponibleDTO;
import KuHub.modules.gestion_inventario.dtos.request.RestarDisponibleDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.RestarDisponibleResult;
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

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

    @Override
    @Transactional(readOnly = true)
    public Map<Integer, BigDecimal> consultarDisponiblePorProductos(List<Integer> idsProducto, String tipo) {
        Map<Integer, BigDecimal> resultado = new LinkedHashMap<>();
        if (idsProducto == null || idsProducto.isEmpty()) {
            return resultado;
        }
        String tipoFinal = (tipo != null && !tipo.isBlank()) ? tipo : "INVENTARIO";
        List<Object[]> rows = stockDisponibleRepository.sumDisponibleByProductosAndTipo(idsProducto, tipoFinal);
        for (Object[] row : rows) {
            Integer idProducto = ((Number) row[0]).intValue();
            BigDecimal disponible = new BigDecimal(row[1].toString());
            resultado.put(idProducto, disponible);
        }
        return resultado;
    }

    @Override
    @Transactional
    public RestarDisponibleResult restar(List<RestarDisponibleDTO> items) {
        List<RestarDisponibleResult.ItemResult> resultados = new ArrayList<>();

        for (RestarDisponibleDTO dto : items) {
            String tipo = (dto.tipoDisponible() != null && !dto.tipoDisponible().isBlank())
                    ? dto.tipoDisponible() : "INVENTARIO";

            List<StockDisponible> registros =
                    stockDisponibleRepository.findActivosByProductoAndTipoFifo(dto.idProducto(), tipo);

            BigDecimal disponibleReal = registros.stream()
                    .map(StockDisponible::getCantidad)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal aRestar = dto.cantidad() != null ? dto.cantidad() : BigDecimal.ZERO;

            // Proceso en paralelo: el disponible real quedó por debajo de lo solicitado → no descontar.
            if (disponibleReal.compareTo(aRestar) < 0) {
                log.warn("StockDisponible.restar INSUFICIENTE. Producto: {} | Solicitado: {} | Real: {}",
                        dto.idProducto(), aRestar, disponibleReal);
                resultados.add(new RestarDisponibleResult.ItemResult(
                        dto.idProducto(), "INSUFICIENTE", disponibleReal, BigDecimal.ZERO));
                continue;
            }

            // Consumo FIFO de los registros activos.
            BigDecimal restante = aRestar;
            List<StockDisponible> modificados = new ArrayList<>();
            for (StockDisponible sd : registros) {
                if (restante.compareTo(BigDecimal.ZERO) <= 0) break;
                BigDecimal cant = sd.getCantidad();
                if (cant.compareTo(restante) <= 0) {
                    sd.setCantidad(BigDecimal.ZERO);
                    sd.setActivo(false);
                    restante = restante.subtract(cant);
                } else {
                    sd.setCantidad(cant.subtract(restante));
                    restante = BigDecimal.ZERO;
                }
                modificados.add(sd);
            }
            stockDisponibleRepository.saveAll(modificados);

            // Si el real difería de lo que veía el usuario, avisar que se sincronizó.
            boolean difiere = dto.disponibleEnVista() != null
                    && disponibleReal.compareTo(dto.disponibleEnVista()) != 0;
            String estado = difiere ? "SINCRONIZADO" : "OK";
            resultados.add(new RestarDisponibleResult.ItemResult(
                    dto.idProducto(), estado, disponibleReal, aRestar));
        }

        log.info("StockDisponible.restar: {} producto(s) procesado(s)", resultados.size());
        return new RestarDisponibleResult(resultados);
    }
}
