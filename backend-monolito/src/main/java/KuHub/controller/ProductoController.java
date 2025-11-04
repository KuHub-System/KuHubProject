package KuHub.controller;

import KuHub.entity.Producto;
import KuHub.service.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/producto")
@Validated
public class ProductoController {

    @Autowired
    private ProductoService productoService;

    //Metodos creado solamente para acceder los productos por client rest para la solicitude.

    @GetMapping
    public ResponseEntity<List<Producto>> findAllProductos(){
        return ResponseEntity
                .status(200)
                .body(productoService.findAll());
    }

    @GetMapping("/id/{id}")
    public ResponseEntity<Producto> findProductoById(@PathVariable Long id){
        return ResponseEntity
                .status(200)
                .body(productoService.findById(id));
    }
}
