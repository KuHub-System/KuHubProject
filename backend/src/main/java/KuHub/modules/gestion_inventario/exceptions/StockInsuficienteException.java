package KuHub.modules.gestion_inventario.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class StockInsuficienteException extends RuntimeException {
    private final Object inventoryItem;
    private final HttpStatus status = HttpStatus.UNPROCESSABLE_ENTITY; // 422 fijo

    public StockInsuficienteException(String message, Object inventoryItem) {
        super(message);
        this.inventoryItem = inventoryItem;
    }
}
