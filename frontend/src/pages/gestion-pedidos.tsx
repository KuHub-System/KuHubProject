/**
 * GESTIÓN DE PEDIDOS
 * Vista consolidada de solicitudes ACEPTADAS para la semana seleccionada.
 * Carga datos desde POST /v1/solicitud/order-for-consolidation.
 * Cachea respuestas por semanaId para evitar re-peticiones al navegar.
 */

import React from 'react';
import {
  Card, CardBody, CardHeader,
  Button, Input, Chip,
  Select, SelectItem, Tooltip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
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
import {
  IOrderConsolidationResponse,
  ISolicitudConsolidacionItem,
  IProductoConsolidadoResponse,
  obtenerOrdenConsolidacionService,
  consolidarPedidoService,
} from '../services/solicitud-service';
import { useModulePermission, usePermission } from '../contexts/permission-context';
import { useHistory } from 'react-router-dom';

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

const isHoy = (iso: string) => iso === new Date().toISOString().slice(0, 10);

/** Formatea una cantidad numérica con locale chileno (es-CL): separador decimal coma, miles punto.
 *  1234.5 → "1.234,5"  |  0.003 → "0,003"  |  1234 → "1.234"  |  0 → "0" */
const fmtCantidad = (n: number): string => {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n);
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

const GestionPedidosPage: React.FC = () => {
  usePageTitle('Gestión de Pedidos', 'Genera el pedido semanal consolidado a partir de las solicitudes aceptadas, agrupando todos los productos requeridos por sección.', 'lucide:shopping-cart');
  const toast = useToast();
  const { canCreate: ped_Crear, canUpdate: ped_Editar, canDelete: ped_Eliminar } = useModulePermission('GESTION_PEDIDOS');
  const { isAdmin } = usePermission();
  const history = useHistory();
  const confirmarModal = useDisclosure();

  // ── Semanas ──
  const [periodos,        setPeriodos]        = React.useState<IPeriodoAcademico[]>([]);
  const [semanas,         setSemanas]         = React.useState<ISemana[]>([]);
  const [semanaId,        setSemanaId]        = React.useState<string>('');
  const [defaultSemanaId, setDefaultSemanaId] = React.useState<string>('');
  const [isLoadingSem,    setIsLoadingSem]    = React.useState(true);

  // ── Datos ──
  const [solicitudes,    setSolicitudes]    = React.useState<ISolicitudConsolidacionItem[]>([]);
  const [consolidadoData, setConsolidadoData] = React.useState<IProductoConsolidadoResponse[]>([]);
  const [isLoadingDatos, setIsLoadingDatos] = React.useState(false);
  const [consolidado,    setConsolidado]    = React.useState(false);
  const [isConsolidando, setIsConsolidando] = React.useState(false);
  const [confirmarTexto, setConfirmarTexto] = React.useState('');

  // ── Cache por semanaId ──
  const cache = React.useRef<Map<string, IOrderConsolidationResponse>>(new Map());

  // ── UI ──
  const [busqueda,    setBusqueda]    = React.useState('');
  const [expandidos,  setExpandidos]  = React.useState<Set<string>>(new Set());
  const [vistaActiva, setVistaActiva] = React.useState<'consolidado' | 'solicitudes'>('consolidado');

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
    setIsLoadingSem(true); setSolicitudes([]); setConsolidadoData([]); setSemanaId(''); setConsolidado(false);
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
    if (!semanaId) { setSolicitudes([]); setConsolidadoData([]); setConsolidado(false); return; }

    // Si ya está en cache, usar sin re-fetching
    if (cache.current.has(semanaId)) {
      const cached = cache.current.get(semanaId)!;
      setSolicitudes(cached.solicitudes);
      setConsolidadoData(cached.consolidado);
      setConsolidado(false);
      setExpandidos(new Set());
      setBusqueda('');
      return;
    }

    const semana = semanas.find(s => String(s.idSemana) === semanaId);
    if (!semana) return;

    setIsLoadingDatos(true);
    setConsolidado(false);
    setExpandidos(new Set());
    setBusqueda('');

    obtenerOrdenConsolidacionService({ fechaInicio: semana.fechaInicio, fechaFin: semana.fechaFin })
      .then(data => {
        cache.current.set(semanaId, data);
        setSolicitudes(data.solicitudes);
        setConsolidadoData(data.consolidado);
      })
      .catch(() => toast.error('Error al cargar los datos de consolidación'))
      .finally(() => setIsLoadingDatos(false));
  }, [semanaId, semanas]);

  // ── Derivados ──
  const productosFiltrados = React.useMemo(() => {
    if (!busqueda.trim()) return consolidadoData;
    const q = busqueda.toLowerCase();
    return consolidadoData.filter(p => p.nombreProducto.toLowerCase().includes(q));
  }, [consolidadoData, busqueda]);

  const gruposPorAsignatura = React.useMemo(() => {
    const map = new Map<number, { idAsignatura: number; nombre: string; items: ISolicitudConsolidacionItem[] }>();
    for (const s of solicitudes) {
      const id = s.asignaturaDetalle.id_asignatura;
      if (!map.has(id)) map.set(id, { idAsignatura: id, nombre: s.asignaturaDetalle.nombre_asignatura, items: [] });
      map.get(id)!.items.push(s);
    }
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [solicitudes]);

  const contadores = React.useMemo(() => ({
    solicitudes: solicitudes.length,
    productosUnicos: consolidadoData.length,
    secciones: new Set(solicitudes.map(s => s.asignaturaDetalle.seccion.id_seccion)).size,
    asignaturas: new Set(solicitudes.map(s => s.asignaturaDetalle.id_asignatura)).size,
  }), [solicitudes, consolidadoData]);

  const toggleExpandido = (key: string) => {
    setExpandidos(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  // Semana actualmente seleccionada en el dropdown (puede ser cualquier semana, no necesariamente la actual)
  const semanaSeleccionada = semanas.find(s => String(s.idSemana) === semanaId) ?? null;

  const handleConsolidar = async () => {
    if (!semanaSeleccionada) return;
    setIsConsolidando(true);
    try {
      await consolidarPedidoService({
        fechaInicio: semanaSeleccionada.fechaInicio,
        fechaFin: semanaSeleccionada.fechaFin,
        solicitudes: solicitudes.map(s => ({ idSolicitud: s.idSolicitud, fechaSolicitada: s.fechaSolicitada })),
        detalles: consolidadoData.map(p => ({ idProducto: p.idProducto, cantidadTotal: p.cantidadTotal })),
      });
      setConsolidado(true);
      setSolicitudes([]);
      setConsolidadoData([]);
      cache.current.delete(semanaId);
      confirmarModal.onClose();
      toast.success('Pedido consolidado. El sistema programará automáticamente cada sección según la fecha de su clase.');
    } catch {
      toast.error('Error al consolidar el pedido. Intente nuevamente.');
    } finally {
      setIsConsolidando(false);
    }
  };

  const handleImprimirSolicitud = (sol: ISolicitudConsolidacionItem) => {
    const { seccion } = sol.asignaturaDetalle;
    const filas = seccion.productos_solicitados.map(p =>
      `<tr><td>${p.nombreProducto}</td><td style="font-style:italic;color:#666">${p.observacion ?? '—'}</td><td style="text-align:center">${fmtCantidad(p.cantidad)}</td><td style="text-align:center">${p.unidad_abreviada}</td></tr>`
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
    <p class="sub">${sol.asignaturaDetalle.nombre_asignatura} · §${seccion.nombre_seccion} · ${new Date(sol.fechaSolicitada + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    <div class="grid">
      <div class="field"><label>Receta</label><span>${sol.nombreReceta}</span></div>
      <div class="field"><label>Docente</label><span>${seccion.nombre_docente}</span></div>
      <div class="field"><label>Horario</label><span>${seccion.horarios.rangoHoras}</span></div>
      <div class="field"><label>Sala</label><span>${seccion.horarios.nombreSala}</span></div>
      <div class="field"><label>Alumnos</label><span>${seccion.cant_inscritos}</span></div>
    </div>
    ${sol.observaciones ? `<div class="obs">${sol.observaciones}</div>` : ''}
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

  // Alias para compatibilidad con el JSX existente
  const semanaActual = semanaSeleccionada;
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
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
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
                <p className="text-sm text-default-400">Sin semanas disponibles para este período.</p>
              ) : (
                <Select size="sm" variant="bordered"
                  selectedKeys={semanaId ? new Set([semanaId]) : new Set()}
                  onSelectionChange={keys => { const v = Array.from(keys as Set<string>)[0]; if (v) setSemanaId(v); }}
                  placeholder="Seleccione una semana"
                  classNames={{ trigger: 'bg-default-50', base: 'max-w-xs' }}
                  startContent={<Icon icon="lucide:calendar" width={14} className="text-default-400 shrink-0" />}
                >
                  {semanas
                    .filter(s => s.fechaFin >= new Date().toISOString().slice(0, 10))
                    .map(s => (
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: 'Solicitudes',      val: contadores.solicitudes,     color: 'border-success-200', icon: 'lucide:check-circle',    text: 'text-success-700'  },
          { label: 'Productos únicos', val: contadores.productosUnicos,  color: 'border-primary-200', icon: 'lucide:package',          text: 'text-primary-700'  },
          { label: 'Secciones',        val: contadores.secciones,        color: 'border-warning-200', icon: 'lucide:users',            text: 'text-warning-700'  },
          { label: 'Asignaturas',      val: contadores.asignaturas,      color: 'border-default-200', icon: 'lucide:graduation-cap',   text: 'text-default-700'  },
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

      {/* ── Banner consolidado ── */}
      {consolidado && (
        <div className="flex items-center gap-3 px-4 py-3 bg-success-50 border border-success-200 rounded-xl text-success-800">
          <Icon icon="lucide:check-circle-2" width={20} className="shrink-0 text-success-600" />
          <div>
            <p className="font-semibold text-sm">Pedido consolidado</p>
            <p className="text-xs">El sistema programará automáticamente cada sección según la fecha de su clase.</p>
          </div>
        </div>
      )}

      {/* ── Contenido principal ── */}
      <Card className="shadow-sm">
        <CardHeader className="px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Tabs vista */}
          <div className="flex items-center gap-1 bg-default-100 rounded-lg p-1">
            {(['consolidado', 'solicitudes'] as const).map(v => (
              <button key={v} onClick={() => setVistaActiva(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  vistaActiva === v ? 'bg-white shadow-sm text-primary' : 'text-default-500 hover:text-default-700'
                }`}>
                {v === 'consolidado' ? 'Resumen de Productos' : 'Solicitudes Aceptadas'}
              </button>
            ))}
          </div>

          {vistaActiva === 'consolidado' && (
            <Input size="sm" variant="bordered" placeholder="Buscar producto..."
              value={busqueda} onValueChange={setBusqueda}
              startContent={<Icon icon="lucide:search" className="text-default-400" width={14} />}
              classNames={{ base: 'max-w-xs', inputWrapper: 'bg-default-50' }}
            />
          )}

          <div className="sm:ml-auto shrink-0">
            {!consolidado ? (
              ped_Crear && (
              <Button color="primary" isDisabled={solicitudes.length === 0 || isLoadingDatos}
                onPress={() => { setConfirmarTexto(''); confirmarModal.onOpen(); }}
                startContent={<Icon icon="lucide:layers" width={15} />}>
                Consolidar Pedido
              </Button>
              )
            ) : (
              <Chip color="success" variant="flat" startContent={<Icon icon="lucide:check" width={12} />} className="px-3 py-4">
                Consolidado
              </Chip>
            )}
          </div>
        </CardHeader>

        <Divider />

        <CardBody className="p-4">
          {isLoadingDatos ? (
            <div className="py-16 flex flex-col items-center gap-3 text-default-400">
              <Spinner size="lg" />
              <p className="text-sm">Cargando solicitudes aceptadas...</p>
            </div>
          ) : !semanaId ? (
            <div className="py-16 flex flex-col items-center gap-3 text-default-400">
              <Icon icon="lucide:calendar-search" width={48} className="opacity-40" />
              <p className="text-sm">Seleccione una semana para ver el conglomerado.</p>
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-default-400">
              <Icon icon="lucide:inbox" width={48} className="opacity-40" />
              <p className="text-sm">No hay solicitudes aceptadas para esta semana.</p>
            </div>
          ) : vistaActiva === 'consolidado' ? (

            /* ── Vista resumen de productos ── */
            <div className="space-y-2">
              {productosFiltrados.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-3 text-default-400">
                  <Icon icon="lucide:search-x" width={36} className="opacity-40" />
                  <p className="text-sm">Sin resultados para "{busqueda}"</p>
                </div>
              ) : productosFiltrados.map(prod => {
                const key = String(prod.idProducto);
                const abierto = expandidos.has(key);
                return (
                  <div key={key} className="border border-default-200 rounded-xl overflow-hidden">
                    {/* Cabecera del producto */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 bg-default-50 hover:bg-default-100 transition-colors text-left"
                      onClick={() => toggleExpandido(key)}
                    >
                      <Icon icon="lucide:package" width={15} className="text-primary shrink-0" />
                      <span className="flex-1 font-semibold text-sm text-default-800">{prod.nombreProducto}</span>

                      <div className="flex items-center gap-3 mr-2">
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary leading-none">{fmtCantidad(prod.cantidadTotal)}</p>
                          <p className="text-[10px] text-default-400">{prod.unidad} total</p>
                        </div>
                        <Chip size="sm" color="default" variant="flat">
                          {prod.totalSecciones} sección{prod.totalSecciones !== 1 ? 'es' : ''}
                        </Chip>
                      </div>

                      <Icon icon={abierto ? 'lucide:chevron-up' : 'lucide:chevron-down'} width={16} className="text-default-400 shrink-0" />
                    </button>

                    {/* Detalle por sección */}
                    {abierto && (
                      <div className="divide-y divide-default-100">
                        {prod.detalles.map((det, idx) => {
                          const fch = fmtFechaCorta(det.fechaSolicitada);
                          const hoy = isHoy(det.fechaSolicitada);
                          return (
                            <div key={`${det.idSolicitud}-${idx}`}
                              className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-2.5 bg-white hover:bg-default-50/50">

                              {/* Fecha */}
                              <div className={`shrink-0 flex flex-col items-center justify-center rounded-lg px-2.5 py-1.5 min-w-[52px] text-center border ${
                                hoy ? 'bg-warning-50 border-warning-200' : 'bg-primary-50 border-primary-100'
                              }`}>
                                <span className={`text-[10px] font-bold uppercase leading-none ${hoy ? 'text-warning-600' : 'text-primary-500'}`}>{fch.dia}</span>
                                <span className={`text-sm font-bold leading-tight ${hoy ? 'text-warning-700' : 'text-primary'}`}>{fch.fecha}</span>
                                {hoy && <span className="text-[9px] font-bold text-warning-600 leading-none">HOY</span>}
                              </div>

                              {/* Info sección */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-default-800">§{det.nombreSeccion}</span>
                                  <span className="text-xs text-default-400">·</span>
                                  <span className="text-sm text-default-600">{det.nombreDocente}</span>
                                  <span className="text-xs text-default-400">·</span>
                                  <span className="text-xs text-default-500">{det.nombreAsignatura}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-default-400 flex-wrap">
                                  <span className="flex items-center gap-1"><Icon icon="lucide:clock" width={11} />{det.rangoHoras}</span>
                                  <span className="flex items-center gap-1"><Icon icon="lucide:door-open" width={11} />{det.nombreSala}</span>
                                  <span className="flex items-center gap-1"><Icon icon="lucide:users" width={11} />{det.alumnos} alumnos</span>
                                </div>
                                {det.observacion && (
                                  <div className="flex items-start gap-1 mt-1 text-xs text-default-500 italic">
                                    <Icon icon="lucide:message-circle" width={11} className="mt-px shrink-0" />
                                    <span>{det.observacion}</span>
                                  </div>
                                )}
                              </div>

                              {/* Cantidad para esta sección */}
                              <div className="shrink-0 text-right">
                                <p className="text-base font-bold text-default-700">{fmtCantidad(det.cantidad)} <span className="text-xs font-normal text-default-400">{prod.unidad}</span></p>
                                <p className="text-[10px] text-default-400">esta sección</p>
                              </div>
                            </div>
                          );
                        })}

                        {/* Total fila */}
                        <div className="flex items-center justify-end gap-2 px-4 py-2 bg-default-50 border-t border-default-200">
                          <span className="text-xs text-default-500 font-medium">Total a comprar:</span>
                          <span className="text-sm font-bold text-primary">{fmtCantidad(prod.cantidadTotal)} {prod.unidad}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          ) : (

            /* ── Vista solicitudes aceptadas por asignatura ── */
            <div className="space-y-4">
              {gruposPorAsignatura.map(grupo => (
                <div key={grupo.idAsignatura} className="rounded-xl border border-default-200 overflow-hidden">
                  {/* Cabecera asignatura */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-default-50 border-b border-default-200">
                    <Icon icon="lucide:graduation-cap" width={14} className="text-default-500 shrink-0" />
                    <span className="font-bold text-sm text-default-700">{grupo.nombre}</span>
                    <span className="ml-auto text-xs text-default-400">{grupo.items.length} solicitud{grupo.items.length > 1 ? 'es' : ''}</span>
                  </div>

                  {/* Solicitudes del grupo */}
                  <div className="divide-y divide-default-100">
                    {grupo.items.map(sol => {
                      const { seccion } = sol.asignaturaDetalle;
                      const fch = fmtFechaCorta(sol.fechaSolicitada);
                      const hoy = isHoy(sol.fechaSolicitada);
                      const solKey = String(sol.idSolicitud);
                      const abierto = expandidos.has(solKey);

                      return (
                        <div key={sol.idSolicitud}>
                          <button
                            className="w-full flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 hover:bg-default-50/50 transition-colors text-left"
                            onClick={() => toggleExpandido(solKey)}
                          >
                            {/* Fecha */}
                            <div className={`shrink-0 flex flex-col items-center justify-center rounded-lg px-2.5 py-1.5 min-w-[52px] text-center border ${
                              hoy ? 'bg-warning-50 border-warning-200' : 'bg-primary-50 border-primary-100'
                            }`}>
                              <span className={`text-[10px] font-bold uppercase leading-none ${hoy ? 'text-warning-600' : 'text-primary-500'}`}>{fch.dia}</span>
                              <span className={`text-sm font-bold leading-tight ${hoy ? 'text-warning-700' : 'text-primary'}`}>{fch.fecha}</span>
                              {hoy && <span className="text-[9px] font-bold text-warning-600 leading-none">HOY</span>}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-semibold text-sm">§{seccion.nombre_seccion}</span>
                                <span className="text-xs text-default-400">·</span>
                                <span className="text-sm text-default-600">{seccion.nombre_docente}</span>
                              </div>
                              <div className="flex items-center gap-5 mt-1.5 text-xs text-default-500 flex-wrap">
                                <span className="flex items-center gap-1.5"><Icon icon="lucide:book-open" width={12} />{sol.nombreReceta}</span>
                                <span className="flex items-center gap-1.5"><Icon icon="lucide:clock" width={12} />{seccion.horarios.rangoHoras}</span>
                                <span className="flex items-center gap-1.5"><Icon icon="lucide:door-open" width={12} />{seccion.horarios.nombreSala}</span>
                                <span className="flex items-center gap-1.5"><Icon icon="lucide:users" width={12} />{seccion.cant_inscritos} alumnos</span>
                                <span className="flex items-center gap-1.5"><Icon icon="lucide:package" width={12} />{seccion.cant_productos} productos</span>
                              </div>
                              {sol.observaciones && (
                                <p className="mt-1.5 text-xs text-default-500 italic">Obs: {sol.observaciones}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Chip size="sm" color="success" variant="flat" startContent={<Icon icon="lucide:check-circle" width={11} />}>
                                Aceptada
                              </Chip>
                              <Icon icon={abierto ? 'lucide:chevron-up' : 'lucide:chevron-down'} width={16} className="text-default-400" />
                            </div>
                          </button>

                          {/* Productos de la solicitud */}
                          {abierto && (
                            <div className="px-4 pb-3">
                              <div className="rounded-lg border border-default-100 overflow-hidden">
                                <div className="grid grid-cols-[0.8fr_0.8fr_0.5fr_0.5fr] px-3 py-1.5 bg-default-50 text-[10px] font-bold text-default-500 uppercase tracking-wider text-center">
                                  <span className="text-left">Producto</span><span>Observación</span><span>Cantidad</span><span>Unidad</span>
                                </div>
                                {seccion.productos_solicitados.map((p, i) => (
                                  <div key={i} className="grid grid-cols-[0.8fr_0.8fr_0.5fr_0.5fr] px-3 py-2 text-sm border-t border-default-100 hover:bg-default-50/50 items-center text-center">
                                    <Tooltip content={p.nombreProducto} placement="top-start" delay={500}>
                                      <span className="text-default-700 text-left truncate cursor-default block pr-2">{p.nombreProducto}</span>
                                    </Tooltip>
                                    <Tooltip content={p.observacion || 'Sin observación'} placement="top" delay={500} isDisabled={!p.observacion}>
                                      <span className="text-xs text-default-400 italic truncate px-2 cursor-default block">{p.observacion ?? '—'}</span>
                                    </Tooltip>
                                    <span className="font-mono font-semibold text-default-700">{fmtCantidad(p.cantidad)}</span>
                                    <span className="text-default-500">{p.unidad_abreviada}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-end mt-2">
                                <Button size="sm" variant="light" onPress={() => handleImprimirSolicitud(sol)}
                                  startContent={<Icon icon="lucide:printer" width={14} />}>
                                  Imprimir
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Modal Consolidar ── */}
      <Modal isOpen={confirmarModal.isOpen} onOpenChange={confirmarModal.onOpenChange} size="sm">
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex items-center gap-2 text-primary">
                <Icon icon="lucide:layers" width={18} />
                Consolidar Pedido de la Semana
              </ModalHeader>
              <ModalBody className="space-y-3">
                <div className="bg-primary-50 border border-primary-200 rounded-lg px-3 py-2.5 text-sm text-primary-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Icon icon="lucide:info" width={14} /> Información
                  </p>
                  <p>
                    Se consolidarán <strong>{contadores.solicitudes} solicitudes</strong> con <strong>{contadores.productosUnicos} productos únicos</strong>.
                    El sistema programará automáticamente cada sección según la fecha de su clase.
                  </p>
                </div>
                {semanaActual && (
                  <p className="text-sm text-default-600">
                    <span className="font-semibold">Semana:</span> {fmtFecha(semanaActual.fechaInicio)} al {fmtFecha(semanaActual.fechaFin)}
                  </p>
                )}
                <Input
                  label='Escriba "CONFIRMAR" para continuar'
                  placeholder="CONFIRMAR"
                  value={confirmarTexto}
                  onValueChange={setConfirmarTexto}
                  variant="bordered"
                  color={confirmarTexto.trim().toUpperCase() === 'CONFIRMAR' ? 'success' : 'default'}
                  endContent={confirmarTexto.trim().toUpperCase() === 'CONFIRMAR'
                    ? <Icon icon="lucide:check-circle" width={16} className="text-success" /> : null}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="primary" isLoading={isConsolidando}
                  isDisabled={confirmarTexto.trim().toUpperCase() !== 'CONFIRMAR'}
                  onPress={handleConsolidar}
                  startContent={!isConsolidando && <Icon icon="lucide:layers" width={14} />}>
                  Confirmar consolidación
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default GestionPedidosPage;
