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
  CardHeader,
  Input,
  Chip,
  Divider
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

/**
 * Interfaz para un producto conglomerado.
 */
interface ProductoConglomerado {
  id: string;
  nombre: string;
  cantidadTotal: number;
  unidad: string;
  pedidos: number;
  prioridad: 'Alta' | 'Media' | 'Baja';
}

/**
 * Datos de ejemplo para los productos conglomerados.
 */
const productosConglomerados: ProductoConglomerado[] = [
  {
    id: '1',
    nombre: 'Harina',
    cantidadTotal: 25,
    unidad: 'kg',
    pedidos: 5,
    prioridad: 'Alta'
  },
  {
    id: '2',
    nombre: 'Azúcar',
    cantidadTotal: 15,
    unidad: 'kg',
    pedidos: 4,
    prioridad: 'Media'
  },
  {
    id: '3',
    nombre: 'Huevos',
    cantidadTotal: 120,
    unidad: 'unidad',
    pedidos: 6,
    prioridad: 'Alta'
  },
  {
    id: '4',
    nombre: 'Mantequilla',
    cantidadTotal: 8,
    unidad: 'kg',
    pedidos: 3,
    prioridad: 'Media'
  },
  {
    id: '5',
    nombre: 'Aceite de Oliva',
    cantidadTotal: 5,
    unidad: 'l',
    pedidos: 2,
    prioridad: 'Baja'
  },
  {
    id: '6',
    nombre: 'Levadura',
    cantidadTotal: 3,
    unidad: 'kg',
    pedidos: 4,
    prioridad: 'Alta'
  },
  {
    id: '7',
    nombre: 'Sal',
    cantidadTotal: 4,
    unidad: 'kg',
    pedidos: 5,
    prioridad: 'Baja'
  },
  {
    id: '8',
    nombre: 'Leche',
    cantidadTotal: 12,
    unidad: 'l',
    pedidos: 3,
    prioridad: 'Media'
  }
];

/**
 * Datos para el gráfico de productos más solicitados.
 */
const datosGrafico = [
  { nombre: 'Harina', cantidad: 25 },
  { nombre: 'Huevos', cantidad: 120 },
  { nombre: 'Azúcar', cantidad: 15 },
  { nombre: 'Mantequilla', cantidad: 8 },
  { nombre: 'Leche', cantidad: 12 }
];

/**
 * Página de conglomerado de pedidos.
 * Muestra una vista consolidada de todos los productos solicitados.
 * 
 * @returns {JSX.Element} La página de conglomerado de pedidos.
 */
const ConglomeradoPedidosPage: React.FC = () => {
  const [productos, setProductos] = React.useState<ProductoConglomerado[]>(productosConglomerados);
  const [filteredProductos, setFilteredProductos] = React.useState<ProductoConglomerado[]>(productosConglomerados);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [selectedPrioridad, setSelectedPrioridad] = React.useState<string>('todas');

  /**
   * Filtra los productos según los criterios de búsqueda.
   */
  React.useEffect(() => {
    let filtered = [...productos];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(producto => 
        producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por prioridad
    if (selectedPrioridad !== 'todas') {
      filtered = filtered.filter(producto => producto.prioridad === selectedPrioridad);
    }
    
    setFilteredProductos(filtered);
  }, [searchTerm, selectedPrioridad, productos]);

  /**
   * Renderiza un chip con el color correspondiente a la prioridad.
   * 
   * @param {string} prioridad - Prioridad del producto.
   * @returns {JSX.Element} Chip con la prioridad.
   */
  const renderPrioridad = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta':
        return <Chip color="danger" size="sm">{prioridad}</Chip>;
      case 'Media':
        return <Chip color="warning" size="sm">{prioridad}</Chip>;
      case 'Baja':
        return <Chip color="primary" size="sm">{prioridad}</Chip>;
      default:
        return <Chip size="sm">{prioridad}</Chip>;
    }
  };

  /**
   * Genera una orden de compra para los productos seleccionados.
   */
  const generarOrdenCompra = () => {
    alert('Orden de compra generada correctamente');
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Conglomerado de Pedidos</h1>
            <p className="text-default-500">
              Vista consolidada de todos los productos solicitados.
            </p>
          </div>
          <Button 
            color="primary" 
            startContent={<Icon icon="lucide:file-text" />}
            onPress={generarOrdenCompra}
          >
            Generar Orden de Compra
          </Button>
        </div>

        {/* Resumen y gráfico */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de productos más solicitados */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-0 pt-4 px-4">
                <h3 className="text-lg font-semibold">Productos Más Solicitados</h3>
              </CardHeader>
              <CardBody className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={datosGrafico}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cantidad" name="Cantidad Total" fill="#004A87" />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>

          {/* Resumen de pedidos */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm h-full">
              <CardHeader className="pb-0 pt-4 px-4">
                <h3 className="text-lg font-semibold">Resumen</h3>
              </CardHeader>
              <CardBody className="px-4 pb-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-default-500">Total de Productos</p>
                    <p className="text-2xl font-semibold">{productos.length}</p>
                  </div>
                  
                  <Divider />
                  
                  <div>
                    <p className="text-sm text-default-500">Productos por Prioridad</p>
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-danger mr-2"></div>
                          <span>Alta</span>
                        </div>
                        <span className="font-semibold">
                          {productos.filter(p => p.prioridad === 'Alta').length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-warning mr-2"></div>
                          <span>Media</span>
                        </div>
                        <span className="font-semibold">
                          {productos.filter(p => p.prioridad === 'Media').length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-primary mr-2"></div>
                          <span>Baja</span>
                        </div>
                        <span className="font-semibold">
                          {productos.filter(p => p.prioridad === 'Baja').length}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Divider />
                  
                  <div>
                    <p className="text-sm text-default-500">Pedidos Totales</p>
                    <p className="text-2xl font-semibold">
                      {productos.reduce((sum, producto) => sum + producto.pedidos, 0)}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
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
            placeholder="Prioridad"
            selectedKeys={selectedPrioridad ? [selectedPrioridad] : []}
            onChange={(e) => setSelectedPrioridad(e.target.value)}
            className="w-full md:w-40"
          >
            <SelectItem key="todas" value="todas">Todas las prioridades</SelectItem>
            <SelectItem key="Alta" value="Alta">Alta</SelectItem>
            <SelectItem key="Media" value="Media">Media</SelectItem>
            <SelectItem key="Baja" value="Baja">Baja</SelectItem>
          </Select>
        </div>

        {/* Tabla de productos */}
        <Card className="shadow-sm">
          <CardBody className="p-0">
            <Table 
              aria-label="Tabla de productos conglomerados"
              removeWrapper
            >
              <TableHeader>
                <TableColumn>PRODUCTO</TableColumn>
                <TableColumn>CANTIDAD TOTAL</TableColumn>
                <TableColumn>UNIDAD</TableColumn>
                <TableColumn>PEDIDOS</TableColumn>
                <TableColumn>PRIORIDAD</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No se encontraron productos">
                {filteredProductos.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell>{producto.nombre}</TableCell>
                    <TableCell>{producto.cantidadTotal}</TableCell>
                    <TableCell>{producto.unidad}</TableCell>
                    <TableCell>{producto.pedidos}</TableCell>
                    <TableCell>{renderPrioridad(producto.prioridad)}</TableCell>
                    <TableCell>
                      <Button 
                        isIconOnly 
                        variant="light" 
                        size="sm"
                      >
                        <Icon icon="lucide:eye" className="text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
};

/**
 * Componente Select para los filtros.
 */
const Select: React.FC<{
  placeholder: string;
  selectedKeys: string[];
  onChange: (e: { target: { value: string } }) => void;
  className?: string;
  children: React.ReactNode;
}> = ({ placeholder, selectedKeys, onChange, className, children }) => {
  return (
    <div className={className}>
      <select
        className="w-full px-3 py-2 rounded-md border border-default-200 bg-content1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        value={selectedKeys[0] || ''}
        onChange={(e) => onChange({ target: { value: e.target.value } })}
      >
        <option value="" disabled>{placeholder}</option>
        {children}
      </select>
    </div>
  );
};

/**
 * Componente SelectItem para las opciones del Select.
 */
const SelectItem: React.FC<{
  key: string;
  value: string;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <option value={value}>{children}</option>
  );
};

export default ConglomeradoPedidosPage;
