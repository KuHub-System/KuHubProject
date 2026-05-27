package KuHub.modules.gestion_inventario.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/** DTO de respuesta: categoría activa con sus flags de abastecimiento. */
public record CategoriaAbastecimientoDTO(
        @JsonProperty("idCategoria")     Short   idCategoria,
        @JsonProperty("nombreCategoria") String  nombreCategoria,
        @JsonProperty("inventario")      Boolean inventario,
        @JsonProperty("bodegaTransito")  Boolean bodegaTransito
) {}
