package KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonPropertyOrder({"idAsignatura", "nombreAsignatura", "codAsignatura"})
public interface AsignaturaActivaView {
    Integer getIdAsignatura();
    String getNombreAsignatura();
    String getCodAsignatura();
}
