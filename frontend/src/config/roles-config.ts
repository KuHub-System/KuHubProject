/**
 * CONFIGURACIÓN CENTRALIZADA DE ROLES
 * 
 * Este archivo es la ÚNICA fuente de verdad para los roles del sistema.
 * Todos los demás archivos deben importar desde aquí.
 * 
 * ⚠️ IMPORTANTE: No definir roles en ningún otro archivo.
 */

import { IRole } from '../types/user.types';

/**
 * CLAVE PARA LOCALSTORAGE
 * Debe ser la misma en toda la aplicación
 */
export const ROLES_STORAGE_KEY = 'sistema-roles-configurados';

/**
 * ROLES DEL SISTEMA
 * Esta es la configuración por defecto que se usa cuando no hay roles guardados.
 * Los nombres DEBEN coincidir con los roles en usuario.types.ts
 */
export const ROLES_SISTEMA: IRole[] = [
  {
    id: '1',
    nombre: 'Administrador',
    permisos: [
      'dashboard',
      'inventario',
      'solicitud',
      'gestion-pedidos',
      'gestion-solicitudes',
      'conglomerado-pedidos',
      'gestion-proveedores',
      'bodega-transito',
      'gestion-recetas',
      'ramos-admin',
      'gestion-roles',
      'gestion-usuarios'
    ]
  },
  {
    id: '2',
    nombre: 'Co-Administrador',
    permisos: [
      'dashboard',
      'inventario',
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
      'solicitud'
    ]
  },
  {
    id: '5',
    nombre: 'Encargado de Bodega',
    permisos: [
      'dashboard',
      'inventario'
    ]
  },
  {
    id: '6',
    nombre: 'Asistente de Bodega',
    permisos: [
      'dashboard',
      'bodega-transito'
    ]
  },
  {
    id: '7',
    nombre: 'Profesor',
    permisos: [
      'gestion-recetas'
    ]
  }
];

/**
 * PÁGINAS DISPONIBLES EN EL SISTEMA
 * Lista de todas las páginas que pueden ser asignadas como permisos
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
  { id: 'gestion-usuarios', nombre: 'Gestión de Usuarios', descripcion: 'Administración de usuarios del sistema' }
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
      
      // ✅ Validar que los roles guardados tengan los nombres correctos
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
          console.log('✅ Roles cargados desde localStorage:', roles.map((r: IRole) => r.nombre).join(', '));
          return roles;
        }

        console.warn('⚠️ Los roles en localStorage no tienen los permisos actualizados. Actualizando configuración...');
        localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(ROLES_SISTEMA));
        window.dispatchEvent(new Event('roles-updated'));
        return ROLES_SISTEMA;
      } else {
        console.warn('⚠️ Roles en localStorage tienen nombres incorrectos. Corrigiendo...');
        console.warn('   Guardados:', roles.map((r: IRole) => r.nombre).join(', '));
        console.warn('   Correctos:', nombresCorrectos.join(', '));
        // Guardar los roles correctos automáticamente
        localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(ROLES_SISTEMA));
        window.dispatchEvent(new Event('roles-updated'));
        return ROLES_SISTEMA;
      }
    }
    
    console.log('📝 No hay roles en localStorage. Usando y guardando ROLES_SISTEMA.');
    // Guardar los roles por defecto
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
    // Disparar evento para que otros componentes se enteren
    window.dispatchEvent(new Event('roles-updated'));
    console.log('✅ Roles guardados correctamente');
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