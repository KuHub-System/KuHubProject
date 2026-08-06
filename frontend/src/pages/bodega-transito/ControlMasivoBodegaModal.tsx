import React from 'react';
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
  Button, Chip, Checkbox, Select, SelectItem, Spinner, Tooltip, Input,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { fmtCL } from '../../utils/format-numbers';
import { useToast } from '../../hooks/useToast';
import {
  obtenerBulkBodegaListingService, bulkUpdateBodegaStockService, obtenerBodegaByInventarioIdsService,
  inicializarDesdeAbastecimientoService,
  IBodegaTransitoItem, IBulkBodegaListing, IBulkWarehouseUpdateRequest, IBulkWarehouseProcessResult,
} from '../../services/inventario/bodega-transito-service';
import { obtenerAbastecimientoConfirmadoService, marcarEntregadosMasivoService } from '../../services/proveedor/proveedor-service';
import { IOrdenAbastecimiento, ICategoriaEntregaAbastecimiento } from '../../types/proveedor/proveedor.types';
import { ItemBodegaMasivo, MOTIVOS_BODEGA, MOTIVO_LABEL } from './constants';
import { CardSkeleton } from '../../components/SkeletonLoader';

/** Colores del theme usados para el color-coding de los motivos de movimiento. */
type ChipColor = 'success' | 'warning' | 'primary' | 'danger' | 'secondary';

interface ControlMasivoBodegaModalProps {
  onClose: () => void;
  initialItems?: ItemBodegaMasivo[];
  onProcessComplete?: (data: IBulkWarehouseProcessResult, retryItems: ItemBodegaMasivo[]) => void;
  puedeAccederAbastecimiento?: boolean;
  /** Permiso de escritura sobre "Inventario · Gestión Abastecimiento" (INV_ABASTECIMIENTO) — controla si se muestra el acceso a Gestión de Abastecimiento dentro del modal de Abastecimiento de Proveedores. */
  puedeGestionarAbastecimiento?: boolean;
  onOpenGestionAbastecimiento?: () => void;
}

const ControlMasivoBodegaModal: React.FC<ControlMasivoBodegaModalProps> = ({ onClose, initialItems, onProcessComplete, puedeAccederAbastecimiento = false, puedeGestionarAbastecimiento = false, onOpenGestionAbastecimiento }) => {
  const toast = useToast();

  // Estados para modal de abastecimiento de proveedores (OPs CONFIRMADA)
  const { isOpen: isAbastecimientoOpen, onOpen: onAbastecimientoOpen, onOpenChange: onAbastecimientoOpenChange } = useDisclosure();
  type FiltroAbastecimiento = 'semana' | '30dias' | '3meses' | 'todas';
  const [filtroAbastecimiento, setFiltroAbastecimiento] = React.useState<FiltroAbastecimiento>('semana');
  const [ordenesAbastecimiento, setOrdenesAbastecimiento] = React.useState<IOrdenAbastecimiento[]>([]);
  const [loadingAbastecimiento, setLoadingAbastecimiento] = React.useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = React.useState<Set<string>>(new Set());

  // Modal de confirmación: crear bodega para productos faltantes
  const { isOpen: isCrearBodegaOpen, onOpen: onCrearBodegaOpen, onOpenChange: onCrearBodegaOpenChange } = useDisclosure();
  type FaltanteInfo = {
    idProducto: number;
    idInventario: number;
    nombre: string;
    detalles: { idDetalleOrdenPedido: number; cantidadSolicitada: number }[];
  };
  const [productosFaltantes, setProductosFaltantes] = React.useState<FaltanteInfo[]>([]);
  const [itemsFoundCache, setItemsFoundCache] = React.useState<ItemBodegaMasivo[]>([]);
  const [cargandoCrearBodega, setCargandoCrearBodega] = React.useState(false);

  // Modal: productos ya entregados detectados al cargar desde abastecimiento
  type EntregadoItemInfo = { nombre: string; cantidad: number; abreviatura: string };
  const [isEntregadosOpen, setIsEntregadosOpen] = React.useState(false);
  const [entregadosInfoList, setEntregadosInfoList] = React.useState<EntregadoItemInfo[]>([]);
  const [itemsConEntregados, setItemsConEntregados] = React.useState<ItemBodegaMasivo[]>([]);
  const [itemsSinEntregados, setItemsSinEntregados] = React.useState<ItemBodegaMasivo[]>([]);
  const [faltantesMapCache, setFaltantesMapCache] = React.useState<Map<number, FaltanteInfo>>(new Map());

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
      const data = await obtenerAbastecimientoConfirmadoService(fechaHasta, 'BODEGA_TRANSITO');
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

  const cargarDiasSeleccionados = async () => {
    setLoadingAbastecimiento(true);
    try {
      // Paso 1: recopilar todos los idInventario únicos de los días seleccionados
      const inventarioIdsSet = new Set<number>();
      for (const orden of ordenesAbastecimiento) {
        for (const entrega of orden.entregas) {
          const key = `${orden.idOrdenPedido}-${entrega.fechaEntrega}`;
          if (!diasSeleccionados.has(key)) continue;
          for (const cat of entrega.categorias) {
            for (const prod of cat.productos) {
              inventarioIdsSet.add(prod.idInventario);
            }
          }
        }
      }

      if (inventarioIdsSet.size === 0) {
        toast.warning('No hay ítems para cargar en el período seleccionado');
        return;
      }

      // Paso 2: lookup directo por idInventario, sin paginación
      const bodegaItems = await obtenerBodegaByInventarioIdsService(Array.from(inventarioIdsSet));
      const bodegaMap = new Map<number, IBodegaTransitoItem>();
      for (const b of bodegaItems) {
        bodegaMap.set(b.idInventario, b);
      }

      const encontrados: ItemBodegaMasivo[] = [];
      // Agrupado por idProducto para evitar duplicados (un producto en varios días)
      const faltantesMap = new Map<number, FaltanteInfo>();
      // Detectar productos ya entregados
      const entregadosIdSet = new Set<number>();
      const entregadosInfoCollect: EntregadoItemInfo[] = [];

      for (const orden of ordenesAbastecimiento) {
        for (const entrega of orden.entregas) {
          const key = `${orden.idOrdenPedido}-${entrega.fechaEntrega}`;
          if (!diasSeleccionados.has(key)) continue;
          for (const cat of entrega.categorias) {
            for (const prod of cat.productos) {
              const bodegaItem = bodegaMap.get(prod.idInventario);
              if (!bodegaItem) {
                const existing = faltantesMap.get(prod.idProducto);
                if (existing) {
                  existing.detalles.push({
                    idDetalleOrdenPedido: prod.idDetalleOrdenPedido,
                    cantidadSolicitada: prod.cantidadSolicitada,
                  });
                } else {
                  faltantesMap.set(prod.idProducto, {
                    idProducto: prod.idProducto,
                    idInventario: prod.idInventario,
                    nombre: prod.nombreProducto,
                    detalles: [{
                      idDetalleOrdenPedido: prod.idDetalleOrdenPedido,
                      cantidadSolicitada: prod.cantidadSolicitada,
                    }],
                  });
                }
                continue;
              }
              const nuevoItem: ItemBodegaMasivo = {
                id: `abast-${prod.idDetalleOrdenPedido}-${Date.now()}-${Math.random()}`,
                producto: {
                  idBodegaTransito: bodegaItem.idBodegaTransito,
                  idProducto: bodegaItem.idProducto,
                  idInventario: bodegaItem.idInventario,
                  nombreProducto: bodegaItem.nombreProducto,
                  detalles: bodegaItem.nombreUnidad || bodegaItem.codProducto || '',
                  stock: bodegaItem.stock,
                  esFraccionario: bodegaItem.esFraccionario ?? false,
                },
                delta: prod.cantidadSolicitada,
                motivo: 'ENTRADA_BODEGA',
                idDetalleOrdenPedido: prod.idDetalleOrdenPedido,
                cargadoAbastecimiento: prod.cantidadSolicitada,
                idOrdenPedido: orden.idOrdenPedido,
                idPedido: orden.idPedido,
              };
              encontrados.push(nuevoItem);
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

      // Si hay productos ya entregados, mostrar modal de decisión antes de continuar
      if (entregadosInfoCollect.length > 0) {
        const sinEntregados = encontrados.filter(i => !entregadosIdSet.has(i.idDetalleOrdenPedido!));
        setItemsConEntregados(encontrados);
        setItemsSinEntregados(sinEntregados);
        setEntregadosInfoList(entregadosInfoCollect);
        setFaltantesMapCache(faltantesMap);
        setIsEntregadosOpen(true);
        return;
      }

      if (faltantesMap.size > 0) {
        setProductosFaltantes(Array.from(faltantesMap.values()));
        setItemsFoundCache(encontrados);
        onCrearBodegaOpen();
        return;
      }

      if (encontrados.length === 0) {
        toast.warning('No hay ítems para cargar en el período seleccionado');
        return;
      }

      aplicarItemsAlMasivo(encontrados);
    } catch {
      toast.error('Error al mapear productos de la bodega de tránsito');
    } finally {
      setLoadingAbastecimiento(false);
    }
  };

  // Aplica la lista de ítems al control masivo y cierra el modal de abastecimiento
  const aplicarItemsAlMasivo = (items: ItemBodegaMasivo[]) => {
    setItemsPedido(prev => {
      const merged = [...prev];
      for (const nuevo of items) {
        const idx = merged.findIndex(
          i => i.producto.idBodegaTransito === nuevo.producto.idBodegaTransito && i.motivo === nuevo.motivo
        );
        if (idx >= 0) {
          merged[idx] = {
            ...merged[idx],
            delta: merged[idx].delta + nuevo.delta,
            cargadoAbastecimiento: (merged[idx].cargadoAbastecimiento ?? 0) + (nuevo.cargadoAbastecimiento ?? 0),
          };
        } else {
          merged.push(nuevo);
        }
      }
      return merged;
    });
    toast.success(`${items.length} ítem(s) cargado(s) al control masivo de bodega`);
    onAbastecimientoOpenChange();
    setDiasSeleccionados(new Set());
  };

  const confirmarCrearEnBodega = async () => {
    setCargandoCrearBodega(true);
    try {
      // Backend crea/reactiva bodega para los productos faltantes y los retorna
      const bodegaCreados = await inicializarDesdeAbastecimientoService(
        productosFaltantes.map(p => p.idProducto)
      );

      // Mapa de los bodega recién creados/encontrados por idInventario
      const creadosMap = new Map<number, IBodegaTransitoItem>();
      for (const b of bodegaCreados) {
        creadosMap.set(b.idInventario, b);
      }

      // Construir ítems para los faltantes usando el resultado del backend directamente
      const itemsNuevos: ItemBodegaMasivo[] = [];
      for (const faltante of productosFaltantes) {
        const bodegaItem = creadosMap.get(faltante.idInventario);
        if (!bodegaItem) continue;
        for (const d of faltante.detalles) {
          itemsNuevos.push({
            id: `abast-${d.idDetalleOrdenPedido}-${Date.now()}-${Math.random()}`,
            producto: {
              idBodegaTransito: bodegaItem.idBodegaTransito,
              idProducto: bodegaItem.idProducto,
              idInventario: bodegaItem.idInventario,
              nombreProducto: bodegaItem.nombreProducto,
              detalles: bodegaItem.nombreUnidad || bodegaItem.codProducto || '',
              stock: bodegaItem.stock,
              esFraccionario: bodegaItem.esFraccionario ?? false,
            },
            delta: d.cantidadSolicitada,
            motivo: 'ENTRADA_BODEGA',
            idDetalleOrdenPedido: d.idDetalleOrdenPedido,
            cargadoAbastecimiento: d.cantidadSolicitada,
          });
        }
      }

      onCrearBodegaOpenChange();
      // Combinar ítems ya encontrados + ítems recién creados
      aplicarItemsAlMasivo([...itemsFoundCache, ...itemsNuevos]);
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear los productos en bodega de tránsito');
    } finally {
      setCargandoCrearBodega(false);
    }
  };

  // Handlers para el modal de productos ya entregados
  const handleOmitirEntregados = () => {
    setIsEntregadosOpen(false);
    if (faltantesMapCache.size > 0) {
      setProductosFaltantes(Array.from(faltantesMapCache.values()));
      setItemsFoundCache(itemsSinEntregados);
      onCrearBodegaOpen();
      return;
    }
    if (itemsSinEntregados.length === 0) {
      toast.warning('Todos los productos de la selección ya fueron entregados anteriormente');
      onAbastecimientoOpenChange();
      setDiasSeleccionados(new Set());
      return;
    }
    aplicarItemsAlMasivo(itemsSinEntregados);
  };

  const handleIncluirEntregados = () => {
    setIsEntregadosOpen(false);
    if (faltantesMapCache.size > 0) {
      setProductosFaltantes(Array.from(faltantesMapCache.values()));
      setItemsFoundCache(itemsConEntregados);
      onCrearBodegaOpen();
      return;
    }
    aplicarItemsAlMasivo(itemsConEntregados);
  };

  // ── Búsqueda ──
  const [inputDisplay, setInputDisplay]     = React.useState('');
  const [searchTerm,   setSearchTerm]       = React.useState('');
  const [bulkItems,    setBulkItems]        = React.useState<IBulkBodegaListing[]>([]);
  const [isLoadingBulk, setIsLoadingBulk]  = React.useState(false);
  const [page,         setPage]            = React.useState(1);
  const [hasMore,      setHasMore]         = React.useState(true);
  const hasMoreRef = React.useRef(true);
  const isLoadingRef = React.useRef(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [dropdownPos,   setDropdownPos]    = React.useState<{ top: number; left: number; width: number } | null>(null);
  const inputWrapperRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef     = React.useRef<HTMLDivElement>(null);

  // ── Form ──
  const [productoId, setProductoId]     = React.useState('');
  const [motivo,     setMotivo]         = React.useState('');
  const [stockInput, setStockInput]     = React.useState('');

  // ── Lista de ítems ──
  const [itemsPedido,       setItemsPedido]       = React.useState<ItemBodegaMasivo[]>(initialItems ?? []);
  const [listadoExpandido,  setListadoExpandido]  = React.useState(false);

  // ── Procesamiento ──
  const [processState, setProcessState] = React.useState<'idle' | 'procesando'>('idle');

  // ── Carga de productos desde backend ──
  React.useEffect(() => {
    let mounted = true;
    const timer = setTimeout(async () => {
      try {
        isLoadingRef.current = true;
        setIsLoadingBulk(true);
        const data = await obtenerBulkBodegaListingService(searchTerm, 1);
        if (!mounted) return;
        setBulkItems(data.content);
        setPage(1);
        const more = data.page < data.totalPages;
        setHasMore(more);
        hasMoreRef.current = more;
      } catch {
        if (mounted) toast.error('Error al cargar productos de bodega');
      } finally {
        if (mounted) { isLoadingRef.current = false; setIsLoadingBulk(false); }
      }
    }, 400);
    return () => { mounted = false; clearTimeout(timer); };
  }, [searchTerm]);

  // Cerrar dropdown al click fuera
  React.useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputWrapperRef.current && !inputWrapperRef.current.contains(e.target as Node)
      ) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const updateDropdownPos = () => {
    if (inputWrapperRef.current) {
      const r = inputWrapperRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
  };

  const handleDropdownScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - Math.round(scrollTop) <= clientHeight * 1.5 && !isLoadingRef.current && hasMoreRef.current) {
      isLoadingRef.current = true;
      const nextPage = page + 1;
      try {
        const data = await obtenerBulkBodegaListingService(searchTerm, nextPage);
        setBulkItems(prev => [...prev, ...data.content]);
        setPage(nextPage);
        const more = data.page < data.totalPages;
        setHasMore(more);
        hasMoreRef.current = more;
      } finally {
        isLoadingRef.current = false;
      }
    }
  };

  const handleInputChange = (value: string) => {
    setInputDisplay(value);
    setSearchTerm(value);
    setProductoId('');
    setStockInput('');
    updateDropdownPos();
    if (!isDropdownOpen) setIsDropdownOpen(true);
  };

  const handleSelectProduct = (prod: IBulkBodegaListing) => {
    setProductoId(prod.idBodegaTransito.toString());
    setInputDisplay(prod.nombreProducto);
    setIsDropdownOpen(false);
  };

  const productoActual = bulkItems.find(p => p.idBodegaTransito.toString() === productoId) ?? null;
  const stockReal      = productoActual?.stock ?? 0;
  const esFraccionario = productoActual?.esFraccionario ?? false;
  const isAjuste       = motivo === 'AJUSTE_BODEGA';
  const esSalida       = ['SALIDA_BODEGA', 'MERMA_BODEGA', 'DEVOLUCION'].includes(motivo);
  const currentVal     = parseFloat(stockInput);

  // Pre-llenar stock input al cambiar motivo
  React.useEffect(() => {
    if (!productoId) return;
    if (isAjuste && productoActual) setStockInput(productoActual.stock.toString());
    else setStockInput('');
  }, [motivo, productoId]);

  const existingItem = itemsPedido.find(i => i.producto.idBodegaTransito === productoActual?.idBodegaTransito && i.motivo === motivo);
  const accumulated  = existingItem?.delta ?? 0;
  const newDelta     = isNaN(currentVal) ? 0 : currentVal;
  const totalDelta   = accumulated + newDelta;
  const stockFinalEstimado = isAjuste
    ? currentVal
    : esSalida ? stockReal - totalDelta : stockReal + totalDelta;

  let deltaError = '';
  if (motivo && stockInput.trim() !== '' && !isNaN(currentVal)) {
    if (isAjuste) {
      if (currentVal < 0) deltaError = 'El nuevo stock no puede ser negativo';
      else if (currentVal === stockReal) deltaError = 'El nuevo stock es igual al actual';
    } else {
      if (currentVal <= 0) deltaError = 'La cantidad debe ser mayor a 0';
      else if (esSalida && totalDelta > stockReal) deltaError = `Stock insuficiente (actual: ${fmtCL(stockReal)})`;
    }
  }

  const isFormValid = !!(productoId && motivo && stockInput !== '' && !isNaN(currentVal) && currentVal >= 0 && !deltaError);

  const agregarProducto = () => {
    if (!isFormValid || !productoActual) return;
    const nuevoItem: ItemBodegaMasivo = { id: Date.now().toString(), producto: productoActual, delta: currentVal, motivo };
    const idx = itemsPedido.findIndex(i => i.producto.idBodegaTransito === productoActual.idBodegaTransito && i.motivo === motivo);
    if (idx >= 0) {
      const updated = [...itemsPedido];
      updated[idx] = isAjuste ? { ...updated[idx], delta: currentVal } : { ...updated[idx], delta: updated[idx].delta + currentVal };
      setItemsPedido(updated);
    } else {
      setItemsPedido(prev => [...prev, nuevoItem]);
    }
    setProductoId(''); setStockInput(''); setInputDisplay(''); setSearchTerm(''); setPage(1);
  };

  const eliminarItem  = (id: string) => setItemsPedido(prev => prev.filter(i => i.id !== id));

  const actualizarDelta = (id: string, val: number) => {
    setItemsPedido(prev => prev.map(item => {
      if (item.id !== id) return item;
      const salida  = ['SALIDA_BODEGA', 'MERMA_BODEGA', 'DEVOLUCION'].includes(item.motivo);
      const ajuste  = item.motivo === 'AJUSTE_BODEGA';
      if (ajuste && val < 0) return item;
      if (salida && val > item.producto.stock) return item;
      if (!item.producto.esFraccionario && !Number.isInteger(val)) return item;
      return { ...item, delta: val };
    }));
  };

  const procesarMasivo = async () => {
    if (itemsPedido.length === 0) return;
    await ejecutarMasivo();
  };

  const ejecutarMasivo = async () => {
    if (itemsPedido.length === 0) return;
    setProcessState('procesando');
    try {
      const payload: IBulkWarehouseUpdateRequest[] = [];
      // Clave por (idBodegaTransito, motivo, idDetalleOrdenPedido): se incluye el detalle para NO
      // colapsar distintas líneas/fechas de la misma OP, así cada detalle genera su propio
      // movimiento con su id_detalle_orden_pedido (mapeo exacto de la entrega real).
      const agregado = new Map<string, { idBodegaTransito: number; delta: number; stockEnVista: number; tipoMovimiento: string; idOrdenPedido?: number; idPedido?: number; idDetalleOrdenPedido?: number }>();
      for (const item of itemsPedido) {
        const key = `${item.producto.idBodegaTransito}__${item.motivo}__${item.idDetalleOrdenPedido ?? 'manual'}`;
        const ex  = agregado.get(key);
        if (ex && !item.motivo.includes('AJUSTE')) {
          ex.delta += item.delta;
          if (!ex.idOrdenPedido && item.idOrdenPedido) ex.idOrdenPedido = item.idOrdenPedido;
          if (!ex.idPedido && item.idPedido) ex.idPedido = item.idPedido;
        } else {
          agregado.set(key, { idBodegaTransito: item.producto.idBodegaTransito, delta: item.delta, stockEnVista: item.producto.stock, tipoMovimiento: item.motivo, idOrdenPedido: item.idOrdenPedido, idPedido: item.idPedido, idDetalleOrdenPedido: item.idDetalleOrdenPedido });
        }
      }
      for (const v of agregado.values()) {
        payload.push({ ...v });
      }
      const result = await bulkUpdateBodegaStockService(payload);
      window.dispatchEvent(new Event('productosActualizados'));

      // Solo marcar como entregados los ítems que el backend confirmó como exitosos
      const exitososSet = new Set(result.exitosos.map(e => e.idBodegaTransito));
      const idsEntregados = itemsPedido
        .filter(i => i.idDetalleOrdenPedido != null && exitososSet.has(i.producto.idBodegaTransito))
        .map(i => i.idDetalleOrdenPedido!);
      if (idsEntregados.length > 0) {
        marcarEntregadosMasivoService(idsEntregados).catch(e => console.warn('marcarEntregados failed', e));
      }

      // Calculate retry items (failed items)
      const retryItems = result.errores.map((e, i) => {
        const prod = itemsPedido.find(p => p.producto.idBodegaTransito === e.idBodegaTransito);
        return prod ? { ...prod, id: `retry-${e.idBodegaTransito}-${Date.now()}-${Math.random()}` } : null;
      }).filter((x): x is ItemBodegaMasivo => x !== null);

      if (onProcessComplete) {
        onProcessComplete(result, retryItems);
      } else {
        toast.success(`Proceso completado. ${result.exitosos.length} actualizados.`);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar el control masivo');
    } finally {
      setProcessState('idle');
    }
  };

  // ── Formulario principal ──
  // Metadata visual por motivo (color, icono y descripción) — mismo esquema de color-coding
  // que PedidoMasivoModal.tsx (Inventario): verde = entra stock, rojo = sale/merma, amarillo
  // Duoc = ajuste, gris = devolución. Este modal no maneja TRASLADO (eso es exclusivo de
  // Inventario → Bodega), por eso no aparece acá.
  const MOTIVO_META: Record<string, { color: ChipColor; icon: string; texto: string }> = {
    ENTRADA_BODEGA: { color: 'success', icon: 'lucide:arrow-down-to-line', texto: 'Entrada de insumos a la bodega de tránsito' },
    SALIDA_BODEGA: { color: 'danger', icon: 'lucide:arrow-up-from-line', texto: 'Salida de insumos de la bodega de tránsito' },
    AJUSTE_BODEGA: { color: 'primary', icon: 'lucide:sliders-horizontal', texto: 'Ajustar el stock actual a un nuevo valor' },
    MERMA_BODEGA: { color: 'danger', icon: 'lucide:trending-down', texto: 'Salida por daño o pérdida en bodega de tránsito' },
    DEVOLUCION: { color: 'secondary', icon: 'lucide:undo-2', texto: 'Registrar devolución de insumos' },
  };

  // Clases estáticas por color: Tailwind no genera `bg-${color}-50` en tiempo de ejecución.
  const MOTIVO_CLASES: Record<ChipColor, { banner: string; barra: string; icono: string }> = {
    success: { banner: 'bg-success-50 border-success-200 dark:bg-success/10 dark:border-success/25', barra: 'bg-success', icono: 'text-success-600 dark:text-success' },
    danger: { banner: 'bg-danger-50 border-danger-200 dark:bg-danger/10 dark:border-danger/25', barra: 'bg-danger', icono: 'text-danger-600 dark:text-danger' },
    warning: { banner: 'bg-warning-50 border-warning-200 dark:bg-warning/10 dark:border-warning/25', barra: 'bg-warning', icono: 'text-warning-600 dark:text-warning' },
    primary: { banner: 'bg-primary-50 border-primary-200 dark:bg-primary/10 dark:border-primary/25', barra: 'bg-primary', icono: 'text-primary-700 dark:text-primary' },
    secondary: { banner: 'bg-default-100 border-default-200 dark:bg-default-50 dark:border-default-100', barra: 'bg-secondary', icono: 'text-secondary dark:text-foreground' },
  };

  const metaMotivoActual = motivo ? MOTIVO_META[motivo] : undefined;

  // Grilla del listado: la MISMA definición para encabezado y filas (evita el descalce que
  // ocurre cuando una columna `auto` se resuelve distinto en cada grid independiente — ver
  // PedidoMasivoModal.tsx para el detalle del bug).
  const GRID_LISTADO =
    'grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_72px] gap-3 pl-5 pr-4';

  return (
    <>
      <div className="flex flex-col w-full overflow-hidden rounded-2xl">
      <ModalHeader className="flex flex-col gap-3 border-b border-default-100 dark:border-default-50 bg-white dark:bg-content2 px-6 py-4">
        <div className="flex items-start gap-3 min-w-0 pr-8">
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-700 dark:text-primary">
            <Icon icon="lucide:layers" width={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-secondary dark:text-foreground leading-tight">Control de Stock Masivo</h2>
            <p className="text-sm font-medium text-default-500 mt-0.5">
              Registre entradas, salidas, mermas y ajustes en la bodega de tránsito.
            </p>
          </div>
        </div>
        {puedeAccederAbastecimiento && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-tiny font-semibold uppercase tracking-wider text-default-400">
            Cargar desde
          </span>
          <Tooltip content="Ver OPs confirmadas de proveedores" color="foreground" className="text-xs">
            <Button
              variant="flat"
              color="secondary"
              size="sm"
              className="font-semibold"
              startContent={<Icon icon="lucide:truck" width={16} />}
              endContent={<Icon icon="lucide:chevron-right" width={14} className="opacity-50" />}
              onPress={() => { onAbastecimientoOpen(); cargarAbastecimiento('semana'); }}
            >
              Abastecimiento de Proveedores
            </Button>
          </Tooltip>
        </div>
        )}
      </ModalHeader>

      <ModalBody className="px-4 py-3 space-y-3">
        {/* ── Formulario de agregar ── */}
        <div className="p-3 border border-default-200 dark:border-default-100 rounded-xl bg-default-50 dark:bg-content2">
          <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
            <span className="flex items-center gap-1.5 text-tiny font-semibold uppercase tracking-wider text-default-400">
              <Icon icon="lucide:package-plus" width={14} />
              Agregar producto
            </span>
            {productoActual && (
              <Chip size="sm" variant="flat" color="default" className="text-tiny">
                Stock en tránsito: <span className="font-semibold text-secondary dark:text-foreground ml-1">{fmtCL(stockReal)}</span>
              </Chip>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-start">
            {/* Buscador producto */}
            <div className="relative" ref={inputWrapperRef}>
              <Input
                label="Nombre Producto"
                placeholder="Buscar por nombre o código"
                value={inputDisplay}
                onValueChange={handleInputChange}
                onFocus={() => { updateDropdownPos(); setIsDropdownOpen(true); }}
                variant="bordered"
                isRequired
                endContent={isLoadingBulk ? <Spinner size="sm" /> : null}
              />
              {isDropdownOpen && dropdownPos && (
                <div
                  ref={dropdownRef}
                  className="fixed z-[9999] bg-white dark:bg-content1 border border-default-200 dark:border-default-100 rounded-xl shadow-lg max-h-[220px] overflow-y-auto py-1"
                  style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
                  onScroll={handleDropdownScroll}
                >
                  {bulkItems.length === 0 && !isLoadingBulk && (
                    <div className="px-4 py-4 text-center text-default-400 text-sm">No se encontraron productos</div>
                  )}
                  {bulkItems.map(prod => (
                    <div
                      key={prod.idBodegaTransito}
                      className="px-4 py-2.5 mx-1 my-0.5 hover:bg-default-100 dark:hover:bg-default-50 cursor-pointer transition-colors rounded-lg"
                      onClick={() => handleSelectProduct(prod)}
                    >
                      <span className="text-small font-semibold block leading-snug truncate">
                        {prod.nombreProducto.length > 50 ? prod.nombreProducto.substring(0, 50) + '…' : prod.nombreProducto}
                      </span>
                      <span className="text-tiny text-default-400 block leading-snug mt-0.5">{prod.detalles}</span>
                    </div>
                  ))}
                  {isLoadingBulk && <div className="flex justify-center py-3"><Spinner size="sm" /></div>}
                </div>
              )}
            </div>

            {/* Selector de acción */}
            <Select
              label="Acción"
              placeholder="Seleccione..."
              selectedKeys={motivo ? [motivo] : []}
              onChange={(e: any) => setMotivo(e.target.value)}
              isRequired
              variant="bordered"
              classNames={{ trigger: 'bg-white dark:bg-default-100/50' }}
            >
              {MOTIVOS_BODEGA.map(key => (
                <SelectItem key={key} textValue={MOTIVO_LABEL[key]}>{MOTIVO_LABEL[key]}</SelectItem>
              ))}
            </Select>

            {/* Delta input */}
            <Input
              type="number"
              label={isAjuste ? 'Nuevo Stock' : 'Cantidad'}
              placeholder={isAjuste ? `Actual: ${fmtCL(stockReal)}` : 'Ingrese cantidad…'}
              value={stockInput}
              onValueChange={val => {
                if (val === '') { setStockInput(''); return; }
                const regex = esFraccionario ? /^\d{0,7}(\.\d{0,3})?$/ : /^\d{0,7}$/;
                if (regex.test(val)) setStockInput(val);
              }}
              min="0"
              step={esFraccionario ? '0.001' : '1'}
              variant="bordered"
              isDisabled={!productoId || !motivo}
              isInvalid={!!deltaError}
              errorMessage={deltaError}
              description={
                productoId && motivo && stockInput !== '' && !deltaError
                  ? `Stock final: ${fmtCL(stockFinalEstimado)}`
                  : undefined
              }
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

          {/* Info motivo */}
          {motivo && (
            <div
              className={`mt-2 flex items-center gap-2.5 px-3 py-2 rounded-medium border ${
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
                {metaMotivoActual?.texto}
              </span>
            </div>
          )}
        </div>

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
              o cárguelos desde Abastecimiento de Proveedores.
            </p>
          </div>
        )}

        {/* ── Lista de ítems ── */}
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
                <Icon icon={listadoExpandido ? 'lucide:chevron-up' : 'lucide:chevron-down'} width={16} />
              </span>
            </button>

            <div className="border border-default-200 dark:border-default-100 rounded-xl overflow-hidden bg-white dark:bg-content2 shadow-sm">
              <div className={`transition-all duration-300 ${listadoExpandido ? 'max-h-[65vh]' : 'max-h-[420px]'} overflow-y-scroll custom-scrollbar`}>
                <div className={`sticky top-0 z-10 ${GRID_LISTADO} py-2.5 bg-default-100 dark:bg-default-50 font-semibold text-tiny uppercase tracking-wider text-default-500 border-b border-default-200 dark:border-default-100`}>
                  <div className="text-left">Producto</div>
                  <div className="text-center">Stock Tránsito</div>
                  <div className="text-center">Cantidad</div>
                  <div className="text-center">Resultado</div>
                  <div className="text-center">Acción</div>
                </div>
                <div className="divide-y divide-default-100 dark:divide-default-50">
                  {itemsPedido.map(item => {
                    const salida  = ['SALIDA_BODEGA', 'MERMA_BODEGA', 'DEVOLUCION'].includes(item.motivo);
                    const ajuste  = item.motivo === 'AJUSTE_BODEGA';
                    const sf = ajuste ? item.delta : salida ? item.producto.stock - item.delta : item.producto.stock + item.delta;
                    const simbolo = salida ? '-' : ajuste ? '=' : '+';
                    const meta = MOTIVO_META[item.motivo];
                    const color = meta?.color ?? 'default';
                    const clases = meta ? MOTIVO_CLASES[meta.color] : undefined;
                    return (
                      <div key={item.id} className={`relative ${GRID_LISTADO} py-3 items-center hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors group`}>
                        {/* Barra lateral con el color del motivo */}
                        <span aria-hidden className={`absolute left-0 top-0 bottom-0 w-1 ${clases?.barra ?? 'bg-default-300'}`} />

                        <div className="min-w-0">
                          <p className="font-medium text-sm text-default-800 dark:text-foreground truncate" title={item.producto.nombreProducto}>
                            {item.producto.nombreProducto}
                          </p>
                          <p className="text-xs text-default-400 truncate">
                            <Icon icon={meta?.icon ?? 'lucide:package'} width={12} className="inline-block mr-1 -mt-0.5" />
                            {item.producto.detalles}
                          </p>
                        </div>

                        <div className="text-center">
                          <span className="font-semibold text-sm tabular-nums text-default-600 dark:text-default-500">
                            {fmtCL(item.producto.stock)}
                          </span>
                        </div>

                        {/* Cantidad editable — el input nativo ya trae sus flechas */}
                        <div className="flex justify-center">
                          <Input
                            type="number"
                            value={item.delta.toString()}
                            onValueChange={val => { const n = parseFloat(val); if (!isNaN(n)) actualizarDelta(item.id, n); }}
                            step={item.producto.esFraccionario ? '0.5' : '1'}
                            aria-label="Cantidad"
                            size="sm"
                            variant="bordered"
                            classNames={{
                              base: 'w-24',
                              inputWrapper: 'h-8 min-h-8',
                              input: 'text-center text-sm font-semibold tabular-nums',
                            }}
                          />
                        </div>

                        {/* Resultado — el valor final manda, el delta queda como línea
                            secundaria; en rojo con alerta si el resultado queda negativo */}
                        <div className="flex flex-col items-center leading-tight">
                          <span
                            className={`text-base font-bold tabular-nums ${
                              sf < 0 ? 'text-danger' : 'text-secondary dark:text-foreground'
                            }`}
                          >
                            {sf < 0 && (
                              <Icon icon="lucide:alert-triangle" width={14} className="inline-block mr-1 -mt-0.5" />
                            )}
                            {fmtCL(sf)}
                          </span>
                          <Chip
                            size="sm"
                            color={color}
                            variant="flat"
                            classNames={{ base: 'h-5 mt-0.5', content: 'px-1.5 text-tiny font-semibold tabular-nums' }}
                          >
                            {ajuste ? 'ajuste' : `${simbolo}${fmtCL(item.delta)}`}
                          </Chip>
                        </div>

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

      <ModalFooter className="bg-default-50 dark:bg-content2 border-t border-default-100 dark:border-default-50 flex justify-between items-center gap-2 px-6 py-3">
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
          <Button variant="light" onPress={onClose} isDisabled={processState !== 'idle'} className="font-medium text-default-500">Cancelar</Button>
          <Button
            color="warning"
            onPress={procesarMasivo}
            isDisabled={itemsPedido.length === 0 || processState !== 'idle'}
            isLoading={processState !== 'idle'}
            startContent={processState === 'idle' ? <Icon icon="lucide:send" width={18} /> : undefined}
            className="font-semibold shadow-md"
          >
            {processState === 'idle' ? `Ctrl. Masivo (${itemsPedido.length})` : 'Procesando...'}
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
        scrollBehavior="inside"
        classNames={{ base: 'rounded-2xl' }}
        isDismissable={false}
      >
        <ModalContent>
          {(onAbastClose) => (
            <>
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
              <ModalBody className="py-5 px-5 overflow-y-auto max-h-[65vh] space-y-4">
                {loadingAbastecimiento ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} lines={2} />)}
                  </div>
                ) : ordenesAbastecimiento.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-default-400">
                    <Icon icon="lucide:truck" width={48} className="mb-3 opacity-30" />
                    <p className="text-sm">No hay órdenes de pedido confirmadas con productos de bodega de tránsito en este período.</p>
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
                >
                  Cargar seleccionados
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal de confirmación: productos sin registro en bodega de tránsito */}
      <Modal
        isOpen={isCrearBodegaOpen}
        onOpenChange={onCrearBodegaOpenChange}
        size="lg"
        backdrop="blur"
        radius="lg"
        classNames={{ base: 'rounded-2xl' }}
        isDismissable={!cargandoCrearBodega}
        hideCloseButton={cargandoCrearBodega}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 border-b border-default-100 pb-4">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:alert-triangle" width={20} className="text-warning" />
                  <h2 className="text-base font-bold text-secondary dark:text-foreground">
                    Productos sin registro en Bodega
                  </h2>
                </div>
                <p className="text-xs font-normal text-default-500">
                  Los siguientes productos no se encuentran en la Bodega de Tránsito.
                </p>
              </ModalHeader>
              <ModalBody className="py-4 px-5">
                <p className="text-sm text-default-600 mb-3">
                  ¿Desea agregarlos? Se crearán con stock en <span className="font-bold text-warning">cero</span> para iniciar el proceso de abastecimiento.
                </p>
                <div className="border border-default-200 dark:border-default-100 rounded-xl overflow-hidden max-h-[240px] overflow-y-auto">
                  <div className="px-3 py-2 bg-default-100 dark:bg-default-50 text-[10px] font-bold text-default-500 uppercase tracking-wider border-b border-default-200">
                    Productos a inicializar ({productosFaltantes.length})
                  </div>
                  <div className="divide-y divide-default-100 dark:divide-default-50">
                    {productosFaltantes.map((p) => (
                      <div key={p.idProducto} className="flex items-center gap-2 px-3 py-2.5">
                        <Icon icon="lucide:package" width={14} className="text-default-400 shrink-0" />
                        <span className="text-sm text-default-700 dark:text-default-300">{p.nombre}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-default-100 gap-2">
                <Button
                  variant="ghost"
                  onPress={onClose}
                  isDisabled={cargandoCrearBodega}
                >
                  Cancelar
                </Button>
                <Button
                  color="warning"
                  onPress={confirmarCrearEnBodega}
                  isLoading={cargandoCrearBodega}
                  startContent={!cargandoCrearBodega ? <Icon icon="lucide:plus-circle" width={16} /> : undefined}
                >
                  {cargandoCrearBodega ? 'Creando...' : 'Crear y Cargar'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: productos ya entregados detectados al cargar desde abastecimiento */}
      <Modal
        isOpen={isEntregadosOpen}
        onOpenChange={() => setIsEntregadosOpen(false)}
        size="lg"
        backdrop="blur"
        radius="lg"
        classNames={{ base: 'rounded-2xl' }}
        isDismissable={false}
        hideCloseButton
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1 border-b border-default-100 pb-4">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:circle-check-big" width={20} className="text-success" />
                  <h2 className="text-base font-bold text-secondary dark:text-foreground">
                    Productos ya entregados
                  </h2>
                </div>
                <p className="text-xs font-normal text-default-500">
                  {entregadosInfoList.length} producto{entregadosInfoList.length !== 1 ? 's' : ''} de la selección {entregadosInfoList.length !== 1 ? 'fueron marcados' : 'fue marcado'} como recibido{entregadosInfoList.length !== 1 ? 's' : ''} anteriormente. ¿Cómo deseas proceder?
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
                    {entregadosInfoList.map((p, i) => (
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
                  onPress={handleIncluirEntregados}
                  className="font-medium"
                >
                  Incluir de todas formas
                </Button>
                <Button
                  color="secondary"
                  startContent={<Icon icon="lucide:skip-forward" width={16} />}
                  onPress={handleOmitirEntregados}
                  className="font-medium"
                >
                  Omitir entregados
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────


export default ControlMasivoBodegaModal;
