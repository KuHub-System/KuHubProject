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
import { ISolicitud, IItemSolicitud } from '../types/solicitud.types';
import { actualizarEstadoBodegaService, obtenerEntregasDiariasService, prepararEntregaService, registrarDisponiblesService, IRegistrarDisponibleDTO, IEntregaDiaria, ISalaEntrega, ISolicitudEntrega } from '../services/solicitud-service';
import { obtenerRecetaPorIdService } from '../services/pedido-semanal-bodega-service';
import { obtenerFiltrosInventarioService } from '../services/producto-service';
import { buscarBodegaTransitoService, buscarBodegaTransitoPorCodigoService, obtenerBodegaPaginadaService, IBodegaTransitoItem, obtenerBulkBodegaListingService, bulkUpdateBodegaStockService, IBulkBodegaListing, IBulkWarehouseUpdateRequest, IBulkWarehouseProcessResult, inicializarDesdeAbastecimientoService, obtenerBodegaByInventarioIdsService } from '../services/bodega-transito-service';
import { useToast } from '../hooks/useToast';
import { useModulePermission } from '../contexts/permission-context';
import { IProducto } from '../types/producto.types';
import { IUnidadMedida } from '../types/inventario.types';
import { FormularioProducto } from './inventario';
import { obtenerUnidadesActivasService } from '../services/unidad-medida-service';
import GestionCategoriasModal from '../components/modals/GestionCategoriasModal';
import GestionUnidadesModal from '../components/modals/GestionUnidadesModal';
import GestionAbastecimientoModal from '../components/modals/GestionAbastecimientoModal';
import StockDisponiblesModal from '../components/modals/StockDisponiblesModal';
import ConfirmarDisponibleBodegaModal, { ConfirmarDisponibleBodegaItem } from '../components/modals/ConfirmarDisponibleBodegaModal';
import { obtenerAbastecimientoConfirmadoService, marcarEntregadosMasivoService } from '../services/proveedor-service';
import { IOrdenAbastecimiento, ICategoriaEntregaAbastecimiento } from '../types/proveedor.types';

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

// Callback que EntregaSalaCard notifica al padre cuando un item cambia de estado abierto/cerrado
type ExpandChangeCallback = (idSolicitud: number, isOpen: boolean, esProcesado: boolean) => void;

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

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE SEMANA
// ─────────────────────────────────────────────────────────────────────────────

const getWeekKey = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return monday.toISOString().slice(0, 10);
};

const getWeekRange = (date: Date): { fechaInicio: string; fechaFin: string } => {
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    fechaInicio: monday.toISOString().slice(0, 10),
    fechaFin:    sunday.toISOString().slice(0, 10),
  };
};

const fmtCantidadEntrega = (n: number): string =>
  new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n);

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE EntregaSalaCard — muestra una sala con sus entregas del día
// ─────────────────────────────────────────────────────────────────────────────

const EntregaSalaCard: React.FC<{
  sala: ISalaEntrega;
  onPreparar: (sol: ISolicitudEntrega) => void;
  canPreparar: boolean;
  onExpandChange: ExpandChangeCallback;
}> = ({ sala, onPreparar, canPreparar, onExpandChange }) => {
  const [expandidos, setExpandidos] = React.useState<Set<number>>(new Set());

  // Ref para poder acceder al estado actual en el cleanup de unmount
  const expandidosRef = React.useRef(expandidos);
  expandidosRef.current = expandidos;

  // Al desmontar, notifica al padre que todos los elementos se cerraron
  React.useEffect(() => {
    return () => {
      expandidosRef.current.forEach(id => onExpandChange(id, false, false));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: number, esProcesado: boolean) => {
    const nowOpen = !expandidos.has(id);
    setExpandidos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    onExpandChange(id, nowOpen, esProcesado);
  };

  return (
    <Card className="border border-default-200 shadow-sm bg-white dark:bg-content1">
      <CardHeader className="px-4 py-3 bg-default-50 dark:bg-default-100/30 border-b border-default-200">
        <div className="flex items-center gap-2 w-full">
          <Icon icon="lucide:door-open" className="text-secondary" width={16} />
          <span className="font-bold text-secondary dark:text-foreground">{sala.nombreSala}</span>
          {sala.codSala && (
            <Chip size="sm" variant="flat" color="default" className="text-[10px] h-5">{sala.codSala}</Chip>
          )}
          <span className="ml-auto text-xs text-default-400">
            {sala.solicitudes.length} entrega{sala.solicitudes.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardBody className="p-0 divide-y divide-default-100">
        {sala.solicitudes.map(sol => {
          const abierto = expandidos.has(sol.idSolicitud);
          const esProcesado = sol.estadoSolicitud === 'PROCESADO';
          return (
            <div key={sol.idSolicitud} className={esProcesado ? 'opacity-75' : ''}>
              <button
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-default-50/50 dark:hover:bg-default-100/20 transition-colors text-left ${esProcesado ? 'bg-success-50/30 dark:bg-success-50/10' : ''}`}
                onClick={() => toggle(sol.idSolicitud, esProcesado)}
              >
                {/* Badge de horario */}
                <div className={`shrink-0 flex flex-col items-center justify-center rounded-lg px-2.5 py-1.5 min-w-[72px] text-center ${esProcesado ? 'bg-success-50 border border-success-200' : 'bg-primary-50 border border-primary-100'}`}>
                  <span className={`text-[9px] font-bold uppercase leading-none ${esProcesado ? 'text-success-400' : 'text-primary-400'}`}>Horario</span>
                  <span className={`text-xs font-bold leading-tight mt-0.5 ${esProcesado ? 'text-success-600' : 'text-primary'}`}>{sol.rangoHoras}</span>
                </div>

                {/* Info sección */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-default-800 dark:text-foreground">§{sol.nombreSeccion}</span>
                    <span className="text-xs text-default-400">·</span>
                    <span className="text-sm text-default-600">{sol.nombreDocente}</span>
                    {esProcesado && (
                      <Chip
                        size="sm"
                        color="success"
                        variant="flat"
                        className="h-5 text-[10px]"
                        startContent={<Icon icon="lucide:clipboard-check" width={11} />}
                      >
                        Entregado
                      </Chip>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-default-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Icon icon="lucide:book-open" width={11} />{sol.nombreReceta}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon icon="lucide:users" width={11} />{sol.cantInscritos} alumnos
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon icon="lucide:package" width={11} />{sol.productos.length} producto{sol.productos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <Icon
                  icon={abierto ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                  width={16}
                  className="text-default-400 shrink-0"
                />
              </button>

              {/* Lista de productos */}
              {abierto && (
                <div className="px-4 pb-3 pt-1">
                  <div className="rounded-lg border border-default-100 overflow-hidden">
                    {esProcesado ? (
                      <>
                        <div className="grid grid-cols-[1fr_0.4fr_0.3fr] px-3 py-1.5 bg-success-50/50 dark:bg-success-50/10 text-[10px] font-bold text-default-500 uppercase tracking-wider">
                          <span>Producto</span>
                          <span className="text-center">Entregado</span>
                          <span className="text-center">Unidad</span>
                        </div>
                        {sol.productos.map((p, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-[1fr_0.4fr_0.3fr] px-3 py-2 text-sm border-t border-default-100 hover:bg-default-50/50 items-center"
                          >
                            <span className="text-default-700 dark:text-default-300">
                              {p.nombreProducto}
                              {p.observacion && (
                                <span className="text-xs text-default-400 italic ml-1.5">({p.observacion})</span>
                              )}
                            </span>
                            <span className="font-mono font-semibold text-center text-success-600">
                              {fmtCantidadEntrega(p.cantidad)}
                            </span>
                            <span className="text-default-500 text-center">{p.unidadAbreviada}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-[1fr_0.4fr_0.3fr_0.45fr_0.45fr] px-3 py-1.5 bg-default-50 dark:bg-default-100/30 text-[10px] font-bold text-default-500 uppercase tracking-wider">
                          <span>Producto</span>
                          <span className="text-center">Cantidad</span>
                          <span className="text-center">Unidad</span>
                          <span className="text-center">Stock Tránsito</span>
                          <span className="text-center">Diferencia</span>
                        </div>
                        {sol.productos.map((p, i) => {
                          const dif = p.diferencia ?? null;
                          const difColor = dif === null ? 'text-default-400' : dif >= 0 ? 'text-success-600' : 'text-danger-500';
                          return (
                            <div
                              key={i}
                              className="grid grid-cols-[1fr_0.4fr_0.3fr_0.45fr_0.45fr] px-3 py-2 text-sm border-t border-default-100 hover:bg-default-50/50 items-center"
                            >
                              <span className="text-default-700 dark:text-default-300">
                                {p.nombreProducto}
                                {p.observacion && (
                                  <span className="text-xs text-default-400 italic ml-1.5">({p.observacion})</span>
                                )}
                              </span>
                              <span className="font-mono font-semibold text-center text-default-700 dark:text-default-300">
                                {fmtCantidadEntrega(p.cantidad)}
                              </span>
                              <span className="text-default-500 text-center">{p.unidadAbreviada}</span>
                              <span className="font-mono text-center text-default-600">
                                {p.stockTransito != null ? fmtCantidadEntrega(p.stockTransito) : '—'} <span className="text-default-400">{p.unidadAbreviada}</span>
                              </span>
                              <span className={`font-mono font-semibold text-center ${difColor}`}>
                                {dif !== null ? (dif >= 0 ? '+' : '') + fmtCantidadEntrega(dif) : '—'} <span className="text-[10px]">{p.unidadAbreviada}</span>
                              </span>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                  {sol.observaciones && (
                    <div className="flex items-start gap-1.5 mt-2 text-xs text-default-500 italic px-1">
                      <Icon icon="lucide:message-circle" width={11} className="mt-px shrink-0" />
                      <span>{sol.observaciones}</span>
                    </div>
                  )}
                  {!esProcesado && canPreparar && (
                    <div className="flex justify-end mt-3">
                      <Button
                        size="sm"
                        color="secondary"
                        variant="flat"
                        startContent={<Icon icon="lucide:package-check" width={14} />}
                        onPress={() => onPreparar(sol)}
                      >
                        Preparar Entrega
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL DE STOCK MASIVO — BODEGA DE TRÁNSITO
// ─────────────────────────────────────────────────────────────────────────────

interface ItemBodegaMasivo {
  id: string;
  producto: IBulkBodegaListing;
  delta: number;
  motivo: string;
  idDetalleOrdenPedido?: number;
  // Cantidad que provino del Abastecimiento de Proveedores (baseline cargado).
  // Lo "extra" sobre este valor (manual o aumento) puede ir a stock_disponible.
  cargadoAbastecimiento?: number;
}

const MOTIVOS_BODEGA = ['ENTRADA_BODEGA', 'SALIDA_BODEGA', 'AJUSTE_BODEGA', 'MERMA_BODEGA', 'DEVOLUCION'] as const;
const MOTIVO_LABEL: Record<string, string> = {
  ENTRADA_BODEGA: 'Entrada',
  SALIDA_BODEGA:  'Salida',
  AJUSTE_BODEGA:  'Ajuste',
  MERMA_BODEGA:   'Merma',
  DEVOLUCION:     'Devolución',
};

interface ControlMasivoBodegaModalProps {
  onClose: () => void;
  initialItems?: ItemBodegaMasivo[];
  onProcessComplete?: (data: IBulkWarehouseProcessResult, retryItems: ItemBodegaMasivo[]) => void;
  puedeAccederAbastecimiento?: boolean;
}

const ControlMasivoBodegaModal: React.FC<ControlMasivoBodegaModalProps> = ({ onClose, initialItems, onProcessComplete, puedeAccederAbastecimiento = false }) => {
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
              encontrados.push({
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
              });
            }
          }
        }
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

  // ── Confirmación stock disponible (excedente de ENTRADAS) ──
  const [isDisponibleMasivoOpen, setIsDisponibleMasivoOpen] = React.useState(false);
  const [disponiblesMasivo,      setDisponiblesMasivo]      = React.useState<ConfirmarDisponibleBodegaItem[]>([]);

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

  // Detecta el excedente de las ENTRADAS que puede registrarse como stock disponible:
  // productos agregados manualmente (todo el delta) y productos cargados desde
  // Abastecimiento cuya cantidad fue aumentada (delta - cargadoAbastecimiento).
  const detectarDisponiblesMasivo = (): ConfirmarDisponibleBodegaItem[] => {
    return itemsPedido
      .filter(i => i.motivo === 'ENTRADA_BODEGA')
      .map(i => ({ item: i, extra: i.delta - (i.cargadoAbastecimiento ?? 0) }))
      .filter(x => x.extra > 0.001)
      .map(x => ({
        idProducto: x.item.producto.idProducto,
        nombreProducto: x.item.producto.nombreProducto,
        unidad: x.item.producto.detalles,
        cantidad: parseFloat(x.extra.toFixed(3)),
      }));
  };

  const procesarMasivo = async () => {
    if (itemsPedido.length === 0) return;
    const disponibles = detectarDisponiblesMasivo();
    if (disponibles.length > 0) {
      setDisponiblesMasivo(disponibles);
      setIsDisponibleMasivoOpen(true);
      return;
    }
    await ejecutarMasivo();
  };

  const handleConfirmarDisponibleMasivo = async () => {
    setProcessState('procesando');
    try {
      await registrarDisponiblesService(
        disponiblesMasivo.map(d => ({
          idProducto: d.idProducto,
          cantidad: d.cantidad,
          tipoDisponible: 'BODEGA_TRANSITO',
        }))
      );
      toast.success('Productos registrados como stock disponible de bodega de tránsito');
    } catch {
      toast.warning('No se pudieron registrar los disponibles, pero la entrada continuará');
    }
    setIsDisponibleMasivoOpen(false);
    await ejecutarMasivo();
  };

  const handleCancelarDisponibleMasivo = async () => {
    setIsDisponibleMasivoOpen(false);
    await ejecutarMasivo();
  };

  const ejecutarMasivo = async () => {
    if (itemsPedido.length === 0) return;
    setProcessState('procesando');
    try {
      const payload: IBulkWarehouseUpdateRequest[] = [];
      const agregado = new Map<number, { delta: number; stockEnVista: number; tipoMovimiento: string }>();
      for (const item of itemsPedido) {
        const key = item.producto.idBodegaTransito;
        const ex  = agregado.get(key);
        if (ex && !item.motivo.includes('AJUSTE')) {
          ex.delta += item.delta;
        } else {
          agregado.set(key, { delta: item.delta, stockEnVista: item.producto.stock, tipoMovimiento: item.motivo });
        }
      }
      for (const [idBodegaTransito, v] of agregado.entries()) {
        payload.push({ idBodegaTransito, ...v });
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
  const chipColorMap: Record<string, 'success' | 'warning' | 'primary' | 'danger' | 'secondary'> = {
    ENTRADA_BODEGA: 'success',
    AJUSTE_BODEGA:  'primary',
    SALIDA_BODEGA:  'danger',
    MERMA_BODEGA:   'danger',
    DEVOLUCION:     'secondary',
  };

  return (
    <>
      <div className="flex flex-col w-full overflow-hidden rounded-2xl">
      <ModalHeader className="flex flex-col gap-3 border-b border-default-100 dark:border-default-50 bg-white dark:bg-content2 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-secondary dark:text-foreground">Control de Stock Masivo</h2>
            <p className="text-sm font-medium text-default-500 mt-1">
              Registre entradas, salidas, mermas y ajustes en la bodega de tránsito.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip content={puedeAccederAbastecimiento ? "Abastecimiento de proveedores (OPs confirmadas)" : "Sin permisos"} color="foreground" className="text-xs">
              <Button
                isIconOnly
                variant="light"
                color="secondary"
                size="lg"
                onPress={() => { onAbastecimientoOpen(); cargarAbastecimiento('semana'); }}
                isDisabled={!puedeAccederAbastecimiento}
              >
                <Icon icon="lucide:truck" width={22} />
              </Button>
            </Tooltip>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="px-4 py-3 space-y-3">
        {/* ── Formulario de agregar ── */}
        <div className="p-3 border border-default-200 dark:border-default-100 rounded-xl bg-default-50 dark:bg-content2">
          {productoActual && (
            <p className="text-xs text-default-500 px-0.5 mb-1.5">
              Stock actual en tránsito: <span className="font-semibold text-secondary">{fmtCL(stockReal)}</span>
            </p>
          )}
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

            {/* Botón agregar */}
            <Button
              isIconOnly
              color="warning"
              variant="solid"
              radius="full"
              size="lg"
              onPress={agregarProducto}
              isDisabled={!isFormValid}
              className="shadow-md"
            >
              <Icon icon="lucide:plus" width={22} />
            </Button>
          </div>

          {/* Info motivo */}
          {motivo && (
            <div className="mt-2 p-2.5 bg-secondary/5 rounded-lg border border-secondary/10 dark:bg-white/5 dark:border-white/10">
              <p className="text-secondary dark:text-foreground text-xs font-medium flex items-center gap-2">
                <Icon icon="lucide:info" width={14} className="shrink-0" />
                {motivo === 'ENTRADA_BODEGA'  && 'Entrada de insumos a la bodega de tránsito'}
                {motivo === 'SALIDA_BODEGA'   && 'Salida de insumos de la bodega de tránsito'}
                {motivo === 'AJUSTE_BODEGA'   && 'Ajustar el stock actual a un nuevo valor'}
                {motivo === 'MERMA_BODEGA'    && 'Salida por daño o pérdida en bodega de tránsito'}
                {motivo === 'DEVOLUCION'      && 'Registrar devolución de insumos'}
              </p>
            </div>
          )}
        </div>

        {/* ── Lista de ítems ── */}
        {itemsPedido.length > 0 && (
          <div className="space-y-3">
            <button
              type="button"
              className="w-full flex items-center gap-2 font-bold text-secondary hover:text-secondary/80 transition-colors cursor-pointer"
              onClick={() => setListadoExpandido(v => !v)}
            >
              <Icon icon="lucide:list" width={18} />
              Listado ({itemsPedido.length} producto{itemsPedido.length !== 1 ? 's' : ''})
              <Icon icon={listadoExpandido ? 'lucide:chevron-up' : 'lucide:chevron-down'} width={16} className="ml-auto text-default-400" />
            </button>

            <div className={`transition-all duration-300 ${listadoExpandido ? 'max-h-[65vh]' : 'max-h-[420px]'} overflow-y-auto`}>
              <div className="border border-default-200 dark:border-default-100 rounded-xl overflow-hidden bg-white dark:bg-content2">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 bg-default-100 dark:bg-default-50 font-semibold text-sm text-default-600 border-b border-default-200 dark:border-default-100">
                  <div>Producto</div>
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
                    const color   = chipColorMap[item.motivo] ?? 'default';
                    return (
                      <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 items-center hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-default-800 dark:text-foreground truncate">{item.producto.nombreProducto}</p>
                          <p className="text-xs text-default-400">{item.producto.detalles}</p>
                        </div>
                        <div className="text-center">
                          <span className="font-semibold text-sm">{fmtCL(item.producto.stock)}</span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <Button isIconOnly variant="light" size="sm" className="h-6 w-6 min-w-6"
                            onPress={() => actualizarDelta(item.id, Math.max(0, item.delta - (item.producto.esFraccionario ? 0.5 : 1)))}>
                            <Icon icon="lucide:minus" width={14} />
                          </Button>
                          <Input
                            type="number"
                            value={item.delta.toString()}
                            onValueChange={val => { const n = parseFloat(val); if (!isNaN(n)) actualizarDelta(item.id, n); }}
                            step={item.producto.esFraccionario ? '0.5' : '1'}
                            className="w-16"
                            size="sm"
                            variant="bordered"
                            classNames={{ input: 'text-center text-xs h-6' }}
                          />
                          <Button isIconOnly variant="light" size="sm" className="h-6 w-6 min-w-6"
                            onPress={() => actualizarDelta(item.id, item.delta + (item.producto.esFraccionario ? 0.5 : 1))}>
                            <Icon icon="lucide:plus" width={14} />
                          </Button>
                        </div>
                        <div className="text-center">
                          <Chip size="sm" color={color} variant="flat" className="text-xs">
                            {simbolo}{fmtCL(item.delta)} → {fmtCL(sf)}
                          </Chip>
                        </div>
                        <div className="text-center">
                          <Button isIconOnly variant="light" color="danger" size="sm" onPress={() => eliminarItem(item.id)}>
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

      <ModalFooter className="bg-default-50 border-t border-default-100 flex justify-end gap-2">
        <Button variant="ghost" onPress={onClose} isDisabled={processState !== 'idle'}>Cancelar</Button>
        <Button
          color="warning"
          onPress={procesarMasivo}
          isDisabled={itemsPedido.length === 0 || processState !== 'idle'}
          isLoading={processState !== 'idle'}
          startContent={processState === 'idle' ? <Icon icon="lucide:send" width={18} /> : undefined}
        >
          {processState === 'idle' ? `Ctrl. Masivo (${itemsPedido.length})` : 'Procesando...'}
        </Button>
      </ModalFooter>
    </div>

      {/* Confirmación: registrar excedente de ENTRADAS como stock disponible */}
      <ConfirmarDisponibleBodegaModal
        isOpen={isDisponibleMasivoOpen}
        items={disponiblesMasivo}
        isLoading={processState !== 'idle'}
        onCancelar={handleCancelarDisponibleMasivo}
        onConfirmar={handleConfirmarDisponibleMasivo}
      />

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
                  <div className="flex justify-center py-20">
                    <Spinner size="lg" color="warning" />
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
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const BodegaTransitoPage: React.FC = () => {
  const { canCreate: bod_Crear, canUpdate: bod_Editar, canDelete: bod_Eliminar } = useModulePermission('BODEGA_TRANSITO');
  const { canRead: ped_Leer, canCreate: ped_Crear } = useModulePermission('GESTION_PEDIDOS_DIARIOS');
  const { canCreate: catPuedeCrear } = useModulePermission('CATEGORIAS');
  const { canCreate: uniPuedeCrear } = useModulePermission('UNIDADES_MEDIDA');

  const toast = useToast();
  const history = useHistory();
  const [solicitudes, setSolicitudes] = React.useState<ISolicitud[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; });
  const [currentView, setCurrentView] = React.useState<'inventario' | 'pedidos'>('inventario');

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
    <div className="flex h-[calc(100vh-76px)] overflow-hidden font-sans relative -mt-6">
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
              {(bod_Editar || bod_Crear || catPuedeCrear || uniPuedeCrear) && (
                <div className="flex flex-wrap items-center gap-3 px-4 mb-2 mt-2">
                  {bod_Editar && (
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
                  {bod_Crear && (
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
                          <Button size="sm" variant="flat" color="primary" onPress={abrirPeriodo} startContent={<Icon icon="lucide:layers" width={14} />} className="h-8 font-semibold text-secondary">
                            Resumen período
                          </Button>
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
                              <EntregaSalaCard key={sala.idSala} sala={sala} onPreparar={abrirPreparar} canPreparar={ped_Crear} onExpandChange={handleExpandChange} />
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
      <div className="w-[70px] shrink-0 bg-white dark:bg-content1 border-l border-default-200 dark:border-default-100 flex flex-col items-center py-6 gap-4 z-30 sticky right-0 shadow-[-4px_0_15px_rgba(0,0,0,0.02)] -mr-6 self-stretch">
        <Tooltip content="Bodega de Tránsito" placement="left">
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

        {ped_Leer && (
          <Tooltip content="Gestión de Pedidos Diarios" placement="left">
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
        )}



        <div className="mt-auto border-t border-default-100 w-8 pt-4 flex flex-col gap-4">
          {/* Refresh icon removed as requested */}
        </div>
      </div>

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
              <ModalFooter><Button variant="light" onPress={onClose}>Cancelar</Button>{bod_Crear && <Button className="bg-gastronomia text-white" onPress={handleSaveExtra}>Guardar</Button>}</ModalFooter>
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

      <Modal isOpen={isModalOpen} onOpenChange={onModalOpenChange} size="lg" backdrop="blur" placement="top" classNames={{ base: "mt-4" }} isDismissable={false}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-default-100 dark:border-default-50 bg-white dark:bg-content2">
                <div className="flex items-center gap-2">
                  <Icon icon={modalMode === 'crear' ? "lucide:plus-circle" : "lucide:package-check"} className="text-primary" width={24} />
                  <span className="font-bold text-lg text-secondary dark:text-foreground">{modalMode === 'crear' ? 'Nuevo Producto en Bodega' : 'Control de Bodega'}</span>
                </div>
              </ModalHeader>
              <ModalBody className="py-6">
                <FormularioProducto
                  producto={productoSeleccionado}
                  onClose={onClose}
                  mode={modalMode}
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

      {/* Modal Control de Stock Masivo Bodega */}
      <Modal
        key={bulkModalKey}
        isOpen={isMasivoOpen}
        onOpenChange={(open) => setIsMasivoOpen(open)}
        size="5xl"
        backdrop="blur"
        placement="top"
        isDismissable={false}
        scrollBehavior="inside"
        classNames={{ base: 'min-h-[80vh] max-h-[90vh] mt-4', body: 'min-h-[620px]' }}
      >
        <ModalContent>
          {(onClose) => (
            <ControlMasivoBodegaModal
              onClose={onClose}
              initialItems={bulkRetryItems}
              puedeAccederAbastecimiento={bod_Crear || bod_Editar}
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
      classNames={{ base: 'rounded-2xl' }}
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
            <ModalBody className="py-4 px-5 space-y-4">
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
                      <div className="divide-y divide-default-100 dark:divide-default-50 max-h-[40vh] overflow-y-auto">
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