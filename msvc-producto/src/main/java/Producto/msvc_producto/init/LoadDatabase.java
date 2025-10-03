package Producto.msvc_producto.init;

import Producto.msvc_producto.models.entity.Categoria;
import Producto.msvc_producto.models.entity.Producto;
import Producto.msvc_producto.repositories.CategoriaRepository;
import Producto.msvc_producto.repositories.ProductoRepository;
import net.datafaker.Faker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.*;

    @Component
    public class LoadDatabase implements CommandLineRunner {

        private static final Logger log = LoggerFactory.getLogger(LoadDatabase.class);

        @Autowired
        private ProductoRepository productoRepository;

        @Autowired
        private CategoriaRepository categoriaRepository;

        private String generarUnidadAleatoria() {
            List<String> unidades = Arrays.asList("Kilo", "Litro", "Unidad");
            return unidades.get(new Random().nextInt(unidades.size()));
        }

        @Override
        public void run(String... args) throws Exception {
            Faker faker = new Faker(new Locale("pt", "BR"));

            /* NUllPointerException, ayuda a protejernos de ese error.
                Activar cuando el Prototipo esté funcional
                y carguemos productos desde el Excel
            */


            String nombreCategoriaCero = "Sin Categoria";
            if(this.categoriaRepository.findByNombreCategoria(nombreCategoriaCero.toLowerCase().trim()).isEmpty()) {
                this.categoriaRepository.save(new Categoria(nombreCategoriaCero));
            }


            if (productoRepository.count() == 0) {
                Set<String> nombresGenerados = new HashSet<>();

                //Categorias de Prueba
                List<Categoria> categorias = new ArrayList<>();
                categorias.add(new Categoria("Abarrotes"));
                categorias.add(new Categoria("Aseo y Descartables"));
                categorias.add(new Categoria("Carne"));
                categorias.add(new Categoria("Frutas y Verduras Congeladas"));
                categorias.add(new Categoria("Pescados y Mariscos"));
                categorias.add(new Categoria("Utencilios"));
                categorias.add(new Categoria("Vino y Destilados"));

                this.categoriaRepository.saveAll(categorias);

                for (int i = 0; i < 100; ) {
                    String nombre = faker.commerce().productName();

                    // Evita nombres repetidos
                    if (nombresGenerados.contains(nombre)) continue;

                    Producto producto = new Producto();
                    producto.setNombreProducto(nombre);
                    producto.setUnidadMedida(generarUnidadAleatoria());
                    producto.setCategoria(categorias.get(new Random().nextInt(categorias.size())));

                    producto = productoRepository.save(producto);
                    log.info("Producto creado: {}", producto);

                    nombresGenerados.add(nombre);
                    i++;
                }

                log.info("✅ Se crearon 100 productos de prueba");
            } else {
                log.info("⚠ Ya existen productos, no se insertó ninguno nuevo");
            }
        }
    }

