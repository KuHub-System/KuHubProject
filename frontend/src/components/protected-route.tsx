import React from 'react';
import { Route, Redirect, RouteProps } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { usePermission } from '../contexts/permission-context';
import { Spinner } from '@heroui/react';
import { logger } from '../utils/logger';
import { PAGE_TO_MODULE } from '../types/permissions.types';

interface ProtectedRouteProps extends RouteProps {
  roles?: string[]; // Roles permitidos (DEPRECADO - usar pageId)
  pageId?: string;  // ID de página para verificar permisos dinámicos
  children: React.ReactNode;
}

/**
 * Componente que protege rutas basado en autenticación y permisos.
 *
 * Verifica acceso en DOS capas:
 *  - Capa 1 (estática): roles-config.ts — permisos hardcodeados por rol
 *  - Capa 2 (dinámica): PermissionContext — matriz de permisos desde la BD
 *
 * El acceso se concede si CUALQUIERA de las dos capas lo autoriza.
 * Esto garantiza que los cambios hechos en Gestión de Roles (BD) tomen
 * efecto en la navegación sin necesidad de tocar roles-config.ts.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  roles = [],
  pageId,
  children,
  ...rest
}) => {
  const { isAuthenticated, isLoading: authLoading, hasPermission } = useAuth();
  const { canAccess, isLoading: permLoading, isAdmin } = usePermission();

  // Esperar a que AMBAS capas terminen de cargar
  const isLoading = authLoading || permLoading;

  const hasAccess = (): boolean => {
    if (!isAuthenticated) return false;

    // Administrador siempre tiene acceso total
    if (isAdmin) return true;

    if (pageId) {
      const moduleKey = PAGE_TO_MODULE[pageId];
      const dynamicAccess = moduleKey
        ? (Array.isArray(moduleKey)
            ? moduleKey.some(k => canAccess(k, 'read'))
            : canAccess(moduleKey, 'read'))
        : false;
      logger.log(`[ProtectedRoute] pageId="${pageId}" dynamic=${dynamicAccess}`);
      return dynamicAccess;
    }

    if (roles.length > 0) {
      return hasPermission(roles);
    }

    // Sin restricciones → solo requiere login
    return true;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <Spinner size="lg" color="primary" />
        </div>
      );
    }

    if (!isAuthenticated) {
      logger.log('❌ No autenticado, redirigiendo a /login');
      return <Redirect to="/login" />;
    }

    if (!hasAccess()) {
      logger.log(`❌ Sin permisos para "${pageId}", redirigiendo a /sin-acceso`);
      return <Redirect to="/sin-acceso" />;
    }

    return children;
  };

  return <Route {...rest} render={() => renderContent()} />;
};

export default ProtectedRoute;
