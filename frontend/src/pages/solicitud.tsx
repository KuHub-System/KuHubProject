import React from 'react';
import { 
  Card, CardBody, Button, Input, Select, SelectItem, Chip,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Textarea, Divider, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { logger } from '../utils/logger';

// IMPORTAR TIPOS Y SERVICIOS
import { IReceta, IItemSolicitud } from '../types/receta.types';
import { IProducto } from '../types/producto.types';
import { obtenerRecetasActivasService } from '../services/receta-service';
import { obtenerProductosService } from '../services/producto-service';
import { crearSolicitudService, obtenerMisSolicitudesService } from '../services/solicitud-service';
import { ISolicitud, EstadoSolicitud } from '../types/solicitud.types';

// Datos de asignaturas (esto podría venir de una API o contexto)
const asignaturas = [
  { id: '1', nombre: 'Panadería Básica' },
  { id: '2', nombre: 'Pastelería Avanzada' },
  { id: '3', nombre: 'Cocina Internacional' },
  { id: '4', nombre: 'Panadería Avanzada' },
];

const SolicitudPage: React.FC = () => {
  const toast = useToast();
  const [recetasDisponibles, setRecetasDisponibles] = React.useState<IReceta[]>([]);
  const [productos, setProductos] = React.useState<IProducto[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  
  const [asignaturaId, setAsignaturaId] = React.useState<string>('');
  const [semana, setSemana] = React.useState<string>('');
  const [fecha, setFecha] = React.useState<string>('');
  const [observaciones, setObservaciones] = React.useState<string>('');
  const [items, setItems] = React.useState<IItemSolicitud[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const [recetaCargada, setRecetaCargada] = React.useState<{id: string, nombre: string} | null>(null);
  const [esCustom, setEsCustom] = React.useState<boolean>(false);
  
  const [nuevoProductoId, setNuevoProductoId] = React.useState<string>('');
  const [nuevaCantidad, setNuevaCantidad] = React.useState<string>('');

  const [historialSolicitudes, setHistorialSolicitudes] = React.useState<ISolicitud[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = React.useState<boolean>(false);
  const { isOpen: isDetalleOpen, onOpen: onDetalleOpen, onOpenChange: onDetalleOpenChange } = useDisclosure();
  const [solicitudDetalle, setSolicitudDetalle] = React.useState<ISolicitud | null>(null);

  const cargarHistorial = React.useCallback(async () => {
    try {
      setCargandoHistorial(true);
      const data = await obtenerMisSolicitudesService();
      setHistorialSolicitudes(data);
    } catch (error) {
      logger.error('Error al cargar el historial de solicitudes:', error);
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  // Cargar recetas, productos e historial al montar
  const cargarDatos = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [recetas, productosData] = await Promise.all([
        obtenerRecetasActivasService(),
        obtenerProductosService()
      ]);
      setRecetasDisponibles(recetas);
      setProductos(productosData);
      await cargarHistorial();
    } catch (error) {
      logger.error('Error al cargar datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  }, [cargarHistorial]);

  React.useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleSeleccionarReceta = (recetaId: string) => {
    if (!recetaId) return;

    const recetaSeleccionada = recetasDisponibles.find(r => r.id === recetaId);
    if (!recetaSeleccionada) return;

    setRecetaCargada({ id: recetaSeleccionada.id, nombre: recetaSeleccionada.nombre });
    setEsCustom(false);

    // Convertir ingredientes de receta a items de solicitud
    const nuevosItems: IItemSolicitud[] = recetaSeleccionada.ingredientes.map(ing => ({
        id: `${recetaId}-${ing.id}-${Date.now()}`,
        productoId: ing.productoId,
        productoNombre: ing.productoNombre,
        cantidad: ing.cantidad,
        unidadMedida: ing.unidadMedida,
        esAdicional: false // Viene de la receta
    }));

    setItems(nuevosItems);
  };

  const agregarProductoExtra = () => {
    if (!nuevoProductoId || !nuevaCantidad || parseFloat(nuevaCantidad) <= 0) {
      toast.warning('Por favor, seleccione un producto y especifique una cantidad válida');
      return;
    }
    
    const producto = productos.find(p => p.id === nuevoProductoId);
    if (!producto) return;

    const nuevoItem: IItemSolicitud = {
      id: Date.now().toString(),
      productoId: nuevoProductoId,
      productoNombre: producto.nombre,
      cantidad: parseFloat(nuevaCantidad),
      unidadMedida: producto.unidadMedida,
      esAdicional: true // Producto adicional agregado manualmente
    };

    setItems([...items, nuevoItem]);
    setEsCustom(true); // Marcar como custom porque tiene modificaciones
    setNuevoProductoId('');
    setNuevaCantidad('');
  };

  const eliminarItem = (id: string) => {
    const nuevoItems = items.filter(item => item.id !== id);
    setItems(nuevoItems);
    
    // Si eliminamos todos los items de la receta, marcar como custom
    if (recetaCargada) {
      const itemsDeReceta = nuevoItems.filter(item => !item.esAdicional);
      if (itemsDeReceta.length === 0) {
        setEsCustom(true);
      }
    }
  };

  const renderEstadoChip = (estado: EstadoSolicitud) => {
    switch (estado) {
      case 'Pendiente':
        return <Chip color="warning" variant="flat" size="sm">Pendiente</Chip>;
      case 'Aceptada':
        return <Chip color="success" variant="flat" size="sm">Aceptada</Chip>;
      case 'AceptadaModificada':
        return <Chip color="success" variant="flat" size="sm">Aceptada (modificada)</Chip>;
      case 'Rechazada':
        return <Chip color="danger" variant="flat" size="sm">Rechazada</Chip>;
      default:
        return <Chip size="sm" variant="flat">{estado}</Chip>;
    }
  };

  const abrirDetalleSolicitud = (solicitud: ISolicitud) => {
    setSolicitudDetalle(solicitud);
    onDetalleOpen();
  };

  const enviarSolicitud = async () => {
    if (!asignaturaId || !fecha || !semana || items.length === 0) {
      toast.warning('Por favor, complete todos los campos obligatorios, seleccione la semana y agregue al menos un producto');
      return;
    }
    const semanaNumero = parseInt(semana, 10);
    if (Number.isNaN(semanaNumero) || semanaNumero < 1 || semanaNumero > 18) {
      toast.warning('La semana seleccionada no es válida');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const asignaturaNombre = asignaturas.find(a => a.id === asignaturaId)?.nombre || '';
      
      await crearSolicitudService({
        asignaturaId,
        asignaturaNombre,
        semana: semanaNumero,
        fecha,
        recetaId: recetaCargada?.id || null,
        recetaNombre: recetaCargada?.nombre || null,
        items: items.map(item => ({
          productoId: item.productoId,
          productoNombre: item.productoNombre,
          cantidad: item.cantidad,
          unidadMedida: item.unidadMedida,
          esAdicional: item.esAdicional
        })),
        observaciones,
        esCustom
      });
      
      // Limpiar formulario
      setAsignaturaId('');
      setSemana('');
      setFecha('');
      setObservaciones('');
      setItems([]);
      setRecetaCargada(null);
      setEsCustom(false);
      
      await cargarHistorial();

      toast.success('Solicitud enviada correctamente');
    } catch (error: any) {
      logger.error('Error al enviar la solicitud:', error);
      toast.error(error.message || 'Error al enviar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando datos...</p>
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
        <div>
          <h1 className="text-2xl font-bold mb-2">Solicitud de Insumos</h1>
          <p className="text-default-500">
            Seleccione una receta para cargar sus ingredientes y realice su pedido.
          </p>
        </div>

        <Card className="shadow-sm">
          <CardBody className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select 
                  label="Asignatura" 
                  placeholder="Seleccione una asignatura"
                  selectedKeys={asignaturaId ? [asignaturaId] : []}
                  onSelectionChange={(keys) => setAsignaturaId(Array.from(keys)[0] as string)}
                  isRequired
                >
                  {asignaturas.map((asignatura) => (
                    <SelectItem key={asignatura.id}>
                      {asignatura.nombre}
                    </SelectItem>
                  ))}
                </Select>
                
                <Input
                  type="date"
                  label="Fecha de Clase"
                  value={fecha}
                  onValueChange={setFecha}
                  isRequired
                />

                <Select
                  label="Semana académica"
                  placeholder="Seleccione la semana (1 - 18)"
                  selectedKeys={semana ? [semana] : []}
                  onSelectionChange={(keys) => setSemana(Array.from(keys)[0] as string)}
                  isRequired
                >
                  {Array.from({ length: 18 }, (_, index) => {
                    const semanaValor = (index + 1).toString();
                    return (
                      <SelectItem key={semanaValor}>
                        Semana {semanaValor}
                      </SelectItem>
                    );
                  })}
                </Select>
              </div>
              
              <Divider />
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Cargar Receta Base</h3>
                <Select 
                  label="Receta" 
                  placeholder="Seleccione una receta para cargar sus ingredientes"
                  onSelectionChange={(keys) => handleSeleccionarReceta(Array.from(keys)[0] as string)}
                >
                  {recetasDisponibles.map((receta) => (
                    <SelectItem key={receta.id}>
                      {receta.nombre}
                    </SelectItem>
                  ))}
                </Select>
                
                {recetasDisponibles.length === 0 && (
                  <p className="text-sm text-warning mt-2">
                    No hay recetas activas disponibles. Cree recetas en la sección de Gestión de Recetas.
                  </p>
                )}
              </div>

              {recetaCargada && (
                <>
                  <Divider />
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Agregar Productos Adicionales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-end">
                      <Select 
                        label="Producto" 
                        placeholder="Seleccione un producto"
                        selectedKeys={nuevoProductoId ? [nuevoProductoId] : []}
                        onSelectionChange={(keys) => setNuevoProductoId(Array.from(keys)[0] as string)}
                      >
                        {productos.map((producto) => (
                          <SelectItem key={producto.id}>
                            {producto.nombre} ({producto.stock} {producto.unidadMedida} disponibles)
                          </SelectItem>
                        ))}
                      </Select>
                      <Input
                        type="number"
                        label="Cantidad"
                        placeholder="0.0"
                        value={nuevaCantidad}
                        onValueChange={setNuevaCantidad}
                        min="0"
                        step="0.1"
                        className="w-32"
                        endContent={
                          nuevoProductoId && (
                            <span className="text-default-400 text-xs">
                              {productos.find(p => p.id === nuevoProductoId)?.unidadMedida || ''}
                            </span>
                          )
                        }
                      />
                      <Button 
                        color="primary" 
                        variant="flat"
                        onPress={agregarProductoExtra}
                        startContent={<Icon icon="lucide:plus" />}
                        className="h-14"
                      >
                        Agregar
                      </Button>
                    </div>
                  </div>
                </>
              )}
              
              <Divider />

              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {recetaCargada ? `Ingredientes del Pedido: ${recetaCargada.nombre}` : 'Ingredientes del Pedido'}
                  {esCustom && <span className="text-primary font-normal"> (Personalizado)</span>}
                </h3>
                <Table 
                  aria-label="Lista de productos solicitados"
                  removeWrapper
                >
                  <TableHeader>
                    <TableColumn>PRODUCTO</TableColumn>
                    <TableColumn>CANTIDAD</TableColumn>
                    <TableColumn>TIPO</TableColumn>
                    <TableColumn>ACCIONES</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="Seleccione una receta para ver sus ingredientes o agregue productos manualmente">
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productoNombre}</TableCell>
                        <TableCell>{item.cantidad} {item.unidadMedida}</TableCell>
                        <TableCell>
                          {item.esAdicional ? (
                            <span className="text-warning text-xs">Adicional</span>
                          ) : (
                            <span className="text-default-400 text-xs">Receta</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            isIconOnly 
                            variant="light" 
                            size="sm"
                            onPress={() => eliminarItem(item.id)}
                          >
                            <Icon icon="lucide:trash" className="text-danger" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <Divider />
              
              <div>
                <Textarea
                  label="Observaciones"
                  placeholder="Añada aquí cualquier comentario o modificación adicional"
                  value={observaciones}
                  onValueChange={setObservaciones}
                  minRows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="flat" 
                  onPress={() => {
                    setItems([]);
                    setRecetaCargada(null);
                    setEsCustom(false);
                    setAsignaturaId('');
                    setSemana('');
                    setFecha('');
                    setObservaciones('');
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  color="primary" 
                  onPress={enviarSolicitud}
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting || items.length === 0 || !asignaturaId || !fecha || !semana}
                >
                  Enviar Solicitud
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardBody className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Historial de solicitudes</h2>
              <p className="text-default-500 text-sm">
                Revisa el estado de tus solicitudes por semana. Podrás ver si fueron aceptadas, modificadas o rechazadas.
              </p>
            </div>

            {cargandoHistorial ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
                  <p className="text-default-500">Cargando historial...</p>
                </div>
              </div>
            ) : historialSolicitudes.length === 0 ? (
              <div className="text-center py-10">
                <Icon icon="lucide:history" className="text-5xl text-default-300 mx-auto mb-4" />
                <p className="text-default-500">
                  Aún no has enviado solicitudes. Cuando registres una, aparecerá aquí.
                </p>
              </div>
            ) : (
              <Table removeWrapper aria-label="Historial de solicitudes">
                <TableHeader>
                  <TableColumn>SEMANA</TableColumn>
                  <TableColumn>FECHA CLASE</TableColumn>
                  <TableColumn>ESTADO</TableColumn>
                  <TableColumn>COMENTARIO</TableColumn>
                  <TableColumn>ACCIONES</TableColumn>
                </TableHeader>
                <TableBody>
                  {historialSolicitudes.map((solicitud) => (
                    <TableRow key={solicitud.id}>
                      <TableCell>Semana {solicitud.semana}</TableCell>
                      <TableCell>{new Date(solicitud.fecha).toLocaleDateString('es-CL')}</TableCell>
                      <TableCell>{renderEstadoChip(solicitud.estado)}</TableCell>
                      <TableCell>
                        {solicitud.estado === 'Rechazada'
                          ? solicitud.comentarioRechazo || '—'
                          : solicitud.comentarioAdministrador || '—'}
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
            )}
          </CardBody>
        </Card>
      </motion.div>

      <Modal isOpen={isDetalleOpen} onOpenChange={onDetalleOpenChange} size="lg" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                Detalle de la solicitud
              </ModalHeader>
              <ModalBody className="space-y-4">
                {solicitudDetalle && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-default-500">Asignatura</p>
                        <p className="font-medium">{solicitudDetalle.asignaturaNombre}</p>
                      </div>
                      <div>
                        <p className="text-default-500">Semana</p>
                        <p className="font-medium">{solicitudDetalle.semana}</p>
                      </div>
                      <div>
                        <p className="text-default-500">Fecha clase</p>
                        <p className="font-medium">
                          {new Date(solicitudDetalle.fecha).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                      <div>
                        <p className="text-default-500">Estado</p>
                        {renderEstadoChip(solicitudDetalle.estado)}
                      </div>
                      {solicitudDetalle.comentarioAdministrador && (
                        <div className="md:col-span-2">
                          <p className="text-default-500">Comentario administrador</p>
                          <p className="font-medium">
                            {solicitudDetalle.comentarioAdministrador}
                          </p>
                        </div>
                      )}
                      {solicitudDetalle.comentarioRechazo && (
                        <div className="md:col-span-2">
                          <p className="text-default-500">Motivo de rechazo</p>
                          <p className="font-medium text-danger-500">
                            {solicitudDetalle.comentarioRechazo}
                          </p>
                        </div>
                      )}
                    </div>

                    <Divider />

                    <div>
                      <h4 className="font-semibold mb-2">Productos solicitados</h4>
                      <Table removeWrapper aria-label="Productos de la solicitud seleccionada">
                        <TableHeader>
                          <TableColumn>PRODUCTO</TableColumn>
                          <TableColumn>CANTIDAD</TableColumn>
                          <TableColumn>TIPO</TableColumn>
                        </TableHeader>
                        <TableBody>
                          {solicitudDetalle.items.map((item) => (
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

export default SolicitudPage;