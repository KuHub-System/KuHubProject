package KuHub.modules.gestion_solicitud.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Getter@Setter@NoArgsConstructor@AllArgsConstructor@ToString
public class SolicitationCreateRequestDTO {

    @NotNull(message = "La id del usuario no puede ser nula")
    private Integer idUsuarioGestorSolicitud;
    @NotEmpty(message = "Debes enviar al menos una sección")
    @Valid
    private List<SectionsForSolicitationRequestDTO> secciones;// La lista de secciones con sus fechas
    private Integer idReceta;
    // Ítems base de la receta que el usuario eliminó
    private List<Integer> detalleRecetaIdsEliminados;
    // Ítems agregados por el usuario
    private List<@Valid AdditionalItemCreateRequestDTO> itemsAdicionales;
    @Size(max = 600, message = "La cantidad de caracter no puede superta a 600")
    private String observaciones;

}
