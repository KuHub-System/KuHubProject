/**
 * CONGLOMERADO DE PEDIDOS
 * Visualiza el pedido consolidado semanal distribuido por día y bloque horario.
 * Muestra solicitudes en estado PROCESADA listas para despacho desde Bodega de Tránsito.
 */

import React from 'react';
import XLSXStyle from 'xlsx-js-style';
import {
  Button,
  Card, CardBody, CardHeader,
  Input, Chip,
  Select, SelectItem,
  Divider, Spinner, Tooltip
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../hooks/useToast';
import { ISemana } from '../types/semana.types';
import {
  IPeriodoAcademico,
  obtenerPeriodosAcademicosService,
  obtenerSemanasPorPeriodoService,
  detectarPeriodoActual,
  encontrarSemanaActual,
} from '../services/semana-service';
import {
  IConsolidatePedidoResponse,
  ISolicitudVinculada,
  consolidatePedidoQueryService,
  aprobarPedidosService,
} from '../services/solicitud-service';
import { useModulePermission, usePermission } from '../contexts/permission-context';
import { useHistory } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

interface IGrupoDia {
  fecha: string;
  diaSemana: number;
  solicitudes: ISolicitudVinculada[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES UI
// ─────────────────────────────────────────────────────────────────────────────

const DIA_CONFIG: Record<number, { nombre: string; header: string; badge: string; text: string; border: string }> = {
  0: { nombre: 'Domingo',   header: 'bg-default-100',   badge: 'bg-default-200',   text: 'text-default-700',   border: 'border-default-300'   },
  1: { nombre: 'Lunes',     header: 'bg-primary-50',    badge: 'bg-primary-100',   text: 'text-primary-700',   border: 'border-primary-200'   },
  2: { nombre: 'Martes',    header: 'bg-secondary-50',  badge: 'bg-secondary-100', text: 'text-secondary-700', border: 'border-secondary-200' },
  3: { nombre: 'Miércoles', header: 'bg-success-50',    badge: 'bg-success-100',   text: 'text-success-700',   border: 'border-success-200'   },
  4: { nombre: 'Jueves',    header: 'bg-warning-50',    badge: 'bg-warning-100',   text: 'text-warning-700',   border: 'border-warning-200'   },
  5: { nombre: 'Viernes',   header: 'bg-danger-50',     badge: 'bg-danger-100',    text: 'text-danger-600',    border: 'border-danger-200'    },
  6: { nombre: 'Sábado',    header: 'bg-default-100',   badge: 'bg-default-200',   text: 'text-default-700',   border: 'border-default-300'   },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtFechaLarga = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

const fmtFechaCorta = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

const isHoy = (iso: string) => iso === new Date().toISOString().slice(0, 10);

const getDiaSemana = (iso: string) => new Date(iso + 'T00:00:00').getDay();

/** Parses "08:01-09:20" or "08:01 - 09:20" → { inicio, fin } */
const parseRango = (rango: string) => {
  const m = rango.match(/^(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
  if (m) return { inicio: m[1], fin: m[2] };
  return { inicio: rango, fin: '' };
};

/** Formatea una cantidad numérica con locale chileno (es-CL): separador decimal coma, miles punto. */
const fmtCant = (n: number): string => {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n);
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

const ConglomeradoPedidosPage: React.FC = () => {
  usePageTitle('Conglomerado de Pedidos', 'Seguimiento y estado de los pedidos semanales generados a partir de solicitudes aceptadas.', 'lucide:layers');
  const toast = useToast();
  const { canCreate: cong_Crear, canUpdate: cong_Editar, canDelete: cong_Eliminar } = useModulePermission('CONGLOMERADO_PEDIDOS');
  const { isAdmin } = usePermission();
  const history = useHistory();

  // ── Semanas ──
  const [periodos,        setPeriodos]        = React.useState<IPeriodoAcademico[]>([]);
  const [semanas,         setSemanas]         = React.useState<ISemana[]>([]);
  const [semanaId,        setSemanaId]        = React.useState<string>('');
  const [defaultSemanaId, setDefaultSemanaId] = React.useState<string>('');
  const [isLoadingSem,    setIsLoadingSem]    = React.useState(true);

  // ── Datos ──
  const [consolidateData, setConsolidateData] = React.useState<IConsolidatePedidoResponse | null>(null);
  const [isLoadingDatos,  setIsLoadingDatos]  = React.useState(false);

  // ── Cache por semanaId ──
  const cache = React.useRef<Map<string, IConsolidatePedidoResponse>>(new Map());

  // ── UI ──
  const [busqueda,      setBusqueda]      = React.useState('');
  const [busquedaCrono, setBusquedaCrono] = React.useState('');
  const [busquedaAprob, setBusquedaAprob] = React.useState('');
  const [expandidos,    setExpandidos]    = React.useState<Set<string>>(new Set());
  const [vistaActiva,   setVistaActiva]   = React.useState<'categorias' | 'cronograma' | 'totales' | 'aprobacion'>('cronograma');
  const [aprobVista,    setAprobVista]    = React.useState<'unificado' | 'individual'>('unificado');
  const [isAprobando,   setIsAprobando]   = React.useState(false);
  const [diaCategoria,  setDiaCategoria]  = React.useState<number | 'completa'>(1);
  const [conColores,    setConColores]    = React.useState(true);

  // ── Carga inicial de semanas ──
  React.useEffect(() => {
    const init = async () => {
      setIsLoadingSem(true);
      try {
        const periodosData = await obtenerPeriodosAcademicosService();
        setPeriodos(periodosData);
        const { anio, semestre } = detectarPeriodoActual();
        const intentos = [{ anio, semestre }, { anio, semestre: semestre === 1 ? 2 : 1 }];
        let cargadas: ISemana[] = [];
        for (const intento of intentos) {
          if (!periodosData.some(p => p.anio === intento.anio && p.semestres.includes(intento.semestre))) continue;
          try { cargadas = await obtenerSemanasPorPeriodoService(intento.anio, intento.semestre); if (cargadas.length > 0) break; } catch { /* */ }
        }
        if (cargadas.length === 0 && periodosData.length > 0) {
          const p = periodosData[0];
          cargadas = await obtenerSemanasPorPeriodoService(p.anio, p.semestres[0]).catch(() => []);
        }
        setSemanas(cargadas);
        const actual = encontrarSemanaActual(cargadas);
        setDefaultSemanaId(actual ? String(actual.idSemana) : '');
        setSemanaId(actual ? String(actual.idSemana) : cargadas.length > 0 ? String(cargadas[0].idSemana) : '');
      } catch { toast.error('Error al cargar las semanas'); }
      finally { setIsLoadingSem(false); }
    };
    init();
  }, []);

  const handlePeriodoChange = async (anio: number, semestre: number) => {
    setIsLoadingSem(true); setConsolidateData(null); setSemanaId('');
    try {
      const data = await obtenerSemanasPorPeriodoService(anio, semestre);
      setSemanas(data);
      const actual = encontrarSemanaActual(data);
      setDefaultSemanaId(actual ? String(actual.idSemana) : '');
      if (data.length > 0) setSemanaId(actual ? String(actual.idSemana) : String(data[0].idSemana));
    } catch { toast.error('Error al cargar semanas del período'); }
    finally { setIsLoadingSem(false); }
  };

  // ── Carga de datos al cambiar semana (con cache) ──
  React.useEffect(() => {
    if (!semanaId) { setConsolidateData(null); return; }

    if (cache.current.has(semanaId)) {
      setConsolidateData(cache.current.get(semanaId)!);
      setExpandidos(new Set());
      setBusqueda('');
      return;
    }

    const semana = semanas.find(s => String(s.idSemana) === semanaId);
    if (!semana) return;

    setIsLoadingDatos(true);
    setExpandidos(new Set());
    setBusqueda('');
    setBusquedaCrono('');
    setBusquedaAprob('');

    consolidatePedidoQueryService({ fechaInicio: semana.fechaInicio, fechaFin: semana.fechaFin })
      .then(data => {
        cache.current.set(semanaId, data);
        setConsolidateData(data);
      })
      .catch(() => toast.error('Error al cargar el conglomerado de pedidos'))
      .finally(() => setIsLoadingDatos(false));
  }, [semanaId, semanas]);

  // ── Derivados ──
  const todasSolicitudes = React.useMemo(
    () => consolidateData?.pedidosCompletos.flatMap(p => p.solicitudesVinculadas) ?? [],
    [consolidateData]
  );

  const gruposDia = React.useMemo((): IGrupoDia[] => {
    const mapa = new Map<string, ISolicitudVinculada[]>();
    for (const sol of todasSolicitudes) {
      if (!mapa.has(sol.fechaSolicitada)) mapa.set(sol.fechaSolicitada, []);
      mapa.get(sol.fechaSolicitada)!.push(sol);
    }
    return Array.from(mapa.entries())
      .map(([fecha, sols]) => ({
        fecha,
        diaSemana: getDiaSemana(fecha),
        solicitudes: sols.sort((a, b) => a.horarios.rangoHoras.localeCompare(b.horarios.rangoHoras)),
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [todasSolicitudes]);

  // Merge products across multiple pedidos (same product may appear in different pedidos)
  const productosResumen = React.useMemo(() => {
    const mapa = new Map<string, import('../services/solicitud-service').IProductoResumen>();
    for (const pedido of (consolidateData?.pedidosResumen ?? [])) {
      for (const prod of pedido.productosConsolidados) {
        const key = `${prod.nombreProducto}||${prod.abreviatura}`;
        if (mapa.has(key)) {
          const e = mapa.get(key)!;
          e.cantidadTotal += prod.cantidadTotal;
          e.totalSecciones += prod.totalSecciones;
          e.detalles = [...e.detalles, ...prod.detalles];
        } else {
          mapa.set(key, { ...prod, detalles: [...prod.detalles] });
        }
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.nombreProducto.localeCompare(b.nombreProducto));
  }, [consolidateData]);

  const productosFiltrados = React.useMemo(() => {
    if (!busqueda.trim()) return productosResumen;
    const q = busqueda.toLowerCase();
    return productosResumen.filter(p => p.nombreProducto.toLowerCase().includes(q));
  }, [productosResumen, busqueda]);

  const gruposDiaFiltrados = React.useMemo(() => {
    if (!busquedaCrono.trim()) return gruposDia;
    const q = busquedaCrono.toLowerCase();
    return gruposDia.map(g => ({
      ...g,
      solicitudes: g.solicitudes.filter(s =>
        s.nombreReceta.toLowerCase().includes(q) ||
        (s.seccion.nombreDocente ?? '').toLowerCase().includes(q) ||
        (s.seccion.nombreSeccion ?? '').toLowerCase().includes(q) ||
        s.productosSolicitados.some(p => p.nombreProducto.toLowerCase().includes(q))
      ),
    })).filter(g => g.solicitudes.length > 0);
  }, [gruposDia, busquedaCrono]);

  const pedidosAprobFiltrados = React.useMemo(() => {
    if (!busquedaAprob.trim()) return consolidateData?.pedidosAprobacion ?? [];
    const q = busquedaAprob.toLowerCase();
    return (consolidateData?.pedidosAprobacion ?? [])
      .map(ped => ({ ...ped, productos: ped.productos.filter(p => p.nombreProducto.toLowerCase().includes(q)) }))
      .filter(ped => ped.productos.length > 0);
  }, [consolidateData, busquedaAprob]);

  // Productos unificados a través de todos los pedidos de aprobación
  const productosUnificadosAprob = React.useMemo(() => {
    interface ProdUnif { nombreProducto: string; abreviatura: string; categoria?: string; cantidadTotal: number; stockBodegaTransito: number; stockInventarioPrincipal: number; }
    const mapa = new Map<string, ProdUnif>();
    for (const ped of (consolidateData?.pedidosAprobacion ?? [])) {
      for (const p of ped.productos) {
        const key = p.nombreProducto;
        if (mapa.has(key)) {
          mapa.get(key)!.cantidadTotal += p.cantidadPedido;
        } else {
          mapa.set(key, { nombreProducto: p.nombreProducto, abreviatura: p.abreviatura, categoria: p.categoria, cantidadTotal: p.cantidadPedido, stockBodegaTransito: p.stockBodegaTransito, stockInventarioPrincipal: p.stockInventarioPrincipal });
        }
      }
    }
    return Array.from(mapa.values())
      .map(p => ({ ...p, diferenciaTransito: p.stockBodegaTransito - p.cantidadTotal }))
      .sort((a, b) => a.nombreProducto.localeCompare(b.nombreProducto));
  }, [consolidateData]);

  const productosUnificadosFiltrados = React.useMemo(() => {
    if (!busquedaAprob.trim()) return productosUnificadosAprob;
    const q = busquedaAprob.toLowerCase();
    return productosUnificadosAprob.filter(p => p.nombreProducto.toLowerCase().includes(q));
  }, [productosUnificadosAprob, busquedaAprob]);

  // ── Paleta de colores para secciones (vista categorías) ──
  const SECCION_COLORS = ['#dbeafe','#dcfce7','#fef9c3','#fce7f3','#f3e8ff','#ffedd5','#ccfbf1','#cffafe','#ecfccb','#ffe4e6','#e0e7ff','#fef2f2'];

  const productosParaCategorias = React.useMemo(() => {
    interface ProdCat {
      idProducto: number;
      nombreProducto: string;
      idCategoria: number;
      nombreCategoria: string;
      abreviatura: string;
      detalles: Array<{ diaSemana: number; nombreSeccion: string; nombreAsignatura: string; cantidad: number; }>;
    }
    const prodMap = new Map<number, ProdCat>();
    for (const pedido of (consolidateData?.pedidosCompletos ?? [])) {
      for (const prod of pedido.productos) {
        if (!prodMap.has(prod.idProducto)) {
          prodMap.set(prod.idProducto, {
            idProducto: prod.idProducto,
            nombreProducto: prod.nombreProducto,
            idCategoria: prod.idCategoria ?? 0,
            nombreCategoria: prod.nombreCategoria ?? 'Sin categoría',
            abreviatura: prod.abreviatura,
            detalles: [],
          });
        }
        const entry = prodMap.get(prod.idProducto)!;
        for (const det of prod.detallesPorSolicitud) {
          entry.detalles.push({
            diaSemana: getDiaSemana(det.fechaSolicitada),
            nombreSeccion: det.nombreSeccion,
            nombreAsignatura: det.nombreAsignatura,
            cantidad: det.cantidad,
          });
        }
      }
    }
    return Array.from(prodMap.values()).sort((a, b) => {
      const c = a.nombreCategoria.localeCompare(b.nombreCategoria);
      return c !== 0 ? c : a.nombreProducto.localeCompare(b.nombreProducto);
    });
  }, [consolidateData]);

  // clave: "nombreAsignatura::nombreSeccion" → color único por asignatura+sección
  const seccionColorMap = React.useMemo(() => {
    const keys = new Set<string>();
    for (const p of productosParaCategorias) {
      for (const d of p.detalles) keys.add(`${d.nombreAsignatura}::${d.nombreSeccion}`);
    }
    const map = new Map<string, string>();
    Array.from(keys).sort().forEach((key, i) => {
      map.set(key, SECCION_COLORS[i % SECCION_COLORS.length]);
    });
    return map;
  }, [productosParaCategorias]);

  // Categorías únicas con sus productos (usadas en ambas sub-vistas)
  const categoriasPorDia = React.useMemo(() => {
    interface ProdFiltrado {
      idProducto: number;
      nombreProducto: string;
      abreviatura: string;
      detallesFiltrados: Array<{ nombreSeccion: string; nombreAsignatura: string; cantidad: number; }>;
      totalDia: number;
    }
    interface CatGroup { idCategoria: number; nombreCategoria: string; productos: ProdFiltrado[]; }

    const catMap = new Map<number, CatGroup>();
    for (const prod of productosParaCategorias) {
      const detallesFiltrados = diaCategoria === 'completa'
        ? prod.detalles.map(d => ({ nombreSeccion: d.nombreSeccion, nombreAsignatura: d.nombreAsignatura, cantidad: d.cantidad }))
        : prod.detalles.filter(d => d.diaSemana === diaCategoria).map(d => ({ nombreSeccion: d.nombreSeccion, nombreAsignatura: d.nombreAsignatura, cantidad: d.cantidad }));
      if (detallesFiltrados.length === 0) continue;
      const totalDia = detallesFiltrados.reduce((s, d) => s + d.cantidad, 0);
      if (!catMap.has(prod.idCategoria)) {
        catMap.set(prod.idCategoria, { idCategoria: prod.idCategoria, nombreCategoria: prod.nombreCategoria, productos: [] });
      }
      catMap.get(prod.idCategoria)!.productos.push({ idProducto: prod.idProducto, nombreProducto: prod.nombreProducto, abreviatura: prod.abreviatura, detallesFiltrados, totalDia });
    }
    return Array.from(catMap.values()).sort((a, b) => a.nombreCategoria.localeCompare(b.nombreCategoria));
  }, [productosParaCategorias, diaCategoria]);

  // Para Vista Completa: matriz [idProducto][diaSemana] → { total, secciones[] }
  const matrizCompleta = React.useMemo(() => {
    const dias = [1, 2, 3, 4, 5, 6, 0]; // Lun → Dom
    interface CellData { total: number; secciones: Array<{ compositeKey: string; nombre: string; cantidad: number; }>; }
    interface FilaMatrix {
      idProducto: number;
      nombreProducto: string;
      idCategoria: number;
      nombreCategoria: string;
      abreviatura: string;
      diasData: Record<number, CellData>;
      totalSemana: number;
    }
    const rows: FilaMatrix[] = productosParaCategorias.map(prod => {
      const diasData: Record<number, CellData> = {};
      for (const dia of dias) {
        const detallesDia = prod.detalles.filter(d => d.diaSemana === dia);
        if (detallesDia.length > 0) {
          const secMap = new Map<string, number>();
          for (const d of detallesDia) {
            const key = `${d.nombreAsignatura}::${d.nombreSeccion}`;
            secMap.set(key, (secMap.get(key) ?? 0) + d.cantidad);
          }
          diasData[dia] = {
            total: detallesDia.reduce((s, d) => s + d.cantidad, 0),
            secciones: Array.from(secMap.entries()).map(([compositeKey, cantidad]) => ({
              compositeKey,
              nombre: compositeKey.split('::')[1],
              cantidad,
            })),
          };
        }
      }
      const totalSemana = prod.detalles.reduce((s, d) => s + d.cantidad, 0);
      return { idProducto: prod.idProducto, nombreProducto: prod.nombreProducto, idCategoria: prod.idCategoria, nombreCategoria: prod.nombreCategoria, abreviatura: prod.abreviatura, diasData, totalSemana };
    }).filter(r => r.totalSemana > 0);
    // agrupar por categoría
    const catMap = new Map<number, { nombre: string; filas: FilaMatrix[] }>();
    for (const row of rows) {
      if (!catMap.has(row.idCategoria)) catMap.set(row.idCategoria, { nombre: row.nombreCategoria, filas: [] });
      catMap.get(row.idCategoria)!.filas.push(row);
    }
    return Array.from(catMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productosParaCategorias]);

  const pedidosPendientes = React.useMemo(
    () => (consolidateData?.pedidosAprobacion ?? []).filter(p => p.estadoPedido === 'PENDIENTE'),
    [consolidateData]
  );

  const contadores = React.useMemo(() => ({
    procesadas:      todasSolicitudes.length,
    productosUnicos: productosResumen.length,
    secciones:       new Set(todasSolicitudes.map(s => s.seccion.nombreSeccion)).size,
    dias:            gruposDia.length,
  }), [todasSolicitudes, productosResumen, gruposDia]);

  const toggleExpandido = (key: string) => {
    setExpandidos(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const hayDatos = !!consolidateData && (
    consolidateData.pedidosCompletos.length > 0 ||
    consolidateData.pedidosResumen.length > 0 ||
    consolidateData.pedidosAprobacion.length > 0
  );

  const recargarDatos = React.useCallback(async () => {
    if (!semanaId) return;
    const semana = semanas.find(s => String(s.idSemana) === semanaId);
    if (!semana) return;
    cache.current.delete(semanaId);
    setIsLoadingDatos(true);
    try {
      const data = await consolidatePedidoQueryService({ fechaInicio: semana.fechaInicio, fechaFin: semana.fechaFin });
      cache.current.set(semanaId, data);
      setConsolidateData(data);
    } catch { toast.error('Error al recargar datos'); }
    finally { setIsLoadingDatos(false); }
  }, [semanaId, semanas]);

  const handleAprobarPedido = async (idPedido: number) => {
    setIsAprobando(true);
    try {
      await aprobarPedidosService({ idsPedidos: [idPedido], estado: 'APROVADO' });
      toast.success('Pedido aprobado correctamente');
      await recargarDatos();
    } catch { toast.error('Error al aprobar el pedido'); }
    finally { setIsAprobando(false); }
  };

  const handleAprobarTodos = async () => {
    const pendientes = (consolidateData?.pedidosAprobacion ?? [])
      .filter(p => p.estadoPedido === 'PENDIENTE')
      .map(p => p.idPedido);
    if (pendientes.length === 0) return;
    setIsAprobando(true);
    try {
      await aprobarPedidosService({ idsPedidos: pendientes, estado: 'APROVADO' });
      toast.success(`${pendientes.length} pedido${pendientes.length > 1 ? 's' : ''} aprobado${pendientes.length > 1 ? 's' : ''} correctamente`);
      await recargarDatos();
    } catch { toast.error('Error al aprobar los pedidos'); }
    finally { setIsAprobando(false); }
  };

  // ── Helpers de estilo Excel ──
  const styleTitle   = { font: { bold: true, sz: 14, color: { rgb: '1A1A1A' } }, fill: { fgColor: { rgb: 'FFB800' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: false } };
  const styleHeader  = { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '2D3748' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: { top: { style: 'thin', color: { rgb: 'FFFFFF' } }, bottom: { style: 'thin', color: { rgb: 'FFFFFF' } }, left: { style: 'thin', color: { rgb: 'FFFFFF' } }, right: { style: 'thin', color: { rgb: 'FFFFFF' } } } };
  const styleCat     = { font: { bold: true, sz: 11, color: { rgb: '1A1A1A' } }, fill: { fgColor: { rgb: 'FFF3CD' } }, alignment: { horizontal: 'left', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: 'E2C97E' } }, bottom: { style: 'thin', color: { rgb: 'E2C97E' } }, left: { style: 'thin', color: { rgb: 'E2C97E' } }, right: { style: 'thin', color: { rgb: 'E2C97E' } } } };
  const styleTotal   = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4A5568' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: '718096' } }, bottom: { style: 'thin', color: { rgb: '718096' } }, left: { style: 'thin', color: { rgb: '718096' } }, right: { style: 'thin', color: { rgb: '718096' } } } };
  const styleTotalN  = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4A5568' } }, alignment: { horizontal: 'right', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: '718096' } }, bottom: { style: 'thin', color: { rgb: '718096' } }, left: { style: 'thin', color: { rgb: '718096' } }, right: { style: 'thin', color: { rgb: '718096' } } } };
  const styleData    = { font: { sz: 10 }, fill: { fgColor: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'left', vertical: 'center', wrapText: true }, border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'E2E8F0' } } } };
  const styleDataAlt = { font: { sz: 10 }, fill: { fgColor: { rgb: 'F7FAFC' } }, alignment: { horizontal: 'left', vertical: 'center', wrapText: true }, border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'E2E8F0' } } } };
  const styleNum     = { font: { sz: 10 }, fill: { fgColor: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'right', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'E2E8F0' } } } };
  const styleNumAlt  = { font: { sz: 10 }, fill: { fgColor: { rgb: 'F7FAFC' } }, alignment: { horizontal: 'right', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'E2E8F0' } } } };
  const styleNumHL   = { font: { bold: true, sz: 10, color: { rgb: '276749' } }, fill: { fgColor: { rgb: 'C6F6D5' } }, alignment: { horizontal: 'right', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: '9AE6B4' } }, bottom: { style: 'thin', color: { rgb: '9AE6B4' } }, left: { style: 'thin', color: { rgb: '9AE6B4' } }, right: { style: 'thin', color: { rgb: '9AE6B4' } } } };

  // Formatea número con locale chileno: miles con punto, decimal con coma, máx 3 decimales
  const fmtN = (v: number): string =>
    v.toLocaleString('es-CL', { maximumFractionDigits: 3 });
  // Celda texto (garantiza coma decimal sin depender del locale del Excel del usuario)
  const sc = (v: string | number | null, s: object) => ({
    v: typeof v === 'number' ? fmtN(v) : (v ?? ''),
    t: 's',
    s,
  });
  // Convierte índice de columna (0-based) a letra(s) Excel: 0→A, 25→Z, 26→AA …
  const cl = (c: number): string => {
    let s = ''; let n = c + 1;
    while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
    return s;
  };
  // Celda de total: escribe el valor pre-calculado como texto formateado (sin fórmula live,
  // ya que SUM no opera sobre celdas texto; se mantiene cl() por si se reactiva en futuro)
  const sf = (_formula: string, v: number, s: object) => ({ v: fmtN(v), t: 's', s });

  const autoColWidth = (data: (string | number | null)[][], startRow: number) =>
    data[startRow]?.map((_, ci) => ({
      wch: Math.min(40, Math.max(8, ...data.map(row => String(row[ci] ?? '').length + 2)))
    })) ?? [];

  // ── Descarga Excel: vista por día ──
  const descargarExcelDia = () => {
    const nombreDia = DIA_CONFIG[diaCategoria as number]?.nombre ?? 'Día';
    const semNombre = semanaActual?.nombreSemana ?? '';

    // Clave compuesta "asignatura::seccion" → columna única por asignatura+sección
    const todasSecciones = new Set<string>();
    for (const cat of categoriasPorDia)
      for (const prod of cat.productos)
        for (const det of prod.detallesFiltrados)
          todasSecciones.add(`${det.nombreAsignatura}::${det.nombreSeccion}`);
    const secciones = Array.from(todasSecciones).sort();
    const secLabel = (key: string) => { const [a, s] = key.split('::'); return `§${s} — ${a}`; };
    const nCols = 3 + secciones.length + 1; // cat + prod + unidad + secciones + total

    // Helper: construye secMap con clave compuesta para un producto
    const buildSecMap = (detallesFiltrados: Array<{ nombreAsignatura: string; nombreSeccion: string; cantidad: number }>) => {
      const m = new Map<string, number>();
      for (const d of detallesFiltrados) {
        const k = `${d.nombreAsignatura}::${d.nombreSeccion}`;
        m.set(k, (m.get(k) ?? 0) + d.cantidad);
      }
      return m;
    };

    // ── Construir filas como arrays de valores (para autoColWidth) ──
    const rawRows: (string | number | null)[][] = [];
    rawRows.push([`Por Categoría — ${nombreDia} — ${semNombre}`, ...Array(nCols - 1).fill(null)]);
    rawRows.push(Array(nCols).fill(null));
    rawRows.push(['Categoría', 'Producto', 'Unidad', ...secciones.map(secLabel), 'Total Día']);
    for (const cat of categoriasPorDia) {
      rawRows.push([cat.nombreCategoria, ...Array(nCols - 1).fill(null)]);
      for (const prod of cat.productos) {
        const sm = buildSecMap(prod.detallesFiltrados);
        rawRows.push([cat.nombreCategoria, prod.nombreProducto, prod.abreviatura, ...secciones.map(k => sm.get(k) ?? 0), prod.totalDia]);
      }
      // Subtotal row con valores por sección
      const secSubtotals = secciones.map(k => cat.productos.reduce((sum, p) => sum + (buildSecMap(p.detallesFiltrados).get(k) ?? 0), 0));
      rawRows.push([`SUBTOTAL ${cat.nombreCategoria}`, '', '', ...secSubtotals, cat.productos.reduce((s, p) => s + p.totalDia, 0)]);
      rawRows.push(Array(nCols).fill(null));
    }

    // ── Construir worksheet con estilos ──
    const ws: Record<string, any> = {};
    const merges: any[] = [];
    let R = 0;

    // Fila título (fusionada)
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: nCols - 1 } });
    ws[XLSXStyle.utils.encode_cell({ r: 0, c: 0 })] = sc(`Por Categoría — ${nombreDia} — ${semNombre}`, styleTitle);
    for (let C = 1; C < nCols; C++) ws[XLSXStyle.utils.encode_cell({ r: 0, c: C })] = sc(null, styleTitle);
    R = 2;

    // Fila encabezados
    const headers = ['Categoría', 'Producto', 'Unidad', ...secciones.map(secLabel), 'Total Día'];
    headers.forEach((h, C) => { ws[XLSXStyle.utils.encode_cell({ r: R, c: C })] = sc(h, styleHeader); });
    R++;

    let alt = false;
    for (const cat of categoriasPorDia) {
      // Fila nombre categoría (fusionada)
      merges.push({ s: { r: R, c: 0 }, e: { r: R, c: nCols - 1 } });
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 0 })] = sc(cat.nombreCategoria, styleCat);
      for (let C = 1; C < nCols; C++) ws[XLSXStyle.utils.encode_cell({ r: R, c: C })] = sc(null, styleCat);
      R++;

      alt = false;
      const firstProdRDia = R;
      for (const prod of cat.productos) {
        const sm = buildSecMap(prod.detallesFiltrados);
        const sd = alt ? styleDataAlt : styleData;
        const sn = alt ? styleNumAlt : styleNum;
        ws[XLSXStyle.utils.encode_cell({ r: R, c: 0 })] = sc(cat.nombreCategoria, sd);
        ws[XLSXStyle.utils.encode_cell({ r: R, c: 1 })] = sc(prod.nombreProducto, sd);
        ws[XLSXStyle.utils.encode_cell({ r: R, c: 2 })] = sc(prod.abreviatura, { ...sn, alignment: { horizontal: 'center', vertical: 'center' } });
        secciones.forEach((k, i) => { ws[XLSXStyle.utils.encode_cell({ r: R, c: 3 + i })] = sc(sm.get(k) ?? 0, sn); });
        ws[XLSXStyle.utils.encode_cell({ r: R, c: nCols - 1 })] = sf(
          `SUM(${cl(3)}${R + 1}:${cl(2 + secciones.length)}${R + 1})`,
          prod.totalDia,
          styleNumHL
        );
        R++;
        alt = !alt;
      }
      const lastProdRDia = R - 1;

      // Subtotal categoría — con subtotales por columna de sección
      const totalCat = cat.productos.reduce((s, p) => s + p.totalDia, 0);
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 0 })] = sc(`SUBTOTAL ${cat.nombreCategoria}`, styleTotal);
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 1 })] = sc('', styleTotal);
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 2 })] = sc('', styleTotal);
      secciones.forEach((k, i) => {
        const secTotal = cat.productos.reduce((sum, p) => sum + (buildSecMap(p.detallesFiltrados).get(k) ?? 0), 0);
        ws[XLSXStyle.utils.encode_cell({ r: R, c: 3 + i })] = sf(
          `SUM(${cl(3 + i)}${firstProdRDia + 1}:${cl(3 + i)}${lastProdRDia + 1})`,
          secTotal,
          styleTotalN
        );
      });
      ws[XLSXStyle.utils.encode_cell({ r: R, c: nCols - 1 })] = sf(
        `SUM(${cl(nCols - 1)}${firstProdRDia + 1}:${cl(nCols - 1)}${lastProdRDia + 1})`,
        totalCat,
        styleTotalN
      );
      R++;

      // Fila separadora
      for (let C = 0; C < nCols; C++) ws[XLSXStyle.utils.encode_cell({ r: R, c: C })] = sc(null, { fill: { fgColor: { rgb: 'EDF2F7' } } });
      R++;
    }

    ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: R - 1, c: nCols - 1 } });
    ws['!merges'] = merges;
    ws['!cols'] = autoColWidth(rawRows, 2);
    ws['!rows'] = [{ hpt: 28 }, {}, { hpt: 22 }];
    ws['!freeze'] = { xSplit: 3, ySplit: 3 };

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, nombreDia.slice(0, 31));
    XLSXStyle.writeFile(wb, `categorias_${nombreDia.toLowerCase()}_${semNombre.replace(/\s+/g, '_')}.xlsx`);
  };

  // ── Descarga Excel: vista completa (todos los días) ──
  const descargarExcelCompleta = () => {
    const semNombre = semanaActual?.nombreSemana ?? '';
    const diasOrden = [1, 2, 3, 4, 5, 6, 0];
    const diasNombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    // Cols: Categoría | Producto | Sección | Unidad | Lun…Dom | Total Semana
    const nCols = 4 + diasNombres.length + 1;

    // Mapa idProducto → secciones (clave compuesta → datos por día)
    const prodSecMap = new Map<number, Map<string, { label: string; days: Record<number, number>; total: number }>>();
    for (const prod of productosParaCategorias) {
      const sm = new Map<string, { label: string; days: Record<number, number>; total: number }>();
      for (const d of prod.detalles) {
        const key = `${d.nombreAsignatura}::${d.nombreSeccion}`;
        if (!sm.has(key)) sm.set(key, { label: `§${d.nombreSeccion} — ${d.nombreAsignatura}`, days: {}, total: 0 });
        const e = sm.get(key)!;
        e.days[d.diaSemana] = (e.days[d.diaSemana] ?? 0) + d.cantidad;
        e.total += d.cantidad;
      }
      prodSecMap.set(prod.idProducto, sm);
    }

    const styleSecRow = { font: { sz: 10, italic: true, color: { rgb: '4A5568' } }, fill: { fgColor: { rgb: 'F7FAFC' } }, alignment: { horizontal: 'left', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'E2E8F0' } } } };
    const styleSecNum = { font: { sz: 10, italic: true }, fill: { fgColor: { rgb: 'F7FAFC' } }, alignment: { horizontal: 'right', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'E2E8F0' } } } };
    const styleProdTotal = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: 'EBF8FF' } }, alignment: { horizontal: 'right', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: 'BEE3F8' } }, bottom: { style: 'thin', color: { rgb: 'BEE3F8' } }, left: { style: 'thin', color: { rgb: 'BEE3F8' } }, right: { style: 'thin', color: { rgb: 'BEE3F8' } } } };
    const styleProdTotalLabel = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: 'EBF8FF' } }, alignment: { horizontal: 'left', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: 'BEE3F8' } }, bottom: { style: 'thin', color: { rgb: 'BEE3F8' } }, left: { style: 'thin', color: { rgb: 'BEE3F8' } }, right: { style: 'thin', color: { rgb: 'BEE3F8' } } } };

    // ── rawRows para autoColWidth ──
    const rawRows: (string | number | null)[][] = [];
    rawRows.push([`Vista Completa por Categoría — ${semNombre}`, ...Array(nCols - 1).fill(null)]);
    rawRows.push(Array(nCols).fill(null));
    rawRows.push(['Categoría', 'Producto', 'Sección', 'Unidad', ...diasNombres, 'Total Semana']);
    for (const cat of matrizCompleta) {
      rawRows.push([cat.nombre, ...Array(nCols - 1).fill(null)]);
      for (const row of cat.filas) {
        const secciones = Array.from(prodSecMap.get(row.idProducto)?.entries() ?? []).sort(([a], [b]) => a.localeCompare(b));
        for (const [, sec] of secciones)
          rawRows.push([cat.nombre, row.nombreProducto, sec.label, row.abreviatura, ...diasOrden.map(d => sec.days[d] ?? 0), sec.total]);
        if (secciones.length > 1)
          rawRows.push([cat.nombre, row.nombreProducto, 'TOTAL', row.abreviatura, ...diasOrden.map(d => row.diasData[d]?.total ?? 0), row.totalSemana]);
      }
      rawRows.push([`SUBTOTAL ${cat.nombre}`, '', '', '', ...diasOrden.map(d => cat.filas.reduce((s, r) => s + (r.diasData[d]?.total ?? 0), 0)), cat.filas.reduce((s, r) => s + r.totalSemana, 0)]);
      rawRows.push(Array(nCols).fill(null));
    }

    const ws: Record<string, any> = {};
    const merges: any[] = [];
    let R = 0;

    // Título fusionado
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: nCols - 1 } });
    ws[XLSXStyle.utils.encode_cell({ r: 0, c: 0 })] = sc(`Vista Completa por Categoría — ${semNombre}`, styleTitle);
    for (let C = 1; C < nCols; C++) ws[XLSXStyle.utils.encode_cell({ r: 0, c: C })] = sc(null, styleTitle);
    R = 2;

    // Encabezados
    const headers = ['Categoría', 'Producto', 'Sección', 'Unidad', ...diasNombres, 'Total Semana'];
    headers.forEach((h, C) => { ws[XLSXStyle.utils.encode_cell({ r: R, c: C })] = sc(h, styleHeader); });
    R++;

    for (const cat of matrizCompleta) {
      // Fila nombre categoría fusionada
      merges.push({ s: { r: R, c: 0 }, e: { r: R, c: nCols - 1 } });
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 0 })] = sc(cat.nombre, styleCat);
      for (let C = 1; C < nCols; C++) ws[XLSXStyle.utils.encode_cell({ r: R, c: C })] = sc(null, styleCat);
      R++;

      const firstCatR = R;
      for (const row of cat.filas) {
        const secciones = Array.from(prodSecMap.get(row.idProducto)?.entries() ?? []).sort(([a], [b]) => a.localeCompare(b));
        const hasManySecs = secciones.length > 1;

        for (const [, sec] of secciones) {
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 0 })] = sc(cat.nombre, styleSecRow);
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 1 })] = sc(row.nombreProducto, styleSecRow);
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 2 })] = sc(sec.label, styleSecRow);
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 3 })] = sc(row.abreviatura, { ...styleSecNum, alignment: { horizontal: 'center', vertical: 'center' } });
          diasOrden.forEach((dia, i) => { ws[XLSXStyle.utils.encode_cell({ r: R, c: 4 + i })] = sc(sec.days[dia] ?? 0, styleSecNum); });
          ws[XLSXStyle.utils.encode_cell({ r: R, c: nCols - 1 })] = sf(`SUM(${cl(4)}${R+1}:${cl(4+diasOrden.length-1)}${R+1})`, sec.total, styleNumHL);
          R++;
        }

        if (hasManySecs) {
          // Subtotal del producto
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 0 })] = sc(cat.nombre, styleProdTotalLabel);
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 1 })] = sc(row.nombreProducto, styleProdTotalLabel);
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 2 })] = sc('TOTAL PRODUCTO', styleProdTotalLabel);
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 3 })] = sc(row.abreviatura, { ...styleProdTotal, alignment: { horizontal: 'center', vertical: 'center' } });
          diasOrden.forEach((dia, i) => { ws[XLSXStyle.utils.encode_cell({ r: R, c: 4 + i })] = sc(row.diasData[dia]?.total ?? 0, styleProdTotal); });
          ws[XLSXStyle.utils.encode_cell({ r: R, c: nCols - 1 })] = sf(`SUM(${cl(4)}${R+1}:${cl(4+diasOrden.length-1)}${R+1})`, row.totalSemana, styleNumHL);
          R++;
        }
      }
      const lastCatR = R - 1;

      // Subtotal categoría
      const totalesDia = diasOrden.map(dia => cat.filas.reduce((s, r) => s + (r.diasData[dia]?.total ?? 0), 0));
      const totalCat = cat.filas.reduce((s, r) => s + r.totalSemana, 0);
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 0 })] = sc(`SUBTOTAL ${cat.nombre}`, styleTotal);
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 1 })] = sc('', styleTotal);
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 2 })] = sc('', styleTotal);
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 3 })] = sc('', styleTotal);
      totalesDia.forEach((t, i) => {
        ws[XLSXStyle.utils.encode_cell({ r: R, c: 4 + i })] = sf(
          `SUM(${cl(4+i)}${firstCatR+1}:${cl(4+i)}${lastCatR+1})`, t || 0, styleTotalN
        );
      });
      ws[XLSXStyle.utils.encode_cell({ r: R, c: nCols - 1 })] = sf(
        `SUM(${cl(nCols-1)}${firstCatR+1}:${cl(nCols-1)}${lastCatR+1})`, totalCat, styleTotalN
      );
      R++;

      for (let C = 0; C < nCols; C++) ws[XLSXStyle.utils.encode_cell({ r: R, c: C })] = sc(null, { fill: { fgColor: { rgb: 'EDF2F7' } } });
      R++;
    }

    ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: R - 1, c: nCols - 1 } });
    ws['!merges'] = merges;
    ws['!cols'] = autoColWidth(rawRows, 2);
    ws['!rows'] = [{ hpt: 28 }, {}, { hpt: 22 }];
    ws['!freeze'] = { xSplit: 4, ySplit: 3 };

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'Vista Completa');
    XLSXStyle.writeFile(wb, `categorias_completo_${semNombre.replace(/\s+/g, '_')}.xlsx`);
  };

  const semanaActual = semanas.find(s => String(s.idSemana) === semanaId) ?? null;
  const sinPeriodos = periodos.length === 0 && !isLoadingSem;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

      {/* ── Selector período + semana ── */}
      <Card className="shadow-sm">
        <CardBody className="px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Icon icon="lucide:calendar-days" className="text-default-400" width={16} />
              <span className="text-xs font-bold text-default-500 uppercase tracking-wider">Período</span>
              {sinPeriodos && !isAdmin && (
                <p className="text-sm text-warning-600 dark:text-warning-400 flex items-center gap-1.5">
                  <Icon icon="lucide:alert-triangle" width={13} />
                  Contacte el administrador para generar los periodos académicos.
                </p>
              )}
              {sinPeriodos && isAdmin && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-600 underline underline-offset-2 cursor-pointer transition-colors"
                  onClick={() => history.push('/admin-sistema?tab=semanas')}
                >
                  <Icon icon="lucide:calendar-plus" width={14} />
                  Genere el período académico
                  <Icon icon="lucide:arrow-right" width={12} />
                </button>
              )}
              {!sinPeriodos && periodos.map(p =>
                p.semestres.map(s => {
                  const isActive = semanas.length > 0 && semanas[0].anio === p.anio && semanas[0].semestre === s;
                  return (
                    <button key={`${p.anio}-${s}`} onClick={() => handlePeriodoChange(p.anio, s)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                        isActive ? 'bg-warning text-white border-warning' : 'bg-default-100 text-default-600 border-default-200 hover:bg-default-200'
                      }`}>
                      {p.anio} S{s}
                    </button>
                  );
                })
              )}
            </div>

            <Divider orientation="vertical" className="hidden sm:block h-6" />

            <div className="flex-1 min-w-0">
              {isLoadingSem ? (
                <div className="flex items-center gap-2 text-sm text-default-400"><Spinner size="sm" /> Cargando semanas...</div>
              ) : semanas.length === 0 ? (
                <p className="text-sm text-default-400">Sin semanas disponibles.</p>
              ) : (
                <Select size="sm" variant="bordered"
                  selectedKeys={semanaId ? new Set([semanaId]) : new Set()}
                  onSelectionChange={keys => { const v = Array.from(keys as Set<string>)[0]; if (v) setSemanaId(v); }}
                  placeholder="Seleccione una semana"
                  classNames={{ trigger: 'bg-default-50 cursor-pointer', base: 'max-w-xs' }}
                  startContent={<Icon icon="lucide:calendar" width={14} className="text-default-400 shrink-0" />}
                >
                  {semanas.map(s => (
                    <SelectItem key={String(s.idSemana)} textValue={s.nombreSemana}>
                      <span className="font-semibold">{s.nombreSemana}</span>
                      <span className="text-default-400 ml-2 text-xs">
                        {new Date(s.fechaInicio + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                        {' – '}
                        {new Date(s.fechaFin + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      </span>
                      {String(s.idSemana) === defaultSemanaId && defaultSemanaId && (
                        <Chip size="sm" color="success" variant="flat" className="ml-auto shrink-0">Actual</Chip>
                      )}
                    </SelectItem>
                  ))}
                </Select>
              )}
            </div>

            {semanaActual && (
              <p className="text-xs text-default-400 shrink-0">
                {new Date(semanaActual.fechaInicio + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' al '}
                {new Date(semanaActual.fechaFin + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                {semanaId === defaultSemanaId && defaultSemanaId && (
                  <span className="text-success ml-1 font-medium">· en curso</span>
                )}
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ── Banner informativo ── */}
      <div className="flex items-start gap-3 px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-secondary-800">
        <Icon icon="lucide:truck" width={18} className="shrink-0 text-secondary-500 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Pedido consolidado → Bodega de Tránsito</p>
          <p className="text-xs mt-0.5 text-secondary-700">
            Los pedidos en estado <strong>Pendiente</strong> agrupan solicitudes aprobadas.
            Al aprobarse, pasan a <strong>Procesado</strong> y quedan disponibles en bodega de tránsito para su retiro.
            El descuento se realiza automáticamente en la bodega de tránsito una vez que el asistente de bodega confirma la verificación de los productos.
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: 'Sol. procesadas', val: contadores.procesadas,     color: 'border-secondary-200', icon: 'lucide:clipboard-check', text: 'text-secondary-700' },
          { label: 'Productos únicos', val: contadores.productosUnicos, color: 'border-primary-200',   icon: 'lucide:package',         text: 'text-primary-700'  },
          { label: 'Secciones',        val: contadores.secciones,       color: 'border-warning-200',   icon: 'lucide:users',           text: 'text-warning-700'  },
          { label: 'Días con clases',  val: contadores.dias,            color: 'border-success-200',   icon: 'lucide:calendar-check',  text: 'text-success-700'  },
        ] as const).map(c => (
          <Card key={c.label} className={`shadow-sm border ${c.color}`}>
            <CardBody className="px-4 py-3 flex flex-row items-center gap-3">
              <Icon icon={c.icon} width={22} className={c.text} />
              <div>
                <p className={`text-2xl font-bold ${c.text}`}>{c.val}</p>
                <p className="text-xs text-default-500">{c.label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* ── Contenido principal ── */}
      <Card className="shadow-sm">
        <CardHeader className="px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-default-100 rounded-lg p-1 flex-wrap">
            {(['categorias', 'cronograma', 'totales', 'aprobacion'] as const).map(v => (
              <button key={v} onClick={() => { setVistaActiva(v); setExpandidos(new Set()); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  vistaActiva === v ? 'bg-white shadow-sm text-primary' : 'text-default-500 hover:text-default-700'
                }`}>
                {v === 'categorias'  && <span className="flex items-center gap-1.5"><Icon icon="lucide:tag"             width={12} />Por Categoría</span>}
                {v === 'cronograma'  && <span className="flex items-center gap-1.5"><Icon icon="lucide:calendar-range"  width={12} />Cronograma Semanal</span>}
                {v === 'totales'     && <span className="flex items-center gap-1.5"><Icon icon="lucide:package-check"   width={12} />Totales del Pedido</span>}
                {v === 'aprobacion'  && <span className="flex items-center gap-1.5"><Icon icon="lucide:shield-check"    width={12} />Aprobación de Pedidos</span>}
              </button>
            ))}
          </div>

          {vistaActiva === 'categorias' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Selector día */}
              <div className="flex items-center gap-1 bg-default-100 rounded-lg p-1 flex-wrap">
                {([
                  { val: 1,          label: 'Lunes'         },
                  { val: 2,          label: 'Martes'        },
                  { val: 3,          label: 'Miércoles'     },
                  { val: 4,          label: 'Jueves'        },
                  { val: 5,          label: 'Viernes'       },
                  { val: 6,          label: 'Sábado'        },
                  { val: 0,          label: 'Domingo'       },
                  { val: 'completa', label: 'Vista Completa'},
                ] as const).map(d => (
                  <button key={String(d.val)} onClick={() => setDiaCategoria(d.val as number | 'completa')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                      diaCategoria === d.val ? 'bg-white shadow-sm text-primary' : 'text-default-500 hover:text-default-700'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
              {/* Toggle colores */}
              <button onClick={() => setConColores(c => !c)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  conColores ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-default-100 border-default-200 text-default-500'
                }`}>
                <Icon icon="lucide:palette" width={12} />
                {conColores ? 'Con colores' : 'Sin colores'}
              </button>
              {/* Botón descarga Excel */}
              {hayDatos && (
                <button
                  onClick={diaCategoria === 'completa' ? descargarExcelCompleta : descargarExcelDia}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-success-300 bg-success-50 text-success-700 hover:bg-success-100 transition-all cursor-pointer">
                  <Icon icon="lucide:download" width={12} />
                  Descargar Excel
                </button>
              )}
            </div>
          )}

          {vistaActiva === 'totales' && (
            <Input size="sm" variant="bordered" placeholder="Buscar producto..."
              value={busqueda} onValueChange={setBusqueda}
              startContent={<Icon icon="lucide:search" className="text-default-400" width={14} />}
              classNames={{ base: 'max-w-xs', inputWrapper: 'bg-default-50' }}
            />
          )}
          {vistaActiva === 'cronograma' && (
            <Input size="sm" variant="bordered" placeholder="Buscar receta, docente, producto..."
              value={busquedaCrono} onValueChange={setBusquedaCrono}
              startContent={<Icon icon="lucide:search" className="text-default-400" width={14} />}
              classNames={{ base: 'max-w-xs', inputWrapper: 'bg-default-50' }}
            />
          )}
          {vistaActiva === 'aprobacion' && (
            <Input size="sm" variant="bordered" placeholder="Buscar producto..."
              value={busquedaAprob} onValueChange={setBusquedaAprob}
              startContent={<Icon icon="lucide:search" className="text-default-400" width={14} />}
              classNames={{ base: 'max-w-xs', inputWrapper: 'bg-default-50' }}
            />
          )}
        </CardHeader>

        <Divider />

        <CardBody className="p-4">
          {isLoadingDatos ? (
            <div className="py-16 flex flex-col items-center gap-3 text-default-400">
              <Spinner size="lg" />
              <p className="text-sm">Cargando conglomerado...</p>
            </div>
          ) : !semanaId ? (
            <div className="py-16 flex flex-col items-center gap-3 text-default-400">
              <Icon icon="lucide:calendar-search" width={48} className="opacity-40" />
              <p className="text-sm">Seleccione una semana para ver el pedido consolidado.</p>
            </div>
          ) : !hayDatos ? (
            <div className="py-16 flex flex-col items-center gap-3 text-default-400">
              <Icon icon="lucide:inbox" width={48} className="opacity-40" />
              <p className="text-sm">No hay pedidos consolidados para esta semana.</p>
              <p className="text-xs">Los pedidos deben estar generados para aparecer aquí.</p>
            </div>
          ) : vistaActiva === 'categorias' ? (

            /* ════════════════════════════════════════
               VISTA POR CATEGORÍA
            ════════════════════════════════════════ */
            diaCategoria === 'completa' ? (

              /* ── VISTA COMPLETA: tabla cruzada ── */
              <div className="overflow-x-auto">
                {matrizCompleta.length === 0 ? (
                  <div className="py-10 flex flex-col items-center gap-3 text-default-400">
                    <Icon icon="lucide:tag" width={36} className="opacity-40" />
                    <p className="text-sm">Sin productos para esta semana.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-default-50 border-b border-default-200">
                        <th className="text-left px-3 py-2 text-[10px] font-bold text-default-500 uppercase tracking-wider min-w-[200px]">Categoría / Producto</th>
                        {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
                          <th key={d} className="text-center px-2 py-2 text-[10px] font-bold text-default-500 uppercase tracking-wider min-w-[70px]">{d}</th>
                        ))}
                        <th className="text-center px-2 py-2 text-[10px] font-bold text-default-500 uppercase tracking-wider min-w-[70px]">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrizCompleta.map(cat => (
                        <React.Fragment key={cat.nombre}>
                          {/* Fila cabecera categoría */}
                          <tr className="bg-default-100 border-t-2 border-default-300">
                            <td colSpan={9} className="px-3 py-1.5">
                              <span className="text-xs font-bold text-default-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Icon icon="lucide:tag" width={11} className="text-default-500" />
                                {cat.nombre}
                              </span>
                            </td>
                          </tr>
                          {/* Filas de productos */}
                          {cat.filas.map(row => (
                            <tr key={row.idProducto} className="border-b border-default-100 hover:bg-default-50/50">
                              <td className="px-3 py-2 text-default-700 font-medium pl-7">{row.nombreProducto}</td>
                              {[1,2,3,4,5,6,0].map(dia => {
                                const cell = row.diasData[dia];
                                if (!cell) return <td key={dia} className="text-center px-2 py-2 text-default-300">—</td>;
                                const bgColor = conColores && cell.secciones.length === 1
                                  ? seccionColorMap.get(cell.secciones[0].compositeKey) ?? 'transparent'
                                  : 'transparent';
                                return (
                                  <td key={dia} className="text-center px-2 py-2">
                                    <div className="inline-flex flex-col items-center gap-0.5">
                                      {conColores && cell.secciones.length > 1
                                        ? cell.secciones.map((sec, si) => (
                                            <span key={si} className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded"
                                              style={{ backgroundColor: seccionColorMap.get(sec.compositeKey) ?? '#f4f4f5' }}>
                                              {fmtCant(sec.cantidad)}
                                              <span className="text-[9px] text-default-500 ml-0.5">{row.abreviatura}</span>
                                            </span>
                                          ))
                                        : (
                                          <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded"
                                            style={{ backgroundColor: bgColor }}>
                                            {fmtCant(cell.total)}
                                            <span className="text-[9px] text-default-500 ml-0.5">{row.abreviatura}</span>
                                          </span>
                                        )
                                      }
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="text-center px-2 py-2">
                                <span className="text-xs font-bold text-secondary font-mono">
                                  {fmtCant(row.totalSemana)}
                                  <span className="text-[9px] text-default-400 ml-0.5">{row.abreviatura}</span>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Leyenda secciones */}
                {conColores && seccionColorMap.size > 0 && (
                  <div className="mt-4 p-4 bg-default-50 rounded-xl border border-default-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon icon="lucide:palette" width={13} className="text-default-500" />
                      <p className="text-[10px] font-bold text-default-500 uppercase tracking-wider">Leyenda de secciones</p>
                      <span className="ml-auto text-[10px] text-default-400">{seccionColorMap.size} sección{seccionColorMap.size !== 1 ? 'es' : ''}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(seccionColorMap.entries()).map(([key, color]) => {
                        const [asignatura, seccion] = key.split('::');
                        return (
                          <div key={key}
                            className="flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-lg border border-default-200 text-default-700"
                            style={{ backgroundColor: color }}>
                            <span className="font-mono font-bold text-xs">§{seccion}</span>
                            <span className="text-default-400 text-[10px]">·</span>
                            <span className="text-[11px] font-medium truncate max-w-[120px]" title={asignatura}>{asignatura}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            ) : (

              /* ── VISTA POR DÍA: agrupada por categoría ── */
              <div className="space-y-4">
                {categoriasPorDia.length === 0 ? (
                  <div className="py-10 flex flex-col items-center gap-3 text-default-400">
                    <Icon icon="lucide:tag" width={36} className="opacity-40" />
                    <p className="text-sm">Sin productos para el {DIA_CONFIG[diaCategoria as number]?.nombre ?? 'día seleccionado'}.</p>
                  </div>
                ) : (
                  <>
                    {categoriasPorDia.map(cat => (
                      <div key={cat.idCategoria} className="border border-default-200 rounded-xl overflow-hidden">
                        {/* Cabecera categoría */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-default-100 border-b border-default-200">
                          <Icon icon="lucide:tag" width={13} className="text-default-500" />
                          <span className="text-xs font-bold text-default-700 uppercase tracking-wider">{cat.nombreCategoria}</span>
                          <span className="ml-auto text-[10px] text-default-400">{cat.productos.length} producto{cat.productos.length !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Encabezado tabla */}
                        <div className="grid grid-cols-[1fr_auto] px-4 py-1.5 bg-default-50 border-b border-default-100 text-[10px] font-bold text-default-500 uppercase tracking-wider">
                          <span>Producto</span>
                          <span className="text-right">Cantidad por Sección</span>
                        </div>

                        {/* Filas de productos */}
                        {cat.productos.map(prod => {
                          // Agrupar por clave compuesta asignatura::seccion para no mezclar secciones homónimas
                          const seccionMap = new Map<string, { cantidad: number; nombreSeccion: string; nombreAsignatura: string }>();
                          for (const d of prod.detallesFiltrados) {
                            const key = `${d.nombreAsignatura}::${d.nombreSeccion}`;
                            const prev = seccionMap.get(key);
                            seccionMap.set(key, {
                              cantidad: (prev?.cantidad ?? 0) + d.cantidad,
                              nombreSeccion: d.nombreSeccion,
                              nombreAsignatura: d.nombreAsignatura,
                            });
                          }
                          return (
                            <div key={prod.idProducto}
                              className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 border-b border-default-50 last:border-0 hover:bg-default-50/50">
                              <div className="min-w-0">
                                <p className="font-medium text-sm text-default-800 truncate">{prod.nombreProducto}</p>
                                <p className="text-[10px] text-default-400 font-mono">
                                  Total: {fmtCant(prod.totalDia)} {prod.abreviatura}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1 justify-end">
                                {Array.from(seccionMap.entries()).map(([key, { cantidad, nombreSeccion }]) => (
                                  <span key={key}
                                    className="px-2 py-1 rounded-lg text-xs font-semibold border border-default-200 text-default-700 font-mono"
                                    style={{ backgroundColor: conColores ? (seccionColorMap.get(key) ?? '#f4f4f5') : 'white' }}>
                                    §{nombreSeccion} · {fmtCant(cantidad)} {prod.abreviatura}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        {/* Total categoría */}
                        <div className="flex items-center justify-between px-4 py-2 bg-default-50 border-t border-default-200">
                          <span className="text-[11px] text-default-500 font-medium">Total categoría</span>
                          <span className="text-xs font-bold text-primary font-mono">
                            {fmtCant(cat.productos.reduce((s, p) => s + p.totalDia, 0))} und.
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Leyenda */}
                    {conColores && seccionColorMap.size > 0 && (
                      <div className="p-4 bg-default-50 rounded-xl border border-default-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon icon="lucide:palette" width={13} className="text-default-500" />
                          <p className="text-[10px] font-bold text-default-500 uppercase tracking-wider">Leyenda de secciones</p>
                          <span className="ml-auto text-[10px] text-default-400">{seccionColorMap.size} sección{seccionColorMap.size !== 1 ? 'es' : ''}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(seccionColorMap.entries()).map(([key, color]) => {
                            const [asignatura, seccion] = key.split('::');
                            return (
                              <div key={key}
                                className="flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-lg border border-default-200 text-default-700"
                                style={{ backgroundColor: color }}>
                                <span className="font-mono font-bold text-xs">§{seccion}</span>
                                <span className="text-default-400 text-[10px]">·</span>
                                <span className="text-[11px] font-medium truncate max-w-[120px]" title={asignatura}>{asignatura}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )

          ) : vistaActiva === 'cronograma' ? (

            /* ════════════════════════════════════════
               VISTA CRONOGRAMA SEMANAL
            ════════════════════════════════════════ */
            <div className="space-y-5">
              {gruposDiaFiltrados.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-3 text-default-400">
                  <Icon icon="lucide:calendar-x" width={36} className="opacity-40" />
                  <p className="text-sm">{busquedaCrono ? `Sin resultados para "${busquedaCrono}"` : 'Sin solicitudes vinculadas para esta semana.'}</p>
                </div>
              ) : gruposDiaFiltrados.map(grupo => {
                const cfg = DIA_CONFIG[grupo.diaSemana] ?? DIA_CONFIG[1];
                const hoy = isHoy(grupo.fecha);
                const productosDelDia = new Set<string>();
                grupo.solicitudes.forEach(s => s.productosSolicitados.forEach(p => productosDelDia.add(p.nombreProducto)));

                return (
                  <div key={grupo.fecha} className={`rounded-2xl border ${hoy ? 'border-warning-300 ring-2 ring-warning-200' : cfg.border} overflow-hidden`}>

                    {/* Cabecera del día */}
                    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 px-5 py-3 ${hoy ? 'bg-warning-50' : cfg.header}`}>
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`flex flex-col items-center justify-center rounded-xl px-3 py-1.5 min-w-[56px] text-center ${hoy ? 'bg-warning-200' : cfg.badge}`}>
                          <span className={`text-[11px] font-black uppercase tracking-wide ${hoy ? 'text-warning-700' : cfg.text}`}>
                            {cfg.nombre.slice(0, 3).toUpperCase()}
                          </span>
                          <span className={`text-xl font-black leading-tight ${hoy ? 'text-warning-800' : cfg.text}`}>
                            {new Date(grupo.fecha + 'T00:00:00').getDate()}
                          </span>
                          {hoy && <span className="text-[9px] font-bold text-warning-600 leading-none">HOY</span>}
                        </div>
                        <div>
                          <p className={`font-bold text-sm capitalize ${hoy ? 'text-warning-800' : cfg.text}`}>
                            {fmtFechaLarga(grupo.fecha)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-default-500 flex items-center gap-1">
                              <Icon icon="lucide:book-open" width={10} />
                              {grupo.solicitudes.length} clase{grupo.solicitudes.length > 1 ? 's' : ''}
                            </span>
                            <span className="text-xs text-default-400">·</span>
                            <span className="text-xs text-default-500 flex items-center gap-1">
                              <Icon icon="lucide:package" width={10} />
                              {productosDelDia.size} producto{productosDelDia.size > 1 ? 's' : ''} distintos
                            </span>
                          </div>
                        </div>
                      </div>
                      {hoy && (
                        <Chip size="sm" color="warning" variant="solid" className="shrink-0">
                          Hoy · En curso
                        </Chip>
                      )}
                    </div>

                    {/* Solicitudes del día */}
                    <div className="divide-y divide-default-100 bg-white">
                      {grupo.solicitudes.map(sol => {
                        const { seccion, horarios } = sol;
                        const rango   = parseRango(horarios.rangoHoras);
                        const solKey  = String(sol.idSolicitud);
                        const abierto = expandidos.has(solKey);

                        return (
                          <div key={sol.idSolicitud}>
                            <button
                              className="w-full flex flex-col sm:flex-row sm:items-stretch gap-0 hover:bg-default-50/70 cursor-pointer transition-colors text-left"
                              onClick={() => toggleExpandido(solKey)}
                            >
                              {/* Barra de hora lateral */}
                              <div className={`hidden sm:flex flex-col items-center justify-center px-3 py-3 min-w-[80px] border-r ${cfg.border} ${cfg.header}`}>
                                <span className={`text-xs font-bold ${cfg.text}`}>{rango.inicio}</span>
                                <div className={`w-px flex-1 my-1 min-h-[20px] ${cfg.border} border-l-2 border-dashed`} />
                                <span className={`text-xs font-bold ${cfg.text}`}>{rango.fin}</span>
                              </div>

                              {/* Contenido */}
                              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">

                                {/* Bloque móvil: hora */}
                                <div className={`sm:hidden flex items-center gap-2 text-xs ${cfg.text} font-bold`}>
                                  <Icon icon="lucide:clock" width={12} />
                                  {rango.inicio} – {rango.fin}
                                </div>

                                {/* Info principal */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-default-800">§{seccion.nombreSeccion}</span>
                                    <span className="text-xs text-default-400">·</span>
                                    <span className="text-sm text-default-600">{seccion.nombreDocente}</span>
                                    <span className="text-xs text-default-400">·</span>
                                    <span className="text-xs text-default-500">{seccion.nombreAsignatura}</span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-default-400">
                                    <span className="flex items-center gap-1">
                                      <Icon icon="lucide:book-open" width={10} />
                                      {sol.nombreReceta}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Icon icon="lucide:door-open" width={10} />
                                      {horarios.nombreSala}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Icon icon="lucide:users" width={10} />
                                      {seccion.cantInscritos} alumnos
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Icon icon="lucide:layers" width={10} />
                                      {sol.cantProductos} producto{sol.cantProductos > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  {sol.observaciones && (
                                    <p className="mt-0.5 text-xs text-default-400 italic truncate">
                                      <Icon icon="lucide:message-square" width={10} className="inline mr-1" />
                                      {sol.observaciones}
                                    </p>
                                  )}
                                </div>

                                {/* Productos pills (preview) */}
                                <div className="flex flex-wrap gap-1.5 shrink-0 max-w-xs">
                                  {sol.productosSolicitados.slice(0, 3).map((p, i) => (
                                    <span key={i}
                                      className="px-2 py-0.5 rounded-full bg-default-100 text-default-600 text-[11px] font-medium whitespace-nowrap">
                                      {fmtCant(p.cantidad)} {p.unidadAbreviada} {p.nombreProducto}
                                    </span>
                                  ))}
                                  {sol.productosSolicitados.length > 3 && (
                                    <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 text-[11px] font-medium">
                                      +{sol.productosSolicitados.length - 3} más
                                    </span>
                                  )}
                                </div>

                                {/* Chevron */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <Icon icon={abierto ? 'lucide:chevron-up' : 'lucide:chevron-down'} width={16} className="text-default-400" />
                                </div>
                              </div>
                            </button>

                            {/* Detalle expandido */}
                            {abierto && (
                              <div className="mx-4 mb-3 rounded-xl border border-default-100 overflow-hidden">
                                {/* Horario y sala */}
                                <div className={`flex items-center gap-2 px-4 py-2 ${cfg.header} border-b ${cfg.border}`}>
                                  <Icon icon="lucide:clock" width={12} className={cfg.text} />
                                  <span className={`text-xs font-bold ${cfg.text} uppercase tracking-wide`}>Horario y Sala</span>
                                </div>
                                <div className="flex flex-wrap gap-2 px-4 py-2.5 bg-default-50">
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-default-200 text-xs">
                                    <Icon icon="lucide:clock" width={12} className={cfg.text} />
                                    <span className="font-mono text-default-700">{rango.inicio} – {rango.fin}</span>
                                    <span className="text-default-400">·</span>
                                    <Icon icon="lucide:door-open" width={12} className="text-default-400" />
                                    <span className="text-default-500">{horarios.nombreSala}</span>
                                  </div>
                                </div>

                                {/* Tabla de productos */}
                                <div className={`flex items-center gap-2 px-4 py-2 border-t border-b ${cfg.border}`}>
                                  <Icon icon="lucide:package" width={12} className={cfg.text} />
                                  <span className={`text-xs font-bold ${cfg.text} uppercase tracking-wide`}>
                                    Productos requeridos · {sol.productosSolicitados.length} ítem{sol.productosSolicitados.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div>
                                  <div className="grid grid-cols-[1fr_0.4fr_0.25fr] px-4 py-1.5 bg-default-50 text-[10px] font-bold text-default-500 uppercase tracking-wider">
                                    <span>Producto</span>
                                    <span className="text-center">Cantidad</span>
                                    <span className="text-center">Unidad</span>
                                  </div>
                                  {sol.productosSolicitados.map((p, i) => (
                                    <div key={i}
                                      className="grid grid-cols-[1fr_0.4fr_0.25fr] px-4 py-2 text-sm border-t border-default-50 hover:bg-default-50/60">
                                      <span className="text-default-700 font-medium">{p.nombreProducto}</span>
                                      <span className="text-center font-mono font-bold text-primary">{fmtCant(p.cantidad)}</span>
                                      <span className="text-center text-default-500">{p.unidadAbreviada}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

          ) : vistaActiva === 'totales' ? (

            /* ════════════════════════════════════════
               VISTA TOTALES DEL PEDIDO
            ════════════════════════════════════════ */
            <div className="space-y-2">
              {productosFiltrados.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-3 text-default-400">
                  <Icon icon="lucide:search-x" width={36} className="opacity-40" />
                  <p className="text-sm">{busqueda ? `Sin resultados para "${busqueda}"` : 'Sin productos en el período.'}</p>
                </div>
              ) : productosFiltrados.map(prod => {
                const key = `${prod.nombreProducto}||${prod.abreviatura}`;
                const abierto = expandidos.has(key);
                return (
                  <div key={key} className="border border-default-200 rounded-xl overflow-hidden">

                    {/* Cabecera producto */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 bg-default-50 hover:bg-default-100 cursor-pointer transition-colors text-left"
                      onClick={() => toggleExpandido(key)}
                    >
                      <Icon icon="lucide:package" width={15} className="text-secondary shrink-0" />
                      <span className="flex-1 font-semibold text-sm text-default-800">{prod.nombreProducto}</span>

                      <div className="flex items-center gap-3 mr-2">
                        <div className="text-right">
                          <p className="text-lg font-bold text-secondary leading-none">{fmtCant(prod.cantidadTotal)}</p>
                          <p className="text-[10px] text-default-400">{prod.abreviatura} total</p>
                        </div>
                        <Chip size="sm" color="default" variant="flat">
                          {prod.totalSecciones} sección{prod.totalSecciones !== 1 ? 'es' : ''}
                        </Chip>
                      </div>

                      <Icon icon={abierto ? 'lucide:chevron-up' : 'lucide:chevron-down'} width={16} className="text-default-400 shrink-0" />
                    </button>

                    {/* Distribuciones */}
                    {abierto && (
                      <div className="divide-y divide-default-100">
                        {prod.detalles.map((det, detIdx) => {
                          const dia = getDiaSemana(det.fechaSolicitada);
                          const cfg = DIA_CONFIG[dia] ?? DIA_CONFIG[1];
                          const hoy = isHoy(det.fechaSolicitada);
                          const rango = parseRango(det.rangoHoras);
                          return (
                            <div key={`${det.idSolicitud}-${detIdx}`}
                              className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-2.5 bg-white hover:bg-default-50/50">

                              {/* Badge fecha */}
                              <div className={`shrink-0 flex flex-col items-center justify-center rounded-xl px-2.5 py-1.5 min-w-[56px] text-center border ${hoy ? 'bg-warning-50 border-warning-200' : cfg.header + ' ' + cfg.border}`}>
                                <span className={`text-[10px] font-black uppercase leading-none ${hoy ? 'text-warning-600' : cfg.text}`}>
                                  {DIA_CONFIG[dia]?.nombre.slice(0, 3).toUpperCase() ?? ''}
                                </span>
                                <span className={`text-sm font-black leading-tight ${hoy ? 'text-warning-700' : cfg.text}`}>
                                  {fmtFechaCorta(det.fechaSolicitada)}
                                </span>
                                {hoy && <span className="text-[9px] font-bold text-warning-600">HOY</span>}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-sm text-default-800">§{det.nombreSeccion}</span>
                                  <span className="text-xs text-default-400">·</span>
                                  <span className="text-sm text-default-600">{det.nombreDocente}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-default-400 flex-wrap">
                                  <span className="flex items-center gap-1"><Icon icon="lucide:clock" width={11} />{rango.inicio}–{rango.fin}</span>
                                  <span className="flex items-center gap-1"><Icon icon="lucide:door-open" width={11} />{det.nombreSala}</span>
                                  {det.observacion && (
                                    <span className="flex items-center gap-1 italic">
                                      <Icon icon="lucide:message-square" width={11} />{det.observacion}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Cantidad sección */}
                              <div className="shrink-0 text-right">
                                <p className="text-base font-bold text-default-700">
                                  {fmtCant(det.cantidad)} <span className="text-xs font-normal text-default-400">{prod.abreviatura}</span>
                                </p>
                                <p className="text-[10px] text-default-400">esta sección</p>
                              </div>
                            </div>
                          );
                        })}

                        {/* Total fila */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-secondary-50 border-t border-secondary-200">
                          <div className="flex items-center gap-2">
                            <Icon icon="lucide:truck" width={13} className="text-secondary-500" />
                            <span className="text-xs text-secondary-700 font-semibold">Total a despachar desde Bodega de Tránsito:</span>
                          </div>
                          <span className="text-sm font-bold text-secondary">{fmtCant(prod.cantidadTotal)} {prod.abreviatura}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          ) : (

            /* ════════════════════════════════════════
               VISTA APROBACIÓN DE PEDIDOS
            ════════════════════════════════════════ */
            <div className="space-y-4">

              {/* Sub-toggle Unificado / Por Pedido */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 bg-default-100 rounded-lg p-1">
                  {(['unificado', 'individual'] as const).map(v => (
                    <button key={v} onClick={() => setAprobVista(v)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                        aprobVista === v ? 'bg-white shadow-sm text-primary' : 'text-default-500 hover:text-default-700'
                      }`}>
                      {v === 'unificado'
                        ? <span className="flex items-center gap-1.5"><Icon icon="lucide:layers" width={12} />Vista Unificada</span>
                        : <span className="flex items-center gap-1.5"><Icon icon="lucide:files" width={12} />Por Pedido</span>}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-default-400">
                  {aprobVista === 'unificado'
                    ? `${productosUnificadosFiltrados.length} producto${productosUnificadosFiltrados.length !== 1 ? 's' : ''} totales`
                    : `${pedidosAprobFiltrados.length} pedido${pedidosAprobFiltrados.length !== 1 ? 's' : ''}`}
                </span>
                {cong_Editar && pedidosPendientes.length > 0 && (
                  <Button size="sm" color="success" variant="flat" isLoading={isAprobando}
                    onPress={handleAprobarTodos}
                    className="ml-auto"
                    startContent={!isAprobando && <Icon icon="lucide:check-circle" width={14} />}>
                    Aprobar {pedidosPendientes.length} pendiente{pedidosPendientes.length > 1 ? 's' : ''}
                  </Button>
                )}
              </div>

              {/* ── VISTA UNIFICADA: todos los productos combinados ── */}
              {aprobVista === 'unificado' ? (
                productosUnificadosFiltrados.length === 0 ? (
                  <div className="py-10 flex flex-col items-center gap-3 text-default-400">
                    <Icon icon="lucide:shield-off" width={36} className="opacity-40" />
                    <p className="text-sm">{busquedaAprob ? `Sin resultados para "${busquedaAprob}"` : 'Sin pedidos para esta semana.'}</p>
                  </div>
                ) : (
                  <div className="border border-default-200 rounded-2xl overflow-hidden">
                    {/* Cabecera resumen */}
                    <div className="flex items-center gap-3 px-5 py-3 bg-primary-50 border-b border-primary-100">
                      <Icon icon="lucide:layers" width={18} className="text-primary" />
                      <div className="flex-1">
                        <p className="font-bold text-sm text-primary">Resumen Unificado de la Semana</p>
                        <p className="text-xs text-default-500">
                          {consolidateData?.pedidosAprobacion.length ?? 0} pedido{(consolidateData?.pedidosAprobacion.length ?? 0) !== 1 ? 's' : ''} combinados · {productosUnificadosFiltrados.length} productos
                          {productosUnificadosFiltrados.some(p => p.diferenciaTransito < 0) && (
                            <span className="text-danger ml-2 font-medium">· Faltantes detectados</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Tabla encabezado */}
                    <div className="grid grid-cols-12 px-4 py-2 bg-default-50 border-b border-default-100 text-[10px] font-bold text-default-500 uppercase tracking-wider">
                      <span className="col-span-4">Producto</span>
                      <span className="col-span-2 text-center">Total Pedido</span>
                      <span className="col-span-2 text-center">Stock Tránsito</span>
                      <span className="col-span-2 text-center">Diferencia</span>
                      <span className="col-span-2 text-center">Inv. Principal</span>
                    </div>

                    {/* Filas */}
                    {productosUnificadosFiltrados.map((p, i) => {
                      const ok = p.diferenciaTransito >= 0;
                      return (
                        <div key={i} className={`grid grid-cols-12 px-4 py-2.5 text-sm border-b border-default-50 last:border-0 hover:bg-default-50/50 ${ok ? '' : 'bg-danger-50/30'}`}>
                          <div className="col-span-4 flex items-center gap-2 min-w-0">
                            <Icon icon={ok ? 'lucide:check-circle' : 'lucide:alert-circle'} width={14} className={ok ? 'text-success-500 shrink-0' : 'text-danger-500 shrink-0'} />
                            <div className="min-w-0">
                              <Tooltip content={p.nombreProducto} placement="top-start" delay={500}>
                                <p className="font-medium text-default-800 truncate cursor-default block pr-2">{p.nombreProducto}</p>
                              </Tooltip>
                              {p.categoria && <p className="text-[10px] text-default-400">{p.categoria}</p>}
                            </div>
                          </div>
                          <div className="col-span-2 text-center self-center">
                            <span className="font-mono font-semibold text-default-700">{fmtCant(p.cantidadTotal)}</span>
                            <span className="text-xs text-default-400 ml-1">{p.abreviatura}</span>
                          </div>
                          <div className="col-span-2 text-center self-center">
                            <span className="font-mono text-default-600">{fmtCant(p.stockBodegaTransito)}</span>
                            <span className="text-xs text-default-400 ml-1">{p.abreviatura}</span>
                          </div>
                          <div className="col-span-2 text-center self-center">
                            <span className={`font-mono font-bold ${ok ? 'text-success-600' : 'text-danger-600'}`}>
                              {ok ? '+' : ''}{fmtCant(p.diferenciaTransito)}
                            </span>
                            <span className="text-xs text-default-400 ml-1">{p.abreviatura}</span>
                          </div>
                          <div className="col-span-2 text-center self-center">
                            <span className="font-mono text-default-600">{fmtCant(p.stockInventarioPrincipal)}</span>
                            <span className="text-xs text-default-400 ml-1">{p.abreviatura}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Footer */}
                    {productosUnificadosFiltrados.some(p => p.diferenciaTransito < 0) && (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-danger-50 border-t border-danger-200">
                        <Icon icon="lucide:alert-triangle" width={13} className="text-danger-500" />
                        <span className="text-xs text-danger-700 font-medium">
                          Hay productos con stock insuficiente en Bodega de Tránsito considerando todos los pedidos de la semana.
                        </span>
                      </div>
                    )}
                  </div>
                )
              ) : (

              /* ── VISTA POR PEDIDO: individual ── */
              pedidosAprobFiltrados.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-3 text-default-400">
                  <Icon icon="lucide:shield-off" width={36} className="opacity-40" />
                  <p className="text-sm">{busquedaAprob ? `Sin resultados para "${busquedaAprob}"` : 'Sin pedidos para aprobar esta semana.'}</p>
                </div>
              ) : <div className="space-y-4">{pedidosAprobFiltrados.map(ped => {
                const isPendiente = ped.estadoPedido === 'PENDIENTE';
                const isAprobado  = ped.estadoPedido === 'APROVADO';
                const hayFaltante = ped.productos.some(p => p.diferenciaTransito < 0);

                return (
                  <div key={ped.idPedido} className="border border-default-200 rounded-2xl overflow-hidden">
                    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 ${
                      isAprobado ? 'bg-success-50 border-b border-success-200' : 'bg-default-50 border-b border-default-200'
                    }`}>
                      <div className="flex items-center gap-3 flex-1">
                        <Icon icon="lucide:file-text" width={18} className={isAprobado ? 'text-success-600' : 'text-default-500'} />
                        <div>
                          <p className="font-bold text-sm text-default-800">Pedido #{ped.idPedido}</p>
                          <p className="text-xs text-default-400">
                            {ped.productos.length} producto{ped.productos.length !== 1 ? 's' : ''}
                            {hayFaltante && <span className="text-danger ml-2 font-medium">· Faltantes detectados</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip size="sm" color={isAprobado ? 'success' : isPendiente ? 'warning' : 'danger'} variant="flat"
                          startContent={<Icon icon={isAprobado ? 'lucide:check-circle-2' : isPendiente ? 'lucide:clock' : 'lucide:x-circle'} width={10} />}>
                          {ped.estadoPedido}
                        </Chip>
                        {cong_Editar && isPendiente && (
                          <Button size="sm" color="success" variant="flat"
                            isLoading={isAprobando}
                            onPress={() => handleAprobarPedido(ped.idPedido)}
                            startContent={!isAprobando && <Icon icon="lucide:check" width={12} />}>
                            Aprobar pedido
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="grid grid-cols-12 px-4 py-2 bg-default-50 border-b border-default-100 text-[10px] font-bold text-default-500 uppercase tracking-wider">
                        <span className="col-span-4">Producto</span>
                        <span className="col-span-2 text-center">Pedido</span>
                        <span className="col-span-2 text-center">Stock Tránsito</span>
                        <span className="col-span-2 text-center">Diferencia</span>
                        <span className="col-span-2 text-center">Inv. Principal</span>
                      </div>
                      {ped.productos.map((p, i) => {
                        const ok = p.diferenciaTransito >= 0;
                        return (
                          <div key={i} className={`grid grid-cols-12 px-4 py-2.5 text-sm border-b border-default-50 last:border-0 hover:bg-default-50/50 ${ok ? '' : 'bg-danger-50/30'}`}>
                            <div className="col-span-4 flex items-center gap-2 min-w-0">
                              <Icon icon={ok ? 'lucide:check-circle' : 'lucide:alert-circle'} width={14} className={ok ? 'text-success-500 shrink-0' : 'text-danger-500 shrink-0'} />
                              <div className="min-w-0">
                                <Tooltip content={p.nombreProducto} placement="top-start" delay={500}>
                                  <p className="font-medium text-default-800 truncate cursor-default block pr-2">{p.nombreProducto}</p>
                                </Tooltip>
                                {p.categoria && <p className="text-[10px] text-default-400">{p.categoria}</p>}
                              </div>
                            </div>
                            <div className="col-span-2 text-center self-center">
                              <span className="font-mono font-semibold text-default-700">{fmtCant(p.cantidadPedido)}</span>
                              <span className="text-xs text-default-400 ml-1">{p.abreviatura}</span>
                            </div>
                            <div className="col-span-2 text-center self-center">
                              <span className="font-mono text-default-600">{fmtCant(p.stockBodegaTransito)}</span>
                              <span className="text-xs text-default-400 ml-1">{p.abreviatura}</span>
                            </div>
                            <div className="col-span-2 text-center self-center">
                              <span className={`font-mono font-bold ${ok ? 'text-success-600' : 'text-danger-600'}`}>
                                {ok ? '+' : ''}{fmtCant(p.diferenciaTransito)}
                              </span>
                              <span className="text-xs text-default-400 ml-1">{p.abreviatura}</span>
                            </div>
                            <div className="col-span-2 text-center self-center">
                              <span className="font-mono text-default-600">{fmtCant(p.stockInventarioPrincipal)}</span>
                              <span className="text-xs text-default-400 ml-1">{p.abreviatura}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {hayFaltante && (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-danger-50 border-t border-danger-200">
                        <Icon icon="lucide:alert-triangle" width={13} className="text-danger-500" />
                        <span className="text-xs text-danger-700 font-medium">
                          Hay productos con stock insuficiente en Bodega de Tránsito. Revise el Inventario Principal antes de aprobar.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}</div>
              )}

            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default ConglomeradoPedidosPage;
