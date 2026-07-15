/**
 * FERIADOS CHILE
 * Feriados legales fijos + Viernes/Sábado Santo (calculados vía algoritmo de Pascua).
 * Unifica las copias antes duplicadas en solicitud.tsx y gestion-proveedores.tsx.
 */

/** Algoritmo de Meeus/Jones/Butcher para calcular la fecha de Pascua */
export const calcularPascua = (y: number): Date => {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
};

const FERIADOS_FIJOS: [number, number, string][] = [
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
export const nombreFeriadoChile = (dt: Date): string | null => {
  const mm = dt.getMonth() + 1, dd = dt.getDate(), y = dt.getFullYear();
  const fijo = FERIADOS_FIJOS.find(([fm, fd]) => fm === mm && fd === dd);
  if (fijo) return fijo[2];
  const pascua = calcularPascua(y);
  const vs = new Date(pascua); vs.setDate(vs.getDate() - 2);
  const ss = new Date(pascua); ss.setDate(ss.getDate() - 1);
  if (dt.getTime() === vs.getTime()) return 'Viernes Santo';
  if (dt.getTime() === ss.getTime()) return 'Sábado Santo';
  return null;
};

/** true si la fecha es feriado chileno (fijo o Viernes/Sábado Santo). */
export const esFeriadoChile = (d: Date): boolean => nombreFeriadoChile(d) !== null;
