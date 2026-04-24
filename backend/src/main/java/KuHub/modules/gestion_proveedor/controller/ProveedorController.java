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
 * ✅ Todos los endpoints conectados con gestion-proveedores.tsx y solicitud-service.ts
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
     * ✅ En uso: Consumido por obtenerProveedoresService en proveedor-service.ts.
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
     * Obtiene el detalle completo de un proveedor con sus productos agrupados por categoría y días de entrega.
     * ✅ En uso: Consumido por obtenerProveedorDetalleService en proveedor-service.ts.
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
     * Crea un nuevo proveedor con días de entrega opcionales.
     * ✅ En uso: Consumido por crearProveedorService en proveedor-service.ts.
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
     * Actualiza los datos de un proveedor existente (incluye días de entrega).
     * ✅ En uso: Consumido por actualizarProveedorService en proveedor-service.ts.
     * Implementa estrategia delete+insert para diasEntrega: elimina todos los días existentes e inserta los nuevos.
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
     * Elimina lógicamente un proveedor (activo = false).
     * Solo permite eliminar si no tiene productos activos asignados.
     * ✅ En uso: Consumido por eliminarProveedorService en proveedor-service.ts.
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
     * ⬜ Sin uso frontend: Este endpoint es redundante con GET /{id} que ya trae productos.
     * Se mantiene por compatibilidad. Prefiere usar GET /{id} directamente.
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
     * Asigna un producto a un proveedor con su precio específico.
     * ✅ En uso: Consumido por agregarProductoProveedorService en proveedor-service.ts.
     * Se llama desde el modal de asignación de productos en gestion-proveedores.tsx.
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
     * ✅ En uso: Consumido por actualizarPrecioProductoService en proveedor-service.ts.
     * Se llama desde la tabla de productos en el modal de detalle/edición del proveedor.
     * [CAMBIO 2026-04-24] Endpoint actualizado a usar idProveedorProducto (PK) en lugar de dos IDs.
     * Simplifica la consulta y evita ambigüedades con dos path parameters.
     * Retorna boolean: true si se actualizó, false si el precio era igual y no hubo cambios.
     * Frontend NO necesita hacer segunda petición si es true — solo actualiza el valor en tabla.
     *
     * @param idProveedorProducto ID de la relación proveedor-producto (PK)
     * @param dto Nuevo precio del producto (formato chileno: 1.234,567)
     * @return true si se actualizó, false si no hubo cambios
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
     * Quita (soft-delete) un producto del proveedor.
     * ✅ En uso: Consumido por quitarProductoProveedorService en proveedor-service.ts.
     * Se llama desde los botones de eliminación en la tabla de productos del proveedor.
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

    /**
     * Habilita/deshabilita un producto del proveedor (toggle del campo activo).
     * ✅ En uso: Consumido por toggleProductoProveedorService en proveedor-service.ts.
     * Se llama desde el botón toggle en la tabla de productos del proveedor.
     * El producto NO se elimina, solo se cambia su estado activo/inactivo.
     *
     * @param id  ID del proveedor
     * @param pid ID del producto a habilitar/deshabilitar
     */
    @PatchMapping("/{id}/productos/{pid}/toggle")
    public ResponseEntity<Void> toggleProducto(
            @PathVariable Integer id,
            @PathVariable Integer pid
    ) {
        proveedorService.toggleProducto(id, pid);
        return ResponseEntity.status(200).build();
    }

    // ══════════════════════════════════════════════════════════════
    // CONSULTA INVERSA: PROVEEDORES POR PRODUCTO
    // ══════════════════════════════════════════════════════════════

    /**
     * Lista todos los proveedores que ofrecen un producto específico.
     * Útil para comparar precios entre proveedores.
     * ✅ En uso: Consumido por obtenerProveedoresPorProductoService en proveedor-service.ts.
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
