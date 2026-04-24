package KuHub.modules.gestion_proveedor.service;

import KuHub.modules.gestion_proveedor.dtos.request.ProveedorCreateDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorProductoAddDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorProductoUpdateDTO;
import KuHub.modules.gestion_proveedor.dtos.request.ProveedorUpdateDTO;
import KuHub.modules.gestion_proveedor.dtos.response.CotizacionProveedorDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedorDetalleDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedorListDTO;
import KuHub.modules.gestion_proveedor.dtos.response.ProveedoresPageResponse;
import KuHub.modules.gestion_proveedor.entity.Proveedor;
import KuHub.modules.gestion_solicitud.dtos.request.DateRangeDTO;

import java.util.List;

/**
 * Interfaz del servicio de gestión de proveedores.
 * Define todos los métodos públicos disponibles para el controller.
 */
public interface ProveedorService {

    /** Crea un nuevo proveedor. */
    Proveedor create(ProveedorCreateDTO dto);

    /** Actualiza los datos de un proveedor existente. */
    Proveedor update(Integer idProveedor, ProveedorUpdateDTO dto);

    /** Busca un proveedor activo por su ID. Lanza excepción si no existe. */
    Proveedor findById(Integer idProveedor);

    /** Lista proveedores activos con filtros opcionales de estado y búsqueda. */
    List<ProveedorListDTO> findConFiltros(String estado, String busqueda);

    /** Lista proveedores activos con paginación asimétrica (20/10) y filtros opcionales. */
    ProveedoresPageResponse findConFiltrosPaginado(String estado, String busqueda, Integer page);

    /** Soft-delete de un proveedor (activo = false). */
    boolean softDelete(Integer idProveedor);

    /** Asigna un producto a un proveedor con su precio específico. */
    void agregarProducto(Integer idProveedor, ProveedorProductoAddDTO dto);

    /** Actualiza el precio de un producto asignado a un proveedor usando la PK de la relación.
     *  Retorna true si se actualizó correctamente, false si no hubo cambios.
     */
    boolean actualizarPrecio(Long idProveedorProducto, ProveedorProductoUpdateDTO dto);

    /** Quita (soft-delete) un producto del proveedor.
     *  Retorna true si se soft-deletó correctamente, false si no hubo cambios.
     */
    boolean quitarProducto(Integer idProveedor, Integer idProducto);

    /** Habilita/deshabilita un producto del proveedor (toggle del campo activo).
     *  Retorna true si se toggleó correctamente, false si no hubo cambios.
     */
    boolean toggleProducto(Integer idProveedor, Integer idProducto);

    /** Obtiene el detalle completo de un proveedor con sus productos agrupados por categoría. */
    ProveedorDetalleDTO obtenerDetalle(Integer idProveedor);

    /** Lista los proveedores que ofrecen un producto específico (para comparar precios). */
    List<ProveedorListDTO> findProveedoresPorProducto(Integer idProducto);

    /** Obtiene cotización agrupada por proveedor (menor precio) para solicitudes EN_PEDIDO en un rango de fechas. */
    CotizacionProveedorDTO.CotizacionResponse obtenerCotizacionPorRango(DateRangeDTO request);
}
