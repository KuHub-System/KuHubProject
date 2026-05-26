package KuHub.modules.gestion_proveedor.entity;

import KuHub.modules.gestion_proveedor.enums.DiaSemana;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

/**
 * Entidad JPA que representa las ventanas horarias de entrega asignadas a un Proveedor.
 * Vincula un proveedor con los días de la semana y los rangos horarios específicos
 * (inicio y término) en los cuales está facultado y programado para realizar entregas
 * de insumos en las bodegas del establecimiento.
 */
@Entity
@Table(name = "proveedor_dia_entrega",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_proveedor_dia", columnNames = {"id_proveedor", "dia_semana"})
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "proveedor")
public class ProveedorDiaEntrega {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_dia_entrega")
    private Integer idDiaEntrega;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_proveedor", nullable = false)
    private Proveedor proveedor;

    @Enumerated(EnumType.STRING)
    @Column(name = "dia_semana", nullable = false, columnDefinition = "dia_semana_type")
    private DiaSemana diaSemana;

    @Column(name = "hora_inicio_entrega")
    private LocalTime horaInicioEntrega;

    @Column(name = "hora_fin_entrega")
    private LocalTime horaFinEntrega;
}
