package KuHub.modules.gestion_inventario.exceptions;

import lombok.Getter;
@Getter

public class InventarioException extends RuntimeException {
    public InventarioException(String message) {
        super(message);
    }
}
