import React from 'react';
import { fmtCL } from '../utils/format-numbers';
import {
  Card, CardBody, CardHeader, Button, Chip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
  Input, ScrollShadow, Accordion, AccordionItem,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Spinner, Tooltip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Checkbox,
  Select, SelectItem
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useHistory } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ISolicitud, IItemSolicitud } from '../types/solicitud/solicitud.types';
import { actualizarEstadoBodegaService, obtenerEntregasDiariasService, prepararEntregaService, registrarDisponiblesService, IRegistrarDisponibleDTO, consultarDisponiblesPorProductoService, restarDisponiblesService, IRestarDisponibleDTO, IEntregaDiaria, ISalaEntrega, ISolicitudEntrega } from '../services/solicitud/solicitud-service';
import { obtenerRecetaPorIdService } from '../services/pedido/pedido-semanal-bodega-service';
import { obtenerFiltrosInventarioService } from '../services/inventario/producto-service';
import { buscarBodegaTransitoService, buscarBodegaTransitoPorCodigoService, obtenerBodegaPaginadaService, IBodegaTransitoItem, obtenerBulkBodegaListingService, bulkUpdateBodegaStockService, IBulkBodegaListing, IBulkWarehouseUpdateRequest, IBulkWarehouseProcessResult, inicializarDesdeAbastecimientoService, obtenerBodegaByInventarioIdsService } from '../services/inventario/bodega-transito-service';
import { useToast } from '../hooks/useToast';
import { useModulePermission } from '../contexts/permission-context';
import { IProducto } from '../types/inventario/producto.types';
import { IUnidadMedida } from '../types/inventario/inventario.types';
import { FormularioProducto } from './inventario';
import { obtenerUnidadesActivasService } from '../services/inventario/unidad-medida-service';
import GestionCategoriasModal from '../components/modals/GestionCategoriasModal';
import GestionUnidadesModal from '../components/modals/GestionUnidadesModal';
import GestionAbastecimientoModal from '../components/modals/GestionAbastecimientoModal';
import StockDisponiblesModal from '../components/modals/StockDisponiblesModal';
import ConfirmarDisponibleBodegaModal, { ConfirmarDisponibleBodegaItem } from '../components/modals/ConfirmarDisponibleBodegaModal';
import ConfirmarSalidaDisponibleModal, { ConfirmarSalidaDisponibleItem } from '../components/modals/ConfirmarSalidaDisponibleModal';
import RielNavegacion from '../components/RielNavegacion';
import { obtenerAbastecimientoConfirmadoService, marcarEntregadosMasivoService } from '../services/proveedor/proveedor-service';
import { IOrdenAbastecimiento, ICategoriaEntregaAbastecimiento } from '../types/proveedor/proveedor.types';
import { getWeekKey, getWeekRange, fmtCantidadEntrega, ExpandChangeCallback, ItemBodegaMasivo } from './bodega-transito/constants';
import RequestCard from './bodega-transito/RequestCard';
import EntregaSalaCard from './bodega-transito/EntregaSalaCard';
import ControlMasivoBodegaModal from './bodega-transito/ControlMasivoBodegaModal';

const BodegaTransitoPage: React.FC = () => {
  const { canRead: bod_Leer, canUpdate: bod_Editar, isLoading: permLoading } = useModulePermission('BODEGA_TRANSITO');
  const { canRead: ped_Leer, canCreate: ped_Crear } = useModulePermission('GESTION_PEDIDOS_DIARIOS');
  const { canRead: gpd_Resumen }    = useModulePermission('GPD_RESUMEN_PERIODO');
  const { canCreate: gpd_Preparar } = useModulePermission('GPD_PREPARAR_ENTREGA');
  const { canRead: historialPuedeLeer } = useModulePermission('HISTORIAL_MOVIMIENTOS');
  const { canRead: catPuedeLeer }         = useModulePermission('GESTION_CATEGORIAS');
  const { canRead: uniPuedeLeer }         = useModulePermission('GESTION_UNIDADES');
  const { canCreate: invAbastecimiento }  = useModulePermission('INV_ABASTECIMIENTO');
  const { canRead: invStockDisponible }   = useModulePermission('INV_STOCK_DISPONIBLE');
  // Acciones granulares de bodega (un módulo por botón/acción)
  const { canCreate: bodNuevo }          = useModulePermission('BOD_NUEVO');
  const { canCreate: bodControlMasivo }  = useModulePermission('BOD_CONTROL_MASIVO');
  const { canCreate: bodAbastecimiento } = useModulePermission('BOD_ABASTECIMIENTO');
  const { canCreate: bodEditarProducto } = useModulePermission('BOD_EDITAR_PRODUCTO');

  const toast = useToast();
  const history = useHistory();
  const [solicitudes, setSolicitudes] = React.useState<ISolicitud[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; });
  const [currentView, setCurrentView] = React.useState<'inventario' | 'pedidos'>('inventario');

  // Si el usuario solo tiene GESTION_PEDIDOS_DIARIOS (sin BODEGA_TRANSITO), forzar vista pedidos.
  React.useEffect(() => {
    if (!permLoading && !bod_Leer && ped_Leer) setCurrentView('pedidos');
  }, [permLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Entregas diarias ──
  const [entregasData,       setEntregasData]       = React.useState<IEntregaDiaria[]>([]);
  const [isLoadingEntregas,  setIsLoadingEntregas]  = React.useState(false);
  const [buscandoPendiente,  setBuscandoPendiente]  = React.useState(false);
  const entregasCache = React.useRef<Map<string, IEntregaDiaria[]>>(new Map());

  // ── Stock disponible bodega tránsito ──
  const [isStockDisponiblesOpen, setIsStockDisponiblesOpen] = React.useState(false);

  // ── Resumen de productos por período (entregas no realizadas) ──
  type ProductoPeriodo = { idProducto: number; nombreProducto: string; unidadAbreviada: string; cantidad: number };
  type ResumenPeriodo = { productos: ProductoPeriodo[]; totalSolicitudes: number; totalProductos: number };
  const [isPeriodoOpen,    setIsPeriodoOpen]    = React.useState(false);
  const [periodoFechaIni,  setPeriodoFechaIni]  = React.useState('');
  const [periodoHoraIni,   setPeriodoHoraIni]   = React.useState('08:00');
  const [periodoFechaFin,  setPeriodoFechaFin]  = React.useState('');
  const [periodoHoraFin,   setPeriodoHoraFin]   = React.useState('22:00');
  const [periodoLoading,   setPeriodoLoading]   = React.useState(false);
  const [periodoError,     setPeriodoError]     = React.useState<string | null>(null);
  const [periodoResultado, setPeriodoResultado] = React.useState<ResumenPeriodo | null>(null);

  // ── Polling de stock para solicitudes expandidas ──
  // Contiene los idSolicitud de los items actualmente desplegados y no-PROCESADO
  const [expandidosSolIds, setExpandidosSolIds] = React.useState<Set<number>>(new Set());
  // Ref espejo para acceso síncrono dentro del interval
  const expandidosSolIdsRef = React.useRef<Set<number>>(new Set());
  expandidosSolIdsRef.current = expandidosSolIds;
  const pollingIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Preparar Entrega ──
  type ProductoEdit = {
    idProducto: number;
    nombreProducto: string;
    unidadAbreviada: string;
    esFraccionario: boolean;
    stockTransito: number;
    cantidadSolicitada: number;
    cantidadAEntregar: number;
  };
  const [preparandoSolicitud, setPreparandoSolicitud] = React.useState<ISolicitudEntrega | null>(null);
  const [productosEdit,       setProductosEdit]       = React.useState<ProductoEdit[]>([]);
  const [isConfirmando,       setIsConfirmando]       = React.useState(false);
  const [preparaError,        setPreparaError]        = React.useState<string | null>(null);
  const [isConfirmacionOpen,  setIsConfirmacionOpen]  = React.useState(false);

  // ── Sobrantes detectados al entregar menos de lo solicitado (stock disponible BODEGA_TRANSITO) ──
  const [isSobrantesOpen,     setIsSobrantesOpen]     = React.useState(false);
  const [sobrantesPendientes, setSobrantesPendientes] = React.useState<IRegistrarDisponibleDTO[]>([]);

  const abrirPreparar = React.useCallback((sol: ISolicitudEntrega) => {
    setPreparandoSolicitud(sol);
    setProductosEdit(sol.productos.map(p => ({
      idProducto:         p.idProducto,
      nombreProducto:     p.nombreProducto,
      unidadAbreviada:    p.unidadAbreviada,
      esFraccionario:     p.esFraccionario ?? false,
      stockTransito:      p.stockTransito ?? 0,
      cantidadSolicitada: p.cantidad,
      cantidadAEntregar:  p.cantidad,
    })));
    setPreparaError(null);
  }, []);

  const confirmarEntrega = React.useCallback(async () => {
    if (!preparandoSolicitud) return;
    setIsConfirmando(true);
    setPreparaError(null);
    try {
      await prepararEntregaService({
        idSolicitud: preparandoSolicitud.idSolicitud,
        productos: productosEdit.map(p => ({
          idProducto:        p.idProducto,
          stockEnVista:      p.stockTransito,
          cantidadAEntregar: p.cantidadAEntregar,
        })),
      });
      toast.success('Entrega preparada y solicitud procesada correctamente.');
      setPreparandoSolicitud(null);
      // Invalidar caché y recargar la semana actual
      entregasCache.current.clear();
      const range = getWeekRange(selectedDate);
      setIsLoadingEntregas(true);
      obtenerEntregasDiariasService(range)
        .then(data => { entregasCache.current.set(getWeekKey(selectedDate), data); setEntregasData(data); })
        .catch(() => toast.error('Error al recargar los pedidos'))
        .finally(() => setIsLoadingEntregas(false));
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Operación exitosa pero con desincronización
        toast.warning(err.response.data?.mensaje ?? 'Entrega preparada. El stock estaba desincronizado.');
        setPreparandoSolicitud(null);
        entregasCache.current.clear();
        const range = getWeekRange(selectedDate);
        setIsLoadingEntregas(true);
        obtenerEntregasDiariasService(range)
          .then(data => { entregasCache.current.set(getWeekKey(selectedDate), data); setEntregasData(data); })
          .catch(() => toast.error('Error al recargar los pedidos'))
          .finally(() => setIsLoadingEntregas(false));
      } else if (err.response?.status === 422) {
        setPreparaError(err.response.data?.mensaje ?? 'Stock insuficiente para uno o más productos.');
      } else {
        const errData = err.response?.data;
        const msg = errData?.mensaje
          || errData?.message
          || (errData?.errors ? Object.values(errData.errors as Record<string, string>).join('. ') : null);
        setPreparaError(msg || 'Ocurrió un error inesperado. Intenta nuevamente.');
      }
    } finally {
      setIsConfirmando(false);
    }
  }, [preparandoSolicitud, productosEdit, selectedDate, toast]);

  // Detecta productos donde se entregará menos de lo solicitado: ese sobrante
  // (cantidadSolicitada - cantidadAEntregar) puede registrarse como stock disponible
  // de bodega de tránsito, no asociado a la solicitud entregada.
  const detectarSobrantesEntrega = React.useCallback((): IRegistrarDisponibleDTO[] => {
    if (!preparandoSolicitud) return [];
    return productosEdit
      .filter(p => p.cantidadSolicitada - p.cantidadAEntregar > 0.001)
      .map(p => ({
        idProducto: p.idProducto,
        idSolicitud: preparandoSolicitud.idSolicitud,
        cantidad: parseFloat((p.cantidadSolicitada - p.cantidadAEntregar).toFixed(3)),
        tipoDisponible: 'BODEGA_TRANSITO',
      }));
  }, [preparandoSolicitud, productosEdit]);

  // Botón "Confirmar Entrega": si hay sobrantes, ofrecer registrarlos como disponibles;
  // si no, ir directo a la confirmación de entrega irreversible.
  const handleConfirmarEntregaClick = React.useCallback(() => {
    const sobrantes = detectarSobrantesEntrega();
    if (sobrantes.length > 0) {
      setSobrantesPendientes(sobrantes);
      setIsSobrantesOpen(true);
    } else {
      setIsConfirmacionOpen(true);
    }
  }, [detectarSobrantesEntrega]);

  const handleSobrantesSi = React.useCallback(async () => {
    setIsSobrantesOpen(false);
    try {
      await registrarDisponiblesService(sobrantesPendientes);
      toast.success('Sobrantes registrados como stock disponible de bodega de tránsito');
    } catch {
      toast.warning('No se pudieron registrar los sobrantes, pero la entrega continuará');
    }
    await confirmarEntrega();
  }, [sobrantesPendientes, confirmarEntrega, toast]);

  const handleSobrantesNo = React.useCallback(async () => {
    setIsSobrantesOpen(false);
    await confirmarEntrega();
  }, [confirmarEntrega]);

  usePageTitle(
    currentView === 'inventario' ? 'Bodega de Tránsito' : 'Gestión de Pedidos Diarios',
    currentView === 'inventario' ? 'Gestión de armado de carros diarios' : 'Planificación y seguimiento de armado de carros para clases',
    currentView === 'inventario' ? 'lucide:warehouse' : 'lucide:shopping-cart'
  );

  const [isMasivoOpen, setIsMasivoOpen] = React.useState(false);
  const [isResultOpen, setIsResultOpen] = React.useState(false);
  const [bulkResult, setBulkResult] = React.useState<IBulkWarehouseProcessResult | null>(null);
  const [bulkRetryItems, setBulkRetryItems] = React.useState<ItemBodegaMasivo[]>([]);
  const [bulkModalKey, setBulkModalKey] = React.useState(0);

  const { isOpen: isExtraOpen, onOpen: onExtraOpen, onOpenChange: onExtraOpenChange } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onOpenChange: onDetailOpenChange } = useDisclosure();
  const [selectedSolicitud, setSelectedSolicitud] = React.useState<ISolicitud | null>(null);
  const [recetaInstrucciones, setRecetaInstrucciones] = React.useState<string>('');
  const [extraNombre, setExtraNombre] = React.useState('');
  const [extraCantidad, setExtraCantidad] = React.useState('');
  const [extraUnidad, setExtraUnidad] = React.useState('');

  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState('');
  const [searchCode, setSearchCode] = React.useState('');
  const [debouncedSearchCode, setDebouncedSearchCode] = React.useState('');
  const [selectedFilters, setSelectedFilters] = React.useState<Set<string>>(new Set(['todas']));
  const [isLoading, setIsLoading] = React.useState(false);

  const [productos, setProductos] = React.useState<IBodegaTransitoItem[]>([]);
  const [totalPaginas, setTotalPaginas] = React.useState<number>(1);
  const [totalRegistros, setTotalRegistros] = React.useState<number>(0);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const cacheRef = React.useRef<Record<number, IBodegaTransitoItem[]>>({});
  const isLoadingRef = React.useRef(false);
  const nextPageRef = React.useRef(1);
  const isScrollingRef = React.useRef(false);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const mainScrollerRef = React.useRef<HTMLDivElement>(null);
  const filtersRef = React.useRef(selectedFilters);
  const filterDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [categoriasFull, setCategoriasFull] = React.useState<{ id: number, nombre: string }[]>([]);
  const [unidadesFull, setUnidadesFull] = React.useState<IUnidadMedida[]>([]);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const onModalOpenChange = (open: boolean) => setIsModalOpen(open);
  const [productoSeleccionado, setProductoSeleccionado] = React.useState<IProducto | null>(null);
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar'>('crear');
  const { isOpen: isCategoriasOpen, onOpen: onCategoriasOpen, onOpenChange: onCategoriasOpenChange } = useDisclosure();
  const { isOpen: isUnidadesOpen, onOpen: onUnidadesOpen, onOpenChange: onUnidadesOpenChange } = useDisclosure();
  const { isOpen: isAbastecimientoConfigOpen, onOpen: onAbastecimientoConfigOpen, onOpenChange: onAbastecimientoConfigOpenChange } = useDisclosure();

  const filtrosCategorias = React.useMemo(() => {
    const cats = categoriasFull.map(c => ({ id: `cat-${c.id}`, nombre: c.nombre }));
    return [{ id: 'todas', nombre: 'Todas las categorías' }, ...cats];
  }, [categoriasFull]);

  const filtrosUnidades = React.useMemo(() => {
    return unidadesFull.map(u => ({ id: `uni-${u.id}`, nombre: u.nombre }));
  }, [unidadesFull]);

  const filtrosCombinados = React.useMemo(() => {
    return [...filtrosCategorias, ...filtrosUnidades];
  }, [filtrosCategorias, filtrosUnidades]);

  const paginatedProductos = React.useMemo(() => {
    return productos;
  }, [productos]);

  const loadData = React.useCallback(async () => {
    // Funcionalidad legacy — solicitudes ahora se cargan vía obtenerEntregasDiariasService
  }, []);

  const cargarProductosPaginados = React.useCallback(async (uiPage: number, forceFetch = false) => {
    if (isLoadingRef.current && !forceFetch) return;
    if (!forceFetch && cacheRef.current[uiPage]) {
      const cachedItems = cacheRef.current[uiPage];
      setProductos(prev => {
        const existingIds = new Set(prev.map(p => p.idBodegaTransito));
        const newItems = cachedItems.filter(p => !existingIds.has(p.idBodegaTransito));
        if (newItems.length > 0) nextPageRef.current = Math.max(nextPageRef.current, uiPage + 1);
        return [...prev, ...newItems];
      });
      return;
    }
    try {
      setIsLoading(true);
      isLoadingRef.current = true;

      let response;
      if (debouncedSearchCode) {
        response = await buscarBodegaTransitoPorCodigoService(debouncedSearchCode, uiPage);
      } else if (debouncedSearchTerm) {
        response = await buscarBodegaTransitoService(debouncedSearchTerm, uiPage, 40);
      } else {
        response = await obtenerBodegaPaginadaService({
          page: uiPage,
          pageSize: 40,
          categoriasIds: Array.from(filtersRef.current).filter(f => f.startsWith('cat-')).map(f => parseInt(f.replace('cat-', ''))),
          unidadesIds: Array.from(filtersRef.current).filter(f => f.startsWith('uni-')).map(f => parseInt(f.replace('uni-', ''))),
          soloStockBajo: filtersRef.current.has('stock-bajo'),
          ocultarAgotados: filtersRef.current.has('ocultar-cero'),
          isAsc: filtersRef.current.has('ascendente'),
          isDesc: filtersRef.current.has('descendente')
        });
      }

      const newProductos = response.data;
      if (forceFetch || uiPage === 1) {
        if (forceFetch) cacheRef.current = {};
        setProductos(newProductos);
        cacheRef.current[uiPage] = newProductos;
        nextPageRef.current = Math.max(nextPageRef.current, uiPage + 1);
      } else {
        setProductos(prev => {
          const existingIds = new Set(prev.map(p => p.idBodegaTransito));
          return [...prev, ...newProductos.filter(p => !existingIds.has(p.idBodegaTransito))];
        });
        cacheRef.current[uiPage] = newProductos;
        nextPageRef.current = Math.max(nextPageRef.current, uiPage + 1);
      }
      setTotalPaginas(response.totalPaginas);
      setTotalRegistros(response.totalRegistros);
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [debouncedSearchTerm, debouncedSearchCode, toast]);

  const cargarFiltros = React.useCallback(async () => {
    try {
      const [res, resUnidadesActivas] = await Promise.all([
        obtenerFiltrosInventarioService(),
        obtenerUnidadesActivasService()
      ]);
      setCategoriasFull(res.categorias || []);
      setUnidadesFull(resUnidadesActivas || []);
    } catch (error) { }
  }, []);

  React.useEffect(() => { cargarFiltros(); cargarProductosPaginados(1, true); }, [cargarFiltros, cargarProductosPaginados]);

  // ── Carga de entregas al cambiar semana o al abrir la vista pedidos ──
  React.useEffect(() => {
    if (currentView !== 'pedidos') return;
    const weekKey = getWeekKey(selectedDate);
    if (entregasCache.current.has(weekKey)) {
      setEntregasData(entregasCache.current.get(weekKey)!);
      return;
    }
    const range = getWeekRange(selectedDate);
    setIsLoadingEntregas(true);
    obtenerEntregasDiariasService(range)
      .then(data => {
        entregasCache.current.set(weekKey, data);
        setEntregasData(data);
      })
      .catch(() => toast.error('Error al cargar los pedidos del día'))
      .finally(() => setIsLoadingEntregas(false));
  }, [selectedDate, currentView]);
  React.useEffect(() => { filtersRef.current = selectedFilters; }, [selectedFilters]);

  // ── Refresco quirúrgico: fetch completo pero merge solo en solicitudes expandidas ──
  // No muestra indicador al usuario — corre silencioso en background.
  const refrescarExpandidos = React.useCallback(async (ids: Set<number>) => {
    if (ids.size === 0) return;
    const range = getWeekRange(selectedDate);
    try {
      const dataNueva = await obtenerEntregasDiariasService(range);
      // Actualizar cache con datos frescos
      entregasCache.current.set(getWeekKey(selectedDate), dataNueva);
      // Merge quirúrgico: solo toca los productos de las solicitudes expandidas
      setEntregasData(prev => prev.map(dia => ({
        ...dia,
        salas: dia.salas.map(sala => ({
          ...sala,
          solicitudes: sala.solicitudes.map(sol => {
            // Solo actualizar si está expandida y no es histórico PROCESADO
            if (!ids.has(sol.idSolicitud) || sol.estadoSolicitud === 'PROCESADO') return sol;
            const solFresca = dataNueva
              .flatMap(d => d.salas)
              .flatMap(s => s.solicitudes)
              .find(s => s.idSolicitud === sol.idSolicitud);
            if (!solFresca) return sol;
            // Actualiza stockTransito, diferencia y estadoSolicitud preservando el resto
            return { ...sol, productos: solFresca.productos, estadoSolicitud: solFresca.estadoSolicitud };
          })
        }))
      })));
    } catch {
      // Silencioso — fallo de polling no interrumpe al usuario
    }
  }, [selectedDate]);

  // ── Callback que EntregaSalaCard llama al abrir/cerrar un item ──
  const handleExpandChange = React.useCallback<ExpandChangeCallback>((idSolicitud, isOpen, esProcesado) => {
    if (esProcesado) return; // Histórico: nunca se refresca
    setExpandidosSolIds(prev => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(idSolicitud);
      } else {
        next.delete(idSolicitud);
      }
      return next;
    });
    // Refresh inmediato al abrir (no esperar el intervalo de 30s)
    if (isOpen) {
      refrescarExpandidos(new Set([idSolicitud]));
    }
  }, [refrescarExpandidos]);

  // ── Polling: activo solo si hay solicitudes expandidas no-PROCESADO ──
  React.useEffect(() => {
    if (expandidosSolIds.size === 0) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }
    // Reiniciar interval con los IDs actuales capturados via ref
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = setInterval(() => {
      refrescarExpandidos(expandidosSolIdsRef.current);
    }, 30_000);
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [expandidosSolIds, refrescarExpandidos]);

  // ── Limpiar expandidos al cambiar fecha o salir de la vista pedidos ──
  React.useEffect(() => {
    setExpandidosSolIds(new Set());
  }, [selectedDate, currentView]);

  /**
   * Debounce 2.5s para filtros: cancela el timer anterior antes de iniciar uno nuevo,
   * dando tiempo al usuario a terminar de seleccionar categorías, unidades y checkboxes.
   */
  const scheduleFilterRequest = React.useCallback(() => {
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      cacheRef.current = {};
      setCurrentPage(1);
      cargarProductosPaginados(1, true);
    }, 2500);
  }, [cargarProductosPaginados]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scroller = e.currentTarget;

    // Gatillo de carga infinita (300px antes del final)
    if (scroller.scrollTop + scroller.clientHeight > scroller.scrollHeight - 300 && !isLoading && productos.length < totalRegistros) {
      cargarProductosPaginados(nextPageRef.current);
    }

    if (!isScrollingRef.current) {
      isScrollingRef.current = true;
      const visualPage = Math.floor(scroller.scrollTop / 800) + 1;
      if (visualPage !== currentPage) setCurrentPage(visualPage);
      setTimeout(() => { isScrollingRef.current = false; }, 100);
    }
  };

  React.useEffect(() => {
    if (!searchTerm && !searchCode) {
      setDebouncedSearchTerm('');
      setDebouncedSearchCode('');
      cargarProductosPaginados(1, true);
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setDebouncedSearchCode(searchCode);
      cargarProductosPaginados(1, true);
    }, 2500);
    return () => clearTimeout(handler);
  }, [searchTerm, searchCode, cargarProductosPaginados]);

  React.useEffect(() => {
    const handleProductosActualizados = () => {
      cacheRef.current = {};
      cargarProductosPaginados(currentPage, true);
    };

    window.addEventListener('productosActualizados', handleProductosActualizados);

    return () => {
      window.removeEventListener('productosActualizados', handleProductosActualizados);
    };
  }, [cargarProductosPaginados, currentPage]);

  const verMovimientos = (id: string, nombre: string) => {
    history.push(`/movimientos?productoId=${id}&nombre=${encodeURIComponent(nombre)}`);
  };

  const handlePrevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); d.setHours(12, 0, 0, 0); setSelectedDate(d); };
  const handleNextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0); setSelectedDate(d); };
  const handlePrevWeek = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 7); d.setHours(12, 0, 0, 0); setSelectedDate(d); };
  const handleNextWeek = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 7); d.setHours(12, 0, 0, 0); setSelectedDate(d); };
  const handleToday = () => { const d = new Date(); d.setHours(12, 0, 0, 0); setSelectedDate(d); };
  const handleSelectDay = (date: Date) => { const d = new Date(date); d.setHours(12, 0, 0, 0); setSelectedDate(d); };

  // Busca en un rango amplio la entrega pendiente (solicitud no PROCESADO) más relevante y navega a ella.
  // Prioriza la próxima desde hoy hacia adelante; si no hay futuras, salta a la atrasada más reciente.
  const irAProximaPendiente = React.useCallback(async () => {
    setBuscandoPendiente(true);
    try {
      const inicio = new Date(); inicio.setDate(inicio.getDate() - 60);
      const fin = new Date();    fin.setDate(fin.getDate() + 120);
      const data = await obtenerEntregasDiariasService({
        fechaInicio: inicio.toISOString().slice(0, 10),
        fechaFin:    fin.toISOString().slice(0, 10),
      });
      const hoyRef = new Date(); hoyRef.setHours(12, 0, 0, 0);
      const hoyStr = hoyRef.toISOString().slice(0, 10);
      const tienePendiente = (d: IEntregaDiaria) =>
        d.salas.some(s => s.solicitudes.some(sol => sol.estadoSolicitud !== 'PROCESADO'));
      const ordenados = [...data].sort((a, b) => a.fecha.localeCompare(b.fecha));
      const futura   = ordenados.find(d => d.fecha >= hoyStr && tienePendiente(d));
      const atrasada = [...ordenados].reverse().find(d => d.fecha < hoyStr && tienePendiente(d));
      const objetivo = futura ?? atrasada;
      if (!objetivo) {
        toast.info('No hay entregas pendientes en el sistema.');
        return;
      }
      setSelectedDate(new Date(objetivo.fecha + 'T12:00:00'));
      if (!futura && atrasada) {
        toast.warning('No hay entregas futuras pendientes. Te llevamos a la entrega atrasada más reciente.');
      }
    } catch {
      toast.error('No se pudo buscar la próxima entrega pendiente.');
    } finally {
      setBuscandoPendiente(false);
    }
  }, [toast]);

  const abrirPeriodo = () => {
    const base = dateCol1.toISOString().slice(0, 10);
    setPeriodoFechaIni(base);
    setPeriodoFechaFin(base);
    setPeriodoHoraIni('08:00');
    setPeriodoHoraFin('22:00');
    setPeriodoError(null);
    setPeriodoResultado(null);
    setIsPeriodoOpen(true);
  };

  // Suma los productos de las entregas NO realizadas cuyo inicio cae dentro del período indicado.
  // Productos iguales (mismo idProducto) se acumulan en una sola fila. Sólo informativo.
  const calcularPeriodo = React.useCallback(async () => {
    if (!periodoFechaIni || !periodoFechaFin || !periodoHoraIni || !periodoHoraFin) {
      setPeriodoError('Completa la fecha y hora de inicio y de fin.');
      return;
    }
    const inicioDate = new Date(`${periodoFechaIni}T${periodoHoraIni}:00`);
    const finDate    = new Date(`${periodoFechaFin}T${periodoHoraFin}:00`);
    if (isNaN(inicioDate.getTime()) || isNaN(finDate.getTime())) {
      setPeriodoError('El período ingresado no es válido.');
      return;
    }
    if (finDate < inicioDate) {
      setPeriodoError('La fecha/hora de fin debe ser posterior al inicio.');
      return;
    }
    setPeriodoLoading(true);
    setPeriodoError(null);
    try {
      const data = await obtenerEntregasDiariasService({
        fechaInicio: periodoFechaIni,
        fechaFin:    periodoFechaFin,
      });
      const acumulado = new Map<number, ProductoPeriodo>();
      let totalSolicitudes = 0;
      for (const dia of data) {
        for (const sala of dia.salas) {
          for (const sol of sala.solicitudes) {
            if (sol.estadoSolicitud === 'PROCESADO') continue; // sólo entregas NO realizadas
            const dt = new Date(`${dia.fecha}T${sol.horaInicio || '00:00'}:00`);
            if (isNaN(dt.getTime()) || dt < inicioDate || dt > finDate) continue;
            totalSolicitudes++;
            for (const p of sol.productos) {
              const ex = acumulado.get(p.idProducto);
              if (ex) {
                ex.cantidad += p.cantidad;
              } else {
                acumulado.set(p.idProducto, {
                  idProducto:      p.idProducto,
                  nombreProducto:  p.nombreProducto,
                  unidadAbreviada: p.unidadAbreviada,
                  cantidad:        p.cantidad,
                });
              }
            }
          }
        }
      }
      const productos = Array.from(acumulado.values())
        .sort((a, b) => a.nombreProducto.localeCompare(b.nombreProducto));
      setPeriodoResultado({ productos, totalSolicitudes, totalProductos: productos.length });
    } catch {
      setPeriodoError('No se pudo calcular el resumen del período.');
    } finally {
      setPeriodoLoading(false);
    }
  }, [periodoFechaIni, periodoHoraIni, periodoFechaFin, periodoHoraFin]);

  const getRequestsForDate = (date: Date) => {
    const dStr = date.toISOString().split('T')[0];
    return solicitudes.filter(s => s.fecha && s.fecha.startsWith(dStr));
  };

  const formatDate = (date: Date) => date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  const handleOpenExtra = (solicitud: ISolicitud) => {
    setSelectedSolicitud(solicitud);
    setExtraNombre(''); setExtraCantidad(''); setExtraUnidad('');
    onExtraOpen();
  };

  const handleSaveExtra = async () => {
    if (!selectedSolicitud || !extraNombre || !extraCantidad) return;
    const newItem: any = {
      id: Date.now().toString(), productoId: 'extra-' + Date.now(),
      productoNombre: extraNombre, cantidad: parseFloat(extraCantidad),
      unidadMedida: extraUnidad || 'un', esAdicional: true, esAdicionalBodega: true
    };
    await actualizarEstadoBodegaService(selectedSolicitud.id, selectedSolicitud.estadoBodega || 'Pendiente', [...(selectedSolicitud.itemsAdicionalesBodega || []), newItem]);
    await loadData();
    onExtraOpenChange();
  };

  const handleOpenDetail = async (solicitud: ISolicitud) => {
    setSelectedSolicitud(solicitud);
    setRecetaInstrucciones('');
    if (solicitud.recetaId) {
      try {
        const receta = await obtenerRecetaPorIdService(solicitud.recetaId);
        setRecetaInstrucciones(receta.instrucciones);
      } catch (e) { setRecetaInstrucciones('No se pudo cargar la receta.'); }
    }
    onDetailOpen();
  };

  const handleRowClick = (item: IBodegaTransitoItem) => {
    const mockProducto: any = {
      id: item.idProducto.toString(),
      nombre: item.nombreProducto,
      categoria: item.nombreCategoria,
      stock: item.stock,
      stockMinimo: item.stockLimit || 0,
      estado: item.stock <= 0 ? 'Sin stock' : item.stock <= (item.stockLimit || 0) ? 'Bajo Stock' : 'Disponible',
      precio: 0,
      unidadMedida: item.nombreUnidad,
      idCategoria: 0,
      idUnidadMedida: 0,
      _esFraccionario: item.esFraccionario,
      _idInventario: item.idInventario,
      _idBodegaTransito: item.idBodegaTransito
    };

    const catF = categoriasFull.find(c => c.nombre === item.nombreCategoria);
    if (catF) mockProducto.idCategoria = catF.id;

    const uniF = unidadesFull.find(u => u.nombre.toLowerCase() === item.nombreUnidad?.toLowerCase());
    if (uniF) mockProducto.idUnidadMedida = uniF.id;

    mockProducto.codProducto = item.codProducto;
    mockProducto.descripcion = item.descripcionProducto;

    setProductoSeleccionado(mockProducto);
    setModalMode('editar');
    setIsModalOpen(true);
  };

  const handleNuevoProducto = () => {
    setModalMode('crear');
    setProductoSeleccionado(null);
    setIsModalOpen(true);
  };

  const dateCol1 = new Date(selectedDate);

  const entregasHoy = React.useMemo(() => {
    const dateStr = dateCol1.toISOString().slice(0, 10);
    return entregasData.find(e => e.fecha === dateStr) ?? null;
  }, [entregasData, dateCol1]);

  // ── Strip de navegación semanal ──
  const hoyStr = React.useMemo(() => {
    const d = new Date(); d.setHours(12, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }, []);

  const selectedDateStr = React.useMemo(() => dateCol1.toISOString().slice(0, 10), [dateCol1]);

  // 7 días de la semana del día seleccionado, con conteo de entregas y pendientes de cada uno
  const weekDays = React.useMemo(() => {
    const base = new Date(selectedDate);
    const day = base.getDay();
    const monday = new Date(base);
    monday.setDate(base.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(12, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const fechaStr = date.toISOString().slice(0, 10);
      const dia = entregasData.find(e => e.fecha === fechaStr);
      let total = 0, pendientes = 0;
      if (dia) {
        for (const sala of dia.salas) {
          for (const sol of sala.solicitudes) {
            total++;
            if (sol.estadoSolicitud !== 'PROCESADO') pendientes++;
          }
        }
      }
      return { date, fechaStr, total, pendientes };
    });
  }, [selectedDate, entregasData]);

  const rangoSemanaLabel = React.useMemo(() => {
    if (weekDays.length < 7) return '';
    const ini = weekDays[0].date, fin = weekDays[6].date;
    const mesIni = ini.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
    const mesFin = fin.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
    return mesIni === mesFin
      ? `${ini.getDate()} – ${fin.getDate()} ${mesFin}`
      : `${ini.getDate()} ${mesIni} – ${fin.getDate()} ${mesFin}`;
  }, [weekDays]);

  const statsDiaSeleccionado = React.useMemo(
    () => weekDays.find(d => d.fechaStr === selectedDateStr) ?? { total: 0, pendientes: 0 },
    [weekDays, selectedDateStr]
  );

  return (
    <>
    <div className="flex h-[calc(100vh-76px)] overflow-hidden font-sans relative -mt-6 -mr-6">
      {/* Área de Contenido Principal */}
      <div ref={mainScrollerRef} className="flex-grow overflow-y-auto bg-default-50/50 dark:bg-background custom-scrollbar pb-20">
        <AnimatePresence mode="wait">
          {currentView === 'inventario' ? (
            <motion.div
              key="inventario"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 pt-6 pb-10"
            >
              {(bodControlMasivo || bodNuevo || catPuedeLeer || uniPuedeLeer || invAbastecimiento || invStockDisponible) && (
                <div className="flex flex-wrap items-center gap-3 px-4 mb-2 mt-2">
                  {bodControlMasivo && (
                    <Button
                      color="secondary"
                      variant="solid"
                      size="md"
                      className="font-bold shadow-sm"
                      startContent={<Icon icon="lucide:arrow-right-left" width={18} />}
                      onPress={() => setIsMasivoOpen(true)}
                    >
                      Control Masivo
                    </Button>
                  )}
                  {bodNuevo && (
                    <Button
                      color="primary"
                      variant="solid"
                      size="md"
                      className="font-bold text-secondary shadow-sm"
                      startContent={<Icon icon="lucide:plus" width={18} />}
                      onPress={handleNuevoProducto}
                    >
                      Nuevo
                    </Button>
                  )}
                  {catPuedeLeer && (
                    <Button
                      isIconOnly
                      variant="flat"
                      size="md"
                      onPress={onCategoriasOpen}
                      title="Categorías"
                      className="bg-default-100 dark:bg-default-50/10"
                    >
                      <Icon icon="lucide:tags" className="text-default-600" width={20} />
                    </Button>
                  )}
                  {uniPuedeLeer && (
                    <Button
                      isIconOnly
                      variant="flat"
                      size="md"
                      onPress={onUnidadesOpen}
                      title="Unidades"
                      className="bg-default-100 dark:bg-default-50/10"
                    >
                      <Icon icon="lucide:scale" className="text-default-600" width={20} />
                    </Button>
                  )}
                  {invAbastecimiento && (
                  <Button
                    isIconOnly
                    variant="flat"
                    size="md"
                    onPress={onAbastecimientoConfigOpen}
                    title="Gestión Abastecimiento"
                    className="bg-default-100 dark:bg-default-50/10"
                  >
                    <Icon icon="lucide:boxes" className="text-default-600" width={20} />
                  </Button>
                  )}
                  {invStockDisponible && (
                  <Button
                    isIconOnly
                    variant="flat"
                    size="md"
                    onPress={() => setIsStockDisponiblesOpen(true)}
                    title="Stock Disponible"
                    className="bg-default-100 dark:bg-default-50/10"
                  >
                    <Icon icon="lucide:package-check" className="text-default-600" width={20} />
                  </Button>
                  )}
                </div>
              )}

              {/* Herramientas de búsqueda y filtrado */}
              <Card className="shadow-sm bg-white dark:bg-content1 border border-default-200 dark:border-default-100 mx-4">
                <CardBody className="p-4">
                  <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="w-full flex flex-col md:flex-row gap-2 md:w-[48%]">
                      <Input
                        className="w-full md:w-1/2"
                        placeholder="Buscar código..."
                        onValueChange={(val) => {
                          setSearchCode(val);
                          if (val) setSearchTerm('');
                        }}
                        startContent={<Icon icon="lucide:barcode" className="text-default-400" />}
                        variant="bordered"
                        isClearable
                        onClear={() => setSearchCode('')}
                      />
                      <Input
                        className="w-full md:w-1/2"
                        placeholder="Buscar por producto o descripción"
                        value={searchTerm}
                        onValueChange={(val) => {
                          setSearchTerm(val);
                          if (val) setSearchCode('');
                        }}
                        startContent={<Icon icon="lucide:search" className="text-default-400" />}
                        variant="bordered"
                        isClearable
                      />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex flex-col gap-1">
                        <Checkbox
                          isSelected={selectedFilters.has('stock-bajo')}
                          onValueChange={(checked) => {
                            const newSet = new Set(selectedFilters);
                            if (checked) newSet.add('stock-bajo'); else newSet.delete('stock-bajo');
                            setSelectedFilters(newSet);
                            filtersRef.current = newSet;
                            scheduleFilterRequest();
                          }}
                          color="warning"
                          size="sm"
                        >
                          <span className="text-sm font-medium flex items-center gap-1">
                            <Icon icon="lucide:alert-triangle" width={13} className="text-warning" />
                            Stock Bajo
                          </span>
                        </Checkbox>
                        <Checkbox
                          isSelected={selectedFilters.has('ocultar-cero')}
                          onValueChange={(checked) => {
                            const newSet = new Set(selectedFilters);
                            if (checked) newSet.add('ocultar-cero'); else newSet.delete('ocultar-cero');
                            setSelectedFilters(newSet);
                            filtersRef.current = newSet;
                            scheduleFilterRequest();
                          }}
                          size="sm"
                        >
                          <span className="text-sm font-medium">Ocultar Stock 0</span>
                        </Checkbox>
                      </div>

                      {/* Dropdown Categorías */}
                      <Dropdown onOpenChange={(isOpen) => {
                        if (!isOpen) scheduleFilterRequest();
                      }}>
                        <DropdownTrigger>
                          <Button
                            variant="bordered"
                            className="bg-white dark:bg-default-100/50"
                            startContent={<Icon icon="lucide:tag" className="text-default-500" />}
                            endContent={<Icon icon="lucide:chevron-down" className="text-default-400" width={14} />}
                          >
                            {(() => {
                              const catKeys = Array.from(selectedFilters).filter(k => k.startsWith('cat-'));
                              if (catKeys.length === 0) return 'Todas las categorías';
                              if (catKeys.length === 1) {
                                const found = filtrosCategorias.find(f => f.id === catKeys[0]);
                                return found ? found.nombre : 'Categoría';
                              }
                              return `${catKeys.length} categorías`;
                            })()}
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                          aria-label="Categorías"
                          closeOnSelect={false}
                          selectionMode="multiple"
                          selectedKeys={selectedFilters}
                          className="max-h-[400px] overflow-y-auto"
                          onSelectionChange={(keys) => {
                            const newKeys = Array.from(keys) as string[];
                            let resultSet: Set<string>;

                            const wasTodasSelected = filtersRef.current.has('todas');
                            let finalKeys = newKeys;

                            const updatedIsTodas = finalKeys.includes('todas');
                            const nonCatFilters = Array.from(filtersRef.current).filter(k =>
                              k === 'ocultar-cero' || k === 'ascendente' || k === 'descendente' || k === 'stock-bajo' || k.startsWith('uni-')
                            );

                            if (updatedIsTodas && !wasTodasSelected) {
                              resultSet = new Set(['todas', ...nonCatFilters]);
                            } else if (finalKeys.length > 1 && updatedIsTodas) {
                              const hasCat = finalKeys.some(k => k.startsWith('cat-'));
                              if (hasCat) {
                                resultSet = new Set([...finalKeys.filter(k => k !== 'todas'), ...nonCatFilters]);
                              } else {
                                resultSet = new Set([...finalKeys, ...nonCatFilters]);
                              }
                            } else if (finalKeys.length === 0) {
                              resultSet = new Set(['todas', ...nonCatFilters]);
                            } else {
                              resultSet = new Set([...finalKeys, ...nonCatFilters]);
                            }

                            if (!Array.from(resultSet).some(k => k.startsWith('cat-') || k === 'todas')) {
                              resultSet.add('todas');
                            }

                            setSelectedFilters(resultSet);
                            filtersRef.current = resultSet;
                          }}
                        >
                          {filtrosCategorias.map((filtro) => (
                            <DropdownItem key={filtro.id}>{filtro.nombre}</DropdownItem>
                          ))}
                        </DropdownMenu>
                      </Dropdown>

                      {/* Dropdown Unidades */}
                      <Dropdown onOpenChange={(isOpen) => {
                        if (!isOpen) scheduleFilterRequest();
                      }}>
                        <DropdownTrigger>
                          <Button
                            variant="bordered"
                            className="bg-white dark:bg-default-100/50"
                            startContent={<Icon icon="lucide:ruler" className="text-default-500" />}
                            endContent={<Icon icon="lucide:chevron-down" className="text-default-400" width={14} />}
                          >
                            {(() => {
                              const uniKeys = Array.from(selectedFilters).filter(k => k.startsWith('uni-'));
                              if (uniKeys.length === 0) return 'Todas las unidades';
                              if (uniKeys.length === 1) {
                                const found = filtrosUnidades.find(f => f.id === uniKeys[0]);
                                return found ? found.nombre : 'Unidad';
                              }
                              return `${uniKeys.length} unidades`;
                            })()}
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                          aria-label="Unidades"
                          closeOnSelect={false}
                          selectionMode="multiple"
                          selectedKeys={new Set(Array.from(selectedFilters).filter(k => k.startsWith('uni-')))}
                          className="max-h-[400px] overflow-y-auto"
                          onSelectionChange={(keys) => {
                            const newUniKeys = Array.from(keys) as string[];
                            const nonUni = Array.from(filtersRef.current).filter(k => !k.startsWith('uni-'));
                            const resultSet = new Set([...nonUni, ...newUniKeys]);
                            setSelectedFilters(resultSet);
                            filtersRef.current = resultSet;
                          }}
                        >
                          {filtrosUnidades.map((u) => (
                            <DropdownItem key={u.id}>{u.nombre}</DropdownItem>
                          ))}
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Tabla de productos */}
              <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1 mx-4">
                <CardBody className="p-0">
                  <div ref={scrollerRef} onScroll={handleScroll} className="overflow-auto max-h-[calc(100vh-300px)] min-h-[300px] rounded-xl custom-scrollbar">
                    <div className="min-w-[800px] w-full">
              <Table
                aria-label="Tabla inventario"
                removeWrapper
                selectionMode="none"
                layout="fixed"
                classNames={{
                  table: "w-full",
                  th: "bg-default-100 dark:bg-default-100 text-default-500 font-bold uppercase text-xs h-12 sticky top-0 z-30 border-b border-default-200/50 shadow-sm outline-none text-center",
                  td: "py-3 border-b border-default-50 dark:border-default-50/10 text-center px-4",
                }}
                bottomContent={
                  isLoading && productos.length > 0 ? (
                    <div className="flex w-full justify-center py-10">
                      <Spinner size="lg" label="Cargando más productos..." color="primary" />
                    </div>
                  ) : null
                }
              >
                <TableHeader>
                  <TableColumn width="30%" align="center" className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      NOMBRE PRODUCTO
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="h-5 w-5 min-w-0 text-default-400 hover:text-secondary"
                        onPress={() => {
                          const newSet = new Set(selectedFilters);
                          if (newSet.has('ascendente')) {
                            newSet.delete('ascendente');
                            newSet.add('descendente');
                          } else if (newSet.has('descendente')) {
                            newSet.delete('descendente');
                          } else {
                            newSet.add('ascendente');
                          }
                          setSelectedFilters(newSet);
                          filtersRef.current = newSet;
                          cacheRef.current = {};
                          setCurrentPage(1);
                          cargarProductosPaginados(1, true);
                        }}
                      >
                        <Icon
                          icon={selectedFilters.has('ascendente') ? 'lucide:arrow-up-a-z' : selectedFilters.has('descendente') ? 'lucide:arrow-down-z-a' : 'lucide:arrow-up-down'}
                          width={13}
                        />
                      </Button>
                    </div>
                  </TableColumn>
                  <TableColumn width="15%" align="center" className="text-center">CATEGORÍA</TableColumn>
                  <TableColumn width="10%" align="center" className="text-center">STOCK</TableColumn>
                  <TableColumn width="10%" align="center" className="text-center">STOCK MÁX</TableColumn>
                  <TableColumn width="10%" align="center" className="text-center">UNIDAD</TableColumn>
                  <TableColumn width="15%" align="center" className="text-center">ESTADO</TableColumn>
                  <TableColumn width="10%" align="center" className="text-center">ACCIONES</TableColumn>
                </TableHeader>
                <TableBody
                  items={paginatedProductos}
                  isLoading={isLoading && productos.length === 0}
                  loadingContent={<Spinner size="lg" />}
                >
                  {(item) => (
                    <TableRow
                      key={item.idBodegaTransito}
                      className={`${bod_Editar ? 'cursor-pointer' : 'cursor-default'} hover:bg-default-50 transition-colors`}
                      onClick={() => bod_Editar && handleRowClick(item)}
                      style={{
                        contentVisibility: 'auto',
                        containIntrinsicSize: '70px 70px'
                      } as any}
                    >
                      <TableCell>
                        <Tooltip content="Control Bodega" color="primary" delay={100} closeDelay={0}>
                          <div className="w-full overflow-hidden text-center flex flex-col items-center">
                            <span className="font-semibold text-secondary dark:text-foreground block truncate w-full">{item.nombreProducto}</span>
                            {item.descripcionProducto && (
                              <p className="text-xs text-default-400 truncate w-full">{item.descripcionProducto}</p>
                            )}
                          </div>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip content="Control Bodega" color="primary" delay={100} closeDelay={0}>
                          <div className="flex justify-center w-full">
                            <Chip size="sm" variant="flat" className="bg-default-100 dark:bg-default-100/50 text-default-600 dark:text-default-300">
                              {item.nombreCategoria}
                            </Chip>
                          </div>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip content="Control Bodega" color="primary" delay={100} closeDelay={0}>
                          <span className={`font-bold block text-center ${item.stock <= 0 ? 'text-danger' : (item.stockLimit && item.stock > item.stockLimit) ? 'text-warning' : 'text-default-700 dark:text-default-300'}`}>
                            {fmtCL(item.stock)}
                          </span>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip content="Control Bodega" color="primary" delay={100} closeDelay={0}>
                          <span className="block text-center">{item.stockLimit ? fmtCL(item.stockLimit) : '-'}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip content="Control Bodega" color="primary" delay={100} closeDelay={0}>
                          <span className="text-default-500 block text-center capitalize">{item.nombreUnidad}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip content="Control Bodega" color="primary" delay={100} closeDelay={0} className="w-full">
                          <div className="w-full h-full text-center flex justify-center">
                            {item.stock <= 0 ? (
                              <Chip color="danger" size="sm" variant="flat" className="text-danger-700 dark:text-danger-400 bg-danger-50 dark:bg-danger-50/10 font-medium">Sin stock</Chip>
                            ) : (item.stockLimit && item.stock > item.stockLimit) ? (
                              <Chip color="warning" size="sm" variant="flat" className="text-warning-700 dark:text-warning-400 bg-warning-50 dark:bg-warning-50/10 font-medium">Excedido</Chip>
                            ) : (
                              <Chip color="success" size="sm" variant="flat" className="text-success-700 dark:text-success-400 bg-success-50 dark:bg-success-50/10 font-medium">Disponible</Chip>
                            )}
                          </div>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center w-full">
                          {historialPuedeLeer && (
                          <Tooltip content="Ver Movimiento">
                            <Button isIconOnly variant="light" size="sm" onPress={() => verMovimientos(item.idProducto.toString(), item.nombreProducto)} className="text-default-400 hover:text-secondary">
                              <Icon icon="lucide:arrow-right" width={18} />
                            </Button>
                          </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ) : !ped_Leer ? (
            <motion.div key="sin-acceso-pedidos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full py-24 gap-4 text-center">
              <Icon icon="lucide:lock" width={48} className="text-default-300" />
              <p className="text-default-500 font-semibold">No tienes permiso para ver Gestión de Pedidos Diarios</p>
            </motion.div>
          ) : (
            <motion.div
              key="pedidos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 pt-6 pb-10"
            >
              <Accordion variant="splitted" selectionMode="multiple" defaultSelectedKeys={["gestion-pedidos"]} className="px-4 w-full">
                <AccordionItem
                  key="gestion-pedidos"
                  aria-label="Pedidos"
                  title={<span className="font-bold text-lg">Pedidos Activos</span>}
                  subtitle={
                    statsDiaSeleccionado.total > 0
                      ? `${statsDiaSeleccionado.total} entrega${statsDiaSeleccionado.total !== 1 ? 's' : ''} · ${statsDiaSeleccionado.pendientes} pendiente${statsDiaSeleccionado.pendientes !== 1 ? 's' : ''} para el día seleccionado`
                      : 'Sin entregas para el día seleccionado'
                  }
                  classNames={{
                    base: "shadow-md border border-default-200 dark:border-default-100 rounded-2xl overflow-hidden bg-white dark:bg-content1 p-0",
                    title: "font-bold text-secondary",
                    trigger: "px-6 py-4",
                    content: "px-6 pb-6 pt-2"
                  }}
                >
                  <div className="space-y-6">
                    {/* ── Navegación de fecha mejorada ── */}
                    <div className="space-y-3 max-w-3xl mx-auto">
                      {/* Fila superior: semana + acciones rápidas */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Button isIconOnly size="sm" variant="flat" onPress={handlePrevWeek} className="rounded-full h-8 w-8 min-w-0" title="Semana anterior">
                            <Icon icon="lucide:chevrons-left" width={16} />
                          </Button>
                          <span className="text-xs font-bold text-default-500 uppercase tracking-wider px-2 min-w-[150px] text-center select-none">
                            {rangoSemanaLabel}
                          </span>
                          <Button isIconOnly size="sm" variant="flat" onPress={handleNextWeek} className="rounded-full h-8 w-8 min-w-0" title="Semana siguiente">
                            <Icon icon="lucide:chevrons-right" width={16} />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button size="sm" variant="flat" onPress={handleToday} startContent={<Icon icon="lucide:calendar-check" width={14} />} className="h-8 font-semibold">
                            Hoy
                          </Button>
                          {gpd_Resumen && (
                            <Button size="sm" variant="flat" color="primary" onPress={abrirPeriodo} startContent={<Icon icon="lucide:layers" width={14} />} className="h-8 font-semibold text-secondary">
                              Resumen período
                            </Button>
                          )}
                          <Button
                            size="sm"
                            color="secondary"
                            variant="solid"
                            onPress={irAProximaPendiente}
                            isLoading={buscandoPendiente}
                            startContent={!buscandoPendiente ? <Icon icon="lucide:zap" width={14} /> : undefined}
                            className="h-8 font-semibold"
                          >
                            Próxima pendiente
                          </Button>
                        </div>
                      </div>

                      {/* Strip de días de la semana */}
                      <div className="grid grid-cols-7 gap-1.5">
                        {weekDays.map(d => {
                          const esSeleccionado = d.fechaStr === selectedDateStr;
                          const esHoy = d.fechaStr === hoyStr;
                          const tienePendientes = d.pendientes > 0;
                          return (
                            <button
                              key={d.fechaStr}
                              onClick={() => handleSelectDay(d.date)}
                              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 px-1 border transition-all
                                ${esSeleccionado
                                  ? 'bg-secondary text-white border-secondary shadow-md'
                                  : esHoy
                                    ? 'bg-white dark:bg-content1 border-primary text-secondary dark:text-foreground hover:bg-default-50'
                                    : 'bg-white dark:bg-content1 border-default-200 dark:border-default-100 text-default-600 dark:text-default-400 hover:border-secondary/40 hover:bg-default-50'}`}
                            >
                              <span className={`text-[10px] font-bold uppercase ${esSeleccionado ? 'text-white/70' : 'text-default-400'}`}>
                                {d.date.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '')}
                              </span>
                              <span className="text-lg font-bold leading-none">{d.date.getDate()}</span>
                              <div className="h-4 flex items-center justify-center mt-0.5">
                                {d.total === 0 ? (
                                  <span className={`w-1 h-1 rounded-full ${esSeleccionado ? 'bg-white/30' : 'bg-default-200'}`} />
                                ) : tienePendientes ? (
                                  <span className={`text-[9px] font-bold px-1.5 rounded-full leading-tight min-w-4 text-center
                                    ${esSeleccionado ? 'bg-white/25 text-white' : 'bg-warning-100 dark:bg-warning-100/20 text-warning-700 dark:text-warning-400'}`}>
                                    {d.pendientes}
                                  </span>
                                ) : (
                                  <Icon icon="lucide:check" width={12} className={esSeleccionado ? 'text-white' : 'text-success-500'} />
                                )}
                              </div>
                              {esHoy && !esSeleccionado && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Día seleccionado + flechas de día */}
                      <div className="flex items-center justify-center gap-2">
                        <Button isIconOnly size="sm" variant="light" onPress={handlePrevDay} className="rounded-full h-7 w-7 min-w-0"><Icon icon="lucide:chevron-left" width={15} /></Button>
                        <span className="text-sm font-bold capitalize text-secondary dark:text-foreground min-w-[200px] text-center">
                          {formatDate(selectedDate)}
                        </span>
                        <Button isIconOnly size="sm" variant="light" onPress={handleNextDay} className="rounded-full h-7 w-7 min-w-0"><Icon icon="lucide:chevron-right" width={15} /></Button>
                      </div>
                    </div>

                    {isLoadingEntregas ? (
                      <div className="flex flex-col items-center gap-3 py-16 text-default-400">
                        <Spinner size="lg" />
                        <p className="text-sm">Cargando pedidos del día...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <Icon icon="lucide:shopping-cart" width={15} className="text-default-400" />
                          <span className="text-xs font-bold text-default-400 uppercase tracking-widest">Entregas del día</span>
                          <div className="flex-grow border-t border-default-100 border-dashed" />
                          {entregasHoy && (
                            <Chip size="sm" variant="flat" color="success" className="text-[10px] h-5 border-none">
                              {entregasHoy.totalSolicitudes} entrega{entregasHoy.totalSolicitudes !== 1 ? 's' : ''}
                            </Chip>
                          )}
                        </div>
                        {!entregasHoy || entregasHoy.salas.length === 0 ? (
                          <div className="py-12 text-center border-2 border-dashed border-default-100 rounded-2xl">
                            <Icon icon="lucide:calendar-x" className="mx-auto mb-2 text-default-200" width={48} />
                            <p className="text-default-400 font-bold">No hay pedidos registrados para este día</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {entregasHoy.salas.map(sala => (
                              <EntregaSalaCard key={sala.idSala} sala={sala} onPreparar={abrirPreparar} canPreparar={gpd_Preparar} onExpandChange={handleExpandChange} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </AccordionItem>
              </Accordion>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Riel de Navegación Derecho */}
      <RielNavegacion
        activeKey={currentView}
        onChange={key => setCurrentView(key as 'inventario' | 'pedidos')}
        items={[
          { key: 'inventario', label: 'Bodega de Tránsito', icon: 'lucide:package-2', visible: bod_Leer },
          { key: 'pedidos', label: 'Gestión de Pedidos Diarios', icon: 'lucide:clipboard-list', color: 'secondary', visible: ped_Leer },
        ]}
      />

      {/* Modals Functionality */}
      <Modal isOpen={isExtraOpen} onOpenChange={onExtraOpenChange} isDismissable={false}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="bg-default-50"><span className="text-gastronomia font-bold">Agregar Item Extra</span></ModalHeader>
              <ModalBody className="py-6">
                <Input label="Producto" value={extraNombre} onValueChange={setExtraNombre} variant="bordered" labelPlacement="outside" />
                <div className="flex gap-4 mt-2">
                  <Input label="Cantidad" type="number" value={extraCantidad} onValueChange={setExtraCantidad} variant="bordered" labelPlacement="outside" />
                  <Input label="Unidad" value={extraUnidad} onValueChange={setExtraUnidad} variant="bordered" labelPlacement="outside" />
                </div>
              </ModalBody>
              <ModalFooter><Button variant="light" onPress={onClose}>Cancelar</Button>{ped_Crear && <Button className="bg-gastronomia text-white" onPress={handleSaveExtra}>Guardar</Button>}</ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isDetailOpen} onOpenChange={onDetailOpenChange} size="3xl" scrollBehavior="inside" backdrop="blur" isDismissable={false}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex justify-between items-center border-b">
                <span className="font-bold text-secondary text-xl">Detalle de Solicitud</span>
                <Button startContent={<Icon icon="lucide:printer" />} onPress={() => window.print()} variant="flat">Imprimir</Button>
              </ModalHeader>
              <ModalBody className="p-6">
                {selectedSolicitud && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-xs font-bold uppercase text-default-500">Asignatura</p><p className="font-bold">{selectedSolicitud.asignaturaNombre}</p></div>
                      <div><p className="text-xs font-bold uppercase text-default-500">Profesor</p><p>{selectedSolicitud.profesorNombre}</p></div>
                    </div>
                    <table className="w-full text-sm">
                      <thead><tr className="bg-default-50"><th>Producto</th><th className="text-right">Cant.</th><th>Unidad</th><th>Origen</th></tr></thead>
                      <tbody>
                        {selectedSolicitud.items.map((it, i) => (
                          <tr key={i} className="border-b"><td className="py-2">{it.productoNombre}</td><td className="text-right">{fmtCL(it.cantidad)}</td><td>{it.unidadMedida}</td><td>{it.esAdicional ? 'Extra' : 'Receta'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ModalBody>
              <ModalFooter><Button onPress={onClose}>Cerrar</Button></ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isModalOpen} onOpenChange={onModalOpenChange} size="lg" backdrop="blur" placement="top" scrollBehavior="inside" radius="lg" classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh] mt-4', closeButton: 'hover:bg-default-100 cursor-pointer' }} isDismissable={false}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-default-100 dark:border-default-50 bg-white dark:bg-content2">
                <div className="flex items-center gap-2">
                  <Icon icon={modalMode === 'crear' ? "lucide:plus-circle" : "lucide:package-check"} className="text-primary" width={24} />
                  <span className="font-bold text-lg text-secondary dark:text-foreground">{modalMode === 'crear' ? 'Nuevo Producto en Bodega' : 'Control de Bodega'}</span>
                </div>
              </ModalHeader>
              <ModalBody className="py-6 overflow-y-scroll custom-scrollbar">
                <FormularioProducto
                  producto={productoSeleccionado}
                  onClose={onClose}
                  mode={modalMode}
                  origenContext="bodega"
                  categorias={categoriasFull}
                  unidades={unidadesFull as any}
                  puedeEditarDatos={modalMode === 'crear' ? true : bodEditarProducto}
                  onConflictSync={(productoActualizado) => {
                    setProductos(prev => prev.map(p =>
                      p.idProducto.toString() === productoActualizado.id ?
                        { ...p, stock: productoActualizado.stock, stockLimit: productoActualizado.stockMinimo } : p
                    ));
                  }}
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal Control de Stock Masivo Bodega */}
      <Modal
        key={bulkModalKey}
        isOpen={isMasivoOpen}
        onOpenChange={(open) => setIsMasivoOpen(open)}
        size="5xl"
        backdrop="blur"
        isDismissable={false}
        scrollBehavior="inside"
        radius="lg"
        classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]', closeButton: 'hover:bg-default-100 cursor-pointer' }}
      >
        <ModalContent>
          {(onClose) => (
            <ControlMasivoBodegaModal
              onClose={onClose}
              initialItems={bulkRetryItems}
              puedeAccederAbastecimiento={bodAbastecimiento}
              onOpenGestionAbastecimiento={onAbastecimientoConfigOpen}
              onProcessComplete={(data, retryItems) => {
                setBulkResult(data);
                setBulkRetryItems(retryItems);
                setIsResultOpen(true);
              }}
            />
          )}
        </ModalContent>
      </Modal>

      {/* Modal de Resultado Control Masivo Bodega */}
      <Modal
        backdrop="opaque"
        isOpen={isResultOpen}
        onOpenChange={(open) => setIsResultOpen(open)}
        size="md"
        scrollBehavior="inside"
        isDismissable={false}
        classNames={{
          backdrop: "bg-background/50 backdrop-blur-sm",
          base: "bg-background dark:bg-content1 shadow-xl border border-default-200 dark:border-default-100",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalBody className="px-6 py-4 space-y-3">
                <div className="flex flex-col items-center justify-center px-6 pt-8 pb-4 text-center gap-4 animate-appearance-in w-full">
                  <Icon icon="lucide:check-circle" className="text-success w-16 h-16" />
                  <h3 className="text-2xl font-bold">Proceso Completado</h3>
                  <p className="text-default-600 text-lg">
                    {((bulkResult?.exitosos.length ?? 0) + (bulkResult?.advertencias.length ?? 0))} {((bulkResult?.exitosos.length ?? 0) + (bulkResult?.advertencias.length ?? 0)) === 1 ? 'producto procesado' : 'productos procesados'} con éxito.
                  </p>

                  {bulkResult && bulkResult.advertencias.length > 0 && (
                    <div className="w-full p-3 bg-warning/10 dark:bg-warning/20 border border-warning/20 rounded-xl flex flex-col gap-2 text-left">
                      <div className="flex items-center gap-2">
                        <Icon icon="lucide:refresh-cw" className="text-warning-600 dark:text-warning-400 w-5 h-5 shrink-0" />
                        <span className="text-warning-600 dark:text-warning-400 font-semibold text-sm">
                          {bulkResult.advertencias.length} sincronizado{bulkResult.advertencias.length !== 1 ? 's' : ''} automáticamente
                        </span>
                      </div>
                      <ul className="flex flex-col gap-1 pl-1">
                        {bulkResult.advertencias.map((item, i) => (
                          <li key={i} className="text-xs text-warning-700 dark:text-warning-400 flex items-start gap-1.5">
                            <span className="mt-0.5 shrink-0">•</span>
                            <span><span className="font-semibold">{item.producto}</span></span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {bulkResult && bulkResult.errores.length > 0 && (
                    <div className="w-full p-3 bg-danger/10 dark:bg-danger/20 border border-danger/20 rounded-xl flex flex-col gap-2 text-left">
                      <div className="flex items-center gap-2">
                        <Icon icon="lucide:x-circle" className="text-danger w-5 h-5 shrink-0" />
                        <span className="text-danger font-semibold text-sm">
                          {bulkResult.errores.length} con error
                        </span>
                      </div>
                      <ul className="flex flex-col gap-1 pl-1">
                        {bulkResult.errores.map((item, i) => (
                          <li key={i} className="text-xs text-danger flex items-start gap-1.5">
                            <span className="mt-0.5 shrink-0">•</span>
                            <span><span className="font-semibold">{item.producto}</span> — {item.mensaje}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter className="flex justify-center border-t border-default-100 bg-default-50 w-full pt-4 pb-4">
                <Button
                  color="primary"
                  size="lg"
                  className="font-bold px-10"
                  startContent={<Icon icon={bulkRetryItems.length > 0 ? 'lucide:rotate-ccw' : 'lucide:thumbs-up'} width={18} />}
                  onPress={() => {
                    onClose();
                    if (bulkRetryItems.length > 0) {
                      setBulkModalKey(k => k + 1);
                      setIsMasivoOpen(true);
                    } else {
                      setBulkRetryItems([]);
                    }
                  }}
                >
                  {bulkRetryItems.length > 0 ? 'Reintentar errores' : 'Entendido'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .container, .container * { visibility: hidden !important; }
          section[role="dialog"], section[role="dialog"] * { visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; }
          button { display: none !important; }
        }
      `}</style>
    </div>

    {/* ── Modal Preparar Entrega ── */}
    <Modal
      isOpen={!!preparandoSolicitud}
      onClose={() => { if (!isConfirmando) { setPreparandoSolicitud(null); } }}
      size="2xl"
      isDismissable={false}
      hideCloseButton={isConfirmando}
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-0.5 pb-1">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:package-check" width={18} className="text-secondary shrink-0" />
            <span className="text-base font-bold">Preparar Entrega</span>
          </div>
          {preparandoSolicitud && (
            <p className="text-xs text-default-500 font-normal pl-6">
              §{preparandoSolicitud.nombreSeccion} · {preparandoSolicitud.nombreDocente} · {preparandoSolicitud.rangoHoras}
            </p>
          )}
        </ModalHeader>

        <ModalBody className="py-2 px-4">
          <p className="text-xs text-default-500 mb-2">
            Ajusta las cantidades a entregar si es necesario. Solo se permite entregar hasta el stock disponible en bodega de tránsito.
          </p>

          {/* Tabla editable */}
          <div className="rounded-lg border border-default-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_0.45fr_0.45fr_0.55fr_0.45fr] px-3 py-2 bg-default-50 text-[10px] font-bold text-default-500 uppercase tracking-wider border-b border-default-200">
              <span>Producto</span>
              <span className="text-center">Solicitado</span>
              <span className="text-center">Stock Tránsito</span>
              <span className="text-center">A Entregar</span>
              <span className="text-center">Diferencia</span>
            </div>
            {productosEdit.map((p, i) => {
              const dif = p.stockTransito - p.cantidadAEntregar;
              const insuficiente = dif < 0;
              return (
                <div
                  key={p.idProducto}
                  className={`grid grid-cols-[1fr_0.45fr_0.45fr_0.55fr_0.45fr] px-3 py-2 text-sm border-t border-default-100 items-center ${insuficiente ? 'bg-danger-50/40' : ''}`}
                >
                  <span className="text-default-700 text-xs">{p.nombreProducto}</span>
                  <span className="font-mono text-center text-default-500 text-xs">
                    {fmtCantidadEntrega(p.cantidadSolicitada)} {p.unidadAbreviada}
                  </span>
                  <span className="font-mono text-center text-default-600 text-xs">
                    {fmtCantidadEntrega(p.stockTransito)} {p.unidadAbreviada}
                  </span>
                  <div className="flex justify-center">
                    <Input
                      size="sm"
                      type="number"
                      min={p.esFraccionario ? 0.001 : 1}
                      step={p.esFraccionario ? 0.001 : 1}
                      value={String(p.cantidadAEntregar)}
                      onValueChange={val => {
                        const parsed = p.esFraccionario
                          ? parseFloat(parseFloat(val).toFixed(3))
                          : parseInt(val, 10);
                        if (!isNaN(parsed) && parsed > 0) {
                          setProductosEdit(prev => prev.map((item, idx) => idx === i ? { ...item, cantidadAEntregar: parsed } : item));
                        }
                      }}
                      className="w-20"
                      classNames={{ input: 'text-center text-xs font-mono', inputWrapper: insuficiente ? 'border-danger' : '' }}
                      endContent={<span className="text-[10px] text-default-400">{p.unidadAbreviada}</span>}
                    />
                  </div>
                  <span className={`font-mono font-semibold text-center text-xs ${insuficiente ? 'text-danger-500' : 'text-success-600'}`}>
                    {dif >= 0 ? '+' : ''}{fmtCantidadEntrega(dif)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Advertencia stock insuficiente */}
          {productosEdit.some(p => p.stockTransito - p.cantidadAEntregar < 0) && (
            <div className="flex items-center gap-2 px-3 py-2 mt-2 bg-danger-50 border border-danger-200 rounded-lg text-xs text-danger-700">
              <Icon icon="lucide:alert-triangle" width={13} className="shrink-0" />
              Stock insuficiente en bodega de tránsito para uno o más productos. Reduce las cantidades a entregar.
            </div>
          )}

          {/* Error del backend */}
          {preparaError && (
            <div className="flex items-start gap-2 px-3 py-2 mt-2 bg-danger-50 border border-danger-200 rounded-lg text-xs text-danger-700">
              <Icon icon="lucide:x-circle" width={13} className="mt-px shrink-0" />
              {preparaError}
            </div>
          )}

        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={() => setPreparandoSolicitud(null)} isDisabled={isConfirmando}>
            Cancelar
          </Button>
          <Button
            color="secondary"
            onPress={handleConfirmarEntregaClick}
            isDisabled={isConfirmando || productosEdit.length === 0 || productosEdit.some(p => !p.cantidadAEntregar || p.cantidadAEntregar <= 0 || p.stockTransito - p.cantidadAEntregar < 0)}
            startContent={<Icon icon="lucide:check" width={14} />}
          >
            Confirmar Entrega
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>

    {/* ── Modal Confirmación Preparar Entrega ── */}
    <Modal
      isOpen={isConfirmacionOpen}
      isDismissable={false}
      isKeyboardDismissDisabled={true}
      hideCloseButton={true}
      size="sm"
      backdrop="blur"
      radius="lg"
      classNames={{ base: 'rounded-2xl' }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 border-b border-default-100 pb-3">
          <Icon icon="lucide:alert-triangle" width={18} className="text-warning shrink-0" />
          <span className="text-base font-bold">¿Confirmar entrega?</span>
        </ModalHeader>
        <ModalBody className="py-4 px-5">
          <p className="text-sm text-default-600">
            Esta acción es <strong>irreversible</strong>. Se realizarán los descuentos correspondientes en la bodega de tránsito y la solicitud quedará marcada como procesada.
          </p>
        </ModalBody>
        <ModalFooter className="gap-2 border-t border-default-100">
          <Button
            variant="light"
            onPress={() => setIsConfirmacionOpen(false)}
            isDisabled={isConfirmando}
          >
            Cancelar
          </Button>
          <Button
            color="secondary"
            onPress={() => { setIsConfirmacionOpen(false); confirmarEntrega(); }}
            isLoading={isConfirmando}
            startContent={!isConfirmando ? <Icon icon="lucide:check" width={14} /> : undefined}
          >
            Confirmar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>

    {/* ── Modal Sobrantes detectados al entregar menos de lo solicitado ── */}
    <Modal
      isOpen={isSobrantesOpen}
      isDismissable={false}
      hideCloseButton
      size="lg"
      backdrop="blur"
      radius="lg"
      classNames={{ base: 'rounded-2xl' }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Icon icon="lucide:alert-triangle" width={20} className="text-warning" />
            <span className="text-base font-bold">Productos sobrantes detectados</span>
          </div>
        </ModalHeader>
        <ModalBody className="space-y-4 pb-2">
          <p className="text-sm text-default-600">
            Se identificó que los siguientes productos serán entregados en una cantidad{' '}
            <strong>menor a la solicitada</strong>. Esto puede ocurrir por ausencias de alumnos u
            otros motivos, generando un excedente que permanece en{' '}
            <strong>bodega de tránsito</strong>. ¿Desea registrarlos como{' '}
            <strong>stock disponible de bodega de tránsito</strong> no asociado a un pedido o solicitud?
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
                {sobrantesPendientes.map((d, idx) => {
                  const prod = productosEdit.find(p => p.idProducto === d.idProducto);
                  return (
                    <tr key={idx} className="border-t border-default-100">
                      <td className="py-2 px-3 text-default-700">
                        {prod?.nombreProducto ?? `Producto #${d.idProducto}`}
                      </td>
                      <td className="py-2 px-3 text-center font-semibold text-default-600 tabular-nums">
                        {fmtCantidadEntrega(d.cantidad)} {prod?.unidadAbreviada}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-warning-600 dark:text-warning-400 italic">
            En caso de No, el sistema no contará con trazabilidad de estos productos sobrantes.
            La entrega se procesará igualmente y es irreversible.
          </p>
        </ModalBody>
        <ModalFooter className="border-t border-default-100 gap-2">
          <Button variant="ghost" onPress={handleSobrantesNo} className="font-medium" isDisabled={isConfirmando}>
            No
          </Button>
          <Button
            color="success"
            onPress={handleSobrantesSi}
            isLoading={isConfirmando}
            startContent={!isConfirmando ? <Icon icon="lucide:check-circle-2" width={16} /> : undefined}
          >
            Sí, registrar sobrantes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>

    {/* ── Modal Stock Disponible Bodega Tránsito ── */}
    <StockDisponiblesModal
      isOpen={isStockDisponiblesOpen}
      onOpenChange={setIsStockDisponiblesOpen}
      defaultTipo="BODEGA_TRANSITO"
    />

    {/* ── Modal Resumen de productos por período ── */}
    <Modal
      isOpen={isPeriodoOpen}
      onOpenChange={setIsPeriodoOpen}
      size="2xl"
      backdrop="blur"
      radius="lg"
      scrollBehavior="inside"
      classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]', closeButton: 'hover:bg-default-100 cursor-pointer' }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 border-b border-default-100 pb-3">
              <div className="flex items-center gap-2">
                <Icon icon="lucide:layers" width={18} className="text-secondary dark:text-foreground" />
                <span className="text-base font-bold">Resumen de productos por período</span>
              </div>
              <p className="text-xs font-normal text-default-500">
                Suma los productos de las entregas <strong>no realizadas</strong> dentro del período indicado. Los productos iguales se acumulan.
              </p>
            </ModalHeader>
            <ModalBody className="py-4 px-5 space-y-4 overflow-y-scroll custom-scrollbar">
              {/* Selectores de período */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 p-3 rounded-xl border border-default-200 dark:border-default-100 bg-default-50/50 dark:bg-content2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-default-500 flex items-center gap-1.5">
                    <Icon icon="lucide:log-in" width={12} /> Desde
                  </p>
                  <div className="flex gap-2">
                    <Input type="date" size="sm" variant="bordered" value={periodoFechaIni} onValueChange={setPeriodoFechaIni} className="flex-1" />
                    <Input type="time" size="sm" variant="bordered" value={periodoHoraIni} onValueChange={setPeriodoHoraIni} className="w-28" />
                  </div>
                </div>
                <div className="space-y-2 p-3 rounded-xl border border-default-200 dark:border-default-100 bg-default-50/50 dark:bg-content2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-default-500 flex items-center gap-1.5">
                    <Icon icon="lucide:log-out" width={12} /> Hasta
                  </p>
                  <div className="flex gap-2">
                    <Input type="date" size="sm" variant="bordered" value={periodoFechaFin} onValueChange={setPeriodoFechaFin} className="flex-1" />
                    <Input type="time" size="sm" variant="bordered" value={periodoHoraFin} onValueChange={setPeriodoHoraFin} className="w-28" />
                  </div>
                </div>
              </div>

              <Button
                color="secondary"
                variant="flat"
                onPress={calcularPeriodo}
                isLoading={periodoLoading}
                startContent={!periodoLoading ? <Icon icon="lucide:calculator" width={15} /> : undefined}
                className="w-full font-semibold"
              >
                Calcular resumen
              </Button>

              {periodoError && (
                <div className="flex items-start gap-2 px-3 py-2 bg-danger-50 border border-danger-200 rounded-lg text-xs text-danger-700">
                  <Icon icon="lucide:alert-circle" width={13} className="mt-px shrink-0" />
                  {periodoError}
                </div>
              )}

              {/* Resultado */}
              {periodoResultado && !periodoLoading && (
                periodoResultado.productos.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed border-default-100 rounded-2xl">
                    <Icon icon="lucide:package-x" width={40} className="mx-auto mb-2 text-default-200" />
                    <p className="text-default-400 font-semibold text-sm">No hay entregas pendientes en este período</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Chip size="sm" variant="flat" color="warning" startContent={<Icon icon="lucide:clipboard-list" width={12} />} className="font-semibold">
                        {periodoResultado.totalSolicitudes} entrega{periodoResultado.totalSolicitudes !== 1 ? 's' : ''} pendiente{periodoResultado.totalSolicitudes !== 1 ? 's' : ''}
                      </Chip>
                      <Chip size="sm" variant="flat" color="secondary" startContent={<Icon icon="lucide:package" width={12} />} className="font-semibold">
                        {periodoResultado.totalProductos} producto{periodoResultado.totalProductos !== 1 ? 's' : ''} distinto{periodoResultado.totalProductos !== 1 ? 's' : ''}
                      </Chip>
                    </div>
                    <div className="rounded-xl border border-default-200 dark:border-default-100 overflow-hidden">
                      <div className="grid grid-cols-[1fr_0.5fr] px-4 py-2 bg-default-100 dark:bg-default-50 text-[10px] font-bold text-default-500 uppercase tracking-wider">
                        <span>Producto</span>
                        <span className="text-center">Cantidad total</span>
                      </div>
                      <div className="divide-y divide-default-100 dark:divide-default-50">
                        {periodoResultado.productos.map(p => (
                          <div key={p.idProducto} className="grid grid-cols-[1fr_0.5fr] px-4 py-2.5 text-sm items-center hover:bg-default-50/50 dark:hover:bg-default-100/20">
                            <span className="text-default-700 dark:text-default-300">{p.nombreProducto}</span>
                            <span className="font-mono font-semibold text-center text-secondary dark:text-foreground">
                              {fmtCantidadEntrega(p.cantidad)} <span className="text-default-400 text-xs">{p.unidadAbreviada}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              )}
            </ModalBody>
            <ModalFooter className="border-t border-default-100">
              <Button variant="light" onPress={onClose}>Cerrar</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>

    <GestionCategoriasModal
      isOpen={isCategoriasOpen}
      onOpenChange={onCategoriasOpenChange}
      onRefresh={() => {
        cacheRef.current = {};
        cargarProductosPaginados(1, true);
      }}
    />

    <GestionUnidadesModal
      isOpen={isUnidadesOpen}
      onOpenChange={onUnidadesOpenChange}
      onRefresh={() => {
        cacheRef.current = {};
        cargarProductosPaginados(1, true);
      }}
    />

    <GestionAbastecimientoModal
      isOpen={isAbastecimientoConfigOpen}
      onOpenChange={onAbastecimientoConfigOpenChange}
    />
    </>
  );
};

export default BodegaTransitoPage;