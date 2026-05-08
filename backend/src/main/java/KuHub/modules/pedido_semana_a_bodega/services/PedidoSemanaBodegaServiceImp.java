package KuHub.modules.pedido_semana_a_bodega.services;

import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.entity.Producto;
import KuHub.modules.gestion_inventario.repository.ProductoRepository;
import KuHub.modules.gestion_inventario.services.ProductoService;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.CountPedidoSemanaBodegaAndStatusView;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.dto.PedidoSemanaBodegaItemDTO;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.dto.PedidoSemanaBodegaWithDetailsCreateDTO;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection.DetailsByUpdateView;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection.PedidoSemanaBodegaWithDetailsView;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.record.DetailsByUpdateRec;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.record.ImportarExcelResultado;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.record.PedidoSemanaBodegasPage;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.PedidoSemanaBodegaWithDetailsUpdateDTO;
import KuHub.modules.pedido_semana_a_bodega.entity.DetallePedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.entity.PedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.exceptions.PedidoSemanaBodegaException;
import KuHub.modules.pedido_semana_a_bodega.repository.DetallePedidoSemanaBodegaRepository;
import KuHub.modules.pedido_semana_a_bodega.repository.PedidoSemanaBodegaRepository;
import KuHub.utils.PaginationUtils;
import KuHub.utils.StringUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class PedidoSemanaBodegaServiceImp implements PedidoSemanaBodegaService{

    /**Repositories*/
    @Autowired
    private PedidoSemanaBodegaRepository recetaRepository;

    @Autowired
    private DetallePedidoSemanaBodegaRepository detallePedidoSemanaBodegaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    /**Services*/
    @Autowired
    private ProductoService productoService;

    /**Others*/
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
    public CountPedidoSemanaBodegaAndStatusView countRecipesAndStatus() {
        return recetaRepository.countRecipesAndStatus();
    }

    /** Lista todas las recetas activas paginadas con sus detalles e ingredientes. */
    @Transactional(readOnly = true)
    @Override
    public PedidoSemanaBodegasPage findAllRecipesPaginated(Integer pageRequested, Integer idSemana) {
        long totalRecords = idSemana != null
                ? recetaRepository.countByActivoTrueAndIdSemana(idSemana)
                : recetaRepository.countByActivoTrue();
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(pageRequested, totalRecords);

        List<PedidoSemanaBodegaWithDetailsView> rows = idSemana != null
                ? recetaRepository.findAllWithDetailsPagingByIdSemana(idSemana, paging.limit(), paging.offset())
                : recetaRepository.findAllWithDetailsPaging(paging.limit(), paging.offset());

        return PedidoSemanaBodegasPage.of(rows, paging, objectMapper);
    }

    /** Lista recetas paginadas filtradas por nombre o descripción. */
    @Transactional(readOnly = true)
    @Override
    public PedidoSemanaBodegasPage findAllWithDetailsAndSearchPaging(SearchDTO searchDto) {
        String term = (searchDto.getTerm() == null) ? "" : searchDto.getTerm().trim();
        int page = (searchDto.getPage() == null || searchDto.getPage() < 1) ? 1 : searchDto.getPage();
        Integer idSemana = searchDto.getIdSemana();

        long totalRecords = idSemana != null
                ? recetaRepository.countWithSearchAndIdSemana(term, idSemana)
                : recetaRepository.countWithSearch(term);
        PaginationUtils.PagingResult paging = PaginationUtils.buildPaging(page, totalRecords);

        List<PedidoSemanaBodegaWithDetailsView> rows = idSemana != null
                ? recetaRepository.findAllWithDetailsAndSearchByIdSemana(term, idSemana, paging.limit(), paging.offset())
                : recetaRepository.findAllWithDetailsAndSearch(term, paging.limit(), paging.offset());
        return PedidoSemanaBodegasPage.of(rows, paging, objectMapper);
    }


    /** Crea una receta con sus detalles de ingredientes, consolidando duplicados sumando cantidades. */
    @Transactional
    @Override
    public boolean saveRecipeWithDetails(PedidoSemanaBodegaWithDetailsCreateDTO request) {
        String nombreReceta = StringUtils.capitalizarPalabras(request.getNombrePedido());

        if (recetaRepository.existsByNombrePedidoAndActivoTrue(nombreReceta)) {
            throw new PedidoSemanaBodegaException("Ya existe una receta activa con el nombre: " + nombreReceta,
                    HttpStatus.CONFLICT);
        }

        PedidoSemanaBodega newReceta = new PedidoSemanaBodega();
        newReceta.setNombrePedido(nombreReceta);
        String key = StringUtils.normalizeToEnumKey(request.getEstadoPedido());
        PedidoSemanaBodega.EstadoPedidoSemana estadoEnum = PedidoSemanaBodega.EstadoPedidoSemana.valueOf(key);
        newReceta.setEstadoPedido(estadoEnum);

        newReceta.setDescripcionPedido((request.getDescripcionPedido() == null || request.getDescripcionPedido().isBlank())
                ? null : StringUtils.normalizeSpaces(request.getDescripcionPedido()));

        newReceta.setIdSemana(request.getIdSemana());

        PedidoSemanaBodega recetaGuardada = recetaRepository.save(newReceta);

        // Usar clase interna para mantener cantidad y observación
        class ItemConsolidado {
            BigDecimal cantidad;
            String observacion;
            ItemConsolidado(BigDecimal cant, String obs) {
                this.cantidad = cant;
                this.observacion = obs;
            }
        }

        Map<Integer, ItemConsolidado> itemsConsolidados = new HashMap<>();

        for (PedidoSemanaBodegaItemDTO item : request.getListaItems()) {
            itemsConsolidados.compute(
                    item.getIdProducto(),
                    (prodKey, existing) -> {
                        if (existing == null) {
                            return new ItemConsolidado(item.getCantUnidadMedida(), item.getObservacion());
                        } else {
                            existing.cantidad = existing.cantidad.add(item.getCantUnidadMedida());
                            // Mantener la observación del último item si existe
                            if (item.getObservacion() != null && !item.getObservacion().isBlank()) {
                                existing.observacion = item.getObservacion();
                            }
                            return existing;
                        }
                    }
            );
        }
        itemsConsolidados.forEach((idProducto, itemConsolidado) -> {
            DetallePedidoSemanaBodega detalle = new DetallePedidoSemanaBodega();

            // Asociamos usando el objeto guardado (para el ID)
            detalle.setPedidoSemanaBodega(recetaGuardada);

            // Usamos setProductoById para evitar un SELECT innecesario del objeto Producto
            detalle.setProductoById(idProducto);

            detalle.setCantProducto(itemConsolidado.cantidad);

            // Normalizar observación si existe
            String observacionNormalizada = (itemConsolidado.observacion != null && !itemConsolidado.observacion.isBlank())
                    ? StringUtils.normalizeSpaces(itemConsolidado.observacion)
                    : null;
            detalle.setObservacion(observacionNormalizada);

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
    public boolean updateRecipeWithDetails (PedidoSemanaBodegaWithDetailsUpdateDTO request) {
        /**Validar existencia de la receta obtenendo el objeto*/
        PedidoSemanaBodega oldRecipe = findById(request.getIdPedidoSemanaBodega());
        /**Parsear String y validar cambios*/
        String nombreReceta = StringUtils.capitalizarPalabras(request.getNombrePedido());
        if (!nombreReceta.equals(request.getNombrePedido())
                && recetaRepository.existsByNombrePedidoAndActivoTrue(nombreReceta)) {
            throw new PedidoSemanaBodegaException("Ya existe una receta con el nombre : " + nombreReceta
                    , HttpStatus.CONFLICT);
        } else {
            oldRecipe.setNombrePedido(nombreReceta);
        }
        /**Parsear String y validar cambios*/
        String descripcion = (request.getDescripcionPedido() != null)
                ? StringUtils.normalizeSpaces(request.getDescripcionPedido())
                : null;
        if (!Objects.equals(descripcion, oldRecipe.getDescripcionPedido())) {
            oldRecipe.setDescripcionPedido(descripcion);
        }
        /** Validar y setear el estado */
        String keyEstado = StringUtils.normalizeToEnumKey(request.getEstadoPedido());
        PedidoSemanaBodega.EstadoPedidoSemana nuevoEstado = PedidoSemanaBodega.EstadoPedidoSemana.valueOf(keyEstado);

        if (oldRecipe.getEstadoPedido() != nuevoEstado) {
            oldRecipe.setEstadoPedido(nuevoEstado);
        }

        /** Validar y setear el idSemana (opcional) */
        if (!Objects.equals(request.getIdSemana(), oldRecipe.getIdSemana())) {
            oldRecipe.setIdSemana(request.getIdSemana());
        }

        /**Update Recipe Head*/
        recetaRepository.save(oldRecipe);

        /**Obtener detalles de la receta*/
        List<DetailsByUpdateView> rows = detallePedidoSemanaBodegaRepository.findDetailsForUpdate(request.getIdPedidoSemanaBodega());
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
        int deleted = processDeletions(request.getIdPedidoSemanaBodega(), request.getDeleteItems(), currentMap);

        /**llama el metodo que retorna la cantidad de itens modificados*/
        int updated = processUpdates(request.getIdPedidoSemanaBodega(), request.getUpdateItems(), currentMap);

        /**llama el metodo que retorna la cantidad de intes creados*/
        int created = processNewItems(request.getIdPedidoSemanaBodega(), request.getNewItems(), currentMap);

        /**logo para validaciones*/
        log.info("Sincronización finalizada para PedidoSemanaBodega {}: [Borrados: {}, Actualizados: {}, Creados: {}]",
                request.getIdPedidoSemanaBodega(), deleted, updated, created);

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

    /** Parsea un archivo Excel (.xlsx/.xlsm) leyendo filas 12-80, cruza nombres de productos con BD
     *  y retorna resultados separados en encontrados y no encontrados. */
    @Transactional(readOnly = true)
    @Override
    public ImportarExcelResultado importarExcelProductos(MultipartFile archivo, String nombreHoja) {
        if (archivo.isEmpty()) {
            throw new PedidoSemanaBodegaException("El archivo Excel está vacío.", HttpStatus.BAD_REQUEST);
        }

        List<ImportarExcelResultado.ResultadoItem> resultados = new ArrayList<>();

        int numeroSemanaExcel = 0;
        String preparaciones = null;

        try (Workbook workbook = WorkbookFactory.create(archivo.getInputStream())) {
            Sheet sheet;

            if (nombreHoja != null && !nombreHoja.isBlank()) {
                // El usuario seleccionó una hoja por nombre exacto
                sheet = workbook.getSheet(nombreHoja);
                if (sheet == null) {
                    throw new PedidoSemanaBodegaException(
                        "No se encontró la hoja '" + nombreHoja + "' en el archivo Excel.",
                        HttpStatus.BAD_REQUEST
                    );
                }
            } else {
                // Sin selección: usar la hoja activa
                int activeIdx = workbook.getActiveSheetIndex();
                sheet = workbook.getSheetAt(activeIdx);
            }

            // Extraer número de semana del nombre de hoja si coincide con "SEMANA (X)"
            java.util.regex.Matcher matcher =
                java.util.regex.Pattern.compile("\\((\\d+)\\)").matcher(sheet.getSheetName());
            if (matcher.find()) {
                numeroSemanaExcel = Integer.parseInt(matcher.group(1));
            }

            DataFormatter formatter = new DataFormatter();
            log.info("[Excel] Hoja seleccionada: '{}'. Semana Excel: {}. Total hojas: {}",
                    sheet.getSheetName(), numeroSemanaExcel, workbook.getNumberOfSheets());

            // Detectar PREPARACIONES en fila 7 Excel (índice 6 POI), col B (índice 1)
            Row prepLabelRow = sheet.getRow(6);
            if (prepLabelRow != null) {
                String etiqueta = getCellText(prepLabelRow.getCell(1), formatter);
                if (etiqueta.toUpperCase().contains("PREPARACIONES")) {
                    Row prepDataRow = sheet.getRow(7);
                    if (prepDataRow != null) {
                        String colB = getCellText(prepDataRow.getCell(1), formatter);
                        String colC = getCellText(prepDataRow.getCell(2), formatter);
                        String combinado = (colB + " " + colC).trim();
                        if (!combinado.isBlank()) {
                            preparaciones = StringUtils.normalizeSpaces(combinado);
                        }
                    }
                }
            }
            log.info("[Excel] Preparaciones detectadas: {}", preparaciones != null ? preparaciones : "(ninguna)");

            // Detectar columna de observación desde la cabecera (fila 11 Excel = índice 10 POI)
            int colObservacion = 4; // fallback: columna E
            Row headerRow = sheet.getRow(10);
            if (headerRow != null) {
                for (int c = 0; c < headerRow.getLastCellNum(); c++) {
                    if (getCellText(headerRow.getCell(c), formatter).toUpperCase().contains("OBSERV")) {
                        colObservacion = c;
                        log.info("[Excel] Columna de observación detectada en índice {} (col {})",
                                c, (char) ('A' + c));
                        break;
                    }
                }
            }

            int filaInicio = 11; // Fila 12 en Excel (índice 0-based)
            int filaFin    = 79; // Fila 80 en Excel (índice 0-based)

            for (int i = filaInicio; i <= filaFin; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String celdaA = getCellText(row.getCell(0), formatter);
                String celdaB = getCellText(row.getCell(1), formatter);
                String celdaC = getCellText(row.getCell(2), formatter);

                // Si A, B y C están todos vacíos → ignorar fila
                if (celdaA.isBlank() && celdaB.isBlank() && celdaC.isBlank()) continue;

                String nombreExcel        = celdaB.trim();
                String nombreParaBusqueda = StringUtils.capitalizarPalabras(celdaB);
                BigDecimal cantidad       = parseCantidad(row.getCell(3));

                String observacion = null;
                String celdaObs = getCellText(row.getCell(colObservacion), formatter);
                if (!celdaObs.isBlank()) {
                    observacion = StringUtils.normalizeSpaces(celdaObs);
                }

                int filaNumero = i + 1;

                log.info("[Excel] Fila {}: excel='{}' → busqueda='{}' | cantidad={} | obs={}",
                        filaNumero, nombreExcel, nombreParaBusqueda, cantidad, observacion);

                Optional<Producto> productoOpt =
                        productoRepository.findByNombreProductoAndActivo(nombreParaBusqueda, true);

                if (productoOpt.isEmpty()) {
                    log.info("[Excel] Fila {} '{}': NO ENCONTRADO en BD.", filaNumero, nombreParaBusqueda);
                    resultados.add(new ImportarExcelResultado.ResultadoItem(
                            filaNumero, nombreExcel, null, null, null,
                            cantidad, observacion, "no_encontrado"
                    ));
                } else {
                    Producto producto = productoOpt.get();
                    log.info("[Excel] Fila {} '{}': OK → id={}, nombre='{}'",
                            filaNumero, nombreParaBusqueda, producto.getIdProducto(), producto.getNombreProducto());
                    resultados.add(new ImportarExcelResultado.ResultadoItem(
                            filaNumero,
                            nombreExcel,
                            producto.getIdProducto(),
                            producto.getNombreProducto(),
                            producto.getUnidadMedida().getNombreUnidad(),
                            cantidad,
                            observacion,
                            "ok"
                    ));
                }
            }
        } catch (IOException e) {
            log.error("Error al leer el archivo Excel: {}", e.getMessage());
            throw new PedidoSemanaBodegaException("No se pudo procesar el archivo Excel.", HttpStatus.BAD_REQUEST);
        }

        long totalOk             = resultados.stream().filter(r -> "ok".equals(r.estado())).count();
        long totalNoEncontrados  = resultados.stream().filter(r -> "no_encontrado".equals(r.estado())).count();

        log.info("[Excel] Importación finalizada: {} encontrados, {} no encontrados.", totalOk, totalNoEncontrados);
        if (totalNoEncontrados > 0) {
            List<String> nombres = resultados.stream()
                    .filter(r -> "no_encontrado".equals(r.estado()))
                    .map(ImportarExcelResultado.ResultadoItem::nombreExcel)
                    .toList();
            log.info("[Excel] No encontrados: {}", nombres);
        }

        return new ImportarExcelResultado(resultados, (int) totalOk, (int) totalNoEncontrados, numeroSemanaExcel, preparaciones);
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

    /** Actualiza las cantidades y observaciones de ingredientes modificados, solo si el valor cambió realmente. */
    private int processUpdates(Integer idReceta, List<PedidoSemanaBodegaItemDTO> itemsToUpdate, Map<Integer, DetailsByUpdateRec> currentMap) {
        if (itemsToUpdate == null || itemsToUpdate.isEmpty()) {
            return 0;
        }

        int totalUpdated = 0;
        for (PedidoSemanaBodegaItemDTO item : itemsToUpdate) {
            // Validación: Solo actualizamos si el producto existe actualmente en la receta
            if (currentMap.containsKey(item.getIdProducto())) {
                DetailsByUpdateRec current = currentMap.get(item.getIdProducto());

                // Solo ejecutamos el SQL si la cantidad es realmente diferente a la actual en la DB
                if (current.cantidad().compareTo(item.getCantUnidadMedida()) != 0) {
                    totalUpdated += detallePedidoSemanaBodegaRepository.updateQuantityByRecipeAndProduct(
                            idReceta,
                            item.getIdProducto(),
                            item.getCantUnidadMedida()
                    );
                }

                // Actualizar observación si fue proporcionada
                if (item.getObservacion() != null && !item.getObservacion().isBlank()) {
                    String observacionNormalizada = StringUtils.normalizeSpaces(item.getObservacion());
                    totalUpdated += detallePedidoSemanaBodegaRepository.updateObservacionByRecipeAndProduct(
                            idReceta,
                            item.getIdProducto(),
                            observacionNormalizada
                    );
                }
            } else {
                // Seguridad: Si el front intenta actualizar algo que no existe, lanzamos error
                throw new PedidoSemanaBodegaException("El producto ID " + item.getIdProducto() + " no existe en esta receta para ser actualizado.",
                        HttpStatus.BAD_REQUEST);
            }
        }

        if (totalUpdated > 0) {
            log.info("✏️ Se actualizaron {} ingredientes", totalUpdated);
        }

        return totalUpdated;
    }

    /** Agrega nuevos ingredientes a la receta, validando que no existan previamente. */
    private int processNewItems(Integer idReceta, List<PedidoSemanaBodegaItemDTO> newItems, Map<Integer, DetailsByUpdateRec> currentMap) {
        if (newItems == null || newItems.isEmpty()) {
            return 0;
        }

        List<DetallePedidoSemanaBodega> entitiesToSave = new ArrayList<>();

        for (PedidoSemanaBodegaItemDTO item : newItems) {
            if (currentMap.containsKey(item.getIdProducto())) {
                throw new PedidoSemanaBodegaException("El producto ID " + item.getIdProducto() + " ya existe en la receta. Use la lista de actualización.",
                        HttpStatus.BAD_REQUEST);
            }

            DetallePedidoSemanaBodega nuevoDetalle = new DetallePedidoSemanaBodega();
            nuevoDetalle.setPedidoSemanaBodegaById(idReceta);
            nuevoDetalle.setProductoById(item.getIdProducto());
            nuevoDetalle.setCantProducto(item.getCantUnidadMedida());

            // Normalizar observación si existe
            String observacionNormalizada = (item.getObservacion() != null && !item.getObservacion().isBlank())
                    ? StringUtils.normalizeSpaces(item.getObservacion())
                    : null;
            nuevoDetalle.setObservacion(observacionNormalizada);

            entitiesToSave.add(nuevoDetalle);
        }

        if (!entitiesToSave.isEmpty()) {
            List<DetallePedidoSemanaBodega> saved = detallePedidoSemanaBodegaRepository.saveAll(entitiesToSave);
            log.info("➕ Se agregaron {} nuevos ingredientes a la receta ID {}", saved.size(), idReceta);
            return saved.size();
        }

        return 0;
    }

    /** Retorna el texto de una celda como String, usando DataFormatter para manejar tipos numéricos y fórmulas. */
    private String getCellText(Cell cell, DataFormatter formatter) {
        if (cell == null) return "";
        return formatter.formatCellValue(cell).trim();
    }

    /** Parsea la cantidad de la columna D desde celdas numéricas o texto con coma decimal (es-CL). */
    private BigDecimal parseCantidad(Cell cell) {
        if (cell == null) return null;
        CellType type = cell.getCellType() == CellType.FORMULA
                ? cell.getCachedFormulaResultType()
                : cell.getCellType();
        if (type == CellType.NUMERIC) {
            return BigDecimal.valueOf(cell.getNumericCellValue())
                    .setScale(3, RoundingMode.HALF_UP);
        }
        if (type == CellType.STRING) {
            String val = cell.getStringCellValue().trim()
                    .replace(".", "")
                    .replace(",", ".");
            try {
                return new BigDecimal(val).setScale(3, RoundingMode.HALF_UP);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

}
