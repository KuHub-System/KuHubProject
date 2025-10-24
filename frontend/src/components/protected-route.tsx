import React from 'react';
import { Route, Redirect, RouteProps } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { Spinner } from '@heroui/react';

/**
 * 🔥 INTERFAZ ACTUALIZADA
 * Ahora usa pageId (opcional) para verificar permisos dinámicos
 * Mantiene roles para compatibilidad con código existente
 */
interface ProtectedRouteProps extends RouteProps {
  roles?: string[]; // Roles permitidos (DEPRECADO - usar pageId)
  pageId?: string;  // ID de página para verificar permisos dinámicos
  children: React.ReactNode;
}

/**
 * Componente que protege rutas basado en autenticación y permisos.
 * 
 * MODOS DE USO:
 * 1. Con pageId (RECOMENDADO - usa permisos dinámicos):
 *    <ProtectedRoute path="/inventario" pageId="inventario">
 * 
 * 2. Con roles (DEPRECADO - mantiene compatibilidad):
 *    <ProtectedRoute path="/inventario" roles={['Admin', 'Bodega']}>
 * 
 * 3. Sin restricciones (solo requiere login):
 *    <ProtectedRoute path="/perfil">
 * 
 * @param {ProtectedRouteProps} props - Propiedades del componente.
 * @returns {JSX.Element} Componente Route protegido.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  roles = [], 
  pageId,
  children, 
  ...rest 
}) => {
  const { isAuthenticated, isLoading, hasPermission, canAccessPage } = useAuth();

  /**
   * 🔥 FUNCIÓN MEJORADA: Verifica permisos
   * Prioriza pageId (dinámico) sobre roles (estático)
   */
  const hasAccess = (): boolean => {
    // Si no está autenticado, no tiene acceso
    if (!isAuthenticated) return false;

    // Si tiene pageId, usar verificación dinámica (NUEVO)
    if (pageId) {
      const access = canAccessPage(pageId);
      console.log(`🔐 Verificando acceso a "${pageId}":`, access ? '✅' : '❌');
      return access;
    }

    // Si tiene roles, usar verificación estática (DEPRECADO)
    if (roles.length > 0) {
      const access = hasPermission(roles);
      console.log(`🔐 Verificando roles [${roles.join(', ')}]:`, access ? '✅' : '❌');
      return access;
    }

    // Si no tiene restricciones, permitir acceso (solo requiere login)
    console.log(`🔐 Ruta sin restricciones: ✅`);
    return true;
  };

  /**
   * Renderiza el contenido según el estado de autenticación y permisos.
   */
  const renderContent = () => {
    // Mientras carga, muestra spinner
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <Spinner size="lg" color="primary" />
        </div>
      );
    }

    // Si no está autenticado, redirige a login
    if (!isAuthenticated) {
      console.log('❌ No autenticado, redirigiendo a /login');
      return <Redirect to="/login" />;
    }

    // Si no tiene permisos, redirige a página de sin acceso
    if (!hasAccess()) {
      console.log('❌ Sin permisos, redirigiendo a /sin-acceso');
      return <Redirect to="/sin-acceso" />;
    }

    // Si está autenticado y tiene permisos, muestra el contenido
    return children;
  };

  return <Route {...rest} render={() => renderContent()} />;
};

export default ProtectedRoute;