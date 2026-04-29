package KuHub.modules.pedido_semana_a_bodega.services;

import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.services.ProductoService;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.CountRecipesAndStatusView;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.dto.RecipeItemDTO;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.dto.RecipeWithDetailsCreateDTO;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection.DetailsByUpdateView;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection.RecipeWithDetailsView;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.record.DetailsByUpdateRec;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.record.RecipesPage;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.RecipeWithDetailsUpdateDTO;
import KuHub.modules.pedido_semana_a_bodega.entity.DetallePedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.entity.PedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.exceptions.PedidoSemanaBodegaException;
import KuHub.modules.pedido_semana_a_bodega.repository.DetallePedidoSemanaBodegaRepository;
import KuHub.modules.pedido_semana_a_bodega.repository.PedidoSemanaBodegaRepository;
import KuHub.utils.PaginationUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import KuHub.utils.StringUtils;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class PedidoSemanaBodegaServiceImp implements PedidoSemanaBodegaService{

    @Autowired
    private PedidoSemanaBodegaRepository recetaRepository;

    @Autowired
    private DetallePedidoSemanaBodegaRepository detallePedidoSemanaBodegaRepository;

    @Autowired
    private ProductoService productoService;

    @Autowired
    private ObjectMapper objectMapper;

    /** Busca una receta por ID y lanza excepción si no existe. */
    @Transactional(readOnly = true)
    @Override
    public PedidoSemanaBodega findById(Integer id) {
        return recetaRepository.findById(id).orElseThrow(
                ()-> new PedidoSemanaBodegaException("No existe la receta con el id " + id, HttpStatus.NOT_FOUND));
    }

    /** Retorna el conteo total de recetas agrupado por estado. */
    @Transactional(readOnly = true)
    @Override
    public CountRecipesAndStatusView countRecipesAndStatus() {
        return recetaRepository.countRecipesAndStatus();
    }

    /** Lista todas las recetas activas paginadas con sus detalles e ingredientes. */
    @Transactional(readOnly = true)
    @Override
    public RecipesPage findAllRecipesPaginated(Integer pageRequested) {
        long totalRecords = recetaRepository.countByActivoRecetaTrue();
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(pageRequested, totalRecords);

        List<RecipeWithDetailsView> rows = recetaRepository.findAllWithDetailsPaging(
                paging.limit(),
                paging.offset()
        );

        return RecipesPage.of(rows, paging, objectMapper);
    }

    /** Lista recetas paginadas filtradas por nombre o descripción. */
    @Transactional(readOnly = true)
    @Override
    public RecipesPage findAllWithDetailsAndSearchPaging(SearchDTO searchDto) {
        String term = (searchDto.getTerm() == null) ? "" : searchDto.getTerm().trim();
        int page = (searchDto.getPage() == null || searchDto.getPage() < 1) ? 1 : searchDto.getPage();

        long totalRecords = recetaRepository.countWithSearch(term);
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(page, totalRecords);

        List<RecipeWithDetailsView> rows = recetaRepository.findAllWithDetailsAndSearch(
                term,
                paging.limit(),
                paging.offset()
        );
        return RecipesPage.of(rows, paging, objectMapper);
    }


    /** Crea una receta con sus detalles de ingredientes, consolidando duplicados sumando cantidades. */
    @Transactional
    @Override
    public boolean saveRecipeWithDetails(RecipeWithDetailsCreateDTO request) {
        String nombreReceta = StringUtils.capitalizarPalabras(request.getNombreReceta());

        if (recetaRepository.existsByNombreRecetaAndActivoRecetaTrue(nombreReceta)) {
            throw new PedidoSemanaBodegaException("Ya existe una receta activa con el nombre: " + nombreReceta,
                    HttpStatus.CONFLICT);
        }

        PedidoSemanaBodega newReceta = new PedidoSemanaBodega();
        newReceta.setNombreReceta(nombreReceta);
        String key = StringUtils.normalizeToEnumKey(request.getEstadoReceta());
        PedidoSemanaBodega.EstadoPedidoSemana estadoEnum = PedidoSemanaBodega.EstadoPedidoSemana.valueOf(key);
        newReceta.setEstadoReceta(estadoEnum);

        newReceta.setDescripcionReceta((request.getDescripcionReceta() == null || request.getDescripcionReceta().isBlank())
                ? null : StringUtils.normalizeSpaces(request.getDescripcionReceta()));

        newReceta.setInstruccionesReceta((request.getInstrucciones() == null || request.getInstrucciones().isBlank())
                ? null : StringUtils.normalizeSpaces(request.getInstrucciones()));

        PedidoSemanaBodega recetaGuardada = recetaRepository.save(newReceta);

        Map<Integer, BigDecimal> itemsConsolidados = new HashMap<>();

        for (RecipeItemDTO item : request.getListaItems()) {
            // merge: Si el ID no existe, lo pone. Si existe, aplica la suma (BigDecimal::add)
            itemsConsolidados.merge(
                    item.getIdProducto(),
                    item.getCantUnidadMedida(),
                    BigDecimal::add
            );
        }
        itemsConsolidados.forEach((idProducto, cantidadTotal) -> {
            DetallePedidoSemanaBodega detalle = new DetallePedidoSemanaBodega();

            // Asociamos usando el objeto guardado (para el ID)
            detalle.setReceta(recetaGuardada);

            // Usamos setProductoById para evitar un SELECT innecesario del objeto Producto
            detalle.setProductoById(idProducto);

            detalle.setCantProducto(cantidadTotal);

            detallePedidoSemanaBodegaRepository.save(detalle);
        });
        return true;
    }

    /** Cambia el estado de la receta entre ACTIVO e INACTIVO directamente en BD sin cargar el objeto. */
    @Transactional
    @Override
    public boolean changeStatus(Integer idReceta) {
        int rowsAffected = recetaRepository.toggleRecipeStatus(idReceta);
        if (rowsAffected == 0) {
            throw new PedidoSemanaBodegaException(
                    "No se pudo cambiar el estado: La receta con ID " + idReceta + " no existe.",
                    HttpStatus.NOT_FOUND
            );
        }
        return rowsAffected > 0;
    }

    /** Actualiza la receta y sincroniza sus detalles procesando eliminaciones, modificaciones y nuevos ingredientes. */
    @Transactional()
    @Override
    public boolean updateRecipeWithDetails (RecipeWithDetailsUpdateDTO request) {
        /**Validar existencia de la receta obtenendo el objeto*/
        PedidoSemanaBodega oldRecipe = findById(request.getIdReceta());
        /**Parsear String y validar cambios*/
        String nombreReceta = StringUtils.capitalizarPalabras(request.getNombreReceta());
        if (!nombreReceta.equals(request.getNombreReceta())
                && recetaRepository.existsByNombreRecetaAndActivoRecetaTrue(nombreReceta)) {
            throw new PedidoSemanaBodegaException("Ya existe una receta con el nombre : " + nombreReceta
                    , HttpStatus.CONFLICT);
        } else {
            oldRecipe.setNombreReceta(nombreReceta);
        }
        /**Parsear String y validar cambios*/
        String descripcion = (request.getDescripcionReceta() != null)
                ? StringUtils.normalizeSpaces(request.getDescripcionReceta())
                : null;
        if (!Objects.equals(descripcion, oldRecipe.getDescripcionReceta())) {
            oldRecipe.setDescripcionReceta(descripcion);
        }
        /**Parsear String y validar cambios*/
        String instruciones = (request.getInstruccionesReceta() != null)
                ? StringUtils.normalizeSpaces(request.getInstruccionesReceta())
                : null;
        if (!Objects.equals(instruciones, oldRecipe.getInstruccionesReceta())) {
            oldRecipe.setInstruccionesReceta(instruciones);
        }
        /** Validar y setear el estado */
        String keyEstado = StringUtils.normalizeToEnumKey(request.getEstadoReceta());
        PedidoSemanaBodega.EstadoPedidoSemana nuevoEstado = PedidoSemanaBodega.EstadoPedidoSemana.valueOf(keyEstado);

        if (oldRecipe.getEstadoReceta() != nuevoEstado) {
            oldRecipe.setEstadoReceta(nuevoEstado);
        }
        /**Update Recipe Head*/
        recetaRepository.save(oldRecipe);

        /**Obtener detalles de la receta*/
        List<DetailsByUpdateView> rows = detallePedidoSemanaBodegaRepository.findDetailsForUpdate(request.getIdReceta());
        if (rows.isEmpty()){
            throw new PedidoSemanaBodegaException("La receta no tiene detalles anteriores, error al crear una receta!"
            ,HttpStatus.NOT_FOUND);
        }

        Map<Integer, DetailsByUpdateRec> currentMap = rows.stream()
                .collect(Collectors.toMap(
                        DetailsByUpdateView::getIdProducto,
                        row -> new DetailsByUpdateRec(
                                row.getIdDetalle(),
                                row.getIdProducto(),
                                row.getCantidad()
                        )
                ));

        /** --- PROCESAMIENTO DE DELTAS ---*/

        /**llama metodo que retorna la cantidad de itens eliminados*/
        int deleted = processDeletions(request.getIdReceta(), request.getDeleteItems(), currentMap);

        /**llama el metodo que retorna la cantidad de itens modificados*/
        int updated = processUpdates(request.getIdReceta(), request.getUpdateItems(), currentMap);

        /**llama el metodo que retorna la cantidad de intes creados*/
        int created = processNewItems(request.getIdReceta(), request.getNewItems(), currentMap);

        /**logo para validaciones*/
        log.info("Sincronización finalizada para PedidoSemanaBodega {}: [Borrados: {}, Actualizados: {}, Creados: {}]",
                request.getIdReceta(), deleted, updated, created);

        return true;
    }

    /** Realiza el borrado lógico de la receta desactivándola directamente en BD. */
    @Transactional
    @Override
    public boolean softDeleteRecipeWithDetails(Integer idReceta) {
        int rowsAffected = recetaRepository.softDeleteRecipeById(idReceta);
        if (rowsAffected > 0) {
            log.info("🚫 PedidoSemanaBodega ID {} desactivada exitosamente.", idReceta);
            return true;
        }
        return false;
    }

    /** Procesa y elimina los ingredientes desmarcados en el frontend, validando que pertenezcan a la receta. */
    private int processDeletions(Integer idReceta, List<Integer> idsToDelete, Map<Integer, DetailsByUpdateRec> currentMap) {
        if (idsToDelete == null || idsToDelete.isEmpty()) {
            return 0;
        }

        for (Integer idProd : idsToDelete) {
            if (!currentMap.containsKey(idProd)) {
                throw new PedidoSemanaBodegaException("El producto con ID " + idProd + " no pertenece a esta receta.",
                        HttpStatus.BAD_REQUEST);
            }
        }

        int rowsDeleted = detallePedidoSemanaBodegaRepository.deleteByRecetaAndProductoIds(idReceta, idsToDelete);

        /***/
        if (rowsDeleted > 0) {
            idsToDelete.forEach(currentMap::remove);
            log.info("🗑️ Se eliminaron {} ingredientes de la receta ID {}", rowsDeleted, idReceta);
        }

        return rowsDeleted;
    }

    /** Actualiza las cantidades de ingredientes modificados, solo si el valor cambió realmente. */
    private int processUpdates(Integer idReceta, List<RecipeItemDTO> itemsToUpdate, Map<Integer, DetailsByUpdateRec> currentMap) {
        if (itemsToUpdate == null || itemsToUpdate.isEmpty()) {
            return 0;
        }

        int totalUpdated = 0;
        for (RecipeItemDTO item : itemsToUpdate) {
            // Validación: Solo actualizamos si el producto existe actualmente en la receta
            if (currentMap.containsKey(item.getIdProducto())) {

                // Solo ejecutamos el SQL si la cantidad es realmente diferente a la actual en la DB
                if (currentMap.get(item.getIdProducto()).cantidad().compareTo(item.getCantUnidadMedida()) != 0) {
                    totalUpdated += detallePedidoSemanaBodegaRepository.updateQuantityByRecipeAndProduct(
                            idReceta,
                            item.getIdProducto(),
                            item.getCantUnidadMedida()
                    );
                }
            } else {
                // Seguridad: Si el front intenta actualizar algo que no existe, lanzamos error
                throw new PedidoSemanaBodegaException("El producto ID " + item.getIdProducto() + " no existe en esta receta para ser actualizado.",
                        HttpStatus.BAD_REQUEST);
            }
        }

        if (totalUpdated > 0) {
            log.info("✏️ Se actualizaron cantidades para {} ingredientes", totalUpdated);
        }

        return totalUpdated;
    }

    /** Agrega nuevos ingredientes a la receta, validando que no existan previamente. */
    private int processNewItems(Integer idReceta, List<RecipeItemDTO> newItems, Map<Integer, DetailsByUpdateRec> currentMap) {
        if (newItems == null || newItems.isEmpty()) {
            return 0;
        }

        List<DetallePedidoSemanaBodega> entitiesToSave = new ArrayList<>();

        for (RecipeItemDTO item : newItems) {
            /***/
            if (currentMap.containsKey(item.getIdProducto())) {
                throw new PedidoSemanaBodegaException("El producto ID " + item.getIdProducto() + " ya existe en la receta. Use la lista de actualización.",
                        HttpStatus.BAD_REQUEST);
            }

            DetallePedidoSemanaBodega nuevoDetalle = new DetallePedidoSemanaBodega();
            nuevoDetalle.setRecetaById(idReceta);
            nuevoDetalle.setProductoById(item.getIdProducto());
            nuevoDetalle.setCantProducto(item.getCantUnidadMedida());

            entitiesToSave.add(nuevoDetalle);
        }

        /***/
        if (!entitiesToSave.isEmpty()) {
            List<DetallePedidoSemanaBodega> saved = detallePedidoSemanaBodegaRepository.saveAll(entitiesToSave);
            log.info("➕ Se agregaron {} nuevos ingredientes a la receta ID {}", saved.size(), idReceta);
            return saved.size();
        }

        return 0;
    }

}
