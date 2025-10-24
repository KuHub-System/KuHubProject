import React from 'react';
import { IUser, IRole } from '../types/user.types';
import { iniciarSesionService, cerrarSesionService, obtenerUsuarioActualService } from '../services/auth-service';
import { ROLES_STORAGE_KEY, ROLES_SISTEMA, cargarRoles as cargarRolesConfig } from '../config/roles-config';

/**
 * FUNCIONES PARA MANEJAR LOS ROLES DINÁMICOS
 * Ahora usa la configuración centralizada desde roles-config.ts
 */

const cargarRolesActuales = (): IRole[] => {
  return cargarRolesConfig();
};

interface IAuthContext {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (requiredRoles: string[]) => boolean;
  hasSpecificPermission: (permission: string) => boolean;
  getUserPermissions: () => string[];
  canAccessPage: (pageId: string) => boolean;
  userRole: IRole | null;
  availableRoles: IRole[];
  reloadRoles: () => void;
}

const AuthContext = React.createContext<IAuthContext>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  logout: () => {},
  hasPermission: () => false,
  hasSpecificPermission: () => false,
  getUserPermissions: () => [],
  canAccessPage: () => false,
  userRole: null,
  availableRoles: [],
  reloadRoles: () => {},
});

export const useAuth = (): IAuthContext => {
  return React.useContext(AuthContext);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<IUser | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [availableRoles, setAvailableRoles] = React.useState<IRole[]>([]);
  const [userRole, setUserRole] = React.useState<IRole | null>(null);

  const reloadRoles = React.useCallback(() => {
    console.log('🔄 Recargando roles...');
    const nuevosRoles = cargarRolesActuales();
    setAvailableRoles(nuevosRoles);
  }, []);

  React.useEffect(() => {
    console.log('🚀 Inicializando auth-context');
    const roles = cargarRolesActuales();
    setAvailableRoles(roles);
  }, []);

  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ROLES_STORAGE_KEY) {
        console.log('🔔 Cambio de roles detectado (otro tab)');
        reloadRoles();
      }
    };

    const handleRolesUpdated = () => {
      console.log('🔔 Cambio de roles detectado (mismo tab)');
      reloadRoles();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('roles-updated', handleRolesUpdated);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('roles-updated', handleRolesUpdated);
    };
  }, [reloadRoles]);

  React.useEffect(() => {
    if (user && availableRoles.length > 0) {
      console.log('🔍 Buscando rol para usuario:', user.rol);
      console.log('🔍 Roles disponibles:', availableRoles.map(r => r.nombre));
      
      const rolActualizado = availableRoles.find(rol => 
        rol.nombre === user.rol || rol.nombre.toLowerCase() === user.rol.toLowerCase()
      );
      
      if (rolActualizado) {
        if (JSON.stringify(userRole?.permisos) !== JSON.stringify(rolActualizado.permisos)) {
          console.log('🔄 Actualizando permisos del usuario:', user.nombre);
          console.log('   Rol:', rolActualizado.nombre);
          console.log('   Permisos:', rolActualizado.permisos);
          setUserRole(rolActualizado);
        }
      } else {
        console.warn('⚠️ No se encontró el rol del usuario:', user.rol);
        console.warn('⚠️ Roles disponibles:', availableRoles.map(r => r.nombre).join(', '));
        setUserRole(null);
      }
    } else {
      setUserRole(null);
    }
  }, [user, availableRoles]);

  React.useEffect(() => {
    const checkAuth = () => {
      try {
        // ✅ obtenerUsuarioActualService() NO es async, retorna IUsuario | null directamente
        const usuarioActual = obtenerUsuarioActualService();
        
        if (usuarioActual) {
          // Convertir IUsuario a IUser
          const userData: IUser = {
            id: usuarioActual.id,
            nombre: usuarioActual.nombreCompleto,
            email: usuarioActual.correo,
            rol: usuarioActual.rol,
            fechaCreacion: usuarioActual.fechaCreacion,
            ultimoAcceso: usuarioActual.ultimoAcceso || new Date().toISOString(),
            ...(usuarioActual.fotoPerfil && { fotoPerfil: usuarioActual.fotoPerfil })
          };
          
          setUser(userData);
          console.log('✅ Usuario autenticado:', userData.nombre, `(${userData.rol})`);
        } else {
          setUser(null);
          console.log('ℹ️ No hay sesión activa');
        }
      } catch (error: any) {
        console.error('Error al verificar la autenticación:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const hasPermission = (requiredRoles: string[]): boolean => {
    if (!user) return false;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.includes(user.rol);
  };

  const hasSpecificPermission = (permission: string): boolean => {
    if (!user || !userRole) {
      return false;
    }
    
    const tienePermiso = userRole.permisos.includes(permission);
    
    return tienePermiso;
  };

  const getUserPermissions = (): string[] => {
    if (!user || !userRole) return [];
    return [...userRole.permisos];
  };

  const canAccessPage = (pageId: string): boolean => {
    return hasSpecificPermission(pageId);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      reloadRoles();
      
      // ✅ iniciarSesionService retorna ISesion (con usuario dentro)
      const sesion = await iniciarSesionService(email, password);
      
      // Convertir IUsuario a IUser
      const userData: IUser = {
        id: sesion.usuario.id,
        nombre: sesion.usuario.nombreCompleto,
        email: sesion.usuario.correo,
        rol: sesion.usuario.rol,
        fechaCreacion: sesion.usuario.fechaCreacion,
        ultimoAcceso: sesion.usuario.ultimoAcceso || new Date().toISOString(),
        ...(sesion.usuario.fotoPerfil && { fotoPerfil: sesion.usuario.fotoPerfil })
      };
      
      setUser(userData);
      
      console.log('✅ Login completado para:', userData.nombre);
      console.log('   Rol asignado:', userData.rol);
      
      return true;
    } catch (error) {
      console.error('❌ Error al iniciar sesión:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await cerrarSesionService();
      setUser(null);
      setUserRole(null);
      console.log('👋 Sesión cerrada');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: IAuthContext = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasPermission,
    hasSpecificPermission,
    getUserPermissions,
    canAccessPage,
    userRole,
    availableRoles,
    reloadRoles,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useUserPermissions = () => {
  const { 
    user, 
    userRole, 
    hasSpecificPermission, 
    getUserPermissions, 
    canAccessPage,
    isLoading 
  } = useAuth();

  return {
    user,
    userRole,
    permissions: getUserPermissions(),
    hasPermission: hasSpecificPermission,
    canAccess: canAccessPage,
    loading: isLoading,
    isLoggedIn: !!user
  };
};

export const usePageAccess = (pageId: string) => {
  const { canAccessPage, isLoading, user } = useAuth();

  return {
    canAccess: canAccessPage(pageId),
    loading: isLoading,
    isLoggedIn: !!user,
    redirectTo: !user ? '/login' : '/no-permission'
  };
};

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  permission, 
  children, 
  fallback = null 
}) => {
  const { hasSpecificPermission, isLoading } = useAuth();

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return hasSpecificPermission(permission) ? <>{children}</> : <>{fallback}</>;
};