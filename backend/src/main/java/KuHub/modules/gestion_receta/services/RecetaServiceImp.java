package KuHub.modules.gestion_receta.services;

import KuHub.modules.gestion_receta.dtos.*;
import KuHub.modules.gestion_inventario.services.ProductoService;
import KuHub.modules.gestion_receta.dtos.respose.RecipeItemCreateDTO;
import KuHub.modules.gestion_receta.entity.DetalleReceta;
import KuHub.modules.gestion_receta.entity.Receta;
import KuHub.modules.gestion_receta.exceptions.GestionRecetaException;
import KuHub.modules.gestion_receta.repository.DetalleRecetaRepository;
import KuHub.modules.gestion_receta.repository.RecetaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import KuHub.utils.StringUtils;

import java.math.BigDecimal;
import java.util.*;

@Slf4j
@Service
public class RecetaServiceImp implements RecetaService{

    @Autowired
    private RecetaRepository recetaRepository;

    @Autowired
    private DetalleRecetaRepository detalleRecetaRepository;

    @Autowired
    private ProductoService productoService;

    @Autowired
    private ObjectMapper objectMapper;





    /**Metodo para crear la receta con los detalles de producto activo
     * implementado*/
    @Transactional
    @Override
    public boolean saveRecipeWithDetails(RecipeWithDetailsCreateDTO request) {
        String nombreReceta = StringUtils.capitalizarPalabras(request.getNombreReceta());

        if (recetaRepository.existsByNombreRecetaAndActivoRecetaTrue(nombreReceta)) {
            throw new GestionRecetaException("Ya existe una receta activa con el nombre: " + nombreReceta,
                    HttpStatus.CONFLICT);
        }

        Receta newReceta = new Receta();
        newReceta.setNombreReceta(nombreReceta);
        String key = StringUtils.normalizeToEnumKey(request.getEstadoReceta());
        Receta.EstadoRecetaType estadoEnum = Receta.EstadoRecetaType.valueOf(key);
        newReceta.setEstadoReceta(estadoEnum);

        newReceta.setDescripcionReceta((request.getDescripcionReceta() == null || request.getDescripcionReceta().isBlank())
                ? null : StringUtils.normalizeSpaces(request.getDescripcionReceta()));

        newReceta.setInstruccionesReceta((request.getInstrucciones() == null || request.getInstrucciones().isBlank())
                ? null : StringUtils.normalizeSpaces(request.getInstrucciones()));

        Receta recetaGuardada = recetaRepository.save(newReceta);

        Map<Integer, BigDecimal> itemsConsolidados = new HashMap<>();

        for (RecipeItemCreateDTO item : request.getListaItems()) {
            // merge: Si el ID no existe, lo pone. Si existe, aplica la suma (BigDecimal::add)
            itemsConsolidados.merge(
                    item.getIdProducto(),
                    item.getCantUnidadMedida(),
                    BigDecimal::add
            );
        }

        itemsConsolidados.forEach((idProducto, cantidadTotal) -> {
            DetalleReceta detalle = new DetalleReceta();

            // Asociamos usando el objeto guardado (para el ID)
            detalle.setReceta(recetaGuardada);

            // Usamos setProductoById para evitar un SELECT innecesario del objeto Producto
            detalle.setProductoById(idProducto);

            detalle.setCantProducto(cantidadTotal);

            detalleRecetaRepository.save(detalle);
        });
        return true;
    }

















    /**

    @Transactional(readOnly = true)
    @Override
    public List<Receta> findAll() {
        return recetaRepository.findAll();
    }

    @Transactional(readOnly = true)
    @Override
    public List<Receta>findAllByActivoRecetaTrue(){
        return recetaRepository.findAllByActivoRecetaTrue();
    }

    @Transactional(readOnly = true)
    @Override
    public Receta findById(Integer id) {
        return recetaRepository.findById(id).orElseThrow(
        ()-> new GestionRecetaException("No existe la receta con el id " + id));
    }

    @Transactional(readOnly = true)
    @Override
    public Receta findByIdRecetaAndActivoRecetaIsTrue(Integer id){
        Receta receta = findById(id);
        if (receta.getActivoReceta() == null || !receta.getActivoReceta()){
            throw new GestionRecetaException("No existe la receta con el id " + id + " o esta inactivo");
        }else{
            return receta;
        }
    }

    /**
    @Transactional(readOnly = true)
    @Override
    public RecipeWithDetailsAnswerDTO findRecipeWithDetailsActiveInTrue(Integer id) {
        log.info("🔍 Consultando receta ID: {} usando proyecciones", id);

        // 1. Buscamos la cabecera de la receta
        Receta receta = recetaRepository.findByIdRecetaAndActivoRecetaIsTrue(id)
                .orElseThow(() -> new RecetaException("Receta no encontrada o inactiva con ID: " + id));

        // 2. ⚡ AQUÍ ESTÁ EL CAMBIO: Llamamos directamente a tu consulta del Repo
        // Esto es mucho más eficiente porque la base de datos ya hace el JOIN
        List<DetalleRecetaItemProjection> itemsProyectados =
                detalleRecetaService.findItemsByRecetaId(receta.getIdReceta());

        // 3. Transformamos la Proyección al DTO de respuesta
        List<RecipeItemAnswerDTO> listaItems = itemsProyectados.stream()
                .map(p -> new RecipeItemAnswerDTO(
                        p.getIdProducto(),
                        p.getNombreProducto(),
                        p.getUnidadMedida(),
                        p.getCantProducto(),
                        p.getActivo()
                ))
                .collect(Collectors.toList());

        // 4. Retornamos el DTO final
        return new RecipeWithDetailsAnswerDTO(
                receta.getIdReceta(),
                receta.getNombreReceta(),
                receta.getDescripcionReceta(),
                listaItems, // La lista obtenida de la proyección
                receta.getInstruccionesReceta(), // Se mapea al campo 'instrucciones' del DTO
                receta.getEstadoReceta()
        );
    }

    @Transactional(readOnly = true)
    @Override
    public String findNombreById (Integer id){
        return findByIdRecetaAndActivoRecetaIsTrue(id).getNombreReceta();
    }


    @Transactional(readOnly = true)
    @Override
    public List<RecipeWithDetailsAnswerDTO> findAllRecipeWithDetailsActive() {

        /** Obtiene solo las recetas activas
        List<Receta> recetas = findAllByActivoRecetaTrue();

        /** Obtiene todos los detalles de receta desde la BD
        List<DetalleReceta> detalles = detalleRecetaService.findAll();

        /**
         * Agrupa los detalles por el ID de su receta para acceso rápido.
         * Esto reduce la complejidad a O(n + m).

        Map<Integer, List<DetalleReceta>> detallesPorReceta = detalles.stream()
                .collect(Collectors.groupingBy(d -> d.getReceta().getIdReceta()));

        /** Lista final que se devolverá al caller */
        //List<RecipeWithDetailsDTO> dtos = new ArrayList<>();

        /** Recorre todas las recetas
        for (Receta r : recetas) {

            /**
             * Obtiene solo los detalles que pertenecen a esta receta.
             * Si no tiene detalles, devuelve una lista vacía.

            List<RecipeItemAnswerDTO> items = detallesPorReceta
                    .getOrDefault(r.getIdReceta(), Collections.emptyList())
                    .stream()
                    .map(d -> new RecipeItemAnswerDTO(
                            d.getProducto().getIdProducto(),
                            d.getProducto().getNombreProducto(),
                            d.getProducto().getUnidadMedida().getNombreUnidad(),
                            d.getCantProducto(),
                            d.getProducto().getActivo()
                    ))
                    .collect(Collectors.toList());

            /** Construye el DTO final de receta con detalles
            dtos.add(new RecipeWithDetailsAnswerDTO(
                    r.getIdReceta(),
                    r.getNombreReceta(),
                    r.getDescripcionReceta(),
                    items,
                    r.getInstruccionesReceta(),
                    r.getEstadoReceta()
            ));
        }

        /** Log del total de recetas procesadas
        log.info("Se generaron {} recetas con detalles", dtos.size());

        return dtos;
    }

    @Transactional(readOnly = true)
    @Override
    public Boolean existsByNombreRecetaAndActivoRecetaTrue(String nombreReceta) {
        return recetaRepository.existsByNombreRecetaAndActivoRecetaTrue(nombreReceta);
    }

    @Transactional(readOnly = true)
    @Override
    public Boolean existsById(Integer id){
        return recetaRepository.existsById(id);
    }

    @Transactional
    @Override
    public Receta save (Receta receta){
        //Validar que el nombre de la receta no existe para seguir las validaciones
        String capNombreReceta = StringUtils.capitalize(receta.getNombreReceta());
        if (recetaRepository.existsByNombreRecetaAndActivoRecetaTrue(capNombreReceta)) {
            throw new GestionRecetaException("El nombre de la receta ya existe");
        }

        receta.setNombreReceta(capNombreReceta);
        receta.setActivoReceta(true);
        receta.setEstadoReceta(Receta.EstadoRecetaType.ACTIVO);
        return recetaRepository.save(receta);
    }



    @Transactional(noRollbackFor = ProductoNotFoundException.class)
    @Override
    public RecipeWithDetailsAnswerDTO updateRecipeWithDelta(RecipeUpdateDeltaDTO dto) {
        log.info("🔄 Actualizando receta ID {}", dto.getIdReceta());

        // Paso 1: Validar receta existe
        Receta receta = recetaRepository.findByIdRecetaAndActivoRecetaIsTrue(dto.getIdReceta())
                .orElseThrow(() -> new GestionRecetaException("Receta no encontrada: " + dto.getIdReceta()));

        // Paso 2: Actualizar campos básicos SI HAY CAMBIOS
        if (dto.isCambioReceta()) {
            if (dto.getEstadoReceta() == null) {
                throw new GestionRecetaException("El estado no puede ser nulo");
            }

            receta.setNombreReceta(dto.getNombreReceta());
            receta.setDescripcionReceta(dto.getDescripcionReceta());
            receta.setInstruccionesReceta(dto.getInstrucciones());
            receta.setEstadoReceta(dto.getEstadoReceta());

            recetaRepository.save(receta);
            log.info("✅ Campos básicos actualizados");
        }

        // Paso 3: Verificar si hay cambios en detalles (sin flag booleano)
        boolean tieneItemsAgregados = !CollectionUtils.isEmpty(dto.getItemsAgregados());
        boolean tieneItemsModificados = !CollectionUtils.isEmpty(dto.getItemsModificados());
        boolean tieneItemsEliminados = !CollectionUtils.isEmpty(dto.getIdsItemsEliminados());

        // ⚡ Salida anticipada si no hay cambios en detalles
        if (!tieneItemsAgregados && !tieneItemsModificados && !tieneItemsEliminados) {
            log.info("➡️ Sin cambios en detalles, retornando");
            return buildResponseDTO(receta); // Necesitas implementar este método
        }

        log.info("🧩 Procesando cambios en detalles");

        // Paso 4: Recolectar IDs de productos a validar (solo los que se agregan o modifican)
        Set<Integer> idsAValidar = new HashSet<>();

        if (tieneItemsAgregados) {
            idsAValidar.addAll(dto.getItemsAgregados().stream()
                    .map(RecipeItemAnswerDTO::getIdProducto)
                    .collect(Collectors.toSet()));
        }

        if (tieneItemsModificados) {
            idsAValidar.addAll(dto.getItemsModificados().stream()
                    .map(RecipeItemAnswerDTO::getIdProducto)
                    .collect(Collectors.toSet()));
        }

        // Paso 5: Validar productos activos EN BATCH (UNA SOLA QUERY)
        Map<Integer, Producto> productosValidos = idsAValidar.isEmpty()
                ? Collections.emptyMap()
                : productoService.findAllByIdInAndActivoTrue(idsAValidar)
                .stream()
                .collect(Collectors.toMap(Producto::getIdProducto, p -> p));

        // Paso 6: INSERT - Agregar nuevos items
        if (tieneItemsAgregados) {
            Set<Integer> idsExistentes = detalleRecetaService
                    .findProductoIdsByRecetaId(receta.getIdReceta())
                    .stream()
                    .collect(Collectors.toSet());

            List<DetalleReceta> nuevosDetalles = dto.getItemsAgregados().stream()
                    .filter(item -> {
                        // Validar que el producto no exista ya en la receta
                        if (idsExistentes.contains(item.getIdProducto())) {
                            log.warn("⚠️ Producto {} ya existe en receta {}, moviendo a UPDATE",
                                    item.getIdProducto(), receta.getIdReceta());

                            // Opción A: Tratarlo como UPDATE en lugar de INSERT
                            detalleRecetaService.updateQuantityByIdRecetaAndIdProducto(
                                    receta.getIdReceta(),
                                    item.getIdProducto(),
                                    item.getCantUnidadMedida().doubleValue()
                            );
                            return false; // No insertarlo
                        }

                        if (!productosValidos.containsKey(item.getIdProducto())) {
                            log.warn("⚠️ Producto {} inactivo/inexistente, omitido",
                                    item.getIdProducto());
                            return false;
                        }
                        return true;
                    })
                    .map(item -> {
                        DetalleReceta detalle = new DetalleReceta();
                        detalle.setReceta(receta);
                        detalle.setProducto(productosValidos.get(item.getIdProducto()));
                        detalle.setCantProducto(item.getCantUnidadMedida());
                        return detalle;
                    })
                    .collect(Collectors.toList());

            if (!nuevosDetalles.isEmpty()) {
                detalleRecetaService.saveAll(nuevosDetalles);
                log.info("➕ {} items agregados", nuevosDetalles.size());
            }
        }


        // Paso 7: UPDATE - Modificar cantidades
        if (tieneItemsModificados) {
            // Filtrar solo productos válidos
            List<RecipeItemAnswerDTO> itemsValidosParaActualizar = dto.getItemsModificados().stream()
                    .filter(item -> {
                        if (!productosValidos.containsKey(item.getIdProducto())) {
                            log.warn("⚠️ Producto {} inactivo/inexistente para UPDATE, omitido",
                                    item.getIdProducto());
                            return false;
                        }
                        return true;
                    })
                    .collect(Collectors.toList());

            if (!itemsValidosParaActualizar.isEmpty()) {
                // Opción 1: Batch update con múltiples queries individuales
                itemsValidosParaActualizar.forEach(item ->
                        detalleRecetaService.updateQuantityByIdRecetaAndIdProducto(
                                receta.getIdReceta(),
                                item.getIdProducto(),
                                item.getCantUnidadMedida().doubleValue()
                        )
                );

                log.info("✏️ {} cantidades actualizadas", itemsValidosParaActualizar.size());
            }
        }

        // Paso 8: DELETE - Eliminar items
        if (tieneItemsEliminados) {
            detalleRecetaService.deleteByRecetaAndProductoIds(
                    receta.getIdReceta(),
                    dto.getIdsItemsEliminados()
            );
            log.info("🗑️ {} items eliminados", dto.getIdsItemsEliminados().size());
        }

        log.info("✅ Actualización completa para receta ID {}", receta.getIdReceta());
        return buildResponseDTO(receta);
    }

    // Método helper para construir la respuesta
    private RecipeWithDetailsAnswerDTO buildResponseDTO(Receta receta) {
        RecipeWithDetailsAnswerDTO response = new RecipeWithDetailsAnswerDTO();
        response.setIdReceta(receta.getIdReceta());
        response.setNombreReceta(StringUtils.capitalize(receta.getNombreReceta()));
        response.setDescripcionReceta(receta.getDescripcionReceta());
        response.setInstrucciones(receta.getInstruccionesReceta());
        response.setEstadoReceta(receta.getEstadoReceta());

        // ✅ Usar proyección (más eficiente)
        List<DetalleRecetaItemProjection> detalles =
                detalleRecetaService.findItemsByRecetaId(receta.getIdReceta());

        List<RecipeItemAnswerDTO> listaItems = detalles.stream()
                .map(d -> {
                    RecipeItemAnswerDTO item = new RecipeItemAnswerDTO();
                    item.setIdProducto(d.getIdProducto());
                    item.setNombreProducto(d.getNombreProducto());
                    item.setCantUnidadMedida(d.getCantProducto());
                    item.setUnidadMedida(d.getUnidadMedida());
                    item.setActivo(d.getActivo());
                    return item;
                })
                .collect(Collectors.toList());

        response.setListaItems(listaItems);

        return response;
    }

    @Transactional
    @Override
    public void updateDeleteStatusActiveFalseRecipeWithDetails(Integer idReceta) {

        log.info("🚫 Iniciando eliminación lógica de receta {}", idReceta);

        // 1. Obtener receta activa
        Receta receta = findByIdRecetaAndActivoRecetaIsTrue(idReceta);

        // 2. Marcar como inactiva
        receta.setActivoReceta(false);
        recetaRepository.save(receta);

        log.info("✔ Receta {} marcada como inactiva", idReceta);
        log.info("🏁 Proceso finalizado. No se eliminan detalles por política del sistema.");
    }

    @Transactional
    @Override
    public void updateChangingStatusRecipeWith(Integer idReceta){
        Receta receta = findByIdRecetaAndActivoRecetaIsTrue(idReceta);

        if(receta.getEstadoReceta() == Receta.EstadoRecetaType.ACTIVO){
            receta.setEstadoReceta(Receta.EstadoRecetaType.INACTIVO);
        }else{
            receta.setEstadoReceta(Receta.EstadoRecetaType.ACTIVO);
        }
        recetaRepository.save(receta);
    }

    @Transactional
    @Override
    public void deleteById (Integer id){
        if( !existsById(id) ){
            throw new GestionRecetaException("No existe receta con id " + id);
        }
        recetaRepository.deleteById(id);
    }

    */
}
