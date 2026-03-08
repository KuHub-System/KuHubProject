package KuHub.modules.gestion_receta.dtos.projection;

public interface CountRecipesAndStatusView {
    Long getTotalReceta();
    Long getTotal_activos();
    Long getTotal_inactivos();
}
