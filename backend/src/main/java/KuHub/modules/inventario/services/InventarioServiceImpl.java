package KuHub.modules.inventario.services;

import KuHub.modules.inventario.dtos.InventoryWithProductCreateRequestDTO;
import KuHub.modules.inventario.dtos.InventoryWithProductoResponseViewDTO;
import KuHub.modules.inventario.entity.Inventario;
import KuHub.modules.inventario.exceptions.InventarioException;
import KuHub.modules.inventario.repository.InventarioRepository;
import KuHub.modules.producto.entity.Producto;
import KuHub.modules.producto.service.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class InventarioServiceImpl implements InventarioService {

    @Autowired
    private InventarioRepository inventarioRepository;

    @Autowired
    private ProductoService productoService;

    @Transactional
    public void syncSeq() {
        Long nuevoValor = inventarioRepository.syncSeq();
        System.out.println("Secuencia de inventario sincronizada. Nuevo valor: " + nuevoValor);
    }

    @Transactional
    @Override
    public List<Inventario> findAll() {
        return inventarioRepository.findAll();
    }

    @Transactional
    @Override
    public List<Inventario> findInventoriesWithProductsActive(Boolean activo){
        return inventarioRepository.findInventoriesWithProductsActive(activo);
    }

    @Transactional
    @Override
    public Inventario findById(Long id) {
        return inventarioRepository.findById(id).orElseThrow(
                () -> new InventarioException("No se encontro el producto con el id: " + id)
        );
    }

    @Transactional
    @Override
    public Inventario findByIdInventoryWithProductActive(Long idInventario,Boolean activo){
        return inventarioRepository.findByIdInventoryWithProductActive(idInventario,activo).orElseThrow(
                () -> new InventarioException("No se encontro el producto con el id: " + idInventario)
        );
    }

    @Transactional
    @Override
    public List<InventoryWithProductoResponseViewDTO> findInventariosForNumberPageByFilterCategoria(Long cantidadesPaginasCalculada, String nombreCategoria) {

        // Debug de entrada
        System.out.println("=== DEBUG FIND INVENTARIOS ===");
        System.out.println("numeroPagina: " + cantidadesPaginasCalculada);
        System.out.println("nombreCategoria: '" + nombreCategoria + "'");


        Long startRow = calculaterStartRow(cantidadesPaginasCalculada);

        // Procesar categoría CORRECTAMENTE
        String categoria = (nombreCategoria == null || "null".equalsIgnoreCase(nombreCategoria) || nombreCategoria.trim().isEmpty())
                ? null
                : nombreCategoria.trim();

        System.out.println("categoria procesada: " + categoria);
        System.out.println("es null?: " + (categoria == null));

        // Ejecutar consulta
        List<InventoryWithProductoResponseViewDTO> resultado = inventarioRepository.findInventariosForNumberPage(startRow, categoria);

        System.out.println("resultado tamaño: " + resultado.size());
        System.out.println("=== FIN DEBUG ===");

        return resultado;
    }

    @Transactional
    @Override
    public List<InventoryWithProductoResponseViewDTO> findInventariosForNumberPageSeachSimilarName(
            Long cantidadesPaginasCalculada,String buscarProductoNombreSimilares  ){
        // Debug de entrada
        System.out.println("=== DEBUG FIND INVENTARIOS ===");
        System.out.println("numeroPagina: " + cantidadesPaginasCalculada);

        Long startRow = calculaterStartRow(cantidadesPaginasCalculada);

        // Ejecutar consulta
        List<InventoryWithProductoResponseViewDTO> resultado = inventarioRepository.findInventoriesInProductsSimilarByNameWithPagination(
                startRow, buscarProductoNombreSimilares
        );

        System.out.println("resultado tamaño: " + resultado.size());
        System.out.println("=== FIN DEBUG ===");

        return resultado;
    }


    @Transactional
    @Override
    public Long countInventoryForPaginationRowsSeachSimilarName(String buscarProductoNombreSimilares){

        //buscar na cantidad total de inventario segun la similitud del nombre
        Long cantidadInventario = inventarioRepository.countAllInventoriesBySimilarName(buscarProductoNombreSimilares).orElseThrow(
                () -> new InventarioException("No hay inventarios con nombre de productos similares a : " + buscarProductoNombreSimilares)
        );

        Long cantidadPaginas = calculaterCountPages(cantidadInventario);

        return calculaterStartRow(cantidadPaginas);
    }

    @Override
    public Long calculaterStartRow(Long numeroPagina) {
        // Definimos el tamaño de la página (debe coincidir con el usado para calcular páginas)
        long pageSize = 10L;

        // Asumimos que el número de página es 1-based (la primera página es la 1).
        // Si el númeroPagina es 1, startRow debe ser 0.

        // Fórmula: (página - 1) * pageSize
        Long startRow = (numeroPagina - 1) * pageSize;

        System.out.println("Página solicitada: " + numeroPagina);
        System.out.println("startRow calculado: " + startRow);

        return startRow;
        /**numeroPagina,Cálculo,Resultado (startRow)
         1,(1−1)×10,0
         2,(2−1)×10,10
         3,(3−1)×10,20*/
    }

    @Transactional
    @Override
    public Long countInventoryForPaginationRowsByCategoria(String nombreCategoria) {

        // 🎯 Convertir a null si está vacío para que la consulta cuente TODO
        String categoriaParam = (nombreCategoria == null || nombreCategoria.trim().isEmpty() || "null".equalsIgnoreCase(nombreCategoria))
                ? null
                : nombreCategoria.trim();

        System.out.println("🔍 Counting with category: " + categoriaParam);

        Long cantidadInventario = inventarioRepository.countAllInventories(categoriaParam)
                .orElseThrow(() -> new InventarioException("No hay inventarios"));

        return calculaterCountPages(cantidadInventario);
    }

    @Override
    public Long calculaterCountPages(Long cantidadInventarios) {
        long pageSize = 10L;
        System.out.println("📊 Total count: " + cantidadInventarios);

        // Aplicamos la fórmula: Math.ceil(Total / TamañoPágina)
        double paginas = Math.ceil((double) cantidadInventarios / pageSize);
        Long cantidadPaginas = (long) paginas;

        System.out.println("📄 Pages calculated: " + cantidadPaginas);
        return cantidadPaginas;

    }

    @Transactional
    @Override
    public Inventario  save (InventoryWithProductCreateRequestDTO inventarioRequest){
        syncSeq();
        //validar que el stock no es negativo
        if (inventarioRequest.getStock() < 0 ){
            throw new InventarioException("El inventario no puede ser negativo");
        }
        //validar que el stock minimo no es negativo
        if (inventarioRequest.getStockMinimo() < 0){
            throw new InventarioException("El estoque minimo no puede ser negativo");
        }

        //crear objeto producto
        Producto producto = new Producto(null,null,null,
                inventarioRequest.getNombreProducto(),inventarioRequest.getCategoria(), inventarioRequest.getUnidadMedida(),
                true,null);
        //la validacion esta en el metodo en service

        //como el metodo retorna el producto, puedo obtener el id para crear el inventario
        Producto newProducto = productoService.save(producto);

        //crear objeto de inventario vazio
        Inventario inventario = new Inventario();
        inventario.setIdProducto(newProducto.getIdProducto());
        inventario.setProducto(newProducto);
        inventario.setStock(inventarioRequest.getStock());
        inventario.setStockLimitMin(inventarioRequest.getStockMinimo());

        return inventarioRepository.save(inventario);
    }

    //HAY QUE CREAR INVENTARIO CON PRODUCTO EXISTENTE PERO ACTUALMENTE NO TIENE ESTA FUNCIONALIDAD DE EL FRONT

    

    //DELETAR INVENTARIO ES DESABILITAR EL PRODUCTO DE ACTIVO TRUE A FALSE, PORQUE SOLAMENTE SE MOSTRAR EL INVENTARIO DE PRODUCTOS EN TRUE
    @Transactional
    @Override
    public void deleteById(Long id) {
        Inventario inventario = inventarioRepository.findById(id).orElseThrow(
                ()-> new InventarioException("No se encontro el producto con el id: " + id)
        );

        if (inventario.getStock() != 0 ){
            new InventarioException("Existe producto disponible en el inventario ");
        }

        //deletar producto logicamente para desabilitar la visualizacion de este producto en el inventario
        productoService.deleteById(inventario.getIdProducto());

    }

}
