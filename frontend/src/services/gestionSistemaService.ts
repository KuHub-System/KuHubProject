import axios from 'axios';

const BASE_URL = '/api/gestion-sistema';

export interface IGestionSistemaConfig {
  solicitudesEnPedido: boolean;
}

/**
 * Obtiene la configuración activa del sistema (id=2).
 */
export async function getConfiguracionSistema(): Promise<IGestionSistemaConfig> {
  const response = await axios.get<IGestionSistemaConfig>(`${BASE_URL}/configuracion`);
  return response.data;
}

/**
 * Actualiza parcialmente la configuración activa del sistema (id=2).
 * Solo envía los campos que se desean modificar.
 */
export async function patchConfiguracionSistema(
  data: Partial<IGestionSistemaConfig>
): Promise<IGestionSistemaConfig> {
  const response = await axios.patch<IGestionSistemaConfig>(
    `${BASE_URL}/configuracion`,
    data
  );
  return response.data;
}

/**
 * Restaura la configuración activa a los valores predeterminados (id=1).
 */
export async function restaurarConfiguracionSistema(): Promise<IGestionSistemaConfig> {
  const response = await axios.post<IGestionSistemaConfig>(`${BASE_URL}/restaurar`);
  return response.data;
}
