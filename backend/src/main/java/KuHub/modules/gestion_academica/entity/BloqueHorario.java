package KuHub.modules.gestion_academica.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

@Entity
@Table(name = "bloque_horario")
@Getter@Setter@NoArgsConstructor@AllArgsConstructor@ToString
public class BloqueHorario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_bloque")
    private Integer idBloque;

    @Column(name = "numero_bloque", unique = true, nullable = false)
    private Integer numeroBloque;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    /** 24/11/25 fecha de modificacion de la bbdd
     *  CREATE TABLE bloque_horario (
     *     id_bloque INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     *     numero_bloque INTEGER UNIQUE NOT NULL,
     *     hora_inicio TIME NOT NULL,
     *     hora_fin TIME NOT NULL
     * );
     * */
}
