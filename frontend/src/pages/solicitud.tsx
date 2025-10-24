import React from 'react';
import { 
  Card, CardBody, Button, Input, Select, SelectItem, 
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Textarea, Divider
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

// IMPORTAR TIPOS Y SERVICIOS
import { IReceta, IItemSolicitud } from '../types/receta.types';
import { IProducto } from '../types/producto.types';
import { obtenerRecetasActivasService } from '../services/receta-service';
import { obtenerProductosService } from '../services/producto-service';
import { crearSolicitudService } from '../services/solicitud-service';
import AlertaProcesoSolicitudes from '../components/AlertaProcesoSolicitudes';
import { puedenCrearseSolicitudes } from '../pages/dashboard';

// Datos de asignaturas (esto podría venir de una API o contexto)
const asignaturas = [
  { id: '1', nombre: 'Panadería Básica' },
  { id: '2', nombre: 'Pastelería Avanzada' },
  { id: '3', nombre: 'Cocina Internacional' },
  { id: '4', nombre: 'Panadería Avanzada' },
];

const SolicitudPage: React.FC = () => {
  const [recetasDisponibles, setRecetasDisponibles] = React.useState<IReceta[]>([]);
  const [productos, setProductos] = React.useState<IProducto[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  
  const [asignaturaId, setAsignaturaId] = React.useState<string>('');
  const [fecha, setFecha] = React.useState<string>('');
  const [observaciones, setObservaciones] = React.useState<string>('');
  const [items, setItems] = React.useState<IItemSolicitud[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const [recetaCargada, setRecetaCargada] = React.useState<{id: string, nombre: string} | null>(null);
  const [esCustom, setEsCustom] = React.useState<boolean>(false);
  
  const [nuevoProductoId, setNuevoProductoId] = React.useState<string>('');
  const [nuevaCantidad, setNuevaCantidad] = React.useState<string>('');

  // Estado para control del proceso de pedidos
  const [procesoPermiteCrear, setProcesoPermiteCrear] = React.useState<boolean>(puedenCrearseSolicitudes());

  // Cargar recetas y productos al montar
  React.useEffect(() => {
    cargarDatos();
  }, []);

  // Verificar periódicamente si se puede crear solicitudes
  React.useEffect(() => {
    // Verificar cada minuto
    const intervalo = setInterval(() => {
      setProcesoPermiteCrear(puedenCrearseSolicitudes());
    }, 60000);

    // Verificar cuando la ventana recupera el foco
    const handleFocus = () => {
      setProcesoPermiteCrear(puedenCrearseSolicitudes());
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const cargarDatos = async () => {
    try {
      setIsLoading(true);
      const [recetas, productosData] = await Promise.all([
        obtenerRecetasActivasService(),
        obtenerProductosService()
      ]);
      setRecetasDisponibles(recetas);
      setProductos(productosData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeleccionarReceta = (recetaId: string) => {
    if (!procesoPermiteCrear) {
      alert('⚠️ No puedes modificar solicitudes en este momento. El proceso de pedidos no está activo o ya cerró el período de recepción.');
      return;
    }

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
    if (!procesoPermiteCrear) {
      alert('⚠️ No puedes modificar solicitudes en este momento. El proceso de pedidos no está activo o ya cerró el período de recepción.');
      return;
    }

    if (!nuevoProductoId || !nuevaCantidad || parseFloat(nuevaCantidad) <= 0) {
      alert('Por favor, seleccione un producto y especifique una cantidad válida');
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
    if (!procesoPermiteCrear) {
      alert('⚠️ No puedes modificar solicitudes en este momento. El proceso de pedidos no está activo o ya cerró el período de recepción.');
      return;
    }

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

  const enviarSolicitud = async () => {
    if (!procesoPermiteCrear) {
      alert('⚠️ No puedes crear solicitudes en este momento. El proceso de pedidos no está activo o ya cerró el período de recepción.');
      return;
    }

    if (!asignaturaId || !fecha || items.length === 0) {
      alert('Por favor, complete todos los campos obligatorios y agregue al menos un producto');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const asignaturaNombre = asignaturas.find(a => a.id === asignaturaId)?.nombre || '';
      
      await crearSolicitudService({
        asignaturaId,
        asignaturaNombre,
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
      setFecha('');
      setObservaciones('');
      setItems([]);
      setRecetaCargada(null);
      setEsCustom(false);
      
      alert('✅ Solicitud enviada correctamente');
    } catch (error: any) {
      console.error('Error al enviar la solicitud:', error);
      alert(error.message || 'Error al enviar la solicitud');
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

        {/* Alerta del proceso de pedidos */}
        <AlertaProcesoSolicitudes />

        <Card className="shadow-sm">
          <CardBody className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select 
                  label="Asignatura" 
                  placeholder="Seleccione una asignatura"
                  selectedKeys={asignaturaId ? [asignaturaId] : []}
                  onSelectionChange={(keys) => setAsignaturaId(Array.from(keys)[0] as string)}
                  isRequired
                  isDisabled={!procesoPermiteCrear}
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
                  isDisabled={!procesoPermiteCrear}
                />
              </div>
              
              <Divider />
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Cargar Receta Base</h3>
                <Select 
                  label="Receta" 
                  placeholder="Seleccione una receta para cargar sus ingredientes"
                  onSelectionChange={(keys) => handleSeleccionarReceta(Array.from(keys)[0] as string)}
                  isDisabled={!procesoPermiteCrear}
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
                        isDisabled={!procesoPermiteCrear}
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
                        isDisabled={!procesoPermiteCrear}
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
                        isDisabled={!procesoPermiteCrear}
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
                            isDisabled={!procesoPermiteCrear}
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
                  isDisabled={!procesoPermiteCrear}
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
                    setFecha('');
                    setObservaciones('');
                  }}
                  isDisabled={!procesoPermiteCrear}
                >
                  Cancelar
                </Button>
                <Button 
                  color="primary" 
                  onPress={enviarSolicitud}
                  isLoading={isSubmitting}
                  isDisabled={!procesoPermiteCrear || isSubmitting || items.length === 0 || !asignaturaId || !fecha}
                >
                  Enviar Solicitud
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
};

export default SolicitudPage;