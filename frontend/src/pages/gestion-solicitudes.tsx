/**
 * GESTIÓN DE SOLICITUDES
 * Vista por semana, agrupada por asignatura.
 * Estados: Pendiente → Aceptada | Rechazada  (Procesada = solo lectura, flujo automático)
 */

import React from 'react';
import {
  Card, CardBody, CardHeader,
  Button, Input, Chip,
  Select, SelectItem,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
  Textarea, Divider, Spinner, Tooltip, Checkbox,
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
  obtenerSolicitudesPorSemanaService,
  ISolicitudPorSemanaResponse,
  cambiarEstadoMasivoService,
} from '../services/solicitud-service';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type EstadoSolicitud = 'Pendiente' | 'Aceptada' | 'Rechazada' | 'Procesada';

interface IDetalleSolicitud {
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
  unidad: string;
}

interface ISolicitudGestion {
  id: number;
  idAsignatura: number;
  nombreAsignatura: string;
  idReceta: number;
  nombreReceta: string;
  idSeccion: number;
  nombreSeccion: string;
  nombreDocente: string;
  fechaClase: string;
  horaInicio: string;
  horaFin: string;
  nombreSala: string;
  cantInscritos: number;
  estado: EstadoSolicitud;
  motivoRechazo?: string;
  observacion?: string;
  detalles: IDetalleSolicitud[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPPER — respuesta backend → ISolicitudGestion
// ─────────────────────────────────────────────────────────────────────────────

const ESTADO_MAP: Record<string, EstadoSolicitud> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA:  'Aceptada',
  RECHAZADA: 'Rechazada',
  PROCESADA: 'Procesada',
};

const fmtHora = (hms: string) => hms?.slice(0, 5) ?? ''; // "HH:mm:ss" → "HH:mm"

const mapSolicitud = (r: ISolicitudPorSemanaResponse): ISolicitudGestion => {
  const { seccion } = r.asignaturaDetalle;
  const horarios = seccion.horarios ?? [];
  const primerH  = horarios[0];
  const ultimoH  = horarios[horarios.length - 1];
  return {
    id:               r.idSolicitud,
    idAsignatura:     r.asignaturaDetalle.id_asignatura,
    nombreAsignatura: r.asignaturaDetalle.nombre_asignatura,
    idReceta:         r.idReceta,
    nombreReceta:     r.nombreReceta,
    idSeccion:        seccion.id_seccion,
    nombreSeccion:    seccion.nombre_seccion,
    nombreDocente:    seccion.nombre_docente,
    cantInscritos:    seccion.cant_inscritos,
    fechaClase:       r.fechaSolicitada,
    horaInicio:       fmtHora(primerH?.horaInicio ?? ''),
    horaFin:          fmtHora(ultimoH?.horaFin ?? ''),
    nombreSala:       primerH?.nombreSala ?? '',
    estado:           ESTADO_MAP[r.estadoSolicitud?.toUpperCase()] ?? 'Pendiente',
    motivoRechazo:    r.motivoRechazo,
    observacion:      r.observaciones,
    detalles:         (r.productos ?? []).map((p, i) => ({
      idProducto:      i,
      nombreProducto:  p.nombreProducto,
      cantidad:        p.cantidad,
      unidad:          p.unidad,
    })),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtFecha = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });

const fmtFechaCorta = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  const dia = d.toLocaleDateString('es-CL', { weekday: 'short' }).toUpperCase().replace('.', '');
  return { dia, fecha: `${d.getDate()}/${d.getMonth() + 1}` };
};

const ESTADO_CFG: Record<EstadoSolicitud, { color: 'warning' | 'success' | 'danger' | 'default'; icon: string; label: string }> = {
  Pendiente: { color: 'warning', icon: 'lucide:clock',        label: 'Pendiente' },
  Aceptada:  { color: 'success', icon: 'lucide:check-circle', label: 'Aceptada'  },
  Rechazada: { color: 'danger',  icon: 'lucide:x-circle',     label: 'Rechazada' },
  Procesada: { color: 'default', icon: 'lucide:archive',      label: 'Procesada' },
};

const MOTIVO_MAX = 90;
const MotivoTexto: React.FC<{ texto: string }> = ({ texto }) => {
  const [expandido, setExpandido] = React.useState(false);
  const corto = texto.length > MOTIVO_MAX;
  return (
    <p className="mt-1 text-xs text-danger-600 bg-danger-50 border border-danger-200 rounded px-2 py-1 italic leading-snug">
      {corto && !expandido ? `${texto.slice(0, MOTIVO_MAX)}...` : texto}
      {corto && (
        <button onClick={() => setExpandido(v => !v)}
          className="ml-1 font-semibold underline underline-offset-2 not-italic text-danger-700">
          {expandido ? 'ver menos' : 'ver más'}
        </button>
      )}
    </p>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

const GestionSolicitudesPage: React.FC = () => {
  usePageTitle('Gestión de Solicitudes', 'Administre las solicitudes de insumos realizadas por los docentes.');
  const toast = useToast();

  // ── Semanas ──
  const [periodos,       setPeriodos]       = React.useState<IPeriodoAcademico[]>([]);
  const [semanas,        setSemanas]        = React.useState<ISemana[]>([]);
  const [semanaId,       setSemanaId]       = React.useState<string>('');
  const [defaultSemanaId, setDefaultSemanaId] = React.useState<string>('');
  const [isLoadingSem, setIsLoadingSem] = React.useState(true);

  // ── Solicitudes ──
  const [solicitudes,  setSolicitudes]  = React.useState<ISolicitudGestion[]>([]);
  const [isLoadingSol, setIsLoadingSol] = React.useState(false);

  // ── Filtros ──
  const [busqueda,     setBusqueda]     = React.useState('');
  const [filtroEstado, setFiltroEstado] = React.useState<EstadoSolicitud | 'Todas'>('Pendiente');

  // ── Selección masiva ──
  const [seleccionados, setSeleccionados] = React.useState<Set<number>>(new Set());

  // ── Modales ──
  const detalle  = useDisclosure();
  const rechazar = useDisclosure();
  const revertir = useDisclosure();
  const [selSol,            setSelSol]            = React.useState<ISolicitudGestion | null>(null);
  const [motivoRechazo,     setMotivoRechazo]     = React.useState('');
  const [revertirAccion,    setRevertirAccion]     = React.useState<'pendiente' | 'rechazar' | 'aceptar'>('pendiente');
  const [revertirDesde,     setRevertirDesde]      = React.useState<'Aceptada' | 'Rechazada'>('Aceptada');
  const [revertirConfirm,   setRevertirConfirm]   = React.useState('');
  const [revertirMotivo,    setRevertirMotivo]     = React.useState('');
  const [isSaving,          setIsSaving]           = React.useState(false);

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
    setIsLoadingSem(true); setSolicitudes([]); setSemanaId(''); setSeleccionados(new Set());
    try {
      const data = await obtenerSemanasPorPeriodoService(anio, semestre);
      setSemanas(data);
      const actual = encontrarSemanaActual(data);
      setDefaultSemanaId(actual ? String(actual.idSemana) : '');
      if (data.length > 0) setSemanaId(actual ? String(actual.idSemana) : String(data[0].idSemana));
    } catch { toast.error('Error al cargar semanas del período'); }
    finally { setIsLoadingSem(false); }
  };

  // ── Carga solicitudes al cambiar semana ──
  React.useEffect(() => {
    if (!semanaId) { setSolicitudes([]); return; }
    const semana = semanas.find(s => String(s.idSemana) === semanaId);
    if (!semana) return;
    setIsLoadingSol(true); setSeleccionados(new Set());
    obtenerSolicitudesPorSemanaService({ fechaInicio: semana.fechaInicio, fechaFin: semana.fechaFin })
      .then(data => setSolicitudes(data.map(mapSolicitud)))
      .catch(() => toast.error('Error al cargar las solicitudes de la semana'))
      .finally(() => setIsLoadingSol(false));
  }, [semanaId, semanas]);

  // ── Contadores ──
  const contadores = React.useMemo(() => ({
    total:     solicitudes.length,
    pendientes: solicitudes.filter(s => s.estado === 'Pendiente').length,
    aceptadas:  solicitudes.filter(s => s.estado === 'Aceptada').length,
    rechazadas: solicitudes.filter(s => s.estado === 'Rechazada').length,
    procesadas: solicitudes.filter(s => s.estado === 'Procesada').length,
  }), [solicitudes]);

  // ── Filtrado ──
  const solicitudesFiltradas = React.useMemo(() => {
    let list = solicitudes;
    if (filtroEstado !== 'Todas') list = list.filter(s => s.estado === filtroEstado);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      list = list.filter(s =>
        s.nombreAsignatura.toLowerCase().includes(q) ||
        s.nombreReceta.toLowerCase().includes(q) ||
        s.nombreDocente.toLowerCase().includes(q) ||
        s.nombreSeccion.toLowerCase().includes(q) ||
        s.nombreSala.toLowerCase().includes(q)
      );
    }
    return list;
  }, [solicitudes, filtroEstado, busqueda]);

  // ── Agrupación por asignatura ──
  const grupos = React.useMemo(() => {
    const map = new Map<number, { idAsignatura: number; nombre: string; items: ISolicitudGestion[] }>();
    for (const s of solicitudesFiltradas) {
      if (!map.has(s.idAsignatura)) map.set(s.idAsignatura, { idAsignatura: s.idAsignatura, nombre: s.nombreAsignatura, items: [] });
      map.get(s.idAsignatura)!.items.push(s);
    }
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [solicitudesFiltradas]);

  // ── Helpers de selección ──
  const pendientesDeGrupo = (items: ISolicitudGestion[]) => items.filter(s => s.estado === 'Pendiente');

  const toggleGrupo = (items: ISolicitudGestion[]) => {
    const pend = pendientesDeGrupo(items);
    const todosSeleccionados = pend.every(s => seleccionados.has(s.id));
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (todosSeleccionados) pend.forEach(s => next.delete(s.id));
      else pend.forEach(s => next.add(s.id));
      return next;
    });
  };

  const toggleItem = (id: number) => {
    setSeleccionados(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const grupoChecked = (items: ISolicitudGestion[]) => {
    const pend = pendientesDeGrupo(items);
    if (pend.length === 0) return false;
    return pend.every(s => seleccionados.has(s.id));
  };

  const grupoIndeterminate = (items: ISolicitudGestion[]) => {
    const pend = pendientesDeGrupo(items);
    if (pend.length === 0) return false;
    const sel = pend.filter(s => seleccionados.has(s.id));
    return sel.length > 0 && sel.length < pend.length;
  };

  // ── Acciones de estado ──
  const aceptar = async (sol: ISolicitudGestion) => {
    setIsSaving(true);
    try {
      await cambiarEstadoMasivoService({ estadosSolicitudes: [{ idSolicitud: sol.id, estado: 'ACEPTADA' }] });
      setSolicitudes(prev => prev.map(s => s.id === sol.id ? { ...s, estado: 'Aceptada' } : s));
      setSeleccionados(prev => { const n = new Set(prev); n.delete(sol.id); return n; });
      toast.success(`Solicitud §${sol.nombreSeccion} aceptada`);
    } catch { toast.error('Error al aceptar la solicitud'); }
    setIsSaving(false);
  };

  const abrirRechazar = (sol: ISolicitudGestion) => {
    setSelSol(sol); setMotivoRechazo(''); rechazar.onOpen();
  };

  const confirmarRechazo = async () => {
    if (!selSol || !motivoRechazo.trim()) return;
    setIsSaving(true);
    try {
      await cambiarEstadoMasivoService({ estadosSolicitudes: [{ idSolicitud: selSol.id, estado: 'RECHAZADA' }] });
      setSolicitudes(prev => prev.map(s => s.id === selSol.id ? { ...s, estado: 'Rechazada', motivoRechazo: motivoRechazo.trim() } : s));
      setSeleccionados(prev => { const n = new Set(prev); n.delete(selSol.id); return n; });
      toast.warning(`Solicitud §${selSol.nombreSeccion} rechazada`);
      rechazar.onClose();
    } catch { toast.error('Error al rechazar la solicitud'); }
    setIsSaving(false);
  };

  const aceptarSeleccionados = async () => {
    const ids = Array.from(seleccionados);
    if (ids.length === 0) return;
    setIsSaving(true);
    try {
      await cambiarEstadoMasivoService({ estadosSolicitudes: ids.map(id => ({ idSolicitud: id, estado: 'ACEPTADA' })) });
      setSolicitudes(prev => prev.map(s => ids.includes(s.id) && s.estado === 'Pendiente' ? { ...s, estado: 'Aceptada' } : s));
      setSeleccionados(new Set());
      toast.success(`${ids.length} solicitud${ids.length > 1 ? 'es' : ''} aceptada${ids.length > 1 ? 's' : ''}`);
    } catch { toast.error('Error al aceptar las solicitudes'); }
    setIsSaving(false);
  };

  const aceptarTodasPendientes = async () => {
    const pend = solicitudesFiltradas.filter(s => s.estado === 'Pendiente');
    if (pend.length === 0) return;
    setIsSaving(true);
    try {
      await cambiarEstadoMasivoService({ estadosSolicitudes: pend.map(s => ({ idSolicitud: s.id, estado: 'ACEPTADA' })) });
      const ids = new Set(pend.map(s => s.id));
      setSolicitudes(prev => prev.map(s => ids.has(s.id) ? { ...s, estado: 'Aceptada' } : s));
      setSeleccionados(new Set());
      toast.success(`${pend.length} solicitud${pend.length > 1 ? 'es' : ''} aceptada${pend.length > 1 ? 's' : ''}`);
    } catch { toast.error('Error al aceptar las solicitudes'); }
    setIsSaving(false);
  };

  const abrirDetalle = (sol: ISolicitudGestion) => { setSelSol(sol); detalle.onOpen(); };

  const abrirRevertir = (sol: ISolicitudGestion, accion: 'pendiente' | 'rechazar' | 'aceptar', desde: 'Aceptada' | 'Rechazada' = 'Aceptada') => {
    setSelSol(sol); setRevertirAccion(accion); setRevertirDesde(desde); setRevertirConfirm(''); setRevertirMotivo('');
    revertir.onOpen();
  };

  const confirmarRevertir = async () => {
    if (!selSol || revertirConfirm.trim().toUpperCase() !== 'CONFIRMAR') return;
    if (revertirAccion === 'rechazar' && !revertirMotivo.trim()) return;
    setIsSaving(true);
    try {
      const nuevoEstado = revertirAccion === 'pendiente' ? 'PENDIENTE' : revertirAccion === 'aceptar' ? 'ACEPTADA' : 'RECHAZADA';
      await cambiarEstadoMasivoService({ estadosSolicitudes: [{ idSolicitud: selSol.id, estado: nuevoEstado }] });
      if (revertirAccion === 'pendiente') {
        setSolicitudes(prev => prev.map(s => s.id === selSol.id ? { ...s, estado: 'Pendiente', motivoRechazo: undefined } : s));
        toast.warning(`Solicitud §${selSol.nombreSeccion} revertida a Pendiente`);
      } else if (revertirAccion === 'aceptar') {
        setSolicitudes(prev => prev.map(s => s.id === selSol.id ? { ...s, estado: 'Aceptada', motivoRechazo: undefined } : s));
        toast.success(`Solicitud §${selSol.nombreSeccion} aceptada`);
      } else {
        setSolicitudes(prev => prev.map(s => s.id === selSol.id ? { ...s, estado: 'Rechazada', motivoRechazo: revertirMotivo.trim() } : s));
        toast.warning(`Solicitud §${selSol.nombreSeccion} rechazada`);
      }
      revertir.onClose();
    } catch { toast.error('Error al cambiar el estado de la solicitud'); }
    setIsSaving(false);
  };

  const semanaActual = semanas.find(s => String(s.idSemana) === semanaId) ?? null;
  const periodosDisponibles = periodos.length > 0 ? periodos : [{ anio: new Date().getFullYear(), semestres: [1, 2] }];
  const haySeleccionados = seleccionados.size > 0;

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
                      }`}
                    >
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
                <p className="text-sm text-default-400">Sin semanas disponibles para este período.</p>
              ) : (
                <Select size="sm" variant="bordered"
                  selectedKeys={semanaId ? new Set([semanaId]) : new Set()}
                  onSelectionChange={keys => { const v = Array.from(keys as Set<string>)[0]; if (v) setSemanaId(v); }}
                  placeholder="Seleccione una semana"
                  classNames={{ trigger: 'bg-default-50', base: 'max-w-xs' }}
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

      {/* ── Tarjetas de conteo ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: 'Total',      val: contadores.total,      color: 'border-default-200', icon: 'lucide:list',         text: 'text-default-700' },
          { label: 'Pendientes', val: contadores.pendientes, color: 'border-warning-200', icon: 'lucide:clock',        text: 'text-warning-700' },
          { label: 'Aceptadas',  val: contadores.aceptadas,  color: 'border-success-200', icon: 'lucide:check-circle', text: 'text-success-700' },
          { label: 'Rechazadas', val: contadores.rechazadas, color: 'border-danger-200',  icon: 'lucide:x-circle',     text: 'text-danger-700'  },
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

      {/* ── Contenido ── */}
      <Card className="shadow-sm">
        <CardHeader className="px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Input size="sm" variant="bordered" placeholder="Buscar asignatura, receta, docente..."
            value={busqueda} onValueChange={setBusqueda}
            startContent={<Icon icon="lucide:search" className="text-default-400" width={14} />}
            classNames={{ base: 'max-w-xs', inputWrapper: 'bg-default-50' }}
          />

          {/* Pills estado */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['Todas', 'Pendiente', 'Aceptada', 'Rechazada', 'Procesada'] as const).map(e => (
              <button key={e} onClick={() => { setFiltroEstado(e); setSeleccionados(new Set()); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  filtroEstado === e ? 'bg-primary text-white border-primary' : 'bg-default-100 text-default-600 border-default-200 hover:bg-default-200'
                }`}
              >
                {e}
                {e !== 'Todas' && (
                  <span className="ml-1 opacity-70">
                    ({e === 'Pendiente' ? contadores.pendientes : e === 'Aceptada' ? contadores.aceptadas : e === 'Rechazada' ? contadores.rechazadas : contadores.procesadas})
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="sm:ml-auto flex items-center gap-2 shrink-0">
            {/* Acción masiva sobre seleccionados */}
            {haySeleccionados && (
              <Button size="sm" color="success" variant="flat" isLoading={isSaving}
                onPress={aceptarSeleccionados}
                startContent={!isSaving && <Icon icon="lucide:check-check" width={14} />}
              >
                Aceptar {seleccionados.size} seleccionada{seleccionados.size > 1 ? 's' : ''}
              </Button>
            )}
            {/* Aceptar todas pendientes */}
            {!haySeleccionados && contadores.pendientes > 0 && (
              <Button size="sm" color="success" variant="flat" isLoading={isSaving}
                onPress={aceptarTodasPendientes}
                startContent={!isSaving && <Icon icon="lucide:check-check" width={14} />}
              >
                Aceptar {contadores.pendientes} pendiente{contadores.pendientes > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </CardHeader>

        {['Pendiente', 'Aceptada', 'Rechazada', 'Procesada'].includes(filtroEstado) && (
          <div className="px-5 pb-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-default-100/50 border border-default-200 rounded-lg text-sm text-default-600">
              <Icon icon="lucide:info" width={18} className="shrink-0 text-default-500" />
              {filtroEstado === 'Pendiente' && <span>Al llegar la fecha solicitada y no aceptan la solicitud, pasará al estado rechazado automáticamente.</span>}
              {filtroEstado === 'Aceptada' && <span>La solicitud aceptada está incluida automáticamente al conglomerado de pedidos.</span>}
              {filtroEstado === 'Rechazada' && <span>La solicitud rechazada no está disponible para restaurar su estado si la fecha solicitada es anterior a la actual.</span>}
              {filtroEstado === 'Procesada' && <span>Historial de solicitudes que ya fueron consolidadas y entregadas.</span>}
            </div>
          </div>
        )}

        <Divider />

        <CardBody className="p-4 space-y-4">
          {isLoadingSol ? (
            <div className="py-16 flex flex-col items-center gap-3 text-default-400">
              <Spinner size="lg" />
              <p className="text-sm">Cargando solicitudes de la semana...</p>
            </div>
          ) : !semanaId ? (
            <div className="py-16 flex flex-col items-center gap-3 text-default-400">
              <Icon icon="lucide:calendar-search" width={48} className="opacity-40" />
              <p className="text-sm">Seleccione una semana para ver las solicitudes.</p>
            </div>
          ) : grupos.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-default-400">
              <Icon icon="lucide:inbox" width={48} className="opacity-40" />
              <p className="text-sm">No se encontraron solicitudes{filtroEstado !== 'Todas' ? ` con estado "${filtroEstado}"` : ''} para esta semana.</p>
            </div>
          ) : (
            grupos.map(grupo => {
              const pendGrupo = pendientesDeGrupo(grupo.items);
              const tienePendientes = pendGrupo.length > 0;
              const isChecked = grupoChecked(grupo.items);
              const isIndet  = grupoIndeterminate(grupo.items);

              return (
                <div key={grupo.idAsignatura} className="rounded-xl border border-default-200 overflow-hidden">
                  {/* Cabecera del grupo */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-default-50 border-b border-default-200">
                    {/* Checkbox grupo (solo si hay pendientes) */}
                    {tienePendientes ? (
                      <Checkbox
                        size="sm"
                        isSelected={isChecked}
                        isIndeterminate={isIndet}
                        onValueChange={() => toggleGrupo(grupo.items)}
                        aria-label={`Seleccionar todas las pendientes de ${grupo.nombre}`}
                      />
                    ) : (
                      <div className="w-4" /> /* spacer para alinear */
                    )}
                    <Icon icon="lucide:graduation-cap" width={14} className="text-default-500 shrink-0" />
                    <span className="font-bold text-sm text-default-700">{grupo.nombre}</span>
                    <div className="ml-auto flex items-center gap-2">
                      {/* Acción rápida aceptar pendientes del grupo */}
                      {pendGrupo.length > 0 && (
                        <Button size="sm" variant="flat" color="success"
                          className="text-xs h-6 px-2 min-w-0"
                          isLoading={isSaving}
                          onPress={async () => {
                            setIsSaving(true);
                            try {
                              await cambiarEstadoMasivoService({ estadosSolicitudes: pendGrupo.map(s => ({ idSolicitud: s.id, estado: 'ACEPTADA' })) });
                              const ids = new Set(pendGrupo.map(s => s.id));
                              setSolicitudes(prev => prev.map(s => ids.has(s.id) ? { ...s, estado: 'Aceptada' } : s));
                              setSeleccionados(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
                              toast.success(`${pendGrupo.length} solicitud${pendGrupo.length > 1 ? 'es' : ''} aceptada${pendGrupo.length > 1 ? 's' : ''}`);
                            } catch { toast.error('Error al aceptar'); }
                            setIsSaving(false);
                          }}
                          startContent={!isSaving && <Icon icon="lucide:check" width={11} />}
                        >
                          Aceptar {pendGrupo.length}
                        </Button>
                      )}
                      <span className="text-xs text-default-400">{grupo.items.length} solicitud{grupo.items.length > 1 ? 'es' : ''}</span>
                    </div>
                  </div>

                  {/* Filas */}
                  <div className="divide-y divide-default-100">
                    {grupo.items.map(sol => {
                      const cfg    = ESTADO_CFG[sol.estado];
                      const fch    = fmtFechaCorta(sol.fechaClase);
                      const esPend = sol.estado === 'Pendiente';

                      return (
                        <div key={sol.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 hover:bg-default-50/50 transition-colors cursor-pointer"
                          onClick={() => abrirDetalle(sol)}
                        >
                          {/* Checkbox individual (solo pendientes) */}
                          <div className="w-5 shrink-0 flex justify-center" onClick={e => e.stopPropagation()}>
                            {esPend ? (
                              <Checkbox size="sm" isSelected={seleccionados.has(sol.id)}
                                onValueChange={() => toggleItem(sol.id)}
                                aria-label={`Seleccionar §${sol.nombreSeccion}`}
                              />
                            ) : <div className="w-4" />}
                          </div>

                          {/* Fecha */}
                          <div className="shrink-0 flex flex-col items-center justify-center bg-primary-50 border border-primary-100 rounded-lg px-2.5 py-1.5 min-w-[56px] text-center">
                            <span className="text-[10px] font-bold text-primary-500 uppercase leading-none">{fch.dia}</span>
                            <span className="text-sm font-bold text-primary leading-tight">{fch.fecha}</span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">§{sol.nombreSeccion}</span>
                              <span className="text-xs text-default-400">·</span>
                              <span className="text-sm text-default-600">{sol.nombreDocente}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-default-400 flex-wrap">
                              <span className="flex items-center gap-1"><Icon icon="lucide:book-open" width={11} />{sol.nombreReceta}</span>
                              <span className="flex items-center gap-1"><Icon icon="lucide:clock" width={11} />{sol.horaInicio}–{sol.horaFin}</span>
                              <span className="flex items-center gap-1"><Icon icon="lucide:door-open" width={11} />{sol.nombreSala}</span>
                              <span className="flex items-center gap-1"><Icon icon="lucide:users" width={11} />{sol.cantInscritos} alumnos</span>
                              <span className="flex items-center gap-1"><Icon icon="lucide:package" width={11} />{sol.detalles.length} productos</span>
                            </div>
                            {sol.motivoRechazo && <MotivoTexto texto={sol.motivoRechazo} />}
                            {sol.observacion && (
                              <p className="mt-1 text-xs text-default-500 italic">Obs: {sol.observacion}</p>
                            )}
                          </div>

                          {/* Estado + acciones */}
                          <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                            <Chip size="sm" color={cfg.color} variant="flat"
                              startContent={<Icon icon={cfg.icon} width={11} />}
                            >
                              {cfg.label}
                            </Chip>

                            {esPend && (
                              <>
                                <Tooltip content="Aceptar">
                                  <Button isIconOnly size="sm" color="success" variant="flat"
                                    isLoading={isSaving} onPress={() => aceptar(sol)}>
                                    <Icon icon="lucide:check" width={15} />
                                  </Button>
                                </Tooltip>
                                <Tooltip content="Rechazar">
                                  <Button isIconOnly size="sm" color="danger" variant="flat"
                                    onPress={() => abrirRechazar(sol)}>
                                    <Icon icon="lucide:x" width={15} />
                                  </Button>
                                </Tooltip>
                              </>
                            )}

                            {sol.estado === 'Aceptada' && (
                              <>
                                <Tooltip content="Revertir a Pendiente">
                                  <Button isIconOnly size="sm" color="warning" variant="flat"
                                    onPress={() => abrirRevertir(sol, 'pendiente', 'Aceptada')}>
                                    <Icon icon="lucide:undo-2" width={15} />
                                  </Button>
                                </Tooltip>
                                <Tooltip content="Rechazar">
                                  <Button isIconOnly size="sm" color="danger" variant="flat"
                                    onPress={() => abrirRevertir(sol, 'rechazar', 'Aceptada')}>
                                    <Icon icon="lucide:x" width={15} />
                                  </Button>
                                </Tooltip>
                              </>
                            )}

                            {sol.estado === 'Rechazada' && (
                              <>
                              <Tooltip content="Aceptar solicitud">
                                <Button isIconOnly size="sm" color="success" variant="flat"
                                  onPress={() => abrirRevertir(sol, 'aceptar', 'Rechazada')}>
                                  <Icon icon="lucide:check" width={15} />
                                </Button>
                              </Tooltip>
                              <Tooltip content="Revertir a Pendiente">
                                <Button isIconOnly size="sm" color="warning" variant="flat"
                                  onPress={() => abrirRevertir(sol, 'pendiente', 'Rechazada')}>
                                  <Icon icon="lucide:undo-2" width={15} />
                                </Button>
                              </Tooltip>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </CardBody>
      </Card>

      {/* ── Modal Detalle ── */}
      <Modal isOpen={detalle.isOpen} onOpenChange={detalle.onOpenChange} size="lg" scrollBehavior="inside">
        <ModalContent>
          {onClose => selSol && (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:file-text" width={18} className="text-primary" />
                  <span>Detalle de Solicitud</span>
                  <Chip size="sm" color={ESTADO_CFG[selSol.estado].color} variant="flat" className="ml-auto">
                    {ESTADO_CFG[selSol.estado].label}
                  </Chip>
                </div>
                <p className="text-sm font-normal text-default-500">
                  {selSol.nombreAsignatura} · §{selSol.nombreSeccion} · {fmtFecha(selSol.fechaClase)}
                </p>
              </ModalHeader>
              <ModalBody className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { icon: 'lucide:book-open',  label: 'Receta',    val: selSol.nombreReceta  },
                    { icon: 'lucide:user',        label: 'Docente',   val: selSol.nombreDocente },
                    { icon: 'lucide:clock',       label: 'Horario',   val: `${selSol.horaInicio} – ${selSol.horaFin}` },
                    { icon: 'lucide:door-open',   label: 'Sala',      val: selSol.nombreSala    },
                    { icon: 'lucide:users',       label: 'Alumnos',   val: String(selSol.cantInscritos) },
                    { icon: 'lucide:package',     label: 'Productos', val: `${selSol.detalles.length} ítems` },
                  ].map(r => (
                    <div key={r.label} className="flex items-start gap-2">
                      <Icon icon={r.icon} width={14} className="text-default-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-default-400">{r.label}</p>
                        <p className="font-medium">{r.val}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {selSol.observacion && (
                  <div className="bg-default-50 border border-default-200 rounded-lg px-3 py-2 text-sm">
                    <p className="text-xs text-default-400 mb-0.5">Observación</p>
                    <p className="italic text-default-600">{selSol.observacion}</p>
                  </div>
                )}

                {selSol.motivoRechazo && (
                  <div className="bg-danger-50 border border-danger-200 rounded-lg px-3 py-2 text-sm">
                    <p className="text-xs text-danger-500 mb-0.5">Motivo de rechazo</p>
                    <p className="italic text-danger-700">{selSol.motivoRechazo}</p>
                  </div>
                )}

                <Divider />

                <div>
                  <p className="text-xs font-bold text-default-500 uppercase tracking-wider mb-2">Productos solicitados</p>
                  <Table removeWrapper aria-label="Productos"
                    classNames={{ th: 'bg-default-50 text-xs', td: 'text-sm py-2' }}>
                    <TableHeader>
                      <TableColumn>PRODUCTO</TableColumn>
                      <TableColumn className="text-right">CANTIDAD</TableColumn>
                      <TableColumn>UNIDAD</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {selSol.detalles.map(d => (
                        <TableRow key={d.idProducto}>
                          <TableCell>{d.nombreProducto}</TableCell>
                          <TableCell className="text-right font-mono">{d.cantidad}</TableCell>
                          <TableCell className="text-default-500">{d.unidad}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ModalBody>
              <ModalFooter className="gap-2">
                {selSol.estado === 'Pendiente' && (
                  <>
                    <Button color="danger" variant="flat"
                      onPress={() => { onClose(); abrirRechazar(selSol); }}
                      startContent={<Icon icon="lucide:x" width={14} />}>
                      Rechazar
                    </Button>
                    <Button color="success"
                      onPress={async () => { await aceptar(selSol); onClose(); }}
                      startContent={<Icon icon="lucide:check" width={14} />}>
                      Aceptar
                    </Button>
                  </>
                )}
                {selSol.estado === 'Aceptada' && (
                  <>
                    <Button color="warning" variant="flat"
                      onPress={() => { onClose(); abrirRevertir(selSol, 'pendiente', 'Aceptada'); }}
                      startContent={<Icon icon="lucide:undo-2" width={14} />}>
                      Revertir a Pendiente
                    </Button>
                    <Button color="danger" variant="flat"
                      onPress={() => { onClose(); abrirRevertir(selSol, 'rechazar', 'Aceptada'); }}
                      startContent={<Icon icon="lucide:x" width={14} />}>
                      Rechazar
                    </Button>
                  </>
                )}
                {selSol.estado === 'Rechazada' && (
                  <>
                  <Button color="success" variant="flat"
                    onPress={() => { onClose(); abrirRevertir(selSol, 'aceptar', 'Rechazada'); }}
                    startContent={<Icon icon="lucide:check-circle" width={14} />}>
                    Aceptar
                  </Button>
                  <Button color="warning" variant="flat"
                    onPress={() => { onClose(); abrirRevertir(selSol, 'pendiente', 'Rechazada'); }}
                    startContent={<Icon icon="lucide:undo-2" width={14} />}>
                    Revertir a Pendiente
                  </Button>
                  </>
                )}
                <Button variant="light" onPress={onClose}>Cerrar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Modal Rechazar ── */}
      <Modal isOpen={rechazar.isOpen} onOpenChange={rechazar.onOpenChange} size="sm">
        <ModalContent>
          {onClose => selSol && (
            <>
              <ModalHeader className="flex items-center gap-2 text-danger">
                <Icon icon="lucide:x-circle" width={18} />
                Rechazar solicitud
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600 mb-2">
                  <span className="font-semibold">{selSol.nombreAsignatura} §{selSol.nombreSeccion}</span>
                  {' — '}{fmtFecha(selSol.fechaClase)}
                </p>
                <Textarea
                  label="Motivo del rechazo"
                  placeholder="Indique el motivo para informar al docente..."
                  value={motivoRechazo}
                  onValueChange={setMotivoRechazo}
                  minRows={3} maxRows={6} maxLength={500}
                  isRequired variant="bordered"
                  description={`${motivoRechazo.length}/500 caracteres`}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="danger" isLoading={isSaving} isDisabled={!motivoRechazo.trim()}
                  onPress={confirmarRechazo}
                  startContent={!isSaving && <Icon icon="lucide:x-circle" width={14} />}
                >
                  Confirmar rechazo
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Modal Revertir desde Aceptada (requiere CONFIRMAR) ── */}
      <Modal isOpen={revertir.isOpen} onOpenChange={revertir.onOpenChange} size="sm">
        <ModalContent>
          {onClose => selSol && (
            <>
              <ModalHeader className="flex items-center gap-2 text-warning-700">
                <Icon icon="lucide:alert-triangle" width={18} />
                {revertirAccion === 'pendiente' ? 'Revertir a Pendiente' : revertirAccion === 'aceptar' ? 'Aceptar solicitud Rechazada' : 'Rechazar solicitud Aceptada'}
              </ModalHeader>
              <ModalBody className="space-y-3">
                <div className="bg-warning-50 border border-warning-200 rounded-lg px-3 py-2.5 text-sm text-warning-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Icon icon="lucide:triangle-alert" width={14} /> Advertencia
                  </p>
                  {revertirDesde === 'Aceptada' ? (
                    <p>
                      Esta solicitud está marcada como <strong>Aceptada</strong> y podría estar incluida en el pedido consolidado.
                      Al cambiar su estado, <strong>dejará de considerarse en el pedido</strong>.
                    </p>
                  ) : revertirAccion === 'aceptar' ? (
                    <p>
                      Esta acción marcará la solicitud como <strong>Aceptada</strong> directamente desde Rechazada.
                      La solicitud <strong>volverá a considerarse en el pedido consolidado</strong>.
                    </p>
                  ) : (
                    <p>
                      Esta acción revertirá la solicitud al estado <strong>Pendiente</strong>.
                      El docente podrá ver que su solicitud vuelve a estar en revisión.
                    </p>
                  )}
                </div>
                <p className="text-sm text-default-600">
                  <span className="font-semibold">{selSol.nombreAsignatura} §{selSol.nombreSeccion}</span>
                  {' — '}{fmtFecha(selSol.fechaClase)}
                </p>
                {revertirAccion === 'rechazar' && (
                  <Textarea
                    label="Motivo del rechazo"
                    placeholder="Indique el motivo para informar al docente..."
                    value={revertirMotivo}
                    onValueChange={setRevertirMotivo}
                    minRows={2} maxRows={4} maxLength={500}
                    isRequired variant="bordered"
                    description={`${revertirMotivo.length}/500 caracteres`}
                  />
                )}
                <Input
                  label='Escriba "CONFIRMAR" para continuar'
                  placeholder="CONFIRMAR"
                  value={revertirConfirm}
                  onValueChange={setRevertirConfirm}
                  variant="bordered"
                  color={revertirConfirm.trim().toUpperCase() === 'CONFIRMAR' ? 'success' : 'default'}
                  endContent={revertirConfirm.trim().toUpperCase() === 'CONFIRMAR'
                    ? <Icon icon="lucide:check-circle" width={16} className="text-success" />
                    : null}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button
                  color={revertirAccion === 'pendiente' ? 'warning' : revertirAccion === 'aceptar' ? 'success' : 'danger'}
                  isLoading={isSaving}
                  isDisabled={
                    revertirConfirm.trim().toUpperCase() !== 'CONFIRMAR' ||
                    (revertirAccion === 'rechazar' && !revertirMotivo.trim())
                  }
                  onPress={confirmarRevertir}
                  startContent={!isSaving && <Icon icon={revertirAccion === 'pendiente' ? 'lucide:undo-2' : revertirAccion === 'aceptar' ? 'lucide:check-circle' : 'lucide:x-circle'} width={14} />}
                >
                  {revertirAccion === 'pendiente' ? 'Revertir a Pendiente' : revertirAccion === 'aceptar' ? 'Confirmar aceptación' : 'Confirmar rechazo'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default GestionSolicitudesPage;
