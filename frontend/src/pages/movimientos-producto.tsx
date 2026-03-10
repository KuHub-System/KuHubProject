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
  DateRangePicker
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import {
  findMovimientosConFiltros,
  IMotionAnswer,
  IMotionFilterRequest
} from '../services/movimiento-service';

// ─── Helpers ────────────────────────────────────────────────────────────────

const renderTipoMovimiento = (tipo: string) => {
  const tipoNormalizado = tipo.toUpperCase();
  switch (tipoNormalizado) {
    case 'ENTRADA':
      return <span className="text-success font-bold uppercase tracking-wide text-xs">Entrada</span>;
    case 'SALIDA_INVENTARIO':
      return <span className="text-warning font-bold uppercase tracking-wide text-xs">Salida Inventario</span>;
    case 'SALIDA_BODEGA':
      return <span className="text-warning font-bold uppercase tracking-wide text-xs">Salida Bodega</span>;
    case 'TRASLADO':
      return <span className="text-primary font-bold uppercase tracking-wide text-xs">Traslado</span>;
    case 'MERMA':
      return <span className="text-danger font-bold uppercase tracking-wide text-xs">Merma</span>;
    case 'AJUSTE':
      return <span className="text-warning-600 font-bold uppercase tracking-wide text-xs opacity-90">Ajuste</span>;
    case 'DEVOLUCION':
      return <span className="text-secondary font-bold uppercase tracking-wide text-xs">Devolución</span>;
    default:
      return <span className="font-bold uppercase tracking-wide text-xs">{tipo}</span>;
  }
};

// ─── Page ────────────────────────────────────────────────────────────────────

const MovimientosProductoPage: React.FC = () => {
  // Data state
  const [movimientos, setMovimientos] = React.useState<IMotionAnswer[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  // Refs to avoid stale closures in scroll handler
  const nextPageRef = React.useRef<number>(1);
  const isLoadingMoreRef = React.useRef<boolean>(false);
  const totalPagesRef = React.useRef<number>(1);

  // Filter state
  const [nombreProducto, setNombreProducto] = React.useState('');
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

  // Scroll listener
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;
      if (scrollY + windowHeight > fullHeight - 500) {
        cargarMasMovimientos();
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [cargarMasMovimientos]);

  // Trigger initial load on mount
  React.useEffect(() => {
    setDebouncedRequest({
      page: 1,
      nombreProducto: '',
      nombreResponsable: '',
      tipoMovimiento: 'TODOS',
      orden: 'MAS_RECIENTES',
      fechaInicio: null,
      fechaFin: null
    });
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 font-sans">
      {/* Header */}
      <div className="border-b border-default-200 pb-4">
        <h1 className="text-3xl font-bold text-secondary dark:text-foreground mb-1">
          Movimientos de Inventario
        </h1>
        <p className="text-default-500">Historial completo de movimientos con filtros avanzados.</p>
      </div>

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
          <SelectItem key="ENTRADA" startContent={<Icon icon="lucide:arrow-down-circle" className="text-success" />}>Entrada</SelectItem>
          <SelectItem key="SALIDA_INVENTARIO" startContent={<Icon icon="lucide:arrow-up-circle" className="text-warning" />}>Salida Inventario</SelectItem>
          <SelectItem key="SALIDA_BODEGA" startContent={<Icon icon="lucide:arrow-up-circle" className="text-warning" />}>Salida Bodega</SelectItem>
          <SelectItem key="TRASLADO" startContent={<Icon icon="lucide:truck" className="text-primary" />}>Traslado</SelectItem>
          <SelectItem key="MERMA" startContent={<Icon icon="lucide:alert-circle" className="text-danger" />}>Merma</SelectItem>
          <SelectItem key="AJUSTE" startContent={<Icon icon="lucide:sliders-horizontal" className="text-secondary" />}>Ajuste</SelectItem>
          <SelectItem key="DEVOLUCION" startContent={<Icon icon="lucide:undo-2" className="text-default-500" />}>Devolución</SelectItem>
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
      <Table
        aria-label="Tabla de movimientos"
        removeWrapper
        layout="fixed"
        classNames={{
          th: "bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs h-12",
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
          <TableColumn width="15%" align="center">PRODUCTO</TableColumn>
          <TableColumn width="10%" align="center">CATEGORÍA</TableColumn>
          <TableColumn width="10%" align="center">TIPO</TableColumn>
          <TableColumn width="5%"  align="center">CANTIDAD</TableColumn>
          <TableColumn width="15%" align="center">FECHA</TableColumn>
          <TableColumn width="20%" align="center">RESPONSABLE</TableColumn>
          <TableColumn width="25%" align="center">OBSERVACIÓN</TableColumn>
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
              <TableCell className="max-w-[200px]">
                <Tooltip content={mov.nombreProducto} delay={500} closeDelay={0}>
                  <div className="flex flex-col items-center truncate">
                    <span className="font-semibold text-secondary dark:text-foreground truncate text-center w-full">
                      {mov.nombreProducto}
                    </span>
                  </div>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Chip size="sm" variant="flat" className="bg-default-100 dark:bg-default-100/50 text-default-600 dark:text-default-300">
                  {mov.nombreCategoria || '-'}
                </Chip>
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
              <TableCell className="max-w-[180px]">
                <Tooltip content={mov.nombreUsuario} delay={500} closeDelay={0}>
                  <span className="truncate block text-center w-full">{mov.nombreUsuario}</span>
                </Tooltip>
              </TableCell>
              <TableCell className="max-w-[250px]">
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
  );
};

export default MovimientosProductoPage;
