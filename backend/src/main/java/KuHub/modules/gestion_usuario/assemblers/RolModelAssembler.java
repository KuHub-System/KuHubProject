package KuHub.modules.gestion_usuario.assemblers;

import KuHub.modules.gestion_usuario.controller.RolControllerV2;
import KuHub.modules.gestion_usuario.dtos.RolResponseDTO;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.RepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@Component
public class RolModelAssembler implements RepresentationModelAssembler<RolResponseDTO, EntityModel<RolResponseDTO>> {

    @Override
    public EntityModel<RolResponseDTO> toModel(RolResponseDTO entity) {
        return EntityModel.of(
                entity,
                linkTo(methodOn(RolControllerV2.class).obtenerPorId(entity.getIdRol())).withSelfRel(),
                linkTo(methodOn(RolControllerV2.class).obtenerTodos()).withRel("roles"),
                linkTo(methodOn(RolControllerV2.class).obtenerActivos()).withRel("roles-activos"),
                linkTo(methodOn(RolControllerV2.class).obtenerPorNombre(entity.getNombreRol())).withRel("rol-por-nombre")
        );
    }
}