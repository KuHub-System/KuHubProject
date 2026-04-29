package KuHub.modules.pedido_semana_a_bodega.dtos.projection;

public interface CountRecipesAndStatusView {
    Long getTotalPedidos();
    Long getTotal_activos();
    Long getTotal_inactivos();
}
