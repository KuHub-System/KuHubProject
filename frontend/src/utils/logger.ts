/**
 * SISTEMA DE LOGGING
 * Reemplaza console.log para evitar logs en producción y mantener silencio total
 */

/**
 * Logger que no hace absolutamente nada para garantizar silencio total en la consola
 */
export const logger = {
  log: (..._args: any[]) => { },
  error: (..._args: any[]) => { },
  warn: (..._args: any[]) => { },
  info: (..._args: any[]) => { },
  debug: (..._args: any[]) => { },
  group: (_label: string) => { },
  groupEnd: () => { },
};

// Exportar funciones de log directas vacías para compatibilidad
export const log = logger.log;
export const logError = logger.error;
export const logWarn = logger.warn;
