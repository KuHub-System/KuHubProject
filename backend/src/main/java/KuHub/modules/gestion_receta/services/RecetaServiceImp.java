package KuHub.modules.gestion_receta.services;

import KuHub.modules.gestion_receta.dtos.*;
import KuHub.modules.gestion_receta.dtos.projection.DetalleRecetaItemProjection;
import KuHub.modules.producto.entity.Producto;
import KuHub.modules.producto.exceptions.ProductoNotFoundException;
import KuHub.modules.producto.service.ProductoService;
import KuHub.modules.gestion_receta.entity.DetalleReceta;
import KuHub.modules.gestion_receta.entity.Receta;
import KuHub.modules.gestion_receta.exceptions.RecetaException;
import KuHub.modules.gestion_receta.repository.RecetaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecetaServiceImp implements RecetaService{

    @Autowired
    private RecetaRepository recetaRepository;

    @Autowired
    private ProductoService productoService;

    @Autowired
    private DetalleRecetaService detalleRecetaService;

    private static final Logger log = LoggerFactory.getLogger(RecetaServiceImp.class);


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
        ()-> new RecetaException("No existe la receta con el id " + id));
    }

    @Transactional(readOnly = true)
    @Override
    public Receta findByIdRecetaAndActivoRecetaIsTrue(Integer id){
        Receta receta = findById(id);
        if (receta.getActivoReceta() == null || !receta.getActivoReceta()){
            throw new RecetaException("No existe la receta con el id " + id + " o esta inactivo");
        }else{
            return receta;
        }
    }

    @Transactional(readOnly = true)
    @Override
    public RecipeWithDetailsAnswerDTO findRecipeWithDetailsActiveInTrue(Integer id) {
        log.info("🔍 Consultando receta ID: {} usando proyecciones", id);

        // 1. Buscamos la cabecera de la receta
        Receta receta = recetaRepository.findByIdRecetaAndActivoRecetaIsTrue(id)
                .orElseThrow(() -> new RecetaException("Receta no encontrada o inactiva con ID: " + id));

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

        /** Obtiene solo las recetas activas */
        List<Receta> recetas = findAllByActivoRecetaTrue();

        /** Obtiene todos los detalles de receta desde la BD */
        List<DetalleReceta> detalles = detalleRecetaService.findAll();

        /**
         * Agrupa los detalles por el ID de su receta para acceso rápido.
         * Esto reduce la complejidad a O(n + m).
         */
        Map<Integer, List<DetalleReceta>> detallesPorReceta = detalles.stream()
                .collect(Collectors.groupingBy(d -> d.getReceta().getIdReceta()));

        /** Lista final que se devolverá al caller */
        List<RecipeWithDetailsAnswerDTO> dtos = new ArrayList<>();

        /** Recorre todas las recetas */
        for (Receta r : recetas) {

            /**
             * Obtiene solo los detalles que pertenecen a esta receta.
             * Si no tiene detalles, devuelve una lista vacía.
             */
            List<RecipeItemAnswerDTO> items = detallesPorReceta
                    .getOrDefault(r.getIdReceta(), Collections.emptyList())
                    .stream()
                    .map(d -> new RecipeItemAnswerDTO(
                            d.getProducto().getIdProducto(),
                            d.getProducto().getNombreProducto(),
                            d.getProducto().getUnidadMedida(),
                            d.getCantProducto(),
                            d.getProducto().getActivo()
                    ))
                    .collect(Collectors.toList());

            /** Construye el DTO final de receta con detalles */
            dtos.add(new RecipeWithDetailsAnswerDTO(
                    r.getIdReceta(),
                    r.getNombreReceta(),
                    r.getDescripcionReceta(),
                    items,
                    r.getInstruccionesReceta(),
                    r.getEstadoReceta()
            ));
        }

        /** Log del total de recetas procesadas */
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
            throw new RecetaException("El nombre de la receta ya existe");
        }

        receta.setNombreReceta(capNombreReceta);
        receta.setActivoReceta(true);
        receta.setEstadoReceta(Receta.EstadoRecetaType.ACTIVO);
        return recetaRepository.save(receta);
    }

    @Transactional
    @Override
    public RecipeWithDetailsAnswerDTO saveRecipeWithDetails(RecipeWithDetailsCreateDTO dto) {
        log.info("🚀 Creando nueva receta: {}", dto.getNombreReceta());

        // 1. Validación inicial
        if (CollectionUtils.isEmpty(dto.getListaItems())) {
            throw new RecetaException("La lista de items no puede estar vacía");
        }

        // 2. Carga masiva de productos
        Set<Integer> idsProductos = dto.getListaItems().stream()
                .map(RecipeItemCreateDTO::getIdProducto) // <-- Aquí estaba el error
                .collect(Collectors.toSet());

        Map<Integer, Producto> productosValidos = productoService
                .findAllByIdInAndActivoTrue(idsProductos)
                .stream()
                .collect(Collectors.toMap(Producto::getIdProducto, p -> p));

        // 3. Crear y guardar la cabecera de la Receta
        Receta nuevaReceta = new Receta();
        nuevaReceta.setNombreReceta(dto.getNombreReceta());
        nuevaReceta.setDescripcionReceta(dto.getDescripcionReceta());
        nuevaReceta.setInstruccionesReceta(dto.getInstrucciones());
        nuevaReceta.setEstadoReceta(dto.getEstadoReceta() != null ? dto.getEstadoReceta() : Receta.EstadoRecetaType.ACTIVO);
        nuevaReceta.setActivoReceta(true);

        Receta recetaGuardada = recetaRepository.save(nuevaReceta);

        // 4. Preparar detalles para Guardado Masivo (saveAll)
        List<DetalleReceta> detallesAGuardar = dto.getListaItems().stream()
                .filter(item -> {
                    if (!productosValidos.containsKey(item.getIdProducto())) {
                        log.warn("⚠️ Producto ID {} no existe o está inactivo. Se omitirá.", item.getIdProducto());
                        return false;
                    }
                    if (item.getCantUnidadMedida() < 0) {
                        throw new RecetaException("La cantidad para el producto " + item.getIdProducto() + " no puede ser negativa");
                    }
                    return true;
                })
                .map(item -> {
                    DetalleReceta detalle = new DetalleReceta();
                    detalle.setReceta(recetaGuardada);
                    detalle.setProducto(productosValidos.get(item.getIdProducto()));
                    detalle.setCantProducto(item.getCantUnidadMedida());
                    return detalle;
                })
                .collect(Collectors.toList());

        if (detallesAGuardar.isEmpty()) {
            throw new RecetaException("No se pudo agregar ningún producto válido a la receta");
        }

        detalleRecetaService.saveAll(detallesAGuardar);
        log.info("✅ Receta ID {} creada con {} detalles", recetaGuardada.getIdReceta(), detallesAGuardar.size());

        // 5. Retornar la respuesta usando el helper que ya creamos (con proyecciones)
        return buildResponseDTO(recetaGuardada);
    }

    @Transactional(noRollbackFor = ProductoNotFoundException.class)
    @Override
    public RecipeWithDetailsAnswerDTO updateRecipeWithDelta(RecipeUpdateDeltaDTO dto) {
        log.info("🔄 Actualizando receta ID {}", dto.getIdReceta());

        // Paso 1: Validar receta existe
        Receta receta = recetaRepository.findByIdRecetaAndActivoRecetaIsTrue(dto.getIdReceta())
                .orElseThrow(() -> new RecetaException("Receta no encontrada: " + dto.getIdReceta()));

        // Paso 2: Actualizar campos básicos SI HAY CAMBIOS
        if (dto.isCambioReceta()) {
            if (dto.getEstadoReceta() == null) {
                throw new RecetaException("El estado no puede ser nulo");
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
                                    item.getCantUnidadMedida()
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
                                item.getCantUnidadMedida()
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
            throw new RecetaException("No existe receta con id " + id);
        }
        recetaRepository.deleteById(id);
    }


    }
