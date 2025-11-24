package KuHub.modules.producto.exceptions;

import lombok.Getter;

@Getter
public class ProductoNotFoundException extends RuntimeException {
  public ProductoNotFoundException(Integer id) {
    super("No se encontró el producto con el id: " + id);
  }

  public ProductoNotFoundException(String nombre) {
    super("No se encontró el producto con nombre: " + nombre);
  }
}
