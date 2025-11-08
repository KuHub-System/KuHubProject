/**
 * SISTEMA DE LOGGING
 * Reemplaza console.log para evitar logs en producción
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

/**
 * Logger que solo funciona en desarrollo
 */
export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Los errores siempre se muestran, incluso en producción
    console.error(...args);
  },
  
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
  
  group: (label: string) => {
    if (isDev) {
      console.group(label);
    }
  },
  
  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  },
};

// Exportar función de log directa para compatibilidad
export const log = logger.log;
export const logError = logger.error;
export const logWarn = logger.warn;

