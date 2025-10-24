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
 * Página de gestión de recetas con persistencia real.
 */
const GestionRecetasPage: React.FC = () => {
  const [recetas, setRecetas] = React.useState<IReceta[]>([]);
  const [productos, setProductos] = React.useState<IProducto[]>([]);
  const [filteredRecetas, setFilteredRecetas] = React.useState<IReceta[]>([]);
  const [recetaSeleccionada, setRecetaSeleccionada] = React.useState<IReceta | null>(null);
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar' | 'ver'>('crear');
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [selectedCategoria, setSelectedCategoria] = React.useState<string>('todas');
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
    } catch (error) {
      console.error('Error al cargar datos:', error);
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
        receta.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receta.asignatura.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedCategoria !== 'todas') {
      filtered = filtered.filter(receta => receta.categoria === selectedCategoria);
    }
    setFilteredRecetas(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedCategoria, recetas]);

  const categorias = React.useMemo(() => {
    const categoriasSet = new Set(recetas.map(receta => receta.categoria));
    return ['todas', ...Array.from(categoriasSet)];
  }, [recetas]);

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
      await cambiarEstadoRecetaService(id, nuevoEstado === 'Activa');
      await cargarDatos(); // Recargar datos
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar el estado de la receta');
    }
  };

  const handleGuardarReceta = async (receta: IReceta) => {
    try {
      if (modalMode === 'crear') {
        await crearRecetaService({
          nombre: receta.nombre,
          descripcion: receta.descripcion,
          categoria: receta.categoria,
          ingredientes: receta.ingredientes.map(ing => ({
            productoId: ing.productoId,
            productoNombre: ing.productoNombre,
            cantidad: ing.cantidad,
            unidadMedida: ing.unidadMedida
          })),
          instrucciones: receta.instrucciones,
          asignatura: receta.asignatura,
          estado: receta.estado
        });
      } else if (modalMode === 'editar') {
        await actualizarRecetaService({
          id: receta.id,
          nombre: receta.nombre,
          descripcion: receta.descripcion,
          categoria: receta.categoria,
          ingredientes: receta.ingredientes, // Enviamos ingredientes completos con ID
          instrucciones: receta.instrucciones,
          asignatura: receta.asignatura,
          estado: receta.estado
        });
      }
      await cargarDatos(); // Recargar datos
    } catch (error: any) {
      console.error('Error al guardar receta:', error);
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
            <p className="text-default-500">Administre las recetas del sistema.</p>
          </div>
          <Button 
            color="primary" 
            startContent={<Icon icon="lucide:plus" />}
            onPress={handleNuevaReceta}
          >
            Nueva Receta
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Buscar recetas..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            startContent={<Icon icon="lucide:search" className="text-default-400" />}
            className="w-full md:w-64"
            aria-label="Buscar recetas"
          />
          <Select 
            label="Categoría"
            placeholder="Todas las categorías"
            selectedKeys={selectedCategoria ? [selectedCategoria] : []}
            onSelectionChange={(keys) => setSelectedCategoria(Array.from(keys)[0] as string)}
            className="w-full md:w-40"
            aria-label="Filtrar por categoría"
          >
            {categorias.map((categoria) => (
              <SelectItem key={categoria}>
                {categoria === 'todas' ? 'Todas las categorías' : categoria}
              </SelectItem>
            ))}
          </Select>
        </div>

        <Card className="shadow-sm">
          <CardBody className="p-0">
            <Table 
              aria-label="Tabla de recetas"
              removeWrapper
              bottomContent={
                <div className="flex w-full justify-center">
                  <Pagination
                    total={Math.ceil(filteredRecetas.length / rowsPerPage)}
                    page={currentPage}
                    onChange={setCurrentPage}
                    showControls
                  />
                </div>
              }
            >
              <TableHeader>
                <TableColumn>NOMBRE</TableColumn>
                <TableColumn>CATEGORÍA</TableColumn>
                <TableColumn>ASIGNATURA</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No se encontraron recetas">
                {paginatedRecetas.map((receta) => (
                  <TableRow key={receta.id}>
                    <TableCell>{receta.nombre}</TableCell>
                    <TableCell>{receta.categoria}</TableCell>
                    <TableCell>{receta.asignatura}</TableCell>
                    <TableCell>{renderEstado(receta.estado)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button isIconOnly variant="light" size="sm" onPress={() => handleVerReceta(receta)}>
                          <Icon icon="lucide:eye" className="text-primary" />
                        </Button>
                        <Button isIconOnly variant="light" size="sm" onPress={() => handleEditarReceta(receta)}>
                          <Icon icon="lucide:edit" className="text-primary" />
                        </Button>
                        <Button isIconOnly variant="light" size="sm" onPress={() => cambiarEstadoReceta(receta.id, receta.estado === 'Activa' ? 'Inactiva' : 'Activa')}>
                          <Icon icon={receta.estado === 'Activa' ? 'lucide:x' : 'lucide:check'} className={receta.estado === 'Activa' ? 'text-danger' : 'text-success'} />
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

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl">
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
                  // Error ya manejado en handleGuardarReceta
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
        {mode === 'crear' ? 'Nueva Receta' : mode === 'editar' ? 'Editar Receta' : 'Detalle de Receta'}
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
        <p className="text-default-500">{receta.descripcion}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-default-500">Categoría</p>
          <p className="font-medium">{receta.categoria}</p>
        </div>
        <div>
          <p className="text-sm text-default-500">Asignatura</p>
          <p className="font-medium">{receta.asignatura}</p>
        </div>
        <div>
          <p className="text-sm text-default-500">Estado</p>
          <p className="font-medium">{receta.estado}</p>
        </div>
      </div>
      
      <Divider />
      
      <div>
        <h4 className="font-semibold mb-2">Ingredientes</h4>
        <Table aria-label="Ingredientes" removeWrapper>
          <TableHeader>
            <TableColumn>INGREDIENTE</TableColumn>
            <TableColumn>CANTIDAD</TableColumn>
          </TableHeader>
          <TableBody>
            {receta.ingredientes.map((ingrediente) => (
              <TableRow key={ingrediente.id}>
                <TableCell>{ingrediente.productoNombre}</TableCell>
                <TableCell>{ingrediente.cantidad} {ingrediente.unidadMedida}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <Divider />
      
      <div>
        <h4 className="font-semibold mb-2">Instrucciones</h4>
        <div className="whitespace-pre-line bg-default-50 p-4 rounded-md">
          {receta.instrucciones}
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

const FormularioReceta = React.forwardRef<any, FormularioRecetaProps>(({ receta, mode, productos, onSave }, ref) => {
  const [nombre, setNombre] = React.useState(receta?.nombre || '');
  const [descripcion, setDescripcion] = React.useState(receta?.descripcion || '');
  const [categoria, setCategoria] = React.useState(receta?.categoria || '');
  const [asignatura, setAsignatura] = React.useState(receta?.asignatura || '');
  const [instrucciones, setInstrucciones] = React.useState(receta?.instrucciones || '');
  const [estado, setEstado] = React.useState<'Activa' | 'Inactiva'>(receta?.estado || 'Activa');
  const [ingredientes, setIngredientes] = React.useState<IIngrediente[]>(receta?.ingredientes || []);

  React.useImperativeHandle(ref, () => ({
    submit: async () => {
      if (!nombre.trim()) {
        throw new Error('El nombre es requerido');
      }
      if (ingredientes.length === 0) {
        throw new Error('Debe agregar al menos un ingrediente');
      }

      const recetaData: IReceta = {
        id: receta?.id || '',
        nombre,
        descripcion,
        categoria,
        asignatura,
        ingredientes,
        instrucciones,
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
        label="Nombre"
        placeholder="Nombre de la receta"
        value={nombre}
        onValueChange={setNombre}
        isRequired
      />
      
      <Textarea
        label="Descripción"
        placeholder="Descripción breve de la receta"
        value={descripcion}
        onValueChange={setDescripcion}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Categoría"
          placeholder="Categoría de la receta"
          value={categoria}
          onValueChange={setCategoria}
          isRequired
        />
        <Input
          label="Asignatura"
          placeholder="Asignatura relacionada"
          value={asignatura}
          onValueChange={setAsignatura}
          isRequired
        />
      </div>
      
      <Divider />
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold">Ingredientes</h4>
          <Button 
            size="sm" 
            color="primary" 
            variant="flat"
            startContent={<Icon icon="lucide:plus" />}
            onPress={agregarIngrediente}
          >
            Agregar Ingrediente
          </Button>
        </div>
        
        <Table aria-label="Ingredientes" removeWrapper>
          <TableHeader>
            <TableColumn>PRODUCTO</TableColumn>
            <TableColumn>CANTIDAD</TableColumn>
            <TableColumn>UNIDAD</TableColumn>
            <TableColumn>ACCIONES</TableColumn>
          </TableHeader>
          <TableBody emptyContent="No hay ingredientes agregados">
            {ingredientes.map((ingrediente, index) => (
              <TableRow key={ingrediente.id || index}>
                <TableCell>
                  <Select 
                    placeholder="Seleccione producto"
                    selectedKeys={ingrediente.productoId ? [ingrediente.productoId] : []}
                    onSelectionChange={(keys) => actualizarIngrediente(index, 'productoId', Array.from(keys)[0])}
                    size="sm"
                    isRequired
                  >
                    {productos.map((producto) => (
                      <SelectItem key={producto.id}>
                        {producto.nombre}
                      </SelectItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Input 
                    type="number"
                    placeholder="Cantidad"
                    value={ingrediente.cantidad.toString()}
                    onValueChange={(val) => actualizarIngrediente(index, 'cantidad', parseFloat(val) || 0)}
                    size="sm"
                    min="0"
                    step="0.01"
                  />
                </TableCell>
                <TableCell>
                  <span className="text-sm">{ingrediente.unidadMedida || '-'}</span>
                </TableCell>
                <TableCell>
                  <Button 
                    isIconOnly 
                    variant="light" 
                    size="sm"
                    color="danger"
                    onPress={() => eliminarIngrediente(index)}
                  >
                    <Icon icon="lucide:trash" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <Divider />
      
      <Textarea
        label="Instrucciones"
        placeholder="Instrucciones paso a paso para preparar la receta"
        value={instrucciones}
        onValueChange={setInstrucciones}
        minRows={5}
      />
      
      <Select 
        label="Estado"
        selectedKeys={[estado]}
        onSelectionChange={(keys) => setEstado(Array.from(keys)[0] as 'Activa' | 'Inactiva')}
      >
        <SelectItem key="Activa">Activa</SelectItem>
        <SelectItem key="Inactiva">Inactiva</SelectItem>
      </Select>
    </div>
  );
});

export default GestionRecetasPage;