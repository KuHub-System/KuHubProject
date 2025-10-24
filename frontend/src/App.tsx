import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/auth-context';
import { ThemeProvider } from './contexts/theme-context';

// Layouts
import MainLayout from './layouts/main-layout';
import AuthLayout from './layouts/auth-layout';

// Páginas
import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';
import InventarioPage from './pages/inventario';
import MovimientosProductoPage from './pages/movimientos-producto';
import PerfilUsuarioPage from './pages/perfil-usuario';
import GestionRolesPage from './pages/gestion-roles';
import SolicitudPage from './pages/solicitud';
import RamosAdminPage from './pages/ramos-admin';
import GestionPedidosPage from './pages/gestion-pedidos';
import ConglomeradoPedidosPage from './pages/conglomerado-pedidos';
import GestionProveedoresPage from './pages/gestion-proveedores';
import BodegaTransitoPage from './pages/bodega-transito';
import GestionRecetasPage from './pages/gestion-recetas';
import GestionUsuariosPage from './pages/gestion-usuarios'; // 🔥 NUEVA
import GestionSolicitudesPage from './pages/gestion-solicitudes'; // 🔥 NUEVA
import NotFoundPage from './pages/not-found';

// Componente de ruta protegida
import ProtectedRoute from './components/protected-route';

/**
 * 🔥 COMPONENTE NUEVO: Redirección Inteligente
 * Redirige al usuario a la primera página donde tenga permisos
 */
const SmartRedirect: React.FC = () => {
  const { isAuthenticated, getUserPermissions, isLoading, userRole } = useAuth();

  // 🔥 CRÍTICO: Esperar a que se carguen TANTO el usuario COMO el rol
  if (isLoading || (isAuthenticated && !userRole)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-default-500">Cargando permisos...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, ir a login
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Obtener permisos del usuario
  const permisos = getUserPermissions();
  
  console.log('🔀 SmartRedirect - Permisos disponibles:', permisos);

  // Mapa de permisos a rutas (en orden de prioridad)
  const rutasPorPermiso: { [key: string]: string } = {
    'dashboard': '/dashboard',
    'inventario': '/inventario',
    'solicitud': '/solicitud',
    'gestion-pedidos': '/gestion-pedidos',
    'conglomerado-pedidos': '/conglomerado-pedidos',
    'gestion-proveedores': '/gestion-proveedores',
    'bodega-transito': '/bodega-transito',
    'gestion-recetas': '/gestion-recetas',
    'ramos-admin': '/ramos-admin',
    'gestion-roles': '/gestion-roles',
    'gestion-usuarios': '/gestion-usuarios', // 🔥 NUEVO
    'gestion-solicitudes': '/gestion-solicitudes', // 🔥 NUEVO
  };

  // Buscar la primera ruta donde el usuario tenga permiso
  for (const permiso of permisos) {
    if (rutasPorPermiso[permiso]) {
      console.log(`🔀 Redirigiendo a primera página con permisos: ${rutasPorPermiso[permiso]}`);
      return <Redirect to={rutasPorPermiso[permiso]} />;
    }
  }

  // Si no tiene ningún permiso, mostrar mensaje
  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold mb-2">Sin Permisos Asignados</h1>
        <p className="text-default-500 mb-4">
          Tu cuenta no tiene permisos para acceder a ninguna página del sistema.
        </p>
        <p className="text-sm text-default-400">
          Contacta al administrador para solicitar acceso.
        </p>
      </div>
    </MainLayout>
  );
};

/**
 * Componente principal de la aplicación.
 * Ahora usa permisos dinámicos en lugar de roles fijos.
 */
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Switch>
          {/* Rutas de autenticación */}
          <Route path="/login">
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </Route>

          {/* 🔥 RUTAS ACTUALIZADAS: Ahora usan pageId en lugar de roles fijos */}
          
          <ProtectedRoute path="/dashboard" pageId="dashboard">
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/inventario" pageId="inventario">
            <MainLayout>
              <InventarioPage />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/movimientos-producto/:id" pageId="inventario">
            <MainLayout>
              <MovimientosProductoPage />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/perfil">
            <MainLayout>
              <PerfilUsuarioPage />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/gestion-roles" pageId="gestion-roles">
            <MainLayout>
              <GestionRolesPage />
            </MainLayout>
          </ProtectedRoute>

          {/* 🔥 NUEVAS RUTAS AGREGADAS */}
          <ProtectedRoute path="/gestion-usuarios" pageId="gestion-usuarios">
            <MainLayout>
              <GestionUsuariosPage />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/gestion-solicitudes" pageId="gestion-solicitudes">
            <MainLayout>
              <GestionSolicitudesPage />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/solicitud" pageId="solicitud">
            <MainLayout>
              <SolicitudPage />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/ramos-admin" pageId="ramos-admin">
            <MainLayout>
              <RamosAdminPage />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/gestion-pedidos" pageId="gestion-pedidos">
            <MainLayout>
              <GestionPedidosPage />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/conglomerado-pedidos" pageId="conglomerado-pedidos">
            <MainLayout>
              <ConglomeradoPedidosPage />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/gestion-proveedores" pageId="gestion-proveedores">
            <MainLayout>
              <GestionProveedoresPage />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/bodega-transito" pageId="bodega-transito">
            <MainLayout>
              <BodegaTransitoPage />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/gestion-recetas" pageId="gestion-recetas">
            <MainLayout>
              <GestionRecetasPage />
            </MainLayout>
          </ProtectedRoute>

          {/* Ruta para página no encontrada */}
          <Route path="/404">
            <MainLayout>
              <NotFoundPage />
            </MainLayout>
          </Route>

          {/* 🔥 NUEVA: Página de sin acceso */}
          <Route path="/sin-acceso">
            <MainLayout>
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="text-6xl mb-4">🚫</div>
                <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
                <p className="text-default-500 mb-4">
                  No tienes permisos para acceder a esta página.
                </p>
                <p className="text-sm text-default-400">
                  Si crees que esto es un error, contacta al administrador.
                </p>
              </div>
            </MainLayout>
          </Route>

          {/* 🔥 REDIRECCIÓN INTELIGENTE: Va a la primera página con permisos */}
          <Route exact path="/">
            <SmartRedirect />
          </Route>

          {/* Redirección a 404 para cualquier otra ruta */}
          <Route path="*">
            <Redirect to="/404" />
          </Route>
        </Switch>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;