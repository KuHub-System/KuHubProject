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
  CardBody
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
  transformarPageItemAProducto,
} from '../services/producto-service';
import { useToast, useConfirm } from '../hooks/useToast';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/auth-context';
import { obtenerCategorias, obtenerUnidades } from '../services/storage-service';
import GestionCategoriasModal from '../components/modals/GestionCategoriasModal';
import GestionUnidadesModal from '../components/modals/GestionUnidadesModal';
import { obtenerCategoriasActivasService } from '../services/categoria-service';
import { obtenerUnidadesActivasService } from '../services/unidad-medida-service';
import { IUnidadMedida } from '../types/inventario.types';

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
  const [cache, setCache] = React.useState<Record<number, IProducto[]>>({});
  const cacheRef = React.useRef<Record<number, IProducto[]>>({});
  const rowsPerPage = 10;

  const history = useHistory();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isPedidoMasivoOpen, onOpen: onPedidoMasivoOpen, onOpenChange: onPedidoMasivoOpenChange } = useDisclosure();
  const { isOpen: isCategoriasOpen, onOpen: onCategoriasOpen, onOpenChange: onCategoriasOpenChange } = useDisclosure();
  const { isOpen: isUnidadesOpen, onOpen: onUnidadesOpen, onOpenChange: onUnidadesOpenChange } = useDisclosure();
  const [productoSeleccionado, setProductoSeleccionado] = React.useState<IProducto | null>(null);
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar'>('crear');

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
      logger.error('Error al cargar filtros:', error);
    }
  }, []);

  /**
   * Carga de forma silenciosa la siguiente página de la API.
   */
  const prefetchSiguientePagina = React.useCallback(async (currentUiPage: number) => {
    const apiPageToPrefetch = currentUiPage < 2 ? 2 : currentUiPage;

    if (cacheRef.current[apiPageToPrefetch] || apiPageToPrefetch > totalPaginas) return;

    try {
      let response;
      const currentSearch = searchTermRef.current;

      if (currentSearch) {
        console.log(`🚀 Prefetching Search Results API Page ${apiPageToPrefetch} para term: "${currentSearch}"`);
        response = await buscarProductosService(currentSearch, apiPageToPrefetch);
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

        console.log(`🚀 Prefetching API Page ${apiPageToPrefetch} con filtros:`, currentFilters);
        response = await obtenerProductosPaginadosService({
          page: apiPageToPrefetch,
          categoriasIds,
          unidadesIds,
          soloStockBajo
        });
      }

      const productosTransformados = response.items.map(transformarPageItemAProducto);
      cacheRef.current[apiPageToPrefetch] = productosTransformados;
      setCache(prev => ({ ...prev, [apiPageToPrefetch]: productosTransformados }));
    } catch (e) {
      console.warn('Silent prefetch failed', e);
    }
  }, [totalPaginas]);

  /**
   * Carga los productos usando una caché local para manejar la asimetría del backend.
   */
  const cargarProductosPaginados = React.useCallback(async (uiPage: number, forceFetch: boolean = false) => {
    const apiPage = uiPage <= 2 ? 1 : uiPage - 1;

    if (forceFetch) {
      setProductos([]);
      setFilteredProductos([]);
      cacheRef.current = {};
      setCache({});
    }

    if (!forceFetch && cacheRef.current[apiPage]) {
      console.log(`📦 Usando caché para API Page ${apiPage}`);
      setIsLoading(false);
      setProductos(cacheRef.current[apiPage]);
      prefetchSiguientePagina(uiPage);
      return;
    }

    try {
      setIsLoading(true);
      let response;
      const currentSearch = searchTermRef.current;

      if (currentSearch) {
        console.log(`🔍 Realizando búsqueda global para: "${currentSearch}", API Page: ${apiPage}`);
        response = await buscarProductosService(currentSearch, apiPage);
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

        const requestBody = {
          page: apiPage,
          categoriasIds,
          unidadesIds,
          soloStockBajo,
          pageSize: apiPage === 1 ? 20 : 10
        };

        console.log('📦 Enviando request de inventario paginado:', requestBody);
        response = await obtenerProductosPaginadosService(requestBody);
      }

      const productosTransformados = response.items.map(transformarPageItemAProducto);
      cacheRef.current[apiPage] = productosTransformados;
      setCache(prev => ({ ...prev, [apiPage]: productosTransformados }));
      setProductos(productosTransformados);

      console.log(`📊 Metadatos recibidos: totalItems=${response.totalItems}, totalPages=${response.totalPages}`);

      if (forceFetch || uiPage === 1 || totalRegistros === 0) {
        const calculatedUiPages = Math.ceil(response.totalItems / 10);
        setTotalPaginas(calculatedUiPages);
        setTotalRegistros(response.totalItems);
      }

      prefetchSiguientePagina(uiPage);
    } catch (error) {
      logger.error('Error al cargar productos:', error);
      toast.error('Error al cargar productos');
    } finally {
      setIsLoading(false);
    }
  }, [totalRegistros, toast, prefetchSiguientePagina]);

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
      console.log('🔄 Refrescando categorías activas al abrir el modal...');
      cargarFiltros();
    }
  }, [isOpen, cargarFiltros]);

  // Cargar productos cuando cambian la página de la UI
  React.useEffect(() => {
    cargarProductosPaginados(currentPage);
  }, [currentPage, cargarProductosPaginados]);

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

  // Lógica de Debounce para búsqueda (4 segundos)
  React.useEffect(() => {
    if (searchTerm === debouncedSearchTerm) return;

    const handler = setTimeout(() => {
      console.log(`⏳ Debounce completo: "${searchTerm}"`);
      setDebouncedSearchTerm(searchTerm);
      searchTermRef.current = searchTerm;

      // Resetear estados para nueva búsqueda
      cacheRef.current = {};
      setCache({});
      setCurrentPage(1);
      cargarProductosPaginados(1, true);
    }, 4000);

    return () => clearTimeout(handler);
  }, [searchTerm, debouncedSearchTerm, cargarProductosPaginados]);

  /**
   * Filtra los productos localmente solo si no hay búsqueda global activa.
   */
  React.useEffect(() => {
    // Si hay búsqueda global (debounced), no filtramos localmente 
    // porque el backend ya nos trajo solo lo que coincide.
    if (debouncedSearchTerm) {
      setFilteredProductos(productos);
      return;
    }

    if (!searchTerm) {
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
      ...categoras,
      ...unidades
    ];
  }, [categoriasFull, unidadesFull]);

  /**
   * Extrae los productos a mostrar para la página actual de la UI, 
   * usando los datos cargados en la caché de la API.
   */
  const paginatedProductos = React.useMemo(() => {
    const apiPage = currentPage <= 2 ? 1 : currentPage - 1;
    const data = cache[apiPage] || [];

    if (currentPage === 1) {
      return data.slice(0, 10);
    }
    if (currentPage === 2) {
      return data.slice(10, 20);
    }

    // Para UI 3+, el backend devuelve 10 registros por página,
    // así que los mostramos completos.
    return data;
  }, [currentPage, cache]);

  /**
   * Navega a la página de movimientos del producto.
   * 
   * @param {string} id - ID del producto.
   */
  const verMovimientos = (id: string) => {
    history.push(`/movimientos?productoId=${id}`);
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

    const confirmado = await confirm(
      `Eliminarás definitivamente el producto "${producto.nombre}".`,
      {
        title: 'Eliminar producto',
        confirmText: 'Eliminar',
        confirmColor: 'danger',
        requireText: 'ELIMINAR',
        requireTextHelper: 'Esta acción elimina el producto y sus datos asociados.',
      }
    );

    if (!confirmado) return;

    try {
      await eliminarProductoService(producto.id);
      toast.success('Producto eliminado correctamente');
      window.dispatchEvent(new Event('productosActualizados'));
    } catch (error: any) {
      logger.error('Error al eliminar producto:', error);
      toast.error(error.message || 'Error al eliminar el producto');
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
    <div className="container mx-auto px-4 py-8 space-y-8 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-default-200 dark:border-default-100 pb-4">
          <div className="flex gap-3">
            <Button
              color="secondary"
              variant="solid"
              className="font-bold shadow-md"
              startContent={<Icon icon="lucide:shopping-cart" width={20} />}
              onPress={onPedidoMasivoOpen}
            >
              Realizar Pedido
            </Button>
            <Button
              color="primary"
              variant="solid"
              className="font-bold text-secondary shadow-md"
              startContent={<Icon icon="lucide:plus" width={20} />}
              onPress={handleNuevoProducto}
            >
              Nuevo Producto
            </Button>
            <Button
              isIconOnly
              variant="flat"
              onPress={onCategoriasOpen}
              title="Gestionar Categorías"
            >
              <Icon icon="lucide:tags" className="text-default-600" />
            </Button>
            <Button
              isIconOnly
              variant="flat"
              onPress={onUnidadesOpen}
              title="Gestionar Unidades de Medida"
            >
              <Icon icon="lucide:scale" className="text-default-600" />
            </Button>
          </div>
        </div>

        {/* Barra de herramientas */}
        <Card className="shadow-sm bg-default-50 dark:bg-content1 border border-default-200 dark:border-default-100">
          <CardBody className="p-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="w-full md:w-1/3">
                <Input
                  placeholder="Buscar productos por nombre o descripción..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  startContent={<Icon icon="lucide:search" className="text-default-400" />}
                  variant="bordered"
                  classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                  isClearable
                  onClear={() => setSearchTerm('')}
                />
              </div>

              <div className="flex gap-4 w-full md:w-auto">
                <Dropdown onOpenChange={(isOpen) => {
                  if (!isOpen) {
                    console.log('🔴 Dropdown cerrado, actualizando resultados con filtros:', Array.from(filtersRef.current));
                    cacheRef.current = {};
                    setCache({});
                    setCurrentPage(1);
                    // Forzamos la carga con los filtros actuales
                    cargarProductosPaginados(1, true);
                  }
                }}>
                  <DropdownTrigger>
                    <Button
                      variant="bordered"
                      className="bg-white dark:bg-default-100/50"
                      startContent={<Icon icon="lucide:filter" className="text-default-500" />}
                    >
                      {selectedFilters.has('todas')
                        ? 'Todas las categorías'
                        : selectedFilters.size === 1
                          ? filtrosCombinados.find(f => f.id === Array.from(selectedFilters)[0])?.nombre
                          : `${selectedFilters.size} filtros aplicados`}
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Filtros"
                    closeOnSelect={false}
                    selectionMode="multiple"
                    selectedKeys={selectedFilters}
                    onSelectionChange={(keys) => {
                      const newKeys = Array.from(keys) as string[];
                      let resultSet: Set<string>;

                      // Lógica de "Todas las categorías"
                      const wasTodasSelected = filtersRef.current.has('todas');
                      const isTodasSelectedNow = newKeys.includes('todas');

                      if (isTodasSelectedNow && !wasTodasSelected) {
                        // Si se seleccionó "todas" ahora, limpiamos el resto
                        resultSet = new Set(['todas']);
                      } else if (newKeys.length > 1 && isTodasSelectedNow) {
                        // Si "todas" estaba y seleccionamos otro, quitamos "todas"
                        const filtered = newKeys.filter(k => k !== 'todas');
                        resultSet = new Set(filtered);
                      } else if (newKeys.length === 0) {
                        // Si se desmarcó todo, volvemos a "todas"
                        resultSet = new Set(['todas']);
                      } else {
                        resultSet = new Set(newKeys);
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
            </div>
          </CardBody>
        </Card>

        {/* Tabla de productos */}
        <Card className="shadow-md border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
          <CardBody className="p-0">
            <Table
              aria-label="Tabla de productos"
              removeWrapper
              classNames={{
                th: "bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs h-12",
                td: "py-3 border-b border-default-50 dark:border-default-50/10 group-data-[last=true]:border-none"
              }}
              bottomContent={
                totalRegistros > 0 ? (
                  <div className="flex w-full justify-center py-4 border-t border-default-100">
                    <Pagination
                      total={totalPaginas}
                      page={currentPage}
                      onChange={setCurrentPage}
                      showControls
                      color="primary"
                      variant="light"
                      // Hidden if only one page to keep it clean
                      className={totalPaginas <= 1 ? "hidden" : ""}
                    />
                  </div>
                ) : null
              }
            >
              <TableHeader>
                <TableColumn>NOMBRE</TableColumn>
                <TableColumn>CATEGORÍA</TableColumn>
                <TableColumn align="center">STOCK</TableColumn>
                <TableColumn align="center">STOCK MÍNIMO</TableColumn>
                <TableColumn>UNIDAD</TableColumn>
                <TableColumn align="center">ESTADO</TableColumn>
                <TableColumn align="center">ACCIONES</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={isLoading}
                loadingContent={<div className="py-8 text-center">Cargando productos...</div>}
                emptyContent={
                  <div className="py-12 text-center text-default-400">
                    <Icon icon="lucide:package-open" className="mx-auto mb-3 opacity-50" width={48} />
                    <p className="text-lg font-medium">No se encontraron productos</p>
                    <p className="text-sm">Intenta ajustar los filtros o agrega un nuevo producto.</p>
                  </div>
                }
              >
                {paginatedProductos.map((producto) => (
                  <TableRow
                    key={producto.id}
                    className="cursor-pointer hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors"
                    onClick={() => verMovimientos(producto.id)}
                  >
                    <TableCell>
                      <span className="font-semibold text-secondary dark:text-foreground">{producto.nombre}</span>
                      {producto.descripcion && (
                        <p className="text-xs text-default-400 truncate max-w-xs">{producto.descripcion}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" className="bg-default-100 dark:bg-default-100/50 text-default-600 dark:text-default-300">
                        {producto.categoria}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${producto.stock <= producto.stockMinimo ? 'text-danger' : 'text-default-700 dark:text-default-300'}`}>
                        {producto.stock}
                      </span>
                    </TableCell>
                    <TableCell>{producto.stockMinimo}</TableCell>
                    <TableCell className="text-default-500">{producto.unidadMedida}</TableCell>
                    <TableCell>{renderStockStatus(producto)}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onPress={() => handleEditarProducto(producto)}
                          className="text-default-400 hover:text-primary"
                        >
                          <Icon icon="lucide:edit" width={18} />
                        </Button>
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onPress={() => verMovimientos(producto.id)}
                          className="text-default-400 hover:text-secondary"
                        >
                          <Icon icon="lucide:list" width={18} />
                        </Button>
                        {esAdministrador && (
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
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </motion.div>

      {/* Modal para crear/editar producto */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-default-100 dark:border-default-50 bg-default-50 dark:bg-content2">
                <div className="flex items-center gap-2">
                  <Icon icon={modalMode === 'crear' ? "lucide:plus-circle" : "lucide:edit-3"} className="text-primary" width={24} />
                  <span className="font-bold text-lg text-secondary dark:text-foreground">{modalMode === 'crear' ? 'Nuevo Producto' : 'Editar Producto'}</span>
                </div>
              </ModalHeader>
              <ModalBody className="py-6">
                <FormularioProducto
                  producto={productoSeleccionado}
                  onClose={onClose}
                  mode={modalMode}
                  categorias={categoriasActivas}
                  unidades={unidadesActivas}
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal para pedido masivo */}
      <Modal isOpen={isPedidoMasivoOpen} onOpenChange={onPedidoMasivoOpenChange} size="4xl" backdrop="blur" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <PedidoMasivoModal
              productos={productos}
              onClose={onClose}
            />
          )}
        </ModalContent>
      </Modal>

      {/* Modales de gestión de categorías y unidades */}
      <GestionCategoriasModal
        isOpen={isCategoriasOpen}
        onOpenChange={onCategoriasOpenChange}
        onRefresh={() => cargarProductosPaginados(1, true)} // Para recargar si algo cambia
      />

      <GestionUnidadesModal
        isOpen={isUnidadesOpen}
        onOpenChange={onUnidadesOpenChange}
        onRefresh={() => cargarProductosPaginados(1, true)}
      />
    </div>
  );
};

/**
 * Interfaz para las propiedades del componente FormularioProducto.
 */
interface FormularioProductoProps {
  producto: IProducto | null;
  onClose: () => void;
  mode: 'crear' | 'editar';
  categorias: { id: number; nombre: string }[];
  unidades: IUnidadMedida[];
}

/**
 * Componente de formulario para crear o editar un producto.
 * 
 * @param {FormularioProductoProps} props - Propiedades del componente.
 * @returns {JSX.Element} El formulario de producto.
 */
const FormularioProducto: React.FC<FormularioProductoProps> = ({ producto, onClose, mode, categorias, unidades }) => {
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
  const [isLoading, setIsLoading] = React.useState(false);
  const [mostrarAbreviatura, setMostrarAbreviatura] = React.useState(false);

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

        const datosActualizacion = {
          id: producto.id,
          nombre: nombre.trim(),
          codProducto: codProducto.trim() || undefined,
          descripcion: descripcion.trim(),
          categoria: catNombre,
          unidadMedida: uniNombre,
          stock: parseFloat(stock) || 0,
          stockMinimo: parseFloat(stockMinimo) || 0,
        };

        await actualizarProductoService(datosActualizacion);
        toast.success('Producto actualizado exitosamente');
      }

      // Despachar evento personalizado para notificar el cambio
      window.dispatchEvent(new Event('productosActualizados'));

      onClose();
    } catch (error) {
      logger.error('Error al guardar producto:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar el producto');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormInvalid =
    !nombre.trim() ||
    !idCategoria ||
    !idUnidadMedida ||
    !stock.trim() ||
    parseFloat(stock) < 0 ||
    (stockMinimo.trim() !== '' && parseFloat(stockMinimo) < 0);

  return (
    <div className="space-y-4">
      <Input
        label="Nombre"
        placeholder="Nombre del producto"
        value={nombre}
        onValueChange={setNombre}
        isRequired
        variant="bordered"
        maxLength={100}
        description={`${nombre.length}/100`}
        classNames={{ inputWrapper: "bg-default-50 dark:bg-default-100/50" }}
      />

      <Input
        label="Código de producto (Opcional)"
        placeholder="Ej: PRD-001"
        value={codProducto}
        onValueChange={setCodProducto}
        variant="bordered"
        maxLength={25}
        description={`${codProducto.length}/25`}
        classNames={{ inputWrapper: "bg-default-50 dark:bg-default-100/50" }}
      />

      <Input
        label="Descripción (Opcional)"
        placeholder="Descripción del producto"
        value={descripcion}
        onValueChange={setDescripcion}
        variant="bordered"
        maxLength={100}
        description={`${descripcion.length}/100`}
        classNames={{ inputWrapper: "bg-default-50 dark:bg-default-100/50" }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Categoría <span className="text-danger">*</span>
          </label>
          <select
            value={idCategoria}
            onChange={(e) => setIdCategoria(e.target.value)}
            className="px-3 py-2 rounded-lg border-2 border-default-200 dark:border-default-100 hover:border-default-400 focus:border-primary focus:outline-none transition-colors bg-default-100 dark:bg-default-100/50 text-foreground"
            required
          >
            <option value="">Seleccione una categoría</option>
            {/* Categorías dinámicas */}
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id.toString()}>{cat.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Unidad de Medida <span className="text-danger">*</span>
            </label>
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
          <select
            value={idUnidadMedida}
            onChange={(e) => setIdUnidadMedida(e.target.value)}
            className="px-3 py-2 rounded-lg border-2 border-default-200 dark:border-default-100 hover:border-default-400 focus:border-primary focus:outline-none transition-colors bg-default-100 dark:bg-default-100/50 text-foreground"
            required
          >
            <option value="">Seleccione una unidad</option>
            {/* Unidades dinámicas activas */}
            {unidades.map(uni => (
              <option key={uni.id} value={uni.id}>
                {mostrarAbreviatura ? uni.abreviatura : uni.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="number"
          label="Stock"
          placeholder="Stock actual"
          value={stock}
          onValueChange={setStock}
          min="0"
          step="0.01"
          isRequired
          variant="bordered"
          classNames={{ inputWrapper: "bg-default-50 dark:bg-default-100/50" }}
        />

        <Input
          type="number"
          label="Stock Mínimo (Opcional)"
          placeholder="Stock mínimo"
          value={stockMinimo}
          onValueChange={setStockMinimo}
          min="0"
          step="0.01"
          variant="bordered"
          classNames={{ inputWrapper: "bg-default-50 dark:bg-default-100/50" }}
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
          {mode === 'crear' ? 'Crear Producto' : 'Guardar Cambios'}
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
      logger.log('Procesando pedido masivo:', itemsPedido);

      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(`Pedido procesado exitosamente. ${itemsPedido.length} productos enviados a bodega de tránsito.`);
      onClose();
    } catch (error) {
      logger.error('Error al procesar pedido:', error);
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

export default InventarioPage;