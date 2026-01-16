package KuHub.modules.gestion_academica.dtos.projection;

import org.springframework.beans.factory.annotation.Value;

public interface CourseSolicitationSelectView {
    @Value("#{target.id_asignatura}")
    Integer getIdAsignatura();

    @Value("#{target.nombre_asignatura}")
    String getNombreAsignatura();
}
