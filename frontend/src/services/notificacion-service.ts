/**
 * SERVICIO DE NOTIFICACIONES
 * Sistema de notificaciones visuales para profesores
 */

export interface INotificacion {
  id: string;
  usuarioId: string;
  tipo: 'solicitud_aceptada' | 'solicitud_rechazada' | 'solicitud_vencida' | 'proceso_iniciado';
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
  solicitudId?: string; // Referencia a la solicitud relacionada
}

const STORAGE_KEY = 'notificaciones';

/**
 * Helper para obtener notificaciones del localStorage
 */
const obtenerNotificacionesStorage = (): INotificacion[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

/**
 * Helper para guardar notificaciones en localStorage
 */
const guardarNotificacionesStorage = (notificaciones: INotificacion[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notificaciones));
};

/**
 * Crear notificación
 */
export const crearNotificacionService = (
  usuarioId: string,
  tipo: INotificacion['tipo'],
  titulo: string,
  mensaje: string,
  solicitudId?: string
): void => {
  const notificaciones = obtenerNotificacionesStorage();
  
  const nuevaNotificacion: INotificacion = {
    id: Date.now().toString(),
    usuarioId,
    tipo,
    titulo,
    mensaje,
    leida: false,
    fecha: new Date().toISOString(),
    solicitudId,
  };
  
  notificaciones.push(nuevaNotificacion);
  guardarNotificacionesStorage(notificaciones);
  
  console.log('📬 Notificación creada:', titulo);
};

/**
 * Obtener notificaciones del usuario
 */
export const obtenerNotificacionesUsuarioService = (
  usuarioId: string,
  soloNoLeidas: boolean = false
): Promise<INotificacion[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let notificaciones = obtenerNotificacionesStorage();
      
      // Filtrar por usuario
      notificaciones = notificaciones.filter(n => n.usuarioId === usuarioId);
      
      // Filtrar solo no leídas si se solicita
      if (soloNoLeidas) {
        notificaciones = notificaciones.filter(n => !n.leida);
      }
      
      // Ordenar por fecha (más recientes primero)
      notificaciones.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      
      resolve(notificaciones);
    }, 100);
  });
};

/**
 * Marcar notificación como leída
 */
export const marcarNotificacionLeidaService = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const notificaciones = obtenerNotificacionesStorage();
        const index = notificaciones.findIndex(n => n.id === id);
        
        if (index === -1) {
          reject(new Error('Notificación no encontrada'));
          return;
        }
        
        notificaciones[index].leida = true;
        guardarNotificacionesStorage(notificaciones);
        
        resolve();
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Marcar todas las notificaciones del usuario como leídas
 */
export const marcarTodasLeidasService = (usuarioId: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const notificaciones = obtenerNotificacionesStorage();
      
      notificaciones.forEach(n => {
        if (n.usuarioId === usuarioId) {
          n.leida = true;
        }
      });
      
      guardarNotificacionesStorage(notificaciones);
      resolve();
    }, 100);
  });
};

/**
 * Obtener conteo de notificaciones no leídas
 */
export const obtenerConteoNoLeidasService = (usuarioId: string): Promise<number> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const notificaciones = obtenerNotificacionesStorage();
      const noLeidas = notificaciones.filter(
        n => n.usuarioId === usuarioId && !n.leida
      ).length;
      
      resolve(noLeidas);
    }, 100);
  });
};

/**
 * Eliminar notificación
 */
export const eliminarNotificacionService = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const notificaciones = obtenerNotificacionesStorage();
        const index = notificaciones.findIndex(n => n.id === id);
        
        if (index === -1) {
          reject(new Error('Notificación no encontrada'));
          return;
        }
        
        notificaciones.splice(index, 1);
        guardarNotificacionesStorage(notificaciones);
        
        resolve();
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Notificar sobre cambio de estado de solicitud
 */
export const notificarCambioEstadoSolicitudService = (
  usuarioId: string,
  solicitudId: string,
  estado: 'Aceptada' | 'Rechazada',
  asignaturaNombre: string,
  comentarioRechazo?: string
): void => {
  const tipo: INotificacion['tipo'] = 
    estado === 'Aceptada' ? 'solicitud_aceptada' : 'solicitud_rechazada';
  
  const titulo = estado === 'Aceptada' 
    ? '✅ Solicitud Aceptada' 
    : '❌ Solicitud Rechazada';
  
  const mensaje = estado === 'Aceptada'
    ? `Tu solicitud para ${asignaturaNombre} ha sido aceptada y será incluida en el pedido.`
    : `Tu solicitud para ${asignaturaNombre} ha sido rechazada. ${comentarioRechazo ? `Motivo: ${comentarioRechazo}` : ''}`;
  
  crearNotificacionService(usuarioId, tipo, titulo, mensaje, solicitudId);
};