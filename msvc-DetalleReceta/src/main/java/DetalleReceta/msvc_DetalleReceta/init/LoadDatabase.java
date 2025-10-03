package DetalleReceta.msvc_DetalleReceta.init;

import DetalleReceta.msvc_DetalleReceta.clients.ProductoClientRest;
import DetalleReceta.msvc_DetalleReceta.clients.RecetaClientRest;
import DetalleReceta.msvc_DetalleReceta.models.Producto;
import DetalleReceta.msvc_DetalleReceta.models.Receta;
import DetalleReceta.msvc_DetalleReceta.models.entities.DetalleReceta;
import DetalleReceta.msvc_DetalleReceta.repositories.DetalleRecetaRepository;
import net.datafaker.Faker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Random;

@Component
public class LoadDatabase implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(LoadDatabase.class);

    @Autowired
    private DetalleRecetaRepository detalleRecetaRepository;

    @Autowired
    private RecetaClientRest recetaClientRest;

    @Autowired
    private ProductoClientRest productoClientRest;

    @Override
    public void run(String... args) throws Exception {
        if (detalleRecetaRepository.count() == 0) {
            Faker faker = new Faker(new Locale("es", "ES"));

            List<Receta> recetas = recetaClientRest.findAllRecetas().getBody();
            List<Producto> productos = productoClientRest.findAllProductos().getBody();

            if (recetas.isEmpty() || productos.isEmpty()) {
                log.warn("⚠ No se encontraron recetas o productos, no se pudieron generar detalles.");
                return;
            }

            Random random = new Random();

            for (int i = 0; i < 30; i++) { // generamos 30 detalles
                Receta receta = recetas.get(random.nextInt(recetas.size()));
                Producto producto = productos.get(random.nextInt(productos.size()));

                Float cantidad = 1 + random.nextFloat(5); // entre 1 y 6 unidades aprox

                DetalleReceta detalle = new DetalleReceta();
                detalle.setIdReceta(receta.getIdReceta());
                detalle.setIdProducto(producto.getIdProducto());
                detalle.setCantidadDetalleReceta(cantidad);

                detalleRecetaRepository.save(detalle);
                log.info("Detalle creado: Receta={} Producto={} Cantidad={}",
                        receta.getNombreReceta(),
                        producto.getNombreProducto(),
                        cantidad);
            }

            log.info("✅ Se cargaron 30 detalles de receta de prueba.");
        } else {
            log.info("⚠ Ya existen detalles de recetas, no se insertó ninguno nuevo.");
        }
    }
}
