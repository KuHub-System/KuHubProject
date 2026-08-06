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
  obtenerAbastecimientoBodegaService,
  ISolicitudBodegaItem, IDetalleBodegaItem,
} from '../../services/solicitud/solicitud-service';
import { obtenerAbastecimientoConfirmadoService, marcarEntregadosMasivoService } from '../../services/proveedor/proveedor-service';
import { IOrdenAbastecimiento, ICategoriaEntregaAbastecimiento } from '../../types/proveedor/proveedor.types';
import { ItemPedidoMasivo } from './constants';
import { CardSkeleton } from '../../components/SkeletonLoader';

/** Colores del theme usados para el color-coding de los motivos de movimiento. */
type ChipColor = 'success' | 'warning' | 'primary' | 'danger' | 'secondary';

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
  /** Permiso de escritura sobre "Inventario · Gestión Abastecimiento" (INV_ABASTECIMIENTO) — controla si se muestra el acceso a Gestión de Abastecimiento dentro del modal de Abastecimiento de Proveedores. */
  puedeGestionarAbastecimiento?: boolean;
  onOpenGestionAbastecimiento?: () => void;
}

/**
 * Modal para realizar pedidos masivos hacia bodega de tránsito
 */
const PedidoMasivoModal: React.FC<PedidoMasivoModalProps> = ({ onClose, onNuevoProducto, onProcessComplete, initialItems, puedeAccederAbastBodega = false, puedeAccederAbastProv = false, puedeGestionarAbastecimiento = false, onOpenGestionAbastecimiento }) => {
  const toast = useToast();
  const [itemsPedido, setItemsPedido] = React.useState<ItemPedidoMasivo[]>(initialItems ?? []);
  const [productoSeleccionado, setProductoSeleccionado] = React.useState<string>('');
  const [stockInput, setStockInput] = React.useState<string>('');
  const [motivo, setMotivo] = React.useState<string>('');

  // Estados para modal de Abastecimiento de Bodega
  const { isOpen: isBodegaOpen, onOpen: onBodegaOpen, onOpenChange: onBodegaOpenChange } = useDisclosure();
  const { isOpen: isBodegaInfoOpen, onOpen: onBodegaInfoOpen, onOpenChange: onBodegaInfoOpenChange } = useDisclosure();
  const [dateRangeBodega, setDateRangeBodega] = React.useState<{ start: CalendarDate; end: CalendarDate } | null>(null);
  const [solicitudesBodega, setSolicitudesBodega] = React.useState<ISolicitudBodegaItem[]>([]);
  const [solicitudesSeleccionadas, setSolicitudesSeleccionadas] = React.useState<Set<number>>(new Set());
  const [loadingBodega, setLoadingBodega] = React.useState(false);
  const [cargadoBodega, setCargadoBodega] = React.useState(false);
  const [agruparPorDia, setAgruparPorDia] = React.useState(false);
  const bodegaSearchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ── Cobertura contra el stock físico de bodega de tránsito ──
  // El stock que ya está en bodega no pertenece a nadie hasta que se reparte: se asigna a las
  // solicitudes por orden cronológico (fecha + hora de inicio), o sea la clase más próxima consume
  // primero. Lo que queda cubierto NO se vuelve a enviar; solo se traslada el faltante.
  // cubiertoPool es la parte fungible (stock que ya estaba en bodega, sin envío explícito para
  // esta solicitud); cubierto es el total ya resuelto (lo enviado explícitamente + cubiertoPool).
  type CoberturaDetalle = { cubierto: number; cubiertoPool: number; faltante: number };

  const round3 = (n: number) => Math.round(n * 1000) / 1000;

  const coberturaBodega = React.useMemo(() => {
    const porDetalle = new Map<number, CoberturaDetalle>();
    const cubiertas = new Set<number>();
    const pool = new Map<number, number>();

    const orden = [...solicitudesBodega].sort((a, b) => {
      const porFecha = a.fechaSolicitada.localeCompare(b.fechaSolicitada);
      if (porFecha !== 0) return porFecha;
      const porHora = (a.horaInicio ?? '').localeCompare(b.horaInicio ?? '');
      if (porHora !== 0) return porHora;
      return a.idSolicitud - b.idSolicitud;
    });

    for (const sol of orden) {
      let tienePendiente = false;
      let todoCubierto = true;
      for (const det of sol.detalles) {
        if (!pool.has(det.idProducto)) pool.set(det.idProducto, det.stockBodegaTransito ?? 0);
        let disponible = pool.get(det.idProducto)!;

        // Lo ya trasladado explícitamente para ESTA solicitud (suma real de movimientos TRASLADO,
        // cantidadEnviadaBodega) reserva el pool antes que el resto: ese stock físico ya está
        // comprometido con esta solicitud puntual. Si no lo descontáramos primero, el mismo stock
        // se contaría dos veces y una solicitud posterior aparecería como cubierta por error.
        const enviado = round3(Math.min(det.cantidadEnviadaBodega ?? 0, disponible));
        disponible = round3(disponible - enviado);

        const necesidadRestante = round3(det.cantidadSolicitada - enviado);
        if (necesidadRestante > 0) tienePendiente = true;

        const cubiertoPool = necesidadRestante > 0 ? round3(Math.min(necesidadRestante, disponible)) : 0;
        disponible = round3(disponible - cubiertoPool);
        pool.set(det.idProducto, disponible);

        const cubierto = round3(enviado + cubiertoPool);
        const faltante = round3(det.cantidadSolicitada - cubierto);
        porDetalle.set(det.idDetalleSolicitud, { cubierto, cubiertoPool, faltante });
        if (faltante > 0) todoCubierto = false;
      }
      if (tienePendiente && todoCubierto) cubiertas.add(sol.idSolicitud);
    }
    return { porDetalle, cubiertas };
  }, [solicitudesBodega]);

  const getCobertura = (det: IDetalleBodegaItem): CoberturaDetalle =>
    coberturaBodega.porDetalle.get(det.idDetalleSolicitud)
    ?? { cubierto: 0, cubiertoPool: 0, faltante: det.cantidadSolicitada };

  /** Cantidad que realmente hay que trasladar: descuenta lo ya enviado y lo que bodega cubre. */
  const getFaltante = (det: IDetalleBodegaItem): number => getCobertura(det).faltante;

  /**
   * Estado del envío para el check visual. Se apoya en el `faltante` real (getCobertura), no solo
   * en el histórico de movimientos TRASLADO: un producto puede tener `cantidadEnviadaBodega` igual
   * a lo solicitado y aun así seguir con faltante > 0 si ese stock ya no está físicamente en bodega
   * de tránsito (ej. una merma posterior al traslado) — en ese caso no puede mostrarse como
   * "completo", porque igual hay que reponerlo.
   */
  const getEstadoEnvio = (det: IDetalleBodegaItem): 'ninguno' | 'parcial' | 'completo' | 'perdido' => {
    const enviadoHistorico = det.cantidadEnviadaBodega ?? 0;
    if (enviadoHistorico <= 0) return 'ninguno';
    const { faltante } = getCobertura(det);
    if (faltante <= 0) return 'completo';
    return enviadoHistorico >= det.cantidadSolicitada ? 'perdido' : 'parcial';
  };

  /** Solicitudes con algo pendiente de trasladar (las cubiertas por bodega no cuentan). */
  const tieneFaltante = (sol: ISolicitudBodegaItem): boolean =>
    sol.detalles.some(d => getFaltante(d) > 0);

  const cargarSolicitudesSeleccionadas = () => {
    const nuevosItems: ItemPedidoMasivo[] = [];
    for (const sol of solicitudesBodega) {
      if (!solicitudesSeleccionadas.has(sol.idSolicitud)) continue;
      for (const det of sol.detalles) {
        const faltante = getFaltante(det);
        // Se salta lo ya enviado y lo que bodega de tránsito ya cubre.
        if (faltante <= 0) continue;
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
          delta: faltante,
          motivo: 'TRASLADO',
          idDetalleSolicitud: det.idDetalleSolicitud,
          // La cantidad de referencia para detectar sobrantes es el faltante, no lo solicitado:
          // la parte cubierta por bodega no es un sobrante del traslado.
          cantidadOriginal: faltante,
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

      // Agrupa por (idInventario, motivo, idDetalleOrdenPedido, idSolicitud) sumando deltas. Se
      // incluye el detalle/la solicitud en la clave para NO colapsar distintas líneas/fechas de la
      // misma OP, ni distintas solicitudes que pidan el mismo producto en el mismo lote de
      // Abastecimiento de Bodega: así cada uno genera su propio movimiento TRASLADO con su
      // id_solicitud (mapeo exacto de cuánto se envió por solicitud, que luego se lee de vuelta
      // desde la tabla movimiento — ver findAbastecimientoBodegaJson). Los ítems manuales (sin
      // detalle ni solicitud) comparten clave y se suman como antes.
      const agregado = new Map<string, { idInventario: number; delta: number; stockEnVista: number; tipoMovimiento: string; idSolicitud?: number; idPedido?: number; idOrdenPedido?: number; idDetalleOrdenPedido?: number }>();
      for (const item of itemsPedido) {
        const key = `${item.producto.idInventario}__${item.motivo}__${item.idDetalleOrdenPedido ?? 'manual'}__${item.idSolicitud ?? 'manual'}`;
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
      // Los envíos a bodega de tránsito ya no se "marcan" aparte: el propio movimiento TRASLADO
      // creado arriba (con su id_solicitud) es la prueba del envío — ver cantidadEnviadaBodega en
      // findAbastecimientoBodegaJson, que lo lee de vuelta desde la tabla movimiento.

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

  const procesarPedido = async () => {
    if (itemsPedido.length === 0) return;
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
  type DetalleDia = IDetalleBodegaItem & {
    cantidadTotal: number;
    /** Suma de las solicitudes del día para este producto que ya fueron enviadas. */
    cantidadEntregada: number;
    /** Suma que el stock actual de bodega de tránsito ya cubre (no se vuelve a enviar). */
    cantidadCubierta: number;
    /** Suma que falta trasladar: ni enviada antes, ni cubierta por el stock de bodega. */
    cantidadPendiente: number;
  };

  const getProductosDia = (solicitudes: ISolicitudBodegaItem[]): DetalleDia[] => {
    const mapa = new Map<number, DetalleDia>();
    for (const sol of solicitudes) {
      for (const det of sol.detalles) {
        const entregada = det.cantidadEnviadaBodega ?? 0;
        const cubierta  = getCobertura(det).cubiertoPool;
        const pendiente = getFaltante(det);
        const existente = mapa.get(det.idProducto);
        if (existente) {
          existente.cantidadTotal     += det.cantidadSolicitada;
          existente.cantidadEntregada += entregada;
          existente.cantidadCubierta  += cubierta;
          existente.cantidadPendiente += pendiente;
        } else {
          mapa.set(det.idProducto, {
            ...det,
            cantidadTotal: det.cantidadSolicitada,
            cantidadEntregada: entregada,
            cantidadCubierta: cubierta,
            cantidadPendiente: pendiente,
          });
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
      .filter(tieneFaltante)
      .map(s => s.idSolicitud);
    const todosMarcados = idsConPendientes.length > 0 && idsConPendientes.every(id => solicitudesSeleccionadas.has(id));
    setSolicitudesSeleccionadas(prev => {
      const next = new Set(prev);
      idsConPendientes.forEach(id => todosMarcados ? next.delete(id) : next.add(id));
      return next;
    });
  };

  // Metadata visual por motivo (color, icono y descripción). Se comparte entre el banner
  // informativo del formulario y las filas del listado para que el color-coding sea el mismo
  // en toda la vista: verde = entra stock, rojo = sale stock, ámbar = traslado, amarillo Duoc
  // = ajuste, gris = devolución.
  const MOTIVO_META: Record<string, { color: ChipColor; icon: string; texto: string }> = {
    ENTRADA_INVENTARIO: { color: 'success', icon: 'lucide:arrow-down-to-line', texto: 'Entrada de insumos al inventario' },
    ENTRADA_BODEGA: { color: 'success', icon: 'lucide:arrow-down-to-line', texto: 'Entrada de insumos a la bodega de tránsito' },
    SALIDA_INVENTARIO: { color: 'danger', icon: 'lucide:arrow-up-from-line', texto: 'Salida de insumos del inventario' },
    SALIDA_BODEGA: { color: 'danger', icon: 'lucide:arrow-up-from-line', texto: 'Salida de insumos de la bodega de tránsito' },
    TRASLADO: { color: 'warning', icon: 'lucide:arrow-left-right', texto: 'Mover hacia la bodega de tránsito' },
    AJUSTE_INVENTARIO: { color: 'primary', icon: 'lucide:sliders-horizontal', texto: 'Ajustar stock actual' },
    AJUSTE_BODEGA: { color: 'primary', icon: 'lucide:sliders-horizontal', texto: 'Ajustar stock actual' },
    MERMA_INVENTARIO: { color: 'danger', icon: 'lucide:trending-down', texto: 'Salida de insumos por daño/pérdida' },
    MERMA_BODEGA: { color: 'danger', icon: 'lucide:trending-down', texto: 'Salida de insumos por daño/pérdida' },
    DEVOLUCION: { color: 'secondary', icon: 'lucide:undo-2', texto: 'Registrar devolución de insumos al inventario' },
  };

  // Clases estáticas por color: Tailwind no puede generar `bg-${color}-50` en tiempo de
  // ejecución (purga las clases que no aparecen literales en el código fuente).
  const MOTIVO_CLASES: Record<ChipColor, { banner: string; barra: string; icono: string }> = {
    success: { banner: 'bg-success-50 border-success-200 dark:bg-success/10 dark:border-success/25', barra: 'bg-success', icono: 'text-success-600 dark:text-success' },
    danger: { banner: 'bg-danger-50 border-danger-200 dark:bg-danger/10 dark:border-danger/25', barra: 'bg-danger', icono: 'text-danger-600 dark:text-danger' },
    warning: { banner: 'bg-warning-50 border-warning-200 dark:bg-warning/10 dark:border-warning/25', barra: 'bg-warning', icono: 'text-warning-600 dark:text-warning' },
    primary: { banner: 'bg-primary-50 border-primary-200 dark:bg-primary/10 dark:border-primary/25', barra: 'bg-primary', icono: 'text-primary-700 dark:text-primary' },
    secondary: { banner: 'bg-default-100 border-default-200 dark:bg-default-50 dark:border-default-100', barra: 'bg-secondary', icono: 'text-secondary dark:text-foreground' },
  };

  const metaMotivoActual = motivo ? MOTIVO_META[motivo] : undefined;

  // Grilla del listado: la MISMA definición para el encabezado y para las filas. El
  // encabezado y las filas son dos grids independientes, así que cualquier columna
  // dimensionada por contenido (`auto`) se resuelve distinto en cada uno y descalza las
  // columnas — "Acción" (texto) mide más que el botón de basura, y ese sobrante se le
  // restaba a las columnas `fr` solo en el encabezado. Por eso la última columna va con
  // ancho fijo y las flexibles con `minmax(0,...)`: así ninguna depende de su contenido.
  const GRID_LISTADO =
    'grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_72px] gap-3 pl-5 pr-4';

  return (
    <>
    <div className="max-h-[75vh] overflow-y-scroll custom-scrollbar">
      <ModalHeader className="flex flex-col gap-3 border-b border-default-100 dark:border-default-50 bg-white dark:bg-content2 px-6 py-4">
        <div className="flex items-start gap-3 min-w-0 pr-8">
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-700 dark:text-primary">
            <Icon icon="lucide:layers" width={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-secondary dark:text-foreground leading-tight">Control de Stock Masivo</h2>
            <p className="text-sm font-medium text-default-500 mt-0.5">
              Registre entradas, salidas, mermas, ajustes o traslados de múltiples productos de forma estructurada.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-tiny font-semibold uppercase tracking-wider text-default-400">
            Cargar desde
          </span>
          <Tooltip content={puedeAccederAbastBodega ? "Ver solicitudes EN_PEDIDO de bodega" : "Sin permisos"} color="foreground" className="text-xs">
            <Button
              variant="flat"
              color="primary"
              size="sm"
              className="font-semibold"
              startContent={<Icon icon="lucide:warehouse" width={16} />}
              endContent={<Icon icon="lucide:chevron-right" width={14} className="opacity-50" />}
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
              size="sm"
              className="font-semibold"
              startContent={<Icon icon="lucide:truck" width={16} />}
              endContent={<Icon icon="lucide:chevron-right" width={14} className="opacity-50" />}
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
            <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
              <span className="flex items-center gap-1.5 text-tiny font-semibold uppercase tracking-wider text-default-400">
                <Icon icon="lucide:package-plus" width={14} />
                Agregar producto
              </span>
              {productoActual && (
                <Chip size="sm" variant="flat" color="default" className="text-tiny">
                  Stock actual: <span className="font-semibold text-secondary dark:text-foreground ml-1">{fmtCL(originalStock)}</span>
                </Chip>
              )}
            </div>
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

              {/* Botón agregar — alineado al centro de los inputs (56px de alto) */}
              <div className="flex items-center justify-end md:h-14">
                <Tooltip content={isFormValid ? 'Agregar al listado' : 'Complete producto, acción y cantidad'} color="foreground" className="text-xs">
                  <span>
                    <Button
                      isIconOnly
                      color="warning"
                      variant="solid"
                      radius="full"
                      size="lg"
                      onPress={agregarProducto}
                      isDisabled={!isFormValid}
                      aria-label="Agregar al listado"
                      className="shadow-md transition-transform data-[hover=true]:scale-105"
                    >
                      <Icon icon="lucide:plus" width={22} />
                    </Button>
                  </span>
                </Tooltip>
              </div>
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
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-medium border ${
                    metaMotivoActual
                      ? MOTIVO_CLASES[metaMotivoActual.color].banner
                      : 'bg-default-100 border-default-200 dark:bg-default-50 dark:border-default-100'
                  }`}
                >
                  <Icon
                    icon={metaMotivoActual?.icon ?? 'lucide:info'}
                    width={16}
                    className={`shrink-0 ${metaMotivoActual ? MOTIVO_CLASES[metaMotivoActual.color].icono : 'text-default-500'}`}
                  />
                  <span className="text-sm font-medium text-secondary dark:text-foreground">
                    {metaMotivoActual?.texto ?? 'Seleccione un motivo para ver detalles de la operación.'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Estado vacío — evita el hueco entre el formulario y el pie del modal */}
          {itemsPedido.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 border border-dashed border-default-200 dark:border-default-100 rounded-xl text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-default-100 dark:bg-default-50 text-default-400">
                <Icon icon="lucide:clipboard-list" width={22} />
              </div>
              <p className="text-sm font-semibold text-default-600 dark:text-default-500">
                Aún no hay productos en el listado
              </p>
              <p className="text-xs text-default-400 max-w-sm">
                Busque un producto y presione <span className="font-semibold text-warning-600 dark:text-warning">+</span> para agregarlo,
                o cárguelos desde Abastecimiento de Bodega o de Proveedores.
              </p>
            </div>
          )}

          {/* Lista en tabla editable */}
          {itemsPedido.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                className="w-full flex items-center gap-2 font-bold text-secondary dark:text-foreground hover:text-secondary/80 dark:hover:text-foreground/80 transition-colors cursor-pointer"
                onClick={() => setListadoExpandido(v => !v)}
                aria-expanded={listadoExpandido}
              >
                <Icon icon="lucide:list" width={18} />
                Listado
                <Chip size="sm" variant="flat" color="warning" className="font-semibold">
                  {itemsPedido.length} producto{itemsPedido.length !== 1 ? 's' : ''}
                </Chip>
                <span className="ml-auto flex items-center gap-1 text-xs font-medium text-default-400">
                  {listadoExpandido ? 'Contraer' : 'Expandir'}
                  <Icon
                    icon={listadoExpandido ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                    width={16}
                  />
                </span>
              </button>

              <div className="border border-default-200 dark:border-default-100 rounded-xl overflow-hidden bg-white dark:bg-content2 shadow-sm">
                <div className={`transition-all duration-300 ${listadoExpandido ? 'max-h-[65vh]' : 'max-h-[420px]'} overflow-y-scroll custom-scrollbar`}>
                  {/* Encabezados — sticky para no perder las columnas al scrollear */}
                  <div className={`sticky top-0 z-10 ${GRID_LISTADO} py-2.5 bg-default-100 dark:bg-default-50 font-semibold text-tiny uppercase tracking-wider text-default-500 border-b border-default-200 dark:border-default-100`}>
                    <div className="text-left">Producto</div>
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

                      const simbolo = isSalida ? '-' : isAjuste ? '=' : '+';
                      const meta = MOTIVO_META[item.motivo];
                      const chipColor = meta?.color ?? 'default';
                      const clases = meta ? MOTIVO_CLASES[meta.color] : undefined;

                      return (
                        <div key={item.id} className={`relative ${GRID_LISTADO} py-3 items-center hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors group`}>
                          {/* Barra lateral con el color del motivo — refuerza el tipo de
                              movimiento sin gastar una columna de la grilla */}
                          <span
                            aria-hidden
                            className={`absolute left-0 top-0 bottom-0 w-1 ${clases?.barra ?? 'bg-default-300'}`}
                          />

                          {/* Producto */}
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-default-800 dark:text-foreground truncate" title={item.producto.nombreProducto}>
                              {item.producto.nombreProducto}
                            </p>
                            <p className="text-xs text-default-400 truncate">
                              <Icon icon={meta?.icon ?? 'lucide:package'} width={12} className="inline-block mr-1 -mt-0.5" />
                              {item.producto.detalles}
                              {item.marcaProducto && <span className="ml-1.5 italic text-default-400">{item.marcaProducto}</span>}
                            </p>
                          </div>

                          {/* Stock Actual */}
                          <div className="text-center">
                            <span className="font-semibold text-sm tabular-nums text-default-600 dark:text-default-500">
                              {fmtCL(item.producto.stock)}
                            </span>
                          </div>

                          {/* Cantidad editable — el input nativo ya trae sus flechas de
                              incremento, no hace falta un stepper propio ocupando ancho */}
                          <div className="flex justify-center">
                            <Input
                              type="number"
                              value={item.delta.toString()}
                              onValueChange={(val) => {
                                const num = parseFloat(val);
                                if (!isNaN(num)) actualizarDeltaItem(item.id, num);
                              }}
                              step={item.producto.esFraccionario ? "0.5" : "1"}
                              aria-label="Cantidad"
                              size="sm"
                              variant="bordered"
                              classNames={{
                                base: "w-24",
                                inputWrapper: "h-8 min-h-8",
                                input: "text-center text-sm font-semibold tabular-nums",
                              }}
                            />
                          </div>

                          {/* Stock Final — el resultado manda visualmente; el delta queda
                              como línea secundaria. Un resultado negativo se marca en rojo
                              con alerta, porque significa que la operación deja stock en
                              negativo y antes se perdía entre dos números parecidos. */}
                          <div className="flex flex-col items-center leading-tight">
                            <span
                              className={`text-base font-bold tabular-nums ${
                                stockFinal < 0
                                  ? 'text-danger'
                                  : 'text-secondary dark:text-foreground'
                              }`}
                            >
                              {stockFinal < 0 && (
                                <Icon icon="lucide:alert-triangle" width={14} className="inline-block mr-1 -mt-0.5" />
                              )}
                              {fmtCL(stockFinal)}
                            </span>
                            <Chip
                              size="sm"
                              color={chipColor}
                              variant="flat"
                              classNames={{
                                base: "h-5 mt-0.5",
                                content: "px-1.5 text-tiny font-semibold tabular-nums",
                              }}
                            >
                              {isAjuste ? 'ajuste' : `${simbolo}${fmtCL(item.delta)}`}
                            </Chip>
                          </div>

                          {/* Eliminar */}
                          <div className="text-center">
                            <Tooltip content="Quitar del listado" color="danger" className="text-xs">
                              <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                onPress={() => eliminarItem(item.id)}
                                aria-label={`Quitar ${item.producto.nombreProducto} del listado`}
                                className="text-default-300 group-hover:text-default-500 hover:!text-danger transition-colors"
                              >
                                <Icon icon="lucide:trash-2" width={16} />
                              </Button>
                            </Tooltip>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resumen — dentro del bloque de la tabla, no flotando debajo */}
                <div className="flex justify-between items-center px-4 py-2.5 bg-default-50 dark:bg-default-50/50 border-t border-default-200 dark:border-default-100">
                  <span className="text-xs font-medium text-default-500">Total de productos</span>
                  <span className="text-sm font-bold text-secondary dark:text-foreground tabular-nums">{itemsPedido.length}</span>
                </div>
              </div>
            </div>
          )}
      </ModalBody>

      <ModalFooter className="bg-default-50 dark:bg-content2 border-t border-default-100 dark:border-default-50 flex justify-between items-center w-full gap-2 px-6 py-3">
        <Button
          variant="light"
          color="danger"
          size="sm"
          startContent={<Icon icon="lucide:eraser" width={15} />}
          onPress={() => setItemsPedido([])}
          isDisabled={itemsPedido.length === 0 || processState !== 'idle'}
          className="font-medium"
        >
          Limpiar todo
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="light" onPress={onClose} className="font-medium text-default-500">
            Cancelar
          </Button>
          <Button
            color={processState === 'sincronizando' ? "secondary" : "warning"}
            onPress={procesarPedido}
            isDisabled={itemsPedido.length === 0 || processState !== 'idle'}
            isLoading={processState !== 'idle'}
            startContent={processState === 'idle' && <Icon icon="lucide:send" width={18} />}
            className="font-semibold shadow-md"
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
                  {onOpenGestionAbastecimiento && puedeGestionarAbastecimiento && (
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
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-bold text-secondary dark:text-foreground">Abastecimiento de Bodega</h2>
                  <Tooltip content="Cómo funciona esta vista">
                    <button
                      type="button"
                      onClick={onBodegaInfoOpen}
                      className="text-default-400 hover:text-primary transition-colors cursor-pointer"
                      aria-label="Cómo funciona Abastecimiento de Bodega"
                    >
                      <Icon icon="lucide:info" width={18} />
                    </button>
                  </Tooltip>
                </div>
                <p className="text-xs text-default-500 font-normal">Solicitudes EN_PEDIDO con productos de categorías INVENTARIO → TRASLADO a bodega de tránsito</p>
                <p className="text-xs text-default-500 font-normal">
                  El stock que ya está en <strong>bodega de tránsito</strong> se reparte entre las solicitudes por
                  orden de fecha y hora: la clase más próxima consume primero. Lo que queda cubierto no se envía
                  de nuevo — solo se traslada el faltante.
                </p>
                <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 mt-1">
                  <Icon icon="lucide:info" width={14} className="text-warning shrink-0" />
                  <p className="text-xs text-warning-700 dark:text-warning">Se visualizan todas las categorías asignadas al abastecimiento.</p>
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
                      <div className="flex flex-col">
                        <span className="text-sm text-default-600">{solicitudesBodega.length} solicitud(es) encontrada(s)</span>
                        {coberturaBodega.cubiertas.size > 0 && (
                          <span className="text-xs text-default-500">
                            {coberturaBodega.cubiertas.size} ya cubierta(s) por el stock actual de bodega de tránsito
                          </span>
                        )}
                      </div>
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
                        <Button size="sm" variant="flat" onPress={() => setSolicitudesSeleccionadas(new Set(solicitudesBodega.filter(tieneFaltante).map(s => s.idSolicitud)))}>
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
                        .filter(tieneFaltante)
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
                              productosDia.some(p => p.cantidadCubierta > 0)
                                ? <span className="text-xs font-bold text-default-500 flex items-center gap-1">
                                    <Icon icon="lucide:warehouse" width={12} /> Cubierto en bodega de tránsito
                                  </span>
                                : <span className="text-xs text-success flex items-center gap-1">
                                    <Icon icon="lucide:check-circle-2" width={12} /> Todos enviados
                                  </span>
                            )}
                          </div>
                          <div className="border-t border-default-100 divide-y divide-default-100">
                            {productosDia.map((det) => {
                              // Tres orígenes posibles para la cantidad del día: ya enviada antes,
                              // cubierta por el stock actual de bodega, o pendiente de trasladar.
                              const esMixto = [det.cantidadEntregada, det.cantidadCubierta, det.cantidadPendiente]
                                .filter(v => v > 0).length > 1;
                              if (!esMixto) {
                                const soloCubierto = det.cantidadCubierta > 0 && det.cantidadPendiente === 0 && det.cantidadEntregada === 0;
                                // Si es la única cantidad no-nula y no queda pendiente, la suma del día
                                // fue enviada completa (un envío parcial siempre convive con "cubierta"
                                // o "pendiente" > 0, así que cae en la rama mixta de abajo).
                                const soloEnviado = det.cantidadEntregada > 0 && det.cantidadPendiente === 0 && det.cantidadCubierta === 0;
                                const apagado = soloEnviado || soloCubierto;
                                return (
                                  <div key={det.idProducto} className={`flex items-center gap-3 px-4 py-2 text-sm ${apagado ? 'opacity-50' : ''}`}>
                                    {soloEnviado
                                      ? <Icon icon="lucide:check-circle-2" className="text-success shrink-0" width={16} />
                                      : soloCubierto
                                        ? <Icon icon="lucide:warehouse" className="text-default-500 shrink-0" width={16} />
                                        : <Icon icon="lucide:circle" className="text-default-300 shrink-0" width={16} />
                                    }
                                    <span className="flex-1">{det.nombreProducto}</span>
                                    {soloCubierto && (
                                      <span className="text-xs font-bold text-default-500">Cubierto en bodega de tránsito</span>
                                    )}
                                    <span className="text-default-500 tabular-nums">{det.cantidadTotal} {det.abreviatura}</span>
                                  </div>
                                );
                              }
                              // Mixto: las solicitudes del día que piden este producto no están todas
                              // en el mismo estado — se desglosa para no mostrar el total combinado
                              // como si fuera una única cantidad pendiente de enviar.
                              return (
                                <div key={det.idProducto} className="px-4 py-2 text-sm">
                                  <span className="block mb-1">{det.nombreProducto}</span>
                                  <div className="flex items-center gap-4 pl-1 flex-wrap">
                                    {det.cantidadEntregada > 0 && (
                                      <span className="flex items-center gap-1.5 opacity-50">
                                        <Icon
                                          icon="lucide:check-circle-2"
                                          className={`${det.cantidadEntregada < det.cantidadTotal ? 'text-warning' : 'text-success'} shrink-0`}
                                          width={14}
                                        />
                                        <span className="text-xs tabular-nums">Entregado: {det.cantidadEntregada} {det.abreviatura}</span>
                                      </span>
                                    )}
                                    {det.cantidadCubierta > 0 && (
                                      <span className="flex items-center gap-1.5 opacity-60">
                                        <Icon icon="lucide:warehouse" className="text-default-500 shrink-0" width={14} />
                                        <span className="text-xs font-bold text-default-500 tabular-nums">Cubierto en bodega: {det.cantidadCubierta} {det.abreviatura}</span>
                                      </span>
                                    )}
                                    {det.cantidadPendiente > 0 && (
                                      <span className="flex items-center gap-1.5">
                                        <Icon icon="lucide:circle" className="text-default-300 shrink-0" width={14} />
                                        <span className="text-xs text-default-500 tabular-nums">Pendiente: {det.cantidadPendiente} {det.abreviatura}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Vista NORMAL — por solicitud */}
                    {!agruparPorDia && solicitudesBodega.map((sol) => {
                      const seleccionada = solicitudesSeleccionadas.has(sol.idSolicitud);
                      const pendientes = sol.detalles.filter(d => getFaltante(d) > 0).length;
                      const cubiertaEnBodega = coberturaBodega.cubiertas.has(sol.idSolicitud);
                      return (
                        <div
                          key={sol.idSolicitud}
                          className={`border rounded-lg overflow-hidden transition-all ${
                            cubiertaEnBodega
                              ? 'border-default-200 bg-default-100/60 dark:bg-default-100/10'
                              : seleccionada
                                ? 'border-primary/50 bg-primary/5'
                                : 'border-default-200'
                          }`}
                        >
                          {/* Header solicitud */}
                          <div
                            className={`flex items-center gap-3 p-3 ${pendientes > 0 ? 'cursor-pointer hover:bg-default-100' : ''} ${cubiertaEnBodega ? 'opacity-60' : ''}`}
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
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs text-default-400">{sol.fechaSolicitada}</span>
                                {cubiertaEnBodega && (
                                  <span className="text-xs font-bold text-default-500 flex items-center gap-1">
                                    <Icon icon="lucide:warehouse" width={12} /> Cubierto en bodega de tránsito
                                  </span>
                                )}
                                {!cubiertaEnBodega && pendientes === 0 && (
                                  <span className="text-xs text-success flex items-center gap-1">
                                    <Icon icon="lucide:check-circle-2" width={12} /> Todos enviados
                                  </span>
                                )}
                                {pendientes > 0 && sol.detalles.some(d => getEstadoEnvio(d) === 'ninguno' && getCobertura(d).cubiertoPool > 0) && (
                                  <span className="text-xs font-bold text-default-500 flex items-center gap-1">
                                    <Icon icon="lucide:warehouse" width={12} /> Parcialmente cubierto en bodega de tránsito
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-default-400 shrink-0">
                              {pendientes > 0 ? `${pendientes} de ${sol.detalles.length} por enviar` : `${sol.detalles.length} producto(s)`}
                            </span>
                          </div>

                          {/* Detalles productos */}
                          <div className="border-t border-default-100 divide-y divide-default-100">
                            {sol.detalles.map((det: IDetalleBodegaItem) => {
                              const { cubierto } = getCobertura(det);
                              const faltante = getFaltante(det);
                              const estadoEnvio = getEstadoEnvio(det);
                              const cubiertoTotal   = estadoEnvio === 'ninguno' && faltante === 0 && cubierto > 0;
                              const cubiertoParcial = estadoEnvio === 'ninguno' && faltante > 0 && cubierto > 0;
                              const apagado = estadoEnvio === 'completo' || cubiertoTotal;
                              return (
                                <div
                                  key={det.idDetalleSolicitud}
                                  className={`flex items-center gap-3 px-4 py-2 text-sm ${apagado ? 'opacity-50' : ''}`}
                                >
                                  {estadoEnvio === 'completo'
                                    ? <Icon icon="lucide:check-circle-2" className="text-success shrink-0" width={16} />
                                    : estadoEnvio === 'parcial'
                                      ? <Icon icon="lucide:check-circle-2" className="text-warning shrink-0" width={16} />
                                      : estadoEnvio === 'perdido'
                                        ? <Icon icon="lucide:alert-triangle" className="text-danger shrink-0" width={16} />
                                        : cubiertoTotal
                                          ? <Icon icon="lucide:warehouse" className="text-default-500 shrink-0" width={16} />
                                          : <Icon icon="lucide:circle" className="text-default-300 shrink-0" width={16} />
                                  }
                                  <span className="flex-1">{det.nombreProducto}</span>
                                  {estadoEnvio === 'parcial' && (
                                    <span className="text-xs font-bold text-warning tabular-nums">
                                      Enviado: {det.cantidadEnviadaBodega} · Falta: {faltante} {det.abreviatura}
                                    </span>
                                  )}
                                  {estadoEnvio === 'perdido' && (
                                    <span className="text-xs font-bold text-danger tabular-nums">
                                      Se envió {det.cantidadEnviadaBodega} pero ya no está en bodega de tránsito · Falta: {faltante} {det.abreviatura}
                                    </span>
                                  )}
                                  {cubiertoTotal && (
                                    <span className="text-xs font-bold text-default-500">Cubierto en bodega de tránsito</span>
                                  )}
                                  {cubiertoParcial && (
                                    <span className="text-xs font-bold text-default-500 tabular-nums">
                                      En bodega: {cubierto} · Falta: {faltante} {det.abreviatura}
                                    </span>
                                  )}
                                  <span className="text-default-500 tabular-nums">{det.cantidadSolicitada} {det.abreviatura}</span>
                                  <span className="text-xs text-default-400 w-20 text-right">Stock: {det.stock}</span>
                                </div>
                              );
                            })}
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

      {/* Modal indicador — explica el funcionamiento de Abastecimiento de Bodega */}
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
                  <h2 className="text-lg font-bold text-secondary dark:text-foreground">Cómo funciona Abastecimiento de Bodega</h2>
                </div>
                <p className="text-xs text-default-500 font-normal">
                  Traslada productos desde Inventario hacia Bodega de Tránsito para cubrir las solicitudes
                  de docentes/secciones que ya están en estado EN_PEDIDO.
                </p>
              </ModalHeader>
              <ModalBody className="space-y-5 pb-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-secondary dark:text-foreground">¿Cómo se calcula el faltante?</h3>
                  <p className="text-sm text-default-600">
                    El faltante es la cantidad que aún debe trasladarse a la bodega de tránsito para
                    completar una solicitud. Se obtiene restando de la cantidad solicitada:
                  </p>
                  <ul className="text-sm text-default-600 list-disc pl-5 space-y-1">
                    <li>Los productos ya enviados mediante movimientos de tipo TRASLADO.</li>
                    <li>El stock disponible en Bodega de Tránsito que aún no ha sido asignado a otra solicitud. Este stock se distribuye automáticamente según el orden de fecha y hora de la clase, priorizando las más próximas.</li>
                  </ul>
                  <p className="text-sm text-default-600">
                    Por este motivo, una solicitud puede aparecer sin faltantes aunque nunca haya recibido
                    un traslado, si el stock existente en la bodega de tránsito ya es suficiente para cubrirla.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-secondary dark:text-foreground">Estados de los productos</h3>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <Icon icon="lucide:circle" className="text-default-300 shrink-0 mt-0.5" width={16} />
                      <p className="text-sm text-default-600">
                        <strong>Pendiente</strong> — no existen traslados ni stock suficiente en bodega de
                        tránsito. Debe trasladarse toda la cantidad solicitada.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Icon icon="lucide:warehouse" className="text-default-500 shrink-0 mt-0.5" width={16} />
                      <p className="text-sm text-default-600">
                        <strong>Cubierto en bodega de tránsito</strong> — la solicitud queda cubierta con el
                        stock existente en bodega, sin necesidad de realizar un nuevo traslado. Si la
                        cobertura es parcial, se muestra "En bodega: X · Falta: Y".
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Icon icon="lucide:check-circle-2" className="text-warning shrink-0 mt-0.5" width={16} />
                      <p className="text-sm text-default-600">
                        <strong className="text-warning-700 dark:text-warning">Enviado parcial</strong> — solo
                        se trasladó una parte de la cantidad solicitada. Se muestra "Enviado: X · Falta: Y".
                        El faltante puede ser 0 si el resto se completa con el stock existente en bodega de tránsito.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Icon icon="lucide:check-circle-2" className="text-success shrink-0 mt-0.5" width={16} />
                      <p className="text-sm text-default-600">
                        <strong className="text-success">Enviado completo</strong> — se trasladó una cantidad
                        igual o superior a la solicitada y ese stock sigue disponible en bodega de tránsito.
                        No existen cantidades pendientes para ese producto.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Icon icon="lucide:alert-triangle" className="text-danger shrink-0 mt-0.5" width={16} />
                      <p className="text-sm text-default-600">
                        <strong className="text-danger">Se envió pero ya no está en bodega</strong> — se
                        trasladó la cantidad completa en su momento, pero bodega de tránsito ya no tiene ese
                        stock (por ejemplo, se perdió por una merma posterior). Vuelve a aparecer como
                        pendiente con "Falta: Y" porque hay que reponerlo.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-secondary dark:text-foreground">Estados de la solicitud</h3>
                  <p className="text-sm text-default-600">
                    Cada solicitud resume el estado de todos sus productos mediante los badges:
                  </p>
                  <ul className="text-sm text-default-600 list-disc pl-5 space-y-1">
                    <li><strong>Cubierto en bodega de tránsito</strong> — todos los productos fueron cubiertos con el stock existente.</li>
                    <li><strong className="text-success">Todos enviados</strong> — todos los productos fueron trasladados o ya quedaron completamente cubiertos.</li>
                    <li><strong>Parcialmente cubierto en bodega de tránsito</strong> — parte de los productos ya está cubierta, pero aún existen cantidades pendientes por trasladar.</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-secondary dark:text-foreground">Agrupar por día</h3>
                  <p className="text-sm text-default-600">
                    Agrupa los productos de todas las solicitudes de un mismo día en una sola fila. Si un
                    mismo producto tiene solicitudes con estados diferentes (por ejemplo, una enviada, otra
                    pendiente y otra cubierta por bodega), el sistema muestra cada cantidad por separado
                    para evitar totales que puedan resultar engañosos.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-secondary dark:text-foreground">¿Por qué no aparece cierto producto?</h3>
                  <p className="text-sm text-default-600">
                    Solo se listan productos de categorías que Gestión Administrativa configuró para
                    abastecerse en <strong>Inventario</strong> (panel "Gestión de Abastecimiento") — esas
                    son las que primero se abastecen ahí y después necesitan este traslado a bodega de
                    tránsito. Si el abastecimiento de Proveedores de una categoría se configuró directo en{' '}
                    <strong>Bodega de Tránsito</strong>, sus productos nunca pasan por Inventario y no
                    necesitan este paso de Abastecimiento de Bodega.
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

export default PedidoMasivoModal;
