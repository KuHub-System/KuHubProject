package KuHub.modules.inventario.assemblers;

import KuHub.modules.inventario.controller.InventarioControllerV2;
import KuHub.modules.inventario.entity.Inventario;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.RepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@Component
public class InventarioModelAssembler implements RepresentationModelAssembler<Inventario, EntityModel<Inventario>> {

    @Override
    public EntityModel<Inventario> toModel(Inventario entity) {
        return EntityModel.of(
                entity,
                linkTo(methodOn(InventarioControllerV2.class).findById(entity.getIdInventario())).withSelfRel(),
                linkTo(methodOn(InventarioControllerV2.class).findAll()).withRel("inventarios"),
                linkTo(methodOn(InventarioControllerV2.class).findInventoriesWithProductsActive(true)).withRel("inventarios-activos")
        );
    }
}