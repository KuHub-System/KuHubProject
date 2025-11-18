package KuHub.modules.receta.services;

import KuHub.modules.producto.entity.Producto;
import KuHub.modules.producto.exceptions.ProductoException;
import KuHub.modules.producto.exceptions.ProductoNotFoundException;
import KuHub.modules.producto.service.ProductoService;
import KuHub.modules.receta.dtos.RecipeItemDTO;
import KuHub.modules.receta.dtos.RecipeWithDetailsAnswerUpdateDTO;
import KuHub.modules.receta.dtos.RecipeWithDetailsCreateDTO;
import KuHub.modules.receta.entity.DetalleReceta;
import KuHub.modules.receta.entity.Receta;
import KuHub.modules.receta.exceptions.RecetaException;
import KuHub.modules.receta.projection.DetalleRecetaIdProductoProjection;
import KuHub.modules.receta.repository.RecetaRepository;
import jakarta.persistence.criteria.CriteriaBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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


    @Transactional
    @Override
    public void syncSeqReceta() {
        Integer nuevoValor = recetaRepository.syncSeqReceta();
        System.out.println("Secencia sincronizada. Valor:" + nuevoValor);
    }

    @Transactional
    @Override
    public List<Receta> findAll() {
        return recetaRepository.findAll();
    }

    @Transactional
    @Override
    public List<Receta>findAllByActivoRecetaTrue(){
        return recetaRepository.findAllByActivoRecetaTrue();
    }

    @Transactional
    @Override
    public Receta findById(Integer id) {
        return recetaRepository.findById(id).orElseThrow(
        ()-> new RecetaException("No existe la receta con el id " + id));
    }

    @Transactional
    @Override
    public Receta findByIdRecetaAndActivoRecetaIsTrue(Integer id){
        Receta receta = findById(id);
        if (receta.getActivoReceta() == null || !receta.getActivoReceta()){
            throw new RecetaException("No existe la receta con el id " + id + " o esta inactivo");
        }else{
            return receta;
        }
    }

    @Transactional
    @Override
    public RecipeWithDetailsAnswerUpdateDTO findRecipeWithDetailsActiveInTrue(
            Integer id
    ){
        Receta receta = findByIdRecetaAndActivoRecetaIsTrue(id);
        List<DetalleReceta> detalles = detalleRecetaService.findAllByReceta(receta);
        List<RecipeItemDTO> items = new ArrayList<>();
        for (DetalleReceta d : detalles){
            items.add(new RecipeItemDTO(
                    d.getProducto().getIdProducto(),
                    d.getProducto().getNombreProducto(),
                    d.getProducto().getUnidadMedida(),
                    d.getCantProducto(),
                    d.getProducto().getActivo()
            ));
        }
        return new RecipeWithDetailsAnswerUpdateDTO(
                receta.getIdReceta(),
                receta.getNombreReceta(),
                receta.getDescripcionReceta(),
                items,
                receta.getInstruccionesReceta(),
                receta.getEstadoReceta(),
                false,
                false
        );

    }

    /**
     * Obtiene todas las recetas junto con sus detalles de productos,
     * agrupando eficientemente los detalles por receta para evitar
     * una relación cruzada O(n × m).
     *
     * No futuro se puede crear una condicionalidad para que filtre sea por True/False or All
     */
    @Transactional
    @Override
    public List<RecipeWithDetailsAnswerUpdateDTO> findAllRecipeWithDetailsActive() {

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
        List<RecipeWithDetailsAnswerUpdateDTO> dtos = new ArrayList<>();

        /** Recorre todas las recetas */
        for (Receta r : recetas) {

            /**
             * Obtiene solo los detalles que pertenecen a esta receta.
             * Si no tiene detalles, devuelve una lista vacía.
             */
            List<RecipeItemDTO> items = detallesPorReceta
                    .getOrDefault(r.getIdReceta(), Collections.emptyList())
                    .stream()
                    .map(d -> new RecipeItemDTO(
                            d.getProducto().getIdProducto(),
                            d.getProducto().getNombreProducto(),
                            d.getProducto().getUnidadMedida(),
                            d.getCantProducto(),
                            d.getProducto().getActivo()
                    ))
                    .collect(Collectors.toList());

            /** Construye el DTO final de receta con detalles */
            dtos.add(new RecipeWithDetailsAnswerUpdateDTO(
                    r.getIdReceta(),
                    r.getNombreReceta(),
                    r.getDescripcionReceta(),
                    items,
                    r.getInstruccionesReceta(),
                    r.getEstadoReceta(),
                    false,
                    false
            ));
        }

        /** Log del total de recetas procesadas */
        log.info("Se generaron {} recetas con detalles", dtos.size());

        return dtos;
    }

    @Transactional
    @Override
    public Boolean existsByNombreRecetaAndActivoRecetaTrue(String nombreReceta) {
        return recetaRepository.existsByNombreRecetaAndActivoRecetaTrue(nombreReceta);
    }

    @Transactional
    @Override
    public Boolean existsById(Integer id){
        return recetaRepository.existsById(id);
    }

    @Transactional
    @Override
    public Receta save (Receta receta){
        syncSeqReceta();
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
    public RecipeWithDetailsCreateDTO saveRecipeWithDetails (RecipeWithDetailsCreateDTO dto) {


        if(dto.getListaItems() == null || dto.getListaItems().isEmpty()){
            throw new RecetaException("La lista de items de receta no puede estar vacia");
        }

        //VALIDACIONES CREA EL MAPA PARA GUARDAR LOS PRODUCTOS PARA EVITAR LLAMADAS A LA BBDD
        List<Map.Entry<RecipeItemDTO, Producto>> itemsValidosConProducto = new ArrayList<>();
        List<String> errores = new ArrayList<>();

        //INICIAR CICLO DE VALIDACIONES DETALLE RECETA
        for (RecipeItemDTO DR : dto.getListaItems()) {
            //Obtener producto si existe el id
            try {
                Producto producto = productoService.findById(DR.getIdProducto());

                //Validar si la candidad del producto de la receta no es negativa
                if (DR.getCantUnidadMedida() < 0) {
                    // CAPTURAR ERRORES Y AÑADIRLOS A LA LISTA
                    errores.add("La cantidad del producto '" + producto.getNombreProducto() + "' no puede ser negativa.");
                    continue;
                }
                itemsValidosConProducto.add(new AbstractMap.SimpleEntry<>(DR, producto));

            } catch (RecetaException e) {
                // CAPTURAR ERRORES Y AÑADIRLOS A LA LISTA
                errores.add("El producto con ID " + DR.getIdProducto() + " no fue encontrado.");
            }
        }

        //INICIO GUARDADOS FILTRADOS POR VALIDACIONES
        //GUARDAR RECETA
        syncSeqReceta();
        Receta recetaGuardada = save(new Receta(
                null,                       // idReceta (autogenerado)
                dto.getNombreReceta(),              // nombreReceta
                dto.getDescripcionReceta(),         // descripcionReceta
                dto.getInstrucciones(),             // instruccionesReceta
                true,                               // activoReceta
                Receta.EstadoRecetaType.ACTIVO,     // estadoReceta
                null                                // fotoReceta (nula por ahora)
        ));
        //GUARDAR LOS DETALLES

        for (Map.Entry<RecipeItemDTO, Producto> entry : itemsValidosConProducto) {
            RecipeItemDTO DR = entry.getKey();
            Producto producto = entry.getValue();

            detalleRecetaService.save(new DetalleReceta(
                    null,
                    recetaGuardada,
                    producto,
                    DR.getCantUnidadMedida()
            ));
        }
        return dto ;
    }

    /**
     * Actualiza una receta y sus detalles de ingredientes de forma optimizada.
     *
     * Este método gestiona la actualización completa de una receta, incluyendo sus datos básicos
     * (nombre, descripción, instrucciones, estado) y sus detalles de ingredientes (productos y cantidades).
     *
     * Funcionamiento:
     * 1. Valida la existencia de la receta activa en base de datos
     * 2. Si hay cambios en datos básicos de la receta, los actualiza
     * 3. Si no hay cambios en detalles, termina la ejecución guardando solo la receta si fue modificada
     * 4. Si hay cambios en detalles, realiza un proceso optimizado:
     *    - Carga solo los IDs de productos y cantidades actuales (no entidades completas)
     *    - Filtra productos inactivos del DTO recibido para prevenir errores
     *    - Detecta cambios reales comparando productos nuevos, eliminados o con cantidades modificadas
     *    - Si no hay cambios reales, evita operaciones innecesarias en base de datos
     *    - Si hay cambios, ejecuta operaciones específicas: INSERT (nuevos), UPDATE (cantidades) y DELETE (eliminados)
     * 5. Guarda la receta solo si hubo modificaciones en sus datos básicos
     * 6. Retorna el DTO actualizado con los cambios aplicados
     *
     * Optimizaciones implementadas:
     * - Uso de proyecciones para cargar solo datos necesarios
     * - Validación temprana para evitar procesamiento innecesario
     * - Operaciones batch para updates y deletes
     * - Filtrado preventivo de productos inactivos
     * - Detección de cambios reales antes de ejecutar operaciones en BD
     *
     * @param dto DTO conteniendo la receta y sus detalles a actualizar, con flags indicando qué secciones cambiaron
     * @return El mismo DTO con datos actualizados y sincronizados con la base de datos
     * @throws RecetaException si la receta no existe, está inactiva, o hay errores de validación
     * @throws ProductoNotFoundException excluida del rollback, permite continuar si un producto no existe
     */
    @Transactional(noRollbackFor = ProductoNotFoundException.class)
    @Override
    public RecipeWithDetailsAnswerUpdateDTO updateRecipeWithDetails(
            RecipeWithDetailsAnswerUpdateDTO dto
    ){
        try {
            log.info("🔄 Iniciando actualización de receta ID {}", dto.getIdReceta());
            log.info("📦 DTO recibido: {}", dto);

            /** Paso 1: Carga y validación de la entidad Receta desde base de datos */
            Receta receta = recetaRepository.findByIdRecetaAndActivoRecetaIsTrue(dto.getIdReceta())
                    .orElseThrow(() -> new RecetaException(
                            "No existe receta activa con id " + dto.getIdReceta()
                    ));

            log.info("✅ Receta encontrada: {}", receta);

            /** Paso 2: Actualización de campos básicos de la receta si el flag indica cambios */
            if (dto.isCambioReceta()) {
                log.info("✏️  Detectado cambio en RECETA ID {}", dto.getIdReceta());

                /** Validación de estado no nulo antes de asignar */
                if (dto.getEstadoReceta() == null) {
                    log.error("❌ estadoReceta es NULL en el DTO");
                    throw new RecetaException("El estado de la receta no puede ser nulo");
                }

                log.info("🔍 Estado recibido: {}", dto.getEstadoReceta());
                log.info("🔍 Tipo de estado: {}", dto.getEstadoReceta().getClass().getName());

                /** Asignación de valores actualizados a la entidad */
                receta.setNombreReceta(dto.getNombreReceta());
                receta.setDescripcionReceta(dto.getDescripcionReceta());
                receta.setInstruccionesReceta(dto.getInstrucciones());
                receta.setEstadoReceta(dto.getEstadoReceta());

                log.info("✅ Campos de receta actualizados correctamente");
            }

            /** Sincronización del DTO con el valor actual de la entidad */
            dto.setNombreReceta(StringUtils.capitalize(receta.getNombreReceta()));

            /** Paso 2.5: Salida anticipada si no hay cambios en detalles */
            if (!dto.isCambioDetalles()) {
                /** Persiste cambios solo si se modificó la receta */
                if (dto.isCambioReceta()) {
                    recetaRepository.save(receta);
                    log.info("💾 Receta ID {} guardada (solo cambios en receta)", receta.getIdReceta());
                }
                log.info("➡️ Retornando DTO sin cambios en detalles");
                return dto;
            }

            /** Paso 3: Procesamiento de cambios en detalles de ingredientes */
            log.info("🧩 Procesando cambios en DETALLES de receta {}", receta.getIdReceta());

            /** 3.1: Carga optimizada usando proyección - solo IDs y cantidades, no entidades completas */
            List<DetalleRecetaIdProductoProjection> oldDetails =
                    detalleRecetaService.findAllIdProductoAndCantidadByReceta(dto.getIdReceta());

            /** 3.2: Conversión a Map para búsquedas O(1) durante comparaciones */
            Map<Integer, Double> oldMap = oldDetails.stream()
                    .collect(Collectors.toMap(
                            DetalleRecetaIdProductoProjection::getIdProducto,
                            DetalleRecetaIdProductoProjection::getCantProducto
                    ));

            /** Paso 3.3: Filtrado preventivo de productos inactivos o inexistentes del DTO */
            List<RecipeItemDTO> itemsFiltrados = dto.getListaItems().stream()
                    .filter(item -> {
                        Producto p = productoService.findById(item.getIdProducto());

                        /** Validación de existencia del producto */
                        if (p == null) {
                            log.warn("⚠️ Producto {} no existe → removido", item.getIdProducto());
                            return false;
                        }

                        /** Validación de estado activo del producto */
                        if (!p.getActivo()) {
                            log.warn("⚠️ Producto {} INACTIVO → removido", item.getIdProducto());
                            return false;
                        }

                        return true;
                    })
                    .collect(Collectors.toList());

            /** Actualización del DTO con la lista filtrada */
            dto.setListaItems(itemsFiltrados);
            log.info("🔎 Lista final filtrada (solo productos activos): {}", itemsFiltrados);

            /** Construcción de conjuntos para comparación de IDs antiguos vs nuevos */
            Set<Integer> oldIds = oldMap.keySet();
            Set<Integer> newIds = dto.getListaItems().stream()
                    .map(RecipeItemDTO::getIdProducto)
                    .collect(Collectors.toSet());

            /** Paso 4: Detección inteligente de cambios reales en detalles */
            boolean hayCambiosReales = false;

            /** 4.1: Detección de productos nuevos (INSERT) */
            for (RecipeItemDTO item : dto.getListaItems()) {
                if (!oldIds.contains(item.getIdProducto())) {
                    hayCambiosReales = true;
                    log.info("🔍 Detectado cambio REAL: producto nuevo {}", item.getIdProducto());
                    break;
                }
            }

            /** 4.2: Detección de productos eliminados (DELETE) */
            if (!hayCambiosReales) {
                for (Integer idOld : oldIds) {
                    if (!newIds.contains(idOld)) {
                        hayCambiosReales = true;
                        log.info("🔍 Detectado cambio REAL: producto eliminado {}", idOld);
                        break;
                    }
                }
            }

            /** 4.3: Detección de cambios en cantidades (UPDATE) */
            if (!hayCambiosReales) {
                for (RecipeItemDTO item : dto.getListaItems()) {
                    Double oldCant = oldMap.get(item.getIdProducto());
                    if (oldCant != null && !oldCant.equals(item.getCantUnidadMedida())) {
                        hayCambiosReales = true;
                        log.info("🔍 Detectado cambio REAL: cantidad modificada en producto {}", item.getIdProducto());
                        break;
                    }
                }
            }

            /** Salida anticipada si no hay cambios reales detectados */
            if (!hayCambiosReales) {
                log.info("🟦 No hubo CAMBIOS REALES en detalles. Saltando INSERT/UPDATE/DELETE.");

                if (dto.isCambioReceta()) {
                    recetaRepository.save(receta);
                    log.info("💾 Receta ID {} guardada (solo cambios en receta)", receta.getIdReceta());
                }
                return dto;
            }

            /** Paso 5: Ejecución de operaciones en base de datos - INSERT para nuevos productos */
            for (RecipeItemDTO item : dto.getListaItems()) {

                if (!oldIds.contains(item.getIdProducto())) {

                    log.info("➕ INSERT detalle: producto {} (cantidad {})",
                            item.getIdProducto(),
                            item.getCantUnidadMedida()
                    );

                    /** Carga del producto ya validado como activo en filtrado previo */
                    Producto prod = productoService.findByIdProductoAndActivoTrue(
                            item.getIdProducto()
                    );

                    /** Creación y persistencia de nuevo detalle de receta */
                    DetalleReceta nuevo = new DetalleReceta();
                    nuevo.setReceta(receta);
                    nuevo.setProducto(prod);
                    nuevo.setCantProducto(item.getCantUnidadMedida());

                    detalleRecetaService.save(nuevo);
                }
            }

            /** Paso 6: UPDATE para productos existentes con cantidades modificadas */
            for (RecipeItemDTO item : dto.getListaItems()) {
                Double oldCant = oldMap.get(item.getIdProducto());
                if (oldCant != null && !oldCant.equals(item.getCantUnidadMedida())) {
                    log.info("✏️ UPDATE cantidad producto {}: {} → {}",
                            item.getIdProducto(),
                            oldCant,
                            item.getCantUnidadMedida()
                    );

                    /** Actualización directa de cantidad sin cargar entidad completa */
                    detalleRecetaService.updateQuantityByIdRecetaAndIdProducto(
                            receta.getIdReceta(),
                            item.getIdProducto(),
                            item.getCantUnidadMedida()
                    );
                }
            }

            /** Paso 7: DELETE para productos removidos de la receta */
            for (Integer idOld : oldIds) {
                if (!newIds.contains(idOld)) {
                    log.info("🗑️ DELETE detalle producto {}", idOld);

                    /** Eliminación en batch de detalles por IDs */
                    detalleRecetaService.deleteByRecetaAndProductoIds(
                            receta.getIdReceta(),
                            List.of(idOld)
                    );
                }
            }

            /** Paso 8: Persistencia final de la receta si hubo cambios en sus datos básicos */
            if (dto.isCambioReceta()) {
                recetaRepository.save(receta);
                log.info("💾 Receta ID {} guardada (cambios en receta + detalles)", receta.getIdReceta());
            }

            /** Retorno del DTO actualizado con todos los cambios aplicados */
            log.info("✅ Actualización completa para receta ID {}", receta.getIdReceta());
            return dto;
        } catch (RecetaException e) {
            log.error("❌ RecetaException: {}", e.getMessage(), e);
            throw e;
        } catch (Exception e) {
            log.error("💥 Error inesperado al actualizar receta", e);
            throw new RecetaException("Error al actualizar receta: " + e.getMessage());
        }
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
