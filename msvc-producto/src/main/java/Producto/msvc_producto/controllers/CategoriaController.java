package Producto.msvc_producto.controllers;


import Producto.msvc_producto.models.entity.Categoria;
import Producto.msvc_producto.services.CategoriaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categoria")
public class CategoriaController {

    @Autowired
    private CategoriaService categoriaService;


    @GetMapping
    public ResponseEntity<List<Categoria>> findAll(){
        return ResponseEntity
                .status(200)
                .body(categoriaService.findAll());
    }

    @GetMapping("/{idCategoria}")
    public ResponseEntity<Categoria> findById(@PathVariable Long idCategoria){
        return ResponseEntity
                .status(200)
                .body(this.categoriaService.findById(idCategoria));
    }

    @PostMapping
    public ResponseEntity<Categoria> save(@RequestBody Categoria categoria){
        return ResponseEntity
                .status(201)
                .body(this.categoriaService.save(categoria));
    }

    @DeleteMapping("/{idCategoria}")
    public ResponseEntity<String> delete(@PathVariable Long idCategoria){
        this.categoriaService.delete(idCategoria);
        return ResponseEntity
                .status(200)
                .body("Categoria eliminada");
    }

    @PutMapping
    public ResponseEntity<Categoria> updateNombreCategoria(@RequestBody Categoria categoria){
        return ResponseEntity
                .status(200)
                .body(this.categoriaService.updateNombreCategoria(categoria));
    };
}
