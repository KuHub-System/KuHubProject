/**
 * SERVICIO DE GESTIÓN DE ASIGNATURAS CON SECCIONES
 * Maneja la persistencia de asignaturas y secciones en localStorage
 */

import { IAsignatura, ISeccion, IAsignaturaCreacion, IAsignaturaActualizacion } from '../types/asignatura.types';

const STORAGE_KEY = 'kuhub-asignaturas';

/**
 * Helper para obtener asignaturas del localStorage
 */
const obtenerAsignaturasStorage = (): IAsignatura[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

/**
 * Helper para guardar asignaturas en localStorage
 */
const guardarAsignaturasStorage = (asignaturas: IAsignatura[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(asignaturas));
};

/**
 * Obtener todas las asignaturas
 */
export const obtenerAsignaturasService = (): Promise<IAsignatura[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const asignaturas = obtenerAsignaturasStorage();
      resolve(asignaturas);
    }, 100);
  });
};

/**
 * Obtener asignatura por ID
 */
export const obtenerAsignaturaPorIdService = (id: string): Promise<IAsignatura | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const asignaturas = obtenerAsignaturasStorage();
      const asignatura = asignaturas.find(a => a.id === id);
      resolve(asignatura || null);
    }, 100);
  });
};

/**
 * Crear nueva asignatura
 */
export const crearAsignaturaService = (data: IAsignaturaCreacion): Promise<IAsignatura> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const asignaturas = obtenerAsignaturasStorage();
        
        // Validar que el código no exista
        const codigoExiste = asignaturas.some(a => a.codigo === data.codigo);
        if (codigoExiste) {
          reject(new Error('El código de asignatura ya existe'));
          return;
        }
        
        const nuevaAsignatura: IAsignatura = {
          id: Date.now().toString(),
          codigo: data.codigo,
          nombre: data.nombre,
          profesorACargoId: data.profesorACargoId,
          profesorACargoNombre: data.profesorACargoNombre,
          creditos: data.creditos,
          semestre: data.semestre,
          departamento: data.departamento,
          descripcion: data.descripcion,
          secciones: data.secciones || [],
          fechaCreacion: new Date().toISOString(),
          fechaActualizacion: new Date().toISOString(),
        };
        
        asignaturas.push(nuevaAsignatura);
        guardarAsignaturasStorage(asignaturas);
        
        resolve(nuevaAsignatura);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Actualizar asignatura
 */
export const actualizarAsignaturaService = (
  id: string,
  data: IAsignaturaActualizacion
): Promise<IAsignatura> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const asignaturas = obtenerAsignaturasStorage();
        const index = asignaturas.findIndex(a => a.id === id);
        
        if (index === -1) {
          reject(new Error('Asignatura no encontrada'));
          return;
        }
        
        // Validar código único si se está actualizando
        if (data.codigo) {
          const codigoExiste = asignaturas.some(
            a => a.id !== id && a.codigo === data.codigo
          );
          if (codigoExiste) {
            reject(new Error('El código de asignatura ya existe'));
            return;
          }
        }
        
        asignaturas[index] = {
          ...asignaturas[index],
          ...data,
          fechaActualizacion: new Date().toISOString(),
        };
        
        guardarAsignaturasStorage(asignaturas);
        resolve(asignaturas[index]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Eliminar asignatura
 */
export const eliminarAsignaturaService = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const asignaturas = obtenerAsignaturasStorage();
        const index = asignaturas.findIndex(a => a.id === id);
        
        if (index === -1) {
          reject(new Error('Asignatura no encontrada'));
          return;
        }
        
        asignaturas.splice(index, 1);
        guardarAsignaturasStorage(asignaturas);
        resolve();
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Agregar sección a una asignatura
 */
export const agregarSeccionService = (
  asignaturaId: string,
  seccion: Omit<ISeccion, 'id'>
): Promise<IAsignatura> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const asignaturas = obtenerAsignaturasStorage();
        const index = asignaturas.findIndex(a => a.id === asignaturaId);
        
        if (index === -1) {
          reject(new Error('Asignatura no encontrada'));
          return;
        }
        
        const nuevaSeccion: ISeccion = {
          ...seccion,
          id: `${asignaturaId}-${Date.now()}`,
        };
        
        asignaturas[index].secciones.push(nuevaSeccion);
        asignaturas[index].fechaActualizacion = new Date().toISOString();
        
        guardarAsignaturasStorage(asignaturas);
        resolve(asignaturas[index]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Actualizar sección
 */
export const actualizarSeccionService = (
  asignaturaId: string,
  seccionId: string,
  seccion: Partial<ISeccion>
): Promise<IAsignatura> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const asignaturas = obtenerAsignaturasStorage();
        const index = asignaturas.findIndex(a => a.id === asignaturaId);
        
        if (index === -1) {
          reject(new Error('Asignatura no encontrada'));
          return;
        }
        
        const seccionIndex = asignaturas[index].secciones.findIndex(s => s.id === seccionId);
        if (seccionIndex === -1) {
          reject(new Error('Sección no encontrada'));
          return;
        }
        
        asignaturas[index].secciones[seccionIndex] = {
          ...asignaturas[index].secciones[seccionIndex],
          ...seccion,
        };
        asignaturas[index].fechaActualizacion = new Date().toISOString();
        
        guardarAsignaturasStorage(asignaturas);
        resolve(asignaturas[index]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Eliminar sección
 */
export const eliminarSeccionService = (
  asignaturaId: string,
  seccionId: string
): Promise<IAsignatura> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const asignaturas = obtenerAsignaturasStorage();
        const index = asignaturas.findIndex(a => a.id === asignaturaId);
        
        if (index === -1) {
          reject(new Error('Asignatura no encontrada'));
          return;
        }
        
        asignaturas[index].secciones = asignaturas[index].secciones.filter(
          s => s.id !== seccionId
        );
        asignaturas[index].fechaActualizacion = new Date().toISOString();
        
        guardarAsignaturasStorage(asignaturas);
        resolve(asignaturas[index]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Calcular total de alumnos de una asignatura
 */
export const calcularTotalAlumnosService = (asignaturaId: string): Promise<number> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const asignaturas = obtenerAsignaturasStorage();
      const asignatura = asignaturas.find(a => a.id === asignaturaId);
      
      if (!asignatura) {
        resolve(0);
        return;
      }
      
      const total = asignatura.secciones
        .filter(s => s.estado === 'Activa')
        .reduce((sum, s) => sum + s.cantidadAlumnos, 0);
      
      resolve(total);
    }, 50);
  });
};

