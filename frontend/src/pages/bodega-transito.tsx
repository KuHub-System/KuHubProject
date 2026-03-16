import React from 'react';
import {
  Card, CardBody, CardHeader, Button, Chip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
  Input, ScrollShadow, Accordion, AccordionItem,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Spinner, Tooltip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Checkbox
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useHistory } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ISolicitud, IItemSolicitud } from '../types/solicitud.types';
import { obtenerTodasSolicitudesService, actualizarEstadoBodegaService } from '../services/solicitud-service';
import { obtenerRecetaPorIdService } from '../services/receta-service';
import { obtenerFiltrosInventarioService } from '../services/producto-service';
import { buscarBodegaTransitoService, buscarBodegaTransitoPorCodigoService, obtenerBodegaPaginadaService, IBodegaTransitoItem } from '../services/bodega-transito-service';
import { useToast } from '../hooks/useToast';
import { IProducto } from '../types/producto.types';
import { IUnidadMedida } from '../types/inventario.types';
import { FormularioProducto } from './inventario';
import { obtenerUnidadesActivasService } from '../services/unidad-medida-service';

// Mapa de Bloques Horarios
const BLOQUES_HORARIOS: Record<number, string> = {
  1: '8:01 - 8:40', 2: '8:41 - 9:20', 3: '9:31 - 10:10', 4: '10:11 - 10:50',
  5: '11:01 - 11:40', 6: '11:41 - 12:20', 7: '12:31 - 13:10', 8: '13:11 - 13:50',
  9: '14:01 - 14:40', 10: '14:41 - 15:20', 11: '15:31 - 16:10', 12: '16:11 - 16:50',
  13: '17:01 - 17:40', 14: '17:41 - 18:20', 15: '18:21 - 19:00', 16: '19:11 - 19:50',
  17: '19:51 - 20:30', 18: '20:41 - 21:20', 19: '21:21 - 22:00', 20: '22:11 - 22:50'
};

const getHorarioString = (inicio: number, fin: number) => {
  const start = BLOQUES_HORARIOS[inicio]?.split(' - ')[0] || '';
  const end = BLOQUES_HORARIOS[fin]?.split(' - ')[1] || '';
  return start && end ? `${start} - ${end}` : 'Horario no definido';
};

interface RequestCardProps {
  solicitud: ISolicitud;
  onUpdate: () => void;
  onAddExtra: (solicitud: ISolicitud) => void;
  onViewDetail: (solicitud: ISolicitud) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({ solicitud, onUpdate, onAddExtra, onViewDetail }) => {
  const isArmado = solicitud.estadoBodega === 'Armado';

  const handleToggleArmado = async () => {
    const nuevoEstado = isArmado ? 'Pendiente' : 'Armado';
    if (solicitud.id.startsWith('fake-')) {
      solicitud.estadoBodega = nuevoEstado;
      onUpdate();
      return;
    }
    await actualizarEstadoBodegaService(solicitud.id, nuevoEstado);
    onUpdate();
  };

  return (
    <Card className={`w-full mb-3 border-l-4 shadow-sm hover:shadow-md transition-shadow ${isArmado ? 'border-success bg-green-50/30 dark:bg-success-50/10' : 'border-primary bg-white dark:bg-content1'}`}>
      <CardBody className="py-3 px-4">
        <div className="flex justify-between items-start">
          <div className="flex-grow pr-2">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-bold text-md ${isArmado ? 'text-success-700 dark:text-success-400' : 'text-secondary dark:text-foreground'}`}>{solicitud.asignaturaNombre}</h4>
              {isArmado && (
                <Chip size="sm" color="success" variant="flat" className="h-6 px-1">
                  <span className="font-bold text-xs">LISTO</span>
                </Chip>
              )}
            </div>
            <p className="text-sm text-default-600 flex items-center gap-1.5 font-medium">
              <Icon icon="lucide:user" className="text-default-400" width={14} />
              {solicitud.profesorNombre}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-50 dark:bg-orange-50/10 rounded border border-orange-100 dark:border-default-200">
                <Icon icon="lucide:clock" className="text-primary-600" width={14} />
                <span className="text-xs font-bold text-primary-700 dark:text-primary-400">{getHorarioString(solicitud.bloqueInicio, solicitud.bloqueFin)}</span>
              </div>
            </div>
            <p className="text-xs text-default-500 mt-2 font-medium">
              Items: {solicitud.items.length + (solicitud.itemsAdicionalesBodega?.length || 0)}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              isIconOnly
              size="sm"
              variant={isArmado ? "solid" : "bordered"}
              color={isArmado ? "success" : "default"}
              onPress={handleToggleArmado}
              className={`${!isArmado ? 'border-default-300 text-default-500 hover:text-success hover:border-success' : ''}`}
            >
              <Icon icon={isArmado ? "lucide:check-circle-2" : "lucide:circle"} width={20} />
            </Button>
            <div className="flex gap-1">
              <Button isIconOnly size="sm" variant="light" onPress={() => onAddExtra(solicitud)} className="text-warning-600 min-w-8 w-8 h-8">
                <Icon icon="lucide:plus" width={18} />
              </Button>
              <Button isIconOnly size="sm" variant="light" onPress={() => onViewDetail(solicitud)} className="text-gastronomia min-w-8 w-8 h-8">
                <Icon icon="lucide:eye" width={18} />
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

const BodegaTransitoPage: React.FC = () => {
  const toast = useToast();
  const history = useHistory();
  const [solicitudes, setSolicitudes] = React.useState<ISolicitud[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [currentView, setCurrentView] = React.useState<'inventario' | 'pedidos'>('inventario');

  const memoizedTitle = React.useMemo(() => (
    <div className="flex items-center gap-2">
      <Icon icon="lucide:container" className="text-secondary" width={24} />
      <span>Bodega de Tránsito</span>
    </div>
  ), []);

  usePageTitle(
    memoizedTitle as unknown as string,
    'Gestión de armado de carros diarios'
  );

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
    try {
      const data = await obtenerTodasSolicitudesService();
      setSolicitudes(data.filter(s => s.estado === 'Aceptada' || s.estado === 'AceptadaModificada'));
    } catch (error) { }
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

  React.useEffect(() => { loadData(); cargarFiltros(); cargarProductosPaginados(1, true); }, [cargarFiltros, cargarProductosPaginados]);
  React.useEffect(() => { filtersRef.current = selectedFilters; }, [selectedFilters]);

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

  const handlePrevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };
  const handleNextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };
  const handleToday = () => { setSelectedDate(new Date()); };

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
    setIsModalOpen(true);
  };

  const dateCol1 = new Date(selectedDate);
  const dateCol2 = new Date(selectedDate);
  dateCol2.setDate(selectedDate.getDate() + 1);

  return (
    <div className="flex h-[calc(100vh-100px)] overflow-hidden font-sans relative">
      {/* Área de Contenido Principal */}
      <div ref={mainScrollerRef} onScroll={handleScroll} className="flex-grow overflow-y-auto bg-default-50/50 dark:bg-background scrollbar-hide pb-20">
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

              {/* Tabla de productos (Sin Card para sentimiento infinito) */}
              <Table
                aria-label="Tabla inventario"
                removeWrapper
                className="min-w-full"
                selectionMode="none"
                layout="fixed"
                classNames={{
                  table: "min-w-full table-fixed border-collapse bg-transparent",
                  thead: "[&>tr]:first:shadow-none sticky top-0 z-30",
                  th: "bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs h-12 sticky top-0 z-30 border-b border-default-200/50 shadow-sm outline-none text-center",
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
                      className="cursor-pointer hover:bg-default-50 transition-colors"
                      onClick={() => handleRowClick(item)}
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
                            {item.stock}
                          </span>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip content="Control Bodega" color="primary" delay={100} closeDelay={0}>
                          <span className="block text-center">{item.stockLimit || '-'}</span>
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
                          <Tooltip content="Ver Movimiento">
                            <Button isIconOnly variant="light" size="sm" onPress={() => verMovimientos(item.idProducto.toString(), item.nombreProducto)} className="text-default-400 hover:text-secondary">
                              <Icon icon="lucide:arrow-right" width={18} />
                            </Button>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-content1 p-6 rounded-2xl shadow-sm border border-default-200 dark:border-default-100 mx-4">
                <div>
                  <h1 className="text-2xl font-bold text-secondary dark:text-white flex items-center gap-2">
                    <Icon icon="lucide:shopping-cart" className="text-secondary" width={28} />
                    Gestión de Pedidos Diarios
                  </h1>
                  <p className="text-default-500 text-sm mt-1">Planificación y seguimiento de armado de carros para clases</p>
                </div>
              </div>

              <Accordion variant="splitted" selectionMode="multiple" defaultSelectedKeys={["gestion-pedidos"]} className="px-4 w-full">
                <AccordionItem
                  key="gestion-pedidos"
                  aria-label="Pedidos"
                  title={<span className="font-bold text-lg">Pedidos Activos</span>}
                  subtitle={`${getRequestsForDate(dateCol1).length} solicitudes para hoy`}
                  classNames={{
                    base: "shadow-md border border-default-200 dark:border-default-100 rounded-2xl overflow-hidden bg-white dark:bg-content1 p-0",
                    title: "font-bold text-secondary",
                    trigger: "px-6 py-4",
                    content: "px-6 pb-6 pt-2"
                  }}
                >
                  <div className="space-y-8">
                    {/* Controles de Fecha */}
                    <div className="flex items-center gap-2 bg-default-50 dark:bg-default-100/30 rounded-full p-1 border border-default-200 dark:border-default-100 shadow-sm max-w-md mx-auto">
                      <Button variant="flat" onPress={handleToday} size="sm" className="flex-grow h-8 font-bold capitalize bg-white dark:bg-default-100/50 text-secondary dark:text-foreground rounded-full" startContent={<Icon icon="lucide:calendar" className="text-primary" width={14} />}>
                        {formatDate(selectedDate)}
                      </Button>
                      <div className="flex gap-1 shrink-0 px-1">
                        <Button isIconOnly size="sm" variant="light" onPress={handlePrevDay} className="rounded-full h-8 w-8 min-w-0"><Icon icon="lucide:chevron-left" width={16} /></Button>
                        <Button isIconOnly size="sm" variant="light" onPress={handleNextDay} className="rounded-full h-8 w-8 min-w-0"><Icon icon="lucide:chevron-right" width={16} /></Button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-xs font-bold text-default-400 uppercase tracking-widest">{formatDate(dateCol1)}</span>
                          <div className="flex-grow border-t border-default-100 border-dashed"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {getRequestsForDate(dateCol1).length > 0 ? getRequestsForDate(dateCol1).map(s => (
                            <RequestCard key={s.id} solicitud={s} onUpdate={loadData} onAddExtra={handleOpenExtra} onViewDetail={handleOpenDetail} />
                          )) : (
                            <div className="col-span-full py-12 text-center border-2 border-dashed border-default-100 rounded-2xl">
                              <Icon icon="lucide:calendar-x" className="mx-auto mb-2 text-default-200" width={48} />
                              <p className="text-default-400 font-bold">No hay pedidos registrados para este día</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2">
                        <div className="flex items-center gap-2 px-1 mb-4">
                          <span className="text-xs font-bold text-default-400 uppercase tracking-widest">{formatDate(dateCol2)}</span>
                          <div className="flex-grow border-t border-default-100 border-dashed"></div>
                          <Chip size="sm" variant="dot" color="primary" className="border-none text-[10px] h-5">Próxima Jornada</Chip>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-80">
                          {getRequestsForDate(dateCol2).length > 0 ? getRequestsForDate(dateCol2).map(s => (
                            <RequestCard key={s.id} solicitud={s} onUpdate={loadData} onAddExtra={handleOpenExtra} onViewDetail={handleOpenDetail} />
                          )) : (
                            <div className="col-span-full py-8 text-center border-2 border-dashed border-default-50 rounded-2xl">
                              <p className="text-xs text-default-300 italic">No hay pedidos anticipados</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionItem>
              </Accordion>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Riel de Navegación Derecho */}
      <div className="w-[70px] shrink-0 bg-white dark:bg-content1 border-l border-default-200 dark:border-default-100 flex flex-col items-center py-6 gap-4 z-40 sticky right-0 shadow-[-4px_0_15px_rgba(0,0,0,0.02)]">
        <Tooltip content="Inventario Consolidado" placement="left">
          <Button
            isIconOnly
            variant={currentView === 'inventario' ? 'solid' : 'light'}
            color={currentView === 'inventario' ? 'primary' : 'default'}
            onPress={() => setCurrentView('inventario')}
            className={`w-12 h-12 rounded-2xl transition-all duration-300 ${currentView === 'inventario' ? 'shadow-lg shadow-primary/30' : 'text-default-400 hover:bg-default-100'}`}
          >
            <Icon icon="lucide:package-2" width={24} />
          </Button>
        </Tooltip>

        <Tooltip content="Gestión de Pedidos" placement="left">
          <Button
            isIconOnly
            variant={currentView === 'pedidos' ? 'solid' : 'light'}
            color={currentView === 'pedidos' ? 'secondary' : 'default'}
            onPress={() => setCurrentView('pedidos')}
            className={`w-12 h-12 rounded-2xl transition-all duration-300 ${currentView === 'pedidos' ? 'shadow-lg shadow-secondary/30' : 'text-default-400 hover:bg-default-100'}`}
          >
            <Icon icon="lucide:clipboard-list" width={24} />
          </Button>
        </Tooltip>

        <div className="mt-auto border-t border-default-100 w-8 pt-4 flex flex-col gap-4">
          {/* Refresh icon removed as requested */}
        </div>
      </div>

      {/* Modals Functionality */}
      <Modal isOpen={isExtraOpen} onOpenChange={onExtraOpenChange}>
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
              <ModalFooter><Button variant="light" onPress={onClose}>Cancelar</Button><Button className="bg-gastronomia text-white" onPress={handleSaveExtra}>Guardar</Button></ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isDetailOpen} onOpenChange={onDetailOpenChange} size="3xl" scrollBehavior="inside" backdrop="blur">
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
                          <tr key={i} className="border-b"><td className="py-2">{it.productoNombre}</td><td className="text-right">{it.cantidad}</td><td>{it.unidadMedida}</td><td>{it.esAdicional ? 'Extra' : 'Receta'}</td></tr>
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

      <Modal isOpen={isModalOpen} onOpenChange={onModalOpenChange} size="lg" backdrop="blur" placement="top" classNames={{ base: "mt-4" }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-default-100 dark:border-default-50 bg-white dark:bg-content2">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:package-check" className="text-primary" width={24} />
                  <span className="font-bold text-lg text-secondary dark:text-foreground">Control Bodega</span>
                </div>
              </ModalHeader>
              <ModalBody className="py-6">
                <FormularioProducto
                  producto={productoSeleccionado}
                  onClose={onClose}
                  mode="editar"
                  origenContext="bodega"
                  categorias={categoriasFull}
                  unidades={unidadesFull as any}
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

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .container, .container * { visibility: hidden !important; }
          section[role="dialog"], section[role="dialog"] * { visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default BodegaTransitoPage;