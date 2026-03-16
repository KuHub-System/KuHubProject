/**
 * CONGLOMERADO DE PEDIDOS
 * Visualiza el pedido consolidado semanal distribuido por día y bloque horario.
 * Muestra solicitudes en estado PROCESADA listas para despacho desde Bodega de Tránsito.
 */

import React from 'react';
import {
  Card, CardBody, CardHeader,
  Input, Chip,
  Select, SelectItem,
  Divider, Spinner,
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
import { ISolicitudPorSemanaResponse } from '../services/solicitud-service';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK — solicitudes PROCESADAS (reemplazar con endpoint real cuando esté listo)
// ─────────────────────────────────────────────────────────────────────────────

const SEMANA_ACTUAL = new Date();
const lunes = new Date(SEMANA_ACTUAL);
lunes.setDate(SEMANA_ACTUAL.getDate() - ((SEMANA_ACTUAL.getDay() + 6) % 7));
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const MOCK_PROCESADAS: ISolicitudPorSemanaResponse[] = [
  {
    idSolicitud: 2001, idReservaSala: 201, idReceta: 10,
    nombreReceta: 'Pasta Carbonara', fechaSolicitada: fmt(lunes),
    estadoSolicitud: 'PROCESADA', observaciones: 'Clase práctica de pastas italianas',
    productos: [
      { nombreProducto: 'Spaghetti',      cantidad: 2,   unidad: 'kg' },
      { nombreProducto: 'Huevos',          cantidad: 12,  unidad: 'un' },
      { nombreProducto: 'Tocino ahumado',  cantidad: 300, unidad: 'g'  },
      { nombreProducto: 'Queso parmesano', cantidad: 200, unidad: 'g'  },
    ],
    asignaturaDetalle: {
      id_asignatura: 1, nombre_asignatura: 'Cocina Internacional',
      seccion: {
        id_seccion: 11, nombre_seccion: '001-2', id_usuario: 201,
        nombre_docente: 'Carlos Méndez', cant_inscritos: 20, capacidad_max: 25,
        horarios: [
          { numeroBloque: 1, horaInicio: '08:01:00', horaFin: '08:40:00', nombreSala: 'Lab. Cocina A' },
          { numeroBloque: 2, horaInicio: '08:41:00', horaFin: '09:20:00', nombreSala: 'Lab. Cocina A' },
        ],
      },
    },
  },
  {
    idSolicitud: 2002, idReservaSala: 202, idReceta: 11,
    nombreReceta: 'Risotto de Champiñones', fechaSolicitada: fmt(lunes),
    estadoSolicitud: 'PROCESADA',
    productos: [
      { nombreProducto: 'Arroz arborio',       cantidad: 1.5, unidad: 'kg' },
      { nombreProducto: 'Champiñones frescos', cantidad: 500, unidad: 'g'  },
      { nombreProducto: 'Caldo de verduras',   cantidad: 1.5, unidad: 'L'  },
      { nombreProducto: 'Queso parmesano',      cantidad: 150, unidad: 'g'  },
    ],
    asignaturaDetalle: {
      id_asignatura: 2, nombre_asignatura: 'Técnicas de Cocina Italiana',
      seccion: {
        id_seccion: 21, nombre_seccion: '001-4', id_usuario: 203,
        nombre_docente: 'Roberto Silva', cant_inscritos: 18, capacidad_max: 20,
        horarios: [
          { numeroBloque: 5, horaInicio: '14:01:00', horaFin: '14:40:00', nombreSala: 'Lab. Cocina C' },
          { numeroBloque: 6, horaInicio: '14:41:00', horaFin: '15:20:00', nombreSala: 'Lab. Cocina C' },
        ],
      },
    },
  },
  {
    idSolicitud: 2003, idReservaSala: 203, idReceta: 10,
    nombreReceta: 'Pasta Carbonara', fechaSolicitada: fmt(addDays(lunes, 1)),
    estadoSolicitud: 'PROCESADA',
    productos: [
      { nombreProducto: 'Spaghetti',      cantidad: 2.5, unidad: 'kg' },
      { nombreProducto: 'Huevos',          cantidad: 15,  unidad: 'un' },
      { nombreProducto: 'Tocino ahumado',  cantidad: 400, unidad: 'g'  },
      { nombreProducto: 'Queso parmesano', cantidad: 250, unidad: 'g'  },
    ],
    asignaturaDetalle: {
      id_asignatura: 1, nombre_asignatura: 'Cocina Internacional',
      seccion: {
        id_seccion: 12, nombre_seccion: '002-2', id_usuario: 202,
        nombre_docente: 'Ana Flores', cant_inscritos: 25, capacidad_max: 25,
        horarios: [
          { numeroBloque: 3, horaInicio: '09:21:00', horaFin: '10:00:00', nombreSala: 'Lab. Cocina B' },
          { numeroBloque: 4, horaInicio: '10:01:00', horaFin: '10:40:00', nombreSala: 'Lab. Cocina B' },
        ],
      },
    },
  },
  {
    idSolicitud: 2004, idReservaSala: 204, idReceta: 12,
    nombreReceta: 'Crema Catalana', fechaSolicitada: fmt(addDays(lunes, 2)),
    estadoSolicitud: 'PROCESADA', observaciones: 'Requiere soplete de cocina',
    productos: [
      { nombreProducto: 'Leche entera',  cantidad: 1,   unidad: 'L'  },
      { nombreProducto: 'Huevos',         cantidad: 8,   unidad: 'un' },
      { nombreProducto: 'Azúcar',         cantidad: 200, unidad: 'g'  },
      { nombreProducto: 'Canela en rama', cantidad: 2,   unidad: 'un' },
    ],
    asignaturaDetalle: {
      id_asignatura: 3, nombre_asignatura: 'Repostería y Pastelería',
      seccion: {
        id_seccion: 31, nombre_seccion: '001-6', id_usuario: 204,
        nombre_docente: 'María Gutiérrez', cant_inscritos: 22, capacidad_max: 25,
        horarios: [
          { numeroBloque: 1, horaInicio: '08:01:00', horaFin: '08:40:00', nombreSala: 'Lab. Pastelería' },
          { numeroBloque: 2, horaInicio: '08:41:00', horaFin: '09:20:00', nombreSala: 'Lab. Pastelería' },
          { numeroBloque: 3, horaInicio: '09:21:00', horaFin: '10:00:00', nombreSala: 'Lab. Pastelería' },
        ],
      },
    },
  },
  {
    idSolicitud: 2005, idReservaSala: 205, idReceta: 11,
    nombreReceta: 'Risotto de Champiñones', fechaSolicitada: fmt(addDays(lunes, 3)),
    estadoSolicitud: 'PROCESADA',
    productos: [
      { nombreProducto: 'Arroz arborio',       cantidad: 1,   unidad: 'kg' },
      { nombreProducto: 'Champiñones frescos', cantidad: 400, unidad: 'g'  },
      { nombreProducto: 'Caldo de verduras',   cantidad: 1,   unidad: 'L'  },
      { nombreProducto: 'Queso parmesano',      cantidad: 100, unidad: 'g'  },
    ],
    asignaturaDetalle: {
      id_asignatura: 2, nombre_asignatura: 'Técnicas de Cocina Italiana',
      seccion: {
        id_seccion: 22, nombre_seccion: '002-4', id_usuario: 205,
        nombre_docente: 'Laura Pérez', cant_inscritos: 16, capacidad_max: 20,
        horarios: [
          { numeroBloque: 7, horaInicio: '15:21:00', horaFin: '16:00:00', nombreSala: 'Lab. Cocina C' },
          { numeroBloque: 8, horaInicio: '16:01:00', horaFin: '16:40:00', nombreSala: 'Lab. Cocina C' },
        ],
      },
    },
  },
  {
    idSolicitud: 2006, idReservaSala: 206, idReceta: 13,
    nombreReceta: 'Tarta de Manzana', fechaSolicitada: fmt(addDays(lunes, 4)),
    estadoSolicitud: 'PROCESADA',
    productos: [
      { nombreProducto: 'Manzanas',   cantidad: 6,   unidad: 'un' },
      { nombreProducto: 'Harina',      cantidad: 300, unidad: 'g'  },
      { nombreProducto: 'Azúcar',      cantidad: 150, unidad: 'g'  },
      { nombreProducto: 'Huevos',      cantidad: 3,   unidad: 'un' },
    ],
    asignaturaDetalle: {
      id_asignatura: 3, nombre_asignatura: 'Repostería y Pastelería',
      seccion: {
        id_seccion: 32, nombre_seccion: '002-6', id_usuario: 206,
        nombre_docente: 'Jorge Ramos', cant_inscritos: 19, capacidad_max: 25,
        horarios: [
          { numeroBloque: 5, horaInicio: '14:01:00', horaFin: '14:40:00', nombreSala: 'Lab. Pastelería' },
          { numeroBloque: 6, horaInicio: '14:41:00', horaFin: '15:20:00', nombreSala: 'Lab. Pastelería' },
        ],
      },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

interface IGrupoDia {
  fecha: string;           // "YYYY-MM-DD"
  diaSemana: number;       // 0=Dom … 6=Sáb
  solicitudes: ISolicitudPorSemanaResponse[];
}

interface IProductoTotal {
  nombreProducto: string;
  unidad: string;
  cantidadTotal: number;
  distribuciones: {
    idSolicitud: number;
    fecha: string;
    nombreSeccion: string;
    nombreDocente: string;
    cantidad: number;
    horaInicio: string;
    horaFin: string;
    nombreSala: string;
  }[];
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

const fmtHora = (hms: string) => hms?.slice(0, 5) ?? '';

const fmtFechaLarga = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

const fmtFechaCorta = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

const isHoy = (iso: string) => iso === new Date().toISOString().slice(0, 10);

const getDiaSemana = (iso: string) => new Date(iso + 'T00:00:00').getDay();

const consolidarProductosTotales = (solicitudes: ISolicitudPorSemanaResponse[]): IProductoTotal[] => {
  const mapa = new Map<string, IProductoTotal>();
  for (const sol of solicitudes) {
    const { seccion } = sol.asignaturaDetalle;
    const horarios = seccion.horarios ?? [];
    const primerH = horarios[0];
    const ultimoH = horarios[horarios.length - 1];
    for (const p of sol.productos) {
      const key = `${p.nombreProducto.trim()}||${p.unidad.trim()}`;
      const dist = {
        idSolicitud: sol.idSolicitud,
        fecha: sol.fechaSolicitada,
        nombreSeccion: seccion.nombre_seccion,
        nombreDocente: seccion.nombre_docente,
        cantidad: p.cantidad,
        horaInicio: fmtHora(primerH?.horaInicio ?? ''),
        horaFin: fmtHora(ultimoH?.horaFin ?? ''),
        nombreSala: primerH?.nombreSala ?? '',
      };
      if (mapa.has(key)) {
        const e = mapa.get(key)!;
        e.cantidadTotal += p.cantidad;
        e.distribuciones.push(dist);
      } else {
        mapa.set(key, { nombreProducto: p.nombreProducto, unidad: p.unidad, cantidadTotal: p.cantidad, distribuciones: [dist] });
      }
    }
  }
  return Array.from(mapa.values()).sort((a, b) => a.nombreProducto.localeCompare(b.nombreProducto));
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
  const [solicitudes,    setSolicitudes]    = React.useState<ISolicitudPorSemanaResponse[]>([]);
  const [isLoadingDatos, setIsLoadingDatos] = React.useState(false);

  // ── Cache por semanaId ──
  const cache = React.useRef<Map<string, ISolicitudPorSemanaResponse[]>>(new Map());

  // ── UI ──
  const [busqueda,    setBusqueda]    = React.useState('');
  const [expandidos,  setExpandidos]  = React.useState<Set<string>>(new Set());
  const [vistaActiva, setVistaActiva] = React.useState<'cronograma' | 'totales'>('cronograma');

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
    setIsLoadingSem(true); setSolicitudes([]); setSemanaId('');
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
    if (!semanaId) { setSolicitudes([]); return; }

    if (cache.current.has(semanaId)) {
      setSolicitudes(cache.current.get(semanaId)!);
      setExpandidos(new Set());
      setBusqueda('');
      return;
    }

    const semana = semanas.find(s => String(s.idSemana) === semanaId);
    if (!semana) return;

    setIsLoadingDatos(true);
    setExpandidos(new Set());
    setBusqueda('');

    // TODO: reemplazar con endpoint real cuando esté disponible
    const t = setTimeout(() => {
      cache.current.set(semanaId, MOCK_PROCESADAS);
      setSolicitudes(MOCK_PROCESADAS);
      setIsLoadingDatos(false);
    }, 500);
    return () => clearTimeout(t);
  }, [semanaId, semanas]);

  // ── Derivados ──
  const gruposDia = React.useMemo((): IGrupoDia[] => {
    const mapa = new Map<string, ISolicitudPorSemanaResponse[]>();
    for (const sol of solicitudes) {
      if (!mapa.has(sol.fechaSolicitada)) mapa.set(sol.fechaSolicitada, []);
      mapa.get(sol.fechaSolicitada)!.push(sol);
    }
    return Array.from(mapa.entries())
      .map(([fecha, sols]) => ({
        fecha,
        diaSemana: getDiaSemana(fecha),
        solicitudes: sols.sort((a, b) => {
          const ha = a.asignaturaDetalle.seccion.horarios[0]?.horaInicio ?? '';
          const hb = b.asignaturaDetalle.seccion.horarios[0]?.horaInicio ?? '';
          return ha.localeCompare(hb);
        }),
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [solicitudes]);

  const productosTotales = React.useMemo(() => consolidarProductosTotales(solicitudes), [solicitudes]);

  const productosFiltrados = React.useMemo(() => {
    if (!busqueda.trim()) return productosTotales;
    const q = busqueda.toLowerCase();
    return productosTotales.filter(p => p.nombreProducto.toLowerCase().includes(q));
  }, [productosTotales, busqueda]);

  const contadores = React.useMemo(() => ({
    procesadas: solicitudes.length,
    productosUnicos: productosTotales.length,
    secciones: new Set(solicitudes.map(s => s.asignaturaDetalle.seccion.id_seccion)).size,
    dias: gruposDia.length,
  }), [solicitudes, productosTotales, gruposDia]);

  const toggleExpandido = (key: string) => {
    setExpandidos(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
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

      {/* ── Banner informativo ── */}
      <div className="flex items-start gap-3 px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-secondary-800">
        <Icon icon="lucide:truck" width={18} className="shrink-0 text-secondary-500 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Pedido consolidado → Bodega de Tránsito</p>
          <p className="text-xs mt-0.5 text-secondary-700">
            Las solicitudes en estado <strong>PROCESADA</strong> ya fueron consolidadas.
            Cada bloque indica el día, la hora y la sala exacta donde deben entregarse los insumos.
            Use la vista de Totales para facilitar el descuento en bodega.
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
        <CardHeader className="px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-default-100 rounded-lg p-1">
            {(['cronograma', 'totales'] as const).map(v => (
              <button key={v} onClick={() => setVistaActiva(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  vistaActiva === v ? 'bg-white shadow-sm text-primary' : 'text-default-500 hover:text-default-700'
                }`}>
                {v === 'cronograma'
                  ? <span className="flex items-center gap-1.5"><Icon icon="lucide:calendar-range" width={12} />Cronograma Semanal</span>
                  : <span className="flex items-center gap-1.5"><Icon icon="lucide:package-check" width={12} />Totales del Pedido</span>
                }
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
          ) : solicitudes.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-default-400">
              <Icon icon="lucide:inbox" width={48} className="opacity-40" />
              <p className="text-sm">No hay solicitudes procesadas para esta semana.</p>
              <p className="text-xs">Las solicitudes deben estar en estado <strong>PROCESADA</strong> para aparecer aquí.</p>
            </div>
          ) : vistaActiva === 'cronograma' ? (

            /* ════════════════════════════════════════
               VISTA CRONOGRAMA SEMANAL
            ════════════════════════════════════════ */
            <div className="space-y-5">
              {gruposDia.map(grupo => {
                const cfg = DIA_CONFIG[grupo.diaSemana] ?? DIA_CONFIG[1];
                const hoy = isHoy(grupo.fecha);
                const productosDelDia = new Set<string>();
                grupo.solicitudes.forEach(s => s.productos.forEach(p => productosDelDia.add(p.nombreProducto)));

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
                      {grupo.solicitudes.map((sol, idx) => {
                        const { seccion } = sol.asignaturaDetalle;
                        const horarios = seccion.horarios ?? [];
                        const primerH  = horarios[0];
                        const ultimoH  = horarios[horarios.length - 1];
                        const solKey   = String(sol.idSolicitud);
                        const abierto  = expandidos.has(solKey);

                        return (
                          <div key={sol.idSolicitud}>
                            <button
                              className="w-full flex flex-col sm:flex-row sm:items-stretch gap-0 hover:bg-default-50/70 transition-colors text-left"
                              onClick={() => toggleExpandido(solKey)}
                            >
                              {/* Barra de hora lateral */}
                              <div className={`hidden sm:flex flex-col items-center justify-center px-3 py-3 min-w-[80px] border-r ${cfg.border} ${cfg.header}`}>
                                <span className={`text-xs font-bold ${cfg.text}`}>{fmtHora(primerH?.horaInicio ?? '')}</span>
                                <div className={`w-px flex-1 my-1 min-h-[20px] ${cfg.border} border-l-2 border-dashed`} />
                                <span className={`text-xs font-bold ${cfg.text}`}>{fmtHora(ultimoH?.horaFin ?? '')}</span>
                              </div>

                              {/* Contenido */}
                              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">

                                {/* Bloque móvil: hora */}
                                <div className={`sm:hidden flex items-center gap-2 text-xs ${cfg.text} font-bold`}>
                                  <Icon icon="lucide:clock" width={12} />
                                  {fmtHora(primerH?.horaInicio ?? '')} – {fmtHora(ultimoH?.horaFin ?? '')}
                                </div>

                                {/* Info principal */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-default-800">§{seccion.nombre_seccion}</span>
                                    <span className="text-xs text-default-400">·</span>
                                    <span className="text-sm text-default-600">{seccion.nombre_docente}</span>
                                    <span className="text-xs text-default-400">·</span>
                                    <span className="text-xs text-default-500">{sol.asignaturaDetalle.nombre_asignatura}</span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-default-400">
                                    <span className="flex items-center gap-1">
                                      <Icon icon="lucide:book-open" width={10} />
                                      {sol.nombreReceta}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Icon icon="lucide:door-open" width={10} />
                                      {primerH?.nombreSala ?? '—'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Icon icon="lucide:users" width={10} />
                                      {seccion.cant_inscritos} alumnos
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Icon icon="lucide:layers" width={10} />
                                      {horarios.length} bloque{horarios.length > 1 ? 's' : ''}
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
                                  {sol.productos.slice(0, 3).map((p, i) => (
                                    <span key={i}
                                      className="px-2 py-0.5 rounded-full bg-default-100 text-default-600 text-[11px] font-medium whitespace-nowrap">
                                      {p.cantidad} {p.unidad} {p.nombreProducto}
                                    </span>
                                  ))}
                                  {sol.productos.length > 3 && (
                                    <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 text-[11px] font-medium">
                                      +{sol.productos.length - 3} más
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

                            {/* Detalle expandido: bloques horarios + productos completos */}
                            {abierto && (
                              <div className="mx-4 mb-3 rounded-xl border border-default-100 overflow-hidden">
                                {/* Bloques horarios */}
                                <div className={`flex items-center gap-2 px-4 py-2 ${cfg.header} border-b ${cfg.border}`}>
                                  <Icon icon="lucide:clock" width={12} className={cfg.text} />
                                  <span className={`text-xs font-bold ${cfg.text} uppercase tracking-wide`}>Bloques horarios</span>
                                </div>
                                <div className="flex flex-wrap gap-2 px-4 py-2.5 bg-default-50">
                                  {horarios.map((h, i) => (
                                    <div key={i}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-default-200 text-xs">
                                      <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${cfg.badge} ${cfg.text}`}>
                                        B{h.numeroBloque}
                                      </span>
                                      <span className="font-mono text-default-700">{fmtHora(h.horaInicio)}–{fmtHora(h.horaFin)}</span>
                                      <span className="text-default-400">·</span>
                                      <span className="text-default-500">{h.nombreSala}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Tabla de productos */}
                                <div className={`flex items-center gap-2 px-4 py-2 border-t border-b ${cfg.border}`}>
                                  <Icon icon="lucide:package" width={12} className={cfg.text} />
                                  <span className={`text-xs font-bold ${cfg.text} uppercase tracking-wide`}>
                                    Productos requeridos · {sol.productos.length} ítem{sol.productos.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div>
                                  <div className="grid grid-cols-3 px-4 py-1.5 bg-default-50 text-[10px] font-bold text-default-500 uppercase tracking-wider">
                                    <span>Producto</span>
                                    <span className="text-right">Cantidad</span>
                                    <span className="text-center">Unidad</span>
                                  </div>
                                  {sol.productos.map((p, i) => (
                                    <div key={i}
                                      className="grid grid-cols-3 px-4 py-2 text-sm border-t border-default-50 hover:bg-default-50/60">
                                      <span className="text-default-700 font-medium">{p.nombreProducto}</span>
                                      <span className="text-right font-mono font-bold text-primary">{p.cantidad}</span>
                                      <span className="text-center text-default-500">{p.unidad}</span>
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

          ) : (

            /* ════════════════════════════════════════
               VISTA TOTALES DEL PEDIDO
            ════════════════════════════════════════ */
            <div className="space-y-2">
              {productosFiltrados.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-3 text-default-400">
                  <Icon icon="lucide:search-x" width={36} className="opacity-40" />
                  <p className="text-sm">Sin resultados para "{busqueda}"</p>
                </div>
              ) : productosFiltrados.map(prod => {
                const key = `${prod.nombreProducto}||${prod.unidad}`;
                const abierto = expandidos.has(key);
                return (
                  <div key={key} className="border border-default-200 rounded-xl overflow-hidden">

                    {/* Cabecera producto */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 bg-default-50 hover:bg-default-100 transition-colors text-left"
                      onClick={() => toggleExpandido(key)}
                    >
                      <Icon icon="lucide:package" width={15} className="text-secondary shrink-0" />
                      <span className="flex-1 font-semibold text-sm text-default-800">{prod.nombreProducto}</span>

                      <div className="flex items-center gap-3 mr-2">
                        <div className="text-right">
                          <p className="text-lg font-bold text-secondary leading-none">{prod.cantidadTotal}</p>
                          <p className="text-[10px] text-default-400">{prod.unidad} total</p>
                        </div>
                        <Chip size="sm" color="default" variant="flat">
                          {prod.distribuciones.length} sección{prod.distribuciones.length !== 1 ? 'es' : ''}
                        </Chip>
                      </div>

                      <Icon icon={abierto ? 'lucide:chevron-up' : 'lucide:chevron-down'} width={16} className="text-default-400 shrink-0" />
                    </button>

                    {/* Distribuciones */}
                    {abierto && (
                      <div className="divide-y divide-default-100">
                        {prod.distribuciones.map((dist, distIdx) => {
                          const dia = getDiaSemana(dist.fecha);
                          const cfg = DIA_CONFIG[dia] ?? DIA_CONFIG[1];
                          const hoy = isHoy(dist.fecha);
                          return (
                            <div key={`${dist.idSolicitud}-${distIdx}`}
                              className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-2.5 bg-white hover:bg-default-50/50">

                              {/* Badge fecha */}
                              <div className={`shrink-0 flex flex-col items-center justify-center rounded-xl px-2.5 py-1.5 min-w-[56px] text-center border ${hoy ? 'bg-warning-50 border-warning-200' : cfg.header + ' ' + cfg.border}`}>
                                <span className={`text-[10px] font-black uppercase leading-none ${hoy ? 'text-warning-600' : cfg.text}`}>
                                  {DIA_CONFIG[dia]?.nombre.slice(0, 3).toUpperCase() ?? ''}
                                </span>
                                <span className={`text-sm font-black leading-tight ${hoy ? 'text-warning-700' : cfg.text}`}>
                                  {fmtFechaCorta(dist.fecha)}
                                </span>
                                {hoy && <span className="text-[9px] font-bold text-warning-600">HOY</span>}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-sm text-default-800">§{dist.nombreSeccion}</span>
                                  <span className="text-xs text-default-400">·</span>
                                  <span className="text-sm text-default-600">{dist.nombreDocente}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-default-400 flex-wrap">
                                  <span className="flex items-center gap-1"><Icon icon="lucide:clock" width={11} />{dist.horaInicio}–{dist.horaFin}</span>
                                  <span className="flex items-center gap-1"><Icon icon="lucide:door-open" width={11} />{dist.nombreSala}</span>
                                </div>
                              </div>

                              {/* Cantidad sección */}
                              <div className="shrink-0 text-right">
                                <p className="text-base font-bold text-default-700">
                                  {dist.cantidad} <span className="text-xs font-normal text-default-400">{prod.unidad}</span>
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
                          <span className="text-sm font-bold text-secondary">{prod.cantidadTotal} {prod.unidad}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default ConglomeradoPedidosPage;
