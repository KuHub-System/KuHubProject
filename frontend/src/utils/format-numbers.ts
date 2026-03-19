/**
 * FORMATEO NUMÉRICO — LOCALIZACIÓN CHILENA (es-CL)
 * Separador decimal: coma  →  1.234,567
 * Separador de miles: punto →  1.234
 */

const CL_FORMATTER_0 = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const CL_FORMATTER_3 = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

/**
 * Formatea una cantidad numérica con locale chileno.
 * - Enteros:    1234   → "1.234"
 * - Decimales:  1234.5 → "1.234,5"   /  0.003 → "0,003"
 * - Max 3 decimales, trailing zeros eliminados.
 */
export const fmtCL = (n: number | null | undefined): string => {
  if (n === null || n === undefined || isNaN(n as number)) return '0';
  const num = n as number;
  return Number.isInteger(num) ? CL_FORMATTER_0.format(num) : CL_FORMATTER_3.format(num);
};
