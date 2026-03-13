package KuHub.modules.gestion_solicitud.dtos.respose;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class SolicitationManagementDTO {
    private LocalDate fechaSolicitada;
    private String nombreReceta;
    private Integer idSolicitud;
    private Integer idReceta; // Puede ser null
    private Integer idReservaSala;
    private String estadoSolicitud;
    private String observaciones;
    private List<ProductDetailSolicitationDTO> productos;
    // Aquí guardamos el objeto JSON parseado
    private CourseDetailsDTO asignaturaDetalle;
}
