package msvc_DetalleProductoSolicitud.DetalleProducto.services;

import feign.FeignException;
import msvc_DetalleProductoSolicitud.DetalleProducto.clients.ProductoClientRest;
import msvc_DetalleProductoSolicitud.DetalleProducto.clients.SolicitudDocenteClientRest;
import msvc_DetalleProductoSolicitud.DetalleProducto.dtos.DetalleProductoSolicitudUpdateQuantityRequestDTO;
import msvc_DetalleProductoSolicitud.DetalleProducto.exceptions.DetalleProductoSolicitudException;
import msvc_DetalleProductoSolicitud.DetalleProducto.models.Producto;
import msvc_DetalleProductoSolicitud.DetalleProducto.models.entity.DetalleProductoSolicitud;
import msvc_DetalleProductoSolicitud.DetalleProducto.models.SolicitudDocente;
import msvc_DetalleProductoSolicitud.DetalleProducto.repositories.DetalleProductoSolicitudRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DetalleProductoSolicitudServiceImpl implements DetalleProductoSolicitudService {

    @Autowired
    private DetalleProductoSolicitudRepository detalleProductoSolicitudRepository;

    @Autowired
    private ProductoClientRest productoClientRest;

    @Autowired
    private SolicitudDocenteClientRest solicitudDocenteClientRest;

    @Transactional
    @Override
    public DetalleProductoSolicitud findById(Long id) {
        return detalleProductoSolicitudRepository.findById(id).orElseThrow(
                ()-> new DetalleProductoSolicitudException("Detalle de producto solicitud con el id "+id+" no encontrado")
        );
    }

    @Transactional
    @Override
    public List<DetalleProductoSolicitud> findAll() {
        return detalleProductoSolicitudRepository.findAll();
    }

    @Transactional
    @Override
    public DetalleProductoSolicitud saveDetalleProductoSolicitud(DetalleProductoSolicitud detalleProductoSolicitud) {

        //validar que existe producto y solicitud por client, si no existe lanzar excepcion.
        try {
            Producto producto = productoClientRest.findProductoById(detalleProductoSolicitud.getIdProducto());
        } catch (FeignException.NotFound ex) {
            throw new DetalleProductoSolicitudException("No existe producto con el id: " + detalleProductoSolicitud.getIdProducto());
        }

        //validar que cantidad sea mayor que cero
        if (detalleProductoSolicitud.getCantidadDetalleSolicitud() <= 0) {
            throw new DetalleProductoSolicitudException("La cantidad debe ser mayor que cero");
        }

        return detalleProductoSolicitudRepository.save(detalleProductoSolicitud);
    }

    @Transactional
    @Override
    public DetalleProductoSolicitud detalleProductoSolicitudUpdateQuantity
            (Long id, DetalleProductoSolicitudUpdateQuantityRequestDTO quantityRequest) {
        DetalleProductoSolicitud detalleProductoSolicitud = detalleProductoSolicitudRepository.findById(id).orElseThrow(
                () -> new DetalleProductoSolicitudException("Detalle de producto solicitud con el id " + id + " no encontrado")
        );

        if (quantityRequest.getCantidadDetalleSolicitud() == null || quantityRequest.getCantidadDetalleSolicitud() < 0) {
            throw new DetalleProductoSolicitudException("La cantidad debe ser un número positivo");
        }

        detalleProductoSolicitud.setCantidadDetalleSolicitud(quantityRequest.getCantidadDetalleSolicitud());
        return detalleProductoSolicitudRepository.save(detalleProductoSolicitud);
    }

    @Transactional
    @Override
    public void deleteByIdDetalleP(Long id) {
        if (!detalleProductoSolicitudRepository.existsById(id)) {
            throw new DetalleProductoSolicitudException("Detalle de producto solicitud con el id " + id + " no encontrado");
        }
        detalleProductoSolicitudRepository.deleteById(id);
    }

    @Transactional
    @Override
    public void deleteAllDetalleProductoSolicitud(Long idSolicitudDocente) {
        try {
            SolicitudDocente solicitud = solicitudDocenteClientRest
                    .findByIdSolicitudDocente(idSolicitudDocente)
                    .getBody();

            if (solicitud != null) {
                // Eliminar detalles de producto solicitud
                detalleProductoSolicitudRepository.existsByIdProducto(idSolicitudDocente);
            } else {
                throw new RuntimeException("SolicitudDocente no encontrada con ID: " + idSolicitudDocente);
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al eliminar detalles de la solicitud", e);
        }
    }


    //Metodo accedido por Client para verificar si existe producto vinculado al detalle
    @Transactional(readOnly = true)
    @Override
    public boolean existeProductoEnDetalle(String nombreProducto) {
        ResponseEntity<Producto> response = productoClientRest.findProductoByName(nombreProducto);

        if (response == null || !response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            return false; // No se encontró el producto o hubo error
        }

        Producto producto = response.getBody();
        return detalleProductoSolicitudRepository.existsByIdProducto(producto.getIdProducto());
    }
    @Transactional(readOnly = true)
    @Override
    public boolean existeProductoIdEnDetalle(Long idProducto) {
        return detalleProductoSolicitudRepository.existsByIdProducto(idProducto);
    }

}
