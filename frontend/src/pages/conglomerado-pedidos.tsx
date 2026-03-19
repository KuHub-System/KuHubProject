/**
 * CONGLOMERADO DE PEDIDOS
 * Visualiza el pedido consolidado semanal distribuido por día y bloque horario.
 * Muestra solicitudes en estado PROCESADA listas para despacho desde Bodega de Tránsito.
 */

import React from 'react';
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
} from '../services/solicitud-service';

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
  usePageTitle('Conglomerado de Pedidos', 'Seguimiento y estado de los pedidos semanales generados a partir de solicitudes aceptadas.');
  const toast = useToast();

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
  const [vistaActiva,   setVistaActiva]   = React.useState<'cronograma' | 'totales' | 'aprobacion'>('cronograma');
  const [aprobVista,    setAprobVista]    = React.useState<'unificado' | 'individual'>('unificado');

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

  const handleAprobarPedido = (_idPedido: number) => {
    // TODO: call approve endpoint
    toast.success('Funcionalidad de aprobación en desarrollo');
  };

  const semanaActual = semanas.find(s => String(s.idSemana) === semanaId) ?? null;
  const periodosDisponibles = periodos.length > 0 ? periodos : [{ anio: new Date().getFullYear(), semestres: [1, 2] }];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

      {/* ── Selector período + semana ── */}
      <Card className="shadow-sm">
        <CardBody className="px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Icon icon="lucide:calendar-days" className="text-default-400" width={16} />
              <span className="text-xs font-bold text-default-500 uppercase tracking-wider">Período</span>
              {periodosDisponibles.map(p =>
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
            {(['cronograma', 'totales', 'aprobacion'] as const).map(v => (
              <button key={v} onClick={() => { setVistaActiva(v); setExpandidos(new Set()); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  vistaActiva === v ? 'bg-white shadow-sm text-primary' : 'text-default-500 hover:text-default-700'
                }`}>
                {v === 'cronograma'  && <span className="flex items-center gap-1.5"><Icon icon="lucide:calendar-range"  width={12} />Cronograma Semanal</span>}
                {v === 'totales'     && <span className="flex items-center gap-1.5"><Icon icon="lucide:package-check"   width={12} />Totales del Pedido</span>}
                {v === 'aprobacion'  && <span className="flex items-center gap-1.5"><Icon icon="lucide:shield-check"    width={12} />Aprobación de Pedidos</span>}
              </button>
            ))}
          </div>

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

                                {/* Estado + chevron */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <Chip size="sm" color="secondary" variant="flat"
                                    startContent={<Icon icon="lucide:check-circle-2" width={10} />}>
                                    Procesada
                                  </Chip>
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
                        {isPendiente && (
                          <Button size="sm" color="success" variant="flat" onPress={() => handleAprobarPedido(ped.idPedido)}
                            startContent={<Icon icon="lucide:check" width={12} />}>
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
