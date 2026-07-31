import React from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Select,
  SelectItem,
  Tooltip,
  Spinner,
  DateRangePicker,
  Card,
  CardBody,
  Chip
} from '@heroui/react';
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import { Icon } from '@iconify/react';
import {
  findMovimientosConFiltros,
  IMotionAnswer,
  IMotionFilterRequest
} from '../services/inventario/movimiento-service';
import { TableSkeleton, TableSkeletonColumn } from './SkeletonLoader';

const MOV_GREEN = '#16a34a';
const MOV_RED = '#ef4444';
const MOV_YELLOW = '#f59e0b';
const MOV_PURPLE = '#3b0764';
const MOV_GRAY = '#6b7280';

const MOV_TIPO_CONFIG: Record<string, { label: string; color: string }> = {
  ENTRADA_INVENTARIO: { label: 'Entrada Inventario', color: MOV_GREEN },
  ENTRADA_BODEGA: { label: 'Entrada Bodega', color: MOV_GREEN },
  ENTRADA: { label: 'Entrada', color: MOV_GREEN },
  SALIDA_INVENTARIO: { label: 'Salida Inventario', color: MOV_RED },
  SALIDA_BODEGA: { label: 'Salida Bodega', color: MOV_RED },
  SALIDA: { label: 'Salida', color: MOV_RED },
  MERMA_INVENTARIO: { label: 'Merma Inventario', color: MOV_RED },
  MERMA_BODEGA: { label: 'Merma Bodega', color: MOV_RED },
  MERMA: { label: 'Merma', color: MOV_RED },
  TRASLADO: { label: 'Traslado', color: MOV_YELLOW },
  DEVOLUCION: { label: 'Devolución', color: MOV_YELLOW },
  AJUSTE_INVENTARIO: { label: 'Ajuste Inventario', color: MOV_PURPLE },
  AJUSTE_BODEGA: { label: 'Ajuste Bodega', color: MOV_PURPLE },
  AJUSTE: { label: 'Ajuste', color: MOV_PURPLE },
};

const MOVIMIENTOS_TABLE_COLS: TableSkeletonColumn[] = [
  { width: 'w-[20%]', shape: 'text' },
  { width: 'w-[10%]', shape: 'text' },
  { width: 'w-[14%]', shape: 'chip' },
  { width: 'w-[6%]', shape: 'text' },
  { width: 'w-[9%]', shape: 'text' },
  { width: 'w-[17%]', shape: 'text' },
  { width: 'w-[24%]', shape: 'text' },
];

const renderTipoMovimiento = (tipo: string) => {
  const normalizedTipo = tipo
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '_')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  const cfg = MOV_TIPO_CONFIG[normalizedTipo] ?? { label: tipo, color: MOV_GRAY };
  return (
    <b style={{ color: cfg.color, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
      {cfg.label}
    </b>
  );
};

export interface MovimientosHistorialProps {
  /** true cuando esta vista/tab está actualmente visible -- controla cuándo corren los efectos de carga. */
  active: boolean;
  /** Prellenar el filtro "Producto" (ej. al llegar desde el botón "Ver Movimiento" de una fila). */
  initialNombreProducto?: string;
}

/**
 * Historial de movimientos de inventario y bodega, con filtros (producto, responsable,
 * tipo, orden, rango de fechas) y scroll infinito. Extraído de inventario.tsx para
 * poder reutilizarse también en bodega-transito.tsx (ver Riel de Navegación → Movimientos).
 */
const MovimientosHistorial: React.FC<MovimientosHistorialProps> = ({ active, initialNombreProducto = '' }) => {
  const [movimientos, setMovimientos] = React.useState<IMotionAnswer[]>([]);
  const [movIsLoading, setMovIsLoading] = React.useState(false);
  const [movIsLoadingMore, setMovIsLoadingMore] = React.useState(false);
  const movNextPageRef = React.useRef<number>(1);
  const movIsLoadingMoreRef = React.useRef<boolean>(false);
  const movTotalPagesRef = React.useRef<number>(1);
  const movTableScrollRef = React.useRef<HTMLDivElement>(null);
  const [movNombreProducto, setMovNombreProducto] = React.useState(initialNombreProducto);
  const [movNombreResponsable, setMovNombreResponsable] = React.useState('');
  const [movTipoMovimiento, setMovTipoMovimiento] = React.useState<IMotionFilterRequest['tipoMovimiento']>('TODOS');
  const [movOrden, setMovOrden] = React.useState<IMotionFilterRequest['orden']>('MAS_RECIENTES');
  const [movDateRangeValue, setMovDateRangeValue] = React.useState<{ start: CalendarDate; end: CalendarDate } | null>(null);
  const [movDebouncedRequest, setMovDebouncedRequest] = React.useState<IMotionFilterRequest | null>(null);

  React.useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      setMovDebouncedRequest({
        page: 1,
        nombreProducto: movNombreProducto,
        nombreResponsable: movNombreResponsable,
        tipoMovimiento: movTipoMovimiento,
        orden: movOrden,
        fechaInicio: movDateRangeValue
          ? `${movDateRangeValue.start.year}-${String(movDateRangeValue.start.month).padStart(2, '0')}-${String(movDateRangeValue.start.day).padStart(2, '0')}`
          : null,
        fechaFin: movDateRangeValue
          ? `${movDateRangeValue.end.year}-${String(movDateRangeValue.end.month).padStart(2, '0')}-${String(movDateRangeValue.end.day).padStart(2, '0')}`
          : null
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [active, movNombreProducto, movNombreResponsable, movTipoMovimiento, movOrden, movDateRangeValue]);

  React.useEffect(() => {
    if (!movDebouncedRequest) return;
    const cargar = async () => {
      try {
        setMovIsLoading(true);
        const res = await findMovimientosConFiltros({ ...movDebouncedRequest, page: 1 });
        setMovimientos(res.content);
        movTotalPagesRef.current = res.pagination.totalPages;
        movNextPageRef.current = 2;
      } catch (err) {
        console.error('Error al cargar movimientos:', err);
      } finally {
        setMovIsLoading(false);
        movIsLoadingMoreRef.current = false;
      }
    };
    cargar();
  }, [movDebouncedRequest]);

  const cargarMasMovimientos = React.useCallback(async () => {
    if (!movDebouncedRequest) return;
    if (movIsLoadingMoreRef.current) return;
    if (movNextPageRef.current > movTotalPagesRef.current) return;

    movIsLoadingMoreRef.current = true;
    setMovIsLoadingMore(true);
    try {
      const res = await findMovimientosConFiltros({
        ...movDebouncedRequest,
        page: movNextPageRef.current
      });
      setMovimientos(prev => [...prev, ...res.content]);
      movNextPageRef.current += 1;
    } catch (err) {
      console.error('Error al cargar más movimientos:', err);
    } finally {
      movIsLoadingMoreRef.current = false;
      setMovIsLoadingMore(false);
    }
  }, [movDebouncedRequest]);

  React.useEffect(() => {
    const el = movTableScrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (movIsLoadingMoreRef.current) return;
      const { scrollTop, clientHeight, scrollHeight } = el;
      if (scrollTop + clientHeight > scrollHeight - 500) {
        cargarMasMovimientos();
      }
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [cargarMasMovimientos, active]);

  // Carga inicial: la primera vez que esta vista se vuelve visible.
  const movYaCargadoRef = React.useRef(false);
  React.useEffect(() => {
    if (!active || movYaCargadoRef.current) return;
    movYaCargadoRef.current = true;
    setMovDebouncedRequest({
      page: 1,
      nombreProducto: initialNombreProducto,
      nombreResponsable: '',
      tipoMovimiento: 'TODOS',
      orden: 'MAS_RECIENTES',
      fechaInicio: null,
      fechaFin: null
    });
  }, [active, initialNombreProducto]);

  return (
    <div className="px-4 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
        <Input
          label="Producto"
          placeholder="Buscar por producto..."
          value={movNombreProducto}
          onValueChange={setMovNombreProducto}
          variant="bordered"
          startContent={<Icon icon="lucide:package" className="text-default-400" />}
          isClearable
          onClear={() => setMovNombreProducto('')}
        />

        <Input
          label="Responsable"
          placeholder="Buscar por responsable..."
          value={movNombreResponsable}
          onValueChange={setMovNombreResponsable}
          variant="bordered"
          startContent={<Icon icon="lucide:user" className="text-default-400" />}
          isClearable
          onClear={() => setMovNombreResponsable('')}
        />

        <Select
          label="Tipo de Movimiento"
          selectedKeys={[movTipoMovimiento]}
          onChange={e => setMovTipoMovimiento(e.target.value as IMotionFilterRequest['tipoMovimiento'])}
          variant="bordered"
        >
          <SelectItem key="TODOS" startContent={<Icon icon="lucide:layers" className="text-default-400" />}>Todos</SelectItem>
          <SelectItem key="ENTRADA_INVENTARIO" startContent={<Icon icon="lucide:arrow-down-circle" className="text-success" />}>Entrada Inventario</SelectItem>
          <SelectItem key="ENTRADA_BODEGA" startContent={<Icon icon="lucide:arrow-down-circle" className="text-success" />}>Entrada Bodega</SelectItem>
          <SelectItem key="SALIDA_INVENTARIO" startContent={<Icon icon="lucide:arrow-up-circle" className="text-warning" />}>Salida Inventario</SelectItem>
          <SelectItem key="SALIDA_BODEGA" startContent={<Icon icon="lucide:arrow-up-circle" className="text-warning" />}>Salida Bodega</SelectItem>
          <SelectItem key="TRASLADO" startContent={<Icon icon="lucide:truck" className="text-primary" />}>Traslado</SelectItem>
          <SelectItem key="DEVOLUCION" startContent={<Icon icon="lucide:undo-2" className="text-default-500" />}>Devolución</SelectItem>
          <SelectItem key="MERMA_INVENTARIO" startContent={<Icon icon="lucide:alert-circle" className="text-danger" />}>Merma Inventario</SelectItem>
          <SelectItem key="MERMA_BODEGA" startContent={<Icon icon="lucide:alert-circle" className="text-danger" />}>Merma Bodega</SelectItem>
          <SelectItem key="AJUSTE_INVENTARIO" startContent={<Icon icon="lucide:sliders-horizontal" className="text-secondary" />}>Ajuste Inventario</SelectItem>
          <SelectItem key="AJUSTE_BODEGA" startContent={<Icon icon="lucide:sliders-horizontal" className="text-secondary" />}>Ajuste Bodega</SelectItem>
        </Select>

        <Select
          label="Orden"
          selectedKeys={[movOrden]}
          onChange={e => setMovOrden(e.target.value as IMotionFilterRequest['orden'])}
          variant="bordered"
        >
          <SelectItem key="MAS_RECIENTES">Más Recientes</SelectItem>
          <SelectItem key="MAS_ANTIGUOS">Más Antiguos</SelectItem>
          <SelectItem key="MENOR_CANTIDAD">Menor Cantidad</SelectItem>
          <SelectItem key="MAYOR_CANTIDAD">Mayor Cantidad</SelectItem>
        </Select>

        <DateRangePicker
          label="Rango de fechas"
          variant="bordered"
          maxValue={today(getLocalTimeZone())}
          value={movDateRangeValue}
          onChange={setMovDateRangeValue}
        />
      </div>

      <p className="text-default-400 text-sm">
        {movimientos.length} movimiento(s) cargado(s)
      </p>

      <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
        <CardBody className="p-0">
          <div ref={movTableScrollRef} className="overflow-auto custom-scrollbar max-h-[calc(100vh-280px)] min-h-[300px] rounded-xl">
          <div className="min-w-[960px] w-full">
          <Table
            aria-label="Tabla de movimientos"
            removeWrapper
            layout="fixed"
            classNames={{
              table: "w-full",
              th: "bg-default-100 dark:bg-default-100 text-default-500 font-bold uppercase text-xs h-12 sticky top-0 z-20",
              td: "py-3 border-b border-default-50 dark:border-default-50/10 group-data-[last=true]:border-none"
            }}
            bottomContent={
              movIsLoadingMore ? (
                <div className="flex w-full justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : null
            }
          >
            <TableHeader>
              <TableColumn width="20%" align="center">PRODUCTO</TableColumn>
              <TableColumn width="10%" align="center">CATEGORÍA</TableColumn>
              <TableColumn width="14%" align="center">TIPO</TableColumn>
              <TableColumn width="6%" align="center">CANTIDAD</TableColumn>
              <TableColumn width="9%" align="center">FECHA</TableColumn>
              <TableColumn width="17%" align="center">RESPONSABLE</TableColumn>
              <TableColumn width="24%" align="center">OBSERVACIÓN</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={movIsLoading}
              loadingContent={<div className="py-4 w-full"><TableSkeleton rows={8} columns={MOVIMIENTOS_TABLE_COLS} /></div>}
              emptyContent={
                <div className="py-12 text-center text-default-400">
                  <Icon icon="lucide:clipboard-list" className="mx-auto mb-3 opacity-50" width={48} />
                  <p className="text-lg font-medium">No se encontraron movimientos</p>
                  <p className="text-sm">Intente ajustar los filtros de búsqueda.</p>
                </div>
              }
            >
              {movimientos.map((mov, idx) => (
                <TableRow key={idx} className="hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors">
                  <TableCell>
                    <Tooltip content={mov.nombreProducto} delay={500} closeDelay={0}>
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-secondary dark:text-foreground truncate text-center w-full">
                          {mov.nombreProducto}
                        </span>
                      </div>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {mov.nombreCategoria ? (
                      <Tooltip content={mov.nombreCategoria} delay={500} closeDelay={0}>
                        <div className="flex justify-center w-full">
                          <Chip size="sm" variant="flat" className="bg-default-100 dark:bg-default-100/50 text-default-600 dark:text-default-300 max-w-[100px]" classNames={{ content: "truncate" }}>
                            {mov.nombreCategoria}
                          </Chip>
                        </div>
                      </Tooltip>
                    ) : (
                      <div className="text-center text-default-300">-</div>
                    )}
                  </TableCell>
                  <TableCell>{renderTipoMovimiento(mov.tipoMovimiento)}</TableCell>
                  <TableCell>
                    <span className="font-bold text-default-700 dark:text-default-300">
                      {mov.stockMovimiento}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-center">
                      <span className="font-medium text-center">
                        {new Date(mov.fechaMovimiento).toLocaleDateString('es-CL')}
                      </span>
                      <span className="text-xs text-default-400 text-center">
                        {new Date(mov.fechaMovimiento).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Tooltip content={mov.nombreUsuario} delay={500} closeDelay={0}>
                      <span className="truncate block text-center w-full">{mov.nombreUsuario}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {mov.observacion ? (
                      <Tooltip content={mov.observacion} delay={500} closeDelay={0}>
                        <span className="italic text-default-500 truncate block text-center w-full">
                          {mov.observacion}
                        </span>
                      </Tooltip>
                    ) : (
                      <div className="text-center text-default-300">-</div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default MovimientosHistorial;
