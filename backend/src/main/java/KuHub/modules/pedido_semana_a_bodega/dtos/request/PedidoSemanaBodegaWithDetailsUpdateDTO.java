package KuHub.modules.pedido_semana_a_bodega.dtos.request;

import KuHub.modules.pedido_semana_a_bodega.dtos.request.dto.PedidoSemanaBodegaItemDTO;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PedidoSemanaBodegaWithDetailsUpdateDTO {
    @NotNull(message = "El ID de la receta es obligatorio")
    @Positive(message = "El ID de la receta debe ser un número positivo")
    private Integer idPedidoSemanaBodega;

    @NotBlank(message = "El nombre de la receta es obligatorio")
    @Size(max = 100, message = "El nombre de la receta no puede superar los 100 caracteres")
    private String nombrePedido;

    // Campos opcionales (no llevan @NotBlank ni @NotNull)
    private String descripcionPedido;

    @NotBlank(message = "El estado de la receta es obligatorio")
    private String estadoPedido;

    private Integer idSemana;

    // --- Arrays de Deltas para los Ingredientes ---

    // Inicializamos las listas para evitar NullPointerException si el frontend envía null
    @Valid // Obligatorio para que valide los atributos internos de PedidoSemanaBodegaItemDTO
    private List<PedidoSemanaBodegaItemDTO> newItems = new ArrayList<>();

    @Valid
    private List<PedidoSemanaBodegaItemDTO> updateItems = new ArrayList<>();

    private List<Integer> deleteItems = new ArrayList<>();
}
