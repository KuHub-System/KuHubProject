package KuHub.modules.gestion_inventario.dtos.response.proyeccion;

public interface CategoriaView {
    Short getIdCategoria();

    String getNombreCategoria();

    Boolean getActivo();

    Long getAsociados();
}
