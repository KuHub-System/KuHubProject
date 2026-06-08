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
  Chip,
  DateRangePicker,
  Card,
  CardBody
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import {
  findMovimientosConFiltros,
  IMotionAnswer,
  IMotionFilterRequest
} from '../services/movimiento-service';
import { usePageTitle } from '../hooks/usePageTitle';
import { useLocation } from 'react-router-dom';

// ─── Helpers ────────────────────────────────────────────────────────────────

const GREEN = '#16a34a';
const RED = '#ef4444';
const YELLOW = '#f59e0b';
const PURPLE = '#3b0764';
const GRAY = '#6b7280';

const TIPO_CONFIG: Record<string, { label: string; color: string }> = {
  ENTRADA_INVENTARIO: { label: 'Entrada Inventario', color: GREEN },
  ENTRADA_BODEGA: { label: 'Entrada Bodega', color: GREEN },
  ENTRADA: { label: 'Entrada', color: GREEN },
  SALIDA_INVENTARIO: { label: 'Salida Inventario', color: RED },
  SALIDA_BODEGA: { label: 'Salida Bodega', color: RED },
  SALIDA: { label: 'Salida', color: RED },
  MERMA_INVENTARIO: { label: 'Merma Inventario', color: RED },
  MERMA_BODEGA: { label: 'Merma Bodega', color: RED },
  MERMA: { label: 'Merma', color: RED },
  TRASLADO: { label: 'Traslado', color: YELLOW },
  DEVOLUCION: { label: 'Devolución', color: YELLOW },
  AJUSTE_INVENTARIO: { label: 'Ajuste Inventario', color: PURPLE },
  AJUSTE_BODEGA: { label: 'Ajuste Bodega', color: PURPLE },
  AJUSTE: { label: 'Ajuste', color: PURPLE },
};

const renderTipoMovimiento = (tipo: string) => {
  const normalizedTipo = tipo
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '_')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
    
  const cfg = TIPO_CONFIG[normalizedTipo] ?? { label: tipo, color: GRAY };
  return (
    <b style={{ color: cfg.color, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
      {cfg.label}
    </b>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const MovimientosProductoPage: React.FC = () => {
  usePageTitle('Movimientos', 'Historial de movimientos de inventario y bodega de tránsito.', 'lucide:history');

  const location = useLocation();
  const initialNombre = React.useMemo(
    () => new URLSearchParams(location.search).get('nombre') ?? '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Data state
  const [movimientos, setMovimientos] = React.useState<IMotionAnswer[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  // Refs to avoid stale closures in scroll handler
  const nextPageRef = React.useRef<number>(1);
  const isLoadingMoreRef = React.useRef<boolean>(false);
  const totalPagesRef = React.useRef<number>(1);
  const tableScrollRef = React.useRef<HTMLDivElement>(null);

  // Filter state
  const [nombreProducto, setNombreProducto] = React.useState(initialNombre);
  const [nombreResponsable, setNombreResponsable] = React.useState('');
  const [tipoMovimiento, setTipoMovimiento] = React.useState<IMotionFilterRequest['tipoMovimiento']>('TODOS');
  const [orden, setOrden] = React.useState<IMotionFilterRequest['orden']>('MAS_RECIENTES');
  const [dateRangeValue, setDateRangeValue] = React.useState<{ start: CalendarDate; end: CalendarDate } | null>(null);

  // Debounced request
  const [debouncedRequest, setDebouncedRequest] = React.useState<IMotionFilterRequest | null>(null);

  // Build debounced request on filter change
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRequest({
        page: 1,
        nombreProducto,
        nombreResponsable,
        tipoMovimiento,
        orden,
        fechaInicio: dateRangeValue
          ? `${dateRangeValue.start.year}-${String(dateRangeValue.start.month).padStart(2, '0')}-${String(dateRangeValue.start.day).padStart(2, '0')}`
          : null,
        fechaFin: dateRangeValue
          ? `${dateRangeValue.end.year}-${String(dateRangeValue.end.month).padStart(2, '0')}-${String(dateRangeValue.end.day).padStart(2, '0')}`
          : null
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [nombreProducto, nombreResponsable, tipoMovimiento, orden, dateRangeValue]);

  // Load first page when debounced request changes
  React.useEffect(() => {
    if (!debouncedRequest) return;

    const cargar = async () => {
      try {
        setIsLoading(true);
        const res = await findMovimientosConFiltros({ ...debouncedRequest, page: 1 });
        setMovimientos(res.content);
        totalPagesRef.current = res.pagination.totalPages;
        nextPageRef.current = 2;
      } catch (err) {
        console.error('Error al cargar movimientos:', err);
      } finally {
        setIsLoading(false);
        isLoadingMoreRef.current = false;
      }
    };

    cargar();
  }, [debouncedRequest]);

  // Infinite scroll: load more pages
  const cargarMasMovimientos = React.useCallback(async () => {
    if (!debouncedRequest) return;
    if (isLoadingMoreRef.current) return;
    if (nextPageRef.current > totalPagesRef.current) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const res = await findMovimientosConFiltros({
        ...debouncedRequest,
        page: nextPageRef.current
      });
      setMovimientos(prev => [...prev, ...res.content]);
      nextPageRef.current += 1;
    } catch (err) {
      console.error('Error al cargar más movimientos:', err);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [debouncedRequest]);

  // Scroll listener — apunta al contenedor de la tabla, no a window
  React.useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (isLoadingMoreRef.current) return;
      const { scrollTop, clientHeight, scrollHeight } = el;
      if (scrollTop + clientHeight > scrollHeight - 500) {
        cargarMasMovimientos();
      }
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [cargarMasMovimientos]);

  // Trigger initial load on mount
  React.useEffect(() => {
    setDebouncedRequest({
      page: 1,
      nombreProducto: initialNombre,
      nombreResponsable: '',
      tipoMovimiento: 'TODOS',
      orden: 'MAS_RECIENTES',
      fechaInicio: null,
      fechaFin: null
    });
  }, [initialNombre]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 font-sans">


      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
        <Input
          label="Producto"
          placeholder="Buscar por producto..."
          value={nombreProducto}
          onValueChange={setNombreProducto}
          variant="bordered"
          startContent={<Icon icon="lucide:package" className="text-default-400" />}
          isClearable
          onClear={() => setNombreProducto('')}
        />

        <Input
          label="Responsable"
          placeholder="Buscar por responsable..."
          value={nombreResponsable}
          onValueChange={setNombreResponsable}
          variant="bordered"
          startContent={<Icon icon="lucide:user" className="text-default-400" />}
          isClearable
          onClear={() => setNombreResponsable('')}
        />

        <Select
          label="Tipo de Movimiento"
          selectedKeys={[tipoMovimiento]}
          onChange={e => setTipoMovimiento(e.target.value as IMotionFilterRequest['tipoMovimiento'])}
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
          selectedKeys={[orden]}
          onChange={e => setOrden(e.target.value as IMotionFilterRequest['orden'])}
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
          value={dateRangeValue}
          onChange={setDateRangeValue}
        />
      </div>

      {/* Count */}
      <p className="text-default-400 text-sm">
        {movimientos.length} movimiento(s) cargado(s)
      </p>

      {/* Table */}
      <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
        <CardBody className="p-0">
          <div ref={tableScrollRef} className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px] rounded-xl">
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
              isLoadingMore ? (
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
          isLoading={isLoading}
          loadingContent={<Spinner label="Cargando movimientos..." />}
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

export default MovimientosProductoPage;
