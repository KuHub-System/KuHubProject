/**
 * DASHBOARD PRINCIPAL
 * Componente que detecta el rol del usuario y muestra el dashboard apropiado
 */

import React from 'react';
import { Spinner } from '@heroui/react';
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
const DashboardPage: React.FC = () => {
  const { user, userRole, isLoading: authLoading, hasSpecificPermission } = useAuth();

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

  // Dashboard para administradores y gestores de pedidos
  if (puedeGestionarPedidos) {
    return <DashboardAdmin />;
  }

  // Dashboard para profesores (pueden crear solicitudes)
  if (puedeCrearSolicitudes && !puedeVerInventario) {
    return <DashboardProfesor />;
  }

  // Dashboard para bodega (pueden ver inventario pero no gestionar pedidos)
  if (puedeVerInventario && !puedeCrearSolicitudes && !puedeGestionarPedidos) {
    return <DashboardBodega />;
  }

  // Dashboard por defecto (profesor si tiene permiso de solicitud)
  if (puedeCrearSolicitudes) {
    return <DashboardProfesor />;
  }

  // Si no tiene permisos específicos, mostrar dashboard básico
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
