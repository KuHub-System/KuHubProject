import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Select,
  SelectItem,
  Input,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Selection,
  Divider,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { obtenerPedidosService } from '../services/pedido-service';
import { obtenerTodasSolicitudesService } from '../services/solicitud-service';
import { IPedido, IPedidoResumen, EstadoPedido } from '../types/pedido.types';
import { ISolicitud, EstadoSolicitud } from '../types/solicitud.types';
import { EstadoSolicitudChip } from '../components/dashboard/shared/EstadoSolicitudChip';
import { logger } from '../utils/logger';

type PedidoConSolicitudes = IPedidoResumen & {
  solicitudes: ISolicitud[];
};

const SEMANAS = Array.from({ length: 18 }, (_, index) => index + 1);

const construirResumenPedido = (
  pedido: IPedido,
  solicitudes: ISolicitud[]
): PedidoConSolicitudes => {
  const totalPendientes = solicitudes.filter((s) => s.estado === 'Pendiente').length;
  const totalAceptadas = solicitudes.filter((s) => s.estado === 'Aceptada').length;
  const totalAceptadasModificadas = solicitudes.filter(
    (s) => s.estado === 'AceptadaModificada'
  ).length;
  const totalRechazadas = solicitudes.filter((s) => s.estado === 'Rechazada').length;

  return {
    ...pedido,
    totalSolicitudes: solicitudes.length,
    totalPendientes,
    totalAceptadas,
    totalAceptadasModificadas,
    totalRechazadas,
    solicitudes,
  };
};

const formatearFecha = (fechaISO?: string) => {
  if (!fechaISO) return '—';
  const fecha = new Date(fechaISO);
  return fecha.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const renderEstadoPedido = (estado: EstadoPedido) => {
  switch (estado) {
    case 'EnCurso':
      return <Chip color="warning" size="sm" variant="flat">En curso</Chip>;
    case 'Completado':
      return <Chip color="success" size="sm" variant="flat">Completado</Chip>;
    case 'Cancelado':
      return <Chip color="danger" size="sm" variant="flat">Cancelado</Chip>;
    default:
      return <Chip size="sm" variant="flat">{estado}</Chip>;
  }
};

const GestionPedidosPage: React.FC = () => {
  const toast = useToast();
  const [pedidos, setPedidos] = React.useState<PedidoConSolicitudes[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [filtroEstado, setFiltroEstado] = React.useState<Selection>(new Set([]));
  const [filtroSemana, setFiltroSemana] = React.useState<Selection>(new Set([]));
  const [busqueda, setBusqueda] = React.useState('');

  const [pedidoSeleccionado, setPedidoSeleccionado] = React.useState<PedidoConSolicitudes | null>(null);
  const [estadoDetalle, setEstadoDetalle] = React.useState<Selection>(new Set([]));
  const [solicitudSeleccionada, setSolicitudSeleccionada] = React.useState<ISolicitud | null>(null);

  const { isOpen: isDetalleOpen, onOpen: onDetalleOpen, onOpenChange: onDetalleOpenChange } = useDisclosure();
  const { isOpen: isSolicitudOpen, onOpen: onSolicitudOpen, onOpenChange: onSolicitudOpenChange } = useDisclosure();

  const cargarPedidos = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const pedidosBase = await obtenerPedidosService();

      const pedidosConSolicitudes = await Promise.all(
        pedidosBase.map(async (pedido) => {
          const solicitudesSemana = await obtenerTodasSolicitudesService({ semana: pedido.semana });
          return construirResumenPedido(pedido, solicitudesSemana);
        })
      );

      setPedidos(pedidosConSolicitudes);
    } catch (error) {
      logger.error('❌ Error al cargar los pedidos semanales:', error);
      toast.error('Error al cargar los pedidos semanales');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    cargarPedidos();
  }, [cargarPedidos]);

  const estadoSeleccionado = React.useMemo(() => {
    if (filtroEstado === 'all') return '';
    const valor = Array.from(filtroEstado)[0] as string | undefined;
    return valor && valor !== 'todos' ? valor : '';
  }, [filtroEstado]);

  const semanaSeleccionada = React.useMemo(() => {
    if (filtroSemana === 'all') return 0;
    const valor = Array.from(filtroSemana)[0] as string | undefined;
    return valor && valor !== 'todas' ? parseInt(valor, 10) : 0;
  }, [filtroSemana]);

  const pedidosFiltrados = React.useMemo(() => {
    return pedidos.filter((pedido) => {
      if (estadoSeleccionado && pedido.estado !== estadoSeleccionado) {
        return false;
      }

      if (semanaSeleccionada && pedido.semana !== semanaSeleccionada) {
        return false;
      }

      if (busqueda) {
        const texto = busqueda.toLowerCase();
        const coincidePedido =
          (pedido.creadoPorNombre || '').toLowerCase().includes(texto) ||
          (pedido.comentario || '').toLowerCase().includes(texto) ||
          pedido.id.toLowerCase().includes(texto);

        const coincideSolicitud = pedido.solicitudes.some((solicitud) =>
          solicitud.asignaturaNombre.toLowerCase().includes(texto) ||
          solicitud.profesorNombre.toLowerCase().includes(texto)
        );

        if (!coincidePedido && !coincideSolicitud) {
          return false;
        }
      }

      return true;
    });
  }, [pedidos, estadoSeleccionado, semanaSeleccionada, busqueda]);

  const resumenGlobal = React.useMemo(() => {
    const totalSolicitudes = pedidos.reduce((acc, pedido) => acc + pedido.totalSolicitudes, 0);
    return {
      totalPedidos: pedidos.length,
      enCurso: pedidos.filter((p) => p.estado === 'EnCurso').length,
      completados: pedidos.filter((p) => p.estado === 'Completado').length,
      cancelados: pedidos.filter((p) => p.estado === 'Cancelado').length,
      totalSolicitudes,
    };
  }, [pedidos]);

  const estadoDetalleSeleccionado = React.useMemo(() => {
    if (estadoDetalle === 'all') return '';
    const valor = Array.from(estadoDetalle)[0] as string | undefined;
    return valor && valor !== 'todos' ? valor : '';
  }, [estadoDetalle]);

  const solicitudesDetalle = React.useMemo(() => {
    if (!pedidoSeleccionado) return [];

    return pedidoSeleccionado.solicitudes.filter((solicitud) => {
      if (estadoDetalleSeleccionado && solicitud.estado !== estadoDetalleSeleccionado) {
        return false;
      }
      return true;
    });
  }, [pedidoSeleccionado, estadoDetalleSeleccionado]);

  const abrirDetallePedido = (pedido: PedidoConSolicitudes) => {
    setPedidoSeleccionado(pedido);
    setEstadoDetalle(new Set([]));
    onDetalleOpen();
  };

  const abrirDetalleSolicitud = (solicitud: ISolicitud) => {
    setSolicitudSeleccionada(solicitud);
    onSolicitudOpen();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>Cargando pedidos semanales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Gestión de Pedidos Semanales</h1>
              <p className="text-default-500 text-sm">
                Visualiza los procesos de pedidos generados por la administración y revisa las solicitudes agrupadas por semana.
              </p>
            </div>
            <Button
              variant="flat"
              color="primary"
              startContent={<Icon icon="lucide:refresh-cw" />}
              onPress={cargarPedidos}
            >
              Actualizar
            </Button>
          </CardHeader>
          <Divider />
          <CardBody className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ResumenCard
              titulo="Pedidos totales"
              valor={resumenGlobal.totalPedidos}
              icono="lucide:layers"
              color="primary"
            />
            <ResumenCard
              titulo="En curso"
              valor={resumenGlobal.enCurso}
              icono="lucide:play-circle"
              color="warning"
            />
            <ResumenCard
              titulo="Completados"
              valor={resumenGlobal.completados}
              icono="lucide:check-circle"
              color="success"
            />
            <ResumenCard
              titulo="Solicitudes procesadas"
              valor={resumenGlobal.totalSolicitudes}
              icono="lucide:clipboard-check"
              color="secondary"
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_200px] gap-4">
              <Input
                placeholder="Buscar por profesor, asignatura o comentario..."
                value={busqueda}
                onValueChange={setBusqueda}
                startContent={<Icon icon="lucide:search" className="text-default-400" />}
                isClearable
                onClear={() => setBusqueda('')}
              />
              <Select
                label="Estado del pedido"
                placeholder="Todos los estados"
                selectedKeys={filtroEstado}
                onSelectionChange={setFiltroEstado}
              >
                <SelectItem key="todos">Todos</SelectItem>
                <SelectItem key="EnCurso">En curso</SelectItem>
                <SelectItem key="Completado">Completado</SelectItem>
                <SelectItem key="Cancelado">Cancelado</SelectItem>
              </Select>
              <Select
                label="Semana"
                placeholder="Todas las semanas"
                selectedKeys={filtroSemana}
                onSelectionChange={setFiltroSemana}
              >
                <SelectItem key="todas">Todas</SelectItem>
                {SEMANAS.map((semana) => (
                  <SelectItem key={semana.toString()}>
                    Semana {semana}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardBody className="p-0">
            <Table removeWrapper aria-label="Tabla de pedidos semanales">
              <TableHeader>
                <TableColumn>SEMANA</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>INICIO</TableColumn>
                <TableColumn>CIERRE</TableColumn>
                <TableColumn>TOTAL SOLICITUDES</TableColumn>
                <TableColumn>PENDIENTES</TableColumn>
                <TableColumn>ACEPTADAS</TableColumn>
                <TableColumn>MODIFICADAS</TableColumn>
                <TableColumn>RECHAZADAS</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No hay pedidos registrados para los filtros seleccionados">
                {pedidosFiltrados.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold">Semana {pedido.semana}</p>
                        <p className="text-xs text-default-400">Pedido #{pedido.id.slice(-6)}</p>
                      </div>
                    </TableCell>
                    <TableCell>{renderEstadoPedido(pedido.estado)}</TableCell>
                    <TableCell>{formatearFecha(pedido.fechaInicio)}</TableCell>
                    <TableCell>{formatearFecha(pedido.fechaCierre)}</TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat">
                        {pedido.totalSolicitudes} solicitudes
                      </Chip>
                    </TableCell>
                    <TableCell>{pedido.totalPendientes}</TableCell>
                    <TableCell>{pedido.totalAceptadas}</TableCell>
                    <TableCell>{pedido.totalAceptadasModificadas}</TableCell>
                    <TableCell>{pedido.totalRechazadas}</TableCell>
                    <TableCell>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => abrirDetallePedido(pedido)}
                      >
                        <Icon icon="lucide:eye" className="text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </motion.div>

      <Modal isOpen={isDetalleOpen} onOpenChange={onDetalleOpenChange} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-xl font-semibold">
                  Detalle del pedido semanal {pedidoSeleccionado?.semana}
                </span>
                <span className="text-sm text-default-500">
                  Pedido #{pedidoSeleccionado?.id.slice(-6)} · Creado por {pedidoSeleccionado?.creadoPorNombre || 'Administración'}
                </span>
              </ModalHeader>
              <ModalBody className="space-y-4">
                {pedidoSeleccionado && (
                  <>
                    <Card variant="flat">
                      <CardBody className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-default-500">Estado</p>
                          <div className="mt-1">
                            {renderEstadoPedido(pedidoSeleccionado.estado)}
                          </div>
                        </div>
                        <div>
                          <p className="text-default-500">Fecha inicio</p>
                          <p className="font-medium">{formatearFecha(pedidoSeleccionado.fechaInicio)}</p>
                        </div>
                        <div>
                          <p className="text-default-500">Fecha cierre</p>
                          <p className="font-medium">{formatearFecha(pedidoSeleccionado.fechaCierre)}</p>
                        </div>
                        <div>
                          <p className="text-default-500">Total solicitudes</p>
                          <p className="font-medium">{pedidoSeleccionado.totalSolicitudes}</p>
                        </div>
                      </CardBody>
                    </Card>

                    <div className="flex flex-col md:flex-row gap-4 md:items-end">
                      <Select
                        label="Filtrar por estado"
                        placeholder="Todos los estados"
                        selectedKeys={estadoDetalle}
                        onSelectionChange={setEstadoDetalle}
                        className="md:w-64"
                      >
                        <SelectItem key="todos">Todos</SelectItem>
                        <SelectItem key="Pendiente">Pendiente</SelectItem>
                        <SelectItem key="Aceptada">Aceptada</SelectItem>
                        <SelectItem key="AceptadaModificada">Aceptada (modificada)</SelectItem>
                        <SelectItem key="Rechazada">Rechazada</SelectItem>
                      </Select>
                      {pedidoSeleccionado.comentario && (
                        <Chip color="secondary" variant="flat">
                          Comentario admin: {pedidoSeleccionado.comentario}
                        </Chip>
                      )}
                    </div>

                    <Table removeWrapper aria-label="Solicitudes asociadas al pedido">
                      <TableHeader>
                        <TableColumn>PROFESOR</TableColumn>
                        <TableColumn>ASIGNATURA</TableColumn>
                        <TableColumn>FECHA CLASE</TableColumn>
                        <TableColumn>ESTADO</TableColumn>
                        <TableColumn>ACCIONES</TableColumn>
                      </TableHeader>
                      <TableBody emptyContent="No hay solicitudes para mostrar">
                        {solicitudesDetalle.map((solicitud) => (
                          <TableRow key={solicitud.id}>
                            <TableCell>{solicitud.profesorNombre}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{solicitud.asignaturaNombre}</p>
                                <p className="text-xs text-default-400">Semana {solicitud.semana}</p>
                              </div>
                            </TableCell>
                            <TableCell>{new Date(solicitud.fecha).toLocaleDateString('es-CL')}</TableCell>
                            <TableCell>
                              <EstadoSolicitudChip estado={solicitud.estado} />
                            </TableCell>
                            <TableCell>
                              <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                onPress={() => abrirDetalleSolicitud(solicitud)}
                              >
                                <Icon icon="lucide:eye" className="text-primary" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Cerrar
                </Button>
                <Button
                  color="primary"
                  variant="bordered"
                  onPress={() => window.open('/gestion-solicitudes', '_blank')}
                >
                  Ir a Gestión de Solicitudes
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isSolicitudOpen} onOpenChange={onSolicitudOpenChange} size="xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                Detalle de la solicitud
              </ModalHeader>
              <ModalBody className="space-y-4">
                {solicitudSeleccionada && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-default-500">Profesor</p>
                        <p className="font-medium">{solicitudSeleccionada.profesorNombre}</p>
                      </div>
                      <div>
                        <p className="text-default-500">Asignatura</p>
                        <p className="font-medium">{solicitudSeleccionada.asignaturaNombre}</p>
                      </div>
                      <div>
                        <p className="text-default-500">Fecha clase</p>
                        <p className="font-medium">
                          {new Date(solicitudSeleccionada.fecha).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                      <div>
                        <p className="text-default-500">Estado</p>
                        <EstadoSolicitudChip estado={solicitudSeleccionada.estado} />
                      </div>
                      {solicitudSeleccionada.comentarioRechazo && (
                        <div className="md:col-span-2">
                          <p className="text-default-500">Comentario de rechazo</p>
                          <p className="font-medium text-danger-500">
                            {solicitudSeleccionada.comentarioRechazo}
                          </p>
                        </div>
                      )}
                      {solicitudSeleccionada.comentarioAdministrador && (
                        <div className="md:col-span-2">
                          <p className="text-default-500">Comentario administrador</p>
                          <p className="font-medium">
                            {solicitudSeleccionada.comentarioAdministrador}
                          </p>
                        </div>
                      )}
                    </div>

                    <Divider />

                    <div>
                      <h4 className="font-semibold mb-2">Productos solicitados</h4>
                      <Table removeWrapper aria-label="Productos de la solicitud">
                        <TableHeader>
                          <TableColumn>PRODUCTO</TableColumn>
                          <TableColumn>CANTIDAD</TableColumn>
                          <TableColumn>TIPO</TableColumn>
                        </TableHeader>
                        <TableBody>
                          {solicitudSeleccionada.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.productoNombre}</TableCell>
                              <TableCell>{item.cantidad} {item.unidadMedida}</TableCell>
                              <TableCell>
                                <Chip size="sm" variant="flat" color={item.esAdicional ? 'warning' : 'default'}>
                                  {item.esAdicional ? 'Adicional' : 'Receta'}
                                </Chip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Cerrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

interface ResumenCardProps {
  titulo: string;
  valor: number;
  icono: string;
  color: 'primary' | 'secondary' | 'success' | 'warning';
}

const ResumenCard: React.FC<ResumenCardProps> = ({ titulo, valor, icono, color }) => {
  const colorClasses: Record<ResumenCardProps['color'], string> = {
    primary: 'bg-primary-100 text-primary-600',
    secondary: 'bg-secondary-100 text-secondary-600',
    success: 'bg-success-100 text-success-600',
    warning: 'bg-warning-100 text-warning-600',
  };

  return (
    <Card variant="flat" className="border border-default-200">
      <CardBody className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon icon={icono} className="text-xl" />
        </div>
        <div>
          <p className="text-sm text-default-500">{titulo}</p>
          <p className="text-2xl font-semibold">{valor}</p>
        </div>
      </CardBody>
    </Card>
  );
};

export default GestionPedidosPage;

