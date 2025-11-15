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
        return recetaRepository.findByIdRecetaAndActivoRecetaIsTrue(id).orElseThrow(
                ()-> new RecetaException("No existe la receta con el id " + id)
        );
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
                    d.getCantProducto()
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
                            d.getCantProducto()
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

    @Transactional
    @Override
    public RecipeWithDetailsAnswerUpdateDTO updateRecipeWithDetails(
            RecipeWithDetailsAnswerUpdateDTO dto
    ){
        log.info("🔄 Iniciando actualización de receta ID {}", dto.getIdReceta());

            // === 1. Cargar solo la receta ===
        Receta receta = recetaRepository.findByIdRecetaAndActivoRecetaIsTrue(dto.getIdReceta())
                .orElseThrow(() -> new RecetaException(
                        "No existe receta activa con id " + dto.getIdReceta()
                ));

        // ============================
        // === 2. Cambios en Receta ===
        // ============================
        if (dto.isCambioReceta()) {
            log.info("✏️  Detectado cambio en RECETA ID {}", dto.getIdReceta());
            log.debug("Antes -> nombre: {}, desc: {}, instr: {}",
                    receta.getNombreReceta(),
                    receta.getDescripcionReceta(),
                    receta.getInstruccionesReceta()
            );

            receta.setNombreReceta(dto.getNombreReceta());
            receta.setDescripcionReceta(dto.getDescripcionReceta());
            receta.setInstruccionesReceta(dto.getInstrucciones());
            receta.setEstadoReceta(dto.getEstadoReceta());

            log.debug("Después -> nombre: {}, desc: {}, instr: {}",
                    dto.getNombreReceta(),
                    dto.getDescripcionReceta(),
                    dto.getInstrucciones()
            );
        }
        //Actualizacion en el dto para retorna el mismo dto
        dto.setNombreReceta(StringUtils.capitalize(receta.getNombreReceta()));
        // =============================================
        // === 2.5 Si NO hay cambios en detalles, salir ===
        // =============================================
        if (!dto.isCambioDetalles()) {
            // Si hubo cambios en la receta, guardar
            if (dto.isCambioReceta()) {
                recetaRepository.save(receta);
                log.info("💾 Receta ID {} guardada (solo cambios en receta)", receta.getIdReceta());
            }
            // Retornar el dto sin cambios en detalles
            log.info("➡️ Retornando DTO sin cambios en detalles");
            return dto;
        }

        // =================================
        // === 3. Cambios en Detalles ===
        // =================================
        log.info("🧩 Procesando cambios en DETALLES de receta {}", receta.getIdReceta());

        // 3.1 Cargar solo datos mínimos
        List<DetalleRecetaIdProductoProjection> oldDetails =
                detalleRecetaService.findAllIdProductoAndCantidadByReceta(dto.getIdReceta());

        // 3.2 Convertir oldDetails en mapa para comparación rápida
        Map<Integer, Double> oldMap = oldDetails.stream()
                .collect(Collectors.toMap(
                        DetalleRecetaIdProductoProjection::getIdProducto,
                        DetalleRecetaIdProductoProjection::getCantProducto
                ));

        Set<Integer> oldIds = oldMap.keySet();
        Set<Integer> newIds = dto.getListaItems()
                .stream()
                .map(RecipeItemDTO::getIdProducto)
                .collect(Collectors.toSet());


        // =======================================================
        // === VALIDACIÓN AGREGADA: detectar SI hay cambios reales ===
        // =======================================================
        boolean hayCambiosReales = false;

        // 1. Si hay producto nuevo → hay cambios
        for (RecipeItemDTO item : dto.getListaItems()) {
            if (!oldIds.contains(item.getIdProducto())) {
                hayCambiosReales = true;
                log.info("🔍 Detectado cambio REAL: producto nuevo {}", item.getIdProducto());
                break;
            }
        }

        // 2. Si hay producto eliminado → hay cambios
        if (!hayCambiosReales) {
            for (Integer idOld : oldIds) {
                if (!newIds.contains(idOld)) {
                    hayCambiosReales = true;
                    log.info("🔍 Detectado cambio REAL: producto eliminado {}", idOld);
                    break;
                }
            }
        }

        // 3. Si cambió la cantidad → hay cambios
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

        // SI NO HAY CAMBIOS REALES → SALIR
        if (!hayCambiosReales) {
            log.info("🟦 No hubo CAMBIOS REALES en detalles. Saltando INSERT/UPDATE/DELETE.");

            if (dto.isCambioReceta()) {
                recetaRepository.save(receta);
                log.info("💾 Receta ID {} guardada (solo cambios en receta)", receta.getIdReceta());
            }

            return dto;
        }
        // =======================================================
        // === FIN VALIDACIÓN — continúa tu código normalmente ===
        // =======================================================



        // === Inserts nuevos ===
        for (RecipeItemDTO item : dto.getListaItems()) {
            if (!oldIds.contains(item.getIdProducto())) {
                log.info("➕ INSERT detalle: producto {} (cantidad {})",
                        item.getIdProducto(),
                        item.getCantUnidadMedida()
                );

                Producto prod; // <-- declarar aquí

                try {
                    prod = productoService.findByIdProductoAndActivoTrue(item.getIdProducto());
                } catch (ProductoNotFoundException ex) {
                    log.warn("⚠️ Producto {} no existe o está inactivo. Se ignora el INSERT.",
                            item.getIdProducto());
                    continue; // saltamos este item, sin romper todo el update
                }

                DetalleReceta nuevo = new DetalleReceta();
                nuevo.setReceta(receta);
                nuevo.setProducto(prod);
                nuevo.setCantProducto(item.getCantUnidadMedida());

                detalleRecetaService.save(nuevo);
            }
        }


        // === Updates en cantidades ===
        for (RecipeItemDTO item : dto.getListaItems()) {
            Double oldCant = oldMap.get(item.getIdProducto());
            if (oldCant != null && !oldCant.equals(item.getCantUnidadMedida())) {
                log.info("✏️ UPDATE cantidad producto {}: {} → {}",
                        item.getIdProducto(),
                        oldCant,
                        item.getCantUnidadMedida()
                );

                detalleRecetaService.updateQuantityByIdRecetaAndIdProducto(
                        receta.getIdReceta(),
                        item.getIdProducto(),
                        item.getCantUnidadMedida()
                );
            }
        }


        // === Deletes (productos removidos) ===
        for (Integer idOld : oldIds) {
            if (!newIds.contains(idOld)) {
                log.info("🗑️ DELETE detalle producto {}", idOld);

                detalleRecetaService.deleteByRecetaAndProductoIds(
                        receta.getIdReceta(),
                        List.of(idOld)
                );
            }
        }



        // === Guardar solo si hubo cambio en receta ===
        if (dto.isCambioReceta()) {
            recetaRepository.save(receta);
            log.info("💾 Receta ID {} guardada (cambios en receta + detalles)", receta.getIdReceta());
        }

        // === Retornar DTO final ===
        log.info("✅ Actualización completa para receta ID {}", receta.getIdReceta());
        return dto;
    }

    /*
    PROCESO DE ACTUALIZACIÓN OPTIMIZADO (Receta + Detalles)
    -------------------------------------------------------
    Este método está diseñado para ejecutar la mínima cantidad posible de consultas
    y actualizaciones en la base de datos, incluso cuando el front envía todos los
    datos completos en cada actualización.

    === 1) Uso de los booleanos (cambioReceta / cambioDetalles) ===
    El front siempre envía la receta completa y todos los detalles, pero el backend
    valida qué realmente cambió:
        - cambioReceta = true  → solo se actualizan los campos modificados de la receta.
        - cambioReceta = false → se ignoran los datos de receta aunque vengan en el DTO.
        - cambioDetalles = true → se procesa la lista de productos (insert/update/delete).
        - cambioDetalles = false → se ignora completamente la lista de items.

    Gracias a esto, se evita procesar estructuras pesadas si el front solo actualizó
    un texto o un estado, o viceversa.

    === 2) Consultas mínimas a la base de datos ===
    El método realiza solo dos SELECT obligatorios:
        1) SELECT de la receta (1 registro)
        2) SELECT de los detalles actuales (id_producto y cantidad) en una sola query

    Todo el análisis de diferencias (comparaciones) se hace en memoria usando mapas y sets.
    No se consulta cada producto ni cada detalle individualmente.

    === 3) Control inteligente de cambios en detalles ===
    El backend compara la lista enviada por el front con la lista actual de la BD:
        - INSERT: sólo para productos nuevos que no existen en la BD.
        - UPDATE: sólo si la cantidad enviada es distinta de la cantidad actual.
        - DELETE: sólo para productos que existen en BD pero no aparecen en la nueva lista.

    Productos sin cambios:
        - No generan consultas adicionales.
        - No generan updates innecesarios.
        - No tocan la base de datos.

    === 4) Validaciones implicadas ===
    Aunque el front envíe 20 o 50 productos cada vez:
        - El backend detecta cuáles realmente cambiaron.
        - Se valida que cada producto exista y esté activo SOLO si se va a insertar.
        - No se actualiza nada si las cantidades son idénticas.
        - No se elimina nada si el producto aún está presente en la nueva lista.

    === 5) Resultado final ===
    El método procesa exclusivamente los cambios reales:
        - Evita cargar la BD con operaciones innecesarias.
        - Escala bien incluso con muchas recetas y cientos de productos.
        - Garantiza integridad y consistencia sin sacrificar rendimiento.
        - Mantiene el control en el backend (el front no decide qué cambiar realmente).

    En resumen:
    Aunque el front envíe todo, el backend actúa solo sobre lo que realmente cambió,
    ejecutando INSERT/UPDATE/DELETE únicamente cuando es estrictamente necesario.
*/

    @Transactional
    @Override
    public void updateStatusActiveFalseRecipeWithDetails(Integer idReceta) {

        log.info("🚫 Iniciando eliminación lógica de receta {}", idReceta);

        // 1. Obtener receta activa
        Receta receta = findByIdRecetaAndActivoRecetaIsTrue(idReceta);

        // Si ya está inactiva → no hacer nada
        if (!receta.getActivoReceta()) {
            log.info("ℹ️ Receta {} ya estaba inactiva. No se realizan cambios.", idReceta);
        }

        // 2. Marcar receta como inactiva
        receta.setActivoReceta(false);
        recetaRepository.save(receta);

        log.info("✔ Receta {} marcada como inactiva", idReceta);

        List<DetalleReceta> detalles = detalleRecetaService.findAllByReceta(receta);

        if (detalles.isEmpty()) {
            log.info("ℹ️ Receta {} no tiene detalles. Proceso completado.", idReceta);
        }

        log.info("ℹ️ Receta {} tiene {} detalles. No se eliminara debido al futuro uso en historiales.",
                idReceta, detalles.size());

        log.info("🏁 Proceso de eliminación lógica finalizado para receta {}", idReceta);


    }


    }
