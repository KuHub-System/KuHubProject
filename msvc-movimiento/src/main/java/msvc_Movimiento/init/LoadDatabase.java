package msvc_Movimiento.init;

import msvc_Movimiento.client.InventarioClientRest;
import msvc_Movimiento.dtos.InventarioDTO;
import msvc_Movimiento.dtos.MovimientoDTO;
import msvc_Movimiento.model.Producto;
import msvc_Movimiento.model.enums.TipoMovimiento;
import msvc_Movimiento.repository.MovimientoRepository;
import msvc_Movimiento.service.MovimientoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Random;

@Component
public class LoadDatabase implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(LoadDatabase.class);

    @Autowired
    private MovimientoRepository movimientoRepository;

    @Autowired
    private MovimientoService movimientoService;

    @Autowired
    private InventarioClientRest inventarioClientRest;


    @Override
    public void run(String... args) throws Exception {

        if(movimientoRepository.count() == 0){

            Random random = new Random();
            TipoMovimiento[] tiposDeMovimiento = TipoMovimiento.values();

            for(int i = 0; i<100;i++){
                Long idPrueba = (long) i+1;

                InventarioDTO inventario = this.inventarioClientRest.findById(idPrueba);
                assert inventario != null;

                MovimientoDTO mov = new MovimientoDTO();

                mov.setCantidadMovimiento(5);
                mov.setIdInventario(idPrueba);
                mov.setTipoMovimiento(tiposDeMovimiento[random.nextInt(tiposDeMovimiento.length)]);


                this.movimientoService.crearMovimiento(mov);

                log.info("El Movimiento creado es {}", mov);




            }
        }

    }
}
