/**
 * CONTEXTO DE PERMISOS GRANULARES
 *
 * Provee acceso CRUD por módulo al resto de la aplicación.
 * Se carga una sola vez al iniciar sesión y se invalida al cerrarla.
 *
 * Jerarquía: none < read < write
 *  - write  → puede leer + crear + actualizar + eliminar
 *  - read   → solo puede leer
 *  - none   → sin acceso (los elementos se ocultan)
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-context';
import { permissionService } from '../services/permission-service';
import {
  AccessLevel,
  ACCESS_HIERARCHY,
  ModuleKey,
  ModulePermissions,
  RolePermission,
  levelFromPermissions,
} from '../types/permissions.types';

// ── Interfaz del contexto ─────────────────────────────────────────────────────

interface PermissionContextType {
  /** true mientras se cargan los permisos del backend */
  isLoading: boolean;
  /** true si el usuario activo es Administrador (acceso total) */
  isAdmin: boolean;
  /**
   * Devuelve el nivel de acceso del usuario actual sobre un módulo.
   */
  getAccessLevel: (module: ModuleKey) => AccessLevel;
  /**
   * Comprueba si el usuario puede acceder al módulo con al menos minLevel.
   * Por defecto minLevel = 'read'.
   */
  canAccess: (module: ModuleKey, minLevel?: AccessLevel) => boolean;
  /** true si puede leer el módulo */
  canRead:   (module: ModuleKey) => boolean;
  /** true si puede crear en el módulo */
  canCreate: (module: ModuleKey) => boolean;
  /** true si puede actualizar en el módulo */
  canUpdate: (module: ModuleKey) => boolean;
  /** true si puede eliminar en el módulo */
  canDelete: (module: ModuleKey) => boolean;
  /** Recarga permisos desde el backend (útil tras guardar cambios en gestion-roles) */
  refreshPermissions: () => Promise<void>;
  /** Matriz completa de todos los roles (para la página de gestión de roles) */
  allPermissions: RolePermission[];
}

// ── Contexto ──────────────────────────────────────────────────────────────────

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export const PermissionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [isLoading,          setIsLoading]          = useState(true);
  const [allPermissions,     setAllPermissions]      = useState<RolePermission[]>([]);
  const [userPermissions,    setUserPermissions]     = useState<Record<ModuleKey, ModulePermissions> | null>(null);
  // Cache CRUD granular del usuario actual
  const [crudCache,          setCrudCache]           = useState<Map<ModuleKey, { r: boolean; c: boolean; u: boolean; d: boolean }>>(new Map());

  // Solo el Administrador tiene acceso total garantizado (bypass de la matriz).
  // El Co-Administrador NO es bypass: respeta la matriz de permisos (sin Gestión de
  // Roles ni Administración del Sistema), igual que cualquier otro rol.
  const isAdmin = user?.rol === 'Administrador';

  // ── Carga de permisos ──────────────────────────────────────────────────────

  const refreshPermissions = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setAllPermissions([]);
      setUserPermissions(null);
      setCrudCache(new Map());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const all = await permissionService.getPermissions();
      setAllPermissions(all);

      // Normalizar para comparar: "PROFESOR_A_CARGO" ↔ "Profesor a Cargo"
      const normalizar = (s: string) =>
        (s ?? '').toLowerCase().replace(/[_-]/g, ' ').trim();

      const userRolNorm = normalizar(user.rol ?? '');

      // Buscar los permisos del rol del usuario actual usando normalización
      const myRolePerms = all.find((p) =>
        normalizar(p.role) === userRolNorm
      )?.permissions ?? null;

      setUserPermissions(myRolePerms);

      // Reconstruir cache CRUD desde la matriz (usando los booleanos REALES,
      // no un nivel colapsado: así un rol puede tener p.ej. editar pero no eliminar).
      const newCache = new Map<ModuleKey, { r: boolean; c: boolean; u: boolean; d: boolean }>();
      if (myRolePerms) {
        for (const [key, p] of Object.entries(myRolePerms)) {
          const mk = key as ModuleKey;
          newCache.set(mk, {
            r: p.puedeLeer || p.puedeCrear || p.puedeActualizar || p.puedeEliminar,
            c: p.puedeCrear,
            u: p.puedeActualizar,
            d: p.puedeEliminar,
          });
        }
      }
      setCrudCache(newCache);
    } catch (err) {
      console.error('[PermissionContext] Error al cargar permisos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.rol]);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  // ── Funciones de consulta ──────────────────────────────────────────────────

  const getAccessLevel = (module: ModuleKey): AccessLevel => {
    if (!user) return 'none';
    if (isAdmin)  return 'write'; // Administrador siempre tiene acceso total
    return levelFromPermissions(userPermissions?.[module]);
  };

  const canAccess = (module: ModuleKey, minLevel: AccessLevel = 'read'): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    return ACCESS_HIERARCHY[getAccessLevel(module)] >= ACCESS_HIERARCHY[minLevel];
  };

  const canRead   = (module: ModuleKey): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    return crudCache.get(module)?.r ?? false;
  };

  const canCreate = (module: ModuleKey): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    return crudCache.get(module)?.c ?? false;
  };

  const canUpdate = (module: ModuleKey): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    return crudCache.get(module)?.u ?? false;
  };

  const canDelete = (module: ModuleKey): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    return crudCache.get(module)?.d ?? false;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PermissionContext.Provider value={{
      isLoading,
      isAdmin,
      getAccessLevel,
      canAccess,
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      refreshPermissions,
      allPermissions,
    }}>
      {children}
    </PermissionContext.Provider>
  );
};

// ── Hooks públicos ────────────────────────────────────────────────────────────

export const usePermission = (): PermissionContextType => {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermission debe usarse dentro de <PermissionProvider>');
  return ctx;
};

/**
 * Hook conveniente para obtener todos los flags CRUD de un módulo en una sola llamada.
 *
 * @example
 * const { canRead, canCreate, canUpdate, canDelete, accessLevel } = useModulePermission('INVENTARIO');
 */
export const useModulePermission = (module: ModuleKey) => {
  const { canRead, canCreate, canUpdate, canDelete, getAccessLevel, isLoading, canAccess } = usePermission();

  return {
    canRead:     canRead(module),
    canCreate:   canCreate(module),
    canUpdate:   canUpdate(module),
    canDelete:   canDelete(module),
    accessLevel: getAccessLevel(module),
    hasAccess:   canAccess(module),
    isLoading,
  };
};

/**
 * Componente guardián de permisos CRUD.
 * Renderiza children solo si el usuario tiene la acción solicitada sobre el módulo.
 *
 * @example
 * <PermissionGuard module="INVENTARIO" action="create">
 *   <Button>Crear Producto</Button>
 * </PermissionGuard>
 */
interface PermissionGuardProps {
  module:   ModuleKey;
  action:   'read' | 'create' | 'update' | 'delete' | 'write';
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  module,
  action,
  children,
  fallback = null,
}) => {
  const { canRead, canCreate, canUpdate, canDelete, canAccess, isLoading } = usePermission();

  if (isLoading) return null;

  const allowed =
    action === 'read'   ? canRead(module)   :
    action === 'create' ? canCreate(module) :
    action === 'update' ? canUpdate(module) :
    action === 'delete' ? canDelete(module) :
    action === 'write'  ? canAccess(module, 'write') :
    false;

  return allowed ? <>{children}</> : <>{fallback}</>;
};
