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
  useDisclosure
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Interfaz para un producto del proveedor.
 */
interface ProductoProveedor {
  id: string;
  nombre: string;
  precio: number;
  unidad: string;
  disponible: boolean;
  fechaActualizacion: string;
}

/**
 * Interfaz para un proveedor.
 */
interface Proveedor {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  estado: 'Activo' | 'Inactivo';
  productos: ProductoProveedor[];
}

/**
 * Datos de ejemplo para los proveedores con productos.
 */
const proveedoresIniciales: Proveedor[] = [
  {
    id: '1',
    nombre: 'Distribuidora Central',
    contacto: 'Juan Pérez',
    telefono: '+56 9 1234 5678',
    email: 'contacto@distribuidoracentral.cl',
    direccion: 'Av. Principal 123, Santiago',
    estado: 'Activo',
    productos: [
      { id: '1-1', nombre: 'Harina', precio: 1200, unidad: 'kg', disponible: true, fechaActualizacion: '2025-01-15' },
      { id: '1-2', nombre: 'Azúcar', precio: 800, unidad: 'kg', disponible: true, fechaActualizacion: '2025-01-15' },
      { id: '1-3', nombre: 'Sal', precio: 400, unidad: 'kg', disponible: true, fechaActualizacion: '2025-01-10' },
      { id: '1-4', nombre: 'Levadura', precio: 3500, unidad: 'kg', disponible: false, fechaActualizacion: '2025-01-12' }
    ]
  },
  {
    id: '2',
    nombre: 'Importadora Mediterránea',
    contacto: 'María González',
    telefono: '+56 9 8765 4321',
    email: 'ventas@mediterranea.cl',
    direccion: 'Calle Comercio 456, Viña del Mar',
    estado: 'Activo',
    productos: [
      { id: '2-1', nombre: 'Aceite de Oliva', precio: 8500, unidad: 'litro', disponible: true, fechaActualizacion: '2025-01-14' },
      { id: '2-2', nombre: 'Aceite de Girasol', precio: 2800, unidad: 'litro', disponible: true, fechaActualizacion: '2025-01-14' },
      { id: '2-3', nombre: 'Vinagre Balsámico', precio: 4500, unidad: 'litro', disponible: true, fechaActualizacion: '2025-01-13' }
    ]
  },
  {
    id: '3',
    nombre: 'Lácteos del Sur',
    contacto: 'Pedro Sánchez',
    telefono: '+56 9 2345 6789',
    email: 'contacto@lacteosdelsur.cl',
    direccion: 'Ruta 5 Sur Km 10, Osorno',
    estado: 'Activo',
    productos: [
      { id: '3-1', nombre: 'Leche', precio: 950, unidad: 'litro', disponible: true, fechaActualizacion: '2025-01-16' },
      { id: '3-2', nombre: 'Mantequilla', precio: 5200, unidad: 'kg', disponible: true, fechaActualizacion: '2025-01-16' },
      { id: '3-3', nombre: 'Crema', precio: 3800, unidad: 'litro', disponible: true, fechaActualizacion: '2025-01-15' },
      { id: '3-4', nombre: 'Queso Fresco', precio: 4500, unidad: 'kg', disponible: false, fechaActualizacion: '2025-01-10' }
    ]
  },
  {
    id: '4',
    nombre: 'Granja Avícola',
    contacto: 'Ana Rodríguez',
    telefono: '+56 9 3456 7890',
    email: 'ventas@granjaavicola.cl',
    direccion: 'Camino Rural 78, Melipilla',
    estado: 'Activo',
    productos: [
      { id: '4-1', nombre: 'Huevos', precio: 180, unidad: 'unidad', disponible: true, fechaActualizacion: '2025-01-16' },
      { id: '4-2', nombre: 'Pollo Entero', precio: 3200, unidad: 'kg', disponible: true, fechaActualizacion: '2025-01-16' }
    ]
  },
  {
    id: '5',
    nombre: 'Carnes Premium',
    contacto: 'Carlos Muñoz',
    telefono: '+56 9 4567 8901',
    email: 'contacto@carnespremium.cl',
    direccion: 'Av. Industrial 234, Rancagua',
    estado: 'Inactivo',
    productos: [
      { id: '5-1', nombre: 'Carne de Res', precio: 8500, unidad: 'kg', disponible: false, fechaActualizacion: '2025-01-05' },
      { id: '5-2', nombre: 'Carne de Cerdo', precio: 6800, unidad: 'kg', disponible: false, fechaActualizacion: '2025-01-05' }
    ]
  }
];

/**
 * Renderiza un chip con el color correspondiente al estado del proveedor.
 */
const renderEstado = (estado: string) => {
  switch (estado) {
    case 'Activo':
      return <Chip color="success" size="sm">{estado}</Chip>;
    case 'Inactivo':
      return <Chip color="danger" size="sm">{estado}</Chip>;
    default:
      return <Chip size="sm">{estado}</Chip>;
  }
};

/**
 * Renderiza un chip con el estado de disponibilidad del producto.
 */
const renderDisponibilidad = (disponible: boolean) => {
  return disponible ?
    <Chip color="success" size="sm">Disponible</Chip> :
    <Chip color="warning" size="sm">No Disponible</Chip>;
};

/**
 * Página de gestión de proveedores.
 */
const GestionProveedoresPage: React.FC = () => {
  const [proveedores, setProveedores] = React.useState<Proveedor[]>(proveedoresIniciales);
  const [filteredProveedores, setFilteredProveedores] = React.useState<Proveedor[]>(proveedoresIniciales);
  const [proveedorSeleccionado, setProveedorSeleccionado] = React.useState<Proveedor | null>(null);
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar' | 'ver'>('crear');
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const rowsPerPage = 5;

  /**
   * Filtra los proveedores según los criterios de búsqueda.
   */
  React.useEffect(() => {
    let filtered = [...proveedores];

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(proveedor =>
        proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proveedor.contacto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proveedor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proveedor.productos.some(producto =>
          producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    setFilteredProveedores(filtered);
    setCurrentPage(1);
  }, [searchTerm, proveedores]);

  /**
   * Calcula los proveedores a mostrar en la página actual.
   */
  const paginatedProveedores = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredProveedores.slice(start, end);
  }, [currentPage, filteredProveedores, rowsPerPage]);

  /**
   * Toggle la expansión de una fila
   */
  const toggleRowExpansion = (proveedorId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(proveedorId)) {
      newExpanded.delete(proveedorId);
    } else {
      newExpanded.add(proveedorId);
    }
    setExpandedRows(newExpanded);
  };

  /**
   * Abre el modal para crear un nuevo proveedor.
   */
  const handleNuevoProveedor = () => {
    setModalMode('crear');
    setProveedorSeleccionado(null);
    onOpen();
  };

  /**
   * Abre el modal para editar un proveedor existente.
   */
  const handleEditarProveedor = (proveedor: Proveedor) => {
    setModalMode('editar');
    setProveedorSeleccionado(proveedor);
    onOpen();
  };

  /**
   * Abre el modal para ver los detalles de un proveedor.
   */
  const handleVerProveedor = (proveedor: Proveedor) => {
    setModalMode('ver');
    setProveedorSeleccionado(proveedor);
    onOpen();
  };

  /**
   * Cambia el estado de un proveedor.
   */
  const cambiarEstadoProveedor = (id: string, nuevoEstado: 'Activo' | 'Inactivo') => {
    setProveedores(proveedores.map(proveedor =>
      proveedor.id === id ? { ...proveedor, estado: nuevoEstado } : proveedor
    ));
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-default-200 dark:border-default-100 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary dark:text-foreground mb-2">Gestión de Proveedores</h1>
            <p className="text-default-500 text-lg">
              Administre los proveedores y sus productos con precios actualizados.
            </p>
          </div>
          <Button
            color="primary"
            variant="solid"
            className="font-bold text-secondary shadow-md"
            startContent={<Icon icon="lucide:plus" width={20} />}
            onPress={handleNuevoProveedor}
          >
            Nuevo Proveedor
          </Button>
        </div>

        {/* Filtros */}
        <Card className="shadow-sm bg-default-50 dark:bg-content1 border border-default-200 dark:border-default-100">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                placeholder="Buscar proveedores, contactos o productos..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                startContent={<Icon icon="lucide:search" className="text-default-400" />}
                className="w-full md:w-1/3"
                variant="bordered"
                classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                isClearable
                onClear={() => setSearchTerm('')}
              />
            </div>
          </CardBody>
        </Card>

        {/* Cards de proveedores en lugar de tabla */}
        <div className="space-y-4">
          {paginatedProveedores.map((proveedor) => (
            <Card key={proveedor.id} className="shadow-md border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
              <CardBody className="p-0">
                {/* Fila principal del proveedor */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-default-100 dark:border-default-50 gap-4">
                  <div className="flex items-center gap-4">
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => toggleRowExpansion(proveedor.id)}
                    >
                      <Icon
                        icon={expandedRows.has(proveedor.id) ? "lucide:chevron-down" : "lucide:chevron-right"}
                        className="text-default-400"
                      />
                    </Button>
                    <div>
                      <h3 className="font-bold text-lg text-secondary">{proveedor.nombre}</h3>
                      <div className="flex items-center gap-2 text-sm text-default-500 mt-1">
                        <Icon icon="lucide:user" width={14} />
                        <span>{proveedor.contacto}</span>
                        <span className="text-default-300">•</span>
                        <Icon icon="lucide:phone" width={14} />
                        <span>{proveedor.telefono}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Chip color="primary" size="sm">
                      {proveedor.productos.length} productos
                    </Chip>
                    {renderEstado(proveedor.estado)}
                    <div className="flex gap-2">
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => handleVerProveedor(proveedor)}
                      >
                        <Icon icon="lucide:eye" className="text-primary" />

                      </Button>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => handleEditarProveedor(proveedor)}
                        className="text-default-400 hover:text-secondary"
                      >
                        <Icon icon="lucide:edit" width={18} />
                      </Button>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => cambiarEstadoProveedor(
                          proveedor.id,
                          proveedor.estado === 'Activo' ? 'Inactivo' : 'Activo'
                        )}
                        className={proveedor.estado === 'Activo' ? 'text-default-400 hover:text-danger' : 'text-default-400 hover:text-success'}
                      >
                        <Icon
                          icon={proveedor.estado === 'Activo' ? 'lucide:x-circle' : 'lucide:check-circle'}
                          width={18}
                        />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Sección expandible con productos */}
                <AnimatePresence>
                  {expandedRows.has(proveedor.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-default-50 dark:bg-default-100/30">
                        <h4 className="font-semibold mb-3 text-sm">Productos y Precios</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-default-200 dark:border-default-100">
                                <th className="text-left py-2 px-2 font-medium">Producto</th>
                                <th className="text-left py-2 px-2 font-medium">Precio</th>
                                <th className="text-left py-2 px-2 font-medium">Unidad</th>
                                <th className="text-left py-2 px-2 font-medium">Disponibilidad</th>
                                <th className="text-left py-2 px-2 font-medium">Actualizado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {proveedor.productos.map((producto) => (
                                <tr key={producto.id} className="border-b border-default-100 last:border-b-0">
                                  <td className="py-2 px-2 font-medium">{producto.nombre}</td>
                                  <td className="py-2 px-2">${producto.precio.toLocaleString('es-CL')}</td>
                                  <td className="py-2 px-2">{producto.unidad}</td>
                                  <td className="py-2 px-2">{renderDisponibilidad(producto.disponible)}</td>
                                  <td className="py-2 px-2 text-default-500">{producto.fechaActualizacion}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Paginación */}
        {
          filteredProveedores.length > rowsPerPage && (
            <div className="flex w-full justify-center">
              <Pagination
                total={Math.ceil(filteredProveedores.length / rowsPerPage)}
                page={currentPage}
                onChange={setCurrentPage}
                showControls
                color="primary"
              />
            </div>
          )
        }
      </motion.div >

      {/* Modal para crear/editar/ver proveedor */}
      < Modal isOpen={isOpen} onOpenChange={onOpenChange} size="xl" >
        <ModalContent>
          {(onClose) => (
            <FormularioProveedor
              proveedor={proveedorSeleccionado}
              mode={modalMode}
              onClose={onClose}
              onSave={(nuevoProveedor) => {
                if (modalMode === 'crear') {
                  setProveedores([...proveedores, { ...nuevoProveedor, id: Date.now().toString() }]);
                } else if (modalMode === 'editar') {
                  setProveedores(proveedores.map(p => p.id === nuevoProveedor.id ? nuevoProveedor : p));
                }
                onClose();
              }}
            />
          )}
        </ModalContent>
      </Modal >
    </div >
  );
};

/**
 * Componente de formulario para crear, editar o ver un proveedor.
 */
interface FormularioProveedorProps {
  proveedor: Proveedor | null;
  mode: 'crear' | 'editar' | 'ver';
  onClose: () => void;
  onSave: (proveedor: Proveedor) => void;
}

const FormularioProveedor: React.FC<FormularioProveedorProps> = ({ proveedor, mode, onClose, onSave }) => {
  const [nombre, setNombre] = React.useState<string>(proveedor?.nombre || '');
  const [contacto, setContacto] = React.useState<string>(proveedor?.contacto || '');
  const [telefono, setTelefono] = React.useState<string>(proveedor?.telefono || '');
  const [email, setEmail] = React.useState<string>(proveedor?.email || '');
  const [direccion, setDireccion] = React.useState<string>(proveedor?.direccion || '');
  const [estado, setEstado] = React.useState<'Activo' | 'Inactivo'>(proveedor?.estado || 'Activo');
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = () => {
    if (!nombre.trim() || !contacto.trim() || !telefono.trim() || !email.trim() || !direccion.trim()) {
      setError('Todos los campos son obligatorios');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('El correo electrónico no es válido');
      return;
    }

    onSave({
      id: proveedor?.id || '',
      nombre: nombre.trim(),
      contacto: contacto.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      direccion: direccion.trim(),
      estado,
      productos: proveedor?.productos || []
    });
  };

  return (
    <>
      <ModalHeader className="border-b border-default-100 dark:border-default-50 bg-secondary-50 dark:bg-secondary-50/10">
        <div className="flex items-center gap-2">
          <Icon icon={mode === 'crear' ? 'lucide:plus-circle' : mode === 'editar' ? 'lucide:edit-3' : 'lucide:building-2'} className="text-secondary dark:text-secondary-400" width={24} />
          <span className="font-bold text-lg text-secondary dark:text-foreground">
            {mode === 'crear' ? 'Nuevo Proveedor' : mode === 'editar' ? 'Editar Proveedor' : 'Detalles del Proveedor'}
          </span>
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          {error && (
            <div className="bg-danger-100 text-danger p-3 rounded-md text-sm">
              <Icon icon="lucide:alert-circle" className="inline-block mr-2" />
              {error}
            </div>
          )}

          <Input
            label="Nombre"
            placeholder="Nombre del proveedor"
            value={nombre}
            onValueChange={setNombre}
            isReadOnly={mode === 'ver'}
            variant="bordered"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Contacto"
              placeholder="Nombre del contacto"
              value={contacto}
              onValueChange={setContacto}
              isReadOnly={mode === 'ver'}
              variant="bordered"
            />
            <Input
              label="Teléfono"
              placeholder="Teléfono de contacto"
              value={telefono}
              onValueChange={setTelefono}
              isReadOnly={mode === 'ver'}
              variant="bordered"
            />
          </div>

          <Input
            label="Email"
            placeholder="Correo electrónico"
            value={email}
            onValueChange={setEmail}
            isReadOnly={mode === 'ver'}
          />

          <Input
            label="Dirección"
            placeholder="Dirección del proveedor"
            value={direccion}
            onValueChange={setDireccion}
            isReadOnly={mode === 'ver'}
          />

          {mode === 'ver' && (
            <div>
              <p className="text-sm mb-1 font-medium">Estado</p>
              {renderEstado(estado)}
            </div>
          )}

          {/* Mostrar productos en modo ver */}
          {mode === 'ver' && proveedor?.productos && proveedor.productos.length > 0 && (
            <div>
              <p className="text-sm mb-2 font-medium">Productos ({proveedor.productos.length})</p>
              <div className="max-h-60 overflow-y-auto border rounded-md border-default-200 dark:border-default-100">
                <table className="w-full text-sm">
                  <thead className="bg-default-100 dark:bg-default-50 sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium">Producto</th>
                      <th className="text-left py-2 px-3 font-medium">Precio</th>
                      <th className="text-left py-2 px-3 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveedor.productos.map((producto) => (
                      <tr key={producto.id} className="border-b border-default-100 dark:border-default-50 last:border-b-0">
                        <td className="py-2 px-3">{producto.nombre}</td>
                        <td className="py-2 px-3">${producto.precio.toLocaleString('es-CL')} / {producto.unidad}</td>
                        <td className="py-2 px-3">{renderDisponibilidad(producto.disponible)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter className="bg-default-50 dark:bg-content2 border-t border-default-100 dark:border-default-50">
        <Button variant="ghost" onPress={onClose} className="font-medium">
          {mode === 'ver' ? 'Cerrar' : 'Cancelar'}
        </Button>
        {mode !== 'ver' && (
          <Button
            color="primary"
            variant="solid"
            onPress={handleSubmit}
            className="font-bold text-secondary shadow-md"
            startContent={<Icon icon="lucide:save" />}
          >
            {mode === 'crear' ? 'Crear Proveedor' : 'Guardar Cambios'}
          </Button>
        )}
      </ModalFooter>
    </>
  );
};

export default GestionProveedoresPage;