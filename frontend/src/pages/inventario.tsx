import React from 'react';
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
  Spinner
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IProducto } from '../types/producto.types';
import {
  crearProductoService,
  actualizarProductoService,
  eliminarProductoService,
  obtenerFiltrosInventarioService,
  obtenerProductosPaginadosService,
  buscarProductosService,
  buscarProductosPorCodigoService,
  transformarPageItemAProducto,
  softDeleteInventarioService,
  validateStockBeforeUpdatingService
} from '../services/producto-service';
import { IValidateStockConflictResponse } from '../types/producto.types';
import { useToast, useConfirm } from '../hooks/useToast';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/auth-context';
import { obtenerCategorias, obtenerUnidades } from '../services/storage-service';
import GestionCategoriasModal from '../components/modals/GestionCategoriasModal';
import GestionUnidadesModal from '../components/modals/GestionUnidadesModal';
import { obtenerCategoriasActivasService } from '../services/categoria-service';
import { obtenerUnidadesActivasService } from '../services/unidad-medida-service';
import { IUnidadMedida } from '../types/inventario.types';
import { actualizarBodegaTransitoConProductoService, WarehouseWithProductUpdateDTO } from '../services/bodega-transito-service';

/**
 * Interfaz para un item del pedido masivo
 */
interface ItemPedidoMasivo {
  id: string;
  producto: IProducto;
  cantidad: number;
  notas?: string;
}

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
  const searchTermRef = React.useRef<string>('');

  const [searchCode, setSearchCode] = React.useState<string>('');
  const [debouncedSearchCode, setDebouncedSearchCode] = React.useState<string>('');
  const searchCodeRef = React.useRef<string>('');
  const [cache, setCache] = React.useState<Record<number, IProducto[]>>({});
  const cacheRef = React.useRef<Record<number, IProducto[]>>({});

  const history = useHistory();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isPedidoMasivoOpen, onOpen: onPedidoMasivoOpen, onOpenChange: onPedidoMasivoOpenChange } = useDisclosure();
  const { isOpen: isCategoriasOpen, onOpen: onCategoriasOpen, onOpenChange: onCategoriasOpenChange } = useDisclosure();
  const { isOpen: isUnidadesOpen, onOpen: onUnidadesOpen, onOpenChange: onUnidadesOpenChange } = useDisclosure();
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

  usePageTitle('Inventario', 'Gestione los productos del inventario, vea movimientos y actualice existencias.');

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

      setCategoriasFull(resFiltros.categorias);
      setUnidadesFull(resFiltros.unidades);

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
    const apiPageToPrefetch = currentUiPage === 1 && productos.length === 20 ? 3 : currentUiPage + 1;

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
  }, [totalPaginas, productos.length]);

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
  }, [toast, prefetchSiguientePagina, productos.length]);

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
  const filtrosCombinados = React.useMemo(() => {
    const categoras = categoriasFull.map(c => ({ id: `cat-${c.id}`, nombre: c.nombre }));
    const unidades = unidadesFull.map(u => ({ id: `uni-${u.id}`, nombre: u.nombre }));

    return [
      { id: 'todas', nombre: 'Todas las categorías' },
      { id: 'stock-bajo', nombre: 'Stock Bajo' },
      { id: 'ocultar-cero', nombre: 'Ocultar stock en 0' },
      { id: 'ascendente', nombre: 'Ascendente' },
      { id: 'descendente', nombre: 'Descendente' },
      ...categoras,
      ...unidades
    ];
  }, [categoriasFull, unidadesFull]);

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
  const renderStockStatus = (producto: IProducto) => {
    if (producto.stock <= 0) {
      return <Chip color="danger" size="sm" variant="flat" className="text-danger-700 dark:text-danger-400 bg-danger-50 dark:bg-danger-50/10 font-medium">Sin stock</Chip>;
    } else if (producto.stock < producto.stockMinimo) {
      return <Chip color="warning" size="sm" variant="flat" className="text-warning-700 dark:text-warning-400 bg-warning-50 dark:bg-warning-50/10 font-medium">Stock bajo</Chip>;
    } else {
      return <Chip color="success" size="sm" variant="flat" className="text-success-700 dark:text-success-400 bg-success-50 dark:bg-success-50/10 font-medium">Disponible</Chip>;
    }
  };

  return (
    <div className="min-h-screen bg-default-50/50 dark:bg-background pb-20 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="flex flex-wrap items-center gap-3 px-4 mt-8 mb-4">
          <Button
            color="secondary"
            variant="solid"
            size="md"
            className="font-bold shadow-sm"
            startContent={<Icon icon="lucide:shopping-cart" width={18} />}
            onPress={onPedidoMasivoOpen}
          >
            Pedido
          </Button>
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
        </div>

        {/* Barra de herramientas */}
        <Card className="shadow-sm bg-white dark:bg-content1 border border-default-200 dark:border-default-100 mx-4">
          <CardBody className="p-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="w-full flex flex-col md:flex-row gap-2 md:w-3/4">
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

              <Dropdown onOpenChange={(isOpen) => {
                if (!isOpen) {
                  cacheRef.current = {};
                  setCache({});
                  setCurrentPage(1);
                  cargarProductosPaginados(1, true);
                }
              }}>
                <DropdownTrigger>
                  <Button
                    variant="bordered"
                    className="bg-white dark:bg-default-100/50 w-full md:w-auto"
                    startContent={<Icon icon="lucide:filter" className="text-default-500" />}
                  >
                    {selectedFilters.has('todas') ? 'Todas las categorías' : `${selectedFilters.size} Filtros`}
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Filtros"
                  closeOnSelect={false}
                  selectionMode="multiple"
                  selectedKeys={selectedFilters}
                  className="max-h-[500px] overflow-y-auto w-full"
                  onSelectionChange={(keys) => {
                    const newKeys = Array.from(keys) as string[];
                    let resultSet: Set<string>;

                    const wasTodasSelected = filtersRef.current.has('todas');
                    const isTodasSelectedNow = newKeys.includes('todas');

                    const newlyAdded = newKeys.filter(k => !filtersRef.current.has(k));
                    let finalKeys = newKeys;

                    if (newlyAdded.includes('ascendente')) {
                      finalKeys = finalKeys.filter(k => k !== 'descendente');
                    } else if (newlyAdded.includes('descendente')) {
                      finalKeys = finalKeys.filter(k => k !== 'ascendente');
                    }

                    const updatedIsTodas = finalKeys.includes('todas');
                    const nonCatFilters = finalKeys.filter(k => k === 'ocultar-cero' || k === 'ascendente' || k === 'descendente' || k === 'stock-bajo');

                    if (updatedIsTodas && !wasTodasSelected) {
                      resultSet = new Set(['todas', ...nonCatFilters]);
                    } else if (finalKeys.length > 1 && updatedIsTodas) {
                      const hasCatOrUnit = finalKeys.some(k => k.startsWith('cat-') || k.startsWith('uni-'));
                      if (hasCatOrUnit) {
                        resultSet = new Set(finalKeys.filter(k => k !== 'todas'));
                      } else {
                        resultSet = new Set(finalKeys);
                      }
                    } else if (finalKeys.length === 0) {
                      resultSet = new Set(['todas']);
                    } else {
                      resultSet = new Set(finalKeys);
                    }

                    if (!Array.from(resultSet).some(k => k.startsWith('cat-') || k.startsWith('uni-') || k === 'todas')) {
                      resultSet.add('todas');
                    }

                    setSelectedFilters(resultSet);
                    filtersRef.current = resultSet;
                  }}
                >
                  {filtrosCombinados.map((filtro) => (
                    <DropdownItem
                      key={filtro.id}
                      startContent={
                        filtro.id === 'stock-bajo'
                          ? <Icon icon="lucide:alert-triangle" className="text-warning" />
                          : null
                      }
                    >
                      {filtro.nombre}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
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
            <TableColumn width="30%" align="center" className="text-center">NOMBRE PRODUCTO</TableColumn>
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
                className="cursor-pointer hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors duration-200 border-b border-default-50 dark:border-default-50/10"
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: '70px 70px'
                } as any}
                onClick={() => handleEditarProducto(producto)}
              >
                <TableCell>
                  <Tooltip content="Control de Inventario" color="primary" delay={100} closeDelay={0}>
                    <div className="w-full overflow-hidden text-center flex flex-col items-center">
                      <span className="font-semibold text-secondary dark:text-foreground block truncate w-full">{producto.nombre}</span>
                      {producto.descripcion && (
                        <p className="text-xs text-default-400 truncate w-full">{producto.descripcion}</p>
                      )}
                    </div>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip content="Control de Inventario" color="primary" delay={100} closeDelay={0}>
                    <div className="flex justify-center w-full">
                      <Chip size="sm" variant="flat" className="bg-default-100 dark:bg-default-100/50 text-default-600 dark:text-default-300">
                        {producto.categoria}
                      </Chip>
                    </div>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip content="Control de Inventario" color="primary" delay={100} closeDelay={0}>
                    <span className={`font-bold block text-center ${producto.stock <= producto.stockMinimo ? 'text-danger' : 'text-default-700 dark:text-default-300'}`}>
                      {producto.stock}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip content="Control de Inventario" color="primary" delay={100} closeDelay={0}>
                    <span className="block text-center">{producto.stockMinimo}</span>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip content="Control de Inventario" color="primary" delay={100} closeDelay={0}>
                    <span className="text-default-500 block text-center">{producto.unidadMedida}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip content="Control de Inventario" color="primary" delay={100} closeDelay={0} className="w-full">
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

                    {esAdministrador && (
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

        <Modal isOpen={isPedidoMasivoOpen} onOpenChange={onPedidoMasivoOpenChange} size="4xl" backdrop="blur" scrollBehavior="inside">
          <ModalContent>
            {(onClose) => (
              <PedidoMasivoModal productos={productos} onClose={onClose} />
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
                    El inventario <strong>"{productoParaEliminar?.nombre}"</strong> no puede ser eliminado porque aún tiene stock disponible (<strong>{productoParaEliminar?.stock}</strong>).
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
          // --- NUEVA LÓGICA PARA BODEGA ---
          const datosBodega: WarehouseWithProductUpdateDTO = {
            idBodegaTransito: (producto as any)._idBodegaTransito || 0,
            idInventario: producto._idInventario || 0,
            idProducto: parseInt(producto.id),
            tipoMovimiento: tipoMovimiento || 'Ajuste',
            nombreProducto: nombre.trim(),
            codigoProducto: codProducto.trim() || undefined,
            descripcionProducto: descripcion.trim(),
            idCategoria: parseInt(idCategoria),
            idUnidadMedida: parseInt(idUnidadMedida),
            stock: stockActualizado,
            stockLimit: parseFloat(stockMinimo) || 0,
          };
          await actualizarBodegaTransitoConProductoService(datosBodega);
          toast.success('Cambios guardados exitosamente en la bodega');
        } else {
          // --- LÓGICA EXISTENTE PARA INVENTARIO ---
          const datosActualizacion = {
            id: producto.id,
            idInventario: producto._idInventario || 0, // Fallback safe
            nombre: nombre.trim(),
            codProducto: codProducto.trim() || undefined,
            descripcion: descripcion.trim(),
            categoria: catNombre,
            unidadMedida: uniNombre,
            idCategoria: parseInt(idCategoria),
            idUnidadMedida: parseInt(idUnidadMedida),
            stock: stockActualizado,
            stockMinimo: parseFloat(stockMinimo) || 0,
            tipoMovimiento: tipoMovimiento || 'Ajuste',
          };

          // --- NUEVA VALIDACIÓN ANTES DEL PATCH ---
          const validationResult = await validateStockBeforeUpdatingService({
            idInventario: datosActualizacion.idInventario,
            validateStock: productoReferencia?.stock ?? 0 // Enviamos el stock original que teníamos al abrir/sync
          });

          if (validationResult === true) {
            // OK: Proceder con el PATCH
            await actualizarProductoService(datosActualizacion);
            if (stockCambiado) {
              toast.success('Actualizacion realizada con exito, movimiento de ajuste realizado');
            } else {
              toast.success('Actualizacion realizada con exito');
            }
          } else {
            // CONFLICTO (409): Otro usuario cambió los datos
            const conflictData = validationResult as IValidateStockConflictResponse;
            toast.warning('Peticiones simultáneas, sincronizando datos antes de actualizar...', {
              title: 'Sincronizando...',
              animate: true
            });

            // Sincronizar campos del formulario con los nuevos datos
            setNombre(conflictData.nombreProducto);
            setCodProducto(conflictData.codProducto || '');
            setDescripcion(conflictData.descripcionProducto || '');
            setIdCategoria(conflictData.idCategoria.toString());
            setIdUnidadMedida(conflictData.idUnidad.toString());
            setStock(conflictData.stock.toString());
            setStockMinimo(conflictData.stockLimit.toString());

            // --- NUEVO: Sincronizar también el producto de referencia para las validaciones visuales ---
            const productoActualizado: IProducto = {
              id: conflictData.idProducto.toString(),
              nombre: conflictData.nombreProducto,
              descripcion: conflictData.descripcionProducto || '',
              codProducto: conflictData.codProducto || undefined,
              categoria: conflictData.nombreCategoria,
              unidadMedida: conflictData.nombreUnidad,
              stock: conflictData.stock,
              stockMinimo: conflictData.stockLimit,
              fechaCreacion: new Date().toISOString(),
              fechaActualizacion: new Date().toISOString(),
              _idInventario: conflictData.idInventario
            };
            setProductoReferencia(productoActualizado);

            // Sincronizar también con el padre para que la lista en segundo plano se vea actualizada
            if (onConflictSync) {
              onConflictSync(productoActualizado);
            }

            // No llamamos al Patch, permitimos que el usuario revise
            return;
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

    return (
      nombre.trim() !== (productoReferencia.nombre || '') ||
      codProducto.trim() !== originalCodProducto ||
      descripcion.trim() !== originalDescripcion ||
      idCategoria !== originalCategoria ||
      idUnidadMedida !== originalUnidad ||
      stock.trim() !== originalStock ||
      stockMinimo.trim() !== originalStockMinimo
    );
  }, [mode, productoReferencia, nombre, codProducto, descripcion, idCategoria, idUnidadMedida, stock, stockMinimo, categorias, unidades]);

  // Validaciones de lógica de Stock vs Motivo
  const originalStockVal = parseFloat(productoReferencia?.stock?.toString() || '0');
  const currentStockVal = parseFloat(stock);

  let stockError = '';
  let diffText = '';

  const motivoDescripcion = React.useMemo(() => {
    switch (tipoMovimiento) {
      case 'Entrada': return "Registrando ingreso de mercadería al sistema del Inventario";
      case 'Salida Inventario':
      case 'Salida Bodega':
        return origenContext === 'bodega'
          ? "Registrando la salida de insumos para el desarrollo de clases, talleres o procesos académicos."
          : "Registrando retiro o consumo de productos al sistema del Inventario";
      case 'Traslado':
      case 'Devolución':
        return origenContext === 'bodega'
          ? "Registrando el reingreso de productos no utilizados al inventario principal."
          : "Iniciando movimiento a Bodega de Transito";
      case 'Ajuste': return "Corrigiendo saldo para sincronizar con stock físico";
      case 'Merma': return "Reportar Pérdida o Producto Dañado";
      default: return "";
    }
  }, [tipoMovimiento, origenContext]);

  if (mode === 'editar' && tipoMovimiento && stock.trim() !== '') {
    if (tipoMovimiento === 'Entrada') {
      if (currentStockVal <= originalStockVal) {
        stockError = 'Para Entrada, el stock debe ser mayor al actual';
      }
      diffText = currentStockVal > originalStockVal ? `+${(currentStockVal - originalStockVal).toFixed(3)}` : '';
    } else if (tipoMovimiento === 'Salida Inventario' || tipoMovimiento === 'Salida Bodega' || tipoMovimiento === 'Traslado' || tipoMovimiento === 'Devolución' || tipoMovimiento === 'Merma') {
      if (currentStockVal >= originalStockVal) {
        const actionName = tipoMovimiento;
        stockError = `Para ${actionName}, el stock debe ser menor al actual`;
      }
      diffText = currentStockVal < originalStockVal ? `${(currentStockVal - originalStockVal).toFixed(3)}` : '';
    } else if (tipoMovimiento === 'Ajuste') {
      const diff = currentStockVal - originalStockVal;
      diffText = diff > 0 ? `+${diff.toFixed(3)}` : diff < 0 ? `${diff.toFixed(3)}` : '0.000';
    }
  }

  const isFormInvalid =
    !nombre.trim() ||
    !idCategoria ||
    !idUnidadMedida ||
    !stock.trim() ||
    isNaN(parseFloat(stock)) ||
    parseFloat(stock) < 0 ||
    !!stockError ||
    (stockMinimo.trim() !== '' && (isNaN(parseFloat(stockMinimo)) || parseFloat(stockMinimo) < 0)) ||
    (mode === 'editar' && !tipoMovimiento && currentStockVal !== originalStockVal) ||
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
            title={editandoDatosBasicos ? "Bloquear edición" : "Habilitar edición de campos básicos"}
            className="shadow-sm"
          >
            <Icon icon={editandoDatosBasicos ? "lucide:lock-open" : "lucide:edit-2"} width={16} />
          </Button>
        </div>
      )}

      <Input
        label="Nombre"
        placeholder="Nombre del producto"
        value={nombre}
        onValueChange={setNombre}
        isRequired
        variant="bordered"
        maxLength={100}
        description={`${nombre.length}/100`}
        isDisabled={!editandoDatosBasicos}
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
        isDisabled={!editandoDatosBasicos}
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
        isDisabled={!editandoDatosBasicos}
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
          isDisabled={!editandoDatosBasicos}
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
            isDisabled={!editandoDatosBasicos}
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

      <div className={`grid grid-cols-1 ${mode === 'editar' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        <Input
          type="number"
          label="Stock"
          placeholder="Stock actual"
          value={stock}
          onValueChange={(val) => {
            if (val === '') {
              setStock('');
              return;
            }

            // Regex dinámico según si es fraccionario o no
            const regex = esUnidadFraccionaria
              ? /^\d{0,7}(\.\d{0,3})?$/
              : /^\d{0,7}$/;

            if (regex.test(val)) {
              setStock(val);
            }
          }}
          min="0"
          max="9999999.999"
          step={esUnidadFraccionaria ? "0.001" : "1"}
          isRequired
          isDisabled={mode === 'editar' && !tipoMovimiento}
          description={stockError || diffText}
          variant="bordered"
          classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
        />

        <Input
          type="number"
          label={<span className="whitespace-nowrap truncate max-w-full">Stock Mín. (Opcional)</span>}
          placeholder="Stock mínimo"
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

        {mode === 'editar' && (() => {
          const opcionesMotivo = [
            ...(origenContext === 'inventario' ? [{ key: 'Entrada', label: 'Entrada' }] : []),
            { key: origenContext === 'bodega' ? 'Devolución' : 'Traslado', label: origenContext === 'bodega' ? 'Devolución' : 'Traslado' },
            { key: 'Ajuste', label: 'Ajuste' },
            { key: origenContext === 'bodega' ? 'Salida Bodega' : 'Salida Inventario', label: origenContext === 'bodega' ? 'Salida Bodega' : 'Salida Inventario' },
            { key: 'Merma', label: 'Merma' }
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
                  <Tooltip content={opcion.label} placement="right" closeDelay={0} isDisabled={opcion.key !== 'Salida Inventario' && opcion.key !== 'Traslado' && opcion.key !== 'Salida Bodega' && opcion.key !== 'Devolución'}>
                    <span className="w-full inline-block">{opcion.label}</span>
                  </Tooltip>
                </SelectItem>
              ))}
            </Select>
          );
        })()}
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
}

/**
 * Modal para realizar pedidos masivos hacia bodega de tránsito
 */
const PedidoMasivoModal: React.FC<PedidoMasivoModalProps> = ({ productos, onClose }) => {
  const toast = useToast();
  const [itemsPedido, setItemsPedido] = React.useState<ItemPedidoMasivo[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = React.useState<string>('');
  const [cantidad, setCantidad] = React.useState<string>('');
  const [notas, setNotas] = React.useState<string>('');

  const agregarProducto = () => {
    const producto = productos.find(p => p.id === productoSeleccionado);
    if (producto && cantidad && parseFloat(cantidad) > 0) {
      const nuevoItem: ItemPedidoMasivo = {
        id: Date.now().toString(),
        producto,
        cantidad: parseFloat(cantidad),
        notas: notas.trim() || undefined
      };

      setItemsPedido([...itemsPedido, nuevoItem]);
      setProductoSeleccionado('');
      setCantidad('');
      setNotas('');
    }
  };

  const eliminarItem = (id: string) => {
    setItemsPedido(itemsPedido.filter(item => item.id !== id));
  };

  const procesarPedido = async () => {
    try {
      // Aquí iría la lógica para procesar el pedido masivo

      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(`Pedido procesado exitosamente. ${itemsPedido.length} productos enviados a bodega de tránsito.`);
      onClose();
    } catch (error) {
      toast.error('Error al procesar el pedido');
    }
  };

  const productoSeleccionadoObj = productos.find(p => p.id === productoSeleccionado);

  return (
    <>
      <ModalHeader className="flex flex-col gap-1 border-b border-default-100 dark:border-default-50 bg-secondary-50 dark:bg-secondary-50/10">
        <h2 className="text-xl font-bold text-secondary dark:text-foreground">Realizar Pedido Masivo</h2>
        <p className="text-sm text-default-500">Envíe múltiples productos hacia la bodega de tránsito</p>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-6 py-4">
          {/* Sección para agregar productos */}
          <div className="p-4 border border-default-200 dark:border-default-100 rounded-lg bg-default-50 dark:bg-content2">
            <h3 className="font-bold text-secondary dark:text-foreground mb-4 flex items-center gap-2">
              <Icon icon="lucide:plus-circle" width={18} />
              Agregar Producto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-1">
                <Autocomplete
                  label="Producto"
                  placeholder="Buscar producto"
                  selectedKey={productoSeleccionado}
                  onSelectionChange={(key) => setProductoSeleccionado(key as string)}
                  allowsCustomValue={false}
                  variant="bordered"
                  className="max-w-xs"
                >
                  {productos.map((producto) => (
                    <AutocompleteItem key={producto.id} textValue={producto.nombre}>
                      <div className="flex flex-col">
                        <span className="text-small font-semibold">{producto.nombre}</span>
                        <span className="text-tiny text-default-400">
                          Stock: {producto.stock} {producto.unidadMedida}
                        </span>
                      </div>
                    </AutocompleteItem>
                  ))}
                </Autocomplete>
              </div>

              <div className="md:col-span-1">
                <Input
                  type="number"
                  label="Cantidad"
                  placeholder="0"
                  value={cantidad}
                  onValueChange={setCantidad}
                  min="0.01"
                  step="0.01"
                  variant="bordered"
                  endContent={
                    <span className="text-tiny text-default-400">
                      {productoSeleccionadoObj?.unidadMedida || ''}
                    </span>
                  }
                />
              </div>

              <div className="md:col-span-1">
                <Input
                  label="Notas (opcional)"
                  placeholder="Observaciones"
                  value={notas}
                  onValueChange={setNotas}
                  variant="bordered"
                />
              </div>

              <div className="md:col-span-1">
                <Button
                  color="secondary"
                  onPress={agregarProducto}
                  isDisabled={!productoSeleccionado || !cantidad || parseFloat(cantidad) <= 0}
                  className="w-full font-bold shadow-sm"
                  startContent={<Icon icon="lucide:plus" />}
                >
                  Agregar
                </Button>
              </div>
            </div>
          </div>

          {/* Lista de productos agregados */}
          {itemsPedido.length > 0 && (
            <div>
              <h3 className="font-bold text-secondary mb-4 flex items-center gap-2">
                <Icon icon="lucide:list" width={18} />
                Productos en el Pedido ({itemsPedido.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto px-1">
                {itemsPedido.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-default-200 rounded-lg bg-white shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-secondary">{item.producto.nombre}</span>
                        <Chip size="sm" color="primary" variant="flat" className="text-xs">
                          {item.cantidad} {item.producto.unidadMedida}
                        </Chip>
                      </div>
                      {item.notas && (
                        <p className="text-sm text-default-500 mt-1 italic">"{item.notas}"</p>
                      )}
                    </div>
                    <Button
                      isIconOnly
                      variant="light"
                      color="danger"
                      size="sm"
                      onPress={() => eliminarItem(item.id)}
                      className="text-danger-400 hover:text-danger hover:bg-danger-50"
                    >
                      <Icon icon="lucide:trash-2" width={18} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumen */}
          {itemsPedido.length > 0 && (
            <div className="p-4 bg-default-50 dark:bg-default-100 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total de productos:</span>
                <span className="text-lg font-bold text-primary">{itemsPedido.length}</span>
              </div>
              <p className="text-sm text-default-500 mt-2">
                Los productos se moverán del inventario principal a la bodega de tránsito
              </p>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter className="bg-default-50 border-t border-default-100">
        <Button variant="ghost" onPress={onClose} className="font-medium">
          Cancelar
        </Button>
        <Button
          color="primary"
          variant="solid"
          onPress={procesarPedido}
          isDisabled={itemsPedido.length === 0}
          startContent={<Icon icon="lucide:send" />}
          className="font-bold text-secondary shadow-md"
        >
          Procesar Pedido ({itemsPedido.length})
        </Button>
      </ModalFooter>
    </>
  );
};

// El componente de fila se eliminó por incompatibilidad con el sistema de colecciones de HeroUI TableBody.
// La optimización se mantiene mediante estilos inline y pre-fetching.

export default InventarioPage;
