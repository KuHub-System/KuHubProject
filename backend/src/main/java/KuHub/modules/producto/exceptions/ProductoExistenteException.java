package KuHub.modules.producto.exceptions;

import lombok.Getter;

@Getter
public class ProductoExistenteException extends RuntimeException {
  public ProductoExistenteException(Integer id) {
    super("El producto con id " + id + " ya existe");
  }

  public ProductoExistenteException(String nombre) {
    super("El producto con nombre " + nombre + " ya existe");
  }  
}
