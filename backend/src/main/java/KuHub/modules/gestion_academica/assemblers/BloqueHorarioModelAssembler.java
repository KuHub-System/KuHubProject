package KuHub.modules.gestion_academica.assemblers;

import KuHub.modules.gestion_academica.controller.BloqueHorarioControllerV2;
import KuHub.modules.gestion_academica.entity.BloqueHorario;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.RepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@Component
public class BloqueHorarioModelAssembler implements RepresentationModelAssembler<BloqueHorario, EntityModel<BloqueHorario>> {

    @Override
    public EntityModel<BloqueHorario> toModel(BloqueHorario entity) {
        return EntityModel.of(
                entity,
                linkTo(methodOn(BloqueHorarioControllerV2.class).findById(entity.getIdBloque())).withSelfRel(),
                linkTo(methodOn(BloqueHorarioControllerV2.class).findAll()).withRel("bloques-horarios")
        );
    }
}