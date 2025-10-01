// ========================================
// ARCHIVO: contexts/RolesContext.tsx
// Este archivo maneja los roles de forma global en toda la aplicación
// ========================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IRole } from '../types/user.types';

/**
 * CLAVE PARA GUARDAR LOS ROLES EN EL NAVEGADOR
 * Debe ser la misma que usas en la gestión de roles
 */
const STORAGE_KEY = 'sistema-roles-configurados';

/**
 * ROLES INICIALES - Los mismos que tienes en tu gestión de roles
 * Estos se usan solo la primera vez, después se usan los guardados
 */
const rolesIniciales: IRole[] = [
  {
    id: '1',
    nombre: 'Admin',
    permisos: ['dashboard', 'inventario', 'solicitud', 'gestion-pedidos', 'conglomerado-pedidos', 'gestion-proveedores', 'bodega-transito', 'gestion-recetas', 'ramos-admin', 'gestion-roles']
  },
  {
    id: '2',
    nombre: 'Co-Admin',
    permisos: ['dashboard', 'inventario', 'solicitud', 'gestion-pedidos', 'conglomerado-pedidos', 'gestion-proveedores', 'bodega-transito', 'gestion-recetas', 'ramos-admin']
  },
  {
    id: '3',
    nombre: 'Gestor de Pedidos',
    permisos: ['dashboard', 'gestion-pedidos', 'conglomerado-pedidos']
  },
  {
    id: '4',
    nombre: 'Profesor a Cargo',
    permisos: ['dashboard', 'solicitud']
  },
  {
    id: '5',
    nombre: 'Encargado de Bodega',
    permisos: ['dashboard', 'inventario']
  },
  {
    id: '6',
    nombre: 'Asistente de Bodega',
    permisos: ['dashboard', 'bodega-transito']
  }
];

/**
 * INTERFAZ DEL CONTEXTO DE ROLES
 * Define qué funciones y datos estarán disponibles en toda la app
 */
interface RolesContextType {
  roles: IRole[];                                    // Lista actual de roles
  obtenerRolPorNombre: (nombre: string) => IRole | undefined;  // Buscar rol por nombre
  obtenerRolPorId: (id: string) => IRole | undefined;         // Buscar rol por ID
  usuarioTienePermiso: (nombreRol: string, permiso: string) => boolean;  // Verificar permisos
  recargarRoles: () => void;                         // Recargar roles del localStorage
  loading: boolean;                                  // Estado de carga
}

/**
 * CONTEXTO DE ROLES
 * Permite compartir los roles entre todos los componentes
 */
const RolesContext = createContext<RolesContextType | undefined>(undefined);

/**
 * FUNCIONES AUXILIARES PARA MANEJAR ALMACENAMIENTO
 */

/**
 * Carga los roles desde localStorage
 */
const cargarRolesDelAlmacenamiento = (): IRole[] => {
  try {
    const rolesGuardados = localStorage.getItem(STORAGE_KEY);
    if (rolesGuardados) {
      return JSON.parse(rolesGuardados);
    }
    return rolesIniciales;
  } catch (error) {
    console.error('Error al cargar roles del almacenamiento:', error);
    return rolesIniciales;
  }
};

/**
 * PROVEEDOR DEL CONTEXTO DE ROLES
 * Este componente debe envolver toda tu aplicación
 * 
 * @param children - Componentes hijos que tendrán acceso al contexto
 */
interface RolesProviderProps {
  children: ReactNode;
}

export const RolesProvider: React.FC<RolesProviderProps> = ({ children }) => {
  const [roles, setRoles] = useState<IRole[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * EFECTO PARA CARGAR ROLES AL INICIALIZAR
   * Se ejecuta una sola vez cuando se monta el componente
   */
  useEffect(() => {
    const cargarRoles = () => {
      setLoading(true);
      try {
        const rolesGuardados = cargarRolesDelAlmacenamiento();
        setRoles(rolesGuardados);
      } catch (error) {
        console.error('Error al inicializar roles:', error);
        setRoles(rolesIniciales);
      } finally {
        setLoading(false);
      }
    };

    cargarRoles();
  }, []);

  /**
   * EFECTO PARA DETECTAR CAMBIOS EN LOCALSTORAGE
   * Esto permite que los cambios en gestión de roles se reflejen automáticamente
   */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        // Si cambió la configuración de roles, recargar
        const nuevosRoles = cargarRolesDelAlmacenamiento();
        setRoles(nuevosRoles);
      }
    };

    // Escuchar cambios en localStorage
    window.addEventListener('storage', handleStorageChange);

    // Limpiar el listener cuando se desmonte el componente
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  /**
   * FUNCIÓN: Buscar un rol por su nombre
   * 
   * @param nombre - Nombre del rol a buscar
   * @returns El rol encontrado o undefined
   */
  const obtenerRolPorNombre = (nombre: string): IRole | undefined => {
    return roles.find(rol => rol.nombre.toLowerCase() === nombre.toLowerCase());
  };

  /**
   * FUNCIÓN: Buscar un rol por su ID
   * 
   * @param id - ID del rol a buscar
   * @returns El rol encontrado o undefined
   */
  const obtenerRolPorId = (id: string): IRole | undefined => {
    return roles.find(rol => rol.id === id);
  };

  /**
   * FUNCIÓN: Verificar si un usuario con cierto rol tiene un permiso específico
   * 
   * @param nombreRol - Nombre del rol del usuario
   * @param permiso - Permiso que queremos verificar
   * @returns true si tiene el permiso, false si no
   */
  const usuarioTienePermiso = (nombreRol: string, permiso: string): boolean => {
    const rol = obtenerRolPorNombre(nombreRol);
    return rol ? rol.permisos.includes(permiso) : false;
  };

  /**
   * FUNCIÓN: Recargar roles manualmente
   * Útil para forzar una actualización
   */
  const recargarRoles = () => {
    const nuevosRoles = cargarRolesDelAlmacenamiento();
    setRoles(nuevosRoles);
  };

  // VALOR DEL CONTEXTO
  // Todo lo que estará disponible para los componentes que usen este contexto
  const valorContexto: RolesContextType = {
    roles,
    obtenerRolPorNombre,
    obtenerRolPorId,
    usuarioTienePermiso,
    recargarRoles,
    loading
  };

  return (
    <RolesContext.Provider value={valorContexto}>
      {children}
    </RolesContext.Provider>
  );
};

/**
 * HOOK PERSONALIZADO: useRoles
 * Este hook facilita el uso del contexto de roles
 * 
 * @returns Objeto con todas las funciones y datos de roles
 */
export const useRoles = (): RolesContextType => {
  const context = useContext(RolesContext);
  
  if (context === undefined) {
    throw new Error('useRoles debe ser usado dentro de un RolesProvider');
  }
  
  return context;
};

// ========================================
// HOOK ADICIONAL: usePermisos
// Hook especializado para verificar permisos del usuario actual
// ========================================

/**
 * INTERFAZ PARA EL HOOK DE PERMISOS
 */
interface UsePermisosReturn {
  tienePermiso: (permiso: string) => boolean;      // Verificar un permiso específico
  tieneAlgunPermiso: (permisos: string[]) => boolean;  // Verificar si tiene alguno de varios permisos
  tieneTodosLosPermisos: (permisos: string[]) => boolean; // Verificar si tiene todos los permisos
  permisosDelUsuario: string[];                    // Lista de todos los permisos del usuario
  loading: boolean;                                // Estado de carga
}

/**
 * HOOK: usePermisos
 * Hook especializado para manejar permisos del usuario actual
 * 
 * @param rolUsuario - Nombre del rol del usuario actual
 * @returns Objeto con funciones para verificar permisos
 */
export const usePermisos = (rolUsuario?: string): UsePermisosReturn => {
  const { obtenerRolPorNombre, loading } = useRoles();

  // Obtener los permisos del usuario actual
  const permisosDelUsuario = React.useMemo(() => {
    if (!rolUsuario) return [];
    const rol = obtenerRolPorNombre(rolUsuario);
    return rol ? rol.permisos : [];
  }, [rolUsuario, obtenerRolPorNombre]);

  /**
   * Verificar si el usuario tiene un permiso específico
   */
  const tienePermiso = React.useCallback((permiso: string): boolean => {
    return permisosDelUsuario.includes(permiso);
  }, [permisosDelUsuario]);

  /**
   * Verificar si el usuario tiene al menos uno de varios permisos
   */
  const tieneAlgunPermiso = React.useCallback((permisos: string[]): boolean => {
    return permisos.some(permiso => permisosDelUsuario.includes(permiso));
  }, [permisosDelUsuario]);

  /**
   * Verificar si el usuario tiene todos los permisos especificados
   */
  const tieneTodosLosPermisos = React.useCallback((permisos: string[]): boolean => {
    return permisos.every(permiso => permisosDelUsuario.includes(permiso));
  }, [permisosDelUsuario]);

  return {
    tienePermiso,
    tieneAlgunPermiso,
    tieneTodosLosPermisos,
    permisosDelUsuario,
    loading
  };
};

// ========================================
// COMPONENTE: ProtectedRoute
// Componente para proteger rutas según permisos
// ========================================

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission: string;          // Permiso requerido para ver el contenido
  userRole?: string;                   // Rol del usuario actual
  fallback?: ReactNode;                // Qué mostrar si no tiene permisos
}
