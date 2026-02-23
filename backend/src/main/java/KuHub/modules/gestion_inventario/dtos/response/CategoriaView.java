package KuHub.modules.gestion_inventario.dtos.response;

public interface CategoriaView {
    Short getIdCategoria();

    String getNombreCategoria();

    Boolean getActivo();

    Long getAsociados();
}
