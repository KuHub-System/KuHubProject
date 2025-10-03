package msvc_Inventario.exception;

public class FaltaDeStockException extends RuntimeException {
    public FaltaDeStockException(String message) {
        super(message);
    }
}
