/**
 * Helpers puros y constantes compartidas de Gestión de Proveedores.
 * Extraído de gestion-proveedores.tsx (refactor de performance) — sin cambios
 * de lógica; sólo se agregó `export` a cada declaración para reutilizarlas
 * desde los sub-componentes extraídos y desde la página principal.
 */

import type { DiaSemana, IProveedorProducto, TDiaSemana } from '../../types/proveedor/proveedor.types';

// ── Constantes de días de semana ──────────────────────────────────────────────

export const DIAS_SEMANA_OPTIONS = [
  { value: 'LUNES', label: 'Lunes' },
  { value: 'MARTES', label: 'Martes' },
  { value: 'MIERCOLES', label: 'Miércoles' },
  { value: 'JUEVES', label: 'Jueves' },
  { value: 'VIERNES', label: 'Viernes' },
  { value: 'SABADO', label: 'Sábado' },
  { value: 'DOMINGO', label: 'Domingo' },
] as const;

export const DIAS_ABREV: Record<DiaSemana, string> = {
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
export const parseChileanPrice = (input: string): number => {
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
export const formatChileanPrice = (num: number): string => {
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
export const smartPriceInput = (input: string): string => {
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

export const formatPrecio = (precio: number) =>
  `$${precio.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Constante IVA Chile (19%). Coincide con la `IVA = 1.19` del backend. */
export const IVA_RATIO = 1.19;

/** Redondea a 3 decimales (mismo scale que `precio_neto NUMERIC(10,3)` en la BD). */
export const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Detecta si los precios neto y con IVA están desincronizados.
 * Espera precio_con_iva ≈ precio_neto × 1.19 con tolerancia de ±0,01 para
 * absorber redondeos de tres decimales (scale=3 en BD).
 */
export const esDesincronizado = (p: IProveedorProducto): boolean => {
  const neto = Number(p.precioNeto);
  const iva = Number(p.precioConIva);
  if (!isFinite(neto) || !isFinite(iva) || neto <= 0 || iva <= 0) return false;
  return Math.abs(iva - neto * IVA_RATIO) > 0.01;
};

// ── Helpers Excel (estándar EXCEL.MD) ─────────────────────────────────────────

export const fmtN = (v: number): string =>
  v.toLocaleString('es-CL', { maximumFractionDigits: 3 });

export const cl = (c: number): string => {
  let s = ''; let n = c + 1;
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
};

export const sc = (v: string | number | null, s: object) => ({
  v: typeof v === 'number' ? fmtN(v) : (v ?? ''),
  t: 's' as const,
  s,
});

export const styleTitle = {
  font: { bold: true, sz: 14, color: { rgb: '1A1A1A' } },
  fill: { fgColor: { rgb: 'FFB800' } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: false },
};

export const styleHeader = {
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

export const styleCat = {
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

export const styleNum = {
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

export const styleText = {
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

export const styleTotal = {
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

export const styleSinProveedor = {
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

export const styleProvHeader = {
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

export const styleTotalPositivo = {
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

export const DIA_ORDEN: Record<TDiaSemana, number> = {
  LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4,
  VIERNES: 5, SABADO: 6, DOMINGO: 7,
};
export const DIAS_TODOS: TDiaSemana[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

/** Cantidad neta a pedir de una solicitud = demanda − reservado (lo reservado ya se cubre con stock). */
export const netoSolicitud = (s: { cantidad: number; reservado?: number }): number =>
  Math.max(0, s.cantidad - (s.reservado ?? 0));

/** Suma N días a una fecha YYYY-MM-DD (sin tocar tz). */
export const addDaysISO = (iso: string, n: number): string => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Retorna la fecha ISO del lunes de la semana que contiene la fecha dada. */
export const getMondayISO = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const DIAS_ABREV_OC: Record<TDiaSemana, string> = {
  LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue',
  VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom',
};

// ── Spec de columna para la tabla de cotización ─────────────────────────────
export type ColSpecOC =
  | { tipo: 'cant';    dia: TDiaSemana }
  | { tipo: 'entrega'; dia: TDiaSemana; semanaAnterior?: boolean };

// Clave compuesta: JUEVES → "JUEVES", JUEVES semana anterior → "JUEVES_prev"
export const getEntregaKey = (col: ColSpecOC): string =>
  col.tipo === 'entrega' && col.semanaAnterior ? `${col.dia}_prev` : col.dia;

/** Genera columnas con lógica PROSPECTIVA: la entrega (E) se ubica ANTES de los días
 *  de necesidad (P) que cubre. Para cada día de necesidad se asigna el ÚLTIMO día de
 *  entrega anterior; si no existe, se usa el último día de entrega de la semana anterior
 *  (semanaAnterior=true). Caso especial: 1 solo día de entrega → todo a ESA semana. */
export const buildColsOC = (
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
  const diasEntregaOrd = diasEntregaNum.map(num => DIAS_TODOS[num - 1]);

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

  // Construir columnas: primero semana anterior, luego semana actual
  const cols: ColSpecOC[] = [];

  // Semana anterior
  for (const dia of diasEntregaOrd) {
    const diaNum = DIA_ORDEN[dia];
    const clave = `${diaNum}-prev`;
    cols.push({ tipo: 'entrega', dia, semanaAnterior: true });

    const g = grupos.get(clave);
    if (g) {
      for (const n of g.needNums) {
        const d = DIAS_TODOS[n - 1];
        if (diasConQty.has(d)) cols.push({ tipo: 'cant', dia: d });
      }
    }
  }

  // Semana actual
  for (const dia of diasEntregaOrd) {
    const diaNum = DIA_ORDEN[dia];
    const clave = `${diaNum}-this`;
    cols.push({ tipo: 'entrega', dia });

    const g = grupos.get(clave);
    if (g) {
      for (const n of g.needNums) {
        const d = DIAS_TODOS[n - 1];
        if (diasConQty.has(d)) cols.push({ tipo: 'cant', dia: d });
      }
    }
  }

  return cols;
};
