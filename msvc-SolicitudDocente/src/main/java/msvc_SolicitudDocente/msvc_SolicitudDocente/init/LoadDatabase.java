package msvc_SolicitudDocente.msvc_SolicitudDocente.init;

import msvc_SolicitudDocente.msvc_SolicitudDocente.models.entity.SolicitudDocente;
import msvc_SolicitudDocente.msvc_SolicitudDocente.repositories.SolicitudDocenteRepository;
import net.datafaker.Faker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.Locale;
import java.util.Random;

@Component
public class LoadDatabase implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(LoadDatabase.class);

    @Autowired
    private SolicitudDocenteRepository solicitudDocenteRepository;

    @Override
    public void run(String... args) throws Exception {
        Faker faker = new Faker(new Locale("es", "CL"));
        Random random = new Random();

        if (solicitudDocenteRepository.count() == 0) {
            for (int i = 0; i < 20; i++) {
                SolicitudDocente solicitud = new SolicitudDocente();
                solicitud.setNumeroSemana((long) (random.nextInt(16) + 1)); // Semana entre 1 y 16
                solicitud.setNumeroTaller((long) (random.nextInt(5) + 1));   // Taller entre 1 y 5
                solicitud.setCantidadPersonas((long) (random.nextInt(20) + 10)); // Entre 10 y 30 personas
                solicitud.setDescripcionSemana("Semana de " + faker.educator().course());
                solicitud.setSeccion(random.nextBoolean() ? "Mañana" : "Tarde");
                solicitud.setNombreAsignatura(faker.educator().course());

                // Fecha actual como programada
                Date fecha = Date.from(LocalDateTime.now()
                        .plusDays(random.nextInt(15)) // entre hoy y 15 días adelante
                        .atZone(ZoneId.systemDefault())
                        .toInstant());
                solicitud.setFechaProgramada(fecha);

                solicitudDocenteRepository.save(solicitud);
                log.info("📅 Solicitud creada: {}", solicitud);
            }

            log.info("✅ Se crearon 20 solicitudes de docentes");
        } else {
            log.info("⚠ Ya existen solicitudes de docentes, no se insertó ninguna nueva");
        }
    }
}