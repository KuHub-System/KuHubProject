import api from '../config/Axios';

/** Tipo de equipo desde el que el usuario reporta. */
export type TipoEquipo = 'NOTEBOOK' | 'DESKTOP' | 'TABLET' | 'OTRO';

/** Categoría del error reportado. Debe coincidir con el enum de la tabla en backend. */
export type TipoErrorSoporte =
  | 'VISUAL'
  | 'RENDERIZADO'
  | 'FUNCIONALIDAD'
  | 'DATOS_INCORRECTOS'
  | 'LENTITUD_SUGERENCIA';

/** Payload que el modal de soporte envía al backend. */
export interface ITicketSoporteRequest {
  tipoEquipo: TipoEquipo;
  /** Solo cuando tipoEquipo === 'OTRO'. */
  equipoOtro?: string;
  sistemaOperativo: string;
  tipoError: TipoErrorSoporte;
  descripcion: string;
  /** Página donde ocurrió el problema (se captura automáticamente). */
  urlOrigen?: string;
}

/**
 * Envía un ticket de soporte/reporte de error al backend.
 * Endpoint propuesto: POST /api/v1/soporte
 */
export const enviarTicketSoporte = async (
  payload: ITicketSoporteRequest,
): Promise<void> => {
  await api.post('/soporte', payload);
};
