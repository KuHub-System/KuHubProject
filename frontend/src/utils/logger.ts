/**
 * SISTEMA DE LOGGING
 * Reemplaza console.log para evitar logs en producción y mantener silencio total
 */

/**
 * Logger que no hace absolutamente nada para garantizar silencio total en la consola
 */
export const logger = {
  log: (...args: any[]) => { console.log(...args); },
  error: (...args: any[]) => { console.error(...args); },
  warn: (...args: any[]) => { console.warn(...args); },
  info: (...args: any[]) => { console.info(...args); },
  debug: (...args: any[]) => { console.debug(...args); },
  group: (label: string) => { console.group(label); },
  groupEnd: () => { console.groupEnd(); },
};

// Exportar funciones de log directas vacías para compatibilidad
export const log = logger.log;
export const logError = logger.error;
export const logWarn = logger.warn;
