package KuHub.modules.gestion_proveedor.controller;

import KuHub.modules.gestion_proveedor.dtos.request.ProveedorCreateDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorProductoAddDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorProductoUpdateDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorUpdateDTO;
import KuHub.modules.gestion_proveedor.dtos.response.CotizacionProveedorDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedorDetalleDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedorListDTO;
import KuHub.modules.gestion_proveedor.entity.Proveedor;
import KuHub.modules.gestion_proveedor.service.ProveedorService;
import KuHub.modules.gestion_solicitud.dtos.request.DateRangeDTO;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Proveedores.
 * Endpoints base: /api/v1/proveedor
 * ⬜ Sin uso frontend aún — pendiente de conexión con gestion-proveedores.tsx
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
     * Lista todos los proveedores activos con filtros opcionales.
     * ⬜ Sin uso frontend aún.
     *
     * @param estado   Filtro por estado: DISPONIBLE o NO_DISPONIBLE (opcional)
     * @param busqueda Búsqueda por nombre, distribuidora o RUT (opcional)
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
     * Obtiene el detalle completo de un proveedor con sus productos agrupados por categoría.
     * ⬜ Sin uso frontend aún.
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
     * Crea un nuevo proveedor.
     * ⬜ Sin uso frontend aún.
     *
     * @param dto Datos del proveedor a crear
     */
    @PostMapping
    public ResponseEntity<Proveedor> create(@Valid @RequestBody ProveedorCreateDTO dto) {
        return ResponseEntity
                .status(201)
                .body(proveedorService.create(dto));
    }

    /**
     * Actualiza los datos de un proveedor existente.
     * ⬜ Sin uso frontend aún.
     *
     * @param id  ID del proveedor a actualizar
     * @param dto Datos actualizados del proveedor
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
     * Elimina lógicamente un proveedor (activo = false).
     * Solo permite eliminar si no tiene productos activos asignados.
     * ⬜ Sin uso frontend aún.
     *
     * @param id ID del proveedor a eliminar
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> softDelete(@PathVariable Integer id) {
        return ResponseEntity
                .status(204)
                .body(proveedorService.softDelete(id));
    }

    // ══════════════════════════════════════════════════════════════
    // RELACIÓN PROVEEDOR ↔ PRODUCTO
    // ══════════════════════════════════════════════════════════════

    /**
     * Lista los productos asignados a un proveedor, agrupados por categoría.
     * ⬜ Sin uso frontend aún.
     *
     * @param id ID del proveedor
     */
    @GetMapping("/{id}/productos")
    public ResponseEntity<ProveedorDetalleDTO> findProductosByProveedor(@PathVariable Integer id) {
        return ResponseEntity
                .status(200)
                .body(proveedorService.obtenerDetalle(id));
    }

    /**
     * Asigna un producto a un proveedor con su precio específico.
     * ⬜ Sin uso frontend aún.
     *
     * @param id  ID del proveedor
     * @param dto Datos del producto a asignar (idProducto + precioProducto)
     */
    @PostMapping("/{id}/productos")
    public ResponseEntity<Void> agregarProducto(
            @PathVariable Integer id,
            @Valid @RequestBody ProveedorProductoAddDTO dto
    ) {
        proveedorService.agregarProducto(id, dto);
        return ResponseEntity.status(201).build();
    }

    /**
     * Actualiza el precio de un producto asignado a un proveedor.
     * ⬜ Sin uso frontend aún.
     *
     * @param id  ID del proveedor
     * @param pid ID del producto
     * @param dto Nuevo precio del producto
     */
    @PatchMapping("/{id}/productos/{pid}")
    public ResponseEntity<Void> actualizarPrecio(
            @PathVariable Integer id,
            @PathVariable Integer pid,
            @Valid @RequestBody ProveedorProductoUpdateDTO dto
    ) {
        proveedorService.actualizarPrecio(id, pid, dto);
        return ResponseEntity.status(200).build();
    }

    /**
     * Quita (soft-delete) un producto del proveedor.
     * ⬜ Sin uso frontend aún.
     *
     * @param id  ID del proveedor
     * @param pid ID del producto a quitar
     */
    @DeleteMapping("/{id}/productos/{pid}")
    public ResponseEntity<Void> quitarProducto(
            @PathVariable Integer id,
            @PathVariable Integer pid
    ) {
        proveedorService.quitarProducto(id, pid);
        return ResponseEntity.status(204).build();
    }

    // ══════════════════════════════════════════════════════════════
    // CONSULTA INVERSA: PROVEEDORES POR PRODUCTO
    // ══════════════════════════════════════════════════════════════

    /**
     * Lista todos los proveedores que ofrecen un producto específico.
     * Útil para comparar precios entre proveedores.
     * ⬜ Sin uso frontend aún.
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
    // COTIZACIÓN AGRUPADA POR PROVEEDOR
    // ══════════════════════════════════════════════════════════════

    /**
     * Obtiene cotización agrupada por proveedor (menor precio) para solicitudes EN_PEDIDO en un rango de fechas.
     * Productos ordenados por categoría dentro de cada proveedor.
     * ✅ En uso: Consumido por cotizacionProveedoresService en solicitud-service.ts.
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
}
