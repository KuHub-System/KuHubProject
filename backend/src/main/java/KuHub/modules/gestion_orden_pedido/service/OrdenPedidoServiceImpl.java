package KuHub.modules.gestion_orden_pedido.service;

import KuHub.modules.gestion_orden_pedido.dtos.request.OrdenPedidoCreateDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.AbastecimientoProveedorDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.CotizacionConsolidadaDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoConDetallesDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoDetalleDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoListDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.PedidoSemanaResumenDTO;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import KuHub.modules.gestion_orden_pedido.entity.DetalleOrdenPedido;
import KuHub.modules.gestion_orden_pedido.entity.OrdenPedido;
import KuHub.modules.gestion_orden_pedido.enums.EstadoOrdenPedido;
import KuHub.modules.gestion_orden_pedido.exceptions.GestionOrdenPedidoException;
import KuHub.modules.gestion_orden_pedido.repository.DetalleOrdenPedidoRepository;
import KuHub.modules.gestion_orden_pedido.repository.OrdenPedidoRepository;
import KuHub.modules.gestion_proveedor.entity.ProveedorProducto;
import KuHub.modules.gestion_proveedor.repository.ProveedorProductoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.type.TypeFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrdenPedidoServiceImpl implements OrdenPedidoService {

    // Repositorios de acceso a datos para persistencia y consultas
    @Autowired
    private OrdenPedidoRepository ordenPedidoRepository;

    @Autowired
    private DetalleOrdenPedidoRepository detalleOrdenPedidoRepository;

    @Autowired
    private ProveedorProductoRepository proveedorProductoRepository;

    // Componentes utilitarios auxiliares
    @Autowired
    private ObjectMapper objectMapper;

    // ─────────────────────────────────────────────────────────────
    // Consultas de Pedidos Consolidados y Contadores de OP
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<PedidoSemanaResumenDTO> listarPedidosSemana(LocalDate fechaInicio, LocalDate fechaFin) {
        // Consulta los pedidos con estado APROBADO y calcula cuántas OPs activas tiene cada uno.
        List<Object[]> rows = ordenPedidoRepository.findPedidosSemanaConIndicadorOP(fechaInicio, fechaFin);
        log.info("listarPedidosSemana: {} → {} | {} pedidos APROBADO encontrados", fechaInicio, fechaFin, rows.size());
        
        // Mapea el resultado tabular nativo de la base de datos a DTOs tipados.
        return rows.stream().map(PedidoSemanaResumenDTO::fromRow).toList();
    }

    // ─────────────────────────────────────────────────────────────
    // Consolidación y Jerarquización de Cotizaciones (Menor Precio)
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public CotizacionConsolidadaDTO.CotizacionConsolidadaResponse obtenerCotizacionConsolidada(List<Integer> idsPedido) {
        if (idsPedido == null || idsPedido.isEmpty()) {
            log.info("obtenerCotizacionConsolidada: la lista de IDs de pedidos está vacía. Retornando cotización vacía.");
            return new CotizacionConsolidadaDTO.CotizacionConsolidadaResponse(List.of());
        }

        // Invoca la función PL/pgSQL nativa de la BD que consolida, compara precios y retorna un JSON.
        String jsonStr = ordenPedidoRepository.findCotizacionConsolidada(idsPedido);

        try {
            // Maneja respuestas nulas o vacías de la función de base de datos.
            if (jsonStr == null || jsonStr.isBlank() || "null".equals(jsonStr)) {
                return new CotizacionConsolidadaDTO.CotizacionConsolidadaResponse(List.of());
            }

            // Deserializa el JSON obtenido a una lista tipada de grupos de proveedores (ProveedorGrupo).
            var typeRef = TypeFactory.defaultInstance()
                    .constructCollectionType(List.class, CotizacionConsolidadaDTO.ProveedorGrupo.class);
            List<CotizacionConsolidadaDTO.ProveedorGrupo> cotizacion = objectMapper.readValue(jsonStr, typeRef);

            log.info("obtenerCotizacionConsolidada: pedidos consolidados={} | {} proveedores participantes", idsPedido, cotizacion.size());
            return new CotizacionConsolidadaDTO.CotizacionConsolidadaResponse(cotizacion);
        } catch (Exception e) {
            log.error("Error al deserializar cotización consolidada. JSON={} | Excepción={}", jsonStr, e.getMessage());
            throw new GestionOrdenPedidoException(
                    "Error al procesar la estructura de la cotización consolidada.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Abastecimiento de Proveedores — OPs CONFIRMADA por fecha de entrega
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public AbastecimientoProveedorDTO obtenerAbastecimientoConfirmado(LocalDate fechaHasta) {
        // null = filtro "Todas": usar fecha lejana para no limitar por arriba
        LocalDate hasta = (fechaHasta != null) ? fechaHasta : LocalDate.of(2099, 12, 31);
        String jsonStr = ordenPedidoRepository.findAbastecimientoConfirmado(hasta);

        if (jsonStr == null || jsonStr.isBlank() || "null".equals(jsonStr)) {
            log.info("obtenerAbastecimientoConfirmado: sin resultados (hasta={})", hasta);
            return new AbastecimientoProveedorDTO(List.of());
        }

        try {
            var typeRef = TypeFactory.defaultInstance()
                    .constructCollectionType(List.class, AbastecimientoProveedorDTO.OrdenAbastecimiento.class);
            List<AbastecimientoProveedorDTO.OrdenAbastecimiento> ordenes = objectMapper.readValue(jsonStr, typeRef);
            log.info("obtenerAbastecimientoConfirmado: {} OPs CONFIRMADA | hasta={}", ordenes.size(), hasta);
            return new AbastecimientoProveedorDTO(ordenes);
        } catch (Exception e) {
            log.error("Error al deserializar abastecimiento. JSON={} | Excepción={}", jsonStr, e.getMessage());
            throw new GestionOrdenPedidoException(
                    "Error al procesar la estructura de abastecimiento de proveedores.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Generación de Órdenes de Pedido y Snapshot de Precios
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public OrdenPedidoDetalleDTO crearOrdenPedido(OrdenPedidoCreateDTO request) {
        // Paso 1: Instanciar y guardar la cabecera de la Orden de Pedido en estado PENDIENTE.
        OrdenPedido orden = new OrdenPedido();
        orden.setIdPedido(request.getIdPedido());
        orden.setIdProveedor(request.getIdProveedor());
        orden.setObservaciones(request.getObservaciones());
        orden.setEstadoOrdenPedido(EstadoOrdenPedido.PENDIENTE);
        orden = ordenPedidoRepository.save(orden);

        // Paso 2: Iterar y registrar los detalles de entrega de productos correspondientes a la orden.
        int cantidadDetalles = 0;

        for (OrdenPedidoCreateDTO.EntregaDTO e : request.getEntregas()) {
            // Obtener el catálogo de precios neto y con IVA activo del proveedor para congelar los valores (Snapshot).
            // Se selecciona el registro de precio vigente más reciente.
            ProveedorProducto pp = proveedorProductoRepository
                    .findFirstByProveedor_IdProveedorAndProducto_IdProductoAndActivoTrueOrderByFechaActualizacionDesc(
                            request.getIdProveedor(), e.getIdProducto())
                    .orElse(null);

            // Crear y persistir el detalle individual para congelar la cantidad y los precios negociados.
            DetalleOrdenPedido detalle = new DetalleOrdenPedido();
            detalle.setIdOrdenPedido(orden.getIdOrdenPedido());
            detalle.setIdProducto(e.getIdProducto());
            detalle.setCantidadSolicitada(e.getCantidad());
            detalle.setFechaEntrega(e.getFechaEntrega());
            detalle.setPrecioNetoUnitario(pp != null ? pp.getPrecioNeto() : null);
            detalle.setPrecioConIvaUnitario(pp != null ? pp.getPrecioConIva() : null);
            detalleOrdenPedidoRepository.save(detalle);
            cantidadDetalles++;
        }

        log.info("crearOrdenPedido exitoso: OP #{} generada | Pedido consolidado={} | Proveedor={} | {} líneas de detalle persistidas",
                orden.getIdOrdenPedido(), request.getIdPedido(), request.getIdProveedor(), cantidadDetalles);

        // Retornar la confirmación resumida con el ID autogenerado y el recuento de líneas.
        return new OrdenPedidoDetalleDTO(
                orden.getIdOrdenPedido(),
                request.getIdPedido(),
                request.getIdProveedor(),
                orden.getFechaCreacion(),
                orden.getEstadoOrdenPedido(),
                cantidadDetalles
        );
    }

    // ─────────────────────────────────────────────────────────────
    // Listado y Detalle de Órdenes de Pedido
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<OrdenPedidoListDTO> listarOrdenes(Integer diasAtras) {
        List<Object[]> rows;
        if (diasAtras != null && diasAtras > 0) {
            String fechaDesde = LocalDate.now().minusDays(diasAtras).toString();
            rows = ordenPedidoRepository.findListaOrdenesNativeSince(fechaDesde);
        } else {
            rows = ordenPedidoRepository.findListaOrdenesNative();
        }
        log.info("listarOrdenes: {} OPs activas encontradas (diasAtras={})", rows.size(), diasAtras);
        return rows.stream().map(OrdenPedidoListDTO::fromRow).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public OrdenPedidoConDetallesDTO obtenerConDetalles(Integer idOrdenPedido) {
        OrdenPedido op = ordenPedidoRepository.findById(idOrdenPedido)
                .orElseThrow(() -> new GestionOrdenPedidoException(
                        "Orden de Pedido #" + idOrdenPedido + " no encontrada",
                        HttpStatus.NOT_FOUND));

        if (!op.getActivo()) {
            throw new GestionOrdenPedidoException(
                    "Orden de Pedido #" + idOrdenPedido + " está inactiva",
                    HttpStatus.NOT_FOUND);
        }

        var pv  = op.getProveedor();
        var ped = op.getPedido();

        // Mapear detalles (acceso lazy — único SELECT adicional dentro de la transacción)
        java.math.BigDecimal totalNeto   = java.math.BigDecimal.ZERO;
        java.math.BigDecimal totalConIva = java.math.BigDecimal.ZERO;

        var detalles = new java.util.ArrayList<OrdenPedidoConDetallesDTO.DetalleItemDTO>();
        for (DetalleOrdenPedido d : op.getDetalles()) {
            if (!Boolean.TRUE.equals(d.getActivo())) continue;
            var prod = d.getProducto();
            var um   = prod.getUnidadMedida();
            var pNeto   = d.getPrecioNetoUnitario();
            var pConIva = d.getPrecioConIvaUnitario();
            var cant    = d.getCantidadSolicitada();
            if (pNeto   != null && cant != null) totalNeto   = totalNeto.add(cant.multiply(pNeto));
            if (pConIva != null && cant != null) totalConIva = totalConIva.add(cant.multiply(pConIva));
            detalles.add(new OrdenPedidoConDetallesDTO.DetalleItemDTO(
                    d.getIdDetalleOrdenPedido(),
                    prod.getIdProducto(),
                    prod.getNombreProducto(),
                    prod.getCategoria().getNombreCategoria(),
                    um.getAbreviatura(),
                    um.getNombreUnidad(),
                    um.getEsFraccionario(),
                    d.getCantidadSolicitada(),
                    pNeto,
                    pConIva,
                    d.getFechaEntrega(),
                    Boolean.TRUE.equals(d.getEntregado())
            ));
        }

        log.info("obtenerConDetalles: OP #{} | {} detalles activos", idOrdenPedido, detalles.size());

        return new OrdenPedidoConDetallesDTO(
                op.getIdOrdenPedido(),
                ped.getIdPedido(),
                ped.getFechaInicioPedido(),
                ped.getFechaFinPedido(),
                pv.getIdProveedor(),
                pv.getNombreDistribuidora(),
                pv.getNombreProveedor(),
                pv.getTelefonoProveedor(),
                pv.getEmailProveedor(),
                pv.getDireccionProveedor(),
                op.getFechaCreacion(),
                op.getEstadoOrdenPedido().name(),
                op.getObservaciones(),
                totalNeto,
                totalConIva,
                detalles
        );
    }

    // ─────────────────────────────────────────────────────────────
    // Cambio de Estado de Órdenes de Pedido
    // ─────────────────────────────────────────────────────────────

    /** Transiciones válidas por estado origen. */
    private static final Map<EstadoOrdenPedido, Set<EstadoOrdenPedido>> TRANSICIONES_VALIDAS = Map.of(
            EstadoOrdenPedido.PENDIENTE,   EnumSet.of(EstadoOrdenPedido.ENVIADA,    EstadoOrdenPedido.CANCELADA),
            EstadoOrdenPedido.ENVIADA,     EnumSet.of(EstadoOrdenPedido.CONFIRMADA, EstadoOrdenPedido.PENDIENTE, EstadoOrdenPedido.CANCELADA),
            EstadoOrdenPedido.CONFIRMADA,  EnumSet.of(EstadoOrdenPedido.RECIBIDA,   EstadoOrdenPedido.ENVIADA,   EstadoOrdenPedido.CANCELADA),
            EstadoOrdenPedido.RECIBIDA,    EnumSet.noneOf(EstadoOrdenPedido.class),
            EstadoOrdenPedido.CANCELADA,   EnumSet.of(EstadoOrdenPedido.PENDIENTE)
    );

    @Override
    @Transactional
    public OrdenPedidoListDTO cambiarEstado(Integer idOrdenPedido, EstadoOrdenPedido nuevoEstado) {
        OrdenPedido op = ordenPedidoRepository.findById(idOrdenPedido)
                .orElseThrow(() -> new GestionOrdenPedidoException(
                        "Orden de Pedido #" + idOrdenPedido + " no encontrada",
                        HttpStatus.NOT_FOUND));

        if (!op.getActivo()) {
            throw new GestionOrdenPedidoException(
                    "Orden de Pedido #" + idOrdenPedido + " está inactiva",
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        EstadoOrdenPedido estadoActual = op.getEstadoOrdenPedido();
        Set<EstadoOrdenPedido> permitidos = TRANSICIONES_VALIDAS.getOrDefault(estadoActual, EnumSet.noneOf(EstadoOrdenPedido.class));

        if (!permitidos.contains(nuevoEstado)) {
            throw new GestionOrdenPedidoException(
                    String.format("Transición inválida: %s → %s. Estados permitidos: %s",
                            estadoActual, nuevoEstado, permitidos),
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        op.setEstadoOrdenPedido(nuevoEstado);
        ordenPedidoRepository.save(op);

        log.info("cambiarEstado OP #{}: {} → {}", idOrdenPedido, estadoActual, nuevoEstado);

        // Retorna el ítem actualizado re-ejecutando la query de lista para este registro.
        return ordenPedidoRepository.findListaOrdenesNative()
                .stream()
                .filter(row -> ((Number) row[0]).intValue() == idOrdenPedido)
                .findFirst()
                .map(OrdenPedidoListDTO::fromRow)
                .orElseThrow(() -> new GestionOrdenPedidoException(
                        "Error al refrescar OP #" + idOrdenPedido, HttpStatus.INTERNAL_SERVER_ERROR));
    }

    // ─────────────────────────────────────────────────────────────
    // Marcar detalles como entregados (bulk)
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public int marcarDetallesEntregados(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return 0;
        int actualizados = detalleOrdenPedidoRepository.marcarEntregados(ids);
        log.info("marcarDetallesEntregados: {} filas actualizadas de {} solicitadas", actualizados, ids.size());
        return actualizados;
    }
}
