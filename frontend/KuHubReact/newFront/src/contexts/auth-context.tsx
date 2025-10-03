import React from 'react';
import { IUser, IRole } from '../types/user.types';
import { loginService, logoutService, getCurrentUserService } from '../services/auth-service';

/**
 * FUNCIONES PARA MANEJAR LOS ROLES DINÁMICOS
 */
const STORAGE_KEY = 'sistema-roles-configurados';

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
 * Carga los roles desde localStorage o devuelve los roles iniciales
 */
const cargarRolesActuales = (): IRole[] => {
  try {
    const rolesGuardados = localStorage.getItem(STORAGE_KEY);
    if (rolesGuardados) {
      const roles = JSON.parse(rolesGuardados);
      console.log('📂 Roles cargados desde localStorage:', roles.length);
      return roles;
    }
    console.log('📂 Usando roles iniciales');
    return rolesIniciales;
  } catch (error) {
    console.error('Error al cargar roles:', error);
    return rolesIniciales;
  }
};

/**
 * INTERFAZ DEL CONTEXTO DE AUTENTICACIÓN
 */
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

/**
 * PROVEEDOR DEL CONTEXTO DE AUTENTICACIÓN MEJORADO
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<IUser | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [availableRoles, setAvailableRoles] = React.useState<IRole[]>([]);
  const [userRole, setUserRole] = React.useState<IRole | null>(null);

  /**
   * 🔥 FUNCIÓN PARA RECARGAR ROLES DESDE LOCALSTORAGE
   * Esta función se llama cuando hay cambios en los roles
   */
  const reloadRoles = React.useCallback(() => {
    console.log('🔄 Recargando roles...');
    const nuevosRoles = cargarRolesActuales();
    setAvailableRoles(nuevosRoles);
  }, []);

  /**
   * EFECTO: Cargar roles al inicializar
   */
  React.useEffect(() => {
    console.log('🚀 Inicializando auth-context');
    const roles = cargarRolesActuales();
    setAvailableRoles(roles);
  }, []);

  /**
   * 🔥 EFECTO: Escuchar cambios en roles
   * Se activa cuando:
   * 1. Otro tab cambia los roles (evento 'storage')
   * 2. El mismo tab cambia los roles (evento 'roles-updated')
   */
  React.useEffect(() => {
    // Handler para cambios entre tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        console.log('🔔 Cambio de roles detectado (otro tab)');
        reloadRoles();
      }
    };

    // Handler para cambios en el mismo tab
    const handleRolesUpdated = () => {
      console.log('🔔 Cambio de roles detectado (mismo tab)');
      reloadRoles();
    };

    // Registrar listeners
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('roles-updated', handleRolesUpdated);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('roles-updated', handleRolesUpdated);
    };
  }, [reloadRoles]);

  /**
   * 🔥 EFECTO: Actualizar userRole cuando cambien los roles o el usuario
   * CRÍTICO: Este efecto sincroniza los permisos del usuario con los roles actuales
   */
  React.useEffect(() => {
    if (user && availableRoles.length > 0) {
      // Buscar el rol ACTUAL del usuario en la lista de roles ACTUALIZADOS
      const rolActualizado = availableRoles.find(rol => 
        rol.nombre === user.rol || rol.nombre.toLowerCase() === user.rol.toLowerCase()
      );
      
      if (rolActualizado) {
        // Solo actualizar si los permisos realmente cambiaron
        if (JSON.stringify(userRole?.permisos) !== JSON.stringify(rolActualizado.permisos)) {
          console.log('🔄 Actualizando permisos del usuario:', user.nombre);
          console.log('   Rol:', rolActualizado.nombre);
          console.log('   Permisos:', rolActualizado.permisos);
          setUserRole(rolActualizado);
        }
      } else {
        console.warn('⚠️ No se encontró el rol del usuario:', user.rol);
        setUserRole(null);
      }
    } else {
      setUserRole(null);
    }
  }, [user, availableRoles]); // 🔥 Se ejecuta cuando user O availableRoles cambien

  /**
   * EFECTO: Verificar autenticación al cargar
   */
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUserService();
        setUser(userData);
        console.log('✅ Usuario autenticado:', userData.nombre, `(${userData.rol})`);
      } catch (error: any) {
        if (error.message === 'No hay sesión activa') {
          setUser(null);
        } else {
          console.error('Error al verificar la autenticación:', error);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * FUNCIÓN: hasPermission (compatibilidad con código existente)
   */
  const hasPermission = (requiredRoles: string[]): boolean => {
    if (!user) return false;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.includes(user.rol);
  };

  /**
   * 🔥 FUNCIÓN: hasSpecificPermission
   * Verifica si el usuario tiene un permiso específico
   * Usa los permisos ACTUALES del rol (sincronizados)
   */
  const hasSpecificPermission = (permission: string): boolean => {
    if (!user || !userRole) {
      console.log('❌ Sin permisos: no hay usuario o rol');
      return false;
    }
    
    const tienePermiso = userRole.permisos.includes(permission);
    console.log(`🔐 Verificando permiso "${permission}":`, tienePermiso ? '✅' : '❌');
    
    return tienePermiso;
  };

  /**
   * FUNCIÓN: getUserPermissions
   */
  const getUserPermissions = (): string[] => {
    if (!user || !userRole) return [];
    return [...userRole.permisos];
  };

  /**
   * FUNCIÓN: canAccessPage
   */
  const canAccessPage = (pageId: string): boolean => {
    return hasSpecificPermission(pageId);
  };

  /**
   * 🔥 FUNCIÓN: login
   * Ahora recarga roles después del login para asegurar permisos actualizados
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Recargar roles ANTES del login para tener los más recientes
      reloadRoles();
      
      const userData = await loginService(email, password);
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

  /**
   * FUNCIÓN: logout
   */
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await logoutService();
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

// ========================================
// HOOKS ADICIONALES
// ========================================

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