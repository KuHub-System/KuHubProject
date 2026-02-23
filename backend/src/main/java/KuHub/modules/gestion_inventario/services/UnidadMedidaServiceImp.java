package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.ChangeStatusActiveUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.ChangeProductsToAnotherUnidadMedidaDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.CreateUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.UpdateUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.response.UnidadMedidaView;
import KuHub.modules.gestion_inventario.entity.UnidadMedida;
import KuHub.modules.gestion_inventario.exceptions.InventarioException;
import KuHub.modules.gestion_inventario.repository.ProductoRepository;
import KuHub.modules.gestion_inventario.repository.UnidadaMedidaRepository;
import KuHub.utils.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UnidadMedidaServiceImp implements UnidadMedidaService{

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UnidadaMedidaRepository unidadaMedidaRepository;

    @Override
    @Transactional
    public Boolean existsByIdUnidadMedida(Short idUnidadMedida){
        return unidadaMedidaRepository.existsByIdUnidad(idUnidadMedida);
    }

    @Override
    @Transactional(readOnly = true)
    public UnidadMedida findById(Short idUnidadMedida){
        return unidadaMedidaRepository.findById(idUnidadMedida).orElseThrow(
                ()-> new InventarioException("No existe la unidad de medida con el id: " + idUnidadMedida)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<UnidadMedida> findAll(){
        return unidadaMedidaRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<UnidadMedidaView> findAllWithAsociados(){
        return unidadaMedidaRepository.findAllWithAsociados();
    }

    @Override
    @Transactional
    public boolean createUnidad(CreateUnidadDTO dto){
        dto.setNombreUnidad(StringUtils.capitalizarPalabras(dto.getNombreUnidad()));
        dto.setAbreviatura(StringUtils.normalizeSpaces(dto.getAbreviatura()));
        if(unidadaMedidaRepository.existsByNombreUnidad(dto.getNombreUnidad())){
            throw new InventarioException("Ya existe una unidad de medida con ese nombre");
        }
        if (unidadaMedidaRepository.existsByAbreviaturaIgnoreCase(dto.getAbreviatura())) {
            throw new InventarioException("Ya existe una unidad de medida con esa abreviatura");
        }
        UnidadMedida nuevaUnidad = new UnidadMedida();
        nuevaUnidad.setNombreUnidad(dto.getNombreUnidad());
        nuevaUnidad.setAbreviatura(dto.getAbreviatura());
        unidadaMedidaRepository.save(nuevaUnidad);
        return true;
    }

    @Override
    @Transactional
    public boolean updateUnidad(UpdateUnidadDTO dto){
        UnidadMedida upUni = findById(dto.getIdUnidadMedida());

        if (dto.getNombreUnidad() != null) {
            String capNombre = StringUtils.capitalizarPalabras(dto.getNombreUnidad());
            if (!upUni.getNombreUnidad().equalsIgnoreCase(capNombre)) {
                if (unidadaMedidaRepository
                        .existsByNombreUnidadIgnoreCaseAndIdUnidadNot(
                                capNombre, dto.getIdUnidadMedida())) {
                    throw new InventarioException("Ya existe una unidad de medida con ese nombre");
                }
                upUni.setNombreUnidad(capNombre);
            }
        }

        if (dto.getAbreviatura() != null) {
            String capAbrev = StringUtils.normalizeSpaces(dto.getAbreviatura());
            if (!upUni.getAbreviatura().equalsIgnoreCase(capAbrev)) {
                if (unidadaMedidaRepository
                        .existsByAbreviaturaIgnoreCaseAndIdUnidadNot(
                                capAbrev, dto.getIdUnidadMedida())) {
                    throw new InventarioException("Ya existe una unidad de medida con esa abreviatura");
                }
                upUni.setAbreviatura(capAbrev);
            }
        }

        unidadaMedidaRepository.save(upUni);
        return true;
    }

    @Override
    @Transactional
    public String changeProductsToAnotherUnidadMedida(
            ChangeProductsToAnotherUnidadMedidaDTO dto) {
        UnidadMedida oldUnidad = findById(dto.getOldIdUnidadMedida());
        UnidadMedida newUnidad = findById(dto.getNewIdUnidadMedida());
        // 1️⃣ Validaciones básicas
        if (oldUnidad.getIdUnidad().equals(newUnidad.getIdUnidad())) {
            return "La unidad de medida de origen y destino son iguales. No se realizaron cambios.";
        }
        // 2️⃣ Ejecutar actualización masiva
        int updatedRows = productoRepository.actualizarUnidadMedidaMasivo(
                oldUnidad.getIdUnidad(),
                newUnidad.getIdUnidad()
        );
        // 3️⃣ Respuesta
        if (updatedRows == 0) {
            return "No se encontraron productos con la unidad de medida "
                    + oldUnidad.getNombreUnidad() + " para mover.";
        }
        return "Se movieron " + updatedRows + " productos desde la unidad de medida "
                + oldUnidad.getNombreUnidad() + " a la unidad de medida "
                + newUnidad.getNombreUnidad() + ".";
    }

    @Override
    @Transactional
    public void changeStatusEnable (ChangeStatusActiveUnidadDTO dto){
        UnidadMedida unidad = findById(dto.getIdUnidadMedida());
        unidad.setActivo(dto.getEnable());
        unidadaMedidaRepository.save(unidad);
    }

    @Override
    @Transactional
    public void deleteUnidad(Short idUnidad){
        if (!existsByIdUnidadMedida(idUnidad)){
            throw new InventarioException("No existe la unidad de medida con el id: " + idUnidad);
        }
        if (productoRepository.existsByUnidadMedida_IdUnidad(idUnidad)){
            throw new InventarioException("No se puede eliminar la unidad de medida porque tiene productos asociados");
        }
        unidadaMedidaRepository.deleteById(idUnidad);
    }






}
