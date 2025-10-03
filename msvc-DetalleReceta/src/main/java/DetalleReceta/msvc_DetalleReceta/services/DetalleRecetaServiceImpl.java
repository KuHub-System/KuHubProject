package DetalleReceta.msvc_DetalleReceta.services;


import DetalleReceta.msvc_DetalleReceta.clients.ProductoClientRest;
import DetalleReceta.msvc_DetalleReceta.clients.RecetaClientRest;
import DetalleReceta.msvc_DetalleReceta.dtos.DetalleRecetaIUpdateQuantityRequestDTO;
import DetalleReceta.msvc_DetalleReceta.dtos.DetalleRecetaResponseDTO;
import DetalleReceta.msvc_DetalleReceta.exceptions.DetalleRecetaException;
import DetalleReceta.msvc_DetalleReceta.exceptions.DetalleRecetaNotFoundException;
import DetalleReceta.msvc_DetalleReceta.exceptions.ProductoClientException;
import DetalleReceta.msvc_DetalleReceta.exceptions.RecetaNotFoundException;
import DetalleReceta.msvc_DetalleReceta.models.entities.DetalleReceta;
import DetalleReceta.msvc_DetalleReceta.models.Producto;
import DetalleReceta.msvc_DetalleReceta.models.Receta;
import DetalleReceta.msvc_DetalleReceta.repositories.DetalleRecetaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DetalleRecetaServiceImpl implements DetalleRecetaService {

    @Autowired
    private DetalleRecetaRepository detalleRecetaRepository;

    @Autowired
    private RecetaClientRest recetaClientRest;

    @Autowired
    private ProductoClientRest productoClientRest;

    @Transactional
    @Override
    public DetalleReceta findByIdDetalleReceta(Long idDetalleReceta){
        return detalleRecetaRepository.findById(idDetalleReceta).orElseThrow(
                () -> new DetalleRecetaNotFoundException(idDetalleReceta));
    }

    @Transactional
    @Override
    public List<DetalleReceta> findAllDetalleRecetas() {
        return detalleRecetaRepository.findAll();
    }

    // Listar con Detalle DTO
    @Transactional(readOnly = true)
    @Override
    public List<DetalleRecetaResponseDTO> findAllDetalleRecetasConDetalles() {
        List<DetalleReceta> detalles = detalleRecetaRepository.findAll();

        if (detalles.isEmpty()) {
            throw new DetalleRecetaException("No hay detalles de receta registrados");
        }

        List<DetalleRecetaResponseDTO> responseDTOs = new ArrayList<>();
        Map<Long, Producto> cacheProductos = new HashMap<>();

        for (DetalleReceta d : detalles) {
            Producto p = cacheProductos.computeIfAbsent(d.getIdProducto(), id -> {
                try {
                    Producto producto = productoClientRest.findProductoById(id).getBody();
                    if (producto == null) {
                        throw new DetalleRecetaException(id);
                    }
                    return producto;
                } catch (Exception e) {
                    throw new ProductoClientException(id, e);
                }
            });

            responseDTOs.add(new DetalleRecetaResponseDTO(
                    d.getIdDetalleReceta(),
                    d.getIdReceta(),
                    d.getIdProducto(),
                    p.getNombreProducto(),
                    p.getUnidadMedida(),
                    d.getCantidadDetalleReceta()
            ));
        }
        return responseDTOs;
    }

    @Override
    public boolean existProductoInDetalleReceta(Long idProducto){
        return detalleRecetaRepository.existsByIdProducto(idProducto);
    }

    //Lista todos detalles de una id recete con detalles DTO
    @Transactional
    @Override
    public List<DetalleRecetaResponseDTO> findAllByIdRecetaConDetalles(Long idReceta) {
        if(!detalleRecetaRepository.existsByIdReceta(idReceta)){
            throw new DetalleRecetaNotFoundException(idReceta);
        }
        List<DetalleReceta> detalleReceta = detalleRecetaRepository.findAllByIdReceta(idReceta);
        List<DetalleRecetaResponseDTO> responseDTOs = new ArrayList<>();
        for (DetalleReceta d : detalleReceta) {

            Producto p = productoClientRest.findProductoById(d.getIdProducto()).getBody();
            assert p != null;

            responseDTOs.add(new DetalleRecetaResponseDTO(
                    d.getIdDetalleReceta(),
                    d.getIdReceta(),
                    p.getIdProducto(),
                    p.getNombreProducto(),
                    p.getUnidadMedida(),
                    d.getCantidadDetalleReceta()
            ));
        }
        return responseDTOs;

    }

    @Transactional(readOnly = true)
    @Override
    public DetalleRecetaResponseDTO findByIdRecetasConDetalles(Long idDetalleReceta) {
        DetalleReceta detalle = detalleRecetaRepository.findById(idDetalleReceta)
                .orElseThrow(() ->new DetalleRecetaNotFoundException(idDetalleReceta));

        Producto producto;
        try {
            producto = productoClientRest.findProductoById(detalle.getIdProducto()).getBody();
        } catch (Exception e) {
            throw new ProductoClientException(detalle.getIdProducto(), e);
        }
        assert producto != null;
        return new DetalleRecetaResponseDTO(
                detalle.getIdDetalleReceta(),
                detalle.getIdReceta(),
                detalle.getIdProducto(),
                producto.getNombreProducto(),
                producto.getUnidadMedida(),
                detalle.getCantidadDetalleReceta()
        );
    }


    @Transactional
    @Override
    public boolean existsByIdReceta(Long idReceta) {
        return detalleRecetaRepository.existsByIdReceta(idReceta);
    }

    @Transactional
    @Override
    public DetalleReceta saveDetalleReceta(DetalleReceta detalleReceta) {

        try {
            Receta receta= recetaClientRest.findByIdReceta(detalleReceta.getIdReceta());
        }catch (Exception e){
            throw new DetalleRecetaException("Receta no encontrada");
        }

        try{
            Producto producto = productoClientRest.findProductoById(detalleReceta.getIdProducto()).getBody();
        }catch (Exception e){
            throw new ProductoClientException("Producto no encontrado");
        }

        if (detalleReceta.getCantidadDetalleReceta() <= 0){
            throw new DetalleRecetaException("La cantidad de unidad medida no puede ser menor a 0");
        }


        return detalleRecetaRepository.save(detalleReceta);
    }

    @Transactional
    @Override
    public List<DetalleReceta> saveAll(String nombreReceta, List<DetalleReceta> detalleRecetas) {

        // 1. Validar que la lista no esté vacía
        if (detalleRecetas == null || detalleRecetas.isEmpty()) {
            throw new DetalleRecetaException("La lista de detalles no puede estar vacía");
        }

        // 2. Verificar que la receta existe y obtener su ID
        Receta receta;
        try {
            receta = this.recetaClientRest.findByNombreReceta(nombreReceta);
        } catch (Exception e) {
            throw new DetalleRecetaException("Receta no encontrada: " + nombreReceta);
        }

        Long idReceta = receta.getIdReceta();

        // 3. Validar cada detalle antes de guardar
        List<DetalleReceta> detallesValidados = new ArrayList<>();
        Map<Long, Producto> cacheProductos = new HashMap<>();

        for (DetalleReceta detalle : detalleRecetas) {
            // Asignar el ID de la receta
            detalle.setIdReceta(idReceta);

            // Validar cantidad
            if (detalle.getCantidadDetalleReceta() == null || detalle.getCantidadDetalleReceta() <= 0) {
                throw new DetalleRecetaException(
                        "La cantidad debe ser mayor a 0 para el producto ID: " + detalle.getIdProducto()
                );
            }

            // Verificar que el producto existe (usando caché para evitar múltiples llamadas)
            Producto producto = cacheProductos.computeIfAbsent(detalle.getIdProducto(), id -> {
                try {
                    Producto p = productoClientRest.findProductoById(id).getBody();
                    if (p == null) {
                        throw new ProductoClientException("Producto con ID " + id + " no encontrado");
                    }
                    return p;
                } catch (Exception e) {
                    throw new ProductoClientException(id, e);
                }
            });

            detallesValidados.add(detalle);
        }

        // 4. Guardar todos los detalles
        return detalleRecetaRepository.saveAll(detallesValidados);
    }

    @Transactional
    @Override
    public DetalleReceta detalleRecetaUpdateQuantity(Long id, DetalleRecetaIUpdateQuantityRequestDTO quantityRequest){

        DetalleReceta detalleReceta = detalleRecetaRepository.findById(id).orElseThrow(
                ()-> new DetalleRecetaNotFoundException(id));

        if (quantityRequest.getCantidadDetalleReceta() == null || quantityRequest.getCantidadDetalleReceta() <= 0) {
            throw new DetalleRecetaException("La cantidad debe ser un número positivo");
        }

        detalleReceta.setCantidadDetalleReceta(quantityRequest.getCantidadDetalleReceta());
        return detalleRecetaRepository.save(detalleReceta);
    }

    @Transactional
    @Override
    public void deletarTodoByIdReceta (Long idReceta){
        // Verificar si la receta existe en la BD
        if (!detalleRecetaRepository.existsById(idReceta)) {
            throw new RecetaNotFoundException(idReceta);
        }

        // Verificar si tiene detalles
        if (!detalleRecetaRepository.existsByIdReceta(idReceta)) {
            throw new DetalleRecetaException("La receta con id " + idReceta + " no tiene detalles asociados.");
        }

        // Eliminar todos los detalles de la receta
        detalleRecetaRepository.deleteByIdReceta(idReceta);
    }

    @Transactional
    @Override
    public void deleteByidDetalleReceta(Long idDetalleReceta) {
        if (!detalleRecetaRepository.existsById(idDetalleReceta)) {
            throw new DetalleRecetaException("Detalle de receta con el id " + idDetalleReceta + " no encontrado");
        }
        detalleRecetaRepository.deleteById(idDetalleReceta);
    }

    @Transactional
    @Override
    public List<DetalleRecetaResponseDTO> AsociarProductosAReceta(String nombreReceta){

        try{
            Receta receta = this.recetaClientRest.findByNombreReceta(nombreReceta);
            return findAllByIdRecetaConDetalles(receta.getIdReceta());
        }catch (Exception e){
            throw new DetalleRecetaException("Receta no encontrada");
        }


    }
}
