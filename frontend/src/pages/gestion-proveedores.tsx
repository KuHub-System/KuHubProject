/**
 * PÁGINA DE GESTIÓN DE PROVEEDORES
 * Conectada con el backend /api/v1/proveedor
 * Incluye cotización por rango de fechas con exportación a Excel.
 */

import React from 'react';
import {
  Button,
  Card,
  CardBody,
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
import XLSXStyle from 'xlsx-js-style';
import { usePageTitle } from '../hooks/usePageTitle';
import { useModulePermission } from '../contexts/permission-context';
import { usePeriodoSemana } from '../contexts/periodo-semana-context';
import { obtenerSemanasPorPeriodoService } from '../services/semana-service';
import BookPageLoader from '../components/BookPageLoader';
import type { ISemana } from '../types/semana.types';
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
  actualizarEstadoProveedorService,
  crearOrdenPedidoService,
  listarOrdenesPedidoService,
  obtenerOrdenPedidoDetalleService,
  cambiarEstadoOrdenPedidoService,
} from '../services/proveedor-service';
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
} from '../types/proveedor.types';
import type { IProductoRecetaSelection } from '../types/producto.types';

// ── Constantes de días de semana ──────────────────────────────────────────────

const DIAS_SEMANA_OPTIONS = [
  { value: 'LUNES', label: 'Lunes' },
  { value: 'MARTES', label: 'Martes' },
  { value: 'MIERCOLES', label: 'Miércoles' },
  { value: 'JUEVES', label: 'Jueves' },
  { value: 'VIERNES', label: 'Viernes' },
  { value: 'SABADO', label: 'Sábado' },
  { value: 'DOMINGO', label: 'Domingo' },
] as const;

const DIAS_ABREV: Record<DiaSemana, string> = {
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIERCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
};

// ── Utilidades de Precio (Peso Chileno) ──────────────────────────────────────

/**
 * Parsea un precio en formato chileno (1.234,567) o americano (1234.567).
 * Válido: "1.234,567", "1234,567", "1234.567", "1234", etc.
 * Retorna el número parseado o NaN si el formato es inválido.
 */
const parseChileanPrice = (input: string): number => {
  if (!input || typeof input !== 'string') return NaN;

  const cleaned = input.trim();

  // Si tiene coma y puntos, asumir formato chileno: 1.234,567
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    if (lastComma > lastDot) {
      // Coma es el separador decimal: 1.234,567
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }
  }

  // Si solo tiene coma: 1234,567 (formato chileno sin miles)
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    return parseFloat(cleaned.replace(',', '.'));
  }

  // Si solo tiene puntos: 1.234 (ambiguo, asumir miles) o 1234 (sin miles)
  if (!cleaned.includes(',')) {
    // Si el último grupo después del punto tiene 3 dígitos, es separador de miles
    if (cleaned.match(/\.\d{3}$/)) {
      return parseFloat(cleaned.replace(/\./g, ''));
    }
    // Si tiene 1-2 dígitos después del punto, es decimal: 1234.56
    if (cleaned.match(/\.\d{1,2}$/)) {
      return parseFloat(cleaned);
    }
    // Sin punto ni coma: 1234
    return parseFloat(cleaned);
  }

  return NaN;
};

/**
 * Formatea un número a peso chileno: 1234.567 → "1.234,567"
 * Preserva hasta 2 decimales si los hay.
 */
const formatChileanPrice = (num: number): string => {
  if (isNaN(num) || num === null || num === undefined) return '0';

  const isInteger = Number.isInteger(num);
  let integerPart: string;
  let decimalPart: string = '';

  if (isInteger) {
    integerPart = Math.floor(num).toString();
  } else {
    const rounded = Math.round(num * 100) / 100;
    const parts = rounded.toString().split('.');
    integerPart = parts[0];
    if (parts[1]) {
      decimalPart = ',' + parts[1];
    }
  }

  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return formattedInteger + decimalPart;
};

/**
 * Input mask inteligente para precios chilenos.
 * Auto-agrega puntos como separador de miles mientras el usuario escribe.
 * El usuario DEBE digitar manualmente la coma para decimales.
 * Ejemplo: usuario escribe "1234567" → se formatea a "1.234.567"
 *          usuario escribe "1234567," → se formatea a "1.234.567,"
 *          usuario escribe "1234567,89" → se formatea a "1.234.567,89"
 */
const smartPriceInput = (input: string): string => {
  if (!input) return '';

  // Separar por coma si existe (decimales)
  const hasComma = input.includes(',');
  const parts = input.split(',');
  const integerPart = parts[0];
  const decimalPart = hasComma ? ',' + parts[1] : '';

  // Remover puntos del entero y luego re-formatear
  const cleanInteger = integerPart.replace(/\./g, '');

  // Solo permitir dígitos en la parte entera
  const onlyDigits = cleanInteger.replace(/\D/g, '');

  // Agregar puntos como separador de miles
  const formatted = onlyDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return formatted + decimalPart;
};

// ── Helpers de UI ─────────────────────────────────────────────────────────────

const renderEstado = (estado: EstadoProveedor) => {
  return estado === 'DISPONIBLE'
    ? <Chip color="success" size="sm" variant="flat">Disponible</Chip>
    : <Chip color="danger" size="sm" variant="flat">No Disponible</Chip>;
};

const renderDisponibilidad = (activo: boolean) => {
  return activo
    ? <Chip color="success" size="sm" variant="flat">Activo</Chip>
    : <Chip color="warning" size="sm" variant="flat">Desabilitado</Chip>;
};

const formatPrecio = (precio: number) =>
  `$${precio.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Constante IVA Chile (19%). Coincide con la `IVA = 1.19` del backend. */
const IVA_RATIO = 1.19;

/** Redondea a 3 decimales (mismo scale que `precio_neto NUMERIC(10,3)` en la BD). */
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Detecta si los precios neto y con IVA están desincronizados.
 * Espera precio_con_iva ≈ precio_neto × 1.19 con tolerancia de ±0,01 para
 * absorber redondeos de tres decimales (scale=3 en BD).
 */
const esDesincronizado = (p: IProveedorProducto): boolean => {
  const neto = Number(p.precioNeto);
  const iva = Number(p.precioConIva);
  if (!isFinite(neto) || !isFinite(iva) || neto <= 0 || iva <= 0) return false;
  return Math.abs(iva - neto * IVA_RATIO) > 0.01;
};

// ── Helpers Excel (estándar EXCEL.MD) ─────────────────────────────────────────

const fmtN = (v: number): string =>
  v.toLocaleString('es-CL', { maximumFractionDigits: 3 });

const cl = (c: number): string => {
  let s = ''; let n = c + 1;
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
};

const sc = (v: string | number | null, s: object) => ({
  v: typeof v === 'number' ? fmtN(v) : (v ?? ''),
  t: 's' as const,
  s,
});

const styleTitle = {
  font: { bold: true, sz: 14, color: { rgb: '1A1A1A' } },
  fill: { fgColor: { rgb: 'FFB800' } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: false },
};

const styleHeader = {
  font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '2D3748' } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'FFFFFF' } },
    bottom: { style: 'thin' as const, color: { rgb: 'FFFFFF' } },
    left: { style: 'thin' as const, color: { rgb: 'FFFFFF' } },
    right: { style: 'thin' as const, color: { rgb: 'FFFFFF' } },
  },
};

const styleCat = {
  font: { bold: true, sz: 11, color: { rgb: '1A1A1A' } },
  fill: { fgColor: { rgb: 'FFF3CD' } },
  alignment: { horizontal: 'left' as const, vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'E2C97E' } },
    bottom: { style: 'thin' as const, color: { rgb: 'E2C97E' } },
    left: { style: 'thin' as const, color: { rgb: 'E2C97E' } },
    right: { style: 'thin' as const, color: { rgb: 'E2C97E' } },
  },
};

const styleNum = {
  font: { sz: 10 },
  fill: { fgColor: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'right' as const, vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    bottom: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    left: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    right: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
  },
};

const styleText = {
  font: { sz: 10 },
  fill: { fgColor: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'left' as const, vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    bottom: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    left: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    right: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
  },
};

const styleTotal = {
  font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '4A5568' } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: '718096' } },
    bottom: { style: 'thin' as const, color: { rgb: '718096' } },
    left: { style: 'thin' as const, color: { rgb: '718096' } },
    right: { style: 'thin' as const, color: { rgb: '718096' } },
  },
};

const styleSinProveedor = {
  font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: 'E53E3E' } },
  alignment: { horizontal: 'left' as const, vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'E53E3E' } },
    bottom: { style: 'thin' as const, color: { rgb: 'E53E3E' } },
    left: { style: 'thin' as const, color: { rgb: 'E53E3E' } },
    right: { style: 'thin' as const, color: { rgb: 'E53E3E' } },
  },
};

const styleProvHeader = {
  font: { bold: true, sz: 11, color: { rgb: '1A1A1A' } },
  fill: { fgColor: { rgb: 'EBF8FF' } },
  alignment: { horizontal: 'left' as const, vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'BEE3F8' } },
    bottom: { style: 'thin' as const, color: { rgb: 'BEE3F8' } },
    left: { style: 'thin' as const, color: { rgb: 'BEE3F8' } },
    right: { style: 'thin' as const, color: { rgb: 'BEE3F8' } },
  },
};

const styleTotalPositivo = {
  font: { bold: true, sz: 10, color: { rgb: '276749' } },
  fill: { fgColor: { rgb: 'C6F6D5' } },
  alignment: { horizontal: 'right' as const, vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    bottom: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    left: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    right: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
  },
};

// ── Helpers Orden Pedido — bloques consecutivos por día ───────────────────

const DIA_ORDEN: Record<TDiaSemana, number> = {
  LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4,
  VIERNES: 5, SABADO: 6, DOMINGO: 7,
};
const DIAS_TODOS: TDiaSemana[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

/** Suma N días a una fecha YYYY-MM-DD (sin tocar tz). */
const addDaysISO = (iso: string, n: number): string => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Retorna la fecha ISO del lunes de la semana que contiene la fecha dada. */
const getMondayISO = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ── Feriados Chile (mismo algoritmo que solicitud.tsx) ────────────────────────
// TODO (Pendiente de Modular): mover calcularPascua + esFeriadoChile + nombreFeriadoChile
//   a un utils compartido (ej. src/utils/feriados-chile.ts) para eliminar duplicado
//   con solicitud.tsx — tarea de refactor pendiente.
const _calcularPascua = (y: number): Date => {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
};

const _FERIADOS_FIJOS: [number, number, string][] = [
  [1,  1,  'Año Nuevo'],
  [5,  1,  'Día del Trabajo'],
  [5,  21, 'Glorias Navales'],
  [6,  29, 'San Pedro y San Pablo'],
  [7,  16, 'Virgen del Carmen'],
  [8,  15, 'Asunción de la Virgen'],
  [9,  18, 'Independencia Nacional'],
  [9,  19, 'Glorias del Ejército'],
  [10, 12, 'Encuentro Dos Mundos'],
  [10, 31, 'Iglesias Evangélicas'],
  [11, 1,  'Todos los Santos'],
  [12, 8,  'Inmaculada Concepción'],
  [12, 25, 'Navidad'],
];

/** Retorna el nombre del feriado chileno para la fecha, o null si no es feriado. */
const nombreFeriadoChile = (dt: Date): string | null => {
  const mm = dt.getMonth() + 1, dd = dt.getDate(), y = dt.getFullYear();
  const fijo = _FERIADOS_FIJOS.find(([fm, fd]) => fm === mm && fd === dd);
  if (fijo) return fijo[2];
  const pascua = _calcularPascua(y);
  const vs = new Date(pascua); vs.setDate(vs.getDate() - 2);
  const ss = new Date(pascua); ss.setDate(ss.getDate() - 1);
  if (dt.getTime() === vs.getTime()) return 'Viernes Santo';
  if (dt.getTime() === ss.getTime()) return 'Sábado Santo';
  return null;
};

const DIAS_ABREV_OC: Record<TDiaSemana, string> = {
  LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue',
  VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom',
};

// ── Spec de columna para la tabla de cotización ─────────────────────────────
type ColSpecOC =
  | { tipo: 'cant';    dia: TDiaSemana }
  | { tipo: 'entrega'; dia: TDiaSemana; semanaAnterior?: boolean };

// Clave compuesta: JUEVES → "JUEVES", JUEVES semana anterior → "JUEVES_prev"
const getEntregaKey = (col: ColSpecOC): string =>
  col.tipo === 'entrega' && col.semanaAnterior ? `${col.dia}_prev` : col.dia;

/** Genera columnas con lógica PROSPECTIVA: la entrega (E) se ubica ANTES de los días
 *  de necesidad (P) que cubre. Para cada día de necesidad se asigna el ÚLTIMO día de
 *  entrega anterior; si no existe, se usa el último día de entrega de la semana anterior
 *  (semanaAnterior=true). Caso especial: 1 solo día de entrega → todo a ESA semana. */
const buildColsOC = (
  diasEntrega: TDiaSemana[],
  diasConQty: Set<TDiaSemana>,
): ColSpecOC[] => {
  if (diasEntrega.length === 0) return [];

  // 1 solo día de entrega → todo va a ese día de ESTA semana (no semana anterior)
  if (diasEntrega.length === 1) {
    const dia = diasEntrega[0];
    const cols: ColSpecOC[] = [{ tipo: 'entrega', dia }];
    for (const d of DIAS_TODOS) {
      if (diasConQty.has(d)) cols.push({ tipo: 'cant', dia: d });
    }
    return cols;
  }

  const diasEntregaNum = diasEntrega.map(d => DIA_ORDEN[d]).sort((a, b) => a - b);

  // Para cada día de necesidad 1-6, determinar qué entrega lo cubre
  const grupos = new Map<string, { dia: TDiaSemana; semanaAnterior: boolean; needNums: number[] }>();
  for (let diaNec = 1; diaNec <= 6; diaNec++) {
    let asignado: number | null = null;
    for (let i = diasEntregaNum.length - 1; i >= 0; i--) {
      if (diasEntregaNum[i] < diaNec) { asignado = diasEntregaNum[i]; break; }
    }
    const esPrev = asignado === null;
    if (esPrev) asignado = diasEntregaNum[diasEntregaNum.length - 1];

    const clave = `${asignado}-${esPrev ? 'prev' : 'this'}`;
    const diaNombre = DIAS_TODOS[asignado! - 1];
    if (!grupos.has(clave)) grupos.set(clave, { dia: diaNombre, semanaAnterior: esPrev, needNums: [] });
    grupos.get(clave)!.needNums.push(diaNec);
  }

  // Construir columnas: E primero, luego P de los días con cantidad en ese grupo
  const cols: ColSpecOC[] = [];
  for (const g of grupos.values()) {
    cols.push({ tipo: 'entrega', dia: g.dia, ...(g.semanaAnterior && { semanaAnterior: true }) });
    for (const n of g.needNums) {
      const d = DIAS_TODOS[n - 1];
      if (diasConQty.has(d)) cols.push({ tipo: 'cant', dia: d });
    }
  }
  return cols;
};

// ── Componente principal ──────────────────────────────────────────────────────

const GestionProveedoresPage: React.FC = () => {
  const {
    canCreate: prov_Crear,
    canUpdate: prov_Editar,
    canDelete: prov_Eliminar,
  } = useModulePermission('GESTION_PROVEEDORES');

  // Context global de período/semana — sólo se LEE (no se muta) para el modal de OC.
  const { periodos: ctxPeriodos } = usePeriodoSemana();

  // ── Vista de Órdenes de Pedido (tab switcher) ────────────────────────
  const [currentView, setCurrentView] = React.useState<'proveedores' | 'ordenes'>('proveedores');

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
  const [editingPrecio, setEditingPrecio] = React.useState<{ idProveedorProducto: number; campo: 'neto' | 'iva' } | null>(null);
  const [precioTemp, setPrecioTemp] = React.useState('');

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
  const [toast, setToast] = React.useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
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

  const handleIniciarEditPrecio = (idProveedorProducto: number, precioActual: number, campo: 'neto' | 'iva' = 'neto') => {
    setEditingPrecio({ idProveedorProducto, campo });
    setPrecioTemp(formatChileanPrice(precioActual));
  };

  // Handler que aplica automáticamente el input mask mientras el usuario escribe
  const handlePrecioTempChange = (value: string) => {
    const formatted = smartPriceInput(value);
    setPrecioTemp(formatted);
  };

  const handleGuardarPrecio = async () => {
    if (!editingPrecio) return;
    const precio = parseChileanPrice(precioTemp);
    if (isNaN(precio) || precio <= 0) {
      showToast('El precio debe ser un número válido mayor a 0 (ej: 1.234,567 o 1234)', 'error');
      return;
    }
    setSavingPrecio(true);
    try {
      const actualizado = await actualizarPrecioProductoService(
        editingPrecio.idProveedorProducto,
        editingPrecio.campo === 'iva' ? { precioConIva: precioTemp } : { precioNeto: precioTemp }
      );

      if (actualizado) {
        showToast('Precio actualizado correctamente', 'success');

        // Versioning: cada actualización inserta una fila nueva con un idProveedorProducto
        // distinto. Actualizar el cache en memoria por el ID viejo lo deja apuntando a
        // una versión ya inactiva. La forma correcta es invalidar el cache del proveedor
        // dueño y recargar el detalle desde el backend.
        let idProveedorDueno: number | undefined;
        Object.entries(detalleCache).forEach(([idProvStr, detalle]) => {
          if (!detalle) return;
          const pertenece = Object.values(detalle.productosPorCategoria).some(productos =>
            productos.some(p => p.idProveedorProducto === editingPrecio.idProveedorProducto)
          );
          if (pertenece) idProveedorDueno = parseInt(idProvStr);
        });

        if (idProveedorDueno !== undefined) {
          invalidarCacheProveedor(idProveedorDueno);
          if (expandedRows.has(idProveedorDueno)) {
            const detalle = await obtenerProveedorDetalleService(idProveedorDueno);
            setDetalleCache(prev => ({ ...prev, [idProveedorDueno!]: detalle }));
          }
        }

        // Los resultados de búsqueda global pueden contener la fila stale: limpiarlos
        // fuerza al usuario a re-buscar con datos frescos.
        if (resultadosBusqueda.length > 0) {
          setResultadosBusqueda([]);
        }
      }
    } catch (err: any) {
      // [CAMBIO 2026-04-24] 409 Conflict: precio igual al actual (advertencia, no error)
      const isConflict = err.response?.status === 409;
      showToast(
        err.message || 'Error al actualizar el precio',
        isConflict ? 'warning' : 'error'
      );
    } finally {
      setSavingPrecio(false);
      setEditingPrecio(null);
      setPrecioTemp('');
    }
  };

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

  /** Resetea estado del modal de OP y lo abre en Paso 1. */
  const handleAbrirOrdenPedido = () => {
    setOcPaso(1);
    setOcPedidos([]);
    setOcSeleccionados(new Set());
    setOcErrorPedidos(null);
    setOcCotizacion(null);
    setOcErrorCotizacion(null);
    setOcCantidades({});
    setOcSemana(null);
    setOcSemanasPeriodo([]);

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
    openOrdenPedidoModal();
  };

  /** Cuando cambia el período: carga las semanas (local, sin tocar el context). */
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
          setOcSemana(null);
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
          const entregasProd: Record<string, number> = {};
          // Cantidades de días sin reserva de sala: se suman al día de entrega más próximo
          const sinDiaTotal = prod.cantidadPorDia
            .filter(c => c.dia === 'SIN_DIA')
            .reduce((s, c) => s + c.cantidad, 0);

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

  /** Avanza al Paso 2: carga cotización consolidada + 2000ms de BookPageLoader. */
  const handleGenerarOrdenPedido = async () => {
    if (ocSeleccionados.size === 0 || !ocSemana || !ocFechaEntrega) return;
    setOcPaso(2);
    setOcLoadingCotizacion(true);
    setOcErrorCotizacion(null);
    setOcCotizacion(null);
    setOcCantidades({});

    try {
      const [data] = await Promise.all([
        obtenerCotizacionConsolidadaService([...ocSeleccionados]),
        new Promise<void>(r => setTimeout(r, 2000)),
      ]);
      setOcCotizacion(data);
      const cantInicial = construirCantidades(data);
      setOcCantidades(cantInicial);
      setOcCantidadesOriginales(cantInicial);
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
      const entregas: { idProducto: number; cantidad: number; fechaEntrega: string }[] = [];

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

          entregas.push({ idProducto, cantidad: Math.round(cantidad * 1000) / 1000, fechaEntrega: fechaISO });
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

    setOcGenerandoOrdenes(false);

    if (ordenesCreadas.length > 0) {
      onOrdenPedidoModalChange();
      cargarProveedoresPaginados(1, true);
    }
    if (ordenesCreadas.length > 0 || erroresCreacion.length > 0) {
      setOcResultado({ ordenes: ordenesCreadas, errores: erroresCreacion });
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
      const data = await obtenerCotizacionConsolidadaService([...ocSeleccionados]);
      setOcCotizacion(data);
      const cantInicial = construirCantidades(data);
      setOcCantidades(cantInicial);
      setOcCantidadesOriginales(cantInicial);
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

  /** Redistribuye automáticamente al pulsar botón + o − en una celda de entrega.
   *  - delta > 0: suma a X, resta primero de días ANTERIORES luego POSTERIORES. Permite superar el total.
   *  - delta < 0: baja X (piso 0), distribuye a días POSTERIORES sin superar su base original. */
  const handleEntregaIncrement = (
    idProveedor: number,
    idProducto: number,
    entregaKey: string,
    delta: number,
    colSpecs: ColSpecOC[],
  ) => {
    // Evita drift de punto flotante redondeando a 5 decimales
    const r = (v: number) => Math.round(v * 100000) / 100000;

    setOcCantidades(prev => {
      const provData = prev[idProveedor] ?? {};
      const prodData = { ...(provData[idProducto] ?? {}) };
      const valorActual = prodData[entregaKey] ?? 0;

      const entregaCols = colSpecs.filter(c => c.tipo === 'entrega');
      const indexActual = entregaCols.findIndex(c => getEntregaKey(c) === entregaKey);

      const originalX = ocCantidadesOriginales[idProveedor]?.[idProducto]?.[entregaKey] ?? 0;

      // Suma actual y total objetivo (derivado de los originales = cantidadTotal)
      const sumAntes = r(entregaCols.reduce((s, c) => s + (prodData[getEntregaKey(c)] ?? 0), 0));
      const cantidadTotalProd = r(
        Object.values(ocCantidadesOriginales[idProveedor]?.[idProducto] ?? {}).reduce((s, v) => s + v, 0),
      );

      if (delta > 0) {
        // ── Snap de celda (subiendo): originalX → cantidadTotalProd → siguiente múltiplo ──
        let effectiveDelta = delta;
        if (valorActual < originalX - 0.00001 && r(valorActual + delta) > originalX + 0.00001) {
          // P1: aterrizar en la base individual
          effectiveDelta = r(originalX - valorActual);
        } else if (valorActual < cantidadTotalProd - 0.00001 && r(valorActual + delta) > cantidadTotalProd + 0.00001) {
          // P2: aterrizar en el total del producto
          effectiveDelta = r(cantidadTotalProd - valorActual);
        } else if (valorActual >= cantidadTotalProd - 0.00001) {
          // P3: aterrizar en el siguiente múltiplo del step por encima de cantidadTotalProd
          const nextGridCell = r(Math.ceil(r((cantidadTotalProd + 0.000001) / delta)) * delta);
          if (valorActual < nextGridCell - 0.00001 && r(valorActual + delta) > nextGridCell + 0.00001) {
            effectiveDelta = r(nextGridCell - valorActual);
          }
        }

        prodData[entregaKey] = r(valorActual + effectiveDelta);
        let restante = effectiveDelta;

        // 1. Restar de días ANTERIORES (del más cercano al más lejano)
        for (let i = indexActual - 1; i >= 0 && restante > 0.00001; i--) {
          const key = getEntregaKey(entregaCols[i]);
          const cant = prodData[key] ?? 0;
          if (cant > 0.00001) {
            const aRestar = Math.min(restante, cant);
            prodData[key] = r(cant - aRestar);
            restante = r(restante - aRestar);
          }
        }
        // 2. Si aún queda, restar de días POSTERIORES
        for (let i = indexActual + 1; i < entregaCols.length && restante > 0.00001; i++) {
          const key = getEntregaKey(entregaCols[i]);
          const cant = prodData[key] ?? 0;
          if (cant > 0.00001) {
            const aRestar = Math.min(restante, cant);
            prodData[key] = r(cant - aRestar);
            restante = r(restante - aRestar);
          }
        }

        // ── Snap de total (solo si el total aumenta, es decir restante > 0) ──
        if (restante > 0.00001) {
          const sumDespues = r(sumAntes + restante);
          const step = delta;
          // Snap 1: aterrizar en cantidadTotal al cruzarla desde abajo
          if (sumAntes < cantidadTotalProd - 0.00001 && sumDespues > cantidadTotalProd + 0.00001) {
            prodData[entregaKey] = r(prodData[entregaKey] - r(sumDespues - cantidadTotalProd));
          } else if (sumAntes >= cantidadTotalProd - 0.00001) {
            // Snap 2: aterrizar en el siguiente múltiplo del step por encima de cantidadTotal
            const nextGrid = r(Math.ceil(r((cantidadTotalProd + 0.000001) / step)) * step);
            if (sumAntes < nextGrid - 0.00001 && sumDespues > nextGrid + 0.00001) {
              prodData[entregaKey] = r(prodData[entregaKey] - r(sumDespues - nextGrid));
            }
          }
        }

      } else if (delta < 0) {
        // ── Snap de celda (bajando): cantidadTotalProd → originalX → 0 ──
        let effectiveStep = Math.abs(delta);
        if (valorActual > cantidadTotalProd + 0.00001 && r(valorActual - effectiveStep) < cantidadTotalProd - 0.00001) {
          // P1: aterrizar en el total del producto (si la celda lo supera por edición manual)
          effectiveStep = r(valorActual - cantidadTotalProd);
        } else if (valorActual > originalX + 0.00001 && r(valorActual - effectiveStep) < originalX - 0.00001) {
          // P2: aterrizar en la base individual
          effectiveStep = r(valorActual - originalX);
        }
        effectiveStep = Math.min(effectiveStep, valorActual); // piso en 0
        if (effectiveStep < 0.00001) return prev;

        prodData[entregaKey] = r(valorActual - effectiveStep);

        const originalesProd = ocCantidadesOriginales[idProveedor]?.[idProducto] ?? {};
        let pendiente = effectiveStep;

        // Distribuir a días POSTERIORES sin superar su base original
        for (let i = indexActual + 1; i < entregaCols.length && pendiente > 0.00001; i++) {
          const key = getEntregaKey(entregaCols[i]);
          const baseDay    = originalesProd[key] ?? 0;
          const currentDay = prodData[key] ?? 0;
          const espacio    = r(baseDay - currentDay);
          if (espacio > 0.00001) {
            const aAgregar = Math.min(pendiente, espacio);
            prodData[key] = r(currentDay + aAgregar);
            pendiente = r(pendiente - aAgregar);
          }
        }

        // ── Snap de total (solo si el total disminuye, es decir pendiente > 0) ──
        if (pendiente > 0.00001) {
          const sumDespues = r(sumAntes - pendiente);
          const step = Math.abs(delta);
          // Snap 1: aterrizar en cantidadTotal al cruzarla desde arriba
          if (sumAntes > cantidadTotalProd + 0.00001 && sumDespues < cantidadTotalProd - 0.00001) {
            prodData[entregaKey] = r(prodData[entregaKey] + r(cantidadTotalProd - sumDespues));
          } else if (sumAntes <= cantidadTotalProd + 0.00001) {
            // Snap 2: aterrizar en el múltiplo del step inmediatamente por debajo de cantidadTotal
            const prevGrid = r(Math.floor(r((cantidadTotalProd - 0.000001) / step)) * step);
            if (sumAntes > prevGrid + 0.00001 && sumDespues < prevGrid - 0.00001) {
              prodData[entregaKey] = r(prodData[entregaKey] + r(prevGrid - sumDespues));
            }
          }
        }

      } else {
        return prev;
      }

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
    <div className="container mx-auto px-4 pb-8 font-sans -mt-6">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-success-500' : 'bg-danger-500'
            }`}
          >
            <Icon icon={toast.type === 'success' ? 'lucide:check-circle' : 'lucide:alert-circle'} width={18} />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-6 items-stretch">
        {/* ── Área de contenido principal ── */}
        <div className="flex-1 min-w-0 pt-14">
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
          />

          {/* ── Modal confirmación Cancelar Orden ── */}
          <Modal
            isOpen={opConfirmCancelar !== null}
            onOpenChange={(open) => { if (!open) setOpConfirmCancelar(null); }}
            size="sm"
            radius="lg"
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
              {prov_Crear && (
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
              {prov_Editar && (
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
              {prov_Editar && (
                <Button
                  color="warning"
                  variant="flat"
                  className="font-bold cursor-pointer"
                  startContent={<Icon icon="lucide:clipboard-list" width={20} />}
                  onPress={handleAbrirOrdenPedido}
                >
                  Generar Orden Pedido
                </Button>
              )}
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
                        const newKeys = new Set(keys);
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
                      closeOnSelect={false}
                      classNames={{ trigger: 'bg-white dark:bg-default-100/50 border-warning-300 dark:border-warning-200/50 h-10' }}
                      startContent={<Icon icon="lucide:filter" className="text-warning-500" width={16} />}
                    >
                  {/* Grupo Estado - Mutuamente excluyentes */}
                  <SelectItem key="estado-DISPONIBLE" value="estado-DISPONIBLE">
                    Estado: Disponible
                  </SelectItem>
                  <SelectItem key="estado-NO_DISPONIBLE" value="estado-NO_DISPONIBLE">
                    Estado: No Disponible
                  </SelectItem>

                  {/* Grupo Precio */}
                  <SelectItem key="precio-asc" value="precio-asc">
                    Menor Precio Primero
                  </SelectItem>
                  <SelectItem key="precio-desc" value="precio-desc">
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
              <Button size="sm" variant="flat" color="danger" onPress={cargarProveedores}>
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
                  {prov_Crear && (
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
                      canEdit={prov_Editar}
                      editingPrecio={editingPrecio}
                      precioTemp={precioTemp}
                      savingPrecio={savingPrecio}
                      onIniciarEditPrecio={handleIniciarEditPrecio}
                      onPrecioTempChange={handlePrecioTempChange}
                      onGuardarPrecio={handleGuardarPrecio}
                      onCancelarEditPrecio={() => setEditingPrecio(null)}
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
                          {prov_Editar && proveedor.activo && (
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
                              <Icon icon="lucide:eye" className="text-primary" width={17} />
                            </Button>
                            {prov_Editar && (
                              <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                title="Editar proveedor"
                                onPress={() => handleEditarProveedor(proveedor)}
                              >
                                <Icon icon="lucide:edit" className="text-default-500 hover:text-secondary" width={17} />
                              </Button>
                            )}
                            {prov_Editar && (
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
                            {prov_Eliminar && (
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
                                  canEdit={prov_Editar}
                                  editingPrecio={editingPrecio}
                                  precioTemp={precioTemp}
                                  savingPrecio={savingPrecio}
                                  onIniciarEditPrecio={handleIniciarEditPrecio}
                                  onPrecioTempChange={handlePrecioTempChange}
                                  onGuardarPrecio={handleGuardarPrecio}
                                  onCancelarEditPrecio={() => setEditingPrecio(null)}
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
        <div className="w-[70px] shrink-0 bg-white dark:bg-content1 border-l border-default-200 dark:border-default-100 shadow-[-4px_0_15px_rgba(0,0,0,0.02)] self-stretch -mt-14 -mr-10 pb-[1000px] -mb-[1000px]">
          <div className="sticky top-8 flex flex-col items-center pt-28 pb-6 gap-4 z-30">
            <Tooltip content="Proveedores" placement="left">
              <Button
                isIconOnly
                variant={currentView === 'proveedores' ? 'solid' : 'light'}
                color={currentView === 'proveedores' ? 'primary' : 'default'}
                onPress={() => setCurrentView('proveedores')}
                className={`w-12 h-12 rounded-2xl transition-all duration-300 ${currentView === 'proveedores' ? 'shadow-lg shadow-primary/30' : 'text-default-400 hover:bg-default-100'}`}
              >
                <Icon icon="lucide:store" width={22} />
              </Button>
            </Tooltip>
            <Tooltip content="Órdenes de Pedido" placement="left">
              <Button
                isIconOnly
                variant={currentView === 'ordenes' ? 'solid' : 'light'}
                color={currentView === 'ordenes' ? 'warning' : 'default'}
                onPress={() => setCurrentView('ordenes')}
                className={`w-12 h-12 rounded-2xl transition-all duration-300 ${currentView === 'ordenes' ? 'shadow-lg shadow-warning/30' : 'text-default-400 hover:bg-default-100'}`}
              >
                <Icon icon="lucide:clipboard-list" width={22} />
              </Button>
            </Tooltip>
            {opLista.length > 0 && currentView !== 'ordenes' && (
              <span className="px-2 py-0.5 bg-warning-100 text-warning-700 text-[10px] font-bold rounded-full">
                {opLista.length}
              </span>
            )}
          </div>
        </div>
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
        onCantidadChange={actualizarCantidadOc}
        onIncrement={handleEntregaIncrement}
        onRestaurar={handleRestaurarProducto}
        onVolver={handleVolverPaso1}
        fechaEntrega={ocFechaEntrega}
        onFechaEntregaChange={setOcFechaEntrega}
        proveedoresEstados={Object.fromEntries(proveedores.map(p => [p.idProveedor, p.estadoProveedor]))}
        togglingEstadoPaso2Id={ocTogglingEstadoId}
        onToggleEstadoProveedor={handleConfirmarToggleEstadoPaso2}
        onConfirmarOrden={handleConfirmarGenerarOrden}
        isGenerandoOrdenes={ocGenerandoOrdenes}
      />

      {/* ── Modal resultado Generar Ordenes de Pedidos ── */}
      <Modal
        isOpen={ocResultado !== null}
        onClose={() => setOcResultado(null)}
        size="md"
        hideCloseButton
        radius="lg"
        classNames={{ base: 'rounded-2xl' }}
      >
        <ModalContent className="overflow-hidden">
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

          <ModalBody className="py-5 px-6 space-y-4">
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
          </ModalBody>

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
        radius="lg"
        classNames={{ base: 'rounded-2xl', closeButton: 'cursor-pointer' }}
        onClose={handleCerrarSyncExcel}
      >
        <ModalContent className="rounded-2xl overflow-hidden">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Icon icon="lucide:upload-cloud" width={22} className="text-success-500" />
                Sincronizar Precios desde Excel
              </ModalHeader>
              <ModalBody className="space-y-4">
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
      <Modal isOpen={isProvModal} onOpenChange={onProvModalChange} size="lg" scrollBehavior="inside" radius="lg" classNames={{ base: 'rounded-2xl', closeButton: 'cursor-pointer' }}>
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
      <Modal isOpen={isProdModal} onOpenChange={onProdModalChange} size="md" radius="lg" classNames={{ base: 'rounded-2xl', closeButton: 'cursor-pointer' }}>
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
      <Modal isOpen={isDelModal} onOpenChange={onDelModalChange} size="sm" radius="lg" classNames={{ base: 'rounded-2xl', closeButton: 'cursor-pointer' }}>
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

      {/* ── Modal Confirmar Cambiar Estado Proveedor ── */}
      <Modal isOpen={isToggleEstadoModal} onOpenChange={onToggleEstadoModalChange} size="sm" radius="lg" classNames={{ base: 'rounded-2xl', closeButton: 'cursor-pointer' }}>
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
      <Modal isOpen={isOcToggleEstadoModal} onOpenChange={onOcToggleEstadoModalChange} size="sm" radius="lg" classNames={{ base: 'rounded-2xl', closeButton: 'cursor-pointer' }}>
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
      <Modal isOpen={isQuitarModal} onOpenChange={onQuitarModalChange} size="sm" radius="lg" classNames={{ base: 'rounded-2xl', closeButton: 'cursor-pointer' }}>
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

// ── Sub-componente: tabla de productos del proveedor ──────────────────────────

interface ProductosProveedorProps {
  detalle: IProveedorDetalle;
  canEdit: boolean;
  editingPrecio: { idProveedorProducto: number; campo: 'neto' | 'iva' } | null;
  precioTemp: string;
  savingPrecio: boolean;
  onIniciarEditPrecio: (idProveedorProducto: number, precioActual: number, campo?: 'neto' | 'iva') => void;
  onPrecioTempChange: (val: string) => void;
  onGuardarPrecio: () => void;
  onCancelarEditPrecio: () => void;
  onToggleProducto: (idProveedor: number, prod: IProveedorProducto) => void;
  onQuitarProducto: (idProveedor: number, prod: IProveedorProducto) => void;
  onSincronizarPrecio: (idProveedor: number, prod: IProveedorProducto, direccion: 'desde-neto' | 'desde-iva') => void;
  mostrarInactivos?: boolean;
  onMostrarInactivosChange?: (mostrar: boolean) => void;
}

const ProductosProveedor: React.FC<ProductosProveedorProps> = ({
  detalle,
  canEdit,
  editingPrecio,
  precioTemp,
  savingPrecio,
  onIniciarEditPrecio,
  onPrecioTempChange,
  onGuardarPrecio,
  onCancelarEditPrecio,
  onToggleProducto,
  onQuitarProducto,
  onSincronizarPrecio,
  mostrarInactivos = true,
  onMostrarInactivosChange,
}) => {
  // Vista histórica de precios: cuando el usuario elige una fecha, se carga el
  // detalle del proveedor con los precios vigentes hasta esa fecha (read-only).
  const [fechaHistorica, setFechaHistorica] = React.useState<CalendarDate | null>(null);
  const [detalleHistorico, setDetalleHistorico] = React.useState<IProveedorDetalle | null>(null);
  const [loadingHistorico, setLoadingHistorico] = React.useState(false);
  const [errorHistorico, setErrorHistorico] = React.useState<string | null>(null);

  const [descargandoExcel, setDescargandoExcel] = React.useState(false);
  const [errorDescarga, setErrorDescarga] = React.useState<string | null>(null);

  const handleDescargarExcel = async () => {
    setDescargandoExcel(true);
    setErrorDescarga(null);
    try {
      const slug = (detalle.nombreDistribuidora || `proveedor-${detalle.idProveedor}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const fecha = new Date().toISOString().slice(0, 10);
      await descargarExcelPlantillaService(detalle.idProveedor, `${slug}-${fecha}`);
    } catch (err: any) {
      setErrorDescarga(err.message || 'Error al descargar el archivo Excel');
    } finally {
      setDescargandoExcel(false);
    }
  };

  const esHistorico = detalleHistorico !== null;
  const detalleVisible = detalleHistorico ?? detalle;
  const editable = canEdit && !esHistorico;

  React.useEffect(() => {
    if (!fechaHistorica) {
      setDetalleHistorico(null);
      setErrorHistorico(null);
      return;
    }
    let cancelado = false;
    const fechaStr = fechaHistorica.toString();
    setLoadingHistorico(true);
    setErrorHistorico(null);
    obtenerProductosPorFechaService(detalle.idProveedor, fechaStr)
      .then(d => { if (!cancelado) setDetalleHistorico(d); })
      .catch(err => { if (!cancelado) setErrorHistorico(err.message || 'Error al cargar el historial'); })
      .finally(() => { if (!cancelado) setLoadingHistorico(false); });
    return () => { cancelado = true; };
  }, [fechaHistorica, detalle.idProveedor]);

  const limpiarFecha = () => {
    setFechaHistorica(null);
    setDetalleHistorico(null);
    setErrorHistorico(null);
  };

  const categorias = Object.keys(detalleVisible.productosPorCategoria);
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(
    new Set(categorias)
  );
  const [searchQuery, setSearchQuery] = React.useState('');

  // Cuando cambian las categorías visibles (ej. al cargar histórico), expandir todas
  React.useEffect(() => {
    setExpandedCategories(new Set(Object.keys(detalleVisible.productosPorCategoria)));
  }, [detalleVisible]);

  const hoy = new Date();
  const calendarHoy = new CalendarDate(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate());

  // Filtrar productos según mostrarInactivos y búsqueda
  const filtrarProductos = (productos: typeof detalleVisible.productosPorCategoria[string]) => {
    let filtered = mostrarInactivos ? productos : productos.filter(p => p.activo);

    if (searchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.nombreProducto.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const toggleCategoria = (categoria: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoria)) {
      newExpanded.delete(categoria);
    } else {
      newExpanded.add(categoria);
    }
    setExpandedCategories(newExpanded);
  };

  // Contador de productos con neto/IVA desincronizados — recorre todos los productos
  // del detalle visible (actual o histórico) y aplica esDesincronizado().
  const cantDesincronizados = React.useMemo(() => {
    let n = 0;
    Object.values(detalleVisible.productosPorCategoria).forEach(prods => {
      prods.forEach(p => { if (esDesincronizado(p)) n++; });
    });
    return n;
  }, [detalleVisible]);

  return (
    <div className="space-y-3 mt-2">
      {/* Controles: búsqueda, vista histórica y mostrar/esconder deshabilitados */}
      <div className="space-y-2 px-2 pb-3">
        {/* Buscador de productos (siempre visible, pero se prioriza si el usuario escribe) */}
        <div className="flex items-center gap-2">
          <Icon icon="lucide:search" width={16} className="text-default-400" />
          <input
            type="text"
            placeholder="Buscar producto por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 text-xs border border-default-200 dark:border-default-100 rounded-lg bg-default-50 dark:bg-default-100/30 focus:outline-none focus:border-primary transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-default-400 hover:text-default-600 transition-colors"
            >
              <Icon icon="lucide:x" width={16} />
            </button>
          )}
        </div>

        {/* Vista histórica de precios — DatePicker + descarga de plantilla Excel */}
        <div className="flex items-center gap-2 flex-wrap">
          <Icon icon="lucide:history" width={16} className="text-default-400" />
          <span className="text-xs text-default-500">Ver precios al:</span>
          <DatePicker
            size="sm"
            value={fechaHistorica}
            onChange={setFechaHistorica}
            maxValue={calendarHoy}
            granularity="day"
            aria-label="Fecha para vista histórica de precios"
            className="max-w-[180px]"
          />
          {fechaHistorica && (
            <Button size="sm" variant="light" onPress={limpiarFecha}>
              <Icon icon="lucide:x" width={14} className="mr-1" />
              Ver actual
            </Button>
          )}
          {loadingHistorico && <Spinner size="sm" color="primary" />}
          <div className="ml-auto">
            <Button
              size="sm"
              variant="flat"
              color="success"
              isDisabled={descargandoExcel}
              onPress={handleDescargarExcel}
            >
              {descargandoExcel ? (
                <Spinner size="sm" color="success" />
              ) : (
                <Icon icon="lucide:file-down" width={14} className="mr-1" />
              )}
              Descargar Excel
            </Button>
          </div>
        </div>

        {errorDescarga && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
            <Icon icon="lucide:alert-circle" width={14} className="text-danger-600 mt-0.5" />
            <p className="text-xs text-danger-700 dark:text-danger-300">{errorDescarga}</p>
          </div>
        )}

        {/* Banner indicando vista histórica */}
        {esHistorico && fechaHistorica && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
            <Icon icon="lucide:eye" width={14} className="text-warning-600 mt-0.5" />
            <p className="text-xs text-warning-700 dark:text-warning-300">
              Vista histórica al <strong>{fechaHistorica.toString()}</strong> — los precios mostrados eran los vigentes a esa fecha. La edición está deshabilitada.
            </p>
          </div>
        )}

        {errorHistorico && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
            <Icon icon="lucide:alert-circle" width={14} className="text-danger-600 mt-0.5" />
            <p className="text-xs text-danger-700 dark:text-danger-300">{errorHistorico}</p>
          </div>
        )}

        {/* Opción para mostrar/esconder deshabilitados */}
        {editable && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`esconderInactivos-${detalleVisible.idProveedor}`}
              checked={!mostrarInactivos}
              onChange={(e) => onMostrarInactivosChange?.(!e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer accent-warning"
            />
            <label
              htmlFor={`esconderInactivos-${detalleVisible.idProveedor}`}
              className="text-xs text-default-500 cursor-pointer hover:text-default-700 transition-colors"
            >
              {mostrarInactivos ? 'Esconder deshabilitados' : 'Mostrar deshabilitados'}
            </label>

            {/* Label de productos con precios desincronizados (neto y IVA no coinciden) */}
            {cantDesincronizados > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-50 dark:bg-warning-900/30 border border-warning-200 dark:border-warning-800 text-warning-700 dark:text-warning-300 text-[11px]">
                <Icon icon="lucide:alert-triangle" width={12} />
                {cantDesincronizados} producto{cantDesincronizados === 1 ? '' : 's'} con precios desincronizados
              </span>
            )}
          </div>
        )}
      </div>

      {categorias.length === 0 && !loadingHistorico && (
        <p className="text-xs text-default-400 py-4 text-center">
          {esHistorico
            ? 'No había productos para este proveedor en la fecha seleccionada.'
            : 'Este proveedor no tiene productos asignados aún.'}
        </p>
      )}

      {categorias.map((categoria) => {
        const isExpanded = expandedCategories.has(categoria);
        const productosEnCategoria = filtrarProductos(detalleVisible.productosPorCategoria[categoria]);
        const total = detalleVisible.productosPorCategoria[categoria].length;

        // No renderizar categoría si no hay productos coincidentes con búsqueda
        if (productosEnCategoria.length === 0 && searchQuery.trim()) {
          return null;
        }

        return (
          <div key={categoria}>
            {/* Header de categoría con toggle */}
            <div
              onClick={() => toggleCategoria(categoria)}
              className="flex items-center justify-between px-3 py-2 mb-1 bg-default-50 dark:bg-default-100/20 rounded-lg border border-default-200 dark:border-default-100 cursor-pointer hover:bg-default-100 dark:hover:bg-default-100/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon
                  icon={isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'}
                  width={18}
                  className="text-default-500 transition-transform"
                />
                <p className="text-xs font-semibold text-default-600 dark:text-default-400 uppercase tracking-wide">
                  {categoria}
                </p>
              </div>
              <span className="text-xs text-default-400">
                {productosEnCategoria.length} / {total}
              </span>
            </div>

            {/* Tabla de productos (solo si la categoría está expandida) */}
            {isExpanded && (
              <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
                <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
                  <thead className="bg-default-100 dark:bg-default-50">
                    <tr>
                      <th className="text-center py-2 px-3 font-medium w-[200px]">Producto</th>
                      <th className="text-center py-2 px-3 font-medium w-14">Unidad</th>
                      <th className="text-center py-2 px-3 font-medium w-28">Contenido</th>
                      <th className="text-center py-2 px-3 font-medium w-24">Marca</th>
                      <th className="text-center py-2 px-3 font-medium w-24">Precio Neto</th>
                      <th className="text-center py-2 px-3 font-medium w-24">Precio + IVA</th>
                      <th className="text-center py-2 px-3 font-medium w-16">Estado</th>
                      <th className="text-center py-2 px-3 font-medium w-20">Actualizado</th>
                      {editable && <th className="py-2 px-3 font-medium text-center w-32">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filtrarProductos(detalleVisible.productosPorCategoria[categoria]).map((prod) => {
                  const isEditing = editingPrecio?.idProveedorProducto === prod.idProveedorProducto;
                  const isEditingNeto = isEditing && editingPrecio?.campo === 'neto';
                  const isEditingIva  = isEditing && editingPrecio?.campo === 'iva';

                  const inlineEditUI = (
                    <div className="flex items-center gap-1">
                      <Input
                        size="sm"
                        value={precioTemp}
                        onValueChange={onPrecioTempChange}
                        className="w-20"
                        classNames={{ inputWrapper: 'h-6 min-h-6' }}
                        startContent={<span className="text-default-400 text-xs">$</span>}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onGuardarPrecio();
                          if (e.key === 'Escape') onCancelarEditPrecio();
                        }}
                        autoFocus
                      />
                      <Button isIconOnly size="sm" variant="flat" color="success" isLoading={savingPrecio} onPress={onGuardarPrecio}>
                        <Icon icon="lucide:check" width={13} />
                      </Button>
                      <Button isIconOnly size="sm" variant="light" onPress={onCancelarEditPrecio}>
                        <Icon icon="lucide:x" width={13} />
                      </Button>
                    </div>
                  );

                  return (
                    <tr
                      key={prod.idProveedorProducto}
                      className={`border-t border-default-100 dark:border-default-50 ${
                        prod.activo
                          ? 'hover:bg-default-50 dark:hover:bg-default-100/20'
                          : 'bg-default-50/30 dark:bg-default-100/10 opacity-60'
                      }`}
                    >
                      <td className="py-2 px-3 font-medium text-center w-[200px] overflow-hidden">
                        <Tooltip content={prod.nombreProducto} color="foreground" className="text-xs">
                          <span className="truncate block whitespace-nowrap">
                            {prod.nombreProducto}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="py-2 px-3 text-default-500 text-center">
                        {prod.abreviatura || prod.nombreUnidad}
                      </td>
                      <td className="py-2 px-3 text-default-500 text-center">
                        {prod.formatoContenido || '—'}
                      </td>
                      <td className="py-2 px-3 text-default-500 text-center">
                        {prod.marcaProducto || '—'}
                      </td>
                      {/* Precio Neto — editable inline (deshabilitado en vista histórica) */}
                      <td className="py-2 px-3 text-center">
                        {isEditingNeto ? inlineEditUI : isEditingIva ? (
                          <span className="text-default-300">—</span>
                        ) : (
                          <span
                            className={`cursor-pointer hover:text-primary transition-colors ${editable ? 'underline decoration-dotted' : ''}`}
                            title={editable ? 'Clic para editar precio neto' : undefined}
                            onClick={() => editable && onIniciarEditPrecio(prod.idProveedorProducto, prod.precioNeto, 'neto')}
                          >
                            {formatPrecio(prod.precioNeto)}
                          </span>
                        )}
                      </td>
                      {/* Precio + IVA — editable inline (deshabilitado en vista histórica) */}
                      <td className="py-2 px-3 text-center">
                        {isEditingIva ? inlineEditUI : isEditingNeto ? (
                          <span className="text-default-300">—</span>
                        ) : (
                          <span
                            className={`cursor-pointer hover:text-primary transition-colors ${editable ? 'underline decoration-dotted' : ''}`}
                            title={editable ? 'Clic para editar precio con IVA' : undefined}
                            onClick={() => editable && onIniciarEditPrecio(prod.idProveedorProducto, prod.precioConIva, 'iva')}
                          >
                            {formatPrecio(prod.precioConIva)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">{renderDisponibilidad(prod.activo)}</td>
                      <td className="py-2 px-3 text-default-400 text-center">
                        {prod.fechaActualizacion
                          ? new Date(prod.fechaActualizacion).toLocaleDateString('es-CL')
                          : '—'}
                      </td>
                      {editable && (
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Iconos de sincronización — solo aparecen cuando neto/IVA no coinciden.
                                Al hacer clic se llama al backend; cuando retorna true, el caché local
                                se actualiza con el nuevo valor calculado y el icono desaparece
                                (esDesincronizado vuelve a dar false en el próximo render). */}
                            {esDesincronizado(prod) && (
                              <>
                                <Tooltip content="Sincronizar IVA desde el precio neto">
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    onPress={() => onSincronizarPrecio(detalleVisible.idProveedor, prod, 'desde-neto')}
                                    className="text-primary hover:text-primary-600"
                                  >
                                    <Icon icon="lucide:arrow-right-from-line" width={16} />
                                  </Button>
                                </Tooltip>
                                <Tooltip content="Sincronizar neto desde el precio con IVA">
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    onPress={() => onSincronizarPrecio(detalleVisible.idProveedor, prod, 'desde-iva')}
                                    className="text-primary hover:text-primary-600"
                                  >
                                    <Icon icon="lucide:arrow-left-from-line" width={16} />
                                  </Button>
                                </Tooltip>
                              </>
                            )}
                            <Tooltip content={prod.activo ? 'Deshabilitar producto' : 'Habilitar producto'}>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() =>
                                  prod.activo
                                    ? onQuitarProducto(detalleVisible.idProveedor, prod)
                                    : onToggleProducto(detalleVisible.idProveedor, prod)
                                }
                                className={prod.activo ? 'text-success hover:text-danger' : 'text-warning hover:text-success'}
                              >
                                <Icon
                                  icon={prod.activo ? 'lucide:check-circle-2' : 'lucide:circle-x'}
                                  width={18}
                                />
                              </Button>
                            </Tooltip>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Sub-componente: resultados de búsqueda global agrupados por proveedor ────────

interface BusquedaResultadosProps {
  resultados: IBusquedaProductosGlobal[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  canEdit: boolean;
  editingPrecio: { idProveedorProducto: number; campo: 'neto' | 'iva' } | null;
  precioTemp: string;
  savingPrecio: boolean;
  onIniciarEditPrecio: (idProveedorProducto: number, precioActual: number, campo?: 'neto' | 'iva') => void;
  onPrecioTempChange: (val: string) => void;
  onGuardarPrecio: () => void;
  onCancelarEditPrecio: () => void;
  onToggleProducto: (idProveedor: number, prod: IProveedorProducto) => void;
  onQuitarProducto: (idProveedor: number, prod: IProveedorProducto) => void;
  onSincronizarPrecio: (idProveedor: number, prod: IProveedorProducto, direccion: 'desde-neto' | 'desde-iva') => void;
}

const BusquedaResultados: React.FC<BusquedaResultadosProps> = ({
  resultados,
  loading,
  error,
  searchTerm,
  canEdit,
  editingPrecio,
  precioTemp,
  savingPrecio,
  onIniciarEditPrecio,
  onPrecioTempChange,
  onGuardarPrecio,
  onCancelarEditPrecio,
  onToggleProducto,
  onQuitarProducto,
  onSincronizarPrecio,
}) => {
  const [expandedProveedores, setExpandedProveedores] = React.useState<Set<number>>(
    new Set(resultados.map(r => r.idProveedor))
  );
  const [expandedCategorias, setExpandedCategorias] = React.useState<Set<string>>(new Set());

  // Actualizar proveedores y categorías expandidos cuando los resultados cambian
  React.useEffect(() => {
    // Expandir todos los proveedores
    setExpandedProveedores(new Set(resultados.map(r => r.idProveedor)));

    // Expandir todas las categorías
    const allCategoriaKeys = new Set<string>();
    resultados.forEach(proveedor => {
      proveedor.categorias.forEach(categoria => {
        allCategoriaKeys.add(`${proveedor.idProveedor}-${categoria.nombreCategoria}`);
      });
    });
    setExpandedCategorias(allCategoriaKeys);
  }, [resultados]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" color="warning" label="Buscando productos..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border border-danger-200 bg-danger-50 dark:bg-danger-50/10">
        <CardBody className="flex flex-row items-center gap-3 p-4">
          <Icon icon="lucide:alert-triangle" className="text-danger" width={22} />
          <p className="text-danger text-sm">{error}</p>
        </CardBody>
      </Card>
    );
  }

  if (resultados.length === 0) {
    return (
      <Card className="border border-default-200 bg-default-50">
        <CardBody className="flex flex-col items-center gap-2 py-8 text-default-400">
          <Icon icon="lucide:package-x" width={40} />
          <p className="text-sm text-center">
            No se encontró el producto <strong>"{searchTerm}"</strong>
          </p>
        </CardBody>
      </Card>
    );
  }

  const toggleProveedor = (idProveedor: number) => {
    const newExpanded = new Set(expandedProveedores);
    if (newExpanded.has(idProveedor)) {
      newExpanded.delete(idProveedor);
    } else {
      newExpanded.add(idProveedor);
    }
    setExpandedProveedores(newExpanded);
  };

  const toggleCategoria = (categoriaKey: string) => {
    const newExpanded = new Set(expandedCategorias);
    if (newExpanded.has(categoriaKey)) {
      newExpanded.delete(categoriaKey);
    } else {
      newExpanded.add(categoriaKey);
    }
    setExpandedCategorias(newExpanded);
  };

  return (
    <div className="space-y-3">
      {resultados.map((resultado) => {
        const isProveedorExpanded = expandedProveedores.has(resultado.idProveedor);
        const totalProductos = resultado.categorias.reduce((sum, cat) => sum + cat.productos.length, 0);

        return (
          <Card key={resultado.idProveedor} className="shadow-sm border border-default-200 dark:border-default-100">
            <CardBody className="p-0">
              {/* Header del Proveedor */}
              <div
                onClick={() => toggleProveedor(resultado.idProveedor)}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-3 cursor-pointer hover:bg-default-50 dark:hover:bg-default-100/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Icon
                    icon={isProveedorExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'}
                    className="text-default-400"
                    width={20}
                  />
                  <div>
                    <h3 className="font-bold text-base text-secondary">
                      {resultado.nombreDistribuidora}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-default-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Icon icon="lucide:user" width={12} />
                        {resultado.nombreProveedor}
                      </span>
                      <span className="text-default-300">•</span>
                      <span className="flex items-center gap-1">
                        <Icon icon="lucide:phone" width={12} />
                        {resultado.telefonoProveedor}
                      </span>
                      <span className="text-default-300">•</span>
                      <span className="flex items-center gap-1">
                        <Icon icon="lucide:mail" width={12} />
                        {resultado.emailProveedor}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Chip color="primary" size="sm" variant="flat">
                    {totalProductos} producto{totalProductos !== 1 ? 's' : ''}
                  </Chip>
                  {resultado.estadoProveedor === 'DISPONIBLE'
                    ? <Chip color="success" size="sm" variant="flat">Disponible</Chip>
                    : <Chip color="danger" size="sm" variant="flat">No Disponible</Chip>
                  }
                </div>
              </div>

              {/* Contenido expandible: Categorías y productos */}
              <AnimatePresence>
                {isProveedorExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-default-100"
                  >
                    <div className="p-4 space-y-3 bg-default-50 dark:bg-default-100/20">
                      {/* Mostrar categorías con productos agrupados */}
                      {resultado.categorias.map((categoria) => {
                        const productosEnCategoria = categoria.productos;
                        const categoriaKey = `${resultado.idProveedor}-${categoria.nombreCategoria}`;
                        const isCategoriaExpanded = expandedCategorias.has(categoriaKey);

                        return (
                          <div key={categoriaKey}>
                            {/* Header de categoría */}
                            <div
                              onClick={() => toggleCategoria(categoriaKey)}
                              className="flex items-center justify-between px-3 py-2 mb-1 bg-default-100 dark:bg-default-100/40 rounded-lg cursor-pointer hover:bg-default-200 dark:hover:bg-default-100/60 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Icon
                                  icon={isCategoriaExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'}
                                  width={18}
                                  className="text-default-500 transition-transform"
                                />
                                <p className="text-xs font-semibold text-default-600 dark:text-default-400 uppercase tracking-wide">
                                  {categoria.nombreCategoria}
                                </p>
                              </div>
                              <span className="text-xs text-default-400">
                                {productosEnCategoria.length}
                              </span>
                            </div>

                            {/* Tabla de productos - igual estructura que vista individual */}
                            {isCategoriaExpanded && (
                              <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
                                <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
                                  <thead className="bg-default-100 dark:bg-default-50">
                                    <tr>
                                      <th className="text-center py-2 px-3 font-medium w-[200px]">Producto</th>
                                      <th className="text-center py-2 px-3 font-medium w-14">Unidad</th>
                                      <th className="text-center py-2 px-3 font-medium w-28">Contenido</th>
                                      <th className="text-center py-2 px-3 font-medium w-24">Marca</th>
                                      <th className="text-center py-2 px-3 font-medium w-24">Precio Neto</th>
                                      <th className="text-center py-2 px-3 font-medium w-24">Precio + IVA</th>
                                      <th className="text-center py-2 px-3 font-medium w-16">Estado</th>
                                      <th className="text-center py-2 px-3 font-medium w-20">Actualizado</th>
                                      <th className="py-2 px-3 font-medium text-center w-16">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {productosEnCategoria.map((prod) => (
                                      <tr
                                        key={prod.idProveedorProducto}
                                        className={`border-t border-default-100 ${
                                          !prod.activo
                                            ? 'bg-default-100/30 dark:bg-default-100/10'
                                            : 'hover:bg-default-100 dark:hover:bg-default-100/30'
                                        }`}
                                      >
                                        <td className="py-2 px-3 text-center">
                                          <Tooltip content={prod.nombreProducto} color="foreground" className="text-xs">
                                            <span className="truncate block whitespace-nowrap">
                                              {prod.nombreProducto}
                                            </span>
                                          </Tooltip>
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          {prod.abreviatura}
                                        </td>
                                        <td className="py-2 px-3 text-center text-default-500">
                                          {prod.formatoContenido || '—'}
                                        </td>
                                        <td className="py-2 px-3 text-center text-default-500">
                                          {prod.marcaProducto || '—'}
                                        </td>
                                        {/* Precio Neto — editable inline */}
                                        <td className="py-2 px-3 text-center">
                                          {editingPrecio?.idProveedorProducto === prod.idProveedorProducto && editingPrecio.campo === 'neto' ? (
                                            <div className="flex items-center gap-1 justify-center">
                                              <Input
                                                size="sm"
                                                value={precioTemp}
                                                onValueChange={onPrecioTempChange}
                                                className="w-28"
                                                classNames={{ inputWrapper: 'h-8 min-h-8' }}
                                                startContent={<span className="text-default-400 text-xs">$</span>}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') onGuardarPrecio();
                                                  if (e.key === 'Escape') onCancelarEditPrecio();
                                                }}
                                                autoFocus
                                              />
                                              <Button isIconOnly size="sm" variant="flat" color="success" isLoading={savingPrecio} onPress={onGuardarPrecio}>
                                                <Icon icon="lucide:check" width={13} />
                                              </Button>
                                              <Button isIconOnly size="sm" variant="light" onPress={onCancelarEditPrecio}>
                                                <Icon icon="lucide:x" width={13} />
                                              </Button>
                                            </div>
                                          ) : editingPrecio?.idProveedorProducto === prod.idProveedorProducto && editingPrecio.campo === 'iva' ? (
                                            <span className="text-default-300">—</span>
                                          ) : (
                                            <span
                                              className={`cursor-pointer hover:text-primary transition-colors ${canEdit ? 'underline decoration-dotted' : ''}`}
                                              title={canEdit ? 'Clic para editar precio neto' : undefined}
                                              onClick={() => canEdit && onIniciarEditPrecio(prod.idProveedorProducto, prod.precioNeto, 'neto')}
                                            >
                                              {formatPrecio(prod.precioNeto)}
                                            </span>
                                          )}
                                        </td>
                                        {/* Precio + IVA — editable inline */}
                                        <td className="py-2 px-3 text-center">
                                          {editingPrecio?.idProveedorProducto === prod.idProveedorProducto && editingPrecio.campo === 'iva' ? (
                                            <div className="flex items-center gap-1 justify-center">
                                              <Input
                                                size="sm"
                                                value={precioTemp}
                                                onValueChange={onPrecioTempChange}
                                                className="w-28"
                                                classNames={{ inputWrapper: 'h-8 min-h-8' }}
                                                startContent={<span className="text-default-400 text-xs">$</span>}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') onGuardarPrecio();
                                                  if (e.key === 'Escape') onCancelarEditPrecio();
                                                }}
                                                autoFocus
                                              />
                                              <Button isIconOnly size="sm" variant="flat" color="success" isLoading={savingPrecio} onPress={onGuardarPrecio}>
                                                <Icon icon="lucide:check" width={13} />
                                              </Button>
                                              <Button isIconOnly size="sm" variant="light" onPress={onCancelarEditPrecio}>
                                                <Icon icon="lucide:x" width={13} />
                                              </Button>
                                            </div>
                                          ) : editingPrecio?.idProveedorProducto === prod.idProveedorProducto && editingPrecio.campo === 'neto' ? (
                                            <span className="text-default-300">—</span>
                                          ) : (
                                            <span
                                              className={`cursor-pointer hover:text-primary transition-colors ${canEdit ? 'underline decoration-dotted' : ''}`}
                                              title={canEdit ? 'Clic para editar precio con IVA' : undefined}
                                              onClick={() => canEdit && onIniciarEditPrecio(prod.idProveedorProducto, prod.precioConIva, 'iva')}
                                            >
                                              {formatPrecio(prod.precioConIva)}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <Chip
                                            size="sm"
                                            variant="flat"
                                            color={prod.activo ? 'success' : 'default'}
                                          >
                                            {prod.activo ? 'Activo' : 'Inactivo'}
                                          </Chip>
                                        </td>
                                        <td className="py-2 px-3 text-center text-xs text-default-500">
                                          {prod.fechaActualizacion
                                            ? new Date(prod.fechaActualizacion).toLocaleDateString('es-CL')
                                            : '—'}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <Tooltip content={prod.activo ? 'Deshabilitar producto' : 'Habilitar producto'}>
                                            <Button
                                              isIconOnly
                                              size="sm"
                                              variant="light"
                                              onPress={() =>
                                                prod.activo
                                                  ? onQuitarProducto(resultado.idProveedor, prod)
                                                  : onToggleProducto(resultado.idProveedor, prod)
                                              }
                                              className={prod.activo ? 'text-success hover:text-danger' : 'text-warning hover:text-success'}
                                            >
                                              <Icon
                                                icon={prod.activo ? 'lucide:check-circle-2' : 'lucide:circle-x'}
                                                width={18}
                                              />
                                            </Button>
                                          </Tooltip>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
};

// ── Sub-componente: formulario crear/editar/ver proveedor ─────────────────────

interface FormularioProveedorProps {
  proveedor: IProveedor | null;
  mode: 'crear' | 'editar' | 'ver';
  onClose: () => void;
  onSave: (dto: IProveedorCreateDTO | IProveedorUpdateDTO) => Promise<void>;
}

const FormularioProveedor: React.FC<FormularioProveedorProps> = ({
  proveedor,
  mode,
  onClose,
  onSave,
}) => {
  const [nombreDistribuidora, setNombreDistribuidora] = React.useState(proveedor?.nombreDistribuidora || '');
  const [nombreProveedor, setNombreProveedor] = React.useState(proveedor?.nombreProveedor || '');
  const [telefonoProveedor, setTelefonoProveedor] = React.useState(proveedor?.telefonoProveedor || '');
  const [emailProveedor, setEmailProveedor] = React.useState(proveedor?.emailProveedor || '');
  const [direccionProveedor, setDireccionProveedor] = React.useState((proveedor as any)?.direccionProveedor || '');
  const [rutProveedor, setRutProveedor] = React.useState(proveedor?.rutProveedor || '');
  const [estadoProveedor, setEstadoProveedor] = React.useState<EstadoProveedor>(
    proveedor?.estadoProveedor || 'DISPONIBLE'
  );
  const [diasEntrega, setDiasEntrega] = React.useState<IDiaEntregaDTO[]>([]);
  const [diaSeleccionado, setDiaSeleccionado] = React.useState<DiaSemana>('LUNES');
  const [horaInicio, setHoraInicio] = React.useState('');
  const [horaFin, setHoraFin] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // ── Modal reemplazar día de entrega ──
  const [isReemplazarModal, setIsReemplazarModal] = React.useState(false);
  const [diaReemplazar, setDiaReemplazar] = React.useState<IDiaEntregaDTO | null>(null);

  const isReadOnly = mode === 'ver';

  React.useEffect(() => {
    if (proveedor && (mode === 'editar' || mode === 'ver')) {
      const prov = proveedor as any;
      if (prov.diasEntrega && Array.isArray(prov.diasEntrega)) {
        const diasConvertidos = prov.diasEntrega.map((dia: any) => ({
          diaSemana: dia.diaSemana,
          horaInicio: dia.horaInicioEntrega ? dia.horaInicioEntrega.slice(0, 5) : undefined,
          horaFin: dia.horaFinEntrega ? dia.horaFinEntrega.slice(0, 5) : undefined,
        }));
        setDiasEntrega(diasConvertidos);
      }
    }
  }, [proveedor, mode]);

  const handleSubmit = async () => {
    setError(null);

    if (!rutProveedor.trim()) {
      setError('El RUT del proveedor es obligatorio');
      return;
    }
    if (!nombreDistribuidora.trim()) {
      setError('El nombre de la distribuidora es obligatorio');
      return;
    }
    if (!nombreProveedor.trim()) {
      setError('El nombre del contacto es obligatorio');
      return;
    }
    if (!telefonoProveedor.trim()) {
      setError('El teléfono es obligatorio');
      return;
    }
    if (!emailProveedor.trim()) {
      setError('El email del proveedor es obligatorio');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailProveedor)) {
      setError('El email no tiene un formato válido');
      return;
    }

    const dto: IProveedorCreateDTO = {
      rutProveedor: rutProveedor.trim(),
      nombreDistribuidora: nombreDistribuidora.trim(),
      nombreProveedor: nombreProveedor.trim(),
      telefonoProveedor: telefonoProveedor.trim(),
      emailProveedor: emailProveedor.trim(),
      direccionProveedor: direccionProveedor.trim() ? direccionProveedor.trim() : undefined,
      estadoProveedor,
      diasEntrega: diasEntrega.length > 0 ? diasEntrega : undefined,
    };

    setSaving(true);
    try {
      await onSave(dto);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  const agregarDiaEntrega = () => {
    if (!diaSeleccionado) {
      setError('Selecciona un día de la semana');
      return;
    }

    // Validar horas si se proporcionan
    if (horaInicio && horaFin) {
      if (horaInicio >= horaFin) {
        setError('La hora de inicio debe ser menor a la hora de fin');
        return;
      }
    }

    const nuevoDia: IDiaEntregaDTO = {
      diaSemana: diaSeleccionado,
      horaInicio: horaInicio || undefined,
      horaFin: horaFin || undefined,
    };

    // Validar que no exista duplicado
    const diaExistente = diasEntrega.find(d => d.diaSemana === diaSeleccionado);
    if (diaExistente) {
      setDiaReemplazar(nuevoDia);
      setIsReemplazarModal(true);
      return;
    }

    setDiasEntrega([...diasEntrega, nuevoDia]);
    setHoraInicio('');
    setHoraFin('');
    setError(null);
  };

  const confirmarReemplazarDia = () => {
    if (!diaReemplazar) return;

    setDiasEntrega(
      diasEntrega.map(d =>
        d.diaSemana === diaReemplazar.diaSemana ? diaReemplazar : d
      )
    );
    setHoraInicio('');
    setHoraFin('');
    setError(null);
    setIsReemplazarModal(false);
    setDiaReemplazar(null);
  };

  const eliminarDiaEntrega = (index: number) => {
    setDiasEntrega(diasEntrega.filter((_, i) => i !== index));
  };

  return (
    <>
      <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-secondary/10 to-secondary/5 dark:from-secondary/20 dark:to-secondary/10 px-6 py-4">
        <div className="flex items-center gap-3 w-full">
          <div className={`p-2 rounded-lg ${mode === 'crear' ? 'bg-success/20' : mode === 'editar' ? 'bg-warning/20' : 'bg-secondary/20'}`}>
            <Icon
              icon={
                mode === 'crear'
                  ? 'lucide:plus-circle'
                  : mode === 'editar'
                  ? 'lucide:edit-3'
                  : 'lucide:building-2'
              }
              className={mode === 'crear' ? 'text-success' : mode === 'editar' ? 'text-warning' : 'text-secondary'}
              width={20}
            />
          </div>
          <span className="font-bold text-lg text-secondary dark:text-foreground">
            {mode === 'crear'
              ? 'Nuevo Proveedor'
              : mode === 'editar'
              ? 'Editar Proveedor'
              : 'Detalle del Proveedor'}
          </span>
        </div>
      </ModalHeader>

      <ModalBody className="gap-3 py-4">
        {error && (
          <div className="flex items-center gap-2 bg-danger-50 dark:bg-danger-50/10 text-danger text-sm p-3 rounded-lg">
            <Icon icon="lucide:alert-circle" width={16} />
            {error}
          </div>
        )}

        <div className="space-y-1">
          <Input
            label="Nombre Distribuidora"
            placeholder="Ej: Distribuidora Central S.A."
            value={nombreDistribuidora}
            onValueChange={(val) => setNombreDistribuidora(val.slice(0, 100))}
            isReadOnly={isReadOnly}
            variant="bordered"
            isRequired={!isReadOnly}
            maxLength={100}
          />
          <p className="text-xs text-default-400 text-right">{nombreDistribuidora.length}/100</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Input
              label="Nombre Contacto"
              placeholder="Ej: Juan Pérez"
              value={nombreProveedor}
              onValueChange={(val) => setNombreProveedor(val.slice(0, 100))}
              isReadOnly={isReadOnly}
              variant="bordered"
              isRequired={!isReadOnly}
              maxLength={100}
            />
            <p className="text-xs text-default-400 text-right">{nombreProveedor.length}/100</p>
          </div>
          <div className="space-y-1">
            <Input
              label="Teléfono"
              placeholder="Ej: +56 9 1234 5678"
              value={telefonoProveedor}
              onValueChange={(val) => setTelefonoProveedor(val.slice(0, 20))}
              isReadOnly={isReadOnly}
              variant="bordered"
              isRequired={!isReadOnly}
              maxLength={20}
            />
            <p className="text-xs text-default-400 text-right">{telefonoProveedor.length}/20</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Input
              label="RUT"
              placeholder="Ej: 12.345.678-9"
              value={rutProveedor}
              onValueChange={(val) => setRutProveedor(val.slice(0, 13))}
              isReadOnly={isReadOnly}
              variant="bordered"
              maxLength={13}
              isRequired={!isReadOnly}
            />
            <p className="text-xs text-default-400 text-right">{rutProveedor.length}/13</p>
          </div>
          <div className="space-y-1">
            <Input
              label="Email"
              placeholder="Ej: contacto@empresa.cl"
              value={emailProveedor}
              onValueChange={(val) => setEmailProveedor(val.slice(0, 150))}
              isReadOnly={isReadOnly}
              isRequired={!isReadOnly}
              variant="bordered"
              type="email"
              maxLength={150}
            />
            <p className="text-xs text-default-400 text-right">{emailProveedor.length}/150</p>
          </div>
        </div>

        <div className="space-y-1">
          <Input
            label="Dirección (opcional)"
            placeholder="Ej: Av. Vicuña Mackenna 4860, Macul"
            value={direccionProveedor}
            onValueChange={(val) => setDireccionProveedor(val.slice(0, 255))}
            isReadOnly={isReadOnly}
            variant="bordered"
            maxLength={255}
            description="Se mostrará en la cabecera del Excel generado para este proveedor."
          />
          <p className="text-xs text-default-400 text-right">{direccionProveedor.length}/255</p>
        </div>

        {!isReadOnly ? (
          <>
            <Select
              label="Estado"
              selectedKeys={new Set([estadoProveedor])}
              onSelectionChange={(keys) => {
                const val = Array.from(keys)[0] as EstadoProveedor;
                if (val) setEstadoProveedor(val);
              }}
              variant="bordered"
              isRequired
            >
              <SelectItem key="DISPONIBLE" textValue="Disponible">Disponible</SelectItem>
              <SelectItem key="NO_DISPONIBLE" textValue="No Disponible">No Disponible</SelectItem>
            </Select>
            {estadoProveedor === 'NO_DISPONIBLE' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning-50 dark:bg-warning-50/20 border border-warning-200 dark:border-warning-300">
                <Icon icon="lucide:alert-triangle" width={16} className="text-warning flex-shrink-0 mt-0.5" />
                <div className="text-xs text-warning-700 dark:text-warning-300">
                  Los proveedores marcados como <strong>No Disponible</strong> no entrarán en las cotizaciones.
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-default-500">Estado</span>
            {renderEstado(estadoProveedor)}
          </div>
        )}

        {/* Selector de Días de Entrega */}
        {!isReadOnly && (
          <div className="border-t border-default-200 dark:border-default-100 pt-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="lucide:calendar" width={16} className="text-primary" />
              <span className="text-sm font-semibold text-secondary dark:text-foreground">
                Días de Entrega
              </span>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-info-50 dark:bg-info-50/20 border border-info-200 dark:border-info-300">
              <Icon icon="lucide:info" width={16} className="text-info flex-shrink-0 mt-0.5" />
              <div className="text-xs text-default-600 dark:text-default-400">
                Los días de entrega se utilizan para dividir los pedidos por día de la semana y preparar la llegada de abastecimiento. Si no especifica horarios, se asumirá disponibilidad de 08:00 a 20:00.
              </div>
            </div>

            {/* Selector de día */}
            <div className="space-y-2">
              <Select
                label="Día de semana"
                selectedKeys={new Set([diaSeleccionado])}
                onSelectionChange={(keys) => {
                  setDiaSeleccionado(Array.from(keys)[0] as DiaSemana);
                }}
                variant="bordered"
                size="sm"
              >
                {DIAS_SEMANA_OPTIONS.map((d) => (
                  <SelectItem key={d.value} textValue={d.label}>
                    {d.label}
                  </SelectItem>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Hora inicio (HH:mm)"
                  placeholder="08:00"
                  value={horaInicio}
                  onValueChange={setHoraInicio}
                  variant="bordered"
                  size="sm"
                  type="time"
                />

                <Input
                  label="Hora fin (HH:mm)"
                  placeholder="17:00"
                  value={horaFin}
                  onValueChange={setHoraFin}
                  variant="bordered"
                  size="sm"
                  type="time"
                />
              </div>
            </div>

            <Button
              size="sm"
              variant="bordered"
              color="primary"
              onPress={agregarDiaEntrega}
              startContent={<Icon icon="lucide:plus" width={14} />}
              className="w-full md:w-auto"
            >
              Agregar Día
            </Button>

            {/* Lista de días agregados */}
            {diasEntrega.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {diasEntrega.map((dia, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-primary-50 dark:bg-primary-50/20 border border-primary-200 dark:border-primary-300"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Chip
                        size="sm"
                        color="primary"
                        variant="flat"
                        className="flex-shrink-0"
                      >
                        {DIAS_SEMANA_OPTIONS.find(d => d.value === dia.diaSemana)?.label}
                      </Chip>
                      {dia.horaInicio && dia.horaFin ? (
                        <span className="text-xs text-default-600 truncate">
                          {dia.horaInicio.slice(0, 5)} – {dia.horaFin.slice(0, 5)}
                        </span>
                      ) : (
                        <span className="text-xs text-default-600">
                          08:00 – 20:00
                        </span>
                      )}
                    </div>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => eliminarDiaEntrega(idx)}
                      className="flex-shrink-0 cursor-pointer"
                    >
                      <Icon icon="lucide:x" width={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Visualizar Días de Entrega (modo ver) */}
        {isReadOnly && proveedor && (
          <div className="border-t border-default-200 dark:border-default-100 pt-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="lucide:calendar" width={16} className="text-primary" />
              <span className="text-sm font-semibold text-secondary dark:text-foreground">
                Días de Entrega
              </span>
            </div>

            {proveedor.diasEntrega && proveedor.diasEntrega.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {proveedor.diasEntrega.map((dia) => (
                  <div
                    key={dia.idDiaEntrega}
                    className="flex items-center gap-3 p-3 rounded-lg bg-primary-50 dark:bg-primary-50/20 border border-primary-200 dark:border-primary-300"
                  >
                    <Chip
                      size="sm"
                      color="primary"
                      variant="flat"
                    >
                      {DIAS_SEMANA_OPTIONS.find(d => d.value === dia.diaSemana)?.label}
                    </Chip>
                    {dia.horaInicioEntrega && dia.horaFinEntrega ? (
                      <span className="text-sm text-default-600">
                        {dia.horaInicioEntrega.slice(0, 5)} – {dia.horaFinEntrega.slice(0, 5)}
                      </span>
                    ) : (
                      <span className="text-sm text-default-400 italic">
                        Disponibilidad todo el día
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-default-400 italic">
                No hay días de entrega configurados
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
        <Button variant="ghost" onPress={onClose} className="font-medium">
          {isReadOnly ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!isReadOnly && (
          <Button
            color="primary"
            variant="solid"
            onPress={handleSubmit}
            isLoading={saving}
            className="font-bold text-secondary shadow-md cursor-pointer"
            startContent={!saving && <Icon icon={mode === 'crear' ? 'lucide:plus' : 'lucide:save'} width={16} />}
            size="lg"
          >
            {mode === 'crear' ? 'Crear Proveedor' : 'Guardar Cambios'}
          </Button>
        )}
      </ModalFooter>

      {/* Modal confirmar reemplazar día de entrega */}
      <Modal isOpen={isReemplazarModal} onOpenChange={setIsReemplazarModal} size="sm" radius="lg" classNames={{ base: 'rounded-2xl' }}>
        <ModalContent className="rounded-2xl overflow-hidden">
          <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-warning/10 to-warning/5 dark:from-warning/20 dark:to-warning/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/20 rounded-lg">
                <Icon icon="lucide:alert-triangle" className="text-warning" width={20} />
              </div>
              <span className="font-bold text-lg text-secondary dark:text-foreground">
                Reemplazar Día de Entrega
              </span>
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              El día <strong>{diaReemplazar && DIAS_SEMANA_OPTIONS.find(d => d.value === diaReemplazar.diaSemana)?.label}</strong> ya tiene configurado un horario de entrega.
              ¿Deseas reemplazarlo con los nuevos horarios?
            </p>
          </ModalBody>
          <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
            <Button variant="ghost" onPress={() => setIsReemplazarModal(false)} className="font-medium">
              Cancelar
            </Button>
            <Button
              color="warning"
              variant="solid"
              onPress={confirmarReemplazarDia}
              className="font-bold shadow-md cursor-pointer"
              startContent={<Icon icon="lucide:replace" width={16} />}
            >
              Reemplazar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

// ── Sub-componente: formulario asignar producto ───────────────────────────────

interface FormularioAsignarProductoProps {
  productos: IProductoDisponibleDTO[];
  idProveedor: number;
  onClose: () => void;
  onSave: (dto: IProveedorProductoAddDTO) => Promise<void | boolean>;
}

const IVA_TASA = 1.19;

const FormularioAsignarProducto: React.FC<FormularioAsignarProductoProps> = ({
  productos: productosInicial,
  idProveedor,
  onClose,
  onSave,
}) => {
  const [searchProd, setSearchProd] = React.useState('');
  const [selectedProducto, setSelectedProducto] = React.useState<IProductoDisponibleDTO | null>(null);
  const [marcaProducto, setMarcaProducto] = React.useState('');
  const [formatoContenido, setFormatoContenido] = React.useState('');
  const [precioNeto, setPrecioNeto] = React.useState('');
  const [precioConIva, setPrecioConIva] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Cálculo automático: al salir de Precio Neto, completar Precio + IVA si está vacío
  const handlePrecioNetoBlur = () => {
    const neto = parseChileanPrice(precioNeto);
    if (!isNaN(neto) && neto > 0 && !precioConIva.trim()) {
      setPrecioConIva(formatChileanPrice(neto * IVA_TASA));
    }
  };

  // Cálculo automático: al salir de Precio + IVA, completar Precio Neto si está vacío
  const handlePrecioConIvaBlur = () => {
    const conIva = parseChileanPrice(precioConIva);
    if (!isNaN(conIva) && conIva > 0 && !precioNeto.trim()) {
      setPrecioNeto(formatChileanPrice(conIva / IVA_TASA));
    }
  };
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<Set<string>>(new Set());
  const [loadingProductos, setLoadingProductos] = React.useState(false);
  const [productos, setProductos] = React.useState<IProductoDisponibleDTO[]>(productosInicial || []);
  const [categorias, setCategorias] = React.useState<Array<{ id: string; nombre: string }>>([
    { id: 'todas', nombre: 'Todas las categorías' },
  ]);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Cargar categorías activas del backend al montar el componente
  React.useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const cats = await obtenerCategoriasActivasJsonService();
        const categoriasFormato = cats.map(c => ({ id: c.id.toString(), nombre: c.nombre }));
        setCategorias([{ id: 'todas', nombre: 'Todas las categorías' }, ...categoriasFormato]);
      } catch {
        // Mantener categorías por defecto si hay error
      }
    };
    cargarCategorias();
  }, []);

  // Manejar cambio de múltiples categorías y filtrar
  const handleCategoryChange = React.useCallback(async (keys: any) => {
    const newSelectedIds = new Set(
      Array.from(keys).filter((key: string) => key !== 'todas') as string[]
    );
    setSelectedCategoryIds(newSelectedIds);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Si no hay categorías seleccionadas, mostrar todos los productos
    if (newSelectedIds.size === 0) {
      setLoadingProductos(true);
      try {
        const data = await obtenerProductosDisponiblesService(idProveedor);
        setProductos(data);
      } catch {
        // Mantener los productos anteriores si hay error
      } finally {
        setLoadingProductos(false);
      }
      return;
    }

    // Con debounce de 2 segundos para múltiples selecciones
    debounceRef.current = setTimeout(async () => {
      setLoadingProductos(true);
      try {
        // Obtener productos para la primera categoría seleccionada
        // (el backend filtra por una sola categoría)
        const firstCategoryId = Array.from(newSelectedIds)[0];
        const idCat = parseInt(firstCategoryId, 10);
        const data = await obtenerProductosDisponiblesService(idProveedor, idCat as any);
        setProductos(data);
      } catch {
        // Mantener los productos anteriores si hay error
      } finally {
        setLoadingProductos(false);
      }
    }, 2000);
  }, [idProveedor]);

  const productosFiltrados = React.useMemo(() => {
    let filtered = productos;

    // Filtrar por búsqueda
    if (searchProd.trim()) {
      const term = searchProd.toLowerCase();
      filtered = filtered.filter((p) => p.nombreProducto.toLowerCase().includes(term));
    }

    return filtered;
  }, [searchProd, productos]);

  const handleSubmit = async () => {
    setError(null);
    if (!selectedProducto) {
      setError('Selecciona un producto');
      return;
    }
    if (!precioNeto.trim() && !precioConIva.trim()) {
      setError('Ingresa al menos uno de los precios: Precio Neto o Precio + IVA');
      return;
    }
    setSaving(true);
    try {
      const dto: IProveedorProductoAddDTO = {
        idProducto: selectedProducto.idProducto,
        marcaProducto: marcaProducto.trim() || undefined,
        formatoContenido: formatoContenido.trim() || undefined,
        precioNeto: precioNeto.trim() || undefined,
        precioConIva: precioConIva.trim() || undefined,
      };
      await onSave(dto);
      setSelectedProducto(null);
      setMarcaProducto('');
      setFormatoContenido('');
      setPrecioNeto('');
      setPrecioConIva('');
      setSearchProd('');
    } catch (err: any) {
      setError(err.message || 'Error al asignar el producto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ModalHeader className="border-b border-default-100 bg-success-50 dark:bg-success-50/10">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:package-plus" className="text-success" width={20} />
          <span className="font-bold text-success dark:text-foreground">Asignar Producto</span>
        </div>
      </ModalHeader>

      <ModalBody className="gap-3 py-4">
        {error && (
          <div className="flex items-center gap-2 bg-danger-50 dark:bg-danger-50/10 text-danger text-sm p-3 rounded-lg">
            <Icon icon="lucide:alert-circle" width={16} />
            {error}
          </div>
        )}

        <Input
          label="Buscar producto"
          placeholder="Nombre o código..."
          value={searchProd}
          onValueChange={setSearchProd}
          startContent={<Icon icon="lucide:search" className="text-default-400" width={15} />}
          variant="bordered"
          isClearable
          onClear={() => setSearchProd('')}
        />

        {/* Selector de Categorías (Múltiples) */}
        <Select
          label="Categorías"
          placeholder="Seleccione una o más categorías..."
          selectedKeys={selectedCategoryIds}
          onSelectionChange={handleCategoryChange}
          variant="bordered"
          selectionMode="multiple"
          closeOnSelect={false}
          isDisabled={loadingProductos}
          startContent={<Icon icon="lucide:tag" className="text-default-400" width={16} />}
          endContent={loadingProductos && <Spinner size="sm" color="warning" />}
          description={selectedCategoryIds.size > 0 ? `${selectedCategoryIds.size} categoría(s) seleccionada(s)` : undefined}
        >
          {categorias.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.nombre}
            </SelectItem>
          ))}
        </Select>

        {/* Lista de productos */}
        <div className="max-h-52 overflow-y-auto border border-default-200 rounded-lg divide-y divide-default-100">
          {loadingProductos ? (
            <div className="flex justify-center items-center py-8">
              <Spinner size="sm" color="warning" label="Cargando productos..." />
            </div>
          ) : productosFiltrados.length === 0 ? (
            <p className="text-xs text-default-400 text-center py-6">Sin resultados</p>
          ) : (
            productosFiltrados.map((p) => (
              <button
                key={p.idProducto}
                type="button"
                onClick={() => setSelectedProducto(p)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-primary-50 dark:hover:bg-primary-50/10 transition-colors ${
                  selectedProducto?.idProducto === p.idProducto
                    ? 'bg-primary-100 dark:bg-primary-100/20 font-semibold'
                    : ''
                }`}
              >
                <span className="font-medium">{p.nombreProducto}</span>
                <span className="text-default-400 ml-1">— {p.abreviatura}</span>
              </button>
            ))
          )}
        </div>

        {selectedProducto && (
          <div className="bg-primary-50 dark:bg-primary-50/10 rounded-lg px-3 py-2 text-xs text-primary-700 dark:text-primary-300 flex items-center gap-2">
            <Icon icon="lucide:check-circle" width={14} />
            Seleccionado: <strong>{selectedProducto.nombreProducto}</strong>
          </div>
        )}

        <Input
          label="Marca"
          placeholder="Sin marca"
          value={marcaProducto}
          onValueChange={setMarcaProducto}
          variant="bordered"
          type="text"
        />

        <Input
          label="Formato / Contenido"
          placeholder="Ej: 1 kg, 500 ml, 6 un."
          value={formatoContenido}
          onValueChange={setFormatoContenido}
          variant="bordered"
          type="text"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Precio Neto"
            placeholder="Ej: 1.234"
            value={precioNeto}
            onValueChange={(value) => setPrecioNeto(smartPriceInput(value))}
            onBlur={handlePrecioNetoBlur}
            variant="bordered"
            type="text"
            startContent={<span className="text-default-400 text-sm">$</span>}
            description="IVA 19 % aplicado automáticamente"
          />
          <Input
            label="Precio + IVA"
            placeholder="Ej: 1.468,46"
            value={precioConIva}
            onValueChange={(value) => setPrecioConIva(smartPriceInput(value))}
            onBlur={handlePrecioConIvaBlur}
            variant="bordered"
            type="text"
            startContent={<span className="text-default-400 text-sm">$</span>}
            description="Neto derivado automáticamente"
          />
        </div>
      </ModalBody>

      <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
        <Button variant="ghost" onPress={onClose} className="font-medium">
          Cancelar
        </Button>
        <Button
          color="success"
          variant="solid"
          onPress={handleSubmit}
          isLoading={saving}
          startContent={!saving && <Icon icon="lucide:plus" width={16} />}
          className="font-bold text-secondary shadow-md cursor-pointer"
          size="lg"
        >
          Asignar Producto
        </Button>
      </ModalFooter>
    </>
  );
};

// ── Función de exportación Excel (estándar EXCEL.MD) ──────────────────────────

const exportarCotizacionExcel = (
  data: ICotizacionResponse,
  dateRange: { start: CalendarDate; end: CalendarDate }
) => {
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

// ── Sub-componente: Modal de Cotización por Rango ─────────────────────────────

interface CotizacionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: { start: CalendarDate; end: CalendarDate } | null;
  onDateRangeChange: (val: { start: CalendarDate; end: CalendarDate } | null) => void;
  cotizacionData: ICotizacionResponse | null;
  loading: boolean;
  error: string | null;
  onConsultar: () => void;
  onExportExcel: () => void;
}

const CotizacionModal: React.FC<CotizacionModalProps> = ({
  isOpen,
  onOpenChange,
  dateRange,
  onDateRangeChange,
  cotizacionData,
  loading,
  error,
  onConsultar,
  onExportExcel,
}) => {
  const proveedoresConId = cotizacionData?.cotizacion.filter(p => p.idProveedor !== null) ?? [];
  const proveedoresSinId = cotizacionData?.cotizacion.filter(p => p.idProveedor === null) ?? [];

  const calcularTotalProveedor = (prov: ICotizacionProveedor): number => {
    let total = 0;
    for (const cat of prov.categorias) {
      for (const prod of cat.productos) {
        if (prod.subtotal !== null) total += prod.subtotal;
      }
    }
    return total;
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl" scrollBehavior="inside" radius="lg" classNames={{ base: 'rounded-2xl' }}>
      <ModalContent className="rounded-2xl overflow-hidden">
        {(onClose) => (
          <>
            <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 px-6 py-4">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Icon icon="lucide:file-spreadsheet" className="text-primary" width={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-lg text-secondary dark:text-foreground">
                    Cotización por Rango
                  </span>
                  <span className="text-xs text-default-500">Agrupe productos por proveedor (menor precio)</span>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="gap-6 py-6">
              {/* Selector de rango */}
              <div className="flex flex-col sm:flex-row gap-3 items-end bg-default-50 dark:bg-default-100/20 rounded-xl p-4 border border-default-200 dark:border-default-100">
                <div className="flex-1">
                  <DateRangePicker
                    label="Seleccione rango de fechas"
                    variant="bordered"
                    value={dateRange}
                    onChange={onDateRangeChange}
                    className="w-full"
                  />
                </div>
                <Button
                  color="primary"
                  variant="solid"
                  className="font-bold text-secondary shadow-md cursor-pointer min-w-fit"
                  startContent={<Icon icon="lucide:search" width={18} />}
                  isLoading={loading}
                  isDisabled={!dateRange}
                  onPress={onConsultar}
                  size="lg"
                >
                  Consultar
                </Button>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 bg-danger-50 dark:bg-danger-50/10 border border-danger/30 text-danger text-sm p-4 rounded-xl">
                  <Icon icon="lucide:alert-circle" width={18} className="mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">Error en la consulta</p>
                    <p className="text-xs text-danger/80 dark:text-danger/70 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="flex justify-center py-10">
                  <Spinner size="lg" color="primary" label="Consultando cotización..." />
                </div>
              )}

              {/* Resultados */}
              {!loading && cotizacionData && (
                <div className="space-y-4">
                  {cotizacionData.cotizacion.length === 0 ? (
                    <div className="text-center py-10 text-default-400">
                      <Icon icon="lucide:inbox" width={40} className="mx-auto mb-2" />
                      <p>No hay productos solicitados en el rango seleccionado.</p>
                    </div>
                  ) : (
                    <>
                      {/* Proveedores con datos */}
                      {proveedoresConId.map((prov) => {
                        const totalProv = calcularTotalProveedor(prov);
                        return (
                          <Card
                            key={prov.idProveedor}
                            className="shadow-sm border border-default-200 dark:border-default-100"
                          >
                            <CardBody className="p-0">
                              {/* Header proveedor */}
                              <div className="bg-primary-50 dark:bg-primary-50/10 px-4 py-3 border-b border-default-100">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div>
                                    <h4 className="font-bold text-base text-secondary dark:text-foreground">
                                      {prov.nombreDistribuidora}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-default-500 mt-0.5">
                                      <span className="flex items-center gap-1">
                                        <Icon icon="lucide:user" width={12} />
                                        {prov.nombreProveedor ?? '—'}
                                      </span>
                                      {prov.telefono && (
                                        <>
                                          <span className="text-default-300">•</span>
                                          <span className="flex items-center gap-1">
                                            <Icon icon="lucide:phone" width={12} />
                                            {prov.telefono}
                                          </span>
                                        </>
                                      )}
                                      {prov.email && (
                                        <>
                                          <span className="text-default-300">•</span>
                                          <span className="flex items-center gap-1">
                                            <Icon icon="lucide:mail" width={12} />
                                            {prov.email}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Chip color="primary" size="sm" variant="flat">
                                      {prov.totalProductos} producto{prov.totalProductos !== 1 ? 's' : ''}
                                    </Chip>
                                    <Chip color="success" size="sm" variant="flat" className="font-bold">
                                      Total: ${fmtN(totalProv)}
                                    </Chip>
                                  </div>
                                </div>
                              </div>

                              {/* Tabla de productos */}
                              <div className="px-4 py-3">
                                {prov.categorias.map((cat) => (
                                  <div key={cat.idCategoria} className="mb-3 last:mb-0">
                                    <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-1">
                                      {cat.nombreCategoria}
                                    </p>
                                    <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
                                      <table className="w-full text-xs table-fixed">
                                        <colgroup>
                                          <col style={{ width: '40%' }} />
                                          <col style={{ width: '12%' }} />
                                          <col style={{ width: '15%' }} />
                                          <col style={{ width: '15%' }} />
                                          <col style={{ width: '18%' }} />
                                        </colgroup>
                                        <thead className="bg-default-100 dark:bg-default-50">
                                          <tr>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Producto</th>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Unidad</th>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Cantidad</th>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Precio Unit.</th>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {cat.productos.map((prod) => (
                                            <tr
                                              key={prod.idProducto}
                                              className="border-t border-default-100 dark:border-default-50 hover:bg-default-50 dark:hover:bg-default-100/20"
                                            >
                                              <td className="py-2 px-3 font-medium text-center overflow-hidden">
                                                <Tooltip content={prod.nombreProducto} color="default">
                                                  <span className="truncate">{prod.nombreProducto}</span>
                                                </Tooltip>
                                              </td>
                                              <td className="py-2 px-3 text-center text-default-500 overflow-hidden">
                                                <Tooltip content={prod.abreviatura} color="default">
                                                  <span className="truncate">{prod.abreviatura}</span>
                                                </Tooltip>
                                              </td>
                                              <td className="py-2 px-3 text-center overflow-hidden">{fmtN(prod.cantidadTotal)}</td>
                                              <td className="py-2 px-3 text-center overflow-hidden">
                                                {prod.precioUnitario !== null ? `$${fmtN(prod.precioUnitario)}` : '—'}
                                              </td>
                                              <td className="py-2 px-3 text-center font-semibold overflow-hidden">
                                                {prod.subtotal !== null ? `$${fmtN(prod.subtotal)}` : '—'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardBody>
                          </Card>
                        );
                      })}

                      {/* Productos sin proveedor */}
                      {proveedoresSinId.length > 0 && proveedoresSinId.map((sinProv, idx) => (
                        <Card
                          key={`sin-prov-${idx}`}
                          className="shadow-sm border-2 border-danger-200 dark:border-danger-300"
                        >
                          <CardBody className="p-0">
                            <div className="bg-danger-50 dark:bg-danger-50/10 px-4 py-3 border-b border-danger-200">
                              <div className="flex items-center gap-2">
                                <Icon icon="lucide:alert-triangle" className="text-danger" width={20} />
                                <h4 className="font-bold text-base text-danger">
                                  Productos Sin Proveedor
                                </h4>
                                <Chip color="danger" size="sm" variant="flat">
                                  {sinProv.totalProductos} producto{sinProv.totalProductos !== 1 ? 's' : ''}
                                </Chip>
                              </div>
                              <p className="text-xs text-danger-400 mt-1">
                                Estos productos no tienen un proveedor asignado. No hay precio asociado.
                              </p>
                            </div>

                            <div className="px-4 py-3">
                              {sinProv.categorias.map((cat) => (
                                <div key={cat.idCategoria} className="mb-3 last:mb-0">
                                  <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-1">
                                    {cat.nombreCategoria}
                                  </p>
                                  <div className="overflow-x-auto rounded-lg border border-danger-100 dark:border-danger-200">
                                    <table className="w-full text-xs table-fixed">
                                      <colgroup>
                                        <col style={{ width: '40%' }} />
                                        <col style={{ width: '12%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '18%' }} />
                                      </colgroup>
                                      <thead className="bg-danger-50/50 dark:bg-danger-50/10">
                                        <tr>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Producto</th>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Unidad</th>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Cantidad</th>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Precio Unit.</th>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Subtotal</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {cat.productos.map((prod) => (
                                          <tr
                                            key={prod.idProducto}
                                            className="border-t border-danger-50 dark:border-danger-100 hover:bg-danger-50/30"
                                          >
                                            <td className="py-2 px-3 font-medium text-center overflow-hidden">
                                              <Tooltip content={prod.nombreProducto} color="default">
                                                <span className="truncate">{prod.nombreProducto}</span>
                                              </Tooltip>
                                            </td>
                                            <td className="py-2 px-3 text-center text-default-500 overflow-hidden">{prod.abreviatura}</td>
                                            <td className="py-2 px-3 text-center overflow-hidden">{fmtN(prod.cantidadTotal)}</td>
                                            <td className="py-2 px-3 text-center text-default-400 overflow-hidden">—</td>
                                            <td className="py-2 px-3 text-center text-default-400 overflow-hidden">—</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </>
                  )}
                </div>
              )}
            </ModalBody>

            <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
              <Button variant="ghost" onPress={onClose} className="font-medium">
                Cerrar
              </Button>
              {cotizacionData && cotizacionData.cotizacion.length > 0 && (
                <Button
                  color="success"
                  variant="solid"
                  className="font-bold text-secondary shadow-md cursor-pointer"
                  startContent={<Icon icon="lucide:download" width={18} />}
                  onPress={onExportExcel}
                  size="lg"
                >
                  Descargar Excel
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════
//  Modal "Generar Orden Pedido" — Paso 1 (selección) + Paso 2 (cotización)
// ══════════════════════════════════════════════════════════════════════════

interface OrdenPedidoModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  paso: 1 | 2;
  periodos: { anio: number; semestres: number[] }[];
  periodo: { anio: number; semestre: number } | null;
  onPeriodoChange: (p: { anio: number; semestre: number } | null) => void;
  semanas: ISemana[];
  semana: ISemana | null;
  onSemanaChange: (s: ISemana | null) => void;
  pedidos: IPedidoSemanaResumen[];
  loadingPedidos: boolean;
  errorPedidos: string | null;
  seleccionados: Set<number>;
  onToggleSeleccion: (id: number) => void;
  onGenerar: () => void;
  cotizacion: ICotizacionConsolidadaResponse | null;
  loadingCotizacion: boolean;
  errorCotizacion: string | null;
  cantidades: Record<number, Record<number, Record<string, number>>>;
  cantidadesOriginales: Record<number, Record<number, Record<string, number>>>;
  onCantidadChange: (idProveedor: number, idProducto: number, dia: string, valor: number) => void;
  onIncrement: (idProveedor: number, idProducto: number, entregaKey: string, delta: number, colSpecs: ColSpecOC[]) => void;
  onRestaurar: (idProveedor: number, idProducto: number) => void;
  onVolver: () => void;
  fechaEntrega: string | null;
  onFechaEntregaChange: (f: string) => void;
  proveedoresEstados?: Record<number, EstadoProveedor>;
  togglingEstadoPaso2Id?: number | null;
  onToggleEstadoProveedor?: (prov: IProveedorGrupoConsolidado, estadoActual: EstadoProveedor) => void;
  onConfirmarOrden: () => void;
  isGenerandoOrdenes: boolean;
}

const chipOrdenPedido = (cantidad: number, canceladas: number) => {
  if (cantidad === 0 && canceladas > 0) return <Chip color="warning" size="sm" variant="flat">Existe un registro cancelado, realizar nuevo</Chip>;
  if (cantidad === 0) return <Chip color="default" size="sm" variant="flat">Sin OP</Chip>;
  if (cantidad === 1) return <Chip color="success" size="sm" variant="flat">OP Generada</Chip>;
  return <Chip color="warning" size="sm" variant="flat">Ya existe un registro para este pedido</Chip>;
};

const formatRangoPedido = (inicio: string, fin: string) => `${inicio} → ${fin}`;

const OrdenPedidoModal: React.FC<OrdenPedidoModalProps> = ({
  isOpen,
  onOpenChange,
  paso,
  periodos,
  periodo,
  onPeriodoChange,
  semanas,
  semana,
  onSemanaChange,
  pedidos,
  loadingPedidos,
  errorPedidos,
  seleccionados,
  onToggleSeleccion,
  onGenerar,
  cotizacion,
  loadingCotizacion,
  errorCotizacion,
  cantidades,
  cantidadesOriginales,
  onCantidadChange,
  onIncrement,
  onRestaurar,
  onVolver,
  fechaEntrega,
  onFechaEntregaChange,
  proveedoresEstados,
  togglingEstadoPaso2Id,
  onToggleEstadoProveedor,
  onConfirmarOrden,
  isGenerandoOrdenes,
}) => {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const semestreActual = hoy.getMonth() + 1 <= 6 ? 1 : 2;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size={paso === 1 ? '3xl' : '5xl'}
      backdrop="blur"
      scrollBehavior="inside"
      radius="lg"
      classNames={{ base: 'rounded-2xl', body: 'min-h-[400px]' }}
    >
      <ModalContent className="rounded-2xl overflow-hidden">
        {(onClose) => (
          <>
            <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-warning/10 to-warning/5 dark:from-warning/20 dark:to-warning/10 px-6 py-4">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 bg-warning/20 rounded-lg">
                  <Icon icon="lucide:clipboard-list" className="text-warning" width={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-lg text-secondary dark:text-foreground">
                    Generar Orden Pedido
                  </span>
                  <span className="text-xs text-default-500">
                    {paso === 1
                      ? 'Paso 1 — Seleccione la semana y los pedidos APROBADO a consolidar'
                      : 'Paso 2 — Cotización consolidada con menor precio + distribución por día'}
                  </span>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="gap-6 py-6">
              {paso === 1 && (
                <>
                  {/* Selectores Período + Semana */}
                  <div className="flex flex-col sm:flex-row gap-3 items-end bg-default-50 dark:bg-default-100/20 rounded-xl p-4 border border-default-200 dark:border-default-100">
                    <div className="w-full sm:w-48">
                      <Select
                        label="Período"
                        placeholder="Año - Semestre"
                        variant="bordered"
                        size="sm"
                        selectedKeys={periodo ? new Set([`${periodo.anio}-${periodo.semestre}`]) : new Set()}
                        onSelectionChange={(keys) => {
                          const v = Array.from(keys as Set<string>)[0];
                          if (v) {
                            const [a, s] = v.split('-');
                            onPeriodoChange({ anio: Number(a), semestre: Number(s) });
                          }
                        }}
                        classNames={{ trigger: 'bg-white dark:bg-default-100/50' }}
                      >
                        {periodos.flatMap(p =>
                          p.semestres.map(s => (
                            <SelectItem key={`${p.anio}-${s}`} textValue={`${p.anio} - S${s}`}>
                              <div className="flex items-center w-full gap-2">
                                <span className="font-semibold">{p.anio} - S{s}</span>
                                {p.anio === anioActual && s === semestreActual && (
                                  <Chip size="sm" color="success" variant="flat" className="ml-auto shrink-0 text-[10px]">
                                    Actual
                                  </Chip>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </Select>
                    </div>
                    <div className="flex-1 w-full">
                      <Select
                        label="Semana"
                        placeholder={semanas.length === 0 ? 'Seleccione un período primero' : 'Seleccione la semana'}
                        variant="bordered"
                        size="sm"
                        isDisabled={semanas.length === 0}
                        selectedKeys={semana ? new Set([String(semana.idSemana)]) : new Set()}
                        onSelectionChange={(keys) => {
                          const v = Array.from(keys as Set<string>)[0];
                          if (!v) {
                            onSemanaChange(null);
                            return;
                          }
                          const s = semanas.find(x => String(x.idSemana) === v) ?? null;
                          onSemanaChange(s);
                        }}
                        classNames={{ trigger: 'bg-white dark:bg-default-100/50' }}
                      >
                        {semanas.map(s => (
                          <SelectItem key={String(s.idSemana)} textValue={s.nombreSemana}>
                            <div className="flex items-center w-full gap-2">
                              <span className="font-semibold">{s.nombreSemana}</span>
                              <span className="text-default-400 text-xs">
                                {s.fechaInicio} – {s.fechaFin}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* Selector de fecha de entrega — visible cuando hay semana seleccionada */}
                  {semana && (() => {
                    const minISO = semana.fechaInicio;
                    const maxISO = semana.fechaFin;
                    const lunesEntrega = fechaEntrega ? getMondayISO(fechaEntrega) : null;
                    const domEntrega  = lunesEntrega ? addDaysISO(lunesEntrega, 6) : null;
                    return (
                      <div className="bg-warning-50 dark:bg-warning-50/10 border border-warning-200 dark:border-warning-400/30 rounded-xl p-3 space-y-2">
                        <p className="text-xs font-semibold text-warning-700 dark:text-warning-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Icon icon="lucide:truck" width={13} />
                          Semana de entrega
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <input
                            type="date"
                            min={minISO}
                            max={maxISO}
                            value={fechaEntrega ?? ''}
                            onChange={(e) => onFechaEntregaChange(e.target.value)}
                            className="rounded-lg border border-warning-300 dark:border-warning-500/50 bg-white dark:bg-default-100/50 px-3 py-1.5 text-sm focus:outline-none focus:border-warning-500 text-default-700"
                          />
                          {lunesEntrega && domEntrega ? (
                            <span className="text-sm text-default-600">
                              Semana del{' '}
                              <span className="font-semibold text-warning-700 dark:text-warning-400">{lunesEntrega}</span>
                              {' '}al{' '}
                              <span className="font-semibold text-warning-700 dark:text-warning-400">{domEntrega}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-default-400 italic">Seleccione una fecha (máx: {maxISO})</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Error de carga de pedidos */}
                  {errorPedidos && (
                    <div className="flex items-start gap-3 bg-danger-50 dark:bg-danger-50/10 border border-danger/30 text-danger text-sm p-4 rounded-xl">
                      <Icon icon="lucide:alert-circle" width={18} className="mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">Error al cargar pedidos</p>
                        <p className="text-xs text-danger/80 dark:text-danger/70 mt-0.5">{errorPedidos}</p>
                      </div>
                    </div>
                  )}

                  {/* BookPageLoader mientras se cargan los pedidos */}
                  {loadingPedidos && (
                    <div className="flex justify-center items-center py-6 min-h-[220px]">
                      <BookPageLoader
                        message="Cargando pedidos"
                        subMessage="Obteniendo pedidos APROBADO de la semana..."
                      />
                    </div>
                  )}

                  {/* Tabla de pedidos */}
                  {!loadingPedidos && semana && (
                    <div className="space-y-2">
                      {pedidos.length === 0 ? (
                        <div className="text-center py-10 text-default-400">
                          <Icon icon="lucide:inbox" width={40} className="mx-auto mb-2" />
                          <p>No hay pedidos APROBADO en la semana seleccionada.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
                          <table className="w-full text-xs">
                            <thead className="bg-default-100 dark:bg-default-50">
                              <tr>
                                <th className="text-center py-2 px-3 font-medium w-12">Sel.</th>
                                <th className="text-center py-2 px-3 font-medium">Rango del Pedido</th>
                                <th className="text-center py-2 px-3 font-medium">Estado</th>
                                <th className="text-center py-2 px-3 font-medium">OC asociadas</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pedidos.map(p => (
                                <tr
                                  key={p.idPedido}
                                  className="border-t border-default-100 dark:border-default-50 hover:bg-default-50 dark:hover:bg-default-100/20"
                                >
                                  <td className="py-2 px-3 text-center">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 cursor-pointer accent-warning"
                                      checked={seleccionados.has(p.idPedido)}
                                      onChange={() => onToggleSeleccion(p.idPedido)}
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-center font-medium">
                                    {formatRangoPedido(p.fechaInicioPedido, p.fechaFinPedido)}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <Chip color="primary" size="sm" variant="flat">{p.estadoPedido}</Chip>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {chipOrdenPedido(p.cantidadOrdenPedido, p.cantidadOrdenCanceladas)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {paso === 2 && (
                <>
                  {/* Resumen semana solicitud + selector de fecha de entrega editable */}
                  {semana && (() => {
                    const minISO      = semana.fechaInicio;
                    const maxISO      = semana.fechaFin;
                    const lunesEntrega = fechaEntrega ? getMondayISO(fechaEntrega) : null;
                    const domEntrega   = lunesEntrega ? addDaysISO(lunesEntrega, 6) : null;
                    return (
                      <div className="flex flex-wrap items-center gap-3 bg-default-50 dark:bg-default-100/20 rounded-xl px-4 py-3 border border-default-200 dark:border-default-100 text-sm">
                        <span className="flex items-center gap-1.5 text-default-600">
                          <Icon icon="lucide:calendar" width={15} className="text-default-400" />
                          Semana solicitud:
                          <span className="font-semibold text-secondary dark:text-foreground">{semana.nombreSemana}</span>
                          <span className="text-default-400 text-xs">({semana.fechaInicio})</span>
                        </span>
                        <span className="text-default-300">|</span>
                        <span className="flex flex-wrap items-center gap-2 text-default-600">
                          <Icon icon="lucide:truck" width={15} className="text-warning" />
                          <span>Semana de entrega:</span>
                          <input
                            type="date"
                            min={minISO}
                            max={maxISO}
                            value={fechaEntrega ?? ''}
                            onChange={(e) => onFechaEntregaChange(e.target.value)}
                            className="rounded-md border border-warning-300 dark:border-warning-500/50 bg-white dark:bg-default-100/50 px-2 py-0.5 text-sm focus:outline-none focus:border-warning-500 text-default-700"
                          />
                          {lunesEntrega && domEntrega && (
                            <span className="text-xs text-default-500">
                              ({lunesEntrega} al {domEntrega})
                            </span>
                          )}
                          {!fechaEntrega && (
                            <span className="text-xs text-warning-600 italic">Seleccione una fecha de entrega</span>
                          )}
                        </span>
                      </div>
                    );
                  })()}

                  {errorCotizacion && (
                    <div className="flex items-start gap-3 bg-danger-50 dark:bg-danger-50/10 border border-danger/30 text-danger text-sm p-4 rounded-xl">
                      <Icon icon="lucide:alert-circle" width={18} className="mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">Error en la cotización</p>
                        <p className="text-xs text-danger/80 dark:text-danger/70 mt-0.5">{errorCotizacion}</p>
                      </div>
                    </div>
                  )}

                  {loadingCotizacion && (
                    <div className="flex justify-center items-center py-6 min-h-[220px]">
                      <BookPageLoader
                        message="Consolidando cotización"
                        subMessage="Calculando menor precio y distribución por día..."
                      />
                    </div>
                  )}

                  {!loadingCotizacion && cotizacion && cotizacion.cotizacion.length === 0 && (
                    <div className="text-center py-10 text-default-400">
                      <Icon icon="lucide:inbox" width={40} className="mx-auto mb-2" />
                      <p>No hay productos para los pedidos seleccionados.</p>
                    </div>
                  )}

                  {!loadingCotizacion && cotizacion && cotizacion.cotizacion.length > 0 && semana && (
                    <div className="space-y-6">
                      {cotizacion.cotizacion.map((prov, idx) => (
                        <ProveedorCotizacionTabla
                          key={prov.idProveedor ?? `sin-prov-${idx}`}
                          proveedor={prov}
                          cantidadesProv={prov.idProveedor != null ? (cantidades[prov.idProveedor] ?? {}) : {}}
                          cantidadesOriginalesProv={prov.idProveedor != null ? (cantidadesOriginales[prov.idProveedor] ?? {}) : {}}
                          onCantidadChange={onCantidadChange}
                          onIncrement={(idProducto, entregaKey, delta, colSpecs) => {
                            if (prov.idProveedor != null) onIncrement(prov.idProveedor, idProducto, entregaKey, delta, colSpecs);
                          }}
                          onRestaurar={(idProducto) => {
                            if (prov.idProveedor != null) onRestaurar(prov.idProveedor, idProducto);
                          }}
                          fechaEntrega={fechaEntrega}
                          estadoProveedor={prov.idProveedor != null ? (proveedoresEstados?.[prov.idProveedor] ?? null) : null}
                          isToggling={togglingEstadoPaso2Id === prov.idProveedor}
                          onToggleEstado={
                            prov.idProveedor != null && onToggleEstadoProveedor && proveedoresEstados?.[prov.idProveedor] != null
                              ? () => onToggleEstadoProveedor(prov, proveedoresEstados![prov.idProveedor!])
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </ModalBody>

            <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
              {paso === 1 && (
                <>
                  <Button variant="ghost" onPress={onClose} className="font-medium">
                    Cerrar
                  </Button>
                  <Button
                    color="warning"
                    variant="solid"
                    className="font-bold shadow-md cursor-pointer"
                    startContent={<Icon icon="lucide:arrow-right" width={18} />}
                    isDisabled={seleccionados.size === 0 || !fechaEntrega}
                    onPress={onGenerar}
                    size="lg"
                  >
                    Generar ({seleccionados.size})
                  </Button>
                </>
              )}
              {paso === 2 && (
                <>
                  <Button
                    variant="ghost"
                    onPress={onVolver}
                    startContent={<Icon icon="lucide:arrow-left" width={16} />}
                    className="font-medium"
                  >
                    Volver
                  </Button>
                  <Button variant="ghost" onPress={onClose} className="font-medium">
                    Cerrar
                  </Button>
                  <Button
                    color="success"
                    variant="solid"
                    isLoading={isGenerandoOrdenes}
                    onPress={onConfirmarOrden}
                    startContent={!isGenerandoOrdenes && <Icon icon="lucide:shopping-cart" width={18} />}
                    className="font-medium"
                  >
                    Generar Ordenes de Pedidos
                  </Button>
                </>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

// ── Sub-componente: tabla de un proveedor con columnas por día de la semana ───

// ── Input de cantidad de entrega (soporta coma decimal para productos fraccionarios) ──

interface EntregaInputProps {
  value: number;
  esFraccionario: boolean;
  onChange: (v: number) => void;
  /** Si se provee, los botones ± disparan redistribución automática con este handler. */
  onIncrement?: (delta: number) => void;
  className?: string;
}

const EntregaInput: React.FC<EntregaInputProps> = ({ value, esFraccionario, onChange, onIncrement, className }) => {
  const inputClass = className ?? 'w-[74px] px-1 py-1 text-center rounded border border-warning-300 dark:border-warning-600/50 bg-white dark:bg-default-100/50 focus:outline-none focus:border-warning-500 font-semibold text-xs';

  // Formato visual: separador de miles = punto, decimal = coma  (ej: 1.234,567 / 1.234)
  const formatVal = (v: number): string => {
    if (v === 0) return '';
    if (esFraccionario) {
      // Elimina ceros decimales superfluos, usa coma como separador decimal
      const str = v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
      const [intPart, decPart] = str.split('.');
      const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return decPart ? `${intFmt},${decPart}` : intFmt;
    }
    return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Parse: elimina puntos de miles, convierte coma decimal → punto → número JS
  const parseVal = (raw: string): number => {
    const normalized = raw.replace(/\./g, '').replace(',', '.');
    return esFraccionario
      ? Math.round(parseFloat(normalized) * 1000) / 1000
      : parseInt(normalized, 10);
  };

  // Long press: click simple → ±step; mantener >300ms → ±stepHold cada 300ms
  const timeoutRef  = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const longActive  = React.useRef(false);

  const [localText, setLocalText] = React.useState<string>(() => formatVal(value));
  const isEditing = React.useRef(false);

  // Sincroniza el texto cuando el valor cambia desde fuera (botones +/−)
  React.useEffect(() => {
    if (!isEditing.current) setLocalText(formatVal(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearTimers = () => {
    if (timeoutRef.current)  { clearTimeout(timeoutRef.current);   timeoutRef.current  = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const handleBtnDown = (sign: 1 | -1) => {
    longActive.current = false;
    clearTimers();
    timeoutRef.current = setTimeout(() => {
      longActive.current = true;
      intervalRef.current = setInterval(() => {
        if (onIncrement) onIncrement(sign * (esFraccionario ? 0.5 : 5));
      }, 300);
    }, 300);
  };

  const handleBtnUp = () => { clearTimers(); };

  const handleBtnClick = (sign: 1 | -1) => {
    if (!longActive.current && onIncrement) onIncrement(sign * (esFraccionario ? 0.1 : 1));
    longActive.current = false;
  };

  const btnClass = 'w-5 h-6 flex items-center justify-center rounded text-xs font-bold bg-warning-100 dark:bg-warning-900/30 hover:bg-warning-200 dark:hover:bg-warning-800/40 text-warning-700 dark:text-warning-400 transition-colors select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  // type="text" para ambos tipos: permite mostrar separadores de miles y coma decimal
  const inputEl = (
    <input
      type="text"
      inputMode={esFraccionario ? 'decimal' : 'numeric'}
      value={localText}
      onChange={(e) => {
        const raw = e.target.value;
        setLocalText(raw);
        if (raw === '') { onChange(0); return; }
        const v = parseVal(raw);
        if (!isNaN(v) && v >= 0) onChange(v);
      }}
      onFocus={() => { isEditing.current = true; }}
      onBlur={() => {
        isEditing.current = false;
        setLocalText(formatVal(value));
      }}
      placeholder="0"
      className={inputClass}
    />
  );

  if (!onIncrement) return inputEl;

  return (
    <div className="flex items-center gap-0.5 justify-center">
      <button
        type="button"
        aria-label="Decrementar"
        className={btnClass}
        disabled={value === 0}
        onMouseDown={() => handleBtnDown(-1)}
        onMouseUp={handleBtnUp}
        onMouseLeave={handleBtnUp}
        onTouchStart={() => handleBtnDown(-1)}
        onTouchEnd={handleBtnUp}
        onTouchCancel={handleBtnUp}
        onClick={() => handleBtnClick(-1)}
      >
        −
      </button>
      {inputEl}
      <button
        type="button"
        aria-label="Incrementar"
        className={btnClass}
        onMouseDown={() => handleBtnDown(1)}
        onMouseUp={handleBtnUp}
        onMouseLeave={handleBtnUp}
        onTouchStart={() => handleBtnDown(1)}
        onTouchEnd={handleBtnUp}
        onTouchCancel={handleBtnUp}
        onClick={() => handleBtnClick(1)}
      >
        +
      </button>
    </div>
  );
};

// ── Sub-componente: tabla de un proveedor con columnas por día de la semana ───

interface ProveedorCotizacionTablaProps {
  proveedor: IProveedorGrupoConsolidado;
  /** idProducto → diaSemana → cantidad editable (sólo para días de entrega) */
  cantidadesProv: Record<number, Record<string, number>>;
  /** idProducto → diaSemana → cantidad original (base de comparación para el icono de restaurar) */
  cantidadesOriginalesProv: Record<number, Record<string, number>>;
  onCantidadChange: (idProveedor: number, idProducto: number, dia: string, valor: number) => void;
  /** Incremento/decremento con redistribución automática (botones ±). */
  onIncrement: (idProducto: number, entregaKey: string, delta: number, colSpecs: ColSpecOC[]) => void;
  /** Restaura la distribución de un producto a los valores iniciales. */
  onRestaurar: (idProducto: number) => void;
  /** Fecha elegida por el usuario para calcular la semana de entrega real (YYYY-MM-DD). */
  fechaEntrega: string | null;
  estadoProveedor?: EstadoProveedor | null;
  isToggling?: boolean;
  onToggleEstado?: () => void;
}

const ProveedorCotizacionTabla: React.FC<ProveedorCotizacionTablaProps> = ({
  proveedor,
  cantidadesProv,
  cantidadesOriginalesProv,
  onCantidadChange,
  onIncrement,
  onRestaurar,
  fechaEntrega,
  estadoProveedor,
  isToggling,
  onToggleEstado,
}) => {
  /** Dado un día de la semana del proveedor, devuelve la fecha exacta de entrega (DD/MM)
   *  usando el lunes de la semana elegida por el usuario como base. */
  const fechaExactaEntrega = React.useCallback((dia: TDiaSemana, semanaAnterior?: boolean): string | null => {
    if (!fechaEntrega) return null;
    const lunes = getMondayISO(fechaEntrega);
    const base = semanaAnterior ? addDaysISO(lunes, -7) : lunes;
    const fecha = addDaysISO(base, DIA_ORDEN[dia] - 1);
    const [, mm, dd] = fecha.split('-');
    return `${dd}/${mm}`;
  }, [fechaEntrega]);

  /** Calcula la info de entrega para una columna E: fecha ajustada + detección de feriados.
   *  Si la fecha cae en feriado, retrocede al día anterior disponible del proveedor. */
  const calcEntregaInfo = React.useCallback((col: ColSpecOC): {
    fechaDisplay: string | null;
    esFeriado: boolean;
    fechaOriginal: string | null;
    nombreFeriado: string | null;
  } => {
    if (!fechaEntrega || col.tipo !== 'entrega') {
      return { fechaDisplay: null, esFeriado: false, fechaOriginal: null, nombreFeriado: null };
    }
    const lunes = getMondayISO(fechaEntrega);
    const base = col.semanaAnterior ? addDaysISO(lunes, -7) : lunes;
    const fechaISO = addDaysISO(base, DIA_ORDEN[col.dia] - 1);
    const [añoS, mmS, ddS] = fechaISO.split('-');
    const fechaDate = new Date(Number(añoS), Number(mmS) - 1, Number(ddS));
    const fmt = (dt: Date) =>
      `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const nombreF = nombreFeriadoChile(fechaDate);
    if (!nombreF) {
      return { fechaDisplay: fmt(fechaDate), esFeriado: false, fechaOriginal: null, nombreFeriado: null };
    }
    // Es feriado: buscar día de entrega anterior del proveedor que no sea feriado
    const diasProvNum = [...(proveedor.diasEntrega ?? [])]
      .map(d => DIA_ORDEN[d]).sort((a, b) => a - b);
    const diaOriginalNum = DIA_ORDEN[col.dia];
    const originalDisplay = fmt(fechaDate);
    let fechaAjustada: Date | null = null;
    // Buscar hacia atrás en días del proveedor de la misma semana base
    for (let i = diasProvNum.length - 1; i >= 0; i--) {
      if (diasProvNum[i] < diaOriginalNum) {
        const candISO = addDaysISO(base, diasProvNum[i] - 1);
        const [cA, cM, cD] = candISO.split('-');
        const cand = new Date(Number(cA), Number(cM) - 1, Number(cD));
        if (!nombreFeriadoChile(cand)) { fechaAjustada = cand; break; }
      }
    }
    // Si no encontró en la misma semana, buscar en semana anterior
    if (!fechaAjustada) {
      const baseAnterior = addDaysISO(lunes, -7);
      for (let i = diasProvNum.length - 1; i >= 0; i--) {
        const candISO = addDaysISO(baseAnterior, diasProvNum[i] - 1);
        const [cA, cM, cD] = candISO.split('-');
        const cand = new Date(Number(cA), Number(cM) - 1, Number(cD));
        if (!nombreFeriadoChile(cand)) { fechaAjustada = cand; break; }
      }
    }
    return {
      fechaDisplay: fechaAjustada ? fmt(fechaAjustada) : originalDisplay,
      esFeriado: true,
      fechaOriginal: originalDisplay,
      nombreFeriado: nombreF,
    };
  }, [fechaEntrega, proveedor.diasEntrega]);

  const esSinProveedor = proveedor.idProveedor == null;

  // Días con cantidad > 0 en cualquier producto de este proveedor.
  const diasConQty = React.useMemo<Set<TDiaSemana>>(() => {
    const s = new Set<TDiaSemana>();
    for (const cat of proveedor.categorias)
      for (const prod of cat.productos)
        for (const c of prod.cantidadPorDia)
          if (c.dia !== 'SIN_DIA' && c.cantidad > 0) s.add(c.dia as TDiaSemana);
    return s;
  }, [proveedor]);

  // Especificación de columnas: Cant.{día} (read-only) o Entrega {día} (editable).
  const colSpecs = React.useMemo<ColSpecOC[]>(
    () => buildColsOC(proveedor.diasEntrega ?? [], diasConQty),
    [proveedor.diasEntrega, diasConQty],
  );

  // Totales del proveedor: Σ (entrega × precioUnitario) para todos los productos.
  const totales = React.useMemo(() => {
    let neto = 0; let conIva = 0;
    for (const cat of proveedor.categorias)
      for (const prod of cat.productos) {
        const sum = Object.values(cantidadesProv[prod.idProducto] ?? {}).reduce((s, v) => s + v, 0);
        if (prod.precioNeto != null) neto += sum * prod.precioNeto;
        if (prod.precioConIva != null) conIva += sum * prod.precioConIva;
      }
    return { neto, conIva };
  }, [proveedor, cantidadesProv]);

  return (
    <Card className={esSinProveedor
      ? 'shadow-sm border-2 border-danger-200 dark:border-danger-300'
      : 'shadow-sm border border-default-200 dark:border-default-100'
    }>
      <CardBody className="p-0">
        {/* Header del proveedor */}
        <div className={esSinProveedor
          ? 'bg-danger-50 dark:bg-danger-50/10 px-4 py-3 border-b border-danger-200'
          : 'bg-warning-50 dark:bg-warning-50/10 px-4 py-3 border-b border-default-100'
        }>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className={esSinProveedor ? 'font-bold text-base text-danger' : 'font-bold text-base text-secondary dark:text-foreground'}>
                {esSinProveedor ? 'Productos Sin Proveedor' : proveedor.nombreDistribuidora}
              </h4>
              {!esSinProveedor && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-default-500 mt-0.5">
                  <span className="flex items-center gap-1"><Icon icon="lucide:user" width={12} />{proveedor.nombreProveedor ?? '—'}</span>
                  {proveedor.telefono && (<><span className="text-default-300">•</span><span className="flex items-center gap-1"><Icon icon="lucide:phone" width={12} />{proveedor.telefono}</span></>)}
                  {proveedor.email && (<><span className="text-default-300">•</span><span className="flex items-center gap-1"><Icon icon="lucide:mail" width={12} />{proveedor.email}</span></>)}
                </div>
              )}
              {!esSinProveedor && proveedor.diasEntrega && proveedor.diasEntrega.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  <span className="text-[11px] text-default-500 mr-1">Días de entrega:</span>
                  {proveedor.diasEntrega.map(d => (
                    <Chip key={d} size="sm" color="warning" variant="flat" className="text-[10px]">{DIAS_ABREV_OC[d]}</Chip>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Chip color="primary" size="sm" variant="flat">{proveedor.totalProductos} producto{proveedor.totalProductos !== 1 ? 's' : ''}</Chip>
              {!esSinProveedor && (
                <>
                  <Chip color="success" size="sm" variant="flat" className="font-bold">Neto: ${fmtN(totales.neto)}</Chip>
                  <Chip color="warning" size="sm" variant="flat" className="font-bold">c/IVA: ${fmtN(totales.conIva)}</Chip>
                </>
              )}
              {!esSinProveedor && onToggleEstado && estadoProveedor != null && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Chip
                    color={estadoProveedor === 'DISPONIBLE' ? 'success' : 'danger'}
                    size="sm"
                    variant="flat"
                    className="text-[10px]"
                  >
                    {estadoProveedor === 'DISPONIBLE' ? 'Disponible' : 'No Disponible'}
                  </Chip>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    title={estadoProveedor === 'DISPONIBLE' ? 'Cambiar a No Disponible' : 'Cambiar a Disponible'}
                    isLoading={isToggling}
                    onPress={onToggleEstado}
                  >
                    <Icon
                      icon={estadoProveedor === 'DISPONIBLE' ? 'lucide:toggle-right' : 'lucide:toggle-left'}
                      className={estadoProveedor === 'DISPONIBLE' ? 'text-success' : 'text-danger'}
                      width={20}
                    />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabla productos por categoría */}
        <div className="px-4 py-3">
          {proveedor.categorias.map(cat => (
            <div key={cat.idCategoria} className="mb-3 last:mb-0">
              <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-1">{cat.nombreCategoria}</p>
              <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
                <table className="w-full text-xs">
                  <thead className="bg-default-100 dark:bg-default-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium w-[170px]">Producto</th>
                      <th className="text-center py-2 px-2 font-medium w-16">U/M</th>
                      <th className="text-center py-2 px-2 font-medium w-[110px]">Total Ped.</th>
                      {!esSinProveedor && colSpecs.map(col => {
                        if (col.tipo === 'entrega') {
                          const info = calcEntregaInfo(col);
                          const thBase = 'text-center py-2 px-2 font-semibold w-[110px] whitespace-nowrap';
                          const thClass = info.esFeriado
                            ? `${thBase} bg-danger-100 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400`
                            : `${thBase} bg-warning-100 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400`;
                          const contenido = (
                            <>
                              Entrega {DIAS_ABREV_OC[col.dia]}{col.semanaAnterior ? '*' : ''}
                              {info.esFeriado && <span className="text-[9px] font-bold ml-0.5">⚠ FERIADO</span>}
                              {info.fechaDisplay && (
                                <><br /><span className="text-[10px] font-normal">{info.fechaDisplay}{info.esFeriado && info.fechaOriginal && ` (era ${info.fechaOriginal})`}</span></>
                              )}
                            </>
                          );
                          return (
                            <th key={`entrega-${getEntregaKey(col)}`} className={thClass}>
                              {info.esFeriado ? (
                                <Tooltip
                                  content={`Entrega retrasada: ${info.nombreFeriado} (${info.fechaOriginal})`}
                                  color="danger"
                                  placement="top"
                                >
                                  <span>{contenido}</span>
                                </Tooltip>
                              ) : contenido}
                            </th>
                          );
                        }
                        const fechaCant = fechaExactaEntrega(col.dia);
                        return (
                          <th key={`cant-${col.dia}`} className="text-center py-2 px-2 font-medium w-[92px] text-default-500 whitespace-nowrap">
                            Cant.<br />{DIAS_ABREV_OC[col.dia]}
                            {fechaCant && <><br /><span className="text-[10px] font-normal">{fechaCant}</span></>}
                          </th>
                        );
                      })}
                      <th className="text-center py-2 px-2 font-medium w-[110px]">P. Neto</th>
                      <th className="text-center py-2 px-2 font-medium w-[110px]">P. c/IVA</th>
                      {!esSinProveedor && <th className="text-center py-2 px-1 font-medium w-9" title="Restaurar distribución"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {cat.productos.map(prod => {
                      const entregasProd  = cantidadesProv[prod.idProducto] ?? {};
                      const originalesProd = cantidadesOriginalesProv[prod.idProducto] ?? {};
                      const sumEntregas   = Object.values(entregasProd).reduce((s, v) => s + v, 0);
                      const pNetoFila   = prod.precioNeto   != null ? sumEntregas * prod.precioNeto   : null;
                      const pConIvaFila = prod.precioConIva != null ? sumEntregas * prod.precioConIva : null;
                      // Hay alteración si cualquier clave difiere del valor original
                      const hayAlteracion = Object.keys({ ...entregasProd, ...originalesProd }).some(k =>
                        Math.abs((entregasProd[k] ?? 0) - (originalesProd[k] ?? 0)) > 0.001,
                      );
                      return (
                        <tr key={prod.idProducto} className="border-t border-default-100 dark:border-default-50 hover:bg-default-50 dark:hover:bg-default-100/20">
                          <td className="py-2 px-3 font-medium text-left w-[170px]">
                            <Tooltip content={prod.nombreProducto} color="default" placement="top">
                              <div className="w-[146px] truncate">{prod.nombreProducto}</div>
                            </Tooltip>
                          </td>
                          <td className="py-2 px-2 text-center text-default-500 whitespace-nowrap">{prod.abreviatura}</td>
                          <td className="py-2 px-2 text-center font-medium text-default-700 whitespace-nowrap">{fmtN(prod.cantidadTotal)}</td>
                          {!esSinProveedor && colSpecs.map(col => {
                            if (col.tipo === 'cant') {
                              const qty = prod.cantidadPorDia.find(c => c.dia === col.dia)?.cantidad ?? 0;
                              return (
                                <td key={`cant-${col.dia}`} className="py-2 px-2 text-center text-default-500 whitespace-nowrap">
                                  {qty > 0 ? fmtN(qty) : <span className="text-default-300">—</span>}
                                </td>
                              );
                            }
                            // tipo === 'entrega' — editable
                            const entregaKey = getEntregaKey(col);
                            const v = entregasProd[entregaKey] ?? 0;
                            return (
                              <td key={`entrega-${entregaKey}`} className="py-1 px-1 text-center bg-warning-50/40 dark:bg-warning-900/10 whitespace-nowrap">
                                <EntregaInput
                                  value={v}
                                  esFraccionario={prod.esFraccionario}
                                  onChange={(valor) => {
                                    if (proveedor.idProveedor == null) return;
                                    onCantidadChange(proveedor.idProveedor, prod.idProducto, entregaKey, valor);
                                  }}
                                  onIncrement={(delta) => onIncrement(prod.idProducto, entregaKey, delta, colSpecs)}
                                />
                              </td>
                            );
                          })}
                          <td className="py-2 px-2 text-center whitespace-nowrap">{pNetoFila   !== null ? `$${fmtN(pNetoFila)}`   : '—'}</td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">{pConIvaFila !== null ? `$${fmtN(pConIvaFila)}` : '—'}</td>
                          {!esSinProveedor && (
                            <td className="py-1 px-1 text-center">
                              {hayAlteracion && (
                                <button
                                  title={`Restaurar distribución original (actual: ${fmtN(sumEntregas)} / solicitado: ${fmtN(prod.cantidadTotal)})`}
                                  onClick={() => onRestaurar(prod.idProducto)}
                                  className="p-1 rounded hover:bg-warning-100 dark:hover:bg-warning-900/20 text-warning-500 dark:text-warning-400 transition-colors cursor-pointer"
                                  type="button"
                                >
                                  <Icon icon="lucide:refresh-cw" width={13} />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};

// ── Vista de Órdenes de Pedido ────────────────────────────────────────────────

const ESTADO_OP_CONFIG: Record<EstadoOrdenPedido, {
  label: string;
  chipColor: 'warning' | 'primary' | 'success' | 'danger' | 'secondary';
  icon: string;
  headerBg: string;
  iconClass: string;
  textClass: string;
  activeBtnClass: string;
}> = {
  PENDIENTE:  { label: 'Pendiente',   chipColor: 'warning',   icon: 'lucide:clock',         headerBg: 'bg-warning-50 dark:bg-warning-50/10 border-warning-200',       iconClass: 'text-warning',   textClass: 'text-warning-700 dark:text-warning-400',     activeBtnClass: 'bg-warning text-white border-warning'     },
  ENVIADA:    { label: 'Enviada',     chipColor: 'primary',   icon: 'lucide:send',          headerBg: 'bg-primary-50 dark:bg-primary-50/10 border-primary-200',       iconClass: 'text-primary',   textClass: 'text-primary-700 dark:text-primary-400',     activeBtnClass: 'bg-primary text-white border-primary'     },
  CONFIRMADA: { label: 'Confirmada',  chipColor: 'success',   icon: 'lucide:check-circle',  headerBg: 'bg-success-50 dark:bg-success-50/10 border-success-200',       iconClass: 'text-success',   textClass: 'text-success-700 dark:text-success-400',     activeBtnClass: 'bg-success text-white border-success'     },
  CANCELADA:  { label: 'Cancelada',   chipColor: 'danger',    icon: 'lucide:x-circle',      headerBg: 'bg-danger-50 dark:bg-danger-50/10 border-danger-200',         iconClass: 'text-danger',    textClass: 'text-danger-700 dark:text-danger-400',       activeBtnClass: 'bg-danger text-white border-danger'       },
  RECIBIDA:   { label: 'Recibida',    chipColor: 'secondary', icon: 'lucide:package-check', headerBg: 'bg-secondary-50 dark:bg-secondary-50/10 border-secondary-200', iconClass: 'text-secondary', textClass: 'text-secondary-700 dark:text-secondary-400', activeBtnClass: 'bg-secondary text-white border-secondary' },
};

const ESTADO_OP_ORDEN: EstadoOrdenPedido[] = ['PENDIENTE', 'ENVIADA', 'CONFIRMADA', 'RECIBIDA', 'CANCELADA'];

/** Transiciones disponibles por estado: [nuevoEstado, label, icono, color] */
const TRANSICIONES_OP: Record<EstadoOrdenPedido, Array<{ estado: EstadoOrdenPedido; label: string; icon: string; color: 'primary' | 'success' | 'warning' | 'secondary' }>> = {
  PENDIENTE:  [{ estado: 'ENVIADA',    label: 'Marcar Enviada',    icon: 'lucide:send',         color: 'primary'   }],
  ENVIADA:    [{ estado: 'CONFIRMADA', label: 'Confirmar',         icon: 'lucide:check-circle', color: 'success'   },
               { estado: 'PENDIENTE',  label: 'Revertir a Pendiente', icon: 'lucide:undo-2',    color: 'warning'   }],
  CONFIRMADA: [{ estado: 'ENVIADA',    label: 'Revertir a Enviada', icon: 'lucide:undo-2',     color: 'warning'   }],
  RECIBIDA:   [],
  CANCELADA:  [{ estado: 'PENDIENTE',  label: 'Reactivar',         icon: 'lucide:refresh-cw',  color: 'warning'   }],
};

// ── Helpers de fecha real para agrupación por entrega ────────────────────────

const getLunesDe = (fechaISO: string): string => {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0=Dom,1=Lun,...,6=Sáb
  const diff = dow === 0 ? -6 : 1 - dow;
  const lunes = new Date(y, m - 1, d + diff);
  return `${lunes.getFullYear()}-${String(lunes.getMonth()+1).padStart(2,'0')}-${String(lunes.getDate()).padStart(2,'0')}`;
};

const getDomingoDe = (lunesISO: string): string => {
  const [y, m, d] = lunesISO.split('-').map(Number);
  const dom = new Date(y, m - 1, d + 6);
  return `${dom.getFullYear()}-${String(dom.getMonth()+1).padStart(2,'0')}-${String(dom.getDate()).padStart(2,'0')}`;
};

const NOM_DIA_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const getNombreDia = (fechaISO: string): string => {
  const [y, m, d] = fechaISO.split('-').map(Number);
  return NOM_DIA_ES[new Date(y, m - 1, d).getDay()];
};

type OpCelda = { op: IOrdenPedidoListItem; cantidad: number };
type ProductoTablaFila = { idProducto: number; nombre: string; abrev: string; porFecha: Map<string, OpCelda[]> };
type ProveedorTablaItem = {
  idProveedor: number; nombreDistribuidora: string; nombreProveedor: string;
  fechas: string[]; semanasDeFechas: Map<string, string>; productos: ProductoTablaFila[];
};

// ── Exportación Excel de orden de pedido por proveedor (replica cabecera del modelo) ──
const generarExcelOrdenPedidoProveedor = (prov: ProveedorTablaItem, lunesSeleccionado: string): void => {
  const fechasSemana = prov.fechas.filter(f => prov.semanasDeFechas.get(f) === lunesSeleccionado);
  if (fechasSemana.length === 0) return;
  const domingo = getDomingoDe(lunesSeleccionado);

  const fmtCorta = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  };
  const fmtArch = (iso: string) => {
    const [, m, d] = iso.split('-').map(Number);
    return `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}`;
  };

  // Columnas (0-based): 0=A margen, 1=B label/producto, 2=C valor/U/M, 3..=días
  const N = fechasSemana.length;
  const COL_B = 1, COL_C = 2, COL_D = 3;
  const lastCol = COL_D + N - 1;
  const enc = (r: number, c: number) => XLSXStyle.utils.encode_cell({ r, c });

  const sLabelBold = { font: { bold: true, sz: 11 }, border: { top: { style: 'medium' as const }, bottom: { style: 'medium' as const }, left: { style: 'medium' as const } } };
  const sValue = { font: { sz: 11 }, alignment: { horizontal: 'center' as const }, border: { top: { style: 'thin' as const }, bottom: { style: 'thin' as const }, left: { style: 'thin' as const }, right: { style: 'thin' as const } } };
  const sYellowLabel = { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'FFFF00' } }, border: { top: { style: 'medium' as const }, bottom: { style: 'medium' as const }, left: { style: 'medium' as const } } };
  const sTableHeader = { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'FFC000' } }, alignment: { horizontal: 'center' as const }, border: { bottom: { style: 'medium' as const }, left: { style: 'medium' as const }, right: { style: 'medium' as const } } };
  const sProducto = { font: { sz: 11 }, alignment: { horizontal: 'left' as const }, border: { top: { style: 'thin' as const }, bottom: { style: 'thin' as const }, left: { style: 'thin' as const }, right: { style: 'thin' as const } } };
  const sUM = { font: { sz: 10 }, alignment: { horizontal: 'center' as const }, border: { top: { style: 'thin' as const }, bottom: { style: 'thin' as const }, left: { style: 'thin' as const }, right: { style: 'thin' as const } } };
  const sCantidad = { font: { bold: true, sz: 11 }, alignment: { horizontal: 'center' as const }, border: { top: { style: 'thin' as const }, bottom: { style: 'thin' as const }, left: { style: 'thin' as const }, right: { style: 'thin' as const } } };

  const ws: Record<string, unknown> = {};

  // Cabecera — replica estructura exacta del modelo de proveedor
  ws[enc(1, COL_B)] = { v: 'NOMBRE EMPRESA', t: 's', s: sLabelBold };
  ws[enc(1, COL_C)] = { v: prov.nombreDistribuidora, t: 's', s: sValue };

  ws[enc(2, COL_B)] = { v: 'DIRECCIÓN', t: 's', s: sLabelBold };
  ws[enc(2, COL_C)] = { v: '', t: 's', s: sValue };

  ws[enc(3, COL_B)] = { v: 'SEMANA:', t: 's', s: sYellowLabel };
  ws[enc(3, COL_C)] = { v: `${fmtCorta(lunesSeleccionado)} al ${fmtCorta(domingo)}`, t: 's', s: sValue };

  ws[enc(4, COL_B)] = { v: 'TELÉFONO', t: 's', s: sLabelBold };
  ws[enc(4, COL_C)] = { v: '', t: 's', s: sValue };
  if (lastCol >= 5) {
    ws[enc(4, 4)] = { v: 'PERSONA DE CONTACTO', t: 's', s: { font: { bold: true, sz: 11 }, border: { top: { style: 'thin' as const }, bottom: { style: 'thin' as const }, left: { style: 'thin' as const }, right: { style: 'thin' as const } } } };
    ws[enc(4, 5)] = { v: prov.nombreProveedor !== prov.nombreDistribuidora ? prov.nombreProveedor : '', t: 's', s: sValue };
  }

  // Cabeceras de tabla (fila 7 = r=6)
  ws[enc(6, COL_B)] = { v: 'PRODUCTO', t: 's', s: sTableHeader };
  ws[enc(6, COL_C)] = { v: 'U/M', t: 's', s: sTableHeader };
  fechasSemana.forEach((fecha, i) => {
    const [y, m, d] = fecha.split('-').map(Number);
    ws[enc(6, COL_D + i)] = { v: `${NOM_DIA_ES[new Date(y, m - 1, d).getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`, t: 's', s: sTableHeader };
  });

  // Filas de datos
  prov.productos.forEach((prod, pi) => {
    const r = 7 + pi;
    ws[enc(r, COL_B)] = { v: prod.nombre, t: 's', s: sProducto };
    ws[enc(r, COL_C)] = { v: prod.abrev, t: 's', s: sUM };
    fechasSemana.forEach((fecha, i) => {
      const items = prod.porFecha.get(fecha);
      const total = items ? items.reduce((s, it) => s + it.cantidad, 0) : null;
      ws[enc(r, COL_D + i)] = total !== null ? { v: total, t: 'n', s: sCantidad } : { v: '', t: 's', s: sUM };
    });
  });

  // Merges de cabecera
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [
    { s: { r: 1, c: COL_C }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: COL_C }, e: { r: 2, c: lastCol } },
    { s: { r: 3, c: COL_C }, e: { r: 3, c: lastCol } },
    { s: { r: 4, c: COL_C }, e: { r: 4, c: 3 } },
  ];
  if (lastCol >= 5) merges.push({ s: { r: 4, c: 5 }, e: { r: 4, c: lastCol } });
  ws['!merges'] = merges;

  ws['!cols'] = [{ wch: 4 }, { wch: 35 }, { wch: 8 }, ...fechasSemana.map(() => ({ wch: 14 }))];
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 7 + prov.productos.length - 1, c: lastCol } });

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, 'Pedido');
  XLSXStyle.writeFile(wb, `${prov.nombreDistribuidora} Semana ${fmtArch(lunesSeleccionado)} al ${fmtArch(domingo)}.xlsx`);
};

interface OrdenesVistaProps {
  lista: IOrdenPedidoListItem[];
  cargando: boolean;
  error: string | null;
  expandidosIds: Set<number>;
  detalles: Map<number, IOrdenPedidoConDetalles>;
  cargandoDetalleIds: Set<number>;
  cambiandoEstadoId: number | null;
  onToggle: (id: number) => void;
  onRecargar: () => void;
  onCambiarEstado: (id: number, nuevoEstado: EstadoOrdenPedido) => void;
  onConfirmCancelar: (op: IOrdenPedidoListItem) => void;
  rango: number | null;
  onRangoChange: (r: number | null) => void;
  onCargarDetallesBulk: (ids: number[]) => Promise<void>;
}

const OrdenesVista: React.FC<OrdenesVistaProps> = ({
  lista, cargando, error, expandidosIds, detalles, cargandoDetalleIds,
  cambiandoEstadoId, onToggle, onRecargar, onCambiarEstado, onConfirmCancelar,
  rango, onRangoChange, onCargarDetallesBulk,
}) => {
  const [filtroEstado, setFiltroEstado] = React.useState<EstadoOrdenPedido>('PENDIENTE');
  const [agruparPorPedido, setAgruparPorPedido] = React.useState(false);
  const [agruparPorFechaReal, setAgruparPorFechaReal] = React.useState(false);
  const [modoUnificada, setModoUnificada] = React.useState(false);
  const [weekPickerOpenId, setWeekPickerOpenId] = React.useState<number | null>(null);

  const fmtFecha = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const fmtDatetime = (iso: string) => {
    const dt = new Date(iso);
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
  };

  const conteosPorEstado = React.useMemo(() => {
    const map = new Map<EstadoOrdenPedido, number>();
    for (const e of ESTADO_OP_ORDEN) map.set(e, 0);
    for (const op of lista) map.set(op.estadoOrdenPedido, (map.get(op.estadoOrdenPedido) ?? 0) + 1);
    return map;
  }, [lista]);

  const listaFiltrada = React.useMemo(
    () => lista.filter(op => op.estadoOrdenPedido === filtroEstado),
    [lista, filtroEstado],
  );

  const [criteriosOrden, setCriteriosOrden] = React.useState<string[]>(['fechaEntrega']);
  const [tempSelectedKeys, setTempSelectedKeys] = React.useState<Set<string>>(new Set(['fechaEntrega']));
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const aplicarFiltros = React.useCallback((keys: Set<string>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCriteriosOrden(Array.from(keys));
  }, []);

  const handleSelectionChange = React.useCallback((keys: any) => {
    let newKeys = new Set<string>();
    if (keys === 'all') {
      newKeys = new Set(['fechaEntrega', 'idOP_asc', 'distribuidora', 'fechaCreacion']);
    } else {
      newKeys = new Set(Array.from(keys) as string[]);
    }

    // Manejo de exclusión mutua para idOP_asc e idOP_desc
    const hadAsc = tempSelectedKeys.has('idOP_asc');
    const hadDesc = tempSelectedKeys.has('idOP_desc');
    const hasAsc = newKeys.has('idOP_asc');
    const hasDesc = newKeys.has('idOP_desc');

    if (hasAsc && hasDesc) {
      if (hadAsc) {
        newKeys.delete('idOP_asc');
      } else if (hadDesc) {
        newKeys.delete('idOP_desc');
      } else {
        newKeys.delete('idOP_asc');
      }
    }

    setTempSelectedKeys(newKeys);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      aplicarFiltros(newKeys);
    }, 2000);
  }, [tempSelectedKeys, aplicarFiltros]);

  const handleOpenChange = React.useCallback((isOpen: boolean) => {
    if (!isOpen) {
      aplicarFiltros(tempSelectedKeys);
    }
  }, [tempSelectedKeys, aplicarFiltros]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const listaOrdenada = React.useMemo(() => {
    const copia = [...listaFiltrada];
    if (criteriosOrden.length === 0) return copia;

    copia.sort((a, b) => {
      for (const crit of criteriosOrden) {
        let diff = 0;
        if (crit === 'fechaEntrega') {
          diff = (b.fechaInicioPedido || '').localeCompare(a.fechaInicioPedido || '');
        } else if (crit === 'idOP_asc') {
          diff = a.idOrdenPedido - b.idOrdenPedido;
        } else if (crit === 'idOP_desc') {
          diff = b.idOrdenPedido - a.idOrdenPedido;
        } else if (crit === 'distribuidora') {
          diff = (a.nombreDistribuidora || '').localeCompare(b.nombreDistribuidora || '');
        } else if (crit === 'fechaCreacion') {
          diff = new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
        }
        if (diff !== 0) return diff;
      }
      return b.idOrdenPedido - a.idOrdenPedido;
    });
    return copia;
  }, [listaFiltrada, criteriosOrden]);

  const listaAgrupada = React.useMemo(() => {
    if (!agruparPorPedido) return null;
    const grupos = new Map<number, { fechaInicio: string; fechaFin: string; ops: IOrdenPedidoListItem[] }>();
    for (const op of listaOrdenada) {
      if (!grupos.has(op.idPedido)) {
        grupos.set(op.idPedido, { fechaInicio: op.fechaInicioPedido, fechaFin: op.fechaFinPedido, ops: [] });
      }
      grupos.get(op.idPedido)!.ops.push(op);
    }
    return grupos;
  }, [listaOrdenada, agruparPorPedido]);

  // ── Agrupación por fecha real de entrega (tabla columnar) ────────────────

  const agrupadoFechaReal = React.useMemo((): ProveedorTablaItem[] | null => {
    if (!agruparPorFechaReal) return null;
    const grupos = new Map<number, {
      idProveedor: number; nombreDistribuidora: string; nombreProveedor: string;
      todasLasFechas: Set<string>; productos: Map<number, ProductoTablaFila>;
    }>();
    for (const op of listaOrdenada) {
      const det = detalles.get(op.idOrdenPedido);
      if (!det) continue;
      if (!grupos.has(op.idProveedor)) {
        grupos.set(op.idProveedor, {
          idProveedor: op.idProveedor, nombreDistribuidora: op.nombreDistribuidora,
          nombreProveedor: op.nombreProveedor, todasLasFechas: new Set(), productos: new Map(),
        });
      }
      const grupo = grupos.get(op.idProveedor)!;
      for (const d of det.detalles) {
        grupo.todasLasFechas.add(d.fechaEntrega);
        if (!grupo.productos.has(d.idProducto)) {
          grupo.productos.set(d.idProducto, { idProducto: d.idProducto, nombre: d.nombreProducto, abrev: d.abreviatura, porFecha: new Map() });
        }
        const prod = grupo.productos.get(d.idProducto)!;
        if (!prod.porFecha.has(d.fechaEntrega)) prod.porFecha.set(d.fechaEntrega, []);
        prod.porFecha.get(d.fechaEntrega)!.push({ op, cantidad: d.cantidadSolicitada });
      }
    }
    return [...grupos.values()]
      .sort((a, b) => a.nombreDistribuidora.localeCompare(b.nombreDistribuidora))
      .map(g => ({
        idProveedor: g.idProveedor, nombreDistribuidora: g.nombreDistribuidora, nombreProveedor: g.nombreProveedor,
        fechas: [...g.todasLasFechas].sort(),
        semanasDeFechas: new Map([...g.todasLasFechas].map(f => [f, getLunesDe(f)])),
        productos: [...g.productos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      }));
  }, [agruparPorFechaReal, listaOrdenada, detalles]);

  React.useEffect(() => {
    if (!agruparPorFechaReal || listaOrdenada.length === 0) return;
    onCargarDetallesBulk(listaOrdenada.map(op => op.idOrdenPedido));
  }, [agruparPorFechaReal, listaOrdenada, onCargarDetallesBulk]);

  // Filas detallada: una fila por (producto × OP), con el ID de OP en la columna izquierda
  const detalladaTabla = React.useMemo(() => {
    if (!agrupadoFechaReal || modoUnificada) return null;
    return agrupadoFechaReal.map(prov => {
      const rowMap = new Map<string, { idOP: number; idProducto: number; nombre: string; abrev: string; porFecha: Map<string, number> }>();
      for (const prod of prov.productos) {
        for (const [fecha, items] of prod.porFecha) {
          for (const { op, cantidad } of items) {
            const key = `${prod.idProducto}-${op.idOrdenPedido}`;
            if (!rowMap.has(key)) rowMap.set(key, { idOP: op.idOrdenPedido, idProducto: prod.idProducto, nombre: prod.nombre, abrev: prod.abrev, porFecha: new Map() });
            rowMap.get(key)!.porFecha.set(fecha, cantidad);
          }
        }
      }
      return {
        idProveedor: prov.idProveedor,
        rows: [...rowMap.values()].sort((a, b) => {
          const n = a.nombre.localeCompare(b.nombre);
          return n !== 0 ? n : a.idOP - b.idOP;
        }),
      };
    });
  }, [agrupadoFechaReal, modoUnificada]);

  const renderOpRow = (op: IOrdenPedidoListItem, isFirst: boolean) => (
    <div key={op.idOrdenPedido} className={!isFirst ? 'border-t border-default-100 dark:border-default-50' : ''}>
      {/* Fila resumen */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 cursor-pointer transition-colors hover:bg-default-50 dark:hover:bg-default-100/20 ${
          expandidosIds.has(op.idOrdenPedido) ? 'bg-default-50 dark:bg-default-100/20' : ''
        }`}
        onClick={() => onToggle(op.idOrdenPedido)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1 shrink-0">
            <Icon
              icon={expandidosIds.has(op.idOrdenPedido) ? 'lucide:chevron-down' : 'lucide:chevron-right'}
              width={16}
              className="text-default-400"
            />
            <span className="text-xs font-bold text-secondary dark:text-foreground">OP #{op.idOrdenPedido}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="w-[200px] truncate font-semibold text-sm text-secondary dark:text-foreground">
              {op.nombreDistribuidora}
            </div>
            <p className="text-xs text-default-400">{op.nombreProveedor}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-default-500 shrink-0">
          <span className="flex items-center gap-1">
            <Icon icon="lucide:calendar-range" width={12} />
            {fmtFecha(op.fechaInicioPedido)} – {fmtFecha(op.fechaFinPedido)}
          </span>
          <span className="flex items-center gap-1">
            <Icon icon="lucide:clock" width={12} />
            {fmtDatetime(op.fechaCreacion)}
          </span>
          <Chip size="sm" color={cfg.chipColor} variant="flat" className="text-[10px]">
            {op.cantidadDetalles} detalle{op.cantidadDetalles !== 1 ? 's' : ''}
          </Chip>
        </div>
        {/* Botones de acción de estado */}
        <div
          className="flex items-center gap-1.5 shrink-0"
          onClick={e => e.stopPropagation()}
        >
          {TRANSICIONES_OP[op.estadoOrdenPedido].map(t => (
            <Tooltip key={t.estado} content={t.label} placement="top">
              <Button
                isIconOnly
                size="sm"
                color={t.color}
                variant="flat"
                isLoading={cambiandoEstadoId === op.idOrdenPedido}
                isDisabled={cambiandoEstadoId !== null}
                onPress={() => onCambiarEstado(op.idOrdenPedido, t.estado)}
              >
                <Icon icon={t.icon} width={14} />
              </Button>
            </Tooltip>
          ))}
          {(['PENDIENTE', 'ENVIADA', 'CONFIRMADA'] as EstadoOrdenPedido[]).includes(op.estadoOrdenPedido) && (
            <Tooltip content="Cancelar orden" placement="top">
              <Button
                isIconOnly
                size="sm"
                color="danger"
                variant="flat"
                isDisabled={cambiandoEstadoId !== null}
                onPress={() => onConfirmCancelar(op)}
              >
                <Icon icon="lucide:x-circle" width={14} />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Panel detalle expandido */}
      <AnimatePresence>
        {expandidosIds.has(op.idOrdenPedido) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 bg-default-50 dark:bg-default-100/20 border-t border-default-100">
              {cargandoDetalleIds.has(op.idOrdenPedido) ? (
                <div className="flex justify-center py-8">
                  <Spinner size="sm" color="primary" label="Cargando detalle..." />
                </div>
              ) : detalles.get(op.idOrdenPedido) ? (
                <OrdenDetalleTabla detalle={detalles.get(op.idOrdenPedido)!} />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-20">
        <BookPageLoader message="Cargando órdenes" subMessage="Obteniendo todas las órdenes de pedido..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border border-danger-200 bg-danger-50 dark:bg-danger-50/10">
        <CardBody className="flex flex-row items-center gap-3 p-4">
          <Icon icon="lucide:alert-triangle" className="text-danger" width={22} />
          <p className="text-danger text-sm flex-1">{error}</p>
          <Button size="sm" variant="flat" color="danger" onPress={onRecargar}>Reintentar</Button>
        </CardBody>
      </Card>
    );
  }

  const cfg = ESTADO_OP_CONFIG[filtroEstado];

  return (
    <Card className="shadow-sm border border-default-200 dark:border-default-100">
      {/* ── Barra de filtros por estado ── */}
      <div className="px-4 pt-4 pb-3 border-b border-default-100">
        <div className="flex items-center gap-1.5 flex-wrap">
          {ESTADO_OP_ORDEN.map(e => {
            const c = ESTADO_OP_CONFIG[e];
            const count = conteosPorEstado.get(e) ?? 0;
            const activo = filtroEstado === e;
            return (
              <button
                key={e}
                onClick={() => setFiltroEstado(e)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  activo
                    ? c.activeBtnClass
                    : 'bg-default-100 text-default-600 border-default-200 hover:bg-default-200'
                }`}
              >
                <Icon icon={c.icon} width={11} />
                {c.label}
                <span className={`${activo ? 'opacity-80' : 'opacity-60'}`}>({count})</span>
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <Select
              aria-label="Rango de fechas"
              size="sm"
              variant="flat"
              selectedKeys={new Set([rango != null ? String(rango) : 'todas'])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys as Set<string>)[0];
                onRangoChange(v === 'todas' ? null : Number(v));
              }}
              className="w-36"
              classNames={{
                trigger: "bg-default-100 border-transparent h-8 min-h-8",
                value: "text-xs font-medium text-default-700 dark:text-default-300",
              }}
            >
              <SelectItem key="30" textValue="Últimos 30 días">Últimos 30 días</SelectItem>
              <SelectItem key="90" textValue="Últimos 3 meses">Últimos 3 meses</SelectItem>
              <SelectItem key="todas" textValue="Todas">Todas</SelectItem>
            </Select>
            <Button
              size="sm"
              variant="flat"
              startContent={<Icon icon="lucide:refresh-cw" width={13} />}
              onPress={onRecargar}
            >
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      {/* ── Barra de filtros de ordenamiento ── */}
      <div className="px-4 py-2 bg-default-50 dark:bg-default-50/50 border-b border-default-100 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-default-500 font-medium">
          <Icon icon="lucide:arrow-up-down" width={14} />
          <span>Ordenar por:</span>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content={agruparPorPedido ? 'Quitar agrupación por pedido' : 'Agrupar por pedido'} placement="top">
            <Button
              size="sm"
              variant={agruparPorPedido ? 'solid' : 'flat'}
              color={agruparPorPedido ? 'primary' : 'default'}
              isIconOnly
              onPress={() => { setAgruparPorPedido(v => !v); setAgruparPorFechaReal(false); }}
              className="h-8 w-8 min-w-0"
            >
              <Icon icon="lucide:layers" width={14} />
            </Button>
          </Tooltip>
          <Tooltip content={agruparPorFechaReal ? 'Quitar agrupación por fecha de entrega' : 'Agrupar por fecha real de entrega'} placement="top">
            <Button
              size="sm"
              variant={agruparPorFechaReal ? 'solid' : 'flat'}
              color={agruparPorFechaReal ? 'secondary' : 'default'}
              isIconOnly
              onPress={() => { setAgruparPorFechaReal(v => !v); setAgruparPorPedido(false); setModoUnificada(false); }}
              className="h-8 w-8 min-w-0"
            >
              <Icon icon="lucide:calendar-days" width={14} />
            </Button>
          </Tooltip>
        <Select
          aria-label="Criterio de ordenamiento"
          size="sm"
          variant="bordered"
          selectionMode="multiple"
          closeOnSelect={false}
          selectedKeys={tempSelectedKeys}
          onSelectionChange={handleSelectionChange}
          onOpenChange={handleOpenChange}
          placeholder="Seleccionar..."
          className="w-44"
          classNames={{
            trigger: "bg-white dark:bg-default-100/50 border-default-200 dark:border-default-100 h-8 min-h-8",
            value: "text-xs font-semibold text-default-700 dark:text-default-300"
          }}
          renderValue={() => "Seleccionar..."}
        >
          <SelectItem key="fechaEntrega" textValue="Fecha de Entrega">
            Fecha de Entrega
          </SelectItem>
          <SelectItem key="idOP_asc" textValue="Número de OP (ASC)">
            Número de OP (ASC)
          </SelectItem>
          <SelectItem key="idOP_desc" textValue="Número de OP (DESC)">
            Número de OP (DESC)
          </SelectItem>
          <SelectItem key="distribuidora" textValue="Distribuidora">
            Distribuidora
          </SelectItem>
          <SelectItem key="fechaCreacion" textValue="Fecha de Creación">
            Fecha de Creación
          </SelectItem>
        </Select>
        </div>
      </div>

      <CardBody className="p-0">
        {listaOrdenada.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-default-400">
            <Icon icon={cfg.icon} width={48} className="opacity-30" />
            <p className="text-sm font-medium">
              No hay órdenes con estado <span className="font-bold">{cfg.label}</span>
            </p>
            <p className="text-xs">
              {filtroEstado === 'PENDIENTE'  && 'Las órdenes recién generadas aparecerán aquí.'}
              {filtroEstado === 'ENVIADA'    && 'Las órdenes marcadas como enviadas al proveedor aparecerán aquí.'}
              {filtroEstado === 'CONFIRMADA' && 'Las órdenes confirmadas por el proveedor aparecerán aquí.'}
              {filtroEstado === 'RECIBIDA'   && 'Las órdenes con mercadería recibida aparecerán aquí.'}
              {filtroEstado === 'CANCELADA'  && 'Las órdenes canceladas aparecerán aquí.'}
            </p>
          </div>
        ) : agruparPorFechaReal ? (
          <div>
            {/* Cargando detalles en bulk */}
            {listaOrdenada.some(op => cargandoDetalleIds.has(op.idOrdenPedido)) && (
              <div className="flex items-center gap-2 px-4 py-2 text-xs text-primary-600 dark:text-primary-400 bg-primary-50/60 dark:bg-primary-900/10 border-b border-primary-100">
                <Spinner size="sm" color="primary" />
                <span>Cargando datos de entrega de {listaOrdenada.filter(op => cargandoDetalleIds.has(op.idOrdenPedido)).length} orden{listaOrdenada.filter(op => cargandoDetalleIds.has(op.idOrdenPedido)).length !== 1 ? 'es' : ''}...</span>
              </div>
            )}
            {/* Sin datos todavía */}
            {agrupadoFechaReal !== null && agrupadoFechaReal.length === 0 && !listaOrdenada.some(op => cargandoDetalleIds.has(op.idOrdenPedido)) && (
              <div className="py-12 flex flex-col items-center gap-2 text-default-400">
                <Icon icon="lucide:calendar-x" width={36} className="opacity-30" />
                <p className="text-sm">Sin datos de entrega disponibles para estas órdenes</p>
              </div>
            )}
            {/* Barra toggle vista */}
            {agrupadoFechaReal !== null && agrupadoFechaReal.length > 0 && (
              <div className="px-4 py-2 bg-default-50 dark:bg-default-50/30 border-b border-default-100 flex items-center gap-3 text-xs">
                <span className="text-default-500 font-medium">Vista:</span>
                <div className="flex rounded-lg overflow-hidden border border-default-200">
                  <button onClick={() => setModoUnificada(false)} className={`px-3 py-1 text-xs font-medium transition-colors ${!modoUnificada ? 'bg-default-700 text-white dark:bg-default-200 dark:text-default-800' : 'bg-white dark:bg-default-100/30 text-default-500 hover:bg-default-100'}`}>Detallada</button>
                  <button onClick={() => setModoUnificada(true)} className={`px-3 py-1 text-xs font-medium transition-colors border-l border-default-200 ${modoUnificada ? 'bg-success-500 text-white' : 'bg-white dark:bg-default-100/30 text-default-500 hover:bg-default-100'}`}>Unificada</button>
                </div>
                <span className="text-default-400 ml-auto text-[11px]">{(agrupadoFechaReal ?? []).length} proveedor{(agrupadoFechaReal ?? []).length !== 1 ? 'es' : ''}</span>
              </div>
            )}
            {/* Tablas columnares — una por proveedor con borde grueso de separación */}
            <div className="p-4 space-y-5">
              {(agrupadoFechaReal ?? []).map(prov => {
                const semanaGrupos = new Map<string, string[]>();
                for (const f of prov.fechas) {
                  const lunes = prov.semanasDeFechas.get(f)!;
                  if (!semanaGrupos.has(lunes)) semanaGrupos.set(lunes, []);
                  semanaGrupos.get(lunes)!.push(f);
                }
                const semanasOrdenadas = [...semanaGrupos.entries()].sort(([a], [b]) => a.localeCompare(b));
                const multiSemana = semanasOrdenadas.length > 1;
                return (
                  <div key={prov.idProveedor} className="rounded-xl overflow-hidden border-2 border-secondary-400 dark:border-secondary-500">
                    {/* Header sólido — mismo color que el borde para contorno uniforme */}
                    <div className="px-4 py-2.5 bg-secondary-400 dark:bg-secondary-500 flex items-center gap-2">
                      <Icon icon="lucide:truck" width={15} className="text-white shrink-0" />
                      <span className="font-bold text-sm text-white">{prov.nombreDistribuidora}</span>
                      {prov.nombreProveedor !== prov.nombreDistribuidora && (
                        <span className="text-xs text-secondary-100">{prov.nombreProveedor}</span>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-[11px] text-secondary-100">
                          {prov.fechas.length} día{prov.fechas.length !== 1 ? 's' : ''} · {!modoUnificada ? (detalladaTabla?.find(d => d.idProveedor === prov.idProveedor)?.rows.length ?? 0) : prov.productos.length} fila{(!modoUnificada ? (detalladaTabla?.find(d => d.idProveedor === prov.idProveedor)?.rows.length ?? 0) : prov.productos.length) !== 1 ? 's' : ''}
                        </span>
                        {modoUnificada && (
                          <div className="relative">
                            <button
                              onClick={() => {
                                if (semanasOrdenadas.length === 1) {
                                  generarExcelOrdenPedidoProveedor(prov, semanasOrdenadas[0][0]);
                                } else {
                                  setWeekPickerOpenId(prev => prev === prov.idProveedor ? null : prov.idProveedor);
                                }
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/20 hover:bg-white/35 text-white text-[11px] font-medium transition-colors"
                              title="Descargar Excel de esta semana"
                            >
                              <Icon icon="lucide:download" width={12} />
                              <span>Excel</span>
                              {semanasOrdenadas.length > 1 && <Icon icon="lucide:chevron-down" width={10} />}
                            </button>
                            {weekPickerOpenId === prov.idProveedor && semanasOrdenadas.length > 1 && (
                              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-default-100 rounded-lg shadow-xl border border-default-200 z-30 overflow-hidden min-w-[210px]">
                                <div className="px-3 py-1.5 text-[11px] font-semibold text-default-400 border-b border-default-100 uppercase tracking-wide">Elegir semana</div>
                                {semanasOrdenadas.map(([lunes]) => (
                                  <button
                                    key={lunes}
                                    onClick={() => {
                                      generarExcelOrdenPedidoProveedor(prov, lunes);
                                      setWeekPickerOpenId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-default-700 dark:text-default-200 hover:bg-secondary-50 dark:hover:bg-secondary-900/20 transition-colors"
                                  >
                                    Sem. {fmtFecha(lunes)} – {fmtFecha(getDomingoDe(lunes))}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Tabla con scroll horizontal */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border-collapse">
                        <thead>
                          {/* Fila de semanas — solo cuando hay más de una */}
                          {multiSemana && (
                            <tr>
                              <th rowSpan={2} className="text-left py-2 px-3 bg-secondary-50 dark:bg-secondary-900/30 sticky left-0 z-10 border-r border-secondary-300 dark:border-secondary-600 min-w-[170px] font-medium whitespace-nowrap">Producto</th>
                              <th rowSpan={2} className="text-center py-2 px-2 bg-secondary-50 dark:bg-secondary-900/30 sticky left-[170px] z-10 border-r border-secondary-300 dark:border-secondary-600 w-12 min-w-[48px] font-medium">U/M</th>
                              {semanasOrdenadas.map(([lunes, fechasSem]) => (
                                <th key={lunes} colSpan={fechasSem.length} className="text-center py-1 px-2 bg-default-50 dark:bg-default-50/20 border-l-2 border-secondary-400 dark:border-secondary-500 text-[11px] text-default-500 font-semibold whitespace-nowrap">
                                  Sem. {fmtFecha(lunes)} – {fmtFecha(getDomingoDe(lunes))}
                                </th>
                              ))}
                            </tr>
                          )}
                          {/* Fila de días */}
                          <tr>
                            {!multiSemana && (
                              <>
                                <th className="text-left py-2 px-3 bg-secondary-50 dark:bg-secondary-900/30 sticky left-0 z-10 border-r border-secondary-300 dark:border-secondary-600 min-w-[170px] font-medium whitespace-nowrap">Producto</th>
                                <th className="text-center py-2 px-2 bg-secondary-50 dark:bg-secondary-900/30 sticky left-[170px] z-10 border-r border-secondary-300 dark:border-secondary-600 w-12 min-w-[48px] font-medium">U/M</th>
                              </>
                            )}
                            {prov.fechas.map((fecha, idx) => {
                              const lunesActual = prov.semanasDeFechas.get(fecha)!;
                              const esNuevaSemana = idx > 0 && prov.semanasDeFechas.get(prov.fechas[idx - 1]) !== lunesActual;
                              return (
                                <th key={fecha} className={`text-center py-1.5 px-3 bg-warning-50 dark:bg-warning-900/20 font-semibold whitespace-nowrap text-warning-700 dark:text-warning-300 min-w-[90px] ${esNuevaSemana ? 'border-l-2 border-secondary-400 dark:border-secondary-500' : 'border-l border-default-200 dark:border-default-100/20'}`}>
                                  <div>{getNombreDia(fecha).slice(0, 3)}</div>
                                  <div className="font-normal text-[10px] text-warning-500">{fmtFecha(fecha).slice(0, 5)}</div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {!modoUnificada ? (
                            // ── Detallada: una fila por (producto × OP), ID a la izquierda del nombre ──
                            (detalladaTabla?.find(d => d.idProveedor === prov.idProveedor)?.rows ?? []).map((row, rowIdx) => {
                              const isOdd = rowIdx % 2 !== 0;
                              const bgSticky = isOdd ? 'bg-secondary-50/80 dark:bg-secondary-900/20' : 'bg-white dark:bg-default-900';
                              const bgRow   = isOdd ? 'bg-secondary-50/40 dark:bg-secondary-900/10' : '';
                              return (
                                <tr key={`${row.idProducto}-${row.idOP}`} className={`${bgRow} hover:bg-secondary-50/70 dark:hover:bg-secondary-900/20 transition-colors`}>
                                  {/* OP ID + Nombre (sticky) */}
                                  <td className={`py-2 px-3 sticky left-0 z-10 border-r border-secondary-200 dark:border-secondary-700 text-xs ${bgSticky}`}>
                                    <div className="flex items-center gap-1.5 w-[146px]">
                                      <span className="text-[10px] font-bold text-secondary-400 dark:text-secondary-400 shrink-0 tabular-nums">#{row.idOP}</span>
                                      <Tooltip content={row.nombre} placement="right" color="default">
                                        <div className="truncate font-medium text-default-700 dark:text-default-200">{row.nombre}</div>
                                      </Tooltip>
                                    </div>
                                  </td>
                                  {/* U/M (sticky) */}
                                  <td className={`py-2 px-2 text-center text-default-500 text-[11px] sticky left-[170px] z-10 border-r border-secondary-200 dark:border-secondary-700 ${bgSticky}`}>
                                    {row.abrev}
                                  </td>
                                  {/* Celdas por fecha — solo cantidad */}
                                  {prov.fechas.map((fecha, idx) => {
                                    const lunesActual = prov.semanasDeFechas.get(fecha)!;
                                    const esNuevaSemana = idx > 0 && prov.semanasDeFechas.get(prov.fechas[idx - 1]) !== lunesActual;
                                    const borde = esNuevaSemana ? 'border-l-2 border-secondary-400 dark:border-secondary-500' : 'border-l border-default-100 dark:border-default-100/20';
                                    const cantidad = row.porFecha.get(fecha);
                                    if (!cantidad) return <td key={fecha} className={`py-2 px-3 text-center text-default-300 text-xs ${borde}`}>—</td>;
                                    return (
                                      <td key={fecha} className={`py-2 px-3 text-center font-semibold text-default-700 dark:text-default-200 text-xs ${borde}`}>
                                        {fmtN(cantidad)}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })
                          ) : (
                            // ── Unificada: una fila por producto, suma de todas las OPs ──
                            prov.productos.map((prod, rowIdx) => {
                              const isOdd = rowIdx % 2 !== 0;
                              const bgSticky = isOdd ? 'bg-success-50/70 dark:bg-success-900/15' : 'bg-white dark:bg-default-900';
                              const bgRow   = isOdd ? 'bg-success-50/25 dark:bg-success-900/8' : '';
                              return (
                                <tr key={prod.idProducto} className={`${bgRow} hover:bg-success-50/50 dark:hover:bg-success-900/15 transition-colors`}>
                                  {/* Nombre (sticky) — sin ID en unificada */}
                                  <td className={`py-2 px-3 font-medium sticky left-0 z-10 border-r border-secondary-200 dark:border-secondary-700 text-xs ${bgSticky}`}>
                                    <Tooltip content={prod.nombre} placement="right" color="default">
                                      <div className="w-[146px] truncate">{prod.nombre}</div>
                                    </Tooltip>
                                  </td>
                                  {/* U/M (sticky) */}
                                  <td className={`py-2 px-2 text-center text-default-500 text-[11px] sticky left-[170px] z-10 border-r border-secondary-200 dark:border-secondary-700 ${bgSticky}`}>
                                    {prod.abrev}
                                  </td>
                                  {/* Celdas por fecha — total sumado */}
                                  {prov.fechas.map((fecha, idx) => {
                                    const lunesActual = prov.semanasDeFechas.get(fecha)!;
                                    const esNuevaSemana = idx > 0 && prov.semanasDeFechas.get(prov.fechas[idx - 1]) !== lunesActual;
                                    const borde = esNuevaSemana ? 'border-l-2 border-secondary-400 dark:border-secondary-500' : 'border-l border-default-100 dark:border-default-100/20';
                                    const items = prod.porFecha.get(fecha);
                                    if (!items || items.length === 0) return <td key={fecha} className={`py-2 px-3 text-center text-default-300 text-xs ${borde}`}>—</td>;
                                    const total = items.reduce((s, it) => s + it.cantidad, 0);
                                    return (
                                      <td key={fecha} className={`py-2 px-3 text-center font-bold text-success-700 dark:text-success-300 text-xs ${borde}`}>
                                        {fmtN(total)}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : agruparPorPedido && listaAgrupada ? (
          <div>
            {[...listaAgrupada.entries()].map(([idPedido, grupo]) => (
              <div key={idPedido} className="border-b border-default-200 dark:border-default-100 last:border-b-0">
                {/* Cabecera del grupo de pedido */}
                <div className="px-4 py-2 bg-default-100/70 dark:bg-default-100/20 border-b border-default-200 dark:border-default-100 flex items-center gap-2 text-xs">
                  <Icon icon="lucide:folder-open" width={13} className="text-primary shrink-0" />
                  <span className="font-semibold text-default-700 dark:text-default-300">Pedido #{idPedido}</span>
                  <span className="text-default-400">{fmtFecha(grupo.fechaInicio)} – {fmtFecha(grupo.fechaFin)}</span>
                  <Chip size="sm" variant="flat" color="primary" className="text-[10px] ml-auto">
                    {grupo.ops.length} OP{grupo.ops.length !== 1 ? 's' : ''}
                  </Chip>
                </div>
                {grupo.ops.map((op, idx) => renderOpRow(op, idx === 0))}
              </div>
            ))}
          </div>
        ) : (
          <div>
            {listaOrdenada.map((op, idx) => renderOpRow(op, idx === 0))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

// ── Tabla de detalle de una Orden de Pedido ───────────────────────────────────

const OrdenDetalleTabla: React.FC<{ detalle: IOrdenPedidoConDetalles }> = ({ detalle }) => {
  // Fechas únicas ordenadas ascendente
  const fechas = React.useMemo(() => {
    const set = new Set<string>();
    for (const d of detalle.detalles) set.add(d.fechaEntrega);
    return [...set].sort();
  }, [detalle.detalles]);

  // Producto → { fecha → detalle }
  type ProductoKey = { idProducto: number; nombreProducto: string; abreviatura: string; esFraccionario: boolean; precioNeto: number | null; precioConIva: number | null };
  const productos = React.useMemo(() => {
    const map = new Map<number, { meta: ProductoKey; porFecha: Map<string, IDetalleOrdenPedido> }>();
    for (const d of detalle.detalles) {
      if (!map.has(d.idProducto)) {
        map.set(d.idProducto, {
          meta: { idProducto: d.idProducto, nombreProducto: d.nombreProducto, abreviatura: d.abreviatura, esFraccionario: d.esFraccionario, precioNeto: d.precioNetoUnitario, precioConIva: d.precioConIvaUnitario },
          porFecha: new Map(),
        });
      }
      map.get(d.idProducto)!.porFecha.set(d.fechaEntrega, d);
    }
    return [...map.values()].sort((a, b) => a.meta.nombreProducto.localeCompare(b.meta.nombreProducto));
  }, [detalle.detalles]);

  const fmtDDMM = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };

  const fmtCant = (v: number, fraccionario: boolean) =>
    fraccionario ? fmtN(v) : fmtN(Math.round(v));

  return (
    <div className="mt-3 space-y-3">
      {/* Info cabecera detalle */}
      <div className="flex flex-wrap gap-4 text-xs text-default-500 bg-white dark:bg-default-100/20 rounded-lg px-4 py-2 border border-default-100">
        {detalle.telefonoProveedor && (
          <span className="flex items-center gap-1"><Icon icon="lucide:phone" width={12} />{detalle.telefonoProveedor}</span>
        )}
        {detalle.emailProveedor && (
          <span className="flex items-center gap-1"><Icon icon="lucide:mail" width={12} />{detalle.emailProveedor}</span>
        )}
        {detalle.observaciones && (
          <span className="flex items-center gap-1 text-warning-700 dark:text-warning-400">
            <Icon icon="lucide:message-square" width={12} />{detalle.observaciones}
          </span>
        )}
      </div>

      {/* Tabla pivotada */}
      <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
        <table className="w-full text-xs">
          <thead className="bg-default-100 dark:bg-default-50">
            <tr>
              <th className="text-left py-2 px-3 font-medium w-[170px]">Producto</th>
              <th className="text-center py-2 px-2 font-medium w-14">U/M</th>
              {fechas.map(f => (
                <th key={f} className="text-center py-2 px-2 font-semibold w-[90px] bg-warning-100 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 whitespace-nowrap">
                  {fmtDDMM(f)}
                </th>
              ))}
              <th className="text-center py-2 px-2 font-medium w-[100px] whitespace-nowrap">P. Neto</th>
              <th className="text-center py-2 px-2 font-medium w-[100px] whitespace-nowrap">P. c/IVA</th>
              <th className="text-center py-2 px-2 font-medium w-[100px] whitespace-nowrap">T. Neto</th>
              <th className="text-center py-2 px-2 font-medium w-[100px] whitespace-nowrap">T. c/IVA</th>
            </tr>
          </thead>
          <tbody>
            {productos.map(({ meta, porFecha }) => {
              const cantTotal = [...porFecha.values()].reduce((s, d) => s + d.cantidadSolicitada, 0);
              const tNeto   = meta.precioNeto   != null ? cantTotal * meta.precioNeto   : null;
              const tConIva = meta.precioConIva != null ? cantTotal * meta.precioConIva : null;
              return (
                <tr key={meta.idProducto} className="border-t border-default-100 dark:border-default-50 hover:bg-default-50 dark:hover:bg-default-100/20">
                  <td className="py-2 px-3 font-medium text-left w-[170px]">
                    <Tooltip content={meta.nombreProducto} color="default" placement="top">
                      <div className="w-[146px] truncate">{meta.nombreProducto}</div>
                    </Tooltip>
                  </td>
                  <td className="py-2 px-2 text-center text-default-500 whitespace-nowrap">{meta.abreviatura}</td>
                  {fechas.map(f => {
                    const d = porFecha.get(f);
                    return (
                      <td key={f} className="py-2 px-2 text-center bg-warning-50/40 dark:bg-warning-900/10 font-semibold whitespace-nowrap">
                        {d ? fmtCant(d.cantidadSolicitada, meta.esFraccionario) : <span className="text-default-300">—</span>}
                      </td>
                    );
                  })}
                  <td className="py-2 px-2 text-center whitespace-nowrap text-default-600">
                    {meta.precioNeto != null ? `$${fmtN(meta.precioNeto)}` : '—'}
                  </td>
                  <td className="py-2 px-2 text-center whitespace-nowrap text-default-600">
                    {meta.precioConIva != null ? `$${fmtN(meta.precioConIva)}` : '—'}
                  </td>
                  <td className="py-2 px-2 text-center whitespace-nowrap text-success-700 font-semibold">
                    {tNeto != null ? `$${fmtN(tNeto)}` : '—'}
                  </td>
                  <td className="py-2 px-2 text-center whitespace-nowrap text-warning-700 font-semibold">
                    {tConIva != null ? `$${fmtN(tConIva)}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end items-center gap-3 text-xs bg-default-50 dark:bg-default-100/10 rounded-lg px-4 py-2.5 border border-default-200/60">
        <span className="font-bold text-default-700">Sub totales esperado:</span>
        <span className="text-success-600 font-semibold">Neto: ${fmtN(detalle.totalNeto)}</span>
        <span className="text-warning-600 font-semibold">c/IVA: ${fmtN(detalle.totalConIva)}</span>
      </div>
    </div>
  );
};

export default GestionProveedoresPage;
