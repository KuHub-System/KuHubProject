import React from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Spinner,
    Select,
    SelectItem,
    Tooltip,
    Chip,
    Input,
    Checkbox,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { TableSkeleton } from '../SkeletonLoader';
import {
    obtenerStockDisponiblesInventarioService,
    obtenerStockDisponiblesBodegaService,
    IStockDisponibleItem,
    obtenerDisponibleRealService,
    IDisponibleRealItem,
} from '../../services/solicitud/solicitud-service';
import { obtenerCategoriasActivasService } from '../../services/inventario/categoria-service';
import { useToast } from '../../hooks/useToast';
import { useModulePermission } from '../../contexts/permission-context';

interface StockDisponiblesModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    defaultTipo?: TipoVista;
}

type TipoVista = 'INVENTARIO' | 'BODEGA_TRANSITO' | 'DISPONIBLE_REAL';

const SCROLL_THRESHOLD_PX = 120;
const BUSQUEDA_DEBOUNCE_MS = 1500;

const fmtCant = (n: number): string =>
    Number(n).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

const StockDisponiblesModal: React.FC<StockDisponiblesModalProps> = ({
    isOpen,
    onOpenChange,
    defaultTipo = 'INVENTARIO',
}) => {
    const toast = useToast();
    const { canRead: verInventario }  = useModulePermission('SD_INVENTARIO');
    const { canRead: verBodega }      = useModulePermission('SD_BODEGA_TRANSITO');
    const { canRead: verReal }        = useModulePermission('SD_DISPONIBLE_REAL');
    const [tipo, setTipo] = React.useState<TipoVista>(defaultTipo);
    const [pagina, setPagina] = React.useState(1);
    const [totalPaginas, setTotalPaginas] = React.useState(1);
    const [totalRegistros, setTotalRegistros] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);
    const [items, setItems] = React.useState<IStockDisponibleItem[]>([]);
    const [itemsReal, setItemsReal] = React.useState<IDisponibleRealItem[]>([]);
    const [busqueda, setBusqueda] = React.useState('');
    const [categorias, setCategorias] = React.useState<{ id: number; nombre: string }[]>([]);
    const [categoriaId, setCategoriaId] = React.useState<number | undefined>(undefined);
    const [agrupado, setAgrupado] = React.useState(true);

    const scrollerRef = React.useRef<HTMLDivElement>(null);
    const isLoadingRef = React.useRef(false);
    const busquedaDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const esReal = tipo === 'DISPONIBLE_REAL';

    const cargar = React.useCallback(async (
        tipoParam: TipoVista,
        paginaParam: number,
        params: { categoriaId?: number; busqueda?: string; agrupado?: boolean },
        append: boolean
    ) => {
        isLoadingRef.current = true;
        if (append) setIsLoadingMore(true); else setIsLoading(true);
        try {
            if (tipoParam === 'DISPONIBLE_REAL') {
                const data = await obtenerDisponibleRealService(paginaParam, params.categoriaId, params.busqueda);
                setItemsReal(prev => append ? [...prev, ...data.data] : data.data);
                setTotalPaginas(data.totalPaginas);
                setTotalRegistros(data.totalRegistros);
            } else {
                const fetcher = tipoParam === 'INVENTARIO'
                    ? obtenerStockDisponiblesInventarioService
                    : obtenerStockDisponiblesBodegaService;
                const data = await fetcher(paginaParam, params.categoriaId, params.agrupado ?? true, params.busqueda);
                setItems(prev => append ? [...prev, ...data.data] : data.data);
                setTotalPaginas(data.totalPaginas);
                setTotalRegistros(data.totalRegistros);
            }
            setPagina(paginaParam);
        } catch {
            toast.error(
                tipoParam === 'DISPONIBLE_REAL'
                    ? 'No se pudo cargar el disponible real'
                    : 'No se pudo cargar el stock disponible'
            );
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
            isLoadingRef.current = false;
        }
    }, [toast]);

    React.useEffect(() => {
        if (isOpen) {
            const tipoInicial: TipoVista = verInventario ? 'INVENTARIO' : verBodega ? 'BODEGA_TRANSITO' : 'DISPONIBLE_REAL';
            setTipo(tipoInicial);
            setPagina(1);
            setBusqueda('');
            setCategoriaId(undefined);
            setAgrupado(true);
            setItems([]);
            setItemsReal([]);
            cargar(tipoInicial, 1, { agrupado: true }, false);
            obtenerCategoriasActivasService()
                .then(cats => setCategorias(cats.map(c => ({ id: parseInt(c.id), nombre: c.nombre }))))
                .catch(() => setCategorias([]));
        } else {
            setItems([]);
            setItemsReal([]);
            setPagina(1);
            setBusqueda('');
            setCategoriaId(undefined);
            setAgrupado(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleTipoChange = (nuevoTipo: TipoVista) => {
        if (nuevoTipo === tipo) return;
        setTipo(nuevoTipo);
        setPagina(1);
        setBusqueda('');
        setCategoriaId(undefined);
        setAgrupado(true);
        setItems([]);
        setItemsReal([]);
        cargar(nuevoTipo, 1, { agrupado: true }, false);
    };

    const handleCategoriaChange = (nuevaCategoriaId: number | undefined) => {
        setCategoriaId(nuevaCategoriaId);
        setPagina(1);
        setItems([]);
        setItemsReal([]);
        cargar(tipo, 1, { categoriaId: nuevaCategoriaId, busqueda, agrupado }, false);
    };

    const handleAgrupadoChange = (nuevoAgrupado: boolean) => {
        setAgrupado(nuevoAgrupado);
        setPagina(1);
        setItems([]);
        cargar(tipo, 1, { categoriaId, agrupado: nuevoAgrupado, busqueda }, false);
    };

    /** Ejecuta la búsqueda ya (sin esperar el debounce) para el valor indicado, en la pestaña activa. */
    const ejecutarBusqueda = React.useCallback((valor: string) => {
        setPagina(1);
        if (esReal) setItemsReal([]); else setItems([]);
        cargar(tipo, 1, { categoriaId, agrupado, busqueda: valor }, false);
    }, [tipo, esReal, categoriaId, agrupado, cargar]);

    /** Cada tecleo reprograma el debounce de 1.5s; solo la última tecla dispara la consulta. */
    const handleBusquedaChange = (valor: string) => {
        setBusqueda(valor);
        if (busquedaDebounceRef.current) clearTimeout(busquedaDebounceRef.current);
        busquedaDebounceRef.current = setTimeout(() => {
            busquedaDebounceRef.current = null;
            ejecutarBusqueda(valor);
        }, BUSQUEDA_DEBOUNCE_MS);
    };

    /** Al hacer clic fuera del buscador, si hay un debounce pendiente lo cancela y busca de inmediato. */
    const handleBusquedaBlur = () => {
        if (!busquedaDebounceRef.current) return;
        clearTimeout(busquedaDebounceRef.current);
        busquedaDebounceRef.current = null;
        ejecutarBusqueda(busqueda);
    };

    const handleBusquedaClear = () => {
        setBusqueda('');
        if (busquedaDebounceRef.current) {
            clearTimeout(busquedaDebounceRef.current);
            busquedaDebounceRef.current = null;
        }
        ejecutarBusqueda('');
    };

    // Scroll infinito: al acercarse al fondo del contenedor de la tabla, pide la siguiente página.
    React.useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const onScroll = () => {
            if (isLoadingRef.current) return;
            const { scrollTop, clientHeight, scrollHeight } = el;
            if (scrollTop + clientHeight < scrollHeight - SCROLL_THRESHOLD_PX) return;
            const cargados = esReal ? itemsReal.length : items.length;
            if (cargados >= totalRegistros || pagina >= totalPaginas) return;
            cargar(tipo, pagina + 1, { categoriaId, busqueda, agrupado }, true);
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [tipo, esReal, items.length, itemsReal.length, totalRegistros, pagina, totalPaginas, categoriaId, busqueda, agrupado, cargar]);

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size={esReal ? '5xl' : '3xl'}
            backdrop="blur"
            radius="lg"
            scrollBehavior="normal"
            classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]', closeButton: 'hover:bg-default-100 cursor-pointer' }}
        >
            <ModalContent>
                {(onClose) => (
                    <div className="max-h-[75vh] overflow-y-scroll custom-scrollbar">
                        <ModalHeader className="flex flex-col gap-1 border-b border-default-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Icon icon="lucide:package-check" width={20} className="text-primary" />
                                <span className="font-bold text-secondary dark:text-white">
                                    {esReal ? 'Disponible Real' : 'Stock Disponible'}
                                </span>
                                {totalRegistros > 0 && (
                                    <Chip size="sm" variant="flat" color="primary" className="ml-1">
                                        {totalRegistros}
                                    </Chip>
                                )}
                            </div>
                            <p className="text-xs text-default-500 font-normal">
                                {esReal
                                    ? 'Stock libre por producto, no asociado a ninguna solicitud'
                                    : 'Productos sobrantes no asociados a pedido o solicitud'}
                            </p>
                        </ModalHeader>

                        <ModalBody className="px-4 py-4 space-y-4">
                            {/* Toggle de vista */}
                            <div className="flex flex-wrap gap-2">
                                {verInventario && (
                                <Button
                                    size="sm"
                                    variant={tipo === 'INVENTARIO' ? 'solid' : 'flat'}
                                    color={tipo === 'INVENTARIO' ? 'primary' : 'default'}
                                    startContent={<Icon icon="lucide:package" width={14} />}
                                    onPress={() => handleTipoChange('INVENTARIO')}
                                >
                                    Inventario
                                </Button>
                                )}
                                {verBodega && (
                                <Button
                                    size="sm"
                                    variant={tipo === 'BODEGA_TRANSITO' ? 'solid' : 'flat'}
                                    color={tipo === 'BODEGA_TRANSITO' ? 'primary' : 'default'}
                                    startContent={<Icon icon="lucide:warehouse" width={14} />}
                                    onPress={() => handleTipoChange('BODEGA_TRANSITO')}
                                >
                                    Bodega Tránsito
                                </Button>
                                )}
                                {verReal && (
                                <Button
                                    size="sm"
                                    variant={esReal ? 'solid' : 'flat'}
                                    color={esReal ? 'success' : 'default'}
                                    startContent={<Icon icon="lucide:calculator" width={14} />}
                                    onPress={() => handleTipoChange('DISPONIBLE_REAL')}
                                >
                                    Disponible Real
                                </Button>
                                )}
                            </div>

                            {/* Mensaje contextual según vista */}
                            {esReal ? (
                                <div className="flex gap-2.5 rounded-xl px-4 py-3 text-xs border bg-success/5 border-success/20 text-success-700 dark:text-success-300">
                                    <Icon icon="lucide:calculator" width={15} className="shrink-0 mt-0.5" />
                                    <p className="leading-relaxed">
                                        El <strong>Disponible Real</strong> es el cálculo de todo el stock físico de{' '}
                                        <strong>Inventario + Bodega de Tránsito</strong>, restando la demanda de las
                                        solicitudes en estado <strong>EN_PEDIDO</strong> que ya fueron abastecidas por la
                                        entrega del proveedor de esos productos, y restando también lo{' '}
                                        <strong>reservado</strong> a solicitudes EN_PEDIDO. Es el mismo cálculo que se usa
                                        al <strong>Generar Orden de Pedido</strong> y en la tabla <strong>Por Pedido</strong>{' '}
                                        del Conglomerado: representa el stock libre, no asociado a ninguna solicitud.
                                    </p>
                                </div>
                            ) : (
                                <div className={`flex gap-2.5 rounded-xl px-4 py-3 text-xs border ${
                                    tipo === 'INVENTARIO'
                                        ? 'bg-primary/5 border-primary/20 text-primary-700 dark:text-primary-300'
                                        : 'bg-warning/5 border-warning/20 text-warning-700 dark:text-warning-300'
                                }`}>
                                    <Icon
                                        icon="lucide:info"
                                        width={15}
                                        className="shrink-0 mt-0.5"
                                    />
                                    <p className="leading-relaxed">
                                        {tipo === 'INVENTARIO' ? (
                                            <>
                                                Los productos listados están presentes en el{' '}
                                                <strong>stock de Inventario</strong>, pero su cantidad refleja
                                                sobrantes identificados durante el proceso de abastecimiento a
                                                Bodega de Tránsito: al preparar el envío, el encargado detectó
                                                que la cantidad real disponible era menor a la solicitada,
                                                indicando que había un excedente físico no gestionado en ese momento.
                                                Estos productos están disponibles en inventario pero{' '}
                                                <strong>no están asociados a ningún pedido o solicitud activo</strong>.
                                            </>
                                        ) : (
                                            <>
                                                Los productos listados están presentes en{' '}
                                                <strong>Bodega de Tránsito</strong> como sobrantes no gestionados.
                                                Esto puede ocurrir por ausencias de alumnos u otros motivos similares:
                                                los insumos fueron proyectados para una cantidad de alumnos que no se
                                                presentó, generando un excedente físico en la sala o bodega.
                                                Estos productos <strong>retornaron a bodega o no fueron entregados</strong>{' '}
                                                debido a sobrantes de clases anteriores, y aún no han sido
                                                reintegrados formalmente al inventario.
                                            </>
                                        )}
                                    </p>
                                </div>
                            )}

                            {/* Filtros: categoría + búsqueda por nombre, agrupados en un mismo contenedor (siempre presentes en las 3 pestañas) */}
                            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-default-200 dark:border-default-100 bg-default-50/50 dark:bg-default-100/5 p-2">
                                <Select
                                    size="sm"
                                    variant="bordered"
                                    radius="lg"
                                    aria-label="Filtrar por categoría"
                                    placeholder="Todas las categorías"
                                    startContent={<Icon icon="lucide:tags" width={16} className="text-default-400" />}
                                    className="max-w-[220px]"
                                    selectedKeys={categoriaId !== undefined ? [String(categoriaId)] : []}
                                    onSelectionChange={(keys) => {
                                        const key = Array.from(keys as Set<string>)[0];
                                        handleCategoriaChange(key ? parseInt(key) : undefined);
                                    }}
                                >
                                    {categorias.map((cat) => (
                                        <SelectItem key={cat.id} textValue={cat.nombre}>{cat.nombre}</SelectItem>
                                    ))}
                                </Select>
                                <Input
                                    size="sm"
                                    variant="bordered"
                                    radius="lg"
                                    aria-label="Buscar producto por nombre"
                                    value={busqueda}
                                    onValueChange={handleBusquedaChange}
                                    onBlur={handleBusquedaBlur}
                                    placeholder="Buscar por nombre de producto..."
                                    startContent={<Icon icon="lucide:search" width={16} className="text-default-400" />}
                                    isClearable
                                    onClear={handleBusquedaClear}
                                    className="max-w-sm flex-1"
                                />
                            </div>
                            {!esReal && (
                                <Checkbox
                                    size="sm"
                                    isSelected={agrupado}
                                    onValueChange={handleAgrupadoChange}
                                >
                                    <span className="text-xs text-default-600">
                                        Vista sumada por producto
                                    </span>
                                </Checkbox>
                            )}
                            {!esReal && !agrupado && (
                                <p className="text-xs text-default-400 -mt-2">
                                    Mostrando cada registro individual de sobrante, con quién lo registró.
                                </p>
                            )}

                            {/* Tabla */}
                            {isLoading ? (
                                <TableSkeleton rows={6} columns={8} />
                            ) : esReal ? (
                                itemsReal.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-default-400 gap-3">
                                        <Icon icon="lucide:inbox" width={40} />
                                        <p className="text-sm">
                                            {busqueda.trim()
                                                ? <>No hay productos que coincidan con <strong>"{busqueda.trim()}"</strong></>
                                                : 'No hay productos con disponible real para mostrar'}
                                        </p>
                                    </div>
                                ) : (
                                    <div
                                        ref={scrollerRef}
                                        className="overflow-x-auto overflow-y-auto max-h-[340px] rounded-lg border border-default-200 dark:border-default-100 custom-scrollbar"
                                    >
                                        <table className="min-w-[1000px] w-full text-xs table-fixed">
                                            <thead className="bg-default-100 dark:bg-default-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="text-center py-2 px-3 font-medium w-[180px]">
                                                        Nombre Producto
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-medium w-[120px]">
                                                        Categoría
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-medium w-[110px]">
                                                        En Inventario
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-medium w-[130px]">
                                                        En Bodega Tránsito
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-medium w-[110px]">
                                                        Stock Físico
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-medium w-[120px]">
                                                        Comprometido
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-medium w-[110px]">
                                                        Reservado
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-medium w-[120px]">
                                                        Disponible
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itemsReal.map((item, idx) => (
                                                    <tr
                                                        key={idx}
                                                        className="border-t border-default-100 hover:bg-default-100 dark:hover:bg-default-100/30"
                                                    >
                                                        <td className="py-2 px-3 text-center">
                                                            <Tooltip content={item.nombreProducto} color="foreground" className="text-xs">
                                                                <span className="truncate block whitespace-nowrap">
                                                                    {item.nombreProducto}
                                                                </span>
                                                            </Tooltip>
                                                        </td>
                                                        <td className="py-2 px-3 text-center text-default-500">
                                                            <Tooltip content={item.nombreCategoria} color="foreground" className="text-xs">
                                                                <span className="truncate block whitespace-nowrap">
                                                                    {item.nombreCategoria}
                                                                </span>
                                                            </Tooltip>
                                                        </td>
                                                        <td className="py-2 px-3 text-center font-mono tabular-nums text-default-600">
                                                            {fmtCant(item.inventario)}
                                                            <span className="text-default-400 ml-1">{item.abreviatura}</span>
                                                        </td>
                                                        <td className="py-2 px-3 text-center font-mono tabular-nums text-default-600">
                                                            {fmtCant(item.bodegaTransito)}
                                                            <span className="text-default-400 ml-1">{item.abreviatura}</span>
                                                        </td>
                                                        <td className="py-2 px-3 text-center font-mono tabular-nums font-semibold text-default-700">
                                                            {fmtCant(item.stockFisico)}
                                                            <span className="text-default-400 ml-1">{item.abreviatura}</span>
                                                        </td>
                                                        <td className="py-2 px-3 text-center font-mono tabular-nums">
                                                            {item.demandaComprometida > 0 ? (
                                                                <span className="text-default-600">
                                                                    {fmtCant(item.demandaComprometida)}
                                                                    <span className="text-default-400 ml-1">{item.abreviatura}</span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-default-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-3 text-center font-mono tabular-nums">
                                                            {item.reservado > 0 ? (
                                                                <span className="text-primary font-semibold">
                                                                    {fmtCant(item.reservado)}
                                                                    <span className="text-default-400 ml-1">{item.abreviatura}</span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-default-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-3 text-center font-mono tabular-nums font-semibold">
                                                            <span className={
                                                                item.disponible > 0
                                                                    ? 'text-success-600'
                                                                    : item.disponible < 0
                                                                        ? 'text-danger'
                                                                        : 'text-default-400'
                                                            }>
                                                                {fmtCant(item.disponible)}
                                                                <span className="text-default-400 ml-1">{item.abreviatura}</span>
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {isLoadingMore && (
                                                    <tr>
                                                        <td colSpan={8} className="py-3 text-center">
                                                            <Spinner size="sm" color="success" />
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            ) : items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-default-400 gap-3">
                                    <Icon icon="lucide:inbox" width={40} />
                                    <p className="text-sm">
                                        {busqueda.trim() ? (
                                            <>No hay productos que coincidan con <strong>"{busqueda.trim()}"</strong></>
                                        ) : (
                                            <>
                                                No hay stock disponible registrado para{' '}
                                                <strong>{tipo === 'INVENTARIO' ? 'Inventario' : 'Bodega Tránsito'}</strong>
                                            </>
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <div
                                    ref={scrollerRef}
                                    className="overflow-x-auto overflow-y-auto max-h-[340px] rounded-lg border border-default-200 dark:border-default-100 custom-scrollbar"
                                >
                                    <table className="min-w-[760px] w-full text-xs table-fixed">
                                        <thead className="bg-default-100 dark:bg-default-50 sticky top-0 z-10">
                                            <tr>
                                                <th className="text-center py-2 px-3 font-medium">
                                                    Nombre Producto
                                                </th>
                                                <th className="text-center py-2 px-3 font-medium w-36">
                                                    Categoría
                                                </th>
                                                <th className="text-center py-2 px-3 font-medium w-24">
                                                    Stock
                                                </th>
                                                <th className="text-center py-2 px-3 font-medium w-28">
                                                    Unidad Medida
                                                </th>
                                                <th className="text-center py-2 px-3 font-medium w-28">
                                                    Fecha Registro
                                                </th>
                                                {!agrupado && (
                                                    <th className="text-center py-2 px-3 font-medium w-32">
                                                        Usuario
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, idx) => (
                                                <tr
                                                    key={idx}
                                                    className="border-t border-default-100 hover:bg-default-100 dark:hover:bg-default-100/30"
                                                >
                                                    <td className="py-2 px-3 text-center">
                                                        <Tooltip
                                                            content={item.nombreProducto}
                                                            color="foreground"
                                                            className="text-xs"
                                                        >
                                                            <span className="truncate block whitespace-nowrap">
                                                                {item.nombreProducto}
                                                            </span>
                                                        </Tooltip>
                                                    </td>
                                                    <td className="py-2 px-3 text-center text-default-500">
                                                        <Tooltip
                                                            content={item.nombreCategoria}
                                                            color="foreground"
                                                            className="text-xs"
                                                        >
                                                            <span className="truncate block whitespace-nowrap">
                                                                {item.nombreCategoria}
                                                            </span>
                                                        </Tooltip>
                                                    </td>
                                                    <td className="py-2 px-3 text-center font-semibold tabular-nums">
                                                        {Number(item.stock).toLocaleString('es-CL', {
                                                            minimumFractionDigits: 0,
                                                            maximumFractionDigits: 3,
                                                        })}
                                                    </td>
                                                    <td className="py-2 px-3 text-center text-default-500">
                                                        <Tooltip
                                                            content={item.nombreUnidad}
                                                            color="foreground"
                                                            className="text-xs"
                                                        >
                                                            <span className="truncate block whitespace-nowrap">
                                                                {item.abreviatura}
                                                            </span>
                                                        </Tooltip>
                                                    </td>
                                                    <td className="py-2 px-3 text-center text-default-400">
                                                        {item.fechaRegistro ?? '—'}
                                                    </td>
                                                    {!agrupado && (
                                                        <td className="py-2 px-3 text-center text-default-500">
                                                            <Tooltip
                                                                content={item.usuario || 'Sin autor registrado'}
                                                                color="foreground"
                                                                className="text-xs"
                                                            >
                                                                <span className="truncate block whitespace-nowrap">
                                                                    {item.usuario || '—'}
                                                                </span>
                                                            </Tooltip>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                            {isLoadingMore && (
                                                <tr>
                                                    <td colSpan={agrupado ? 5 : 6} className="py-3 text-center">
                                                        <Spinner size="sm" color="primary" />
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </ModalBody>

                        <ModalFooter className="border-t border-default-100 pt-3">
                            <Button variant="flat" onPress={onClose}>
                                Cerrar
                            </Button>
                        </ModalFooter>
                    </div>
                )}
            </ModalContent>
        </Modal>
    );
};

export default StockDisponiblesModal;
