package KuHub.modules.gestion_academica.assemblers;

import KuHub.modules.gestion_academica.controller.ReservaSalaControllerV2;
import KuHub.modules.gestion_academica.dtos.dtoentity.ReservaSalaEntityResponseDTO;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.RepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@Component
public class ReservaSalaModelAssembler implements RepresentationModelAssembler<ReservaSalaEntityResponseDTO, EntityModel<ReservaSalaEntityResponseDTO>> {

    @Override
    public EntityModel<ReservaSalaEntityResponseDTO> toModel(ReservaSalaEntityResponseDTO entity) {
        return EntityModel.of(
                entity,
                linkTo(methodOn(ReservaSalaControllerV2.class).findById(entity.getIdReservaSala())).withSelfRel(),
                linkTo(methodOn(ReservaSalaControllerV2.class).findAll()).withRel("reservas")
        );
    }
}