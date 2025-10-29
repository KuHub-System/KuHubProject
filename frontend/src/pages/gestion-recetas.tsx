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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Divider,
  Textarea,
  Select,
  SelectItem
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

// IMPORTAR TIPOS Y SERVICIOS
import { IReceta, IIngrediente } from '../types/receta.types';
import { IProducto } from '../types/producto.types';
import { 
  obtenerRecetasService, 
  crearRecetaService, 
  actualizarRecetaService,
  cambiarEstadoRecetaService 
} from '../services/receta-service';
import { obtenerProductosService } from '../services/producto-service';

/**
 * Página de gestión de recetas simplificada.
 */
const GestionRecetasPage: React.FC = () => {
  const [recetas, setRecetas] = React.useState<IReceta[]>([]);
  const [productos, setProductos] = React.useState<IProducto[]>([]);
  const [filteredRecetas, setFilteredRecetas] = React.useState<IReceta[]>([]);
  const [recetaSeleccionada, setRecetaSeleccionada] = React.useState<IReceta | null>(null);
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar' | 'ver'>('crear');
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const rowsPerPage = 5;

  // Cargar recetas y productos al montar el componente
  React.useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setIsLoading(true);
      const [recetasCargadas, productosCargados] = await Promise.all([
        obtenerRecetasService(),
        obtenerProductosService()
      ]);
      setRecetas(recetasCargadas);
      setProductos(productosCargados);
      console.log('📋 Recetas cargadas:', recetasCargadas.length);
      console.log('📦 Productos cargados:', productosCargados.length);
    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
      alert('Error al cargar las recetas');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    let filtered = [...recetas];
    if (searchTerm) {
      filtered = filtered.filter(receta => 
        receta.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (receta.descripcion && receta.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    setFilteredRecetas(filtered);
    setCurrentPage(1);
  }, [searchTerm, recetas]);

  const paginatedRecetas = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredRecetas.slice(start, end);
  }, [currentPage, filteredRecetas, rowsPerPage]);

  const handleNuevaReceta = () => {
    setModalMode('crear');
    setRecetaSeleccionada(null);
    onOpen();
  };

  const handleEditarReceta = (receta: IReceta) => {
    setModalMode('editar');
    setRecetaSeleccionada(receta);
    onOpen();
  };

  const handleVerReceta = (receta: IReceta) => {
    setModalMode('ver');
    setRecetaSeleccionada(receta);
    onOpen();
  };

  const cambiarEstadoReceta = async (id: string, nuevoEstado: 'Activa' | 'Inactiva') => {
    try {
      console.log(`🔄 Cambiando estado de receta ${id} a ${nuevoEstado}`);
      await cambiarEstadoRecetaService(id, nuevoEstado === 'Activa');
      await cargarDatos();
      alert(`✅ Receta ${nuevoEstado.toLowerCase()} correctamente`);
    } catch (error) {
      console.error('❌ Error al cambiar estado:', error);
      alert('Error al cambiar el estado de la receta');
    }
  };

  const handleGuardarReceta = async (receta: IReceta) => {
    try {
      if (modalMode === 'crear') {
        console.log('📝 Creando nueva receta:', receta.nombre);
        await crearRecetaService({
          nombre: receta.nombre,
          descripcion: receta.descripcion,
          ingredientes: receta.ingredientes.map(ing => ({
            productoId: ing.productoId,
            productoNombre: ing.productoNombre,
            cantidad: ing.cantidad,
            unidadMedida: ing.unidadMedida
          })),
          instrucciones: receta.instrucciones,
          estado: receta.estado
        });
        alert('✅ Receta creada correctamente');
      } else if (modalMode === 'editar') {
        console.log('✏️ Actualizando receta:', receta.nombre);
        await actualizarRecetaService({
          id: receta.id,
          nombre: receta.nombre,
          descripcion: receta.descripcion,
          ingredientes: receta.ingredientes,
          instrucciones: receta.instrucciones,
          estado: receta.estado
        });
        alert('✅ Receta actualizada correctamente');
      }
      await cargarDatos();
    } catch (error: any) {
      console.error('❌ Error al guardar receta:', error);
      alert(error.message || 'Error al guardar la receta');
      throw error;
    }
  };

  const renderEstado = (estado: string) => {
    switch (estado) {
      case 'Activa': return <Chip color="success" size="sm">{estado}</Chip>;
      case 'Inactiva': return <Chip color="danger" size="sm">{estado}</Chip>;
      default: return <Chip size="sm">{estado}</Chip>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando recetas...</p>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Gestión de Recetas</h1>
            <p className="text-default-500">
              Administre las recetas base para las solicitudes de insumos.
            </p>
          </div>
          <Button 
            color="primary" 
            startContent={<Icon icon="lucide:plus" />}
            onPress={handleNuevaReceta}
          >
            Nueva Receta
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardBody className="text-center p-4">
              <p className="text-sm text-default-500">Total Recetas</p>
              <p className="text-3xl font-bold text-primary">{recetas.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center p-4">
              <p className="text-sm text-default-500">Activas</p>
              <p className="text-3xl font-bold text-success">
                {recetas.filter(r => r.estado === 'Activa').length}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center p-4">
              <p className="text-sm text-default-500">Inactivas</p>
              <p className="text-3xl font-bold text-danger">
                {recetas.filter(r => r.estado === 'Inactiva').length}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Buscar recetas..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            startContent={<Icon icon="lucide:search" className="text-default-400" />}
            isClearable
            onClear={() => setSearchTerm('')}
            className="w-full md:w-64"
          />
        </div>

        {/* Tabla */}
        <Card className="shadow-sm">
          <CardBody className="p-0">
            <Table 
              aria-label="Tabla de recetas"
              removeWrapper
              bottomContent={
                filteredRecetas.length > rowsPerPage && (
                  <div className="flex w-full justify-center">
                    <Pagination
                      total={Math.ceil(filteredRecetas.length / rowsPerPage)}
                      page={currentPage}
                      onChange={setCurrentPage}
                      showControls
                    />
                  </div>
                )
              }
            >
              <TableHeader>
                <TableColumn>NOMBRE</TableColumn>
                <TableColumn>DESCRIPCIÓN</TableColumn>
                <TableColumn>INGREDIENTES</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No se encontraron recetas">
                {paginatedRecetas.map((receta) => (
                  <TableRow key={receta.id}>
                    <TableCell>
                      <p className="font-medium">{receta.nombre}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-default-500 line-clamp-2">
                        {receta.descripcion || '-'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat">
                        {receta.ingredientes.length} ingredientes
                      </Chip>
                    </TableCell>
                    <TableCell>{renderEstado(receta.estado)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          isIconOnly 
                          variant="light" 
                          size="sm" 
                          onPress={() => handleVerReceta(receta)}
                        >
                          <Icon icon="lucide:eye" className="text-primary" />
                        </Button>
                        <Button 
                          isIconOnly 
                          variant="light" 
                          size="sm" 
                          onPress={() => handleEditarReceta(receta)}
                        >
                          <Icon icon="lucide:edit" className="text-primary" />
                        </Button>
                        <Button 
                          isIconOnly 
                          variant="light" 
                          size="sm" 
                          onPress={() => cambiarEstadoReceta(
                            receta.id, 
                            receta.estado === 'Activa' ? 'Inactiva' : 'Activa'
                          )}
                        >
                          <Icon 
                            icon={receta.estado === 'Activa' ? 'lucide:x' : 'lucide:check'} 
                            className={receta.estado === 'Activa' ? 'text-danger' : 'text-success'} 
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </motion.div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <DetalleReceta 
              receta={recetaSeleccionada} 
              mode={modalMode}
              productos={productos}
              onClose={onClose}
              onSave={async (nuevaReceta) => {
                try {
                  await handleGuardarReceta(nuevaReceta);
                  onClose();
                } catch (error) {
                  // Error ya manejado
                }
              }}
            />
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

interface DetalleRecetaProps {
  receta: IReceta | null;
  mode: 'crear' | 'editar' | 'ver';
  productos: IProducto[];
  onClose: () => void;
  onSave: (receta: IReceta) => Promise<void>;
}

const DetalleReceta: React.FC<DetalleRecetaProps> = ({ receta, mode, productos, onClose, onSave }) => {
  const [isSaving, setIsSaving] = React.useState(false);
  const formRef = React.useRef<any>(null);

  const handleSubmit = async () => {
    if (formRef.current) {
      setIsSaving(true);
      try {
        await formRef.current.submit();
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <>
      <ModalHeader>
        {mode === 'crear' ? '➕ Nueva Receta' : mode === 'editar' ? '✏️ Editar Receta' : '👁️ Detalle de Receta'}
      </ModalHeader>
      <ModalBody>
        {mode === 'ver' ? (
          receta && <VistaReceta receta={receta} />
        ) : (
          <FormularioReceta 
            ref={formRef}
            receta={receta} 
            mode={mode}
            productos={productos}
            onSave={onSave} 
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="flat" onPress={onClose} isDisabled={isSaving}>
          {mode === 'ver' ? 'Cerrar' : 'Cancelar'}
        </Button>
        {mode !== 'ver' && (
          <Button 
            color="primary" 
            onPress={handleSubmit}
            isLoading={isSaving}
            isDisabled={isSaving}
          >
            {mode === 'crear' ? 'Crear Receta' : 'Guardar Cambios'}
          </Button>
        )}
      </ModalFooter>
    </>
  );
};

interface VistaRecetaProps {
  receta: IReceta;
}

const VistaReceta: React.FC<VistaRecetaProps> = ({ receta }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">{receta.nombre}</h3>
        {receta.descripcion && (
          <p className="text-default-500">{receta.descripcion}</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-default-500">Estado</p>
          <Chip color={receta.estado === 'Activa' ? 'success' : 'danger'} size="sm">
            {receta.estado}
          </Chip>
        </div>
        <div>
          <p className="text-sm text-default-500">Ingredientes</p>
          <p className="font-medium">{receta.ingredientes.length} ingredientes</p>
        </div>
      </div>
      
      <Divider />
      
      <div>
        <h4 className="font-semibold mb-3">📦 Ingredientes</h4>
        <Table aria-label="Ingredientes" removeWrapper>
          <TableHeader>
            <TableColumn>INGREDIENTE</TableColumn>
            <TableColumn>CANTIDAD</TableColumn>
          </TableHeader>
          <TableBody>
            {receta.ingredientes.map((ingrediente) => (
              <TableRow key={ingrediente.id}>
                <TableCell>{ingrediente.productoNombre}</TableCell>
                <TableCell className="font-semibold">
                  {ingrediente.cantidad} {ingrediente.unidadMedida}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <Divider />
      
      <div>
        <h4 className="font-semibold mb-3">📝 Instrucciones</h4>
        <div className="whitespace-pre-line bg-default-50 p-4 rounded-md text-sm">
          {receta.instrucciones || 'Sin instrucciones'}
        </div>
      </div>
    </div>
  );
};

interface FormularioRecetaProps {
  receta: IReceta | null;
  mode: 'crear' | 'editar';
  productos: IProducto[];
  onSave: (receta: IReceta) => Promise<void>;
}

const FormularioReceta = React.forwardRef<any, FormularioRecetaProps>(
  ({ receta, mode, productos, onSave }, ref) => {
    const [nombre, setNombre] = React.useState(receta?.nombre || '');
    const [descripcion, setDescripcion] = React.useState(receta?.descripcion || '');
    const [instrucciones, setInstrucciones] = React.useState(receta?.instrucciones || '');
    const [estado, setEstado] = React.useState<'Activa' | 'Inactiva'>(receta?.estado || 'Activa');
    const [ingredientes, setIngredientes] = React.useState<IIngrediente[]>(receta?.ingredientes || []);

    React.useImperativeHandle(ref, () => ({
      submit: async () => {
        // Validaciones
        if (!nombre.trim()) {
          alert('⚠️ El nombre es obligatorio');
          throw new Error('El nombre es requerido');
        }
        if (ingredientes.length === 0) {
          alert('⚠️ Debe agregar al menos un ingrediente');
          throw new Error('Debe agregar al menos un ingrediente');
        }
        
        // Validar que todos los ingredientes tengan producto y cantidad
        for (let i = 0; i < ingredientes.length; i++) {
          const ing = ingredientes[i];
          if (!ing.productoId) {
            alert(`⚠️ Seleccione un producto para el ingrediente ${i + 1}`);
            throw new Error('Producto no seleccionado');
          }
          if (ing.cantidad <= 0) {
            alert(`⚠️ La cantidad del ingrediente ${i + 1} debe ser mayor a 0`);
            throw new Error('Cantidad inválida');
          }
        }

        const recetaData: IReceta = {
          id: receta?.id || '',
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          ingredientes,
          instrucciones: instrucciones.trim(),
          estado,
          fechaCreacion: receta?.fechaCreacion || new Date().toISOString(),
          fechaActualizacion: new Date().toISOString(),
        };

        await onSave(recetaData);
      }
    }));

    const agregarIngrediente = () => {
      const nuevoIngrediente: IIngrediente = {
        id: Date.now().toString(),
        productoId: '',
        productoNombre: '',
        cantidad: 0,
        unidadMedida: ''
      };
      setIngredientes([...ingredientes, nuevoIngrediente]);
    };

    const actualizarIngrediente = (index: number, campo: keyof IIngrediente, valor: any) => {
      const nuevosIngredientes = [...ingredientes];
      
      if (campo === 'productoId') {
        const producto = productos.find(p => p.id === valor);
        if (producto) {
          nuevosIngredientes[index] = {
            ...nuevosIngredientes[index],
            productoId: producto.id,
            productoNombre: producto.nombre,
            unidadMedida: producto.unidadMedida
          };
        }
      } else {
        nuevosIngredientes[index] = {
          ...nuevosIngredientes[index],
          [campo]: valor
        };
      }
      
      setIngredientes(nuevosIngredientes);
    };

    const eliminarIngrediente = (index: number) => {
      setIngredientes(ingredientes.filter((_, i) => i !== index));
    };

    return (
      <div className="space-y-4">
        <Input
          label="Nombre de la Receta"
          placeholder="Ej: Pan Amasado, Torta de Chocolate, etc."
          value={nombre}
          onValueChange={setNombre}
          isRequired
          variant="bordered"
        />
        
        <Textarea
          label="Descripción (Opcional)"
          placeholder="Descripción breve de la receta..."
          value={descripcion}
          onValueChange={setDescripcion}
          variant="bordered"
          minRows={2}
        />
        
        <Divider />
        
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">📦 Ingredientes</h4>
            <Button 
              size="sm" 
              color="primary" 
              variant="flat"
              startContent={<Icon icon="lucide:plus" />}
              onPress={agregarIngrediente}
            >
              Agregar
            </Button>
          </div>
          
          {ingredientes.length === 0 ? (
            <div className="text-center p-8 bg-default-50 rounded-lg">
              <Icon icon="lucide:package-open" className="text-default-300 text-4xl mx-auto mb-2" />
              <p className="text-default-500 text-sm">
                No hay ingredientes. Click en "Agregar" para comenzar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ingredientes.map((ingrediente, index) => (
                <Card key={ingrediente.id || index} shadow="none" className="border-2 border-default-200">
                  <CardBody className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto_auto] gap-3 items-end">
                      <Select 
                        label="Producto"
                        placeholder="Seleccione producto"
                        selectedKeys={ingrediente.productoId ? [ingrediente.productoId] : []}
                        onSelectionChange={(keys) => actualizarIngrediente(index, 'productoId', Array.from(keys)[0])}
                        size="sm"
                        variant="bordered"
                        isRequired
                      >
                        {productos.map((producto) => (
                          <SelectItem key={producto.id}>
                            {producto.nombre}
                          </SelectItem>
                        ))}
                      </Select>
                      
                      <Input 
                        type="number"
                        label="Cantidad"
                        placeholder="0"
                        value={ingrediente.cantidad.toString()}
                        onValueChange={(val) => actualizarIngrediente(index, 'cantidad', parseFloat(val) || 0)}
                        size="sm"
                        variant="bordered"
                        min="0"
                        step="0.01"
                        endContent={
                          <span className="text-xs text-default-400">
                            {ingrediente.unidadMedida || 'unidad'}
                          </span>
                        }
                      />
                      
                      <span className="text-sm text-default-500 mb-2">
                        {ingrediente.unidadMedida || '-'}
                      </span>
                      
                      <Button 
                        isIconOnly 
                        variant="light" 
                        size="sm"
                        color="danger"
                        onPress={() => eliminarIngrediente(index)}
                      >
                        <Icon icon="lucide:trash" />
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        <Divider />
        
        <Textarea
          label="Instrucciones (Opcional)"
          placeholder="Paso 1: ...&#10;Paso 2: ...&#10;Paso 3: ..."
          value={instrucciones}
          onValueChange={setInstrucciones}
          variant="bordered"
          minRows={5}
        />
        
        <Select 
          label="Estado"
          selectedKeys={[estado]}
          onSelectionChange={(keys) => setEstado(Array.from(keys)[0] as 'Activa' | 'Inactiva')}
          variant="bordered"
        >
          <SelectItem key="Activa">Activa</SelectItem>
          <SelectItem key="Inactiva">Inactiva</SelectItem>
        </Select>
      </div>
    );
  }
);

export default GestionRecetasPage;