/**
 * SERVICIO DE GESTIÓN DE SOLICITUDES (ACTUALIZADO)
 * Incluye sistema de aprobación y gestión de estados
 */

import { 
  ISolicitud, 
  ISolicitudCreacion, 
  ISolicitudActualizacion,
  IAprobarRechazarSolicitud,
  IFiltrosSolicitudes,
  EstadoSolicitud 
} from '../types/solicitud.types';
import { obtenerUsuarioActualService } from './auth-service';

const STORAGE_KEY = 'solicitudes';

/**
 * Helper para obtener solicitudes del localStorage
 */
const obtenerSolicitudesStorage = (): ISolicitud[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

/**
 * Helper para guardar solicitudes en localStorage
 */
const guardarSolicitudesStorage = (solicitudes: ISolicitud[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(solicitudes));
};

/**
 * Crear nueva solicitud
 */
export const crearSolicitudService = (data: ISolicitudCreacion): Promise<ISolicitud> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const usuario = obtenerUsuarioActualService();
        if (!usuario) {
          reject(new Error('No hay sesión activa'));
          return;
        }
        
        const solicitudes = obtenerSolicitudesStorage();
        
        const nuevaSolicitud: ISolicitud = {
          id: Date.now().toString(),
          profesorId: usuario.id,
          profesorNombre: usuario.nombreCompleto,
          asignaturaId: data.asignaturaId,
          asignaturaNombre: data.asignaturaNombre,
          fecha: data.fecha,
          recetaId: data.recetaId,
          recetaNombre: data.recetaNombre,
          items: data.items.map(item => ({
            ...item,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          })),
          observaciones: data.observaciones,
          esCustom: data.esCustom,
          estado: 'Pendiente',
          fechaCreacion: new Date().toISOString(),
          fechaUltimaModificacion: new Date().toISOString(),
        };
        
        solicitudes.push(nuevaSolicitud);
        guardarSolicitudesStorage(solicitudes);
        
        console.log('✅ Solicitud creada:', nuevaSolicitud.id);
        resolve(nuevaSolicitud);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Obtener todas las solicitudes (para Admin)
 */
export const obtenerTodasSolicitudesService = (
  filtros?: IFiltrosSolicitudes
): Promise<ISolicitud[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let solicitudes = obtenerSolicitudesStorage();
      
      // Aplicar filtros
      if (filtros) {
        if (filtros.estado) {
          solicitudes = solicitudes.filter(s => s.estado === filtros.estado);
        }
        if (filtros.profesorId) {
          solicitudes = solicitudes.filter(s => s.profesorId === filtros.profesorId);
        }
        if (filtros.fechaDesde) {
          solicitudes = solicitudes.filter(s => s.fecha >= filtros.fechaDesde!);
        }
        if (filtros.fechaHasta) {
          solicitudes = solicitudes.filter(s => s.fecha <= filtros.fechaHasta!);
        }
      }
      
      // Ordenar por fecha de creación (más recientes primero)
      solicitudes.sort((a, b) => 
        new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
      );
      
      resolve(solicitudes);
    }, 100);
  });
};

/**
 * Obtener solicitudes del profesor actual
 */
export const obtenerMisSolicitudesService = (): Promise<ISolicitud[]> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const usuario = obtenerUsuarioActualService();
        if (!usuario) {
          reject(new Error('No hay sesión activa'));
          return;
        }
        
        const solicitudes = obtenerSolicitudesStorage();
        const misSolicitudes = solicitudes
          .filter(s => s.profesorId === usuario.id)
          .sort((a, b) => 
            new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
          );
        
        resolve(misSolicitudes);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Obtener solicitud por ID
 */
export const obtenerSolicitudPorIdService = (id: string): Promise<ISolicitud | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const solicitudes = obtenerSolicitudesStorage();
      const solicitud = solicitudes.find(s => s.id === id);
      resolve(solicitud || null);
    }, 100);
  });
};

/**
 * Actualizar solicitud (solo si está en Pendiente o dentro del período)
 */
export const actualizarSolicitudService = (
  id: string,
  data: ISolicitudActualizacion
): Promise<ISolicitud> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const usuario = obtenerUsuarioActualService();
        if (!usuario) {
          reject(new Error('No hay sesión activa'));
          return;
        }
        
        const solicitudes = obtenerSolicitudesStorage();
        const index = solicitudes.findIndex(s => s.id === id);
        
        if (index === -1) {
          reject(new Error('Solicitud no encontrada'));
          return;
        }
        
        const solicitud = solicitudes[index];
        
        // Verificar que sea el dueño de la solicitud
        if (solicitud.profesorId !== usuario.id) {
          reject(new Error('No tienes permiso para editar esta solicitud'));
          return;
        }
        
        // Si la solicitud estaba Aceptada, volver a Pendiente
        const nuevoEstado: EstadoSolicitud = 
          solicitud.estado === 'Aceptada' ? 'Pendiente' : solicitud.estado;
        
        // Actualizar solicitud
        solicitudes[index] = {
          ...solicitud,
          ...data,
          estado: nuevoEstado,
          fechaUltimaModificacion: new Date().toISOString(),
        };
        
        guardarSolicitudesStorage(solicitudes);
        
        console.log('✅ Solicitud actualizada:', id);
        if (nuevoEstado === 'Pendiente' && solicitud.estado === 'Aceptada') {
          console.log('⚠️ Solicitud volvió a Pendiente por modificación');
        }
        
        resolve(solicitudes[index]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Eliminar solicitud (solo si está en Pendiente)
 */
export const eliminarSolicitudService = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const usuario = obtenerUsuarioActualService();
        if (!usuario) {
          reject(new Error('No hay sesión activa'));
          return;
        }
        
        const solicitudes = obtenerSolicitudesStorage();
        const index = solicitudes.findIndex(s => s.id === id);
        
        if (index === -1) {
          reject(new Error('Solicitud no encontrada'));
          return;
        }
        
        const solicitud = solicitudes[index];
        
        // Verificar que sea el dueño
        if (solicitud.profesorId !== usuario.id) {
          reject(new Error('No tienes permiso para eliminar esta solicitud'));
          return;
        }
        
        // Solo permitir eliminar si está en Pendiente
        if (solicitud.estado !== 'Pendiente') {
          reject(new Error('Solo se pueden eliminar solicitudes en estado Pendiente'));
          return;
        }
        
        solicitudes.splice(index, 1);
        guardarSolicitudesStorage(solicitudes);
        
        console.log('✅ Solicitud eliminada:', id);
        resolve();
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Aprobar o rechazar solicitud (solo Admin/Co-Admin)
 */
export const aprobarRechazarSolicitudService = (
  data: IAprobarRechazarSolicitud
): Promise<ISolicitud> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const solicitudes = obtenerSolicitudesStorage();
        const index = solicitudes.findIndex(s => s.id === data.solicitudId);
        
        if (index === -1) {
          reject(new Error('Solicitud no encontrada'));
          return;
        }
        
        // Actualizar estado
        solicitudes[index] = {
          ...solicitudes[index],
          estado: data.estado,
          comentarioRechazo: data.estado === 'Rechazada' ? data.comentarioRechazo : undefined,
          fechaAprobacion: new Date().toISOString(),
          aprobadoPor: data.aprobadoPor,
        };
        
        guardarSolicitudesStorage(solicitudes);
        
        console.log(`✅ Solicitud ${data.estado.toLowerCase()}:`, data.solicitudId);
        resolve(solicitudes[index]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Aprobar todas las solicitudes pendientes
 */
export const aceptarTodasSolicitudesService = (aprobadoPor: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const solicitudes = obtenerSolicitudesStorage();
        let contador = 0;
        
        solicitudes.forEach((solicitud) => {
          if (solicitud.estado === 'Pendiente') {
            solicitud.estado = 'Aceptada';
            solicitud.fechaAprobacion = new Date().toISOString();
            solicitud.aprobadoPor = aprobadoPor;
            contador++;
          }
        });
        
        guardarSolicitudesStorage(solicitudes);
        
        console.log(`✅ ${contador} solicitudes aceptadas automáticamente`);
        resolve(contador);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Obtener conteo de solicitudes por estado
 */
export const obtenerConteoSolicitudesService = (): Promise<{
  pendientes: number;
  aceptadas: number;
  rechazadas: number;
  total: number;
}> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const solicitudes = obtenerSolicitudesStorage();
      
      const conteo = {
        pendientes: solicitudes.filter(s => s.estado === 'Pendiente').length,
        aceptadas: solicitudes.filter(s => s.estado === 'Aceptada').length,
        rechazadas: solicitudes.filter(s => s.estado === 'Rechazada').length,
        total: solicitudes.length,
      };
      
      resolve(conteo);
    }, 100);
  });
};

/**
 * Obtener solicitudes aceptadas para el proceso de pedidos
 */
export const obtenerSolicitudesAceptadasParaPedidoService = (): Promise<ISolicitud[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const solicitudes = obtenerSolicitudesStorage();
      const aceptadas = solicitudes.filter(s => s.estado === 'Aceptada');
      resolve(aceptadas);
    }, 100);
  });
};