/**
 * DASHBOARD PRINCIPAL
 * Detecta el rol del usuario y muestra el dashboard apropiado con routing basado en roles.
 */

import React from 'react';
import { Tabs, Tab } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../contexts/auth-context';
import { usePermission } from '../contexts/permission-context';
import { usePageTitle } from '../hooks/usePageTitle';
import { StatSkeleton, ChartSkeleton } from '../components/SkeletonLoader';

// Dashboards de analytics
import { DashboardInventarioView } from '../components/dashboard/DashboardInventarioView';
import { DashboardGestor }         from '../components/dashboard/DashboardGestor';
import { DashboardPedidoSemanalBodegaView } from '../components/dashboard/DashboardPedidoSemanalBodegaView';

// Exportar funciones para compatibilidad con otros componentes
export {
  puedenCrearseSolicitudes,
  obtenerEstadoProceso,
  calcularDiasRestantesProceso,
} from '../services/dashboard/dashboard-service';

// ─── Admin Tabbed Layout ──────────────────────────────────────────────────────

const DashboardAdminTabs: React.FC = () => (
  <div className="px-4 py-6 space-y-4">
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
        key="pedido-bodega"
        title={
          <span className="flex items-center gap-1.5">
            <Icon icon="lucide:package-check" width={14} />
            Pedido Semana Bodega
          </span>
        }
      >
        <DashboardPedidoSemanalBodegaView />
      </Tab>
    </Tabs>
  </div>
);

// ─── Profesor Layout ──────────────────────────────────────────────────────────

const DashboardProfesorView: React.FC = () => (
  <div className="px-4 py-6 space-y-4">
    <DashboardPedidoSemanalBodegaView />
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, canRead, canCreate, isLoading: permLoading } = usePermission();

  usePageTitle('Dashboard', 'Panel de control del sistema', 'lucide:layout-dashboard');

  if (authLoading || permLoading || !user) {
    return (
      <div className="px-4 py-6 space-y-6">
        <StatSkeleton count={4} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  // ── Administrador / Co-Administrador: vista con tabs ──
  // (Co-Admin ya no es bypass de isAdmin; se identifica por su acceso a Gestión de Usuarios)
  if (isAdmin || canRead('ADMIN_SISTEMA') || canRead('GESTION_USUARIOS')) {
    return <DashboardAdminTabs />;
  }

  // ── Gestor de Pedidos: analítica de gestión ──
  if (canRead('GESTION_PEDIDOS')) {
    return (
      <div className="px-4 py-6">
        <DashboardGestor />
      </div>
    );
  }

  // ── Encargado / Asistente de Bodega: inventario ──
  if (canRead('INVENTARIO') || canRead('BODEGA_TRANSITO')) {
    return (
      <div className="px-4 py-6">
        <DashboardInventarioView />
      </div>
    );
  }

  // ── Profesor a Cargo / Docente: solicitudes + recetas ──
  if (canRead('SOLICITUD') || canCreate('SOLICITUD')) {
    return <DashboardProfesorView />;
  }

  // ── Fallback ──
  return (
    <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen py-8">
      <div className="px-4">
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
