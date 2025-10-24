import React, { useState, useEffect } from 'react';
import {
  Card, CardBody, Button, Input, Select, SelectItem, Chip,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
  Textarea, Tabs, Tab, Divider, Tooltip, Selection
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/auth-context';
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
  const { user, hasSpecificPermission } = useAuth();
  const [solicitudes, setSolicitudes] = useState<ISolicitud[]>([]);
  const [usuarios, setUsuarios] = useState<IUsuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<Selection>(new Set([]));
  const [filtroProfesor, setFiltroProfesor] = useState<Selection>(new Set([]));
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
      alert('Error al cargar las solicitudes');
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
      alert('Por favor ingrese un comentario explicando el motivo del rechazo');
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

      alert(accionModal === 'aprobar' 
        ? '✅ Solicitud aceptada correctamente' 
        : '❌ Solicitud rechazada correctamente'
      );

      await cargarDatos();
      onOpenChange();
    } catch (error: any) {
      alert(error.message || 'Error al procesar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAceptarTodas = async () => {
    if (!window.confirm(`¿Está seguro de aceptar TODAS las solicitudes pendientes (${contadores.pendientes})?`)) {
      return;
    }

    try {
      if (!user) return;
      const aprobadorId = user.id || user.nombre;
      const cantidad = await aceptarTodasSolicitudesService(aprobadorId);
      alert(`✅ ${cantidad} solicitudes aceptadas correctamente`);
      await cargarDatos();
    } catch (error: any) {
      alert(error.message || 'Error al aceptar solicitudes');
    }
  };

  const handleEliminar = async (solicitud: ISolicitud) => {
    if (!window.confirm(`¿Está seguro de eliminar la solicitud de ${solicitud.asignaturaNombre}?`)) {
      return;
    }

    try {
      await eliminarSolicitudService(solicitud.id);
      alert('✅ Solicitud eliminada correctamente');
      await cargarDatos();
    } catch (error: any) {
      alert(error.message || 'Error al eliminar solicitud');
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

  const solicitudesFiltradas = solicitudes.filter(s => {
    if (tabSeleccionada === 'pendientes' && s.estado !== 'Pendiente') return false;
    if (tabSeleccionada === 'aceptadas' && s.estado !== 'Aceptada') return false;
    if (tabSeleccionada === 'rechazadas' && s.estado !== 'Rechazada') return false;

    if (estadoSeleccionado && s.estado !== estadoSeleccionado) return false;
    if (profesorSeleccionado && s.profesorId !== profesorSeleccionado) return false;

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
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {esAdmin ? 'Gestión de Solicitudes' : 'Mis Solicitudes'}
            </h1>
            <p className="text-default-500">
              {esAdmin 
                ? 'Revisa y aprueba las solicitudes de los profesores'
                : 'Gestiona tus solicitudes de insumos'}
            </p>
          </div>
          
          {esAdmin && contadores.pendientes > 0 && (
            <Button
              color="success"
              variant="flat"
              startContent={<Icon icon="lucide:check-check" />}
              onPress={handleAceptarTodas}
            >
              Aceptar Todas ({contadores.pendientes})
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardBody className="text-center p-4">
              <p className="text-sm text-default-500">Total</p>
              <p className="text-3xl font-bold text-primary">{contadores.total}</p>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody className="text-center p-4">
              <p className="text-sm text-default-500">Pendientes</p>
              <p className="text-3xl font-bold text-warning">{contadores.pendientes}</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="text-center p-4">
              <p className="text-sm text-default-500">Aceptadas</p>
              <p className="text-3xl font-bold text-success">{contadores.aceptadas}</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="text-center p-4">
              <p className="text-sm text-default-500">Rechazadas</p>
              <p className="text-3xl font-bold text-danger">{contadores.rechazadas}</p>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardBody className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Buscar por asignatura, profesor o producto..."
                value={busqueda}
                onValueChange={setBusqueda}
                startContent={<Icon icon="lucide:search" />}
                isClearable
                onClear={() => setBusqueda('')}
              />

              {esAdmin && (
                <Select
                  placeholder="Filtrar por profesor"
                  selectedKeys={filtroProfesor}
                  onSelectionChange={setFiltroProfesor}
                  items={[{ id: 'todos', nombreCompleto: 'Todos los profesores' }, ...usuarios]}
                >
                  {(usuario) => (
                    <SelectItem key={usuario.id}>
                      {usuario.nombreCompleto}
                    </SelectItem>
                  )}
                </Select>
              )}

              <Select
                placeholder="Filtrar por estado"
                selectedKeys={filtroEstado}
                onSelectionChange={setFiltroEstado}
              >
                <SelectItem key="todos">Todos los estados</SelectItem>
                <SelectItem key="Pendiente">Pendiente</SelectItem>
                <SelectItem key="Aceptada">Aceptada</SelectItem>
                <SelectItem key="Rechazada">Rechazada</SelectItem>
              </Select>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-0">
            <Tabs
              selectedKey={tabSeleccionada}
              onSelectionChange={(key) => setTabSeleccionada(key as string)}
              variant="underlined"
              classNames={{
                tabList: "px-4",
              }}
            >
              <Tab key="todas" title={`Todas (${solicitudes.length})`} />
              <Tab key="pendientes" title={`Pendientes (${contadores.pendientes})`} />
              <Tab key="aceptadas" title={`Aceptadas (${contadores.aceptadas})`} />
              <Tab key="rechazadas" title={`Rechazadas (${contadores.rechazadas})`} />
            </Tabs>

            <Divider />

            <Table 
              aria-label="Tabla de solicitudes"
              removeWrapper
            >
              <TableHeader>
                {esAdmin && <TableColumn>PROFESOR</TableColumn>}
                <TableColumn>ASIGNATURA</TableColumn>
                <TableColumn>FECHA CLASE</TableColumn>
                <TableColumn>RECETA</TableColumn>
                <TableColumn>PRODUCTOS</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No hay solicitudes para mostrar">
                {solicitudesFiltradas.map((solicitud) => (
                  <TableRow key={solicitud.id}>
                    {esAdmin && (
                      <TableCell>{solicitud.profesorNombre}</TableCell>
                    )}
                    <TableCell>
                      <div>
                        <p className="font-medium">{solicitud.asignaturaNombre}</p>
                        {solicitud.esCustom && (
                          <Chip size="sm" color="primary" variant="flat">Personalizado</Chip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(solicitud.fecha).toLocaleDateString('es-CL')}
                    </TableCell>
                    <TableCell>
                      {solicitud.recetaNombre || <span className="text-default-400">Sin receta</span>}
                    </TableCell>
                    <TableCell>
                      <Chip size="sm">{solicitud.items.length} productos</Chip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={getColorEstado(solicitud.estado)}
                        variant="flat"
                      >
                        {solicitud.estado}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {esAdmin && solicitud.estado === 'Pendiente' && (
                          <>
                            <Tooltip content="Aceptar">
                              <Button
                                isIconOnly
                                size="sm"
                                color="success"
                                variant="flat"
                                onPress={() => abrirModalAprobar(solicitud)}
                              >
                                <Icon icon="lucide:check" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Rechazar">
                              <Button
                                isIconOnly
                                size="sm"
                                color="danger"
                                variant="flat"
                                onPress={() => abrirModalRechazar(solicitud)}
                              >
                                <Icon icon="lucide:x" />
                              </Button>
                            </Tooltip>
                          </>
                        )}

                        {!esAdmin && solicitud.estado === 'Pendiente' && (
                          <Tooltip content="Eliminar">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => handleEliminar(solicitud)}
                            >
                              <Icon icon="lucide:trash" className="text-danger" />
                            </Button>
                          </Tooltip>
                        )}

                        {solicitud.estado === 'Rechazada' && solicitud.comentarioRechazo && (
                          <Tooltip content={`Motivo: ${solicitud.comentarioRechazo}`}>
                            <Button isIconOnly size="sm" variant="light">
                              <Icon icon="lucide:message-circle" className="text-warning" />
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </motion.div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {accionModal === 'aprobar' ? '✅ Aceptar Solicitud' : '❌ Rechazar Solicitud'}
              </ModalHeader>
              <ModalBody>
                {solicitudSeleccionada && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-default-500">Profesor</p>
                      <p className="font-medium">{solicitudSeleccionada.profesorNombre}</p>
                    </div>
                    <div>
                      <p className="text-sm text-default-500">Asignatura</p>
                      <p className="font-medium">{solicitudSeleccionada.asignaturaNombre}</p>
                    </div>
                    <div>
                      <p className="text-sm text-default-500">Productos solicitados</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {solicitudSeleccionada.items.map((item, idx) => (
                          <Chip key={idx} size="sm">
                            {item.productoNombre}: {item.cantidad} {item.unidadMedida}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    {accionModal === 'rechazar' && (
                      <Textarea
                        label="Motivo del Rechazo"
                        placeholder="Explique el motivo del rechazo..."
                        value={comentarioRechazo}
                        onValueChange={setComentarioRechazo}
                        minRows={3}
                        isRequired
                      />
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  color={accionModal === 'aprobar' ? 'success' : 'danger'}
                  onPress={handleAprobarRechazar}
                  isLoading={isSubmitting}
                >
                  {accionModal === 'aprobar' ? 'Aceptar' : 'Rechazar'}
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