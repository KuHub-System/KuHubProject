package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.response.dto.MotionFilterRequestDTO;
import KuHub.modules.gestion_inventario.dtos.response.dto.MotionAnswerDTO;
import KuHub.modules.gestion_inventario.dtos.response.dto.PaginatedMotionDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkMovementResult;
import KuHub.modules.gestion_inventario.entity.BodegaTransito;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.repository.BodegaTransitoRepository;
import KuHub.modules.gestion_usuario.entity.Usuario;
import KuHub.modules.gestion_usuario.service.UsuarioService;
import KuHub.modules.gestion_inventario.entity.Inventario;
import KuHub.modules.gestion_inventario.entity.Movimiento;
import KuHub.modules.gestion_inventario.repository.InventarioRepository;
import KuHub.modules.gestion_inventario.repository.MovimientoRepository;
import KuHub.utils.PaginationUtils;
import KuHub.utils.StringUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class MovimientoServiceImpl implements MovimientoService {

    @Autowired
    private MovimientoRepository movimientoRepository;

    @Autowired
    private InventarioRepository inventarioRepository;

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private BodegaTransitoRepository bodegaTransitoRepository;

    /** Lista paginada de movimientos con filtros dinámicos: fecha, producto, tipo, orden y responsable. */
    @Transactional(readOnly = true)
    @Override
    public PaginatedMotionDTO findAllMotionWithFilter(MotionFilterRequestDTO request) {

        /**Clase local de tipo record*/
        record MotionQueryArgs(
                LocalDateTime inicio,
                LocalDateTime fin,
                String producto,
                String tipo,
                String orden,
                String responsable
        ) {
            /** Constructor para centralizar lógica de limpieza y defaults*/
            public MotionQueryArgs(MotionFilterRequestDTO req) {
                this(
                        req.getFechaInicio() != null ? req.getFechaInicio().atStartOfDay() : LocalDateTime.now().minusHours(24),
                        req.getFechaFin() != null ? req.getFechaFin().atTime(LocalTime.MAX) : LocalDateTime.now(),
                        parseProducto(req.getNombreProducto()),
                        parseTipo(req.getTipoMovimiento()),
                        parseOrden(req.getOrden()),
                        parseResponsable(req.getNombreResponsable())
                );
            }

            private static String parseProducto(String p) {
                String limpio = StringUtils.normalizeSpaces(p); // Limpia espacios dobles
                if (limpio == null || limpio.isBlank()) return null;

                String cap = StringUtils.capitalizarPalabras(limpio); // "arroz" -> "Arroz"
                return ("Todos Los Productos".equals(cap) || "Todos".equals(cap)) ? null : cap;
            }

            private static String parseResponsable(String r) {
                String limpio = StringUtils.normalizeSpaces(r);
                if (limpio == null || limpio.isBlank()) return null;

                // Si el usuario escribe "todos", ignoramos el filtro
                return ("Todos".equalsIgnoreCase(limpio)) ? null : limpio;
            }

            private static String parseTipo(String t) {
                // Convierte "Devolución" -> "DEVOLUCION" y quita espacios
                String key = StringUtils.normalizeToEnumKey(t);
                return (key == null || "TODOS".equals(key)) ? null : key;
            }

            private static String parseOrden(String o) {
                String key = StringUtils.normalizeToEnumKey(o); // "Más Recientes" -> "MAS_RECIENTES"
                return (key != null) ? key : "MAS_RECIENTES";
            }
        }

        MotionQueryArgs args = new MotionQueryArgs(request);

        long totalRegistros = movimientoRepository.countDynamicMovements(
                args.inicio(),
                args.fin(),
                args.producto(),
                args.tipo(),
                args.responsable()
        );

        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(request.getPage(), totalRegistros);

        List<Object[]> resultados = movimientoRepository.findDynamicMovements(
                args.inicio(),
                args.fin(),
                args.producto(),
                args.tipo(),
                args.orden(),
                args.responsable(),
                paging.limit(),
                paging.offset()
        );

        List<MotionAnswerDTO> contenido = resultados.stream()
                .map(this::mapToMotionAnswerDTO)
                .collect(Collectors.toList());

        // F. Retornamos el DTO envolvente con la data y la metadata de paginación
        return new PaginatedMotionDTO(contenido, paging);
    }


    /** Persiste un movimiento crudo, usado al crear un producto con inventario inicial. */
    @Transactional
    @Override
    public void save(Movimiento m) {
        movimientoRepository.save(m);
    }


    /**
     * Genera y registra el movimiento correspondiente al actualizar un inventario.
     * En caso de traslado, suma al stock en tránsito de forma atómica o crea la bodega si no existe.
     */
    @Transactional
    @Override
    public boolean motionInUpdateInventory(
            Inventario oldInventory,
            BigDecimal delta,
            String typeMotion,
            Boolean ajustePositivo   // null para todos los tipos excepto AJUSTE_INVENTARIO
    ) {
        String tipoKey = StringUtils.normalizeToEnumKey(typeMotion);
        BigDecimal stockActual = oldInventory.getStock();
        BigDecimal nuevoStock;
        BigDecimal calculatedAmount;
        String description;

        switch (tipoKey) {

            case "ENTRADA_INVENTARIO" -> {
                nuevoStock        = stockActual.add(delta);
                calculatedAmount  = delta;
                description       = "Entrada en inventario del producto "
                        + oldInventory.getProducto().getNombreProducto();
            }

            case "SALIDA_INVENTARIO" -> {
                nuevoStock = stockActual.subtract(delta);
                if (nuevoStock.compareTo(BigDecimal.ZERO) < 0) {
                    throw new GestionInventarioException(
                            "La salida no puede resultar en stock negativo -> "
                                    + oldInventory.getProducto().getNombreProducto(),
                            HttpStatus.BAD_REQUEST);
                }
                calculatedAmount = delta;
                description      = "Salida por uso/consumo: "
                        + oldInventory.getProducto().getNombreProducto();
            }

            case "MERMA_INVENTARIO" -> {
                nuevoStock = stockActual.subtract(delta);
                if (nuevoStock.compareTo(BigDecimal.ZERO) < 0) {
                    throw new GestionInventarioException(
                            "La merma no puede resultar en stock negativo -> "
                                    + oldInventory.getProducto().getNombreProducto(),
                            HttpStatus.BAD_REQUEST);
                }
                calculatedAmount = delta;
                description      = "Baja por merma/daño: "
                        + oldInventory.getProducto().getNombreProducto();
            }

            case "AJUSTE_INVENTARIO" -> {
                if (ajustePositivo == null) {
                    throw new GestionInventarioException(
                            "El campo ajustePositivo es obligatorio para AJUSTE_INVENTARIO",
                            HttpStatus.BAD_REQUEST);
                }
                if (Boolean.TRUE.equals(ajustePositivo)) {
                    nuevoStock   = stockActual.add(delta);
                    description  = "Ajuste positivo: "
                            + oldInventory.getProducto().getNombreProducto();
                } else {
                    nuevoStock = stockActual.subtract(delta);
                    if (nuevoStock.compareTo(BigDecimal.ZERO) < 0) {
                        throw new GestionInventarioException(
                                "El ajuste negativo no puede resultar en stock negativo -> "
                                        + oldInventory.getProducto().getNombreProducto(),
                                HttpStatus.BAD_REQUEST);
                    }
                    description = "Ajuste negativo: "
                            + oldInventory.getProducto().getNombreProducto();
                }
                calculatedAmount = delta;
            }

            case "TRASLADO" -> {
                nuevoStock = stockActual.subtract(delta);
                if (nuevoStock.compareTo(BigDecimal.ZERO) < 0) {
                    throw new GestionInventarioException(
                            "El traslado no puede resultar en stock negativo -> "
                                    + oldInventory.getProducto().getNombreProducto(),
                            HttpStatus.BAD_REQUEST);
                }

                int rowsAffected = bodegaTransitoRepository.addStockInTransit(
                        oldInventory.getIdInventario(), delta);

                if (rowsAffected == 0) {
                    BodegaTransito newWarehouse = new BodegaTransito();
                    newWarehouse.setInventario(oldInventory);
                    newWarehouse.setStock(delta);
                    newWarehouse.setStockLimit(oldInventory.getStockLimit());
                    bodegaTransitoRepository.save(newWarehouse);
                }

                calculatedAmount = delta;
                description      = "Traslado a bodega de tránsito: "
                        + oldInventory.getProducto().getNombreProducto();
            }

            default -> throw new GestionInventarioException(
                    "Tipo de movimiento no válido: " + tipoKey, HttpStatus.BAD_REQUEST);
        }

        // Actualizar stock en la entidad
        oldInventory.setStock(nuevoStock);

        // Crear movimiento
        Movimiento newMotion = new Movimiento();
        newMotion.setUsuario(usuarioService.findUserByToken());
        newMotion.setInventario(oldInventory);
        newMotion.setStockMovimiento(calculatedAmount);
        newMotion.setTipoMovimiento(Movimiento.TipoMovimiento.valueOf(tipoKey));
        newMotion.setObservacion(description);
        movimientoRepository.save(newMotion);
        return true;
    }

    /**
     * Construye el objeto movimiento para una actualización masiva sin persistirlo.
     * Retorna un BulkMovementResult con el movimiento listo o el error ocurrido.
     */
    @Transactional
    @Override
    public BulkMovementResult buildMovementForBulkUpdate(
            Inventario oldInventory,
            BigDecimal delta,
            String typeMotion,
            Usuario currentUser
    ) {
        String tipoKey = StringUtils.normalizeToEnumKey(typeMotion);
        BigDecimal stockActual = oldInventory.getStock();
        BigDecimal nuevoStock;
        String description;
        // Variable clave para saber cuánto registrar en el historial de Movimientos
        BigDecimal cantidadMovimiento = delta;

        // Lógica de cálculo (Extraída de tu switch original)
        switch (tipoKey) {
            case "ENTRADA_INVENTARIO" -> {
                nuevoStock = stockActual.add(delta);
                description = "Entrada masiva: " + oldInventory.getProducto().getNombreProducto();
            }
            case "SALIDA_INVENTARIO", "MERMA_INVENTARIO" -> {
                nuevoStock = stockActual.subtract(delta);
                if (nuevoStock.compareTo(BigDecimal.ZERO) < 0) {
                    return BulkMovementResult.error("Stock insuficiente para " + tipoKey);
                }
                description = tipoKey + " masiva: " + oldInventory.getProducto().getNombreProducto();
            }
            case "AJUSTE_INVENTARIO" -> {
                // ¡NUEVO ENFOQUE! En ajustes, 'delta' es el STOCK TOTAL FINAL DESEADO
                nuevoStock = delta;

                if (nuevoStock.compareTo(BigDecimal.ZERO) < 0) {
                    return BulkMovementResult.error("El stock ajustado no puede ser negativo");
                }

                // Calculamos la diferencia matemática para saber qué pasó realmente
                BigDecimal diferenciaReal = nuevoStock.subtract(stockActual);

                if (diferenciaReal.compareTo(BigDecimal.ZERO) > 0) {
                    // Faltaba stock físico (Ajuste Positivo)
                    description = "Ajuste masivo (+): " + oldInventory.getProducto().getNombreProducto();
                    cantidadMovimiento = diferenciaReal;

                } else if (diferenciaReal.compareTo(BigDecimal.ZERO) < 0) {
                    // Sobraba stock físico (Ajuste Negativo)
                    description = "Ajuste masivo (-): " + oldInventory.getProducto().getNombreProducto();
                    cantidadMovimiento = diferenciaReal.abs(); // Guardamos el valor en positivo para el historial

                } else {
                    // El usuario mandó el mismo stock que ya había en la Base de Datos
                    return BulkMovementResult.error("El ajuste no generó cambios. El stock real ya era " + stockActual);
                }
            }
            case "TRASLADO" -> {
                nuevoStock = stockActual.subtract(delta);
                if (nuevoStock.compareTo(BigDecimal.ZERO) < 0) return BulkMovementResult.error("Stock insuficiente para traslado");

                // Lógica de Bodega de Tránsito (Se mantiene igual)
                bodegaTransitoRepository.addStockInTransit(oldInventory.getIdInventario(), delta);
                // Nota: Aquí podrías querer manejar el caso de 'rowsAffected == 0' como hacías antes

                description = "Traslado masivo: " + oldInventory.getProducto().getNombreProducto();
            }
            default -> { return BulkMovementResult.error("Tipo de movimiento inválido"); }
        }

        // 1. Actualizamos la entidad Inventario que recibimos (en memoria)
        oldInventory.setStock(nuevoStock);

        // 2. Construimos el objeto Movimiento
        Movimiento mov = new Movimiento();
        mov.setUsuario(currentUser);
        mov.setInventario(oldInventory);
        mov.setStockMovimiento(delta);
        mov.setTipoMovimiento(Movimiento.TipoMovimiento.valueOf(tipoKey));
        mov.setObservacion(description);

        return BulkMovementResult.success(mov);
    }

    /**
     * Genera y registra el movimiento correspondiente al actualizar la bodega de tránsito.
     * En caso de devolución, actualiza el stock principal de forma atómica.
     */
    @Transactional
    @Override
    public boolean motionInUpdateTransitWarehouse(BodegaTransito oldTransit, BigDecimal delta, String typeMotion) {
        return motionInUpdateTransitWarehouse(oldTransit, delta, typeMotion, null, null, null, null);
    }

    @Transactional
    @Override
    public boolean motionInUpdateTransitWarehouse(BodegaTransito oldTransit, BigDecimal delta, String typeMotion, Integer idSolicitud, Integer idPedido, Integer idOrdenPedido) {
        return motionInUpdateTransitWarehouse(oldTransit, delta, typeMotion, idSolicitud, idPedido, idOrdenPedido, null);
    }

    @Transactional
    @Override
    public boolean motionInUpdateTransitWarehouse(BodegaTransito oldTransit, BigDecimal delta, String typeMotion, Integer idSolicitud, Integer idPedido, Integer idOrdenPedido, Integer idDetalleOrdenPedido) {
        String tipoKey = StringUtils.normalizeToEnumKey(typeMotion);
        BigDecimal stockActual = oldTransit.getStock();
        BigDecimal nuevoStock;
        BigDecimal calculatedAmount = delta; // Por defecto es el delta, excepto en Ajuste
        String description;
        Inventario mainInventory = oldTransit.getInventario();

        switch (tipoKey) {
            case "ENTRADA_BODEGA" -> {
                nuevoStock = stockActual.add(delta);
                description = "Entrada en bodega de tránsito: " + mainInventory.getProducto().getNombreProducto();
            }
            case "SALIDA_BODEGA", "MERMA_BODEGA" -> {
                nuevoStock = stockActual.subtract(delta);
                description = (tipoKey.equals("SALIDA_BODEGA") ? "Salida para procesos/clases: " : "Baja por merma: ")
                        + mainInventory.getProducto().getNombreProducto();
            }
            case "DEVOLUCION" -> {
                nuevoStock = stockActual.subtract(delta);
                // ACTUALIZACIÓN ATÓMICA: La base de datos manda
                int rowsAffected = inventarioRepository.addStockToInventory(mainInventory.getIdInventario(), delta);
                if (rowsAffected == 0) {
                    throw new GestionInventarioException("No se pudo actualizar el stock principal. El inventario podría estar inactivo.", HttpStatus.CONFLICT);
                }
                description = "Devolución al inventario principal: " + mainInventory.getProducto().getNombreProducto();
            }
            case "AJUSTE_BODEGA" -> {
                nuevoStock = delta; // ¡Ajuste Absoluto! (Delta = Stock Final Deseado)
                BigDecimal diferenciaReal = nuevoStock.subtract(stockActual);

                if (diferenciaReal.compareTo(BigDecimal.ZERO) > 0) {
                    description = "Ajuste positivo en tránsito: " + mainInventory.getProducto().getNombreProducto();
                    calculatedAmount = diferenciaReal;
                } else if (diferenciaReal.compareTo(BigDecimal.ZERO) < 0) {
                    description = "Ajuste negativo en tránsito: " + mainInventory.getProducto().getNombreProducto();
                    calculatedAmount = diferenciaReal.abs();
                } else {
                    return true; // No hubo cambio real
                }
            }
            default -> throw new GestionInventarioException("Tipo de movimiento no válido: " + tipoKey, HttpStatus.BAD_REQUEST);
        }

        // Actualizar stock en la entidad
        oldTransit.setStock(nuevoStock);

        // Crear movimiento (Asignando tanto Inventario como Bodega Transito)
        Movimiento newMotion = new Movimiento();
        newMotion.setUsuario(usuarioService.findUserByToken());
        newMotion.setInventario(oldTransit.getInventario());
        newMotion.setBodegaTransito(oldTransit);
        newMotion.setStockMovimiento(calculatedAmount);
        newMotion.setTipoMovimiento(Movimiento.TipoMovimiento.valueOf(tipoKey));
        newMotion.setObservacion(description);
        newMotion.setIdSolicitud(idSolicitud);
        newMotion.setIdPedido(idPedido);
        newMotion.setIdOrdenPedido(idOrdenPedido);
        newMotion.setIdDetalleOrdenPedido(idDetalleOrdenPedido);

        movimientoRepository.save(newMotion);
        return true;
    }

    /** Mapea una fila de la consulta dinámica al DTO de historial de movimientos. */
    private MotionAnswerDTO mapToMotionAnswerDTO(Object[] row) {
        return new MotionAnswerDTO(
                (String) row[0],                                 // nombre_producto
                (String) row[1],                                 // nombre_categoria
                StringUtils.enumToHumanText((String) row[2]),    // tipo_movimiento (Formateado)
                (java.math.BigDecimal) row[3],                   // stock_movimiento
                ((java.sql.Timestamp) row[4]).toLocalDateTime(), // fecha_movimiento
                (String) row[5],                                 // nombreUsuario (concatenado)
                (String) row[6],                                 // observacion
                row[7] != null ? ((Number) row[7]).intValue() : null, // id_solicitud
                row[8] != null ? ((Number) row[8]).intValue() : null, // id_pedido
                row[9] != null ? ((Number) row[9]).intValue() : null  // id_orden_pedido
        );
    }

}