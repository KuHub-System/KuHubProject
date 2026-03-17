/**
 * DASHBOARD PRINCIPAL
 * Componente que detecta el rol del usuario y muestra el dashboard apropiado
 */

import React from 'react';
import { Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../contexts/auth-context';
import { DashboardAdmin } from '../components/dashboard/DashboardAdmin';
import { DashboardProfesor } from '../components/dashboard/DashboardProfesor';
import { DashboardBodega } from '../components/dashboard/DashboardBodega';

// Exportar funciones para compatibilidad con otros componentes
export { 
  puedenCrearseSolicitudes, 
  obtenerEstadoProceso, 
  calcularDiasRestantesProceso 
} from '../services/dashboard-service';

/**
 * Dashboard Principal
 * Detecta el rol del usuario y muestra el dashboard apropiado
 */
const MODAL_KEY = 'dashboard_maintenance_dismissed';

const DashboardPage: React.FC = () => {
  const { user, userRole, isLoading: authLoading, hasSpecificPermission } = useAuth();
  const [modalAbierto, setModalAbierto] = React.useState(() => !sessionStorage.getItem(MODAL_KEY));

  const cerrarModal = () => {
    sessionStorage.setItem(MODAL_KEY, '1');
    setModalAbierto(false);
  };

  // Mostrar loading mientras se carga la autenticación
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

  // Determinar qué dashboard mostrar según permisos
  const puedeGestionarPedidos = hasSpecificPermission('gestion-pedidos');
  const puedeVerInventario = hasSpecificPermission('inventario');
  const puedeCrearSolicitudes = hasSpecificPermission('solicitud');

  // Modal de aviso (se muestra una vez por sesión)
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

  // Dashboard para administradores y gestores de pedidos
  if (puedeGestionarPedidos) {
    return <>{avisoModal}<DashboardAdmin /></>;
  }

  // Dashboard para profesores (pueden crear solicitudes)
  if (puedeCrearSolicitudes && !puedeVerInventario) {
    return <>{avisoModal}<DashboardProfesor /></>;
  }

  // Dashboard para bodega (pueden ver inventario pero no gestionar pedidos)
  if (puedeVerInventario && !puedeCrearSolicitudes && !puedeGestionarPedidos) {
    return <>{avisoModal}<DashboardBodega /></>;
  }

  // Dashboard por defecto (profesor si tiene permiso de solicitud)
  if (puedeCrearSolicitudes) {
    return <>{avisoModal}<DashboardProfesor /></>;
  }

  // Si no tiene permisos específicos, mostrar dashboard básico
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
