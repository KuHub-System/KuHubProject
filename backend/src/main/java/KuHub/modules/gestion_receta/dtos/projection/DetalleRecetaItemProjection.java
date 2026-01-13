package KuHub.modules.gestion_receta.dtos.projection;

public interface DetalleRecetaItemProjection {
    Integer getIdProducto();
    String getNombreProducto();
    Double getCantProducto();
    String getUnidadMedida();
    Boolean getActivo();
}
