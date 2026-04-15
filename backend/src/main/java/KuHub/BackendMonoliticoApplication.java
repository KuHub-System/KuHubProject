package KuHub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BackendMonoliticoApplication {
    public static void main(String[] args) {
        SpringApplication.run(BackendMonoliticoApplication.class, args);
        System.out.println("🚀 Backend Monolítico KuHub iniciado!");
    }
}