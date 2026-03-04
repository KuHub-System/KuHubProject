package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.MotionCreateDTO;
import KuHub.modules.gestion_inventario.dtos.MotionFilterRequestDTO;
import KuHub.modules.gestion_inventario.dtos.response.MotionAnswerDTO;
import KuHub.modules.gestion_inventario.entity.BodegaTransito;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.repository.BodegaTransitoRepository;
import KuHub.modules.gestion_usuario.entity.Usuario;
import KuHub.modules.gestion_usuario.exceptions.GestionUsuarioException;
import KuHub.modules.gestion_usuario.service.UsuarioService;
import KuHub.modules.gestion_inventario.entity.Inventario;
import KuHub.modules.gestion_inventario.entity.Movimiento;
import KuHub.modules.gestion_inventario.repository.InventarioRepository;
import KuHub.modules.gestion_inventario.repository.MovimientoRepository;
import KuHub.utils.StringUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

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

    /**METODO para realizar una consulta dinamica de los filtros del frontend con formato parseado para mejor experiencia usuario*/
    @Transactional(readOnly = true)
    @Override
    public List<MotionAnswerDTO> findAllMotionWithFilter(MotionFilterRequestDTO request) {

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

        // 1. Instanciamos los argumentos procesados
        MotionQueryArgs args = new MotionQueryArgs(request);

        // 2. Ejecución de la consulta (limpia y legible)
        List<Object[]> resultados = movimientoRepository.findDynamicMovements(
                args.inicio(),
                args.fin(),
                args.producto(),
                args.tipo(),
                args.orden(),
                args.responsable()
        );

        // 3. Mapeo a DTO de respuesta
        return resultados.stream()
                .map(this::mapToMotionAnswerDTO)
                .collect(Collectors.toList());
    }

    /**
     * Save crudo usado en inventario al crear un producto con inventario
     */
    @Transactional
    @Override
    public void save(Movimiento m) {
        movimientoRepository.save(m);
    }

    //NO USADO 26/02 - SE VA!
    //LA IDEA ES USAR DE MANDERA HIBRIDA, PERO AHORA CREA MOVIMIENTO EN INVENTARIO EN LA CREACCION PRODUCTO CON INVENTARIO
    @Transactional
    @Override
    public boolean saveMotion(MotionCreateDTO m, Inventario inventario) {
        log.info("📦 Iniciando registro de movimiento para Inventario ID: {}", m.getIdInventario());

        // 1. Obtener el username desde el token JWT
        String username = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        log.debug("🔑 Usuario extraído del token: [{}]", username);


        // 2. Buscar al usuario
        Usuario u = usuarioService.findUserByUsernameOrEmail(username);
        if (u == null) {
            log.error("❌ No se encontró el usuario con username: {}", username);
            throw new GestionUsuarioException("Usuario no autenticado o no encontrado en el sistema", HttpStatus.NOT_FOUND);
        }
        String nombreUsuario = usuarioService.formatearNombreCompleto(u);
        log.debug("👤 Operación realizada por: {}", nombreUsuario);


        Inventario i;
        if (inventario != null) {
            log.debug("🆕 Usando inventario recién creado para producto nuevo");
            i = inventario;
        } else {
            log.debug("🔍 Buscando inventario existente ID: {}", m.getIdInventario());
            i = inventarioRepository.findById(m.getIdInventario())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventario no encontrado"));
        }

        // 4. Validar el Tipo de Movimiento
        Movimiento.TipoMovimiento tipoEnum;
        try {
            // Limpieza robusta del string
            String tipoLimpio = m.getTipoMovimiento().trim().toUpperCase().replace(" ", "_");
            tipoEnum = Movimiento.TipoMovimiento.valueOf(tipoLimpio);
            log.info("✅ Tipo de movimiento validado: {}", tipoEnum);
        } catch (IllegalArgumentException e) {
            log.error("🚫 Error de validación: '{}' no es un TipoMovimiento válido", m.getTipoMovimiento());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tipo de movimiento inválido: " + m.getTipoMovimiento());
        }

        //Guerdar movimiento Entity
        Movimiento newMovimiento = new Movimiento();
        newMovimiento.setUsuario(u);
        newMovimiento.setInventario(i);
        newMovimiento.setStockMovimiento(m.getStockMovimiento());
        newMovimiento.setTipoMovimiento(tipoEnum);
        newMovimiento.setObservacion(m.getObservacion());
        movimientoRepository.save(newMovimiento);

        log.info("💾 Movimiento guardado exitosamente por {}", username);
        return true;
    }

    /**
     * METODO DE VALIDACION DE MOVIMIENTO PARA LA PAGE DE INVENTARIO, IMPLEMENADO PARA CUANDO SE ACTUALIZA UN PRODUCTO EN EL INVENTARIO
     * REALIZAR MOVIMIENTO, EN CASO DE TRASLADO SE REALIZAR LA SUMA SI EXISTE EL ITEN DE LA BODEGA EN LA BBDD PARA EVITAR PROCESOS PARALELO
     * O CREA UN NUEVO ITEM A BODEGA SI NO EXISTE
     */
    @Transactional
    @Override
    public boolean motionInUpdateInventory(Inventario oldInventory, BigDecimal newStock, String typeMotion) {
        String tipoKey = StringUtils.normalizeToEnumKey(typeMotion);
        BigDecimal calculatedAmount = BigDecimal.ZERO;
        String description = "";

        switch (tipoKey) {
            case "ENTRADA":
                if (newStock.compareTo(oldInventory.getStock()) < 0) {
                    throw new GestionInventarioException("La entrada no puede resultar en un stock menor al actual del producto -> " +
                            oldInventory.getProducto().getNombreProducto(), HttpStatus.BAD_REQUEST);
                }
                calculatedAmount = newStock.subtract(oldInventory.getStock());
                description = "Entrada en inventario del producto " + oldInventory.getProducto().getNombreProducto();
                break;

            case "SALIDA_INVENTARIO":
            case "MERMA":
                // Lógica corregida: Si el stock nuevo es mayor al antiguo, es un error.
                if (newStock.compareTo(oldInventory.getStock()) > 0) {
                    throw new GestionInventarioException("La salida no puede resultar en un stock mayor al actual del producto -> " +
                            oldInventory.getProducto().getNombreProducto(), HttpStatus.BAD_REQUEST);
                }
                // Para salida, restamos el nuevo del antiguo para que la cantidad calculada sea positiva
                calculatedAmount = oldInventory.getStock().subtract(newStock);
                description = tipoKey.equals("SALIDA_INVENTARIO") ? "Salida por uso/consumo: " + oldInventory.getProducto().getNombreProducto()
                                                                  : "Baja por merma/daño: " + oldInventory.getProducto().getNombreProducto();
                break;

            case "AJUSTE":
                // Si el stock nuevo es MAYOR que el antiguo = Ajuste Positivo
                if (newStock.compareTo(oldInventory.getStock()) > 0) {
                    calculatedAmount = newStock.subtract(oldInventory.getStock());
                    description = "Ajuste positivo de inventario del producto " + oldInventory.getProducto().getNombreProducto();
                }
                // Si el stock nuevo es MENOR que el antiguo = Ajuste Negativo
                else if (newStock.compareTo(oldInventory.getStock()) < 0) {
                    calculatedAmount = oldInventory.getStock().subtract(newStock);
                    description = "Ajuste negativo de inventario del producto " + oldInventory.getProducto().getNombreProducto();
                }
                description = (newStock.compareTo(oldInventory.getStock()) > 0 ? "Ajuste positivo: "
                                                                               : "Ajuste negativo: ") + oldInventory.getProducto().getNombreProducto();
                break;

            case "TRASLADO":
                /**calcular diferencia*/
                calculatedAmount = newStock.subtract(oldInventory.getStock()).abs();
                if (newStock.compareTo(oldInventory.getStock()) > 0) {
                    throw new GestionInventarioException("Para un traslado a tránsito, el nuevo stock debe ser menor al actual.",
                            HttpStatus.BAD_REQUEST);
                }

                int rowsaffected = bodegaTransitoRepository.addStockInTransit(
                        oldInventory.getIdInventario(), calculatedAmount);

                if (rowsaffected == 0) {
                    BodegaTransito newWarehouse = new BodegaTransito();
                    newWarehouse.setInventario(oldInventory);
                    newWarehouse.setStock(calculatedAmount);
                    newWarehouse.setStockLimit(oldInventory.getStockLimit());
                    bodegaTransitoRepository.save(newWarehouse);
                }

                description = "Traslado a bodega de tránsito: " + oldInventory.getProducto().getNombreProducto();
                break;

            default:
                throw new GestionInventarioException("Tipo de movimiento no válido: " + tipoKey, HttpStatus.BAD_REQUEST);
        }

        //CREAR MOVIMIENTO ASIGNANDO EL INVENTARIO
        Movimiento newMotion = new Movimiento();
        newMotion.setUsuario(usuarioService.findUserByToken());
        newMotion.setInventario(oldInventory);
        newMotion.setStockMovimiento(calculatedAmount);
        newMotion.setTipoMovimiento(Movimiento.TipoMovimiento.valueOf(tipoKey));
        newMotion.setObservacion(description);
        movimientoRepository.save(newMotion);
        return true;
    }

    /***/

    @Transactional
    @Override
    public boolean motionInUpdateTransitWarehouse(BodegaTransito oldTransit, BigDecimal newStock, String typeMotion) {
        String tipoKey = StringUtils.normalizeToEnumKey(typeMotion);
        BigDecimal calculatedAmount = BigDecimal.ZERO;
        String description = "";
        Inventario mainInventory = oldTransit.getInventario();

        switch (tipoKey) {
            case "SALIDA_BODEGA":
            case "MERMA":
                // Salidas desde tránsito (consumo en clases o daño de insumos en espera)
                if (newStock.compareTo(oldTransit.getStock()) > 0) {
                    throw new GestionInventarioException("La " + tipoKey.toLowerCase() + " no puede resultar en un stock mayor al actual en tránsito."
                            , HttpStatus.BAD_REQUEST);
                }
                calculatedAmount = oldTransit.getStock().subtract(newStock);
                description = (tipoKey.equals("SALIDA_BODEGA") ? "Salida de bodega de tránsito para procesos/clases: "
                        : "Baja por merma en bodega de tránsito: ") + mainInventory.getProducto().getNombreProducto();
                break;

            case "DEVOLUCION":
                // Lógica corregida: Lo que sale de tránsito vuelve al Inventario Principal
                if (newStock.compareTo(oldTransit.getStock()) > 0) {
                    throw new GestionInventarioException("La devolución no puede ser mayor al stock actual en tránsito."
                            , HttpStatus.BAD_REQUEST);
                }
                calculatedAmount = oldTransit.getStock().subtract(newStock);

                // ACTUALIZACIÓN ATÓMICA: La base de datos manda
                int rowsAffected = inventarioRepository.addStockToInventory(
                        mainInventory.getIdInventario(),
                        calculatedAmount
                );

                if (rowsAffected == 0) {
                    throw new GestionInventarioException("No se pudo actualizar el stock principal. El inventario podría estar inactivo."
                            , HttpStatus.CONFLICT);
                }

                description = "Devolución de stock de tránsito al inventario principal: " + mainInventory.getProducto().getNombreProducto();
                break;

            case "AJUSTE":
                // Sincronización manual del stock físico en tránsito
                if (newStock.compareTo(oldTransit.getStock()) > 0) {
                    calculatedAmount = newStock.subtract(oldTransit.getStock());
                    description = "Ajuste positivo en stock de tránsito: ";
                } else if (newStock.compareTo(oldTransit.getStock()) < 0) {
                    calculatedAmount = oldTransit.getStock().subtract(newStock);
                    description = "Ajuste negativo en stock de tránsito: ";
                }
                description += mainInventory.getProducto().getNombreProducto();
                break;

            default:
                throw new GestionInventarioException("Tipo de movimiento no válido para Bodega de Tránsito: " + tipoKey
                        ,HttpStatus.BAD_REQUEST);
        }

        //CREAR MOVIMIENTO ASIGNADO INVENTARIO Y BODEGA
        Movimiento newMotion = new Movimiento();
        newMotion.setUsuario(usuarioService.findUserByToken());
        newMotion.setInventario(oldTransit.getInventario());
        newMotion.setBodegaTransito(oldTransit);
        newMotion.setStockMovimiento(calculatedAmount);
        newMotion.setTipoMovimiento(Movimiento.TipoMovimiento.valueOf(tipoKey));
        newMotion.setObservacion(description);
        movimientoRepository.save(newMotion);
        return true;
    }

    /**
     * Mapea la consulta dinamica aplicado en historioles de movimiento
     */
    private MotionAnswerDTO mapToMotionAnswerDTO(Object[] row) {
        return new MotionAnswerDTO(
                (String) row[0],                                 // nombre_producto
                (String) row[1],                                 // nombre_categoria
                StringUtils.enumToHumanText((String) row[2]),    // tipo_movimiento (Formateado)
                (java.math.BigDecimal) row[3],                   // stock_movimiento
                ((java.sql.Timestamp) row[4]).toLocalDateTime(), // fecha_movimiento
                (String) row[5],                                 // nombreUsuario (concatenado)
                (String) row[6]                                  // observacion
        );
    }

}



        /** 5. Actualizar stock mínimo
         if (m.getStockLimitMin() != null) {
         i.setStockLimit(m.getStockLimitMin());
         }

         // 6. Lógica de stock
         String mensajeAjuste = actualizarStockInventario(i, m.getStockMovimiento(), tipoEnum);

         String observacionFinal = m.getObservacion();
         if (mensajeAjuste != null) {
         observacionFinal = (observacionFinal != null) ? observacionFinal + " - " + mensajeAjuste : mensajeAjuste;
         }

         // 7. Guardar el movimiento
         // Asegúrate de que el constructor de Movimiento acepte estos parámetros
         Movimiento mv = movimientoRepository.save(new Movimiento(
         null, u, i, , tipoEnum, null, observacionFinal
         ));

         return new MotionAnswerDTO(
         mv.getIdMovimiento(),
         i.getProducto().getNombreProducto(),
         i.getProducto().getCategoria().getNombreCategoria(),
         m.getTipoMovimiento(),
         m.getStockMovimiento(),
         mv.getFechaMovimiento(),
         nombreUsuario,
         mv.getObservacion()
         );
         }





    private String actualizarStockInventario(Inventario i, Double stockMovimiento, Movimiento.TipoMovimiento tipo){

        Double stockActual = 0.0;//i.getStock();
        String mensajeAjuste = null;
        /**
        switch (tipo) {
            case ENTRADA:
                stockActual += stockMovimiento;
                i.setStock(stockActual);
                break;
            case DEVOLUCION:
                stockActual += stockMovimiento;
                i.setStock(stockActual);
                break;
            case SALIDA:
                if (stockActual < stockMovimiento) throw new InventarioException("No hay suficiente stock en el inventario");
                stockActual -= stockMovimiento;
                i.setStock(stockActual);
                break;
            case MERMA:
                if (stockActual < stockMovimiento) throw new InventarioException("No hay suficiente stock en el inventario");
                stockActual -= stockMovimiento;
                i.setStock(stockActual);
                break;
            case AJUSTE:
                Double diferencia = stockMovimiento - stockActual;
                // Forzamos la actualización del stock al valor que viene en el DTO
                i.setStock(stockMovimiento);

                if (diferencia > 0) {
                    mensajeAjuste = String.format("[Auto] Ajuste incrementado: +%.2f unidades.", diferencia);
                } else if (diferencia < 0) {
                    mensajeAjuste = String.format("[Auto] Ajuste decrementado: %.2f unidades.", diferencia);
                } else {
                    mensajeAjuste = "[Auto] Ajuste: Stock verificado, se mantiene igual.";
                }
                break;
        }*/
