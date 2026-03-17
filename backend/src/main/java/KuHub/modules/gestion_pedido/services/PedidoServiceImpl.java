package KuHub.modules.gestion_pedido.services;

import KuHub.modules.gestion_pedido.entity.DetallePedido;
import KuHub.modules.gestion_pedido.entity.Pedido;
import KuHub.modules.gestion_pedido.entity.PedidoSolicitud;
import KuHub.modules.gestion_pedido.record.CreateOrder;
import KuHub.modules.gestion_pedido.repository.DetallePedidoRepository;
import KuHub.modules.gestion_pedido.repository.PedidoRepository;
import KuHub.modules.gestion_pedido.repository.PedidoSolicitudRepository;
import KuHub.modules.gestion_solicitud.repository.SolicitudRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PedidoServiceImpl implements PedidoService{

    @Autowired
    private PedidoRepository pedidoRepository;
    @Autowired
    private DetallePedidoRepository detallePedidoRepository;
    @Autowired
    private PedidoSolicitudRepository pedidoSolicitudRepository;
    @Autowired
    private SolicitudRepository solicitudRepository;


    @Override
    @Transactional
    public boolean consolidateOrder(CreateOrder request){
        try {
            // 1. Extraer IDs de solicitudes para la actualización masiva posterior
            List<Integer> idsSolicitudes = request.solicitudes().stream()
                    .map(CreateOrder.SolicitudItemRequest::idSolicitud)
                    .toList();

            // 2. Crear y setear el objeto Pedido (Cabecera)
            Pedido pedido = new Pedido();
            pedido.setFechaInicioPedido(request.fechaInicio());
            pedido.setFechaFinPedido(request.fechaFin());
            pedido.setEstadoPedido(Pedido.EstadoPedidoType.PENDIENTE); // Default

            // Guardar cabecera
            Pedido savedPedido = pedidoRepository.save(pedido);

            // 3. Preparar lista de Detalles (detalle_pedido)
            List<DetallePedido> detallesParaGuardar = new ArrayList<>();
            for (CreateOrder.DetalleItemRequest item : request.detalles()) {
                DetallePedido detalle = new DetallePedido();
                detalle.setIdPedido(savedPedido.getIdPedido()); // Helper ID
                detalle.setIdProducto(item.idProducto());       // Helper ID
                detalle.setCantProductoPedido(item.cantidadTotal());
                detallesParaGuardar.add(detalle);
            }
            detallePedidoRepository.saveAll(detallesParaGuardar);

            // 4. Preparar lista de Vínculos (pedido_solicitud)
            List<PedidoSolicitud> vinculacionesParaGuardar = new ArrayList<>();
            for (CreateOrder.SolicitudItemRequest solItem : request.solicitudes()) {
                PedidoSolicitud ps = new PedidoSolicitud();
                ps.setIdPedido(savedPedido.getIdPedido()); // Helper ID
                // Usando tu helper para la FK compuesta (ID + Fecha)
                ps.setIdSolicitudCompuesta(solItem.idSolicitud(), solItem.fechaSolicitada());
                vinculacionesParaGuardar.add(ps);
            }
            pedidoSolicitudRepository.saveAll(vinculacionesParaGuardar);

            // 5. Actualizar el estado de las solicitudes originales a 'PROCESADA'
            // Usamos el query nativo que proporcionaste
            solicitudRepository.updateMassiveStateSolicitation(idsSolicitudes, "PROCESADO");

            return true;

        } catch (Exception e) {
            // Log del error (puedes usar un logger aquí)
            return false;
        }
    }

}
