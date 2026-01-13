package KuHub.modules.semanas.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "semanas", schema = "public", uniqueConstraints = {
        @UniqueConstraint(name = "uk_semana_periodo", columnNames = {"nombre_semana", "anio", "semestre"}),
        @UniqueConstraint(name = "uk_fecha_inicio", columnNames = {"fecha_inicio"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Semana {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "nombre_semana", nullable = false, length = 50)
    private String nombreSemana;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin", nullable = false)
    private LocalDate fechaFin;

    // Columna calculada en BD, en JPA la marcamos como no insertable/actualizable
    @Column(name = "anio", insertable = false, updatable = false)
    private Short anio;

    @Column(name = "semestre", nullable = false)
    private Short semestre;
}
