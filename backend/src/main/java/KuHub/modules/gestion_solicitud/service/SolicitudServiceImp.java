package KuHub.modules.gestion_solicitud.service;

import KuHub.modules.gestion_academica.dtos.projection.CourseSolicitationSelectView;
import KuHub.modules.gestion_academica.repository.AsignaturaRepository;
import KuHub.modules.gestion_receta.entity.DetalleReceta;
import KuHub.modules.gestion_receta.services.DetalleRecetaService;
import KuHub.modules.gestion_solicitud.dtos.*;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.ProductoUnidadView;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.SeccionInscritosView;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.SectionAvailabilityView;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.WeekIdDescripcionView;
import KuHub.modules.gestion_solicitud.entity.DetalleSolicitud;
import KuHub.modules.gestion_solicitud.entity.Solicitud;
import KuHub.modules.gestion_solicitud.repository.SolicitudRepository;
import KuHub.modules.gestion_usuario.dtos.UserIdAndCompleteNameDTO;
import KuHub.modules.gestion_usuario.dtos.record.UserIdNameDTO;
import KuHub.modules.gestion_usuario.service.UsuarioService;
import KuHub.modules.semanas.repository.SemanaRepository;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SolicitudServiceImp implements SolicitudService{

    @Autowired
    private SolicitudRepository solicitudRepository;
    @Autowired
    private DetalleRecetaService detalleRecetaService;
    @Autowired
    private UsuarioService usuarioService;
    @Autowired
    private SemanaRepository semanaRepository;
    @Autowired
    private AsignaturaRepository asignaturaRepository;

    @Transactional(readOnly = true)
    @Override
    public ManagementSolicitationSelectorsDTO getSelectorsForManagement() {
        // 1. Obtener Semanas (Usando la proyección nativa que arreglamos antes)
        List<WeekIdDescripcionView> semanas = semanaRepository.findAllForSelector();

        // 2. Obtener Asignaturas (Asegúrate de tener este método o uno similar en tu repo)
        // Podría ser findAllProjectedBy() o algo similar que devuelva CourseSolicitationSelectView
        List<CourseSolicitationSelectView> asignaturas = asignaturaRepository.findAllActiveForSelector();

        // 3. Obtener Docentes (Usuarios con rol docente)
        // Asegúrate de tener un método que devuelva UserIdAndCompleteNameDTO
        List<UserIdAndCompleteNameDTO> docentes = usuarioService.obtenerDocentesYProfesoresActivos();

        // 4. Construir y retornar el DTO
        ManagementSolicitationSelectorsDTO response = new ManagementSolicitationSelectorsDTO();
        response.setSemanas(semanas);
        response.setAsignaturas(asignaturas);
        response.setDocentes(docentes);

        return response;
    }

    @Transactional(readOnly = true)
    @Override
    public List<SectionAvailabilityView> checkSectionAvailability (CheckSectionAvailabilityRequestDTO r){
        return solicitudRepository.checkSectionAvailability(r.getIdSemana(),r.getIdsSecciones());
    }

    @Transactional
    @Override
    public void saveSolicitation(SolicitationCreateRequestDTO request){

        // Llamamos al método que creamos antes. Esto valida el token y trae el ID real.
        UserIdNameDTO usuarioLogueado = usuarioService.getUsuarioConectado();

        // Guardamos el ID en una variable para usarla más abajo en el bucle
        Integer idUsuarioAutenticado = usuarioLogueado.id();

        // ========================================================================================
        // 1. PREPARACIÓN DE DATOS (FUERA DEL BUCLE)
        // ========================================================================================

        // 1.1. MAPEO DE ADICIONALES (CANTIDADES FRONT)
        Map<Integer, Double> mapCantidadesFront = new HashMap<>();
        if (request.getItemsAdicionales() != null && !request.getItemsAdicionales().isEmpty()) {
            mapCantidadesFront = request.getItemsAdicionales().stream()
                    .collect(Collectors.toMap(
                            AdditionalItemCreateRequestDTO::getIdProducto,
                            AdditionalItemCreateRequestDTO::getCantidadAdicional,
                            Double::sum
                    ));
        }

        // 1.2. CONTEXTO DE PRODUCTOS ADICIONALES (FUSIÓN FRONT + BBDD)
        Map<Integer, ContextoProductoUnidad> mapaContextoAdicionales = new HashMap<>();

        if (!mapCantidadesFront.isEmpty()) {
            // Obtenemos IDs
            List<Integer> idsProductos = new ArrayList<>(mapCantidadesFront.keySet());

            // Consultamos UNIDADES a la BD (Una sola vez)
            List<ProductoUnidadView> unidadesView = solicitudRepository.FindUnidadesByIds(idsProductos);

            // FUSIÓN: BD (Unidad) + FRONT (Cantidad)
            for (ProductoUnidadView view : unidadesView) {
                Integer id = view.getIdProducto();
                Double cantidadTotalDelFront = mapCantidadesFront.get(id);

                mapaContextoAdicionales.put(id, new ContextoProductoUnidad(
                        id,
                        view.getUnidadMedida(), // Dato de BBDD
                        cantidadTotalDelFront   // Dato del Front
                ));
            }
        }

        // 1.3. PREPARAR RECETA (FILTRADO)
        List<DetalleReceta> listaRecetaFiltrada = new ArrayList<>();
        if (request.getIdReceta() != null) {
            List<DetalleReceta> listaCompleta = detalleRecetaService.findAllByIdReceta(request.getIdReceta());
            List<Integer> idsEliminados = request.getDetalleRecetaIdsEliminados();

            if (idsEliminados != null && !idsEliminados.isEmpty()) {
                listaRecetaFiltrada = listaCompleta.stream()
                        .filter(d -> !idsEliminados.contains(d.getIdDetalleReceta()))
                        .collect(Collectors.toList());
            } else {
                listaRecetaFiltrada = listaCompleta;
            }
        }

        // 1.4. CONTEXTO DE SECCIONES (FUSIÓN FRONT + BBDD)
        List<Integer> idsSecciones = request.getSecciones().stream()
                .map(SectionsForSolicitationRequestDTO::getIdSeccion)
                .collect(Collectors.toList());

        List<SeccionInscritosView> inscritosView = solicitudRepository.findInscritosByIds(idsSecciones);

        Map<Integer, Integer> mapaInscritosBD = inscritosView.stream()
                .collect(Collectors.toMap(SeccionInscritosView::getIdSeccion, SeccionInscritosView::getNumInscritos));

        List<ContextoSeccion> listaContextoSecciones = new ArrayList<>();
        for (SectionsForSolicitationRequestDTO ss : request.getSecciones()) {
            Integer inscritos = mapaInscritosBD.getOrDefault(ss.getIdSeccion(), 0);
            listaContextoSecciones.add(new ContextoSeccion(
                    ss.getIdSeccion(),
                    ss.getFechaCalculadaSolicitud(),
                    inscritos
            ));
        }

        // ========================================================================================
        // 2. PROCESAMIENTO
        // ========================================================================================
        List<Solicitud> listaParaGuardar = new ArrayList<>();

        for (ContextoSeccion ctx : listaContextoSecciones) {

            Solicitud solicitud = new Solicitud();
            solicitud.setIdUsuarioGestorSolicitud(idUsuarioAutenticado);
            solicitud.setIdSeccion(ctx.getIdSeccion());
            solicitud.setFechaSolicitada(ctx.getFechaSolicitada());
            solicitud.setObservaciones(request.getObservaciones());
            solicitud.setEstadoSolicitud(Solicitud.EstadoSolicitud.PENDIENTE);

            Set<Integer> idsAdicionalesProcesados = new HashSet<>();

            // A. PROCESAR PRODUCTOS DE LA RECETA
            for (DetalleReceta dr : listaRecetaFiltrada) {
                DetalleSolicitud detalle = new DetalleSolicitud();
                Integer idProducto = dr.getProducto().getIdProducto();

                Double cantidadBase = dr.getCantProducto();
                String observacionFinal = null;

                // Fusión usando el Mapa Contexto (Ya tiene la info necesaria)
                if (mapaContextoAdicionales.containsKey(idProducto)) {
                    ContextoProductoUnidad ctxProd = mapaContextoAdicionales.get(idProducto);

                    Double cantAdicional = ctxProd.getCantidadAdicional();
                    cantidadBase += cantAdicional;

                    observacionFinal = String.format("Se adicionaron %.2f unidades (base) al producto", cantAdicional);
                    idsAdicionalesProcesados.add(idProducto);
                }

                // Cálculo y Redondeo
                Double cantidadEscalada = (cantidadBase / 20.0) * ctx.getNumInscritos();

                if ("UNIDAD".equalsIgnoreCase(dr.getProducto().getUnidadMedida())) {
                    cantidadEscalada = Math.ceil(cantidadEscalada);
                } else {
                    // CAMBIO: Usamos 3 decimales en lugar de 2
                    // Esto permite guardar cantidades como 0.125 Kg (125 gramos) sin perder precisión
                    cantidadEscalada = BigDecimal.valueOf(cantidadEscalada)
                            .setScale(3, RoundingMode.HALF_UP)
                            .doubleValue();
                }

                detalle.setIdProducto(idProducto);
                detalle.setCantProductoSolicitud(cantidadEscalada);
                detalle.setObservacion(observacionFinal);

                solicitud.addDetalle(detalle);
            }

            // B. PROCESAR ADICIONALES PUROS (OPTIMIZADO - SIN CONSULTA INTERNA)
            for (ContextoProductoUnidad ctxProd : mapaContextoAdicionales.values()) {

                if (!idsAdicionalesProcesados.contains(ctxProd.getIdProducto())) {
                    DetalleSolicitud detalleExtra = new DetalleSolicitud();

                    // 1. Asignamos producto SOLO con la referencia (FK)
                    // Como el ID existe (porque lo buscamos en el paso 1.2), esto es seguro.
                    detalleExtra.setIdProducto(ctxProd.getIdProducto());

                    // 2. Calculamos usando los datos del CONTEXTO (Ram)
                    Double cantidadBase = ctxProd.getCantidadAdicional();
                    Double cantidadEscalada = (cantidadBase / 20.0) * ctx.getNumInscritos();

                    // 3. Redondeo usando la unidad del CONTEXTO (Ram)
                    if ("UNIDAD".equalsIgnoreCase(ctxProd.getUnidadaMedida())) {
                        cantidadEscalada = Math.ceil(cantidadEscalada);
                    } else {
                        // CAMBIO: Usamos 3 decimales en lugar de 2
                        // Esto permite guardar cantidades como 0.125 Kg (125 gramos) sin perder precisión
                        cantidadEscalada = BigDecimal.valueOf(cantidadEscalada)
                                .setScale(3, RoundingMode.HALF_UP)
                                .doubleValue();
                    }

                    detalleExtra.setCantProductoSolicitud(cantidadEscalada);
                    detalleExtra.setObservacion("Adicional");

                    solicitud.addDetalle(detalleExtra);
                }
            }

            listaParaGuardar.add(solicitud);
        }

        // ========================================================================================
        // 3. GUARDADO
        // ========================================================================================
        System.out.println("Lista para guardar: " + listaParaGuardar.size());
        solicitudRepository.saveAll(listaParaGuardar);
        System.out.println("¡Guardado completado!");
    }

    @Getter
    @AllArgsConstructor
    private static class ContextoSeccion {
        private Integer idSeccion;
        private LocalDate fechaSolicitada;
        private Integer numInscritos;
    }

    @Getter
    @AllArgsConstructor
    private static class ContextoProductoUnidad {
        private Integer idProducto;
        private String unidadaMedida;
        private Double cantidadAdicional;
    }

}
