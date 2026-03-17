package KuHub.modules.gestion_solicitud.dtos.respose.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO Maestro que envuelve toda la respuesta del Dashboard Consolidado.
 * Contiene todas las estructuras anidadas necesarias para Jackson (JSON).
 *
 * IMPORTANTE: Los @JsonProperty deben coincidir EXACTAMENTE con las claves
 * generadas en los json_build_object() de las consultas SQL nativas.
 */
public record DashboardConsolidado(
        List<SolicitudDashboardDTO> solicitudes,
        List<ProductoConsolidadoDTO> consolidado
) {

    // ============================================================================
    // 1. CLASES PARA LA PESTAÑA: SOLICITUDES ACEPTADAS (Consulta A)
    //    Las columnas del SELECT son posicionales (row[0]..row[4]),
    //    solo el campo asignaturaDetalle (row[4]) se parsea desde JSON.
    // ============================================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SolicitudDashboardDTO(
            Integer idSolicitud,
            LocalDate fechaSolicitada,
            String nombreReceta,
            String observaciones,
            AsignaturaDetalleDTO asignaturaDetalle
    ) {}

    /**
     * SQL genera: json_build_object('nombre_asignatura', ..., 'id_asignatura', ..., 'seccion', ...)
     * → Claves en snake_case → @JsonProperty en snake_case ✓
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AsignaturaDetalleDTO(
            @JsonProperty("nombre_asignatura") String nombreAsignatura,
            @JsonProperty("id_asignatura") Integer idAsignatura,
            @JsonProperty("seccion") SeccionDetalleDTO seccion
    ) {}

    /**
     * SQL genera: 'id_seccion', 'nombre_seccion', 'id_usuario', 'nombre_docente',
     *             'cant_inscritos', 'cant_productos', 'productos_solicitados', 'horarios'
     * → Todo snake_case ✓
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SeccionDetalleDTO(
            @JsonProperty("id_seccion") Integer idSeccion,
            @JsonProperty("nombre_seccion") String nombreSeccion,
            @JsonProperty("id_usuario") Integer idUsuario,
            @JsonProperty("nombre_docente") String nombreDocente,
            @JsonProperty("cant_inscritos") Integer cantInscritos,
            @JsonProperty("cant_productos") Integer cantProductos,
            @JsonProperty("productos_solicitados") List<ProductoSolicitadoDTO> productosSolicitados,
            @JsonProperty("horarios") HorarioDetalleDTO horarios
    ) {}

    /**
     * ⚠️ AQUÍ ESTABA EL BUG EN CONSULTA A:
     * El SQL genera: 'nombreProducto' (camelCase), no 'nombre_producto'.
     *
     * Dos opciones:
     *   Opción A) Cambiar el SQL a 'nombre_producto' y dejar este @JsonProperty como está.
     *   Opción B) Cambiar el @JsonProperty a "nombreProducto" para que coincida con el SQL actual.
     *
     * → Elegimos Opción B para no tocar el SQL. Si prefieres corregir el SQL, usa "nombre_producto".
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProductoSolicitadoDTO(
            @JsonProperty("nombreProducto") String nombreProducto,
            @JsonProperty("cantidad") BigDecimal cantidad,
            @JsonProperty("unidad_abreviada") String unidadAbreviada,
            @JsonProperty("observacion") String observacion
    ) {}

    /**
     * SQL genera: 'nombreSala', 'rangoHoras' (camelCase)
     * → @JsonProperty en camelCase para coincidir ✓
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HorarioDetalleDTO(
            @JsonProperty("nombreSala") String nombreSala,
            @JsonProperty("rangoHoras") String rangoHoras
    ) {}


    // ============================================================================
    // 2. CLASES PARA LA PESTAÑA: RESUMEN DE PRODUCTOS (Consulta B)
    //    El SQL genera TODO en camelCase dentro de json_build_object().
    //    Los @JsonProperty DEBEN coincidir con esas claves camelCase.
    // ============================================================================

    /**
     * ⚠️ AQUÍ ESTABA EL BUG EN CONSULTA B:
     * SQL genera: 'idProducto', 'nombreProducto', 'cantidadTotal', 'totalSecciones', 'detalles'
     * Antes tenías: 'id_producto', 'nombre_producto', 'cantidad_total', 'total_secciones'
     * → Ahora alineado a camelCase del SQL.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProductoConsolidadoDTO(
            @JsonProperty("idProducto") Integer idProducto,
            @JsonProperty("nombreProducto") String nombreProducto,
            @JsonProperty("cantidadTotal") BigDecimal cantidadTotal,
            @JsonProperty("unidad") String unidad,
            @JsonProperty("totalSecciones") Integer totalSecciones,
            @JsonProperty("detalles") List<DetalleSeccionConsolidadoDTO> detalles
    ) {}

    /**
     * ⚠️ MISMO BUG:
     * SQL genera: 'idSolicitud', 'fechaSolicitada', 'nombreSeccion', 'nombreAsignatura',
     *             'nombreDocente', 'cantidad', 'alumnos', 'nombreSala', 'rangoHoras'
     * Antes tenías: 'id_solicitud', 'fecha_solicitada', 'nombre_seccion', etc.
     * → Ahora alineado a camelCase del SQL.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DetalleSeccionConsolidadoDTO(
            @JsonProperty("idSolicitud") Integer idSolicitud,
            @JsonProperty("fechaSolicitada") LocalDate fechaSolicitada,
            @JsonProperty("nombreSeccion") String nombreSeccion,
            @JsonProperty("nombreAsignatura") String nombreAsignatura,
            @JsonProperty("nombreDocente") String nombreDocente,
            @JsonProperty("cantidad") BigDecimal cantidad,
            @JsonProperty("observacion") String observacion,
            @JsonProperty("alumnos") Integer alumnos,
            @JsonProperty("nombreSala") String nombreSala,
            @JsonProperty("rangoHoras") String rangoHoras
    ) {}
}
