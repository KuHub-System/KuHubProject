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

@Service
public class InventarioServiceImpl implements InventarioService {

    @Autowired
    private InventarioRepository inventarioRepository;

    @Autowired
    private ProductoService productoService;

    @Transactional
    public void sincronizarSecuenciaInventario() {
        Long nuevoValor = inventarioRepository.sincronizarSecuencia();
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
    public List<InventoryWithProductoResponseViewDTO> findInventariosForNumberPage(Long numeroPagina, String nombreCategoria) {

        // Debug de entrada
        System.out.println("=== DEBUG FIND INVENTARIOS ===");
        System.out.println("numeroPagina: " + numeroPagina);
        System.out.println("nombreCategoria: '" + nombreCategoria + "'");

        // Calcular startRow CORRECTO: (página - 1) * 10
        Long startRow = (numeroPagina - 1) * 10;
        System.out.println("startRow calculado: " + startRow);

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
    public Long countInventoryForPaginationRows(String nombreCategoria) {

        // 🎯 Convertir a null si está vacío para que la consulta cuente TODO
        String categoriaParam = (nombreCategoria == null || nombreCategoria.trim().isEmpty() || "null".equalsIgnoreCase(nombreCategoria))
                ? null
                : nombreCategoria.trim();

        System.out.println("🔍 Counting with category: " + categoriaParam);

        Long cantidadInventario = inventarioRepository.countAllInventarios(categoriaParam)
                .orElseThrow(() -> new InventarioException("No hay inventarios"));

        System.out.println("📊 Total count: " + cantidadInventario);
        //independente de las decimales redondea hace arriba a entero
        double paginas = Math.ceil((double) cantidadInventario / 10);
        Long cantidadPaginas = (long) paginas;

        System.out.println("📄 Pages calculated: " + cantidadPaginas);

        return cantidadPaginas;
    }

    @Transactional
    @Override
    public Inventario  save (InventoryWithProductCreateRequestDTO inventarioRequest){
        sincronizarSecuenciaInventario();
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
