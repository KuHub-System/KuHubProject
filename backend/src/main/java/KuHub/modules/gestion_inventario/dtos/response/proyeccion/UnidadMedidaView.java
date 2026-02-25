package KuHub.modules.gestion_inventario.dtos.response.proyeccion;

public interface UnidadMedidaView {
    Short getIdUnidad();
    String getNombreUnidad();
    String getAbreviatura();
    Boolean getActivo();
    Long getAsociados();
}
