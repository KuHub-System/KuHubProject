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
    <div className="container mx-auto px-4 py-8 space-y-8 font-sans">
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
        <Card className="shadow-sm border-t-4 border-primary bg-white dark:bg-content1 overflow-visible">
          <CardHeader className="pb-0 pt-6 px-6">
            <div className="flex justify-between items-start w-full">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 text-secondary">
                  <Icon icon="lucide:calendar-clock" className="text-primary" width={24} />
                  Estado del proceso
                </h3>
                <p className="text-default-500 text-sm mt-1">
                  El administrador gestionará las solicitudes por semanas académicas.
                </p>
              </div>
              {estadoProceso.activo && estadoProceso.semanaSeleccionada ? (
                <Chip
                  className="bg-primary text-secondary font-bold"
                  variant="shadow"
                  size="lg"
                >
                  Semana {estadoProceso.semanaSeleccionada}
                </Chip>
              ) : (
                <Chip size="lg" variant="flat">Sin proceso activo</Chip>
              )}
            </div>
          </CardHeader>
          <CardBody className="px-6 pb-6 pt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-default-50 dark:bg-default-900/20 rounded-xl border border-default-200">
              <div>
                <p className="text-xs font-bold text-default-400 uppercase tracking-widest mb-2">Semana en proceso</p>
                <p className="font-semibold text-lg text-secondary">
                  {estadoProceso.activo && estadoProceso.semanaSeleccionada
                    ? `Semana Académica ${estadoProceso.semanaSeleccionada}`
                    : 'El administrador iniciará el proceso cuando corresponda.'}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-default-400 uppercase tracking-widest mb-2">Etapa actual</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <p className="font-semibold text-lg text-secondary">
                    {obtenerDescripcionPaso(estadoProceso.paso)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                color="primary"
                className="font-bold text-secondary"
                startContent={<Icon icon="lucide:plus" width={20} />}
                onPress={() => history.push('/solicitud')}
                size="lg"
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
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <StatsCard
          title="Pendientes"
          value={conteoSolicitudes.pendientes}
          icon="lucide:clock"
          color="warning"
          description="Solicitudes en espera de revisión"
        />
        <StatsCard
          title="Aceptadas"
          value={conteoSolicitudes.aceptadas}
          icon="lucide:check-circle"
          color="success"
          description="Solicitudes aprobadas por admin"
        />
        <StatsCard
          title="Rechazadas"
          value={conteoSolicitudes.rechazadas}
          icon="lucide:x-circle"
          color="danger"
          description="Solicitudes devueltas"
        />
      </motion.div>

      {/* Mis Solicitudes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="shadow-sm border-t-4 border-secondary bg-white dark:bg-content1">
          <CardHeader className="pb-0 pt-6 px-6 flex justify-between items-center bg-white dark:bg-content1">
            <h3 className="text-lg font-bold text-secondary">Mis Solicitudes Recientes</h3>
            <Button
              size="sm"
              variant="light"
              color="primary"
              className="font-semibold"
              endContent={<Icon icon="lucide:arrow-right" />}
              onPress={() => history.push('/gestion-solicitudes')}
            >
              Ver todas
            </Button>
          </CardHeader>
          <CardBody className="px-6 pb-6">
            {solicitudesOrdenadas.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-default-200 rounded-xl bg-default-50">
                <div className="w-16 h-16 bg-default-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon icon="lucide:inbox" className="text-3xl text-default-400" />
                </div>
                <h4 className="text-lg font-semibold text-default-600 mb-1">No tienes solicitudes</h4>
                <p className="text-default-400 mb-6 max-w-xs mx-auto">Comienza creando tu primera solicitud de insumos para tus clases.</p>
                <Button
                  color="primary"
                  className="font-bold text-secondary"
                  startContent={<Icon icon="lucide:plus" />}
                  onPress={() => history.push('/solicitud')}
                >
                  Crear Primera Solicitud
                </Button>
              </div>
            ) : (
              <Table
                removeWrapper
                aria-label="Tabla de solicitudes"
              >
                <TableHeader>
                  <TableColumn key="asignatura" className="bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs">ASIGNATURA</TableColumn>
                  <TableColumn key="fecha" className="bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs">FECHA CLASE</TableColumn>
                  <TableColumn key="estado" className="bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs">ESTADO</TableColumn>
                  <TableColumn key="creacion" className="bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs">CREADO EL</TableColumn>
                  <TableColumn key="acciones" className="bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs">ACCIONES</TableColumn>
                </TableHeader>
                <TableBody>
                  {solicitudesOrdenadas.slice(0, 5).map((solicitud) => (
                    <TableRow key={solicitud.id} className="border-b border-default-100 last:border-none hover:bg-default-50 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-bold text-secondary text-sm">{solicitud.asignaturaNombre}</p>
                          {solicitud.recetaNombre && (
                            <p className="text-xs text-default-500 mt-0.5">{solicitud.recetaNombre}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-default-600 text-sm">
                          <Icon icon="lucide:calendar" className="text-default-400" width={14} />
                          {new Date(solicitud.fecha).toLocaleDateString('es-CL')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <EstadoSolicitudChip estado={solicitud.estado} />
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-default-400">
                          {new Date(solicitud.fechaCreacion).toLocaleDateString('es-CL')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => history.push(`/gestion-solicitudes`)} // O llevar al detalle específico si existiera ruta
                          className="text-default-400 hover:text-primary"
                        >
                          <Icon icon="lucide:eye" width={18} />
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
