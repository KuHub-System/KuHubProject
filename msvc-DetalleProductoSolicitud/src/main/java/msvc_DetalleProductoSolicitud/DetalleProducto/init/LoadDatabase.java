package msvc_DetalleProductoSolicitud.DetalleProducto.init;

import msvc_DetalleProductoSolicitud.DetalleProducto.models.entity.DetalleProductoSolicitud;
import msvc_DetalleProductoSolicitud.DetalleProducto.repositories.DetalleProductoSolicitudRepository;
import net.datafaker.Faker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Random;

@Component
public class LoadDatabase implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(LoadDatabase.class);

    @Autowired
    private DetalleProductoSolicitudRepository detalleProductoSolicitudRepository;

    @Override
    public void run(String... args) throws Exception {
        Faker faker = new Faker(new Locale("pt", "BR"));
        Random random = new Random();

        if (detalleProductoSolicitudRepository.count() == 0) {
            for (int i = 0; i < 200; i++) {
                DetalleProductoSolicitud detalle = new DetalleProductoSolicitud();
                detalle.setIdSolicitudDocente((long) (random.nextInt(20) + 1)); // Entre 1 y 20
                detalle.setIdProducto((long) (random.nextInt(100) + 1)); // Entre 1 y 100
                detalle.setCantidadDetalleSolicitud(random.nextFloat(20) + 1); // Entre 1 y 20

                detalleProductoSolicitudRepository.save(detalle);
                log.info("🧾 Detalle creado: {}", detalle);
            }

            log.info("✅ Se crearon 200 detalles de producto solicitud");
        } else {
            log.info("⚠ Ya existen detalles, no se insertó ninguno nuevo");
        }
    }
}

