package msvc_Movimiento.exception;

public class FaltaDeStockException extends RuntimeException {
    public FaltaDeStockException(String message) {
        super(message);
    }
}
