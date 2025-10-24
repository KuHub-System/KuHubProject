// ========================================
// ARCHIVO: contexts/RolesContext.tsx
// Este archivo maneja los roles de forma global en toda la aplicación
// ========================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IRole } from '../types/user.types';
import { ROLES_STORAGE_KEY, cargarRoles, guardarRoles as guardarRolesConfig } from '../config/roles-config';

/**
 * Carga los roles desde localStorage usando la función centralizada
 */
const cargarRolesDelAlmacenamiento = (): IRole[] => {
  return cargarRoles();
};

/**
 * INTERFAZ DEL CONTEXTO DE ROLES
 */
interface RolesContextType {
  roles: IRole[];
  obtenerRolPorNombre: (nombre: string) => IRole | undefined;
  obtenerRolPorId: (id: string) => IRole | undefined;
  usuarioTienePermiso: (nombreRol: string, permiso: string) => boolean;
  recargarRoles: () => void;
  loading: boolean;
}

/**
 * CONTEXTO DE ROLES
 */
const RolesContext = createContext<RolesContextType | undefined>(undefined);

/**
 * PROVEEDOR DEL CONTEXTO DE ROLES
 */
interface RolesProviderProps {
  children: ReactNode;
}

export const RolesProvider: React.FC<RolesProviderProps> = ({ children }) => {
  const [roles, setRoles] = useState<IRole[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const cargarRolesFunc = () => {
      setLoading(true);
      try {
        const rolesGuardados = cargarRolesDelAlmacenamiento();
        setRoles(rolesGuardados);
      } catch (error) {
        console.error('Error al inicializar roles:', error);
        // Si hay error, usar array vacío - los roles se cargarán desde roles-config
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    cargarRolesFunc();
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ROLES_STORAGE_KEY) {
        const nuevosRoles = cargarRolesDelAlmacenamiento();
        setRoles(nuevosRoles);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const obtenerRolPorNombre = (nombre: string): IRole | undefined => {
    return roles.find(rol => rol.nombre.toLowerCase() === nombre.toLowerCase());
  };

  const obtenerRolPorId = (id: string): IRole | undefined => {
    return roles.find(rol => rol.id === id);
  };

  const usuarioTienePermiso = (nombreRol: string, permiso: string): boolean => {
    const rol = obtenerRolPorNombre(nombreRol);
    return rol ? rol.permisos.includes(permiso) : false;
  };

  const recargarRoles = () => {
    const nuevosRoles = cargarRolesDelAlmacenamiento();
    setRoles(nuevosRoles);
  };

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
 * HOOK: useRoles
 */
export const useRoles = (): RolesContextType => {
  const context = useContext(RolesContext);
  
  if (context === undefined) {
    throw new Error('useRoles debe ser usado dentro de un RolesProvider');
  }
  
  return context;
};

/**
 * HOOK: usePermisos
 */
interface UsePermisosReturn {
  tienePermiso: (permiso: string) => boolean;
  tieneAlgunPermiso: (permisos: string[]) => boolean;
  tieneTodosLosPermisos: (permisos: string[]) => boolean;
  permisosDelUsuario: string[];
  loading: boolean;
}

export const usePermisos = (rolUsuario?: string): UsePermisosReturn => {
  const { obtenerRolPorNombre, loading } = useRoles();

  const permisosDelUsuario = React.useMemo(() => {
    if (!rolUsuario) return [];
    const rol = obtenerRolPorNombre(rolUsuario);
    return rol ? rol.permisos : [];
  }, [rolUsuario, obtenerRolPorNombre]);

  const tienePermiso = React.useCallback((permiso: string): boolean => {
    return permisosDelUsuario.includes(permiso);
  }, [permisosDelUsuario]);

  const tieneAlgunPermiso = React.useCallback((permisos: string[]): boolean => {
    return permisos.some(permiso => permisosDelUsuario.includes(permiso));
  }, [permisosDelUsuario]);

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

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission: string;
  userRole?: string;
  fallback?: ReactNode;
}