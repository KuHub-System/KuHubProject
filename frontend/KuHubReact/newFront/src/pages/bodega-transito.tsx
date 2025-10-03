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
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  SelectItem,
  Select
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

/**
 * Interfaz para un producto en tránsito.
 */
interface ProductoTransito {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  fechaIngreso: string;
  fechaEstimadaSalida: string;
  proveedor: string;
  estado: 'En Tránsito' | 'Recibido' | 'Procesado' | 'Cancelado';
  observaciones: string;
}

/**
 * Datos de ejemplo para los productos en tránsito.
 */
const productosTransitoIniciales: ProductoTransito[] = [
  {
    id: '1',
    nombre: 'Harina',
    cantidad: 50,
    unidad: 'kg',
    fechaIngreso: '2025-03-10T14:20:00Z',
    fechaEstimadaSalida: '2025-03-15T09:00:00Z',
    proveedor: 'Distribuidora Central',
    estado: 'En Tránsito',
    observaciones: 'Pedido semanal'
  },
  {
    id: '2',
    nombre: 'Azúcar',
    cantidad: 30,
    unidad: 'kg',
    fechaIngreso: '2025-03-09T10:15:00Z',
    fechaEstimadaSalida: '2025-03-14T14:00:00Z',
    proveedor: 'Distribuidora Central',
    estado: 'Recibido',
    observaciones: 'Pedido mensual'
  },
  {
    id: '3',
    nombre: 'Aceite de Oliva',
    cantidad: 20,
    unidad: 'l',
    fechaIngreso: '2025-03-08T16:30:00Z',
    fechaEstimadaSalida: '2025-03-13T10:00:00Z',
    proveedor: 'Importadora Mediterránea',
    estado: 'Procesado',
    observaciones: 'Pedido especial'
  },
  {
    id: '4',
    nombre: 'Huevos',
    cantidad: 500,
    unidad: 'unidad',
    fechaIngreso: '2025-03-07T11:45:00Z',
    fechaEstimadaSalida: '2025-03-12T14:00:00Z',
    proveedor: 'Granja Avícola',
    estado: 'Cancelado',
    observaciones: 'Cancelado por calidad'
  },
  {
    id: '5',
    nombre: 'Leche',
    cantidad: 40,
    unidad: 'l',
    fechaIngreso: '2025-03-06T09:30:00Z',
    fechaEstimadaSalida: '2025-03-11T10:00:00Z',
    proveedor: 'Lácteos del Sur',
    estado: 'En Tránsito',
    observaciones: 'Pedido urgente'
  },
  {
    id: '6',
    nombre: 'Mantequilla',
    cantidad: 15,
    unidad: 'kg',
    fechaIngreso: '2025-03-05T15:20:00Z',
    fechaEstimadaSalida: '2025-03-10T09:00:00Z',
    proveedor: 'Lácteos del Sur',
    estado: 'Recibido',
    observaciones: 'Pedido regular'
  }
];

/**
 * Página de bodega de tránsito.
 * Permite gestionar los productos que están en proceso de recepción.
 * 
 * @returns {JSX.Element} La página de bodega de tránsito.
 */
const BodegaTransitoPage: React.FC = () => {
  const [productos, setProductos] = React.useState<ProductoTransito[]>(productosTransitoIniciales);
  const [filteredProductos, setFilteredProductos] = React.useState<ProductoTransito[]>(productosTransitoIniciales);
  const [productoSeleccionado, setProductoSeleccionado] = React.useState<ProductoTransito | null>(null);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [selectedEstado, setSelectedEstado] = React.useState<string>('todos');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const rowsPerPage = 5;

  /**
   * Filtra los productos según los criterios de búsqueda.
   */
  React.useEffect(() => {
    let filtered = [...productos];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(producto => 
        producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.proveedor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por estado
    if (selectedEstado !== 'todos') {
      filtered = filtered.filter(producto => producto.estado === selectedEstado);
    }
    
    setFilteredProductos(filtered);
    setCurrentPage(1); // Resetear a la primera página al filtrar
  }, [searchTerm, selectedEstado, productos]);

  /**
   * Calcula los productos a mostrar en la página actual.
   */
  const paginatedProductos = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredProductos.slice(start, end);
  }, [currentPage, filteredProductos, rowsPerPage]);

  /**
   * Abre el modal para ver los detalles de un producto.
   * 
   * @param {ProductoTransito} producto - Producto a ver.
   */
  const verDetalleProducto = (producto: ProductoTransito) => {
    setProductoSeleccionado(producto);
    onOpen();
  };

  /**
   * Cambia el estado de un producto.
   * 
   * @param {string} id - ID del producto.
   * @param {'En Tránsito' | 'Recibido' | 'Procesado' | 'Cancelado'} nuevoEstado - Nuevo estado.
   */
  const cambiarEstadoProducto = (id: string, nuevoEstado: 'En Tránsito' | 'Recibido' | 'Procesado' | 'Cancelado') => {
    setProductos(productos.map(producto => 
      producto.id === id ? { ...producto, estado: nuevoEstado } : producto
    ));
  };

  /**
   * Formatea una fecha ISO a una cadena legible.
   * 
   * @param {string} fechaISO - Fecha en formato ISO.
   * @returns {string} Fecha formateada.
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
   * Renderiza un chip con el color correspondiente al estado del producto.
   * 
   * @param {string} estado - Estado del producto.
   * @returns {JSX.Element} Chip con el estado del producto.
   */
  const renderEstado = (estado: string) => {
    switch (estado) {
      case 'En Tránsito':
        return <Chip color="warning" size="sm">{estado}</Chip>;
      case 'Recibido':
        return <Chip color="primary" size="sm">{estado}</Chip>;
      case 'Procesado':
        return <Chip color="success" size="sm">{estado}</Chip>;
      case 'Cancelado':
        return <Chip color="danger" size="sm">{estado}</Chip>;
      default:
        return <Chip size="sm">{estado}</Chip>;
    }
  };

  return (
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-bold mb-2">Bodega de Tránsito</h1>
          <p className="text-default-500">
            Gestione los productos en proceso de recepción.
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            startContent={<Icon icon="lucide:search" className="text-default-400" />}
            className="w-full md:w-64"
          />
          
          <Select 
            placeholder="Estado"
            selectedKeys={selectedEstado ? [selectedEstado] : []}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="w-full md:w-40"
          >
            <SelectItem key="todos">Todos los estados</SelectItem>
            <SelectItem key="En Tránsito">En Tránsito</SelectItem>
            <SelectItem key="Recibido">Recibido</SelectItem>
            <SelectItem key="Procesado">Procesado</SelectItem>
            <SelectItem key="Cancelado">Cancelado</SelectItem>
          </Select>
        </div>

        {/* Tabla de productos */}
        <Card className="shadow-sm">
          <CardBody className="p-0">
            <Table 
              aria-label="Tabla de productos en tránsito"
              removeWrapper
              bottomContent={
                <div className="flex w-full justify-center">
                  <Pagination
                    total={Math.ceil(filteredProductos.length / rowsPerPage)}
                    page={currentPage}
                    onChange={setCurrentPage}
                    showControls
                  />
                </div>
              }
            >
              <TableHeader>
                <TableColumn>PRODUCTO</TableColumn>
                <TableColumn>CANTIDAD</TableColumn>
                <TableColumn>PROVEEDOR</TableColumn>
                <TableColumn>FECHA INGRESO</TableColumn>
                <TableColumn>FECHA EST. SALIDA</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No se encontraron productos en tránsito">
                {paginatedProductos.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell>{producto.nombre}</TableCell>
                    <TableCell>{producto.cantidad} {producto.unidad}</TableCell>
                    <TableCell>{producto.proveedor}</TableCell>
                    <TableCell>{formatearFecha(producto.fechaIngreso)}</TableCell>
                    <TableCell>{formatearFecha(producto.fechaEstimadaSalida)}</TableCell>
                    <TableCell>{renderEstado(producto.estado)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          isIconOnly 
                          variant="light" 
                          size="sm"
                          onPress={() => verDetalleProducto(producto)}
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
                          <DropdownMenu aria-label="Acciones de producto">
                            <DropdownItem 
                              key="recibir" 
                              startContent={<Icon icon="lucide:check" className="text-primary" />}
                              onPress={() => cambiarEstadoProducto(producto.id, 'Recibido')}
                              isDisabled={producto.estado !== 'En Tránsito'}
                            >
                              Marcar como Recibido
                            </DropdownItem>
                            <DropdownItem 
                              key="procesar" 
                              startContent={<Icon icon="lucide:check-circle" className="text-success" />}
                              onPress={() => cambiarEstadoProducto(producto.id, 'Procesado')}
                              isDisabled={producto.estado !== 'Recibido'}
                            >
                              Marcar como Procesado
                            </DropdownItem>
                            <DropdownItem 
                              key="cancelar" 
                              startContent={<Icon icon="lucide:x" className="text-danger" />}
                              onPress={() => cambiarEstadoProducto(producto.id, 'Cancelado')}
                              isDisabled={producto.estado === 'Procesado' || producto.estado === 'Cancelado'}
                            >
                              Cancelar
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

      {/* Modal de detalle de producto */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Detalle del Producto en Tránsito</ModalHeader>
              <ModalBody>
                {productoSeleccionado && (
                  <div className="space-y-6">
                    {/* Información general */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-default-500">Producto</p>
                        <p className="font-semibold">{productoSeleccionado.nombre}</p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Cantidad</p>
                        <p className="font-semibold">{productoSeleccionado.cantidad} {productoSeleccionado.unidad}</p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Proveedor</p>
                        <p className="font-semibold">{productoSeleccionado.proveedor}</p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Estado</p>
                        <div>{renderEstado(productoSeleccionado.estado)}</div>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Fecha de Ingreso</p>
                        <p className="font-semibold">{formatearFecha(productoSeleccionado.fechaIngreso)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Fecha Estimada de Salida</p>
                        <p className="font-semibold">{formatearFecha(productoSeleccionado.fechaEstimadaSalida)}</p>
                      </div>
                    </div>
                    
                    <Divider />
                    
                    {/* Observaciones */}
                    <div>
                      <p className="text-sm text-default-500 mb-1">Observaciones</p>
                      <p>{productoSeleccionado.observaciones || 'Sin observaciones'}</p>
                    </div>
                    
                    {/* Acciones según estado */}
                    {productoSeleccionado.estado === 'En Tránsito' && (
                      <div className="flex gap-2 justify-end">
                        <Button 
                          color="primary"
                          onPress={() => {
                            cambiarEstadoProducto(productoSeleccionado.id, 'Recibido');
                            onClose();
                          }}
                        >
                          Marcar como Recibido
                        </Button>
                      </div>
                    )}
                    
                    {productoSeleccionado.estado === 'Recibido' && (
                      <div className="flex gap-2 justify-end">
                        <Button 
                          color="success"
                          onPress={() => {
                            cambiarEstadoProducto(productoSeleccionado.id, 'Procesado');
                            onClose();
                          }}
                        >
                          Marcar como Procesado
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




export default BodegaTransitoPage;