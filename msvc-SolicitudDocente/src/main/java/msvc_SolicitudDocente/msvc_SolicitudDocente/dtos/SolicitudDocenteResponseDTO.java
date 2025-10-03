package msvc_SolicitudDocente.msvc_SolicitudDocente.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Date;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SolicitudDocenteResponseDTO {

    private Long idSolicitudDocente;

    //agregar id Docente cuando creado el msvc roles o usuario

    private Long numeroSemana ;

    private Long numeroTaller;

    private Long cantidadPersonas;

    private String descripcionSemana;

    private String seccion;

    private String nombreAsignatura;

    private Date fechaProgramada;

    //retornar lista con detalles de productos solicitados

    private List <DetalleProductoSolicitudResponseDTO> detallesProductoSolicitud;

}
