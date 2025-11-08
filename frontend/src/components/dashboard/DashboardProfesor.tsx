/**
 * DASHBOARD PARA PROFESORES
 * Vista simplificada con sus solicitudes y estado del proceso
 */

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useHistory } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../utils/logger';
import { 
  cargarDashboardProfesor,
  obtenerEstadoProceso,
  calcularDiasRestantesProceso,
} from '../../services/dashboard-service';
import { DashboardHeader } from './shared/DashboardHeader';
import { StatsCard } from './shared/StatsCard';
import { EstadoSolicitudChip } from './shared/EstadoSolicitudChip';
import { AlertaProcesoSolicitudes } from '../AlertaProcesoSolicitudes';
import { ISolicitud } from '../../types/solicitud.types';
import { useAuth } from '../../contexts/auth-context';

export const DashboardProfesor: React.FC = () => {
  const { user } = useAuth();
  const history = useHistory();
  const toast = useToast();
  
  const [solicitudes, setSolicitudes] = useState<ISolicitud[]>([]);
  const [conteoSolicitudes, setConteoSolicitudes] = useState({
    pendientes: 0,
    aceptadas: 0,
    rechazadas: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [estadoProceso, setEstadoProceso] = useState(obtenerEstadoProceso());

  useEffect(() => {
    cargarDatos();
    
    // Actualizar estado del proceso periódicamente
    const interval = setInterval(() => {
      setEstadoProceso(obtenerEstadoProceso());
    }, 60000); // Cada minuto

    return () => clearInterval(interval);
  }, []);

  const cargarDatos = async () => {
    try {
      setIsLoading(true);
      const data = await cargarDashboardProfesor();
      
      setSolicitudes(data.solicitudes);
      setConteoSolicitudes(data.conteoSolicitudes);
      
      logger.log('✅ Datos del dashboard profesor cargados');
    } catch (error) {
      logger.error('❌ Error al cargar datos del dashboard:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const solicitudesOrdenadas = [...solicitudes].sort((a, b) => 
    new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
  );

  const obtenerDescripcionPaso = (paso: number): string => {
    switch (paso) {
      case 1:
        return 'El proceso aún no se ha iniciado.';
      case 2:
        return 'El administrador está recepcionando solicitudes.';
      case 3:
        return 'Inventario en revisión para la semana programada.';
      case 4:
        return 'Proceso de cotización en curso.';
      case 5:
        return 'Preparando la orden final con los proveedores.';
      case 6:
        return 'Proceso finalizado. Se notificará cualquier actualización.';
      default:
        return 'Estado del proceso desconocido.';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <DashboardHeader 
        userName={user?.nombre || 'Profesor'}
        subtitle="Panel de solicitudes de insumos"
      />

      {/* Alerta de proceso */}
      <AlertaProcesoSolicitudes />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="shadow-sm border border-primary-200">
          <CardHeader className="pb-0 pt-4 px-4">
            <div className="flex justify-between items-center w-full">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Icon icon="lucide:calendar-clock" className="text-primary" />
                  Estado del proceso
                </h3>
                <p className="text-default-500 text-sm">
                  El administrador gestionará las solicitudes por semanas académicas.
                </p>
              </div>
              <Chip 
                color={estadoProceso.activo ? 'success' : 'default'}
                variant="flat"
                size="lg"
              >
                {estadoProceso.activo && estadoProceso.semanaSeleccionada
                  ? `Semana ${estadoProceso.semanaSeleccionada}`
                  : 'Sin proceso activo'}
              </Chip>
            </div>
          </CardHeader>
          <CardBody className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-default-50 dark:bg-default-900/10 rounded-lg border border-default-200">
              <div>
                <p className="text-sm text-default-500 mb-1">Semana en proceso</p>
                <p className="font-semibold">
                  {estadoProceso.activo && estadoProceso.semanaSeleccionada
                    ? `Semana ${estadoProceso.semanaSeleccionada}`
                    : 'El administrador iniciará el proceso cuando corresponda.'}
                </p>
              </div>
              <div>
                <p className="text-sm text-default-500 mb-1">Etapa actual</p>
                <p className="font-semibold">
                  {obtenerDescripcionPaso(estadoProceso.paso)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                color="primary"
                startContent={<Icon icon="lucide:plus" />}
                onPress={() => history.push('/solicitud')}
              >
                Crear nueva solicitud
              </Button>
            </div>
          </CardBody>
        </Card>
      </motion.div>

        {/* Tarjetas de Estadísticas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <StatsCard
            title="Pendientes"
            value={conteoSolicitudes.pendientes}
            icon="lucide:clock"
            color="warning"
          />
          <StatsCard
            title="Aceptadas"
            value={conteoSolicitudes.aceptadas}
            icon="lucide:check-circle"
            color="success"
          />
          <StatsCard
            title="Rechazadas"
            value={conteoSolicitudes.rechazadas}
            icon="lucide:x-circle"
            color="danger"
          />
        </motion.div>

        {/* Mis Solicitudes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="shadow-sm">
            <CardHeader className="pb-0 pt-4 px-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Mis Solicitudes</h3>
              <Button
                size="sm"
                color="primary"
                startContent={<Icon icon="lucide:plus" />}
                onPress={() => history.push('/solicitud')}
              >
                Nueva Solicitud
              </Button>
            </CardHeader>
            <CardBody className="px-4 pb-4">
              {solicitudesOrdenadas.length === 0 ? (
                <div className="text-center py-8">
                  <Icon icon="lucide:inbox" className="text-6xl text-default-300 mx-auto mb-4" />
                  <p className="text-default-500 mb-4">No tienes solicitudes creadas</p>
                  <Button
                    color="primary"
                    startContent={<Icon icon="lucide:plus" />}
                    onPress={() => history.push('/solicitud')}
                  >
                    Crear Primera Solicitud
                  </Button>
                </div>
              ) : (
                <Table removeWrapper aria-label="Tabla de solicitudes">
                  <TableHeader>
                    <TableColumn>ASIGNATURA</TableColumn>
                    <TableColumn>FECHA CLASE</TableColumn>
                    <TableColumn>ESTADO</TableColumn>
                    <TableColumn>FECHA CREACIÓN</TableColumn>
                    <TableColumn>ACCIONES</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {solicitudesOrdenadas.map((solicitud) => (
                      <TableRow key={solicitud.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{solicitud.asignaturaNombre}</p>
                            {solicitud.recetaNombre && (
                              <p className="text-xs text-default-400">{solicitud.recetaNombre}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(solicitud.fecha).toLocaleDateString('es-CL')}
                        </TableCell>
                        <TableCell>
                          <EstadoSolicitudChip estado={solicitud.estado} />
                        </TableCell>
                        <TableCell>
                          {new Date(solicitud.fechaCreacion).toLocaleDateString('es-CL')}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="light"
                            onPress={() => history.push(`/gestion-solicitudes`)}
                            startContent={<Icon icon="lucide:eye" />}
                          >
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </motion.div>
    </div>
  );
};

