package KuHub.modules.gestion_academica.assemblers;

import KuHub.modules.gestion_academica.controller.AsignaturaControllerV2;
import KuHub.modules.gestion_academica.dtos.dtomodel.CourserAnswerDTGOD;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.RepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@Component
public class AsignaturaModelAssembler implements RepresentationModelAssembler<CourserAnswerDTGOD, EntityModel<CourserAnswerDTGOD>> {

    @Override
    public EntityModel<CourserAnswerDTGOD> toModel(CourserAnswerDTGOD entity) {
        return EntityModel.of(
                entity,
                linkTo(methodOn(AsignaturaControllerV2.class).findById(entity.getIdAsignatura())).withSelfRel(),
                linkTo(methodOn(AsignaturaControllerV2.class).findAll()).withRel("asignaturas"),
                linkTo(methodOn(AsignaturaControllerV2.class).findAllCoursesActiveTrue()).withRel("asignaturas-activas")
        );
    }
}