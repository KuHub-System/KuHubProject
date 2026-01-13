package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_usuario.entity.Usuario;
import KuHub.modules.gestion_usuario.repository.UsuarioRepository;
import KuHub.modules.gestion_usuario.service.UsuarioService;
import KuHub.modules.gestion_inventario.dtos.MotionAnswerDTO;
import KuHub.modules.gestion_inventario.dtos.MotionCreateDTO;
import KuHub.modules.gestion_inventario.dtos.MotionFilterRequestDTO;
import KuHub.modules.gestion_inventario.entity.Inventario;
import KuHub.modules.gestion_inventario.entity.Movimiento;
import KuHub.modules.gestion_inventario.exceptions.InventarioException;
import KuHub.modules.gestion_inventario.repository.InventarioRepository;
import KuHub.modules.gestion_inventario.repository.MovimientoRepository;
import KuHub.utils.StringUtils;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;


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


    @Transactional
    @Override
    public MotionAnswerDTO saveMotion(MotionCreateDTO m) {
        // 1. Obtener el username desde el token JWT
        String username = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();

        // DEBUG: Imprime en consola para ver si el nombre tiene espacios o mayúsculas raras
        System.out.println("DEBUG: El username extraído del token es: [" + username + "]");

        // 2. Buscar al usuario por username
        // Si falla aquí, es porque el 'username' del token no coincide con la columna 'username' de la DB
        // Cambia la línea 146 por esta búsqueda más flexible:
        Usuario u = usuarioRepository.findByIdentificador(username)
                .orElseThrow(() -> new RuntimeException("Error: El identificador '" + username + "' no existe como username ni como email."));

        String nombreUsuario = usuarioService.formatearNombreCompleto(u);

        // 3. Buscar inventario
        Inventario i = inventarioRepository.findById(m.getIdInventario())
                .orElseThrow(() -> new InventarioException("El inventario con ID " + m.getIdInventario() + " no existe"));

        // 4. Validar el Tipo de Movimiento
        Movimiento.TipoMovimiento tipoEnum;
        try {
            String tipoLimpio = m.getTipoMovimiento().trim().toUpperCase().replace(" ", "");
            tipoEnum = Movimiento.TipoMovimiento.valueOf(tipoLimpio);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Tipo de movimiento inválido: " + m.getTipoMovimiento());
        }

        // 5. Actualizar stock mínimo
        if (m.getStockLimitMin() != null) {
            i.setStockLimitMin(m.getStockLimitMin());
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
                null, u, i, m.getStockMovimiento(), tipoEnum, null, observacionFinal
        ));

        return new MotionAnswerDTO(
                mv.getIdMovimiento(),
                i.getProducto().getNombreProducto(),
                i.getProducto().getNombreCategoria(),
                m.getTipoMovimiento(),
                m.getStockMovimiento(),
                mv.getFechaMovimiento(),
                nombreUsuario,
                mv.getObservacion()
        );
    }

    private String actualizarStockInventario(Inventario i, Double stockMovimiento, Movimiento.TipoMovimiento tipo){

        Double stockActual = i.getStock();
        String mensajeAjuste = null;

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
        }

        //Actualizar inventario
        inventarioRepository.save(i);
        return mensajeAjuste;
    }

}
