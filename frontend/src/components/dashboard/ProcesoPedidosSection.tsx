/**
 * COMPONENTE: Sección de Proceso de Pedidos
 * Solo visible para administradores
 */

import React from 'react';
import { Card, CardBody, CardHeader, Button, Chip, Select, SelectItem } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { EstadoProceso } from '../../services/dashboard-service';

const getFirstSelectionValue = (keys: any): string | undefined => {
  if (!keys || keys === 'all') return undefined;
  const firstKey = Array.from(keys as Set<React.Key>)[0];
  return firstKey != null ? String(firstKey) : undefined;
};

interface ProcesoPedidosSectionProps {
  estadoProceso: EstadoProceso;
  semanaSeleccionada: number | null;
  pedidoId: string | null;
  onSemanaSeleccionadaChange: (semana: number | null) => void;
  onIniciarProceso: () => void;
  onTerminarProceso: () => void;
  onCancelarProceso: () => void;
  solicitudesPendientesCount: number;
  onVerPendientes: () => void;
  onVerComprobacion?: () => void;
  onVerCotizacion?: () => void;
  onVerOrdenFinal?: () => void;
  showComprobacion?: boolean;
  showCotizacion?: boolean;
  showOrdenFinal?: boolean;
}

const pasos = [1, 2, 3, 4, 5, 6];

const getStepLabel = (step: number): string => {
  switch (step) {
    case 1: return 'Inicio';
    case 2: return 'Recepción';
    case 3: return 'Comprobar';
    case 4: return 'Cotizar';
    case 5: return 'Ordenar';
    case 6: return 'Fin';
    default: return '';
  }
};

const getStepDescription = (step: number, semana: number | null): string => {
  switch (step) {
    case 2:
      return semana
        ? `Recepcionando solicitudes correspondientes a la semana ${semana}.`
        : 'Selecciona la semana que deseas procesar.';
    case 3:
      return 'Revisando el inventario disponible para cubrir las solicitudes.';
    case 4:
      return 'Generando cotizaciones con proveedores según los faltantes.';
    case 5:
      return 'Preparando la orden final con los productos seleccionados.';
    case 6:
      return 'El proceso finalizó correctamente.';
    default:
      return '';
  }
};

export const ProcesoPedidosSection: React.FC<ProcesoPedidosSectionProps> = ({
  estadoProceso,
  semanaSeleccionada,
  pedidoId,
  onSemanaSeleccionadaChange,
  onIniciarProceso,
  onTerminarProceso,
  onCancelarProceso,
  solicitudesPendientesCount,
  onVerPendientes,
  onVerComprobacion,
  onVerCotizacion,
  onVerOrdenFinal,
  showComprobacion = false,
  showCotizacion = false,
  showOrdenFinal = false,
}) => {
  const semanas = React.useMemo(() => Array.from({ length: 18 }, (_, index) => index + 1), []);
  const semanaSeleccionadaKeys = React.useMemo(
    () => (semanaSeleccionada ? new Set([semanaSeleccionada.toString()]) : new Set<string>()),
    [semanaSeleccionada]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="shadow-md border-2 border-primary-200">
        <CardHeader className="pb-0 pt-4 px-4">
          <div className="flex justify-between items-start w-full">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Icon icon="lucide:calendar-clock" className="text-primary" />
                Proceso de Pedidos por Semana
              </h3>
              <p className="text-default-500 text-sm">
                Selecciona la semana académica y avanza por cada etapa del proceso.
              </p>
            </div>
            {estadoProceso.activo && estadoProceso.semanaSeleccionada && (
              <Chip 
                color="primary"
                variant="flat"
                size="lg"
                startContent={<Icon icon="lucide:calendar" />}
              >
                Semana {estadoProceso.semanaSeleccionada}
              </Chip>
            )}
            {estadoProceso.activo && pedidoId && (
              <Chip
                color="default"
                variant="flat"
                size="lg"
                startContent={<Icon icon="lucide:hash" />}
              >
                Pedido #{pedidoId.slice(-6)}
              </Chip>
            )}
          </div>
        </CardHeader>
        <CardBody className="px-4 pb-4 space-y-6">
          <div className="relative h-2 bg-default-200 rounded-full mt-2">
            <motion.div 
              className="absolute h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((estadoProceso.paso - 1) / 5) * 100}%` }}
              transition={{ duration: 0.8 }}
            />
            <div className="flex justify-between items-center absolute w-full -top-3">
              {pasos.map((step) => (
                <motion.div 
                  key={step}
                  className={`w-10 h-10 rounded-full border-3 flex items-center justify-center text-xs font-bold z-10 shadow-lg ${
                    estadoProceso.paso >= step
                      ? 'bg-primary-500 border-primary-500 text-white' 
                      : 'bg-white dark:bg-zinc-800 border-default-300 text-default-500'
                  }`}
                  animate={{ 
                    scale: estadoProceso.paso === step ? [1, 1.1, 1] : 1
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: estadoProceso.paso === step ? Infinity : 0,
                    repeatDelay: 1
                  }}
                >
                  {estadoProceso.paso > step ? (
                    <Icon icon="lucide:check" className="text-base" />
                  ) : (
                    step
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex justify-between text-xs text-default-500">
            {pasos.map((step) => (
              <span key={step} className="w-16 text-center">{getStepLabel(step)}</span>
            ))}
          </div>

          {!estadoProceso.activo ? (
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 items-end">
              <Select
                label="Semana académica a procesar"
                placeholder="Selecciona la semana (1 - 18)"
                selectedKeys={semanaSeleccionadaKeys}
                onSelectionChange={(keys) => {
                  const value = getFirstSelectionValue(keys);
                  onSemanaSeleccionadaChange(value ? parseInt(value, 10) : null);
                }}
              >
                {semanas.map((semana) => {
                  const label = `Semana ${semana}`;
                  return (
                    <SelectItem key={semana.toString()} textValue={label}>
                      {label}
                    </SelectItem>
                  );
                })}
              </Select>
              <Button
                color="primary"
                size="lg"
                startContent={<Icon icon="lucide:play" />}
                onPress={onIniciarProceso}
                isDisabled={semanaSeleccionada === null}
              >
                Iniciar proceso
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
            {solicitudesPendientesCount > 0 && estadoProceso.paso === 2 && (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-full"
              >
                <Card className="bg-warning-50 dark:bg-warning-900/20 border-2 border-warning-500 h-full">
                  <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <Icon icon="lucide:alert-triangle" className="text-warning text-2xl" />
                      <div>
                        <p className="font-semibold text-warning-700 dark:text-warning-400">
                          ⚠️ {solicitudesPendientesCount} solicitud{solicitudesPendientesCount !== 1 ? 'es' : ''} pendiente{solicitudesPendientesCount !== 1 ? 's' : ''} de revisar
                        </p>
                        <p className="text-sm text-warning-600 dark:text-warning-500">
                          Revisa cada solicitud antes de avanzar con la semana {estadoProceso.semanaSeleccionada}.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end sm:ml-auto">
                      <Button
                        color="warning"
                        variant="flat"
                        onPress={onVerPendientes}
                        startContent={<Icon icon="lucide:eye" />}
                      >
                        Ver pendientes
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="h-full bg-primary-50 dark:bg-primary-900/20 border border-primary-200">
                <CardBody className="space-y-1">
                  <p className="text-sm text-default-500">Semana en proceso</p>
                  <p className="font-semibold text-lg">Semana {estadoProceso.semanaSeleccionada ?? '—'}</p>
                </CardBody>
              </Card>
              <Card className="h-full bg-primary-50 dark:bg-primary-900/10 border border-primary-200">
                <CardBody className="space-y-1">
                  <p className="text-sm text-default-500">Solicitudes pendientes</p>
                  <p className="font-semibold text-lg">{solicitudesPendientesCount}</p>
                </CardBody>
              </Card>
            </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-default-500">
                  {getStepDescription(estadoProceso.paso, estadoProceso.semanaSeleccionada)}
                </p>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    color="danger"
                    variant="light"
                    size="sm"
                    onPress={onCancelarProceso}
                  >
                    Cancelar
                  </Button>

                  {showComprobacion && onVerComprobacion && (
                    <Button
                      color="primary"
                      variant="bordered"
                      size="sm"
                      startContent={<Icon icon="lucide:package-check" />}
                      onPress={onVerComprobacion}
                    >
                      Ver Comprobación
                    </Button>
                  )}

                  {showCotizacion && onVerCotizacion && (
                    <Button
                      color="primary"
                      variant="bordered"
                      size="sm"
                      startContent={<Icon icon="lucide:receipt" />}
                      onPress={onVerCotizacion}
                    >
                      Ver Cotización
                    </Button>
                  )}

                  {showOrdenFinal && onVerOrdenFinal && (
                    <Button
                      color="primary"
                      variant="bordered"
                      size="sm"
                      startContent={<Icon icon="lucide:file-text" />}
                      onPress={onVerOrdenFinal}
                    >
                      Ver Orden Final
                    </Button>
                  )}

                  {estadoProceso.paso === 2 && (
                    <Button
                      color="primary"
                      size="sm"
                      startContent={<Icon icon="lucide:check-circle" />}
                      onPress={onTerminarProceso}
                    >
                      Terminar y procesar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
};

