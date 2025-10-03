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

/**
 * Interfaz para un ingrediente de receta.
 */
interface Ingrediente {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

/**
 * Interfaz para una receta (SIN tiempo, porciones ni dificultad).
 */
interface Receta {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  ingredientes: Ingrediente[];
  instrucciones: string;
  asignatura: string;
  estado: 'Activa' | 'Inactiva';
}

/**
 * Datos de ejemplo para las recetas (actualizados).
 */
const recetasIniciales: Receta[] = [
  {
    id: '1',
    nombre: 'Pan Francés',
    descripcion: 'Pan tradicional francés con corteza crujiente',
    categoria: 'Panadería',
    ingredientes: [
      { id: '1', nombre: 'Harina', cantidad: 500, unidad: 'g' },
      { id: '2', nombre: 'Agua', cantidad: 350, unidad: 'ml' },
      { id: '3', nombre: 'Sal', cantidad: 10, unidad: 'g' },
      { id: '4', nombre: 'Levadura', cantidad: 7, unidad: 'g' }
    ],
    instrucciones: '1. Mezclar la harina y la sal.\n2. Disolver la levadura en agua tibia.\n3. Incorporar el agua con levadura a la harina.\n4. Amasar por 10 minutos.\n5. Dejar reposar por 1 hora.\n6. Formar los panes y hornear a 220°C por 25 minutos.',
    asignatura: 'Panadería Básica',
    estado: 'Activa'
  },
  {
    id: '2',
    nombre: 'Croissant',
    descripcion: 'Clásico croissant francés con mantequilla',
    categoria: 'Panadería',
    ingredientes: [
      { id: '1', nombre: 'Harina', cantidad: 500, unidad: 'g' },
      { id: '2', nombre: 'Mantequilla', cantidad: 250, unidad: 'g' },
      { id: '3', nombre: 'Azúcar', cantidad: 50, unidad: 'g' },
      { id: '4', nombre: 'Leche', cantidad: 140, unidad: 'ml' },
      { id: '5', nombre: 'Levadura', cantidad: 10, unidad: 'g' },
      { id: '6', nombre: 'Huevo', cantidad: 1, unidad: 'unidad' }
    ],
    instrucciones: '1. Preparar la masa mezclando harina, azúcar, levadura y leche.\n2. Refrigerar por 1 hora.\n3. Laminar la mantequilla y formar capas con la masa.\n4. Realizar 3 vueltas simples, refrigerando entre cada vuelta.\n5. Cortar en triángulos y formar los croissants.\n6. Dejar fermentar y hornear a 180°C por 15-20 minutos.',
    asignatura: 'Panadería Avanzada',
    estado: 'Activa'
  },
];

/**
 * Página de gestión de recetas.
 */
const GestionRecetasPage: React.FC = () => {
  const [recetas, setRecetas] = React.useState<Receta[]>(recetasIniciales);
  const [filteredRecetas, setFilteredRecetas] = React.useState<Receta[]>(recetasIniciales);
  const [recetaSeleccionada, setRecetaSeleccionada] = React.useState<Receta | null>(null);
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar' | 'ver'>('crear');
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [selectedCategoria, setSelectedCategoria] = React.useState<string>('todas');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const rowsPerPage = 5;

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

  const handleEditarReceta = (receta: Receta) => {
    setModalMode('editar');
    setRecetaSeleccionada(receta);
    onOpen();
  };

  const handleVerReceta = (receta: Receta) => {
    setModalMode('ver');
    setRecetaSeleccionada(receta);
    onOpen();
  };

  const cambiarEstadoReceta = (id: string, nuevoEstado: 'Activa' | 'Inactiva') => {
    setRecetas(recetas.map(receta => 
      receta.id === id ? { ...receta, estado: nuevoEstado } : receta
    ));
  };

  const renderEstado = (estado: string) => {
    switch (estado) {
      case 'Activa': return <Chip color="success" size="sm">{estado}</Chip>;
      case 'Inactiva': return <Chip color="danger" size="sm">{estado}</Chip>;
      default: return <Chip size="sm">{estado}</Chip>;
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
          />
          <Select 
            placeholder="Categoría"
            selectedKeys={selectedCategoria ? [selectedCategoria] : []}
            onSelectionChange={(keys) => setSelectedCategoria(Array.from(keys)[0] as string)}
            className="w-full md:w-40"
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
              onClose={onClose}
              onSave={(nuevaReceta) => {
                if (modalMode === 'crear') {
                  setRecetas([...recetas, { ...nuevaReceta, id: Date.now().toString() }]);
                } else if (modalMode === 'editar') {
                  setRecetas(recetas.map(r => r.id === nuevaReceta.id ? nuevaReceta : r));
                }
                onClose();
              }}
            />
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

interface DetalleRecetaProps {
  receta: Receta | null;
  mode: 'crear' | 'editar' | 'ver';
  onClose: () => void;
  onSave: (receta: Receta) => void;
}

const DetalleReceta: React.FC<DetalleRecetaProps> = ({ receta, mode, onClose, onSave }) => {
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
            receta={receta} 
            mode={mode}
            onSave={onSave} 
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="flat" onPress={onClose}>
          {mode === 'ver' ? 'Cerrar' : 'Cancelar'}
        </Button>
        {mode !== 'ver' && (
          <Button 
            color="primary" 
            onPress={() => {
              // En una implementación real, aquí se validaría y llamaría a onSave
              if (receta) { onSave(receta); }
            }}
          >
            {mode === 'crear' ? 'Crear Receta' : 'Guardar Cambios'}
          </Button>
        )}
      </ModalFooter>
    </>
  );
};

interface VistaRecetaProps {
  receta: Receta;
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
                <TableCell>{ingrediente.nombre}</TableCell>
                <TableCell>{ingrediente.cantidad} {ingrediente.unidad}</TableCell>
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
  receta: Receta | null;
  mode: 'crear' | 'editar';
  onSave: (receta: Receta) => void;
}

const FormularioReceta: React.FC<FormularioRecetaProps> = ({ receta, mode }) => {
  // En una implementación real, aquí se manejaría el estado del formulario.
  return (
    <div className="space-y-4">
      <Input
        label="Nombre"
        placeholder="Nombre de la receta"
        defaultValue={receta?.nombre}
      />
      
      <Textarea
        label="Descripción"
        placeholder="Descripción breve de la receta"
        defaultValue={receta?.descripcion}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Categoría"
          placeholder="Categoría de la receta"
          defaultValue={receta?.categoria}
        />
        <Input
          label="Asignatura"
          placeholder="Asignatura relacionada"
          defaultValue={receta?.asignatura}
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
          >
            Agregar Ingrediente
          </Button>
        </div>
        
        <Table aria-label="Ingredientes" removeWrapper>
          <TableHeader>
            <TableColumn>INGREDIENTE</TableColumn>
            <TableColumn>CANTIDAD</TableColumn>
            <TableColumn>UNIDAD</TableColumn>
            <TableColumn>ACCIONES</TableColumn>
          </TableHeader>
          <TableBody emptyContent="No hay ingredientes agregados">
            {(receta?.ingredientes ?? []).map((ingrediente, index) => (
              <TableRow key={ingrediente.id || index}>
                <TableCell>
                  <Input 
                    placeholder="Nombre del ingrediente"
                    defaultValue={ingrediente.nombre}
                    size="sm"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number"
                    placeholder="Cantidad"
                    defaultValue={ingrediente.cantidad.toString()}
                    size="sm"
                    min="0"
                    step="0.01"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    placeholder="Unidad"
                    defaultValue={ingrediente.unidad}
                    size="sm"
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    isIconOnly 
                    variant="light" 
                    size="sm"
                    color="danger"
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
        defaultValue={receta?.instrucciones}
        minRows={5}
      />
      
      <Select 
        label="Estado"
        defaultSelectedKeys={receta?.estado ? [receta.estado] : ['Activa']}
      >
        <SelectItem key="Activa">Activa</SelectItem>
        <SelectItem key="Inactiva">Inactiva</SelectItem>
      </Select>
    </div>
  );
};

export default GestionRecetasPage;