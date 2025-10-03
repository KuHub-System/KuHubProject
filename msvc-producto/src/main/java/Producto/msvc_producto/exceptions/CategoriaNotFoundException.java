package Producto.msvc_producto.exceptions;

public class CategoriaNotFoundException extends RuntimeException {
    public CategoriaNotFoundException(Long id) {
        super("Categoria no encontrada: " + id);
    }
    public CategoriaNotFoundException(String nombre) {
        super("Categoria no encontrada: " + nombre);
    }
}
