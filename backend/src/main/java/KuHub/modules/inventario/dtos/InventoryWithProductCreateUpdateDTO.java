package KuHub.modules.inventario.dtos;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

@Getter@Setter@ToString@NoArgsConstructor@AllArgsConstructor
public class InventoryWithProductCreateUpdateDTO {

    //MISMOS ATRIBUTOS DEL FRONT ACTUAL
    private  Integer idInventario;
    private  Integer idProducto;
    private  String nombreProducto;
    private  String descripcionProducto;
    private  String nombreCategoria;
    private  String unidadMedida;
    private  Double stock;
    private  Double stockMinimo;
}
