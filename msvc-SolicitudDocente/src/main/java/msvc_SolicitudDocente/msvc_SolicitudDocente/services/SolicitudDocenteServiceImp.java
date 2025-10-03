package msvc_SolicitudDocente.msvc_SolicitudDocente.services;

import msvc_SolicitudDocente.msvc_SolicitudDocente.clients.DetalleProductoSolicitudClientRest;
import msvc_SolicitudDocente.msvc_SolicitudDocente.clients.ProductoClientRest;
import msvc_SolicitudDocente.msvc_SolicitudDocente.dtos.DetalleProductoSolicitudResponseDTO;
import msvc_SolicitudDocente.msvc_SolicitudDocente.dtos.SolicitudDocenteResponseDTO;
import msvc_SolicitudDocente.msvc_SolicitudDocente.exceptions.SolicitudDocenteException;
import msvc_SolicitudDocente.msvc_SolicitudDocente.models.DetalleProductoSolicitud;
import msvc_SolicitudDocente.msvc_SolicitudDocente.models.Producto;
import msvc_SolicitudDocente.msvc_SolicitudDocente.models.entity.SolicitudDocente;
import msvc_SolicitudDocente.msvc_SolicitudDocente.repositories.SolicitudDocenteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SolicitudDocenteServiceImp implements SolicitudDocenteService{

    @Autowired
    private SolicitudDocenteRepository solicitudDocenteRepository;

    @Autowired
    private DetalleProductoSolicitudClientRest detalleProductoSolicitudClientRest;

    @Autowired
    private ProductoClientRest productoClientRest;

    @Transactional
    @Override
    public SolicitudDocente findByIdSolicitudDocente(Long id) {
        return solicitudDocenteRepository.findById(id).orElseThrow(
                ()-> new SolicitudDocenteException("Solicitud de docente con el id "+id+" no encontrado")
        );
    }

    @Transactional
    @Override
    public List<SolicitudDocente> findAll() {
        return solicitudDocenteRepository.findAll();
    }

    @Transactional
    @Override
    public List<SolicitudDocenteResponseDTO> findAllSolicitudDocentesConDetalles(){
        if (solicitudDocenteRepository.findAll().isEmpty()) {
            throw new SolicitudDocenteException("No hay solicitudes de docentes registradas");
        }
        //Obtener Lista de detalles de producto solicitado
        List<DetalleProductoSolicitud> DPS = detalleProductoSolicitudClientRest.findAllDetalleProductoSolicitud();

        // Agrupar detalles por idSolicitudDocente
        Map<Long, List<DetalleProductoSolicitud>> detallesPorSolicitud = DPS.stream()
                .collect(Collectors.groupingBy(DetalleProductoSolicitud::getIdSolicitudDocente));

        // Obtener todas las solicitudes
        List<SolicitudDocente>TodasSolicitudes = solicitudDocenteRepository.findAll();
        //lista vacia donde se agregaran las solicitudes con detalles
        List<SolicitudDocenteResponseDTO> SolicitudesConDetalles = new ArrayList<>();

        Map<Long, Producto> cacheProductos = new HashMap<>();
        for (SolicitudDocente S : TodasSolicitudes) {
            List<DetalleProductoSolicitud> detalles = detallesPorSolicitud.getOrDefault(S.getIdSolicitudDocente(), new ArrayList<>());
            //Lista vacia de Detalles producto solicitado DTO
            List<DetalleProductoSolicitudResponseDTO> detallesProductoSolicitud = new ArrayList<>();


            for (DetalleProductoSolicitud D : detalles) {
                Long idProducto = D.getIdProducto();
                Producto P = cacheProductos.computeIfAbsent(idProducto, id ->
                        productoClientRest.findProductoById(id)
                );//esto sirve para guardar en cache los productos, para diminuir costo en llamadas clients repetitivas

                DetalleProductoSolicitudResponseDTO dto = new DetalleProductoSolicitudResponseDTO(
                    D.getIdDetalleProductoSolicitud(),
                    D.getIdSolicitudDocente(),
                    D.getIdProducto(),
                    P.getNombreProducto(),
                    P.getUnidadMedida(),
                    D.getCantidadDetalleSolicitud()
                    );
                detallesProductoSolicitud.add(dto);
            }

            SolicitudDocenteResponseDTO dto = new SolicitudDocenteResponseDTO(
                S.getIdSolicitudDocente(),
                    S.getNumeroSemana(),
                    S.getNumeroTaller(),
                    S.getCantidadPersonas(),
                    S.getDescripcionSemana(),
                    S.getSeccion(),
                    S.getNombreAsignatura(),
                    S.getFechaProgramada(),
                    detallesProductoSolicitud );

            SolicitudesConDetalles.add(dto);
        }

        return SolicitudesConDetalles;
    }


    @Transactional
    @Override
    public SolicitudDocente saveSolicitudDocente(SolicitudDocente solicitudDocente){

        //validar numero semana, taller, cantidad personas
        if (solicitudDocente.getNumeroSemana() <= 0) {
            throw new SolicitudDocenteException("El numero de semana no puede ser menor a cero");
        }

        if (solicitudDocente.getNumeroTaller() < 0) {
            throw new SolicitudDocenteException("El numero de taller tiene que ser mayor a cero");
        }

        if (solicitudDocente.getCantidadPersonas() < 0) {
            throw new SolicitudDocenteException("La cantidad de personas tiene que ser mayor a cero");
        }

        //temporariamente tomar hora sysdate

        Date fecha = Date.from(LocalDateTime.now().atZone(ZoneId.systemDefault()).toInstant());
        solicitudDocente.setFechaProgramada(fecha);

        //guardar en base de datos

        return solicitudDocenteRepository.save(solicitudDocente);
    }


}
