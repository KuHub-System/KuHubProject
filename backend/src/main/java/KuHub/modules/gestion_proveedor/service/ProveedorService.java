package KuHub.modules.gestion_proveedor.service;

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
import KuHub.modules.gestion_solicitud.dtos.request.DateRangeDTO;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
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

    /** Asigna un producto a un proveedor con su precio específico.
     *  Retorna true si se asignó correctamente, false si ya estaba asignado.
     */
    boolean agregarProducto(Integer idProveedor, ProveedorProductoAddDTO dto);

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

    /**
     * Vista histórica: detalle del proveedor con los precios vigentes hasta una fecha dada.
     * Por cada producto se devuelve la versión cuya fecha_actualizacion sea la más reciente
     * pero ≤ a la fecha consultada (incluye el día completo).
     * Útil para auditar qué precios tenía el proveedor en un punto en el tiempo.
     */
    ProveedorDetalleDTO obtenerDetalleEnFecha(Integer idProveedor, LocalDate fechaConsulta);

    /** Lista los proveedores que ofrecen un producto específico (para comparar precios). */
    List<ProveedorListDTO> findProveedoresPorProducto(Integer idProducto);

    /** Obtiene cotización agrupada por proveedor (menor precio) para solicitudes EN_PEDIDO en un rango de fechas. */
    CotizacionProveedorDTO.CotizacionResponse obtenerCotizacionPorRango(DateRangeDTO request);

    /** Lista productos disponibles para asignar a un proveedor, con filtro opcional por categoría. */
    List<ProductoDisponibleDTO> obtenerProductosDisponibles(Integer idProveedor, Short idCategoria);

    /** Obtiene todas las categorías activas como JSON para filtros en el modal de asignar productos. */
    String obtenerCategoriasActivasJson();

    /** Búsqueda global de productos por nombre, código o descripción.
     *  Retorna lista de proveedores con los productos encontrados.
     *  La búsqueda es case-insensitive (ILIKE en PostgreSQL).
     */
    List<BusquedaProductosGlobalDTO> buscarProductosGlobal(String searchTerm);

    /**
     * Lista distribuidoras activas y disponibles para el selector del modal de sincronización Excel.
     * Filtro: activo = TRUE AND estado_proveedor = DISPONIBLE.
     * Orden: nombre_distribuidora ASC.
     */
    List<ProveedorSelectorView> listarProveedoresSelector();

    /**
     * Sincroniza precios de los productos del proveedor leyendo un archivo .xlsx.
     * Inserta una nueva versión activa por producto y desactiva versiones previas.
     * Retorna resumen con sincronizados, omitidos y errores por fila.
     */
    SyncExcelResultDTO sincronizarPreciosExcel(Integer idProveedor, MultipartFile file);
}
