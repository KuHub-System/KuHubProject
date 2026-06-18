package KuHub.modules.gestion_orden_pedido.service;

import KuHub.modules.gestion_orden_pedido.dtos.request.OrdenPedidoCreateDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.AbastecimientoProveedorDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.CotizacionConsolidadaDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.NotificacionEntregaDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoConDetallesDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoDetalleDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoListDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoResumenDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.PedidoSemanaResumenDTO;
import KuHub.modules.gestion_solicitud.dtos.respose.record.NotificacionSemanaDTO;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import KuHub.modules.gestion_orden_pedido.dtos.request.ReservaStockSolicitudCreateDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.DisponibleRealDTO;
import KuHub.modules.gestion_orden_pedido.entity.DetalleOrdenPedido;
import KuHub.modules.gestion_orden_pedido.entity.DetalleOrdenPedidoSolicitud;
import KuHub.modules.gestion_orden_pedido.entity.ReservaStockSolicitud;
import KuHub.modules.gestion_orden_pedido.repository.ReservaStockSolicitudRepository;
import KuHub.modules.gestion_orden_pedido.entity.OrdenPedido;
import KuHub.modules.gestion_orden_pedido.enums.EstadoOrdenPedido;
import KuHub.modules.gestion_orden_pedido.exceptions.GestionOrdenPedidoException;
import KuHub.modules.gestion_orden_pedido.repository.DetalleOrdenPedidoRepository;
import KuHub.modules.gestion_orden_pedido.repository.DetalleOrdenPedidoSolicitudRepository;
import KuHub.modules.gestion_orden_pedido.repository.OrdenPedidoRepository;
import KuHub.modules.gestion_pedido.repository.PedidoSolicitudRepository;
import KuHub.modules.gestion_proveedor.entity.ProveedorProducto;
import KuHub.modules.gestion_inventario.repository.MovimientoRepository;
import KuHub.modules.gestion_proveedor.repository.ProveedorProductoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.type.TypeFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
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
    private DetalleOrdenPedidoSolicitudRepository detalleOrdenPedidoSolicitudRepository;

    @Autowired
    private ReservaStockSolicitudRepository reservaStockSolicitudRepository;

    @Autowired
    private ProveedorProductoRepository proveedorProductoRepository;

    @Autowired
    private PedidoSolicitudRepository pedidoSolicitudRepository;

    @Autowired
    private MovimientoRepository movimientoRepository;

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

    @Override
    @Transactional(readOnly = true)
    public List<DisponibleRealDTO> obtenerDisponibleReal(List<Integer> idsProducto) {
        if (idsProducto == null || idsProducto.isEmpty()) {
            return List.of();
        }
        return ordenPedidoRepository.findDisponibleRealByProductos(idsProducto)
                .stream()
                .map(DisponibleRealDTO::fromRow)
                .toList();
    }

    @Override
    @Transactional
    public int registrarReservasStock(List<ReservaStockSolicitudCreateDTO> reservas) {
        if (reservas == null || reservas.isEmpty()) {
            return 0;
        }
        int registradas = 0;
        for (ReservaStockSolicitudCreateDTO dto : reservas) {
            if (dto.getCantidad() == null || dto.getCantidad().signum() <= 0) continue;
            // Upsert por la clave única (solicitud, producto): si ya existe se actualiza.
            ReservaStockSolicitud reserva = reservaStockSolicitudRepository
                    .findByIdSolicitudAndIdProducto(dto.getIdSolicitud(), dto.getIdProducto())
                    .orElseGet(ReservaStockSolicitud::new);
            reserva.setIdSolicitud(dto.getIdSolicitud());
            reserva.setIdProducto(dto.getIdProducto());
            reserva.setCantidad(dto.getCantidad());
            reserva.setActivo(true);
            if (reserva.getFechaReserva() == null) reserva.setFechaReserva(java.time.LocalDate.now());
            reservaStockSolicitudRepository.save(reserva);
            registradas++;
        }
        log.info("registrarReservasStock: {} reservas registradas/actualizadas", registradas);
        return registradas;
    }

    @Override
    @Transactional
    public int reservarDisponiblePedido(Integer idPedido) {
        // Porciones (idSolicitud, idProducto, cantidad) de las solicitudes EN_PEDIDO del pedido.
        List<Object[]> rows = pedidoSolicitudRepository.findSolicitudProductoCantidadByPedido(idPedido);
        if (rows.isEmpty()) return 0;

        // Extraer IDs de solicitudes para buscar reservas existentes
        List<Integer> idsSolicitudes = rows.stream()
                .map(r -> ((Number) r[0]).intValue())
                .distinct()
                .toList();

        // Buscar todas las reservas activas para estas solicitudes
        List<ReservaStockSolicitud> reservasExistentes = reservaStockSolicitudRepository
                .findByIdSolicitudInAndActivoTrue(idsSolicitudes);

        // Mapear reservas existentes por "idSolicitud-idProducto"
        Map<String, BigDecimal> reservaExistenteMap = new HashMap<>();
        for (ReservaStockSolicitud r : reservasExistentes) {
            String key = r.getIdSolicitud() + "-" + r.getIdProducto();
            reservaExistenteMap.put(key, r.getCantidad());
        }

        // idProducto → porciones (idSolicitud, cantidad), preservando el orden por fecha de solicitud.
        Map<Integer, List<Object[]>> porcionesPorProducto = new LinkedHashMap<>();
        for (Object[] r : rows) {
            Integer idSolicitud = ((Number) r[0]).intValue();
            Integer idProducto = ((Number) r[1]).intValue();
            BigDecimal cantidad = new BigDecimal(r[2].toString());
            porcionesPorProducto
                    .computeIfAbsent(idProducto, k -> new ArrayList<>())
                    .add(new Object[]{ idSolicitud, cantidad });
        }

        // Disponible real por producto (mismo cálculo de "cubrir con disponible").
        List<Integer> idsProducto = new ArrayList<>(porcionesPorProducto.keySet());
        Map<Integer, BigDecimal> dispPorProducto = new HashMap<>();
        for (DisponibleRealDTO d : obtenerDisponibleReal(idsProducto)) {
            dispPorProducto.put(d.idProducto(), d.disponible());
        }

        // Repartir la cobertura (min(disponible, demanda - reservada)) entre las solicitudes que piden cada
        // producto y acumular por (solicitud, producto) para un único upsert por par.
        Map<String, BigDecimal> acumulado = new LinkedHashMap<>();
        Map<String, Integer[]> claveRef = new HashMap<>();
        for (Map.Entry<Integer, List<Object[]>> e : porcionesPorProducto.entrySet()) {
            Integer idProducto = e.getKey();
            BigDecimal cobertura = dispPorProducto.getOrDefault(idProducto, BigDecimal.ZERO);
            if (cobertura.signum() <= 0) continue;
            for (Object[] porcion : e.getValue()) {
                if (cobertura.signum() <= 0) break;
                Integer idSolicitud = (Integer) porcion[0];
                BigDecimal cantTotal = (BigDecimal) porcion[1];
                
                String key = idSolicitud + "-" + idProducto;
                BigDecimal yaReservado = reservaExistenteMap.getOrDefault(key, BigDecimal.ZERO);
                BigDecimal falta = cantTotal.subtract(yaReservado);
                if (falta.signum() <= 0) continue;

                BigDecimal take = falta.min(cobertura);
                if (take.signum() <= 0) continue;
                
                BigDecimal nuevaReserva = yaReservado.add(take);
                acumulado.put(key, nuevaReserva);
                claveRef.putIfAbsent(key, new Integer[]{ idSolicitud, idProducto });
                cobertura = cobertura.subtract(take);
            }
        }

        if (acumulado.isEmpty()) return 0;
        List<ReservaStockSolicitudCreateDTO> dtos = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> e : acumulado.entrySet()) {
            Integer[] ref = claveRef.get(e.getKey());
            dtos.add(new ReservaStockSolicitudCreateDTO(ref[0], ref[1], e.getValue()));
        }
        return registrarReservasStock(dtos);
    }

    // ─────────────────────────────────────────────────────────────
    // Abastecimiento de Proveedores — OPs CONFIRMADA por fecha de entrega
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public AbastecimientoProveedorDTO obtenerAbastecimientoConfirmado(LocalDate fechaHasta, String tipoAbastecimiento) {
        // null = filtro "Todas": usar fecha lejana para no limitar por arriba
        LocalDate hasta = (fechaHasta != null) ? fechaHasta : LocalDate.of(2099, 12, 31);
        String jsonStr = ordenPedidoRepository.findAbastecimientoConfirmado(hasta, tipoAbastecimiento);

        if (jsonStr == null || jsonStr.isBlank() || "null".equals(jsonStr)) {
            log.info("obtenerAbastecimientoConfirmado: sin resultados (hasta={}, tipo={})", hasta, tipoAbastecimiento);
            return new AbastecimientoProveedorDTO(List.of());
        }

        try {
            var typeRef = TypeFactory.defaultInstance()
                    .constructCollectionType(List.class, AbastecimientoProveedorDTO.OrdenAbastecimiento.class);
            List<AbastecimientoProveedorDTO.OrdenAbastecimiento> ordenes = objectMapper.readValue(jsonStr, typeRef);
            log.info("obtenerAbastecimientoConfirmado: {} OPs CONFIRMADA | hasta={} | tipo={}", ordenes.size(), hasta, tipoAbastecimiento);
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
            detalle = detalleOrdenPedidoRepository.save(detalle);
            cantidadDetalles++;

            // Puente de trazabilidad: registrar qué solicitudes abastece esta línea y cuánto aporta cada una.
            if (e.getSolicitudes() != null && detalle.getIdDetalleOrdenPedido() != null) {
                Integer idDetalle = detalle.getIdDetalleOrdenPedido().intValue();
                for (OrdenPedidoCreateDTO.SolicitudAtribuidaDTO sa : e.getSolicitudes()) {
                    if (sa.getCantidadAtribuida() == null || sa.getCantidadAtribuida().signum() <= 0) continue;
                    DetalleOrdenPedidoSolicitud puente = new DetalleOrdenPedidoSolicitud();
                    puente.setIdDetalleOrdenPedido(idDetalle);
                    puente.setIdSolicitud(sa.getIdSolicitud());
                    puente.setCantidadAtribuida(sa.getCantidadAtribuida());
                    puente.setActivo(true);
                    detalleOrdenPedidoSolicitudRepository.save(puente);
                }
            }
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

        // Mapa idProducto → formatoContenido para enriquecer cada línea (un único SELECT extra)
        java.util.Map<Integer, String> formatoMap = proveedorProductoRepository
                .findByProveedor_IdProveedorAndActivoTrue(pv.getIdProveedor())
                .stream()
                .filter(pp -> pp.getFormatoContenido() != null)
                .collect(java.util.stream.Collectors.toMap(
                        pp -> pp.getProducto().getIdProducto(),
                        pp -> pp.getFormatoContenido(),
                        (a, b) -> a));

        // ── Porciones de solicitud ─────────────────────────────────────────────
        // Un único SELECT extra: (fecha_solicitada, idProducto, cantidad) de todas
        // las solicitudes EN_PEDIDO vinculadas al pedido de esta OP.
        java.util.List<Object[]> solicitudRows =
                pedidoSolicitudRepository.findSolicitudDetallesByPedido(ped.getIdPedido());

        // Agrupar por idProducto para consulta rápida en el loop de detalles.
        java.util.Map<Integer, java.util.List<Object[]>> solicitudPorProducto = new java.util.HashMap<>();
        for (Object[] row : solicitudRows) {
            Integer idProd = ((Number) row[1]).intValue();
            solicitudPorProducto.computeIfAbsent(idProd, k -> new java.util.ArrayList<>()).add(row);
        }

        // Fechas de entrega ordenadas por producto (para calcular el rango de cobertura).
        java.util.Map<Integer, java.util.List<LocalDate>> fechasEntregaPorProducto = new java.util.HashMap<>();
        for (DetalleOrdenPedido d : op.getDetalles()) {
            if (!Boolean.TRUE.equals(d.getActivo())) continue;
            Integer idProd = d.getProducto().getIdProducto();
            fechasEntregaPorProducto.computeIfAbsent(idProd, k -> new java.util.ArrayList<>()).add(d.getFechaEntrega());
        }
        fechasEntregaPorProducto.values().forEach(java.util.Collections::sort);

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

            String observacion = computarObservacion(
                    d.getFechaEntrega(),
                    fechasEntregaPorProducto.getOrDefault(prod.getIdProducto(), java.util.List.of()),
                    solicitudPorProducto.getOrDefault(prod.getIdProducto(), java.util.List.of()),
                    ped.getFechaInicioPedido(),
                    ped.getFechaFinPedido());

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
                    Boolean.TRUE.equals(d.getEntregado()),
                    formatoMap.getOrDefault(prod.getIdProducto(), null),
                    observacion
            ));
        }

        log.info("obtenerConDetalles: OP #{} | {} detalles activos", idOrdenPedido, detalles.size());

        List<OrdenPedidoConDetallesDTO.EntregaRealDTO> entregasReales = java.util.List.of();
        if (op.getEstadoOrdenPedido() == EstadoOrdenPedido.CONFIRMADA ||
            op.getEstadoOrdenPedido() == EstadoOrdenPedido.RECIBIDA) {
            entregasReales = movimientoRepository
                .findEntregasRealesByOrdenPedido(idOrdenPedido)
                .stream()
                .map(row -> {
                    java.math.BigDecimal cantInv = row[1] instanceof java.math.BigDecimal bd ? bd : new java.math.BigDecimal(row[1].toString());
                    java.math.BigDecimal cantBod = row[2] instanceof java.math.BigDecimal bd ? bd : new java.math.BigDecimal(row[2].toString());
                    boolean esInventario = cantInv.compareTo(java.math.BigDecimal.ZERO) > 0;
                    return new OrdenPedidoConDetallesDTO.EntregaRealDTO(
                        ((Number) row[0]).longValue(),
                        esInventario ? cantInv : cantBod,
                        esInventario ? "INVENTARIO" : "BODEGA"
                    );
                })
                .toList();
            log.info("obtenerConDetalles: OP #{} | {} entregas reales", idOrdenPedido, entregasReales.size());
        }

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
                detalles,
                entregasReales
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
    // Resumen de OPs por pedido (modal de rechazo de pedido)
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<OrdenPedidoResumenDTO> obtenerResumenPorPedido(Integer idPedido) {
        return ordenPedidoRepository.findByPedido_IdPedidoAndActivoTrue(idPedido).stream()
                .map(op -> new OrdenPedidoResumenDTO(
                        op.getIdOrdenPedido(),
                        op.getEstadoOrdenPedido().name(),
                        op.getProveedor().getNombreProveedor()))
                .sorted((a, b) -> Integer.compare(a.idOrdenPedido(), b.idOrdenPedido()))
                .toList();
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

        // Auto-transición CONFIRMADA → RECIBIDA si todos los detalles activos ya fueron entregados
        if (actualizados > 0) {
            Set<Integer> opIds = detalleOrdenPedidoRepository.findOrdenPedidoIdsByDetalleIds(ids);
            List<OrdenPedido> completadas = ordenPedidoRepository.findConfirmadasConTodosEntregados(opIds);
            if (!completadas.isEmpty()) {
                completadas.forEach(op -> op.setEstadoOrdenPedido(EstadoOrdenPedido.RECIBIDA));
                ordenPedidoRepository.saveAll(completadas);
                log.info("Auto-transición RECIBIDA: {} OP(s) → {}",
                        completadas.size(),
                        completadas.stream().map(OrdenPedido::getIdOrdenPedido).toList());
            }
        }
        return actualizados;
    }

    // ─────────────────────────────────────────────────────────────
    // Sincronización de estados históricos CONFIRMADA → RECIBIDA
    // ─────────────────────────────────────────────────────────────

    /**
     * Replica la lógica de construirCantidades() del frontend para calcular qué solicitudes
     * cubre cada fecha de entrega. Regla: la entrega con dow=d cubre días de clase diaNec donde
     * d es el último día de entrega estrictamente menor que diaNec. Si no existe entrega anterior,
     * las clases van a la entrega _prev (semana anterior). Formato: "pc1 2x(5)/ pc2 10".
     */
    private String computarObservacion(
            LocalDate fechaEntrega,
            java.util.List<LocalDate> sortedFechasEntrega,
            java.util.List<Object[]> solicitudRows,
            LocalDate fechaInicioPedido,
            LocalDate fechaFinPedido) {

        if (solicitudRows.isEmpty() || sortedFechasEntrega.isEmpty()) return null;

        // Lunes de la semana del pedido — separa entregas "prev" de las de la semana actual
        LocalDate lunesPedido = fechaInicioPedido.with(
                java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));

        boolean isPrevDelivery = fechaEntrega.isBefore(lunesPedido);

        // Días de semana (1=lun..7=dom) de las entregas de la semana actual, ordenados asc
        java.util.NavigableSet<Integer> currentDows = sortedFechasEntrega.stream()
                .filter(d -> !d.isBefore(lunesPedido))
                .mapToInt(d -> d.getDayOfWeek().getValue())
                .distinct()
                .boxed()
                .collect(java.util.stream.Collectors.toCollection(java.util.TreeSet::new));

        // Determinar qué días de clase (diaNec 1-7) cubre esta entrega
        java.util.Set<Integer> coveredDows = new java.util.HashSet<>();

        if (isPrevDelivery) {
            // _prev: cubre diaNec en [1, minDow] (ninguna entrega actual es < diaNec)
            int limit = currentDows.isEmpty() ? 7 : currentDows.first();
            for (int d = 1; d <= limit; d++) coveredDows.add(d);
        } else {
            int dow = fechaEntrega.getDayOfWeek().getValue();
            // Cubre diaNec en (dow, nextDow] → nextDow = siguiente entrega actual, o 7 si es la última
            Integer nextDow = currentDows.higher(dow);
            int upperLimit = nextDow != null ? nextDow : 7;
            for (int d = dow + 1; d <= upperLimit; d++) coveredDows.add(d);
        }

        if (coveredDows.isEmpty()) return null;

        // Filtrar solicitudes: dentro del rango del pedido y con día-de-semana cubierto
        java.util.List<java.math.BigDecimal> cantidades = solicitudRows.stream()
                .filter(row -> {
                    LocalDate fs = ((java.sql.Date) row[0]).toLocalDate();
                    if (fs.isBefore(fechaInicioPedido) || fs.isAfter(fechaFinPedido)) return false;
                    return coveredDows.contains(fs.getDayOfWeek().getValue());
                })
                .map(row -> row[2] instanceof java.math.BigDecimal
                        ? (java.math.BigDecimal) row[2]
                        : new java.math.BigDecimal(row[2].toString()))
                .collect(java.util.stream.Collectors.toList());

        if (cantidades.isEmpty()) return null;

        // Agrupar por valor de cantidad (orden de primera aparición)
        java.util.LinkedHashMap<String, Long> grupos = new java.util.LinkedHashMap<>();
        for (java.math.BigDecimal q : cantidades) {
            String key = q.stripTrailingZeros().toPlainString().replace('.', ',');
            grupos.merge(key, 1L, Long::sum);
        }

        // Formatear: "pc1 2x(5)/ pc2 10"
        StringBuilder sb = new StringBuilder();
        int pc = 1;
        for (java.util.Map.Entry<String, Long> e : grupos.entrySet()) {
            if (sb.length() > 0) sb.append("/ ");
            long count = e.getValue();
            String qStr = e.getKey();
            if (count > 1) {
                sb.append("pc").append(pc).append(" ").append(count).append("x(").append(qStr).append(")");
            } else {
                sb.append("pc").append(pc).append(" ").append(qStr);
            }
            pc++;
        }
        return sb.isEmpty() ? null : sb.toString();
    }

    @Override
    @Transactional
    public int sincronizarEstadosRecibida() {
        List<OrdenPedido> completadas = ordenPedidoRepository.findAllConfirmadasConTodosEntregados();
        if (completadas.isEmpty()) return 0;
        completadas.forEach(op -> op.setEstadoOrdenPedido(EstadoOrdenPedido.RECIBIDA));
        ordenPedidoRepository.saveAll(completadas);
        log.info("sincronizarEstadosRecibida: {} OP(s) transicionadas a RECIBIDA {}",
                completadas.size(),
                completadas.stream().map(OrdenPedido::getIdOrdenPedido).toList());
        return completadas.size();
    }

    // =====================================================
    // NOTIFICACIONES: pedidos APROBADO sin OP activa por semana
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<NotificacionSemanaDTO> obtenerNotificacionesPedidosSinOp() {
        return ordenPedidoRepository.findPedidosAprobadosSinOpPorSemana().stream()
                .map(row -> new NotificacionSemanaDTO(
                        ((Number) row[0]).intValue(),
                        (String) row[1],
                        ((java.sql.Date) row[2]).toLocalDate(),
                        ((java.sql.Date) row[3]).toLocalDate(),
                        ((Number) row[4]).intValue(),
                        ((Number) row[5]).intValue(),
                        ((Number) row[6]).longValue()
                ))
                .toList();
    }

    // =====================================================
    // NOTIFICACIONES: entregas programadas para hoy o ayer
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<NotificacionEntregaDTO> obtenerNotificacionesEntregas() {
        return ordenPedidoRepository.findEntregasPendientesHoyAyer().stream()
                .map(NotificacionEntregaDTO::fromRow)
                .toList();
    }
}
