import React from 'react';
import { 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell,
  Button,
  Card,
  CardBody,
  Input,
  Chip,
  Pagination,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

// ✅ IMPORTAR SERVICIOS Y TIPOS REALES
import { ISolicitud, EstadoSolicitud } from '../types/solicitud.types';
import { 
  obtenerTodasSolicitudesService,
  aprobarRechazarSolicitudService,
  obtenerConteoSolicitudesService
} from '../services/solicitud-service';
import { useAuth } from '../contexts/auth-context';

/**
 * Página de gestión de pedidos.
 * Permite gestionar los pedidos de insumos realizados por los profesores.
 */
const GestionPedidosPage: React.FC = () => {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = React.useState<ISolicitud[]>([]);
  const [filteredSolicitudes, setFilteredSolicitudes] = React.useState<ISolicitud[]>([]);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [selectedEstado, setSelectedEstado] = React.useState<string>('todos');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = React.useState<ISolicitud | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [contadores, setContadores] = React.useState({
    pendientes: 0,
    aceptadas: 0,
    rechazadas: 0,
    total: 0
  });
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const rowsPerPage = 5;

  // ✅ CARGAR SOLICITUDES AL MONTAR
  React.useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setIsLoading(true);
      const [solicitudesData, conteosData] = await Promise.all([
        obtenerTodasSolicitudesService(),
        obtenerConteoSolicitudesService()
      ]);
      setSolicitudes(solicitudesData);
      setFilteredSolicitudes(solicitudesData);
      setContadores(conteosData);
      console.log('📋 Solicitudes cargadas en Gestión de Pedidos:', solicitudesData.length);
    } catch (error) {
      console.error('❌ Error al cargar solicitudes:', error);
      alert('Error al cargar las solicitudes');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Filtra las solicitudes según los criterios de búsqueda.
   */
  React.useEffect(() => {
    let filtered = [...solicitudes];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(solicitud => 
        solicitud.asignaturaNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        solicitud.profesorNombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por estado
    if (selectedEstado !== 'todos') {
      filtered = filtered.filter(solicitud => solicitud.estado === selectedEstado);
    }
    
    setFilteredSolicitudes(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedEstado, solicitudes]);

  /**
   * Calcula las solicitudes a mostrar en la página actual.
   */
  const paginatedSolicitudes = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredSolicitudes.slice(start, end);
  }, [currentPage, filteredSolicitudes, rowsPerPage]);

  /**
   * Abre el modal para ver los detalles de una solicitud.
   */
  const verDetalleSolicitud = (solicitud: ISolicitud) => {
    setSolicitudSeleccionada(solicitud);
    onOpen();
  };

  /**
   * Cambia el estado de una solicitud.
   */
  const cambiarEstadoSolicitud = async (id: string, nuevoEstado: 'Aceptada' | 'Rechazada') => {
    try {
      if (!user) return;
      
      console.log(`🔄 Cambiando estado de solicitud ${id} a ${nuevoEstado}`);
      
      const aprobadorId = user.id || user.nombre;
      await aprobarRechazarSolicitudService({
        solicitudId: id,
        estado: nuevoEstado,
        aprobadoPor: aprobadorId
      });

      // Recargar datos
      await cargarDatos();
      
      alert(`✅ Solicitud ${nuevoEstado.toLowerCase()} correctamente`);
    } catch (error: any) {
      console.error('❌ Error al cambiar estado:', error);
      alert(error.message || 'Error al cambiar el estado de la solicitud');
    }
  };

  /**
   * Formatea una fecha ISO a una cadena legible.
   */
  const formatearFecha = (fechaISO: string) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Renderiza un chip con el color correspondiente al estado.
   */
  const renderEstado = (estado: EstadoSolicitud) => {
    switch (estado) {
      case 'Pendiente':
        return <Chip color="warning" size="sm">{estado}</Chip>;
      case 'Aceptada':
        return <Chip color="success" size="sm">{estado}</Chip>;
      case 'Rechazada':
        return <Chip color="danger" size="sm">{estado}</Chip>;
      default:
        return <Chip size="sm">{estado}</Chip>;
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
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-bold mb-2">Gestión de Pedidos</h1>
          <p className="text-default-500">
            Administre los pedidos de insumos realizados por los profesores.
          </p>
        </div>

        {/* Estadísticas */}
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

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Buscar solicitudes..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            startContent={<Icon icon="lucide:search" className="text-default-400" />}
            className="w-full md:w-64"
          />
          
          <Select 
            placeholder="Estado"
            selectedKeys={selectedEstado ? [selectedEstado] : []}
            onSelectionChange={(keys) => setSelectedEstado(Array.from(keys)[0] as string)}
            className="w-full md:w-40"
          >
            <SelectItem key="todos">Todos los estados</SelectItem>
            <SelectItem key="Pendiente">Pendiente</SelectItem>
            <SelectItem key="Aceptada">Aceptada</SelectItem>
            <SelectItem key="Rechazada">Rechazada</SelectItem>
          </Select>
        </div>

        {/* Tabla de solicitudes */}
        <Card className="shadow-sm">
          <CardBody className="p-0">
            <Table 
              aria-label="Tabla de solicitudes"
              removeWrapper
              bottomContent={
                filteredSolicitudes.length > rowsPerPage && (
                  <div className="flex w-full justify-center">
                    <Pagination
                      total={Math.ceil(filteredSolicitudes.length / rowsPerPage)}
                      page={currentPage}
                      onChange={setCurrentPage}
                      showControls
                    />
                  </div>
                )
              }
            >
              <TableHeader>
                <TableColumn>ASIGNATURA</TableColumn>
                <TableColumn>PROFESOR</TableColumn>
                <TableColumn>FECHA SOLICITUD</TableColumn>
                <TableColumn>FECHA CLASE</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No se encontraron solicitudes">
                {paginatedSolicitudes.map((solicitud) => (
                  <TableRow key={solicitud.id}>
                    <TableCell>{solicitud.asignaturaNombre}</TableCell>
                    <TableCell>{solicitud.profesorNombre}</TableCell>
                    <TableCell>{formatearFecha(solicitud.fechaCreacion)}</TableCell>
                    <TableCell>{new Date(solicitud.fecha).toLocaleDateString('es-CL')}</TableCell>
                    <TableCell>{renderEstado(solicitud.estado)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          isIconOnly 
                          variant="light" 
                          size="sm"
                          onPress={() => verDetalleSolicitud(solicitud)}
                        >
                          <Icon icon="lucide:eye" className="text-primary" />
                        </Button>

                        <Dropdown>
                          <DropdownTrigger>
                            <Button 
                              isIconOnly 
                              variant="light" 
                              size="sm"
                            >
                              <Icon icon="lucide:more-vertical" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu 
                            aria-label="Acciones de solicitud"
                            onAction={(key) => {
                              if (key === 'aprobar') cambiarEstadoSolicitud(solicitud.id, 'Aceptada');
                              if (key === 'rechazar') cambiarEstadoSolicitud(solicitud.id, 'Rechazada');
                            }}
                          >
                            <DropdownItem 
                              key="aprobar" 
                              startContent={<Icon icon="lucide:check" className="text-success" />}
                              isDisabled={solicitud.estado !== 'Pendiente'}
                            >
                              Aprobar
                            </DropdownItem>
                            <DropdownItem 
                              key="rechazar" 
                              startContent={<Icon icon="lucide:x" className="text-danger" />}
                              isDisabled={solicitud.estado !== 'Pendiente'}
                            >
                              Rechazar
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </motion.div>

      {/* Modal de detalle de solicitud */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Detalle de la Solicitud</ModalHeader>
              <ModalBody>
                {solicitudSeleccionada && (
                  <div className="space-y-6">
                    {/* Información general */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-default-500">Asignatura</p>
                        <p className="font-semibold">{solicitudSeleccionada.asignaturaNombre}</p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Profesor</p>
                        <p className="font-semibold">{solicitudSeleccionada.profesorNombre}</p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Fecha de Solicitud</p>
                        <p className="font-semibold">{formatearFecha(solicitudSeleccionada.fechaCreacion)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Fecha de Clase</p>
                        <p className="font-semibold">{new Date(solicitudSeleccionada.fecha).toLocaleDateString('es-CL')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Estado</p>
                        <div>{renderEstado(solicitudSeleccionada.estado)}</div>
                      </div>
                      {solicitudSeleccionada.recetaNombre && (
                        <div>
                          <p className="text-sm text-default-500">Receta</p>
                          <p className="font-semibold">{solicitudSeleccionada.recetaNombre}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Observaciones */}
                    {solicitudSeleccionada.observaciones && (
                      <div>
                        <p className="text-sm text-default-500">Observaciones</p>
                        <p className="font-semibold">{solicitudSeleccionada.observaciones}</p>
                      </div>
                    )}

                    {/* Comentario de rechazo */}
                    {solicitudSeleccionada.comentarioRechazo && (
                      <div className="bg-danger-50 p-4 rounded-lg">
                        <p className="text-sm text-danger-500 font-medium">Motivo del rechazo:</p>
                        <p className="text-danger-700">{solicitudSeleccionada.comentarioRechazo}</p>
                      </div>
                    )}
                    
                    {/* Lista de productos */}
                    <div>
                      <p className="font-medium mb-2">Productos Solicitados</p>
                      <Table 
                        aria-label="Productos solicitados"
                        removeWrapper
                      >
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
                                {item.esAdicional ? (
                                  <Chip size="sm" color="warning" variant="flat">Adicional</Chip>
                                ) : (
                                  <Chip size="sm" variant="flat">Receta</Chip>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Acciones según estado */}
                    {solicitudSeleccionada.estado === 'Pendiente' && (
                      <div className="flex gap-2 justify-end">
                        <Button 
                          color="danger" 
                          variant="flat"
                          onPress={() => {
                            cambiarEstadoSolicitud(solicitudSeleccionada.id, 'Rechazada');
                            onClose();
                          }}
                        >
                          Rechazar
                        </Button>
                        <Button 
                          color="success"
                          onPress={() => {
                            cambiarEstadoSolicitud(solicitudSeleccionada.id, 'Aceptada');
                            onClose();
                          }}
                        >
                          Aprobar
                        </Button>
                      </div>
                    )}
                  </div>
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

export default GestionPedidosPage;