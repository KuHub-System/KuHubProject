/**
 * CONFIGURACIÓN CENTRALIZADA DE ROLES
 *
 * Este archivo es la ÚNICA fuente de verdad para los roles del sistema.
 * Todos los demás archivos deben importar desde aquí.
 *
 * ⚠️ ACTUALIZADO: Ahora incluye los 7 roles del sistema
 * ⚠️ IMPORTANTE: Los nombres DEBEN coincidir con los del backend
 */

import { IRole } from '../types/user.types';

/**
 * CLAVE PARA LOCALSTORAGE
 */
export const ROLES_STORAGE_KEY = 'sistema-roles-configurados';

/**
 * ROLES DEL SISTEMA - Actualizados con los 7 roles
 *
 * Mapeo Frontend ↔ Backend:
 * - Frontend usa: "Administrador", "Co-Administrador", etc.
 * - Backend ENUM: "ADMINISTRADOR", "CO_ADMINISTRADOR", etc.
 * - La conversión se hace automáticamente en los servicios
 */
export const ROLES_SISTEMA: IRole[] = [
  {
    id: '1',
    nombre: 'Administrador',
    permisos: [
      'dashboard',
      'inventario',
      'historial-movimientos',
      'solicitud',
      'gestion-pedidos',
      'gestion-solicitudes',
      'conglomerado-pedidos',
      'gestion-proveedores',
      'bodega-transito',
      'gestion-recetas',
      'ramos-admin',
      'gestion-roles',
      'gestion-usuarios',
      'admin-sistema'
    ]
  },
  {
    id: '2',
    nombre: 'Co-Administrador',
    permisos: [
      'dashboard',
      'inventario',
      'historial-movimientos',
      'solicitud',
      'gestion-pedidos',
      'gestion-solicitudes',
      'conglomerado-pedidos',
      'gestion-proveedores',
      'bodega-transito',
      'gestion-recetas',
      'ramos-admin'
    ]
  },
  {
    id: '3',
    nombre: 'Gestor de Pedidos',
    permisos: [
      'dashboard',
      'gestion-pedidos',
      'gestion-solicitudes',
      'conglomerado-pedidos'
    ]
  },
  {
    id: '4',
    nombre: 'Profesor a Cargo',
    permisos: [
      'dashboard',
      'solicitud',
      'gestion-recetas'
    ]
  },
  {
    id: '5',
    nombre: 'Docente',
    permisos: [
      'dashboard',
      'solicitud',
      'gestion-recetas'
    ]
  },
  {
    id: '6',
    nombre: 'Encargado de Bodega',
    permisos: [
      'dashboard',
      'inventario',
      'historial-movimientos',
      'bodega-transito'
    ]
  },
  {
    id: '7',
    nombre: 'Asistente de Bodega',
    permisos: [
      'dashboard',
      'bodega-transito',
      'historial-movimientos'
    ]
  }

];

/**
 * PÁGINAS DISPONIBLES EN EL SISTEMA
 */
export const PAGINAS_DISPONIBLES = [
  { id: 'dashboard', nombre: 'Dashboard', descripcion: 'Panel principal con estadísticas' },
  { id: 'inventario', nombre: 'Inventario', descripcion: 'Gestión de productos' },
  { id: 'solicitud', nombre: 'Solicitud', descripcion: 'Creación de solicitudes de insumos' },
  { id: 'gestion-pedidos', nombre: 'Gestión de Pedidos', descripcion: 'Administración de pedidos' },
  { id: 'gestion-solicitudes', nombre: 'Gestión de Solicitudes', descripcion: 'Administración de solicitudes' },
  { id: 'conglomerado-pedidos', nombre: 'Conglomerado de Pedidos', descripcion: 'Agrupación de pedidos' },
  { id: 'gestion-proveedores', nombre: 'Gestión de Proveedores', descripcion: 'Administración de proveedores' },
  { id: 'bodega-transito', nombre: 'Bodega de Tránsito', descripcion: 'Control de productos en tránsito' },
  { id: 'gestion-recetas', nombre: 'Gestión de Recetas', descripcion: 'Administración de recetas' },
  { id: 'ramos-admin', nombre: 'Ramos Admin', descripcion: 'Administración de asignaturas' },
  { id: 'gestion-roles', nombre: 'Gestión de Roles', descripcion: 'Administración de roles y permisos' },
  { id: 'gestion-usuarios', nombre: 'Gestión de Usuarios', descripcion: 'Administración de usuarios del sistema' },
  { id: 'admin-sistema', nombre: 'Administración del Sistema', descripcion: 'Centro de control: horarios, semanas y salas académicas' }
];

/**
 * FUNCIONES HELPER PARA ROLES
 */

/**
 * Cargar roles desde localStorage o usar los por defecto
 */
export const cargarRoles = (): IRole[] => {
  try {
    const rolesGuardados = localStorage.getItem(ROLES_STORAGE_KEY);
    if (rolesGuardados) {
      const roles = JSON.parse(rolesGuardados);

      // Validar que los roles guardados tengan los nombres correctos
      const nombresCorrectos = ROLES_SISTEMA.map(r => r.nombre);
      const rolesValidos = roles.every((rol: IRole) =>
        nombresCorrectos.includes(rol.nombre)
      );

      if (rolesValidos && roles.length === ROLES_SISTEMA.length) {
        const tienenPermisosActualizados = roles.every((rol: IRole) => {
          const rolDefecto = ROLES_SISTEMA.find(r => r.nombre === rol.nombre);
          if (!rolDefecto) return false;
          const permisosActuales = [...rol.permisos].sort();
          const permisosDefecto = [...rolDefecto.permisos].sort();
          if (permisosActuales.length !== permisosDefecto.length) return false;
          return permisosDefecto.every((permiso, index) => permiso === permisosActuales[index]);
        });

        if (tienenPermisosActualizados) {
          return roles;
        }

        console.warn('⚠️ Los roles en localStorage no tienen los permisos actualizados. Actualizando configuración...');
        localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(ROLES_SISTEMA));
        window.dispatchEvent(new Event('roles-updated'));
        return ROLES_SISTEMA;
      } else {
        console.warn('⚠️ Roles en localStorage desactualizados. Corrigiendo...');
        localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(ROLES_SISTEMA));
        window.dispatchEvent(new Event('roles-updated'));
        return ROLES_SISTEMA;
      }
    }

    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(ROLES_SISTEMA));
    return ROLES_SISTEMA;
  } catch (error) {
    console.error('❌ Error al cargar roles:', error);
    return ROLES_SISTEMA;
  }
};

/**
 * Guardar roles en localStorage
 */
export const guardarRoles = (roles: IRole[]): void => {
  try {
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
    window.dispatchEvent(new Event('roles-updated'));
  } catch (error) {
    console.error('❌ Error al guardar roles:', error);
    throw error;
  }
};

/**
 * Buscar un rol por nombre
 */
export const buscarRolPorNombre = (nombre: string, roles?: IRole[]): IRole | undefined => {
  const rolesActuales = roles || cargarRoles();
  return rolesActuales.find(rol =>
    rol.nombre.toLowerCase() === nombre.toLowerCase()
  );
};

/**
 * Buscar un rol por ID
 */
export const buscarRolPorId = (id: string, roles?: IRole[]): IRole | undefined => {
  const rolesActuales = roles || cargarRoles();
  return rolesActuales.find(rol => rol.id === id);
};

/**
 * Verificar si un rol tiene un permiso específico
 */
export const rolTienePermiso = (nombreRol: string, permiso: string): boolean => {
  const rol = buscarRolPorNombre(nombreRol);
  return rol ? rol.permisos.includes(permiso) : false;
};