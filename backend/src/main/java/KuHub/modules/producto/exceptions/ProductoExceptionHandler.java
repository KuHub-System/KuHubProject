package KuHub.modules.producto.exceptions;


import KuHub.config.ErrorDTO;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class ProductoExceptionHandler {

    // Se crea metodo privado que permite generar el error DTO con los elementos basicos del error
    private ErrorDTO createErrorDTO(int status, Date date, Map<String, String> errorMap) {
        ErrorDTO errorDTO = new ErrorDTO();

        errorDTO.setStatus(status);
        errorDTO.setDate(date);
        errorDTO.setErrors(errorMap);

        return errorDTO;
    }

    @ExceptionHandler(ProductoException.class)
    public ResponseEntity<ErrorDTO> handleProductoException(ProductoException exception){
        if(exception.getMessage().contains(" no encontrado")) {
            Map<String, String> errorMap = Collections.singletonMap("Producto no encontrado", exception.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(this.createErrorDTO(HttpStatus.NOT_FOUND.value(), new Date(), errorMap));
        } else {
            Map<String, String> errorMap = Collections.singletonMap("Producto existente", exception.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(this.createErrorDTO(HttpStatus.CONFLICT.value(), new Date(), errorMap));
        }
    }

    @ExceptionHandler(ProductoNotFoundException.class)
    public ResponseEntity<ErrorDTO> handleProductoNotFoundException(ProductoNotFoundException exception) {
        Map<String, String> errorMap = Collections.singletonMap("Producto no encontrado", exception.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(this.createErrorDTO(HttpStatus.NOT_FOUND.value(), new Date(), errorMap));
    }

    @ExceptionHandler(ProductoExistenteException.class)
    public ResponseEntity<ErrorDTO> handleProductoExistenteException(ProductoExistenteException ex) {
        Map<String, String> errorMap = Collections.singletonMap("Producto existente", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(this.createErrorDTO(HttpStatus.CONFLICT.value(), new Date(), errorMap));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorDTO> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errores = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errores.put(error.getField(), error.getDefaultMessage());
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(this.createErrorDTO(HttpStatus.BAD_REQUEST.value(), new Date(), errores));
    }

    // --- NUEVO: manejo de JSON mal formado ---
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorDTO> handleJsonParseException(HttpMessageNotReadableException ex) {
        Map<String, String> errores = new HashMap<>();
        String causa = ex.getMostSpecificCause().getMessage();
        String mensaje;
        if (causa.contains("Cannot deserialize value of type `java.lang.Long`")) {
            mensaje = "Se esperaba un valor numérico para un campo de tipo Long. Revisa los datos enviados.";
        } else if (causa.contains("Unexpected character")) {
            mensaje = "JSON mal formado. Revisa comas, corchetes y llaves en tu solicitud.";
        } else if (causa.contains("not-null property references a null")) {
            mensaje = "Falta un campo obligatorio o tiene valor nulo: " + causa;
        } else {
            mensaje = "Error al procesar el JSON de entrada: " + causa;
        }
        errores.put("mensaje", mensaje);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(this.createErrorDTO(HttpStatus.BAD_REQUEST.value(), new Date(), errores));
    }

    // --- NUEVO: manejo general de violaciones de integridad de base de datos ---
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorDTO> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        Map<String, String> errores = new HashMap<>();
        Throwable causa = ex.getRootCause();
        String mensaje = "Violación de integridad de datos: " + (causa != null ? causa.getMessage() : ex.getMessage());
        errores.put("mensaje", mensaje);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(this.createErrorDTO(HttpStatus.BAD_REQUEST.value(), new Date(), errores));
    }

}
