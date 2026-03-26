package KuHub.modules.gestion_usuario.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para representar una fila de la MATRIZ DE PERMISOS:
 * un registro por combinación Rol × Módulo con flags CRUD y nivel de acceso calculado.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PermisoMatrizDTO {

    // --- Rol ---
    private Integer idRol;
    private String  nombreRol;

    // --- Módulo ---
    private Integer idModulo;
    private String  codigoModulo;
    private String  nombreModulo;
    private Integer ordenModulo;

    // --- Permiso ---
    private Long    idPermisoRol;   // null si no existe registro aún
    private Boolean puedeLeer;
    private Boolean puedeCrear;
    private Boolean puedeActualizar;
    private Boolean puedeEliminar;

    /**
     * Nivel de acceso calculado (para el frontend):
     *  - "ESCRITURA"   si puede crear, actualizar o eliminar
     *  - "LECTURA"     si solo puede leer
     *  - "SIN_ACCESO"  si no tiene ningún permiso
     */
    public String getNivelAcceso() {
        if (Boolean.TRUE.equals(puedeCrear)
                || Boolean.TRUE.equals(puedeActualizar)
                || Boolean.TRUE.equals(puedeEliminar)) {
            return "ESCRITURA";
        }
        if (Boolean.TRUE.equals(puedeLeer)) {
            return "LECTURA";
        }
        return "SIN_ACCESO";
    }
}
