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
import { useToast } from '../hooks/useToast';

/**
 * Interfaz para un producto consolidado.
 */
interface DetalleProducto {
  solicitudId: string;
  asignaturaNombre: string;
  profesorNombre: string;
  semana: number;
  fechaClase: string;
  cantidad: number;
  unidadMedida: string;
  esAdicional: boolean;
}

interface ProductoConsolidado {
  productoId: string;
  productoNombre: string;
  cantidadTotal: number;
  unidadMedida: string;
  totalSolicitudes: number;
  incluyeAdicionales: boolean;
  detalles: DetalleProducto[];
}

/**
 * Página de conglomerado de pedidos.
 * Consolida todos los productos de las solicitudes ACEPTADAS.
 */
const ConglomeradoPedidosPage: React.FC = () => {
  const toast = useToast();
  const [solicitudesAceptadas, setSolicitudesAceptadas] = React.useState<ISolicitud[]>([]);
  const [productosConsolidados, setProductosConsolidados] = React.useState<ProductoConsolidado[]>([]);
  const [filteredProductos, setFilteredProductos] = React.useState<ProductoConsolidado[]>([]);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [semanaSeleccionada, setSemanaSeleccionada] = React.useState<string>('todas');
  const [expandedProductos, setExpandedProductos] = React.useState<Set<string>>(new Set());
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
    } catch (error) {
      console.error('❌ Error al cargar solicitudes aceptadas:', error);
      toast.error('Error al cargar los datos del conglomerado');
    } finally {
      setIsLoading(false);
    }
  };

  const semanasDisponibles = React.useMemo(() => {
    const semanas = Array.from(
      new Set(
        solicitudesAceptadas
          .map((s) => (Number.isInteger(s.semana) ? s.semana : undefined))
          .filter((semana): semana is number => semana !== undefined)
      )
    );
    return semanas.sort((a, b) => a - b);
  }, [solicitudesAceptadas]);

  const solicitudesFiltradas = React.useMemo(() => {
    if (semanaSeleccionada === 'todas') {
      return solicitudesAceptadas;
    }
    const semanaNumero = parseInt(semanaSeleccionada, 10);
    if (Number.isNaN(semanaNumero)) {
      return solicitudesAceptadas;
    }
    return solicitudesAceptadas.filter((s) => s.semana === semanaNumero);
  }, [semanaSeleccionada, solicitudesAceptadas]);

  React.useEffect(() => {
    const consolidado = consolidarProductos(solicitudesFiltradas);
    setProductosConsolidados(consolidado);
    setExpandedProductos(new Set());
    if (!searchTerm) {
      setFilteredProductos(consolidado);
    }
  }, [solicitudesFiltradas, searchTerm]);

  /**
   * ✅ CONSOLIDA todos los productos de las solicitudes aceptadas
   */
  const consolidarProductos = (solicitudes: ISolicitud[]): ProductoConsolidado[] => {
    const mapaProductos = new Map<
      string,
      {
        data: ProductoConsolidado;
        solicitudesSet: Set<string>;
      }
    >();

    solicitudes.forEach((solicitud) => {
      solicitud.items.forEach((item) => {
        const key = item.productoId;
        const detalle: DetalleProducto = {
          solicitudId: solicitud.id,
          asignaturaNombre: solicitud.asignaturaNombre,
          profesorNombre: solicitud.profesorNombre,
          semana: solicitud.semana,
          fechaClase: solicitud.fecha,
          cantidad: item.cantidad,
          unidadMedida: item.unidadMedida,
          esAdicional: item.esAdicional,
        };

        if (mapaProductos.has(key)) {
          const existente = mapaProductos.get(key)!;
          existente.data.cantidadTotal += item.cantidad;
          existente.data.detalles.push(detalle);
          existente.data.incluyeAdicionales = existente.data.incluyeAdicionales || item.esAdicional;
          existente.solicitudesSet.add(solicitud.id);
          existente.data.totalSolicitudes = existente.solicitudesSet.size;
        } else {
          const solicitudesSet = new Set<string>([solicitud.id]);
          mapaProductos.set(key, {
            data: {
              productoId: item.productoId,
              productoNombre: item.productoNombre,
              cantidadTotal: item.cantidad,
              unidadMedida: item.unidadMedida,
              totalSolicitudes: 1,
              incluyeAdicionales: item.esAdicional,
              detalles: [detalle],
            },
            solicitudesSet,
          });
        }
      });
    });

    return Array.from(mapaProductos.values())
      .map((entry) => entry.data)
      .sort((a, b) => b.cantidadTotal - a.cantidadTotal);
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
      toast.warning('No hay productos para generar la orden de compra');
      return;
    }

    // Crear contenido de la orden
    let orden = '=== ORDEN DE COMPRA ===\n\n';
    orden += `Fecha: ${new Date().toLocaleDateString('es-CL')}\n`;
    orden += `Total de productos: ${productosConsolidados.length}\n`;
    orden += `Basado en ${solicitudesFiltradas.length} solicitudes aceptadas\n\n`;
    orden += '--- PRODUCTOS ---\n\n';

    productosConsolidados.forEach((producto, index) => {
      orden += `${index + 1}. ${producto.productoNombre}\n`;
      orden += `   Cantidad: ${producto.cantidadTotal} ${producto.unidadMedida}\n`;
      orden += `   Solicitudes: ${producto.totalSolicitudes}\n\n`;
    });

    // Copiar al portapapeles
    navigator.clipboard.writeText(orden).then(() => {
      toast.success('Orden de compra copiada al portapapeles');
    }).catch(() => {
      // Si falla, mostrar en consola
      console.log(orden);
      toast.info('Orden de compra generada. Revisa la consola del navegador.');
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
    
    solicitudesFiltradas.forEach(solicitud => {
      const key = solicitud.asignaturaNombre;
      distribucion[key] = (distribucion[key] || 0) + 1;
    });

    return Object.entries(distribucion).map(([nombre, valor]) => ({
      name: nombre,
      value: valor
    }));
  }, [solicitudesFiltradas]);

  const toggleProducto = (productoId: string) => {
    setExpandedProductos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(productoId)) {
        nuevo.delete(productoId);
      } else {
        nuevo.add(productoId);
      }
      return nuevo;
    });
  };

  const formatearFechaClase = (fechaISO: string) => {
    const fecha = new Date(fechaISO);
    if (Number.isNaN(fecha.getTime())) {
      return '—';
    }
    return fecha.toLocaleDateString('es-CL');
  };

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
              <p className="text-3xl font-bold text-success">{solicitudesFiltradas.length}</p>
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
                {productosConsolidados.reduce((sum, p) => sum + p.detalles.length, 0)}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center p-4">
              <p className="text-sm text-default-500">Profesores</p>
              <p className="text-3xl font-bold text-secondary">
                {new Set(solicitudesFiltradas.map(s => s.profesorId)).size}
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

          <Select
            label="Semana"
            selectedKeys={new Set([semanaSeleccionada])}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string | undefined;
              setSemanaSeleccionada(value || 'todas');
            }}
            className="w-full md:w-56"
          >
            <SelectItem key="todas">Todas las semanas</SelectItem>
            {semanasDisponibles.map((semana) => (
              <SelectItem key={semana.toString()}>Semana {semana}</SelectItem>
            ))}
          </Select>
          
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
                <TableColumn>SOLICITUDES</TableColumn>
                <TableColumn>TIPO</TableColumn>
                <TableColumn>DETALLE</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No hay productos consolidados. Asegúrese de que existan solicitudes aceptadas.">
                {filteredProductos.map((producto) => {
                  const expandido = expandedProductos.has(producto.productoId);
                  return (
                    <TableRow key={producto.productoId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{producto.productoNombre}</p>
                            {expandido && (
                              <div className="mt-3 bg-default-50 dark:bg-default-100/10 rounded-lg p-4 space-y-3 border border-default-200">
                                <p className="text-sm text-default-500">
                                  Detalle de solicitudes:
                                </p>
                                <div className="space-y-3">
                                  {producto.detalles.map((detalle, index) => (
                                    <div
                                      key={`${detalle.solicitudId}-${index}`}
                                      className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border border-default-200 rounded-md p-3 bg-content1/50"
                                    >
                                      <div>
                                        <p className="font-medium">
                                          Solicitud #{detalle.solicitudId.slice(-6)} · Semana {detalle.semana}
                                        </p>
                                        <p className="text-xs text-default-500">
                                          {detalle.asignaturaNombre} — {detalle.profesorNombre}
                                        </p>
                                        <p className="text-xs text-default-400">
                                          Clase: {formatearFechaClase(detalle.fechaClase)}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Chip color="primary" variant="flat" size="sm">
                                          {detalle.cantidad} {detalle.unidadMedida}
                                        </Chip>
                                        <Chip
                                          color={detalle.esAdicional ? 'warning' : 'success'}
                                          variant="flat"
                                          size="sm"
                                        >
                                          {detalle.esAdicional ? 'Adicional' : 'Receta'}
                                        </Chip>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-lg">{producto.cantidadTotal}</span>
                        </TableCell>
                        <TableCell>{producto.unidadMedida}</TableCell>
                        <TableCell>
                          <Chip size="sm" color="primary" variant="flat">
                            {producto.totalSolicitudes}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          {producto.incluyeAdicionales ? (
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
                            onPress={() => toggleProducto(producto.productoId)}
                          >
                            <Icon
                              icon={expandido ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                              className="text-primary"
                            />
                          </Button>
                        </TableCell>
                      </TableRow>
                  );
                })}
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