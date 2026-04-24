import React from 'react';
import {
  Card, CardBody, CardHeader,
  Button, Input, Chip, Spinner, Divider, Tooltip,
} from '@heroui/react';
import { DateRangePicker } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { CalendarDate } from '@internationalized/date';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../hooks/useToast';
import {
  IResumenHistorico,
  IProductoResumenHistorico,
  obtenerResumenHistoricoService,
} from '../services/historico-pedido-service';
import XLSXStyle from 'xlsx-js-style';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type EstadoPedido = 'APROBADO' | 'ENTREGADO' | 'PENDIENTE' | 'RECHAZADO';

const TODOS_ESTADOS: EstadoPedido[] = ['APROBADO', 'ENTREGADO', 'PENDIENTE', 'RECHAZADO'];

const ESTADO_COLOR: Record<EstadoPedido, string> = {
  APROBADO:  'bg-success-100 text-success-700 border-success-300',
  ENTREGADO: 'bg-primary-100 text-primary-700 border-primary-300',
  PENDIENTE: 'bg-warning-100 text-warning-700 border-warning-300',
  RECHAZADO: 'bg-danger-100  text-danger-700  border-danger-300',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtCantidad = (n: number): string => {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(n);
};

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL
// ─────────────────────────────────────────────────────────────────────────────

const exportarExcel = (resumen: IResumenHistorico) => {
  const styleTitle = {
    font:      { bold: true, sz: 13, color: { rgb: 'FFFFFF' } },
    fill:      { fgColor: { rgb: '1A1A1A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      bottom: { style: 'thin', color: { rgb: 'AAAAAA' } },
    },
  };
  const styleHeader = {
    font:      { bold: true, sz: 10, color: { rgb: '1A1A1A' } },
    fill:      { fgColor: { rgb: 'FFB800' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
    },
  };
  const styleData = {
    font:      { sz: 10 },
    alignment: { vertical: 'center' },
    border: {
      bottom: { style: 'thin', color: { rgb: 'EEEEEE' } },
    },
  };
  const styleNum = {
    ...styleData,
    alignment: { horizontal: 'right', vertical: 'center' },
  };
  const styleCenter = {
    ...styleData,
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const ec = XLSXStyle.utils.encode_cell;

  const ws: Record<string, unknown> = {};
  let R = 0;

  // Título
  const title = `Histórico de Pedidos | ${resumen.fechaInicio} — ${resumen.fechaFin} | ${resumen.estados.join(', ')}`;
  ws[ec({ r: R, c: 0 })] = { v: title, t: 's', s: styleTitle };
  for (let C = 1; C <= 4; C++) ws[ec({ r: R, c: C })] = { v: '', t: 's', s: styleTitle };
  R++;

  // KPIs
  ws[ec({ r: R, c: 0 })] = { v: `Total Pedidos: ${resumen.totalPedidos}`, t: 's', s: { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: 'FFF5CC' } } } };
  ws[ec({ r: R, c: 1 })] = { v: `Productos Distintos: ${resumen.totalProductosDistintos}`, t: 's', s: { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: 'FFF5CC' } } } };
  for (let C = 2; C <= 4; C++) ws[ec({ r: R, c: C })] = { v: '', t: 's', s: { fill: { fgColor: { rgb: 'FFF5CC' } } } };
  R++;

  R++; // fila vacía

  // Headers
  const headers = ['Código', 'Producto', 'Unidad', 'Cantidad Total', 'Veces en Pedidos'];
  headers.forEach((h, C) => {
    ws[ec({ r: R, c: C })] = { v: h, t: 's', s: styleHeader };
  });
  R++;

  // Datos
  resumen.productos.forEach(prod => {
    ws[ec({ r: R, c: 0 })] = { v: prod.codProducto ?? '—', t: 's', s: styleData };
    ws[ec({ r: R, c: 1 })] = { v: prod.nombreProducto,      t: 's', s: styleData };
    ws[ec({ r: R, c: 2 })] = { v: prod.abreviatura,         t: 's', s: styleCenter };
    ws[ec({ r: R, c: 3 })] = { v: prod.cantidadTotal,       t: 'n', s: styleNum };
    ws[ec({ r: R, c: 4 })] = { v: prod.vecesEnPedidos,      t: 'n', s: styleCenter };
    R++;
  });

  ws['!ref']  = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: R - 1, c: 4 } });
  ws['!cols'] = [{ wch: 14 }, { wch: 40 }, { wch: 10 }, { wch: 16 }, { wch: 16 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
  ];

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, 'Histórico');
  XLSXStyle.writeFile(wb, `historico_pedidos_${resumen.fechaInicio}_${resumen.fechaFin}.xlsx`);
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

const HistoricoPedidosPage: React.FC = () => {
  usePageTitle('Histórico de Pedidos', 'Consulta agregada de productos pedidos por rango de fechas y estados.', 'lucide:bar-chart-2');
  const toast = useToast();

  const [dateRange, setDateRange] = React.useState<{ start: CalendarDate; end: CalendarDate } | null>(null);
  const [estadosSeleccionados, setEstadosSeleccionados] = React.useState<Set<EstadoPedido>>(
    new Set(['APROBADO', 'ENTREGADO']),
  );
  const [loading, setLoading]       = React.useState(false);
  const [resumen, setResumen]       = React.useState<IResumenHistorico | null>(null);
  const [busqueda, setBusqueda]     = React.useState('');

  const toggleEstado = (estado: EstadoPedido) => {
    setEstadosSeleccionados(prev => {
      const next = new Set(prev);
      next.has(estado) ? next.delete(estado) : next.add(estado);
      return next;
    });
  };

  const consultar = async () => {
    if (!dateRange?.start || !dateRange?.end) {
      toast.error('Seleccione un rango de fechas válido');
      return;
    }
    if (estadosSeleccionados.size === 0) {
      toast.error('Seleccione al menos un estado');
      return;
    }

    const fechaInicio = dateRange.start.toString();
    const fechaFin    = dateRange.end.toString();
    const estadosCsv  = Array.from(estadosSeleccionados).join(',');

    setLoading(true);
    setResumen(null);
    setBusqueda('');
    try {
      const data = await obtenerResumenHistoricoService(fechaInicio, fechaFin, estadosCsv);
      if (!data.productos || data.productos.length === 0) {
        toast.warning('No hay datos para el rango y estados seleccionados');
      }
      setResumen(data);
    } catch {
      toast.error('Error al consultar el histórico de pedidos');
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = React.useMemo((): IProductoResumenHistorico[] => {
    if (!resumen) return [];
    if (!busqueda.trim()) return resumen.productos;
    const q = busqueda.toLowerCase();
    return resumen.productos.filter(p =>
      p.nombreProducto.toLowerCase().includes(q) ||
      (p.codProducto ?? '').toLowerCase().includes(q),
    );
  }, [resumen, busqueda]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 p-4 md:p-6"
    >

      {/* ── Filtros ── */}
      <Card className="shadow-sm">
        <CardHeader className="px-5 py-4">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:sliders-horizontal" width={18} className="text-primary" />
            <h2 className="font-semibold text-secondary dark:text-foreground">Parámetros de Consulta</h2>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="p-5 space-y-5">

          {/* Rango de fechas */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="w-full sm:max-w-sm">
              <DateRangePicker
                label="Rango de fechas"
                variant="bordered"
                value={dateRange}
                onChange={setDateRange}
              />
            </div>

            {/* Estados */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-default-500 uppercase tracking-wide">Estados del pedido</span>
              <div className="flex flex-wrap gap-2">
                {TODOS_ESTADOS.map(estado => (
                  <button
                    key={estado}
                    onClick={() => toggleEstado(estado)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      estadosSeleccionados.has(estado)
                        ? ESTADO_COLOR[estado]
                        : 'bg-default-50 text-default-400 border-default-200 hover:border-default-400'
                    }`}
                  >
                    {estado}
                  </button>
                ))}
              </div>
            </div>

            <Button
              color="primary"
              isLoading={loading}
              isDisabled={!dateRange || estadosSeleccionados.size === 0}
              onPress={consultar}
              startContent={!loading && <Icon icon="lucide:bar-chart-2" width={16} />}
              className="shrink-0 sm:self-end"
            >
              Consultar
            </Button>
          </div>

        </CardBody>
      </Card>

      {/* ── Resultados ── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3 text-default-400">
          <Spinner size="lg" color="warning" />
          <p className="text-sm">Consultando histórico...</p>
        </div>
      ) : !resumen ? (
        <div className="py-20 flex flex-col items-center gap-3 text-default-400">
          <Icon icon="lucide:history" width={52} className="opacity-30" />
          <p className="text-sm text-center">
            Seleccione un rango de fechas y estados, luego presione <strong>Consultar</strong>.
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="shadow-sm border border-primary-200">
              <CardBody className="px-4 py-3">
                <p className="text-xs text-primary-500 font-semibold uppercase tracking-wide">Total Pedidos</p>
                <p className="text-3xl font-bold text-primary mt-1">{resumen.totalPedidos}</p>
              </CardBody>
            </Card>
            <Card className="shadow-sm border border-default-200">
              <CardBody className="px-4 py-3">
                <p className="text-xs text-default-500 font-semibold uppercase tracking-wide">Productos Distintos</p>
                <p className="text-3xl font-bold text-secondary dark:text-foreground mt-1">{resumen.totalProductosDistintos}</p>
              </CardBody>
            </Card>
            <Card className="shadow-sm border border-default-200 col-span-2">
              <CardBody className="px-4 py-3">
                <p className="text-xs text-default-500 font-semibold uppercase tracking-wide mb-1.5">Período consultado</p>
                <p className="text-sm font-medium text-secondary dark:text-foreground">
                  {resumen.fechaInicio} — {resumen.fechaFin}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {resumen.estados.map(e => (
                    <Chip key={e} size="sm" color="default" variant="flat">{e}</Chip>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Tabla */}
          <Card className="shadow-sm">
            <CardHeader className="px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex items-center gap-2 flex-1">
                <Icon icon="lucide:package" width={16} className="text-primary" />
                <span className="font-semibold text-secondary dark:text-foreground text-sm">
                  Productos ({productosFiltrados.length})
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  size="sm"
                  variant="bordered"
                  placeholder="Buscar producto..."
                  value={busqueda}
                  onValueChange={setBusqueda}
                  startContent={<Icon icon="lucide:search" className="text-default-400" width={14} />}
                  classNames={{ base: 'max-w-xs', inputWrapper: 'bg-default-50' }}
                />
                <Button
                  size="sm"
                  variant="bordered"
                  color="success"
                  startContent={<Icon icon="lucide:download" width={14} />}
                  onPress={() => exportarExcel(resumen)}
                  isDisabled={resumen.productos.length === 0}
                >
                  Excel
                </Button>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="p-0">
              {productosFiltrados.length === 0 ? (
                <div className="py-14 flex flex-col items-center gap-3 text-default-400">
                  <Icon icon="lucide:search-x" width={36} className="opacity-40" />
                  <p className="text-sm">Sin resultados para "{busqueda}"</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Header */}
                  <div className="grid grid-cols-12 px-5 py-2.5 bg-default-50 border-b border-default-200 text-xs font-semibold text-default-500 uppercase tracking-wide min-w-[600px]">
                    <span className="col-span-1 text-center truncate">Código</span>
                    <span className="col-span-5 text-center truncate">Producto</span>
                    <span className="col-span-2 text-center truncate">Unidad</span>
                    <span className="col-span-2 text-center truncate">Cantidad Total</span>
                    <span className="col-span-2 text-center truncate">En Pedidos</span>
                  </div>
                  {/* Filas */}
                  <div className="divide-y divide-default-100 min-w-[600px]">
                    {productosFiltrados.map((prod, idx) => (
                      <div
                        key={prod.idProducto}
                        className={`grid grid-cols-12 px-5 py-3 items-center hover:bg-default-50/60 transition-colors ${
                          idx % 2 === 0 ? '' : 'bg-default-50/30'
                        }`}
                      >
                        <Tooltip content={prod.codProducto ?? '—'} color="default">
                          <span className="col-span-1 text-xs text-default-400 truncate text-center cursor-help">
                            {prod.codProducto ?? '—'}
                          </span>
                        </Tooltip>

                        <Tooltip content={prod.nombreProducto} color="default">
                          <div className="col-span-5 flex items-center gap-2 min-w-0 justify-center text-center">
                            <Icon icon="lucide:package" width={13} className="text-primary shrink-0" />
                            <p className="font-medium text-sm text-default-800 truncate">
                              {prod.nombreProducto}
                            </p>
                          </div>
                        </Tooltip>

                        <Tooltip content={prod.abreviatura} color="default">
                          <span className="col-span-2 text-center text-xs text-default-500 truncate cursor-help">
                            {prod.abreviatura}
                          </span>
                        </Tooltip>

                        <Tooltip content={`${fmtCantidad(prod.cantidadTotal)}`} color="default">
                          <span className="col-span-2 text-center font-bold text-primary truncate cursor-help">
                            {fmtCantidad(prod.cantidadTotal)}
                          </span>
                        </Tooltip>

                        <div className="col-span-2 text-center">
                          <Tooltip content={`${prod.vecesEnPedidos} veces`} color="default">
                            <div className="flex justify-center">
                              <Chip size="sm" color="default" variant="flat">
                                {prod.vecesEnPedidos}
                              </Chip>
                            </div>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

        </motion.div>
      )}
    </motion.div>
  );
};

export default HistoricoPedidosPage;
