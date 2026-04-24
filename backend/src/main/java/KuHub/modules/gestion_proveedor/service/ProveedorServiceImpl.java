package KuHub.modules.gestion_proveedor.service;

import KuHub.modules.gestion_proveedor.dtos.request.DiaEntregaDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorCreateDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorProductoAddDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorProductoUpdateDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorUpdateDTO;
import KuHub.modules.gestion_proveedor.dtos.response.CotizacionProveedorDTO;
import KuHub.modules.gestion_proveedor.dtos.response.DiaEntregaResponseDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProductoConPrecioDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedorDetalleDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedorListDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedoresPageResponse;
import KuHub.modules.gestion_solicitud.dtos.request.DateRangeDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.type.TypeFactory;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProveedorServiceImpl implements ProveedorService {

    /**Repositories*/
    @Autowired
    private ProveedorRepository proveedorRepository;

    @Autowired
    private ProveedorProductoRepository proveedorProductoRepository;

    @Autowired
    private ProveedorDiaEntregaRepository proveedorDiaEntregaRepository;

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
        ProveedorProducto relacion = proveedorProductoRepository
                .findById(idProveedorProducto)
                .orElseThrow(() -> new GestionProveedorException(
                        "Relación proveedor-producto ID=" + idProveedorProducto + " no encontrada",
                        HttpStatus.NOT_FOUND
                ));

        // Parsear el precio desde formato chileno a BigDecimal
        java.math.BigDecimal nuevoPrecio;
        try {
            nuevoPrecio = KuHub.utils.ChileanPriceUtils.parseChileanPrice(dto.getPrecioProducto());
            log.debug("Precio parseado: Input='{}' → BigDecimal={}", dto.getPrecioProducto(), nuevoPrecio);
        } catch (IllegalArgumentException e) {
            log.warn("Error al parsear precio chileno: {} | Mensaje: {}", dto.getPrecioProducto(), e.getMessage());
            throw new GestionProveedorException(
                    e.getMessage(),
                    HttpStatus.BAD_REQUEST
            );
        }

        // Validar que el precio sea mayor a 0
        if (nuevoPrecio.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new GestionProveedorException(
                    "El precio debe ser mayor a 0. Valor ingresado: " + nuevoPrecio,
                    HttpStatus.BAD_REQUEST
            );
        }

        // [CAMBIO 2026-04-24] Validar si el precio ya existe en la BD (detecta conflicto)
        // Si existe una relación con el mismo precio, lanzar 409 Conflict
        if (proveedorProductoRepository.existsByIdProveedorProductoAndPrecioProducto(idProveedorProducto, nuevoPrecio)) {
            throw new GestionProveedorException(
                    "El precio ingresado es igual al valor actual: " + nuevoPrecio
                            + ". No hay cambios que guardar.",
                    HttpStatus.CONFLICT
            );
        }

        // Actualizar el precio
        relacion.setPrecioProducto(nuevoPrecio);
        relacion.setFechaActualizacion(LocalDateTime.now());
        proveedorProductoRepository.save(relacion);
        log.info("Precio actualizado: Relación ID={} | Proveedor ID={} | Producto ID={} | Precio anterior={} → Nuevo precio={} (Input: '{}')",
                idProveedorProducto, relacion.getProveedor().getIdProveedor(),
                relacion.getProducto().getIdProducto(), relacion.getPrecioProducto(), nuevoPrecio, dto.getPrecioProducto());
        return true; // Se actualizó correctamente
    }

    @Override
    @Transactional
    public void agregarProducto(Integer idProveedor, ProveedorProductoAddDTO dto) {
        findById(idProveedor);

        // Parsear el precio desde formato chileno a BigDecimal
        java.math.BigDecimal precioProducto;
        try {
            precioProducto = KuHub.utils.ChileanPriceUtils.parseChileanPrice(dto.getPrecioProducto());
            log.debug("Precio parseado: Input='{}' → BigDecimal={}", dto.getPrecioProducto(), precioProducto);
        } catch (IllegalArgumentException e) {
            log.warn("Error al parsear precio chileno: {} | Mensaje: {}", dto.getPrecioProducto(), e.getMessage());
            throw new GestionProveedorException(
                    e.getMessage(),
                    HttpStatus.BAD_REQUEST
            );
        }

        // Validar que el precio sea mayor a 0
        if (precioProducto.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new GestionProveedorException(
                    "El precio debe ser mayor a 0. Valor ingresado: " + precioProducto,
                    HttpStatus.BAD_REQUEST
            );
        }

        if (proveedorProductoRepository.existsByProveedor_IdProveedorAndProducto_IdProductoAndActivoTrue(
                idProveedor, dto.getIdProducto())) {
            throw new GestionProveedorException(
                    "El producto ID=" + dto.getIdProducto() + " ya está asignado al proveedor ID=" + idProveedor,
                    HttpStatus.CONFLICT
            );
        }

        proveedorProductoRepository
                .findByProveedor_IdProveedorAndProducto_IdProducto(idProveedor, dto.getIdProducto())
                .ifPresentOrElse(
                        relacion -> {
                            relacion.setActivo(true);
                            relacion.setPrecioProducto(precioProducto);
                            relacion.setFechaActualizacion(LocalDateTime.now());
                            proveedorProductoRepository.save(relacion);
                            log.info("Relación reactivada: Proveedor ID={} | Producto ID={} | Precio={} (Input: '{}')",
                                    idProveedor, dto.getIdProducto(), precioProducto, dto.getPrecioProducto());
                        },
                        () -> {
                            ProveedorProducto nueva = new ProveedorProducto();
                            nueva.setIdProveedor(idProveedor);
                            nueva.setIdProducto(dto.getIdProducto());
                            nueva.setPrecioProducto(precioProducto);
                            nueva.setActivo(true);
                            nueva.setFechaActualizacion(LocalDateTime.now());
                            proveedorProductoRepository.save(nueva);
                            log.info("Producto asignado: Proveedor ID={} | Producto ID={} | Precio={} (Input: '{}')",
                                    idProveedor, dto.getIdProducto(), precioProducto, dto.getPrecioProducto());
                        }
                );
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
    // 6. CONSULTAS DE COTIZACIÓN
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
}
