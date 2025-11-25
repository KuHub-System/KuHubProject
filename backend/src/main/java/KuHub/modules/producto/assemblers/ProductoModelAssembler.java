package KuHub.modules.producto.assemblers;

import KuHub.modules.producto.controller.ProductoControllerV2;
import KuHub.modules.producto.entity.Producto;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.RepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@Component
public class ProductoModelAssembler implements RepresentationModelAssembler<Producto, EntityModel<Producto>> {

    @Override
    public EntityModel<Producto> toModel(Producto entity) {
        return EntityModel.of(
                entity,
                linkTo(methodOn(ProductoControllerV2.class).findProductById(entity.getIdProducto())).withSelfRel(),
                linkTo(methodOn(ProductoControllerV2.class).findAllProducts()).withRel("productos"),
                linkTo(methodOn(ProductoControllerV2.class).findByActive(entity.getActivo())).withRel("productos-por-estado")
        );
    }
}