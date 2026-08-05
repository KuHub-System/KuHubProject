import React from 'react';
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
  Input, Button, Select, SelectItem, Tooltip, Spinner, Checkbox, DateRangePicker, Chip,
} from '@heroui/react';
import { CalendarDate } from '@internationalized/date';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmtCL } from '../../utils/format-numbers';
import { IProducto } from '../../types/inventario/producto.types';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../utils/logger';
import {
  obtenerBulkProductoInventoryListingService, IBulkProductoInventoryListing,
  bulkUpdateInventoryStockService, IBulkProcessResult,
} from '../../services/inventario/inventario-service';
import {
  obtenerAbastecimientoBodegaService, marcarEnviadoBodegaService,
  registrarDisponiblesService, ISolicitudBodegaItem, IDetalleBodegaItem, IRegistrarDisponibleDTO,
} from '../../services/solicitud/solicitud-service';
import { obtenerAbastecimientoConfirmadoService, marcarEntregadosMasivoService } from '../../services/proveedor/proveedor-service';
import { IOrdenAbastecimiento, ICategoriaEntregaAbastecimiento } from '../../types/proveedor/proveedor.types';
import { ItemPedidoMasivo } from './constants';
import { CardSkeleton } from '../../components/SkeletonLoader';
import { useSistemaConfig } from '../../contexts/sistema-config-context';

/**
 * Interfaz para las propiedades del modal de pedido masivo
 */
interface PedidoMasivoModalProps {
  productos: IProducto[];
  onClose: () => void;
  onNuevoProducto?: () => void;
  initialItems?: ItemPedidoMasivo[];
  onProcessComplete?: (data: IBulkProcessResult, retryItems: ItemPedidoMasivo[]) => void;
  puedeAccederAbastBodega?: boolean;
  puedeAccederAbastProv?: boolean;
  onOpenGestionAbastecimiento?: () => void;
}

/**
 * Modal para realizar pedidos masivos hacia bodega de tránsito
 */
const PedidoMasivoModal: React.FC<PedidoMasivoModalProps> = ({ onClose, onNuevoProducto, onProcessComplete, initialItems, puedeAccederAbastBodega = false, puedeAccederAbastProv = false, onOpenGestionAbastecimiento }) => {
  const toast = useToast();
  const { disponibleObligatorio } = useSistemaConfig();
  const [itemsPedido, setItemsPedido] = React.useState<ItemPedidoMasivo[]>(initialItems ?? []);
  const [productoSeleccionado, setProductoSeleccionado] = React.useState<string>('');
  const [stockInput, setStockInput] = React.useState<string>('');
  const [motivo, setMotivo] = React.useState<string>('');

  // Estados para modal de Abastecimiento de Bodega
  const { isOpen: isBodegaOpen, onOpen: onBodegaOpen, onOpenChange: onBodegaOpenChange } = useDisclosure();
  const [dateRangeBodega, setDateRangeBodega] = React.useState<{ start: CalendarDate; end: CalendarDate } | null>(null);
  const [solicitudesBodega, setSolicitudesBodega] = React.useState<ISolicitudBodegaItem[]>([]);
  const [solicitudesSeleccionadas, setSolicitudesSeleccionadas] = React.useState<Set<number>>(new Set());
  const [loadingBodega, setLoadingBodega] = React.useState(false);
  const [cargadoBodega, setCargadoBodega] = React.useState(false);
  const [agruparPorDia, setAgruparPorDia] = React.useState(false);
  const bodegaSearchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estados para modal de Disponibles (sobrantes detectados en TRASLADO)
  const [isDisponiblesOpen, setIsDisponiblesOpen] = React.useState(false);
  const [disponiblesPendientes, setDisponiblesPendientes] = React.useState<IRegistrarDisponibleDTO[]>([]);

  // Estados para modal de abastecimiento de proveedores (OPs CONFIRMADA)
  const { isOpen: isAbastecimientoOpen, onOpen: onAbastecimientoOpen, onOpenChange: onAbastecimientoOpenChange } = useDisclosure();
  type FiltroAbastecimiento = 'semana' | '30dias' | '3meses' | 'todas';
  const [filtroAbastecimiento, setFiltroAbastecimiento] = React.useState<FiltroAbastecimiento>('semana');
  const [ordenesAbastecimiento, setOrdenesAbastecimiento] = React.useState<IOrdenAbastecimiento[]>([]);
  const [loadingAbastecimiento, setLoadingAbastecimiento] = React.useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = React.useState<Set<string>>(new Set());

  // Modal: productos ya entregados detectados al cargar desde abastecimiento
  type EntregadoItemInfoInv = { nombre: string; cantidad: number; abreviatura: string };
  const [isEntregadosInvOpen, setIsEntregadosInvOpen] = React.useState(false);
  const [entregadosInvList, setEntregadosInvList] = React.useState<EntregadoItemInfoInv[]>([]);
  const [itemsConEntregadosInv, setItemsConEntregadosInv] = React.useState<ItemPedidoMasivo[]>([]);
  const [itemsSinEntregadosInv, setItemsSinEntregadosInv] = React.useState<ItemPedidoMasivo[]>([]);

  const getFechaHastaAbastecimiento = (filtro: FiltroAbastecimiento): string | undefined => {
    const hoy = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (filtro === 'semana') {
      const diasHastaDomingo = hoy.getDay() === 0 ? 0 : 7 - hoy.getDay();
      const domingo = new Date(hoy);
      domingo.setDate(hoy.getDate() + diasHastaDomingo);
      return fmt(domingo);
    }
    if (filtro === '30dias') { const d = new Date(hoy); d.setDate(d.getDate() + 30); return fmt(d); }
    if (filtro === '3meses') { const d = new Date(hoy); d.setDate(d.getDate() + 90); return fmt(d); }
    return undefined; // 'todas' → sin límite superior
  };

  const cargarAbastecimiento = async (filtro: FiltroAbastecimiento) => {
    setLoadingAbastecimiento(true);
    setDiasSeleccionados(new Set());
    try {
      const fechaHasta = getFechaHastaAbastecimiento(filtro);
      const data = await obtenerAbastecimientoConfirmadoService(fechaHasta, 'INVENTARIO');
      setOrdenesAbastecimiento(data.ordenes ?? []);
    } catch {
      toast.error('Error al cargar el abastecimiento de proveedores');
    } finally {
      setLoadingAbastecimiento(false);
    }
  };

  const toggleDia = (key: string) => {
    setDiasSeleccionados(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const cargarDiasSeleccionados = () => {
    const todosItems: ItemPedidoMasivo[] = [];
    const entregadosIdSet = new Set<number>();
    const entregadosInfoCollect: EntregadoItemInfoInv[] = [];

    for (const orden of ordenesAbastecimiento) {
      for (const entrega of orden.entregas) {
        const key = `${orden.idOrdenPedido}-${entrega.fechaEntrega}`;
        if (!diasSeleccionados.has(key)) continue;
        for (const cat of entrega.categorias) {
          for (const prod of cat.productos) {
            const item: ItemPedidoMasivo = {
              id: `abast-${prod.idDetalleOrdenPedido}-${Date.now()}-${Math.random()}`,
              producto: {
                idProducto: prod.idProducto,
                idInventario: prod.idInventario,
                nombreProducto: prod.nombreProducto,
                detalles: prod.abreviatura,
                stock: prod.stock,
                esFraccionario: prod.esFraccionario,
              },
              delta: prod.cantidadSolicitada,
              motivo: 'ENTRADA_INVENTARIO',
              idDetalleOrdenPedido: prod.idDetalleOrdenPedido,
              marcaProducto: prod.marcaProducto ?? null,
              idOrdenPedido: orden.idOrdenPedido,
              idPedido: orden.idPedido,
              // Baseline para la detección de disponibles: si luego se suma más cantidad a mano
              // a este mismo ítem, cargadoAbastecimiento no cambia y el excedente queda expuesto.
              cargadoAbastecimiento: prod.cantidadSolicitada,
            };
            todosItems.push(item);
            if (prod.entregado) {
              entregadosIdSet.add(prod.idDetalleOrdenPedido);
              entregadosInfoCollect.push({
                nombre: prod.nombreProducto,
                cantidad: prod.cantidadSolicitada,
                abreviatura: prod.abreviatura,
              });
            }
          }
        }
      }
    }

    if (todosItems.length === 0) { toast.warning('No hay ítems seleccionados'); return; }

    if (entregadosInfoCollect.length > 0) {
      const sinEntregados = todosItems.filter(i => !entregadosIdSet.has(i.idDetalleOrdenPedido!));
      setItemsConEntregadosInv(todosItems);
      setItemsSinEntregadosInv(sinEntregados);
      setEntregadosInvList(entregadosInfoCollect);
      setIsEntregadosInvOpen(true);
      return;
    }

    setItemsPedido(prev => [...prev, ...todosItems]);
    toast.success(`${todosItems.length} ítem(s) cargado(s) al control masivo`);
    onAbastecimientoOpenChange();
    setDiasSeleccionados(new Set());
  };

  const handleOmitirEntregadosInv = () => {
    setIsEntregadosInvOpen(false);
    if (itemsSinEntregadosInv.length === 0) {
      toast.warning('Todos los productos de la selección ya fueron entregados anteriormente');
      onAbastecimientoOpenChange();
      setDiasSeleccionados(new Set());
      return;
    }
    setItemsPedido(prev => [...prev, ...itemsSinEntregadosInv]);
    toast.success(`${itemsSinEntregadosInv.length} ítem(s) cargado(s) al control masivo`);
    onAbastecimientoOpenChange();
    setDiasSeleccionados(new Set());
  };

  const handleIncluirEntregadosInv = () => {
    setIsEntregadosInvOpen(false);
    setItemsPedido(prev => [...prev, ...itemsConEntregadosInv]);
    toast.success(`${itemsConEntregadosInv.length} ítem(s) cargado(s) al control masivo`);
    onAbastecimientoOpenChange();
    setDiasSeleccionados(new Set());
  };

  // States para la paginación y búsqueda
  const [bulkProductos, setBulkProductos] = React.useState<IBulkProductoInventoryListing[]>([]);
  const [isLoadingBulk, setIsLoadingBulk] = React.useState(false);
  const isLoadingRef = React.useRef(false);
  const [pageBulk, setPageBulk] = React.useState(1);
  const [hasMoreBulk, setHasMoreBulk] = React.useState(true);
  const hasMoreBulkRef = React.useRef(true);
  const [searchTermBulk, setSearchTermBulk] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    let delayDebounceFn: NodeJS.Timeout;

    const fetchBulk = async (isLoadMore: boolean) => {
      try {
        isLoadingRef.current = true;
        setIsLoadingBulk(true);
        console.log(`[BULK-FETCH] Iniciando petición página=${pageBulk}, searchTerm="${searchTermBulk}", isLoadMore=${isLoadMore}`);
        const data = await obtenerBulkProductoInventoryListingService({
          term: searchTermBulk,
          page: pageBulk
        });

        if (mounted) {
          console.log(`[BULK-FETCH] Respuesta: page=${data.page}, totalPages=${data.totalPages}, items=${data.content.length}`);
          setBulkProductos(prev => {
            const newList = isLoadMore ? [...prev, ...data.content] : data.content;
            console.log(`[BULK-FETCH] Total productos en lista: ${newList.length}`);
            return newList;
          });
          const hasMore = data.page < data.totalPages;
          setHasMoreBulk(hasMore);
          hasMoreBulkRef.current = hasMore;
          console.log(`[BULK-FETCH] hasMore=${hasMore} (page ${data.page} de ${data.totalPages})`);
        }
      } catch (error) {
        console.error('[BULK-FETCH] Error:', error);
        if (mounted) toast.error('Error al cargar la lista de productos masivos');
      } finally {
        if (mounted) {
          isLoadingRef.current = false;
          setIsLoadingBulk(false);
          console.log(`[BULK-FETCH] Finalizado. isLoadingRef=false`);
        }
      }
    };

    if (pageBulk === 1) {
      delayDebounceFn = setTimeout(() => {
        fetchBulk(false);
      }, 500);
    } else {
      fetchBulk(true);
    }

    return () => {
      mounted = false;
      if (delayDebounceFn) clearTimeout(delayDebounceFn);
    };
  }, [pageBulk, searchTermBulk, toast]);

  const scrollContainerRef = React.useRef<HTMLElement | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputWrapperRef = React.useRef<HTMLDivElement>(null);
  const [inputDisplayBulk, setInputDisplayBulk] = React.useState('');
  const [dropdownPos, setDropdownPos] = React.useState<{ top: number; left: number; width: number } | null>(null);

  const updateDropdownPos = () => {
    if (inputWrapperRef.current) {
      const rect = inputWrapperRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
  };
  const [processState, setProcessState] = React.useState<'idle' | 'procesando' | 'sincronizando'>('idle');
  const [listadoExpandido, setListadoExpandido] = React.useState(false);

  // Cerrar dropdown al hacer click fuera
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputWrapperRef.current && !inputWrapperRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (
      scrollHeight - Math.round(scrollTop) <= clientHeight * 1.5 &&
      !isLoadingRef.current &&
      hasMoreBulkRef.current
    ) {
      isLoadingRef.current = true;
      console.log('[BULK-SCROLL] >>> DISPARANDO siguiente página');
      setPageBulk(prev => prev + 1);
    }
  };

  const handleSelectProduct = (producto: IBulkProductoInventoryListing) => {
    setProductoSeleccionado(producto.idProducto.toString());
    setStockInput(producto.stock.toString());
    setInputDisplayBulk(producto.nombreProducto);
    setIsDropdownOpen(false);
  };

  const handleInputChange = (value: string) => {
    setInputDisplayBulk(value);
    setSearchTermBulk(value);
    setProductoSeleccionado('');
    setStockInput('');
    setPageBulk(1);
    setBulkProductos([]);
    hasMoreBulkRef.current = true;
    updateDropdownPos();
    if (!isDropdownOpen) setIsDropdownOpen(true);
  };

  const productoActual = bulkProductos.find(p => p.idProducto.toString() === productoSeleccionado);

  const originalStock = productoActual ? productoActual.stock : 0;
  const esFraccionario = productoActual ? productoActual.esFraccionario : false;
  const isAjusteBulk = motivo === 'AJUSTE_INVENTARIO' || motivo === 'AJUSTE_BODEGA';
  const esSalidaBulk = ['SALIDA_INVENTARIO', 'TRASLADO', 'MERMA_INVENTARIO', 'MERMA_BODEGA', 'SALIDA_BODEGA', 'DEVOLUCION'].includes(motivo);

  // Efecto: al cambiar motivo o producto, pre-llenar para ajuste o limpiar
  React.useEffect(() => {
    if (!productoSeleccionado) return;
    if (isAjusteBulk && productoActual) {
      setStockInput(productoActual.stock.toString());
    } else {
      setStockInput('');
    }
  }, [motivo, productoSeleccionado]);

  const currentStockVal = parseFloat(stockInput);
  const formatStock = (n: number) => fmtCL(n);
  const existingItemInList = itemsPedido.find(
    i => i.producto.idProducto === productoActual?.idProducto && i.motivo === motivo
  );
  const accumulatedDelta = existingItemInList?.delta ?? 0;
  const newDeltaVal = isNaN(currentStockVal) ? 0 : currentStockVal;
  const totalDelta = accumulatedDelta + newDeltaVal;

  const stockFinal = isAjusteBulk
    ? currentStockVal
    : esSalidaBulk
      ? originalStock - totalDelta
      : originalStock + totalDelta;

  let deltaError = '';
  if (motivo && stockInput.trim() !== '' && !isNaN(currentStockVal)) {
    if (isAjusteBulk) {
      if (currentStockVal < 0) deltaError = 'El nuevo stock no puede ser negativo';
      else if (currentStockVal === originalStock) deltaError = 'El nuevo stock es igual al actual';
    } else {
      if (currentStockVal <= 0) deltaError = 'La cantidad debe ser mayor a 0';
      else if (esSalidaBulk && totalDelta > originalStock) deltaError = `Stock insuficiente (actual: ${fmtCL(originalStock)})`;
    }
  }

  let diffText = '';
  if (productoSeleccionado && motivo && stockInput !== '' && !isNaN(currentStockVal) && !deltaError) {
    diffText = accumulatedDelta > 0 && !isAjusteBulk
      ? `Stock Final: ${formatStock(stockFinal)} (acumulado: ${formatStock(accumulatedDelta + newDeltaVal)})`
      : `Stock Final: ${formatStock(stockFinal)}`;
  } else if (productoSeleccionado && motivo) {
    diffText = isAjusteBulk ? `Stock actual: ${fmtCL(originalStock)}` : '';
  } else if (productoSeleccionado && !motivo) {
    diffText = 'Seleccione un motivo primero';
  }

  const isFormValid = !!(productoSeleccionado && motivo && stockInput !== '' && !isNaN(currentStockVal) && currentStockVal >= 0 && !deltaError);

  const agregarProducto = () => {
    if (isFormValid && productoActual) {
      const delta = currentStockVal;
      const nuevoItem: ItemPedidoMasivo = {
        id: Date.now().toString(),
        producto: productoActual,
        delta,
        motivo,
      };

      const existingIdx = itemsPedido.findIndex(
        i => i.producto.idProducto === productoActual.idProducto && i.motivo === motivo
      );
      if (existingIdx >= 0) {
        const updated = [...itemsPedido];
        updated[existingIdx] = isAjusteBulk
          ? { ...updated[existingIdx], delta }
          : { ...updated[existingIdx], delta: updated[existingIdx].delta + delta };
        setItemsPedido(updated);
      } else {
        setItemsPedido([...itemsPedido, nuevoItem]);
      }

      setProductoSeleccionado('');
      setStockInput('');
      setInputDisplayBulk('');
      setSearchTermBulk('');
      setPageBulk(1);
    }
  };

  const eliminarItem = (id: string) => {
    setItemsPedido(itemsPedido.filter(item => item.id !== id));
  };

  const actualizarDeltaItem = (id: string, nuevoDelta: number) => {
    setItemsPedido(itemsPedido.map(item => {
      if (item.id !== id) return item;

      // Validaciones
      const isSalida = ['SALIDA_INVENTARIO', 'TRASLADO', 'MERMA_INVENTARIO', 'MERMA_BODEGA', 'SALIDA_BODEGA', 'DEVOLUCION'].includes(item.motivo);
      const isAjuste = item.motivo.includes('AJUSTE');

      if (isAjuste && nuevoDelta < 0) return item; // Ajuste no puede ser negativo
      if (isSalida && nuevoDelta > item.producto.stock) return item; // Stock insuficiente
      if (!item.producto.esFraccionario && !Number.isInteger(nuevoDelta)) return item; // Solo enteros si no fraccionario

      return { ...item, delta: nuevoDelta };
    }));
  };

  const incrementarDelta = (id: string) => {
    const item = itemsPedido.find(i => i.id === id);
    if (!item) return;
    const step = item.producto.esFraccionario ? 0.5 : 1;
    actualizarDeltaItem(id, item.delta + step);
  };

  const decrementarDelta = (id: string) => {
    const item = itemsPedido.find(i => i.id === id);
    if (!item) return;
    const step = item.producto.esFraccionario ? 0.5 : 1;
    const newDelta = Math.max(0, item.delta - step);
    actualizarDeltaItem(id, newDelta);
  };

  const fmtCalendar = (d: CalendarDate) =>
    `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;

  const buscarSolicitudesBodega = async (range?: { start: CalendarDate; end: CalendarDate } | null) => {
    const r = range ?? dateRangeBodega;
    if (!r?.start || !r?.end) return;
    setLoadingBodega(true);
    setCargadoBodega(false);
    setSolicitudesSeleccionadas(new Set());
    try {
      const data = await obtenerAbastecimientoBodegaService(fmtCalendar(r.start), fmtCalendar(r.end));
      setSolicitudesBodega(data.solicitudes ?? []);
      setCargadoBodega(true);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Sin permisos para acceder al abastecimiento de bodega');
      } else {
        toast.error('Error al cargar solicitudes de bodega');
      }
    } finally {
      setLoadingBodega(false);
    }
  };

  const toggleSolicitudBodega = (idSolicitud: number) => {
    setSolicitudesSeleccionadas(prev => {
      const next = new Set(prev);
      next.has(idSolicitud) ? next.delete(idSolicitud) : next.add(idSolicitud);
      return next;
    });
  };

  const cargarSolicitudesSeleccionadas = () => {
    const nuevosItems: ItemPedidoMasivo[] = [];
    for (const sol of solicitudesBodega) {
      if (!solicitudesSeleccionadas.has(sol.idSolicitud)) continue;
      for (const det of sol.detalles) {
        if (det.enviadoBodegaTransito) continue;
        nuevosItems.push({
          id: `bodega-${det.idDetalleSolicitud}-${Date.now()}-${Math.random()}`,
          producto: {
            idProducto: det.idProducto,
            idInventario: det.idInventario,
            nombreProducto: det.nombreProducto,
            detalles: det.abreviatura,
            stock: det.stock,
            esFraccionario: det.esFraccionario,
          },
          delta: det.cantidadSolicitada,
          motivo: 'TRASLADO',
          idDetalleSolicitud: det.idDetalleSolicitud,
          cantidadOriginal: det.cantidadSolicitada,
          idSolicitud: sol.idSolicitud,
        });
      }
    }
    if (nuevosItems.length === 0) {
      toast.warning('No hay productos pendientes en las solicitudes seleccionadas');
      return;
    }
    setItemsPedido(prev => [...prev, ...nuevosItems]);
    toast.success(`${nuevosItems.length} producto(s) cargado(s) para traslado a bodega`);
    onBodegaOpenChange();
  };

  React.useEffect(() => {
    if (isBodegaOpen) {
      const hoy = new Date();
      const plus3 = new Date(hoy);
      plus3.setDate(hoy.getDate() + 3);
      const toCalendar = (d: Date) => new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
      const range = { start: toCalendar(hoy), end: toCalendar(plus3) };
      setDateRangeBodega(range);
      buscarSolicitudesBodega(range);
    } else {
      if (bodegaSearchTimerRef.current) clearTimeout(bodegaSearchTimerRef.current);
      setSolicitudesBodega([]);
      setSolicitudesSeleccionadas(new Set());
      setCargadoBodega(false);
      setAgruparPorDia(false);
    }
  }, [isBodegaOpen]);

  const vaciarLista = () => {
    setItemsPedido([]);
  };

  // Detección de disponibles: junta dos casos de sobrante que se registran como stock
  // disponible del inventario, no asociado a ningún pedido o solicitud.
  const detectarDisponibles = (): IRegistrarDisponibleDTO[] => {
    // Caso A — TRASLADO cuya cantidad enviada es menor a la solicitada: el remanente se queda
    // en Inventario sin gestionar.
    const porTraslado = itemsPedido
      .filter(i =>
        i.motivo === 'TRASLADO' &&
        i.idDetalleSolicitud != null &&
        i.cantidadOriginal != null &&
        (i.cantidadOriginal - i.delta) > 0.001
      )
      .map(i => ({
        idProducto: i.producto.idProducto,
        idSolicitud: i.idSolicitud,
        cantidad: parseFloat((i.cantidadOriginal! - i.delta).toFixed(3)),
      }));

    // Caso B — ENTRADA_INVENTARIO por sobre lo efectivamente cargado desde Abastecimiento de
    // Proveedores (o el total, si se tecleó a mano sin pasar por Abastecimiento): es una
    // "entrada falsa", stock que ya estaba en la institución y se devuelve a su lugar, no
    // mercadería nueva.
    const porEntradaInventario = itemsPedido
      .filter(i => i.motivo === 'ENTRADA_INVENTARIO')
      .map(i => ({ item: i, extra: i.delta - (i.cargadoAbastecimiento ?? 0) }))
      .filter(x => x.extra > 0.001)
      .map(x => ({
        idProducto: x.item.producto.idProducto,
        cantidad: parseFloat(x.extra.toFixed(3)),
      }));

    return [...porTraslado, ...porEntradaInventario];
  };

  const ejecutarProcesoTraslado = async () => {
    setProcessState('procesando');
    try {
      const motivoProcesarOrder: Record<string, number> = {
        ENTRADA_INVENTARIO: 0, ENTRADA_BODEGA: 0,
        AJUSTE_INVENTARIO: 1, AJUSTE_BODEGA: 1,
        TRASLADO: 2,
        SALIDA_INVENTARIO: 3, SALIDA_BODEGA: 3,
        DEVOLUCION: 4,
        MERMA_INVENTARIO: 5, MERMA_BODEGA: 5,
      };

      // Agrupa por (idInventario, motivo, idDetalleOrdenPedido) sumando deltas. Se incluye el
      // detalle en la clave para NO colapsar distintas líneas/fechas de la misma OP: así cada
      // detalle genera su propio movimiento con su id_detalle_orden_pedido (mapeo exacto de la
      // entrega real). Los ítems manuales (sin detalle) comparten clave y se suman como antes.
      const agregado = new Map<string, { idInventario: number; delta: number; stockEnVista: number; tipoMovimiento: string; idSolicitud?: number; idPedido?: number; idOrdenPedido?: number; idDetalleOrdenPedido?: number }>();
      for (const item of itemsPedido) {
        const key = `${item.producto.idInventario}__${item.motivo}__${item.idDetalleOrdenPedido ?? 'manual'}`;
        const existing = agregado.get(key);
        if (existing) {
          existing.delta += item.delta;
          if (!existing.idOrdenPedido && item.idOrdenPedido) existing.idOrdenPedido = item.idOrdenPedido;
          if (!existing.idPedido && item.idPedido) existing.idPedido = item.idPedido;
          if (!existing.idSolicitud && item.idSolicitud) existing.idSolicitud = item.idSolicitud;
        } else {
          agregado.set(key, {
            idInventario: item.producto.idInventario,
            delta: item.delta,
            stockEnVista: item.producto.stock,
            tipoMovimiento: item.motivo,
            idSolicitud: item.idSolicitud,
            idPedido: item.idPedido,
            idOrdenPedido: item.idOrdenPedido,
            idDetalleOrdenPedido: item.idDetalleOrdenPedido,
          });
        }
      }
      const payload = [...agregado.values()]
        .sort((a, b) => (motivoProcesarOrder[a.tipoMovimiento] ?? 99) - (motivoProcesarOrder[b.tipoMovimiento] ?? 99));

      const result: IBulkProcessResult = await bulkUpdateInventoryStockService(payload);

      // Solo marcar como entregados los ítems que el backend confirmó como exitosos
      // y que siguen en la lista (no eliminados). Los eliminados = no llegaron = no se marcan.
      const exitososSet = new Set(result.exitosos.map(e => e.idInventario));
      const idsEntregados = itemsPedido
        .filter(i => i.idDetalleOrdenPedido != null && exitososSet.has(i.producto.idInventario))
        .map(i => i.idDetalleOrdenPedido!);
      if (idsEntregados.length > 0) {
        marcarEntregadosMasivoService(idsEntregados).catch(e => logger.warn('marcarEntregados failed', e));
      }

      const idsEnviadosBodega = itemsPedido
        .filter(i => i.idDetalleSolicitud != null && exitososSet.has(i.producto.idInventario))
        .map(i => i.idDetalleSolicitud!);
      if (idsEnviadosBodega.length > 0) {
        marcarEnviadoBodegaService(idsEnviadosBodega).catch(e => logger.warn('marcarEnviadoBodega failed', e));
      }

      // Build retry items for recoverable errors (product exists, stock insufficient)
      const retryItems: ItemPedidoMasivo[] = result.errores
        .filter(err => err.stockResultante > 0)
        .map(err => {
          const original = itemsPedido.find(i => i.producto.idInventario === err.idInventario);
          if (!original) return null;
          return {
            id: `retry-${err.idInventario}-${Date.now()}`,
            producto: { ...original.producto, stock: err.stockResultante },
            delta: err.stockResultante,
            motivo: original.motivo,
          };
        })
        .filter((i): i is ItemPedidoMasivo => i !== null);

      if (onProcessComplete) {
        onProcessComplete(result, retryItems);
      } else {
        toast.success(`Proceso completado. ${result.exitosos.length} actualizados.`);
      }

      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Ocurrió un error al procesar el pedido masivo.');
    } finally {
      setProcessState('idle');
    }
  };

  const handleDisponiblesSi = async () => {
    try {
      await registrarDisponiblesService(disponiblesPendientes);
      toast.success('Disponibles registrados correctamente');
    } catch {
      toast.warning('No se pudieron registrar los disponibles, pero el traslado continuará');
    }
    setIsDisponiblesOpen(false);
    await ejecutarProcesoTraslado();
  };

  // Aborta todo el proceso: cierra el modal y deja los ítems tal cual en la lista para que el
  // usuario los revise o corrija.
  const handleDisponiblesCancelar = () => {
    setIsDisponiblesOpen(false);
  };

  const procesarPedido = async () => {
    if (itemsPedido.length === 0) return;
    // Con la config "Registro de disponible obligatorio" apagada (default/opcional), no se
    // pregunta nada: traslados/entradas se procesan directo, sin registrar disponible.
    if (disponibleObligatorio) {
      const candidatos = detectarDisponibles();
      if (candidatos.length > 0) {
        setDisponiblesPendientes(candidatos);
        setIsDisponiblesOpen(true);
        return;
      }
    }
    await ejecutarProcesoTraslado();
  };

  const opcionesMotivoMap: Record<string, string[]> = {
    'bodega': ['ENTRADA_BODEGA', 'DEVOLUCION', 'AJUSTE_BODEGA', 'SALIDA_BODEGA', 'MERMA_BODEGA'],
    'inventario': ['ENTRADA_INVENTARIO', 'TRASLADO', 'AJUSTE_INVENTARIO', 'SALIDA_INVENTARIO', 'MERMA_INVENTARIO']
  };
  const motivoBulkLabel: Record<string, string> = {
    ENTRADA_INVENTARIO: 'Entrada', ENTRADA_BODEGA: 'Entrada',
    SALIDA_INVENTARIO: 'Salida', SALIDA_BODEGA: 'Salida',
    TRASLADO: 'Traslado', DEVOLUCION: 'Devolución',
    AJUSTE_INVENTARIO: 'Ajuste', AJUSTE_BODEGA: 'Ajuste',
    MERMA_INVENTARIO: 'Merma', MERMA_BODEGA: 'Merma',
  };

  const context = window.location.pathname.includes('bodega') ? 'bodega' : 'inventario';
  const opcionesMotivoList = opcionesMotivoMap[context];

  // ── Helpers para "Agrupar por día" en modal Abastecimiento de Bodega ──
  type DetalleDia = IDetalleBodegaItem & { cantidadTotal: number };

  const getProductosDia = (solicitudes: ISolicitudBodegaItem[]): DetalleDia[] => {
    const mapa = new Map<number, DetalleDia>();
    for (const sol of solicitudes) {
      for (const det of sol.detalles) {
        if (mapa.has(det.idProducto)) {
          mapa.get(det.idProducto)!.cantidadTotal += det.cantidadSolicitada;
        } else {
          mapa.set(det.idProducto, { ...det, cantidadTotal: det.cantidadSolicitada });
        }
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.nombreProducto.localeCompare(b.nombreProducto));
  };

  const solicitudesPorDia = React.useMemo(() => {
    const grupos = new Map<string, ISolicitudBodegaItem[]>();
    for (const sol of solicitudesBodega) {
      const key = sol.fechaSolicitada;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(sol);
    }
    return Array.from(grupos.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, sols]) => ({ fecha, solicitudes: sols }));
  }, [solicitudesBodega]);

  const toggleDiaBodega = (fecha: string) => {
    const grupo = solicitudesPorDia.find(g => g.fecha === fecha);
    if (!grupo) return;
    const idsConPendientes = grupo.solicitudes
      .filter(s => s.detalles.some(d => !d.enviadoBodegaTransito))
      .map(s => s.idSolicitud);
    const todosMarcados = idsConPendientes.length > 0 && idsConPendientes.every(id => solicitudesSeleccionadas.has(id));
    setSolicitudesSeleccionadas(prev => {
      const next = new Set(prev);
      idsConPendientes.forEach(id => todosMarcados ? next.delete(id) : next.add(id));
      return next;
    });
  };

  return (
    <>
    <div className="max-h-[75vh] overflow-y-scroll custom-scrollbar">
      <ModalHeader className="flex flex-col gap-3 border-b border-default-100 dark:border-default-50 bg-white dark:bg-content2 px-6 py-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-secondary dark:text-foreground">Control de Stock Masivo</h2>
          <p className="text-sm font-medium text-default-500 mt-1">
            Registre entradas, salidas, mermas, ajustes o traslados de múltiples productos de forma estructurada.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip content={puedeAccederAbastBodega ? "Ver solicitudes EN_PEDIDO de bodega" : "Sin permisos"} color="foreground" className="text-xs">
            <Button
              variant="flat"
              color="primary"
              size="md"
              className="font-semibold"
              startContent={<Icon icon="lucide:warehouse" width={18} />}
              onPress={onBodegaOpen}
              isDisabled={!puedeAccederAbastBodega}
            >
              Abastecimiento de Bodega
            </Button>
          </Tooltip>
          <Tooltip content={puedeAccederAbastProv ? "Ver OPs confirmadas de proveedores" : "Sin permisos"} color="foreground" className="text-xs">
            <Button
              variant="flat"
              color="secondary"
              size="md"
              className="font-semibold"
              startContent={<Icon icon="lucide:truck" width={18} />}
              onPress={() => { onAbastecimientoOpen(); cargarAbastecimiento('semana'); }}
              isDisabled={!puedeAccederAbastProv}
            >
              Abastecimiento de Proveedores
            </Button>
          </Tooltip>
        </div>
      </ModalHeader>
      <ModalBody className="px-4 py-3 space-y-3">
          <AnimatePresence initial={false}>
            {!listadoExpandido && (
              <motion.div
                key="form-masivo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
          {/* Sección para agregar productos */}
          <div className="p-3 border border-default-200 dark:border-default-100 rounded-xl bg-default-50 dark:bg-content2">
            {productoActual && (
              <p className="text-xs text-default-500 px-0.5 mb-1.5">
                Stock Actual: <span className="font-semibold text-secondary">{fmtCL(originalStock)}</span>
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-start">
              {/* Buscador de producto */}
              <div className="relative" ref={inputWrapperRef}>
                <Input
                  label="Nombre Producto"
                  placeholder="Buscar por nombre o código"
                  value={inputDisplayBulk}
                  onValueChange={handleInputChange}
                  onFocus={() => { updateDropdownPos(); setIsDropdownOpen(true); }}
                  variant="bordered"
                  isRequired
                  className="w-full"
                  endContent={isLoadingBulk ? <Spinner size="sm" /> : null}
                />
                {isDropdownOpen && dropdownPos && (
                  <div
                    ref={dropdownRef}
                    className="fixed z-[9999] bg-white dark:bg-content1 border border-default-200 dark:border-default-100 rounded-xl shadow-lg max-h-[220px] overflow-y-auto py-1"
                    style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
                    onScroll={handleDropdownScroll}
                  >
                    {bulkProductos.length === 0 && !isLoadingBulk && (
                      <div className="px-4 py-4 text-center text-default-400 text-sm">
                        No se encontraron productos
                      </div>
                    )}
                    {bulkProductos.map((prod) => (
                      <div
                        key={prod.idProducto}
                        className="px-4 py-2.5 mx-1 my-0.5 hover:bg-default-100 dark:hover:bg-default-50 cursor-pointer transition-colors rounded-lg"
                        onClick={() => handleSelectProduct(prod)}
                        title={prod.nombreProducto}
                      >
                        <span className="text-small font-semibold block leading-snug">
                          {prod.nombreProducto.length > 50 ? prod.nombreProducto.substring(0, 50) + '...' : prod.nombreProducto}
                        </span>
                        <span className="text-tiny text-default-400 block leading-snug mt-0.5">{prod.detalles}</span>
                      </div>
                    ))}
                    {isLoadingBulk && (
                      <div className="flex justify-center py-3"><Spinner size="sm" /></div>
                    )}
                  </div>
                )}
              </div>

              {/* Selector de motivo */}
              <Select
                label="Acción"
                placeholder="Seleccione..."
                selectedKeys={motivo ? [motivo] : []}
                onChange={(e: any) => setMotivo(e.target.value)}
                isRequired
                variant="bordered"
                classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
              >
                {opcionesMotivoList.map(key => (
                  <SelectItem key={key} textValue={motivoBulkLabel[key] ?? key}>
                    {motivoBulkLabel[key] ?? key}
                  </SelectItem>
                ))}
              </Select>

              {/* Delta input */}
              <Input
                type="number"
                label={isAjusteBulk ? 'Nuevo Stock' : 'Cantidad'}
                placeholder={isAjusteBulk ? `Actual: ${fmtCL(originalStock)}` : 'Ingrese cantidad...'}
                value={stockInput}
                onValueChange={(val) => {
                  if (val === '') { setStockInput(''); return; }
                  const regex = esFraccionario ? /^\d{0,7}(\.\d{0,3})?$/ : /^\d{0,7}$/;
                  if (regex.test(val)) setStockInput(val);
                }}
                min="0"
                step={esFraccionario ? "0.001" : "1"}
                variant="bordered"
                isDisabled={!productoSeleccionado || !motivo}
                isInvalid={!!deltaError}
                errorMessage={deltaError}
                description={diffText || undefined}
                isRequired
              />

              {/* Botón agregar */}
              <Button
                isIconOnly
                color="warning"
                variant="solid"
                radius="full"
                size="lg"
                onPress={agregarProducto}
                isDisabled={!isFormValid}
                title="Agregar al listado"
                className="shadow-md"
              >
                <Icon icon="lucide:plus" width={22} />
              </Button>
            </div>
          </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!listadoExpandido && !!motivo && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 bg-secondary/5 rounded-medium border border-secondary/10 dark:bg-white/5 dark:border-white/10">
                  <p className="text-secondary dark:text-foreground text-sm font-medium flex items-start gap-2">
                    <Icon icon="lucide:info" width={16} className="text-secondary shrink-0 mt-0.5" />
                    <span>{(() => {
                      switch (motivo) {
                        case 'ENTRADA_INVENTARIO': return 'Entrada de insumos al inventario';
                        case 'ENTRADA_BODEGA': return 'Entrada de insumos a la bodega de tránsito';
                        case 'SALIDA_INVENTARIO': return 'Salida de insumos del inventario';
                        case 'SALIDA_BODEGA': return 'Salida de insumos de la bodega de tránsito';
                        case 'TRASLADO': return 'Mover hacia la bodega de tránsito';
                        case 'AJUSTE_INVENTARIO':
                        case 'AJUSTE_BODEGA': return 'Ajustar stock actual';
                        case 'MERMA_INVENTARIO':
                        case 'MERMA_BODEGA': return 'Salida de insumos por daño/pérdida';
                        case 'DEVOLUCION': return 'Registrar devolución de insumos al inventario';
                        default: return 'Seleccione un motivo para ver detalles de la operación.';
                      }
                    })()}</span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lista en tabla editable */}
          {itemsPedido.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                className="w-full flex items-center gap-2 font-bold text-secondary hover:text-secondary/80 transition-colors cursor-pointer"
                onClick={() => setListadoExpandido(v => !v)}
              >
                <Icon icon="lucide:list" width={18} />
                Listado ({itemsPedido.length} producto{itemsPedido.length !== 1 ? 's' : ''})
                <Icon
                  icon={listadoExpandido ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                  width={16}
                  className="ml-auto text-default-400"
                />
              </button>

              <div className={`transition-all duration-300 ${listadoExpandido ? 'max-h-[65vh]' : 'max-h-[420px]'} overflow-y-auto custom-scrollbar`}>
                <div className="border border-default-200 dark:border-default-100 rounded-xl overflow-hidden bg-white dark:bg-content2">
                  {/* Encabezados */}
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 bg-default-100 dark:bg-default-50 font-semibold text-sm text-default-600 border-b border-default-200 dark:border-default-100">
                    <div>Producto</div>
                    <div className="text-center">Stock Actual</div>
                    <div className="text-center">Cantidad</div>
                    <div className="text-center">Stock Final</div>
                    <div className="text-center">Acción</div>
                  </div>

                  {/* Filas */}
                  <div className="divide-y divide-default-100 dark:divide-default-50">
                    {itemsPedido.map((item) => {
                      const isSalida = ['SALIDA_INVENTARIO', 'TRASLADO', 'MERMA_INVENTARIO', 'MERMA_BODEGA', 'SALIDA_BODEGA', 'DEVOLUCION'].includes(item.motivo);
                      const isAjuste = item.motivo.includes('AJUSTE');
                      const stockFinal = isAjuste
                        ? item.delta
                        : isSalida
                          ? item.producto.stock - item.delta
                          : item.producto.stock + item.delta;

                      const chipColorMap: Record<string, 'success' | 'warning' | 'primary' | 'danger' | 'secondary'> = {
                        ENTRADA_INVENTARIO: 'success', ENTRADA_BODEGA: 'success',
                        TRASLADO: 'warning',
                        AJUSTE_INVENTARIO: 'primary', AJUSTE_BODEGA: 'primary',
                        SALIDA_INVENTARIO: 'danger', SALIDA_BODEGA: 'danger',
                        MERMA_INVENTARIO: 'danger', MERMA_BODEGA: 'danger',
                        DEVOLUCION: 'secondary',
                      };

                      const simbolo = isSalida ? '-' : isAjuste ? '=' : '+';
                      const chipColor = chipColorMap[item.motivo] ?? 'default';

                      return (
                        <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 items-center hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors">
                          {/* Producto */}
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-default-800 dark:text-foreground truncate">{item.producto.nombreProducto}</p>
                            <p className="text-xs text-default-400">
                              {item.producto.detalles}
                              {item.marcaProducto && <span className="ml-1.5 italic text-default-400">{item.marcaProducto}</span>}
                            </p>
                          </div>

                          {/* Stock Actual */}
                          <div className="text-center">
                            <span className="font-semibold text-sm">{fmtCL(item.producto.stock)}</span>
                          </div>

                          {/* Cantidad Editable con +/- */}
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              onPress={() => decrementarDelta(item.id)}
                              className="h-6 w-6 min-w-6"
                            >
                              <Icon icon="lucide:minus" width={14} />
                            </Button>
                            <Input
                              type="number"
                              value={item.delta.toString()}
                              onValueChange={(val) => {
                                const num = parseFloat(val);
                                if (!isNaN(num)) actualizarDeltaItem(item.id, num);
                              }}
                              step={item.producto.esFraccionario ? "0.5" : "1"}
                              className="w-16 text-center"
                              size="sm"
                              variant="bordered"
                              classNames={{ input: "text-center text-xs h-6" }}
                            />
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              onPress={() => incrementarDelta(item.id)}
                              className="h-6 w-6 min-w-6"
                            >
                              <Icon icon="lucide:plus" width={14} />
                            </Button>
                          </div>

                          {/* Stock Final */}
                          <div className="text-center">
                            <Chip
                              size="sm"
                              color={chipColor}
                              variant="flat"
                              className="text-xs"
                            >
                              {simbolo}{fmtCL(item.delta)} → {fmtCL(stockFinal)}
                            </Chip>
                          </div>

                          {/* Eliminar */}
                          <div className="text-center">
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              onPress={() => eliminarItem(item.id)}
                              className="text-default-400 hover:text-danger"
                            >
                              <Icon icon="lucide:trash-2" width={16} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="text-sm text-default-500">Total de productos:</span>
                <span className="font-bold text-secondary">{itemsPedido.length}</span>
              </div>
            </div>
          )}
      </ModalBody>

      <ModalFooter className="bg-default-50 border-t border-default-100 flex justify-between items-center w-full gap-2">
        <Button
          variant="flat"
          color="danger"
          size="sm"
          startContent={<Icon icon="lucide:trash-2" width={15} />}
          onPress={() => setItemsPedido([])}
          isDisabled={itemsPedido.length === 0 || processState !== 'idle'}
          className="font-medium"
        >
          Limpiar todo
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onPress={onClose} className="font-medium">
            Cancelar
          </Button>
          <Button
            color={processState === 'sincronizando' ? "secondary" : "warning"}
            onPress={procesarPedido}
            isDisabled={itemsPedido.length === 0 || processState !== 'idle'}
            isLoading={processState !== 'idle'}
            startContent={processState === 'idle' && <Icon icon="lucide:send" width={18} />}
          >
            {processState === 'idle' ? `Ctrl. Masivo (${itemsPedido.length})`
              : processState === 'sincronizando' ? 'Sincronizando...'
                : 'Procesando...'}
          </Button>
        </div>
      </ModalFooter>
    </div>

      {/* Modal de Abastecimiento de Proveedores (OPs CONFIRMADA) */}
      <Modal
        isOpen={isAbastecimientoOpen}
        onOpenChange={onAbastecimientoOpenChange}
        size="5xl"
        backdrop="blur"
        radius="lg"
        scrollBehavior="normal"
        classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]', closeButton: 'hover:bg-default-100 cursor-pointer' }}
        isDismissable={false}
      >
        <ModalContent>
          {(onAbastClose) => (
            <div className="max-h-[75vh] overflow-y-scroll custom-scrollbar">
              <ModalHeader className="flex flex-col gap-2 border-b border-default-100 pb-4">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:truck" width={20} className="text-secondary dark:text-foreground" />
                  <h2 className="text-lg font-bold text-secondary dark:text-foreground">Abastecimiento de Proveedores</h2>
                </div>
                <p className="text-xs text-default-500 font-normal">OPs confirmadas — seleccione los días a cargar al control masivo</p>
                <div className="flex items-center justify-between gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:info" width={14} className="text-warning shrink-0" />
                    <p className="text-xs text-warning-700 dark:text-warning">Se visualizan todas las categorías asignadas al abastecimiento.</p>
                  </div>
                  {onOpenGestionAbastecimiento && (
                    <Button
                      size="sm"
                      variant="light"
                      color="warning"
                      className="text-xs shrink-0 h-7 px-2"
                      onPress={onOpenGestionAbastecimiento}
                      startContent={<Icon icon="lucide:settings-2" width={12} />}
                    >
                      Gestión de Abastecimiento
                    </Button>
                  )}
                </div>
                {/* Filtro de período */}
                <div className="flex gap-2 flex-wrap">
                  {([['semana','Esta semana'],['30dias','Próx. 30 días'],['3meses','3 meses'],['todas','Todas']] as [FiltroAbastecimiento, string][]).map(([key, label]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={filtroAbastecimiento === key ? 'solid' : 'bordered'}
                      color={filtroAbastecimiento === key ? 'secondary' : 'default'}
                      onPress={() => { setFiltroAbastecimiento(key); cargarAbastecimiento(key); }}
                      className="text-xs"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </ModalHeader>
              <ModalBody className="py-5 px-5 space-y-4">
                {loadingAbastecimiento ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} lines={2} />)}
                  </div>
                ) : ordenesAbastecimiento.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-default-400">
                    <Icon icon="lucide:truck" width={48} className="mb-3 opacity-30" />
                    <p className="text-sm">No hay órdenes de pedido confirmadas en este período.</p>
                  </div>
                ) : (
                  <div className="space-y-4 w-full flex-none pb-2">
                    {ordenesAbastecimiento.map((orden) => (
                      <div key={orden.idOrdenPedido} className="border border-default-200 dark:border-default-100 rounded-xl overflow-hidden bg-white dark:bg-content2/30">
                        {/* Header del proveedor */}
                        <div className="bg-default-100 dark:bg-content2 px-5 py-3 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-secondary dark:text-foreground">{orden.nombreDistribuidora}</p>
                            <p className="text-xs text-default-500 mt-0.5">{orden.nombreProveedor}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            {orden.telefonoProveedor && (
                              <span className="text-xs text-default-400 flex items-center gap-1.5">
                                <Icon icon="lucide:phone" width={12} /> {orden.telefonoProveedor}
                              </span>
                            )}
                            {orden.emailProveedor && (
                              <span className="text-xs text-default-400 flex items-center gap-1.5">
                                <Icon icon="lucide:mail" width={12} /> {orden.emailProveedor}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Días de entrega */}
                        <div className="divide-y divide-default-100 dark:divide-default-50">
                          {orden.entregas.map((entrega) => {
                            const diaKey = `${orden.idOrdenPedido}-${entrega.fechaEntrega}`;
                            const seleccionado = diasSeleccionados.has(diaKey);
                            const hoy = new Date().toISOString().split('T')[0];
                            const esPasado = entrega.fechaEntrega < hoy;
                            const todosEntregados = entrega.categorias.every(c => c.productos.every(p => p.entregado));
                            return (
                              <div
                                key={diaKey}
                                className={`px-5 py-3 cursor-pointer transition-all-200 ${seleccionado ? 'bg-primary/10 dark:bg-primary/5' : 'hover:bg-default-50 dark:hover:bg-default-100/20'}`}
                                onClick={() => toggleDia(diaKey)}
                              >
                                {/* Fila fecha + chips */}
                                <div className="flex items-center gap-3 mb-3">
                                  <Checkbox
                                    isSelected={seleccionado}
                                    onValueChange={() => toggleDia(diaKey)}
                                    size="sm"
                                    color="secondary"
                                    onClick={e => e.stopPropagation()}
                                  />
                                  <span className={`text-sm font-semibold capitalize ${esPasado ? 'text-default-400' : 'text-secondary dark:text-foreground'}`}>
                                    {new Date(entrega.fechaEntrega + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                  </span>
                                  {todosEntregados && (
                                    <Chip size="sm" color="success" variant="flat">Recibido</Chip>
                                  )}
                                  {esPasado && !todosEntregados && (
                                    <Chip size="sm" color="warning" variant="flat">Pendiente</Chip>
                                  )}
                                </div>
                                {/* Productos agrupados por categoría */}
                                <div className="ml-8 flex flex-col gap-3">
                                  {entrega.categorias.map((cat: ICategoriaEntregaAbastecimiento) => (
                                    <div key={cat.nombreCategoria}>
                                      <p className="text-xs font-semibold uppercase tracking-wide text-default-400 mb-1.5 px-1">
                                        {cat.nombreCategoria}
                                      </p>
                                      <div className="flex flex-col gap-1.5">
                                        {cat.productos.map((prod) => (
                                          <div
                                            key={prod.idDetalleOrdenPedido}
                                            className={`flex items-center justify-between gap-3 py-1.5 px-3 rounded-lg bg-default-50/60 dark:bg-default-100/10 ${prod.entregado ? 'opacity-50' : ''}`}
                                          >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                              {prod.entregado
                                                ? <Icon icon="lucide:check-circle-2" width={14} className="text-success shrink-0" />
                                                : <Icon icon="lucide:circle" width={14} className="text-default-300 shrink-0" />
                                              }
                                              <Tooltip content={prod.nombreProducto} color="foreground" className="text-xs">
                                                <span className="text-sm text-default-700 dark:text-default-300 truncate">{prod.nombreProducto}</span>
                                              </Tooltip>
                                              {prod.marcaProducto && (
                                                <span className="text-xs text-default-400 shrink-0 italic">{prod.marcaProducto}</span>
                                              )}
                                            </div>
                                            <span className="shrink-0 text-sm font-semibold text-default-600 dark:text-default-300 tabular-nums">
                                              {fmtCL(prod.cantidadSolicitada)} <span className="font-normal text-default-400">{prod.abreviatura}</span>
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="border-t border-default-100 gap-2">
                <Button variant="ghost" onPress={onAbastClose} className="font-medium">
                  Cancelar
                </Button>
                <Button
                  color="secondary"
                  onPress={cargarDiasSeleccionados}
                  isDisabled={diasSeleccionados.size === 0}
                  startContent={<Icon icon="lucide:download" width={16} />}
                >
                  Cargar {diasSeleccionados.size > 0 ? `${diasSeleccionados.size} día(s)` : 'seleccionados'}
                </Button>
              </ModalFooter>
            </div>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: productos ya entregados detectados al cargar desde abastecimiento */}
      <Modal
        isOpen={isEntregadosInvOpen}
        onOpenChange={() => setIsEntregadosInvOpen(false)}
        size="lg"
        backdrop="blur"
        radius="lg"
        scrollBehavior="normal"
        classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]' }}
        isDismissable={false}
        hideCloseButton
      >
        <ModalContent>
          {() => (
            <div className="max-h-[75vh] overflow-y-scroll custom-scrollbar">
              <ModalHeader className="flex flex-col gap-1 border-b border-default-100 pb-4">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:circle-check-big" width={20} className="text-success" />
                  <h2 className="text-base font-bold text-secondary dark:text-foreground">
                    Productos ya entregados
                  </h2>
                </div>
                <p className="text-xs font-normal text-default-500">
                  {entregadosInvList.length} producto{entregadosInvList.length !== 1 ? 's' : ''} de la selección {entregadosInvList.length !== 1 ? 'fueron marcados' : 'fue marcado'} como recibido{entregadosInvList.length !== 1 ? 's' : ''} anteriormente. ¿Cómo deseas proceder?
                </p>
              </ModalHeader>
              <ModalBody className="py-4 px-5 space-y-3">
                <div className="border border-default-200 dark:border-default-100 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto">
                  <div className="grid grid-cols-[1fr_auto_auto] px-3 py-2 bg-default-100 dark:bg-default-50 text-[10px] font-bold text-default-500 uppercase tracking-wider border-b border-default-200 dark:border-default-100">
                    <span>Producto</span>
                    <span className="text-right pr-2">Cantidad</span>
                    <span>Unidad</span>
                  </div>
                  <div className="divide-y divide-default-100 dark:divide-default-50">
                    {entregadosInvList.map((p, i) => (
                      <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center px-3 py-2.5 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon icon="lucide:check-circle-2" width={14} className="text-success shrink-0" />
                          <span className="text-sm text-default-700 dark:text-default-300 truncate">{p.nombre}</span>
                        </div>
                        <span className="text-sm font-semibold text-default-600 tabular-nums text-right pr-2">
                          {p.cantidad}
                        </span>
                        <span className="text-xs text-default-400">{p.abreviatura}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-start gap-2 px-2 py-2 bg-warning-50 dark:bg-warning-50/10 border border-warning-200 dark:border-warning-100/30 rounded-lg">
                  <Icon icon="lucide:alert-triangle" width={15} className="text-warning-600 dark:text-warning-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-warning-700 dark:text-warning-400">
                    ¿Cómo deseas proceder? Si incluyes los ya entregados, pueden generarse ingresos duplicados para la misma Orden de Pedido.
                  </p>
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-default-100 gap-2 flex justify-between">
                <Button
                  variant="flat"
                  color="default"
                  startContent={<Icon icon="lucide:package-plus" width={16} />}
                  onPress={handleIncluirEntregadosInv}
                  className="font-medium"
                >
                  Incluir de todas formas
                </Button>
                <Button
                  color="secondary"
                  startContent={<Icon icon="lucide:skip-forward" width={16} />}
                  onPress={handleOmitirEntregadosInv}
                  className="font-medium"
                >
                  Omitir entregados
                </Button>
              </ModalFooter>
            </div>
          )}
        </ModalContent>
      </Modal>

      {/* Modal de Abastecimiento de Bodega */}
      <Modal isOpen={isBodegaOpen} onOpenChange={onBodegaOpenChange} size="4xl" backdrop="blur" radius="lg" isDismissable={false} scrollBehavior="normal" classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]', closeButton: 'hover:bg-default-100 cursor-pointer' }}>
        <ModalContent>
          {(onBodegaClose) => (
            <div className="max-h-[75vh] overflow-y-scroll custom-scrollbar">
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-secondary dark:text-foreground">Abastecimiento de Bodega</h2>
                <p className="text-xs text-default-500 font-normal">Solicitudes EN_PEDIDO con productos de categorías INVENTARIO → TRASLADO a bodega de tránsito</p>
                <div className="flex items-center justify-between gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 mt-1">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:info" width={14} className="text-warning shrink-0" />
                    <p className="text-xs text-warning-700 dark:text-warning">Se visualizan todas las categorías asignadas al abastecimiento.</p>
                  </div>
                  {onOpenGestionAbastecimiento && (
                    <Button
                      size="sm"
                      variant="light"
                      color="warning"
                      className="text-xs shrink-0 h-7 px-2"
                      onPress={onOpenGestionAbastecimiento}
                      startContent={<Icon icon="lucide:settings-2" width={12} />}
                    >
                      Gestión de Abastecimiento
                    </Button>
                  )}
                </div>
              </ModalHeader>
              <ModalBody className="space-y-4">
                {/* Filtro de fechas — auto-búsqueda 1.5 s tras seleccionar */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <DateRangePicker
                      label="Rango de fechas"
                      variant="bordered"
                      value={dateRangeBodega}
                      onChange={(range) => {
                        setDateRangeBodega(range);
                        if (bodegaSearchTimerRef.current) clearTimeout(bodegaSearchTimerRef.current);
                        if (range?.start && range?.end) {
                          bodegaSearchTimerRef.current = setTimeout(() => buscarSolicitudesBodega(range), 1500);
                        }
                      }}
                    />
                  </div>
                  {loadingBodega && <span className="text-xs text-default-400 pb-2">Buscando...</span>}
                </div>

                {/* Resultados */}
                {loadingBodega && (
                  <div className="flex justify-center py-8">
                    <span className="text-default-400 text-sm">Cargando solicitudes...</span>
                  </div>
                )}

                {!loadingBodega && cargadoBodega && solicitudesBodega.length === 0 && (
                  <div className="p-4 bg-default-100 rounded-lg text-center">
                    <p className="text-default-500 text-sm">No hay solicitudes EN_PEDIDO con productos de categorías INVENTARIO en el rango seleccionado.</p>
                  </div>
                )}

                {!loadingBodega && solicitudesBodega.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm text-default-600">{solicitudesBodega.length} solicitud(es) encontrada(s)</span>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant={agruparPorDia ? 'solid' : 'flat'}
                          color={agruparPorDia ? 'primary' : 'default'}
                          startContent={<Icon icon="lucide:calendar-days" width={14} />}
                          onPress={() => setAgruparPorDia(v => !v)}
                        >
                          Agrupar por día
                        </Button>
                        <Button size="sm" variant="flat" onPress={() => setSolicitudesSeleccionadas(new Set(solicitudesBodega.map(s => s.idSolicitud)))}>
                          Seleccionar todas
                        </Button>
                        <Button size="sm" variant="flat" onPress={() => setSolicitudesSeleccionadas(new Set())}>
                          Limpiar
                        </Button>
                      </div>
                    </div>

                    {/* Vista AGRUPADA por día */}
                    {agruparPorDia && solicitudesPorDia.map(({ fecha, solicitudes }) => {
                      const productosDia = getProductosDia(solicitudes);
                      const idsConPendientes = solicitudes
                        .filter(s => s.detalles.some(d => !d.enviadoBodegaTransito))
                        .map(s => s.idSolicitud);
                      const todosMarcados = idsConPendientes.length > 0 && idsConPendientes.every(id => solicitudesSeleccionadas.has(id));
                      return (
                        <div key={fecha} className={`border rounded-lg overflow-hidden transition-all ${todosMarcados ? 'border-primary/50 bg-primary/5' : 'border-default-200'}`}>
                          <div
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-default-100"
                            onClick={() => toggleDiaBodega(fecha)}
                          >
                            <input
                              type="checkbox"
                              checked={todosMarcados}
                              disabled={idsConPendientes.length === 0}
                              onChange={() => toggleDiaBodega(fecha)}
                              className="w-4 h-4 accent-primary"
                              onClick={e => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <span className="font-semibold text-sm">{fecha}</span>
                              <span className="text-xs text-default-500 ml-2">
                                {solicitudes.length} solicitud(es) · {productosDia.length} producto(s)
                              </span>
                            </div>
                            {idsConPendientes.length === 0 && (
                              <span className="text-xs text-success flex items-center gap-1">
                                <Icon icon="lucide:check-circle-2" width={12} /> Todos enviados
                              </span>
                            )}
                          </div>
                          <div className="border-t border-default-100 divide-y divide-default-100">
                            {productosDia.map((det) => (
                              <div key={det.idProducto} className={`flex items-center gap-3 px-4 py-2 text-sm ${det.enviadoBodegaTransito ? 'opacity-50' : ''}`}>
                                {det.enviadoBodegaTransito
                                  ? <Icon icon="lucide:check-circle-2" className="text-success shrink-0" width={16} />
                                  : <Icon icon="lucide:circle" className="text-default-300 shrink-0" width={16} />
                                }
                                <span className="flex-1">{det.nombreProducto}</span>
                                <span className="text-default-500 tabular-nums">{det.cantidadTotal} {det.abreviatura}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Vista NORMAL — por solicitud */}
                    {!agruparPorDia && solicitudesBodega.map((sol) => {
                      const seleccionada = solicitudesSeleccionadas.has(sol.idSolicitud);
                      const pendientes = sol.detalles.filter(d => !d.enviadoBodegaTransito).length;
                      return (
                        <div
                          key={sol.idSolicitud}
                          className={`border rounded-lg overflow-hidden transition-all ${seleccionada ? 'border-primary/50 bg-primary/5' : 'border-default-200'}`}
                        >
                          {/* Header solicitud */}
                          <div
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-default-100"
                            onClick={() => { if (pendientes > 0) toggleSolicitudBodega(sol.idSolicitud); }}
                          >
                            <input
                              type="checkbox"
                              checked={seleccionada}
                              disabled={pendientes === 0}
                              onChange={() => toggleSolicitudBodega(sol.idSolicitud)}
                              className="w-4 h-4 accent-primary"
                              onClick={e => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{sol.nombreAsignatura}</span>
                                <span className="text-xs text-default-400">·</span>
                                <span className="text-xs text-default-500">{sol.nombreSeccion}</span>
                                {sol.diaSemana && (
                                  <>
                                    <span className="text-xs text-default-400">·</span>
                                    <span className="text-xs text-default-500">{sol.diaSemana}</span>
                                  </>
                                )}
                                {sol.horaInicio && sol.horaFin && (
                                  <span className="text-xs text-default-400">{sol.horaInicio.slice(0,5)}–{sol.horaFin.slice(0,5)}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-default-400">{sol.fechaSolicitada}</span>
                                {pendientes === 0 && (
                                  <span className="text-xs text-success flex items-center gap-1">
                                    <Icon icon="lucide:check-circle-2" width={12} /> Todos enviados
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-default-400 shrink-0">{sol.detalles.length} producto(s)</span>
                          </div>

                          {/* Detalles productos */}
                          <div className="border-t border-default-100 divide-y divide-default-100">
                            {sol.detalles.map((det: IDetalleBodegaItem) => (
                              <div
                                key={det.idDetalleSolicitud}
                                className={`flex items-center gap-3 px-4 py-2 text-sm ${det.enviadoBodegaTransito ? 'opacity-50' : ''}`}
                              >
                                {det.enviadoBodegaTransito
                                  ? <Icon icon="lucide:check-circle-2" className="text-success shrink-0" width={16} />
                                  : <Icon icon="lucide:circle" className="text-default-300 shrink-0" width={16} />
                                }
                                <span className="flex-1">{det.nombreProducto}</span>
                                <span className="text-default-500">{det.cantidadSolicitada} {det.abreviatura}</span>
                                <span className="text-xs text-default-400 w-20 text-right">Stock: {det.stock}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onPress={onBodegaClose} className="font-medium" isDisabled={loadingBodega}>
                  Cancelar
                </Button>
                <Button
                  color="primary"
                  onPress={cargarSolicitudesSeleccionadas}
                  isDisabled={solicitudesSeleccionadas.size === 0 || loadingBodega}
                  startContent={<Icon icon="lucide:arrow-right-to-line" width={18} />}
                >
                  Cargar {solicitudesSeleccionadas.size > 0 ? `${solicitudesSeleccionadas.size} solicitud(es)` : ''}
                </Button>
              </ModalFooter>
            </div>
          )}
        </ModalContent>
      </Modal>

      {/* Modal de Disponibles — sobrantes detectados en TRASLADO */}
      <Modal
        isOpen={isDisponiblesOpen}
        isDismissable={false}
        hideCloseButton
        size="lg"
        backdrop="blur"
        radius="lg"
        scrollBehavior="normal"
        classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]' }}
      >
        <ModalContent>
        <div className="max-h-[75vh] overflow-y-scroll custom-scrollbar">
          <ModalHeader>
            <div className="flex items-center gap-2">
              <Icon icon="lucide:alert-triangle" width={20} className="text-warning" />
              <span className="text-base font-bold">Productos sobrantes detectados</span>
            </div>
          </ModalHeader>
          <ModalBody className="space-y-4 pb-2">
            <p className="text-sm text-default-600">
              Se identificaron los siguientes productos como posible sobrante: un{' '}
              <strong>traslado</strong> que se enviará en una cantidad menor a la solicitada, o
              una <strong>entrada</strong> al inventario que no proviene de una orden de{' '}
              Abastecimiento de Proveedores. ¿Desea registrarlos como{' '}
              <strong>disponibles en Inventario</strong> no asociados a un pedido o solicitud?
            </p>
            <div className="rounded-lg border border-default-200 overflow-hidden">
              <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-default-100 dark:bg-default-50">
                  <tr>
                    <th className="py-2 px-3 font-medium text-left">Producto</th>
                    <th className="py-2 px-3 font-medium text-center w-36">Disponible estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {disponiblesPendientes.map((d, idx) => {
                    const item = itemsPedido.find(
                      i => i.producto.idProducto === d.idProducto && i.idSolicitud === d.idSolicitud
                    );
                    return (
                      <tr key={idx} className="border-t border-default-100">
                        <td className="py-2 px-3 text-default-700">
                          {item?.producto.nombreProducto ?? `Producto #${d.idProducto}`}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold text-default-600 tabular-nums">
                          {/* item.producto.detalles es una unidad limpia (abreviatura) solo para
                              ítems de Traslado; para ítems agregados a mano al Control Masivo es
                              un caption largo ("Stock: N Unidad") pensado para el buscador de
                              productos, no una unidad — no se muestra en ese caso. */}
                          {d.cantidad}{item?.motivo === 'TRASLADO' && item?.producto.detalles ? ` ${item.producto.detalles}` : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-warning-600 dark:text-warning-400 italic">
              El registro de stock disponible es obligatorio para este tipo de entrada.
              "Cancelar" no procesa nada: vuelve a la lista para revisar o corregir los ítems.
            </p>
          </ModalBody>
          <ModalFooter className="border-t border-default-100 gap-2">
            <Button variant="ghost" onPress={handleDisponiblesCancelar} className="font-medium">
              Cancelar
            </Button>
            <Button
              color="success"
              onPress={handleDisponiblesSi}
              startContent={<Icon icon="lucide:check-circle-2" width={16} />}
            >
              Sí, registrar disponibles
            </Button>
          </ModalFooter>
        </div>
        </ModalContent>
      </Modal>

    </>
  );
};

export default PedidoMasivoModal;
