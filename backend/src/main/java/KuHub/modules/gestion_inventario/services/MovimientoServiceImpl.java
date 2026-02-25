package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.MotionCreateDTO;
import KuHub.modules.gestion_inventario.exceptions.InventarioException;
import KuHub.modules.gestion_usuario.entity.Usuario;
import KuHub.modules.gestion_usuario.exceptions.UsuarioException;
import KuHub.modules.gestion_usuario.repository.UsuarioRepository;
import KuHub.modules.gestion_usuario.service.UsuarioService;
import KuHub.modules.gestion_inventario.dtos.MotionAnswerDTO;
import KuHub.modules.gestion_inventario.dtos.MotionFilterRequestDTO;
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
    private UsuarioRepository usuarioRepository;

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
            throw new UsuarioException("Usuario no autenticado o no encontrado en el sistema", HttpStatus.NOT_FOUND);
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

    /**
    @Transactional(readOnly = true)
    @Override
    public List<MotionAnswerDTO> findAllMotionFilter (MotionFilterRequestDTO filter){

        LocalDateTime queryInicio;
        LocalDateTime queryFin;

        if (filter.getFechaInicio() != null) {
            queryInicio = filter.getFechaInicio().atStartOfDay();
        } else {
            queryInicio = LocalDateTime.now().minusDays(7);
        }

        if (filter.getFechaFin() != null) {
            queryFin = filter.getFechaFin().atTime(LocalTime.MAX);
        } else {
            queryFin = LocalDateTime.now();
        }

        // null en caso de todos
        String tipoParaQuery = null;
        String tipoMovimientoRequest = filter.getTipoMovimiento();
        if (tipoMovimientoRequest != null && !tipoMovimientoRequest.trim().isEmpty()) {
            String tipoMovimientoParseado = tipoMovimientoRequest.trim().toUpperCase().replace(" ", "");
            if (!"TODOS".equals(tipoMovimientoParseado)) {
                tipoParaQuery = tipoMovimientoParseado;
            }
        }


        String productoQuery = null;
        String productoRequest = filter.getNombreProducto();
        if (productoRequest != null && !productoRequest.isBlank()) {
            String productoParseado = StringUtils.capitalizarPalabras(filter.getNombreProducto());
            if (!"TODOS LOS PRODUCTOS".equalsIgnoreCase(productoParseado) &&
                    !"TODOS".equalsIgnoreCase(productoParseado)) {
                productoQuery = productoParseado;
            }
        }

        String ordenParseado = StringUtils.normalizeToEnumKey(filter.getOrden());
        String ordenQuery = "MAS_RECIENTES"; // Valor por defecto
        if (ordenParseado != null) {
            switch (ordenParseado) {
                case "MAS_ANTIGUOS":
                    ordenQuery = "MAS_ANTIGUOS";
                    break;
                case "MENOR_CANTIDAD":
                    ordenQuery = "MENOR_CANTIDAD";
                    break;
                case "MAYOR_CANTIDAD":
                    ordenQuery = "MAYOR_CANTIDAD";
                    break;
            }
        }


        List<Object[]> resultados = movimientoRepository.buscarMovimientosDinamico(
                queryInicio,
                queryFin,
                productoQuery,
                tipoParaQuery,
                ordenQuery
        );

        // Mapear Object[] a DTO
        return resultados.stream()
                .map(obj -> {
                    Integer idMovimiento = (Integer) obj[0];
                    String nombreProducto = (String) obj[1];
                    String nombreCategoria = (String) obj[2];
                    String tipoMovimiento = (String) obj[3];
                    Double stockMovimiento = ((Number) obj[4]).doubleValue();
                    LocalDateTime fechaMovimiento = ((java.sql.Timestamp) obj[5]).toLocalDateTime();
                    String nombreUsuario = (String) obj[6];
                    String observacion = (String) obj[7];

                    return new MotionAnswerDTO(
                            idMovimiento,
                            nombreProducto,
                            nombreCategoria,
                            tipoMovimiento,
                            stockMovimiento,
                            fechaMovimiento,
                            nombreUsuario,
                            observacion
                    );
                })
                .collect(Collectors.toList());

    }

    /**
    */

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

        //Actualizar inventario
        inventarioRepository.save(i);
        return mensajeAjuste;
    }

}
