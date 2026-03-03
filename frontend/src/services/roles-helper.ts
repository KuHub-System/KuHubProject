/**
 * HELPER PARA GESTIÓN DE ROLES
 * Funciones auxiliares para manejar actualizaciones de roles y sincronización
 * 
 * Ubicación: src/services/roles-helper.ts
 */

import { IRole } from '../types/user.types';

const STORAGE_KEY = 'sistema-roles-configurados';

/**
 * Dispara eventos para notificar cambios en roles
 * Esto asegura que todos los componentes y contextos se enteren del cambio
 */
export const notificarCambioRoles = (): void => {
  // Evento personalizado para el mismo tab
  window.dispatchEvent(new CustomEvent('roles-updated'));

  // Forzar evento storage para otros tabs (hack)
  // El evento storage normalmente solo se dispara entre tabs diferentes
  // Este truco simula un cambio para forzar la actualización
  const roles = localStorage.getItem(STORAGE_KEY);
  if (roles) {
    localStorage.setItem(STORAGE_KEY, roles);
  }

};

/**
 * Guarda roles y notifica cambios
 * Usa esta función en lugar de localStorage.setItem directamente
 */
export const guardarRoles = (roles: IRole[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  notificarCambioRoles();
};

/**
 * Obtiene los roles actuales
 */
export const obtenerRoles = (): IRole[] => {
  const rolesStr = localStorage.getItem(STORAGE_KEY);
  if (!rolesStr) return [];

  try {
    return JSON.parse(rolesStr);
  } catch {
    return [];
  }
};

/**
 * Obtiene un rol por nombre
 */
export const obtenerRolPorNombre = (nombre: string): IRole | null => {
  const roles = obtenerRoles();
  return roles.find(r => r.nombre.toLowerCase() === nombre.toLowerCase()) || null;
};

/**
 * Verifica si un rol tiene un permiso específico
 */
export const rolTienePermiso = (nombreRol: string, permiso: string): boolean => {
  const rol = obtenerRolPorNombre(nombreRol);
  return rol ? rol.permisos.includes(permiso) : false;
};