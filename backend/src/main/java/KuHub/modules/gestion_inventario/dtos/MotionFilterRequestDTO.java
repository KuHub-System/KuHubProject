package KuHub.modules.gestion_inventario.dtos;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;

@Getter
@Setter
@ToString
public class MotionFilterRequestDTO {

    // Puede venir el nombre o estar vacío para "Todos"
    private String nombreProducto;

    // "ENTRADA", "SALIDA", "AJUSTE", "TODOS" o null
    private String tipoMovimiento;

    // Claves esperadas: "MAS_RECIENTES", "MAS_ANTIGUOS", "MAYOR_CANTIDAD", "MENOR_CANTIDAD"
    private String orden;

    // CAMBIO: Ahora recibimos el rango explícito
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
}
