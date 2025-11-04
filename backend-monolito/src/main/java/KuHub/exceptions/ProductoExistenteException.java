package KuHub.exceptions;

import lombok.Getter;

@Getter
public class ProductoExistenteException extends RuntimeException {
  public ProductoExistenteException(Long id) {
    super("El producto con id " + id + " ya existe");
  }

  public ProductoExistenteException(String nombre) {
    super("El producto con nombre " + nombre + " ya existe");
  }
}
