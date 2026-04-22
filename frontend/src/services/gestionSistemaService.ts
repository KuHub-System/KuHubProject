import api from '../config/Axios';

export interface IGestionSistemaConfig {
  solicitudesEnPedido: boolean;
}

/**
 * Obtiene la configuración activa del sistema (id=2).
 */
export async function getConfiguracionSistema(): Promise<IGestionSistemaConfig> {
  const response = await api.get<IGestionSistemaConfig>('/gestion-sistema/configuracion');
  return response.data;
}

/**
 * Actualiza parcialmente la configuración activa del sistema (id=2).
 * Solo envía los campos que se desean modificar.
 */
export async function patchConfiguracionSistema(
  data: Partial<IGestionSistemaConfig>
): Promise<IGestionSistemaConfig> {
  const response = await api.patch<IGestionSistemaConfig>(
    '/gestion-sistema/configuracion',
    data
  );
  return response.data;
}

/**
 * Restaura la configuración activa a los valores predeterminados (id=1).
 */
export async function restaurarConfiguracionSistema(): Promise<IGestionSistemaConfig> {
  const response = await api.post<IGestionSistemaConfig>('/gestion-sistema/restaurar');
  return response.data;
}
