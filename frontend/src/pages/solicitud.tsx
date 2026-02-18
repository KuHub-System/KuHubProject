import React from 'react';
import {
  Card, CardBody, Button, Input, Select, SelectItem, Chip,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Textarea, Divider, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, CardHeader
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../contexts/auth-context';
import { useToast } from '../hooks/useToast';
import { logger } from '../utils/logger';

// IMPORTAR TIPOS Y SERVICIOS
import { IReceta, IItemSolicitud } from '../types/receta.types';
import { IProducto } from '../types/producto.types';
import { IAsignatura } from '../types/asignatura.types';
import { obtenerRecetasActivasService } from '../services/receta-service';
import { obtenerProductosService } from '../services/producto-service';
import { crearSolicitudService, obtenerMisSolicitudesService } from '../services/solicitud-service';
import { obtenerAsignaturasService } from '../services/asignatura-service';
import { ISolicitud, EstadoSolicitud } from '../types/solicitud.types';

const getFirstSelectionValue = (keys: any): string | undefined => {
  if (!keys || keys === 'all') return undefined;
  const firstKey = Array.from(keys as Set<React.Key>)[0];
  return firstKey != null ? String(firstKey) : undefined;
};

const SolicitudPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  usePageTitle('Solicitud de Insumos', 'Complete el formulario para realizar un pedido de insumos para sus clases prácticas.');
  const [recetasDisponibles, setRecetasDisponibles] = React.useState<IReceta[]>([]);
  const [productos, setProductos] = React.useState<IProducto[]>([]);
  const [asignaturas, setAsignaturas] = React.useState<IAsignatura[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const [asignaturaId, setAsignaturaId] = React.useState<string>('');
  const [semana, setSemana] = React.useState<string>('');
  const [fecha, setFecha] = React.useState<string>('');
  const [bloqueInicio, setBloqueInicio] = React.useState<string>('');
  const [bloqueFin, setBloqueFin] = React.useState<string>('');
  const [observaciones, setObservaciones] = React.useState<string>('');
  const [items, setItems] = React.useState<IItemSolicitud[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [multiplicadorReceta, setMultiplicadorReceta] = React.useState<number>(1);

  const [recetaCargada, setRecetaCargada] = React.useState<{ id: string, nombre: string } | null>(null);
  const [esCustom, setEsCustom] = React.useState<boolean>(false);

  const [nuevoProductoId, setNuevoProductoId] = React.useState<string>('');
  const [nuevaCantidad, setNuevaCantidad] = React.useState<string>('');

  const [historialSolicitudes, setHistorialSolicitudes] = React.useState<ISolicitud[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = React.useState<boolean>(false);
  const { isOpen: isDetalleOpen, onOpen: onDetalleOpen, onOpenChange: onDetalleOpenChange } = useDisclosure();
  const [solicitudDetalle, setSolicitudDetalle] = React.useState<ISolicitud | null>(null);
  const asignaturaSelectedKeys = React.useMemo(
    () => (asignaturaId ? new Set([asignaturaId]) : new Set<string>()),
    [asignaturaId]
  );
  const semanaSelectedKeys = React.useMemo(
    () => (semana ? new Set([semana]) : new Set<string>()),
    [semana]
  );
  const bloqueInicioSelectedKeys = React.useMemo(
    () => (bloqueInicio ? new Set([bloqueInicio]) : new Set<string>()),
    [bloqueInicio]
  );
  const bloqueFinSelectedKeys = React.useMemo(
    () => (bloqueFin ? new Set([bloqueFin]) : new Set<string>()),
    [bloqueFin]
  );
  const nuevoProductoSelectedKeys = React.useMemo(
    () => (nuevoProductoId ? new Set([nuevoProductoId]) : new Set<string>()),
    [nuevoProductoId]
  );

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

  // Cargar recetas, productos, asignaturas e historial al montar
  const cargarDatos = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [recetas, productosData, asignaturasData] = await Promise.all([
        obtenerRecetasActivasService(),
        obtenerProductosService(),
        obtenerAsignaturasService()
      ]);
      setRecetasDisponibles(recetas);
      setProductos(productosData);
      setAsignaturas(asignaturasData);
      await cargarHistorial();
    } catch (error) {
      logger.error('Error al cargar datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  }, [cargarHistorial, toast]);

  React.useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Calcular multiplicador cuando cambia la asignatura seleccionada
  React.useEffect(() => {
    if (asignaturaId) {
      const asignatura = asignaturas.find(a => a.id === asignaturaId);
      if (asignatura) {
        // Calcular total de alumnos activos
        const totalAlumnos = asignatura.secciones
          .filter(s => s.estado === 'ACTIVA')
          .reduce((sum, s) => sum + s.cantInscritos, 0);

        // Multiplicador: receta base es para 20 personas
        const multiplicador = totalAlumnos > 0 ? totalAlumnos / 20 : 1;
        setMultiplicadorReceta(multiplicador);

        // Si hay una receta cargada, recalcular las cantidades
        if (recetaCargada) {
          const recetaSeleccionada = recetasDisponibles.find(r => r.id === recetaCargada.id);
          if (recetaSeleccionada) {
            const nuevosItems: IItemSolicitud[] = recetaSeleccionada.ingredientes.map(ing => ({
              id: `${recetaCargada.id}-${ing.id}-${Date.now()}`,
              productoId: ing.productoId,
              productoNombre: ing.productoNombre,
              cantidad: ing.cantidad * multiplicador,
              unidadMedida: ing.unidadMedida,
              esAdicional: false
            }));
            setItems(nuevosItems);
          }
        }
      }
    } else {
      setMultiplicadorReceta(1);
    }
  }, [asignaturaId, asignaturas, recetaCargada, recetasDisponibles]);

  const handleSeleccionarReceta = (recetaId: string) => {
    if (!recetaId) return;

    const recetaSeleccionada = recetasDisponibles.find(r => r.id === recetaId);
    if (!recetaSeleccionada) return;

    setRecetaCargada({ id: recetaSeleccionada.id, nombre: recetaSeleccionada.nombre });
    setEsCustom(false);

    // Convertir ingredientes de receta a items de solicitud
    // Multiplicar por el multiplicador actual (basado en alumnos de la asignatura)
    const nuevosItems: IItemSolicitud[] = recetaSeleccionada.ingredientes.map(ing => ({
      id: `${recetaId}-${ing.id}-${Date.now()}`,
      productoId: ing.productoId,
      productoNombre: ing.productoNombre,
      cantidad: ing.cantidad * multiplicadorReceta,
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
    if (!asignaturaId || !fecha || !semana || !bloqueInicio || !bloqueFin || items.length === 0) {
      toast.warning('Por favor, complete todos los campos obligatorios y agregue al menos un producto');
      return;
    }
    const semanaNumero = parseInt(semana, 10);
    const bloqueInicioNumero = parseInt(bloqueInicio, 10);
    const bloqueFinNumero = parseInt(bloqueFin, 10);

    if (Number.isNaN(semanaNumero) || semanaNumero < 1 || semanaNumero > 18) {
      toast.warning('La semana seleccionada no es válida');
      return;
    }

    if (Number.isNaN(bloqueInicioNumero) || Number.isNaN(bloqueFinNumero)) {
      toast.warning('Los bloques seleccionados no son válidos');
      return;
    }

    if (bloqueInicioNumero > bloqueFinNumero) {
      toast.warning('El bloque de inicio no puede ser mayor al bloque de fin');
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
        bloqueInicio: bloqueInicioNumero,
        bloqueFin: bloqueFinNumero,
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
      setBloqueInicio('');
      setBloqueFin('');
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
    <div className="container mx-auto px-4 py-8 space-y-8 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        <div className="border-b border-default-200 dark:border-default-100 pb-4">
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario de Solicitud */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-t-4 border-secondary bg-white dark:bg-content1">
              <CardBody className="p-6 md:p-8 space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-secondary dark:text-foreground mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-secondary text-white dark:text-secondary-foreground flex items-center justify-center text-sm">1</span>
                    Datos de la Clase
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select
                      label="Asignatura"
                      placeholder="Seleccione asignatura"
                      selectedKeys={asignaturaSelectedKeys}
                      onSelectionChange={(keys) => {
                        const selected = getFirstSelectionValue(keys);
                        setAsignaturaId(selected ?? '');
                      }}
                      isRequired
                      variant="bordered"
                      labelPlacement="outside"
                      classNames={{
                        trigger: "bg-default-50 dark:bg-default-100/50",
                        popoverContent: "dark:bg-content1"
                      }}
                    >
                      {asignaturas.map((asignatura) => (
                        <SelectItem key={asignatura.id} textValue={asignatura.nombre}>
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
                      variant="bordered"
                      labelPlacement="outside"
                      classNames={{ inputWrapper: "bg-default-50 dark:bg-default-100/50" }}
                    />

                    <Select
                      label="Semana Académica"
                      placeholder="Seleccione semana"
                      selectedKeys={semanaSelectedKeys}
                      onSelectionChange={(keys) => {
                        const selected = getFirstSelectionValue(keys);
                        setSemana(selected ?? '');
                      }}
                      isRequired
                      variant="bordered"
                      labelPlacement="outside"
                      classNames={{
                        trigger: "bg-default-50 dark:bg-default-100/50",
                        popoverContent: "dark:bg-content1"
                      }}
                    >
                      {Array.from({ length: 18 }, (_, index) => {
                        const semanaValor = (index + 1).toString();
                        const label = `Semana ${semanaValor}`;
                        return (
                          <SelectItem key={semanaValor} textValue={label}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </Select>

                    <Select
                      label="Bloque Inicio"
                      placeholder="Inicio"
                      selectedKeys={bloqueInicioSelectedKeys}
                      onSelectionChange={(keys) => {
                        const selected = getFirstSelectionValue(keys);
                        setBloqueInicio(selected ?? '');
                      }}
                      isRequired
                      variant="bordered"
                      labelPlacement="outside"
                      classNames={{
                        trigger: "bg-default-50 dark:bg-default-100/50",
                        popoverContent: "dark:bg-content1"
                      }}
                    >
                      {Array.from({ length: 20 }, (_, index) => {
                        const bloqueValor = (index + 1).toString();
                        const label = `Bloque ${bloqueValor}`;
                        return (
                          <SelectItem key={bloqueValor} textValue={label}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </Select>

                    <Select
                      label="Bloque Fin"
                      placeholder="Fin"
                      selectedKeys={bloqueFinSelectedKeys}
                      onSelectionChange={(keys) => {
                        const selected = getFirstSelectionValue(keys);
                        setBloqueFin(selected ?? '');
                      }}
                      isRequired
                      variant="bordered"
                      labelPlacement="outside"
                      classNames={{
                        trigger: "bg-default-50 dark:bg-default-100/50",
                        popoverContent: "dark:bg-content1"
                      }}
                    >
                      {Array.from({ length: 20 }, (_, index) => {
                        const bloqueValor = (index + 1).toString();
                        const label = `Bloque ${bloqueValor}`;
                        return (
                          <SelectItem key={bloqueValor} textValue={label}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </Select>
                  </div>
                </div>

                <Divider className="my-4" />

                <div>
                  <h3 className="text-lg font-bold text-secondary dark:text-foreground mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-secondary text-white dark:text-secondary-foreground flex items-center justify-center text-sm">2</span>
                    Selección de Receta
                  </h3>

                  {asignaturaId && multiplicadorReceta > 0 && (
                    <div className="mb-4 p-4 bg-primary-50 dark:bg-primary-50/10 border border-primary-200 dark:border-primary-100/20 rounded-lg flex items-start gap-3">
                      <Icon icon="lucide:calculator" className="text-primary-600 mt-0.5 flex-shrink-0" width={20} />
                      <div className="text-sm">
                        <p className="font-bold text-primary-800 dark:text-primary-400">Cálculo Automático de Cantidades</p>
                        <p className="text-primary-700 dark:text-primary-300 mt-1">
                          Las cantidades se ajustarán por un factor de <strong>{multiplicadorReceta.toFixed(2)}x</strong>
                          based on {asignaturas.find(a => a.id === asignaturaId)?.secciones.filter(s => s.estado === 'ACTIVA').reduce((sum, s) => sum + s.cantInscritos, 0) || 0} alumnos activos vs receta base (20).
                        </p>
                      </div>
                    </div>
                  )}

                  <Select
                    label="Receta Base"
                    placeholder="Seleccione una receta para cargar ingredientes"
                    onSelectionChange={(keys) => handleSeleccionarReceta(Array.from(keys)[0] as string)}
                    isDisabled={!asignaturaId}
                    description={!asignaturaId ? "Primero seleccione una asignatura" : undefined}
                    variant="bordered"
                    labelPlacement="outside"
                    classNames={{
                      trigger: "bg-default-50 dark:bg-default-100/50",
                      popoverContent: "dark:bg-content1"
                    }}
                  >
                    {recetasDisponibles.map((receta) => (
                      <SelectItem key={receta.id} textValue={receta.nombre}>
                        {receta.nombre}
                      </SelectItem>
                    ))}
                  </Select>

                  {recetasDisponibles.length === 0 && (
                    <p className="text-sm text-warning mt-2 font-medium">
                      ⚠️ No hay recetas activas disponibles.
                    </p>
                  )}
                </div>

                {recetaCargada && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-6 pt-2"
                  >
                    <div className="bg-default-50 dark:bg-default-100/30 p-4 rounded-lg border border-default-200 dark:border-default-100">
                      <h4 className="font-bold text-sm text-default-600 dark:text-default-400 mb-3 uppercase tracking-wide">Agregar Extra</h4>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-4 items-end">
                        <Select
                          label="Producto"
                          placeholder="Buscar producto..."
                          selectedKeys={nuevoProductoSelectedKeys}
                          onSelectionChange={(keys) => {
                            const selected = getFirstSelectionValue(keys);
                            setNuevoProductoId(selected ?? '');
                          }}
                          variant="bordered"
                          labelPlacement="outside"
                          size="sm"
                          classNames={{
                            trigger: "bg-white dark:bg-default-100/50",
                            popoverContent: "dark:bg-content1"
                          }}
                        >
                          {productos.map((producto) => (
                            <SelectItem key={producto.id} textValue={producto.nombre}>
                              {producto.nombre} ({producto.stock} {producto.unidadMedida})
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
                          variant="bordered"
                          labelPlacement="outside"
                          size="sm"
                          classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                          endContent={
                            nuevoProductoId && (
                              <span className="text-default-400 text-xs font-medium">
                                {productos.find(p => p.id === nuevoProductoId)?.unidadMedida}
                              </span>
                            )
                          }
                        />
                        <Button
                          color="secondary"
                          variant="solid"
                          onPress={agregarProductoExtra}
                          startContent={<Icon icon="lucide:plus" />}
                          size="lg"
                          className="font-medium"
                        >
                          Agregar
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-secondary dark:text-foreground flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-secondary text-white dark:text-secondary-foreground flex items-center justify-center text-sm">3</span>
                          Detalle del Pedido
                        </h3>
                        {esCustom && <Chip color="primary" variant="flat" size="sm">Personalizado</Chip>}
                      </div>

                      <div className="border border-default-200 rounded-lg overflow-hidden">
                        <Table
                          aria-label="Lista de productos"
                          removeWrapper
                          classNames={{
                            th: "bg-default-100 dark:bg-default-50 text-default-600 dark:text-default-400 font-bold uppercase text-xs",
                          }}
                        >
                          <TableHeader>
                            <TableColumn>PRODUCTO</TableColumn>
                            <TableColumn>CANTIDAD</TableColumn>
                            <TableColumn>TIPO</TableColumn>
                            <TableColumn align="center">ACCIONES</TableColumn>
                          </TableHeader>
                          <TableBody emptyContent="La lista está vacía">
                            {items.map((item) => (
                              <TableRow key={item.id} className="border-b border-default-100 dark:border-default-50 last:border-none">
                                <TableCell className="font-medium">{item.productoNombre}</TableCell>
                                <TableCell>
                                  <span className="font-bold text-secondary dark:text-foreground">{item.cantidad.toFixed(2)}</span>
                                  <span className="text-default-400 text-xs ml-1">{item.unidadMedida}</span>
                                </TableCell>
                                <TableCell>
                                  {item.esAdicional ? (
                                    <Chip size="sm" color="warning" variant="flat" className="text-xs">Adicional</Chip>
                                  ) : (
                                    <Chip size="sm" variant="flat" className="bg-default-100 text-default-500 text-xs">Receta</Chip>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    isIconOnly
                                    variant="light"
                                    color="danger"
                                    size="sm"
                                    onPress={() => eliminarItem(item.id)}
                                  >
                                    <Icon icon="lucide:trash-2" width={18} />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </motion.div>
                )}

                <Divider className="my-4" />

                <div>
                  <h3 className="text-sm font-bold text-default-600 uppercase mb-2">Observaciones Adicionales</h3>
                  <Textarea
                    placeholder="Escriba aquí cualquier instrucción especial o comentario para Bodega..."
                    value={observaciones}
                    onValueChange={setObservaciones}
                    minRows={3}
                    variant="bordered"
                    classNames={{ inputWrapper: "bg-default-50 dark:bg-default-100/50" }}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="flat"
                    color="danger"
                    onPress={() => {
                      setItems([]);
                      setRecetaCargada(null);
                      setEsCustom(false);
                      setAsignaturaId('');
                      setSemana('');
                      setFecha('');
                      setBloqueInicio('');
                      setBloqueFin('');
                      setObservaciones('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    color="primary"
                    onPress={enviarSolicitud}
                    isLoading={isSubmitting}
                    isDisabled={isSubmitting || items.length === 0 || !asignaturaId || !fecha || !semana || !bloqueInicio || !bloqueFin}
                    className="font-bold text-secondary px-8"
                    endContent={<Icon icon="lucide:send" />}
                  >
                    Enviar Solicitud
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Historial Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm border-t-4 border-default-400 bg-white dark:bg-content1 sticky top-24">
              <CardHeader className="bg-default-50 dark:bg-content2 border-b border-default-100 dark:border-default-50/50 px-6 py-4">
                <h2 className="text-lg font-bold text-secondary dark:text-foreground flex items-center gap-2">
                  <Icon icon="lucide:history" />
                  Historial Reciente
                </h2>
              </CardHeader>
              <CardBody className="p-0">
                {cargandoHistorial ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-default-400 text-sm">Cargando...</p>
                  </div>
                ) : historialSolicitudes.length === 0 ? (
                  <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 bg-default-100 rounded-full flex items-center justify-center mx-auto mb-4 text-default-300">
                      <Icon icon="lucide:clipboard-list" width={32} />
                    </div>
                    <p className="text-default-500 font-medium">No hay solicitudes</p>
                    <p className="text-default-400 text-xs mt-1">
                      Tus solicitudes enviadas aparecerán aquí.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-default-100 max-h-[600px] overflow-y-auto">
                    {historialSolicitudes.map((solicitud) => (
                      <div
                        key={solicitud.id}
                        className="p-4 hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors cursor-pointer group"
                        onClick={() => abrirDetalleSolicitud(solicitud)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-sm text-secondary dark:text-foreground group-hover:text-primary transition-colors">
                            Semana {solicitud.semana}
                          </span>
                          {renderEstadoChip(solicitud.estado)}
                        </div>
                        <p className="text-xs text-default-500 mb-1">
                          {new Date(solicitud.fecha).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs font-medium text-default-600 bg-default-100 px-2 py-0.5 rounded">
                            {solicitud.items.length} ítems
                          </span>
                          <Icon icon="lucide:chevron-right" className="text-default-300 group-hover:text-primary" width={16} />
                        </div>
                        {solicitud.estado === 'Rechazada' && solicitud.comentarioRechazo && (
                          <div className="mt-2 text-xs bg-danger-50 text-danger-700 p-2 rounded border border-danger-100">
                            <strong>Rechazo:</strong> {solicitud.comentarioRechazo}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </motion.div>

      <Modal isOpen={isDetalleOpen} onOpenChange={onDetalleOpenChange} size="lg" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>

              <ModalHeader className="border-b border-default-100 dark:border-default-50 bg-default-50 dark:bg-content2">
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-bold text-secondary dark:text-foreground">Detalle de Solicitud</span>
                  <span className="text-xs text-default-500 font-normal uppercase tracking-wider">ID: {solicitudDetalle?.id.slice(-8)}</span>
                </div>
              </ModalHeader>
              <ModalBody className="py-6 space-y-6">
                {solicitudDetalle && (
                  <>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                      <div>
                        <p className="text-default-400 text-xs uppercase font-bold mb-1">Asignatura</p>
                        <p className="font-semibold text-secondary">{solicitudDetalle.asignaturaNombre}</p>
                      </div>
                      <div>
                        <p className="text-default-400 text-xs uppercase font-bold mb-1">Semana</p>
                        <Chip size="sm" variant="flat" className="font-bold bg-primary-100 text-primary-700">Semana {solicitudDetalle.semana}</Chip>
                      </div>
                      <div>
                        <p className="text-default-400 text-xs uppercase font-bold mb-1">Fecha Clase</p>
                        <p className="font-medium text-default-700">
                          {new Date(solicitudDetalle.fecha).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-default-400 text-xs uppercase font-bold mb-1">Estado</p>
                        {renderEstadoChip(solicitudDetalle.estado)}
                      </div>

                      {(solicitudDetalle.comentarioAdministrador || solicitudDetalle.comentarioRechazo) && (
                        <div className="col-span-2 mt-2 p-3 bg-default-50 rounded-lg border border-default-200">
                          <p className="text-xs font-bold text-default-500 uppercase mb-1">
                            {solicitudDetalle.estado === 'Rechazada' ? 'Motivo de Rechazo' : 'Comentario Administración'}
                          </p>
                          <p className={`text-sm ${solicitudDetalle.estado === 'Rechazada' ? 'text-danger py-1' : 'text-default-700'}`}>
                            {solicitudDetalle.estado === 'Rechazada' ? solicitudDetalle.comentarioRechazo : solicitudDetalle.comentarioAdministrador}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-secondary text-sm uppercase mb-3 border-b border-default-200 pb-2">Productos Solicitados</h4>
                      <Table removeWrapper aria-label="Productos detalle" classNames={{ th: "bg-default-100 text-xs uppercase" }}>
                        <TableHeader>
                          <TableColumn>PRODUCTO</TableColumn>
                          <TableColumn>CANTIDAD</TableColumn>
                          <TableColumn>TIPO</TableColumn>
                        </TableHeader>
                        <TableBody>
                          {solicitudDetalle.items.map((item) => (
                            <TableRow key={item.id} className="border-b border-default-50 last:border-none">
                              <TableCell className="font-medium text-default-700">{item.productoNombre}</TableCell>
                              <TableCell>
                                <span className="font-bold">{item.cantidad}</span> <span className="text-xs text-default-400">{item.unidadMedida}</span>
                              </TableCell>
                              <TableCell>
                                <Chip size="sm" variant="flat" color={item.esAdicional ? 'warning' : 'default'} className="h-6 text-[10px]">
                                  {item.esAdicional ? 'EXTRA' : 'RECETA'}
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
              <ModalFooter className="border-t border-default-100 dark:border-default-50 bg-default-50 dark:bg-content2">
                <Button variant="ghost" onPress={onClose} className="font-medium">
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