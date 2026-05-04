/**
 * SOLICITUD DE INSUMOS — masiva
 * Por cada asignatura: selecciona secciones + semana + receta + observaciones.
 * Al enviar se crean N solicitudes (una por sección seleccionada).
 */

import React from 'react';
import {
  Card, CardBody, CardHeader, CardFooter,
  Button, Select, SelectItem,
  Autocomplete, AutocompleteItem,
  Chip, Checkbox, Textarea, Input, Divider, Spinner,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../hooks/useToast';
import { useModulePermission, usePermission } from '../contexts/permission-context';
import { usePeriodoSemana } from '../contexts/periodo-semana-context';
import { useHistory } from 'react-router-dom';
import {
  IAsignaturaCurso, ISeccionCurso, IHorarioCurso,
  IPedidoSemanaBodegaSolicitud, IProductoOpcion,
  IResultsMassSolicitation,
  obtenerCursosParaSolicitudService,
  obtenerRecetasSolicitudService,
  obtenerProductosOpcionService,
  generarSolicitudesMasivasService,
} from '../services/solicitud-service';
import {ISemana} from "../types/semana.types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS LOCALES
// ─────────────────────────────────────────────────────────────────────────────

interface ItemSolicitud {
  id: string; nombre: string; cantidadBase: number; cantidad: number; unidad: string;
  esExtra: boolean; esFraccionario: boolean; activoProducto: boolean;
  idProducto?: number; // set for extra (nuevos) items
  observacion?: string;
}

interface AsigConfig {
  /** Claves de bloques seleccionados: "${secId}|${diaSemana}|${idSala}" */
  bloquesIds: Set<string>;
  semanaId: string;
  recetaId: string;
  items: ItemSolicitud[];
  observaciones: string;
  extraProductoId: string;
  extraCantidad: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES Y HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const DIA_OFFSET: Record<string, number> = { LUNES: 0, MARTES: 1, MIERCOLES: 2, JUEVES: 3, VIERNES: 4, SABADO: 5, DOMINGO: 6 };
const DIA_ABREV: Record<string, string>  = { LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom' };

// ── Feriados Chile ────────────────────────────────────────────────────────────
/** Algoritmo de Meeus/Jones/Butcher para calcular Pascua */
const calcularPascua = (y: number): Date => {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
};

const esFeriadoChile = (d: Date): boolean => {
  const mm  = d.getMonth() + 1; // 1-12
  const dd  = d.getDate();
  const y   = d.getFullYear();
  // Feriados fijos
  const fijos: [number, number][] = [
    [1,  1],  // Año Nuevo
    [5,  1],  // Día del Trabajo
    [5,  21], // Glorias Navales
    [6,  29], // San Pedro y San Pablo
    [7,  16], // Virgen del Carmen
    [8,  15], // Asunción de la Virgen
    [9,  18], // Independencia
    [9,  19], // Glorias del Ejército
    [10, 12], // Encuentro Dos Mundos
    [10, 31], // Iglesias Evangélicas
    [11, 1],  // Todos los Santos
    [12, 8],  // Inmaculada Concepción
    [12, 25], // Navidad
  ];
  if (fijos.some(([fm, fd]) => fm === mm && fd === dd)) return true;
  // Viernes Santo y Sábado Santo
  const pascua = calcularPascua(y);
  const vs = new Date(pascua); vs.setDate(vs.getDate() - 2); // Viernes Santo
  const ss = new Date(pascua); ss.setDate(ss.getDate() - 1); // Sábado Santo
  return (d.getTime() === vs.getTime() || d.getTime() === ss.getTime());
};


/** Agrupa los horarios de una sección por (diaSemana + sala): calcula rango inicio→fin */
interface HorarioAgrupado {
  diaSemana: string;
  idSala: number;
  nombreSala: string;
  horaInicio: string; // "08:01"
  horaFin: string;    // "12:20"
}

const agruparHorarios = (horarios: IHorarioCurso[]): HorarioAgrupado[] => {
  const map = new Map<string, IHorarioCurso[]>();
  for (const h of horarios) {
    const key = `${h.diaSemana}-${h.idSala}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(h);
  }
  return Array.from(map.values()).map(group => {
    const sorted = [...group].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    return {
      diaSemana: sorted[0].diaSemana,
      idSala: sorted[0].idSala,
      nombreSala: sorted[0].nombreSala,
      horaInicio: sorted[0].horaInicio.substring(0, 5),
      horaFin: sorted[sorted.length - 1].horaFin.substring(0, 5),
    };
  });
};

const calcFecha = (fechaInicio: string, dia: string): Date => {
  const [y, m, d] = fechaInicio.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  f.setDate(f.getDate() + (DIA_OFFSET[dia] ?? 0));
  return f;
};

const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const fmtCorto  = (d: Date) => d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
const fmtLargo  = (d: Date) => d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

const fmtSemanaLabel = (s: ISemana) =>
  `${s.nombreSemana}  ·  ${fmtCorto(new Date(s.fechaInicio + 'T00:00:00'))} – ${fmtCorto(new Date(s.fechaFin + 'T00:00:00'))}`;

/** Clave única de un bloque agrupado */
const mkBlkKey = (secId: number, diaSemana: string, idSala: number) =>
  `${secId}|${diaSemana}|${idSala}`;

/** Secciones que tienen al menos un bloque seleccionado */
const seccionesSeleccionadas = (secciones: ISeccionCurso[], bloquesIds: Set<string>) =>
  secciones.filter(sec =>
    agruparHorarios(sec.horarios).some(h => bloquesIds.has(mkBlkKey(sec.id_seccion, h.diaSemana, h.idSala)))
  );

const makeEmptyConfig = (defaultSemanaId: string): AsigConfig => ({
  bloquesIds: new Set(), semanaId: defaultSemanaId,
  recetaId: '', items: [], observaciones: '',
  extraProductoId: '', extraCantidad: '',
});

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: TARJETA POR ASIGNATURA
// ─────────────────────────────────────────────────────────────────────────────

interface AsigCardProps {
  asig: IAsignaturaCurso;
  config: AsigConfig;
  isExpanded: boolean;
  semanas: ISemana[];
  defaultSemanaId: string;
  isLoadingSemanas: boolean;
  sinPeriodos: boolean;
  recetas: IPedidoSemanaBodegaSolicitud[];
  productos: IProductoOpcion[];
  onToggleExpand: () => void;
  onUpdate: (fn: (prev: AsigConfig) => AsigConfig) => void;
}

const AsigCard: React.FC<AsigCardProps> = ({
  asig, config, isExpanded, semanas, defaultSemanaId, isLoadingSemanas, sinPeriodos, recetas, productos, onToggleExpand, onUpdate,
}) => {
  const { isAdmin: isAdminCard } = usePermission();
  const historyCard = useHistory();
  const semana = semanas.find(s => String(s.idSemana) === config.semanaId) ?? null;

  // ── Filtros de receta (período + semana) ──────────────────────────────────────
  const { periodos, semanas: contextSemanas, periodo: contextPeriodo, semanaId: contextSemanaId, seleccionarPeriodo } = usePeriodoSemana();
  const [filterIdSemana, setFilterIdSemana] = React.useState<string>(contextSemanaId || 'todas');

  React.useEffect(() => {
    setFilterIdSemana('todas');
  }, [contextPeriodo?.anio, contextPeriodo?.semestre]);

  const recetasFiltradas = React.useMemo(() => {
    if (filterIdSemana === 'todas') return recetas;
    return recetas.filter(r => r.idSemana != null && String(r.idSemana) === filterIdSemana);
  }, [recetas, filterIdSemana]);

  // ── derivados de bloquesIds ──
  const secSel         = seccionesSeleccionadas(asig.secciones, config.bloquesIds);
  const selCount       = secSel.length;
  const allBlkKeys     = asig.secciones.flatMap(sec =>
    agruparHorarios(sec.horarios).map(h => mkBlkKey(sec.id_seccion, h.diaSemana, h.idSala))
  );
  const allSel         = allBlkKeys.length > 0 && allBlkKeys.every(k => config.bloquesIds.has(k));
  const indeterminate  = !allSel && allBlkKeys.some(k => config.bloquesIds.has(k));

  const totalInscritos = secSel.reduce((sum, s) => sum + s.cant_inscritos, 0);

  /** Clases calculadas: solo bloques seleccionados, ordenadas por fecha */
  const clases = React.useMemo(() => {
    if (!semana || selCount === 0) return [];
    const result: { fecha: Date; seccion: ISeccionCurso; h: HorarioAgrupado }[] = [];
    asig.secciones.forEach(sec =>
      agruparHorarios(sec.horarios).forEach(h => {
        if (config.bloquesIds.has(mkBlkKey(sec.id_seccion, h.diaSemana, h.idSala)))
          result.push({ fecha: calcFecha(semana.fechaInicio, h.diaSemana), seccion: sec, h });
      })
    );
    return result.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  }, [semana, config.bloquesIds, selCount, asig.secciones]);

  const blkCount      = config.bloquesIds.size;
  const tieneItems    = config.items.length > 0;
  const isValid       = selCount > 0 && config.semanaId !== '' && (config.recetaId !== '' || tieneItems);
  const isPartial     = selCount > 0 && !isValid;

  const recomputeIns = (next: Set<string>) =>
    seccionesSeleccionadas(asig.secciones, next).reduce((s, sec) => s + sec.cant_inscritos, 0);

  /** Alterna un bloque individual */
  const toggleBloque = (secId: number, dia: string, idSala: number) => onUpdate(prev => {
    const key  = mkBlkKey(secId, dia, idSala);
    const next = new Set(prev.bloquesIds);
    next.has(key) ? next.delete(key) : next.add(key);
    // Solo actualizamos bloquesIds; las cantidades base NO cambian
    return { ...prev, bloquesIds: next };
  });

  /** Alterna todos los bloques de una sección (select si alguno falta, deselect si todos están) */
  const toggleSeccion = (sec: ISeccionCurso) => onUpdate(prev => {
    const keys     = agruparHorarios(sec.horarios).map(h => mkBlkKey(sec.id_seccion, h.diaSemana, h.idSala));
    const allSelec = keys.every(k => prev.bloquesIds.has(k));
    const next     = new Set(prev.bloquesIds);
    keys.forEach(k => allSelec ? next.delete(k) : next.add(k));
    // Solo actualizamos bloquesIds; las cantidades base NO cambian
    return { ...prev, bloquesIds: next };
  });

  /** Alterna todos los bloques de todas las secciones */
  const toggleAll = () => onUpdate(prev => {
    const next = new Set(prev.bloquesIds);
    if (allSel) { allBlkKeys.forEach(k => next.delete(k)); }
    else        { allBlkKeys.forEach(k => next.add(k));    }
    // Solo actualizamos bloquesIds; las cantidades base NO cambian
    return { ...prev, bloquesIds: next };
  });

  const handleSelectReceta = (recetaId: string) => {
    const receta = recetas.find(r => String(r.idReceta) === recetaId);
    if (!receta) return;
    onUpdate(prev => ({
      ...prev, recetaId,
      // Las cantidades se guardan tal como vienen de la receta (base 20 porciones)
      // El backend escala según los alumnos inscritos por sección
      items: receta.detalles.map(d => ({
        id: String(d.idDetalleReceta),
        nombre: d.nombreProducto,
        cantidadBase: d.cantProducto,
        cantidad: d.cantProducto, // Se muestra la cantidad base sin multiplicar
        unidad: d.abreviatura,
        esExtra: false,
        esFraccionario: d.esFraccionario,
        activoProducto: d.activoProducto,
      })),
    }));
  };

  const actualizarCantidad = (itemId: string, val: string, esFraccionario: boolean) => {
    let n = parseFloat(val);
    if (isNaN(n) || n < 0) return;
    n = esFraccionario ? parseFloat(n.toFixed(3)) : Math.round(n);
    // Al editar manualmente, actualizamos tanto cantidad como cantidadBase
    onUpdate(prev => ({ ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, cantidad: n, cantidadBase: n } : i) }));
  };

  const extraProducto = productos.find(p => String(p.idProducto) === config.extraProductoId) ?? null;

  const agregarExtra = () => {
    if (!extraProducto || !config.extraCantidad || parseFloat(config.extraCantidad) <= 0) return;
    const qty = extraProducto.esFraccionario
      ? parseFloat(parseFloat(config.extraCantidad).toFixed(3))
      : Math.round(parseFloat(config.extraCantidad));
    onUpdate(prev => {
      const existing = prev.items.findIndex(i => i.esExtra && i.idProducto === extraProducto.idProducto);
      if (existing !== -1) {
        // merge: sum quantities
        const updated = prev.items.map((i, idx) => {
          if (idx !== existing) return i;
          const newQty = i.esFraccionario
            ? parseFloat((i.cantidadBase + qty).toFixed(3))
            : Math.round(i.cantidadBase + qty);
          return { ...i, cantidadBase: newQty, cantidad: newQty };
        });
        return { ...prev, items: updated, extraProductoId: '', extraCantidad: '' };
      }
      return {
        ...prev,
        items: [...prev.items, {
          id: `extra-${Date.now()}`,
          nombre: extraProducto.nombreProducto,
          cantidadBase: qty,
          cantidad: qty,
          unidad: extraProducto.abreviatura,
          esExtra: true,
          esFraccionario: extraProducto.esFraccionario,
          activoProducto: true,
          idProducto: extraProducto.idProducto,
        }],
        extraProductoId: '', extraCantidad: '',
      };
    });
  };

  const statusDot = isValid
    ? <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0" />
    : isPartial
      ? <span className="w-2.5 h-2.5 rounded-full bg-warning shrink-0" />
      : <span className="w-2.5 h-2.5 rounded-full bg-default-300 shrink-0" />;

  return (
    <Card className={`shadow-sm border transition-colors ${
      isValid ? 'border-success-200' : isPartial ? 'border-warning-200' : 'border-default-200'
    }`}>
      {/* Header */}
      <button type="button" onClick={onToggleExpand}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-default-50 transition-colors rounded-t-xl cursor-pointer"
      >
        {statusDot}
        <span className="font-semibold text-sm flex-1 min-w-0 truncate">{asig.nombreAsignatura}</span>
        <div className="flex items-center gap-2 shrink-0">
          {selCount > 0 && <Chip size="sm" color={isValid ? 'success' : 'primary'} variant="flat">{selCount} secc.</Chip>}
          {semana && selCount > 0 && <Chip size="sm" color="default" variant="flat" className="hidden sm:flex">{semana.nombreSemana}</Chip>}
          {config.recetaId && <Icon icon="lucide:book-open" width={14} className="text-success hidden sm:block" />}
        </div>
        <Icon icon={isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'} className="text-default-400 shrink-0" width={16} />
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
            <div className="px-5 pb-5 space-y-5 border-t border-default-100">

              {/* Secciones + Semana */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">

                {/* SECCIONES */}
                <div>
                  <p className="text-xs font-bold text-default-500 uppercase tracking-wider mb-2">Secciones</p>
                  <div className="rounded-xl border border-default-200 overflow-hidden">
                    <div className="px-3 py-2 bg-default-50 border-b border-default-100">
                      <Checkbox isSelected={allSel} isIndeterminate={indeterminate} onValueChange={toggleAll} size="sm">
                        <span className="text-xs text-default-500">Seleccionar todas</span>
                      </Checkbox>
                    </div>
                    <div className="divide-y divide-default-100">
                      {asig.secciones.map(sec => {
                        const horariosAgrupados = agruparHorarios(sec.horarios);
                        const blkKeys    = horariosAgrupados.map(h => mkBlkKey(sec.id_seccion, h.diaSemana, h.idSala));
                        const secAllSel  = blkKeys.length > 0 && blkKeys.every(k => config.bloquesIds.has(k));
                        const secIndeterm = !secAllSel && blkKeys.some(k => config.bloquesIds.has(k));
                        return (
                          <div key={sec.id_seccion} className="divide-y divide-default-50">
                            {/* Fila sección — selecciona/deselecciona todos sus bloques */}
                            <div onClick={() => toggleSeccion(sec)}
                              className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${secAllSel ? 'bg-primary-50 dark:bg-primary-900/20' : secIndeterm ? 'bg-primary-50/40' : 'hover:bg-default-50'}`}
                            >
                              <Checkbox isSelected={secAllSel} isIndeterminate={secIndeterm} size="sm" className="pointer-events-none shrink-0" />
                              <span className="font-bold text-sm">{sec.nombre_seccion}</span>
                              <span className="text-[11px] text-default-400 truncate flex-1">{sec.nombre_docente}</span>
                              <span className="text-[11px] shrink-0">
                <span className="text-default-600 font-semibold">{sec.cant_inscritos}</span>
                <span className="text-default-300">/{sec.capacidad_max}</span>
              </span>
                            </div>
                            {/* Bloques individuales */}
                            {horariosAgrupados.map((h, i) => {
                              const key     = mkBlkKey(sec.id_seccion, h.diaSemana, h.idSala);
                              const isSel   = config.bloquesIds.has(key);
                              const fecha   = semana ? calcFecha(semana.fechaInicio, h.diaSemana) : null;
                              const feriado = fecha ? esFeriadoChile(fecha) : false;
                              return (
                                <div key={i}
                                  onClick={e => { e.stopPropagation(); toggleBloque(sec.id_seccion, h.diaSemana, h.idSala); }}
                                  className={`flex items-center gap-2 pl-8 pr-3 py-1.5 cursor-pointer transition-colors ${isSel ? 'bg-primary-50/60 dark:bg-primary-900/10' : 'hover:bg-default-50'}`}
                                >
                                  <Checkbox isSelected={isSel} size="sm" className="pointer-events-none shrink-0" />
                                  {feriado ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                      style={{ background: '#fef3c7', color: '#b45309' }}>
                                      {DIA_ABREV[h.diaSemana]} {h.horaInicio}–{h.horaFin} · Sala {h.nombreSala}
                                      {fecha && ` · ${fmtCorto(fecha)} · feriado`}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-default-100 text-default-500 px-1.5 py-0.5 rounded-full">
                                      {DIA_ABREV[h.diaSemana]} {h.horaInicio}–{h.horaFin} · Sala {h.nombreSala}
                                      {fecha && <span className="ml-1 font-bold text-black dark:text-white">· {fmtCorto(fecha)}</span>}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {selCount > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-primary-600 font-medium">
                      <Icon icon="lucide:users" width={12} />
                      {totalInscritos} alumnos seleccionados
                    </div>
                  )}
                </div>

                {/* SEMANA */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-default-500 uppercase tracking-wider mb-2">Semana Académica</p>
                    {isLoadingSemanas ? (
                      <div className="flex items-center gap-2 text-sm text-default-400 py-2">
                        <Spinner size="sm" /> Cargando semanas...
                      </div>
                    ) : sinPeriodos && !isAdminCard ? (
                      <p className="text-sm text-warning-600 dark:text-warning-400 flex items-center gap-1.5 py-2">
                        <Icon icon="lucide:alert-triangle" width={14} />
                        Contacte el Administrador para que genere los periodos académicos en el sistema.
                      </p>
                    ) : sinPeriodos && isAdminCard ? (
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-600 underline underline-offset-2 cursor-pointer transition-colors py-2"
                        onClick={() => historyCard.push('/admin-sistema?tab=semanas')}
                      >
                        <Icon icon="lucide:calendar-plus" width={14} />
                        Para realizar una solicitud, genere el período académico
                        <Icon icon="lucide:arrow-right" width={12} />
                      </button>
                    ) : semanas.length === 0 ? (
                      <p className="text-sm text-default-400 py-2">Sin semanas disponibles para este período.</p>
                    ) : (
                      <Select
                        selectedKeys={config.semanaId ? new Set([config.semanaId]) : new Set()}
                        onSelectionChange={keys => {
                          const v = Array.from(keys as Set<string>)[0];
                          if (v) onUpdate(prev => ({ ...prev, semanaId: v }));
                        }}
                        variant="bordered" size="sm" placeholder="Seleccione semana"
                        classNames={{ trigger: 'bg-default-50 cursor-pointer', popoverContent: 'dark:bg-content1' }}
                      >
                        {semanas.filter(s => s.fechaFin >= new Date().toISOString().slice(0, 10)).map(s => (
                          <SelectItem key={String(s.idSemana)} textValue={fmtSemanaLabel(s)}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{s.nombreSemana}</span>
                              <span className="text-default-400 text-xs">
                                {fmtCorto(new Date(s.fechaInicio + 'T00:00:00'))} – {fmtCorto(new Date(s.fechaFin + 'T00:00:00'))}
                              </span>
                              {String(s.idSemana) === defaultSemanaId && (
                                <Chip size="sm" color="success" variant="flat" className="ml-auto text-[10px]">Actual</Chip>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </Select>
                    )}
                    {semana && (
                      <p className="text-xs text-default-400 mt-1.5">
                        {fmtLargo(new Date(semana.fechaInicio + 'T00:00:00'))} al {fmtLargo(new Date(semana.fechaFin + 'T00:00:00'))}
                        {config.semanaId === defaultSemanaId && defaultSemanaId && <span className="text-success ml-1 font-medium">· en curso</span>}
                      </p>
                    )}
                  </div>

                  {/* Clases calculadas */}
                  {clases.length > 0 && (
                    <div className="rounded-xl border border-success-200 bg-success-50/50 dark:bg-success-900/10 p-3">
                      <p className="text-[11px] font-bold text-success-700 uppercase tracking-wider mb-2">Clases de esta semana</p>
                      <div className="space-y-1.5">
                        {clases.map((c, i) => {
                          const fechaISO    = toISODate(c.fecha);
                          const yaRegistrada = c.seccion.solicitudes?.includes(fechaISO) ?? false;
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <div className="w-14 shrink-0 text-center bg-success text-white rounded-full px-2 py-0.5 font-bold text-[10px]">
                                {fmtCorto(c.fecha)}
                              </div>
                              <span className="font-semibold">§{c.seccion.nombre_seccion}</span>
                              <span className="text-default-400">{c.h.horaInicio}–{c.h.horaFin} · Sala {c.h.nombreSala}</span>
                              {yaRegistrada && (
                                <span className="flex items-center gap-1 ml-auto shrink-0 text-default-600 bg-default-100 border border-default-200 rounded-full px-2 py-0.5 font-medium text-[10px]">
                                  <Icon icon="lucide:info" width={10} />
                                  Ya existe registro(s)
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Divider />

              {/* RECETA */}
              <div>
                <p className="text-xs font-bold text-default-500 uppercase tracking-wider mb-2">Receta Base</p>

                {/* Banner informativo: cantidades base */}
                <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary-50 dark:bg-secondary-900/20 border border-secondary-200 text-xs">
                  <Icon icon="lucide:info" className="text-secondary shrink-0" width={14} />
                  <span className="text-secondary-700 dark:text-secondary-300">
                    Las cantidades mostradas corresponden a la <strong>receta base (20 porciones)</strong>.
                    El sistema calculará automáticamente la cantidad proporcional según los alumnos inscritos por sección al momento de enviar.
                  </span>
                </div>

                {recetas.length === 0 ? (
                  isAdminCard ? (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-600 underline underline-offset-2 cursor-pointer transition-colors"
                      onClick={() => historyCard.push('/pedido-semanal-a-bodega')}
                    >
                      <Icon icon="lucide:book-plus" width={14} />
                      No hay recetas disponibles. Ir a Pedido Semanal a Bodega para crear una.
                      <Icon icon="lucide:arrow-right" width={12} />
                    </button>
                  ) : (
                    <p className="text-sm text-warning-600 dark:text-warning-400 flex items-center gap-1.5">
                      <Icon icon="lucide:alert-triangle" width={14} />
                      Contacte el administrador para crear Recetas Base.
                    </p>
                  )
                ) : (
                  /* Contenedor único: filtro período + filtro semana + buscador */
                  <div className="flex flex-wrap gap-2 items-center">

                    {/* Selector período */}
                    {periodos && periodos.length > 0 && (
                      (() => {
                        const hoy = new Date();
                        const mesActual = hoy.getMonth() + 1;
                        const semestreActual = mesActual <= 6 ? 1 : 2;
                        const anioActual = hoy.getFullYear();
                        return (
                          <Select
                            selectedKeys={contextPeriodo ? new Set([`${contextPeriodo.anio}-${contextPeriodo.semestre}`]) : new Set()}
                            onSelectionChange={(keys) => {
                              const v = Array.from(keys as Set<string>)[0];
                              if (v) {
                                const [anio, semestre] = v.split('-');
                                seleccionarPeriodo(Number(anio), Number(semestre));
                              }
                            }}
                            placeholder="Período"
                            variant="bordered"
                            size="sm"
                            className="w-36"
                            classNames={{ trigger: 'bg-default-50 cursor-pointer', popoverContent: 'dark:bg-content1' }}
                          >
                            {periodos.flatMap(p =>
                              p.semestres.map((s: number) => (
                                <SelectItem key={`${p.anio}-${s}`} textValue={`${p.anio} S${s}`}>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-xs">{p.anio} S{s}</span>
                                    {p.anio === anioActual && s === semestreActual && (
                                      <Chip size="sm" color="success" variant="flat" className="text-[9px] h-4 px-1">Actual</Chip>
                                    )}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </Select>
                        );
                      })()
                    )}

                    {/* Selector semana */}
                    {contextSemanas && contextSemanas.length > 0 && (
                      <Select
                        selectedKeys={new Set([filterIdSemana])}
                        onSelectionChange={(keys) => {
                          const v = Array.from(keys as Set<string>)[0];
                          setFilterIdSemana(v || 'todas');
                        }}
                        placeholder="Semana"
                        variant="bordered"
                        size="sm"
                        className="w-52"
                        classNames={{ trigger: 'bg-default-50 cursor-pointer', popoverContent: 'dark:bg-content1' }}
                      >
                        <SelectItem key="todas" textValue="Todas">Todas</SelectItem>
                        {contextSemanas.map(s => (
                          <SelectItem key={String(s.idSemana)} textValue={s.nombreSemana}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs">{s.nombreSemana}</span>
                              <span className="text-default-400 text-[10px]">
                                {fmtCorto(new Date(s.fechaInicio + 'T00:00:00'))} – {fmtCorto(new Date(s.fechaFin + 'T00:00:00'))}
                              </span>
                              {String(s.idSemana) === contextSemanaId && contextSemanaId && (
                                <Chip size="sm" color="success" variant="flat" className="ml-auto shrink-0 text-[9px] h-4 px-1">Actual</Chip>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </Select>
                    )}

                    {/* Buscador de receta */}
                    <Autocomplete
                      selectedKey={config.recetaId || null}
                      onSelectionChange={key => handleSelectReceta(String(key ?? ''))}
                      variant="bordered" size="sm" placeholder="Buscar receta..."
                      defaultItems={recetasFiltradas}
                      classNames={{ base: 'flex-1 min-w-[160px]', popoverContent: 'dark:bg-content1' }}
                      inputProps={{ classNames: { inputWrapper: 'bg-default-50' } }}
                      startContent={<Icon icon="lucide:book-open" width={13} className="text-default-400 shrink-0" />}
                    >
                      {(r) => (
                        <AutocompleteItem key={String(r.idReceta)} textValue={r.nombreReceta}>
                          <div className="flex items-center gap-2">
                            <span>{r.nombreReceta}</span>
                            <span className="text-default-400 text-xs ml-auto">{r.detalles.length} items</span>
                          </div>
                        </AutocompleteItem>
                      )}
                    </Autocomplete>

                    {recetasFiltradas.length === 0 && filterIdSemana !== 'todas' && (
                      <p className="text-xs text-default-400 w-full mt-1">
                        Sin recetas para la semana seleccionada.
                      </p>
                    )}
                  </div>
                )}

                {config.items.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="grid grid-cols-[1fr_1fr_90px_60px_30px] gap-1.5 px-2 text-[10px] font-bold text-default-400 uppercase tracking-wider border-b border-default-200 pb-1">
                      <span className="text-center">Producto</span>
                      <span className="text-center">Observación</span>
                      <span className="text-center">Cant. base</span>
                      <span className="text-center">Unidad</span>
                      <span />
                    </div>
                    {config.items.map(item => (
                      <div key={item.id}
                        className={`grid grid-cols-[1fr_1fr_90px_60px_30px] gap-1.5 items-center px-2 py-1.5 rounded-lg ${
                          !item.activoProducto ? 'bg-default-100/50 opacity-60' :
                          item.esExtra ? 'bg-warning-50 dark:bg-warning-900/10' : 'bg-default-50 dark:bg-default-100/10'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {item.esExtra && <Chip size="sm" color="warning" variant="flat" className="text-[9px] h-4 px-1 shrink-0">+</Chip>}
                          <span className={`text-xs font-medium truncate ${!item.activoProducto ? 'line-through text-default-400' : ''}`}>
                            {item.nombre}
                          </span>
                          {!item.activoProducto && (
                            <span className="text-[9px] text-danger font-medium shrink-0 ml-1">no disponible</span>
                          )}
                        </div>
                        <Input size="sm" value={item.observacion ?? ''}
                          onValueChange={v => onUpdate(prev => ({ ...prev, items: prev.items.map(i => i.id === item.id ? { ...i, observacion: v.slice(0, 100) } : i) }))}
                          placeholder="Opcional..."
                          isDisabled={!item.activoProducto}
                          variant="bordered"
                          classNames={{ inputWrapper: 'h-7 bg-white dark:bg-content1 min-h-7', input: 'text-xs' }} />
                        <Input type="number" size="sm" value={String(item.cantidad)}
                          onValueChange={v => actualizarCantidad(item.id, v, item.esFraccionario)}
                          isDisabled={!item.activoProducto}
                          min="0" step={item.esFraccionario ? '0.001' : '1'} variant="bordered"
                          classNames={{ inputWrapper: 'h-7 bg-white dark:bg-content1 min-h-7', input: 'text-center text-xs font-bold' }} />
                        <span className="text-xs text-default-500 text-center">{item.unidad}</span>
                        <Button isIconOnly variant="light" color="danger" size="sm" className="h-7 w-7 min-w-7"
                          onPress={() => onUpdate(prev => ({ ...prev, items: prev.items.filter(i => i.id !== item.id) }))}>
                          <Icon icon="lucide:x" width={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Agregar producto adicional — siempre visible */}
                <div className="mt-3 pt-2 border-t border-dashed border-default-200 space-y-2">
                  {/* Info */}
                  <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-warning-50 dark:bg-warning-900/10 border border-warning-200 text-[10px] text-warning-700">
                    <Icon icon="lucide:info" width={11} className="shrink-0 mt-0.5" />
                    <span>La cantidad ingresada corresponde a <strong>20 porciones base</strong>. El sistema calculará automáticamente la cantidad proporcional según los alumnos inscritos por sección.</span>
                  </div>
                  <div className="grid grid-cols-[1fr_90px_50px_auto] gap-1.5 items-end">
                    <Autocomplete size="sm" placeholder="Buscar producto..."
                      selectedKey={config.extraProductoId || null}
                      onSelectionChange={key => {
                        const id = key ? String(key) : '';
                        onUpdate(p => ({ ...p, extraProductoId: id, extraCantidad: '' }));
                      }}
                      variant="bordered"
                      classNames={{
                        base: 'min-w-[150px] w-full',
                            popoverContent: 'dark:bg-content1'
                          }}
                          inputProps={{
                            classNames: {
                              inputWrapper: 'h-7 min-h-7 bg-white dark:bg-content1',
                              input: 'text-xs border-none shadow-none focus:outline-none focus:ring-0',
                            }
                          }}
                        >
                          {productos.map(p => (
                            <AutocompleteItem key={String(p.idProducto)} textValue={p.nombreProducto}>
                              <span className="text-xs">{p.nombreProducto}</span>
                              <span className="text-[10px] text-default-400 ml-1">({p.abreviatura})</span>
                            </AutocompleteItem>
                          ))}
                        </Autocomplete>
                        <Input size="sm" type="number" placeholder="Cant."
                          value={config.extraCantidad}
                          onValueChange={v => onUpdate(p => ({ ...p, extraCantidad: v }))}
                          isDisabled={!extraProducto}
                          min="0" step={extraProducto?.esFraccionario ? '0.001' : '1'} variant="bordered"
                          classNames={{ inputWrapper: 'h-7 min-h-7 bg-white dark:bg-content1', input: 'text-xs text-center font-bold' }} />
                        <span className="text-xs text-default-500 text-center pb-1">
                          {extraProducto?.abreviatura ?? '—'}
                        </span>
                        <Button size="sm" color="secondary" variant="flat" onPress={agregarExtra}
                          isDisabled={!extraProducto || !config.extraCantidad || parseFloat(config.extraCantidad) <= 0}
                          className="h-7 px-2 text-xs font-medium" startContent={<Icon icon="lucide:plus" width={12} />}>
                          Agregar
                        </Button>
                      </div>
                  </div>
              </div>

              <Divider />

              {/* OBSERVACIONES */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-default-500 uppercase tracking-wider">
                    Observaciones <span className="font-normal normal-case text-default-400">(opcional)</span>
                  </p>
                  <span className={`text-xs ${config.observaciones.length >= 550 ? 'text-warning font-medium' : 'text-default-400'}`}>
                    {config.observaciones.length}/600
                  </span>
                </div>
                <Textarea placeholder="Instrucciones especiales o comentarios para Bodega..."
                  value={config.observaciones}
                  onValueChange={v => onUpdate(p => ({ ...p, observaciones: v.slice(0, 600) }))}
                  minRows={2} maxRows={4} variant="bordered" size="sm"
                  classNames={{ inputWrapper: 'bg-default-50 dark:bg-default-100/50' }} />
              </div>

              {/* Footer de la tarjeta */}
              {selCount > 0 && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
                  isValid ? 'border-success-200 bg-success-50 text-success-700' : 'border-warning-200 bg-warning-50 text-warning-700'
                }`}>
                  <Icon icon={isValid ? 'lucide:check-circle-2' : 'lucide:alert-circle'} width={14} />
                  {isValid
                    ? `Generará ${blkCount} solicitud${blkCount > 1 ? 'es' : ''} · ${selCount} sección${selCount > 1 ? 'es' : ''} · ${totalInscritos} alumnos`
                    : 'Seleccione una receta para completar la configuración'
                  }
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

const SolicitudPage: React.FC = () => {
  usePageTitle('Solicitud de Insumos', 'Cree solicitudes masivas de insumos para sus clases prácticas.', 'lucide:clipboard-list');
  const toast = useToast();
  const { canCreate: soli_Crear, canUpdate: soli_Editar, canDelete: soli_Eliminar } = useModulePermission('SOLICITUD');
  const { isAdmin } = usePermission();
  const history = useHistory();

  // CAMBIO 1: se agrega semanaId al destructuring
  const { periodos, semanas, periodo, semanaId, defaultSemanaId, isLoading: isLoadingSemanas, seleccionarPeriodo, seleccionarSemana, recargarPeriodos } = usePeriodoSemana();

  // ── asignaturas state ──
  const [asignaturas,      setAsignaturas]       = React.useState<IAsignaturaCurso[]>([]);
  const [isLoadingAsig,    setIsLoadingAsig]      = React.useState(true);

  // ── recetas + productos state ──
  const [recetas,          setRecetas]           = React.useState<IPedidoSemanaBodegaSolicitud[]>([]);
  const [productos,        setProductos]         = React.useState<IProductoOpcion[]>([]);

  // ── form state ──
  const [configs,          setConfigs]           = React.useState<Map<string, AsigConfig>>(new Map());
  const [expanded,         setExpanded]          = React.useState<Set<string>>(new Set()); // todos cerrados
  const [isSubmitting,     setIsSubmitting]      = React.useState(false);
  const [sendResult,       setSendResult]        = React.useState<IResultsMassSolicitation | null>(null);

  // ── helpers ──
  // CAMBIO 2: usar semanaId como fuente de verdad en getConfig()
  const getConfig = React.useCallback(
    (id: string): AsigConfig => configs.get(id) ?? makeEmptyConfig(semanaId || defaultSemanaId),
    [configs, semanaId, defaultSemanaId]
  );

  const updateConfig = (asigId: string, fn: (prev: AsigConfig) => AsigConfig) =>
    setConfigs(prev => { const m = new Map(prev); m.set(asigId, fn(getConfig(asigId))); return m; });

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // ── cargar asignaturas y recetas (una sola vez) ──
  React.useEffect(() => {
    const load = async () => {
      setIsLoadingAsig(true);
      try {
        const [asigData, recetasData, productosData] = await Promise.all([
          obtenerCursosParaSolicitudService(),
          obtenerRecetasSolicitudService(),
          obtenerProductosOpcionService(),
        ]);
        setAsignaturas(asigData);
        setRecetas(recetasData);
        setProductos(productosData);
      } catch {
        toast.error('Error al cargar los datos de la solicitud');
      } finally {
        setIsLoadingAsig(false);
      }
    };
    load();
  }, []);

  // ── ¿hay periodos creados en la BD? ──
  const sinPeriodos = (!periodos || periodos.length === 0) && !isLoadingSemanas;

  // ── totales globales ──
  const resumen = React.useMemo(() => {
    let totalSolicitudes = 0;
    let totalAlumnos = 0;
    const asigConfiguradas: { asig: IAsignaturaCurso; cfg: AsigConfig; secSel: ISeccionCurso[]; blkCount: number }[] = [];
    asignaturas.forEach(asig => {
      const cfg      = getConfig(String(asig.idAsignatura));
      const secSel   = seccionesSeleccionadas(asig.secciones, cfg.bloquesIds);
      const blkCount = cfg.bloquesIds.size; // one solicitud per selected block (day×room)
      if (secSel.length > 0 && cfg.semanaId && (cfg.recetaId || cfg.items.length > 0)) {
        totalSolicitudes += blkCount;
        // sum students × number of blocks selected for each section
        totalAlumnos += secSel.reduce((sum, sec) => {
          const secBlks = agruparHorarios(sec.horarios).filter(h =>
            cfg.bloquesIds.has(mkBlkKey(sec.id_seccion, h.diaSemana, h.idSala))
          ).length;
          return sum + sec.cant_inscritos * secBlks;
        }, 0);
        asigConfiguradas.push({ asig, cfg, secSel, blkCount });
      }
    });
    return { totalSolicitudes, totalAlumnos, asigConfiguradas };
  }, [configs, getConfig, asignaturas]);

  const isFormValid = resumen.totalSolicitudes > 0;

  const limpiar = () => { setConfigs(new Map()); setExpanded(new Set()); };

  const enviar = async () => {
    if (!isFormValid) { toast.warning('Configure al menos una asignatura'); return; }
    setIsSubmitting(true);
    try {
      const payload = resumen.asigConfiguradas.map(({ asig, cfg, secSel }) => {
        const semana = semanas.find(s => String(s.idSemana) === cfg.semanaId)!;
        const receta = cfg.recetaId ? recetas.find((r: IPedidoSemanaBodegaSolicitud) => String(r.idReceta) === cfg.recetaId) : null;

        // ── deltas ──────────────────────────────────────────────────────────
        // Las cantidades se envían tal como están (base 20 porciones).
        // El backend es responsable de escalar por sección según cant_inscritos.
        let deltas: { eliminados: number[]; modificados: { idDetalleReceta: number; cantProducto: number; observacion?: string }[]; nuevos: { idProducto: number; cantProducto: number; observacion: string }[] } | undefined;
        if (receta) {
          const originalIds = new Set(receta.detalles.map(d => String(d.idDetalleReceta)));
          const currentRecipeIds = new Set(cfg.items.filter(i => !i.esExtra).map(i => i.id));

          const eliminados = receta.detalles
            .filter(d => !currentRecipeIds.has(String(d.idDetalleReceta)))
            .map(d => d.idDetalleReceta);

          const modificados = cfg.items
            .filter(i => !i.esExtra && originalIds.has(i.id))
            .filter(i => {
              const orig = receta.detalles.find(d => String(d.idDetalleReceta) === i.id);
              // Comparamos directamente con cantidadBase (sin multiplicar)
              const cantidadCambiada = orig && Math.abs(i.cantidad - orig.cantProducto) > 0.0001;
              const observacionCambiada = !!i.observacion;
              return cantidadCambiada || observacionCambiada;
            })
            .map(i => ({
              idDetalleReceta: parseInt(i.id),
              cantProducto: i.cantidad, // Se envía la cantidad base sin multiplicar
              ...(i.observacion ? { observacion: i.observacion } : {}),
            }));

          const nuevos = cfg.items
            .filter(i => i.esExtra && i.idProducto != null)
            .map(i => ({
              idProducto: i.idProducto!,
              cantProducto: i.cantidadBase, // Cantidad base para 20 porciones
              observacion: i.observacion ? `[ADICIONAL] ${i.observacion}` : '[ADICIONAL]',
            }));

          if (eliminados.length > 0 || modificados.length > 0 || nuevos.length > 0) {
            deltas = { eliminados, modificados, nuevos };
          }
        } else {
          // Sin receta base: incluir solo los productos ingresados manualmente como nuevos
          const nuevosManuales = cfg.items
            .filter(i => i.esExtra && i.idProducto != null)
            .map(i => ({
              idProducto: i.idProducto!,
              cantProducto: i.cantidadBase,
              observacion: i.observacion ? `[ADICIONAL] ${i.observacion}` : '[ADICIONAL]',
            }));
          if (nuevosManuales.length > 0) {
            deltas = { eliminados: [], modificados: [], nuevos: nuevosManuales };
          }
        }

        // ── secciones: one entry per selected block (day×room) ───────────────
        const secciones = secSel.flatMap(sec => {
          const grupos = agruparHorarios(sec.horarios);
          return grupos
            .filter(h => cfg.bloquesIds.has(mkBlkKey(sec.id_seccion, h.diaSemana, h.idSala)))
            .map(group => ({
              idSeccion: sec.id_seccion,
              idUsuario: sec.id_usuario,
              cantInscritos: sec.cant_inscritos,
              horarios: sec.horarios
                .filter(h => h.diaSemana === group.diaSemana && h.idSala === group.idSala)
                .map(h => ({
                  idReservaSala: h.idReservaSala,
                  fechaSolicitadaCalculada: toISODate(calcFecha(semana.fechaInicio, h.diaSemana)),
                })),
            }));
        });

        return {
          idAsignatura: asig.idAsignatura,
          idSemana: parseInt(cfg.semanaId),
          ...(cfg.recetaId ? { idReceta: parseInt(cfg.recetaId) } : {}),
          ...(cfg.observaciones ? { observacion: cfg.observaciones } : {}),
          secciones,
          ...(deltas ? { deltas } : {}),
        };
      });

      const result = await generarSolicitudesMasivasService(payload);
      setSendResult(result);
      limpiar();
    } catch {
      toast.error('Error al enviar las solicitudes. Verifique los datos e intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-6 space-y-5">

      {/* ── Selector de periodo académico ── */}
      <Card className="shadow-sm border border-default-200">
        <CardBody className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-default-500 uppercase tracking-wider shrink-0">
              <Icon icon="lucide:calendar-range" width={14} className="text-secondary" />
              Período académico
            </div>

            {isLoadingSemanas && <Spinner size="sm" color="primary" />}

            {sinPeriodos && !isAdmin && (
              <p className="text-sm text-warning-600 dark:text-warning-400 flex items-center gap-2">
                <Icon icon="lucide:alert-triangle" width={14} />
                Contacte el Administrador para que genere los periodos académicos en el sistema.
              </p>
            )}

            {sinPeriodos && isAdmin && (
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-primary hover:text-primary-600 underline underline-offset-2 cursor-pointer transition-colors"
                onClick={() => history.push('/admin-sistema?tab=semanas')}
              >
                <Icon icon="lucide:calendar-plus" width={16} />
                Para realizar una solicitud, genere el período académico
                <Icon icon="lucide:arrow-right" width={14} />
              </button>
            )}

            {!sinPeriodos && periodos && periodos.map(p =>
              p.semestres.map((s: number) => (
                <button key={`${p.anio}-${s}`}
                  onClick={() => {
                    const isActive = periodo?.anio === p.anio && periodo?.semestre === s;
                    if (!isActive && !isLoadingSemanas) {
                      seleccionarPeriodo(p.anio, s);
                    }
                  }}
                  disabled={isLoadingSemanas}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    periodo?.anio === p.anio && periodo?.semestre === s
                      ? 'bg-warning text-white border-warning'
                      : 'bg-default-100 text-default-600 border-default-200 hover:bg-default-200'
                  }`}
                >
                  {p.anio} S{s}
                </button>
              ))
            )}
            {/* Botón para recargar períodos académicos */}
            {!sinPeriodos && periodo && (
              <button
                type="button"
                onClick={() => {
                  if (!isLoadingSemanas) {
                    recargarPeriodos();
                  }
                }}
                disabled={isLoadingSemanas}
                className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-default-300 bg-default-100 text-default-600 hover:bg-default-200 transition-colors cursor-pointer"
                title="Recargar períodos académicos"
              >
                <Icon icon="lucide:refresh-cw" width={12} />
                Recargar
              </button>
            )}
          </div>

          {/* Selector de semana */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-default-500 uppercase tracking-wider shrink-0">
              <Icon icon="lucide:calendar" width={14} className="text-secondary" />
              Semana
            </div>
            {isLoadingSemanas ? (
              <div className="flex items-center gap-2 text-sm text-default-400"><Spinner size="sm" /> Cargando semanas...</div>
            ) : semanas.length === 0 ? (
              <p className="text-sm text-default-400">Sin semanas disponibles para este período.</p>
            ) : (
              <Select size="sm" variant="bordered"
                selectedKeys={semanaId ? new Set([semanaId]) : new Set()}
                onSelectionChange={keys => { const v = Array.from(keys as Set<string>)[0]; if (v) seleccionarSemana(v); }}
                placeholder="Seleccione semana"
                classNames={{ trigger: 'bg-default-50 cursor-pointer', base: 'max-w-xs' }}
                startContent={<Icon icon="lucide:calendar" width={14} className="text-default-400 shrink-0" />}
              >
                {semanas.map(s => (
                  <SelectItem key={String(s.idSemana)} textValue={s.nombreSemana}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{s.nombreSemana}</span>
                      <span className="text-default-400 text-xs">
                        {new Date(s.fechaInicio + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                        {' – '}
                        {new Date(s.fechaFin + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      </span>
                      {String(s.idSemana) === defaultSemanaId && (
                        <Chip size="sm" color="success" variant="flat" className="ml-auto shrink-0 text-[10px]">Actual</Chip>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </Select>
            )}

            {periodo && !isLoadingSemanas && (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-default-400">
                <Icon icon="lucide:info" width={12} />
                {semanas.length} semanas cargadas
                {defaultSemanaId && ` · Semana ${semanas.find(s => String(s.idSemana) === defaultSemanaId)?.nombreSemana ?? ''} en curso`}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Banner informativo */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200">
        <Icon icon="lucide:info" className="text-primary mt-0.5 shrink-0" width={16} />
        <p className="text-sm text-primary-700 dark:text-primary-300">
          <strong>Solicitud masiva:</strong> configure cada asignatura con sus secciones, semana y receta.
          Al enviar se crea una solicitud por cada sección seleccionada.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
      >
        {/* ── Asignaturas ── */}
        <div className="lg:col-span-2 space-y-4">
          {isLoadingAsig ? (
            <div className="flex items-center justify-center gap-3 py-12 text-default-400">
              <Spinner size="md" /> Cargando asignaturas...
            </div>
          ) : asignaturas.length === 0 ? (
            <div className="text-center py-12 text-default-400">
              <Icon icon="lucide:book-x" width={32} className="mx-auto mb-2" />
              <p className="text-sm">No hay asignaturas disponibles</p>
              {isAdmin && (
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-600 underline underline-offset-2 cursor-pointer transition-colors"
                  onClick={() => history.push('/gestion-academica')}
                >
                  <Icon icon="lucide:graduation-cap" width={14} />
                  Ir a Gestión de Asignaturas
                  <Icon icon="lucide:arrow-right" width={12} />
                </button>
              )}
            </div>
          ) : (
            asignaturas.map(asig => (
              <AsigCard key={asig.idAsignatura} asig={asig}
                config={getConfig(String(asig.idAsignatura))}
                isExpanded={expanded.has(String(asig.idAsignatura))}
                semanas={semanas}
                defaultSemanaId={defaultSemanaId}
                isLoadingSemanas={isLoadingSemanas}
                sinPeriodos={sinPeriodos}
                recetas={recetas}
                productos={productos}
                onToggleExpand={() => toggleExpand(String(asig.idAsignatura))}
                onUpdate={fn => updateConfig(String(asig.idAsignatura), fn)}
              />
            ))
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <Card className="shadow-sm border border-default-200">
              <CardHeader className="bg-default-50 dark:bg-content2 border-b border-default-100 px-5 py-4">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <Icon icon="lucide:send" className="text-secondary" width={16} />
                  Resumen de Envío
                </h2>
              </CardHeader>
              <CardBody className="p-5 space-y-4">
                {resumen.asigConfiguradas.length === 0 ? (
                  <div className="text-center py-6 text-default-300">
                    <Icon icon="lucide:clipboard-list" width={32} className="mx-auto mb-2" />
                    <p className="text-xs">Configure al menos una asignatura</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200">
                      <div>
                        <p className="text-xs text-primary-600 font-medium">Total solicitudes</p>
                        <p className="text-2xl font-bold text-primary">{resumen.totalSolicitudes}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-primary-600 font-medium">Atenciones totales</p>
                        <p className="text-2xl font-bold text-primary">{resumen.totalAlumnos}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {resumen.asigConfiguradas.map(({ asig, cfg, secSel, blkCount }) => {
                        const s   = semanas.find(s => String(s.idSemana) === cfg.semanaId);
                        const r   = recetas.find((r: IPedidoSemanaBodegaSolicitud) => String(r.idReceta) === cfg.recetaId);
                        const ins = secSel.reduce((sum, sec) => sum + sec.cant_inscritos, 0);
                        return (
                          <div key={asig.idAsignatura} className="rounded-xl border border-default-200 p-3 space-y-1.5">
                            <span className="text-xs font-semibold truncate block">{asig.nombreAsignatura}</span>
                            <div className="space-y-0.5 text-xs text-default-500 pl-1">
                              <div className="flex items-center gap-1.5"><Icon icon="lucide:layers" width={11} />{secSel.length} sección(es) · {ins} alumnos</div>
                              <div className="flex items-center gap-1.5"><Icon icon="lucide:calendar" width={11} />{s?.nombreSemana ?? '—'}</div>
                              <div className="flex items-center gap-1.5"><Icon icon="lucide:book-open" width={11} /><span className="truncate">{r?.nombreReceta ?? '—'}</span></div>
                            </div>
                            <Chip size="sm" color="success" variant="flat" className="text-[10px] w-full justify-center">
                              {blkCount} solicitud{blkCount > 1 ? 'es' : ''} a crear
                            </Chip>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardBody>
              <CardFooter className="flex flex-col gap-2 px-5 pb-5 pt-0 border-t border-default-100">
                {soli_Crear && (
                <Button color="primary" size="lg" fullWidth isLoading={isSubmitting}
                  isDisabled={!isFormValid || isSubmitting} onPress={enviar}
                  endContent={!isSubmitting && <Icon icon="lucide:send" width={16} />}
                  className="font-bold"
                >
                  {isFormValid
                    ? `Enviar ${resumen.totalSolicitudes} Solicitud${resumen.totalSolicitudes > 1 ? 'es' : ''}`
                    : 'Configure una asignatura'
                  }
                </Button>
                )}
                {soli_Crear && isFormValid && (
                  <Button variant="flat" color="danger" size="sm" fullWidth onPress={limpiar}>
                    Limpiar todo
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </motion.div>

      {/* ── Modal de resultado ── */}
      <Modal isOpen={sendResult !== null} onClose={() => setSendResult(null)} size="md" hideCloseButton>
        <ModalContent className="overflow-hidden">
          {/* Banner de éxito */}
          <div className="bg-gradient-to-br from-success-400 to-success-600 px-6 py-8 flex flex-col items-center gap-3">
            <div className="bg-white/20 rounded-full p-4">
              <Icon icon="lucide:check" width={36} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">¡Solicitudes creadas!</h2>
            <p className="text-sm text-white/80 text-center max-w-[260px]">
              Las solicitudes de insumos fueron generadas exitosamente.
            </p>
          </div>

          <ModalBody className="py-6 px-6">
            {/* Stats */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl bg-success-50 border border-success-200">
                <Icon icon="lucide:file-check-2" className="text-success-600" width={26} />
                <span className="text-4xl font-bold text-success-700">{sendResult?.totalSolicitudes}</span>
                <span className="text-xs text-success-600 font-semibold text-center uppercase tracking-wide leading-tight">
                  Solicitudes<br/>Creadas
                </span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl bg-warning-50 border border-warning-200">
                <Icon icon="lucide:package" className="text-warning-600" width={26} />
                <span className="text-4xl font-bold text-warning-700">{sendResult?.totalDetalles}</span>
                <span className="text-xs text-warning-600 font-semibold text-center uppercase tracking-wide leading-tight">
                  Productos<br/>Calculados
                </span>
              </div>
            </div>

            {/* Explicación */}
            <div className="mt-4 flex items-start gap-2 bg-default-50 border border-default-200 rounded-xl px-4 py-3">
              <Icon icon="lucide:info" width={16} className="text-default-400 mt-0.5 shrink-0" />
              <p className="text-xs text-default-500 leading-relaxed">
                Cada producto fue multiplicado según la receta y la cantidad de alumnos inscritos por sección.
              </p>
            </div>
          </ModalBody>

          <ModalFooter className="pt-0 px-6 pb-5">
            <Button color="success" fullWidth size="lg" onPress={() => setSendResult(null)}
              className="font-semibold"
              startContent={<Icon icon="lucide:thumbs-up" width={18} />}
            >
              Entendido
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default SolicitudPage;
