package KuHub.modules.gestion_sistema.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "gestion_sistema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class GestionSistema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @Column(name = "solicitudes_en_pedido", nullable = false)
    private Boolean solicitudesEnPedido = false;

    @Column(name = "descripcion", length = 255)
    private String descripcion;
}
