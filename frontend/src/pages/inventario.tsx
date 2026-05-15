import React from 'react';
import * as XLSX from 'xlsx';
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
  DateRangePicker
} from '@heroui/react';
import { CalendarDate } from '@internationalized/date';
import { Icon } from '@iconify/react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useHistory } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {IInventoryPageItem, IProducto} from '../types/producto.types';
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
} from '../services/producto-service';
import { useToast, useConfirm } from '../hooks/useToast';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/auth-context';
import { useModulePermission } from '../contexts/permission-context';
import { obtenerCategorias, obtenerUnidades } from '../services/storage-service';
import GestionCategoriasModal from '../components/modals/GestionCategoriasModal';
import GestionUnidadesModal from '../components/modals/GestionUnidadesModal';
import { obtenerCategoriasActivasService } from '../services/categoria-service';
import { obtenerUnidadesActivasService } from '../services/unidad-medida-service';
import { IUnidadMedida, ISincronizarInventarioExcelResultado, IResultadoItemInventarioExcel } from '../types/inventario.types';
import { actualizarBodegaTransitoConProductoService, WarehouseWithProductUpdateDTO, IBodegaStockSyncWarning, IBodegaStockInsuficiente } from '../services/bodega-transito-service';
import {
  obtenerBulkProductoInventoryListingService,
  IBulkProductoInventoryListing,
  bulkUpdateInventoryStockService,
  IBulkProcessResult,
  IStockSyncWarning,
  IStockInsuficiente,
  sincronizarInventarioDesdeExcelService,
  confirmarNuevosProductosExcelService
} from '../services/inventario-service';
import {
  obtenerProyeccionAbastecimientoService,
  IProyeccionAbastecimiento
} from '../services/solicitud-service';

interface ItemPedidoMasivo {
  id: string;
  producto: IBulkProductoInventoryListing;
  delta: number;
  motivo: string;
}

// ── Helpers para sincronización Excel ──
const leerNombresHojas = (file: File): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array', bookSheets: true });
      resolve(wb.SheetNames);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

const normalizarParaMatch = (s: string): string =>
  s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const intentarAutoMatchCategoria = (
  nombreHoja: string,
  categorias: { id: number; nombre: string }[]
): number | null => {
  const norm = normalizarParaMatch(nombreHoja);
  return categorias.find(c => normalizarParaMatch(c.nombre) === norm)?.id ?? null;
};

/**
 * Página de inventario.
 * Muestra una tabla con los productos del inventario y permite realizar operaciones CRUD.
 * 
 * @returns {JSX.Element} La página de inventario.
 */
const InventarioPage: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const esAdministrador = user?.rol === 'Administrador';
  // ── Permisos granulares del módulo INVENTARIO ──
  const { canRead: invPuedeLeer, canCreate: invPuedeCrear, canUpdate: invPuedeEditar, canDelete: invPuedeEliminar } = useModulePermission('INVENTARIO');
  const { canCreate: catPuedeCrear } = useModulePermission('GESTION_CATEGORIAS');
  const { canCreate: uniPuedeCrear } = useModulePermission('GESTION_UNIDADES');
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
  const { isOpen: isSincronizarExcelOpen, onOpen: onSincronizarExcelOpen, onOpenChange: onSincronizarExcelOpenChange } = useDisclosure();
  const { isOpen: isExcelResultOpen, onOpen: onExcelResultOpen, onOpenChange: onExcelResultOpenChange } = useDisclosure();
  const [productoSeleccionado, setProductoSeleccionado] = React.useState<IProducto | null>(null);
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar'>('crear');
  const [showStockWarning, setShowStockWarning] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [productoParaEliminar, setProductoParaEliminar] = React.useState<IProducto | null>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const isScrollingRef = React.useRef(false);
  const isLoadingRef = React.useRef(false);
  const nextPageRef = React.useRef(1); // Tracker para carga secuencial
  const productosLengthRef = React.useRef(0);

  usePageTitle('Inventario', 'Gestione los productos del inventario, vea movimientos y actualice existencias.', 'lucide:package');

  /**
   * Carga los filtros (categorías y unidades) desde el backend.
   */
  const cargarFiltros = React.useCallback(async () => {
    try {
      const [resFiltros, resCategoriasActivas, resUnidadesActivas] = await Promise.all([
        obtenerFiltrosInventarioService(),
        obtenerCategoriasActivasService(),
        obtenerUnidadesActivasService()
      ]);

      setCategoriasFull(resFiltros.categorias ?? []);
      setUnidadesFull(resFiltros.unidades ?? []);

      // Mapear ICategoria[] a coincidir con el formato de categoriasFull
      const activasMapeadas = resCategoriasActivas.map(c => ({
        id: parseInt(c.id),
        nombre: c.nombre
      }));
      setCategoriasActivas(activasMapeadas);
      setUnidadesActivas(resUnidadesActivas);

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
      cargarFiltros();
    }
  }, [isOpen, cargarFiltros]);

  // Cargar productos iniciales
  React.useEffect(() => {
    cargarProductosPaginados(1);
  }, [cargarProductosPaginados]);

  /**
   * Maneja el scroll global para cargar más datos.
   */
  React.useEffect(() => {
    const onScroll = () => {
      if (isLoading || isLoadingRef.current) return;

      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;

      // Gatillo: cargamos cuando faltan 3000px para el final (muy anticipado)
      if (scrollY + windowHeight > fullHeight - 3000) {
        if (productos.length < totalRegistros) {
          const pageToLoad = nextPageRef.current;
          cargarProductosPaginados(pageToLoad);
        }
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
 * Navega a la página de movimientos del producto.
 *
 * @param {string} id - ID del producto.
 * @param {string} nombre - Nombre del producto.
 */
  const verMovimientos = (id: string, nombre: string) => {
    history.push(`/movimientos?productoId=${id}&nombre=${encodeURIComponent(nombre)}`);
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

    // Nueva validación: No se puede eliminar si hay stock
    if (producto.stock > 0) {
      setProductoParaEliminar(producto);
      setShowStockWarning(true);
      return;
    }

    // Si tiene stock 0, proceder con el nuevo modal de confirmación custom
    setProductoParaEliminar(producto);
    setConfirmText('');
    setShowDeleteConfirm(true);
  };

  const handleConfirmarEliminacion = async () => {
    if (!productoParaEliminar) return;

    if (confirmText !== 'CONFIRMAR') {
      toast.warning('Escribe CONFIRMAR para confirmar');
      return;
    }

    const idInventario = (productoParaEliminar as any)._idInventario;
    if (!idInventario) {
      toast.error('No se pudo encontrar el ID de inventario para este producto.');
      return;
    }

    setIsDeleting(true);
    try {
      const exito = await softDeleteInventarioService(idInventario);
      if (exito) {
        toast.success(`Producto "${productoParaEliminar.nombre}" eliminado correctamente.`);
        setShowDeleteConfirm(false);
        setProductoParaEliminar(null);
        // Forzar recarga completa limpiando caché
        setCache({});
        cacheRef.current = {};
        cargarProductosPaginados(currentPage, true);
      } else {
        toast.error('No se pudo eliminar el producto.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el producto.');
    } finally {
      setIsDeleting(false);
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
        setExcelSelectedCatId(intentarAutoMatchCategoria(hoja, categoriasActivas));
        if (hoja === 'ESPECIEROS') { setExcelFilaInicio(4); setExcelFilaFin(29); setExcelEspecierosAviso(true); }
        else { setExcelFilaInicio(2); setExcelFilaFin(500); }
        setExcelModalVista('config');
      } else {
        setExcelFilaInicio(2);
        setExcelFilaFin(500);
        setExcelModalVista('hojas');
      }
      onSincronizarExcelOpen();
    } catch {
      toast.error('No se pudo leer el archivo Excel');
    }
  };

  const handleSeleccionarHojaExcel = (nombreHoja: string) => {
    setExcelSelectedSheet(nombreHoja);
    setExcelSelectedCatId(intentarAutoMatchCategoria(nombreHoja, categoriasActivas));
    if (nombreHoja === 'ESPECIEROS') {
      setExcelFilaInicio(4); setExcelFilaFin(29); setExcelEspecierosAviso(true);
    } else {
      setExcelFilaInicio(2); setExcelFilaFin(500); setExcelEspecierosAviso(false);
    }
    setExcelModalVista('config');
  };

  const handleDoSincronizarExcel = async () => {
    if (!excelPendingFile || !excelSelectedSheet || excelSelectedCatId === null) return;
    setIsSincronizandoExcel(true);
    try {
      const resultado = await sincronizarInventarioDesdeExcelService(
        excelPendingFile, excelFilaInicio, excelFilaFin, excelSelectedCatId, excelSelectedSheet
      );
      setExcelResultado(resultado);
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
      const count = await confirmarNuevosProductosExcelService(items);
      toast.success(`${count} nuevos productos agregados al inventario`);
      onExcelResultOpenChange();
      cargarDatosIniciales();
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
        <div className="flex flex-wrap items-center gap-3 px-4 mt-8 mb-4">
          {invPuedeCrear && (
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
          {invPuedeCrear && (
          <>
            <Button
              color="success"
              variant="flat"
              size="md"
              className="font-bold shadow-sm"
              startContent={<Icon icon="lucide:file-spreadsheet" width={18} />}
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
          {invPuedeCrear && (
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
          {catPuedeCrear && (
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
          {uniPuedeCrear && (
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

        {/* Tabla de productos (Sin Card para sentimiento infinito) */}
        <Table
          aria-label="Tabla de inventario"
          isHeaderSticky
          removeWrapper
          className="min-w-full relative"
          layout="fixed"
          classNames={{
            table: "min-w-full table-fixed border-collapse bg-transparent",
            thead: "[&>tr]:first:shadow-none sticky top-[4rem] z-20",
            th: "bg-default-100 dark:bg-default-100 text-default-500 font-bold uppercase text-xs h-12 sticky top-[4rem] z-20 border-b border-default-200/50 shadow-sm outline-none text-center",
            td: "py-3 border-b border-default-50 dark:border-default-50/10 group-data-[last=true]:border-none px-4 text-center"
          }}
          bottomContent={
            isLoading && productos.length > 0 ? (
              <div className="flex w-full justify-center py-10">
                <Spinner size="lg" label="Cargando existencias..." color="primary" labelColor="primary" />
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
            loadingContent={<div className="py-20 text-center text-primary"><Spinner size="lg" /> <p className="mt-4 font-bold">Cargando inventario...</p></div>}
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
                className={`${invPuedeEditar ? 'cursor-pointer' : 'cursor-default'} hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors duration-200 border-b border-default-50 dark:border-default-50/10`}
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: '70px 70px'
                } as any}
                onClick={() => invPuedeEditar && handleEditarProducto(producto)}
              >
                <TableCell>
                  <Tooltip content={invPuedeEditar ? "Control de Inventario" : undefined} isDisabled={!invPuedeEditar} color="primary" delay={100} closeDelay={0}>
                    <div className="w-full overflow-hidden text-center flex flex-col items-center">
                      <span className="font-semibold text-secondary dark:text-foreground block truncate w-full">{producto.nombre}</span>
                      {producto.descripcion && (
                        <p className="text-xs text-default-400 truncate w-full">{producto.descripcion}</p>
                      )}
                    </div>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip content={invPuedeEditar ? "Control de Inventario" : undefined} isDisabled={!invPuedeEditar} color="primary" delay={100} closeDelay={0}>
                    <div className="flex justify-center w-full">
                      <Chip size="sm" variant="flat" className="bg-default-100 dark:bg-default-100/50 text-default-600 dark:text-default-300">
                        {producto.categoria}
                      </Chip>
                    </div>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip content={invPuedeEditar ? "Control de Inventario" : undefined} isDisabled={!invPuedeEditar} color="primary" delay={100} closeDelay={0}>
                    <span className={`font-bold block text-center ${producto.stock <= producto.stockMinimo ? 'text-danger' : 'text-default-700 dark:text-default-300'}`}>
                      {fmtCL(producto.stock)}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip content={invPuedeEditar ? "Control de Inventario" : undefined} isDisabled={!invPuedeEditar} color="primary" delay={100} closeDelay={0}>
                    <span className="block text-center">{fmtCL(producto.stockMinimo)}</span>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip content={invPuedeEditar ? "Control de Inventario" : undefined} isDisabled={!invPuedeEditar} color="primary" delay={100} closeDelay={0}>
                    <span className="text-default-500 block text-center">{producto.unidadMedida}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip content={invPuedeEditar ? "Control de Inventario" : undefined} isDisabled={!invPuedeEditar} color="primary" delay={100} closeDelay={0} className="w-full">
                    <div className="w-full h-full text-center flex justify-center">{renderStockStatus(producto)}</div>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
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

                    {invPuedeEliminar && (
                      <Tooltip content="Eliminar" color="danger" delay={100} closeDelay={0}>
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          color="danger"
                          onPress={() => handleEliminarProducto(producto)}
                          className="text-default-400 hover:text-danger"
                        >
                          <Icon icon="lucide:trash" width={18} />
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Modales */}
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg" backdrop="blur" placement="top" classNames={{ base: "mt-4" }}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="border-b border-default-100 dark:border-default-50 bg-white dark:bg-content2">
                  <div className="flex items-center gap-2">
                    <Icon icon={modalMode === 'crear' ? "lucide:plus-circle" : "lucide:package-check"} className="text-primary" width={24} />
                    <span className="font-bold text-lg text-secondary dark:text-foreground">{modalMode === 'crear' ? 'Nuevo Inventario' : 'Control de Inventario'}</span>
                  </div>
                </ModalHeader>
                <ModalBody className="py-6">
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

        <Modal key={bulkModalKey} isOpen={isPedidoMasivoOpen} onOpenChange={onPedidoMasivoOpenChange} size="4xl" backdrop="blur" scrollBehavior="inside" radius="lg" classNames={{ base: 'rounded-2xl', body: 'min-h-[520px]' }}>
          <ModalContent>
            {(onClose) => (
              <PedidoMasivoModal
                productos={productos}
                onClose={onClose}
                onNuevoProducto={handleNuevoProducto}
                initialItems={bulkRetryItems}
                puedeAccederAbastecimiento={invPuedeLeer}
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

        <GestionUnidadesModal
          isOpen={isUnidadesOpen}
          onOpenChange={onUnidadesOpenChange}
          onRefresh={() => cargarProductosPaginados(1, true)}
        />

        <Modal isOpen={showStockWarning} onOpenChange={setShowStockWarning} backdrop="blur">
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

        <Modal isOpen={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} backdrop="blur" hideCloseButton>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1 items-center pt-8">
                  <div className="p-3 bg-danger-50 rounded-full text-danger-500 mb-2">
                    <Icon icon="lucide:trash-2" width={40} />
                  </div>
                  <h2 className="text-xl font-bold text-danger">¿Estás seguro?</h2>
                </ModalHeader>
                <ModalBody className="px-8 pb-6">
                  <div className="p-4 bg-danger-50/50 rounded-xl border border-danger-100 mb-4 text-center">
                    <p className="text-danger-700 font-bold mb-1">Confirmar eliminación</p>
                    <p className="text-sm text-danger-600/90 leading-relaxed text-justify">
                      Eliminarás definitivamente el producto <strong>"{productoParaEliminar?.nombre}"</strong>. Esta acción no se puede deshacer.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-default-600 mb-1">
                      <Icon icon="lucide:pen-line" width={16} />
                      <p className="text-sm font-semibold">
                        Escribe <span className="text-danger-600">CONFIRMAR</span> para proceder:
                      </p>
                    </div>
                    <Input
                      placeholder="Escribe CONFIRMAR"
                      value={confirmText}
                      onValueChange={setConfirmText}
                      variant="bordered"
                      isInvalid={confirmText !== '' && confirmText !== 'CONFIRMAR'}
                      classNames={{ inputWrapper: "border-2 group-data-[focus=true]:border-danger-500" }}
                      autoFocus
                    />
                  </div>
                </ModalBody>
                <ModalFooter className="border-t border-default-100 py-4 px-6 gap-3">
                  <Button variant="light" onPress={onClose} isDisabled={isDeleting} className="font-bold text-default-500">Cancelar</Button>
                  <Button color="danger" onPress={handleConfirmarEliminacion} isLoading={isDeleting} isDisabled={confirmText !== 'CONFIRMAR'} className="font-bold px-8 shadow-lg shadow-danger-200">Eliminar</Button>
                </ModalFooter>
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
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1 pb-2">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:file-spreadsheet" className="text-success" width={22} />
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
                            <p className="text-sm font-medium">Selecciona cuáles agregar al inventario</p>
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
      </motion.div>
    </div>
  );
};

interface FormularioProductoProps {
  producto: IProducto | null;
  onClose: () => void;
  mode: 'crear' | 'editar';
  categorias: { id: number; nombre: string }[];
  unidades: IUnidadMedida[];
  onConflictSync?: (producto: IProducto) => void;
  origenContext?: 'inventario' | 'bodega';
}

/**
 * Componente de formulario para crear o editar un producto.
 * 
 * @param {FormularioProductoProps} props - Propiedades del componente.
 * @returns {JSX.Element} El formulario de producto.
 */
export const FormularioProducto: React.FC<FormularioProductoProps> = ({ producto, onClose, mode, categorias, unidades, onConflictSync, origenContext = 'inventario' }) => {
  const toast = useToast();
  const [nombre, setNombre] = React.useState(producto?.nombre || '');
  const [codProducto, setCodProducto] = React.useState((producto as any)?.codProducto || '');
  const [descripcion, setDescripcion] = React.useState(producto?.descripcion || '');
  const [idCategoria, setIdCategoria] = React.useState<string>(() => {
    if (producto?.categoria) {
      const cat = categorias.find(c => c.nombre === producto.categoria);
      return cat ? cat.id.toString() : '';
    }
    return '';
  });
  const [idUnidadMedida, setIdUnidadMedida] = React.useState<string>(() => {
    if (producto?.unidadMedida) {
      const uni = unidades.find(u => u.nombre === producto.unidadMedida);
      return uni ? uni.id.toString() : '';
    }
    return '';
  });
  const [stock, setStock] = React.useState(producto?.stock?.toString() || '0');
  const [stockMinimo, setStockMinimo] = React.useState(producto?.stockMinimo?.toString() || '0');
  const [tipoMovimiento, setTipoMovimiento] = React.useState('');
  const [deltaInput, setDeltaInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [mostrarAbreviatura, setMostrarAbreviatura] = React.useState(false);
  const [editandoDatosBasicos, setEditandoDatosBasicos] = React.useState(mode === 'crear');

  // Determinar si la unidad actual es fraccionaria
  const esUnidadFraccionaria = React.useMemo(() => {
    if (!idUnidadMedida) return true; // Por defecto permitir decimales si no hay unidad
    const uni = unidades.find(u => u.id.toString() === idUnidadMedida);
    return uni ? uni.esFraccionario : true;
  }, [idUnidadMedida, unidades]);

  // Limpiar decimales si se cambia a una unidad no fraccionaria
  React.useEffect(() => {
    if (!esUnidadFraccionaria) {
      const limpiarDecimales = (val: string) => {
        if (!val) return '0';
        const num = parseFloat(val);
        return isNaN(num) ? '0' : Math.floor(num).toString();
      };

      const newStock = limpiarDecimales(stock);
      const newStockMin = limpiarDecimales(stockMinimo);

      if (newStock !== stock) setStock(newStock);
      if (newStockMin !== stockMinimo) setStockMinimo(newStockMin);
    }
  }, [esUnidadFraccionaria, stock, stockMinimo]);

  // Reset delta when motivo changes; for AJUSTE pre-fill with current stock
  React.useEffect(() => {
    if (tipoMovimiento === 'AJUSTE_INVENTARIO') {
      setDeltaInput(producto?.stock?.toString() || '0');
    } else {
      setDeltaInput('');
    }
  }, [tipoMovimiento, producto?.stock]);

  // Estado local para el producto de referencia (usado para validaciones de stock y cambios)
  // Se inicializa con el prop 'producto' pero puede actualizarse en caso de conflicto (409)
  const [productoReferencia, setProductoReferencia] = React.useState<IProducto | null>(producto);

  const handleSubmit = async () => {
    // Validaciones
    if (!nombre.trim()) {
      toast.warning('El nombre del producto es requerido');
      return;
    }
    if (!idCategoria) {
      toast.warning('La categoría es requerida');
      return;
    }
    if (!idUnidadMedida) {
      toast.warning('La unidad de medida es requerida');
      return;
    }

    const stockNum = parseFloat(stock);
    const stockMinNum = parseFloat(stockMinimo);

    if (isNaN(stockNum)) {
      toast.warning('El stock es requerido y debe ser un número');
      return;
    }
    if (stockNum < 0) {
      toast.warning('El stock no puede ser negativo');
      return;
    }
    if (!isNaN(stockMinNum) && stockMinNum < 0) {
      toast.warning('El stock mínimo no puede ser negativo');
      return;
    }
    const originalStockRef = parseFloat(productoReferencia?.stock?.toString() || '0');
    if (mode === 'editar' && !tipoMovimiento && stockNum !== originalStockRef) {
      toast.warning('El motivo (Tipo de Movimiento) es requerido para cambiar el stock');
      return;
    }

    try {
      setIsLoading(true);

      if (mode === 'crear') {
        // Crear nuevo producto usando el servicio
        const datosProducto = {
          nombre: nombre.trim(),
          codProducto: codProducto.trim() || undefined,
          descripcion: descripcion.trim(),
          idCategoria: parseInt(idCategoria),
          idUnidadMedida: parseInt(idUnidadMedida),
          stock: parseFloat(stock) || 0,
          stockMinimo: parseFloat(stockMinimo) || 0,
        };

        await crearProductoService(datosProducto);
        toast.success('Producto creado exitosamente');
      } else {
        // Actualizar producto existente usando el servicio
        if (!producto?.id) {
          throw new Error('ID de producto no encontrado');
        }

        const catNombre = categorias.find(c => c.id.toString() === idCategoria)?.nombre || '';
        const uniNombre = unidades.find(u => u.id.toString() === idUnidadMedida)?.nombre || '';

        const stockActualizado = parseFloat(stock) || 0;
        const stockCambiado = (producto?.stock ?? 0) !== stockActualizado;

        if (origenContext === 'bodega') {
          // --- LÓGICA BODEGA: PATCH con delta (igual que inventario) ---
          const originalStockRef = parseFloat(productoReferencia?.stock?.toString() || '0');
          const deltaInputVal = parseFloat(deltaInput);
          const hayMovBodega = tipoMovimiento && !isNaN(deltaInputVal) && deltaInputVal > 0;
          const datosBodega: WarehouseWithProductUpdateDTO = {
            idBodegaTransito: (producto as any)._idBodegaTransito || 0,
            idInventario: producto._idInventario || 0,
            idProducto: parseInt(producto.id),
            tipoMovimiento: hayMovBodega ? tipoMovimiento : null,
            nombreProducto: nombre.trim(),
            codigoProducto: codProducto.trim() || undefined,
            descripcionProducto: descripcion.trim(),
            idCategoria: parseInt(idCategoria),
            idUnidadMedida: parseInt(idUnidadMedida),
            stock: originalStockRef,
            stockLimit: parseFloat(stockMinimo) || 0,
            delta: hayMovBodega ? deltaInputVal : null,
            stockEnVista: originalStockRef,
          };

          const resultadoBodega = await actualizarBodegaTransitoConProductoService(datosBodega);

          // 422: stock insuficiente — NO cerrar, actualizar stock en modal
          if ('insuficiente' in resultadoBodega && resultadoBodega.insuficiente === true) {
            const insuf = resultadoBodega as IBodegaStockInsuficiente;
            toast.error(insuf.warning);
            const realStock = insuf.item.stock;
            setProductoReferencia(prev => prev ? { ...prev, stock: realStock } : prev);
            if (onConflictSync) {
              onConflictSync({ ...producto, stock: realStock } as IProducto);
            }
            setDeltaInput('');
            return;
          }

          // 409: desincronizado pero guardado — cerrar + toast warning
          if ('desync' in resultadoBodega && resultadoBodega.desync === true) {
            const sync = resultadoBodega as IBodegaStockSyncWarning;
            if (onConflictSync) {
              onConflictSync({ ...producto, stock: sync.item.stock } as IProducto);
            }
            toast.warning(sync.warning, { duration: 20000 });
          } else {
            toast.success('Cambios guardados exitosamente en la bodega');
          }
        } else {
          // --- LÓGICA INVENTARIO: PATCH con delta ---
          const originalStockRef = parseFloat(productoReferencia?.stock?.toString() || '0');
          const isAjusteMode = tipoMovimiento === 'AJUSTE_INVENTARIO';
          const deltaInputVal = parseFloat(deltaInput);

          let deltaFinal = 0;
          let ajustePositivoVal: boolean | null = null;

          if (tipoMovimiento) {
            if (isAjusteMode) {
              deltaFinal = Math.abs(deltaInputVal - originalStockRef);
              ajustePositivoVal = deltaInputVal > originalStockRef;
            } else {
              deltaFinal = deltaInputVal;
            }
          }

          const datosActualizacion = {
            id: producto.id,
            idInventario: producto._idInventario || 0,
            nombre: nombre.trim(),
            codProducto: codProducto.trim() || undefined,
            descripcion: descripcion.trim(),
            categoria: catNombre,
            unidadMedida: uniNombre,
            idCategoria: parseInt(idCategoria),
            idUnidadMedida: parseInt(idUnidadMedida),
            stock: originalStockRef,
            stockMinimo: parseFloat(stockMinimo) || 0,
            tipoMovimiento: tipoMovimiento,
            stockEnVista: originalStockRef,
            delta: deltaFinal,
            ajustePositivo: ajustePositivoVal,
          };

          const resultado = await actualizarProductoService(datosActualizacion);

          // 422: stock insuficiente con desync — mostrar error, actualizar stock en modal, NO cerrar
          if ('insuficiente' in resultado && resultado.insuficiente === true) {
            const insuf = resultado as any;
            toast.error(insuf.warning);
            const realStock = insuf.item.stockActual ?? ('stock' in insuf.item ? insuf.item.stock : undefined);
            setProductoReferencia(prev => prev ? { ...prev, stock: realStock } : prev);
            if (onConflictSync && realStock !== undefined) {
              onConflictSync({
                ...producto,
                stock: realStock,
                stockMinimo: insuf.item.stockMinimo ?? ('stockLimit' in insuf.item ? insuf.item.stockLimit : producto.stockMinimo),
                _idInventario: insuf.item.idInventario ?? ('_idInventario' in producto ? producto._idInventario : undefined),
              } as IProducto);
            }
            setDeltaInput('');
            return;
          }

          // Determinar si fue desync (409 operativo) o éxito limpio (200)
          let itemActualizado: IInventoryPageItem;
          if ('desync' in resultado && resultado.desync === true) {
            itemActualizado = (resultado as any).item;
          } else if ('insuficiente' in resultado && resultado.insuficiente === true) {
            itemActualizado = (resultado as any).item;
          } else {
            itemActualizado = resultado as any;
          }

          // Sync the item in the parent list
          if (onConflictSync && itemActualizado) {
            const syncedProducto: IProducto = {
              id: itemActualizado.producto?.idProducto?.toString() ?? producto.id,
              nombre: itemActualizado.producto?.nombre ?? nombre.trim(),
              descripcion: itemActualizado.producto?.descripcionProducto ?? '',
              codProducto: itemActualizado.producto?.codProducto,
              categoria: itemActualizado.producto?.categoria?.nombre ?? catNombre,
              unidadMedida: itemActualizado.producto?.unidad?.nombre ?? uniNombre,
              stock: itemActualizado.stockActual ?? ('stock' in itemActualizado ? itemActualizado.stock : originalStockRef),
              stockMinimo: itemActualizado.stockMinimo ?? (parseFloat(stockMinimo) || 0),
              fechaCreacion: new Date().toISOString(),
              fechaActualizacion: new Date().toISOString(),
              _idInventario: itemActualizado.idInventario,
            } as IProducto;
            onConflictSync(syncedProducto);
          }

          if ('desync' in resultado && resultado.desync === true) {
            if ('warning' in resultado) {
              toast.warning(((resultado as any).warning || 'Stock desincronizado'), { duration: 20000 });
            }
          } else {
            toast.success('Cambios guardados exitosamente');
          }
        }
      }

      // Despachar evento personalizado para notificar el cambio
      window.dispatchEvent(new Event('productosActualizados'));

      onClose();
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar el producto';

      if (error.status === 410) {
        toast.error(errorMessage, 'Operación cancelada');
        window.dispatchEvent(new Event('productosActualizados'));
        onClose();
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = React.useMemo(() => {
    if (mode === 'crear') return true;
    if (!productoReferencia) return false;

    const originalCategoria = productoReferencia.categoria ? categorias.find(c => c.nombre === productoReferencia.categoria)?.id.toString() || '' : '';
    const originalUnidad = productoReferencia.unidadMedida ? unidades.find(u => u.nombre === productoReferencia.unidadMedida)?.id.toString() || '' : '';
    const originalCodProducto = (productoReferencia as any).codProducto || '';
    const originalDescripcion = productoReferencia.descripcion || '';
    const originalStock = productoReferencia.stock?.toString() || '0';
    const originalStockMinimo = productoReferencia.stockMinimo?.toString() || '0';

    const stockChanged = tipoMovimiento !== '' && deltaInput !== '';

    return (
      nombre.trim() !== (productoReferencia.nombre || '') ||
      codProducto.trim() !== originalCodProducto ||
      descripcion.trim() !== originalDescripcion ||
      idCategoria !== originalCategoria ||
      idUnidadMedida !== originalUnidad ||
      stockChanged ||
      stockMinimo.trim() !== originalStockMinimo
    );
  }, [mode, productoReferencia, nombre, codProducto, descripcion, idCategoria, idUnidadMedida, stock, stockMinimo, tipoMovimiento, deltaInput, categorias, unidades]);

  // Validaciones de lógica de Stock vs Motivo
  const originalStockVal = parseFloat(productoReferencia?.stock?.toString() || '0');
  const currentStockVal = parseFloat(stock); // used in create mode

  // Delta-based logic for edit mode (inventario + bodega)
  const isAjusteEdit = tipoMovimiento === 'AJUSTE_INVENTARIO' || tipoMovimiento === 'AJUSTE_BODEGA';
  const esSalidaEdit = ['SALIDA_INVENTARIO', 'TRASLADO', 'MERMA_INVENTARIO', 'SALIDA_BODEGA', 'MERMA_BODEGA', 'DEVOLUCION'].includes(tipoMovimiento);
  const deltaVal = parseFloat(deltaInput);
  const stockFinal = isAjusteEdit
    ? (deltaInput === '' ? originalStockVal : deltaVal)
    : esSalidaEdit
      ? originalStockVal - (isNaN(deltaVal) ? 0 : deltaVal)
      : originalStockVal + (isNaN(deltaVal) ? 0 : deltaVal);

  let deltaError = '';
  if (mode === 'editar' && tipoMovimiento && deltaInput !== '') {
    if (isAjusteEdit) {
      if (isNaN(deltaVal) || deltaVal < 0) deltaError = 'El nuevo stock no puede ser negativo';
      else if (deltaVal === originalStockVal) deltaError = 'El nuevo stock es igual al actual, sin cambios';
    } else {
      if (isNaN(deltaVal) || deltaVal <= 0) deltaError = 'La cantidad debe ser mayor a 0';
      else if (esSalidaEdit && stockFinal < 0) deltaError = `Stock insuficiente (actual: ${fmtCL(originalStockVal)})`;
    }
  }

  let stockError = '';
  let diffText = '';

  const motivoDescripcion = React.useMemo(() => {
    switch (tipoMovimiento) {
      case 'ENTRADA_INVENTARIO': return "Entrada de insumos al inventario";
      case 'ENTRADA_BODEGA': return "Entrada de insumos a la bodega de tránsito";
      case 'SALIDA_INVENTARIO':
      case 'SALIDA_BODEGA':
        return origenContext === 'bodega'
          ? "Salida de insumos de la bodega de tránsito"
          : "Salida de insumos del inventario";
      case 'TRASLADO':
        return origenContext === 'bodega'
          ? "Mover de regreso al inventario principal"
          : "Mover hacia la bodega de tránsito";
      case 'DEVOLUCION':
        return "Registrar devolución de insumos al inventario";
      case 'AJUSTE_INVENTARIO':
      case 'AJUSTE_BODEGA': return "Ajustar stock actual";
      case 'MERMA_INVENTARIO':
      case 'MERMA_BODEGA': return "Salida de insumos por daño/pérdida";
      default: return "";
    }
  }, [tipoMovimiento, origenContext]);

  const motivoLabel: Record<string, string> = {
    ENTRADA_INVENTARIO: 'Entrada', ENTRADA_BODEGA: 'Entrada',
    SALIDA_INVENTARIO: 'Salida', SALIDA_BODEGA: 'Salida',
    TRASLADO: 'Traslado', DEVOLUCION: 'Devolución',
    AJUSTE_INVENTARIO: 'Ajuste', AJUSTE_BODEGA: 'Ajuste',
    MERMA_INVENTARIO: 'Merma', MERMA_BODEGA: 'Merma',
  };

  const isFormInvalid =
    !nombre.trim() ||
    !idCategoria ||
    !idUnidadMedida ||
    (mode === 'crear' && (!stock.trim() || isNaN(parseFloat(stock)) || parseFloat(stock) < 0)) ||
    (mode === 'editar' && tipoMovimiento !== '' && (deltaInput === '' || !!deltaError)) ||
    (stockMinimo.trim() !== '' && (isNaN(parseFloat(stockMinimo)) || parseFloat(stockMinimo) < 0)) ||
    !hasChanges;

  return (
    <div className="space-y-4">
      {mode === 'editar' && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-default-600 font-bold">
            <Icon icon="lucide:package-2" width={20} />
            <span>Datos del Producto</span>
          </div>
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            color="warning"
            onPress={() => setEditandoDatosBasicos(!editandoDatosBasicos)}
            title={editandoDatosBasicos ? "Cerrar campos" : "Habilitar edición de campos básicos"}
            className="shadow-sm"
          >
            <Icon icon={editandoDatosBasicos ? "lucide:lock" : "lucide:edit-2"} width={16} />
          </Button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {(mode === 'crear' || editandoDatosBasicos) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 overflow-hidden"
          >
            <Input
              label="Nombre"
              placeholder="Nombre del producto"
              value={nombre}
              onValueChange={setNombre}
              isRequired
              variant="bordered"
              maxLength={100}
              description={`${nombre.length}/100`}
              isDisabled={!editandoDatosBasicos && mode !== 'crear'}
              classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
            />

            <Input
              label="Código de producto (Opcional)"
              placeholder="Ej: PRD-001"
              value={codProducto}
              onValueChange={setCodProducto}
              variant="bordered"
              maxLength={25}
              description={`${codProducto.length}/25`}
              isDisabled={!editandoDatosBasicos && mode !== 'crear'}
              classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
            />

            <Input
              label="Descripción (Opcional)"
              placeholder="Descripción del producto"
              value={descripcion}
              onValueChange={setDescripcion}
              variant="bordered"
              maxLength={100}
              description={`${descripcion.length}/100`}
              isDisabled={!editandoDatosBasicos && mode !== 'crear'}
              classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Categoría"
                placeholder="Seleccione..."
                selectedKeys={idCategoria ? [idCategoria] : []}
                onChange={(e: any) => setIdCategoria(e.target.value)}
                isRequired
                variant="bordered"
                isDisabled={!editandoDatosBasicos && mode !== 'crear'}
                classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
              >
                {categorias.map(cat => (
                  <SelectItem key={cat.id.toString()}>{cat.nombre}</SelectItem>
                ))}
              </Select>

              <div className="relative">
                <Select
                  label="Unidad de Medida"
                  placeholder="Seleccione..."
                  selectedKeys={idUnidadMedida ? [idUnidadMedida] : []}
                  onChange={(e: any) => setIdUnidadMedida(e.target.value)}
                  isRequired
                  variant="bordered"
                  isDisabled={!editandoDatosBasicos && mode !== 'crear'}
                  classNames={{ trigger: "bg-white dark:bg-default-100/50 pr-10" }}
                >
                  {unidades.map(uni => (
                    <SelectItem key={uni.id.toString()}>
                      {mostrarAbreviatura ? uni.abreviatura : uni.nombre}
                    </SelectItem>
                  ))}
                </Select>
                <div className="absolute right-10 top-1/2 -translate-y-1/2 z-10">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => setMostrarAbreviatura(!mostrarAbreviatura)}
                    className="text-default-400 hover:text-primary min-w-unit-6 h-6"
                    title={mostrarAbreviatura ? "Mostrar nombres completos" : "Mostrar abreviaturas"}
                  >
                    <motion.div
                      animate={{ rotate: mostrarAbreviatura ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center justify-center"
                    >
                      <Icon icon="lucide:arrow-left-right" width={16} />
                    </motion.div>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mode === 'editar' && (
        <div className="pt-2">
          {motivoDescripcion ? (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-secondary/5 rounded-medium border border-secondary/10 dark:bg-white/5 dark:border-white/10"
            >
              <p className="text-secondary dark:text-foreground text-sm font-medium flex items-center gap-2">
                <Icon icon="lucide:info" width={16} className="text-secondary" />
                {motivoDescripcion}
              </p>
            </motion.div>
          ) : (
            <hr className="border-default-100 mb-4" />
          )}
          <div className="flex items-center gap-2 mb-4 text-warning font-bold">
            <Icon icon="lucide:arrow-up-down" width={20} />
            <span>Flujo de Stock</span>
          </div>
        </div>
      )}

      {mode === 'editar' && (
        <p className="text-xs text-default-500 px-0.5 mb-1">
          Stock Actual: <span className="font-semibold text-secondary">{fmtCL(originalStockVal)}</span>
        </p>
      )}

      <div className={`grid grid-cols-1 ${mode === 'editar' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>

        {mode === 'editar' && (() => {
          const opcionesMotivo = origenContext === 'bodega'
            ? [
                { key: 'ENTRADA_BODEGA', label: 'Entrada' },
                { key: 'DEVOLUCION', label: 'Devolución' },
                { key: 'AJUSTE_BODEGA', label: 'Ajuste' },
                { key: 'SALIDA_BODEGA', label: 'Salida' },
                { key: 'MERMA_BODEGA', label: 'Merma' },
              ]
            : [
                { key: 'ENTRADA_INVENTARIO', label: 'Entrada' },
                { key: 'TRASLADO', label: 'Traslado' },
                { key: 'AJUSTE_INVENTARIO', label: 'Ajuste' },
                { key: 'SALIDA_INVENTARIO', label: 'Salida' },
                { key: 'MERMA_INVENTARIO', label: 'Merma' },
              ];

          return (
            <Select
              label="Motivo"
              placeholder="Seleccione..."
              selectedKeys={tipoMovimiento ? [tipoMovimiento] : []}
              onChange={(e: any) => setTipoMovimiento(e.target.value)}
              isRequired
              variant="bordered"
              classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
            >
              {opcionesMotivo.map(opcion => (
                <SelectItem key={opcion.key} textValue={opcion.label}>
                  <Tooltip content={opcion.label} placement="right" closeDelay={0} isDisabled={opcion.key !== 'SALIDA_INVENTARIO' && opcion.key !== 'TRASLADO' && opcion.key !== 'SALIDA_BODEGA' && opcion.key !== 'DEVOLUCION'}>
                    <span className="w-full inline-block">{opcion.label}</span>
                  </Tooltip>
                </SelectItem>
              ))}
            </Select>
          );
        })()}

        {mode === 'editar' ? (
          <Input
            type="number"
            label={isAjusteEdit ? 'Nuevo Stock' : 'Cantidad'}
            placeholder={isAjusteEdit ? `Actual: ${fmtCL(originalStockVal)}` : 'Ingrese la cantidad...'}
            value={deltaInput}
            onValueChange={(val) => {
              if (val === '') { setDeltaInput(''); return; }
              const regex = esUnidadFraccionaria ? /^\d{0,7}(\.\d{0,3})?$/ : /^\d{0,7}$/;
              if (regex.test(val)) setDeltaInput(val);
            }}
            min={isAjusteEdit ? '0' : '0.001'}
            step={esUnidadFraccionaria ? '0.001' : '1'}
            isRequired={!!tipoMovimiento}
            isDisabled={!tipoMovimiento}
            isInvalid={!!deltaError}
            errorMessage={deltaError}
            description={
              deltaInput !== '' && !isNaN(deltaVal) && !deltaError
                ? `Stock Final: ${fmtCL(stockFinal)}`
                : undefined
            }
            variant="bordered"
            classNames={{ inputWrapper: 'bg-white dark:bg-default-100/50' }}
          />
        ) : (
          <Input
            type="number"
            label="Stock"
            placeholder="Stock actual"
            value={stock}
            onValueChange={(val) => {
              if (val === '') { setStock(''); return; }
              const regex = esUnidadFraccionaria ? /^\d{0,7}(\.\d{0,3})?$/ : /^\d{0,7}$/;
              if (regex.test(val)) setStock(val);
            }}
            min="0"
            max="9999999.999"
            step={esUnidadFraccionaria ? "0.001" : "1"}
            isRequired
            variant="bordered"
            classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
          />
        )}

        <Input
          type="number"
          label={<span className="whitespace-nowrap truncate max-w-full">{origenContext === 'bodega' ? 'Stock Máx. (Opcional)' : 'Stock Mín. (Opcional)'}</span>}
          placeholder={origenContext === 'bodega' ? 'Stock máximo' : 'Stock mínimo'}
          value={stockMinimo}
          onValueChange={(val) => {
            if (val === '') {
              setStockMinimo('');
              return;
            }

            // Regex dinámico según si es fraccionario o no
            const regex = esUnidadFraccionaria
              ? /^\d{0,7}(\.\d{0,3})?$/
              : /^\d{0,7}$/;

            if (regex.test(val)) {
              setStockMinimo(val);
            }
          }}
          min="0"
          max="9999999.999"
          step={esUnidadFraccionaria ? "0.001" : "1"}
          variant="bordered"
          classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
        />

      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-default-100 mt-4">
        <Button variant="ghost" onPress={onClose} isDisabled={isLoading} className="font-medium">
          Cancelar
        </Button>
        <Button
          color="primary"
          variant="solid"
          onPress={handleSubmit}
          isLoading={isLoading}
          isDisabled={isFormInvalid || isLoading}
          className="font-bold text-secondary shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          startContent={<Icon icon="lucide:save" />}
        >
          {mode === 'crear' ? 'Crear Inventario' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
};

/**
 * Interfaz para las propiedades del modal de pedido masivo
 */
interface PedidoMasivoModalProps {
  productos: IProducto[];
  onClose: () => void;
  onNuevoProducto?: () => void;
  initialItems?: ItemPedidoMasivo[];
  onProcessComplete?: (data: IBulkProcessResult, retryItems: ItemPedidoMasivo[]) => void;
  puedeAccederAbastecimiento?: boolean;
}

/**
 * Modal para realizar pedidos masivos hacia bodega de tránsito
 */
const PedidoMasivoModal: React.FC<PedidoMasivoModalProps> = ({ onClose, onNuevoProducto, onProcessComplete, initialItems, puedeAccederAbastecimiento = false }) => {
  const toast = useToast();
  const [itemsPedido, setItemsPedido] = React.useState<ItemPedidoMasivo[]>(initialItems ?? []);
  const [productoSeleccionado, setProductoSeleccionado] = React.useState<string>('');
  const [stockInput, setStockInput] = React.useState<string>('');
  const [motivo, setMotivo] = React.useState<string>('');

  // Estados para modal de proyección de abastecimiento
  const { isOpen: isProyeccionOpen, onOpen: onProyeccionOpen, onOpenChange: onProyeccionOpenChange } = useDisclosure();
  const [dateRangeProyeccion, setDateRangeProyeccion] = React.useState<{ start: CalendarDate; end: CalendarDate } | null>(null);
  const [loadingProy, setLoadingProy] = React.useState(false);

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

  const cargarProyeccionAbastecimiento = async () => {
    if (!dateRangeProyeccion || !dateRangeProyeccion.start || !dateRangeProyeccion.end) {
      toast.error('Debe seleccionar un rango de fechas válido');
      return;
    }

    const fechaInicioProy = `${dateRangeProyeccion.start.year}-${String(dateRangeProyeccion.start.month).padStart(2, '0')}-${String(dateRangeProyeccion.start.day).padStart(2, '0')}`;
    const fechaFinProy = `${dateRangeProyeccion.end.year}-${String(dateRangeProyeccion.end.month).padStart(2, '0')}-${String(dateRangeProyeccion.end.day).padStart(2, '0')}`;

    try {
      setLoadingProy(true);
      const proyeccion = await obtenerProyeccionAbastecimientoService(fechaInicioProy, fechaFinProy);

      if (!proyeccion.proyeccionAbastecimiento || proyeccion.proyeccionAbastecimiento.length === 0) {
        toast.warning('No hay datos de proyección para el rango de fechas seleccionado');
        return;
      }

      // Convertir los productos de la proyección a ItemPedidoMasivo
      // Todos se agregan con motivo "ENTRADA_INVENTARIO" (acción por defecto)
      const nuevosMotivoEntrante = 'ENTRADA_INVENTARIO';
      const nuevosItems: ItemPedidoMasivo[] = proyeccion.proyeccionAbastecimiento.map((producto) => {
        // Obtener stock actual e idInventario de la proyección (sincronización correcta con BD)
        const stockActual = producto.stock;
        const idInventarioActual = producto.idInventario;

        const bulkProducto: IBulkProductoInventoryListing = {
          idProducto: producto.idProducto,
          idInventario: idInventarioActual,
          nombreProducto: producto.nombreProducto,
          detalles: `${producto.nombreUnidad} (${producto.abreviatura})`,
          stock: stockActual,
          esFraccionario: producto.esFraccionario,
        };

        return {
          id: Date.now().toString() + Math.random(),
          producto: bulkProducto,
          delta: producto.cantidadTotalSolicitada,
          motivo: nuevosMotivoEntrante,
        };
      });

      // Agregar a la lista existente
      setItemsPedido([...itemsPedido, ...nuevosItems]);
      toast.success(`${nuevosItems.length} producto(s) cargado(s) desde la proyección`);

      // Cerrar el modal y limpiar campos
      onProyeccionOpenChange();
      setDateRangeProyeccion(null);
    } catch (error: any) {
      console.error('Error al cargar proyección:', error);
      if (error.response?.status === 403) {
        toast.error('No tiene permisos para acceder a esta funcionalidad');
      } else {
        toast.error('Error al cargar la proyección de abastecimiento');
      }
    } finally {
      setLoadingProy(false);
    }
  };

  const vaciarLista = () => {
    setItemsPedido([]);
  };

  const procesarPedido = async () => {
    if (itemsPedido.length === 0) return;

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

      const payload = [...itemsPedido]
        .sort((a, b) => (motivoProcesarOrder[a.motivo] ?? 99) - (motivoProcesarOrder[b.motivo] ?? 99))
        .map(item => ({
          idInventario: item.producto.idInventario,
          delta: item.delta,
          stockEnVista: item.producto.stock,
          tipoMovimiento: item.motivo,
        }));

      const result: IBulkProcessResult = await bulkUpdateInventoryStockService(payload);

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

  return (
    <div className="flex flex-col w-full overflow-hidden rounded-2xl">
      <ModalHeader className="flex flex-col gap-3 border-b border-default-100 dark:border-default-50 bg-white dark:bg-content2 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-secondary dark:text-foreground">Control de Stock Masivo</h2>
            <p className="text-sm font-medium text-default-500 mt-1">
              Registre entradas, salidas, mermas, ajustes o traslados de múltiples productos de forma estructurada.
            </p>
          </div>
          <Button
            isIconOnly
            variant="light"
            color="primary"
            size="lg"
            onPress={onProyeccionOpen}
            isDisabled={!puedeAccederAbastecimiento}
            title={puedeAccederAbastecimiento ? "Cargar proyección de abastecimiento por pedido" : "No tiene permisos para acceder a esta funcionalidad"}
            className="shrink-0"
          >
            <Icon icon="lucide:package-plus" width={22} />
          </Button>
        </div>
      </ModalHeader>
      <ModalBody className="px-4 py-3 space-y-3">
          <AnimatePresence initial={false}>
            {!listadoExpandido && (
              <motion.div
                key="form-masivo"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
                transition={{ duration: 0.25 }}
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

          <AnimatePresence>
            {motivo && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="overflow-hidden"
              >
                <div className="p-3 bg-secondary/5 rounded-medium border border-secondary/10 dark:bg-white/5 dark:border-white/10 mt-2">
                  <p className="text-secondary dark:text-foreground text-sm font-medium flex items-center gap-2">
                    <Icon icon="lucide:info" width={16} className="text-secondary shrink-0" />
                    {(() => {
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
                    })()}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

              <div className={`transition-all duration-300 ${listadoExpandido ? 'max-h-[65vh]' : 'max-h-52'} overflow-y-auto`}>
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
                            <p className="text-xs text-default-400">{item.producto.detalles}</p>
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
                              color="danger"
                              size="sm"
                              onPress={() => eliminarItem(item.id)}
                              className="text-danger-400 hover:text-danger"
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

      <ModalFooter className="bg-default-50 border-t border-default-100 flex justify-end items-center w-full gap-2">
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

      {/* Modal de Proyección de Abastecimiento */}
      <Modal isOpen={isProyeccionOpen} onOpenChange={onProyeccionOpenChange} size="md" backdrop="blur" radius="lg">
        <ModalContent>
          {(onProyeccionClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-secondary dark:text-foreground">Abastecimiento por Pedido</h2>
              </ModalHeader>
              <ModalBody className="space-y-4">
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-secondary dark:text-foreground">
                    Esta es una proyección de lo que se espera recibir de las mercancías solicitadas por pedido.
                  </p>
                </div>

                <DateRangePicker
                  label="Rango de fechas"
                  variant="bordered"
                  value={dateRangeProyeccion}
                  onChange={setDateRangeProyeccion}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="ghost"
                  onPress={onProyeccionClose}
                  className="font-medium"
                  isDisabled={loadingProy}
                >
                  Cancelar
                </Button>
                <Button
                  color="primary"
                  onPress={cargarProyeccionAbastecimiento}
                  isLoading={loadingProy}
                  startContent={!loadingProy && <Icon icon="lucide:download" width={18} />}
                >
                  Cargar Datos
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

    </div>
  );
};

// El componente de fila se eliminó por incompatibilidad con el sistema de colecciones de HeroUI TableBody.
// La optimización se mantiene mediante estilos inline y pre-fetching.

export default InventarioPage;
