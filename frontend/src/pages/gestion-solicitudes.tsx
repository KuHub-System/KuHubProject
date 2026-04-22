/**
 * GESTIÓN DE SOLICITUDES
 * Vista por semana, agrupada por asignatura.
 * Estados: Pendiente → Aceptada | Rechazada  (Procesada = solo lectura, flujo automático)
 */

import React from 'react';
import { fmtCL } from '../utils/format-numbers';
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
  obtenerSolicitudesPorSemanaService,
  ISolicitudPorSemanaResponse,
  cambiarEstadoMasivoService,
} from '../services/solicitud-service';
import { useModulePermission, usePermission } from '../contexts/permission-context';
import { usePeriodoSemana } from '../contexts/periodo-semana-context';
import { useHistory } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type EstadoSolicitud = 'Pendiente' | 'Aceptada' | 'Rechazada' | 'Procesada' | 'En Pedido';

interface IDetalleSolicitud {
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  observacion?: string | null;
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
  PENDIENTE:  'Pendiente',
  ACEPTADA:   'Aceptada',
  RECHAZADA:  'Rechazada',
  PROCESADA:  'Procesada', // por si el backend devuelve con A
  PROCESADO:  'Procesada', // el enum real de la BD es PROCESADO (sin A)
  EN_PEDIDO:  'En Pedido',
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
      observacion:     p.observacion,
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

const ESTADO_CFG: Record<EstadoSolicitud, { color: 'warning' | 'success' | 'danger' | 'default' | 'primary' | 'secondary'; icon: string; label: string }> = {
  Pendiente:  { color: 'warning',   icon: 'lucide:clock',          label: 'Pendiente'  },
  Aceptada:   { color: 'success',   icon: 'lucide:check-circle',   label: 'Aceptada'   },
  Rechazada:  { color: 'danger',    icon: 'lucide:x-circle',       label: 'Rechazada'  },
  Procesada:  { color: 'default',   icon: 'lucide:archive',        label: 'Procesada'  },
  'En Pedido':{ color: 'secondary', icon: 'lucide:shopping-cart',  label: 'En Pedido'  },
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
  usePageTitle('Gestión de Solicitudes', 'Administre las solicitudes de insumos realizadas por los docentes.', 'lucide:clipboard-check');
  const toast = useToast();
  const { canCreate: sol_Crear, canUpdate: sol_Editar, canDelete: sol_Eliminar } = useModulePermission('GESTION_SOLICITUDES');
  const { isAdmin } = usePermission();
  const history = useHistory();

  const { periodos, semanas, semanaId, defaultSemanaId, isLoading: isLoadingSem, seleccionarPeriodo, seleccionarSemana } = usePeriodoSemana();

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

  React.useEffect(() => {
    if (!semanaId) { setSolicitudes([]); setSeleccionados(new Set()); return; }
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
    enPedido:   solicitudes.filter(s => s.estado === 'En Pedido').length,
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

  // ── Recarga solicitudes desde el servidor ──
  const recargarSolicitudes = React.useCallback(() => {
    if (!semanaId) return;
    const semana = semanas.find(s => String(s.idSemana) === semanaId);
    if (!semana) return;
    setIsLoadingSol(true);
    obtenerSolicitudesPorSemanaService({ fechaInicio: semana.fechaInicio, fechaFin: semana.fechaFin })
      .then(data => setSolicitudes(data.map(mapSolicitud)))
      .catch(() => toast.error('Error al recargar las solicitudes'))
      .finally(() => setIsLoadingSol(false));
  }, [semanaId, semanas]);

  // ── Acciones de estado ──
  const aceptar = async (sol: ISolicitudGestion) => {
    setIsSaving(true);
    try {
      await cambiarEstadoMasivoService({
        estadosSolicitudes: [{ idSolicitud: sol.id, estado: 'ACEPTADA' }],
        idSemana: semanaId ? Number(semanaId) : undefined,
      });
      setSeleccionados(prev => { const n = new Set(prev); n.delete(sol.id); return n; });
      toast.success(`Solicitud §${sol.nombreSeccion} aceptada`);
      recargarSolicitudes();
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
      await cambiarEstadoMasivoService({ estadosSolicitudes: [{ idSolicitud: selSol.id, estado: 'RECHAZADA', motivo: motivoRechazo.trim() }] });
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
      await cambiarEstadoMasivoService({
        estadosSolicitudes: ids.map(id => ({ idSolicitud: id, estado: 'ACEPTADA' })),
        idSemana: semanaId ? Number(semanaId) : undefined,
      });
      setSeleccionados(new Set());
      toast.success(`${ids.length} solicitud${ids.length > 1 ? 'es' : ''} aceptada${ids.length > 1 ? 's' : ''}`);
      recargarSolicitudes();
    } catch { toast.error('Error al aceptar las solicitudes'); }
    setIsSaving(false);
  };

  const aceptarTodasPendientes = async () => {
    const pend = solicitudesFiltradas.filter(s => s.estado === 'Pendiente');
    if (pend.length === 0) return;
    setIsSaving(true);
    try {
      await cambiarEstadoMasivoService({
        estadosSolicitudes: pend.map(s => ({ idSolicitud: s.id, estado: 'ACEPTADA' })),
        idSemana: semanaId ? Number(semanaId) : undefined,
      });
      setSeleccionados(new Set());
      toast.success(`${pend.length} solicitud${pend.length > 1 ? 'es' : ''} aceptada${pend.length > 1 ? 's' : ''}`);
      recargarSolicitudes();
    } catch { toast.error('Error al aceptar las solicitudes'); }
    setIsSaving(false);
  };

  const abrirDetalle = (sol: ISolicitudGestion) => { setSelSol(sol); detalle.onOpen(); };

  const handleImprimir = (sol: ISolicitudGestion) => {
    const filas = sol.detalles.map(d =>
      `<tr><td>${d.nombreProducto}</td><td style="font-style:italic;color:#666">${d.observacion ?? '—'}</td><td style="text-align:center">${fmtCL(d.cantidad)}</td><td style="text-align:center">${d.unidad}</td></tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Vista previa para Consolidado — Detalle Solicitud</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; font-size: 13px; color: #111; }
      h2 { margin: 0 0 4px; font-size: 18px; }
      .sub { color: #666; margin-bottom: 20px; font-size: 13px; text-align: center; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 20px; text-align: center; }
      .field label { display: block; font-size: 11px; color: #888; text-transform: uppercase; }
      .field span { font-weight: 600; }
      .obs { background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; margin-bottom: 20px; font-style: italic; }
      h3 { font-size: 12px; text-transform: uppercase; color: #888; letter-spacing: 0.05em; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f0f0f0; font-size: 11px; text-transform: uppercase; padding: 6px 10px; text-align: left; border-bottom: 2px solid #ddd; }
      th:not(:first-child) { text-align: center; }
      td { padding: 6px 10px; border-bottom: 1px solid #eee; }
      @page { size: A4 portrait; margin: 20mm 18mm; }
      @media print { body { padding: 0; margin: 0; } }
    </style></head><body>
    <h2 style="text-align:center">Vista previa para Consolidado — Detalle Solicitud</h2>
    <p class="sub">${sol.nombreAsignatura} · §${sol.nombreSeccion} · ${new Date(sol.fechaClase + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    <div class="grid">
      <div class="field"><label>Receta</label><span>${sol.nombreReceta}</span></div>
      <div class="field"><label>Docente</label><span>${sol.nombreDocente}</span></div>
      <div class="field"><label>Horario</label><span>${sol.horaInicio} – ${sol.horaFin}</span></div>
      <div class="field"><label>Sala</label><span>${sol.nombreSala}</span></div>
      <div class="field"><label>Alumnos</label><span>${sol.cantInscritos}</span></div>
      <div class="field"><label>Estado</label><span>${sol.estado}</span></div>
    </div>
    ${sol.observacion ? `<div class="obs">${sol.observacion}</div>` : ''}
    <h3>Productos solicitados</h3>
    <table><colgroup><col style="width:30%"><col style="width:40%"><col style="width:17%"><col style="width:13%"></colgroup>
    <thead><tr><th>Producto</th><th>Observación</th><th>Cantidad</th><th>Unidad</th></tr></thead>
    <tbody>${filas}</tbody></table>
    </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

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
      const motivoPayload = revertirAccion === 'rechazar' ? revertirMotivo.trim() : undefined;
      await cambiarEstadoMasivoService({ estadosSolicitudes: [{ idSolicitud: selSol.id, estado: nuevoEstado, motivo: motivoPayload }] });
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
  const sinPeriodos = periodos.length === 0 && !isLoadingSem;
  const haySeleccionados = seleccionados.size > 0;

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
                    <button key={`${p.anio}-${s}`} onClick={() => { seleccionarPeriodo(p.anio, s); setSolicitudes([]); setSeleccionados(new Set()); }}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
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
                  onSelectionChange={keys => { const v = Array.from(keys as Set<string>)[0]; if (v) seleccionarSemana(v); }}
                  placeholder="Seleccione una semana"
                  classNames={{ trigger: 'bg-default-50 cursor-pointer', base: 'max-w-xs' }}
                  startContent={<Icon icon="lucide:calendar" width={14} className="text-default-400 shrink-0" />}
                >
                  {semanas.map(s => (
                    <SelectItem key={String(s.idSemana)} textValue={s.nombreSemana}>
                      <div className="flex items-center w-full gap-2">
                        <span className="font-semibold">{s.nombreSemana}</span>
                        <span className="text-default-400 text-xs">
                          {new Date(s.fechaInicio + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                          {' – '}
                          {new Date(s.fechaFin + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                        </span>
                        {String(s.idSemana) === defaultSemanaId && defaultSemanaId && (
                          <Chip size="sm" color="success" variant="flat" className="ml-auto shrink-0">Actual</Chip>
                        )}
                      </div>
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {([
          { label: 'Total',      val: contadores.total,      color: 'border-default-200',   icon: 'lucide:list',           text: 'text-default-700'   },
          { label: 'Pendientes', val: contadores.pendientes, color: 'border-warning-200',   icon: 'lucide:clock',          text: 'text-warning-700'   },
          { label: 'Aceptadas',  val: contadores.aceptadas,  color: 'border-success-200',   icon: 'lucide:check-circle',   text: 'text-success-700'   },
          { label: 'En Pedido',  val: contadores.enPedido,   color: 'border-secondary-200', icon: 'lucide:shopping-cart',  text: 'text-secondary-700' },
          { label: 'Rechazadas', val: contadores.rechazadas, color: 'border-danger-200',    icon: 'lucide:x-circle',       text: 'text-danger-700'    },
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
            {(['Todas', 'Pendiente', 'Aceptada', 'En Pedido', 'Rechazada', 'Procesada'] as const).map(e => (
              <button key={e} onClick={() => { setFiltroEstado(e); setSeleccionados(new Set()); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  filtroEstado === e ? 'bg-primary text-white border-primary' : 'bg-default-100 text-default-600 border-default-200 hover:bg-default-200'
                }`}
              >
                {e}
                {e !== 'Todas' && (
                  <span className="ml-1 opacity-70">
                    ({e === 'Pendiente' ? contadores.pendientes : e === 'Aceptada' ? contadores.aceptadas : e === 'En Pedido' ? contadores.enPedido : e === 'Rechazada' ? contadores.rechazadas : contadores.procesadas})
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="sm:ml-auto flex items-center gap-2 shrink-0">
            {/* Acción masiva sobre seleccionados */}
            {sol_Editar && haySeleccionados && (
              <Button size="sm" color="success" variant="flat" isLoading={isSaving}
                onPress={aceptarSeleccionados}
                startContent={!isSaving && <Icon icon="lucide:check-check" width={14} />}
              >
                Aceptar {seleccionados.size} seleccionada{seleccionados.size > 1 ? 's' : ''}
              </Button>
            )}
            {/* Aceptar todas pendientes */}
            {sol_Editar && !haySeleccionados && contadores.pendientes > 0 && (
              <Button size="sm" color="success" variant="flat" isLoading={isSaving}
                onPress={aceptarTodasPendientes}
                startContent={!isSaving && <Icon icon="lucide:check-check" width={14} />}
              >
                Aceptar {contadores.pendientes} pendiente{contadores.pendientes > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </CardHeader>

        {['Pendiente', 'Aceptada', 'En Pedido', 'Rechazada', 'Procesada'].includes(filtroEstado) && (
          <div className="px-5 pb-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-default-100/50 border border-default-200 rounded-lg text-sm text-default-600">
              <Icon icon="lucide:info" width={18} className="shrink-0 text-default-500" />
              {filtroEstado === 'Pendiente'  && <span>Al llegar la fecha solicitada y no aceptan la solicitud, pasará al estado rechazado automáticamente.</span>}
              {filtroEstado === 'Aceptada'   && <span>La solicitud aceptada está incluida automáticamente al conglomerado de pedidos.</span>}
              {filtroEstado === 'En Pedido'  && <span>Solicitudes confirmadas en un pedido. Su estado es de solo lectura y no puede modificarse.</span>}
              {filtroEstado === 'Rechazada'  && <span>La solicitud rechazada no está disponible para restaurar su estado si la fecha solicitada es anterior a la actual.</span>}
              {filtroEstado === 'Procesada'  && <span>Historial de solicitudes que ya fueron consolidadas.</span>}
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
                      {sol_Editar && pendGrupo.length > 0 && (
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
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-semibold text-sm">§{sol.nombreSeccion}</span>
                              <span className="text-xs text-default-400">·</span>
                              <span className="text-sm text-default-600">{sol.nombreDocente}</span>
                            </div>
                            <div className="flex items-center gap-5 mt-1.5 text-xs text-default-500 flex-wrap">
                              <span className="flex items-center gap-1.5"><Icon icon="lucide:book-open" width={12} />{sol.nombreReceta}</span>
                              <span className="flex items-center gap-1.5"><Icon icon="lucide:clock" width={12} />{sol.horaInicio}–{sol.horaFin}</span>
                              <span className="flex items-center gap-1.5"><Icon icon="lucide:door-open" width={12} />{sol.nombreSala}</span>
                              <span className="flex items-center gap-1.5"><Icon icon="lucide:users" width={12} />{sol.cantInscritos} alumnos</span>
                              <span className="flex items-center gap-1.5"><Icon icon="lucide:package" width={12} />{sol.detalles.length} productos</span>
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

                            {sol_Editar && esPend && (
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

                            {sol_Editar && sol.estado === 'Aceptada' && (
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

                            {sol_Editar && sol.estado === 'Rechazada' && !sol.motivoRechazo?.includes('automáticamente') && (
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
      <Modal isOpen={detalle.isOpen} onOpenChange={detalle.onOpenChange} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {onClose => selSol && (
            <>
              <ModalHeader className="flex flex-col gap-0 pb-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary">
                    <Icon icon="lucide:file-text" width={18} />
                  </div>
                  <span className="font-bold text-secondary dark:text-foreground text-base">Detalle de Solicitud</span>
                  <Chip
                    size="sm"
                    color={ESTADO_CFG[selSol.estado].color}
                    variant="flat"
                    className="ml-auto mr-6 font-semibold"
                  >
                    {ESTADO_CFG[selSol.estado].label}
                  </Chip>
                </div>
                <div className="flex items-center justify-center gap-2 mt-3 px-4 py-2 bg-default-50 dark:bg-default-100/10 rounded-xl mx-1">
                  <Icon icon="lucide:graduation-cap" width={13} className="text-default-400 shrink-0" />
                  <p className="text-xs text-default-500 font-medium truncate">
                    {selSol.nombreAsignatura}
                  </p>
                  <span className="text-default-300">·</span>
                  <span className="text-xs font-mono text-default-500">§{selSol.nombreSeccion}</span>
                  <span className="text-default-300">·</span>
                  <span className="text-xs text-default-400">{fmtFecha(selSol.fechaClase)}</span>
                </div>
              </ModalHeader>

              <ModalBody className="pt-4 space-y-4">
                {/* Grid de info */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { icon: 'lucide:book-open', label: 'Receta',    val: selSol.nombreReceta,  color: 'text-warning-500',  bg: 'bg-warning-50 dark:bg-warning-900/20'  },
                    { icon: 'lucide:user',       label: 'Docente',   val: selSol.nombreDocente, color: 'text-primary-500',  bg: 'bg-primary-50 dark:bg-primary-900/20'  },
                    { icon: 'lucide:clock',      label: 'Horario',   val: `${selSol.horaInicio} – ${selSol.horaFin}`, color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-900/20' },
                    { icon: 'lucide:door-open',  label: 'Sala',      val: selSol.nombreSala,    color: 'text-success-600',  bg: 'bg-success-50 dark:bg-success-900/20'  },
                    { icon: 'lucide:users',      label: 'Alumnos',   val: `${selSol.cantInscritos} estudiantes`, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
                    { icon: 'lucide:package',    label: 'Productos', val: `${selSol.detalles.length} ítem${selSol.detalles.length !== 1 ? 's' : ''}`, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
                  ].map(r => (
                    <div
                      key={r.label}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-default-100 dark:border-default-50/20 bg-white dark:bg-content1"
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${r.bg}`}>
                        <Icon icon={r.icon} width={14} className={r.color} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-default-400 font-semibold leading-none mb-0.5">{r.label}</p>
                        <p className="text-sm font-semibold text-default-700 dark:text-default-200 truncate">{r.val}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Observación general */}
                {selSol.observacion && (
                  <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-default-50 dark:bg-default-100/10 border border-default-200 dark:border-default-100/20">
                    <Icon icon="lucide:message-square" width={15} className="text-default-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-default-400 font-semibold mb-0.5">Observación</p>
                      <p className="text-sm italic text-default-600 dark:text-default-300">{selSol.observacion}</p>
                    </div>
                  </div>
                )}

                {/* Motivo de rechazo */}
                {selSol.motivoRechazo && (
                  <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
                    <Icon icon="lucide:alert-circle" width={15} className="text-danger-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-danger-500 font-semibold mb-0.5">Motivo de rechazo</p>
                      <p className="text-sm italic text-danger-700 dark:text-danger-300">{selSol.motivoRechazo}</p>
                    </div>
                  </div>
                )}

                {/* Tabla productos */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 rounded-md bg-default-100 dark:bg-default-50/10">
                      <Icon icon="lucide:shopping-basket" width={13} className="text-default-500" />
                    </div>
                    <p className="text-xs font-bold text-default-600 dark:text-default-400 uppercase tracking-wider">
                      Productos solicitados
                    </p>
                    <Chip size="sm" variant="flat" color="default" className="text-xs ml-auto">
                      {selSol.detalles.length} ítem{selSol.detalles.length !== 1 ? 's' : ''}
                    </Chip>
                  </div>
                  <div className="rounded-xl border border-default-200 dark:border-default-100/20 overflow-hidden">
                    <Table
                      removeWrapper
                      aria-label="Productos"
                      classNames={{
                        th: 'bg-default-50 dark:bg-default-100/10 text-[10px] uppercase tracking-wide text-default-500 font-bold h-9 first:rounded-tl-xl last:rounded-tr-xl',
                        td: 'py-2.5 border-b border-default-100 dark:border-default-50/10 group-data-[last=true]:border-none',
                      }}
                    >
                      <TableHeader>
                        <TableColumn>PRODUCTO</TableColumn>
                        <TableColumn>OBSERVACIÓN</TableColumn>
                        <TableColumn className="text-center">CANTIDAD</TableColumn>
                        <TableColumn className="text-center">UNIDAD</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {selSol.detalles.map((d, idx) => (
                          <TableRow key={d.idProducto} className={idx % 2 === 0 ? '' : 'bg-default-50/50 dark:bg-default-50/5'}>
                            <TableCell>
                              <Tooltip content={d.nombreProducto} delay={500} placement="top-start">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-warning-400 shrink-0" />
                                  <span className="max-w-[160px] truncate text-sm font-medium text-default-700 dark:text-default-200 cursor-default">
                                    {d.nombreProducto}
                                  </span>
                                </div>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip content={d.observacion || 'Sin observación'} placement="top" delay={500} isDisabled={!d.observacion}>
                                <span className="max-w-[180px] truncate text-xs text-default-400 italic cursor-default block">
                                  {d.observacion ?? '—'}
                                </span>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-mono font-bold text-sm text-default-700 dark:text-default-200">
                                {fmtCL(d.cantidad)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Chip size="sm" variant="flat" color="default" className="text-xs font-medium">
                                {d.unidad}
                              </Chip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
                {selSol.estado === 'Rechazada' && !selSol.motivoRechazo?.includes('automáticamente') && (
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
                <Button variant="flat" onPress={() => handleImprimir(selSol)}
                  startContent={<Icon icon="lucide:printer" width={14} />}>
                  Imprimir
                </Button>
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
