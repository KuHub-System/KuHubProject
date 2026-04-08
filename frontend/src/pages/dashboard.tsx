/**
 * DASHBOARD PRINCIPAL
 * Detecta el rol del usuario y muestra el dashboard apropiado con routing basado en roles.
 */

import React from 'react';
import { Spinner, Tabs, Tab } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../contexts/auth-context';
import { usePageTitle } from '../hooks/usePageTitle';

// Dashboards existentes
import { DashboardAdmin }   from '../components/dashboard/DashboardAdmin';

// Nuevos dashboards de analytics
import { DashboardInventarioView } from '../components/dashboard/DashboardInventarioView';
import { DashboardGestor }         from '../components/dashboard/DashboardGestor';
import { DashboardRecetasView }    from '../components/dashboard/DashboardRecetasView';

// Exportar funciones para compatibilidad con otros componentes
export {
  puedenCrearseSolicitudes,
  obtenerEstadoProceso,
  calcularDiasRestantesProceso,
} from '../services/dashboard-service';

// ─── Admin Tabbed Layout ──────────────────────────────────────────────────────

const DashboardAdminTabs: React.FC = () => (
  <div className="container mx-auto px-4 py-6 space-y-4">
    {/* Tabs */}
    <Tabs
      aria-label="Dashboard views"
      color="warning"
      variant="underlined"
      classNames={{
        tabList: 'border-b border-divider',
        cursor: 'bg-[#FFB800]',
      }}
    >
      <Tab
        key="inventario"
        title={
          <span className="flex items-center gap-1.5">
            <Icon icon="lucide:package" width={14} />
            Inventario
          </span>
        }
      >
        <DashboardInventarioView />
      </Tab>

      <Tab
        key="solicitudes"
        title={
          <span className="flex items-center gap-1.5">
            <Icon icon="lucide:clipboard-list" width={14} />
            Solicitudes
          </span>
        }
      >
        <DashboardGestor />
      </Tab>

      <Tab
        key="recetas"
        title={
          <span className="flex items-center gap-1.5">
            <Icon icon="lucide:chef-hat" width={14} />
            Recetas
          </span>
        }
      >
        <DashboardRecetasView />
      </Tab>

      <Tab
        key="gestion"
        title={
          <span className="flex items-center gap-1.5">
            <Icon icon="lucide:settings-2" width={14} />
            Gestión
          </span>
        }
      >
        <DashboardAdmin />
      </Tab>
    </Tabs>
  </div>
);

// ─── Profesor Layout ──────────────────────────────────────────────────────────

const DashboardProfesorView: React.FC = () => (
  <div className="container mx-auto px-4 py-6 space-y-4">
    <DashboardRecetasView />
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const { user, userRole, isLoading: authLoading, hasSpecificPermission } = useAuth();

  usePageTitle('Dashboard', 'Panel de control del sistema', 'lucide:layout-dashboard');

  // Loading state
  if (authLoading || !user || !userRole) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Spinner size="lg" color="primary" className="mb-4" />
          <p className="text-default-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Role detection
  const isAdmin           = user?.rol === 'Administrador' || user?.rol === 'Co-Administrador';
  const puedeGestionarPedidos = hasSpecificPermission('gestion-pedidos');
  const puedeVerInventario    = hasSpecificPermission('inventario');
  const puedeCrearSolicitudes = hasSpecificPermission('solicitud');

  // ── ADMIN / CO_ADMIN: tabbed multi-analytics view ──
  if (isAdmin) {
    return <DashboardAdminTabs />;
  }

  // ── GESTOR_PEDIDOS (non-admin): gestor analytics only ──
  if (puedeGestionarPedidos) {
    return (
      <div className="container mx-auto px-4 py-6">
        <DashboardGestor />
      </div>
    );
  }

  // ── ENCARGADO_BODEGA / ASISTENTE_BODEGA: inventario analytics ──
  if (puedeVerInventario && !puedeCrearSolicitudes && !puedeGestionarPedidos) {
    return (
      <div className="container mx-auto px-4 py-6">
        <DashboardInventarioView />
      </div>
    );
  }

  // ── PROFESOR_A_CARGO / DOCENTE: mis solicitudes + recetas ──
  if (puedeCrearSolicitudes) {
    return <DashboardProfesorView />;
  }

  // ── Fallback: sin permisos específicos ──
  return (
    <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <Icon icon="lucide:alert-circle" className="text-6xl text-default-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Sin Permisos para Dashboard</h2>
            <p className="text-default-500">
              Tu rol no tiene acceso a ninguna vista del dashboard.
            </p>
          </div>
        </div>
      </div>
  );
};

export default DashboardPage;
