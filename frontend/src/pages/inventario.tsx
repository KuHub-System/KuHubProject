import React from 'react';
import { fmtCL } from '../utils/format-numbers';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Pagination,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Autocomplete,
  AutocompleteItem,
  Card,
  CardBody,
  Select,
  SelectItem,
  Tooltip,
  Spinner,
  Checkbox,
  Tabs,
  Tab
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useHistory, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {IInventoryPageItem, IProducto} from '../types/inventario/producto.types';
import {
  crearProductoService,
  actualizarProductoService,
  eliminarProductoService,
  obtenerFiltrosInventarioService,
  obtenerProductosPaginadosService,
  buscarProductosService,
  buscarProductosPorCodigoService,
  transformarPageItemAProducto,
  softDeleteInventarioService
} from '../services/inventario/producto-service';
import { useToast, useConfirmDelete } from '../hooks/useToast';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/auth-context';
import { useModulePermission } from '../contexts/permission-context';
import { obtenerCategorias, obtenerUnidades } from '../services/shared/storage-service';
import { TableSkeleton, TableSkeletonColumn } from '../components/SkeletonLoader';
import MovimientosHistorial from '../components/MovimientosHistorial';
import GestionCategoriasModal from '../components/modals/GestionCategoriasModal';
import GestionUnidadesModal from '../components/modals/GestionUnidadesModal';
import GestionAbastecimientoModal from '../components/modals/GestionAbastecimientoModal';
import StockDisponiblesModal from '../components/modals/StockDisponiblesModal';
import ConfirmarDisponibleBodegaModal from '../components/modals/ConfirmarDisponibleBodegaModal';
import ConfirmarSalidaDisponibleModal, { ConfirmarSalidaDisponibleItem } from '../components/modals/ConfirmarSalidaDisponibleModal';
import { obtenerCategoriasActivasService } from '../services/inventario/categoria-service';
import { obtenerUnidadesActivasService } from '../services/inventario/unidad-medida-service';
import { IUnidadMedida, ISincronizarInventarioExcelResultado, IResultadoItemInventarioExcel, ICategoriaAbastecimientoView } from '../types/inventario/inventario.types';
import { actualizarBodegaTransitoConProductoService, crearBodegaConProductoService, sincronizarBodegaTransitoDesdeExcelService, confirmarNuevosBodegaExcelService, WarehouseWithProductUpdateDTO, IBodegaStockSyncWarning, IBodegaStockInsuficiente } from '../services/inventario/bodega-transito-service';
import {
  obtenerBulkProductoInventoryListingService,
  IBulkProductoInventoryListing,
  bulkUpdateInventoryStockService,
  IBulkProcessResult,
  IStockSyncWarning,
  IStockInsuficiente,
  sincronizarInventarioDesdeExcelService,
  confirmarNuevosProductosExcelService,
  obtenerConfigAbastecimientoService
} from '../services/inventario/inventario-service';
import {
  obtenerAbastecimientoBodegaService,
  marcarEnviadoBodegaService,
  registrarDisponiblesService,
  consultarDisponiblesPorProductoService,
  restarDisponiblesService,
  ISolicitudBodegaItem,
  IDetalleBodegaItem,
  IRegistrarDisponibleDTO,
} from '../services/solicitud/solicitud-service';
import {
  obtenerAbastecimientoConfirmadoService,
  marcarEntregadosMasivoService,
} from '../services/proveedor/proveedor-service';
import {
  IOrdenAbastecimiento,
  IEntregaDiaAbastecimiento,
  ICategoriaEntregaAbastecimiento,
  IProductoEntregaAbastecimiento,
} from '../types/proveedor/proveedor.types';
import { ItemPedidoMasivo } from './inventario/constants';
import FormularioProducto from './inventario/FormularioProducto';
import PedidoMasivoModal from './inventario/PedidoMasivoModal';

export { FormularioProducto };


// ── Helpers para sincronización Excel ──
const leerNombresHojas = async (file: File): Promise<string[]> => {
  const XLSX = await import('xlsx');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array', bookSheets: true });
      resolve(wb.SheetNames);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

const normalizarParaMatch = (s: string): string =>
  s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const intentarAutoMatchCategoria = (
  nombreHoja: string,
  categorias: { id: number; nombre: string }[]
): number | null => {
  const norm = normalizarParaMatch(nombreHoja);
  return categorias.find(c => normalizarParaMatch(c.nombre) === norm)?.id ?? null;
};

// ── Skeletons: columnas espejo de las tablas reales ────────────────────────
const STOCK_TABLE_COLS: TableSkeletonColumn[] = [
  { width: 'w-[30%]', shape: 'text' },
  { width: 'w-[15%]', shape: 'text' },
  { width: 'w-[10%]', shape: 'text' },
  { width: 'w-[10%]', shape: 'text' },
  { width: 'w-[10%]', shape: 'text' },
  { width: 'w-[15%]', shape: 'chip' },
  { width: 'w-[10%]', shape: 'icons' },
];

// Cache de módulo: sobrevive al desmontaje del componente para que volver a
// esta página dentro de la misma sesión no vuelva a pedir filtros/categorías/
// unidades/abastecimiento, que casi nunca cambian entre navegaciones.
const FILTROS_CACHE_TTL_MS = 5 * 60 * 1000;
let _inventarioFiltrosCache: {
  categoriasFull: { id: number; nombre: string }[];
  unidadesFull: { id: number; nombre: string }[];
  categoriasActivas: { id: number; nombre: string }[];
  unidadesActivas: IUnidadMedida[];
  configAbastecimiento: ICategoriaAbastecimientoView[];
  ts: number;
} | null = null;

// Solo para tests: evita que el cache de módulo filtre entre casos de prueba.
export const __resetInventarioFiltrosCache = () => { _inventarioFiltrosCache = null; };

/**
 * Página de inventario.
 * Muestra una tabla con los productos del inventario y permite realizar operaciones CRUD.
 * 
 * @returns {JSX.Element} La página de inventario.
 */
const InventarioPage: React.FC = () => {
  const toast = useToast();
  const confirmDelete = useConfirmDelete();
  const { user } = useAuth();
  const esAdministrador = user?.rol === 'Administrador';
  // ── Permisos granulares del módulo INVENTARIO ──
  const { canDelete: invPuedeEliminar } = useModulePermission('INVENTARIO');
  const { canRead: invEditarProducto }  = useModulePermission('INV_EDITAR_PRODUCTO');
  const { canRead: catPuedeLeer, canCreate: catPuedeCrear } = useModulePermission('GESTION_CATEGORIAS');
  const { canRead: uniPuedeLeer, canCreate: uniPuedeCrear } = useModulePermission('GESTION_UNIDADES');
  const { canRead: historialPuedeLeer } = useModulePermission('HISTORIAL_MOVIMIENTOS');
  // Acciones especiales de inventario (módulos individuales por botón)
  const { canRead: invNuevoProducto }  = useModulePermission('INV_NUEVO_PRODUCTO');
  const { canRead: invControlMasivo }  = useModulePermission('INV_CONTROL_MASIVO');
  const { canRead: invAbastBodega }    = useModulePermission('INV_ABAST_BODEGA');
  const { canRead: invAbastProv }      = useModulePermission('INV_ABAST_PROV');
  const { canRead: invSyncExcel }      = useModulePermission('INV_SYNC_EXCEL');
  const { canRead: invAbastecimiento } = useModulePermission('INV_ABASTECIMIENTO');
  const { canRead: invStockDisponible }= useModulePermission('INV_STOCK_DISPONIBLE');
  const [productos, setProductos] = React.useState<IProducto[]>([]);
  const [filteredProductos, setFilteredProductos] = React.useState<IProducto[]>([]);
  const [categoriasFull, setCategoriasFull] = React.useState<{ id: number, nombre: string }[]>([]);
  const [categoriasActivas, setCategoriasActivas] = React.useState<{ id: number, nombre: string }[]>([]);
  const [unidadesFull, setUnidadesFull] = React.useState<{ id: number, nombre: string }[]>([]);
  const [unidadesActivas, setUnidadesActivas] = React.useState<IUnidadMedida[]>([]);
  const [totalPaginas, setTotalPaginas] = React.useState<number>(1);
  const [totalRegistros, setTotalRegistros] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState<string>('');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [selectedFilters, setSelectedFilters] = React.useState<Set<string>>(new Set(['todas']));
  const filtersRef = React.useRef<Set<string>>(new Set(['todas']));
  const filterDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTermRef = React.useRef<string>('');

  const [searchCode, setSearchCode] = React.useState<string>('');
  const [debouncedSearchCode, setDebouncedSearchCode] = React.useState<string>('');
  const searchCodeRef = React.useRef<string>('');
  const [cache, setCache] = React.useState<Record<number, IProducto[]>>({});
  const cacheRef = React.useRef<Record<number, IProducto[]>>({});

  const history = useHistory();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isPedidoMasivoOpen, onOpen: onPedidoMasivoOpen, onOpenChange: onPedidoMasivoOpenChange } = useDisclosure();
  const { isOpen: isResultModalOpen, onOpen: onResultModalOpen, onOpenChange: onResultModalOpenChange } = useDisclosure();
  const [bulkResult, setBulkResult] = React.useState<IBulkProcessResult | null>(null);
  const [bulkRetryItems, setBulkRetryItems] = React.useState<ItemPedidoMasivo[]>([]);
  const [bulkModalKey, setBulkModalKey] = React.useState(0);
  const { isOpen: isCategoriasOpen, onOpen: onCategoriasOpen, onOpenChange: onCategoriasOpenChange } = useDisclosure();
  const { isOpen: isUnidadesOpen, onOpen: onUnidadesOpen, onOpenChange: onUnidadesOpenChange } = useDisclosure();
  const { isOpen: isAbastecimientoConfigOpen, onOpen: onAbastecimientoConfigOpen, onOpenChange: onAbastecimientoConfigOpenChange } = useDisclosure();
  const { isOpen: isStockDisponiblesOpen, onOpen: onStockDisponiblesOpen, onOpenChange: onStockDisponiblesOpenChange } = useDisclosure();
  // ── Sincronizar Inventario con Excel ──
  const excelFileInputRef = React.useRef<HTMLInputElement>(null);
  const [excelPendingFile,     setExcelPendingFile]     = React.useState<File | null>(null);
  const [excelSheetOptions,    setExcelSheetOptions]    = React.useState<string[]>([]);
  const [excelSelectedSheet,   setExcelSelectedSheet]   = React.useState<string | null>(null);
  const [excelSelectedCatId,   setExcelSelectedCatId]   = React.useState<number | null>(null);
  const [excelFilaInicio,      setExcelFilaInicio]      = React.useState<number>(2);
  const [excelFilaFin,         setExcelFilaFin]         = React.useState<number>(500);
  const [excelModalVista,      setExcelModalVista]      = React.useState<'hojas' | 'config'>('hojas');
  const [isSincronizandoExcel, setIsSincronizandoExcel] = React.useState(false);
  const [excelEspecierosAviso, setExcelEspecierosAviso] = React.useState(false);
  const [excelResultado,                setExcelResultado]                = React.useState<ISincronizarInventarioExcelResultado | null>(null);
  const [excelNoEncontradosSeleccionados, setExcelNoEncontradosSeleccionados] = React.useState<Set<number>>(new Set());
  const [isIncluyendoNoEncontrados,     setIsIncluyendoNoEncontrados]     = React.useState(false);
  const [excelResultVista, setExcelResultVista] = React.useState<'sincronizados' | 'no_encontrados'>('no_encontrados');
  const [excelSyncTarget, setExcelSyncTarget] = React.useState<'inventario' | 'bodega'>('inventario');
  const [configAbastecimiento, setConfigAbastecimiento] = React.useState<ICategoriaAbastecimientoView[]>([]);
  const [excelCatNoEncontradaHoja, setExcelCatNoEncontradaHoja] = React.useState<string>('');
  const { isOpen: isSincronizarExcelOpen, onOpen: onSincronizarExcelOpen, onOpenChange: onSincronizarExcelOpenChange } = useDisclosure();
  const { isOpen: isExcelResultOpen, onOpen: onExcelResultOpen, onOpenChange: onExcelResultOpenChange } = useDisclosure();
  const { isOpen: isExcelCatNoEncontradaOpen, onOpen: onExcelCatNoEncontradaOpen, onOpenChange: onExcelCatNoEncontradaOpenChange } = useDisclosure();
  const { isOpen: isExcelBodegaAdvertenciaOpen, onOpen: onExcelBodegaAdvertenciaOpen, onOpenChange: onExcelBodegaAdvertenciaOpenChange } = useDisclosure();
  const [productoSeleccionado, setProductoSeleccionado] = React.useState<IProducto | null>(null);
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar'>('crear');
  const [showStockWarning, setShowStockWarning] = React.useState(false);
  const [productoParaEliminar, setProductoParaEliminar] = React.useState<IProducto | null>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const isScrollingRef = React.useRef(false);
  const isLoadingRef = React.useRef(false);
  const nextPageRef = React.useRef(1); // Tracker para carga secuencial
  const productosLengthRef = React.useRef(0);

  // ── Tab activa (Stock / Movimientos) ──
  const location = useLocation();
  const vieneDeRutaMovimientos = location.pathname.startsWith('/movimientos');
  const [activeTab, setActiveTab] = React.useState<'stock' | 'movimientos'>(
    vieneDeRutaMovimientos ? 'movimientos' : 'stock'
  );

  // ── Nombre de producto para el tab "Movimientos": arranca desde la query string
  // (compatibilidad con /movimientos?nombre=...) y se actualiza al usar "Ver Movimiento"
  // desde una fila del Stock -- MovimientosHistorial se desmonta/remonta al cambiar de
  // tab, así que el valor pasado como prop en el momento del montaje es suficiente. ──
  const [movNombreFiltro, setMovNombreFiltro] = React.useState(
    () => new URLSearchParams(location.search).get('nombre') ?? ''
  );

  usePageTitle('Inventario', 'Gestione los productos del inventario, vea movimientos y actualice existencias.', 'lucide:package');

  /**
   * Carga los filtros (categorías y unidades) desde el backend.
   */
  const cargarFiltros = React.useCallback(async (forceFetch = false) => {
    const cached = _inventarioFiltrosCache;
    if (!forceFetch && cached && Date.now() - cached.ts < FILTROS_CACHE_TTL_MS) {
      setCategoriasFull(cached.categoriasFull);
      setUnidadesFull(cached.unidadesFull);
      setCategoriasActivas(cached.categoriasActivas);
      setUnidadesActivas(cached.unidadesActivas);
      setConfigAbastecimiento(cached.configAbastecimiento);
      return;
    }

    try {
      const [resFiltros, resCategoriasActivas, resUnidadesActivas, resConfigAbastecimiento] = await Promise.all([
        obtenerFiltrosInventarioService(),
        obtenerCategoriasActivasService(),
        obtenerUnidadesActivasService(),
        obtenerConfigAbastecimientoService()
      ]);

      const categoriasFullData = resFiltros.categorias ?? [];
      const unidadesFullData = resFiltros.unidades ?? [];
      setCategoriasFull(categoriasFullData);
      setUnidadesFull(unidadesFullData);

      // Mapear ICategoria[] a coincidir con el formato de categoriasFull
      const activasMapeadas = resCategoriasActivas.map(c => ({
        id: parseInt(c.id),
        nombre: c.nombre
      }));
      setCategoriasActivas(activasMapeadas);
      setUnidadesActivas(resUnidadesActivas);
      setConfigAbastecimiento(resConfigAbastecimiento);

      _inventarioFiltrosCache = {
        categoriasFull: categoriasFullData,
        unidadesFull: unidadesFullData,
        categoriasActivas: activasMapeadas,
        unidadesActivas: resUnidadesActivas,
        configAbastecimiento: resConfigAbastecimiento,
        ts: Date.now()
      };
    } catch (error) {
      // Error cargando filtros
    }
  }, []);

  /**
   * Carga de forma silenciosa la siguiente página de la API.
   */
  const prefetchSiguientePagina = React.useCallback(async (currentUiPage: number) => {
    // Si la primera página trajo 20 items, la siguiente API page a prefetch es la 3 (que corresponde a UI page 3)
    // Si la primera página trajo 10 items, la siguiente API page a prefetch es la 2 (que corresponde a UI page 2)
    const apiPageToPrefetch = currentUiPage === 1 && productosLengthRef.current === 20 ? 3 : currentUiPage + 1;

    if (cacheRef.current[apiPageToPrefetch] || apiPageToPrefetch > totalPaginas) return;

    try {
      let response;
      const currentSearch = searchTermRef.current;
      const currentSearchCode = searchCodeRef.current;
      const size = 40; // Prefetch de 40 en 40 para ser consistente con el scroll infinito

      if (currentSearchCode) {
        response = await buscarProductosPorCodigoService(currentSearchCode, apiPageToPrefetch, size);
      } else if (currentSearch) {
        response = await buscarProductosService(currentSearch, apiPageToPrefetch, size);
      } else {
        const currentFilters = Array.from(filtersRef.current);
        const categoriasIds = currentFilters
          .filter(f => f && typeof f === 'string' && f.startsWith('cat-'))
          .map(f => parseInt(f.replace('cat-', '')))
          .filter(id => !isNaN(id));

        const unidadesIds = currentFilters
          .filter(f => f && typeof f === 'string' && f.startsWith('uni-'))
          .map(f => parseInt(f.replace('uni-', '')))
          .filter(id => !isNaN(id));

        const soloStockBajo = filtersRef.current.has('stock-bajo');
        const ocultarAgotados = filtersRef.current.has('ocultar-cero');
        const isAsc = filtersRef.current.has('ascendente');
        const isDesc = filtersRef.current.has('descendente');

        response = await obtenerProductosPaginadosService({
          page: apiPageToPrefetch,
          categoriasIds,
          unidadesIds,
          soloStockBajo,
          ocultarAgotados,
          isAsc,
          isDesc,
          pageSize: size
        });
      }

      const productosTransformados = response.items.map(transformarPageItemAProducto);
      cacheRef.current[apiPageToPrefetch] = productosTransformados;
      setCache(prev => ({ ...prev, [apiPageToPrefetch]: productosTransformados }));
    } catch (e) {
      // Prefetch fallido silenciosamente
    }
  }, [totalPaginas]);

  /**
   * Carga los productos usando una caché local para manejar la asimetría del backend.
   */
  const cargarProductosPaginados = React.useCallback(async (uiPage: number, forceFetch = false) => {
    // Si ya estamos cargando y no es forzado, salimos para evitar duplicados
    if (isLoadingRef.current && !forceFetch) return;

    // Ya tenemos estos datos?
    if (!forceFetch && cacheRef.current[uiPage]) {
      const cachedItems = cacheRef.current[uiPage];
      setProductos(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newItems = cachedItems.filter(p => !existingIds.has(p.id));

        // Si al descargar la caché el contador de página actual es menor, lo actualizamos
        if (newItems.length > 0) {
          nextPageRef.current = Math.max(nextPageRef.current, uiPage + 1);
        }

        return [...prev, ...newItems];
      });
      return;
    }

    try {
      setIsLoading(true);
      isLoadingRef.current = true;
      let response;
      const currentSearch = searchTermRef.current;
      const currentSearchCode = searchCodeRef.current;

      // El backend aplica offset = (page-1) * pageSize
      // Para scroll infinito transparente, cargamos bloques de 40 items
      const apiPage = uiPage;
      const size = 40;


      if (currentSearchCode) {
        response = await buscarProductosPorCodigoService(currentSearchCode, apiPage, size);
      } else if (currentSearch) {
        response = await buscarProductosService(currentSearch, apiPage, size);
      } else {
        const categoriesKeys = Array.from(filtersRef.current);
        const categoriesFiltered = categoriesKeys.filter(k => k.startsWith('cat-'));
        const unitFiltered = categoriesKeys.filter(k => k.startsWith('uni-'));

        const categoriasIds = categoriesKeys.includes('todas') || categoriesKeys.includes('stock-bajo')
          ? []
          : categoriesFiltered.map(k => parseInt(k.replace('cat-', '')));

        const soloStockBajo = categoriesKeys.includes('stock-bajo');
        const ocultarAgotados = categoriesKeys.includes('ocultar-cero');
        const isAsc = categoriesKeys.includes('ascendente');
        const isDesc = categoriesKeys.includes('descendente');
        const unidadesIds = unitFiltered.map(k => parseInt(k.replace('uni-', '')));

        const requestBody = {
          page: apiPage,
          categoriasIds,
          unidadesIds,
          soloStockBajo,
          ocultarAgotados,
          isAsc,
          isDesc,
          pageSize: size
        };

        response = await obtenerProductosPaginadosService(requestBody);
      }

      const productosTransformados = response.items.map(transformarPageItemAProducto);

      if (forceFetch || uiPage === 1) {
        if (forceFetch) {
          cacheRef.current = {};
          setCache({});
        }

        setProductos(productosTransformados);

        // Almacenamos en cache por bloque de 40
        cacheRef.current[uiPage] = productosTransformados;
        setCache(prev => ({ ...prev, [uiPage]: productosTransformados }));

        // Si es la primera página, la siguiente a cargar es la 2
        nextPageRef.current = uiPage + 1;
      } else {
        // Para scroll infinito, acumulamos en productos si no están ya
        setProductos(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = productosTransformados.filter(p => !existingIds.has(p.id));
          return [...prev, ...newItems];
        });

        // También guardamos en caché individual por si acaso
        cacheRef.current[uiPage] = productosTransformados;
        setCache(prev => ({ ...prev, [uiPage]: productosTransformados }));
        nextPageRef.current = Math.max(nextPageRef.current, uiPage + 1);
      }


      // totalPaginas ahora se calcula en bloques de 40, alineado con el pageSize
      const calculatedUiPages = Math.ceil(response.totalItems / 40);
      setTotalPaginas(calculatedUiPages);
      setTotalRegistros(response.totalItems);

      checkpointPaginationScroll(apiPage);
      prefetchSiguientePagina(uiPage);
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [toast, prefetchSiguientePagina]);

  /**
   * Debounce 2.5s para filtros: cancela el timer anterior antes de iniciar uno nuevo,
   * dando tiempo al usuario a terminar de seleccionar categorías, unidades y checkboxes.
   */
  const scheduleFilterRequest = React.useCallback(() => {
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      cacheRef.current = {};
      setCache({});
      setCurrentPage(1);
      cargarProductosPaginados(1, true);
    }, 2500);
  }, [cargarProductosPaginados]);

  const checkpointPaginationScroll = React.useCallback((apiPage: number) => {
    // Si saltamos a una página lejana vía paginación, limpiamos y cargamos desde ahí
    // Pero para scroll infinito simple, esto ayuda a saber dónde estamos.
  }, []);

  React.useEffect(() => {
    cargarFiltros();

    const filtroGuardado = sessionStorage.getItem('inventarioFiltro');
    if (filtroGuardado === 'stockBajo') {
      const newSet = new Set(['stock-bajo']);
      setSelectedFilters(newSet);
      filtersRef.current = newSet;
      sessionStorage.removeItem('inventarioFiltro');
    }
  }, [cargarFiltros]);

  // Recargar filtros (categorías activas) cada vez que se abre el modal de producto
  React.useEffect(() => {
    if (isOpen) {
      cargarFiltros(true);
    }
  }, [isOpen, cargarFiltros]);

  // Cargar productos iniciales
  React.useEffect(() => {
    cargarProductosPaginados(1);
  }, [cargarProductosPaginados]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (isLoading || isLoadingRef.current) return;
      const { scrollTop, clientHeight, scrollHeight } = el;
      if (scrollTop + clientHeight > scrollHeight - 3000) {
        if (productos.length < totalRegistros) {
          const pageToLoad = nextPageRef.current;
          cargarProductosPaginados(pageToLoad);
        }
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isLoading, productos.length, totalRegistros, cargarProductosPaginados]);

  React.useEffect(() => {
    const handleProductosActualizados = () => {
      setCache({}); // Forzar recarga completa al actualizar
      cargarProductosPaginados(currentPage, true);
    };

    window.addEventListener('productosActualizados', handleProductosActualizados);

    return () => {
      window.removeEventListener('productosActualizados', handleProductosActualizados);
    };
  }, [cargarProductosPaginados, currentPage]);

  // Lógica de Debounce para búsqueda
  React.useEffect(() => {
    if (searchTerm === debouncedSearchTerm && searchCode === debouncedSearchCode) return;

    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      searchTermRef.current = searchTerm;

      setDebouncedSearchCode(searchCode);
      searchCodeRef.current = searchCode;

      // Resetear estados para nueva búsqueda
      cacheRef.current = {};
      setCache({});
      setCurrentPage(1);
      cargarProductosPaginados(1, true);
    }, 4000);

    return () => clearTimeout(handler);
  }, [searchTerm, debouncedSearchTerm, searchCode, debouncedSearchCode, cargarProductosPaginados]);

  /**
   * Filtra los productos localmente solo si no hay búsqueda global activa.
   */
  React.useEffect(() => {
    // Si hay búsqueda global (debounced), no filtramos localmente
    // porque el backend ya nos trajo solo lo que coincide.
    if (debouncedSearchTerm || debouncedSearchCode) {
      setFilteredProductos(productos);
      return;
    }

    if (!searchTerm && !searchCode) {
      setFilteredProductos(productos);
      return;
    }

    const filtered = productos.filter(producto =>
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (producto.descripcion && producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredProductos(filtered);
  }, [searchTerm, debouncedSearchTerm, productos]);

  // Resetear página al cambiar filtros
  React.useEffect(() => {
    // Si no estamos en la página 1, volvemos a ella al cambiar filtros
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [selectedFilters]);

  /**
   * Obtiene las categorías únicas de los productos, agregando la opción de Stock Bajo.
   */
  /**
   * Obtiene todos los filtros combinados (Categorías + Unidades) con IDs
   */
  const filtrosCategorias = React.useMemo(() => {
    const categoras = categoriasFull.map(c => ({ id: `cat-${c.id}`, nombre: c.nombre }));
    return [{ id: 'todas', nombre: 'Todas las categorías' }, ...categoras];
  }, [categoriasFull]);

  const filtrosUnidades = React.useMemo(() => {
    return unidadesFull.map(u => ({ id: `uni-${u.id}`, nombre: u.nombre }));
  }, [unidadesFull]);

  // Mantener compatibilidad con filtrosCombinados para el resto de la lógica
  const filtrosCombinados = React.useMemo(() => {
    return [...filtrosCategorias, ...filtrosUnidades];
  }, [filtrosCategorias, filtrosUnidades]);

  /**
   * Extrae los productos a mostrar para la página actual de la UI,
   * usando los datos cargados en la caché de la API.
   */
  const paginatedProductos = React.useMemo(() => {
    return productos;
  }, [productos]);

  /**
 * Cambia a la pestaña "Movimientos" filtrada por el producto (antes navegaba a /movimientos).
 *
 * @param {string} id - ID del producto (no se usa en el filtro, el backend filtra por nombre).
 * @param {string} nombre - Nombre del producto.
 */
  const verMovimientos = (id: string, nombre: string) => {
    setMovNombreFiltro(nombre);
    setActiveTab('movimientos');
  };

  /**
   * Abre el modal para crear un nuevo producto.
   */
  const handleNuevoProducto = () => {
    setModalMode('crear');
    setProductoSeleccionado(null);
    onOpen();
  };

  const handleEliminarProducto = async (producto: IProducto) => {
    if (!esAdministrador) {
      toast.warning('Solo el rol Administrador puede eliminar productos.');
      return;
    }

    // No se puede eliminar si hay stock
    if (producto.stock > 0) {
      setProductoParaEliminar(producto);
      setShowStockWarning(true);
      return;
    }

    const confirmado = await confirmDelete({
      title: 'Eliminar producto',
      itemDescription: `el producto "${producto.nombre}"`,
    });
    if (!confirmado) return;

    const idInventario = (producto as any)._idInventario;
    if (!idInventario) {
      toast.error('No se pudo encontrar el ID de inventario para este producto.');
      return;
    }

    try {
      const exito = await softDeleteInventarioService(idInventario);
      if (exito) {
        toast.success(`Producto "${producto.nombre}" eliminado correctamente.`);
        // Forzar recarga completa limpiando caché
        setCache({});
        cacheRef.current = {};
        cargarProductosPaginados(currentPage, true);
      } else {
        toast.error('No se pudo eliminar el producto.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el producto.');
    }
  };

  /**
   * Abre el modal para editar un producto existente.
   *
   * @param {IProducto} producto - Producto a editar.
   */
  const handleEditarProducto = (producto: IProducto) => {
    setModalMode('editar');
    setProductoSeleccionado(producto);
    onOpen();
  };

  /**
   * Sincroniza un producto en la caché local y en el estado sin refrescar toda la tabla.
   * Útil para conflictos (409) donde recibimos la versión más nueva del servidor.
   *
   * @param {IProducto} productoActualizado - El producto con los datos frescos del servidor.
   */
  const handleConflictSync = React.useCallback((productoActualizado: IProducto) => {

    // 1. Actualizar estado 'productos'
    setProductos(prev => prev.map(p => p.id === productoActualizado.id ? productoActualizado : p));

    // 2. Actualizar estado 'filteredProductos'
    setFilteredProductos(prev => prev.map(p => p.id === productoActualizado.id ? productoActualizado : p));

    // 3. Buscar en qué página está en la caché y actualizarla (usamos la página actual para simplificar)
    const apiPage = currentPage;

    if (cacheRef.current[apiPage]) {
      cacheRef.current[apiPage] = cacheRef.current[apiPage].map(p =>
        p.id === productoActualizado.id ? productoActualizado : p
      );

      setCache(prev => ({
        ...prev,
        [apiPage]: cacheRef.current[apiPage]
      }));
    }
  }, [currentPage]);

  /**
   * Renderiza el estado del stock con un chip de color según el nivel.
   *
   * @param {IProducto} producto - Producto a evaluar.
   * @returns {JSX.Element} Chip con el estado del stock.
   */
  // ── Handlers: Sincronizar Inventario con Excel ──
  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const hojas = await leerNombresHojas(file);
      setExcelPendingFile(file);
      setExcelSheetOptions(hojas);
      setExcelSelectedSheet(null);
      setExcelSelectedCatId(null);
      setExcelEspecierosAviso(false);

      if (hojas.length <= 1) {
        const hoja = hojas[0] ?? '';
        setExcelSelectedSheet(hoja);
        const autoMatch = intentarAutoMatchCategoria(hoja, categoriasActivas);
        setExcelSelectedCatId(autoMatch);
        if (hoja === 'ESPECIEROS') { setExcelFilaInicio(4); setExcelFilaFin(29); setExcelEspecierosAviso(true); }
        else { setExcelFilaInicio(2); setExcelFilaFin(500); }
        setExcelModalVista('config');
        onSincronizarExcelOpen();
        if (autoMatch === null) {
          setExcelCatNoEncontradaHoja(hoja);
          onExcelCatNoEncontradaOpen();
        }
      } else {
        setExcelFilaInicio(2);
        setExcelFilaFin(500);
        setExcelModalVista('hojas');
        onSincronizarExcelOpen();
      }
    } catch {
      toast.error('No se pudo leer el archivo Excel');
    }
  };

  const handleSeleccionarHojaExcel = (nombreHoja: string) => {
    setExcelSelectedSheet(nombreHoja);
    const catMatch = intentarAutoMatchCategoria(nombreHoja, categoriasActivas);
    setExcelSelectedCatId(catMatch);
    if (nombreHoja === 'ESPECIEROS') {
      setExcelFilaInicio(4); setExcelFilaFin(29); setExcelEspecierosAviso(true);
    } else {
      setExcelFilaInicio(2); setExcelFilaFin(500); setExcelEspecierosAviso(false);
    }
    setExcelModalVista('config');
    if (catMatch === null) {
      setExcelCatNoEncontradaHoja(nombreHoja);
      onExcelCatNoEncontradaOpen();
    }
  };

  const handleDoSincronizarExcel = async () => {
    if (!excelPendingFile || !excelSelectedSheet || excelSelectedCatId === null) return;
    const catConfig = configAbastecimiento.find(c => c.idCategoria === excelSelectedCatId);
    if (catConfig?.bodegaTransito) {
      onExcelBodegaAdvertenciaOpen();
      return;
    }
    await doSincronizarInventario();
  };

  const doSincronizarInventario = async () => {
    if (!excelPendingFile || !excelSelectedSheet || excelSelectedCatId === null) return;
    setIsSincronizandoExcel(true);
    try {
      const resultado = await sincronizarInventarioDesdeExcelService(
        excelPendingFile, excelFilaInicio, excelFilaFin, excelSelectedCatId, excelSelectedSheet
      );
      setExcelResultado(resultado);
      setExcelSyncTarget('inventario');
      const noEncontrados = resultado.resultados.filter(r => r.estado === 'no_encontrado');
      setExcelNoEncontradosSeleccionados(
        new Set(
          noEncontrados
            .map((r, i) => ({ r, i }))
            .filter(({ r }) => (r.stockExcel ?? 0) > 0)
            .map(({ i }) => i)
        )
      );
      setExcelResultVista(noEncontrados.length > 0 ? 'no_encontrados' : 'sincronizados');
      onSincronizarExcelOpenChange();
      onExcelResultOpen();
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar el Excel');
    } finally {
      setIsSincronizandoExcel(false);
    }
  };

  const doSincronizarBodega = async () => {
    if (!excelPendingFile || !excelSelectedSheet || excelSelectedCatId === null) return;
    setIsSincronizandoExcel(true);
    try {
      const resultado = await sincronizarBodegaTransitoDesdeExcelService(
        excelPendingFile, excelFilaInicio, excelFilaFin, excelSelectedCatId, excelSelectedSheet
      );
      setExcelResultado(resultado);
      setExcelSyncTarget('bodega');
      const noEncontrados = resultado.resultados.filter(r => r.estado === 'no_encontrado');
      setExcelNoEncontradosSeleccionados(
        new Set(
          noEncontrados
            .map((r, i) => ({ r, i }))
            .filter(({ r }) => (r.stockExcel ?? 0) > 0)
            .map(({ i }) => i)
        )
      );
      setExcelResultVista(noEncontrados.length > 0 ? 'no_encontrados' : 'sincronizados');
      onSincronizarExcelOpenChange();
      onExcelBodegaAdvertenciaOpenChange();
      onExcelResultOpen();
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar el Excel para bodega de tránsito');
    } finally {
      setIsSincronizandoExcel(false);
    }
  };

  const handleConfirmarNuevos = async () => {
    if (!excelResultado || !excelSelectedCatId) return;
    const noEncontrados = excelResultado.resultados.filter(r => r.estado === 'no_encontrado');
    const seleccionados = noEncontrados.filter((_, i) => excelNoEncontradosSeleccionados.has(i));
    if (seleccionados.length === 0) { onExcelResultOpenChange(); return; }
    setIsIncluyendoNoEncontrados(true);
    try {
      const items = seleccionados.map(r => ({
        nombre: r.nombreExcel,
        idUnidadMedida: r.idUnidadMedida ?? 0,
        stock: r.stockExcel ?? 0,
        idCategoria: excelSelectedCatId,
      }));
      if (excelSyncTarget === 'bodega') {
        const count = await confirmarNuevosBodegaExcelService(items);
        toast.success(`${count} nuevos productos registrados en bodega de tránsito`);
        window.dispatchEvent(new Event('productosActualizados'));
      } else {
        const count = await confirmarNuevosProductosExcelService(items);
        toast.success(`${count} nuevos productos agregados al inventario`);
      }
      onExcelResultOpenChange();
      setCache({});
      cargarProductosPaginados(1, true);
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar productos');
    } finally {
      setIsIncluyendoNoEncontrados(false);
    }
  };

  const renderStockStatus = (producto: IProducto) => {
    if (producto.stock <= 0) {
      return <Chip color="danger" size="sm" variant="flat" className="text-danger-700 dark:text-danger-400 bg-danger-50 dark:bg-danger-50/10 font-medium">Sin stock</Chip>;
    } else if (producto.stock < producto.stockMinimo) {
      return <Chip color="warning" size="sm" variant="flat" className="text-warning-700 dark:text-warning-400 bg-warning-50 dark:bg-warning-50/10 font-medium">Stock bajo</Chip>;
    } else {
      return <Chip color="success" size="sm" variant="flat" className="text-success-700 dark:text-success-400 bg-success-50 dark:bg-success-50/10 font-medium">Disponible</Chip>;
    }
  };

  productosLengthRef.current = productos.length;

  return (
    <div className="min-h-screen bg-default-50/50 dark:bg-background pb-20 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="px-4 mt-8">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as 'stock' | 'movimientos')}
            variant="underlined"
            color="primary"
            classNames={{ tabList: 'gap-6' }}
          >
            <Tab key="stock" title="Stock" />
            {historialPuedeLeer && <Tab key="movimientos" title="Movimientos" />}
          </Tabs>
        </div>

        {activeTab === 'stock' && (
        <>
        <div className="flex flex-wrap items-center gap-3 px-4 mb-4">
          {invControlMasivo && (
          <Button
            color="secondary"
            variant="solid"
            size="md"
            className="font-bold shadow-sm"
            startContent={<Icon icon="lucide:arrow-right-left" width={18} />}
            onPress={onPedidoMasivoOpen}
          >
            Control Masivo
          </Button>
          )}
          {invSyncExcel && (
          <>
            <Button
              color="success"
              variant="flat"
              size="md"
              className="font-bold shadow-sm"
              startContent={<Icon icon="lucide:upload-cloud" width={18} />}
              onPress={() => excelFileInputRef.current?.click()}
            >
              Sincronizar con Excel
            </Button>
            <input
              ref={excelFileInputRef}
              type="file"
              accept=".xlsx,.xlsm,.xls"
              className="hidden"
              onChange={handleExcelFileChange}
            />
          </>
          )}
          {invNuevoProducto && (
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
            onPress={onStockDisponiblesOpen}
            title="Stock Disponible"
            className="bg-default-100 dark:bg-default-50/10"
          >
            <Icon icon="lucide:package-check" className="text-default-600" width={20} />
          </Button>
          )}
        </div>

        {/* Barra de herramientas */}
        <Card className="shadow-sm bg-white dark:bg-content1 border border-default-200 dark:border-default-100 mx-4">
          <CardBody className="p-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="w-full flex flex-col md:flex-row gap-2 md:w-[48%]">
                <Input
                  className="w-full md:w-1/2"
                  placeholder="Buscar código de producto..."
                  value={searchCode}
                  onValueChange={(val) => {
                    setSearchCode(val);
                    if (val) setSearchTerm('');
                  }}
                  startContent={<Icon icon="lucide:barcode" className="text-default-400" />}
                  variant="bordered"
                  classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                  isClearable
                  onClear={() => setSearchCode('')}
                />
                <Input
                  className="w-full md:w-1/2"
                  placeholder="Buscar productos por nombre..."
                  value={searchTerm}
                  onValueChange={(val) => {
                    setSearchTerm(val);
                    if (val) setSearchCode('');
                  }}
                  startContent={<Icon icon="lucide:search" className="text-default-400" />}
                  variant="bordered"
                  classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                  isClearable
                  onClear={() => setSearchTerm('')}
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
                      // Preservar uni- y filtros especiales del estado actual
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
                      <DropdownItem key={filtro.id}>
                        {filtro.nombre}
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </Dropdown>

                {/* Dropdown de Unidades */}
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
                      <DropdownItem key={u.id}>
                        {u.nombre}
                      </DropdownItem>
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
            <div ref={scrollerRef} className="overflow-auto max-h-[calc(100vh-300px)] min-h-[300px] rounded-xl">
              <div className="min-w-[800px] w-full">
        <Table
          aria-label="Tabla de inventario"
          removeWrapper
          layout="fixed"
          classNames={{
            table: "w-full",
            th: "bg-default-100 dark:bg-default-100 text-default-500 font-bold uppercase text-xs h-12 sticky top-0 z-20 border-b border-default-200/50 shadow-sm outline-none text-center",
            td: "py-3 border-b border-default-50 dark:border-default-50/10 group-data-[last=true]:border-none px-4 text-center"
          }}
          bottomContent={
            isLoading && productos.length > 0 ? (
              <div className="py-4">
                <TableSkeleton rows={3} columns={STOCK_TABLE_COLS} />
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
                    setCache({});
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
            <TableColumn width="10%" align="center" className="text-center">STOCK MÍN</TableColumn>
            <TableColumn width="10%" align="center" className="text-center">UNIDAD</TableColumn>
            <TableColumn width="15%" align="center" className="text-center">ESTADO</TableColumn>
            <TableColumn width="10%" align="center" className="text-center">ACCIONES</TableColumn>
          </TableHeader>
          <TableBody
            isLoading={isLoading && productos.length === 0}
            loadingContent={<div className="py-4 w-full"><TableSkeleton rows={8} columns={STOCK_TABLE_COLS} /></div>}
            emptyContent={
              <div className="py-20 text-center text-default-400">
                <Icon icon="lucide:package-open" className="mx-auto mb-4 opacity-50" width={64} />
                <p className="text-xl font-medium">No se encontraron productos</p>
                <p className="text-sm">Ajusta los filtros o agrega un nuevo producto.</p>
              </div>
            }
          >
            {paginatedProductos.map((producto) => (
              <TableRow
                key={producto.id}
                className={`${invEditarProducto ? 'cursor-pointer' : 'cursor-default'} hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors duration-200 border-b border-default-50 dark:border-default-50/10`}
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: '70px 70px'
                } as any}
                onClick={() => invEditarProducto && handleEditarProducto(producto)}
              >
                <TableCell>
                  <Tooltip content={invEditarProducto ? "Control de Inventario" : undefined} isDisabled={!invEditarProducto} color="primary" delay={100} closeDelay={0}>
                    <div className="w-full overflow-hidden text-center flex flex-col items-center">
                      <span className="font-semibold text-secondary dark:text-foreground block truncate w-full">{producto.nombre}</span>
                      {producto.descripcion && (
                        <p className="text-xs text-default-400 truncate w-full">{producto.descripcion}</p>
                      )}
                    </div>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip content={invEditarProducto ? "Control de Inventario" : undefined} isDisabled={!invEditarProducto} color="primary" delay={100} closeDelay={0}>
                    <div className="flex justify-center w-full">
                      <Chip size="sm" variant="flat" className="bg-default-100 dark:bg-default-100/50 text-default-600 dark:text-default-300">
                        {producto.categoria}
                      </Chip>
                    </div>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip content={invEditarProducto ? "Control de Inventario" : undefined} isDisabled={!invEditarProducto} color="primary" delay={100} closeDelay={0}>
                    <span className={`font-bold block text-center ${producto.stock <= producto.stockMinimo ? 'text-danger' : 'text-default-700 dark:text-default-300'}`}>
                      {fmtCL(producto.stock)}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip content={invEditarProducto ? "Control de Inventario" : undefined} isDisabled={!invEditarProducto} color="primary" delay={100} closeDelay={0}>
                    <span className="block text-center">{fmtCL(producto.stockMinimo)}</span>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip content={invEditarProducto ? "Control de Inventario" : undefined} isDisabled={!invEditarProducto} color="primary" delay={100} closeDelay={0}>
                    <span className="text-default-500 block text-center">{producto.unidadMedida}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip content={invEditarProducto ? "Control de Inventario" : undefined} isDisabled={!invEditarProducto} color="primary" delay={100} closeDelay={0} className="w-full">
                    <div className="w-full h-full text-center flex justify-center">{renderStockStatus(producto)}</div>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {historialPuedeLeer && (
                    <Tooltip content="Ver Movimiento" color="secondary" delay={100} closeDelay={0}>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => verMovimientos(producto.id, producto.nombre)}
                        className="text-default-400 hover:text-secondary"
                      >
                        <Icon icon="lucide:arrow-right" width={18} />
                      </Button>
                    </Tooltip>
                    )}

                    {invPuedeEliminar && (
                      <Tooltip content="Eliminar" color="danger" delay={100} closeDelay={0}>
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onPress={() => handleEliminarProducto(producto)}
                          className="text-default-400 hover:text-danger"
                        >
                          <Icon icon="lucide:trash-2" width={18} />
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
              </div>
            </div>
          </CardBody>
        </Card>
        </>
        )}

        {activeTab === 'movimientos' && historialPuedeLeer && (
          <MovimientosHistorial active={activeTab === 'movimientos'} initialNombreProducto={movNombreFiltro} />
        )}

        {/* Modales */}
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg" backdrop="blur" placement="top" scrollBehavior="inside" radius="lg" classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh] mt-4', closeButton: 'hover:bg-default-100 cursor-pointer' }} isDismissable={false}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="border-b border-default-100 dark:border-default-50 bg-white dark:bg-content2">
                  <div className="flex items-center gap-2">
                    <Icon icon={modalMode === 'crear' ? "lucide:plus-circle" : "lucide:package-check"} className="text-primary" width={24} />
                    <span className="font-bold text-lg text-secondary dark:text-foreground">{modalMode === 'crear' ? 'Nuevo Inventario' : 'Control de Inventario'}</span>
                  </div>
                </ModalHeader>
                <ModalBody className="py-6 overflow-y-scroll custom-scrollbar">
                  <FormularioProducto
                    producto={productoSeleccionado}
                    onClose={onClose}
                    mode={modalMode}
                    categorias={categoriasActivas}
                    unidades={unidadesActivas}
                    onConflictSync={handleConflictSync}
                  />
                </ModalBody>
              </>
            )}
          </ModalContent>
        </Modal>

        <Modal key={bulkModalKey} isOpen={isPedidoMasivoOpen} onOpenChange={onPedidoMasivoOpenChange} size="5xl" backdrop="blur" scrollBehavior="inside" radius="lg" classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]', closeButton: 'hover:bg-default-100 cursor-pointer' }} isDismissable={false}>
          <ModalContent>
            {(onClose) => (
              <PedidoMasivoModal
                productos={productos}
                onClose={onClose}
                onNuevoProducto={handleNuevoProducto}
                initialItems={bulkRetryItems}
                puedeAccederAbastBodega={invAbastBodega}
                puedeAccederAbastProv={invAbastProv}
                onOpenGestionAbastecimiento={onAbastecimientoConfigOpen}
                onProcessComplete={(data, retryItems) => {
                  setBulkResult(data);
                  setBulkRetryItems(retryItems);
                  onResultModalOpen();
                }}
              />
            )}
          </ModalContent>
        </Modal>

        <Modal
          backdrop="opaque"
          isOpen={isResultModalOpen}
          onOpenChange={onResultModalOpenChange}
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
                <ModalBody>
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
                              <span><span className="font-semibold">{item.producto}</span> — {item.mensaje}</span>
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
                        // Reabrir modal masivo con los ítems fallidos pre-cargados
                        setBulkModalKey(k => k + 1);
                        onPedidoMasivoOpen();
                      } else {
                        setBulkRetryItems([]);
                        setSearchTerm('');
                        setDebouncedSearchTerm('');
                        setSearchCode('');
                        setDebouncedSearchCode('');
                        searchTermRef.current = '';
                        searchCodeRef.current = '';
                        const defaultFilters = new Set(['todas']);
                        setSelectedFilters(defaultFilters);
                        filtersRef.current = defaultFilters;
                        setCurrentPage(1);
                        cargarProductosPaginados(1, true);
                      }
                    }}
                  >
                    {bulkRetryItems.length > 0 ? 'Corregir errores' : 'Entendido'}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        <GestionCategoriasModal
          isOpen={isCategoriasOpen}
          onOpenChange={onCategoriasOpenChange}
          onRefresh={() => cargarProductosPaginados(1, true)}
        />

        <GestionAbastecimientoModal
          isOpen={isAbastecimientoConfigOpen}
          onOpenChange={onAbastecimientoConfigOpenChange}
        />

        <StockDisponiblesModal
          isOpen={isStockDisponiblesOpen}
          onOpenChange={onStockDisponiblesOpenChange}
        />

        <GestionUnidadesModal
          isOpen={isUnidadesOpen}
          onOpenChange={onUnidadesOpenChange}
          onRefresh={() => cargarProductosPaginados(1, true)}
        />

        <Modal isOpen={showStockWarning} onOpenChange={setShowStockWarning} backdrop="blur" isDismissable={false}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1 items-center pt-8">
                  <div className="p-3 bg-danger-50 rounded-full text-danger-500 mb-2">
                    <Icon icon="lucide:alert-circle" width={40} />
                  </div>
                  <h2 className="text-xl font-bold text-secondary dark:text-foreground">No se puede eliminar</h2>
                </ModalHeader>
                <ModalBody className="text-center pb-6">
                  <p className="text-default-600 text-justify px-4">
                    El inventario <strong>"{productoParaEliminar?.nombre}"</strong> no puede ser eliminado porque aún tiene stock disponible (<strong>{fmtCL(productoParaEliminar?.stock)}</strong>).
                  </p>
                  <div className="flex justify-center mt-4">
                    <Button color="primary" variant="flat" onPress={onClose} className="font-bold">Entendido</Button>
                  </div>
                </ModalBody>
              </>
            )}
          </ModalContent>
        </Modal>


        {/* Modal: Sincronizar Inventario con Excel */}
        <Modal
          isOpen={isSincronizarExcelOpen}
          onOpenChange={onSincronizarExcelOpenChange}
          size="lg"
          backdrop="blur"
          radius="lg"
          scrollBehavior="inside"
          isDismissable={false}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1 pb-2">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:upload-cloud" className="text-success" width={22} />
                    <h2 className="text-lg font-bold text-foreground">
                      Sincronizar Inventario con Excel
                    </h2>
                  </div>
                  {excelPendingFile && (
                    <p className="text-xs text-default-400 font-normal truncate">
                      {excelPendingFile.name}
                    </p>
                  )}
                </ModalHeader>

                <ModalBody className="gap-4 py-4">
                  {/* ── Vista A: Selector de hojas ── */}
                  {excelModalVista === 'hojas' && (
                    <div className="space-y-3">
                      <p className="text-sm text-default-600">
                        Selecciona la hoja del Excel a sincronizar:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {excelSheetOptions.map((hoja) => (
                          <Button
                            key={hoja}
                            size="sm"
                            variant="flat"
                            className="font-medium"
                            onPress={() => handleSeleccionarHojaExcel(hoja)}
                          >
                            {hoja}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Vista B: Configuración ── */}
                  {excelModalVista === 'config' && (
                    <div className="space-y-4">
                      {/* Hoja seleccionada */}
                      <div className="flex items-center gap-2 p-2 bg-default-100 rounded-lg">
                        <Icon icon="lucide:table-2" className="text-default-500 shrink-0" width={16} />
                        <span className="text-sm font-medium text-default-700">
                          Hoja: <span className="text-foreground">{excelSelectedSheet}</span>
                        </span>
                        {excelSheetOptions.length > 1 && (
                          <Button
                            size="sm"
                            variant="light"
                            className="ml-auto text-xs"
                            onPress={() => setExcelModalVista('hojas')}
                          >
                            Cambiar
                          </Button>
                        )}
                      </div>

                      {/* Aviso ESPECIEROS */}
                      {excelEspecierosAviso && (
                        <div className="flex items-start gap-2 p-2 bg-warning-50 rounded-lg border border-warning-200">
                          <Icon icon="lucide:info" className="text-warning-600 shrink-0 mt-0.5" width={15} />
                          <p className="text-xs text-warning-700">
                            Esta hoja tiene encabezado en fila 3. Fila de inicio ajustada a 4.
                          </p>
                        </div>
                      )}

                      {/* Categoría */}
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-default-700">
                          Categoría <span className="text-danger">*</span>
                        </label>
                        <Select
                          placeholder="Selecciona una categoría"
                          selectedKeys={excelSelectedCatId !== null ? [String(excelSelectedCatId)] : []}
                          onSelectionChange={(keys) => {
                            const val = Array.from(keys)[0];
                            setExcelSelectedCatId(val ? Number(val) : null);
                          }}
                          variant="bordered"
                          size="sm"
                          classNames={{ trigger: 'bg-white dark:bg-default-100/50' }}
                        >
                          {categoriasActivas.map((cat) => (
                            <SelectItem key={String(cat.id)}>
                              {cat.nombre}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>

                      {/* Rango de filas */}
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-default-700">
                          Rango de filas del Excel
                        </label>
                        <div className="flex gap-3 items-center">
                          <Input
                            label="Fila inicio"
                            type="number"
                            size="sm"
                            variant="bordered"
                            value={String(excelFilaInicio)}
                            onValueChange={(v) => setExcelFilaInicio(Math.max(1, parseInt(v) || 1))}
                            classNames={{ inputWrapper: 'bg-white dark:bg-default-100/50' }}
                            className="w-32"
                          />
                          <span className="text-default-400 text-sm mt-4">—</span>
                          <Input
                            label="Fila fin"
                            type="number"
                            size="sm"
                            variant="bordered"
                            value={String(excelFilaFin)}
                            onValueChange={(v) => setExcelFilaFin(Math.max(excelFilaInicio, parseInt(v) || excelFilaInicio))}
                            classNames={{ inputWrapper: 'bg-white dark:bg-default-100/50' }}
                            className="w-32"
                          />
                        </div>
                        {excelFilaFin >= excelFilaInicio && (
                          <p className="text-xs text-default-400">
                            {excelFilaFin - excelFilaInicio + 1} fila(s) a procesar
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </ModalBody>

                <ModalFooter className="border-t border-default-100">
                  <Button variant="ghost" onPress={onClose} isDisabled={isSincronizandoExcel}>
                    Cancelar
                  </Button>
                  {excelModalVista === 'config' && (
                    <Button
                      color="success"
                      isDisabled={excelSelectedCatId === null || isSincronizandoExcel}
                      isLoading={isSincronizandoExcel}
                      startContent={!isSincronizandoExcel && <Icon icon="lucide:scan" width={18} />}
                      onPress={handleDoSincronizarExcel}
                    >
                      {isSincronizandoExcel ? 'Procesando...' : 'Procesar Excel'}
                    </Button>
                  )}
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Modal: Resultado Sincronización Excel */}
        <Modal
          isOpen={isExcelResultOpen}
          onOpenChange={onExcelResultOpenChange}
          size="2xl"
          scrollBehavior="inside"
          isDismissable={false}
        >
          <ModalContent>
            {(onClose) => {
              if (!excelResultado) return null;
              const noEncontradosList = excelResultado.resultados.filter(r => r.estado === 'no_encontrado');
              const sincronizadosList = excelResultado.resultados.filter(r => r.estado === 'ok');
              const tieneConCero = noEncontradosList.some(item => (item.stockExcel ?? 0) === 0);
              const incluyeCero = tieneConCero && noEncontradosList.some(
                (item, i) => (item.stockExcel ?? 0) === 0 && excelNoEncontradosSeleccionados.has(i)
              );
              return (
                <>
                  <ModalHeader className="flex items-center gap-2">
                    <Icon icon="lucide:file-check" className="text-success" width={20} />
                    Resultado — Sincronización Excel
                  </ModalHeader>
                  <ModalBody>
                    <div className="flex flex-col gap-4">
                      {/* Chips clickeables para cambiar vista */}
                      <div className="flex gap-3 flex-wrap">
                        {excelResultado.totalSincronizados > 0 && (
                          <Chip
                            color="success"
                            variant={excelResultVista === 'sincronizados' ? 'solid' : 'flat'}
                            className="cursor-pointer"
                            onClick={() => setExcelResultVista('sincronizados')}
                          >
                            {excelResultado.totalSincronizados} sincronizados
                          </Chip>
                        )}
                        {excelResultado.totalNoEncontrados > 0 && (
                          <Chip
                            color="warning"
                            variant={excelResultVista === 'no_encontrados' ? 'solid' : 'flat'}
                            className="cursor-pointer"
                            onClick={() => setExcelResultVista('no_encontrados')}
                          >
                            {excelResultado.totalNoEncontrados} no encontrados
                          </Chip>
                        )}
                        <Chip color="default" variant="flat">
                          {excelResultado.totalFilasProcesadas} filas procesadas
                        </Chip>
                      </div>

                      {/* Vista: sincronizados */}
                      {excelResultVista === 'sincronizados' && sincronizadosList.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-medium text-success-600">Productos actualizados</p>
                          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
                            {sincronizadosList.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 p-2 rounded-lg bg-success-50 dark:bg-success-900/20"
                              >
                                <Icon icon="lucide:check-circle" className="text-success flex-shrink-0" width={16} />
                                <span className="flex-1 text-sm">{item.nombreProducto ?? item.nombreExcel}</span>
                                <span className="text-xs text-default-400 w-16 text-right shrink-0">
                                  {item.unidadMedidaExcel || '—'}
                                </span>
                                <span className="text-xs font-mono text-default-500 shrink-0">
                                  {item.stockAnterior ?? 0} → <span className="text-success-600 font-semibold">{item.stockExcel ?? 0}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vista: no encontrados */}
                      {excelResultVista === 'no_encontrados' && noEncontradosList.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {excelSyncTarget === 'bodega'
                                ? 'Selecciona cuáles registrar en bodega de tránsito'
                                : 'Selecciona cuáles agregar al inventario'}
                            </p>
                            {tieneConCero && (
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  size="sm"
                                  isSelected={incluyeCero}
                                  onValueChange={(checked) => {
                                    setExcelNoEncontradosSeleccionados(prev => {
                                      const next = new Set(prev);
                                      noEncontradosList.forEach((item, i) => {
                                        if ((item.stockExcel ?? 0) === 0) {
                                          checked ? next.add(i) : next.delete(i);
                                        }
                                      });
                                      return next;
                                    });
                                  }}
                                />
                                <span className="text-xs text-default-500">Incluir con stock 0</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
                            {noEncontradosList.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 p-2 rounded-lg bg-default-50 dark:bg-default-100/50"
                              >
                                <Checkbox
                                  isSelected={excelNoEncontradosSeleccionados.has(idx)}
                                  onValueChange={(checked) => {
                                    setExcelNoEncontradosSeleccionados(prev => {
                                      const next = new Set(prev);
                                      checked ? next.add(idx) : next.delete(idx);
                                      return next;
                                    });
                                  }}
                                />
                                <span className="flex-1 text-sm">{item.nombreExcel}</span>
                                <span className="text-xs text-default-400 w-16 text-right shrink-0">
                                  {item.unidadMedidaExcel || '—'}
                                </span>
                                <Chip
                                  size="sm"
                                  color={(item.stockExcel ?? 0) === 0 ? 'warning' : 'default'}
                                  variant="flat"
                                  className="shrink-0 font-mono"
                                >
                                  {item.stockExcel ?? 0}
                                </Chip>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="light" onPress={onClose}>Cerrar</Button>
                    {excelResultVista === 'no_encontrados' && noEncontradosList.length > 0 && (
                      <Button
                        color="primary"
                        isLoading={isIncluyendoNoEncontrados}
                        isDisabled={excelNoEncontradosSeleccionados.size === 0}
                        onPress={handleConfirmarNuevos}
                      >
                        Incluir seleccionados ({excelNoEncontradosSeleccionados.size})
                      </Button>
                    )}
                  </ModalFooter>
                </>
              );
            }}
          </ModalContent>
        </Modal>
        {/* Modal: Categoría no encontrada en sistema */}
        <Modal
          isOpen={isExcelCatNoEncontradaOpen}
          onOpenChange={onExcelCatNoEncontradaOpenChange}
          size="md"
          backdrop="blur"
          radius="lg"
          classNames={{ base: 'rounded-2xl' }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex items-center gap-2">
                  <Icon icon="lucide:alert-triangle" className="text-warning" width={20} />
                  Categoría no reconocida
                </ModalHeader>
                <ModalBody className="pb-2">
                  <p className="text-sm text-default-600">
                    No se encontró ninguna categoría con el nombre{' '}
                    <span className="font-semibold text-foreground">"{excelCatNoEncontradaHoja}"</span>{' '}
                    en el sistema.
                  </p>
                  <p className="text-sm text-default-500 mt-2">
                    Si desea asignar los productos a una categoría existente, selecciónela en el campo de categoría o cree una nueva desde la gestión de categorías.
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button color="primary" onPress={onClose}>
                    Entendido
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Modal: Advertencia categoría de bodega de tránsito */}
        <Modal
          isOpen={isExcelBodegaAdvertenciaOpen}
          onOpenChange={onExcelBodegaAdvertenciaOpenChange}
          size="md"
          backdrop="blur"
          radius="lg"
          isDismissable={false}
          classNames={{ base: 'rounded-2xl' }}
        >
          <ModalContent>
            {(onClose) => {
              const catSeleccionada = categoriasActivas.find(c => c.id === excelSelectedCatId);
              return (
                <>
                  <ModalHeader className="flex items-center gap-2">
                    <Icon icon="lucide:warehouse" className="text-warning" width={20} />
                    Categoría de Bodega de Tránsito
                  </ModalHeader>
                  <ModalBody className="pb-2">
                    <div className="p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-700">
                      <p className="text-sm text-warning-800 dark:text-warning-300">
                        El sistema indica que la categoría{' '}
                        <span className="font-semibold">"{catSeleccionada?.nombre}"</span>{' '}
                        se abastece en <strong>bodega de tránsito</strong>, por lo que en el inventario no debería haber registro de productos de esta categoría.
                      </p>
                    </div>
                    <p className="text-sm text-default-600 mt-3">
                      ¿Desea sincronizar los valores para <strong>bodega de tránsito</strong> en lugar de inventario?
                    </p>
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      variant="ghost"
                      isDisabled={isSincronizandoExcel}
                      onPress={() => { onClose(); doSincronizarInventario(); }}
                    >
                      No, sincronizar inventario
                    </Button>
                    <Button
                      color="warning"
                      isLoading={isSincronizandoExcel}
                      startContent={!isSincronizandoExcel && <Icon icon="lucide:warehouse" width={18} />}
                      onPress={doSincronizarBodega}
                    >
                      Sí, sincronizar bodega
                    </Button>
                  </ModalFooter>
                </>
              );
            }}
          </ModalContent>
        </Modal>

      </motion.div>
    </div>
  );
};



// El componente de fila se eliminó por incompatibilidad con el sistema de colecciones de HeroUI TableBody.
// La optimización se mantiene mediante estilos inline y pre-fetching.

export default InventarioPage;
