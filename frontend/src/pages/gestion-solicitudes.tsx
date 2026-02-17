import React, { useState, useEffect } from 'react';
import {
  Card, CardBody, Button, Input, Select, SelectItem, Chip,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
  Textarea, Tabs, Tab, Divider, Tooltip, Selection, CardHeader
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/auth-context';
import { useToast, useConfirm } from '../hooks/useToast';
import {
  obtenerTodasSolicitudesService,
  obtenerMisSolicitudesService,
  aprobarRechazarSolicitudService,
  aceptarTodasSolicitudesService,
  obtenerConteoSolicitudesService,
  eliminarSolicitudService
} from '../services/solicitud-service';
import { obtenerUsuariosService } from '../services/usuario-service';
import { notificarCambioEstadoSolicitudService } from '../services/notificacion-service';
import { ISolicitud, EstadoSolicitud } from '../types/solicitud.types';
import { IUsuario } from '../types/usuario.types';

const GestionSolicitudesPage: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { user, hasSpecificPermission } = useAuth();
  const [solicitudes, setSolicitudes] = useState<ISolicitud[]>([]);
  const [usuarios, setUsuarios] = useState<IUsuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<Selection>(new Set([]));
  const [filtroProfesor, setFiltroProfesor] = useState<Selection>(new Set([]));
  const [filtroSemana, setFiltroSemana] = useState<Selection>(new Set([]));
  const [filtroAsignatura, setFiltroAsignatura] = useState<Selection>(new Set([]));
  const [busqueda, setBusqueda] = useState('');
  const [tabSeleccionada, setTabSeleccionada] = useState('todas');

  const [contadores, setContadores] = useState({
    pendientes: 0,
    aceptadas: 0,
    rechazadas: 0,
    total: 0
  });

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<ISolicitud | null>(null);
  const [accionModal, setAccionModal] = useState<'aprobar' | 'rechazar'>('aprobar');
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const esAdmin = hasSpecificPermission('gestion-pedidos') ||
    user?.rol === 'Admin' ||
    user?.rol === 'Co-Admin' ||
    user?.rol === 'Gestor de Pedidos';
  const esAdministradorGeneral = user?.rol === 'Administrador';

  useEffect(() => {
    cargarDatos();
  }, [esAdmin]);

  const cargarDatos = async () => {
    try {
      setIsLoading(true);

      const solicitudesData = esAdmin
        ? await obtenerTodasSolicitudesService()
        : await obtenerMisSolicitudesService();

      setSolicitudes(solicitudesData);

      const conteosData = await obtenerConteoSolicitudesService();
      setContadores(conteosData);

      if (esAdmin) {
        const usuariosData = await obtenerUsuariosService();
        const profesores = usuariosData.filter(u => u.rol === 'Profesor a Cargo');
        setUsuarios(profesores);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar las solicitudes');
    } finally {
      setIsLoading(false);
    }
  };

  const abrirModalAprobar = (solicitud: ISolicitud) => {
    setSolicitudSeleccionada(solicitud);
    setAccionModal('aprobar');
    setComentarioRechazo('');
    onOpen();
  };

  const abrirModalRechazar = (solicitud: ISolicitud) => {
    setSolicitudSeleccionada(solicitud);
    setAccionModal('rechazar');
    setComentarioRechazo('');
    onOpen();
  };

  const handleAprobarRechazar = async () => {
    if (!solicitudSeleccionada || !user) return;

    if (accionModal === 'rechazar' && !comentarioRechazo.trim()) {
      toast.warning('Por favor ingrese un comentario explicando el motivo del rechazo');
      return;
    }

    try {
      setIsSubmitting(true);

      const aprobadorId = user.id || user.nombre;

      await aprobarRechazarSolicitudService({
        solicitudId: solicitudSeleccionada.id,
        estado: accionModal === 'aprobar' ? 'Aceptada' : 'Rechazada',
        comentarioRechazo: accionModal === 'rechazar' ? comentarioRechazo : undefined,
        aprobadoPor: aprobadorId
      });

      notificarCambioEstadoSolicitudService(
        solicitudSeleccionada.profesorId,
        solicitudSeleccionada.id,
        accionModal === 'aprobar' ? 'Aceptada' : 'Rechazada',
        solicitudSeleccionada.asignaturaNombre,
        accionModal === 'rechazar' ? comentarioRechazo : undefined
      );

      toast.success(accionModal === 'aprobar'
        ? 'Solicitud aceptada correctamente'
        : 'Solicitud rechazada correctamente'
      );

      await cargarDatos();
      onOpenChange();
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAceptarTodas = async () => {
    const confirmed = await confirm(`¿Está seguro de aceptar TODAS las solicitudes pendientes (${contadores.pendientes})?`, {
      confirmColor: 'success',
      confirmText: 'Aceptar todas',
    });
    if (!confirmed) return;

    try {
      if (!user) return;
      const aprobadorId = user.id || user.nombre;
      const cantidad = await aceptarTodasSolicitudesService(aprobadorId);
      toast.success(`${cantidad} solicitudes aceptadas correctamente`);
      await cargarDatos();
    } catch (error: any) {
      toast.error(error.message || 'Error al aceptar solicitudes');
    }
  };

  const handleEliminar = async (solicitud: ISolicitud) => {
    const confirmed = await confirm(`¿Está seguro de eliminar la solicitud de ${solicitud.asignaturaNombre}?`, {
      confirmColor: 'danger',
      confirmText: 'Eliminar',
    });
    if (!confirmed) return;

    try {
      await eliminarSolicitudService(solicitud.id);
      toast.success('Solicitud eliminada correctamente');
      await cargarDatos();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar solicitud');
    }
  };

  const handleEliminarAdmin = async (solicitud: ISolicitud) => {
    if (!esAdministradorGeneral) {
      toast.warning('Solo el rol Administrador puede eliminar solicitudes de forma permanente.');
      return;
    }

    const confirmed = await confirm(
      `Esta acción eliminará definitivamente la solicitud de ${solicitud.asignaturaNombre} (Semana ${solicitud.semana}).`,
      {
        title: 'Eliminar solicitud',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        confirmColor: 'danger',
        requireText: 'ELIMINAR',
        requireTextLabel: 'Confirma escribiendo "ELIMINAR"',
        requireTextHelper: 'Esta acción es irreversible y solo debe usarse en fase de pruebas.',
      }
    );

    if (!confirmed) return;

    try {
      await eliminarSolicitudService(solicitud.id);
      toast.success('Solicitud eliminada permanentemente');
      await cargarDatos();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la solicitud');
    }
  };

  const estadoSeleccionado = React.useMemo(() => {
    if (filtroEstado === "all") return '';
    const valor = Array.from(filtroEstado)[0] as string || '';
    return valor === 'todos' ? '' : valor;
  }, [filtroEstado]);

  const profesorSeleccionado = React.useMemo(() => {
    if (filtroProfesor === "all") return '';
    const valor = Array.from(filtroProfesor)[0] as string || '';
    return valor === 'todos' ? '' : valor;
  }, [filtroProfesor]);

  const semanaSeleccionada = React.useMemo(() => {
    if (filtroSemana === 'all') return undefined;
    const valor = Array.from(filtroSemana)[0] as string | undefined;
    return valor && valor !== 'todas' ? parseInt(valor, 10) : undefined;
  }, [filtroSemana]);

  const asignaturaSeleccionada = React.useMemo(() => {
    if (filtroAsignatura === 'all') return '';
    const valor = Array.from(filtroAsignatura)[0] as string | undefined;
    return valor && valor !== 'todas' ? valor : '';
  }, [filtroAsignatura]);

  const semanasDisponibles = React.useMemo(() => {
    const semanas = Array.from(
      new Set(
        solicitudes
          .map((s) => (Number.isInteger(s.semana) ? s.semana : undefined))
          .filter((semana): semana is number => semana !== undefined)
      )
    );
    return semanas.sort((a, b) => a - b);
  }, [solicitudes]);

  const asignaturasDisponibles = React.useMemo(() => {
    const set = new Set<string>();
    solicitudes.forEach((s) => set.add(s.asignaturaNombre));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [solicitudes]);

  const solicitudesFiltradas = solicitudes.filter(s => {
    if (tabSeleccionada === 'pendientes' && s.estado !== 'Pendiente') return false;
    if (tabSeleccionada === 'aceptadas' && s.estado !== 'Aceptada') return false;
    if (tabSeleccionada === 'rechazadas' && s.estado !== 'Rechazada') return false;

    if (estadoSeleccionado && s.estado !== estadoSeleccionado) return false;
    if (profesorSeleccionado && s.profesorId !== profesorSeleccionado) return false;
    if (semanaSeleccionada && s.semana !== semanaSeleccionada) return false;
    if (asignaturaSeleccionada && s.asignaturaNombre !== asignaturaSeleccionada) return false;

    if (busqueda) {
      const texto = busqueda.toLowerCase();
      return (
        s.asignaturaNombre.toLowerCase().includes(texto) ||
        s.profesorNombre.toLowerCase().includes(texto) ||
        s.items.some(item => item.productoNombre.toLowerCase().includes(texto))
      );
    }

    return true;
  });

  const getColorEstado = (estado: EstadoSolicitud) => {
    switch (estado) {
      case 'Pendiente': return 'warning';
      case 'Aceptada': return 'success';
      case 'Rechazada': return 'danger';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-default-200 dark:border-default-100 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary dark:text-foreground mb-2">
              {esAdmin ? 'Gestión de Solicitudes' : 'Mis Solicitudes'}
            </h1>
            <p className="text-default-500 text-lg">
              {esAdmin
                ? 'Revisa y aprueba las solicitudes de los profesores'
                : 'Gestiona tus solicitudes de insumos'}
            </p>
          </div>

          {esAdmin && contadores.pendientes > 0 && (
            <Button
              color="primary"
              variant="solid"
              className="font-bold text-secondary shadow-lg"
              startContent={<Icon icon="lucide:check-check" width={20} />}
              onPress={handleAceptarTodas}
              size="lg"
            >
              Aceptar Todas ({contadores.pendientes})
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-sm border-t-4 border-primary bg-white dark:bg-content1">
            <CardBody className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary-100 text-primary-700">
                  <Icon icon="lucide:list" width={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-default-500">Total Solicitudes</p>
                  <p className="text-3xl font-bold text-secondary dark:text-foreground">{contadores.total}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="shadow-sm border-t-4 border-warning bg-white dark:bg-content1">
            <CardBody className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-warning-100 text-warning-700">
                  <Icon icon="lucide:clock" width={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-default-500">Pendientes</p>
                  <p className="text-3xl font-bold text-secondary dark:text-foreground">{contadores.pendientes}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="shadow-sm border-t-4 border-success bg-white dark:bg-content1">
            <CardBody className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-success-100 text-success-700">
                  <Icon icon="lucide:check-circle" width={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-default-500">Aceptadas</p>
                  <p className="text-3xl font-bold text-secondary dark:text-foreground">{contadores.aceptadas}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="shadow-sm border-t-4 border-danger bg-white dark:bg-content1">
            <CardBody className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-danger-100 text-danger-700">
                  <Icon icon="lucide:x-circle" width={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-default-500">Rechazadas</p>
                  <p className="text-3xl font-bold text-secondary dark:text-foreground">{contadores.rechazadas}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card className="shadow-sm bg-default-50 dark:bg-content1 border border-default-200 dark:border-default-100">
          <CardBody className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <Input
                  placeholder="Buscar por asignatura, profesor o producto..."
                  value={busqueda}
                  onValueChange={setBusqueda}
                  startContent={<Icon icon="lucide:search" className="text-default-400" />}
                  isClearable
                  onClear={() => setBusqueda('')}
                  variant="bordered"
                  classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                />
              </div>

              {esAdmin && (
                <Select
                  placeholder="Profesor"
                  selectedKeys={filtroProfesor}
                  onSelectionChange={setFiltroProfesor}
                  items={[{ id: 'todos', nombreCompleto: 'Todos' }, ...usuarios]}
                  variant="bordered"
                  classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
                  startContent={<Icon icon="lucide:user" className="text-default-400" />}
                >
                  {(usuario) => (
                    <SelectItem key={usuario.id} textValue={usuario.nombreCompleto}>
                      {usuario.nombreCompleto}
                    </SelectItem>
                  )}
                </Select>
              )}

              <Select
                placeholder="Estado"
                selectedKeys={filtroEstado}
                onSelectionChange={setFiltroEstado}
                variant="bordered"
                classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
                startContent={<Icon icon="lucide:filter" className="text-default-400" />}
              >
                <SelectItem key="todos">Todos</SelectItem>
                <SelectItem key="Pendiente" startContent={<div className="w-2 h-2 rounded-full bg-warning"></div>}>Pendiente</SelectItem>
                <SelectItem key="Aceptada" startContent={<div className="w-2 h-2 rounded-full bg-success"></div>}>Aceptada</SelectItem>
                <SelectItem key="Rechazada" startContent={<div className="w-2 h-2 rounded-full bg-danger"></div>}>Rechazada</SelectItem>
              </Select>

              <Select
                label="Semana"
                placeholder="Seleccione semana"
                selectedKeys={filtroSemana}
                onSelectionChange={setFiltroSemana}
                variant="bordered"
                classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
                startContent={<Icon icon="lucide:calendar-days" className="text-default-400" />}
                items={[
                  { key: 'todas', label: 'Todas' },
                  ...semanasDisponibles.map((semana) => ({ key: semana.toString(), label: `Semana ${semana}` }))
                ]}
              >
                {(item) => (
                  <SelectItem key={item.key}>
                    {item.label}
                  </SelectItem>
                )}
              </Select>

              {!esAdmin && (
                <Select
                  label="Asignatura"
                  placeholder="Seleccione asignatura"
                  selectedKeys={filtroAsignatura}
                  onSelectionChange={setFiltroAsignatura}
                  variant="bordered"
                  classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
                  startContent={<Icon icon="lucide:book" className="text-default-400" />}
                  items={[
                    { key: 'todas', label: 'Todas' },
                    ...asignaturasDisponibles.map((asignatura) => ({ key: asignatura, label: asignatura }))
                  ]}
                >
                  {(item) => (
                    <SelectItem key={item.key}>
                      {item.label}
                    </SelectItem>
                  )}
                </Select>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
          <CardBody className="p-0">
            <div className="px-4 py-2 border-b border-default-100 dark:border-default-50">
              <Tabs
                selectedKey={tabSeleccionada}
                onSelectionChange={(key) => setTabSeleccionada(key as string)}
                variant="underlined"
                color="primary"
                classNames={{
                  cursor: "w-full bg-primary",
                  tabContent: "group-data-[selected=true]:text-primary font-bold"
                }}
              >
                <Tab key="todas" title={
                  <div className="flex items-center gap-2">
                    <span>Todas</span>
                    <Chip size="sm" variant="flat">{solicitudes.length}</Chip>
                  </div>
                } />
                <Tab key="pendientes" title={
                  <div className="flex items-center gap-2">
                    <span>Pendientes</span>
                    <Chip size="sm" variant="flat" color="warning">{contadores.pendientes}</Chip>
                  </div>
                } />
                <Tab key="aceptadas" title={
                  <div className="flex items-center gap-2">
                    <span>Aceptadas</span>
                    <Chip size="sm" variant="flat" color="success">{contadores.aceptadas}</Chip>
                  </div>
                } />
                <Tab key="rechazadas" title={
                  <div className="flex items-center gap-2">
                    <span>Rechazadas</span>
                    <Chip size="sm" variant="flat" color="danger">{contadores.rechazadas}</Chip>
                  </div>
                } />
              </Tabs>
            </div>

            <Table
              aria-label="Tabla de solicitudes"
              removeWrapper
              classNames={{
                th: "bg-default-50 dark:bg-default-100 text-default-500 font-bold uppercase text-xs h-10",
                td: "py-3 border-b border-default-50 dark:border-default-50/20"
              }}
            >
              <TableHeader>
                {(esAdmin ? [
                  { uid: 'profesor', name: 'PROFESOR' },
                  { uid: 'asignatura', name: 'ASIGNATURA' },
                  { uid: 'fecha', name: 'FECHA CLASE' },
                  { uid: 'receta', name: 'RECETA' },
                  { uid: 'productos', name: 'PRODUCTOS' },
                  { uid: 'estado', name: 'ESTADO' },
                  { uid: 'acciones', name: 'ACCIONES', align: 'center' }
                ] : [
                  { uid: 'asignatura', name: 'ASIGNATURA' },
                  { uid: 'fecha', name: 'FECHA CLASE' },
                  { uid: 'receta', name: 'RECETA' },
                  { uid: 'productos', name: 'PRODUCTOS' },
                  { uid: 'estado', name: 'ESTADO' },
                  { uid: 'acciones', name: 'ACCIONES', align: 'center' }
                ]).map((column) => (
                  <TableColumn key={column.uid} align={column.align as "center" | "start" | "end" || "start"}>
                    {column.name}
                  </TableColumn>
                ))}
              </TableHeader>
              <TableBody emptyContent={
                <div className="py-8 text-center text-default-400">
                  <Icon icon="lucide:inbox" className="mx-auto mb-2 opacity-50" width={48} />
                  <p>No se encontraron solicitudes.</p>
                </div>
              }>
                {solicitudesFiltradas.map((solicitud) =>
                  esAdmin ? (
                    <TableRow key={solicitud.id} className="hover:bg-default-50/50 dark:hover:bg-default-100/50 transition-colors">
                      <TableCell className="font-medium text-secondary dark:text-foreground">{solicitud.profesorNombre}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-default-700">{solicitud.asignaturaNombre}</p>
                          {solicitud.esCustom && (
                            <Chip size="sm" color="primary" variant="flat" className="text-[10px] h-5 mt-1">Personalizado</Chip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{new Date(solicitud.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          <span className="text-xs text-default-400">Semana {solicitud.semana}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {solicitud.recetaNombre ? (
                          <span className="font-medium text-primary-700">{solicitud.recetaNombre}</span>
                        ) : (
                          <span className="text-default-400 italic">Sin receta</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" variant="dot" color="primary">{solicitud.items.length} ítems</Chip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          color={getColorEstado(solicitud.estado)}
                          variant="flat"
                          className="font-bold capitalize"
                        >
                          {solicitud.estado}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          {solicitud.estado === 'Pendiente' ? (
                            <>
                              <Tooltip content="Aceptar">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  color="success"
                                  variant="flat"
                                  className="text-success-600 bg-success-50 hover:bg-success-100"
                                  onPress={() => abrirModalAprobar(solicitud)}
                                >
                                  <Icon icon="lucide:check" width={18} />
                                </Button>
                              </Tooltip>
                              <Tooltip content="Rechazar">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  color="danger"
                                  variant="flat"
                                  className="text-danger-600 bg-danger-50 hover:bg-danger-100"
                                  onPress={() => abrirModalRechazar(solicitud)}
                                >
                                  <Icon icon="lucide:x" width={18} />
                                </Button>
                              </Tooltip>
                            </>
                          ) : (
                            <Tooltip content="Ver detalle">
                              <Button isIconOnly size="sm" variant="light" className="text-default-400">
                                <Icon icon="lucide:eye" width={18} />
                              </Button>
                            </Tooltip>
                          )}

                          {solicitud.estado === 'Rechazada' && solicitud.comentarioRechazo && (
                            <Tooltip content={`Motivo: ${solicitud.comentarioRechazo}`}>
                              <Button isIconOnly size="sm" variant="light" className="text-warning-600">
                                <Icon icon="lucide:message-circle" width={18} />
                              </Button>
                            </Tooltip>
                          )}
                          {esAdministradorGeneral && (
                            <Tooltip content="Eliminar" color="danger">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => handleEliminarAdmin(solicitud)}
                                className="text-default-300 hover:text-danger hover:bg-danger-50"
                              >
                                <Icon icon="lucide:trash" width={18} />
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={solicitud.id} className="hover:bg-default-50/50 dark:hover:bg-default-100/50 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium text-secondary dark:text-foreground">{solicitud.asignaturaNombre}</p>
                          {solicitud.esCustom && (
                            <Chip size="sm" color="primary" variant="flat" className="text-[10px] h-5 mt-1">Personalizado</Chip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{new Date(solicitud.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          <span className="text-xs text-default-400">Semana {solicitud.semana}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {solicitud.recetaNombre ? (
                          <span className="font-medium text-primary-700">{solicitud.recetaNombre}</span>
                        ) : (
                          <span className="text-default-400 italic">Sin receta</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" variant="dot" color="primary">{solicitud.items.length} ítems</Chip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          color={getColorEstado(solicitud.estado)}
                          variant="flat"
                          className="font-bold capitalize"
                        >
                          {solicitud.estado}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          {solicitud.estado === 'Pendiente' ? (
                            <Tooltip content="Eliminar">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => handleEliminar(solicitud)}
                                className="text-default-400 hover:text-danger"
                              >
                                <Icon icon="lucide:trash" width={18} />
                              </Button>
                            </Tooltip>
                          ) : (
                            <Chip size="sm" variant="light" className="text-xs text-default-400">Sin acciones</Chip>
                          )}
                          {solicitud.estado === 'Rechazada' && solicitud.comentarioRechazo && (
                            <Tooltip content={`Motivo: ${solicitud.comentarioRechazo}`}>
                              <Button isIconOnly size="sm" variant="light" className="text-warning">
                                <Icon icon="lucide:message-circle" width={18} />
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </motion.div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className={`border-b border-default-100 dark:border-default-50 ${accionModal === 'aprobar' ? 'bg-success-50 dark:bg-success-50/10 text-success-700 dark:text-success-400' : 'bg-danger-50 dark:bg-danger-50/10 text-danger-700 dark:text-danger-400'}`}>
                <div className="flex items-center gap-2">
                  <Icon icon={accionModal === 'aprobar' ? "lucide:check-circle" : "lucide:x-circle"} width={24} />
                  <span className="font-bold text-lg">{accionModal === 'aprobar' ? 'Aceptar Solicitud' : 'Rechazar Solicitud'}</span>
                </div>
              </ModalHeader>
              <ModalBody className="py-6">
                {solicitudSeleccionada && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-default-50 dark:bg-default-100/30 rounded-lg border border-default-200 dark:border-default-100">
                      <div>
                        <p className="text-xs uppercase font-bold text-default-500">Profesor</p>
                        <p className="font-semibold text-secondary dark:text-foreground">{solicitudSeleccionada.profesorNombre}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase font-bold text-default-500">Asignatura</p>
                        <p className="font-semibold text-secondary dark:text-foreground">{solicitudSeleccionada.asignaturaNombre}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase font-bold text-default-500">Fecha</p>
                        <p className="font-semibold text-secondary dark:text-foreground">{new Date(solicitudSeleccionada.fecha).toLocaleDateString('es-CL')}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase font-bold text-default-500">Semana</p>
                        <p className="font-semibold text-secondary dark:text-foreground">{solicitudSeleccionada.semana}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-secondary dark:text-foreground mb-2">Productos ({solicitudSeleccionada.items.length})</p>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {solicitudSeleccionada.items.map((item, idx) => (
                          <Chip key={idx} size="sm" variant="flat" className="bg-default-100 dark:bg-default-100/50 border border-default-200 dark:border-default-100">
                            <span className="font-medium text-default-700 dark:text-default-300">{item.productoNombre}</span>
                            <span className="text-default-400 ml-1">{item.cantidad} {item.unidadMedida}</span>
                          </Chip>
                        ))}
                      </div>
                    </div>

                    {accionModal === 'rechazar' && (
                      <div className="pt-2">
                        <Textarea
                          label="Motivo del Rechazo"
                          placeholder="Explique el motivo por el cual rechaza esta solicitud..."
                          value={comentarioRechazo}
                          onValueChange={setComentarioRechazo}
                          minRows={3}
                          isRequired
                          variant="bordered"
                          classNames={{ inputWrapper: "bg-default-50 dark:bg-default-100/50" }}
                        />
                      </div>
                    )}

                    {accionModal === 'aprobar' && (
                      <p className="text-sm text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-50/10 p-3 rounded-lg border border-success-100 dark:border-success-100/20 flex items-center gap-2">
                        <Icon icon="lucide:info" />
                        Al aceptar, el stock se descontará automáticamente del inventario virtual si corresponde.
                      </p>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="bg-default-50 dark:bg-content2 border-t border-default-100 dark:border-default-50">
                <Button variant="ghost" onPress={onClose} className="font-medium">
                  Cancelar
                </Button>
                <Button
                  color={accionModal === 'aprobar' ? 'success' : 'danger'}
                  variant="solid"
                  onPress={handleAprobarRechazar}
                  isLoading={isSubmitting}
                  className="font-bold text-white shadow-md"
                  startContent={<Icon icon={accionModal === 'aprobar' ? "lucide:check" : "lucide:x"} />}
                >
                  {accionModal === 'aprobar' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default GestionSolicitudesPage;