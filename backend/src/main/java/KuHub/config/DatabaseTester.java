package KuHub.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

@Component
public class DatabaseTester implements CommandLineRunner {

    @Autowired
    private DataSource dataSource;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("🔍 Iniciando prueba de conexión a BD...");

        try (Connection conn = dataSource.getConnection()) {
            System.out.println("✅ CONEXIÓN EXITOSA a PostgreSQL!");
            System.out.println("📊 Base de datos: " + conn.getCatalog());
            System.out.println("🔗 URL: " + conn.getMetaData().getURL());
        } catch (Exception e) {
            System.err.println("❌ ERROR de conexión: " + e.getMessage());
            e.printStackTrace(); // Esto muestra el stack trace completo
        }

        System.out.println("🏁 Prueba de conexión finalizada");
    }
}
