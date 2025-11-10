package KuHub.modules.inventario.dtos;

import lombok.*;

@Getter@Setter@ToString@NoArgsConstructor@AllArgsConstructor
public class InventoryWithProductCreateRequestDTO {

    //MISMOS ATRIBUTOS DEL FRONT ACTUAL
    private  String nombreProducto;
    private  String descripcionProducto;
    private  String categoria;
    private  String unidadMedida;
    private  Double stock;
    private  Double stockMinimo;
}
