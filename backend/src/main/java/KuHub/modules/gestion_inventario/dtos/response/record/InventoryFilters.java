package KuHub.modules.gestion_inventario.dtos.response.record;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record InventoryFilters(
        @Valid
        @NotEmpty(message = "La lista de categorías no puede estar vacía")
        List<SimpleFilter> categorias,

        @Valid
        @NotEmpty(message = "La lista de unidades no puede estar vacía")
        List<SimpleFilter> unidades
) {

    // ============================================================================
    // 1. FILTRO SIMPLE — cada filtro con su id y nombre
    // ============================================================================

    public record SimpleFilter(
            @NotNull(message = "El id es obligatorio")
            Integer id,

            @NotBlank(message = "El nombre es obligatorio")
            String nombre
    ) {}
}