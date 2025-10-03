package msvc_Inventario.services;

import feign.FeignException;
import jakarta.transaction.Transactional;
import msvc_Inventario.clients.ProductoClientRest;
import msvc_Inventario.dtos.InventarioDTO;
import msvc_Inventario.exception.InventarioException;
import msvc_Inventario.models.Producto;
import msvc_Inventario.models.entities.Inventario;
import msvc_Inventario.repositories.InventarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class InventarioServiceImpl implements InventarioService {

    @Autowired
    private InventarioRepository inventarioRepository;

    @Autowired
    private ProductoClientRest productoClientRest;

    // --- MÉTODOS CRUD ---

    //Checkeado✅
    @Override
    @Transactional
    public InventarioDTO save(InventarioDTO dto) {

        Producto producto = findOrCreateProducto(dto);

        Inventario inventario = this.inventarioRepository.findByIdProducto(producto.getIdProducto())
                .map(existente -> {
                    float nuevoTotal = existente.getTotalInventario() + dto.getTotalInventario();
                    existente.setTotalInventario(nuevoTotal);
                    return existente;
                })
                .orElseGet(() -> new Inventario(
                        producto.getIdProducto(),
                        dto.getUbicacionInventario(),
                        dto.getTotalInventario(),
                        dto.getInicialInventario(),
                        dto.getDevolucionInventario()
                ));

        Inventario inventarioGuardado = this.inventarioRepository.save(inventario);
        return toDto(inventarioGuardado, producto);
    }

    //Checkeado✅
    @Override
    public InventarioDTO findById(Long id) {
        Inventario inventario = this.inventarioRepository.findById(id)
                .orElseThrow(() -> new InventarioException("No se encontró el Inventario con ID: " + id));
        // Se obtiene el producto asociado en una llamada separada para mantener la lógica limpia.
        Producto producto = this.productoClientRest.findProductoById(inventario.getIdProducto());
        return toDto(inventario, producto);
    }

    //Checkeado✅
    @Override
    public List<InventarioDTO> findAll() {
        // Versión optimizada para evitar el problema N+1.
        List<Inventario> inventarios = this.inventarioRepository.findAll();
        if (inventarios.isEmpty()) return Collections.emptyList();

        List<Long> productoIds = inventarios.stream().map(Inventario::getIdProducto).distinct().collect(Collectors.toList());

        // Asumiendo que productoClientRest tiene findProductosByIds(List<Long> ids)
        Map<Long, Producto> productosMap = this.productoClientRest.obtenerPorIds(productoIds)
                .stream()
                .collect(Collectors.toMap(Producto::getIdProducto, p -> p));

        return inventarios.stream()
                .map(inventario -> {
                    Producto producto = productosMap.get(inventario.getIdProducto());
                    return toDto(inventario, producto);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public InventarioDTO update(Long id, InventarioDTO dto) {
        Inventario inventarioExistente = inventarioRepository.findById(id)
                .orElseThrow(() -> new InventarioException("No se encontró el inventario con ID: " + id));

        Producto productoAsociado = productoClientRest.findProductoById(inventarioExistente.getIdProducto());

        inventarioExistente.setUbicacionInventario(dto.getUbicacionInventario());
        inventarioExistente.setTotalInventario(dto.getTotalInventario());
        inventarioExistente.setInicialInventario(dto.getInicialInventario());
        inventarioExistente.setDevolucionInventario(dto.getDevolucionInventario());

        Inventario inventarioActualizado = inventarioRepository.save(inventarioExistente);
        return toDto(inventarioActualizado, productoAsociado);
    }

    @Override
    @Transactional
    public void deleteById(Long id) {
        if (!inventarioRepository.existsById(id)) {
            throw new InventarioException("No se encontró el inventario con ID: " + id + " para eliminar.");
        }
        inventarioRepository.deleteById(id);
    }


    //Checkeado✅
    @Override
    public Inventario getInventarioByIdProducto(Long idProducto) {
        return this.inventarioRepository.findByIdProducto(idProducto)
                .orElseThrow(() -> new InventarioException("No se encontró inventario para el producto con ID: " + idProducto));
    }
    //Checkeado✅
    @Override
    public Producto findProductoByIdInventario(Long idInventario){
        Inventario inventarioPrueba = this.inventarioRepository.findById(idInventario)
                .orElseThrow(()-> new InventarioException("No se encontró el Inventario"));

        return this.productoClientRest.findProductoById(inventarioPrueba.getIdProducto());

    }

    //FALTA PROBAR POSTMAN
    @Transactional
    @Override
    public void updateTotalInventario(Long id, float adjustmentAmount) {
        Inventario inventario = inventarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("No se encontró Inventario con ID: " + id));
        float newTotal = inventario.getTotalInventario() + adjustmentAmount;
        inventario.setTotalInventario(newTotal);
        inventarioRepository.save(inventario);
    }

    private Producto findOrCreateProducto(InventarioDTO dto) {
        // 1. LIMPIAR Y CAPITALIZAR EL NOMBRE ANTES DE HACER CUALQUIER OTRA COSA
        // Se usa exactamente la misma lógica que tienes en el save de ProductoService.
        String nombreLimpio = dto.getNombreProducto().trim();
        String nombreCapitalizado = Arrays.stream(nombreLimpio.split("\\s+"))
                .map(p -> p.substring(0, 1).toUpperCase() + p.substring(1).toLowerCase())
                .collect(Collectors.joining(" "));

        try {
            // 2. BUSCAR USANDO EL NOMBRE YA CAPITALIZADO
            return this.productoClientRest.findProductoByName(nombreCapitalizado);
        } catch (FeignException e) {
            if (e.status() == 404) {
                // 3. SI NO LO ENCUENTRA, CREAR USANDO EL NOMBRE CAPITALIZADO
                Producto nuevoProducto = new Producto(nombreCapitalizado, dto.getUnidadMedida());
                return this.productoClientRest.createProducto(nuevoProducto);
            }
            // Para cualquier otro error de Feign, relanzamos la excepción.
            throw e;
        }
    }

    private InventarioDTO toDto(Inventario inventario, Producto producto) {
        InventarioDTO dto = new InventarioDTO();
        dto.setIdInventario(inventario.getIdInventario());
        dto.setTotalInventario(inventario.getTotalInventario());
        dto.setUbicacionInventario(inventario.getUbicacionInventario());
        dto.setDevolucionInventario(inventario.getDevolucionInventario());
        dto.setInicialInventario(inventario.getInicialInventario());
        if (producto != null) {
            dto.setNombreProducto(producto.getNombreProducto());
            dto.setUnidadMedida(producto.getUnidadMedida());
            dto.setCategoria(producto.getCategoria());
        }
        return dto;
    }
}