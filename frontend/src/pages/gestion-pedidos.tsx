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

/**
 * Interfaz para un pedido.
 */
interface Pedido {
  id: string;
  asignatura: string;
  profesor: string;
  fechaSolicitud: string;
  fechaClase: string;
  estado: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Entregado';
  items: {
    id: string;
    producto: string;
    cantidad: number;
    unidad: string;
  }[];
}

/**
 * Datos de ejemplo para los pedidos.
 */
const pedidosIniciales: Pedido[] = [
  {
    id: '1',
    asignatura: 'Panadería Básica',
    profesor: 'Juan Pérez',
    fechaSolicitud: '2025-03-10T14:20:00Z',
    fechaClase: '2025-03-15T09:00:00Z',
    estado: 'Pendiente',
    items: [
      { id: '1', producto: 'Harina', cantidad: 5, unidad: 'kg' },
      { id: '2', producto: 'Levadura', cantidad: 0.5, unidad: 'kg' },
      { id: '3', producto: 'Sal', cantidad: 0.2, unidad: 'kg' }
    ]
  },
  {
    id: '2',
    asignatura: 'Pastelería Avanzada',
    profesor: 'María González',
    fechaSolicitud: '2025-03-09T10:15:00Z',
    fechaClase: '2025-03-14T14:00:00Z',
    estado: 'Aprobado',
    items: [
      { id: '1', producto: 'Harina', cantidad: 3, unidad: 'kg' },
      { id: '2', producto: 'Azúcar', cantidad: 2, unidad: 'kg' },
      { id: '3', producto: 'Mantequilla', cantidad: 1.5, unidad: 'kg' },
      { id: '4', producto: 'Huevos', cantidad: 24, unidad: 'unidad' }
    ]
  },
  {
    id: '3',
    asignatura: 'Cocina Internacional',
    profesor: 'Pedro Sánchez',
    fechaSolicitud: '2025-03-08T16:30:00Z',
    fechaClase: '2025-03-13T10:00:00Z',
    estado: 'Entregado',
    items: [
      { id: '1', producto: 'Arroz', cantidad: 2, unidad: 'kg' },
      { id: '2', producto: 'Aceite de Oliva', cantidad: 1, unidad: 'l' },
      { id: '3', producto: 'Especias', cantidad: 0.5, unidad: 'kg' }
    ]
  },
  {
    id: '4',
    asignatura: 'Cocina Chilena',
    profesor: 'Ana Rodríguez',
    fechaSolicitud: '2025-03-07T11:45:00Z',
    fechaClase: '2025-03-12T14:00:00Z',
    estado: 'Rechazado',
    items: [
      { id: '1', producto: 'Carne', cantidad: 3, unidad: 'kg' },
      { id: '2', producto: 'Papas', cantidad: 2, unidad: 'kg' },
      { id: '3', producto: 'Cebolla', cantidad: 1, unidad: 'kg' }
    ]
  },
  {
    id: '5',
    asignatura: 'Técnicas de Conservación',
    profesor: 'Carlos Muñoz',
    fechaSolicitud: '2025-03-06T09:30:00Z',
    fechaClase: '2025-03-11T10:00:00Z',
    estado: 'Pendiente',
    items: [
      { id: '1', producto: 'Sal', cantidad: 2, unidad: 'kg' },
      { id: '2', producto: 'Azúcar', cantidad: 1.5, unidad: 'kg' },
      { id: '3', producto: 'Vinagre', cantidad: 2, unidad: 'l' }
    ]
  }
];

/**
 * Página de gestión de pedidos.
 * Permite gestionar los pedidos de insumos realizados por los profesores.
 * 
 * @returns {JSX.Element} La página de gestión de pedidos.
 */
const GestionPedidosPage: React.FC = () => {
  const [pedidos, setPedidos] = React.useState<Pedido[]>(pedidosIniciales);
  const [filteredPedidos, setFilteredPedidos] = React.useState<Pedido[]>(pedidosIniciales);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [selectedEstado, setSelectedEstado] = React.useState<string>('todos');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pedidoSeleccionado, setPedidoSeleccionado] = React.useState<Pedido | null>(null);
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const rowsPerPage = 5;

  /**
   * Filtra los pedidos según los criterios de búsqueda.
   */
  React.useEffect(() => {
    let filtered = [...pedidos];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(pedido => 
        pedido.asignatura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.profesor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por estado
    if (selectedEstado !== 'todos') {
      filtered = filtered.filter(pedido => pedido.estado === selectedEstado);
    }
    
    setFilteredPedidos(filtered);
    setCurrentPage(1); // Resetear a la primera página al filtrar
  }, [searchTerm, selectedEstado, pedidos]);

  /**
   * Calcula los pedidos a mostrar en la página actual.
   */
  const paginatedPedidos = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredPedidos.slice(start, end);
  }, [currentPage, filteredPedidos, rowsPerPage]);

  /**
   * Abre el modal para ver los detalles de un pedido.
   * 
   * @param {Pedido} pedido - Pedido a ver.
   */
  const verDetallePedido = (pedido: Pedido) => {
    setPedidoSeleccionado(pedido);
    onOpen();
  };

  /**
   * Cambia el estado de un pedido.
   * 
   * @param {string} id - ID del pedido.
   * @param {'Pendiente' | 'Aprobado' | 'Rechazado' | 'Entregado'} nuevoEstado - Nuevo estado.
   */
  const cambiarEstadoPedido = (id: string, nuevoEstado: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Entregado') => {
    setPedidos(pedidos.map(pedido => 
      pedido.id === id ? { ...pedido, estado: nuevoEstado } : pedido
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
   * Renderiza un chip con el color correspondiente al estado del pedido.
   * 
   * @param {string} estado - Estado del pedido.
   * @returns {JSX.Element} Chip con el estado del pedido.
   */
  const renderEstado = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return <Chip color="warning" size="sm">{estado}</Chip>;
      case 'Aprobado':
        return <Chip color="primary" size="sm">{estado}</Chip>;
      case 'Rechazado':
        return <Chip color="danger" size="sm">{estado}</Chip>;
      case 'Entregado':
        return <Chip color="success" size="sm">{estado}</Chip>;
      default:
        return <Chip size="sm">{estado}</Chip>;
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
        {/* Encabezado (sin cambios) */}
        <div>
          <h1 className="text-2xl font-bold mb-2">Gestión de Pedidos</h1>
          <p className="text-default-500">
            Administre los pedidos de insumos realizados por los profesores.
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Buscar pedidos..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            startContent={<Icon icon="lucide:search" className="text-default-400" />}
            className="w-full md:w-64"
          />
          
          {/* ================================================================= */}
          {/* CORRECCIÓN #1: Ajustar el componente Select a la API de HeroUI */}
          {/* ================================================================= */}
          <Select 
            placeholder="Estado"
            selectedKeys={selectedEstado ? [selectedEstado] : []}
            onSelectionChange={(keys) => setSelectedEstado(Array.from(keys)[0] as string)}
            className="w-full md:w-40"
          >
            <SelectItem key="todos">Todos los estados</SelectItem>
            <SelectItem key="Pendiente">Pendiente</SelectItem>
            <SelectItem key="Aprobado">Aprobado</SelectItem>
            <SelectItem key="Rechazado">Rechazado</SelectItem>
            <SelectItem key="Entregado">Entregado</SelectItem>
          </Select>
        </div>

        {/* Tabla de pedidos */}
        <Card className="shadow-sm">
          <CardBody className="p-0">
            <Table 
              aria-label="Tabla de pedidos"
              removeWrapper
              bottomContent={
                <div className="flex w-full justify-center">
                  <Pagination
                    total={Math.ceil(filteredPedidos.length / rowsPerPage)}
                    page={currentPage}
                    onChange={setCurrentPage}
                    showControls
                  />
                </div>
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
              <TableBody emptyContent="No se encontraron pedidos">
                {paginatedPedidos.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell>{pedido.asignatura}</TableCell>
                    <TableCell>{pedido.profesor}</TableCell>
                    <TableCell>{formatearFecha(pedido.fechaSolicitud)}</TableCell>
                    <TableCell>{formatearFecha(pedido.fechaClase)}</TableCell>
                    <TableCell>{renderEstado(pedido.estado)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          isIconOnly 
                          variant="light" 
                          size="sm"
                          onPress={() => verDetallePedido(pedido)}
                        >
                          <Icon icon="lucide:eye" className="text-primary" />
                        </Button>

                        {/* =============================================================== */}
                        {/* CORRECCIÓN #2: Usar el Dropdown real con lógica centralizada */}
                        {/* =============================================================== */}
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
                            aria-label="Acciones de pedido"
                            onAction={(key) => {
                                if (key === 'aprobar') cambiarEstadoPedido(pedido.id, 'Aprobado');
                                if (key === 'rechazar') cambiarEstadoPedido(pedido.id, 'Rechazado');
                                if (key === 'entregar') cambiarEstadoPedido(pedido.id, 'Entregado');
                            }}
                          >
                            <DropdownItem 
                              key="aprobar" 
                              startContent={<Icon icon="lucide:check" className="text-primary" />}
                              isDisabled={pedido.estado === 'Aprobado' || pedido.estado === 'Entregado'}
                            >
                              Aprobar
                            </DropdownItem>
                            <DropdownItem 
                              key="rechazar" 
                              startContent={<Icon icon="lucide:x" className="text-danger" />}
                              isDisabled={pedido.estado === 'Rechazado' || pedido.estado === 'Entregado'}
                            >
                              Rechazar
                            </DropdownItem>
                            <DropdownItem 
                              key="entregar" 
                              startContent={<Icon icon="lucide:package" className="text-success" />}
                              isDisabled={pedido.estado !== 'Aprobado'}
                            >
                              Marcar como Entregado
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

      {/* Modal de detalle de pedido */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Detalle del Pedido</ModalHeader>
              <ModalBody>
                {pedidoSeleccionado && (
                  <div className="space-y-6">
                    {/* Información general */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-default-500">Asignatura</p>
                        <p className="font-semibold">{pedidoSeleccionado.asignatura}</p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Profesor</p>
                        <p className="font-semibold">{pedidoSeleccionado.profesor}</p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Fecha de Solicitud</p>
                        <p className="font-semibold">{formatearFecha(pedidoSeleccionado.fechaSolicitud)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Fecha de Clase</p>
                        <p className="font-semibold">{formatearFecha(pedidoSeleccionado.fechaClase)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Estado</p>
                        <div>{renderEstado(pedidoSeleccionado.estado)}</div>
                      </div>
                    </div>
                    
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
                        </TableHeader>
                        <TableBody>
                          {pedidoSeleccionado.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.producto}</TableCell>
                              <TableCell>{item.cantidad} {item.unidad}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Acciones según estado */}
                    {pedidoSeleccionado.estado === 'Pendiente' && (
                      <div className="flex gap-2 justify-end">
                        <Button 
                          color="danger" 
                          variant="flat"
                          onPress={() => {
                            cambiarEstadoPedido(pedidoSeleccionado.id, 'Rechazado');
                            onClose();
                          }}
                        >
                          Rechazar
                        </Button>
                        <Button 
                          color="primary"
                          onPress={() => {
                            cambiarEstadoPedido(pedidoSeleccionado.id, 'Aprobado');
                            onClose();
                          }}
                        >
                          Aprobar
                        </Button>
                      </div>
                    )}
                    
                    {pedidoSeleccionado.estado === 'Aprobado' && (
                      <div className="flex justify-end">
                        <Button 
                          color="success"
                          onPress={() => {
                            cambiarEstadoPedido(pedidoSeleccionado.id, 'Entregado');
                            onClose();
                          }}
                        >
                          Marcar como Entregado
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
