package KuHub.modules.gestion_academica.assemblers;

import KuHub.modules.gestion_academica.controller.SeccionControllerV2;
import KuHub.modules.gestion_academica.dtos.dtoentity.SeccionEntityResponseDTO;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.RepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@Component
public class SeccionModelAssembler implements RepresentationModelAssembler<SeccionEntityResponseDTO, EntityModel<SeccionEntityResponseDTO>> {

    @Override
    public EntityModel<SeccionEntityResponseDTO> toModel(SeccionEntityResponseDTO entity) {
        return EntityModel.of(
                entity,
                linkTo(methodOn(SeccionControllerV2.class).findById(entity.getIdSeccion())).withSelfRel(),
                linkTo(methodOn(SeccionControllerV2.class).findAll()).withRel("secciones"),
                linkTo(methodOn(SeccionControllerV2.class).findAllByActivoTrue()).withRel("secciones-activas"),
                linkTo(methodOn(SeccionControllerV2.class).findByIdAndSeccionActiveIsTrue(entity.getIdSeccion())).withRel("seccion-activa")
        );
    }
}