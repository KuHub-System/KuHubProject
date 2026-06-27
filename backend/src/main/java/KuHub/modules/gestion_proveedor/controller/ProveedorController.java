package KuHub.modules.gestion_proveedor.controller;

import KuHub.modules.gestion_proveedor.dtos.request.ProveedorCreateDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorProductoAddDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorProductoUpdateDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorUpdateDTO;
import KuHub.modules.gestion_proveedor.dtos.response.BusquedaProductosGlobalDTO;
import KuHub.modules.gestion_proveedor.dtos.response.CotizacionProveedorDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProductoDisponibleDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedorDetalleDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedorListDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedorSelectorView;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedoresPageResponse;
import KuHub.modules.gestion_proveedor.dtos.response.SyncExcelResultDTO;
import KuHub.modules.gestion_proveedor.entity.Proveedor;
import KuHub.modules.gestion_proveedor.service.ProveedorService;
import KuHub.modules.gestion_solicitud.dtos.request.DateRangeDTO;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

/**
 * Controlador REST para la gestión de Proveedores.
 * Ofrece endpoints para el mantenimiento del ciclo de vida de los proveedores (CRUD),
 * la asignación y fijación de precios de productos en su catálogo, y la sincronización
 * masiva mediante plantillas personalizadas en formato Excel (.xlsx).
 * 
 * Ruta base: /api/v1/proveedor
 */
@RestController
@Validated
@RequestMapping("/api/v1/proveedor")
public class ProveedorController {

    @Autowired
    private ProveedorService proveedorService;

    // ══════════════════════════════════════════════════════════════
    // PROVEEDOR CRUD
    // ══════════════════════════════════════════════════════════════

    /**
     * Lista todos los proveedores activos con filtros opcionales de estado y búsqueda parcial.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code obtenerProveedoresService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Utilizado en listados generales y filtros de búsqueda de distribuidoras).
     *
     * @param estado   Filtro por estado de disponibilidad (DISPONIBLE o NO_DISPONIBLE) (opcional)
     * @param busqueda Búsqueda de coincidencia parcial por nombre, distribuidora o RUT (opcional)
     */
    @GetMapping
    public ResponseEntity<List<ProveedorListDTO>> findAll(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String busqueda
    ) {
        return ResponseEntity
                .status(200)
                .body(proveedorService.findConFiltros(estado, busqueda));
    }

    /**
     * Lista proveedores activos con filtros de estado y búsqueda en formato paginado (20/10 registros).
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code obtenerProveedoresPaginadoService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Puebla la tabla principal de administración de proveedores con paginación asimétrica).
     *
     * @param estado   Filtro por estado de disponibilidad (opcional)
     * @param busqueda Término de búsqueda parcial (opcional)
     * @param page     Número de la página a consultar (por defecto 1)
     */
    @GetMapping("/find-paginated")
    public ResponseEntity<ProveedoresPageResponse> findPaginated(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String busqueda,
            @RequestParam(defaultValue = "1") Integer page
    ) {
        return ResponseEntity
                .status(200)
                .body(proveedorService.findConFiltrosPaginado(estado, busqueda, page));
    }

    /**
     * Obtiene el detalle completo de un proveedor con sus productos agrupados por categoría y días de entrega.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code obtenerProveedorDetalleService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Carga los datos y el catálogo del proveedor al abrir el modal de detalles o de edición).
     *
     * @param id ID del proveedor
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProveedorDetalleDTO> findById(@PathVariable Integer id) {
        return ResponseEntity
                .status(200)
                .body(proveedorService.obtenerDetalle(id));
    }

    /**
     * Obtiene una vista histórica del catálogo del proveedor con los precios vigentes a una fecha determinada.
     * Recupera para cada producto la versión de cotización cuya fecha de actualización sea menor o igual a la seleccionada.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code obtenerProductosPorFechaService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Accionado en el modal de consulta de precios históricos o auditoría temporal de tarifas).
     *
     * @param id    Identificador del proveedor
     * @param fecha Fecha de corte para la auditoría (formato YYYY-MM-DD)
     */
    @GetMapping("/{id}/productos-por-fecha")
    public ResponseEntity<ProveedorDetalleDTO> findByIdEnFecha(
            @PathVariable Integer id,
            @RequestParam("fecha") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha
    ) {
        return ResponseEntity
                .status(200)
                .body(proveedorService.obtenerDetalleEnFecha(id, fecha));
    }

    /**
     * Registra un nuevo proveedor en el sistema, permitiendo configurar sus días hábiles de entrega opcionalmente.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code crearProveedorService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Gatillado al enviar el formulario del modal de registro de nuevo proveedor).
     *
     * @param dto Datos del proveedor a crear (incluye diasEntrega opcional)
     */
    @PostMapping
    public ResponseEntity<Proveedor> create(@Valid @RequestBody ProveedorCreateDTO dto) {
        return ResponseEntity
                .status(201)
                .body(proveedorService.create(dto));
    }

    /**
     * Actualiza la información técnica, dirección, estado y días de entrega de un proveedor existente.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code actualizarProveedorService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Gatillado al enviar el formulario del modal de edición del proveedor).
     *
     * @param id  ID del proveedor a actualizar
     * @param dto Datos actualizados del proveedor (diasEntrega reemplaza completamente los existentes)
     */
    @PatchMapping("/{id}")
    public ResponseEntity<Proveedor> update(
            @PathVariable Integer id,
            @Valid @RequestBody ProveedorUpdateDTO dto
    ) {
        return ResponseEntity
                .status(200)
                .body(proveedorService.update(id, dto));
    }

    /**
     * Realiza la desactivación lógica (soft-delete) de un proveedor en el sistema.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code eliminarProveedorService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Se activa al presionar el botón de eliminación y confirmar en el diálogo toast).
     *
     * @param id    ID del proveedor a eliminar
     * @param force Si true (solo Administrador), desactiva productos activos y procede con la eliminación
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> softDelete(@PathVariable Integer id,
                                              @org.springframework.web.bind.annotation.RequestParam(defaultValue = "false") boolean force) {
        return ResponseEntity
                .status(204)
                .body(proveedorService.softDelete(id, force));
    }

    // ══════════════════════════════════════════════════════════════
    // RELACIÓN PROVEEDOR ↔ PRODUCTO
    // ══════════════════════════════════════════════════════════════

    /**
     * Lista los productos asignados a un proveedor, agrupados por categoría.
     * 
     * [❌] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** No.
     * - **Detalle:** Endpoint redundante y obsoleto que ha sido deprecado en favor de GET /{id}. No se consume en los flujos principales de la UI.
     *
     * @param id ID del proveedor
     * @deprecated Usar GET /{id} en su lugar
     */
    @GetMapping("/{id}/productos")
    public ResponseEntity<ProveedorDetalleDTO> findProductosByProveedor(@PathVariable Integer id) {
        return ResponseEntity
                .status(200)
                .body(proveedorService.obtenerDetalle(id));
    }

    /**
     * Lista los productos del sistema activos que aún no han sido asignados al catálogo del proveedor.
     * Permite filtrar opcionalmente por una categoría en particular.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code obtenerProductosDisponiblesService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Carga los insumos que se pueden seleccionar en el buscador del modal de asignar productos).
     *
     * @param idProveedor ID del proveedor
     * @param idCategoria ID de categoría para filtrar (opcional)
     * @return Lista de productos disponibles con información de categoría y unidad
     */
    @GetMapping("/{idProveedor}/productos-disponibles")
    public ResponseEntity<List<ProductoDisponibleDTO>> obtenerProductosDisponibles(
            @PathVariable Integer idProveedor,
            @RequestParam(required = false) Short idCategoria
    ) {
        return ResponseEntity
                .status(200)
                .body(proveedorService.obtenerProductosDisponibles(idProveedor, idCategoria));
    }

    /**
     * Asocia comercialmente un nuevo producto al catálogo del proveedor fijando su precio negociado.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code agregarProductoProveedorService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Gatillado al presionar el botón "Agregar Producto" en el modal de asignación).
     *
     * @param id  ID del proveedor
     * @param dto Datos del producto a asignar (idProducto + precioNeto/precioConIva)
     * @return true si se asignó correctamente
     */
    @PostMapping("/{id}/productos")
    public ResponseEntity<Boolean> agregarProducto(
            @PathVariable Integer id,
            @Valid @RequestBody ProveedorProductoAddDTO dto
    ) {
        boolean resultado = proveedorService.agregarProducto(id, dto);
        return ResponseEntity.status(201).body(resultado);
    }

    /**
     * Actualiza el valor de cotización de un producto en el catálogo del proveedor usando la clave primaria de la relación.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code actualizarPrecioProductoService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Llamado al modificar e ingresar un nuevo precio neto o con IVA en la tabla de productos asignados).
     *
     * @param idProveedorProducto ID de la relación proveedor-producto (PK)
     * @param dto Nuevo precio del producto (formato chileno: 1.234,567)
     * @return true si se actualizó, excepción si hay conflicto
     */
    @PatchMapping("/productos/{idProveedorProducto}")
    public ResponseEntity<Boolean> actualizarPrecio(
            @PathVariable Long idProveedorProducto,
            @Valid @RequestBody ProveedorProductoUpdateDTO dto
    ) {
        boolean actualizado = proveedorService.actualizarPrecio(idProveedorProducto, dto);
        return ResponseEntity.status(200).body(actualizado);
    }

    /**
     * Corrige in-place y sincroniza el precio con IVA basándose en el neto guardado aplicando el factor (neto * 1.19).
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code sincronizarPrecioDesdeNetoService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Acción rápida de sincronización de IVA por desajuste matemático).
     *
     * @param idProveedorProducto ID de la relación proveedor-producto (PK)
     * @return true si se actualizó, excepción si hay conflicto
     */
    @PatchMapping("/productos/{idProveedorProducto}/sincronizar-desde-neto")
    public ResponseEntity<Boolean> sincronizarPrecioDesdeNeto(@PathVariable Long idProveedorProducto) {
        return ResponseEntity
                .status(200)
                .body(proveedorService.sincronizarPrecioDesdeNeto(idProveedorProducto));
    }

    /**
     * Corrige in-place y sincroniza el precio neto basándose en el IVA guardado aplicando el factor (iva / 1.19).
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code sincronizarPrecioDesdeIvaService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Acción rápida de sincronización de Neto por desajuste matemático).
     *
     * @param idProveedorProducto ID de la relación proveedor-producto (PK)
     */
    @PatchMapping("/productos/{idProveedorProducto}/sincronizar-desde-iva")
    public ResponseEntity<Boolean> sincronizarPrecioDesdeIva(@PathVariable Long idProveedorProducto) {
        return ResponseEntity
                .status(200)
                .body(proveedorService.sincronizarPrecioDesdeIva(idProveedorProducto));
    }

    /**
     * Remueve lógicamente un producto del portafolio del proveedor (soft-delete de la oferta).
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code quitarProductoProveedorService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Accionado al presionar el ícono de eliminar producto en la tabla de productos asignados).
     *
     * @param id  ID del proveedor
     * @param pid ID del producto a quitar
     * @return true si se soft-deletó correctamente
     */
    @DeleteMapping("/{id}/productos/{pid}")
    public ResponseEntity<Boolean> quitarProducto(
            @PathVariable Integer id,
            @PathVariable Integer pid
    ) {
        return ResponseEntity.status(200).body(proveedorService.quitarProducto(id, pid));
    }

    /**
     * Alterna la disponibilidad comercial de un producto en el catálogo de un proveedor (Toggle activo/inactivo).
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code toggleProductoProveedorService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Llamado al alternar el switch de estado del insumo dentro de la tabla del proveedor).
     *
     * @param id  ID del proveedor
     * @param pid ID del producto a habilitar/deshabilitar
     * @return true si se toggleó correctamente, false si no hubo cambios
     */
    @PatchMapping("/{id}/productos/{pid}/toggle")
    public ResponseEntity<Boolean> toggleProducto(
            @PathVariable Integer id,
            @PathVariable Integer pid
    ) {
        return ResponseEntity.status(200).body(proveedorService.toggleProducto(id, pid));
    }

    // ══════════════════════════════════════════════════════════════
    // CONSULTA INVERSA: PROVEEDORES POR PRODUCTO
    // ══════════════════════════════════════════════════════════════

    /**
     * Lista todos los proveedores que ofrecen un producto específico.
     * Útil para comparar precios entre proveedores.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code obtenerProveedoresPorProductoService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Muestra la lista comparativa de ofertas de los proveedores para un insumo).
     *
     * @param idProducto ID del producto
     */
    @GetMapping("/por-producto/{idProducto}")
    public ResponseEntity<List<ProveedorListDTO>> findByProducto(@PathVariable Integer idProducto) {
        return ResponseEntity
                .status(200)
                .body(proveedorService.findProveedoresPorProducto(idProducto));
    }

    // ══════════════════════════════════════════════════════════════
    // FILTROS PARA MODAL DE ASIGNAR PRODUCTOS
    // ══════════════════════════════════════════════════════════════

    /**
     * Obtiene el listado serializado en JSON simple de todas las categorías de productos activas del sistema.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code obtenerCategoriasActivasJsonService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Utilizado para cargar y filtrar por categorías en el selector del modal).
     */
    @GetMapping("/categorias-activas-json")
    public ResponseEntity<String> obtenerCategoriasActivasParaFiltrado() {
        return ResponseEntity
                .status(200)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(proveedorService.obtenerCategoriasActivasJson());
    }

    // ══════════════════════════════════════════════════════════════
    // COTIZACIÓN AGRUPADA POR PROVEEDOR
    // ══════════════════════════════════════════════════════════════

    /**
     * Consolida solicitudes de pedido aprobadas dentro de un rango de fechas y genera la cotización unificada seleccionando el menor precio.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code obtenerCotizacionPorRangoService()} y consumido en {@code solicitud-service.ts}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-solicitudes.tsx} (Utilizado en las estimaciones consolidadas y cierres de solicitudes).
     *
     * @param request Rango de fechas (fechaInicio, fechaFin) para filtrar solicitudes EN_PEDIDO
     */
    @PostMapping("/cotizacion-rango")
    public ResponseEntity<CotizacionProveedorDTO.CotizacionResponse> obtenerCotizacionPorRango(
            @Validated @RequestBody DateRangeDTO request) {
        return ResponseEntity
                .status(200)
                .body(proveedorService.obtenerCotizacionPorRango(request));
    }

    /**
     * Realiza una búsqueda global e insensible a mayúsculas de productos, retornando la oferta comercial de proveedores.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code buscarProductosGlobalService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Utilizado por el buscador global del panel administrativo).
     *
     * @param searchTerm Término de búsqueda (nombre, código o descripción del producto)
     * @return Lista de proveedores con sus productos coincidentes
     */
    @GetMapping("/buscar-productos-global")
    public ResponseEntity<List<BusquedaProductosGlobalDTO>> buscarProductosGlobal(
            @RequestParam(name = "q") String searchTerm) {
        return ResponseEntity
                .status(200)
                .body(proveedorService.buscarProductosGlobal(searchTerm));
    }

    // ══════════════════════════════════════════════════════════════
    // SINCRONIZACIÓN DE PRECIOS DESDE EXCEL
    // ══════════════════════════════════════════════════════════════

    /**
     * Lista a las distribuidoras que se encuentran activas y disponibles para mapearlas en selectores simples.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code listarProveedoresSelectorService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Rellena el selector en el modal de importación/sincronización de catálogo).
     */
    @GetMapping("/selector")
    public ResponseEntity<List<ProveedorSelectorView>> listarProveedoresSelector() {
        return ResponseEntity
                .status(200)
                .body(proveedorService.listarProveedoresSelector());
    }

    /**
     * Sincroniza y actualiza de forma masiva los precios de catálogo de un proveedor importándolos desde un archivo Excel.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code sincronizarPreciosExcelService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Llamado al confirmar la carga del archivo Excel en el modal de importación masiva).
     *
     * @param id   ID del proveedor destino
     * @param file Archivo .xlsx con productos y precios
     */
    @PostMapping(value = "/{id}/sync-precios-excel", consumes = "multipart/form-data")
    public ResponseEntity<SyncExcelResultDTO> sincronizarPreciosExcel(
            @PathVariable Integer id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity
                .status(200)
                .body(proveedorService.sincronizarPreciosExcel(id, file));
    }

    /**
     * Descarga la plantilla de Excel oficial pre-completada con el catálogo y cotizaciones actuales del proveedor.
     * 
     * [✅] INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code descargarExcelPlantillaService()}
     * - **Pantalla UI:** {@code frontend/src/pages/gestion-proveedores.tsx} (Accionado al presionar el botón para exportar/descargar plantilla del proveedor).
     *
     * @param id ID del proveedor
     */
    @GetMapping("/{id}/excel-plantilla")
    public ResponseEntity<byte[]> descargarExcelPlantilla(@PathVariable Integer id) {
        byte[] contenido = proveedorService.generarExcelPlantillaProveedor(id);
        String filename = "plantilla-proveedor-" + id + "-" + java.time.LocalDate.now() + ".xlsx";
        return ResponseEntity
                .status(200)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(contenido);
    }
}
