package msvc_Movimiento.service;


import msvc_Movimiento.client.InventarioClientRest;
import msvc_Movimiento.dtos.InventarioUpdateDTO;
import msvc_Movimiento.dtos.MovimientoDTO;
import msvc_Movimiento.model.Producto;
import msvc_Movimiento.model.entity.Movimiento;
import msvc_Movimiento.repository.MovimientoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;

@Service
public class MovimientoServiceImpl implements MovimientoService {

    @Autowired
    private MovimientoRepository movimientoRepository;

    @Autowired
    private InventarioClientRest inventarioClient; // Cliente Feign para comunicarse con el microservicio de Inventario

    @Override
    @Transactional
    public MovimientoDTO crearMovimiento(MovimientoDTO dto) {
        // 1. Crear y guardar la entidad Movimiento (esto no cambia)

        Producto productoPrueba = inventarioClient.getProductoByIdInventario(dto.getIdInventario());
        if (productoPrueba == null) {
            throw new RuntimeException("No se puede crear el Movimiento para un Producto Inexistente");
        }

        Movimiento movimiento = new Movimiento();
        movimiento.setIdInventario(dto.getIdInventario());
        movimiento.setIdProducto(productoPrueba.getIdProducto());
        movimiento.setFechaMovimiento(LocalDate.now());
        movimiento.setCantidadMovimiento(dto.getCantidadMovimiento());
        movimiento.setTipoMovimiento(dto.getTipoMovimiento());



        Movimiento nuevoMovimiento = movimientoRepository.save(movimiento);

        // 2. Calcular el ajuste para el inventario (esto no cambia)
        float cantidadAjuste = 0;
        switch (dto.getTipoMovimiento()) {
            case ENTRADA:
            case DEVOLUCION:
                cantidadAjuste = dto.getCantidadMovimiento();
                break;
            case SALIDA:
                cantidadAjuste = -dto.getCantidadMovimiento();
                break;
        }

        // 3. Preparar el DTO y llamar al microservicio de Inventario (ESTA ES LA PARTE ACTUALIZADA)

        // Se crea el objeto DTO que representa el JSON
        InventarioUpdateDTO adjustment = new InventarioUpdateDTO();
        adjustment.setTotalInventario(cantidadAjuste);

        // Se llama al cliente Feign pasando el DTO en el cuerpo de la petición
        inventarioClient.updateTotalInventario(dto.getIdInventario(), adjustment);

        return toDto(nuevoMovimiento);
    }

    @Override
    public List<MovimientoDTO> findByIdInventario(Long idInventario) {
        return movimientoRepository.findAllByIdInventario(idInventario)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<MovimientoDTO> findByIdProducto(Long idproducto){
        return movimientoRepository.findAllByIdProducto(idproducto)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public MovimientoDTO findById(Long id) {
        Movimiento movimiento = movimientoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Movimiento no encontrado"));
        return toDto(movimiento);
    }

    @Override
    public List<MovimientoDTO> findAll() {
        return movimientoRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MovimientoDTO update(Long id, MovimientoDTO dto) {
        Movimiento mov = movimientoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Movimiento no encontrado"));
        // Nota: Actualizar un movimiento puede ser complejo. ¿Debería revertirse el ajuste
        // original y aplicar uno nuevo? Por simplicidad, aquí solo actualizamos los datos.
        mov.setCantidadMovimiento(dto.getCantidadMovimiento());
        mov.setTipoMovimiento(dto.getTipoMovimiento());
        mov.setFechaMovimiento(LocalDate.now());
        mov.setIdInventario(dto.getIdInventario());


        return toDto(movimientoRepository.save(mov));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        // Nota: Borrar un movimiento debería idealmente revertir el ajuste en el inventario.
        // Por simplicidad, aquí solo se borra el registro.
        if (!movimientoRepository.existsById(id)) {
            throw new RuntimeException("Movimiento no encontrado");
        }
        movimientoRepository.deleteById(id);
    }

    private MovimientoDTO toDto(Movimiento mov) {
        MovimientoDTO dto = new MovimientoDTO();
        dto.setIdMovimiento(mov.getIdMovimiento());
        dto.setIdInventario(mov.getIdInventario());
        dto.setFechaMovimiento(mov.getFechaMovimiento());
        dto.setCantidadMovimiento(mov.getCantidadMovimiento());
        dto.setTipoMovimiento(mov.getTipoMovimiento());
        return dto;
    }
}
