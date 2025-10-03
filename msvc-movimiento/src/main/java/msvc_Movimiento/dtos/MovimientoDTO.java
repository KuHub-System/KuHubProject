package msvc_Movimiento.dtos;

import lombok.*;
import msvc_Movimiento.model.enums.TipoMovimiento;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class MovimientoDTO {


    private Long idMovimiento;
    private Long idInventario;
    private LocalDate fechaMovimiento;
    private float cantidadMovimiento;
    private TipoMovimiento tipoMovimiento;
}
