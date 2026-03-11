package KuHub.modules.gestion_academica.dtos.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SectionUpdateDTO {

    @NotNull(message = "La asignatura es obligatoria")
    private Integer idAsignatura;

    @NotNull(message = "El ID de la sección es obligatorio")
    private Integer idSeccion;

    @NotBlank(message = "El nombre de la sección no puede estar vacío")
    @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
    private String nombreSeccion;

    @NotBlank(message = "El estado de la sección es obligatorio")
    private String estadoSeccion;

    @NotNull(message = "El docente es obligatorio")
    private Integer idUsuarioDocente;

    @NotNull(message = "La capacidad máxima es obligatoria")
    @Positive(message = "La capacidad debe ser un número positivo")
    private Short capacidadMax;

    @NotNull(message = "La cantidad de inscritos es obligatoria")
    @PositiveOrZero(message = "La cantidad de inscritos no puede ser negativa")
    private Short cantInscritos;

    // ----- SECCIÓN DE DELTAS -----

    @Valid // Para validar cada objeto dentro de la lista
    private List<BookTimeBlocksDTO> bloquesNuevos;

    /**
     * Lista de IDs de las reservas (reserva_sala) a eliminar (borrado lógico).
     * Ya no necesitamos el DTO completo, solo el ID primario.
     */
    private List<Integer> idsReservasEliminar;
}
