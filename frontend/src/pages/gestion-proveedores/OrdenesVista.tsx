import React from 'react';
import { Card, CardBody, Button, Chip, Select, SelectItem, Checkbox, Tooltip, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { TableSkeleton } from '../../components/SkeletonLoader';
import type { EstadoOrdenPedido, IOrdenPedidoListItem, IOrdenPedidoConDetalles, IEntregaReal } from '../../types/proveedor/proveedor.types';
import { fmtN } from './constants';
import OrdenDetalleTabla from './OrdenDetalleTabla';

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

type OpCelda = { op: IOrdenPedidoListItem; cantidad: number; entregado: boolean; observacion: string | null; idDetalleOrdenPedido: number };
type ProductoTablaFila = { idProducto: number; nombre: string; abrev: string; nombreUnidad: string; nombreCategoria: string; formatoContenido: string | null; porFecha: Map<string, OpCelda[]> };
type ProveedorTablaItem = {
  idProveedor: number; nombreDistribuidora: string; nombreProveedor: string;
  telefonoProveedor?: string | null;
  emailProveedor?: string | null;
  direccionProveedor?: string | null;
  fechas: string[]; semanasDeFechas: Map<string, string>; productos: ProductoTablaFila[];
};

// ── Exportación Excel de orden de pedido por proveedor (replica cabecera del modelo) ──
const generarExcelOrdenPedidoProveedor = async (prov: ProveedorTablaItem, lunesSeleccionado: string): Promise<void> => {
  const fechasSemana = prov.fechas.filter(f => prov.semanasDeFechas.get(f) === lunesSeleccionado);
  if (fechasSemana.length === 0) return;
  const XLSXStyle = (await import('xlsx-js-style')).default;
  const domingo = getDomingoDe(lunesSeleccionado);

  const fmtCorta = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  };
  const fmtArch = (iso: string) => {
    const [, m, d] = iso.split('-').map(Number);
    return `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}`;
  };

  // Columnas (0-based): 0=A margen, 1=B producto, 2=C U/M, 3+i*2=día_i, 3+i*2+1=obs_i
  const N = fechasSemana.length;
  const COL_B = 1, COL_C = 2, COL_D = 3;
  const lastCol = COL_D + N * 2 - 1;
  const colDia = (i: number) => COL_D + i * 2;
  const colObs = (i: number) => COL_D + i * 2 + 1;
  const enc = (r: number, c: number) => XLSXStyle.utils.encode_cell({ r, c });

  const B = { style: 'thin' as const };
  const BM = { style: 'medium' as const };
  const border    = { top: B,  bottom: B,  left: B,  right: B  };
  const borderMed = { top: BM, bottom: BM, left: BM, right: BM };

  // Cabecera unificada (filas con fondo de color y limpias de bordes)
  const sTitulo    = { font: { bold: true, sz: 14, color: { rgb: 'FFFFFFFF' } }, fill: { fgColor: { rgb: '1E3A8A' } }, alignment: { horizontal: 'center' as const, vertical: 'center' as const } };
  const sEmpresa   = { font: { bold: true, sz: 13, color: { rgb: 'FFFFFFFF' } }, fill: { fgColor: { rgb: '2563EB' } }, alignment: { horizontal: 'left' as const, vertical: 'center' as const } };
  const sInfoRow   = { font: { sz: 11 }, fill: { fgColor: { rgb: 'EFF6FF' } }, alignment: { horizontal: 'left' as const, vertical: 'center' as const, wrapText: true } };
  const sSemana    = { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'FEF3C7' } }, alignment: { horizontal: 'left' as const, vertical: 'center' as const } };
  const sTableHeader = { font: { bold: true, sz: 11, color: { rgb: 'FFFFFFFF' } }, fill: { fgColor: { rgb: '1E3A8A' } }, alignment: { horizontal: 'center' as const, vertical: 'center' as const }, border: borderMed };
  const sProducto  = { font: { sz: 11 }, alignment: { horizontal: 'left' as const }, border };
  const sUM        = { font: { sz: 10 }, alignment: { horizontal: 'center' as const }, border };
  const sCantidad  = { font: { bold: true, sz: 11 }, alignment: { horizontal: 'center' as const }, border };
  const sCatHeader = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: 'DBEAFE' } }, alignment: { horizontal: 'left' as const, vertical: 'center' as const }, border };
  const sObservacion = { font: { sz: 9, italic: true }, fill: { fgColor: { rgb: 'F0F9FF' } }, alignment: { horizontal: 'left' as const, vertical: 'top' as const, wrapText: true }, border };

  const ws: Record<string, unknown> = {};

  // ── Cabecera del proveedor (filas unificadas, sin juntas internas) ──

  // r=1  Título
  ws[enc(1, COL_B)] = { v: 'PEDIDO A PROVEEDOR', t: 's', s: sTitulo };

  // r=2  Empresa
  ws[enc(2, COL_B)] = { v: prov.nombreDistribuidora, t: 's', s: sEmpresa };

  // r=3  Dirección
  ws[enc(3, COL_B)] = { v: `Dirección:  ${prov.direccionProveedor || '—'}`, t: 's', s: sInfoRow };

  // r=4  Semana (fila destacada en ámbar)
  ws[enc(4, COL_B)] = { v: `Semana:  ${fmtCorta(lunesSeleccionado)} al ${fmtCorta(domingo)}`, t: 's', s: sSemana };

  // r=5  Contacto · Teléfono · Email
  const contactoNombre = prov.nombreProveedor !== prov.nombreDistribuidora ? prov.nombreProveedor : '';
  const contactLine = [
    contactoNombre ? `Contacto: ${contactoNombre}` : null,
    prov.telefonoProveedor ? `Tel: ${prov.telefonoProveedor}` : null,
    prov.emailProveedor ? `Email: ${prov.emailProveedor}` : null,
  ].filter(Boolean).join('    |    ');
  ws[enc(5, COL_B)] = { v: contactLine, t: 's', s: sInfoRow };

  // r=7  Cabeceras de tabla
  ws[enc(7, COL_B)] = { v: 'PRODUCTO', t: 's', s: sTableHeader };
  ws[enc(7, COL_C)] = { v: 'U/M', t: 's', s: sTableHeader };
  fechasSemana.forEach((fecha, i) => {
    const [y, m, d] = fecha.split('-').map(Number);
    ws[enc(7, colDia(i))] = { v: `${NOM_DIA_ES[new Date(y, m - 1, d).getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`, t: 's', s: sTableHeader };
    ws[enc(7, colObs(i))] = { v: 'OBSERVACIONES', t: 's', s: sTableHeader };
  });

  // Merges (cabecera fija + categorías que se añaden en el loop)
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [
    { s: { r: 1, c: COL_B }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: COL_B }, e: { r: 2, c: lastCol } },
    { s: { r: 3, c: COL_B }, e: { r: 3, c: lastCol } },
    { s: { r: 4, c: COL_B }, e: { r: 4, c: lastCol } },
    { s: { r: 5, c: COL_B }, e: { r: 5, c: lastCol } },
  ];

  // Filas de datos agrupadas por categoría
  let currentRow = 8;
  let prevCat = '';
  prov.productos.forEach((prod) => {
    if (prod.nombreCategoria !== prevCat) {
      ws[enc(currentRow, COL_B)] = { v: prod.nombreCategoria || 'Sin categoría', t: 's', s: sCatHeader };
      merges.push({ s: { r: currentRow, c: COL_B }, e: { r: currentRow, c: lastCol } });
      prevCat = prod.nombreCategoria;
      currentRow++;
    }
    ws[enc(currentRow, COL_B)] = { v: prod.nombre, t: 's', s: sProducto };
    ws[enc(currentRow, COL_C)] = { v: prod.nombreUnidad, t: 's', s: sUM };
    fechasSemana.forEach((fecha, i) => {
      const items = prod.porFecha.get(fecha);
      const total = items ? items.reduce((s, it) => s + it.cantidad, 0) : null;
      ws[enc(currentRow, colDia(i))] = total !== null
        ? { v: total.toLocaleString('es-CL', { maximumFractionDigits: 3 }), t: 's', s: sCantidad }
        : { v: '', t: 's', s: sUM };
      // Observaciones: concatenar porciones de todas las OPs para este producto+fecha
      const obs = items
        ? items.map(it => it.observacion).filter((o): o is string => !!o).join(' | ')
        : '';
      ws[enc(currentRow, colObs(i))] = { v: obs, t: 's', s: sObservacion };
    });
    currentRow++;
  });

  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 4 }, { wch: 32 }, { wch: 14 }, ...fechasSemana.flatMap(() => [{ wch: 14 }, { wch: 28 }])];
  ws['!rows'] = [{ hpt: 4 }, { hpt: 30 }, { hpt: 22 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 8 }, { hpt: 22 }];
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow - 1, c: lastCol } });

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
  canCancelar: boolean;
  canExportExcel: boolean;
  canVerPendienteEnviada: boolean;
  canVerConfirmada: boolean;
}

const OrdenesVista: React.FC<OrdenesVistaProps> = ({
  lista, cargando, error, expandidosIds, detalles, cargandoDetalleIds,
  cambiandoEstadoId, onToggle, onRecargar, onCambiarEstado, onConfirmCancelar,
  rango, onRangoChange, onCargarDetallesBulk,
  canCancelar, canExportExcel,
  canVerPendienteEnviada, canVerConfirmada,
}) => {
  const initialEstado = canVerPendienteEnviada ? 'PENDIENTE' : canVerConfirmada ? 'CONFIRMADA' : 'CANCELADA';
  const [filtroEstado, setFiltroEstado] = React.useState<EstadoOrdenPedido>(initialEstado as EstadoOrdenPedido);
  const [agruparPorPedido, setAgruparPorPedido] = React.useState(false);
  const [agruparPorFechaReal, setAgruparPorFechaReal] = React.useState(false);
  const [modoUnificada, setModoUnificada] = React.useState(false);
  const [mostrarEntregados, setMostrarEntregados] = React.useState(true);
  const [weekPickerOpenId, setWeekPickerOpenId] = React.useState<number | null>(null);

  const fmtFecha = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const fmtDatetime = (iso: string) => {
    const dt = new Date(iso);
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
  };

  // Estados que este rol puede ver según sus permisos de sub-vista.
  const estadosPermitidos = React.useMemo<EstadoOrdenPedido[]>(() =>
    ESTADO_OP_ORDEN.filter(e => {
      if (e === 'PENDIENTE' || e === 'ENVIADA') return canVerPendienteEnviada;
      if (e === 'CONFIRMADA' || e === 'RECIBIDA') return canVerConfirmada;
      return true; // CANCELADA siempre visible
    }),
    [canVerPendienteEnviada, canVerConfirmada],
  );

  // Auto-switch si el estado activo ya no está en la lista permitida.
  React.useEffect(() => {
    if (estadosPermitidos.length > 0 && !estadosPermitidos.includes(filtroEstado)) {
      setFiltroEstado(estadosPermitidos[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadosPermitidos]);

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
      telefonoProveedor: string | null; emailProveedor: string | null; direccionProveedor: string | null;
      todasLasFechas: Set<string>; productos: Map<number, ProductoTablaFila>;
    }>();
    for (const op of listaOrdenada) {
      const det = detalles.get(op.idOrdenPedido);
      if (!det) continue;
      if (!grupos.has(op.idProveedor)) {
        grupos.set(op.idProveedor, {
          idProveedor: op.idProveedor, nombreDistribuidora: op.nombreDistribuidora,
          nombreProveedor: op.nombreProveedor, telefonoProveedor: det.telefonoProveedor ?? null,
          emailProveedor: det.emailProveedor ?? null, direccionProveedor: det.direccionProveedor ?? null,
          todasLasFechas: new Set(), productos: new Map(),
        });
      }
      const grupo = grupos.get(op.idProveedor)!;
      for (const d of det.detalles) {
        grupo.todasLasFechas.add(d.fechaEntrega);
        if (!grupo.productos.has(d.idProducto)) {
          grupo.productos.set(d.idProducto, { idProducto: d.idProducto, nombre: d.nombreProducto, abrev: d.abreviatura, nombreUnidad: d.nombreUnidad ?? d.abreviatura, nombreCategoria: d.nombreCategoria ?? '', formatoContenido: d.formatoContenido ?? null, porFecha: new Map() });
        }
        const prod = grupo.productos.get(d.idProducto)!;
        if (!prod.porFecha.has(d.fechaEntrega)) prod.porFecha.set(d.fechaEntrega, []);
        prod.porFecha.get(d.fechaEntrega)!.push({ op, cantidad: d.cantidadSolicitada, entregado: d.entregado, observacion: d.observacion ?? null, idDetalleOrdenPedido: d.idDetalleOrdenPedido });
      }
    }
    return [...grupos.values()]
      .sort((a, b) => a.nombreDistribuidora.localeCompare(b.nombreDistribuidora))
      .map(g => ({
        idProveedor: g.idProveedor, nombreDistribuidora: g.nombreDistribuidora, nombreProveedor: g.nombreProveedor,
        telefonoProveedor: g.telefonoProveedor, emailProveedor: g.emailProveedor, direccionProveedor: g.direccionProveedor,
        fechas: [...g.todasLasFechas].sort(),
        semanasDeFechas: new Map([...g.todasLasFechas].map(f => [f, getLunesDe(f)])),
        productos: [...g.productos.values()].sort((a, b) => {
          const cat = a.nombreCategoria.localeCompare(b.nombreCategoria);
          return cat !== 0 ? cat : a.nombre.localeCompare(b.nombre);
        }),
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
      const rowMap = new Map<string, { idOP: number; idProducto: number; nombre: string; abrev: string; nombreCategoria: string; formatoContenido: string | null; porFecha: Map<string, { cantidad: number; entregado: boolean; idDetalleOrdenPedido: number }> }>();
      for (const prod of prov.productos) {
        for (const [fecha, items] of prod.porFecha) {
          for (const { op, cantidad, entregado, idDetalleOrdenPedido } of items) {
            const key = `${prod.idProducto}-${op.idOrdenPedido}`;
            if (!rowMap.has(key)) rowMap.set(key, { idOP: op.idOrdenPedido, idProducto: prod.idProducto, nombre: prod.nombre, abrev: prod.abrev, nombreCategoria: prod.nombreCategoria, formatoContenido: prod.formatoContenido, porFecha: new Map() });
            rowMap.get(key)!.porFecha.set(fecha, { cantidad, entregado, idDetalleOrdenPedido });
          }
        }
      }
      return {
        idProveedor: prov.idProveedor,
        rows: [...rowMap.values()].sort((a, b) => {
          const cat = a.nombreCategoria.localeCompare(b.nombreCategoria);
          if (cat !== 0) return cat;
          const n = a.nombre.localeCompare(b.nombre);
          return n !== 0 ? n : a.idOP - b.idOP;
        }),
      };
    });
  }, [agrupadoFechaReal, modoUnificada]);

  // Mapa global idDetalleOrdenPedido → entrega real, a partir de todos los detalles cargados.
  // Permite mostrar lo verdaderamente ingresado por celda exacta en la vista agrupada por OP.
  const realPorDetalle = React.useMemo(() => {
    const map = new Map<number, IEntregaReal>();
    for (const det of detalles.values()) {
      for (const er of det.entregasReales ?? []) map.set(er.idDetalleOrdenPedido, er);
    }
    return map;
  }, [detalles]);

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
          {TRANSICIONES_OP[op.estadoOrdenPedido].map(t => {
            // Determinar permiso por transición:
            // • ENVIADA↔CONFIRMADA usan GPRV_CONFIRMADA
            // • El resto (PENDIENTE↔ENVIADA, CANCELADA→PENDIENTE) usan GPRV_PENDIENTE_ENVIADA
            const canDo = (t.estado === 'CONFIRMADA' || op.estadoOrdenPedido === 'CONFIRMADA')
              ? canVerConfirmada
              : canVerPendienteEnviada;
            return (
              <Tooltip
                key={t.estado}
                content={canDo ? t.label : 'Sin permiso'}
                placement="top"
              >
                <Button
                  isIconOnly
                  size="sm"
                  color={canDo ? t.color : 'default'}
                  variant="flat"
                  isLoading={canDo && cambiandoEstadoId === op.idOrdenPedido}
                  isDisabled={!canDo || cambiandoEstadoId !== null}
                  className={!canDo ? 'opacity-40 cursor-not-allowed' : ''}
                  onPress={() => canDo && onCambiarEstado(op.idOrdenPedido, t.estado)}
                >
                  <Icon icon={t.icon} width={14} />
                </Button>
              </Tooltip>
            );
          })}
          {canCancelar && (['PENDIENTE', 'ENVIADA', 'CONFIRMADA'] as EstadoOrdenPedido[]).includes(op.estadoOrdenPedido) && (
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
                <OrdenDetalleTabla detalle={detalles.get(op.idOrdenPedido)!} mostrarEntregados={mostrarEntregados} />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (cargando) {
    return <TableSkeleton rows={8} columns={[
      { width: 'w-16', shape: 'text' },
      { width: 'flex-1', shape: 'avatar-text' },
      { width: 'w-32', shape: 'text' },
      { width: 'w-24', shape: 'chip' },
      { width: 'w-20', shape: 'icons' },
    ]} />;
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
          {estadosPermitidos.map(e => {
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
            <Checkbox
              size="sm"
              isSelected={mostrarEntregados}
              onValueChange={setMostrarEntregados}
              classNames={{ label: 'text-xs text-default-600 whitespace-nowrap' }}
            >
              Entregados
            </Checkbox>
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
                        {modoUnificada && canExportExcel && (
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
                              <th rowSpan={2} className="text-center py-2 px-2 bg-secondary-50 dark:bg-secondary-900/30 border-r border-secondary-300 dark:border-secondary-600 w-24 min-w-[96px] font-medium whitespace-nowrap">Formato</th>
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
                                <th className="text-center py-2 px-2 bg-secondary-50 dark:bg-secondary-900/30 border-r border-secondary-300 dark:border-secondary-600 w-24 min-w-[96px] font-medium whitespace-nowrap">Formato</th>
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
                            // ── Detallada: una fila por (producto × OP), agrupada por categoría ──
                            (detalladaTabla?.find(d => d.idProveedor === prov.idProveedor)?.rows ?? []).map((row, rowIdx, allRows) => {
                              const isNewCat = rowIdx === 0 || allRows[rowIdx - 1].nombreCategoria !== row.nombreCategoria;
                              const isOdd = rowIdx % 2 !== 0;
                              const bgSticky = isOdd ? 'bg-secondary-50/80 dark:bg-secondary-900/20' : 'bg-white dark:bg-default-900';
                              const bgRow   = isOdd ? 'bg-secondary-50/40 dark:bg-secondary-900/10' : '';
                              return (
                                <React.Fragment key={`${row.idProducto}-${row.idOP}`}>
                                  {isNewCat && (
                                    <tr>
                                      <td colSpan={3 + prov.fechas.length} className="py-1 px-3 bg-secondary-100/70 dark:bg-secondary-800/30 text-secondary-700 dark:text-secondary-300 text-[10px] font-bold uppercase tracking-wide border-t-2 border-secondary-300 dark:border-secondary-600">
                                        <span className="flex items-center gap-1.5">
                                          <Icon icon="lucide:tag" width={10} />
                                          {row.nombreCategoria}
                                        </span>
                                      </td>
                                    </tr>
                                  )}
                                  <tr className={`${bgRow} hover:bg-secondary-50/70 dark:hover:bg-secondary-900/20 transition-colors`}>
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
                                    {/* Formato contenido */}
                                    <td className="py-2 px-2 text-center text-default-400 text-[11px] border-r border-default-100 dark:border-default-100/20 whitespace-nowrap">
                                      {row.formatoContenido ?? '—'}
                                    </td>
                                    {/* Celdas por fecha — solo cantidad */}
                                    {prov.fechas.map((fecha, idx) => {
                                      const lunesActual = prov.semanasDeFechas.get(fecha)!;
                                      const esNuevaSemana = idx > 0 && prov.semanasDeFechas.get(prov.fechas[idx - 1]) !== lunesActual;
                                      const borde = esNuevaSemana ? 'border-l-2 border-secondary-400 dark:border-secondary-500' : 'border-l border-default-100 dark:border-default-100/20';
                                      const cell = row.porFecha.get(fecha);
                                      if (!cell) return <td key={fecha} className={`py-2 px-3 text-center text-default-300 text-xs ${borde}`}>—</td>;
                                      const erReal = realPorDetalle.get(cell.idDetalleOrdenPedido);
                                      const matchR = erReal && Math.abs(erReal.cantidadEntregada - cell.cantidad) < 0.001;
                                      const shortR = erReal && erReal.cantidadEntregada < cell.cantidad - 0.001;
                                      return (
                                        <td key={fecha} className={`py-2 px-3 text-center font-semibold text-default-700 dark:text-default-200 text-xs ${borde}`}>
                                          <div className="flex items-center justify-center gap-1">
                                            {fmtN(cell.cantidad)}
                                            {mostrarEntregados && cell.entregado && <Icon icon="lucide:check-circle-2" width={11} className="text-success shrink-0" />}
                                          </div>
                                          {erReal && (
                                            <Tooltip content={`Real ingresado: ${fmtN(erReal.cantidadEntregada)} (${erReal.destino === 'INVENTARIO' ? 'Inventario' : 'Bodega'})`} placement="top" color="default">
                                              <div className={`flex items-center justify-center gap-0.5 text-[10px] mt-0.5 font-bold ${matchR ? 'text-success-600 dark:text-success-400' : shortR ? 'text-warning-600 dark:text-warning-400' : 'text-primary-600 dark:text-primary-400'}`}>
                                                <Icon icon={erReal.destino === 'INVENTARIO' ? 'lucide:package' : 'lucide:warehouse'} width={9} className="shrink-0" />
                                                {fmtN(erReal.cantidadEntregada)}
                                              </div>
                                            </Tooltip>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </React.Fragment>
                              );
                            })
                          ) : (
                            // ── Unificada: una fila por producto, agrupada por categoría ──
                            prov.productos.map((prod, rowIdx, allProds) => {
                              const isNewCat = rowIdx === 0 || allProds[rowIdx - 1].nombreCategoria !== prod.nombreCategoria;
                              const isOdd = rowIdx % 2 !== 0;
                              const bgSticky = isOdd ? 'bg-success-50/70 dark:bg-success-900/15' : 'bg-white dark:bg-default-900';
                              const bgRow   = isOdd ? 'bg-success-50/25 dark:bg-success-900/8' : '';
                              return (
                                <React.Fragment key={prod.idProducto}>
                                  {isNewCat && (
                                    <tr>
                                      <td colSpan={3 + prov.fechas.length} className="py-1 px-3 bg-success-100/60 dark:bg-success-800/25 text-success-700 dark:text-success-300 text-[10px] font-bold uppercase tracking-wide border-t-2 border-success-300 dark:border-success-600">
                                        <span className="flex items-center gap-1.5">
                                          <Icon icon="lucide:tag" width={10} />
                                          {prod.nombreCategoria}
                                        </span>
                                      </td>
                                    </tr>
                                  )}
                                  <tr className={`${bgRow} hover:bg-success-50/50 dark:hover:bg-success-900/15 transition-colors`}>
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
                                    {/* Formato contenido */}
                                    <td className="py-2 px-2 text-center text-default-400 text-[11px] border-r border-default-100 dark:border-default-100/20 whitespace-nowrap">
                                      {prod.formatoContenido ?? '—'}
                                    </td>
                                    {/* Celdas por fecha — total sumado */}
                                    {prov.fechas.map((fecha, idx) => {
                                      const lunesActual = prov.semanasDeFechas.get(fecha)!;
                                      const esNuevaSemana = idx > 0 && prov.semanasDeFechas.get(prov.fechas[idx - 1]) !== lunesActual;
                                      const borde = esNuevaSemana ? 'border-l-2 border-secondary-400 dark:border-secondary-500' : 'border-l border-default-100 dark:border-default-100/20';
                                      const items = prod.porFecha.get(fecha);
                                      if (!items || items.length === 0) return <td key={fecha} className={`py-2 px-3 text-center text-default-300 text-xs ${borde}`}>—</td>;
                                      const total = items.reduce((s, it) => s + it.cantidad, 0);
                                      const todosEntregados = items.every(it => it.entregado);
                                      // Real: suma de las entregas reales de los detalles que caen en esta celda
                                      const realesCelda = items
                                        .map(it => realPorDetalle.get(it.idDetalleOrdenPedido))
                                        .filter((er): er is IEntregaReal => er != null);
                                      const totalReal = realesCelda.reduce((s, er) => s + er.cantidadEntregada, 0);
                                      const destinoCelda = realesCelda[0]?.destino;
                                      const matchR = realesCelda.length > 0 && Math.abs(totalReal - total) < 0.001;
                                      const shortR = realesCelda.length > 0 && totalReal < total - 0.001;
                                      return (
                                        <td key={fecha} className={`py-2 px-3 text-center font-bold text-success-700 dark:text-success-300 text-xs ${borde}`}>
                                          <div className="flex items-center justify-center gap-1">
                                            {fmtN(total)}
                                            {mostrarEntregados && todosEntregados && <Icon icon="lucide:check-circle-2" width={11} className="text-success shrink-0" />}
                                          </div>
                                          {realesCelda.length > 0 && (
                                            <Tooltip content={`Real ingresado: ${fmtN(totalReal)}${destinoCelda ? ` (${destinoCelda === 'INVENTARIO' ? 'Inventario' : 'Bodega'})` : ''}`} placement="top" color="default">
                                              <div className={`flex items-center justify-center gap-0.5 text-[10px] mt-0.5 font-bold ${matchR ? 'text-success-600 dark:text-success-400' : shortR ? 'text-warning-600 dark:text-warning-400' : 'text-primary-600 dark:text-primary-400'}`}>
                                                {destinoCelda && <Icon icon={destinoCelda === 'INVENTARIO' ? 'lucide:package' : 'lucide:warehouse'} width={9} className="shrink-0" />}
                                                {fmtN(totalReal)}
                                              </div>
                                            </Tooltip>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </React.Fragment>
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

export default OrdenesVista;
