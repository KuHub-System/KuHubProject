package KuHub.modules.gestionusuario.assemblers;

import KuHub.modules.gestionusuario.controller.UsuarioControllerV2;
import KuHub.modules.gestionusuario.dtos.UsuarioResponseDTO;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.RepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@Component
public class UsuarioModelAssembler implements RepresentationModelAssembler<UsuarioResponseDTO, EntityModel<UsuarioResponseDTO>> {

    @Override
    public EntityModel<UsuarioResponseDTO> toModel(UsuarioResponseDTO entity) {
        return EntityModel.of(
                entity,
                linkTo(methodOn(UsuarioControllerV2.class).obtenerPorId(entity.getIdUsuario())).withSelfRel(),
                linkTo(methodOn(UsuarioControllerV2.class).obtenerTodos()).withRel("usuarios"),
                linkTo(methodOn(UsuarioControllerV2.class).obtenerActivos()).withRel("usuarios-activos"),
                linkTo(methodOn(UsuarioControllerV2.class).obtenerPorRol(entity.getIdRol())).withRel("usuarios-mismo-rol")
        );
    }
}