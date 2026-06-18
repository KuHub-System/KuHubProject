import React from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Spinner,
    Pagination,
    Tooltip,
    Chip,
    Input,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import {
    obtenerStockDisponiblesService,
    IStockDisponibleItem,
    IStockDisponiblePage,
    obtenerDisponibleRealService,
    IDisponibleRealItem,
} from '../../services/solicitud-service';
import { useToast } from '../../hooks/useToast';

interface StockDisponiblesModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    defaultTipo?: TipoVista;
}

type TipoVista = 'INVENTARIO' | 'BODEGA_TRANSITO' | 'DISPONIBLE_REAL';

const fmtCant = (n: number): string =>
    Number(n).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

const StockDisponiblesModal: React.FC<StockDisponiblesModalProps> = ({
    isOpen,
    onOpenChange,
    defaultTipo = 'INVENTARIO',
}) => {
    const toast = useToast();
    const [tipo, setTipo] = React.useState<TipoVista>(defaultTipo);
    const [pagina, setPagina] = React.useState<number>(1);
    const [isLoading, setIsLoading] = React.useState(false);
    const [resultado, setResultado] = React.useState<IStockDisponiblePage | null>(null);
    const [datosReal, setDatosReal] = React.useState<IDisponibleRealItem[]>([]);
    const [busqueda, setBusqueda] = React.useState('');

    const cargar = React.useCallback(async (tipoParam: TipoVista, paginaParam: number) => {
        setIsLoading(true);
        try {
            if (tipoParam === 'DISPONIBLE_REAL') {
                const data = await obtenerDisponibleRealService();
                setDatosReal(data);
            } else {
                const data = await obtenerStockDisponiblesService(tipoParam, paginaParam);
                setResultado(data);
            }
        } catch {
            toast.error(
                tipoParam === 'DISPONIBLE_REAL'
                    ? 'No se pudo cargar el disponible real'
                    : 'No se pudo cargar el stock disponible'
            );
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        if (isOpen) {
            setTipo(defaultTipo);
            setPagina(1);
            setBusqueda('');
            cargar(defaultTipo, 1);
        } else {
            setResultado(null);
            setDatosReal([]);
            setPagina(1);
            setBusqueda('');
            setTipo(defaultTipo);
        }
    }, [isOpen]);

    const handleTipoChange = (nuevoTipo: TipoVista) => {
        if (nuevoTipo === tipo) return;
        setTipo(nuevoTipo);
        setPagina(1);
        setBusqueda('');
        cargar(nuevoTipo, 1);
    };

    const handlePaginaChange = (nuevaPagina: number) => {
        setPagina(nuevaPagina);
        cargar(tipo, nuevaPagina);
    };

    const esReal = tipo === 'DISPONIBLE_REAL';
    const items: IStockDisponibleItem[] = esReal ? [] : resultado?.data ?? [];
    const itemsReal: IDisponibleRealItem[] = React.useMemo(() => {
        if (!esReal) return [];
        const q = busqueda.trim().toLowerCase();
        if (!q) return datosReal;
        return datosReal.filter((it) => it.nombreProducto.toLowerCase().includes(q));
    }, [esReal, busqueda, datosReal]);
    const totalPaginas = esReal ? 1 : resultado?.totalPaginas ?? 1;
    const totalRegistros = esReal ? itemsReal.length : resultado?.totalRegistros ?? 0;

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size={esReal ? '5xl' : '3xl'}
            backdrop="blur"
            radius="lg"
            scrollBehavior="inside"
            classNames={{ base: 'rounded-2xl my-auto', body: 'min-h-[260px] py-3' }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
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
                                <Button
                                    size="sm"
                                    variant={tipo === 'INVENTARIO' ? 'solid' : 'flat'}
                                    color={tipo === 'INVENTARIO' ? 'primary' : 'default'}
                                    startContent={<Icon icon="lucide:package" width={14} />}
                                    onPress={() => handleTipoChange('INVENTARIO')}
                                >
                                    Inventario
                                </Button>
                                <Button
                                    size="sm"
                                    variant={tipo === 'BODEGA_TRANSITO' ? 'solid' : 'flat'}
                                    color={tipo === 'BODEGA_TRANSITO' ? 'primary' : 'default'}
                                    startContent={<Icon icon="lucide:warehouse" width={14} />}
                                    onPress={() => handleTipoChange('BODEGA_TRANSITO')}
                                >
                                    Bodega Tránsito
                                </Button>
                                <Button
                                    size="sm"
                                    variant={esReal ? 'solid' : 'flat'}
                                    color={esReal ? 'success' : 'default'}
                                    startContent={<Icon icon="lucide:calculator" width={14} />}
                                    onPress={() => handleTipoChange('DISPONIBLE_REAL')}
                                >
                                    Disponible Real
                                </Button>
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

                            {/* Buscador por nombre de producto (solo Disponible Real) */}
                            {esReal && (
                                <Input
                                    size="sm"
                                    variant="bordered"
                                    radius="lg"
                                    value={busqueda}
                                    onValueChange={setBusqueda}
                                    placeholder="Buscar por nombre de producto..."
                                    startContent={<Icon icon="lucide:search" width={16} className="text-default-400" />}
                                    isClearable
                                    onClear={() => setBusqueda('')}
                                    className="max-w-sm"
                                />
                            )}

                            {/* Tabla */}
                            {isLoading ? (
                                <div className="flex justify-center py-16">
                                    <Spinner size="lg" color="warning" />
                                </div>
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
                                    <div className="overflow-x-auto overflow-y-auto max-h-[340px] rounded-lg border border-default-200 dark:border-default-100 min-w-0">
                                        <table className="min-w-[1000px] w-full text-xs table-fixed">
                                            <thead className="bg-default-100 dark:bg-default-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="text-center py-2 px-3 font-bold text-default-500 uppercase w-[180px]">
                                                        NOMBRE PRODUCTO
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-bold text-default-500 uppercase w-[120px]">
                                                        CATEGORÍA
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-bold text-default-500 uppercase w-[110px]">
                                                        EN INVENTARIO
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-bold text-default-500 uppercase w-[130px]">
                                                        EN BODEGA TRÁNSITO
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-bold text-default-500 uppercase w-[110px]">
                                                        STOCK FÍSICO
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-bold text-default-500 uppercase w-[120px]">
                                                        COMPROMETIDO
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-bold text-default-500 uppercase w-[110px]">
                                                        RESERVADO
                                                    </th>
                                                    <th className="text-center py-2 px-3 font-bold text-default-500 uppercase w-[120px]">
                                                        DISPONIBLE
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itemsReal.map((item, idx) => (
                                                    <tr
                                                        key={idx}
                                                        className="border-t border-default-100 hover:bg-default-50 dark:hover:bg-default-100/20"
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
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            ) : items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-default-400 gap-3">
                                    <Icon icon="lucide:inbox" width={40} />
                                    <p className="text-sm">
                                        No hay stock disponible registrado para{' '}
                                        <strong>{tipo === 'INVENTARIO' ? 'Inventario' : 'Bodega Tránsito'}</strong>
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
                                    <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
                                        <thead className="bg-default-100 dark:bg-default-50">
                                            <tr>
                                                <th className="text-center py-2 px-3 font-bold text-default-500 uppercase">
                                                    NOMBRE PRODUCTO
                                                </th>
                                                <th className="text-center py-2 px-3 font-bold text-default-500 uppercase w-36">
                                                    CATEGORÍA
                                                </th>
                                                <th className="text-center py-2 px-3 font-bold text-default-500 uppercase w-24">
                                                    STOCK
                                                </th>
                                                <th className="text-center py-2 px-3 font-bold text-default-500 uppercase w-28">
                                                    UNIDAD MEDIDA
                                                </th>
                                                <th className="text-center py-2 px-3 font-bold text-default-500 uppercase w-28">
                                                    FECHA REGISTRO
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, idx) => (
                                                <tr
                                                    key={idx}
                                                    className="border-t border-default-100 hover:bg-default-50 dark:hover:bg-default-100/20"
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
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Paginación (solo vistas de sobrantes; Disponible Real usa scroll) */}
                            {!isLoading && !esReal && totalPaginas > 1 && (
                                <div className="flex justify-center pt-1">
                                    <Pagination
                                        total={totalPaginas}
                                        page={pagina}
                                        onChange={handlePaginaChange}
                                        size="sm"
                                        color="primary"
                                        showControls
                                    />
                                </div>
                            )}
                        </ModalBody>

                        <ModalFooter className="border-t border-default-100 pt-3">
                            <Button variant="flat" onPress={onClose}>
                                Cerrar
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default StockDisponiblesModal;
