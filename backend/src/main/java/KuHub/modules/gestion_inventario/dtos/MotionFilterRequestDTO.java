package KuHub.modules.gestion_inventario.dtos;

import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MotionFilterRequestDTO {

    private String nombreProducto;

    private String nombreResponsable;

    // Actualizado con: MERMA y DEVOLUCION según la imagen
    @Pattern(regexp = "ENTRADA|SALIDA|MERMA|AJUSTE|DEVOLUCION|TODOS",
            message = "Tipo de movimiento no válido")
    private String tipoMovimiento;

    // Coincide con las 4 opciones de tu segunda imagen
    @Pattern(regexp = "MAS_RECIENTES|MAS_ANTIGUOS|MENOR_CANTIDAD|MAYOR_CANTIDAD",
            message = "El criterio de ordenamiento no es válido")
    private String orden = "MAS_RECIENTES";

    private LocalDate fechaInicio;
    private LocalDate fechaFin;

    /**
     * Limpia el filtro de tipo para la consulta SQL.
     */
    public String getTipoMovimientoParaSql() {
        if ("TODOS".equalsIgnoreCase(this.tipoMovimiento) ||
                this.tipoMovimiento == null ||
                this.tipoMovimiento.isEmpty()) {
            return null;
        }
        return this.tipoMovimiento.toUpperCase();
    }
}
