package KuHub.modules.gestion_academica.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "reserva_sala")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class ReservaSala {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reserva_sala")
    private Integer idReservaSala;

    // ----------- Relaciones -------------

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_seccion", nullable = false)
    private Seccion seccion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_sala", nullable = false)
    private Sala sala;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "id_bloque",
            nullable = false
    )
    private BloqueHorario bloqueHorario;

    // ----------- Campos simples -----------

    @Enumerated(EnumType.STRING)
    @Column(name = "dia_semana", nullable = false)
    private DiaSemana diaSemana;

    public enum DiaSemana {
        LUNES,
        MARTES,
        MIERCOLES,
        JUEVES,
        VIERNES,
        SABADO,
        DOMINGO
    }

    /** 24/11/25 fecha mod en la bbdd
     * CREATE CAST (varchar AS dia_semana_type) WITH INOUT AS IMPLICIT;
     * -- Tabla reserva_sala
     * CREATE TABLE reserva_sala (
     *     id_reserva_sala INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     *     id_seccion INTEGER NOT NULL,
     *     id_sala INTEGER NOT NULL,
     *     dia_semana dia_semana_type NOT NULL,
     *     id_bloque INTEGER NOT NULL,
     *     CONSTRAINT fk_reserva_sala_seccion
     *         FOREIGN KEY (id_seccion) REFERENCES seccion(id_seccion),
     *     CONSTRAINT fk_reserva_sala_sala
     *         FOREIGN KEY (id_sala) REFERENCES sala(id_sala),
     *     CONSTRAINT fk_reserva_sala_bloque
     *         FOREIGN KEY (id_bloque) REFERENCES bloque_horario(id_bloque)
     * );
     * */
}
