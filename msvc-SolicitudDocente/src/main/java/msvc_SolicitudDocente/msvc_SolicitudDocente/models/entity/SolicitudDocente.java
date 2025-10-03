package msvc_SolicitudDocente.msvc_SolicitudDocente.models.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.Date;

@Entity
@Table(name ="solicitud_docente")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class SolicitudDocente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_solicitud_docente",nullable = false)
    private Long idSolicitudDocente;

    //agregar id Docente cuando creado el msvc roles o usuario

    @Column(name="numero_semana",nullable = false)
    @NotNull(message = "El campo numero semana no puede ser vacio")
    private Long numeroSemana ;

    @Column(name="numero_taller",nullable = false)
    @NotNull(message = "El campo numero taller no puede ser vacio")
    private Long numeroTaller;

    @Column(name="cantidad_personas",nullable = false)
    @NotNull(message = "El campo cantidad personas no puede ser vacio")
    private Long cantidadPersonas;

    @Column(name="descripcion_semana",nullable = false )
    @NotBlank(message = "El campo descripcion semana no puede ser vacio")
    private String descripcionSemana;

    @Column(nullable = false )
    @NotBlank(message = "El campo session no puede ser vacio")
    private String seccion;

    @Column(name="nombre_asignatura",nullable = false )
    @NotBlank(message = "El campo nombre asignatura semana no puede ser vacio")
    private String nombreAsignatura;

    @Column(name = "fecha_programada" ) 
    private Date fechaProgramada;




}
