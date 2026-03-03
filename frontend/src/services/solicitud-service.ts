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

const API_BASE_URL = 'http://localhost:8083/api/v1';
const ENDPOINTS = {
  SOLICITUDES_DETALLES: `${API_BASE_URL}/solicituddocente/detalles`
};

// ✅ CAMBIO CRÍTICO: Usar la misma clave que storage-service
const STORAGE_KEY = 'kuhub-solicitudes';

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

        if (!Number.isInteger(data.semana) || data.semana < 1 || data.semana > 18) {
          reject(new Error('La semana seleccionada no es válida'));
          return;
        }

        const solicitudes = obtenerSolicitudesStorage();

        const nuevaSolicitud: ISolicitud = {
          id: Date.now().toString(),
          profesorId: usuario.id,
          profesorNombre: usuario.nombreCompleto,
          asignaturaId: data.asignaturaId,
          asignaturaNombre: data.asignaturaNombre,
          semana: data.semana,
          fecha: data.fecha,
          bloqueInicio: data.bloqueInicio,
          bloqueFin: data.bloqueFin,
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
  return new Promise(async (resolve) => {
    try {
      // Intentar obtener datos del backend
      const response = await fetch(ENDPOINTS.SOLICITUDES_DETALLES);

      if (response.ok) {
        const data = await response.json();

        // Mapeo básico si es necesario, o retorno directo si coincide la estructura
        // Asumimos que data es un array de ISolicitud o compatible
        if (Array.isArray(data)) {
          // Si el backend devuelve status 200 y un array, usamos eso.
          // Podríamos validar campos aquí si fuera crítico.
          resolve(data as ISolicitud[]);
          return;
        }
      } else {
      }
    } catch (error) {
    }

    // FALLBACK: Lógica original (localStorage + Mock)
    setTimeout(() => {
      let solicitudes = obtenerSolicitudesStorage();

      // Aplicar filtros
      if (filtros) {
        if (typeof filtros.semana === 'number') {
          solicitudes = solicitudes.filter(s => s.semana === filtros.semana);
        }
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

        if (data.semana !== undefined) {
          if (!Number.isInteger(data.semana) || data.semana < 1 || data.semana > 18) {
            reject(new Error('La semana seleccionada no es válida'));
            return;
          }
        }

        // Si la solicitud estaba aceptada (normal o modificada), volver a Pendiente
        const estabaAceptada = solicitud.estado === 'Aceptada' || solicitud.estado === 'AceptadaModificada';
        const nuevoEstado: EstadoSolicitud = estabaAceptada ? 'Pendiente' : solicitud.estado;

        const itemsActualizados = data.items
          ? data.items.map(item => ({
            ...item,
            id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
          }))
          : solicitud.items;

        // Actualizar solicitud
        solicitudes[index] = {
          ...solicitud,
          ...data,
          items: itemsActualizados,
          estado: nuevoEstado,
          fechaUltimaModificacion: new Date().toISOString(),
        };

        guardarSolicitudesStorage(solicitudes);

        if (nuevoEstado === 'Pendiente' && estabaAceptada) {
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

        const esAdmin = usuario.rol === 'Administrador';

        // Verificar permisos: el profesor dueño o el administrador pueden eliminar
        if (!esAdmin && solicitud.profesorId !== usuario.id) {
          reject(new Error('No tienes permiso para eliminar esta solicitud'));
          return;
        }

        // Solo limitar estado cuando no es administrador
        if (!esAdmin && solicitud.estado !== 'Pendiente') {
          reject(new Error('Solo se pueden eliminar solicitudes en estado Pendiente'));
          return;
        }

        solicitudes.splice(index, 1);
        guardarSolicitudesStorage(solicitudes);

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


        if (data.actualizacion?.semana !== undefined) {
          if (!Number.isInteger(data.actualizacion.semana) || data.actualizacion.semana < 1 || data.actualizacion.semana > 18) {
            reject(new Error('La semana seleccionada no es válida'));
            return;
          }
        }

        // Actualizar estado
        solicitudes[index] = {
          ...solicitudes[index],
          ...data.actualizacion,
          estado: data.estado,
          semana: data.actualizacion?.semana ?? solicitudes[index].semana,
          comentarioRechazo: data.estado === 'Rechazada' ? data.comentarioRechazo : undefined,
          comentarioAdministrador: data.estado === 'Rechazada' ? undefined : data.comentarioAdministrador,
          fechaAprobacion: new Date().toISOString(),
          aprobadoPor: data.aprobadoPor,
          fechaUltimaModificacion: new Date().toISOString(),
        };
        if (data.actualizacion?.items) {
          solicitudes[index].items = data.actualizacion.items.map(item => ({
            ...item,
            id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
          }));
        }

        guardarSolicitudesStorage(solicitudes);

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
        aceptadas: solicitudes.filter(s => s.estado === 'Aceptada' || s.estado === 'AceptadaModificada').length,
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
      const aceptadas = solicitudes.filter(s => s.estado === 'Aceptada' || s.estado === 'AceptadaModificada');
      resolve(aceptadas);
    }, 100);
  });
};

/**
 * Actualizar estado de bodega y agregar ítems adicionales
 */
export const actualizarEstadoBodegaService = (
  id: string,
  estado: 'Pendiente' | 'Armado',
  itemsAdicionales?: import('../types/solicitud.types').IItemSolicitud[]
): Promise<ISolicitud> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const solicitudes = obtenerSolicitudesStorage();
        const index = solicitudes.findIndex(s => s.id === id);

        if (index === -1) {
          reject(new Error('Solicitud no encontrada'));
          return;
        }

        // Actualizar solo campos de bodega
        solicitudes[index] = {
          ...solicitudes[index],
          estadoBodega: estado,
          itemsAdicionalesBodega: itemsAdicionales || solicitudes[index].itemsAdicionalesBodega || [],
          fechaUltimaModificacion: new Date().toISOString(),
        };

        guardarSolicitudesStorage(solicitudes);

        resolve(solicitudes[index]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};