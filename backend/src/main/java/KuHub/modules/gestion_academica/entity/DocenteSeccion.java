package KuHub.modules.gestion_academica.entity;

import KuHub.modules.gestionusuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(
        name = "docente_seccion",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_docente_seccion_usuario_seccion",
                        columnNames = {"id_usuario", "id_seccion"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class DocenteSeccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_docente_seccion")
    private Integer idDocenteSeccion;

    // Relación con usuario
    @ManyToOne(optional = false)
    @JoinColumn(
            name = "id_usuario",
            referencedColumnName = "id_usuario",
            foreignKey = @ForeignKey(name = "fk_docente_seccion_usuario")
    )
    private Usuario usuario;

    // Relación con sección
    @ManyToOne(optional = false)
    @JoinColumn(
            name = "id_seccion",
            referencedColumnName = "id_seccion",
            foreignKey = @ForeignKey(name = "fk_docente_seccion_seccion")
    )
    private Seccion seccion;

    @Column(name = "fecha_asignacion")
    private LocalDate fechaAsignacion = LocalDate.now();


    /** 24/11/25 fecha de modificacion en la bbdd
     *  -- Tabla docente_seccion
     * CREATE TABLE docente_seccion (
     *     id_docente_seccion INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     *     id_usuario         INTEGER NOT NULL,
     *     id_seccion         INTEGER NOT NULL,
     *     fecha_asignacion   DATE DEFAULT CURRENT_DATE,
     *     CONSTRAINT uq_docente_seccion_usuario_seccion
     *         UNIQUE (id_usuario, id_seccion),
     *     CONSTRAINT fk_docente_seccion_usuario
     *         FOREIGN KEY (id_usuario)
     *         REFERENCES usuario(id_usuario),
     *     CONSTRAINT fk_docente_seccion_seccion
     *         FOREIGN KEY (id_seccion)
     *         REFERENCES seccion(id_seccion)
     * );*/

}
