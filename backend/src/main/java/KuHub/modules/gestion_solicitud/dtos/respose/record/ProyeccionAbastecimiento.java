package KuHub.modules.gestion_solicitud.dtos.respose.record;

import com.fasterxml.jackson.annotation.JsonProperty;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;



import java.math.BigDecimal;

import java.util.List;



/**

 * Record de response para la proyección de abastecimiento consolidada.

 * Mapea el resultado del jsonb_agg de la consulta nativa de proyección.

 */

@JsonPropertyOrder({"proyeccionAbastecimiento"})

public record ProyeccionAbastecimiento(

        @JsonProperty("proyeccionAbastecimiento")

        List<ProductoAbastecimientoItem> proyeccionAbastecimiento

) {



    /**

     * Item individual de producto dentro de la proyección de abastecimiento.

     * Mapea cada objeto del jsonb_build_object de la consulta nativa.

     */

    @JsonPropertyOrder({

            "idProducto", "nombreProducto", "nombreUnidad",

            "abreviatura", "esFraccionario", "nombreCategoria",

            "cantidadTotalSolicitada", "idInventario", "stock"

    })

    public record ProductoAbastecimientoItem(

            @JsonProperty("idProducto")

            Integer idProducto,



            @JsonProperty("nombreProducto")

            String nombreProducto,



            @JsonProperty("nombreUnidad")

            String nombreUnidad,



            @JsonProperty("abreviatura")

            String abreviatura,



            @JsonProperty("esFraccionario")

            Boolean esFraccionario,



            @JsonProperty("nombreCategoria")

            String nombreCategoria,



            @JsonProperty("cantidadTotalSolicitada")

            BigDecimal cantidadTotalSolicitada,

            @JsonProperty("idInventario")

            Integer idInventario,

            @JsonProperty("stock")

            java.math.BigDecimal stock

    ) {}

}