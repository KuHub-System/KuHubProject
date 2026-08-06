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
    DateRangePicker,
    useDisclosure,
} from '@heroui/react';
import { CalendarDate } from '@internationalized/date';
import { Icon } from '@iconify/react';
import { TableSkeleton } from '../SkeletonLoader';
import {
    obtenerDisponibleInventarioService,
    IDisponibleInventarioItem,
    obtenerDisponibleRealService,
    IDisponibleRealItem,
    obtenerSobranteBodegaTransitoPeriodoService,
    ISobranteBodegaPeriodoItem,
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

type RangoFechas = { start: CalendarDate; end: CalendarDate };
type PresetBodega = '3dias' | 'semana' | null;

const toCalendarDate = (d: Date): CalendarDate => new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
const fmtCalendarISO = (d: CalendarDate): string => `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;

/** Hoy hasta hoy + 3 días — cobertura típica de bodega de tránsito. */
const rango3Dias = (): RangoFechas => {
    const hoy = new Date();
    const fin = new Date(hoy);
    fin.setDate(hoy.getDate() + 3);
    return { start: toCalendarDate(hoy), end: toCalendarDate(fin) };
};

/** Semana actual, lunes a domingo. */
const rangoSemanaActual = (): RangoFechas => {
    const hoy = new Date();
    const dia = hoy.getDay(); // 0 = domingo
    const diffLunes = dia === 0 ? -6 : 1 - dia;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diffLunes);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return { start: toCalendarDate(lunes), end: toCalendarDate(domingo) };
};

const StockDisponiblesModal: React.FC<StockDisponiblesModalProps> = ({
    isOpen,
    onOpenChange,
    defaultTipo = 'INVENTARIO',
}) => {
    const toast = useToast();
    const { isOpen: isInventarioInfoOpen, onOpen: onInventarioInfoOpen, onOpenChange: onInventarioInfoOpenChange } = useDisclosure();
    const { isOpen: isRealInfoOpen, onOpen: onRealInfoOpen, onOpenChange: onRealInfoOpenChange } = useDisclosure();
    const { isOpen: isBodegaInfoOpen, onOpen: onBodegaInfoOpen, onOpenChange: onBodegaInfoOpenChange } = useDisclosure();
    const { canRead: verInventario }  = useModulePermission('SD_INVENTARIO');
    const { canRead: verBodega }      = useModulePermission('SD_BODEGA_TRANSITO');
    const { canRead: verReal }        = useModulePermission('SD_DISPONIBLE_REAL');
    const [tipo, setTipo] = React.useState<TipoVista>(defaultTipo);
    const [pagina, setPagina] = React.useState(1);
    const [totalPaginas, setTotalPaginas] = React.useState(1);
    const [totalRegistros, setTotalRegistros] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);
    const [items, setItems] = React.useState<IDisponibleInventarioItem[]>([]);
    const [itemsReal, setItemsReal] = React.useState<IDisponibleRealItem[]>([]);
    const [itemsBodegaPeriodo, setItemsBodegaPeriodo] = React.useState<ISobranteBodegaPeriodoItem[]>([]);
    const [busqueda, setBusqueda] = React.useState('');
    const [categorias, setCategorias] = React.useState<{ id: number; nombre: string }[]>([]);
    const [categoriaId, setCategoriaId] = React.useState<number | undefined>(undefined);

    // ── Bodega Tránsito: sobrante calculado por período (reemplaza los eventos registrados) ──
    const [bodegaRango, setBodegaRango] = React.useState<RangoFechas | null>(null);
    const [bodegaPreset, setBodegaPreset] = React.useState<PresetBodega>(null);

    const scrollerRef = React.useRef<HTMLDivElement>(null);
    const isLoadingRef = React.useRef(false);
    const busquedaDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const esReal = tipo === 'DISPONIBLE_REAL';
    const esBodegaPeriodo = tipo === 'BODEGA_TRANSITO';

    const cargar = React.useCallback(async (
        tipoParam: TipoVista,
        paginaParam: number,
        params: { categoriaId?: number; busqueda?: string; rango?: RangoFechas | null },
        append: boolean
    ) => {
        // Bodega Tránsito necesita un rango de fechas: sin él no hay nada que calcular todavía
        // (se setea apenas se abre la pestaña, ver efecto de isOpen y handleTipoChange).
        if (tipoParam === 'BODEGA_TRANSITO' && !params.rango) return;

        isLoadingRef.current = true;
        if (append) setIsLoadingMore(true); else setIsLoading(true);
        try {
            if (tipoParam === 'DISPONIBLE_REAL') {
                const data = await obtenerDisponibleRealService(paginaParam, params.categoriaId, params.busqueda);
                setItemsReal(prev => append ? [...prev, ...data.data] : data.data);
                setTotalPaginas(data.totalPaginas);
                setTotalRegistros(data.totalRegistros);
            } else if (tipoParam === 'BODEGA_TRANSITO') {
                const rango = params.rango!;
                const data = await obtenerSobranteBodegaTransitoPeriodoService(
                    fmtCalendarISO(rango.start), fmtCalendarISO(rango.end),
                    paginaParam, params.categoriaId, params.busqueda
                );
                setItemsBodegaPeriodo(prev => append ? [...prev, ...data.data] : data.data);
                setTotalPaginas(data.totalPaginas);
                setTotalRegistros(data.totalRegistros);
            } else {
                const data = await obtenerDisponibleInventarioService(paginaParam, params.categoriaId, params.busqueda);
                setItems(prev => append ? [...prev, ...data.data] : data.data);
                setTotalPaginas(data.totalPaginas);
                setTotalRegistros(data.totalRegistros);
            }
            setPagina(paginaParam);
        } catch {
            toast.error(
                tipoParam === 'DISPONIBLE_REAL'
                    ? 'No se pudo cargar el disponible real'
                    : tipoParam === 'BODEGA_TRANSITO'
                        ? 'No se pudo calcular el sobrante de Bodega de Tránsito'
                        : 'No se pudo calcular el disponible de Inventario'
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
            setItems([]);
            setItemsReal([]);
            setItemsBodegaPeriodo([]);
            if (tipoInicial === 'BODEGA_TRANSITO') {
                const rango = rango3Dias();
                setBodegaRango(rango);
                setBodegaPreset('3dias');
                cargar(tipoInicial, 1, { rango }, false);
            } else {
                setBodegaRango(null);
                setBodegaPreset(null);
                cargar(tipoInicial, 1, {}, false);
            }
            obtenerCategoriasActivasService()
                .then(cats => setCategorias(cats.map(c => ({ id: parseInt(c.id), nombre: c.nombre }))))
                .catch(() => setCategorias([]));
        } else {
            setItems([]);
            setItemsReal([]);
            setItemsBodegaPeriodo([]);
            setPagina(1);
            setBusqueda('');
            setCategoriaId(undefined);
            setBodegaRango(null);
            setBodegaPreset(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleTipoChange = (nuevoTipo: TipoVista) => {
        if (nuevoTipo === tipo) return;
        setTipo(nuevoTipo);
        setPagina(1);
        setBusqueda('');
        setCategoriaId(undefined);
        setItems([]);
        setItemsReal([]);
        setItemsBodegaPeriodo([]);
        if (nuevoTipo === 'BODEGA_TRANSITO') {
            // Reusa el rango si ya se había elegido uno antes en esta apertura del modal.
            const rango = bodegaRango ?? rango3Dias();
            setBodegaRango(rango);
            if (!bodegaRango) setBodegaPreset('3dias');
            cargar(nuevoTipo, 1, { rango }, false);
        } else {
            cargar(nuevoTipo, 1, {}, false);
        }
    };

    const handleCategoriaChange = (nuevaCategoriaId: number | undefined) => {
        setCategoriaId(nuevaCategoriaId);
        setPagina(1);
        setItems([]);
        setItemsReal([]);
        setItemsBodegaPeriodo([]);
        cargar(tipo, 1, { categoriaId: nuevaCategoriaId, busqueda, rango: bodegaRango }, false);
    };

    /** Cambia el rango de Bodega Tránsito (preset o manual) y recarga desde la página 1. */
    const aplicarRangoBodega = (rango: RangoFechas, preset: PresetBodega) => {
        setBodegaRango(rango);
        setBodegaPreset(preset);
        setPagina(1);
        setItemsBodegaPeriodo([]);
        cargar('BODEGA_TRANSITO', 1, { categoriaId, busqueda, rango }, false);
    };

    /** Ejecuta la búsqueda ya (sin esperar el debounce) para el valor indicado, en la pestaña activa. */
    const ejecutarBusqueda = React.useCallback((valor: string) => {
        setPagina(1);
        if (esReal) setItemsReal([]);
        else if (esBodegaPeriodo) setItemsBodegaPeriodo([]);
        else setItems([]);
        cargar(tipo, 1, { categoriaId, busqueda: valor, rango: bodegaRango }, false);
    }, [tipo, esReal, esBodegaPeriodo, categoriaId, bodegaRango, cargar]);

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
            const cargados = esReal ? itemsReal.length : esBodegaPeriodo ? itemsBodegaPeriodo.length : items.length;
            if (cargados >= totalRegistros || pagina >= totalPaginas) return;
            cargar(tipo, pagina + 1, { categoriaId, busqueda, rango: bodegaRango }, true);
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [tipo, esReal, esBodegaPeriodo, items.length, itemsReal.length, itemsBodegaPeriodo.length, totalRegistros, pagina, totalPaginas, categoriaId, busqueda, bodegaRango, cargar]);

    return (
        <>
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size={esBodegaPeriodo ? '3xl' : '5xl'}
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
                                {tipo === 'INVENTARIO' && (
                                    <Tooltip content="Cómo se calcula el disponible en inventario">
                                        <button
                                            type="button"
                                            onClick={onInventarioInfoOpen}
                                            className="text-default-400 hover:text-primary transition-colors cursor-pointer"
                                            aria-label="Cómo se calcula el disponible en inventario"
                                        >
                                            <Icon icon="lucide:info" width={16} />
                                        </button>
                                    </Tooltip>
                                )}
                                {esReal && (
                                    <Tooltip content="Cómo se calcula el Disponible Real">
                                        <button
                                            type="button"
                                            onClick={onRealInfoOpen}
                                            className="text-default-400 hover:text-primary transition-colors cursor-pointer"
                                            aria-label="Cómo se calcula el Disponible Real"
                                        >
                                            <Icon icon="lucide:info" width={16} />
                                        </button>
                                    </Tooltip>
                                )}
                                {esBodegaPeriodo && (
                                    <Tooltip content="Cómo se calcula el excedente en Bodega de Tránsito">
                                        <button
                                            type="button"
                                            onClick={onBodegaInfoOpen}
                                            className="text-default-400 hover:text-primary transition-colors cursor-pointer"
                                            aria-label="Cómo se calcula el excedente en Bodega de Tránsito"
                                        >
                                            <Icon icon="lucide:info" width={16} />
                                        </button>
                                    </Tooltip>
                                )}
                            </div>
                            <p className="text-xs text-default-500 font-normal">
                                {esReal
                                    ? 'Stock libre por producto, no asociado a ninguna solicitud'
                                    : esBodegaPeriodo
                                        ? 'Excedente en bodega de tránsito para el período consultado'
                                        : 'Stock en inventario que no está comprometido con ninguna solicitud'}
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
                            ) : esBodegaPeriodo ? (
                                <div className="flex gap-2.5 rounded-xl px-4 py-3 text-xs border bg-warning/5 border-warning/20 text-warning-700 dark:text-warning-300">
                                    <Icon icon="lucide:info" width={15} className="shrink-0 mt-0.5" />
                                    <p className="leading-relaxed space-y-1.5">
                                        <span className="block">
                                            El <strong>excedente</strong> corresponde al stock presente en la
                                            bodega de tránsito que supera la cantidad necesaria para cubrir las
                                            solicitudes del período seleccionado. Como no está asociado a ninguna
                                            solicitud vigente dentro del tramo consultado, debería ser{' '}
                                            <strong>devuelto al inventario</strong> para quedar disponible nuevamente.
                                        </span>
                                        <span className="block">
                                            <strong>Importante:</strong> la bodega de tránsito suele mantener un
                                            stock preventivo para cubrir aproximadamente 3 días de clases. Por
                                            ello, aunque exista un excedente para el período consultado, es
                                            necesario continuar abasteciendo las solicitudes de los días posteriores.
                                        </span>
                                    </p>
                                </div>
                            ) : (
                                <div className="flex gap-2.5 rounded-xl px-4 py-3 text-xs border bg-primary/5 border-primary/20 text-primary-700 dark:text-primary-300">
                                    <Icon icon="lucide:info" width={15} className="shrink-0 mt-0.5" />
                                    <p className="leading-relaxed space-y-1.5">
                                        <span className="block">
                                            El <strong>disponible en inventario</strong> es el stock que hoy está
                                            físicamente en inventario y <strong>no está comprometido</strong> con
                                            ninguna solicitud en estado <strong>EN_PEDIDO</strong>. Del total
                                            comprometido se descuenta primero la parte que ya se abasteció a{' '}
                                            <strong>Bodega de Tránsito</strong>: ese stock ya salió del inventario,
                                            así que restarlo de nuevo lo contaría dos veces.
                                        </span>
                                        <span className="block">
                                            El <strong>excedente en bodega</strong> existe físicamente pero necesita un
                                            movimiento de <strong>devolución a inventario</strong> para volver a estar
                                            disponible acá. Sumando ambas columnas se obtiene el mismo número que
                                            muestra la pestaña <strong>Disponible Real</strong>.
                                        </span>
                                    </p>
                                </div>
                            )}

                            {/* Bodega Tránsito: selector de período + presets rápidos */}
                            {esBodegaPeriodo && (
                                <div className="flex flex-wrap items-end gap-2 rounded-lg border border-default-200 dark:border-default-100 bg-default-50/50 dark:bg-default-100/5 p-2">
                                    <div className="flex-1 min-w-[220px]">
                                        <DateRangePicker
                                            size="sm"
                                            variant="bordered"
                                            radius="lg"
                                            label="Período consultado"
                                            aria-label="Período consultado"
                                            value={bodegaRango}
                                            onChange={(rango) => {
                                                if (rango?.start && rango?.end) aplicarRangoBodega(rango, null);
                                            }}
                                        />
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={bodegaPreset === '3dias' ? 'solid' : 'flat'}
                                        color={bodegaPreset === '3dias' ? 'warning' : 'default'}
                                        onPress={() => aplicarRangoBodega(rango3Dias(), '3dias')}
                                    >
                                        3 días
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={bodegaPreset === 'semana' ? 'solid' : 'flat'}
                                        color={bodegaPreset === 'semana' ? 'warning' : 'default'}
                                        onPress={() => aplicarRangoBodega(rangoSemanaActual(), 'semana')}
                                    >
                                        Esta semana
                                    </Button>
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
                            ) : esBodegaPeriodo ? (
                                itemsBodegaPeriodo.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-default-400 gap-3">
                                        <Icon icon="lucide:inbox" width={40} />
                                        <p className="text-sm">
                                            {busqueda.trim() ? (
                                                <>No hay productos que coincidan con <strong>"{busqueda.trim()}"</strong></>
                                            ) : (
                                                'No hay excedente en Bodega de Tránsito para el período seleccionado'
                                            )}
                                        </p>
                                    </div>
                                ) : (
                                    <div
                                        ref={scrollerRef}
                                        className="overflow-x-auto overflow-y-auto max-h-[340px] rounded-lg border border-default-200 dark:border-default-100 custom-scrollbar"
                                    >
                                        <table className="min-w-[820px] w-full text-xs table-fixed">
                                            <thead className="bg-default-100 dark:bg-default-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="text-center py-2 px-3 font-medium">
                                                        Nombre Producto
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-medium w-32">
                                                        Categoría
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-medium w-28">
                                                        En Bodega
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-medium w-32">
                                                        Demandado (período)
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-medium w-28">
                                                        Excedente
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itemsBodegaPeriodo.map((item, idx) => (
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
                                                            {fmtCant(item.stockBodegaTransito)}
                                                            <span className="text-default-400 ml-1">{item.abreviatura}</span>
                                                        </td>
                                                        <td className="py-2 px-3 text-center font-mono tabular-nums">
                                                            {item.cantidadDemandada > 0 ? (
                                                                <span className="text-default-600">
                                                                    {fmtCant(item.cantidadDemandada)}
                                                                    <span className="text-default-400 ml-1">{item.abreviatura}</span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-default-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-3 text-center font-mono tabular-nums font-semibold text-warning-600">
                                                            {fmtCant(item.cantidadSobrante)}
                                                            <span className="text-default-400 ml-1">{item.abreviatura}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {isLoadingMore && (
                                                    <tr>
                                                        <td colSpan={5} className="py-3 text-center">
                                                            <Spinner size="sm" color="warning" />
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
                                            'No hay productos con stock ni compromiso para mostrar'
                                        )}
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
                                                <th className="text-center py-2 px-3 font-medium w-[120px]">
                                                    Comprometido
                                                </th>
                                                <th className="text-center py-2 px-3 font-medium w-[130px]">
                                                    Cubierto en Bodega
                                                </th>
                                                <th className="text-center py-2 px-3 font-medium w-[140px]">
                                                    Disponible en Inventario
                                                </th>
                                                <th className="text-center py-2 px-3 font-medium w-[130px]">
                                                    Excedente en Bodega
                                                </th>
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
                                                    <td className="py-2 px-3 text-center font-mono tabular-nums text-default-600">
                                                        {fmtCant(item.inventario)}
                                                        <span className="text-default-400 ml-1">{item.abreviatura}</span>
                                                    </td>
                                                    <td className="py-2 px-3 text-center font-mono tabular-nums">
                                                        {item.comprometido > 0 ? (
                                                            <span className="text-default-600">
                                                                {fmtCant(item.comprometido)}
                                                                <span className="text-default-400 ml-1">{item.abreviatura}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-default-300">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3 text-center font-mono tabular-nums">
                                                        {item.cubiertoBodega > 0 ? (
                                                            <Tooltip
                                                                content="Parte del comprometido que ya se trasladó a bodega de tránsito, por eso no se descuenta del inventario."
                                                                color="foreground"
                                                                className="text-xs max-w-[260px]"
                                                            >
                                                                <span className="text-default-600">
                                                                    {fmtCant(item.cubiertoBodega)}
                                                                    <span className="text-default-400 ml-1">{item.abreviatura}</span>
                                                                </span>
                                                            </Tooltip>
                                                        ) : (
                                                            <span className="text-default-300">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3 text-center font-mono tabular-nums font-semibold">
                                                        <span className={
                                                            item.disponibleInventario > 0
                                                                ? 'text-success-600'
                                                                : item.disponibleInventario < 0
                                                                    ? 'text-danger'
                                                                    : 'text-default-400'
                                                        }>
                                                            {fmtCant(item.disponibleInventario)}
                                                            <span className="text-default-400 ml-1">{item.abreviatura}</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3 text-center font-mono tabular-nums">
                                                        {item.excedenteBodega > 0 ? (
                                                            <Tooltip
                                                                content="Stock en bodega de tránsito sin compromiso. Requiere un movimiento de devolución para volver al inventario."
                                                                color="foreground"
                                                                className="text-xs max-w-[260px]"
                                                            >
                                                                <span className="text-warning-600 font-semibold">
                                                                    {fmtCant(item.excedenteBodega)}
                                                                    <span className="text-default-400 ml-1">{item.abreviatura}</span>
                                                                </span>
                                                            </Tooltip>
                                                        ) : (
                                                            <span className="text-default-300">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {isLoadingMore && (
                                                <tr>
                                                    <td colSpan={7} className="py-3 text-center">
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

        {/* Modal indicador — explica el cálculo de Disponible en Inventario */}
        <Modal
            isOpen={isInventarioInfoOpen}
            onOpenChange={onInventarioInfoOpenChange}
            size="xl"
            backdrop="blur"
            radius="lg"
            scrollBehavior="normal"
            classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]', closeButton: 'hover:bg-default-100 cursor-pointer' }}
        >
            <ModalContent>
                {(onInfoClose) => (
                    <div className="max-h-[75vh] overflow-y-scroll custom-scrollbar">
                        <ModalHeader className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <Icon icon="lucide:info" width={20} className="text-primary" />
                                <h2 className="text-lg font-bold text-secondary dark:text-foreground">Cómo se calcula el Disponible en Inventario</h2>
                            </div>
                            <p className="text-xs text-default-500 font-normal">
                                Cuánto de lo que hoy hay en inventario está realmente libre, sin contar lo que ya está apartado para pedidos en curso.
                            </p>
                        </ModalHeader>
                        <ModalBody className="space-y-5 pb-6">
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-secondary dark:text-foreground">¿Qué es "comprometido"?</h3>
                                <p className="text-sm text-default-600">
                                    Es todo lo que los pedidos que aún están en curso ya tienen apartado de un producto:
                                    lo que ya se les entregó desde el proveedor, más lo que se les separó del stock que
                                    ya existía antes de pedir. Ese producto sigue "reservado" para ellos aunque todavía
                                    no haya salido a ningún lado — por eso no cuenta como libre.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-secondary dark:text-foreground">¿Por qué no basta con restar el compromiso del inventario?</h3>
                                <p className="text-sm text-default-600">
                                    Porque parte de ese compromiso puede que ya se haya movido a Bodega de Tránsito para
                                    entregarlo pronto. Ese stock ya no está físicamente en inventario — se fue. Si además
                                    lo restáramos del inventario por estar comprometido, lo estaríamos descontando{' '}
                                    <strong>dos veces</strong>: una porque ya no está ahí, y otra porque sigue apartado.
                                    Por eso primero se revisa cuánto del compromiso ya está cubierto en bodega, y solo se
                                    descuenta del inventario la parte que todavía sigue ahí.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-secondary dark:text-foreground">Qué significa cada número</h3>
                                <ul className="text-sm text-default-600 list-disc pl-5 space-y-1.5">
                                    <li><strong>Comprometido</strong> — todo lo que los pedidos en curso ya tienen apartado de este producto.</li>
                                    <li><strong>Cubierto en bodega</strong> — de ese compromiso, cuánto ya está guardado en Bodega de Tránsito.</li>
                                    <li><strong>Disponible en inventario</strong> — lo que de verdad queda libre en inventario, una vez descontada solo la parte del compromiso que sigue ahí (la que no se movió a bodega).</li>
                                    <li><strong>Excedente en bodega</strong> — lo que sobra en bodega por encima de lo comprometido. Existe, pero hay que devolverlo a inventario para que vuelva a contar ahí como disponible.</li>
                                </ul>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-secondary dark:text-foreground">Ejemplo 1 — el compromiso ya se cubrió por completo en bodega</h3>
                                <div className="rounded-lg border border-default-200 dark:border-default-100 p-3 text-sm text-default-600 space-y-1">
                                    <p>Harina — Inventario: <strong>30 kg</strong> · Bodega: <strong>15 kg</strong> · Comprometido: <strong>10 kg</strong></p>
                                    <p>Cubierto en bodega = mín(15, 10) = <strong>10 kg</strong></p>
                                    <p>Disponible en inventario = 30 − (10 − 10) = <strong className="text-success-600">30 kg</strong> — como el compromiso ya está cubierto por bodega, nada bloquea el inventario.</p>
                                    <p>Excedente en bodega = 15 − 10 = <strong className="text-warning-600">5 kg</strong> — sobran 5 kg en bodega sin compromiso, listos para devolver.</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-secondary dark:text-foreground">Ejemplo 2 — bodega solo cubre una parte del compromiso</h3>
                                <div className="rounded-lg border border-default-200 dark:border-default-100 p-3 text-sm text-default-600 space-y-1">
                                    <p>Harina — Inventario: <strong>30 kg</strong> · Bodega: <strong>12 kg</strong> · Comprometido: <strong>25 kg</strong></p>
                                    <p>Cubierto en bodega = mín(12, 25) = <strong>12 kg</strong></p>
                                    <p>Disponible en inventario = 30 − (25 − 12) = <strong className="text-success-600">17 kg</strong> — los 13 kg de compromiso que aún no salieron de inventario sí se descuentan.</p>
                                    <p>Excedente en bodega = 12 − 12 = <strong className="text-default-400">0 kg</strong> — todo lo que hay en bodega está comprometido, no sobra nada.</p>
                                </div>
                            </div>

                            <div className="flex gap-2.5 rounded-xl px-4 py-3 text-xs border bg-success/5 border-success/20 text-success-700 dark:text-success-300">
                                <Icon icon="lucide:check-circle-2" width={15} className="shrink-0 mt-0.5" />
                                <p className="leading-relaxed">
                                    En ambos ejemplos, <strong>Disponible en inventario + Excedente en bodega</strong> da el
                                    mismo número que la pestaña <strong>Disponible Real</strong> (inventario + bodega −
                                    comprometido): 30 y 22 kg respectivamente. Son la misma cifra, partida entre lo usable
                                    ahora desde inventario y lo que existe pero necesita devolución.
                                </p>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="primary" variant="flat" onPress={onInfoClose} className="font-medium">
                                Entendido
                            </Button>
                        </ModalFooter>
                    </div>
                )}
            </ModalContent>
        </Modal>

        {/* Modal indicador — explica el cálculo de Disponible Real */}
        <Modal
            isOpen={isRealInfoOpen}
            onOpenChange={onRealInfoOpenChange}
            size="xl"
            backdrop="blur"
            radius="lg"
            scrollBehavior="normal"
            classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]', closeButton: 'hover:bg-default-100 cursor-pointer' }}
        >
            <ModalContent>
                {(onInfoClose) => (
                    <div className="max-h-[75vh] overflow-y-scroll custom-scrollbar">
                        <ModalHeader className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <Icon icon="lucide:info" width={20} className="text-primary" />
                                <h2 className="text-lg font-bold text-secondary dark:text-foreground">Cómo se calcula el Disponible Real</h2>
                            </div>
                            <p className="text-xs text-default-500 font-normal">
                                Cuánto de un producto está realmente libre en todo el sistema, sin importar en qué depósito esté guardado.
                            </p>
                        </ModalHeader>
                        <ModalBody className="space-y-5 pb-6">
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-secondary dark:text-foreground">Suma los dos depósitos juntos</h3>
                                <p className="text-sm text-default-600">
                                    Un producto puede estar guardado en <strong>Inventario</strong> o en{' '}
                                    <strong>Bodega de Tránsito</strong>, pero moverlo de uno a otro no cambia cuánto hay
                                    en total — solo cambia dónde está. Por eso el Disponible Real parte de sumar el
                                    stock físico de ambos depósitos, sin importar la ubicación.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-secondary dark:text-foreground">Qué se resta de esa suma</h3>
                                <ul className="text-sm text-default-600 list-disc pl-5 space-y-1.5">
                                    <li><strong>Demanda comprometida</strong> — lo que los pedidos en curso ya recibieron del proveedor. Ese stock, aunque físicamente esté guardado, ya tiene dueño.</li>
                                    <li><strong>Reservado</strong> — lo que se apartó del stock que ya existía (sin pedirlo al proveedor) para cubrir un pedido en curso.</li>
                                </ul>
                                <p className="text-sm text-default-600">
                                    Lo que queda después de esas dos restas es stock que no está prometido a nadie
                                    todavía: es lo que de verdad se puede usar para cubrir una nueva necesidad.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-secondary dark:text-foreground">Ejemplo</h3>
                                <div className="rounded-lg border border-default-200 dark:border-default-100 p-3 text-sm text-default-600 space-y-1">
                                    <p>Harina — Inventario: <strong>20 kg</strong> · Bodega: <strong>15 kg</strong> → Stock físico total: <strong>35 kg</strong></p>
                                    <p>Demanda comprometida (ya llegó del proveedor para pedidos en curso): <strong>10 kg</strong></p>
                                    <p>Reservado (apartado del stock existente para otro pedido en curso): <strong>5 kg</strong></p>
                                    <p>Disponible Real = 35 − 10 − 5 = <strong className="text-success-600">20 kg</strong> libres para usar.</p>
                                </div>
                            </div>

                            <div className="flex gap-2.5 rounded-xl px-4 py-3 text-xs border bg-success/5 border-success/20 text-success-700 dark:text-success-300">
                                <Icon icon="lucide:check-circle-2" width={15} className="shrink-0 mt-0.5" />
                                <p className="leading-relaxed">
                                    Es el mismo número que usa el sistema al <strong>Generar Orden de Pedido</strong>{' '}
                                    (para decidir si conviene cubrir con stock propio antes de pedirle al proveedor) y
                                    en la tabla <strong>Por Pedido</strong> del Conglomerado. La pestaña{' '}
                                    <strong>Disponible en Inventario</strong> reparte esta misma cifra entre lo usable
                                    ahora desde inventario y lo que sobra en bodega esperando una devolución.
                                </p>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="primary" variant="flat" onPress={onInfoClose} className="font-medium">
                                Entendido
                            </Button>
                        </ModalFooter>
                    </div>
                )}
            </ModalContent>
        </Modal>

        {/* Modal indicador — explica el cálculo del excedente en Bodega de Tránsito */}
        <Modal
            isOpen={isBodegaInfoOpen}
            onOpenChange={onBodegaInfoOpenChange}
            size="xl"
            backdrop="blur"
            radius="lg"
            scrollBehavior="normal"
            classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]', closeButton: 'hover:bg-default-100 cursor-pointer' }}
        >
            <ModalContent>
                {(onInfoClose) => (
                    <div className="max-h-[75vh] overflow-y-scroll custom-scrollbar">
                        <ModalHeader className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <Icon icon="lucide:info" width={20} className="text-primary" />
                                <h2 className="text-lg font-bold text-secondary dark:text-foreground">Cómo se calcula el excedente en Bodega de Tránsito</h2>
                            </div>
                            <p className="text-xs text-default-500 font-normal">
                                Cuánto del stock de bodega sobra después de cubrir las clases del período que elegiste.
                            </p>
                        </ModalHeader>
                        <ModalBody className="space-y-5 pb-6">
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-secondary dark:text-foreground">Es un cálculo acotado a un período</h3>
                                <p className="text-sm text-default-600">
                                    A diferencia de Disponible Real o Disponible en Inventario, esta vista no mira todo
                                    el compromiso del sistema: solo compara el stock que hoy está físicamente en
                                    Bodega de Tránsito contra lo que necesitan las solicitudes cuya fecha de clase cae{' '}
                                    <strong>dentro del rango de fechas que elegiste</strong> arriba (por ejemplo, "3 días" o "esta semana").
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-secondary dark:text-foreground">La fórmula</h3>
                                <p className="text-sm text-default-600">
                                    Excedente = stock actual en bodega − lo que piden las solicitudes del período. Si el
                                    resultado es positivo, hay más stock del que ese período necesita y se muestra en la
                                    lista. Si el stock no alcanza, el producto directamente no aparece — no hay
                                    excedente que mostrar.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-secondary dark:text-foreground">Ejemplo</h3>
                                <div className="rounded-lg border border-default-200 dark:border-default-100 p-3 text-sm text-default-600 space-y-1">
                                    <p>Harina — Stock actual en bodega: <strong>20 kg</strong></p>
                                    <p>Solicitudes con clase entre hoy y los próximos 3 días: <strong>12 kg</strong> pedidos</p>
                                    <p>Excedente = 20 − 12 = <strong className="text-warning-600">8 kg</strong> sobran para ese tramo puntual.</p>
                                </div>
                            </div>

                            <div className="flex gap-2.5 rounded-xl px-4 py-3 text-xs border bg-warning/5 border-warning/20 text-warning-700 dark:text-warning-300">
                                <Icon icon="lucide:alert-triangle" width={15} className="shrink-0 mt-0.5" />
                                <p className="leading-relaxed">
                                    Bodega de Tránsito suele mantener un stock preventivo para cubrir alrededor de{' '}
                                    <strong>3 días de clases</strong>. Por eso, que haya excedente en el período
                                    consultado no significa que se pueda parar de abastecer: los 8 kg del ejemplo son
                                    para cubrir el rango elegido, pero las clases de los días siguientes van a seguir
                                    necesitando su propio stock.
                                </p>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="primary" variant="flat" onPress={onInfoClose} className="font-medium">
                                Entendido
                            </Button>
                        </ModalFooter>
                    </div>
                )}
            </ModalContent>
        </Modal>
        </>
    );
};

export default StockDisponiblesModal;
