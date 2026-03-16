package KuHub.modules.gestion_inventario.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class StockDesincronizadoException extends RuntimeException {
    private final Object inventoryItem;
    private final HttpStatus status;

    public StockDesincronizadoException(String message, Object inventoryItem,HttpStatus status) {
        super(message);
        this.inventoryItem = inventoryItem;
        this.status = status;
    }

}
