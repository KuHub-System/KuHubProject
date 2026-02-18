package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.repository.UnidadaMedidaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UnidadMedidaServiceImp implements UnidadMedidaService{

    @Autowired
    private UnidadaMedidaRepository unidadaMedidaRepository;

    @Override
    @Transactional
    public Boolean existsByIdUnidadMedida(Short idUnidadMedida){
        return unidadaMedidaRepository.existsByIdUnidad(idUnidadMedida);
    }
}
