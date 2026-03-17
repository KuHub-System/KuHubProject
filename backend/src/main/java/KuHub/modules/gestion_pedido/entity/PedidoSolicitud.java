package KuHub.modules.gestion_pedido.entity;

import KuHub.modules.gestion_solicitud.entity.Solicitud;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pedido_solicitud")
@Data
@NoArgsConstructor
public class PedidoSolicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pedido_solicitud")
    private Integer idPedidoSolicitud;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_pedido", nullable = false)
    private Pedido pedido;

    // Mapeo de la FK compuesta hacia Solicitud
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "id_solicitud", referencedColumnName = "id_solicitud"),
            @JoinColumn(name = "fecha_solicitada", referencedColumnName = "fecha_solicitada")
    })
    private Solicitud solicitud;

    @Column(name = "fecha_union_registro", insertable = false, updatable = false)
    private LocalDateTime fechaUnionRegistro;

    // ----------- Métodos Helper para asignación por ID -----------

    public void setIdPedido(Integer id) {
        if (id != null) {
            this.pedido = new Pedido();
            this.pedido.setIdPedido(id);
        }
    }

    /**
     * Asigna la solicitud mediante su ID y Fecha (necesario por la PK compuesta)
     */
    public void setIdSolicitudCompuesta(Integer idSolicitud, LocalDate fecha) {
        if (idSolicitud != null && fecha != null) {
            this.solicitud = new Solicitud();
            // Asumo que Solicitud tiene un objeto Id o campos directos para su PK
            this.solicitud.setIdSolicitud(idSolicitud);
            this.solicitud.setFechaSolicitada(fecha);
        }
    }
}
