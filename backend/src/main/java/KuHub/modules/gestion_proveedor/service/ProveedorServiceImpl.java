package KuHub.modules.gestion_proveedor.service;

import KuHub.modules.gestion_proveedor.dtos.request.DiaEntregaDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorCreateDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorProductoAddDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorProductoUpdateDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorUpdateDTO;
import KuHub.modules.gestion_inventario.entity.Producto;
import KuHub.modules.gestion_inventario.repository.ProductoRepository;
import KuHub.modules.gestion_proveedor.dtos.response.BusquedaProductosGlobalDTO;
import KuHub.modules.gestion_proveedor.dtos.response.CotizacionProveedorDTO;
import KuHub.modules.gestion_proveedor.dtos.response.DiaEntregaResponseDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProductoConPrecioDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProductoDisponibleDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProductoBuscadoDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedorDetalleDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedorListDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedorSelectorView;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedoresPageResponse;
import KuHub.modules.gestion_proveedor.dtos.response.SyncExcelResultDTO;
import KuHub.modules.gestion_solicitud.dtos.request.DateRangeDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.type.TypeFactory;
import com.fasterxml.jackson.core.type.TypeReference;
import KuHub.utils.PaginationUtils;
import KuHub.modules.gestion_proveedor.entity.Proveedor;
import KuHub.modules.gestion_proveedor.entity.ProveedorDiaEntrega;
import KuHub.modules.gestion_proveedor.entity.ProveedorProducto;
import KuHub.modules.gestion_proveedor.enums.DiaSemana;
import KuHub.modules.gestion_proveedor.enums.EstadoProveedor;
import KuHub.modules.gestion_proveedor.exceptions.GestionProveedorException;
import KuHub.modules.gestion_proveedor.repository.ProveedorDiaEntregaRepository;
import KuHub.modules.gestion_proveedor.repository.ProveedorProductoRepository;
import KuHub.modules.gestion_proveedor.repository.ProveedorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProveedorServiceImpl implements ProveedorService {

    private static final BigDecimal IVA = new BigDecimal("1.19");

    /**Repositories*/
    @Autowired
    private ProveedorRepository proveedorRepository;

    @Autowired
    private ProveedorProductoRepository proveedorProductoRepository;

    @Autowired
    private ProveedorDiaEntregaRepository proveedorDiaEntregaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    /**Services*/
    @Autowired
    private KuHub.modules.gestion_inventario.services.CategoriaService categoriaService;

    /**Others*/
    @Autowired
    private ObjectMapper objectMapper;

    // ══════════════════════════════════════════════════════════════
    // 1. MÉTODOS DE BÚSQUEDA POR ID
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public Proveedor findById(Integer idProveedor) {
        return proveedorRepository.findById(idProveedor)
                .filter(p -> Boolean.TRUE.equals(p.getActivo()))
                .orElseThrow(() -> new GestionProveedorException(
                        "Proveedor con ID " + idProveedor + " no encontrado o inactivo.",
                        HttpStatus.NOT_FOUND
                ));
    }

    // ══════════════════════════════════════════════════════════════
    // 2. MÉTODOS DE LISTADO / BÚSQUEDA
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public List<ProveedorListDTO> findConFiltros(String estado, String busqueda) {
        List<Object[]> rows = proveedorRepository.findProveedoresConFiltros(estado, busqueda);
        return rows.stream()
                .map(ProveedorListDTO::fromRow)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ProveedoresPageResponse findConFiltrosPaginado(String estado, String busqueda, Integer page) {
        long totalRegistros = proveedorRepository.countProveedoresConFiltros(estado, busqueda);
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(page, totalRegistros);

        List<Object[]> rows = proveedorRepository.findProveedoresConFiltrosPaginado(
                estado, busqueda, paging.limit(), paging.offset()
        );

        List<ProveedorListDTO> proveedores = rows.stream()
                .map(ProveedorListDTO::fromRow)
                .collect(Collectors.toList());

        return new ProveedoresPageResponse(
                proveedores,
                paging.page(),
                paging.limit(),
                paging.totalPages(),
                totalRegistros
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ProveedorDetalleDTO obtenerDetalle(Integer idProveedor) {
        Proveedor proveedor = findById(idProveedor);
        List<Object[]> rows = proveedorRepository.findProductosPorProveedor(idProveedor);
        return construirDetalle(proveedor, rows);
    }

    @Override
    @Transactional(readOnly = true)
    public ProveedorDetalleDTO obtenerDetalleEnFecha(Integer idProveedor, LocalDate fechaConsulta) {
        Proveedor proveedor = findById(idProveedor);
        // Inclusivo del día completo: cualquier actualización dentro de la fecha seleccionada cuenta
        LocalDateTime corte = fechaConsulta.atTime(LocalTime.MAX);
        List<Object[]> rows = proveedorRepository.findProductosPorProveedorHastaFecha(idProveedor, corte);
        log.info("obtenerDetalleEnFecha: Proveedor ID={} | fecha={} | filas={}",
                idProveedor, fechaConsulta, rows.size());
        return construirDetalle(proveedor, rows);
    }

    /**
     * Helper compartido por obtenerDetalle / obtenerDetalleEnFecha: mapea filas a DTO,
     * agrupa por categoría y agrega los días de entrega del proveedor.
     */
    private ProveedorDetalleDTO construirDetalle(Proveedor proveedor, List<Object[]> rows) {
        List<ProductoConPrecioDTO> productos = rows.stream()
                .map(ProductoConPrecioDTO::fromRow)
                .collect(Collectors.toList());

        Map<String, List<ProductoConPrecioDTO>> porCategoria = productos.stream()
                .collect(Collectors.groupingBy(
                        ProductoConPrecioDTO::nombreCategoria,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        long cantActivos = productos.stream()
                .filter(p -> Boolean.TRUE.equals(p.activo()))
                .count();

        List<ProveedorDiaEntrega> diasEntrega = proveedorDiaEntregaRepository.findByProveedor_IdProveedor(proveedor.getIdProveedor());
        List<DiaEntregaResponseDTO> diasResponse = diasEntrega.stream()
                .map(d -> new DiaEntregaResponseDTO(
                        d.getIdDiaEntrega(),
                        d.getDiaSemana() != null ? d.getDiaSemana().name() : null,
                        d.getHoraInicioEntrega() != null ? d.getHoraInicioEntrega().toString() : null,
                        d.getHoraFinEntrega() != null ? d.getHoraFinEntrega().toString() : null
                ))
                .collect(Collectors.toList());

        return new ProveedorDetalleDTO(
                proveedor.getIdProveedor(),
                proveedor.getRutProveedor(),
                proveedor.getNombreDistribuidora(),
                proveedor.getNombreProveedor(),
                proveedor.getTelefonoProveedor(),
                proveedor.getEmailProveedor(),
                proveedor.getDireccionProveedor(),
                proveedor.getEstadoProveedor() != null ? proveedor.getEstadoProveedor().name() : null,
                proveedor.getActivo(),
                proveedor.getFechaCreacion() != null ? proveedor.getFechaCreacion().toString() : null,
                cantActivos,
                porCategoria,
                diasResponse
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProveedorListDTO> findProveedoresPorProducto(Integer idProducto) {
        List<Object[]> rows = proveedorRepository.findProveedoresPorProducto(idProducto);
        return rows.stream()
                .map(row -> new ProveedorListDTO(
                        ((Number) row[0]).intValue(),
                        (String) row[1],
                        (String) row[2],
                        (String) row[3],
                        (String) row[4],
                        (String) row[5],
                        (String) row[6],
                        true,
                        null,
                        null
                ))
                .collect(Collectors.toList());
    }

    // ══════════════════════════════════════════════════════════════
    // 3. MÉTODOS DE CREACIÓN
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public Proveedor create(ProveedorCreateDTO dto) {
        if (dto.getRutProveedor() != null && !dto.getRutProveedor().isBlank()) {
            if (proveedorRepository.existsByRutProveedorIgnoreCase(dto.getRutProveedor())) {
                throw new GestionProveedorException(
                        "Ya existe un proveedor con el RUT: " + dto.getRutProveedor(),
                        HttpStatus.CONFLICT
                );
            }
        }

        Proveedor proveedor = new Proveedor();
        proveedor.setRutProveedor(dto.getRutProveedor());
        proveedor.setNombreDistribuidora(KuHub.utils.StringUtils.normalizeSpaces(dto.getNombreDistribuidora()));
        proveedor.setNombreProveedor(KuHub.utils.StringUtils.capitalizarPalabras(dto.getNombreProveedor()));
        proveedor.setTelefonoProveedor(dto.getTelefonoProveedor());
        proveedor.setEmailProveedor(dto.getEmailProveedor() != null ? KuHub.utils.StringUtils.normalizeSpaces(dto.getEmailProveedor()) : null);
        proveedor.setDireccionProveedor(
                dto.getDireccionProveedor() != null && !dto.getDireccionProveedor().isBlank()
                        ? KuHub.utils.StringUtils.normalizeSpaces(dto.getDireccionProveedor())
                        : null);
        proveedor.setActivo(true);

        if (dto.getEstadoProveedor() != null && !dto.getEstadoProveedor().isBlank()) {
            try {
                proveedor.setEstadoProveedor(EstadoProveedor.valueOf(dto.getEstadoProveedor().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new GestionProveedorException(
                        "Estado de proveedor inválido: " + dto.getEstadoProveedor() + ". Use DISPONIBLE o NO_DISPONIBLE.",
                        HttpStatus.BAD_REQUEST
                );
            }
        } else {
            proveedor.setEstadoProveedor(EstadoProveedor.DISPONIBLE);
        }

        Proveedor saved = proveedorRepository.save(proveedor);
        log.info("Proveedor creado: ID={} | Distribuidora={}", saved.getIdProveedor(), saved.getNombreDistribuidora());

        // Guardar días de entrega si se proporcionaron
        if (dto.getDiasEntrega() != null && !dto.getDiasEntrega().isEmpty()) {
            List<ProveedorDiaEntrega> dias = buildDiasEntrega(dto.getDiasEntrega(), saved);
            proveedorDiaEntregaRepository.saveAll(dias);
            log.info("Días de entrega asignados al proveedor ID={}: {} día(s)", saved.getIdProveedor(), dias.size());
        }

        return saved;
    }

    // ══════════════════════════════════════════════════════════════
    // 4. MÉTODOS DE ACTUALIZACIÓN
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public Proveedor update(Integer idProveedor, ProveedorUpdateDTO dto) {
        Proveedor proveedor = findById(idProveedor);

        if (dto.getRutProveedor() != null && !dto.getRutProveedor().isBlank()) {
            if (proveedorRepository.existsByRutProveedorIgnoreCaseAndIdProveedorNot(
                    dto.getRutProveedor(), idProveedor)) {
                throw new GestionProveedorException(
                        "Ya existe otro proveedor con el RUT: " + dto.getRutProveedor(),
                        HttpStatus.CONFLICT
                );
            }
            if (!dto.getRutProveedor().equals(proveedor.getRutProveedor())) {
                proveedor.setRutProveedor(dto.getRutProveedor());
            }
        }

        String nombreDistribuidoraNormalizado = KuHub.utils.StringUtils.normalizeSpaces(dto.getNombreDistribuidora());
        if (!nombreDistribuidoraNormalizado.equals(proveedor.getNombreDistribuidora())) {
            proveedor.setNombreDistribuidora(nombreDistribuidoraNormalizado);
        }
        String nombreProveedorCapitalizado = KuHub.utils.StringUtils.capitalizarPalabras(dto.getNombreProveedor());
        if (!nombreProveedorCapitalizado.equals(proveedor.getNombreProveedor())) {
            proveedor.setNombreProveedor(nombreProveedorCapitalizado);
        }
        if (!dto.getTelefonoProveedor().equals(proveedor.getTelefonoProveedor())) {
            proveedor.setTelefonoProveedor(dto.getTelefonoProveedor());
        }

        String emailNuevo = dto.getEmailProveedor() != null ? KuHub.utils.StringUtils.normalizeSpaces(dto.getEmailProveedor()) : null;
        String emailActual = proveedor.getEmailProveedor();
        if (emailNuevo != null && !emailNuevo.equals(emailActual)) {
            proveedor.setEmailProveedor(emailNuevo);
        } else if (emailNuevo == null && emailActual != null) {
            proveedor.setEmailProveedor(null);
        }

        // Dirección (opcional): blank → null para que la cabecera del Excel quede vacía
        String direccionNuevaRaw = dto.getDireccionProveedor();
        String direccionNueva = (direccionNuevaRaw != null && !direccionNuevaRaw.isBlank())
                ? KuHub.utils.StringUtils.normalizeSpaces(direccionNuevaRaw)
                : null;
        String direccionActual = proveedor.getDireccionProveedor();
        if (direccionNueva == null ? direccionActual != null : !direccionNueva.equals(direccionActual)) {
            proveedor.setDireccionProveedor(direccionNueva);
        }

        if (dto.getEstadoProveedor() != null && !dto.getEstadoProveedor().isBlank()) {
            try {
                EstadoProveedor nuevoEstado = EstadoProveedor.valueOf(dto.getEstadoProveedor().toUpperCase());
                if (!nuevoEstado.equals(proveedor.getEstadoProveedor())) {
                    proveedor.setEstadoProveedor(nuevoEstado);
                }
            } catch (IllegalArgumentException e) {
                throw new GestionProveedorException(
                        "Estado de proveedor inválido: " + dto.getEstadoProveedor() + ". Use DISPONIBLE o NO_DISPONIBLE.",
                        HttpStatus.BAD_REQUEST
                );
            }
        }

        Proveedor updated = proveedorRepository.save(proveedor);
        log.info("Proveedor actualizado: ID={} | Distribuidora={}", updated.getIdProveedor(), updated.getNombreDistribuidora());

        // Actualizar días de entrega si se proporcionaron (reemplazo completo)
        if (dto.getDiasEntrega() != null) {
            proveedorDiaEntregaRepository.deleteAllByIdProveedor(idProveedor);
            if (!dto.getDiasEntrega().isEmpty()) {
                List<ProveedorDiaEntrega> dias = buildDiasEntrega(dto.getDiasEntrega(), updated);
                proveedorDiaEntregaRepository.saveAll(dias);
                log.info("Días de entrega actualizados para proveedor ID={}: {} día(s)", idProveedor, dias.size());
            } else {
                log.info("Días de entrega eliminados para proveedor ID={}", idProveedor);
            }
        }

        return updated;
    }

    @Override
    @Transactional
    public boolean actualizarPrecio(Long idProveedorProducto, ProveedorProductoUpdateDTO dto) {
        ProveedorProducto versionActual = proveedorProductoRepository
                .findById(idProveedorProducto)
                .orElseThrow(() -> new GestionProveedorException(
                        "Relación proveedor-producto ID=" + idProveedorProducto + " no encontrada",
                        HttpStatus.NOT_FOUND
                ));

        Integer idProveedor = versionActual.getProveedor().getIdProveedor();
        Integer idProducto = versionActual.getProducto().getIdProducto();

        // Derivar precios — lanza BAD_REQUEST si ambos son nulos
        ProveedorProducto tmpPp = new ProveedorProducto();
        derivarPrecios(tmpPp, dto.getPrecioNeto(), dto.getPrecioConIva());

        // No crear una versión nueva si los precios no cambiaron
        if (tmpPp.getPrecioNeto().compareTo(versionActual.getPrecioNeto()) == 0
                && tmpPp.getPrecioConIva().compareTo(versionActual.getPrecioConIva()) == 0) {
            throw new GestionProveedorException(
                    "Los precios ingresados son iguales a los actuales. No hay cambios que guardar.",
                    HttpStatus.CONFLICT
            );
        }

        // 1) Desactivar todas las versiones activas del par (proveedor, producto).
        int desactivadas = proveedorProductoRepository.desactivarVersionesActivas(idProveedor, idProducto);

        // 2) Insertar nueva versión activa.
        ProveedorProducto nuevaVersion = new ProveedorProducto();
        nuevaVersion.setIdProveedor(idProveedor);
        nuevaVersion.setIdProducto(idProducto);
        nuevaVersion.setMarcaProducto(dto.getMarcaProducto());
        nuevaVersion.setFormatoContenido(dto.getFormatoContenido());
        nuevaVersion.setPrecioNeto(tmpPp.getPrecioNeto());
        nuevaVersion.setPrecioConIva(tmpPp.getPrecioConIva());
        nuevaVersion.setActivo(true);
        nuevaVersion.setFechaActualizacion(LocalDateTime.now());
        proveedorProductoRepository.save(nuevaVersion);

        log.info("Nueva versión insertada: Proveedor ID={} | Producto ID={} | PrecioNeto anterior={} → Nuevo={} | Versiones desactivadas={}",
                idProveedor, idProducto, versionActual.getPrecioNeto(), tmpPp.getPrecioNeto(), desactivadas);
        return true;
    }

    @Override
    @Transactional
    public boolean agregarProducto(Integer idProveedor, ProveedorProductoAddDTO dto) {
        findById(idProveedor);

        if (proveedorProductoRepository.existsByProveedor_IdProveedorAndProducto_IdProductoAndActivoTrue(
                idProveedor, dto.getIdProducto())) {
            throw new GestionProveedorException(
                    "El producto ID=" + dto.getIdProducto() + " ya está asignado al proveedor ID=" + idProveedor,
                    HttpStatus.CONFLICT
            );
        }

        proveedorProductoRepository.desactivarVersionesActivas(idProveedor, dto.getIdProducto());

        ProveedorProducto nuevaVersion = new ProveedorProducto();
        nuevaVersion.setIdProveedor(idProveedor);
        nuevaVersion.setIdProducto(dto.getIdProducto());
        nuevaVersion.setMarcaProducto(dto.getMarcaProducto());
        nuevaVersion.setFormatoContenido(dto.getFormatoContenido());
        derivarPrecios(nuevaVersion, dto.getPrecioNeto(), dto.getPrecioConIva()); // lanza si ambos nulos
        nuevaVersion.setActivo(true);
        nuevaVersion.setFechaActualizacion(LocalDateTime.now());
        proveedorProductoRepository.save(nuevaVersion);

        log.info("Producto asignado (nueva versión): Proveedor ID={} | Producto ID={} | PrecioNeto={}",
                idProveedor, dto.getIdProducto(), nuevaVersion.getPrecioNeto());
        return true;
    }

    // ══════════════════════════════════════════════════════════════
    // 5. MÉTODOS DE ELIMINACIÓN LÓGICA
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public boolean softDelete(Integer idProveedor) {
        Proveedor proveedor = findById(idProveedor);

        long productosActivos = proveedorProductoRepository.countByProveedor_IdProveedorAndActivoTrue(idProveedor);
        if (productosActivos > 0) {
            proveedorProductoRepository.desactivarProductosPorProveedor(idProveedor);
            log.info("Productos del proveedor ID={} desactivados automáticamente: {} producto(s)", idProveedor, productosActivos);
        }

        proveedor.setActivo(false);
        proveedorRepository.save(proveedor);
        log.info("Proveedor eliminado (soft-delete): ID={} | Distribuidora={}", idProveedor, proveedor.getNombreDistribuidora());
        return true;
    }

    @Override
    @Transactional
    public boolean quitarProducto(Integer idProveedor, Integer idProducto) {
        int filas = proveedorProductoRepository.softDeleteByProveedorAndProducto(idProveedor, idProducto);
        if (filas == 0) {
            throw new GestionProveedorException(
                    "No existe relación activa entre el proveedor ID=" + idProveedor + " y el producto ID=" + idProducto,
                    HttpStatus.NOT_FOUND
            );
        }
        log.info("Producto quitado del proveedor (soft-delete): Proveedor ID={} | Producto ID={}", idProveedor, idProducto);
        return true;
    }

    @Override
    @Transactional
    public boolean toggleProducto(Integer idProveedor, Integer idProducto) {
        ProveedorProducto relacion = proveedorProductoRepository
                .findByProveedor_IdProveedorAndProducto_IdProducto(idProveedor, idProducto)
                .orElseThrow(() -> new GestionProveedorException(
                        "No existe relación entre el proveedor ID=" + idProveedor + " y el producto ID=" + idProducto,
                        HttpStatus.NOT_FOUND
                ));

        boolean nuevoEstado = !relacion.getActivo();
        relacion.setActivo(nuevoEstado);
        relacion.setFechaActualizacion(LocalDateTime.now());
        proveedorProductoRepository.save(relacion);

        log.info("Producto toggle: Proveedor ID={} | Producto ID={} | Nuevo estado: {}",
                idProveedor, idProducto, nuevoEstado ? "HABILITADO" : "DESHABILITADO");
        return true;
    }

    // ══════════════════════════════════════════════════════════════
    // ── MÉTODOS PRIVADOS ──
    // ══════════════════════════════════════════════════════════════

    /**
     * Construye la lista de entidades ProveedorDiaEntrega a partir de los DTOs recibidos.
     * Valida que el día de la semana sea un valor válido del enum DiaSemana.
     * Valida coherencia de horas (inicio < fin) si ambas se proporcionan.
     */
    private List<ProveedorDiaEntrega> buildDiasEntrega(List<DiaEntregaDTO> dtos, Proveedor proveedor) {
        log.info("=== INICIANDO buildDiasEntrega ===");
        log.info("Proveedor ID={} | Total días a procesar: {}", proveedor.getIdProveedor(), dtos.size());

        List<ProveedorDiaEntrega> dias = new ArrayList<>();

        for (DiaEntregaDTO dto : dtos) {
            log.debug("Procesando DTO: diaSemana={}, horaInicio={}, horaFin={}",
                    dto.getDiaSemana(), dto.getHoraInicio(), dto.getHoraFin());

            DiaSemana diaSemana;
            try {
                diaSemana = DiaSemana.valueOf(dto.getDiaSemana().toUpperCase().trim());
                log.info("Día de semana validado: {} → {}", dto.getDiaSemana(), diaSemana);
            } catch (IllegalArgumentException e) {
                log.warn("Día de semana inválido: '{}' | Valores válidos: LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO",
                        dto.getDiaSemana());
                throw new GestionProveedorException(
                        "Día de la semana inválido: " + dto.getDiaSemana()
                                + ". Valores válidos: LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO.",
                        HttpStatus.BAD_REQUEST
                );
            }

            LocalTime horaInicio;
            LocalTime horaFin;

            boolean tieneHoraInicio = dto.getHoraInicio() != null && !dto.getHoraInicio().isBlank();
            boolean tieneHoraFin = dto.getHoraFin() != null && !dto.getHoraFin().isBlank();

            if (tieneHoraInicio) {
                try {
                    horaInicio = LocalTime.parse(dto.getHoraInicio());
                    log.info("Hora de inicio especificada y parseada: {} → {}", dto.getHoraInicio(), horaInicio);
                } catch (Exception e) {
                    log.warn("Formato de hora de inicio inválido: '{}' | Excepción: {}", dto.getHoraInicio(), e.getMessage());
                    throw new GestionProveedorException(
                            "Formato de hora de inicio inválido: " + dto.getHoraInicio() + ". Use HH:mm o HH:mm:ss.",
                            HttpStatus.BAD_REQUEST
                    );
                }
            } else {
                horaInicio = LocalTime.of(8, 0, 0);
                log.info("Hora de inicio no especificada para día {} | Asignando default: {}", diaSemana, horaInicio);
            }

            if (tieneHoraFin) {
                try {
                    horaFin = LocalTime.parse(dto.getHoraFin());
                    log.info("Hora de fin especificada y parseada: {} → {}", dto.getHoraFin(), horaFin);
                } catch (Exception e) {
                    log.warn("Formato de hora de fin inválido: '{}' | Excepción: {}", dto.getHoraFin(), e.getMessage());
                    throw new GestionProveedorException(
                            "Formato de hora de fin inválido: " + dto.getHoraFin() + ". Use HH:mm o HH:mm:ss.",
                            HttpStatus.BAD_REQUEST
                    );
                }
            } else {
                horaFin = LocalTime.of(20, 0, 0);
                log.info("Hora de fin no especificada para día {} | Asignando default: {}", diaSemana, horaFin);
            }

            if (!horaInicio.isBefore(horaFin)) {
                log.warn("Incoherencia de horarios: inicio={} >= fin={} para día {}", horaInicio, horaFin, diaSemana);
                throw new GestionProveedorException(
                        "La hora de inicio (" + horaInicio + ") debe ser anterior a la hora de fin (" + horaFin + ") para el día " + diaSemana + ".",
                        HttpStatus.BAD_REQUEST
                );
            }
            log.info("Validación de horarios correcta para día {}: {} < {}", diaSemana, horaInicio, horaFin);

            ProveedorDiaEntrega dia = new ProveedorDiaEntrega();
            dia.setProveedor(proveedor);
            dia.setDiaSemana(diaSemana);
            dia.setHoraInicioEntrega(horaInicio);
            dia.setHoraFinEntrega(horaFin);
            dias.add(dia);
        }

        // Validar que no haya días duplicados en la misma lista
        long diasUnicos = dias.stream()
                .map(ProveedorDiaEntrega::getDiaSemana)
                .distinct()
                .count();

        if (diasUnicos < dias.size()) {
            log.warn("Días duplicados detectados: total={}, únicos={}", dias.size(), diasUnicos);
            throw new GestionProveedorException(
                    "No se pueden repetir días de entrega para el mismo proveedor.",
                    HttpStatus.BAD_REQUEST
            );
        }

        log.info("Validación de duplicados exitosa: {} días únicos", diasUnicos);
        log.info("=== buildDiasEntrega COMPLETADO ===");
        log.info("Resumen final para proveedor ID={}: {} día(s) de entrega configurado(s)",
                proveedor.getIdProveedor(), dias.size());

        return dias;
    }

    // ══════════════════════════════════════════════════════════════
    // 6. PRODUCTOS DISPONIBLES PARA ASIGNAR
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public List<ProductoDisponibleDTO> obtenerProductosDisponibles(Integer idProveedor, Short idCategoria) {
        findById(idProveedor);

        String jsonStr = proveedorRepository.findProductosDisponiblesParaProveedor(idProveedor, idCategoria);

        try {
            if (jsonStr == null || jsonStr.isBlank() || "null".equals(jsonStr) || "[]".equals(jsonStr)) {
                return List.of();
            }

            return objectMapper.readValue(jsonStr, new TypeReference<List<ProductoDisponibleDTO>>() {});
        } catch (Exception e) {
            log.error("Error deserializando productos disponibles JSON para proveedor ID={}: {}", idProveedor, e.getMessage());
            throw new GestionProveedorException(
                    "Error al procesar la lista de productos disponibles",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Override
    @Transactional(readOnly = true)
    public String obtenerCategoriasActivasJson() {
        return categoriaService.obtenerCategoriasActivasJson();
    }

    // ══════════════════════════════════════════════════════════════
    // 7. CONSULTAS DE COTIZACIÓN
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public CotizacionProveedorDTO.CotizacionResponse obtenerCotizacionPorRango(DateRangeDTO request) {
        String jsonStr = proveedorRepository.findCotizacionProveedoresPorRango(
                request.getFechaInicio(),
                request.getFechaFin()
        );

        try {
            if (jsonStr == null || jsonStr.isBlank() || "null".equals(jsonStr)) {
                return new CotizacionProveedorDTO.CotizacionResponse(List.of());
            }

            var typeRef = TypeFactory.defaultInstance()
                    .constructCollectionType(List.class, CotizacionProveedorDTO.ProveedorGrupo.class);
            List<CotizacionProveedorDTO.ProveedorGrupo> cotizacion = objectMapper.readValue(jsonStr, typeRef);

            return new CotizacionProveedorDTO.CotizacionResponse(cotizacion);
        } catch (Exception e) {
            log.error("Error al deserializar cotización JSON. JSON={} | Error={}", jsonStr, e.getMessage());
            throw new GestionProveedorException(
                    "Error al procesar la cotización de proveedores.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // ══════════════════════════════════════════════════════════════
    // 8. BÚSQUEDA GLOBAL DE PRODUCTOS
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public List<BusquedaProductosGlobalDTO> buscarProductosGlobal(String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return List.of();
        }

        String jsonStr = proveedorRepository.buscarProductosGlobal("%" + searchTerm + "%");

        try {
            if (jsonStr == null || jsonStr.isBlank() || "null".equals(jsonStr) || "[]".equals(jsonStr)) {
                return List.of();
            }

            var typeRef = TypeFactory.defaultInstance()
                    .constructCollectionType(List.class, BusquedaProductosGlobalDTO.class);
            return objectMapper.readValue(jsonStr, typeRef);
        } catch (Exception e) {
            log.error("Error deserializando búsqueda global JSON para searchTerm='{}': {}", searchTerm, e.getMessage());
            throw new GestionProveedorException(
                    "Error al procesar la búsqueda de productos.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Deriva precio_neto y precio_con_iva con IVA chileno 19 %.
     * - Si solo llega neto → calcula precio_con_iva = neto × 1.19.
     * - Si solo llega precio_con_iva → calcula neto = iva / 1.19.
     * - Si llegan ambos → se persisten tal cual.
     * - Si ninguno llega → lanza BAD_REQUEST.
     * Redondeo HALF_UP a 3 decimales.
     */
    private void derivarPrecios(ProveedorProducto pp, String rawNeto, String rawIva) {
        BigDecimal neto = (rawNeto != null && !rawNeto.isBlank())
                ? KuHub.utils.ChileanPriceUtils.parseChileanPrice(rawNeto) : null;
        BigDecimal iva = (rawIva != null && !rawIva.isBlank())
                ? KuHub.utils.ChileanPriceUtils.parseChileanPrice(rawIva) : null;

        if (neto == null && iva == null) {
            throw new GestionProveedorException(
                    "Debe ingresar al menos uno de los precios: precio_neto o precio_con_iva.",
                    HttpStatus.BAD_REQUEST
            );
        }

        if (neto != null && iva == null) {
            iva = neto.multiply(IVA).setScale(3, RoundingMode.HALF_UP);
        } else if (iva != null && neto == null) {
            neto = iva.divide(IVA, 3, RoundingMode.HALF_UP);
        }

        pp.setPrecioNeto(neto);
        pp.setPrecioConIva(iva);
    }

    // ══════════════════════════════════════════════════════════════
    // 9. SINCRONIZACIÓN DE PRECIOS DESDE EXCEL
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public List<ProveedorSelectorView> listarProveedoresSelector() {
        List<ProveedorSelectorView> lista = proveedorRepository.findSelectorActivos();
        log.info("listarProveedoresSelector: {} distribuidoras activas", lista.size());
        return lista;
    }

    @Override
    @Transactional
    public SyncExcelResultDTO sincronizarPreciosExcel(Integer idProveedor, MultipartFile file) {
        findById(idProveedor);

        if (file == null || file.isEmpty()) {
            throw new GestionProveedorException(
                    "Debe adjuntar un archivo .xlsx válido.", HttpStatus.BAD_REQUEST);
        }
        String original = file.getOriginalFilename();
        if (original == null || !original.toLowerCase().endsWith(".xlsx")) {
            throw new GestionProveedorException(
                    "Solo se aceptan archivos .xlsx (Excel 2007+).", HttpStatus.BAD_REQUEST);
        }

        List<SyncExcelResultDTO.ProductoSincronizado> sincronizados = new ArrayList<>();
        List<SyncExcelResultDTO.ProductoSinCambios> sinCambios = new ArrayList<>();
        List<SyncExcelResultDTO.ProductoNoEncontrado> noEncontrados = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();

        try (InputStream in = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(in)) {

            Sheet sheet = workbook.getSheetAt(0);

            // ── Detección de cabeceras (fila 5 índice 4, fallback fila 6 índice 5) ──
            Map<String, Integer> colIndex = new HashMap<>();
            int headerRowIdx = -1;

            for (int rowIdx : new int[]{4, 5}) {
                Row row = sheet.getRow(rowIdx);
                if (row == null) continue;

                Map<String, Integer> candidato = new HashMap<>();
                for (int c = 1; c <= 9; c++) { // columnas B(1) … J(9)
                    Cell cell = row.getCell(c);
                    if (cell == null) continue;
                    String header = formatter.formatCellValue(cell).trim();
                    if (!header.isEmpty()) candidato.put(header.toLowerCase(), c);
                }

                if (candidato.containsKey("prducto")) {
                    colIndex = candidato;
                    headerRowIdx = rowIdx;
                    break;
                }
            }

            if (headerRowIdx == -1) {
                throw new GestionProveedorException(
                        "No se encontró la fila de cabeceras (PRDUCTO) en filas 5 ni 6.",
                        HttpStatus.BAD_REQUEST);
            }
            if (!colIndex.containsKey("cantidad")) {
                throw new GestionProveedorException(
                        "Fila de cabeceras encontrada pero falta la columna CANTIDAD.",
                        HttpStatus.BAD_REQUEST);
            }

            Integer colProducto = colIndex.get("prducto");
            Integer colCantidad = colIndex.get("cantidad");
            Integer colFormato  = colIndex.get("formato de grs.");
            Integer colMarca    = colIndex.get("marca");
            Integer colPrecioN  = colIndex.get("precio neto");
            Integer colPrecioT  = colIndex.get("precio total");

            // Datos reales empiezan 2 filas después (se salta fila EJEMPLO)
            int firstDataRow = headerRowIdx + 2;
            int lastRow = sheet.getLastRowNum();

            for (int r = firstDataRow; r <= lastRow; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String nombreRaw = leerStringCelda(row, colProducto, formatter);
                if (nombreRaw == null || nombreRaw.isBlank()) {
                    continue;
                }

                BigDecimal cantidad = leerNumeroCelda(row, colCantidad);
                if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }

                BigDecimal precioNetoTotal = leerNumeroCelda(row, colPrecioN);
                BigDecimal precioIvaTotal  = leerNumeroCelda(row, colPrecioT);

                boolean netoValido = precioNetoTotal != null && precioNetoTotal.compareTo(BigDecimal.ZERO) > 0;
                boolean ivaValido  = precioIvaTotal  != null && precioIvaTotal.compareTo(BigDecimal.ZERO) > 0;
                if (!netoValido && !ivaValido) {
                    continue;
                }

                String nombreProducto = KuHub.utils.StringUtils.capitalizarPalabras(nombreRaw.trim());

                Optional<Producto> productoOpt = productoRepository
                        .findByNombreProductoIgnoreCaseAndActivoTrue(nombreProducto);
                if (productoOpt.isEmpty()) {
                    noEncontrados.add(new SyncExcelResultDTO.ProductoNoEncontrado(r + 1, nombreProducto));
                    continue;
                }
                Producto producto = productoOpt.get();

                BigDecimal precioNetoUnit = null;
                BigDecimal precioIvaUnit = null;
                if (netoValido) {
                    precioNetoUnit = precioNetoTotal.divide(cantidad, 3, RoundingMode.HALF_UP);
                }
                if (ivaValido) {
                    precioIvaUnit = precioIvaTotal.divide(cantidad, 3, RoundingMode.HALF_UP);
                }
                if (precioNetoUnit == null) {
                    precioNetoUnit = precioIvaUnit.divide(IVA, 3, RoundingMode.HALF_UP);
                } else if (precioIvaUnit == null) {
                    precioIvaUnit = precioNetoUnit.multiply(IVA).setScale(3, RoundingMode.HALF_UP);
                }

                String formato = colFormato != null ? leerStringCelda(row, colFormato, formatter) : null;
                String marca   = colMarca   != null ? leerStringCelda(row, colMarca, formatter)   : null;
                if (formato != null && formato.isBlank()) formato = null;
                if (marca != null && marca.isBlank()) marca = null;

                // Comparar contra la versión activa actual: si el precio NO cambió, no versionar.
                // El criterio de versioning es exclusivamente el precio (neto e IVA);
                // marca y formato no disparan nueva versión.
                Optional<ProveedorProducto> versionActualOpt = proveedorProductoRepository
                        .findFirstByProveedor_IdProveedorAndProducto_IdProductoAndActivoTrueOrderByFechaActualizacionDesc(
                                idProveedor, producto.getIdProducto());

                if (versionActualOpt.isPresent()
                        && versionActualOpt.get().getPrecioNeto().compareTo(precioNetoUnit) == 0
                        && versionActualOpt.get().getPrecioConIva().compareTo(precioIvaUnit) == 0) {
                    sinCambios.add(new SyncExcelResultDTO.ProductoSinCambios(
                            r + 1,
                            producto.getNombreProducto(),
                            precioNetoUnit,
                            precioIvaUnit
                    ));
                    continue;
                }

                proveedorProductoRepository.desactivarVersionesActivas(idProveedor, producto.getIdProducto());

                ProveedorProducto nueva = new ProveedorProducto();
                nueva.setIdProveedor(idProveedor);
                nueva.setIdProducto(producto.getIdProducto());
                nueva.setMarcaProducto(marca);
                nueva.setFormatoContenido(formato);
                nueva.setPrecioNeto(precioNetoUnit);
                nueva.setPrecioConIva(precioIvaUnit);
                nueva.setActivo(true);
                nueva.setFechaActualizacion(LocalDateTime.now());
                proveedorProductoRepository.save(nueva);

                sincronizados.add(new SyncExcelResultDTO.ProductoSincronizado(
                        r + 1,
                        producto.getNombreProducto(),
                        precioNetoUnit,
                        precioIvaUnit
                ));
            }

        } catch (GestionProveedorException e) {
            throw e;
        } catch (IOException e) {
            log.error("Error leyendo Excel para proveedor ID={}: {}", idProveedor, e.getMessage());
            throw new GestionProveedorException(
                    "No se pudo leer el archivo Excel: " + e.getMessage(),
                    HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            log.error("Error procesando Excel para proveedor ID={}: {}", idProveedor, e.getMessage(), e);
            throw new GestionProveedorException(
                    "Error inesperado procesando el archivo: " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }

        log.info("Sincronización Excel proveedor ID={}: sincronizados={}, sin cambios={}, no encontrados={}",
                idProveedor, sincronizados.size(), sinCambios.size(), noEncontrados.size());
        return new SyncExcelResultDTO(
                sincronizados.size(),
                sinCambios.size(),
                noEncontrados.size(),
                sincronizados,
                sinCambios,
                noEncontrados
        );
    }

    // ══════════════════════════════════════════════════════════════
    // 10. GENERACIÓN DE EXCEL (plantilla con valores del sistema)
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public byte[] generarExcelPlantillaProveedor(Integer idProveedor) {
        Proveedor proveedor = findById(idProveedor);
        List<Object[]> rows = proveedorRepository.findProductosPorProveedor(idProveedor);
        List<ProductoConPrecioDTO> productos = rows.stream()
                .map(ProductoConPrecioDTO::fromRow)
                .collect(Collectors.toList());

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Hoja1");

            // Ancho de columnas (units = chars × 256), replica la plantilla original
            sheet.setColumnWidth(0, (int) (3.85 * 256));
            sheet.setColumnWidth(1, (int) (46.42 * 256));
            sheet.setColumnWidth(2, (int) (10.28 * 256));
            sheet.setColumnWidth(3, (int) (14.71 * 256));
            sheet.setColumnWidth(4, (int) (20.71 * 256));
            sheet.setColumnWidth(5, (int) (15.42 * 256));
            sheet.setColumnWidth(6, (int) (15.28 * 256));
            sheet.setColumnWidth(7, (int) (13.00 * 256));

            Font boldFont = workbook.createFont();
            boldFont.setBold(true);

            // Estilos base — labels en bold (alineación izquierda por defecto)
            CellStyle boldStyle = workbook.createCellStyle();
            boldStyle.setFont(boldFont);

            // Valores de la cabecera de empresa (C2, C3, C4, F4) — centrados, sin bold
            CellStyle headerValueStyle = workbook.createCellStyle();
            headerValueStyle.setAlignment(HorizontalAlignment.CENTER);
            headerValueStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Cabeceras de la tabla (B5–G5) — bold + naranja + centrado
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(boldFont);
            headerStyle.setFillForegroundColor(
                    new XSSFColor(new byte[]{(byte) 0xFF, (byte) 0xC0, (byte) 0x00}, null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Bold + centrado para celdas de TEXTO (marca en EJEMPLO)
            CellStyle boldCenteredStyle = workbook.createCellStyle();
            boldCenteredStyle.setFont(boldFont);
            boldCenteredStyle.setAlignment(HorizontalAlignment.CENTER);
            boldCenteredStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Centrado para celdas de TEXTO (marca en filas de datos)
            CellStyle centeredStyle = workbook.createCellStyle();
            centeredStyle.setAlignment(HorizontalAlignment.CENTER);
            centeredStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Formatos COPIADOS LITERAL de la plantilla original `ABARROTES SAN ANDRES FEBRERO.xlsx`.
            // Importante: NO usamos prefijo `[$-340A]` — la plantilla original no lo tiene y dejarlo
            // produce la inversión de separadores que reportó el usuario. Sin prefijo, Excel usa el
            // locale del sistema del usuario (es-CL en este caso) y muestra `1.500,5` correctamente.
            DataFormat dataFormat = workbook.createDataFormat();

            // Formato "Formato de grs." (columna D): 3 decimales fijos, igual que la plantilla
            short formatoColFmt = dataFormat.getFormat("0.000");

            CellStyle centeredFormatoStyle = workbook.createCellStyle();
            centeredFormatoStyle.setAlignment(HorizontalAlignment.CENTER);
            centeredFormatoStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            centeredFormatoStyle.setDataFormat(formatoColFmt);

            CellStyle boldCenteredFormatoStyle = workbook.createCellStyle();
            boldCenteredFormatoStyle.setFont(boldFont);
            boldCenteredFormatoStyle.setAlignment(HorizontalAlignment.CENTER);
            boldCenteredFormatoStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            boldCenteredFormatoStyle.setDataFormat(formatoColFmt);

            // Cantidad (columna C): sin formato → General, centrado
            CellStyle centeredGeneralStyle = workbook.createCellStyle();
            centeredGeneralStyle.setAlignment(HorizontalAlignment.CENTER);
            centeredGeneralStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            CellStyle boldCenteredGeneralStyle = workbook.createCellStyle();
            boldCenteredGeneralStyle.setFont(boldFont);
            boldCenteredGeneralStyle.setAlignment(HorizontalAlignment.CENTER);
            boldCenteredGeneralStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Formato moneda contabilidad CON 2 DECIMALES (columnas F y G).
            // Variante del formato original con `.00` forzados para que la COMA DECIMAL sea visible.
            // 4 partes: positivo ; negativo ; cero ; texto.
            // `_ "$"* ` empuja `$` al borde izquierdo y el número al borde derecho (relleno de espacios).
            // `#,##0.00` en convención US → en Excel es-CL se muestra como `1.500,00`:
            //   - El `,` del formato (separador miles US) → se muestra como `.` (miles es-CL)
            //   - El `.` del formato (separador decimal US) → se muestra como `,` (decimal es-CL)
            // `"-"??` en la parte de "cero": dos placeholders para alinear con los 2 decimales.
            short clpFormat = dataFormat.getFormat(
                    "_ \"$\"* #,##0.00_ ;_ \"$\"* \\-#,##0.00_ ;_ \"$\"* \"-\"??_ ;_ @_ "
            );

            CellStyle currencyStyle = workbook.createCellStyle();
            currencyStyle.setDataFormat(clpFormat);

            CellStyle boldCurrencyStyle = workbook.createCellStyle();
            boldCurrencyStyle.setFont(boldFont);
            boldCurrencyStyle.setDataFormat(clpFormat);

            // Fila 2 (idx 1): NOMBRE EMPRESA  | <distribuidora>  (merge C:G, valor centrado)
            Row row2 = sheet.createRow(1);
            crearCeldaTexto(row2, 1, "NOMBRE EMPRESA", boldStyle);
            crearCeldaTexto(row2, 2, nullToEmpty(proveedor.getNombreDistribuidora()), headerValueStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 1, 2, 6));

            // Fila 3 (idx 2): DIRECCIÓN | <direccion opcional, centrada>
            Row row3 = sheet.createRow(2);
            crearCeldaTexto(row3, 1, "DIRECCIÓN", boldStyle);
            crearCeldaTexto(row3, 2, nullToEmpty(proveedor.getDireccionProveedor()), headerValueStyle);
            sheet.addMergedRegion(new CellRangeAddress(2, 2, 2, 6));

            // Fila 4 (idx 3): TELÉFONO | <telefono>  | PERSONA DE CONTACTO | <contacto>
            Row row4 = sheet.createRow(3);
            crearCeldaTexto(row4, 1, "TELÉFONO", boldStyle);
            crearCeldaTexto(row4, 2, nullToEmpty(proveedor.getTelefonoProveedor()), headerValueStyle);
            sheet.addMergedRegion(new CellRangeAddress(3, 3, 2, 3));
            crearCeldaTexto(row4, 4, "PERSONA DE CONTACTO", boldStyle);
            crearCeldaTexto(row4, 5, nullToEmpty(proveedor.getNombreProveedor()), headerValueStyle);
            sheet.addMergedRegion(new CellRangeAddress(3, 3, 5, 6));

            // Fila 5 (idx 4): cabeceras de la tabla (naranjas + centrado)
            Row row5 = sheet.createRow(4);
            String[] cabeceras = {"PRDUCTO", "CANTIDAD", "Formato de grs.", "Marca", "Precio neto", "Precio total"};
            for (int i = 0; i < cabeceras.length; i++) {
                crearCeldaTexto(row5, i + 1, cabeceras[i], headerStyle);
            }

            // Fila 6 (idx 5): EJEMPLO — formatos exactos de la plantilla original:
            //   C6 cantidad: General      | D6 formato: 0.000     | E6 marca: text centrado
            //   F6 precio neto: contabilidad $ | G6 precio total: contabilidad $ (fórmula IVA)
            Row row6 = sheet.createRow(5);
            crearCeldaTexto(row6, 1, "EJEMPLO", boldStyle);
            crearCeldaNumero(row6, 2, 1, boldCenteredGeneralStyle);
            crearCeldaNumero(row6, 3, 0.8, boldCenteredFormatoStyle);
            crearCeldaTexto(row6, 4, "DUOC UC", boldCenteredStyle);
            crearCeldaNumero(row6, 5, 100, boldCurrencyStyle);
            crearCeldaFormulaIva(row6, 6, 6, boldCurrencyStyle);

            // Filas 7+ (idx 6+): un producto por fila con los valores actuales del sistema
            int rowIdx = 6;
            for (ProductoConPrecioDTO p : productos) {
                Row r = sheet.createRow(rowIdx);
                // Nombre del producto: mantener alineación izquierda por defecto
                crearCeldaTexto(r, 1, nullToEmpty(p.nombreProducto()), null);
                crearCeldaNumero(r, 2, 1, centeredGeneralStyle);

                Double formato = parsearFormato(p.formatoContenido());
                if (formato != null) {
                    crearCeldaNumero(r, 3, formato, centeredFormatoStyle);
                } else if (p.formatoContenido() != null && !p.formatoContenido().isBlank()) {
                    crearCeldaTexto(r, 3, p.formatoContenido(), centeredStyle);
                }

                if (p.marcaProducto() != null && !p.marcaProducto().isBlank()) {
                    crearCeldaTexto(r, 4, p.marcaProducto(), centeredStyle);
                }
                if (p.precioNeto() != null) {
                    crearCeldaNumero(r, 5, p.precioNeto().doubleValue(), currencyStyle);
                }
                crearCeldaFormulaIva(r, 6, rowIdx + 1, currencyStyle);
                rowIdx++;
            }

            // Pre-evalúa las fórmulas IVA y guarda los valores cacheados → al abrir el .xlsx
            // Excel ve el valor ya calculado (no celdas en blanco) y reaplica el formato moneda.
            // Además forzamos recálculo on-open por compatibilidad cross-versión.
            workbook.getCreationHelper().createFormulaEvaluator().evaluateAll();
            workbook.setForceFormulaRecalculation(true);

            workbook.write(out);
            log.info("Excel plantilla generado para proveedor ID={} | {} productos", idProveedor, productos.size());
            return out.toByteArray();

        } catch (IOException e) {
            log.error("Error generando Excel para proveedor ID={}: {}", idProveedor, e.getMessage(), e);
            throw new GestionProveedorException(
                    "No se pudo generar el archivo Excel: " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private static void crearCeldaTexto(Row row, int col, String valor, CellStyle style) {
        Cell c = row.createCell(col);
        c.setCellValue(valor);
        if (style != null) c.setCellStyle(style);
    }

    private static void crearCeldaNumero(Row row, int col, double valor, CellStyle style) {
        Cell c = row.createCell(col);
        c.setCellValue(valor);
        if (style != null) c.setCellStyle(style);
    }

    /** Crea la celda "Precio total" con la fórmula =F{n}+(F{n}*19%). */
    private static void crearCeldaFormulaIva(Row row, int col, int excelRow1Based, CellStyle style) {
        Cell c = row.createCell(col);
        c.setCellFormula("F" + excelRow1Based + "+(F" + excelRow1Based + "*19%)");
        if (style != null) c.setCellStyle(style);
    }

    /** Parsea el formato a Double si es numérico (0.8, "0,8", "0.8"); retorna null si no aplica. */
    private static Double parsearFormato(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Double.parseDouble(raw.trim().replace(",", "."));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Lee una celda como texto usando DataFormatter (maneja números, fórmulas, etc.). */
    private String leerStringCelda(Row row, Integer col, DataFormatter formatter) {
        if (col == null) return null;
        Cell cell = row.getCell(col);
        if (cell == null) return null;
        String v = formatter.formatCellValue(cell);
        return v == null ? null : v.trim();
    }

    /**
     * Lee una celda como BigDecimal. Soporta celdas numéricas, fórmulas y strings
     * con formato chileno (1.234,567) o estándar (1234.567).
     */
    private BigDecimal leerNumeroCelda(Row row, Integer col) {
        if (col == null) return null;
        Cell cell = row.getCell(col);
        if (cell == null) return null;
        try {
            CellType tipo = cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType() : cell.getCellType();
            if (tipo == CellType.NUMERIC) {
                return BigDecimal.valueOf(cell.getNumericCellValue());
            }
            if (tipo == CellType.STRING) {
                String raw = cell.getStringCellValue();
                if (raw == null || raw.isBlank()) return null;
                return KuHub.utils.ChileanPriceUtils.parseChileanPrice(raw);
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}
