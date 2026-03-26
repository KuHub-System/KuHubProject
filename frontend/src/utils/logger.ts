/**
 * SISTEMA DE LOGGING
 * Reemplaza console.log para evitar logs en producción y mantener silencio total
 */

/**
 * Logger que no hace absolutamente nada para garantizar silencio total en la consola
 */
const PERSISTENT_LOG_KEY = 'kuhub-debug-logs';

const saveLog = (type: string, ...args: any[]) => {
  try {
    const logs = JSON.parse(localStorage.getItem(PERSISTENT_LOG_KEY) || '[]');
    logs.push({
      time: new Date().toISOString(),
      type,
      message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
    });
    // Limitar a los últimos 50 logs
    localStorage.setItem(PERSISTENT_LOG_KEY, JSON.stringify(logs.slice(-50)));
  } catch (e) {
    // Ignore errors saving logs
  }
};

export const logger = {
  log: (...args: any[]) => { 
    console.log(...args); 
    saveLog('log', ...args);
  },
  error: (...args: any[]) => { 
    console.error(...args); 
    saveLog('error', ...args);
  },
  warn: (...args: any[]) => { 
    console.warn(...args); 
    saveLog('warn', ...args);
  },
  info: (...args: any[]) => { 
    console.info(...args); 
    saveLog('info', ...args);
  },
  debug: (...args: any[]) => { 
    console.debug(...args); 
    saveLog('debug', ...args);
  },
  group: (label: string) => { console.group(label); },
  groupEnd: () => { console.groupEnd(); },
};

if (typeof window !== 'undefined') {
  (window as any).showKuhubLogs = () => {
    const logs = JSON.parse(localStorage.getItem(PERSISTENT_LOG_KEY) || '[]');
    console.group('📋 LOGS PERSISTENTES KUHUB');
    if (logs.length === 0) {
      console.log('No hay logs guardados.');
    } else {
      logs.forEach((l: any) => {
        const style = l.type === 'error' ? 'color: #ff4d4f' : l.type === 'warn' ? 'color: #faad14' : 'color: #1890ff';
        console.log(`%c[${l.time}] [${l.type.toUpperCase()}] ${l.message}`, style);
      });
    }
    console.groupEnd();
  };

  (window as any).clearKuhubLogs = () => {
    localStorage.removeItem(PERSISTENT_LOG_KEY);
    console.log('🧹 Logs limpiados.');
  };
}
