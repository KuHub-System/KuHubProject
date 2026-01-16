package KuHub.modules.gestion_solicitud.dtos.proyeccion;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.time.LocalDate;

@JsonPropertyOrder({
        "idSolicitud",
        "nombreProfesor",
        "nombreAsignatura",
        "fechaSolicitada",
        "nombreReceta",
        "totalProductos",
        "estadoSolicitud"
})
public interface ManagementSolicitationView {

    Integer getIdSolicitud();
    // 1. SELECT ... AS NOMBRE_PROFESOR
    String getNombreProfesor();

    // 2. SELECT A.NOMBRE_ASIGNATURA
    String getNombreAsignatura();

    // 3. SELECT S.FECHA_SOLICITADA
    LocalDate getFechaSolicitada();

    // 4. SELECT ... AS NOMBRE_RECETA
    String getNombreReceta();

    // 5. SELECT S.ESTADO_SOLICITUD
    String getEstadoSolicitud();

    // 6. SELECT ... AS TOTAL_PRODUCTOS
    // El COUNT de SQL siempre devuelve un número entero largo
    Long getTotalProductos();
}
