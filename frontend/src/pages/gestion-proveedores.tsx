/**
 * PÁGINA DE GESTIÓN DE PROVEEDORES
 * Conectada con el backend /api/v1/proveedor
 * Incluye cotización por rango de fechas con exportación a Excel.
 */

import React from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Chip,
  DatePicker,
  DateRangePicker,
  Divider,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Tooltip,
  useDisclosure,
} from '@heroui/react';
import { CalendarDate } from '@internationalized/date';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTitle } from '../hooks/usePageTitle';
import { useModulePermission, usePermission } from '../contexts/permission-context';
import { usePeriodoSemana } from '../contexts/periodo-semana-context';
import { obtenerSemanasPorPeriodoService } from '../services/academica/semana-service';
import BookPageLoader from '../components/BookPageLoader';
import RielNavegacion from '../components/RielNavegacion';
import type { ISemana } from '../types/academica/semana.types';
import {
  obtenerProveedoresService,
  obtenerProveedoresPaginadoService,
  obtenerProveedorDetalleService,
  obtenerProductosPorFechaService,
  crearProveedorService,
  actualizarProveedorService,
  eliminarProveedorService,
  agregarProductoProveedorService,
  actualizarPrecioProductoService,
  quitarProductoProveedorService,
  toggleProductoProveedorService,
  obtenerCotizacionPorRangoService,
  obtenerProductosDisponiblesService,
  obtenerCategoriasActivasJsonService,
  buscarProductosGlobalService,
  listarProveedoresSelectorService,
  sincronizarPreciosExcelService,
  descargarExcelPlantillaService,
  sincronizarPrecioDesdeNetoService,
  sincronizarPrecioDesdeIvaService,
  obtenerPedidosSemanaService,
  obtenerCotizacionConsolidadaService,
  obtenerCotizacionDeCanceladasService,
  obtenerDisponibleRealService,
  registrarReservasStockService,
  type IDisponibleReal,
  actualizarEstadoProveedorService,
  crearOrdenPedidoService,
  listarOrdenesPedidoService,
  obtenerOrdenPedidoDetalleService,
  cambiarEstadoOrdenPedidoService,
  sincronizarEstadosOrdenPedidoService,
} from '../services/proveedor/proveedor-service';
import type {
  IProveedor,
  IProveedorDetalle,
  IProveedorProducto,
  IProveedorProductoAddDTO,
  IProveedorCreateDTO,
  IProveedorUpdateDTO,
  EstadoProveedor,
  ICotizacionResponse,
  ICotizacionProveedor,
  IDiaEntregaDTO,
  DiaSemana,
  IProductoDisponibleDTO,
  IBusquedaProductosGlobal,
  IProductoBuscado,
  IProveedorSelector,
  ISyncExcelResult,
  IPedidoSemanaResumen,
  ICotizacionConsolidadaResponse,
  IProveedorGrupoConsolidado,
  IProductoConsolidado,
  TDiaSemana,
  EstadoOrdenPedido,
  IOrdenPedidoListItem,
  IOrdenPedidoConDetalles,
  IDetalleOrdenPedido,
  IEntregaReal,
} from '../types/proveedor/proveedor.types';
import type { IProductoRecetaSelection } from '../types/inventario/producto.types';
import { nombreFeriadoChile } from '../utils/feriados-chile';

import {
  DIAS_SEMANA_OPTIONS, DIAS_ABREV, parseChileanPrice, formatChileanPrice, smartPriceInput,
  formatPrecio, IVA_RATIO, round3, esDesincronizado, fmtN, cl, sc,
  styleTitle, styleHeader, styleCat, styleNum, styleText, styleTotal,
  styleSinProveedor, styleProvHeader, styleTotalPositivo,
  DIA_ORDEN, DIAS_TODOS, netoSolicitud, addDaysISO, getMondayISO, DIAS_ABREV_OC,
  getEntregaKey, buildColsOC,
} from './gestion-proveedores/constants';
import type { ColSpecOC } from './gestion-proveedores/constants';
import { renderEstado, renderDisponibilidad } from './gestion-proveedores/ui-helpers';
import EntregaInput from './gestion-proveedores/EntregaInput';
import OrdenDetalleTabla from './gestion-proveedores/OrdenDetalleTabla';
import CotizacionModal from './gestion-proveedores/CotizacionModal';
import FormularioProveedor from './gestion-proveedores/FormularioProveedor';
import FormularioAsignarProducto from './gestion-proveedores/FormularioAsignarProducto';
import ProductosProveedor from './gestion-proveedores/ProductosProveedor';
import BusquedaResultados from './gestion-proveedores/BusquedaResultados';
import ProveedorCotizacionTabla from './gestion-proveedores/ProveedorCotizacionTabla';
import OrdenPedidoModal from './gestion-proveedores/OrdenPedidoModal';
import OrdenesVista from './gestion-proveedores/OrdenesVista';


// ── Componente principal ──────────────────────────────────────────────────────

const GestionProveedoresPage: React.FC = () => {
  const { isLoading: permLoading, isAdmin } = usePermission();

  // ── Permisos de la vista Proveedores ──
  const { canRead: prov_VerLista }       = useModulePermission('GESTION_PROVEEDORES');
  const { canRead: prov_DatosProv }      = useModulePermission('GPRV_DATOS_PROV');
  const verTabProveedores                = prov_VerLista || prov_DatosProv;
  const { canRead: prov_NuevoProv }      = useModulePermission('GPRV_NUEVO_PROV');
  const { canRead: prov_SyncExcel }      = useModulePermission('GPRV_SYNC_EXCEL');
  const { canCreate: prov_GenerarOrden } = useModulePermission('GPRV_GENERAR_ORDEN');
  const { canRead: prov_Cotizacion }     = useModulePermission('GPRV_COTIZACION');
  const { canRead: prov_CambiarEstado }  = useModulePermission('GPRV_CAMBIAR_ESTADO_PROV');
  const { canRead: prov_EditarProv }     = useModulePermission('GPRV_EDITAR_PROV');
  const { canRead: prov_AsignarProd }    = useModulePermission('GPRV_ASIGNAR_PROD');
  const { canRead: prov_EliminarProv }   = useModulePermission('GPRV_ELIMINAR_PROV');
  const { canRead: prov_ExportDatos }    = useModulePermission('GPRV_EXPORT_DATOS');

  // ── Permisos de la vista Órdenes de Pedido ──
  // canRead para verOrdenes (BinaryRead: puedeLeer=true es suficiente para ver la pestaña).
  // canCreate para las acciones: BinaryWrite → solo true cuando puedeCrear=true (Escritura real,
  // no propagación de Lectura que solo deja puedeLeer=true).
  const { canRead: verOrdenes }           = useModulePermission('GPRV_ORDENES');
  const { canRead: op_VerPendEnviada }    = useModulePermission('GPRV_PENDIENTE_ENVIADA');
  const { canRead: op_VerConfirmada }     = useModulePermission('GPRV_CONFIRMADA');
  const { canCreate: op_CancelarOp }      = useModulePermission('GPRV_CANCELAR_OP');
  const { canCreate: op_ExportExcel }     = useModulePermission('GPRV_EXPORT_OP');

  // Context global de período/semana — sólo se LEE (no se muta) para el modal de OC.
  const { periodos: ctxPeriodos } = usePeriodoSemana();
  const location = useLocation();
  const history = useHistory();

  /** Semana ID a pre-seleccionar cuando el modal se abre desde la notificación "Sin OP". */
  const ocAutoSemanaId = React.useRef<number | null>(null);

  // ── Vista de Órdenes de Pedido (tab switcher) ────────────────────────
  const [currentView, setCurrentView] = React.useState<'proveedores' | 'ordenes'>('proveedores');

  // Auto-switch: si no tiene acceso a la pestaña Proveedores pero sí a Órdenes → ir a Órdenes.
  React.useEffect(() => {
    if (!permLoading && !verTabProveedores && verOrdenes) {
      setCurrentView('ordenes');
    }
  }, [permLoading, verTabProveedores, verOrdenes]);

  usePageTitle(
    currentView === 'proveedores' ? 'Gestión de Proveedores' : 'Órdenes de Pedido',
    currentView === 'proveedores'
      ? 'Administre los proveedores y sus productos con precios actualizados.'
      : 'Planificación, cotización y generación de órdenes de compra.',
    currentView === 'proveedores' ? 'lucide:truck' : 'lucide:clipboard-list'
  );

  // ── Estado principal ──
  const [proveedores, setProveedores] = React.useState<IProveedor[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // ── Filtros básicos ──
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filtroEstado, setFiltroEstado] = React.useState('');

  // ── Filas expandidas ──
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());
  const [detalleCache, setDetalleCache] = React.useState<Record<number, IProveedorDetalle>>({});
  const [loadingDetalle, setLoadingDetalle] = React.useState<Set<number>>(new Set());

  // ── Modal proveedor ──
  const { isOpen: isProvModal, onOpen: openProvModal, onOpenChange: onProvModalChange } = useDisclosure();
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar' | 'ver'>('crear');
  const [proveedorSeleccionado, setProveedorSeleccionado] = React.useState<IProveedor | null>(null);

  // ── Modal producto ──
  const { isOpen: isProdModal, onOpen: openProdModal, onOpenChange: onProdModalChange } = useDisclosure();
  const [proveedorParaProducto, setProveedorParaProducto] = React.useState<number | null>(null);
  // ── Productos disponibles para el proveedor seleccionado (sin caché por sesión) ──
  const [productos, setProductos] = React.useState<IProductoDisponibleDTO[]>([]);

  // Limpiar datos del modal cuando se cierra
  React.useEffect(() => {
    if (!isProdModal) {
      // Reset: vaciar productos y limpiar estado interno del formulario
      setProductos([]);
    }
  }, [isProdModal]);

  // ── Scroll infinito ──
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalRegistros, setTotalRegistros] = React.useState(0);
  const nextPageRef = React.useRef(1);
  const isLoadingRef = React.useRef(false);

  // ── Modal confirmar eliminar proveedor ──
  const { isOpen: isDelModal, onOpen: openDelModal, onOpenChange: onDelModalChange } = useDisclosure();
  // Modal de forzar eliminación (solo Administrador: provider con productos activos)
  const { isOpen: isForceDelModal, onOpen: openForceDelModal, onOpenChange: onForceDelModalChange } = useDisclosure();
  const [proveedorAEliminar, setProveedorAEliminar] = React.useState<IProveedor | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  // ── Modal confirmar cambiar estado proveedor ──
  const { isOpen: isToggleEstadoModal, onOpen: openToggleEstadoModal, onOpenChange: onToggleEstadoModalChange } = useDisclosure();
  const [proveedorAToggle, setProveedorAToggle] = React.useState<IProveedor | null>(null);
  const [togglingEstadoId, setTogglingEstadoId] = React.useState<number | null>(null);

  // ── Modal confirmar quitar producto ──
  const { isOpen: isQuitarModal, onOpen: openQuitarModal, onOpenChange: onQuitarModalChange } = useDisclosure();
  const [quitarTarget, setQuitarTarget] = React.useState<{ idProveedor: number; idProducto: number; nombre: string } | null>(null);

  // ── Precio inline ──
  const [editingPrecio, setEditingPrecio] = React.useState<{ idProveedorProducto: number; campo: 'neto' | 'iva' | 'marca' | 'contenido' } | null>(null);
  const [precioTemp, setPrecioTemp] = React.useState('');
  const blurTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleGuardarPrecioRef = React.useRef<() => Promise<void>>(() => Promise.resolve());

  // ── Filtro mostrar inactivos ──
  const [mostrarInactivos, setMostrarInactivos] = React.useState(true);
  const [savingPrecio, setSavingPrecio] = React.useState(false);

  // ── Modal cotización ──
  const { isOpen: isCotizModal, onOpen: openCotizModal, onOpenChange: onCotizModalChange } = useDisclosure();
  const [dateRangeProyeccion, setDateRangeProyeccion] = React.useState<{ start: CalendarDate; end: CalendarDate } | null>(null);
  const [cotizacionData, setCotizacionData] = React.useState<ICotizacionResponse | null>(null);
  const [loadingCotizacion, setLoadingCotizacion] = React.useState(false);
  const [errorCotizacion, setErrorCotizacion] = React.useState<string | null>(null);

  // ── Modal sincronización de precios desde Excel ──
  const { isOpen: isSyncExcelModal, onOpen: openSyncExcelModal, onOpenChange: onSyncExcelModalChange } = useDisclosure();
  const [proveedoresSelector, setProveedoresSelector] = React.useState<IProveedorSelector[]>([]);
  const [syncProveedorId, setSyncProveedorId] = React.useState<number | null>(null);
  const [syncFile, setSyncFile] = React.useState<File | null>(null);
  const [syncLoading, setSyncLoading] = React.useState(false);
  const [syncResult, setSyncResult] = React.useState<ISyncExcelResult | null>(null);
  const [syncError, setSyncError] = React.useState<string | null>(null);
  const [loadingSelector, setLoadingSelector] = React.useState(false);
  const [syncVista, setSyncVista] = React.useState<'sincronizados' | 'sin_cambios' | 'no_encontrados'>('sincronizados');
  const excelInputRef = React.useRef<HTMLInputElement>(null);

  // ── Vista de Órdenes de Pedido (tab switcher) ────────────────────────
  const [opLista, setOpLista] = React.useState<IOrdenPedidoListItem[]>([]);
  const [opCargando, setOpCargando] = React.useState(false);
  const [opError, setOpError] = React.useState<string | null>(null);
  const [opExpandidosIds, setOpExpandidosIds] = React.useState<Set<number>>(new Set());
  const [opDetalles, setOpDetalles] = React.useState<Map<number, IOrdenPedidoConDetalles>>(new Map());
  const [opCargandoDetalleIds, setOpCargandoDetalleIds] = React.useState<Set<number>>(new Set());
  const [opCambiandoEstadoId, setOpCambiandoEstadoId] = React.useState<number | null>(null);
  /** Modal de confirmación para CANCELAR una orden */
  const [opConfirmCancelar, setOpConfirmCancelar] = React.useState<IOrdenPedidoListItem | null>(null);
  /** Rango de fechas para el listado de OPs: 30 = últimos 30 días, 90 = últimos 3 meses, null = todas */
  const [opRango, setOpRango] = React.useState<number | null>(30);

  // ── Modal Orden Pedido (Tarea #13) ────────────────────────────────────
  const {
    isOpen: isOrdenPedidoModal,
    onOpen: openOrdenPedidoModal,
    onOpenChange: onOrdenPedidoModalChange,
  } = useDisclosure();
  const [ocPaso, setOcPaso] = React.useState<1 | 2>(1);
  const [ocPeriodo, setOcPeriodo] = React.useState<{ anio: number; semestre: number } | null>(null);
  const [ocSemanasPeriodo, setOcSemanasPeriodo] = React.useState<ISemana[]>([]);
  const [ocSemana, setOcSemana] = React.useState<ISemana | null>(null);
  const [ocPedidos, setOcPedidos] = React.useState<IPedidoSemanaResumen[]>([]);
  const [ocLoadingPedidos, setOcLoadingPedidos] = React.useState(false);
  const [ocErrorPedidos, setOcErrorPedidos] = React.useState<string | null>(null);
  const [ocSeleccionados, setOcSeleccionados] = React.useState<Set<number>>(new Set());
  const [ocCotizacion, setOcCotizacion] = React.useState<ICotizacionConsolidadaResponse | null>(null);
  const [ocLoadingCotizacion, setOcLoadingCotizacion] = React.useState(false);
  const [ocErrorCotizacion, setOcErrorCotizacion] = React.useState<string | null>(null);
  /**
   * Cantidades editables del Paso 2.
   * idProveedor → idProducto → diaEntrega (TDiaSemana) → cantidad editable
   */
  const [ocCantidades, setOcCantidades] = React.useState<
    Record<number, Record<number, Record<string, number>>>
  >({});
  /** Snapshot inmutable de las cantidades iniciales calculadas por construirCantidades().
   *  Usada para redistribución con botones ± (fase 1: recuperar lo restado) y para restaurar filas. */
  const [ocCantidadesOriginales, setOcCantidadesOriginales] = React.useState<
    Record<number, Record<number, Record<string, number>>>
  >({});
  /**
   * Día de entrega asignado a cada solicitud, por proveedor: idProveedor → idSolicitud → entregaKey.
   * Es la capa que se edita al "mover" una solicitud; de ella se derivan las cantidades por día.
   */
  const [ocSolicitudDia, setOcSolicitudDia] = React.useState<
    Record<number, Record<number, string>>
  >({});
  /** Snapshot inicial de la capa solicitud→día, para el botón "volver al inicial". */
  const [ocSolicitudDiaOriginales, setOcSolicitudDiaOriginales] = React.useState<
    Record<number, Record<number, string>>
  >({});
  /** Disponible real por producto (idProducto → {stockFisico, demanda, disponible}) para el Paso 2. */
  const [ocDisponible, setOcDisponible] = React.useState<Record<number, IDisponibleReal>>({});
  /** Checkbox "Cubrir con disponible": reduce el pedido por el disponible (parcial o total). */
  const [ocCubrirDisponible, setOcCubrirDisponible] = React.useState(false);
  /** Snapshot de cantidades antes de aplicar "cubrir con disponible", para revertir al desmarcar. */
  const [ocCantidadesPreCover, setOcCantidadesPreCover] = React.useState<
    Record<number, Record<number, Record<string, number>>>
  >({});
  /** Fecha elegida por el usuario en Paso 1 como base para calcular semana de entrega (YYYY-MM-DD). */
  const [ocFechaEntrega, setOcFechaEntrega] = React.useState<string | null>(null);

  const [ocGenerandoOrdenes, setOcGenerandoOrdenes] = React.useState(false);

  const [ocResultado, setOcResultado] = React.useState<{
    ordenes: Array<{ idOrdenPedido: number; nombreProveedor: string; cantidadDetalles: number }>;
    errores: Array<{ nombreProveedor: string; mensaje: string }>;
  } | null>(null);

  // ── Modal confirmar cambiar estado proveedor (Paso 2 cotización) ──
  const { isOpen: isOcToggleEstadoModal, onOpen: openOcToggleEstadoModal, onOpenChange: onOcToggleEstadoModalChange } = useDisclosure();
  const [ocProveedorAToggle, setOcProveedorAToggle] = React.useState<IProveedorGrupoConsolidado | null>(null);
  const [ocEstadoActualToggle, setOcEstadoActualToggle] = React.useState<EstadoProveedor | null>(null);
  const [ocTogglingEstadoId, setOcTogglingEstadoId] = React.useState<number | null>(null);
  // true cuando el Paso 2 fue abierto desde pedidos con OPs canceladas → usar endpoint de canceladas
  const [ocEsDeCanceladas, setOcEsDeCanceladas] = React.useState(false);

  // ── Búsqueda global optimizada ──
  const [busquedaGlobal, setBusquedaGlobal] = React.useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = React.useState<IBusquedaProductosGlobal[]>([]);
  const [loadingBusqueda, setLoadingBusqueda] = React.useState(false);
  const [errorBusqueda, setErrorBusqueda] = React.useState<string | null>(null);

  // ── Filtros de búsqueda global (multi-select consolidado) ──
  const [selectedFilterOptions, setSelectedFilterOptions] = React.useState<Set<string>>(new Set());

  // ── Control para ocultar productos inactivos en búsqueda ──
  const [mostrarInactivosBusqueda, setMostrarInactivosBusqueda] = React.useState(true);

  // ── Toast simple ──
  const [toast, setToast] = React.useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Carga inicial ─────────────────────────────────────────────────────────

  const cargarProveedoresPaginados = React.useCallback(
    async (page: number = 1, reset: boolean = false) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setIsLoading(true);

      if (reset) {
        setError(null);
        setProveedores([]);
        nextPageRef.current = 1;
      }

      try {
        const response = await obtenerProveedoresPaginadoService(
          filtroEstado || undefined,
          searchTerm || undefined,
          page
        );

        setProveedores((prev) => {
          const existing = reset ? [] : prev;
          const nuevosIds = new Set(existing.map((p) => p.idProveedor));
          const nuevosProveedores = response.data.filter(
            (p) => !nuevosIds.has(p.idProveedor)
          );
          return [...existing, ...nuevosProveedores];
        });

        setCurrentPage(response.page);
        setTotalRegistros(response.totalRegistros);
        nextPageRef.current = response.page + 1;
      } catch (err: any) {
        setError(err.message || 'Error al cargar proveedores');
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [filtroEstado, searchTerm]
  );

  React.useEffect(() => {
    const timer = setTimeout(() => {
      cargarProveedoresPaginados(1, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [cargarProveedoresPaginados]);

  // ── Scroll infinito ────────────────────────────────────────────────────────

  const paginatedProveedores = React.useMemo(() => {
    return proveedores;
  }, [proveedores]);

  /** Maneja el scroll global para cargar más proveedores. */
  React.useEffect(() => {
    const onScroll = () => {
      if (isLoading || isLoadingRef.current) return;

      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;

      // Gatillo: cargamos cuando faltan 3000px para el final
      if (scrollY + windowHeight > fullHeight - 3000) {
        if (proveedores.length < totalRegistros) {
          const pageToLoad = nextPageRef.current;
          cargarProveedoresPaginados(pageToLoad);
        }
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isLoading, proveedores.length, totalRegistros, cargarProveedoresPaginados]);

  // ── Expansión de filas ────────────────────────────────────────────────────

  const toggleRowExpansion = async (idProveedor: number) => {
    // Si ya estaba expandida → contraer y salir
    if (expandedRows.has(idProveedor)) {
      setExpandedRows(prev => {
        const next = new Set(prev);
        next.delete(idProveedor);
        return next;
      });
      return;
    }

    // PASO 1: expandir + marcar loading INMEDIATAMENTE.
    // Ambos updates en el mismo tick para que el render que abre la fila
    // ya tenga el flag de loading → el BookPageLoader aparece desde el primer frame.
    setExpandedRows(prev => new Set(prev).add(idProveedor));
    setLoadingDetalle(prev => new Set(prev).add(idProveedor));

    try {
      // PASO 2: garantizar mínimo 2000 ms de animación visible.
      // El BookPageLoader configura `pageChangeInterval=800ms` y cada flip dura 750ms,
      // o sea: el PRIMER page-flip empieza recién a los 800ms tras el mount.
      // Con un mínimo de 2 segundos se ven 1–2 flips completos → la animación se nota.
      // Si el fetch es más lento, el mínimo no agrega delay extra (Promise.all espera al más lento).
      const [detalle] = await Promise.all([
        obtenerProveedorDetalleService(idProveedor),
        new Promise<void>(resolve => setTimeout(resolve, 2000)),
      ]);
      setDetalleCache(prev => ({ ...prev, [idProveedor]: detalle }));
    } catch (err: any) {
      showToast(err.message || 'Error al cargar productos del proveedor', 'error');
      // Si falla, colapsar para que el usuario pueda reintentar
      setExpandedRows(prev => {
        const next = new Set(prev);
        next.delete(idProveedor);
        return next;
      });
    } finally {
      // PASO 3: limpiar el flag de loading → el render cambia del libro a la tabla.
      setLoadingDetalle(prev => {
        const s = new Set(prev);
        s.delete(idProveedor);
        return s;
      });
    }
  };

  const invalidarCacheProveedor = (idProveedor: number) => {
    setDetalleCache(prev => {
      const next = { ...prev };
      delete next[idProveedor];
      return next;
    });
  };

  // ── Búsqueda global optimizada (con debounce de 1.5s) ────────────────────────

  React.useEffect(() => {
    if (!busquedaGlobal.trim()) {
      setResultadosBusqueda([]);
      setErrorBusqueda(null);
      setExpandedRows(new Set()); // Limpiar expansión al vaciar búsqueda
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingBusqueda(true);
      setErrorBusqueda(null);
      try {
        const data = await buscarProductosGlobalService(busquedaGlobal);
        setResultadosBusqueda(data);
        // Expandir automáticamente todos los proveedores si hay resultados
        if (data && data.length > 0) {
          const allIds = new Set(data.map(p => p.idProveedor));
          setExpandedRows(allIds);
        }
      } catch (err: any) {
        setErrorBusqueda(err.message || 'Error en la búsqueda');
      } finally {
        setLoadingBusqueda(false);
      }
    }, 1500); // Debounce 1.5 segundos

    return () => clearTimeout(timer);
  }, [busquedaGlobal]);

  // ── Aplicar filtros a resultados de búsqueda ────────────────────────────────

  const aplicarFiltrosResultados = React.useMemo(() => {
    let resultado = resultadosBusqueda;

    // Extraer filtros de estado del multiselect
    const estadoFiltros = Array.from(selectedFilterOptions)
      .filter(opt => opt.startsWith('estado-'))
      .map(opt => opt.replace('estado-', '') as EstadoProveedor);

    // Filtrar por estado(s) si hay seleccionados
    if (estadoFiltros.length > 0) {
      resultado = resultado.filter(r => estadoFiltros.includes(r.estadoProveedor));
    }

    // Extraer filtro de precio del multiselect
    const precioFiltro = Array.from(selectedFilterOptions).find(opt => opt.startsWith('precio-'));

    // Ordenar por precio si hay seleccionado
    if (precioFiltro) {
      // Primero, ordenar los productos dentro de cada categoría
      resultado = [...resultado].map(proveedor => ({
        ...proveedor,
        categorias: proveedor.categorias.map(categoria => ({
          ...categoria,
          productos: [...categoria.productos].sort((a, b) => {
            const orden = precioFiltro === 'precio-asc' ? 1 : -1;
            return ((a.precioNeto ?? 0) - (b.precioNeto ?? 0)) * orden;
          }),
        })),
      }));

      // Luego, ordenar los proveedores por el precio mínimo de sus productos
      resultado.sort((provA, provB) => {
        const preciosA = provA.categorias.flatMap(cat => cat.productos.map(p => p.precioNeto ?? 0));
        const preciosB = provB.categorias.flatMap(cat => cat.productos.map(p => p.precioNeto ?? 0));
        const precioMinA = Math.min(...preciosA);
        const precioMinB = Math.min(...preciosB);

        if (precioFiltro === 'precio-asc') {
          return precioMinA - precioMinB;
        } else {
          return precioMinB - precioMinA;
        }
      });
    }

    // Filtrar productos inactivos
    if (!mostrarInactivosBusqueda) {
      resultado = resultado.map(proveedor => ({
        ...proveedor,
        categorias: proveedor.categorias.map(categoria => ({
          ...categoria,
          productos: categoria.productos.filter(p => p.activo),
        })),
      }));
    }

    return resultado;
  }, [resultadosBusqueda, selectedFilterOptions, mostrarInactivosBusqueda]);

  // ── Acciones de proveedor ─────────────────────────────────────────────────

  const handleNuevoProveedor = () => {
    setModalMode('crear');
    setProveedorSeleccionado(null);
    openProvModal();
  };

  const handleEditarProveedor = async (p: IProveedor) => {
    setModalMode('editar');
    try {
      const detalle = await obtenerProveedorDetalleService(p.idProveedor);
      setProveedorSeleccionado(detalle as any);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar detalles del proveedor', 'error');
      setProveedorSeleccionado(p);
    }
    openProvModal();
  };

  const handleVerProveedor = async (p: IProveedor) => {
    setModalMode('ver');
    try {
      const detalle = await obtenerProveedorDetalleService(p.idProveedor);
      setProveedorSeleccionado(detalle as any);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar detalles del proveedor', 'error');
      setProveedorSeleccionado(p);
    }
    openProvModal();
  };

  const handleConfirmarEliminar = (p: IProveedor) => {
    setProveedorAEliminar(p);
    openDelModal();
  };

  const handleConfirmarToggleEstado = (p: IProveedor) => {
    setProveedorAToggle(p);
    openToggleEstadoModal();
  };

  const handleToggleEstadoProveedor = async () => {
    if (!proveedorAToggle) return;
    const nuevoEstado: EstadoProveedor = proveedorAToggle.estadoProveedor === 'DISPONIBLE' ? 'NO_DISPONIBLE' : 'DISPONIBLE';
    setTogglingEstadoId(proveedorAToggle.idProveedor);
    try {
      await actualizarEstadoProveedorService(proveedorAToggle, nuevoEstado);
      setProveedores((prev) =>
        prev.map((p) =>
          p.idProveedor === proveedorAToggle.idProveedor ? { ...p, estadoProveedor: nuevoEstado } : p
        )
      );
      const label = nuevoEstado === 'DISPONIBLE' ? 'Disponible' : 'No Disponible';
      showToast(`Estado actualizado a ${label}`);
    } catch (err: any) {
      showToast(err.message || 'No se pudo actualizar el estado del proveedor', 'error');
    } finally {
      setTogglingEstadoId(null);
      setProveedorAToggle(null);
    }
  };

  const handleEliminarProveedor = async () => {
    if (!proveedorAEliminar) return;
    setDeletingId(proveedorAEliminar.idProveedor);
    try {
      await eliminarProveedorService(proveedorAEliminar.idProveedor);
      showToast(`Proveedor "${proveedorAEliminar.nombreDistribuidora}" eliminado correctamente`);
      await cargarProveedoresPaginados(1, true);
      setProveedorAEliminar(null);
    } catch (err: any) {
      if ((err as any).isConProductosActivos && isAdmin) {
        // El admin puede forzar la eliminación aún con productos activos
        openForceDelModal();
      } else {
        showToast(err.message || 'Error al eliminar el proveedor', 'error');
        setProveedorAEliminar(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleForzarEliminarProveedor = async () => {
    if (!proveedorAEliminar) return;
    setDeletingId(proveedorAEliminar.idProveedor);
    try {
      await eliminarProveedorService(proveedorAEliminar.idProveedor, true);
      showToast(`Proveedor "${proveedorAEliminar.nombreDistribuidora}" eliminado correctamente`);
      await cargarProveedoresPaginados(1, true);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar el proveedor', 'error');
    } finally {
      setDeletingId(null);
      setProveedorAEliminar(null);
    }
  };

  const handleGuardarProveedor = async (dto: IProveedorCreateDTO | IProveedorUpdateDTO) => {
    try {
      if (modalMode === 'crear') {
        await crearProveedorService(dto as IProveedorCreateDTO);
        showToast('Proveedor creado correctamente');
      } else if (modalMode === 'editar' && proveedorSeleccionado) {
        await actualizarProveedorService(proveedorSeleccionado.idProveedor, dto as IProveedorUpdateDTO);
        showToast('Proveedor actualizado correctamente');
        invalidarCacheProveedor(proveedorSeleccionado.idProveedor);
      }
      await cargarProveedoresPaginados(1, true);
    } catch (err: any) {
      throw err; // El formulario lo captura y muestra el error
    }
  };

  // ── Acciones de producto ──────────────────────────────────────────────────

  /**
   * Abre el modal de asignar producto.
   * IMPORTANTE: Carga los productos disponibles SIN CACHÉ en cada apertura
   * porque la lista disminuye conforme el usuario asigna productos al proveedor.
   */
  const handleAbrirAsignarProducto = async (idProveedor: number) => {
    setProveedorParaProducto(idProveedor);
    try {
      // Consulta fresca al backend (sin caché)
      const data = await obtenerProductosDisponiblesService(idProveedor);
      setProductos(data);
    } catch {
      showToast('Error al cargar la lista de productos disponibles', 'error');
    }
    openProdModal();
  };

  const handleGuardarProducto = async (dto: IProveedorProductoAddDTO): Promise<boolean> => {
    if (!proveedorParaProducto) return false;
    try {
      // El backend retorna true si fue exitoso
      const exitoso = await agregarProductoProveedorService(proveedorParaProducto, dto);

      if (exitoso) {
        showToast('Producto asignado correctamente');
        invalidarCacheProveedor(proveedorParaProducto);
        // Recargar detalle si la fila está expandida
        if (expandedRows.has(proveedorParaProducto)) {
          const detalle = await obtenerProveedorDetalleService(proveedorParaProducto);
          setDetalleCache(prev => ({ ...prev, [proveedorParaProducto]: detalle }));
        }
      }
      return exitoso;
    } catch (err: any) {
      throw err;
    }
  };

  // ── Precio inline ─────────────────────────────────────────────────────────

  const clearBlurTimeout = () => {
    if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
  };

  const handleBlurTexto = () => {
    blurTimeoutRef.current = setTimeout(() => { handleGuardarPrecioRef.current(); }, 1200);
  };

  const handleIniciarEditPrecio = (
    idProveedorProducto: number,
    valorActual: string | number,
    campo: 'neto' | 'iva' | 'marca' | 'contenido' = 'neto'
  ) => {
    clearBlurTimeout();
    setEditingPrecio({ idProveedorProducto, campo });
    const esCampoTexto = campo === 'marca' || campo === 'contenido';
    setPrecioTemp(esCampoTexto ? String(valorActual ?? '') : formatChileanPrice(valorActual as number));
  };

  // Handler que aplica input mask para precios; para campos texto pasa directo
  const handlePrecioTempChange = (value: string) => {
    if (editingPrecio?.campo === 'marca' || editingPrecio?.campo === 'contenido') {
      setPrecioTemp(value);
    } else {
      setPrecioTemp(smartPriceInput(value));
    }
  };

  const handleGuardarPrecio = async () => {
    clearBlurTimeout();
    if (!editingPrecio) return;
    const esCampoTexto = editingPrecio.campo === 'marca' || editingPrecio.campo === 'contenido';
    let dto: import('../types/proveedor/proveedor.types').IProveedorProductoUpdateDTO;
    if (esCampoTexto) {
      dto = editingPrecio.campo === 'marca'
        ? { marcaProducto: precioTemp.trim() }
        : { formatoContenido: precioTemp.trim() };
    } else {
      const precio = parseChileanPrice(precioTemp);
      if (isNaN(precio) || precio <= 0) {
        showToast('El precio debe ser un número válido mayor a 0 (ej: 1.234,567 o 1234)', 'error');
        return;
      }
      dto = editingPrecio.campo === 'iva' ? { precioConIva: precioTemp } : { precioNeto: precioTemp };
    }
    setSavingPrecio(true);
    try {
      const actualizado = await actualizarPrecioProductoService(editingPrecio.idProveedorProducto, dto);

      if (actualizado) {
        showToast(esCampoTexto ? 'Atributo actualizado correctamente' : 'Precio actualizado correctamente', 'success');

        const idPP = editingPrecio.idProveedorProducto;
        const campo = editingPrecio.campo;
        const IVA = 1.19;
        type CamposActualizados = { marcaProducto?: string | null; formatoContenido?: string | null; precioNeto?: number; precioConIva?: number };
        let cambios: CamposActualizados;
        if (campo === 'marca') {
          cambios = { marcaProducto: precioTemp.trim() };
        } else if (campo === 'contenido') {
          cambios = { formatoContenido: precioTemp.trim() };
        } else {
          const precioNum = parseChileanPrice(precioTemp);
          cambios = campo === 'neto'
            ? { precioNeto: precioNum, precioConIva: Math.round(precioNum * IVA * 100) / 100 }
            : { precioConIva: precioNum, precioNeto: Math.round((precioNum / IVA) * 100) / 100 };
        }

        setDetalleCache(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(idProvStr => {
            const idProv = parseInt(idProvStr);
            const detalle = updated[idProv];
            if (!detalle) return;
            const newCats: Record<string, IProveedorProducto[]> = {};
            let changed = false;
            Object.keys(detalle.productosPorCategoria).forEach(cat => {
              newCats[cat] = detalle.productosPorCategoria[cat].map((p: IProveedorProducto) => {
                if (p.idProveedorProducto === idPP) { changed = true; return { ...p, ...cambios }; }
                return p;
              });
            });
            if (changed) updated[idProv] = { ...detalle, productosPorCategoria: newCats };
          });
          return updated;
        });

        if (resultadosBusqueda.length > 0) {
          setResultadosBusqueda(prev => prev.map(resultado => ({
            ...resultado,
            categorias: resultado.categorias.map(cat => ({
              ...cat,
              productos: cat.productos.map(p =>
                p.idProveedorProducto === idPP ? { ...p, ...cambios } : p
              ),
            })),
          })));
        }
      }
    } catch (err: any) {
      const isConflict = err.response?.status === 409;
      showToast(err.message || 'Error al actualizar', isConflict ? 'warning' : 'error');
    } finally {
      setSavingPrecio(false);
      setEditingPrecio(null);
      setPrecioTemp('');
    }
  };
  handleGuardarPrecioRef.current = handleGuardarPrecio;

  // ── Toggle producto (habilitar/deshabilitar) ──────────────────────────────

  const handleToggleProducto = async (idProveedor: number, prod: IProveedorProducto) => {
    try {
      const nuevoEstado = !prod.activo;
      const resultado = await toggleProductoProveedorService(idProveedor, prod.idProducto);

      if (resultado) {
        showToast(
          nuevoEstado
            ? `Producto "${prod.nombreProducto}" habilitado`
            : `Producto "${prod.nombreProducto}" deshabilitado`,
          nuevoEstado ? 'success' : 'warning'
        );
        // ✅ Actualizar en memoria sin hacer segunda petición
        setDetalleCache(prev => {
          const updated = { ...prev };
          const detalle = updated[idProveedor];
          if (detalle) {
            Object.keys(detalle.productosPorCategoria).forEach(categoria => {
              detalle.productosPorCategoria[categoria] = detalle.productosPorCategoria[categoria].map(p => {
                if (p.idProducto === prod.idProducto) {
                  return { ...p, activo: nuevoEstado };
                }
                return p;
              });
            });
          }
          return updated;
        });

        // ✅ Actualizar también en resultados de búsqueda global
        setResultadosBusqueda(prev =>
          prev.map(proveedor => ({
            ...proveedor,
            categorias: proveedor.categorias.map(categoria => ({
              ...categoria,
              productos: categoria.productos.map(p => {
                if (p.idProducto === prod.idProducto) {
                  return { ...p, activo: nuevoEstado };
                }
                return p;
              }),
            })),
          }))
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Error al cambiar el estado del producto', 'error');
    }
  };

  // ── Sincronizar neto/IVA (corrección de desincronización) ──────────────────

  const handleSincronizarPrecio = async (
    idProveedor: number,
    prod: IProveedorProducto,
    direccion: 'desde-neto' | 'desde-iva'
  ) => {
    try {
      const resultado = direccion === 'desde-neto'
        ? await sincronizarPrecioDesdeNetoService(prod.idProveedorProducto)
        : await sincronizarPrecioDesdeIvaService(prod.idProveedorProducto);

      if (!resultado) {
        showToast('Los precios ya estaban sincronizados', 'success');
        return;
      }

      // El backend retornó true → calculamos localmente el nuevo valor con la MISMA
      // fórmula que el backend (round3 = scale=3) y actualizamos el caché en memoria,
      // sin segunda petición. Cuando el render vuelva a ejecutar `esDesincronizado(p)`
      // dará false y los iconos de sync desaparecen automáticamente.
      const nuevoValor = direccion === 'desde-neto'
        ? round3(Number(prod.precioNeto) * IVA_RATIO)
        : round3(Number(prod.precioConIva) / IVA_RATIO);

      setDetalleCache(prev => {
        const updated = { ...prev };
        const detalle = updated[idProveedor];
        if (detalle) {
          Object.keys(detalle.productosPorCategoria).forEach(cat => {
            detalle.productosPorCategoria[cat] = detalle.productosPorCategoria[cat].map(p =>
              p.idProveedorProducto === prod.idProveedorProducto
                ? direccion === 'desde-neto'
                  ? { ...p, precioConIva: nuevoValor }
                  : { ...p, precioNeto: nuevoValor }
                : p
            );
          });
        }
        return updated;
      });

      showToast(
        direccion === 'desde-neto'
          ? `IVA recalculado para "${prod.nombreProducto}": ${formatPrecio(nuevoValor)}`
          : `Neto recalculado para "${prod.nombreProducto}": ${formatPrecio(nuevoValor)}`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Error al sincronizar el precio', 'error');
    }
  };

  // ── Quitar producto ───────────────────────────────────────────────────────

  const handleConfirmarQuitarProducto = (idProveedor: number, prod: IProveedorProducto) => {
    setQuitarTarget({ idProveedor, idProducto: prod.idProducto, nombre: prod.nombreProducto });
    openQuitarModal();
  };

  const handleQuitarProducto = async () => {
    if (!quitarTarget) return;
    try {
      const resultado = await quitarProductoProveedorService(quitarTarget.idProveedor, quitarTarget.idProducto);

      if (resultado) {
        showToast(`Producto "${quitarTarget.nombre}" deshabilitado`);
        // ✅ Actualizar en memoria SIN hacer segunda petición
        setDetalleCache(prev => {
          const updated = { ...prev };
          const detalle = updated[quitarTarget.idProveedor];
          if (detalle) {
            Object.keys(detalle.productosPorCategoria).forEach(categoria => {
              detalle.productosPorCategoria[categoria] = detalle.productosPorCategoria[categoria].map(p => {
                if (p.idProducto === quitarTarget.idProducto) {
                  return { ...p, activo: false };
                }
                return p;
              });
            });
          }
          return updated;
        });

        // ✅ Actualizar también en resultados de búsqueda global
        setResultadosBusqueda(prev =>
          prev.map(proveedor => ({
            ...proveedor,
            categorias: proveedor.categorias.map(categoria => ({
              ...categoria,
              productos: categoria.productos.map(p => {
                if (p.idProducto === quitarTarget.idProducto) {
                  return { ...p, activo: false };
                }
                return p;
              }),
            })),
          }))
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Error al quitar el producto', 'error');
    } finally {
      setQuitarTarget(null);
    }
  };

  // ── Sincronización Excel ────────────────────────────────────────────────

  const handleAbrirSyncExcel = async () => {
    setSyncProveedorId(null);
    setSyncFile(null);
    setSyncResult(null);
    setSyncError(null);
    setLoadingSelector(true);
    openSyncExcelModal();
    try {
      const lista = await listarProveedoresSelectorService();
      setProveedoresSelector(lista);
    } catch (err: any) {
      setSyncError(err?.message ?? 'Error al cargar distribuidoras');
    } finally {
      setLoadingSelector(false);
    }
  };

  const handleSyncFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSyncFile(file);
    setSyncResult(null);
    setSyncError(null);
  };

  const handleConfirmarSyncExcel = async () => {
    if (syncProveedorId == null || !syncFile) return;
    setSyncLoading(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const result = await sincronizarPreciosExcelService(syncProveedorId, syncFile);
      setSyncResult(result);
      // Vista por defecto: sincronizados si hubo; si no, la siguiente categoría con datos
      const vistaDefault: 'sincronizados' | 'sin_cambios' | 'no_encontrados' =
        result.totalSincronizados > 0 ? 'sincronizados'
        : result.totalSinCambios > 0 ? 'sin_cambios'
        : result.totalNoEncontrados > 0 ? 'no_encontrados'
        : 'sincronizados';
      setSyncVista(vistaDefault);
      invalidarCacheProveedor(syncProveedorId);
      const distribuidora = proveedoresSelector.find(p => p.idProveedor === syncProveedorId)?.nombreDistribuidora ?? '';
      showToast(
        `Sincronización: ${result.totalSincronizados} actualizados, ${result.totalSinCambios} sin cambios, ${result.totalNoEncontrados} no encontrados${distribuidora ? ' · ' + distribuidora : ''}`,
        result.totalSincronizados === 0 && result.totalSinCambios === 0 ? 'error' : 'success'
      );
    } catch (err: any) {
      setSyncError(err?.message ?? 'Error al sincronizar los precios');
    } finally {
      setSyncLoading(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const handleCerrarSyncExcel = () => {
    // Si el cierre ocurre DESPUÉS de una sincronización (haya o no productos sincronizados),
    // refrescamos toda la página 500ms después para que la tabla y los detalles caché
    // muestren los precios nuevos. Equivalente a un F5 manual del usuario.
    const huboSincronizacion = syncResult !== null;
    setSyncProveedorId(null);
    setSyncFile(null);
    setSyncResult(null);
    setSyncError(null);
    if (excelInputRef.current) excelInputRef.current.value = '';
    if (huboSincronizacion) {
      setTimeout(() => window.location.reload(), 500);
    }
  };

  // ── Handlers Orden Pedido ─────────────────────────────────────────────

  /** Resetea estado del modal de OP y lo abre en Paso 1.
   *  Si se pasa `periodoOverride` se usa ese período en vez del actual. */
  const handleAbrirOrdenPedido = (periodoOverride?: { anio: number; semestre: number }) => {
    setOcPaso(1);
    setOcPedidos([]);
    setOcSeleccionados(new Set());
    setOcErrorPedidos(null);
    setOcCotizacion(null);
    setOcErrorCotizacion(null);
    setOcCantidades({});
    setOcSemana(null);
    setOcSemanasPeriodo([]);

    if (periodoOverride) {
      setOcPeriodo(periodoOverride);
    } else {
      // Pre-selecciona el período actual (si existe en periodos)
      const hoy = new Date();
      const mes = hoy.getMonth() + 1;
      const sem = mes <= 6 ? 1 : 2;
      const anio = hoy.getFullYear();
      const tienePeriodoActual = ctxPeriodos.some(p => p.anio === anio && p.semestres.includes(sem));
      if (tienePeriodoActual) {
        setOcPeriodo({ anio, semestre: sem });
      } else {
        setOcPeriodo(null);
      }
    }
    openOrdenPedidoModal();
  };

  /** Abre automáticamente el modal "Generar Orden Pedido" cuando se navega desde la notificación "Sin OP". */
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('abrirOP') !== '1') return;
    const anio = parseInt(params.get('anio') ?? '', 10);
    const semestre = parseInt(params.get('semestre') ?? '', 10);
    const semanaId = parseInt(params.get('semanaId') ?? '', 10);
    if (!anio || !semestre || !semanaId) return;
    ocAutoSemanaId.current = semanaId;
    handleAbrirOrdenPedido({ anio, semestre });
    history.replace('/gestion-proveedores');
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Cuando cambia el período: carga las semanas (local, sin tocar el context).
   *  Si hay un semanaId pendiente (desde notificación), la auto-selecciona. */
  React.useEffect(() => {
    if (!isOrdenPedidoModal || !ocPeriodo) {
      setOcSemanasPeriodo([]);
      return;
    }
    let cancelado = false;
    (async () => {
      try {
        const data = await obtenerSemanasPorPeriodoService(ocPeriodo.anio, ocPeriodo.semestre);
        if (!cancelado) {
          setOcSemanasPeriodo(data);
          if (ocAutoSemanaId.current !== null) {
            const target = data.find(s => s.idSemana === ocAutoSemanaId.current) ?? null;
            setOcSemana(target);
            ocAutoSemanaId.current = null;
          } else {
            setOcSemana(null);
          }
          setOcPedidos([]);
          setOcSeleccionados(new Set());
        }
      } catch {
        if (!cancelado) setOcSemanasPeriodo([]);
      }
    })();
    return () => { cancelado = true; };
  }, [isOrdenPedidoModal, ocPeriodo]);

  /** Cuando se elige una semana: carga pedidos APROBADO + 2000ms de BookPageLoader. */
  React.useEffect(() => {
    if (!isOrdenPedidoModal || !ocSemana) {
      setOcPedidos([]);
      setOcSeleccionados(new Set());
      return;
    }
    let cancelado = false;
    setOcLoadingPedidos(true);
    setOcErrorPedidos(null);
    setOcPedidos([]);
    setOcSeleccionados(new Set());
    (async () => {
      try {
        const [data] = await Promise.all([
          obtenerPedidosSemanaService(ocSemana.fechaInicio, ocSemana.fechaFin),
          new Promise<void>(r => setTimeout(r, 2000)),
        ]);
        if (!cancelado) setOcPedidos(data);
      } catch (err: any) {
        if (!cancelado) setOcErrorPedidos(err.message || 'Error al cargar pedidos');
      } finally {
        if (!cancelado) setOcLoadingPedidos(false);
      }
    })();
    return () => { cancelado = true; };
  }, [isOrdenPedidoModal, ocSemana]);

  /** Resetea la fecha de entrega al cambiar la semana académica.
   *  Usa hoy si cae dentro del rango de la semana, si no usa fechaInicio. */
  React.useEffect(() => {
    if (ocSemana) {
      const hoyISO = new Date().toISOString().slice(0, 10);
      if (hoyISO >= ocSemana.fechaInicio && hoyISO <= ocSemana.fechaFin) {
        setOcFechaEntrega(hoyISO);
      } else {
        setOcFechaEntrega(ocSemana.fechaInicio);
      }
    } else {
      setOcFechaEntrega(null);
    }
  }, [ocSemana]);

  /** Toggle selección de un pedido en Paso 1. */
  const toggleSeleccionPedido = (id: number) => {
    setOcSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * Construye el mapa inicial de cantidades editables (por día de entrega).
   * Para cada día de entrega D_i del proveedor: Entrega_D_i = Σ qty de días
   * desde la entrega anterior (exclusive) hasta D_i (inclusive).
   */
  const construirCantidades = (
    data: ICotizacionConsolidadaResponse,
  ): typeof ocCantidades => {
    const init: typeof ocCantidades = {};
    for (const prov of data.cotizacion) {
      if (prov.idProveedor == null) continue;
      const diasEntregaOrd = [...(prov.diasEntrega ?? [])].sort(
        (a, b) => DIA_ORDEN[a] - DIA_ORDEN[b],
      );
      const provMap: Record<number, Record<string, number>> = {};
      for (const cat of prov.categorias) {
        for (const prod of cat.productos) {
          const qtyByDay = new Map<TDiaSemana, number>();
          for (const c of prod.cantidadPorDia) {
            if (c.dia !== 'SIN_DIA') {
              qtyByDay.set(
                c.dia as TDiaSemana,
                (qtyByDay.get(c.dia as TDiaSemana) ?? 0) + c.cantidad,
              );
            }
          }
          // Descontar lo reservado por día: lo reservado ya se cubre con stock y no se pide al proveedor.
          const reservadoPorDia = new Map<string, number>();
          for (const s of (prod.solicitudes ?? [])) {
            if ((s.reservado ?? 0) > 0)
              reservadoPorDia.set(s.dia, (reservadoPorDia.get(s.dia) ?? 0) + (s.reservado ?? 0));
          }
          for (const [dia, val] of qtyByDay) {
            const net = Math.max(0, val - (reservadoPorDia.get(dia) ?? 0));
            if (net > 0) qtyByDay.set(dia, net); else qtyByDay.delete(dia);
          }
          const entregasProd: Record<string, number> = {};
          // Cantidades de días sin reserva de sala: se suman al día de entrega más próximo (netas de reserva)
          const sinDiaTotal = Math.max(0,
            prod.cantidadPorDia
              .filter(c => c.dia === 'SIN_DIA')
              .reduce((s, c) => s + c.cantidad, 0)
            - (reservadoPorDia.get('SIN_DIA') ?? 0));

          if (diasEntregaOrd.length === 0) {
            // Sin días de entrega configurados: acumular todo en LUNES como fallback
            const totalAll = [...qtyByDay.values()].reduce((s, v) => s + v, 0) + sinDiaTotal;
            if (totalAll > 0) entregasProd['LUNES'] = totalAll;
          } else if (diasEntregaOrd.length === 1) {
            // 1 entrega → recibe todo (incluyendo SIN_DIA)
            const total = [...qtyByDay.values()].reduce((s, v) => s + v, 0) + sinDiaTotal;
            entregasProd[diasEntregaOrd[0]] = total;
          } else {
            // Lógica prospectiva: para cada día de necesidad, asignar al ÚLTIMO día de
            // entrega ANTERIOR. Si no existe día anterior, usar el último (semana previa).
            const diasEntregaNum = diasEntregaOrd.map(d => DIA_ORDEN[d]);
            for (let diaNec = 1; diaNec <= 7; diaNec++) {
              const diaNecNombre = DIAS_TODOS[diaNec - 1];
              const qty = qtyByDay.get(diaNecNombre) ?? 0;
              if (qty === 0) continue;
              let asignado: number | null = null;
              for (let i = diasEntregaNum.length - 1; i >= 0; i--) {
                if (diasEntregaNum[i] < diaNec) { asignado = diasEntregaNum[i]; break; }
              }
              const esPrev = asignado === null;
              if (esPrev) asignado = diasEntregaNum[diasEntregaNum.length - 1];
              const entregaKey = esPrev
                ? `${DIAS_TODOS[asignado! - 1]}_prev`
                : DIAS_TODOS[asignado! - 1];
              entregasProd[entregaKey] = (entregasProd[entregaKey] ?? 0) + qty;
            }
            // SIN_DIA va al primer día de entrega
            if (sinDiaTotal > 0) {
              entregasProd[diasEntregaOrd[0]] = (entregasProd[diasEntregaOrd[0]] ?? 0) + sinDiaTotal;
            }
          }
          provMap[prod.idProducto] = entregasProd;
        }
      }
      init[prov.idProveedor] = provMap;
    }
    return init;
  };

  /**
   * Calcula el día de entrega (entregaKey) por defecto para un día de necesidad, replicando
   * la lógica prospectiva de construirCantidades para que la capa solicitud→día sea coherente
   * con las cantidades iniciales. Devuelve un día ("MARTES") o un día de semana previa ("MARTES_prev").
   */
  const entregaKeyParaDia = (
    dia: TDiaSemana | 'SIN_DIA',
    diasEntregaOrd: TDiaSemana[],
  ): string => {
    if (diasEntregaOrd.length === 0) return 'LUNES';
    if (diasEntregaOrd.length === 1) return diasEntregaOrd[0];
    if (dia === 'SIN_DIA') return diasEntregaOrd[0];
    const diasEntregaNum = diasEntregaOrd.map(d => DIA_ORDEN[d]);
    const diaNec = DIA_ORDEN[dia];
    let asignado: number | null = null;
    for (let i = diasEntregaNum.length - 1; i >= 0; i--) {
      if (diasEntregaNum[i] < diaNec) { asignado = diasEntregaNum[i]; break; }
    }
    const esPrev = asignado === null;
    if (esPrev) asignado = diasEntregaNum[diasEntregaNum.length - 1];
    return esPrev ? `${DIAS_TODOS[asignado! - 1]}_prev` : DIAS_TODOS[asignado! - 1];
  };

  /**
   * Construye la capa solicitud→día: por proveedor, a qué día de entrega queda asignada cada
   * solicitud por defecto (según su día de necesidad). Cada solicitud es atómica (un solo día).
   */
  const construirSolicitudDias = (
    data: ICotizacionConsolidadaResponse,
  ): Record<number, Record<number, string>> => {
    const init: Record<number, Record<number, string>> = {};
    for (const prov of data.cotizacion) {
      if (prov.idProveedor == null) continue;
      const diasEntregaOrd = [...(prov.diasEntrega ?? [])].sort(
        (a, b) => DIA_ORDEN[a] - DIA_ORDEN[b],
      );
      const solDia: Record<number, TDiaSemana | 'SIN_DIA'> = {};
      for (const cat of prov.categorias)
        for (const prod of cat.productos)
          for (const s of prod.solicitudes)
            solDia[s.idSolicitud] = s.dia;
      const provMap: Record<number, string> = {};
      for (const [idSolStr, dia] of Object.entries(solDia)) {
        provMap[Number(idSolStr)] = entregaKeyParaDia(dia, diasEntregaOrd);
      }
      init[prov.idProveedor] = provMap;
    }
    return init;
  };

  /**
   * Mueve una solicitud completa a otro día de entrega dentro de un proveedor: reubica la porción
   * de cada producto de esa solicitud del entregaKey viejo al nuevo, sin tocar los ± manuales.
   */
  const handleMoverSolicitud = (idProveedor: number, idSolicitud: number, nuevoKey: string) => {
    const prov = ocCotizacion?.cotizacion.find(p => p.idProveedor === idProveedor);
    if (!prov) return;
    const viejoKey = ocSolicitudDia[idProveedor]?.[idSolicitud];
    if (!viejoKey || viejoKey === nuevoKey) return;

    // Porciones (producto, cantidad NETA) que aporta esta solicitud en este proveedor (lo reservado
    // no se pide, así que se mueve solo el neto).
    const porProducto: Array<{ idProducto: number; cantidad: number }> = [];
    for (const cat of prov.categorias)
      for (const prod of cat.productos)
        for (const s of prod.solicitudes)
          if (s.idSolicitud === idSolicitud && netoSolicitud(s) > 0)
            porProducto.push({ idProducto: prod.idProducto, cantidad: netoSolicitud(s) });

    if (porProducto.length > 0) {
      // Reubica las porciones (viejoKey → nuevoKey) sobre una base de cantidades, devolviendo una copia nueva.
      const moverEnBase = (
        base: Record<number, Record<number, Record<string, number>>>,
      ): Record<number, Record<number, Record<string, number>>> => {
        const provMap = { ...(base[idProveedor] ?? {}) };
        for (const { idProducto, cantidad } of porProducto) {
          const dias = { ...(provMap[idProducto] ?? {}) };
          const restante = (dias[viejoKey] ?? 0) - cantidad;
          if (restante > 0.0005) dias[viejoKey] = Math.round(restante * 1000) / 1000;
          else delete dias[viejoKey];
          dias[nuevoKey] = Math.round(((dias[nuevoKey] ?? 0) + cantidad) * 1000) / 1000;
          provMap[idProducto] = dias;
        }
        return { ...base, [idProveedor]: provMap };
      };

      if (ocCubrirDisponible) {
        // Con "cubrir" activo, ocCantidades está reducido por el disponible. Si moviéramos sobre él,
        // reinyectaríamos la cantidad completa de la solicitud y reaparecería lo cubierto. Por eso
        // movemos sobre la base SIN cubrir (snapshot) y re-aplicamos el cubrir para la vista.
        const nuevaBase = moverEnBase(ocCantidadesPreCover);
        setOcCantidadesPreCover(nuevaBase);
        setOcCantidades(aplicarCubrirDisponible(nuevaBase));
      } else {
        setOcCantidades(prev => moverEnBase(prev));
      }
    }

    setOcSolicitudDia(prev => ({
      ...prev,
      [idProveedor]: { ...(prev[idProveedor] ?? {}), [idSolicitud]: nuevoKey },
    }));
  };

  /**
   * Vuelve un proveedor a su distribución inicial: restaura las cantidades por día y los
   * selectores de "mover" a como quedaron al cargar la cotización (deshace movimientos y ±).
   */
  const handleResetProveedorPaso2 = (idProveedor: number) => {
    const origCant = ocCantidadesOriginales[idProveedor] ?? {};
    const copiaCant: Record<number, Record<string, number>> = {};
    for (const [idProd, dias] of Object.entries(origCant)) {
      copiaCant[Number(idProd)] = { ...dias };
    }
    setOcCantidades(prev => ({ ...prev, [idProveedor]: copiaCant }));
    setOcSolicitudDia(prev => ({
      ...prev,
      [idProveedor]: { ...(ocSolicitudDiaOriginales[idProveedor] ?? {}) },
    }));
  };

  /** Carga el disponible real (inventario+tránsito − demanda comprometida) de los productos de la cotización. */
  const cargarDisponibleReal = async (data: ICotizacionConsolidadaResponse) => {
    const ids = new Set<number>();
    for (const prov of data.cotizacion)
      for (const cat of prov.categorias)
        for (const prod of cat.productos)
          ids.add(prod.idProducto);
    if (ids.size === 0) { setOcDisponible({}); return; }
    try {
      const lista = await obtenerDisponibleRealService([...ids]);
      const map: Record<number, IDisponibleReal> = {};
      for (const d of lista) map[d.idProducto] = d;
      setOcDisponible(map);
    } catch {
      setOcDisponible({});
    }
  };

  /**
   * Aplica "cubrir con disponible" sobre una base de cantidades: por producto, reduce el pedido en
   * min(disponible, pedido) — cubre total o parcial, dejando el saldo (lo que falta) por pedir.
   * Crea objetos nuevos (no muta la base, para poder revertir con el snapshot).
   */
  const aplicarCubrirDisponible = (
    base: Record<number, Record<number, Record<string, number>>>,
  ): Record<number, Record<number, Record<string, number>>> => {
    const r = (v: number) => Math.round(v * 1000) / 1000;
    const result: Record<number, Record<number, Record<string, number>>> = {};
    for (const [provStr, prods] of Object.entries(base)) {
      const newProds: Record<number, Record<string, number>> = {};
      for (const [prodStr, dias] of Object.entries(prods)) {
        const prodId = Number(prodStr);
        const disp = Math.max(0, ocDisponible[prodId]?.disponible ?? 0);
        const total = Object.values(dias).reduce((s, v) => s + v, 0);
        let coverage = Math.min(disp, total);
        const newDias: Record<string, number> = { ...dias };
        for (const key of Object.keys(newDias)) {
          if (coverage <= 0.0005) break;
          const val = newDias[key];
          const take = Math.min(coverage, val);
          const nv = r(val - take);
          if (nv > 0.0005) newDias[key] = nv; else delete newDias[key];
          coverage = r(coverage - take);
        }
        newProds[prodId] = newDias;
      }
      result[Number(provStr)] = newProds;
    }
    return result;
  };

  /** Marca/desmarca "cubrir con disponible": al marcar guarda snapshot y reduce; al desmarcar revierte. */
  const handleToggleCubrirDisponible = (checked: boolean) => {
    setOcCubrirDisponible(checked);
    if (checked) {
      setOcCantidadesPreCover(ocCantidades);
      setOcCantidades(prev => aplicarCubrirDisponible(prev));
    } else {
      setOcCantidades(ocCantidadesPreCover);
      setOcCantidadesPreCover({});
    }
  };

  /** Avanza al Paso 2: carga cotización consolidada + 2000ms de BookPageLoader. */
  const handleGenerarOrdenPedido = async () => {
    if (ocSeleccionados.size === 0 || !ocSemana || !ocFechaEntrega) return;
    setOcPaso(2);
    setOcLoadingCotizacion(true);
    setOcErrorCotizacion(null);
    setOcCotizacion(null);
    setOcCantidades({});

    const idsPedidoArr = [...ocSeleccionados];
    // Si todos los pedidos seleccionados tienen OPs canceladas (con o sin activas también),
    // usar el endpoint filtrado que carga solo los productos de las canceladas.
    const esDeCanceladas = idsPedidoArr.every(id => {
      const p = ocPedidos.find(p => p.idPedido === id);
      return p && p.cantidadOrdenCanceladas > 0;
    });
    setOcEsDeCanceladas(esDeCanceladas);

    try {
      const [data] = await Promise.all([
        esDeCanceladas
          ? obtenerCotizacionDeCanceladasService(idsPedidoArr)
          : obtenerCotizacionConsolidadaService(idsPedidoArr),
        new Promise<void>(r => setTimeout(r, 2000)),
      ]);
      setOcCotizacion(data);
      const cantInicial = construirCantidades(data);
      setOcCantidades(cantInicial);
      setOcCantidadesOriginales(cantInicial);
      setOcCubrirDisponible(false);
      setOcCantidadesPreCover({});
      const solDiasInicial = construirSolicitudDias(data);
      setOcSolicitudDia(solDiasInicial);
      setOcSolicitudDiaOriginales(solDiasInicial);
      void cargarDisponibleReal(data);
    } catch (err: any) {
      setOcErrorCotizacion(err.message || 'Error al obtener la cotización consolidada');
    } finally {
      setOcLoadingCotizacion(false);
    }
  };

  /** Vuelve al Paso 1 conservando la selección. */
  const handleVolverPaso1 = () => {
    setOcPaso(1);
    setOcErrorCotizacion(null);
  };

  /**
   * Genera una Orden de Pedido por cada proveedor visible en el Paso 2.
   * Para cada proveedor recolecta (idProducto, cantidad, fechaEntrega) donde cantidad > 0,
   * calcula la fecha ISO real desde el entregaKey + ocFechaEntrega (con ajuste por feriado),
   * y llama a crearOrdenPedidoService una vez por proveedor.
   */
  const handleConfirmarGenerarOrden = async () => {
    if (!ocCotizacion || !ocFechaEntrega || ocSeleccionados.size === 0) return;
    setOcGenerandoOrdenes(true);

    const lunes = getMondayISO(ocFechaEntrega);
    const idsPedidoArr = [...ocSeleccionados];

    const ordenesCreadas: Array<{ idOrdenPedido: number; nombreProveedor: string; cantidadDetalles: number }> = [];
    const erroresCreacion: Array<{ nombreProveedor: string; mensaje: string }> = [];

    for (const prov of ocCotizacion.cotizacion) {
      if (prov.idProveedor == null) continue;

      const nombreProv = prov.nombreDistribuidora ?? prov.nombreProveedor ?? `Proveedor #${prov.idProveedor}`;
      const cantidadesProv = ocCantidades[prov.idProveedor] ?? {};
      const solDiaProv = ocSolicitudDia[prov.idProveedor] ?? {};
      // Lookup idProducto → solicitudes (para atribuir cada entrega a las solicitudes de ese día).
      const solsPorProducto = new Map<number, Array<{ idSolicitud: number; cantidad: number; reservado?: number }>>();
      for (const cat of prov.categorias)
        for (const prod of cat.productos)
          solsPorProducto.set(prod.idProducto, prod.solicitudes);

      const entregas: Array<{
        idProducto: number;
        cantidad: number;
        fechaEntrega: string;
        solicitudes?: Array<{ idSolicitud: number; cantidadAtribuida: number }>;
      }> = [];

      for (const [idProductoStr, entregasProd] of Object.entries(cantidadesProv)) {
        const idProducto = Number(idProductoStr);
        for (const [entregaKey, cantidad] of Object.entries(entregasProd)) {
          if (!cantidad || cantidad <= 0) continue;

          const esPrev = entregaKey.endsWith('_prev');
          const dia = (esPrev ? entregaKey.replace('_prev', '') : entregaKey) as TDiaSemana;
          const base = esPrev ? addDaysISO(lunes, -7) : lunes;
          let fechaISO = addDaysISO(base, DIA_ORDEN[dia] - 1);

          const [añoS, mmS, ddS] = fechaISO.split('-');
          const fechaDate = new Date(Number(añoS), Number(mmS) - 1, Number(ddS));
          if (nombreFeriadoChile(fechaDate)) {
            const diasProvNum = [...(prov.diasEntrega ?? [])].map(d => DIA_ORDEN[d]).sort((a, b) => a - b);
            const diaOrigNum = DIA_ORDEN[dia];
            for (let i = diasProvNum.length - 1; i >= 0; i--) {
              if (diasProvNum[i] < diaOrigNum) {
                const candISO = addDaysISO(base, diasProvNum[i] - 1);
                const [cA, cM, cD] = candISO.split('-');
                const cand = new Date(Number(cA), Number(cM) - 1, Number(cD));
                if (!nombreFeriadoChile(cand)) { fechaISO = candISO; break; }
              }
            }
          }

          // Solicitudes atribuidas a esta línea: las asignadas a este día (entregaKey) para este producto.
          // Se atribuye el NETO (demanda − reservado): lo reservado se cubre con stock, no se pide.
          const solicitudesLinea = (solsPorProducto.get(idProducto) ?? [])
            .filter(s => solDiaProv[s.idSolicitud] === entregaKey && netoSolicitud(s) > 0)
            .map(s => ({ idSolicitud: s.idSolicitud, cantidadAtribuida: Math.round(netoSolicitud(s) * 1000) / 1000 }));

          entregas.push({
            idProducto,
            cantidad: Math.round(cantidad * 1000) / 1000,
            fechaEntrega: fechaISO,
            ...(solicitudesLinea.length > 0 && { solicitudes: solicitudesLinea }),
          });
        }
      }

      if (entregas.length === 0) continue;

      const idPedido = idsPedidoArr[0];

      try {
        const resultado = await crearOrdenPedidoService({ idPedido, idProveedor: prov.idProveedor, entregas });
        ordenesCreadas.push({
          idOrdenPedido: resultado.idOrdenPedido,
          nombreProveedor: nombreProv,
          cantidadDetalles: resultado.cantidadDetalles,
        });
      } catch (err: any) {
        erroresCreacion.push({
          nombreProveedor: nombreProv,
          mensaje: err.message || `Error al generar la orden`,
        });
      }
    }

    // Reservas de stock: si "cubrir con disponible" está activo, registrar por solicitud lo cubierto
    // desde el stock (para que deje de aparecer como disponible). Se distribuye la cobertura del
    // producto entre sus solicitudes (secuencial). No bloquea el resultado de la generación.
    if (ocCubrirDisponible) {
      const reservas: Array<{ idSolicitud: number; idProducto: number; cantidad: number }> = [];
      for (const prov of ocCotizacion.cotizacion) {
        if (prov.idProveedor == null) continue;
        for (const cat of prov.categorias) {
          for (const prod of cat.productos) {
            const disp = Math.max(0, ocDisponible[prod.idProducto]?.disponible ?? 0);
            if (disp <= 0.0005) continue;
            // El disponible ya excluye lo reservado: la cobertura se distribuye sobre el NETO de cada
            // solicitud y la reserva final = reserva previa + lo recién cubierto (el upsert por
            // (solicitud,producto) no debe perder la reserva hecha al aprobar el pedido).
            const totalDemanda = prod.solicitudes.reduce((s, x) => s + netoSolicitud(x), 0);
            let cobertura = Math.min(disp, totalDemanda);
            for (const sol of prod.solicitudes) {
              if (cobertura <= 0.0005) break;
              const cubierto = Math.min(cobertura, netoSolicitud(sol));
              if (cubierto > 0.0005) {
                reservas.push({
                  idSolicitud: sol.idSolicitud,
                  idProducto: prod.idProducto,
                  cantidad: Math.round(((sol.reservado ?? 0) + cubierto) * 1000) / 1000,
                });
                cobertura = Math.round((cobertura - cubierto) * 1000) / 1000;
              }
            }
          }
        }
      }
      if (reservas.length > 0) {
        try {
          await registrarReservasStockService(reservas);
        } catch {
          showToast('Las órdenes se generaron, pero no se pudieron registrar las reservas de stock', 'error');
        }
      }
    }

    setOcGenerandoOrdenes(false);

    if (ordenesCreadas.length > 0) {
      onOrdenPedidoModalChange();
      cargarProveedoresPaginados(1, true);
    }
    if (ordenesCreadas.length > 0 || erroresCreacion.length > 0) {
      setOcResultado({ ordenes: ordenesCreadas, errores: erroresCreacion });
    }
  };

  /**
   * Todo cubierto por disponible: solo registra las reservas de stock y cierra sin generar OPs.
   */
  const handleReservarYSalir = async () => {
    if (!ocCotizacion || !ocCubrirDisponible) return;
    setOcGenerandoOrdenes(true);
    const reservas: Array<{ idSolicitud: number; idProducto: number; cantidad: number }> = [];
    for (const prov of ocCotizacion.cotizacion) {
      if (prov.idProveedor == null) continue;
      for (const cat of prov.categorias) {
        for (const prod of cat.productos) {
          const disp = Math.max(0, ocDisponible[prod.idProducto]?.disponible ?? 0);
          if (disp <= 0.0005) continue;
          const totalDemanda = prod.solicitudes.reduce((s, x) => s + netoSolicitud(x), 0);
          let cobertura = Math.min(disp, totalDemanda);
          for (const sol of prod.solicitudes) {
            if (cobertura <= 0.0005) break;
            const cubierto = Math.min(cobertura, netoSolicitud(sol));
            if (cubierto > 0.0005) {
              reservas.push({
                idSolicitud: sol.idSolicitud,
                idProducto: prod.idProducto,
                cantidad: Math.round(((sol.reservado ?? 0) + cubierto) * 1000) / 1000,
              });
              cobertura = Math.round((cobertura - cubierto) * 1000) / 1000;
            }
          }
        }
      }
    }
    try {
      if (reservas.length > 0) await registrarReservasStockService(reservas);
      onOrdenPedidoModalChange();
      showToast('Productos reservados correctamente. No se generó orden de pedido.', 'success');
    } catch {
      showToast('No se pudieron registrar las reservas de stock', 'error');
    } finally {
      setOcGenerandoOrdenes(false);
    }
  };

  /** Abre el modal de confirmación para cambiar el estado del proveedor desde el Paso 2. */
  const handleConfirmarToggleEstadoPaso2 = (prov: IProveedorGrupoConsolidado, estadoActual: EstadoProveedor) => {
    setOcProveedorAToggle(prov);
    setOcEstadoActualToggle(estadoActual);
    openOcToggleEstadoModal();
  };

  /** Ejecuta el PATCH de estado del proveedor y refresca la cotización consolidada. */
  const handleToggleEstadoPaso2 = async () => {
    if (!ocProveedorAToggle || ocProveedorAToggle.idProveedor == null || !ocEstadoActualToggle) return;
    const idProv = ocProveedorAToggle.idProveedor;
    const nuevoEstado: EstadoProveedor = ocEstadoActualToggle === 'DISPONIBLE' ? 'NO_DISPONIBLE' : 'DISPONIBLE';
    setOcTogglingEstadoId(idProv);
    try {
      // Obtener datos completos del proveedor (rutProveedor requerido por el PATCH)
      const proveedorCompleto = await obtenerProveedorDetalleService(idProv);
      await actualizarEstadoProveedorService(proveedorCompleto, nuevoEstado);
      setProveedores(prev =>
        prev.map(p => p.idProveedor === idProv ? { ...p, estadoProveedor: nuevoEstado } : p)
      );
      const idsPedidoArr = [...ocSeleccionados];
      const data = await (ocEsDeCanceladas
        ? obtenerCotizacionDeCanceladasService(idsPedidoArr)
        : obtenerCotizacionConsolidadaService(idsPedidoArr));
      setOcCotizacion(data);
      const cantInicial = construirCantidades(data);
      setOcCantidades(cantInicial);
      setOcCantidadesOriginales(cantInicial);
      setOcCubrirDisponible(false);
      setOcCantidadesPreCover({});
      const solDiasInicial = construirSolicitudDias(data);
      setOcSolicitudDia(solDiasInicial);
      setOcSolicitudDiaOriginales(solDiasInicial);
      void cargarDisponibleReal(data);
      showToast(`Estado actualizado a ${nuevoEstado === 'DISPONIBLE' ? 'Disponible' : 'No Disponible'}`);
    } catch (err: any) {
      showToast(err.message || 'No se pudo actualizar el estado del proveedor', 'error');
    } finally {
      setOcTogglingEstadoId(null);
      setOcProveedorAToggle(null);
      setOcEstadoActualToggle(null);
    }
  };

  /** Actualiza la cantidad editable de una celda Entrega {día} del Paso 2. */
  const actualizarCantidadOc = (
    idProveedor: number,
    idProducto: number,
    dia: string,
    valor: number,
  ) => {
    setOcCantidades(prev => ({
      ...prev,
      [idProveedor]: {
        ...prev[idProveedor],
        [idProducto]: {
          ...(prev[idProveedor]?.[idProducto] ?? {}),
          [dia]: isNaN(valor) ? 0 : valor,
        },
      },
    }));
  };

  /**
   * Ajuste manual puro al pulsar + o − en una celda de entrega: suma/resta el delta SOLO en
   * esa celda (piso en 0). No redistribuye ni roba de los días vecinos — la cantidad atribuida
   * a las solicitudes se mueve únicamente con el panel "Mover solicitudes". El delta manual es
   * la decisión del usuario (pedir de más por precio, o de menos porque ya tiene stock).
   */
  const handleEntregaIncrement = (
    idProveedor: number,
    idProducto: number,
    entregaKey: string,
    delta: number,
    _colSpecs: ColSpecOC[],
  ) => {
    if (delta === 0) return;
    const step = Math.abs(delta);
    const r = (v: number) => Math.round(v * 100000) / 100000;
    const EPS = 1e-6;

    // "marco" = cantidad atribuida a las solicitudes en esta celda (sin el ajuste manual).
    // Se usa como punto de parada al subir/bajar, además de los múltiplos del step.
    let marco = 0;
    const prov = ocCotizacion?.cotizacion.find(p => p.idProveedor === idProveedor);
    if (prov) {
      for (const cat of prov.categorias)
        for (const prod of cat.productos)
          if (prod.idProducto === idProducto)
            for (const s of prod.solicitudes)
              if (ocSolicitudDia[idProveedor]?.[s.idSolicitud] === entregaKey)
                marco = r(marco + netoSolicitud(s));
    }

    setOcCantidades(prev => {
      const provData = prev[idProveedor] ?? {};
      const prodData = { ...(provData[idProducto] ?? {}) };
      const valorActual = prodData[entregaKey] ?? 0;

      let resultado: number;
      if (delta > 0) {
        // Siguiente múltiplo del step por encima del valor actual...
        let next = r((Math.floor(r(valorActual / step) + EPS) + 1) * step);
        // ...salvo que el marco quede entre el valor actual y ese múltiplo: parar en el marco.
        if (marco > valorActual + EPS && marco < next - EPS) next = marco;
        resultado = next;
      } else {
        // Múltiplo del step inmediatamente por debajo (piso en 0)...
        let prevStop = r((Math.ceil(r(valorActual / step) - EPS) - 1) * step);
        if (prevStop < 0) prevStop = 0;
        // ...salvo que el marco quede entre ese múltiplo y el valor actual: parar en el marco.
        if (marco < valorActual - EPS && marco > prevStop + EPS) prevStop = marco;
        resultado = Math.max(0, prevStop);
      }
      resultado = r(resultado);
      if (resultado === valorActual) return prev;
      prodData[entregaKey] = resultado;
      return { ...prev, [idProveedor]: { ...provData, [idProducto]: prodData } };
    });
  };

  /** Restaura la distribución de un producto a los valores iniciales calculados por construirCantidades(). */
  const handleRestaurarProducto = (idProveedor: number, idProducto: number) => {
    const originales = ocCantidadesOriginales[idProveedor]?.[idProducto];
    if (!originales) return;
    setOcCantidades(prev => ({
      ...prev,
      [idProveedor]: {
        ...(prev[idProveedor] ?? {}),
        [idProducto]: { ...originales },
      },
    }));
  };

  // ── Handlers para la vista de Órdenes de Pedido ─────────────────────────

  const cargarOrdenes = React.useCallback(async () => {
    setOpCargando(true);
    setOpError(null);
    try {
      await sincronizarEstadosOrdenPedidoService();
      const data = await listarOrdenesPedidoService(opRango ?? undefined);
      setOpLista(data);
    } catch (err: any) {
      setOpError(err.message || 'Error al cargar las órdenes');
    } finally {
      setOpCargando(false);
    }
  }, [opRango]);

  React.useEffect(() => {
    if (currentView === 'ordenes') {
      cargarOrdenes();
      setOpExpandidosIds(new Set());
      setOpDetalles(new Map());
    }
  }, [currentView, cargarOrdenes]);

  const LABEL_ESTADO_OP: Record<EstadoOrdenPedido, string> = {
    PENDIENTE:  'Pendiente',
    ENVIADA:    'Enviada',
    CONFIRMADA: 'Confirmada',
    RECIBIDA:   'Recibida',
    CANCELADA:  'Cancelada',
  };

  const handleCambiarEstadoOp = async (id: number, nuevoEstado: EstadoOrdenPedido) => {
    setOpCambiandoEstadoId(id);
    try {
      const actualizado = await cambiarEstadoOrdenPedidoService(id, nuevoEstado);
      setOpLista(prev => prev.map(op => op.idOrdenPedido === id ? actualizado : op));
      showToast(`Orden #${id} actualizada a ${LABEL_ESTADO_OP[nuevoEstado]}`, 'success');
      // Si el detalle expandido es esta OP, colapsar (el estado cambió)
      if (opExpandidosIds.has(id)) {
        setOpExpandidosIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        setOpDetalles(prev => { const m = new Map(prev); m.delete(id); return m; });
      }
    } catch (err: any) {
      showToast(err.message || 'Error al cambiar el estado', 'error');
    } finally {
      setOpCambiandoEstadoId(null);
      setOpConfirmCancelar(null);
    }
  };

  const handleToggleOrden = async (id: number) => {
    if (opExpandidosIds.has(id)) {
      setOpExpandidosIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      return;
    }
    setOpExpandidosIds(prev => new Set([...prev, id]));
    if (!opDetalles.has(id)) {
      setOpCargandoDetalleIds(prev => new Set([...prev, id]));
      try {
        const detalle = await obtenerOrdenPedidoDetalleService(id);
        setOpDetalles(prev => new Map([...prev, [id, detalle]]));
      } catch (err: any) {
        showToast(err.message || 'Error al cargar el detalle', 'error');
        setOpExpandidosIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      } finally {
        setOpCargandoDetalleIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      }
    }
  };

  const opDetallesRef = React.useRef(opDetalles);
  React.useEffect(() => { opDetallesRef.current = opDetalles; }, [opDetalles]);

  const cargarDetallesBulk = React.useCallback(async (ids: number[]) => {
    const sinCargar = ids.filter(id => !opDetallesRef.current.has(id));
    if (sinCargar.length === 0) return;
    setOpCargandoDetalleIds(prev => { const s = new Set(prev); sinCargar.forEach(id => s.add(id)); return s; });
    const resultados = await Promise.allSettled(sinCargar.map(id => obtenerOrdenPedidoDetalleService(id)));
    setOpDetalles(prev => {
      const m = new Map(prev);
      resultados.forEach((res, i) => { if (res.status === 'fulfilled') m.set(sinCargar[i], res.value); });
      return m;
    });
    setOpCargandoDetalleIds(prev => { const s = new Set(prev); sinCargar.forEach(id => s.delete(id)); return s; });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 pb-8 font-sans -mt-6">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-success-500' : toast.type === 'warning' ? 'bg-warning-500' : 'bg-danger-500'
            }`}
          >
            <Icon icon={toast.type === 'success' ? 'lucide:check-circle' : toast.type === 'warning' ? 'lucide:alert-triangle' : 'lucide:alert-circle'} width={18} />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-6 items-stretch">
        {/* ── Área de contenido principal ── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">

            {currentView === 'ordenes' ? (
              <motion.div key="ordenes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-6">
              <OrdenesVista
            lista={opLista}
            cargando={opCargando}
            error={opError}
            expandidosIds={opExpandidosIds}
            detalles={opDetalles}
            cargandoDetalleIds={opCargandoDetalleIds}
            cambiandoEstadoId={opCambiandoEstadoId}
            onToggle={handleToggleOrden}
            onRecargar={cargarOrdenes}
            onCambiarEstado={handleCambiarEstadoOp}
            onConfirmCancelar={setOpConfirmCancelar}
            rango={opRango}
            onRangoChange={setOpRango}
            onCargarDetallesBulk={cargarDetallesBulk}
            canCancelar={op_CancelarOp}
            canExportExcel={op_ExportExcel}
            canVerPendienteEnviada={op_VerPendEnviada}
            canVerConfirmada={op_VerConfirmada}
          />

          {/* ── Modal confirmación Cancelar Orden ── */}
          <Modal
            isOpen={opConfirmCancelar !== null}
            onOpenChange={(open) => { if (!open) setOpConfirmCancelar(null); }}
            size="sm"
            radius="lg"
            isDismissable={false}
            classNames={{ base: 'rounded-2xl' }}
          >
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex items-center gap-2 text-danger">
                    <Icon icon="lucide:x-circle" width={20} />
                    Cancelar Orden de Pedido
                  </ModalHeader>
                  <ModalBody>
                    <p className="text-sm text-default-600">
                      ¿Confirmas que deseas cancelar la{' '}
                      <span className="font-bold">OP #{opConfirmCancelar?.idOrdenPedido}</span> de{' '}
                      <span className="font-semibold">{opConfirmCancelar?.nombreDistribuidora}</span>?
                    </p>
                    <p className="text-xs text-default-400 mt-1">
                      Esta acción cambiará el estado a <span className="text-danger font-semibold">CANCELADA</span>.
                      Podrás revertirla a PENDIENTE si es necesario.
                    </p>
                  </ModalBody>
                  <ModalFooter className="gap-2">
                    <Button variant="ghost" onPress={onClose}>Volver</Button>
                    <Button
                      color="danger"
                      variant="solid"
                      isLoading={opCambiandoEstadoId === opConfirmCancelar?.idOrdenPedido}
                      onPress={() => opConfirmCancelar && handleCambiarEstadoOp(opConfirmCancelar.idOrdenPedido, 'CANCELADA')}
                    >
                      Sí, cancelar
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
              </motion.div>
            ) : (
              <motion.div key="proveedores" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }} className="space-y-6">
        <Card className="shadow-sm bg-default-50 dark:bg-content1 border border-default-200 dark:border-default-100">
          <CardBody className="p-4 space-y-3">
            {/* Filtros básicos */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
              <Input
                placeholder="Buscar por nombre, distribuidora o RUT..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                startContent={<Icon icon="lucide:search" className="text-default-400" />}
                className="w-full md:flex-1 md:mr-3"
                variant="bordered"
                classNames={{ inputWrapper: 'bg-white dark:bg-default-100/50' }}
                isClearable
                onClear={() => setSearchTerm('')}
              />
              <Select
                placeholder="Filtrar por estado"
                selectedKeys={filtroEstado ? new Set([filtroEstado]) : new Set()}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0] as string;
                  setFiltroEstado(val || '');
                }}
                className="w-full md:w-56"
                variant="bordered"
                classNames={{ trigger: 'bg-white dark:bg-default-100/50' }}
              >
                <SelectItem key="" textValue="Todos">Todos</SelectItem>
                <SelectItem key="DISPONIBLE" textValue="Disponible">Disponible</SelectItem>
                <SelectItem key="NO_DISPONIBLE" textValue="No Disponible">No Disponible</SelectItem>
              </Select>
            </div>
            <Divider />
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {prov_NuevoProv && (
                <Button
                  color="primary"
                  variant="solid"
                  className="font-bold text-secondary shadow-md cursor-pointer"
                  startContent={<Icon icon="lucide:plus" width={20} />}
                  onPress={handleNuevoProveedor}
                >
                  Nuevo Proveedor
                </Button>
              )}
              {prov_SyncExcel && (
                <Button
                  color="success"
                  variant="flat"
                  className="font-bold cursor-pointer"
                  startContent={<Icon icon="lucide:upload-cloud" width={20} />}
                  onPress={handleAbrirSyncExcel}
                >
                  Sincronizar Precios Excel
                </Button>
              )}
              {prov_GenerarOrden && (
                <Button
                  color="warning"
                  variant="flat"
                  className="font-bold cursor-pointer"
                  startContent={<Icon icon="lucide:clipboard-list" width={20} />}
                  onPress={() => handleAbrirOrdenPedido()}
                >
                  Generar Orden Pedido
                </Button>
              )}
              {prov_Cotizacion && (
              <Button
                color="secondary"
                variant="flat"
                className="font-bold cursor-pointer"
                startContent={<Icon icon="lucide:file-spreadsheet" width={20} />}
                onPress={() => {
                  setCotizacionData(null);
                  setDateRangeProyeccion(null);
                  setErrorCotizacion(null);
                  openCotizModal();
                }}
              >
                Proyección Cotización
              </Button>
              )}
            </div>
          </CardBody>
        </Card>

        {/* ── NUEVO: Buscador Global de Productos ── */}
        <Card className="shadow-sm bg-default-50 dark:bg-content1 border border-default-200 dark:border-default-100">
          <CardBody className="p-4 space-y-4">
            <div className="flex flex-col gap-3 p-3 bg-warning-50 dark:bg-warning-50/20 rounded-lg border border-warning-200 dark:border-warning-100/30">
              <p className="text-xs font-semibold text-warning-700 dark:text-warning-500 uppercase tracking-wide">
                🔍 Buscar Producto en Todos los Proveedores
              </p>

              {/* Fila: Input búsqueda + Filtros consolidados */}
              <div>
                <div className="flex flex-col md:flex-row gap-3 items-center">
                  {/* Input búsqueda */}
                  <div className="flex-1 w-full md:w-auto">
                    <Input
                      placeholder="Ingresa el nombre o código del producto..."
                      value={busquedaGlobal}
                      onValueChange={setBusquedaGlobal}
                      startContent={<Icon icon="lucide:package-search" className="text-warning-500" />}
                      variant="bordered"
                      size="md"
                      classNames={{ inputWrapper: 'bg-white dark:bg-default-100/50 border-warning-300 dark:border-warning-200/50 h-10' }}
                      isClearable
                      onClear={() => setBusquedaGlobal('')}
                    />
                  </div>

                  {/* Multi-select consolidado para filtros y ordenamiento */}
                  <div className="w-full md:w-64">
                    <Select
                      placeholder="Filtrar & Ordenar"
                      selectedKeys={selectedFilterOptions}
                      onSelectionChange={(keys) => {
                        const newKeys = new Set<string>();
                        for (const key of Array.from(keys)) {
                          newKeys.add(String(key));
                        }
                        // Hacer mutuamente excluyentes los estados
                        if (newKeys.has('estado-DISPONIBLE') && newKeys.has('estado-NO_DISPONIBLE')) {
                          if (!selectedFilterOptions.has('estado-DISPONIBLE')) {
                            newKeys.delete('estado-NO_DISPONIBLE');
                          } else if (!selectedFilterOptions.has('estado-NO_DISPONIBLE')) {
                            newKeys.delete('estado-DISPONIBLE');
                          }
                        }
                        // Hacer mutuamente excluyentes los ordenamientos de precio
                        if (newKeys.has('precio-asc') && newKeys.has('precio-desc')) {
                          if (!selectedFilterOptions.has('precio-asc')) {
                            newKeys.delete('precio-desc');
                          } else if (!selectedFilterOptions.has('precio-desc')) {
                            newKeys.delete('precio-asc');
                          }
                        }
                        setSelectedFilterOptions(newKeys);
                      }}
                      className="w-full"
                      variant="bordered"
                      size="md"
                      selectionMode="multiple"
                      classNames={{ trigger: 'bg-white dark:bg-default-100/50 border-warning-300 dark:border-warning-200/50 h-10' }}
                      startContent={<Icon icon="lucide:filter" className="text-warning-500" width={16} />}
                    >
                  {/* Grupo Estado - Mutuamente excluyentes */}
                  <SelectItem key="estado-DISPONIBLE">
                    Estado: Disponible
                  </SelectItem>
                  <SelectItem key="estado-NO_DISPONIBLE">
                    Estado: No Disponible
                  </SelectItem>

                  {/* Grupo Precio */}
                  <SelectItem key="precio-asc">
                    Menor Precio Primero
                  </SelectItem>
                  <SelectItem key="precio-desc">
                    Mayor Precio Primero
                  </SelectItem>
                  </Select>
                  </div>
                </div>

                {/* Filtros activos - fuera del Select para no afectar alineación */}
                {selectedFilterOptions.size > 0 && (
                  <p className="text-xs text-warning-600 dark:text-warning-400 mt-2 font-semibold">
                    {selectedFilterOptions.size} filtro(s) activo(s)
                  </p>
                )}
              </div>

              {/* Checkbox mostrar inactivos */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="esconderInactivosBusqueda"
                  checked={!mostrarInactivosBusqueda}
                  onChange={(e) => setMostrarInactivosBusqueda(!e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer accent-warning"
                />
                <label
                  htmlFor="esconderInactivosBusqueda"
                  className="text-xs text-warning-700 dark:text-warning-500 cursor-pointer hover:text-warning-800 transition-colors"
                >
                  Esconder productos deshabilitados
                </label>
              </div>

              {busquedaGlobal && (
                <p className="text-xs text-warning-600 dark:text-warning-400">
                  {loadingBusqueda ? 'Buscando productos...' : `${aplicarFiltrosResultados.length} proveedor(es) encontrado(s)`}
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Estado de carga / error */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" color="primary" label="Cargando proveedores..." />
          </div>
        )}

        {!isLoading && error && (
          <Card className="border border-danger-200 bg-danger-50 dark:bg-danger-50/10">
            <CardBody className="flex flex-row items-center gap-3 p-4">
              <Icon icon="lucide:alert-triangle" className="text-danger" width={22} />
              <p className="text-danger text-sm">{error}</p>
              <Button size="sm" variant="flat" color="danger" onPress={() => cargarProveedoresPaginados(1, true)}>
                Reintentar
              </Button>
            </CardBody>
          </Card>
        )}

        {/* Lista de proveedores */}
        {!isLoading && !error && (
          <>
            {proveedores.length === 0 ? (
              <Card className="border border-default-200">
                <CardBody className="flex flex-col items-center gap-3 py-16 text-default-400">
                  <Icon icon="lucide:truck" width={48} />
                  <p className="text-sm">No se encontraron proveedores</p>
                  {prov_NuevoProv && (
                    <Button size="sm" color="primary" variant="flat" onPress={handleNuevoProveedor}>
                      Crear primer proveedor
                    </Button>
                  )}
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Mostrar resultados de búsqueda SI hay búsqueda */}
                {busquedaGlobal.trim() ? (
                  <>
                    <BusquedaResultados
                      resultados={aplicarFiltrosResultados}
                      loading={loadingBusqueda}
                      error={errorBusqueda}
                      searchTerm={busquedaGlobal}
                      canEdit={prov_EditarProv}
                      editingPrecio={editingPrecio}
                      precioTemp={precioTemp}
                      savingPrecio={savingPrecio}
                      onIniciarEditPrecio={handleIniciarEditPrecio}
                      onPrecioTempChange={handlePrecioTempChange}
                      onGuardarPrecio={handleGuardarPrecio}
                      onCancelarEditPrecio={() => { clearBlurTimeout(); setEditingPrecio(null); setPrecioTemp(''); }}
                      onBlurTexto={handleBlurTexto}
                      onToggleProducto={handleToggleProducto}
                      onQuitarProducto={handleConfirmarQuitarProducto}
                      onSincronizarPrecio={handleSincronizarPrecio}
                    />
                  </>
                ) : (
                  /* MOSTRAR LISTA NORMAL DE PROVEEDORES CUANDO NO HAY BÚSQUEDA */
                  <>
                    {paginatedProveedores.map((proveedor) => (
                  <Card
                    key={proveedor.idProveedor}
                    className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1"
                  >
                    <CardBody className="p-0">
                      {/* Fila principal */}
                      <div
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-3 cursor-pointer hover:bg-default-50 dark:hover:bg-default-100/30 transition-colors"
                        onClick={() => toggleRowExpansion(proveedor.idProveedor)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 flex items-center justify-center cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(proveedor.idProveedor);
                            }}
                          >
                            {!loadingDetalle.has(proveedor.idProveedor) && (
                              <Icon
                                icon={expandedRows.has(proveedor.idProveedor) ? 'lucide:chevron-down' : 'lucide:chevron-right'}
                                className="text-default-400"
                              />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-secondary">
                              {proveedor.nombreDistribuidora}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-default-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Icon icon="lucide:user" width={12} />
                                {proveedor.nombreProveedor}
                              </span>
                              <span className="text-default-300">•</span>
                              <span className="flex items-center gap-1">
                                <Icon icon="lucide:phone" width={12} />
                                {proveedor.telefonoProveedor}
                              </span>
                              <span className="text-default-300">•</span>
                              <span className="flex items-center gap-1">
                                <Icon icon="lucide:mail" width={12} />
                                {proveedor.emailProveedor}
                              </span>
                              {proveedor.rutProveedor && (
                                <>
                                  <span className="text-default-300">•</span>
                                  <span>RUT: {proveedor.rutProveedor}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <Chip color="primary" size="sm" variant="flat">
                            {proveedor.cantidadProductosActivos} producto{proveedor.cantidadProductosActivos !== 1 ? 's' : ''}
                          </Chip>
                          {renderEstado(proveedor.estadoProveedor)}
                          {prov_CambiarEstado && proveedor.activo && (
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              title={proveedor.estadoProveedor === 'DISPONIBLE' ? 'Cambiar a No Disponible' : 'Cambiar a Disponible'}
                              isLoading={togglingEstadoId === proveedor.idProveedor}
                              onPress={() => handleConfirmarToggleEstado(proveedor)}
                            >
                              <Icon
                                icon={proveedor.estadoProveedor === 'DISPONIBLE' ? 'lucide:toggle-right' : 'lucide:toggle-left'}
                                className={proveedor.estadoProveedor === 'DISPONIBLE' ? 'text-success' : 'text-danger'}
                                width={20}
                              />
                            </Button>
                          )}

                          {/* Acciones */}
                          <div className="flex gap-1">
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              title="Ver detalle"
                              onPress={() => handleVerProveedor(proveedor)}
                            >
                              <Icon icon="lucide:eye" className="text-default-400 hover:text-success" width={17} />
                            </Button>
                            {prov_EditarProv && (
                              <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                title="Editar proveedor"
                                onPress={() => handleEditarProveedor(proveedor)}
                              >
                                <Icon icon="lucide:edit" className="text-default-400 hover:text-primary" width={17} />
                              </Button>
                            )}
                            {prov_AsignarProd && (
                              <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                title="Asignar producto"
                                onPress={() => handleAbrirAsignarProducto(proveedor.idProveedor)}
                              >
                                <Icon icon="lucide:package-plus" className="text-default-500 hover:text-success" width={17} />
                              </Button>
                            )}
                            {prov_EliminarProv && (
                              <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                title="Eliminar proveedor"
                                isLoading={deletingId === proveedor.idProveedor}
                                onPress={() => handleConfirmarEliminar(proveedor)}
                              >
                                <Icon icon="lucide:trash-2" className="text-default-400 hover:text-danger" width={17} />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sección expandible — productos */}
                      <AnimatePresence>
                        {expandedRows.has(proveedor.idProveedor) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-1 bg-default-50 dark:bg-default-100/20 border-t border-default-100">
                              {/* loadingDetalle es la única fuente de verdad para mostrar el loader.
                                  toggleRowExpansion garantiza un mínimo de 600ms con el flag activo
                                  → la animación siempre se muestra al expandir la fila. */}
                              {loadingDetalle.has(proveedor.idProveedor) ? (
                                <div className="flex justify-center items-center py-6 min-h-[220px]">
                                  <BookPageLoader
                                    message="Cargando catálogo"
                                    subMessage="Obteniendo productos del proveedor..."
                                  />
                                </div>
                              ) : detalleCache[proveedor.idProveedor] ? (
                                <ProductosProveedor
                                  detalle={detalleCache[proveedor.idProveedor]}
                                  canEdit={prov_EditarProv}
                                  canExportDatos={prov_ExportDatos}
                                  editingPrecio={editingPrecio}
                                  precioTemp={precioTemp}
                                  savingPrecio={savingPrecio}
                                  onIniciarEditPrecio={handleIniciarEditPrecio}
                                  onPrecioTempChange={handlePrecioTempChange}
                                  onGuardarPrecio={handleGuardarPrecio}
                                  onCancelarEditPrecio={() => { clearBlurTimeout(); setEditingPrecio(null); setPrecioTemp(''); }}
                                  onBlurTexto={handleBlurTexto}
                                  onToggleProducto={handleToggleProducto}
                                  onQuitarProducto={handleConfirmarQuitarProducto}
                                  onSincronizarPrecio={handleSincronizarPrecio}
                                  mostrarInactivos={mostrarInactivos}
                                  onMostrarInactivosChange={setMostrarInactivos}
                                />
                              ) : (
                                <div className="text-center text-default-400 text-sm py-6">
                                  Sin datos disponibles
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardBody>
                  </Card>
                    ))}
                  </>
                )}

                {/* Indicador de carga infinita */}
                {isLoading && proveedores.length > 0 && (
                  <div className="flex w-full justify-center py-8">
                    <Spinner size="sm" color="primary" />
                  </div>
                )}
              </div>
            )}
          </>
        )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Riel de navegación derecho ── */}
        <RielNavegacion
          sticky
          className="-mr-10"
          activeKey={currentView}
          onChange={key => setCurrentView(key as 'proveedores' | 'ordenes')}
          items={[
            { key: 'proveedores', label: 'Proveedores', icon: 'lucide:store', visible: verTabProveedores },
            { key: 'ordenes', label: 'Órdenes de Pedido', icon: 'lucide:clipboard-list', color: 'warning', visible: verOrdenes, badge: currentView !== 'ordenes' ? opLista.length : 0 },
          ]}
        />
      </div>

      {/* ── Modal Cotización por Rango ── */}
      <CotizacionModal
        isOpen={isCotizModal}
        onOpenChange={onCotizModalChange}
        dateRange={dateRangeProyeccion}
        onDateRangeChange={setDateRangeProyeccion}
        cotizacionData={cotizacionData}
        loading={loadingCotizacion}
        error={errorCotizacion}
        onConsultar={async () => {
          if (!dateRangeProyeccion) return;
          setLoadingCotizacion(true);
          setErrorCotizacion(null);
          setCotizacionData(null);
          try {
            const fi = `${dateRangeProyeccion.start.year}-${String(dateRangeProyeccion.start.month).padStart(2, '0')}-${String(dateRangeProyeccion.start.day).padStart(2, '0')}`;
            const ff = `${dateRangeProyeccion.end.year}-${String(dateRangeProyeccion.end.month).padStart(2, '0')}-${String(dateRangeProyeccion.end.day).padStart(2, '0')}`;
            const data = await obtenerCotizacionPorRangoService(fi, ff);
            setCotizacionData(data);
          } catch (err: any) {
            setErrorCotizacion(err.message || 'Error al consultar cotización');
          } finally {
            setLoadingCotizacion(false);
          }
        }}
        onExportExcel={() => {
          if (!cotizacionData || !dateRangeProyeccion) return;
          exportarCotizacionExcel(cotizacionData, dateRangeProyeccion);
        }}
      />

      {/* ── Modal Orden Pedido (Tarea #13) ── */}
      <OrdenPedidoModal
        isOpen={isOrdenPedidoModal}
        onOpenChange={onOrdenPedidoModalChange}
        paso={ocPaso}
        periodos={ctxPeriodos}
        periodo={ocPeriodo}
        onPeriodoChange={setOcPeriodo}
        semanas={ocSemanasPeriodo}
        semana={ocSemana}
        onSemanaChange={setOcSemana}
        pedidos={ocPedidos}
        loadingPedidos={ocLoadingPedidos}
        errorPedidos={ocErrorPedidos}
        seleccionados={ocSeleccionados}
        onToggleSeleccion={toggleSeleccionPedido}
        onGenerar={handleGenerarOrdenPedido}
        cotizacion={ocCotizacion}
        loadingCotizacion={ocLoadingCotizacion}
        errorCotizacion={ocErrorCotizacion}
        cantidades={ocCantidades}
        cantidadesOriginales={ocCantidadesOriginales}
        solicitudDias={ocSolicitudDia}
        disponible={ocDisponible}
        cubrirDisponible={ocCubrirDisponible}
        onToggleCubrirDisponible={handleToggleCubrirDisponible}
        onCantidadChange={actualizarCantidadOc}
        onIncrement={handleEntregaIncrement}
        onRestaurar={handleRestaurarProducto}
        onMoverSolicitud={handleMoverSolicitud}
        onResetProveedor={handleResetProveedorPaso2}
        onVolver={handleVolverPaso1}
        fechaEntrega={ocFechaEntrega}
        onFechaEntregaChange={setOcFechaEntrega}
        proveedoresEstados={Object.fromEntries(proveedores.map(p => [p.idProveedor, p.estadoProveedor]))}
        togglingEstadoPaso2Id={ocTogglingEstadoId}
        onToggleEstadoProveedor={handleConfirmarToggleEstadoPaso2}
        onConfirmarOrden={handleConfirmarGenerarOrden}
        onReservarYSalir={handleReservarYSalir}
        isGenerandoOrdenes={ocGenerandoOrdenes}
      />

      {/* ── Modal resultado Generar Ordenes de Pedidos ── */}
      <Modal
        isOpen={ocResultado !== null}
        onClose={() => setOcResultado(null)}
        size="md"
        hideCloseButton
        isDismissable={false}
        radius="lg"
        classNames={{ base: 'rounded-2xl overflow-hidden' }}
      >
        <ModalContent>
          {/* Banner */}
          <div className={`px-6 py-8 flex flex-col items-center gap-3 ${
            ocResultado?.errores.length === 0
              ? 'bg-gradient-to-br from-success-400 to-success-600'
              : ocResultado?.ordenes.length === 0
                ? 'bg-gradient-to-br from-danger-400 to-danger-600'
                : 'bg-gradient-to-br from-warning-400 to-warning-600'
          }`}>
            <div className="bg-white/20 rounded-full p-4">
              <Icon
                icon={ocResultado?.errores.length === 0 ? 'lucide:check' : ocResultado?.ordenes.length === 0 ? 'lucide:x' : 'lucide:alert-triangle'}
                width={36}
                className="text-white"
              />
            </div>
            <h2 className="text-xl font-bold text-white">
              {ocResultado?.errores.length === 0
                ? '¡Órdenes generadas!'
                : ocResultado?.ordenes.length === 0
                  ? 'Error al generar órdenes'
                  : 'Generación con errores'}
            </h2>
            <p className="text-sm text-white/80 text-center max-w-[260px]">
              {ocResultado?.errores.length === 0
                ? 'Las órdenes de pedido fueron creadas exitosamente.'
                : 'Algunas órdenes no pudieron ser procesadas.'}
            </p>
          </div>

          <div className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar max-h-[45vh]">
            {/* Stats */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-success-50 border border-success-200">
                <Icon icon="lucide:clipboard-check" className="text-success-600" width={24} />
                <span className="text-4xl font-bold text-success-700">{ocResultado?.ordenes.length ?? 0}</span>
                <span className="text-xs text-success-600 font-semibold text-center uppercase tracking-wide leading-tight">
                  Órdenes<br/>Creadas
                </span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-warning-50 border border-warning-200">
                <Icon icon="lucide:package" className="text-warning-600" width={24} />
                <span className="text-4xl font-bold text-warning-700">
                  {ocResultado?.ordenes.reduce((s, o) => s + o.cantidadDetalles, 0) ?? 0}
                </span>
                <span className="text-xs text-warning-600 font-semibold text-center uppercase tracking-wide leading-tight">
                  Detalles<br/>Insertados
                </span>
              </div>
            </div>

            {/* Lista de órdenes creadas */}
            {(ocResultado?.ordenes.length ?? 0) > 0 && (
              <div className="rounded-xl border border-default-200 overflow-hidden">
                {ocResultado!.ordenes.map((o, i) => (
                  <div
                    key={o.idOrdenPedido}
                    className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-default-100' : ''}`}
                  >
                    <div className="p-1.5 bg-success-100 rounded-lg shrink-0">
                      <Icon icon="lucide:store" className="text-success-600" width={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-secondary dark:text-foreground truncate">{o.nombreProveedor}</p>
                      <p className="text-xs text-default-400">OP #{o.idOrdenPedido} · {o.cantidadDetalles} detalle{o.cantidadDetalles !== 1 ? 's' : ''}</p>
                    </div>
                    <Icon icon="lucide:check-circle-2" className="text-success-500 shrink-0" width={18} />
                  </div>
                ))}
              </div>
            )}

            {/* Errores si los hay */}
            {(ocResultado?.errores.length ?? 0) > 0 && (
              <div className="rounded-xl border border-danger-200 overflow-hidden">
                {ocResultado!.errores.map((e, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t border-danger-100' : ''}`}
                  >
                    <div className="p-1.5 bg-danger-100 rounded-lg shrink-0 mt-0.5">
                      <Icon icon="lucide:store" className="text-danger-600" width={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-danger truncate">{e.nombreProveedor}</p>
                      <p className="text-xs text-danger/70 leading-snug">{e.mensaje}</p>
                    </div>
                    <Icon icon="lucide:x-circle" className="text-danger shrink-0 mt-0.5" width={18} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <ModalFooter className="pt-0 px-6 pb-5">
            <Button
              color="success"
              fullWidth
              size="lg"
              onPress={() => setOcResultado(null)}
              className="font-semibold"
              startContent={<Icon icon="lucide:thumbs-up" width={18} />}
            >
              Entendido
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Modal Sincronización de Precios desde Excel ── */}
      <Modal
        isOpen={isSyncExcelModal}
        onOpenChange={onSyncExcelModalChange}
        size="lg"
        scrollBehavior="inside"
        isDismissable={false}
        radius="lg"
        classNames={{ base: 'rounded-2xl max-h-[75vh]', closeButton: 'cursor-pointer' }}
        onClose={handleCerrarSyncExcel}
      >
        <ModalContent className="rounded-2xl overflow-hidden">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Icon icon="lucide:upload-cloud" width={22} className="text-success-500" />
                Sincronizar Precios desde Excel
              </ModalHeader>
              <ModalBody className="space-y-4 overflow-y-scroll custom-scrollbar">
                {!syncResult && (
                  <>
                    <p className="text-sm text-default-600">
                      Selecciona la distribuidora destino y sube su archivo <strong>.xlsx</strong> con precios.
                      Se actualizarán las versiones activas de cada producto encontrado.
                    </p>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-warning-50 dark:bg-warning-50/20 border border-warning-200 dark:border-warning-100/30 text-warning-800 dark:text-warning-200 text-sm">
                      <Icon icon="lucide:info" width={18} className="flex-shrink-0 mt-0.5" />
                      <span>
                        Para sincronizar correctamente, el <strong>nombre de los productos</strong> en el Excel
                        debe coincidir con el nombre ya registrado en el sistema. Los que no coincidan se reportarán
                        como <em>no encontrados</em>.
                      </span>
                    </div>

                    <Select
                      label="Distribuidora"
                      placeholder={loadingSelector ? 'Cargando...' : 'Selecciona una distribuidora'}
                      isDisabled={loadingSelector || syncLoading}
                      selectedKeys={syncProveedorId != null ? new Set([String(syncProveedorId)]) : new Set()}
                      onSelectionChange={(keys) => {
                        const val = Array.from(keys)[0] as string | undefined;
                        setSyncProveedorId(val ? Number(val) : null);
                      }}
                      variant="bordered"
                    >
                      {proveedoresSelector.map((p) => (
                        <SelectItem key={String(p.idProveedor)} textValue={p.nombreDistribuidora}>
                          {p.nombreDistribuidora}
                        </SelectItem>
                      ))}
                    </Select>

                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-default-700">Archivo Excel (.xlsx)</span>
                      <div className="flex items-center gap-3">
                        <Button
                          color="default"
                          variant="bordered"
                          startContent={<Icon icon="lucide:file-up" width={18} />}
                          onPress={() => excelInputRef.current?.click()}
                          isDisabled={syncLoading}
                          className="cursor-pointer"
                        >
                          {syncFile ? 'Cambiar archivo' : 'Seleccionar archivo'}
                        </Button>
                        <span className="text-sm text-default-500 truncate">
                          {syncFile?.name ?? 'Ningún archivo seleccionado'}
                        </span>
                      </div>
                      <input
                        ref={excelInputRef}
                        type="file"
                        accept=".xlsx"
                        className="hidden"
                        onChange={handleSyncFileChange}
                      />
                    </div>

                    {syncError && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-50 dark:bg-danger-50/20 border border-danger-200 dark:border-danger-100/30 text-danger-700 dark:text-danger-300 text-sm">
                        <Icon icon="lucide:alert-circle" width={18} className="flex-shrink-0 mt-0.5" />
                        <span>{syncError}</span>
                      </div>
                    )}
                  </>
                )}

                {syncResult && (
                  <div className="flex flex-col gap-4">
                    {/* Aviso recordatorio sobre coincidencia de nombres */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-default-100 dark:bg-default-100/40 border border-default-200 dark:border-default-100/40 text-default-700 dark:text-default-300 text-xs">
                      <Icon icon="lucide:info" width={16} className="flex-shrink-0 mt-0.5" />
                      <span>
                        Los productos <em>no encontrados</em> son filas con datos válidos cuyo nombre no coincide
                        con ningún producto del sistema. Verifica que los nombres del Excel coincidan con los registrados.
                      </span>
                    </div>

                    {/* Chips clickeables para alternar vista */}
                    <div className="flex gap-3 flex-wrap">
                      {syncResult.totalSincronizados > 0 && (
                        <Chip
                          color="success"
                          variant={syncVista === 'sincronizados' ? 'solid' : 'flat'}
                          className="cursor-pointer"
                          onClick={() => setSyncVista('sincronizados')}
                        >
                          {syncResult.totalSincronizados} sincronizados
                        </Chip>
                      )}
                      {syncResult.totalSinCambios > 0 && (
                        <Chip
                          color="default"
                          variant={syncVista === 'sin_cambios' ? 'solid' : 'flat'}
                          className="cursor-pointer"
                          onClick={() => setSyncVista('sin_cambios')}
                        >
                          {syncResult.totalSinCambios} sin cambios
                        </Chip>
                      )}
                      {syncResult.totalNoEncontrados > 0 && (
                        <Chip
                          color="warning"
                          variant={syncVista === 'no_encontrados' ? 'solid' : 'flat'}
                          className="cursor-pointer"
                          onClick={() => setSyncVista('no_encontrados')}
                        >
                          {syncResult.totalNoEncontrados} no encontrados
                        </Chip>
                      )}
                    </div>

                    {/* Vista: sincronizados */}
                    {syncVista === 'sincronizados' && syncResult.sincronizados.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-success-600">Productos actualizados</p>
                        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
                          {syncResult.sincronizados.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-2 rounded-lg bg-success-50 dark:bg-success-900/20"
                            >
                              <Icon icon="lucide:check-circle" className="text-success flex-shrink-0" width={16} />
                              <span className="flex-1 text-sm truncate">{item.nombreProducto}</span>
                              <span className="text-xs font-mono text-default-500 shrink-0 whitespace-nowrap">
                                Neto: <span className="text-success-700 font-semibold">${Number(item.precioNeto).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                {' · '}
                                IVA: <span className="text-success-700 font-semibold">${Number(item.precioConIva).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                              </span>
                              <span className="text-xs text-default-400 w-12 text-right shrink-0">#{item.fila}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vista: sin cambios */}
                    {syncVista === 'sin_cambios' && syncResult.sinCambios.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-default-600">
                          Productos cuyo precio coincide con la versión actual — no se generó nueva versión
                        </p>
                        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
                          {syncResult.sinCambios.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-2 rounded-lg bg-default-50 dark:bg-default-100/40"
                            >
                              <Icon icon="lucide:minus-circle" className="text-default-500 flex-shrink-0" width={16} />
                              <span className="flex-1 text-sm truncate">{item.nombreProducto}</span>
                              <span className="text-xs font-mono text-default-500 shrink-0 whitespace-nowrap">
                                Neto: <span className="text-default-700 font-semibold">${Number(item.precioNeto).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                {' · '}
                                IVA: <span className="text-default-700 font-semibold">${Number(item.precioConIva).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                              </span>
                              <span className="text-xs text-default-400 w-12 text-right shrink-0">#{item.fila}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vista: no encontrados */}
                    {syncVista === 'no_encontrados' && syncResult.noEncontrados.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-warning-600">
                          Filas con datos válidos pero sin producto coincidente en el sistema
                        </p>
                        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
                          {syncResult.noEncontrados.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-2 rounded-lg bg-warning-50 dark:bg-warning-900/20"
                            >
                              <Icon icon="lucide:alert-triangle" className="text-warning flex-shrink-0" width={16} />
                              <span className="flex-1 text-sm truncate">{item.nombreExcel}</span>
                              <span className="text-xs text-default-400 w-12 text-right shrink-0">#{item.fila}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {syncResult.totalSincronizados === 0
                      && syncResult.totalSinCambios === 0
                      && syncResult.totalNoEncontrados === 0 && (
                      <div className="flex items-center justify-center p-6 text-default-500 text-sm">
                        El archivo no tenía filas válidas para sincronizar.
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                {!syncResult ? (
                  <>
                    <Button variant="light" onPress={onClose} isDisabled={syncLoading} className="cursor-pointer">
                      Cancelar
                    </Button>
                    <Button
                      color="success"
                      onPress={handleConfirmarSyncExcel}
                      isDisabled={syncProveedorId == null || !syncFile || syncLoading}
                      isLoading={syncLoading}
                      startContent={!syncLoading && <Icon icon="lucide:upload" width={18} />}
                      className="font-bold cursor-pointer"
                    >
                      {syncLoading ? 'Sincronizando...' : 'Sincronizar'}
                    </Button>
                  </>
                ) : (
                  <Button color="primary" onPress={onClose} className="font-bold cursor-pointer">
                    Cerrar
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Modal Crear / Editar / Ver Proveedor ── */}
      <Modal isOpen={isProvModal} onOpenChange={onProvModalChange} size="lg" scrollBehavior="inside" isDismissable={false} radius="lg" classNames={{ base: 'rounded-2xl max-h-[75vh]', closeButton: 'cursor-pointer' }}>
        <ModalContent className="rounded-2xl overflow-hidden">
          {(onClose) => (
            <FormularioProveedor
              proveedor={proveedorSeleccionado}
              mode={modalMode}
              onClose={onClose}
              onSave={async (dto) => {
                await handleGuardarProveedor(dto);
                onClose();
              }}
            />
          )}
        </ModalContent>
      </Modal>

      {/* ── Modal Asignar Producto ── */}
      <Modal isOpen={isProdModal} onOpenChange={onProdModalChange} size="md" scrollBehavior="inside" isDismissable={false} radius="lg" classNames={{ base: 'rounded-2xl max-h-[75vh]', closeButton: 'cursor-pointer' }}>
        <ModalContent className="rounded-2xl overflow-hidden">
          {(onClose) => (
            <FormularioAsignarProducto
              productos={productos}
              idProveedor={proveedorParaProducto || 0}
              onClose={onClose}
              onSave={async (dto) => {
                // Guardar el producto
                const success = await handleGuardarProducto(dto);

                // Si fue exitoso, remover el producto del listado para evitar duplicados
                if (success) {
                  setProductos(prev => prev.filter(p => p.idProducto !== dto.idProducto));
                }

                // El modal permanece abierto para permitir agregar más productos
              }}
            />
          )}
        </ModalContent>
      </Modal>

      {/* ── Modal Confirmar Eliminar Proveedor ── */}
      <Modal isOpen={isDelModal} onOpenChange={onDelModalChange} size="sm" isDismissable={false} radius="lg" classNames={{ base: 'rounded-2xl', closeButton: 'cursor-pointer' }}>
        <ModalContent className="rounded-2xl overflow-hidden">
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-danger/10 to-danger/5 dark:from-danger/20 dark:to-danger/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-danger/20 rounded-lg">
                    <Icon icon="lucide:alert-triangle" className="text-danger" width={20} />
                  </div>
                  <span className="font-bold text-lg text-secondary dark:text-foreground">
                    Eliminar Proveedor
                  </span>
                </div>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600">
                  ¿Estás seguro de que deseas eliminar a{' '}
                  <strong>{proveedorAEliminar?.nombreDistribuidora}</strong>?
                  Esta acción no se puede deshacer.
                </p>
                <p className="text-xs text-warning-600 bg-warning-50 dark:bg-warning-50/10 rounded p-2 mt-1">
                  Solo se puede eliminar si no tiene productos activos asignados.
                </p>
              </ModalBody>
              <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
                <Button variant="ghost" onPress={onClose} className="font-medium">
                  Cancelar
                </Button>
                <Button
                  color="danger"
                  variant="solid"
                  onPress={async () => {
                    await handleEliminarProveedor();
                    onClose();
                  }}
                  isLoading={deletingId !== null}
                  className="font-bold shadow-md cursor-pointer"
                  startContent={!deletingId && <Icon icon="lucide:trash-2" width={16} />}
                  size="lg"
                >
                  Eliminar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Modal Forzar Eliminación Proveedor (solo Administrador) ── */}
      <Modal isOpen={isForceDelModal} onOpenChange={onForceDelModalChange} size="sm" isDismissable={false} radius="lg" classNames={{ base: 'rounded-2xl', closeButton: 'cursor-pointer' }}>
        <ModalContent className="rounded-2xl overflow-hidden">
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-danger/20 to-danger/10 dark:from-danger/30 dark:to-danger/15 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-danger/30 rounded-lg">
                    <Icon icon="lucide:shield-alert" className="text-danger" width={20} />
                  </div>
                  <span className="font-bold text-lg text-secondary dark:text-foreground">
                    Eliminar con Productos Activos
                  </span>
                </div>
              </ModalHeader>
              <ModalBody className="py-4 gap-3">
                <p className="text-sm text-default-600">
                  El proveedor <strong>{proveedorAEliminar?.nombreDistribuidora}</strong> tiene productos activos asignados.
                </p>
                <p className="text-sm text-default-600">
                  Al continuar, <strong>todos los productos quedarán desasignados</strong> y el proveedor será eliminado del sistema. <strong>Esta acción no se puede deshacer.</strong>
                </p>
                <div className="flex items-start gap-2 bg-danger-50 dark:bg-danger-50/10 rounded-lg p-3 mt-1">
                  <Icon icon="lucide:alert-triangle" className="text-danger mt-0.5 shrink-0" width={15} />
                  <p className="text-xs text-danger-700 dark:text-danger-300">
                    Acción exclusiva del Administrador. Procede con precaución.
                  </p>
                </div>
              </ModalBody>
              <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
                <Button variant="ghost" onPress={onClose} className="font-medium">
                  Cancelar
                </Button>
                <Button
                  color="danger"
                  variant="solid"
                  onPress={async () => {
                    await handleForzarEliminarProveedor();
                    onClose();
                  }}
                  isLoading={deletingId !== null}
                  className="font-bold shadow-md cursor-pointer"
                  startContent={!deletingId && <Icon icon="lucide:trash-2" width={16} />}
                  size="lg"
                >
                  Eliminar de todas formas
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Modal Confirmar Cambiar Estado Proveedor ── */}
      <Modal isOpen={isToggleEstadoModal} onOpenChange={onToggleEstadoModalChange} size="sm" isDismissable={false} radius="lg" classNames={{ base: 'rounded-2xl', closeButton: 'cursor-pointer' }}>
        <ModalContent className="rounded-2xl overflow-hidden">
          {(onClose) => {
            const esDeshabilitar = proveedorAToggle?.estadoProveedor === 'DISPONIBLE';
            const nuevoEstadoLabel = esDeshabilitar ? 'No Disponible' : 'Disponible';
            return (
              <>
                <ModalHeader className={`border-b border-default-200 dark:border-default-100 px-6 py-4 ${esDeshabilitar ? 'bg-gradient-to-r from-warning/10 to-warning/5 dark:from-warning/20 dark:to-warning/10' : 'bg-gradient-to-r from-success/10 to-success/5 dark:from-success/20 dark:to-success/10'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${esDeshabilitar ? 'bg-warning/20' : 'bg-success/20'}`}>
                      <Icon icon={esDeshabilitar ? 'lucide:toggle-left' : 'lucide:toggle-right'} className={esDeshabilitar ? 'text-warning' : 'text-success'} width={20} />
                    </div>
                    <span className="font-bold text-lg text-secondary dark:text-foreground">
                      Cambiar Estado del Proveedor
                    </span>
                  </div>
                </ModalHeader>
                <ModalBody className="py-4">
                  <p className="text-sm text-default-600">
                    ¿Cambiar el estado de{' '}
                    <strong>{proveedorAToggle?.nombreDistribuidora}</strong>{' '}
                    a <strong className={esDeshabilitar ? 'text-warning-600' : 'text-success-600'}>{nuevoEstadoLabel}</strong>?
                  </p>
                </ModalBody>
                <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
                  <Button variant="ghost" onPress={onClose} className="font-medium">
                    Cancelar
                  </Button>
                  <Button
                    color={esDeshabilitar ? 'warning' : 'success'}
                    variant="solid"
                    onPress={async () => {
                      await handleToggleEstadoProveedor();
                      onClose();
                    }}
                    isLoading={togglingEstadoId !== null}
                    className="font-bold shadow-md cursor-pointer"
                    startContent={!togglingEstadoId && <Icon icon={esDeshabilitar ? 'lucide:toggle-left' : 'lucide:toggle-right'} width={16} />}
                    size="lg"
                  >
                    Confirmar
                  </Button>
                </ModalFooter>
              </>
            );
          }}
        </ModalContent>
      </Modal>

      {/* ── Modal Confirmar Cambiar Estado Proveedor (Paso 2 Cotización) ── */}
      <Modal isOpen={isOcToggleEstadoModal} onOpenChange={onOcToggleEstadoModalChange} size="sm" isDismissable={false} radius="lg" classNames={{ base: 'rounded-2xl', closeButton: 'cursor-pointer' }}>
        <ModalContent className="rounded-2xl overflow-hidden">
          {(onClose) => {
            const esDeshabilitar = ocEstadoActualToggle === 'DISPONIBLE';
            const nuevoEstadoLabel = esDeshabilitar ? 'No Disponible' : 'Disponible';
            return (
              <>
                <ModalHeader className={`border-b border-default-200 dark:border-default-100 px-6 py-4 ${esDeshabilitar ? 'bg-gradient-to-r from-warning/10 to-warning/5 dark:from-warning/20 dark:to-warning/10' : 'bg-gradient-to-r from-success/10 to-success/5 dark:from-success/20 dark:to-success/10'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${esDeshabilitar ? 'bg-warning/20' : 'bg-success/20'}`}>
                      <Icon icon={esDeshabilitar ? 'lucide:toggle-left' : 'lucide:toggle-right'} className={esDeshabilitar ? 'text-warning' : 'text-success'} width={20} />
                    </div>
                    <span className="font-bold text-lg text-secondary dark:text-foreground">
                      Cambiar Estado del Proveedor
                    </span>
                  </div>
                </ModalHeader>
                <ModalBody className="py-4">
                  <p className="text-sm text-default-600">
                    ¿Cambiar el estado de{' '}
                    <strong>{ocProveedorAToggle?.nombreDistribuidora}</strong>{' '}
                    a <strong className={esDeshabilitar ? 'text-warning-600' : 'text-success-600'}>{nuevoEstadoLabel}</strong>?
                  </p>
                  <p className="text-xs text-default-400 mt-1">
                    La cotización se actualizará automáticamente.
                  </p>
                </ModalBody>
                <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
                  <Button variant="ghost" onPress={onClose} className="font-medium">
                    Cancelar
                  </Button>
                  <Button
                    color={esDeshabilitar ? 'warning' : 'success'}
                    variant="solid"
                    onPress={async () => {
                      await handleToggleEstadoPaso2();
                      onClose();
                    }}
                    isLoading={ocTogglingEstadoId !== null}
                    className="font-bold shadow-md cursor-pointer"
                    startContent={!ocTogglingEstadoId && <Icon icon={esDeshabilitar ? 'lucide:toggle-left' : 'lucide:toggle-right'} width={16} />}
                    size="lg"
                  >
                    Confirmar
                  </Button>
                </ModalFooter>
              </>
            );
          }}
        </ModalContent>
      </Modal>

      {/* ── Modal Confirmar Quitar Producto ── */}
      <Modal isOpen={isQuitarModal} onOpenChange={onQuitarModalChange} size="sm" isDismissable={false} radius="lg" classNames={{ base: 'rounded-2xl', closeButton: 'cursor-pointer' }}>
        <ModalContent className="rounded-2xl overflow-hidden">
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-warning/10 to-warning/5 dark:from-warning/20 dark:to-warning/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning/20 rounded-lg">
                    <Icon icon="lucide:circle-off" className="text-warning" width={20} />
                  </div>
                  <span className="font-bold text-lg text-secondary dark:text-foreground">
                    Desabilitar Producto
                  </span>
                </div>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600">
                  ¿Desabilitar <strong>{quitarTarget?.nombre}</strong> en este proveedor?
                  El producto no aparecerá en cotizaciones pero se puede habilitar nuevamente en cualquier momento.
                </p>
              </ModalBody>
              <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
                <Button variant="ghost" onPress={onClose} className="font-medium">
                  Cancelar
                </Button>
                <Button
                  color="warning"
                  variant="solid"
                  onPress={async () => {
                    await handleQuitarProducto();
                    onClose();
                  }}
                  className="font-bold shadow-md cursor-pointer"
                  startContent={<Icon icon="lucide:circle-off" width={16} />}
                  size="lg"
                >
                  Desabilitar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};





// ── Función de exportación Excel (estándar EXCEL.MD) ──────────────────────────

const exportarCotizacionExcel = async (
  data: ICotizacionResponse,
  dateRange: { start: CalendarDate; end: CalendarDate }
) => {
  const XLSXStyle = (await import('xlsx-js-style')).default;
  const fi = `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`;
  const ff = `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`;

  const nCols = 6; // Proveedor | Categoría | Producto | Unidad | Cantidad | Precio Unit. | Subtotal
  const totalCols = 7;
  const ws: Record<string, unknown> = {};
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  let row = 0;

  // ── Título ──
  for (let c = 0; c < totalCols; c++) {
    ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(
      c === 0 ? `Cotización Proveedores — ${fi} al ${ff}` : '',
      styleTitle
    );
  }
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });
  row++;

  // ── Encabezados ──
  const headers = ['Proveedor', 'Categoría', 'Producto', 'Unidad', 'Cantidad', 'Precio Unit.', 'Subtotal'];
  headers.forEach((h, c) => {
    ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(h, styleHeader);
  });
  row++;

  const proveedoresConId = data.cotizacion.filter(p => p.idProveedor !== null);
  const proveedoresSinId = data.cotizacion.filter(p => p.idProveedor === null);

  // ── Proveedores con datos ──
  for (const prov of proveedoresConId) {
    // Fila de proveedor
    const provLabel = `${prov.nombreDistribuidora ?? 'Sin nombre'} — ${prov.nombreProveedor ?? ''} | Tel: ${prov.telefono ?? '—'} | Email: ${prov.email ?? '—'} | Productos: ${prov.totalProductos}`;
    for (let c = 0; c < totalCols; c++) {
      ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(c === 0 ? provLabel : '', styleProvHeader);
    }
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: totalCols - 1 } });
    row++;

    let totalProveedor = 0;

    for (const cat of prov.categorias) {
      // Fila de categoría
      for (let c = 0; c < totalCols; c++) {
        ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(c === 0 ? cat.nombreCategoria : '', styleCat);
      }
      merges.push({ s: { r: row, c: 0 }, e: { r: row, c: totalCols - 1 } });
      row++;

      for (const prod of cat.productos) {
        ws[XLSXStyle.utils.encode_cell({ r: row, c: 0 })] = sc('', styleText);
        ws[XLSXStyle.utils.encode_cell({ r: row, c: 1 })] = sc(cat.nombreCategoria, styleText);
        ws[XLSXStyle.utils.encode_cell({ r: row, c: 2 })] = sc(prod.nombreProducto, styleText);
        ws[XLSXStyle.utils.encode_cell({ r: row, c: 3 })] = sc(prod.abreviatura, styleText);
        ws[XLSXStyle.utils.encode_cell({ r: row, c: 4 })] = sc(prod.cantidadTotal, styleNum);
        ws[XLSXStyle.utils.encode_cell({ r: row, c: 5 })] = sc(
          prod.precioUnitario !== null ? prod.precioUnitario : '—',
          styleNum
        );
        ws[XLSXStyle.utils.encode_cell({ r: row, c: 6 })] = sc(
          prod.subtotal !== null ? prod.subtotal : '—',
          styleNum
        );
        if (prod.subtotal !== null) totalProveedor += prod.subtotal;
        row++;
      }
    }

    // Subtotal proveedor
    for (let c = 0; c < totalCols; c++) {
      if (c < totalCols - 1) {
        ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(
          c === 0 ? `Total ${prov.nombreDistribuidora ?? ''}` : '',
          styleTotal
        );
      } else {
        ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(totalProveedor, styleTotalPositivo);
      }
    }
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: totalCols - 2 } });
    row++;
  }

  // ── Productos sin proveedor ──
  if (proveedoresSinId.length > 0) {
    for (const sinProv of proveedoresSinId) {
      // Encabezado "Sin Proveedor"
      for (let c = 0; c < totalCols; c++) {
        ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(
          c === 0 ? `⚠ PRODUCTOS SIN PROVEEDOR (${sinProv.totalProductos} producto${sinProv.totalProductos !== 1 ? 's' : ''})` : '',
          styleSinProveedor
        );
      }
      merges.push({ s: { r: row, c: 0 }, e: { r: row, c: totalCols - 1 } });
      row++;

      for (const cat of sinProv.categorias) {
        for (let c = 0; c < totalCols; c++) {
          ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(c === 0 ? cat.nombreCategoria : '', styleCat);
        }
        merges.push({ s: { r: row, c: 0 }, e: { r: row, c: totalCols - 1 } });
        row++;

        for (const prod of cat.productos) {
          ws[XLSXStyle.utils.encode_cell({ r: row, c: 0 })] = sc('Sin proveedor', styleText);
          ws[XLSXStyle.utils.encode_cell({ r: row, c: 1 })] = sc(cat.nombreCategoria, styleText);
          ws[XLSXStyle.utils.encode_cell({ r: row, c: 2 })] = sc(prod.nombreProducto, styleText);
          ws[XLSXStyle.utils.encode_cell({ r: row, c: 3 })] = sc(prod.abreviatura, styleText);
          ws[XLSXStyle.utils.encode_cell({ r: row, c: 4 })] = sc(prod.cantidadTotal, styleNum);
          ws[XLSXStyle.utils.encode_cell({ r: row, c: 5 })] = sc('—', styleNum);
          ws[XLSXStyle.utils.encode_cell({ r: row, c: 6 })] = sc('—', styleNum);
          row++;
        }
      }
    }
  }

  // ── Configuración de hoja ──
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row - 1, c: totalCols - 1 } });
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 40 }, // Proveedor
    { wch: 18 }, // Categoría
    { wch: 30 }, // Producto
    { wch: 10 }, // Unidad
    { wch: 14 }, // Cantidad
    { wch: 14 }, // Precio Unit.
    { wch: 14 }, // Subtotal
  ];
  ws['!rows'] = [{ hpt: 28 }];
  (ws as Record<string, unknown>)['!freeze'] = { xSplit: 0, ySplit: 2 };

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, 'Cotización');
  XLSXStyle.writeFile(wb, `cotizacion_proveedores_${fi}_${ff}.xlsx`);
};






export default GestionProveedoresPage;
