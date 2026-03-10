package KuHub.modules.gestion_academica.entity;

import KuHub.modules.gestion_usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;


@Entity
@Table(
        name = "asignatura_profesor_cargo",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"id_asignatura"}) // solo un profesor por asignatura
        }
)
@Data
@NoArgsConstructor
@Getter
@Setter
@AllArgsConstructor
@ToString
public class AsignaturaProfesorCargo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_asignatura_profesor_cargo")
    private Integer idAsignaturaProfesorCargo;

    @ManyToOne
    @JoinColumn(name = "id_asignatura", nullable = false,
            foreignKey = @ForeignKey(name = "fk_asignatura_profesor_asignatura"))
    private Asignatura asignatura;

    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = false,
            foreignKey = @ForeignKey(name = "fk_asignatura_profesor_usuario"))
    private Usuario usuario;

    @Column(name = "fecha_asignacion",
            columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime fechaAsignacion;

    /**
     * Vincula una Asignatura a esta relación utilizando solo su ID.
     * @param id Identificador de la asignatura.
     */
    public void setIdAsignatura(Integer id) {
        if (id != null) {
            this.asignatura = new Asignatura();
            this.asignatura.setIdAsignatura(id);
        }
    }

    /**
     * Vincula un Usuario (Profesor) a esta relación utilizando solo su ID.
     * @param id Identificador del usuario.
     */
    public void setIdUsuario(Integer id) {
        if (id != null) {
            this.usuario = new Usuario();
            this.usuario.setIdUsuario(id);
        }
    }
}
