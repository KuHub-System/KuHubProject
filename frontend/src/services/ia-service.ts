import api from '../config/Axios';

/** Rol de cada mensaje en la conversación con el asistente. */
export type RolMensajeIa = 'user' | 'assistant';

/** Un mensaje de la conversación (coincide con MensajeDTO del backend). */
export interface IMensajeIa {
  rol: RolMensajeIa;
  contenido: string;
}

/** Respuesta del backend tras consultar a la IA (coincide con IaChatResponseDTO). */
export interface IIaChatResponse {
  respuesta: string;
  modelo: string;
  duracionMs: number;
}

/** Metadatos de un modelo seleccionable en el chat. */
export interface IModeloIa {
  /** ID exacto en Ollama (debe estar en la whitelist del backend). */
  id: string;
  /** Nombre legible para mostrar en el selector. */
  nombre: string;
  /** Descripción corta del perfil del modelo. */
  descripcion: string;
  /** Tiempo de respuesta promedio (texto fijo para informar al usuario). */
  tiempoPromedio: string;
  /** Timeout de la petición en ms, ajustado al rendimiento real de cada modelo. */
  timeoutMs: number;
}

/**
 * Catálogo de modelos disponibles (medido en la Instancia C — 2 GB CPU, ver CONFIGURATION_HOST_IA.md §10).
 * El orden importa: el primero es el principal/por defecto.
 * Los timeouts se calibran al peor caso de cada modelo (gemma2 incluye su carga en frío ~70 s).
 */
export const MODELOS_IA: IModeloIa[] = [
  {
    id: 'qwen2.5:1.5b',
    nombre: 'Qwen 2.5 · 1.5B',
    descripcion: 'Principal · equilibrado',
    tiempoPromedio: '~15-20 s',
    timeoutMs: 180_000,
  },
  {
    id: 'llama3.2:1b',
    nombre: 'Llama 3.2 · 1B',
    descripcion: 'Rápido y liviano',
    tiempoPromedio: '~10-30 s',
    timeoutMs: 220_000,
  },
  {
    id: 'gemma2:2b',
    nombre: 'Gemma 2 · 2B',
    descripcion: 'Mejor redacción',
    tiempoPromedio: '~10 s (1ª vez ~70 s)',
    timeoutMs: 185_000,
  },
];

/** Modelo seleccionado por defecto al abrir el chat. */
export const MODELO_POR_DEFECTO = MODELOS_IA[0].id;

/** Timeout de respaldo si el modelo no está en el catálogo (por encima del backend, 120 s). */
const IA_TIMEOUT_MS = 125_000;

/**
 * Envía el historial de conversación al asistente IA y devuelve su respuesta.
 * El backend antepone el system prompt, valida el modelo contra su whitelist y reenvía a Ollama.
 * El timeout se ajusta al modelo elegido para no cortar antes de tiempo.
 */
export const enviarMensajeIaService = async (
  mensajes: IMensajeIa[],
  modelo: string = MODELO_POR_DEFECTO,
): Promise<IIaChatResponse> => {
  const config = MODELOS_IA.find(m => m.id === modelo);
  const timeout = config?.timeoutMs ?? IA_TIMEOUT_MS;
  const response = await api.post<IIaChatResponse>(
    '/ia/chat',
    { mensajes, modelo },
    { timeout },
  );
  return response.data;
};
