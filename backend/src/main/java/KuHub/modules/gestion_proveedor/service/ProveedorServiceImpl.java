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
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
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

        // Obtener días de entrega configurados para el proveedor
        List<ProveedorDiaEntrega> diasEntrega = proveedorDiaEntregaRepository.findByProveedor_IdProveedor(idProveedor);
        List<DiaEntregaResponseDTO> diasResponse = diasEntrega.stream()
                .map(d -> new DiaEntregaResponseDTO(
                        d.getIdDiaEntrega(),
                        d.getDiaSemana() != null ? d.getDiaSemana().name() : null,
                        d.getHoraInicioEntrega() != null ? d.getHoraInicioEntrega().toString() : null,
                        d.getHoraFinEntrega() != null ? d.getHoraFinEntrega().toString() : null
                ))
                .collect(Collectors.toList());

        log.info("obtenerDetalle: Proveedor ID={} | Productos: {} | Días entrega: {}",
                idProveedor, productos.size(), diasResponse.size());

        return new ProveedorDetalleDTO(
                proveedor.getIdProveedor(),
                proveedor.getRutProveedor(),
                proveedor.getNombreDistribuidora(),
                proveedor.getNombreProveedor(),
                proveedor.getTelefonoProveedor(),
                proveedor.getEmailProveedor(),
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
        return proveedorRepository
                .findByActivoTrueAndEstadoProveedorOrderByNombreDistribuidoraAsc(EstadoProveedor.DISPONIBLE);
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

        int sincronizados = 0;
        int omitidos = 0;
        List<SyncExcelResultDTO.ErrorFila> errores = new ArrayList<>();
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
                    omitidos++;
                    continue;
                }

                BigDecimal cantidad = leerNumeroCelda(row, colCantidad);
                if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) {
                    omitidos++;
                    continue;
                }

                BigDecimal precioNetoTotal = leerNumeroCelda(row, colPrecioN);
                BigDecimal precioIvaTotal  = leerNumeroCelda(row, colPrecioT);

                boolean netoValido = precioNetoTotal != null && precioNetoTotal.compareTo(BigDecimal.ZERO) > 0;
                boolean ivaValido  = precioIvaTotal  != null && precioIvaTotal.compareTo(BigDecimal.ZERO) > 0;
                if (!netoValido && !ivaValido) {
                    omitidos++;
                    continue;
                }

                String nombreProducto = KuHub.utils.StringUtils.capitalizarPalabras(nombreRaw.trim());

                Optional<Producto> productoOpt = productoRepository
                        .findByNombreProductoIgnoreCaseAndActivoTrue(nombreProducto);
                if (productoOpt.isEmpty()) {
                    errores.add(new SyncExcelResultDTO.ErrorFila(
                            r + 1,
                            "Producto no encontrado: '" + nombreProducto + "'"
                    ));
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

                sincronizados++;
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

        log.info("Sincronización Excel proveedor ID={}: sincronizados={}, omitidos={}, errores={}",
                idProveedor, sincronizados, omitidos, errores.size());
        return new SyncExcelResultDTO(sincronizados, omitidos, errores);
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
