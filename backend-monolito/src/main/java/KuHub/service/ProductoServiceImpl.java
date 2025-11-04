package KuHub.service;

import KuHub.entity.Producto;
import KuHub.exceptions.ProductoNotFoundException;
import KuHub.repository.ProductoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProductoServiceImpl implements ProductoService{


    @Autowired
    private ProductoRepository productoRepository;

    @Transactional
    @Override
    public List<Producto> findAll() {
        return productoRepository.findAll();
    }

    @Transactional
    @Override
    public Producto findById(Long id){
        return productoRepository.findById(id).orElseThrow(
                ()-> new ProductoNotFoundException(id)
        );
    }


}
