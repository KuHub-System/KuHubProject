import React from 'react';
import { IUser, IRole } from '../types/user.types';
import { iniciarSesionService, cerrarSesionService, obtenerUsuarioActualService } from '../services/auth-service';
import { ROLES_STORAGE_KEY, ROLES_SISTEMA, cargarRoles as cargarRolesConfig } from '../config/roles-config';
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';
import InactivityWarningModal from '../components/modals/InactivityWarningModal';

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
  logout: () => { },
  hasPermission: () => false,
  hasSpecificPermission: () => false,
  getUserPermissions: () => [],
  canAccessPage: () => false,
  userRole: null,
  availableRoles: [],
  reloadRoles: () => { },
});

export const useAuth = (): IAuthContext => {
  return React.useContext(AuthContext);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<IUser | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [availableRoles, setAvailableRoles] = React.useState<IRole[]>([]);
  const [userRole, setUserRole] = React.useState<IRole | null>(null);

  // Estado para el modal de advertencia de inactividad
  const [isWarningModalOpen, setIsWarningModalOpen] = React.useState(false);

  // 🆕 Estado para rastrear si los roles están completamente cargados
  const [rolesLoaded, setRolesLoaded] = React.useState<boolean>(false);

  const reloadRoles = React.useCallback(() => {
    const nuevosRoles = cargarRolesActuales();
    setAvailableRoles(nuevosRoles);
    setRolesLoaded(true);
  }, []);

  // Logout para inactividad (sin necesidad de retornar Promesa, que `cerrarSesionService` sí requiere en el type de context)
  // Logout para inactividad
  const handleInactivityLogout = React.useCallback(() => {
    setIsWarningModalOpen(false);
    cerrarSesionService()
      .then(() => {
        setUser(null);
        setUserRole(null);
        window.location.href = '/login';
      })
      .catch(() => { });
  }, []);

  // Inicializar hook de inactividad (25 minutos = 25 * 60 * 1000 = 1500000ms)
  // Advertencia a los 20 minutos (20 * 60 * 1000 = 1200000ms)
  useInactivityTimeout(
    handleInactivityLogout,
    !!user,
    25 * 60 * 1000,
    () => setIsWarningModalOpen(true),
    20 * 60 * 1000
  );

  React.useEffect(() => {
    const roles = cargarRolesActuales();
    setAvailableRoles(roles);
    setRolesLoaded(true); // 🆕 Marcar como cargado
  }, []);

  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ROLES_STORAGE_KEY) {
        reloadRoles();
      }
    };

    const handleRolesUpdated = () => {
      reloadRoles();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('roles-updated', handleRolesUpdated);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('roles-updated', handleRolesUpdated);
    };
  }, [reloadRoles]);

  // 🆕 Efecto mejorado: Espera a que TANTO el usuario COMO los roles estén cargados
  React.useEffect(() => {
    if (user && rolesLoaded && availableRoles.length > 0) {

      // 🆕 Matching súper robusto para evitar problemas con guiones/guiones bajos/mayúsculas
      const rolActualizado = availableRoles.find(rol => {
        const normalizar = (s: string) => s.toLowerCase()
          .replace(/[_-]/g, ' ')
          .trim();
        
        return normalizar(rol.nombre) === normalizar(user.rol);
      });

      if (rolActualizado) {
        if (JSON.stringify(userRole?.permisos) !== JSON.stringify(rolActualizado.permisos)) {
          setUserRole(rolActualizado);
        }
      } else {
        setUserRole(null);
      }
    } else if (!user) {
      setUserRole(null);
    }
  }, [user, availableRoles, rolesLoaded]);

  // 🆕 Efecto mejorado: Solo marca como "no loading" cuando TODO esté listo
  React.useEffect(() => {
    const checkAuth = () => {
      try {
        const usuarioActual = obtenerUsuarioActualService();

        if (usuarioActual) {
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
        } else {
          setUser(null);
          // Si no hay usuario, podemos marcar como "no loading" inmediatamente
          setIsLoading(false);
        }
      } catch (error: any) {
        setUser(null);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 🆕 Nuevo efecto: Solo marca isLoading=false cuando TODO esté listo
  React.useEffect(() => {
    if (rolesLoaded) {
      // Si hay usuario, esperamos un poco a que el efecto de arriba intente matchear el rol.
      // Pero si rolesLoaded es true, ya podemos liberar el loading screen para que SmartRedirect actúe.
      if (user) {
        // Marcamos como listo si ya se intentó cargar el rol (incluso si no se encontró)
        if (availableRoles.length > 0) {
          setIsLoading(false);
        }
      } else {
        // Si no hay usuario, no hay nada más que esperar
        setIsLoading(false);
      }
    }
  }, [rolesLoaded, user, userRole, availableRoles.length]);

  const hasPermission = (requiredRoles: string[]): boolean => {
    if (!user) return false;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.includes(user.rol);
  };

  const hasSpecificPermission = (permission: string): boolean => {
    // 🆕 Si todavía está cargando, retorna false
    if (isLoading) {
      return false;
    }

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

      const sesion = await iniciarSesionService(email, password);

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


      return true;
    } catch (error) {
      setIsLoading(false);
      return false;
    } finally {
      // Nota: Si success, el efecto se encarga de setIsLoading(false)
      // pero si hay error, debemos asegurarnos de que no se quede en true
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await cerrarSesionService();
    } catch (error) {
    } finally {
      setUser(null);
      setUserRole(null);
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

  return (
    <AuthContext.Provider value={value}>
      {children}
      <InactivityWarningModal
        isOpen={isWarningModalOpen}
        onClose={() => setIsWarningModalOpen(false)}
        onStayLoggedIn={() => setIsWarningModalOpen(false)}
      />
    </AuthContext.Provider>
  );
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