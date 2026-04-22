package KuHub.modules.gestion_sistema.service;

import KuHub.modules.gestion_sistema.dtos.GestionSistemaDTO;
import KuHub.modules.gestion_sistema.entity.GestionSistema;
import KuHub.modules.gestion_sistema.repository.GestionSistemaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GestionSistemaService {

    private final GestionSistemaRepository gestionSistemaRepository;

    /**
     * ID de la fila activa que el usuario puede modificar.
     */
    private static final int ID_CONFIG_ACTIVA = 2;

    /**
     * ID de la fila predeterminada (solo lectura, para restaurar).
     */
    private static final int ID_CONFIG_DEFAULT = 1;

    /**
     * Obtiene la configuración activa del sistema (id=2).
     */
    @Transactional(readOnly = true)
    public GestionSistemaDTO getConfiguracionActiva() {
        GestionSistema config = gestionSistemaRepository.findById(ID_CONFIG_ACTIVA)
                .orElseThrow(() -> new RuntimeException(
                        "No se encontró la configuración activa del sistema (id=2). " +
                        "Ejecute el script nota_bbdd_kuhub_v2.sql para inicializar la tabla."));

        GestionSistemaDTO dto = new GestionSistemaDTO();
        dto.setSolicitudesEnPedido(config.getSolicitudesEnPedido());
        return dto;
    }

    /**
     * Actualiza la configuración activa del sistema (id=2).
     */
    @Transactional
    public GestionSistemaDTO updateConfiguracionActiva(GestionSistemaDTO dto) {
        GestionSistema config = gestionSistemaRepository.findById(ID_CONFIG_ACTIVA)
                .orElseThrow(() -> new RuntimeException(
                        "No se encontró la configuración activa del sistema (id=2). " +
                        "Ejecute el script nota_bbdd_kuhub_v2.sql para inicializar la tabla."));

        if (dto.getSolicitudesEnPedido() != null) {
            config.setSolicitudesEnPedido(dto.getSolicitudesEnPedido());
        }

        gestionSistemaRepository.save(config);

        GestionSistemaDTO response = new GestionSistemaDTO();
        response.setSolicitudesEnPedido(config.getSolicitudesEnPedido());
        return response;
    }

    /**
     * Restaura la configuración activa (id=2) a los valores predeterminados (id=1).
     */
    @Transactional
    public GestionSistemaDTO restaurarConfiguracion() {
        GestionSistema configDefault = gestionSistemaRepository.findById(ID_CONFIG_DEFAULT)
                .orElseThrow(() -> new RuntimeException(
                        "No se encontró la configuración predeterminada (id=1)."));

        GestionSistema configActiva = gestionSistemaRepository.findById(ID_CONFIG_ACTIVA)
                .orElseThrow(() -> new RuntimeException(
                        "No se encontró la configuración activa (id=2)."));

        // Copiar valores del default al activo
        configActiva.setSolicitudesEnPedido(configDefault.getSolicitudesEnPedido());
        gestionSistemaRepository.save(configActiva);

        GestionSistemaDTO response = new GestionSistemaDTO();
        response.setSolicitudesEnPedido(configActiva.getSolicitudesEnPedido());
        return response;
    }

    /**
     * Verifica si la funcionalidad de solicitudes en pedido está activa.
     * Usado internamente por otros servicios.
     */
    @Transactional(readOnly = true)
    public boolean isSolicitudesEnPedidoActivo() {
        return gestionSistemaRepository.findById(ID_CONFIG_ACTIVA)
                .map(c -> Boolean.TRUE.equals(c.getSolicitudesEnPedido()))
                .orElse(false);
    }
}
