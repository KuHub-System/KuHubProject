package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.ChangeStatusActiveUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.request.ChangeProductsToAnotherUnidadMedidaDTO;
import KuHub.modules.gestion_inventario.dtos.request.CreateUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.request.UpdateUnidadDTO;
import KuHub.modules.gestion_inventario.dtos.response.proyeccion.UnidadMedidaView;
import KuHub.modules.gestion_inventario.entity.UnidadMedida;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.repository.ProductoRepository;
import KuHub.modules.gestion_inventario.repository.UnidadaMedidaRepository;
import KuHub.utils.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UnidadMedidaServiceImpl implements UnidadMedidaService{

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
                ()-> new GestionInventarioException("No existe la unidad de medida con el id: " + idUnidadMedida
                    , HttpStatus.NOT_FOUND)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<UnidadMedida> findAll(){
        return unidadaMedidaRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<UnidadMedida> findAllActiveTrue(){
        return unidadaMedidaRepository.findByActivo(true);
    }

    /**Metodo usando para mostrar las unidades de medida con sus productos asociados*/
    @Override
    @Transactional(readOnly = true)
    public List<UnidadMedidaView> findAllWithAsociados(){
        return unidadaMedidaRepository.findAllWithAsociados();
    }

    /**Metodo para crear una unidad de medida*/
    @Override
    @Transactional
    public boolean createUnidad(CreateUnidadDTO dto){
        dto.setNombreUnidad(StringUtils.capitalizarPalabras(dto.getNombreUnidad()));
        dto.setAbreviatura(StringUtils.normalizeSpaces(dto.getAbreviatura()));
        if(unidadaMedidaRepository.existsByNombreUnidad(dto.getNombreUnidad())){
            throw new GestionInventarioException("Ya existe una unidad de medida con ese nombre"
                ,HttpStatus.CONFLICT);
        }
        if (unidadaMedidaRepository.existsByAbreviaturaIgnoreCase(dto.getAbreviatura())) {
            throw new GestionInventarioException("Ya existe una unidad de medida con esa abreviatura"
                ,HttpStatus.CONFLICT);
        }
        UnidadMedida nuevaUnidad = new UnidadMedida();
        nuevaUnidad.setNombreUnidad(dto.getNombreUnidad());
        nuevaUnidad.setAbreviatura(dto.getAbreviatura());
        nuevaUnidad.setEsFraccionario(dto.getEsFraccionario());
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
                    throw new GestionInventarioException("Ya existe una unidad de medida con ese nombre"
                            ,HttpStatus.CONFLICT);
                }
                upUni.setNombreUnidad(capNombre);
            }
        }
        if (!upUni.getEsFraccionario().equals(dto.getEsFraccionario())) {
            upUni.setEsFraccionario(dto.getEsFraccionario());
        }

        if (dto.getAbreviatura() != null) {
            String capAbrev = StringUtils.normalizeSpaces(dto.getAbreviatura());
            if (!upUni.getAbreviatura().equalsIgnoreCase(capAbrev)) {
                if (unidadaMedidaRepository
                        .existsByAbreviaturaIgnoreCaseAndIdUnidadNot(
                                capAbrev, dto.getIdUnidadMedida())) {
                    throw new GestionInventarioException("Ya existe una unidad de medida con esa abreviatura"
                            ,HttpStatus.CONFLICT);
                }
                upUni.setAbreviatura(capAbrev);
            }
        }

        unidadaMedidaRepository.save(upUni);
        return true;
    }

    /**Metodo para cambiar la unidad de medida transferiendo a otros productos*/
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

    /**Metodo para desactivar o activar una unidad de medida*/
    @Override
    @Transactional
    public void changeStatusEnable (ChangeStatusActiveUnidadDTO dto){
        UnidadMedida unidad = findById(dto.getIdUnidadMedida());
        unidad.setActivo(dto.getEnable());
        unidadaMedidaRepository.save(unidad);
    }

    /**Deletar una unidad de medida permanentemente si no tiene productos asociados*/
    @Override
    @Transactional
    public void deleteUnidad(Short idUnidad){
        if (!existsByIdUnidadMedida(idUnidad)){
            throw new GestionInventarioException("No existe la unidad de medida con el id: " + idUnidad
                    ,HttpStatus.CONFLICT);
        }
        if (productoRepository.existsByUnidadMedida_IdUnidad(idUnidad)){
            throw new GestionInventarioException("No se puede eliminar la unidad de medida porque tiene productos asociados"
                    ,HttpStatus.CONFLICT);
        }
        unidadaMedidaRepository.deleteById(idUnidad);
    }






}
