/**
 * DASHBOARD PRINCIPAL
 * Detecta el rol del usuario y muestra el dashboard apropiado con routing basado en roles.
 */

import React from 'react';
import { Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Tabs, Tab } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../contexts/auth-context';

// Dashboards existentes
import { DashboardAdmin }   from '../components/dashboard/DashboardAdmin';
import { DashboardProfesor } from '../components/dashboard/DashboardProfesor';

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

// ─── Maintenance modal key ────────────────────────────────────────────────────

const MODAL_KEY = 'dashboard_maintenance_dismissed';

// ─── Admin Tabbed Layout ──────────────────────────────────────────────────────

const DashboardAdminTabs: React.FC = () => (
  <div className="container mx-auto px-4 py-6 space-y-4">
    {/* Header */}
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-xl bg-[#FFB800]/10 flex items-center justify-center">
        <Icon icon="lucide:layout-dashboard" width={22} className="text-[#FFB800]" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-default-500 text-sm">Panel de control ejecutivo</p>
      </div>
    </div>

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

// ─── Profesor Tabbed Layout ───────────────────────────────────────────────────

const DashboardProfesorTabs: React.FC = () => (
  <div className="container mx-auto px-4 py-6 space-y-4">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-xl bg-[#FFB800]/10 flex items-center justify-center">
        <Icon icon="lucide:layout-dashboard" width={22} className="text-[#FFB800]" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-default-500 text-sm">Panel de control</p>
      </div>
    </div>

    <Tabs
      aria-label="Dashboard profesor"
      color="warning"
      variant="underlined"
      classNames={{
        tabList: 'border-b border-divider',
        cursor: 'bg-[#FFB800]',
      }}
    >
      <Tab
        key="mis-solicitudes"
        title={
          <span className="flex items-center gap-1.5">
            <Icon icon="lucide:file-text" width={14} />
            Mis Solicitudes
          </span>
        }
      >
        <DashboardProfesor />
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
    </Tabs>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const { user, userRole, isLoading: authLoading, hasSpecificPermission } = useAuth();
  const [modalAbierto, setModalAbierto] = React.useState(() => !sessionStorage.getItem(MODAL_KEY));

  const cerrarModal = () => {
    sessionStorage.setItem(MODAL_KEY, '1');
    setModalAbierto(false);
  };

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

  // Maintenance modal (shown once per session, only for non-new dashboards)
  const avisoModal = (
    <Modal isOpen={modalAbierto} onClose={cerrarModal} size="md" isDismissable={false} hideCloseButton>
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 pb-1">
          <Icon icon="lucide:construction" width={20} className="text-warning-500 shrink-0" />
          <span>Vista en desarrollo</span>
        </ModalHeader>
        <ModalBody className="py-3">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-default-600">
              El <strong>Dashboard</strong> que estás viendo es una versión preliminar.
              Actualmente se encuentra en mantenimiento activo y está sujeto a cambios y mejoras continuas.
            </p>
            <p className="text-sm text-default-500">
              Es posible que algunos datos, métricas o secciones no reflejen información definitiva.
              Agradecemos tu comprensión mientras seguimos mejorando la plataforma.
            </p>
            <div className="flex items-center gap-2 px-3 py-2 bg-warning-50 border border-warning-200 rounded-lg text-xs text-warning-800">
              <Icon icon="lucide:info" width={13} className="shrink-0" />
              Este aviso se muestra una vez por sesión.
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onPress={cerrarModal} startContent={<Icon icon="lucide:thumbs-up" width={14} />}>
            ¡Gracias, entendido!
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  // ── ADMIN / CO_ADMIN: tabbed multi-analytics view ──
  if (isAdmin) {
    return (
      <>
        {avisoModal}
        <DashboardAdminTabs />
      </>
    );
  }

  // ── GESTOR_PEDIDOS (non-admin): gestor analytics only ──
  if (puedeGestionarPedidos) {
    return (
      <>
        {avisoModal}
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#FFB800]/10 flex items-center justify-center">
              <Icon icon="lucide:clipboard-list" width={22} className="text-[#FFB800]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Dashboard — Gestor de Pedidos</h1>
              <p className="text-default-500 text-sm">Resumen de solicitudes y flujo de pedidos</p>
            </div>
          </div>
          <DashboardGestor />
        </div>
      </>
    );
  }

  // ── ENCARGADO_BODEGA / ASISTENTE_BODEGA: inventario analytics ──
  if (puedeVerInventario && !puedeCrearSolicitudes && !puedeGestionarPedidos) {
    return (
      <>
        {avisoModal}
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#FFB800]/10 flex items-center justify-center">
              <Icon icon="lucide:package" width={22} className="text-[#FFB800]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Dashboard — Inventario</h1>
              <p className="text-default-500 text-sm">Estado del stock y movimientos</p>
            </div>
          </div>
          <DashboardInventarioView />
        </div>
      </>
    );
  }

  // ── PROFESOR_A_CARGO / DOCENTE: mis solicitudes + recetas ──
  if (puedeCrearSolicitudes) {
    return (
      <>
        {avisoModal}
        <DashboardProfesorTabs />
      </>
    );
  }

  // ── Fallback: sin permisos específicos ──
  return (
    <>
      {avisoModal}
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
    </>
  );
};

export default DashboardPage;
