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
  Divider,
  Select,
  SelectItem
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// ✅ IMPORTAR SERVICIOS Y TIPOS REALES
import { obtenerSolicitudesAceptadasParaPedidoService } from '../services/solicitud-service';
import { ISolicitud } from '../types/solicitud.types';

/**
 * Interfaz para un producto consolidado.
 */
interface ProductoConsolidado {
  productoId: string;
  productoNombre: string;
  cantidadTotal: number;
  unidadMedida: string;
  numeroPedidos: number;
  solicitudes: string[]; // IDs de solicitudes que incluyen este producto
  esAdicional: boolean; // Si alguna vez fue marcado como adicional
}

/**
 * Página de conglomerado de pedidos.
 * Consolida todos los productos de las solicitudes ACEPTADAS.
 */
const ConglomeradoPedidosPage: React.FC = () => {
  const [solicitudesAceptadas, setSolicitudesAceptadas] = React.useState<ISolicitud[]>([]);
  const [productosConsolidados, setProductosConsolidados] = React.useState<ProductoConsolidado[]>([]);
  const [filteredProductos, setFilteredProductos] = React.useState<ProductoConsolidado[]>([]);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);

  // ✅ CARGAR SOLICITUDES ACEPTADAS
  React.useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setIsLoading(true);
      const solicitudes = await obtenerSolicitudesAceptadasParaPedidoService();
      setSolicitudesAceptadas(solicitudes);
      
      console.log('📋 Solicitudes aceptadas cargadas:', solicitudes.length);
      
      // ✅ CONSOLIDAR PRODUCTOS
      const consolidado = consolidarProductos(solicitudes);
      setProductosConsolidados(consolidado);
      setFilteredProductos(consolidado);
      
      console.log('📦 Productos consolidados:', consolidado.length);
    } catch (error) {
      console.error('❌ Error al cargar solicitudes aceptadas:', error);
      alert('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ✅ CONSOLIDA todos los productos de las solicitudes aceptadas
   */
  const consolidarProductos = (solicitudes: ISolicitud[]): ProductoConsolidado[] => {
    const mapaProductos = new Map<string, ProductoConsolidado>();

    solicitudes.forEach(solicitud => {
      solicitud.items.forEach(item => {
        const key = item.productoId;
        
        if (mapaProductos.has(key)) {
          const existente = mapaProductos.get(key)!;
          existente.cantidadTotal += item.cantidad;
          existente.numeroPedidos += 1;
          existente.solicitudes.push(solicitud.id);
          existente.esAdicional = existente.esAdicional || item.esAdicional;
        } else {
          mapaProductos.set(key, {
            productoId: item.productoId,
            productoNombre: item.productoNombre,
            cantidadTotal: item.cantidad,
            unidadMedida: item.unidadMedida,
            numeroPedidos: 1,
            solicitudes: [solicitud.id],
            esAdicional: item.esAdicional
          });
        }
      });
    });

    // Ordenar por cantidad total (descendente)
    return Array.from(mapaProductos.values()).sort((a, b) => b.cantidadTotal - a.cantidadTotal);
  };

  /**
   * Filtra los productos según el término de búsqueda.
   */
  React.useEffect(() => {
    let filtered = [...productosConsolidados];
    
    if (searchTerm) {
      filtered = filtered.filter(producto => 
        producto.productoNombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredProductos(filtered);
  }, [searchTerm, productosConsolidados]);

  /**
   * ✅ GENERA ORDEN DE COMPRA (puede ser exportado o impreso)
   */
  const generarOrdenCompra = () => {
    if (productosConsolidados.length === 0) {
      alert('⚠️ No hay productos para generar orden de compra');
      return;
    }

    // Crear contenido de la orden
    let orden = '=== ORDEN DE COMPRA ===\n\n';
    orden += `Fecha: ${new Date().toLocaleDateString('es-CL')}\n`;
    orden += `Total de productos: ${productosConsolidados.length}\n`;
    orden += `Basado en ${solicitudesAceptadas.length} solicitudes aceptadas\n\n`;
    orden += '--- PRODUCTOS ---\n\n';

    productosConsolidados.forEach((producto, index) => {
      orden += `${index + 1}. ${producto.productoNombre}\n`;
      orden += `   Cantidad: ${producto.cantidadTotal} ${producto.unidadMedida}\n`;
      orden += `   Pedidos: ${producto.numeroPedidos}\n\n`;
    });

    // Copiar al portapapeles
    navigator.clipboard.writeText(orden).then(() => {
      alert('✅ Orden de compra copiada al portapapeles');
    }).catch(() => {
      // Si falla, mostrar en consola
      console.log(orden);
      alert('✅ Orden de compra generada (ver consola)');
    });
  };

  /**
   * ✅ DATOS PARA EL GRÁFICO - Top 10 productos más solicitados
   */
  const datosGrafico = React.useMemo(() => {
    return productosConsolidados
      .slice(0, 10)
      .map(p => ({
        nombre: p.productoNombre.length > 15 
          ? p.productoNombre.substring(0, 15) + '...' 
          : p.productoNombre,
        cantidad: p.cantidadTotal
      }));
  }, [productosConsolidados]);

  /**
   * ✅ DATOS PARA EL GRÁFICO DE PASTEL - Distribución de pedidos
   */
  const datosDistribucion = React.useMemo(() => {
    const distribucion: { [key: string]: number } = {};
    
    solicitudesAceptadas.forEach(solicitud => {
      const key = solicitud.asignaturaNombre;
      distribucion[key] = (distribucion[key] || 0) + 1;
    });

    return Object.entries(distribucion).map(([nombre, valor]) => ({
      name: nombre,
      value: valor
    }));
  }, [solicitudesAceptadas]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando conglomerado...</p>
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
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Conglomerado de Pedidos</h1>
            <p className="text-default-500">
              Vista consolidada de todos los productos de solicitudes aceptadas.
            </p>
          </div>
          <Button 
            color="primary" 
            startContent={<Icon icon="lucide:file-text" />}
            onPress={generarOrdenCompra}
            isDisabled={productosConsolidados.length === 0}
          >
            Generar Orden de Compra
          </Button>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardBody className="text-center p-4">
              <p className="text-sm text-default-500">Solicitudes Aceptadas</p>
              <p className="text-3xl font-bold text-success">{solicitudesAceptadas.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center p-4">
              <p className="text-sm text-default-500">Productos Únicos</p>
              <p className="text-3xl font-bold text-primary">{productosConsolidados.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center p-4">
              <p className="text-sm text-default-500">Total de Items</p>
              <p className="text-3xl font-bold text-warning">
                {productosConsolidados.reduce((sum, p) => sum + p.numeroPedidos, 0)}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center p-4">
              <p className="text-sm text-default-500">Profesores</p>
              <p className="text-3xl font-bold text-secondary">
                {new Set(solicitudesAceptadas.map(s => s.profesorId)).size}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de barras - Top 10 productos */}
          <Card className="shadow-sm">
            <CardHeader className="pb-0 pt-4 px-4">
              <h3 className="text-lg font-semibold">Top 10 Productos Más Solicitados</h3>
            </CardHeader>
            <CardBody className="px-2 pb-4">
              {datosGrafico.length > 0 ? (
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
                    <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cantidad" name="Cantidad Total" fill="#0070F0" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-default-400">
                  No hay datos para mostrar
                </div>
              )}
            </CardBody>
          </Card>

          {/* Gráfico de pastel - Distribución por asignatura */}
          <Card className="shadow-sm">
            <CardHeader className="pb-0 pt-4 px-4">
              <h3 className="text-lg font-semibold">Distribución por Asignatura</h3>
            </CardHeader>
            <CardBody className="px-2 pb-4">
              {datosDistribucion.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={datosDistribucion}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {datosDistribucion.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-default-400">
                  No hay datos para mostrar
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            startContent={<Icon icon="lucide:search" className="text-default-400" />}
            isClearable
            onClear={() => setSearchTerm('')}
            className="w-full md:w-64"
          />
          
          <Button
            color="primary"
            variant="flat"
            startContent={<Icon icon="lucide:refresh-cw" />}
            onPress={cargarDatos}
          >
            Actualizar
          </Button>
        </div>

        {/* Tabla de productos consolidados */}
        <Card className="shadow-sm">
          <CardBody className="p-0">
            <Table 
              aria-label="Tabla de productos consolidados"
              removeWrapper
            >
              <TableHeader>
                <TableColumn>PRODUCTO</TableColumn>
                <TableColumn>CANTIDAD TOTAL</TableColumn>
                <TableColumn>UNIDAD</TableColumn>
                <TableColumn>N° PEDIDOS</TableColumn>
                <TableColumn>TIPO</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No hay productos consolidados. Asegúrese de que existan solicitudes aceptadas.">
                {filteredProductos.map((producto) => (
                  <TableRow key={producto.productoId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{producto.productoNombre}</p>
                        <p className="text-xs text-default-400">
                          {producto.solicitudes.length} solicitud{producto.solicitudes.length !== 1 ? 'es' : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-lg">{producto.cantidadTotal}</span>
                    </TableCell>
                    <TableCell>{producto.unidadMedida}</TableCell>
                    <TableCell>
                      <Chip size="sm" color="primary" variant="flat">
                        {producto.numeroPedidos}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      {producto.esAdicional ? (
                        <Chip size="sm" color="warning" variant="flat">
                          Incluye adicionales
                        </Chip>
                      ) : (
                        <Chip size="sm" variant="flat">
                          Solo receta
                        </Chip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button 
                        isIconOnly 
                        variant="light" 
                        size="sm"
                        onPress={() => {
                          alert(`Detalles de ${producto.productoNombre}:\n\n` +
                                `Cantidad total: ${producto.cantidadTotal} ${producto.unidadMedida}\n` +
                                `Número de pedidos: ${producto.numeroPedidos}\n` +
                                `Solicitudes: ${producto.solicitudes.join(', ')}`);
                        }}
                      >
                        <Icon icon="lucide:info" className="text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        {/* Información adicional */}
        {solicitudesAceptadas.length === 0 && (
          <Card>
            <CardBody className="text-center p-8">
              <Icon icon="lucide:inbox" className="text-default-300 text-6xl mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay solicitudes aceptadas</h3>
              <p className="text-default-500">
                El conglomerado se actualizará automáticamente cuando haya solicitudes aceptadas.
              </p>
            </CardBody>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default ConglomeradoPedidosPage;