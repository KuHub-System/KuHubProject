import React from 'react';
import { IUser, IRole } from '../types/user.types';
import { iniciarSesionService, cerrarSesionService, obtenerUsuarioActualService, renovarSesionService } from '../services/auth-service';
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
  login: (email: string, password: string, recordarSesion?: boolean) => Promise<boolean>;
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

  // ===================================================================
  // EFECTO ÚNICO: Matchear rol + controlar isLoading de forma atómica
  // Elimina la race condition de los efectos anteriores (duplicados)
  // ===================================================================
  React.useEffect(() => {
    // 1️⃣ Si no hay usuario → no hay nada que matchear
    if (!user) {
      setUserRole(null);
      setIsLoading(false);
      console.log('[AUTH] No hay usuario, deteniendo carga.');
      return;
    }

    // 2️⃣ Si los roles aún no están cargados → seguimos esperando
    if (!rolesLoaded || availableRoles.length === 0) {
      console.log('[AUTH] Esperando carga de roles...');
      return; // isLoading sigue en true
    }

    // 3️⃣ Intentar matchear el rol del usuario
    console.log(`[AUTH] Intentando matchear rol para: "${user.rol}" de ${availableRoles.length} roles disponibles`);

    const normalizar = (s: string) => s.toLowerCase().replace(/[_-]/g, ' ').trim();

    const rolMatcheado = availableRoles.find(rol => {
      if (!user.rol || !rol.nombre) return false;
      return normalizar(rol.nombre) === normalizar(user.rol);
    });

    if (rolMatcheado) {
      console.log('[AUTH] ✅ Rol matcheado exitosamente:', rolMatcheado.nombre, '→ Permisos:', rolMatcheado.permisos);
      setUserRole(rolMatcheado);
    } else {
      console.warn(`[AUTH] ⚠️ Rol "${user.rol}" NO matcheó con ningún rol disponible:`, availableRoles.map(r => r.nombre));
      setUserRole(null);
    }

    // 4️⃣ Ya procesamos todo → liberar la carga
    setIsLoading(false);
    console.log('[AUTH] Estado de Sincronización:', { isAuthenticated: true, hasRole: !!rolMatcheado, rolesLoaded, isLoading: false });

  }, [user, availableRoles, rolesLoaded]);

  // ===================================================================
  // EFECTO DE INICIALIZACIÓN: Cargar usuario de localStorage al montar.
  // Si no hay sesión local pero existe el Refresh Token (cookie HttpOnly),
  // se intenta renovar el Access Token silenciosamente.
  // ===================================================================
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        let usuarioActual = obtenerUsuarioActualService();

        // Sin sesión local → intentar renovar via refresh token (cookie)
        if (!usuarioActual) {
          const nuevoToken = await renovarSesionService();
          if (nuevoToken) {
            usuarioActual = obtenerUsuarioActualService();
          }
        }

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
          // isLoading se resolverá en el efecto unificado de arriba
        } else {
          setUser(null);
          setIsLoading(false);
        }
      } catch (error: any) {
        setUser(null);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const hasPermission = (requiredRoles: string[]): boolean => {
    if (!user) return false;
    if (!requiredRoles || requiredRoles.length === 0) return true;

    // Normalizar para comparar
    const normalizar = (s: string) => s.toLowerCase().replace(/[_-]/g, ' ').trim();
    const rolNormalizado = normalizar(user.rol);
    return requiredRoles.some(r => normalizar(r) === rolNormalizado);
  };

  const hasSpecificPermission = (permission: string): boolean => {
    if (!user || !userRole) {
      return false;
    }

    return userRole.permisos.includes(permission);
  };

  const getUserPermissions = (): string[] => {
    if (!user || !userRole) return [];
    return [...userRole.permisos];
  };

  const canAccessPage = (pageId: string): boolean => {
    return hasSpecificPermission(pageId);
  };

  const login = async (email: string, password: string, recordarSesion = false): Promise<boolean> => {
    try {
      setIsLoading(true);

      reloadRoles();

      const sesion = await iniciarSesionService(email, password, recordarSesion);

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
      // El efecto unificado se encargará de matchear el rol y luego poner isLoading en false

      // Reactivar el badge "1" de soporte para esta nueva sesión.
      sessionStorage.removeItem('kuhub_soporte_visto');

      return true;
    } catch (error) {
      setIsLoading(false);
      return false;
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