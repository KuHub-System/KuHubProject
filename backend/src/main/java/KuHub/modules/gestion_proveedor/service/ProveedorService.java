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
 * Interfaz del servicio de negocio para la gestión de Proveedores.
 * Centraliza y expone las operaciones del ciclo de vida de los proveedores, su vinculación
 * con productos del catálogo de inventario, el cálculo de cotizaciones por rangos de fechas,
 * y la sincronización masiva de precios a través de plantillas personalizadas de Excel.
 */
public interface ProveedorService {

    /**
     * Registra un nuevo proveedor en el sistema junto con sus días y horarios de entrega opcionales.
     *
     * @param dto DTO que contiene la información de contacto de la distribuidora y su RUT
     * @return Entidad del Proveedor creada y guardada
     */
    Proveedor create(ProveedorCreateDTO dto);

    /**
     * Actualiza los datos generales de contacto, dirección, estado y los días de entrega de un proveedor.
     * Implementa la estrategia de reemplazo total para los días de entrega.
     *
     * @param idProveedor Identificador único del proveedor a actualizar
     * @param dto DTO con los campos modificados del proveedor
     * @return Entidad del Proveedor actualizada
     */
    Proveedor update(Integer idProveedor, ProveedorUpdateDTO dto);

    /**
     * Busca un proveedor activo por su identificador único.
     * Lanza una excepción de negocio si no se encuentra registrado o está inactivo.
     *
     * @param idProveedor Identificador único del proveedor
     * @return Entidad del Proveedor correspondiente al ID
     */
    Proveedor findById(Integer idProveedor);

    /**
     * Obtiene la lista de proveedores activos filtrando opcionalmente por su estado de disponibilidad
     * y por coincidencia de nombre o RUT.
     *
     * @param estado Estado de disponibilidad para filtrar (DISPONIBLE / NO_DISPONIBLE)
     * @param busqueda Término de búsqueda de coincidencia parcial en nombre o RUT
     * @return Lista de DTOs resumidos con la información básica de los proveedores coincidentes
     */
    List<ProveedorListDTO> findConFiltros(String estado, String busqueda);

    /**
     * Obtiene el listado de proveedores activos de forma paginada aplicando filtros opcionales de estado
     * y búsqueda parcial.
     *
     * @param estado Estado de disponibilidad para filtrar
     * @param busqueda Término de búsqueda parcial
     * @param page Número de la página a recuperar (indexada en 1)
     * @return DTO envoltorio con los proveedores de la página y metadatos de paginación
     */
    ProveedoresPageResponse findConFiltrosPaginado(String estado, String busqueda, Integer page);

    /**
     * Realiza la eliminación lógica (desactivación) de un proveedor en el sistema.
     * Si force=false y el proveedor tiene productos activos, lanza 422.
     * Si force=true, desactiva los productos automáticamente y procede (uso exclusivo del Administrador).
     *
     * @param idProveedor Identificador único del proveedor a desactivar
     * @param force       Si true, fuerza la eliminación desactivando los productos activos primero
     * @return true si la desactivación lógica fue exitosa, false en caso contrario
     */
    boolean softDelete(Integer idProveedor, boolean force);

    /**
     * Asocia un producto del catálogo general al portafolio de un proveedor asignándole un precio específico.
     *
     * @param idProveedor Identificador del proveedor
     * @param dto DTO con el ID del producto y los precios neto y con IVA calculados
     * @return true si la asociación fue creada, false si el producto ya estaba previamente asignado
     */
    boolean agregarProducto(Integer idProveedor, ProveedorProductoAddDTO dto);

    /**
     * Actualiza el valor de cotización de un producto asociado a un proveedor utilizando la PK de la relación.
     * Permite gestionar actualizaciones de tarifas manteniendo el histórico.
     *
     * @param idProveedorProducto ID de la clave primaria de la relación proveedor-producto
     * @param dto DTO con las nuevas tarifas en neto y con IVA
     * @return true si el precio fue actualizado, false si los valores son idénticos a los actuales
     */
    boolean actualizarPrecio(Long idProveedorProducto, ProveedorProductoUpdateDTO dto);

    /**
     * Recalcula y corrige in-place el valor del precio con IVA basándose en el precio neto actual (neto * 1.19).
     * Esta operación es de mantenimiento y no genera una nueva versión histórica de precios.
     *
     * @param idProveedorProducto ID de la relación proveedor-producto a corregir
     * @return true si el precio con IVA sufrió cambios y se persistió, false si ya estaba sincronizado
     */
    boolean sincronizarPrecioDesdeNeto(Long idProveedorProducto);

    /**
     * Recalcula y corrige in-place el valor del precio neto basándose en el precio con IVA actual (iva / 1.19).
     * Esta operación es de mantenimiento y no genera una nueva versión histórica de precios.
     *
     * @param idProveedorProducto ID de la relación proveedor-producto a corregir
     * @return true si el precio neto sufrió cambios y se persistió, false si ya estaba sincronizado
     */
    boolean sincronizarPrecioDesdeIva(Long idProveedorProducto);

    /**
     * Remueve lógicamente un producto de la oferta comercial de un proveedor (activo = false).
     *
     * @param idProveedor Identificador del proveedor
     * @param idProducto Identificador del producto a desasociar
     * @return true si se desactivó correctamente de la oferta, false si no hubo cambios
     */
    boolean quitarProducto(Integer idProveedor, Integer idProducto);

    /**
     * Alterna (toggle) el estado de activación comercial de un producto ofrecido por un proveedor.
     * Permite pausar y reanudar la oferta de un insumo sin eliminar su histórico.
     *
     * @param idProveedor Identificador del proveedor
     * @param idProducto Identificador del producto a alternar
     * @return true si se cambió el estado activo exitosamente, false si no hubo cambios
     */
    boolean toggleProducto(Integer idProveedor, Integer idProducto);

    /**
     * Recupera la ficha técnica y catálogo completo de productos de un proveedor agrupado por categoría.
     *
     * @param idProveedor Identificador del proveedor
     * @return DTO con el detalle completo del proveedor, sus días de entrega y su catálogo clasificado
     */
    ProveedorDetalleDTO obtenerDetalle(Integer idProveedor);

    /**
     * Obtiene una auditoría del catálogo de productos y precios vigentes de un proveedor a una fecha específica.
     * Selecciona para cada producto la versión activa cuya fecha de actualización sea la más reciente y menor
     * o igual a la fecha de consulta proporcionada.
     *
     * @param idProveedor Identificador del proveedor
     * @param fechaConsulta Fecha histórica de corte para la auditoría de tarifas
     * @return DTO con la estructura del catálogo del proveedor congelado en la fecha dada
     */
    ProveedorDetalleDTO obtenerDetalleEnFecha(Integer idProveedor, LocalDate fechaConsulta);

    /**
     * Lista a todos los proveedores que ofrecen actualmente un producto específico, facilitando la
     * comparación directa de ofertas y tarifas.
     *
     * @param idProducto Identificador del producto de inventario a comparar
     * @return Lista de DTOs de proveedores que distribuyen el producto
     */
    List<ProveedorListDTO> findProveedoresPorProducto(Integer idProducto);

    /**
     * Genera una cotización optimizada buscando el menor precio por producto entre todos los proveedores
     * para las solicitudes que se encuentran en estado de procesamiento de pedido dentro de un rango de fechas.
     *
     * @param request DTO que encapsula el rango de fechas límite (inicio y fin) de las solicitudes a cotizar
     * @return DTO con el consolidado de productos y los proveedores ganadores
     */
    CotizacionProveedorDTO.CotizacionResponse obtenerCotizacionPorRango(DateRangeDTO request);

    /**
     * Lista los productos activos del sistema que aún no están asignados en el catálogo comercial del proveedor,
     * permitiendo opcionalmente filtrar por una categoría particular.
     *
     * @param idProveedor Identificador del proveedor
     * @param idCategoria ID opcional de la categoría de productos
     * @return Lista de DTOs con los productos disponibles para asignación
     */
    List<ProductoDisponibleDTO> obtenerProductosDisponibles(Integer idProveedor, Short idCategoria);

    /**
     * Obtiene el catálogo serializado de categorías de productos activas en formato JSON simple.
     * Diseñado para inicializar rápidamente filtros estáticos en la interfaz de usuario.
     *
     * @return Cadena de texto JSON con el arreglo de categorías [ { "id": X, "nombre": "Y" } ]
     */
    String obtenerCategoriasActivasJson();

    /**
     * Realiza una búsqueda global e insensible a mayúsculas/minúsculas de productos en el catálogo de proveedores
     * coincidiendo por nombre, código de barras o descripción.
     *
     * @param searchTerm Palabra o término de búsqueda proporcionado por el usuario
     * @return Lista de DTOs que mapean los proveedores y los productos que coinciden con el término
     */
    List<BusquedaProductosGlobalDTO> buscarProductosGlobal(String searchTerm);

    /**
     * Obtiene una vista de selección rápida con las distribuidoras que se encuentran activas y disponibles.
     *
     * @return Lista de proyecciones optimizadas para selectores de la interfaz de usuario
     */
    List<ProveedorSelectorView> listarProveedoresSelector();

    /**
     * Procesa y sincroniza los precios y productos de un proveedor importándolos desde una plantilla Excel.
     * Desactiva las tarifas antiguas e introduce nuevas versiones activas para cada producto coincidente.
     *
     * @param idProveedor Identificador del proveedor destino
     * @param file Archivo multipart .xlsx que contiene la matriz de productos y precios
     * @return DTO con el balance del procesamiento (filas sincronizadas, omitidas y reportes de errores)
     */
    SyncExcelResultDTO sincronizarPreciosExcel(Integer idProveedor, MultipartFile file);

    /**
     * Genera la plantilla Excel oficial pre-completada con el catálogo y precios actuales del proveedor.
     * El formato del archivo generado coincide exactamente con la matriz de sincronización, permitiendo al proveedor
     * realizar modificaciones de tarifas directamente sobre el archivo y volver a cargarlo al sistema.
     *
     * @param idProveedor Identificador del proveedor
     * @return Arreglo de bytes que representa el archivo binario de Excel generado
     */
    byte[] generarExcelPlantillaProveedor(Integer idProveedor);
}
