import React from 'react';
import { 
  Card, CardBody, Button, Input, Select, SelectItem, 
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Textarea, Divider
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

// --- DATOS DE EJEMPLO ---

const asignaturas = [
  { id: '1', nombre: 'Panadería Básica' },
  { id: '2', nombre: 'Pastelería Avanzada' },
  { id: '3', nombre: 'Cocina Internacional' },
];

const recetasDisponibles = [
    {
      id: '1',
      nombre: 'Pan Francés',
      ingredientes: [
        { id: '1', productoId: 'p1', productoNombre: 'Harina', cantidad: 0.5, unidadMedida: 'kg' },
        { id: '2', productoId: 'p8', productoNombre: 'Levadura', cantidad: 0.01, unidadMedida: 'kg' },
        { id: '3', productoId: 'p7', productoNombre: 'Sal', cantidad: 0.02, unidadMedida: 'kg' },
      ],
    },
    {
      id: '2',
      nombre: 'Torta de Chocolate',
      ingredientes: [
        { id: '1', productoId: 'p1', productoNombre: 'Harina', cantidad: 0.2, unidadMedida: 'kg' },
        { id: '2', productoId: 'p3', productoNombre: 'Azúcar', cantidad: 0.25, unidadMedida: 'kg' },
        { id: '3', productoId: 'p9', productoNombre: 'Chocolate', cantidad: 0.2, unidadMedida: 'kg' },
        { id: '4', productoId: 'p6', productoNombre: 'Mantequilla', cantidad: 0.2, unidadMedida: 'kg' },
        { id: '5', productoId: 'p5', productoNombre: 'Huevos', cantidad: 4, unidadMedida: 'unidad' },
      ],
    },
];

const productos = [
  { id: 'p1', nombre: 'Harina', unidadMedida: 'kg' },
  { id: 'p2', nombre: 'Aceite de Oliva', unidadMedida: 'l' },
  { id: 'p3', nombre: 'Azúcar', unidadMedida: 'kg' },
  { id: 'p4', nombre: 'Leche', unidadMedida: 'l' },
  { id: 'p5', nombre: 'Huevos', unidadMedida: 'unidad' },
  { id: 'p6', nombre: 'Mantequilla', unidadMedida: 'kg' },
  { id: 'p7', nombre: 'Sal', unidadMedida: 'kg' },
  { id: 'p8', nombre: 'Levadura', unidadMedida: 'kg' },
  { id: 'p9', nombre: 'Chocolate', unidadMedida: 'kg' },
  { id: 'p10', nombre: 'Vainilla', unidadMedida: 'l' }
];


interface ItemSolicitud {
  id: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  unidadMedida: string;
}

const SolicitudPage: React.FC = () => {
  const [asignaturaId, setAsignaturaId] = React.useState<string>('');
  const [fecha, setFecha] = React.useState<string>('');
  const [observaciones, setObservaciones] = React.useState<string>('');
  const [items, setItems] = React.useState<ItemSolicitud[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const [recetaCargada, setRecetaCargada] = React.useState<{id: string, nombre: string} | null>(null);
  const [esCustom, setEsCustom] = React.useState<boolean>(false);
  
  const [nuevoProductoId, setNuevoProductoId] = React.useState<string>('');
  const [nuevaCantidad, setNuevaCantidad] = React.useState<string>('');

  const handleSeleccionarReceta = (recetaId: string) => {
    if (!recetaId) return;

    const recetaSeleccionada = recetasDisponibles.find(r => r.id === recetaId);
    if (!recetaSeleccionada) return;

    setRecetaCargada({ id: recetaSeleccionada.id, nombre: recetaSeleccionada.nombre });
    setEsCustom(false);

    const nuevosItems = recetaSeleccionada.ingredientes.map(ing => ({
        id: `${recetaId}-${ing.id}-${Date.now()}`,
        productoId: ing.productoId,
        productoNombre: ing.productoNombre,
        cantidad: ing.cantidad,
        unidadMedida: ing.unidadMedida
    }));

    setItems(nuevosItems);
  };

  const agregarProductoExtra = () => {
    if (!nuevoProductoId || !nuevaCantidad || parseFloat(nuevaCantidad) <= 0) {
      alert('Por favor, seleccione un producto y especifique una cantidad válida');
      return;
    }
    const producto = productos.find(p => p.id === nuevoProductoId);
    if (!producto) return;

    const nuevoItem: ItemSolicitud = {
      id: Date.now().toString(),
      productoId: nuevoProductoId,
      productoNombre: producto.nombre,
      cantidad: parseFloat(nuevaCantidad),
      unidadMedida: producto.unidadMedida
    };

    setItems([...items, nuevoItem]);
    setEsCustom(true);
    setNuevoProductoId('');
    setNuevaCantidad('');
  };

  const eliminarItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    setEsCustom(true);
  };

  const enviarSolicitud = async () => {
    if (!asignaturaId || !fecha || items.length === 0) {
      alert('Por favor, complete todos los campos obligatorios y agregue al menos un producto');
      return;
    }
    try {
      setIsSubmitting(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setAsignaturaId('');
      setFecha('');
      setObservaciones('');
      setItems([]);
      setRecetaCargada(null);
      setEsCustom(false);
      alert('Solicitud enviada correctamente');
    } catch (error) {
      console.error('Error al enviar la solicitud:', error);
      alert('Error al enviar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              {recetaCargada && (
                <>
                  <Divider />
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Agregar Productos Adicionales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-center">
                      <Select 
                        label="Producto" 
                        placeholder="Seleccione un producto"
                        selectedKeys={nuevoProductoId ? [nuevoProductoId] : []}
                        onSelectionChange={(keys) => setNuevoProductoId(Array.from(keys)[0] as string)}
                      >
                        {productos.map((producto) => (
                          <SelectItem key={producto.id}>{producto.nombre}</SelectItem>
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
                            <span className="text-default-400">
                                {productos.find(p => p.id === nuevoProductoId)?.unidadMedida || ''}
                            </span>
                          )
                        }
                      />
                      <div className="flex items-end h-full">
                        <Button 
                          color="primary" 
                          variant="flat"
                          onPress={agregarProductoExtra}
                          startContent={<Icon icon="lucide:plus" />}
                        >
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <Divider />

              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {recetaCargada ? `Ingredientes del Pedido: ${recetaCargada.nombre}` : 'Ingredientes del Pedido'}
                  {esCustom && <span className="text-primary font-normal"> (Custom)</span>}
                </h3>
                <Table 
                  aria-label="Lista de productos solicitados"
                  removeWrapper
                >
                  <TableHeader>
                    <TableColumn>PRODUCTO</TableColumn>
                    <TableColumn>CANTIDAD</TableColumn>
                    <TableColumn>ACCIONES</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="Seleccione una receta para ver sus ingredientes">
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productoNombre}</TableCell>
                        <TableCell>{item.cantidad} {item.unidadMedida}</TableCell>
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
                  placeholder="Añada aquí modificaciones o productos extra (ej: 'Agregar 2kg de sal')"
                  value={observaciones}
                  onValueChange={setObservaciones}
                  minRows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="flat" onPress={() => {
                    setItems([]);
                    setRecetaCargada(null);
                    setEsCustom(false);
                }}>
                  Cancelar
                </Button>
                <Button 
                  color="primary" 
                  onPress={enviarSolicitud}
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting || items.length === 0}
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