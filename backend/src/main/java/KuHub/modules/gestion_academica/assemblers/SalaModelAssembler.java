package KuHub.modules.gestion_academica.assemblers;

import KuHub.modules.gestion_academica.controller.SalaControllerV2;
import KuHub.modules.gestion_academica.entity.Sala;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.RepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@Component
public class SalaModelAssembler implements RepresentationModelAssembler<Sala, EntityModel<Sala>> {

    @Override
    public EntityModel<Sala> toModel(Sala entity) {
        return EntityModel.of(
                entity,
                linkTo(methodOn(SalaControllerV2.class).findById(entity.getIdSala())).withSelfRel(),
                linkTo(methodOn(SalaControllerV2.class).findAll()).withRel("salas"),
                linkTo(methodOn(SalaControllerV2.class).findAllActiveRoomsTrue()).withRel("salas-activas")
        );
    }
}