package KuHub.modules.gestion_proveedor.entity;

import KuHub.modules.gestion_proveedor.enums.DiaSemana;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

/**
 * Mapea tabla proveedor_dia_entrega.
 * Vincula un proveedor con los días y horarios en que realiza entregas.
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
