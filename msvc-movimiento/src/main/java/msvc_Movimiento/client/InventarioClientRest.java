package msvc_Movimiento.client;

import msvc_Movimiento.dtos.InventarioDTO;
import msvc_Movimiento.dtos.InventarioUpdateDTO;
import msvc_Movimiento.model.Inventario;
import org.springframework.cloud.openfeign.FeignClient;
import msvc_Movimiento.model.Producto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;


@FeignClient(name = "msvc-Inventario", url = "http://localhost:8085/api/v1/inventario")
public interface InventarioClientRest {

    @PutMapping("/{id}/update-total")
    void updateTotalInventario(@PathVariable("id") Long id, @RequestBody InventarioUpdateDTO totalInventario);

    @GetMapping("/{id}")
    InventarioDTO findById(@PathVariable Long id);

    @GetMapping("/getinventario/{idProducto}")
    Inventario getInventarioByIdProducto(@PathVariable Long idProducto);

    @GetMapping("/getproducto/{idInventario}")
    Producto getProductoByIdInventario(@PathVariable Long idInventario);
}
