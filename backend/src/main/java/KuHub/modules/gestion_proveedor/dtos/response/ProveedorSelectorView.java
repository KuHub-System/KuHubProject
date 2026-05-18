package KuHub.modules.gestion_proveedor.dtos.response;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

/**
 * Proyección (interfaz) que lista id y nombre de distribuidoras
 * para el selector del modal de sincronización de precios desde Excel.
 *
 * Filtro: proveedores con activo = TRUE y estado_proveedor = 'DISPONIBLE'.
 * Orden: nombre_distribuidora ASC.
 *
 * ✅ En uso: GET /api/v1/proveedor/selector → listarProveedoresSelectorService (proveedor-service.ts).
 */
@JsonPropertyOrder({"idProveedor", "nombreDistribuidora"})
public interface ProveedorSelectorView {
    Integer getIdProveedor();
    String getNombreDistribuidora();
}
