package KuHub.modules.gestionusuario.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entidad que representa un ROL en el sistema
 * Mapea la tabla 'rol' en PostgreSQL
 */
@Entity
@Table(name = "rol", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Rol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rol")
    private Integer idRol;

    @Column(name = "nombre_rol", nullable = false, length = 100)
    private String nombreRol;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}