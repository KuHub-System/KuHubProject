/**
 * SOLICITUD DE INSUMOS — masiva
 * Por cada asignatura: selecciona secciones + semana + receta + observaciones.
 * Al enviar se crean N solicitudes (una por sección seleccionada).
 * Semanas cargadas desde el backend con caché por periodo.
 */

import React from 'react';
import {
  Card, CardBody, CardHeader, CardFooter,
  Button, Select, SelectItem,
  Chip, Checkbox, Textarea, Input, Divider, Spinner,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
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

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS (mock para asignaturas — se reemplazará con endpoint real)
// ─────────────────────────────────────────────────────────────────────────────

interface MockBloque { dia: string; bloque: number; horaInicio: string; horaFin: string; sala: string; }
interface MockSeccion { id: string; numero: string; docente: string; inscritos: number; capacidad: number; bloques: MockBloque[]; }
interface MockAsignatura { id: string; codigo: string; nombre: string; secciones: MockSeccion[]; }

interface ItemSolicitud { id: string; nombre: string; cantidadBase: number; cantidad: number; unidad: string; esExtra: boolean; }
interface MockReceta { id: string; nombre: string; porciones: number; items: ItemSolicitud[]; }

interface AsigConfig {
  seccionesIds: Set<string>;
  semanaId: string; // String(ISemana.idSemana)
  recetaId: string;
  items: ItemSolicitud[];
  observaciones: string;
  extraNombre: string; extraCantidad: string; extraUnidad: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATOS MOCK (asignaturas y recetas — pendiente conexión real)
// ─────────────────────────────────────────────────────────────────────────────

const DIA_OFFSET: Record<string, number> = { LUNES: 0, MARTES: 1, MIERCOLES: 2, JUEVES: 3, VIERNES: 4, SABADO: 5, DOMINGO: 6 };
const DIA_ABREV: Record<string, string>  = { LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom' };

const MOCK_ASIGNATURAS: MockAsignatura[] = [
  {
    id: '1', codigo: 'BMD-01-033', nombre: 'Bollería Y Masas Dulces Spa',
    secciones: [
      { id: 's1', numero: '001D', docente: 'Sofia Elena Morales Rojas',       inscritos: 25, capacidad: 30, bloques: [{ dia: 'LUNES',     bloque: 3, horaInicio: '08:01', horaFin: '12:20', sala: '402' }] },
      { id: 's2', numero: '002',  docente: 'Javier Andres Fuentes Ortega',    inscritos: 28, capacidad: 30, bloques: [{ dia: 'MARTES', bloque: 5, horaInicio: '11:01', horaFin: '11:40', sala: '403' }, { dia: 'JUEVES', bloque: 5, horaInicio: '11:01', horaFin: '11:40', sala: '403' }] },
      { id: 's3', numero: '003',  docente: 'Carmen Rosa Jimenez Navarro',     inscritos: 22, capacidad: 30, bloques: [{ dia: 'VIERNES',    bloque: 7, horaInicio: '14:41', horaFin: '15:20', sala: '404' }] },
      { id: 's4', numero: '0034', docente: 'Carmen Rosa Jimenez Navarro',     inscritos: 20, capacidad: 30, bloques: [{ dia: 'MIERCOLES',  bloque: 8, horaInicio: '19:41', horaFin: '22:10', sala: '405' }] },
      { id: 's5', numero: '023D', docente: 'Beatriz Isabel Sepulveda Duran',  inscritos: 20, capacidad: 30, bloques: [{ dia: 'LUNES',     bloque: 9, horaInicio: '19:41', horaFin: '22:10', sala: '403' }] },
    ],
  },
  {
    id: '2', codigo: 'PAS-02-011', nombre: 'Pastelería Avanzada',
    secciones: [
      { id: 's6', numero: '001A', docente: 'Carlos Mendoza Torres',   inscritos: 18, capacidad: 25, bloques: [{ dia: 'MIERCOLES', bloque: 4, horaInicio: '09:41', horaFin: '12:20', sala: '501' }] },
      { id: 's7', numero: '002A', docente: 'Ana Lucia Vargas Rojas',  inscritos: 20, capacidad: 25, bloques: [{ dia: 'LUNES',     bloque: 6, horaInicio: '13:11', horaFin: '16:00', sala: '502' }] },
    ],
  },
  {
    id: '3', codigo: 'CHO-01-005', nombre: 'Chocolatería y Confitería',
    secciones: [
      { id: 's8', numero: '001C', docente: 'Maria Jose Reyes Fuentes', inscritos: 15, capacidad: 20, bloques: [{ dia: 'JUEVES', bloque: 2, horaInicio: '07:01', horaFin: '08:40', sala: '301' }] },
    ],
  },
];

const MOCK_RECETAS: MockReceta[] = [
  {
    id: 'r1', nombre: 'Croissant Mantequilla Clásico', porciones: 20,
    items: [
      { id: 'i1', nombre: 'Harina 000',          cantidadBase: 500, cantidad: 500, unidad: 'g',  esExtra: false },
      { id: 'i2', nombre: 'Mantequilla sin sal',  cantidadBase: 250, cantidad: 250, unidad: 'g',  esExtra: false },
      { id: 'i3', nombre: 'Leche entera',         cantidadBase: 200, cantidad: 200, unidad: 'ml', esExtra: false },
      { id: 'i4', nombre: 'Levadura fresca',      cantidadBase: 20,  cantidad: 20,  unidad: 'g',  esExtra: false },
      { id: 'i5', nombre: 'Azúcar blanca',        cantidadBase: 50,  cantidad: 50,  unidad: 'g',  esExtra: false },
      { id: 'i6', nombre: 'Sal fina',             cantidadBase: 10,  cantidad: 10,  unidad: 'g',  esExtra: false },
    ],
  },
  {
    id: 'r2', nombre: 'Muffin Arándanos Básico', porciones: 20,
    items: [
      { id: 'i1', nombre: 'Harina leudante',  cantidadBase: 400, cantidad: 400, unidad: 'g',  esExtra: false },
      { id: 'i2', nombre: 'Arándanos frescos',cantidadBase: 200, cantidad: 200, unidad: 'g',  esExtra: false },
      { id: 'i3', nombre: 'Huevo',            cantidadBase: 3,   cantidad: 3,   unidad: 'un', esExtra: false },
      { id: 'i4', nombre: 'Azúcar blanca',    cantidadBase: 150, cantidad: 150, unidad: 'g',  esExtra: false },
      { id: 'i5', nombre: 'Aceite vegetal',   cantidadBase: 100, cantidad: 100, unidad: 'ml', esExtra: false },
    ],
  },
  {
    id: 'r3', nombre: 'Tarta de Manzana Tradicional', porciones: 20,
    items: [
      { id: 'i1', nombre: 'Harina 000',    cantidadBase: 600, cantidad: 600, unidad: 'g', esExtra: false },
      { id: 'i2', nombre: 'Manzana verde', cantidadBase: 800, cantidad: 800, unidad: 'g', esExtra: false },
      { id: 'i3', nombre: 'Mantequilla',   cantidadBase: 200, cantidad: 200, unidad: 'g', esExtra: false },
      { id: 'i4', nombre: 'Canela molida', cantidadBase: 5,   cantidad: 5,   unidad: 'g', esExtra: false },
      { id: 'i5', nombre: 'Azúcar morena', cantidadBase: 200, cantidad: 200, unidad: 'g', esExtra: false },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const calcFecha = (fechaInicio: string, dia: string): Date => {
  const [y, m, d] = fechaInicio.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  f.setDate(f.getDate() + (DIA_OFFSET[dia] ?? 0));
  return f;
};

const fmtCorto = (d: Date) => d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
const fmtLargo = (d: Date) => d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

const fmtSemanaLabel = (s: ISemana) =>
  `${s.nombreSemana}  ·  ${fmtCorto(new Date(s.fechaInicio + 'T00:00:00'))} – ${fmtCorto(new Date(s.fechaFin + 'T00:00:00'))}`;

const makeEmptyConfig = (defaultSemanaId: string): AsigConfig => ({
  seccionesIds: new Set(), semanaId: defaultSemanaId,
  recetaId: '', items: [], observaciones: '',
  extraNombre: '', extraCantidad: '', extraUnidad: '',
});

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: TARJETA POR ASIGNATURA
// ─────────────────────────────────────────────────────────────────────────────

interface AsigCardProps {
  asig: MockAsignatura;
  config: AsigConfig;
  isExpanded: boolean;
  semanas: ISemana[];
  defaultSemanaId: string;
  onToggleExpand: () => void;
  onUpdate: (fn: (prev: AsigConfig) => AsigConfig) => void;
}

const AsigCard: React.FC<AsigCardProps> = ({
  asig, config, isExpanded, semanas, defaultSemanaId, onToggleExpand, onUpdate,
}) => {
  const semana = semanas.find(s => String(s.idSemana) === config.semanaId) ?? null;
  const selCount = config.seccionesIds.size;
  const allSel = selCount === asig.secciones.length && selCount > 0;
  const indeterminate = selCount > 0 && !allSel;

  const totalInscritos = asig.secciones
    .filter(s => config.seccionesIds.has(s.id))
    .reduce((sum, s) => sum + s.inscritos, 0);
  const multiplicador = totalInscritos > 0 ? totalInscritos / 20 : 1;

  const clases = React.useMemo(() => {
    if (!semana || selCount === 0) return [];
    const result: { fecha: Date; seccion: MockSeccion; bloque: MockBloque }[] = [];
    asig.secciones
      .filter(s => config.seccionesIds.has(s.id))
      .forEach(sec => sec.bloques.forEach(b =>
        result.push({ fecha: calcFecha(semana.fechaInicio, b.dia), seccion: sec, bloque: b })
      ));
    return result.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  }, [semana, config.seccionesIds, selCount]);

  const isValid   = selCount > 0 && config.recetaId !== '';
  const isPartial = selCount > 0 && config.recetaId === '';

  const reapplyMultiplier = (items: ItemSolicitud[], newMult: number) =>
    items.map(item => item.esExtra ? item : { ...item, cantidad: parseFloat((item.cantidadBase * newMult).toFixed(2)) });

  const toggleSec = (id: string) => onUpdate(prev => {
    const next = new Set(prev.seccionesIds);
    next.has(id) ? next.delete(id) : next.add(id);
    const ins = asig.secciones.filter(s => next.has(s.id)).reduce((s, sec) => s + sec.inscritos, 0);
    return { ...prev, seccionesIds: next, items: reapplyMultiplier(prev.items, ins > 0 ? ins / 20 : 1) };
  });

  const toggleAll = () => onUpdate(prev => {
    const ids = asig.secciones.map(s => s.id);
    const allSelected = ids.every(id => prev.seccionesIds.has(id));
    const next = new Set(prev.seccionesIds);
    ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
    const ins = asig.secciones.filter(s => next.has(s.id)).reduce((sum, s) => sum + s.inscritos, 0);
    return { ...prev, seccionesIds: next, items: reapplyMultiplier(prev.items, ins > 0 ? ins / 20 : 1) };
  });

  const handleSelectReceta = (recetaId: string) => {
    const receta = MOCK_RECETAS.find(r => r.id === recetaId);
    if (!receta) return;
    onUpdate(prev => ({
      ...prev, recetaId,
      items: receta.items.map(item => ({ ...item, cantidad: parseFloat((item.cantidadBase * multiplicador).toFixed(2)) })),
    }));
  };

  const actualizarCantidad = (itemId: string, val: string) => {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0)
      onUpdate(prev => ({ ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, cantidad: n } : i) }));
  };

  const agregarExtra = () => {
    if (!config.extraNombre.trim() || !config.extraCantidad || parseFloat(config.extraCantidad) <= 0) return;
    onUpdate(prev => ({
      ...prev,
      items: [...prev.items, {
        id: `extra-${Date.now()}`,
        nombre: prev.extraNombre.trim(),
        cantidadBase: parseFloat(prev.extraCantidad),
        cantidad: parseFloat(prev.extraCantidad),
        unidad: prev.extraUnidad || 'un',
        esExtra: true,
      }],
      extraNombre: '', extraCantidad: '', extraUnidad: '',
    }));
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
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-default-50 transition-colors rounded-t-xl"
      >
        {statusDot}
        <Chip size="sm" variant="flat" color="warning" className="font-bold shrink-0">{asig.codigo}</Chip>
        <span className="font-semibold text-sm flex-1 min-w-0 truncate">{asig.nombre}</span>
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
                        const isSel = config.seccionesIds.has(sec.id);
                        return (
                          <div key={sec.id} onClick={() => toggleSec(sec.id)}
                            className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${isSel ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-default-50'}`}
                          >
                            <Checkbox isSelected={isSel} size="sm" className="mt-0.5 pointer-events-none" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm">{sec.numero}</span>
                                <span className="text-[11px] text-default-400 truncate flex-1">{sec.docente}</span>
                                <span className="text-[11px] text-default-300 shrink-0">{sec.inscritos}/{sec.capacidad}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {sec.bloques.map((b, i) => (
                                  <span key={i} className="text-[10px] bg-default-100 text-default-500 px-1.5 py-0.5 rounded-full">
                                    {DIA_ABREV[b.dia]} {b.horaInicio}–{b.horaFin} · {b.sala}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {selCount > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-primary-600 font-medium">
                      <Icon icon="lucide:users" width={12} />
                      {totalInscritos} alumnos · ×{multiplicador.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* SEMANA */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-default-500 uppercase tracking-wider mb-2">Semana Académica</p>
                    {semanas.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-default-400 py-2">
                        <Spinner size="sm" /> Cargando semanas...
                      </div>
                    ) : (
                      <Select
                        selectedKeys={config.semanaId ? new Set([config.semanaId]) : new Set()}
                        onSelectionChange={keys => {
                          const v = Array.from(keys as Set<string>)[0];
                          if (v) onUpdate(prev => ({ ...prev, semanaId: v }));
                        }}
                        variant="bordered" size="sm" placeholder="Seleccione semana"
                        classNames={{ trigger: 'bg-default-50', popoverContent: 'dark:bg-content1' }}
                      >
                        {semanas.map(s => (
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
                        {config.semanaId === defaultSemanaId && <span className="text-success ml-1 font-medium">· en curso</span>}
                      </p>
                    )}
                  </div>

                  {/* Clases calculadas */}
                  {clases.length > 0 && (
                    <div className="rounded-xl border border-success-200 bg-success-50/50 dark:bg-success-900/10 p-3">
                      <p className="text-[11px] font-bold text-success-700 uppercase tracking-wider mb-2">Clases de esta semana</p>
                      <div className="space-y-1.5">
                        {clases.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <div className="w-14 shrink-0 text-center bg-success text-white rounded-full px-2 py-0.5 font-bold text-[10px]">
                              {fmtCorto(c.fecha)}
                            </div>
                            <span className="font-semibold">§{c.seccion.numero}</span>
                            <span className="text-default-400">B{c.bloque.bloque} · {c.bloque.horaInicio}–{c.bloque.horaFin} · Sala {c.bloque.sala}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Divider />

              {/* RECETA */}
              <div>
                <p className="text-xs font-bold text-default-500 uppercase tracking-wider mb-2">Receta Base</p>
                {selCount > 0 && (
                  <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary-50 dark:bg-secondary-900/20 border border-secondary-200 text-xs">
                    <Icon icon="lucide:calculator" className="text-secondary shrink-0" width={14} />
                    <span className="text-secondary-700 dark:text-secondary-300">
                      Receta base 20 porciones → <strong>×{multiplicador.toFixed(2)}</strong> para {totalInscritos} alumnos
                    </span>
                  </div>
                )}
                <Select
                  selectedKeys={config.recetaId ? new Set([config.recetaId]) : new Set()}
                  onSelectionChange={keys => handleSelectReceta(Array.from(keys as Set<string>)[0] ?? '')}
                  variant="bordered" size="sm" placeholder="Seleccione una receta..."
                  classNames={{ trigger: 'bg-default-50', popoverContent: 'dark:bg-content1' }}
                >
                  {MOCK_RECETAS.map(r => (
                    <SelectItem key={r.id} textValue={r.nombre}>
                      <div className="flex items-center gap-2">
                        <Icon icon="lucide:book-open" width={13} className="text-default-400" />
                        <span>{r.nombre}</span>
                        <span className="text-default-400 text-xs ml-auto">{r.porciones} porc.</span>
                      </div>
                    </SelectItem>
                  ))}
                </Select>

                {config.items.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="grid grid-cols-[1fr_90px_60px_30px] gap-1.5 px-2 text-[10px] font-bold text-default-400 uppercase tracking-wider border-b border-default-200 pb-1">
                      <span>Producto</span><span className="text-center">Cantidad</span><span className="text-center">Unidad</span><span />
                    </div>
                    {config.items.map(item => (
                      <div key={item.id}
                        className={`grid grid-cols-[1fr_90px_60px_30px] gap-1.5 items-center px-2 py-1.5 rounded-lg ${item.esExtra ? 'bg-warning-50 dark:bg-warning-900/10' : 'bg-default-50 dark:bg-default-100/10'}`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {item.esExtra && <Chip size="sm" color="warning" variant="flat" className="text-[9px] h-4 px-1 shrink-0">+</Chip>}
                          <span className="text-xs font-medium truncate">{item.nombre}</span>
                        </div>
                        <Input type="number" size="sm" value={String(item.cantidad)}
                          onValueChange={v => actualizarCantidad(item.id, v)}
                          min="0" step="0.1" variant="bordered"
                          classNames={{ inputWrapper: 'h-7 bg-white dark:bg-content1 min-h-7', input: 'text-center text-xs font-bold' }} />
                        <span className="text-xs text-default-500 text-center">{item.unidad}</span>
                        <Button isIconOnly variant="light" color="danger" size="sm" className="h-7 w-7 min-w-7"
                          onPress={() => onUpdate(prev => ({ ...prev, items: prev.items.filter(i => i.id !== item.id) }))}>
                          <Icon icon="lucide:x" width={12} />
                        </Button>
                      </div>
                    ))}
                    {/* Agregar extra */}
                    <div className="mt-2 pt-2 border-t border-dashed border-default-200">
                      <div className="grid grid-cols-[1fr_80px_60px_auto] gap-1.5 items-end">
                        <Input size="sm" placeholder="Producto extra..." value={config.extraNombre}
                          onValueChange={v => onUpdate(p => ({ ...p, extraNombre: v }))}
                          variant="bordered" classNames={{ inputWrapper: 'h-7 bg-white dark:bg-content1 min-h-7', input: 'text-xs' }} />
                        <Input size="sm" type="number" placeholder="Cant." value={config.extraCantidad}
                          onValueChange={v => onUpdate(p => ({ ...p, extraCantidad: v }))}
                          min="0" step="0.1" variant="bordered" classNames={{ inputWrapper: 'h-7 bg-white dark:bg-content1 min-h-7', input: 'text-xs text-center' }} />
                        <Input size="sm" placeholder="g/ml/un" value={config.extraUnidad}
                          onValueChange={v => onUpdate(p => ({ ...p, extraUnidad: v }))}
                          variant="bordered" classNames={{ inputWrapper: 'h-7 bg-white dark:bg-content1 min-h-7', input: 'text-xs text-center' }} />
                        <Button size="sm" color="secondary" variant="flat" onPress={agregarExtra}
                          className="h-7 px-2 text-xs font-medium" startContent={<Icon icon="lucide:plus" width={12} />}>
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
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
                    ? `Generará ${selCount} solicitud${selCount > 1 ? 'es' : ''} · ${selCount} sección${selCount > 1 ? 'es' : ''} · ${totalInscritos} alumnos`
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
  usePageTitle('Solicitud de Insumos', 'Cree solicitudes masivas de insumos para sus clases prácticas.');
  const toast = useToast();

  // ── semanas state ──
  const [semanas,         setSemanas]         = React.useState<ISemana[]>([]);
  const [periodos,        setPeriodos]         = React.useState<IPeriodoAcademico[]>([]);
  const [currentPeriodo,  setCurrentPeriodo]   = React.useState<{ anio: number; semestre: number } | null>(null);
  const [defaultSemanaId, setDefaultSemanaId]  = React.useState<string>('');
  const [isLoadingSemanas, setIsLoadingSemanas] = React.useState(true);
  const [needsManualInput, setNeedsManualInput] = React.useState(false);
  const [manualAnio,      setManualAnio]        = React.useState<string>(String(new Date().getFullYear()));
  const [manualSemestre,  setManualSemestre]    = React.useState<string>('');

  // ── form state ──
  const [configs,       setConfigs]      = React.useState<Map<string, AsigConfig>>(new Map());
  const [expanded,      setExpanded]     = React.useState<Set<string>>(new Set(['1']));
  const [isSubmitting,  setIsSubmitting] = React.useState(false);

  // ── helpers ──
  const getConfig = React.useCallback(
    (id: string): AsigConfig => configs.get(id) ?? makeEmptyConfig(defaultSemanaId),
    [configs, defaultSemanaId]
  );

  const updateConfig = (asigId: string, fn: (prev: AsigConfig) => AsigConfig) =>
    setConfigs(prev => { const m = new Map(prev); m.set(asigId, fn(getConfig(asigId))); return m; });

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // ── cargar semanas para un periodo concreto ──
  const cargarSemanasParaPeriodo = React.useCallback(async (anio: number, semestre: number) => {
    setIsLoadingSemanas(true);
    try {
      const data = await obtenerSemanasPorPeriodoService(anio, semestre);
      setSemanas(data);
      setCurrentPeriodo({ anio, semestre });
      const actual = encontrarSemanaActual(data);
      setDefaultSemanaId(actual ? String(actual.idSemana) : '');
    } catch {
      toast.error('Error al cargar las semanas del período seleccionado');
    } finally {
      setIsLoadingSemanas(false);
    }
  }, [toast]);

  // ── carga inicial ──
  React.useEffect(() => {
    const init = async () => {
      setIsLoadingSemanas(true);
      try {
        // 1. Periodos disponibles (una sola vez)
        const periodosData = await obtenerPeriodosAcademicosService();
        setPeriodos(periodosData);

        // 2. Detectar periodo actual por sysdate
        const { anio, semestre } = detectarPeriodoActual();

        // Intentos: semestre según mes, luego el opuesto
        const intentos = [
          { anio, semestre },
          { anio, semestre: semestre === 1 ? 2 : 1 },
        ];

        let resolved = false;
        for (const intento of intentos) {
          const existe = periodosData.some(
            p => p.anio === intento.anio && p.semestres.includes(intento.semestre)
          );
          if (!existe) continue;

          const data = await obtenerSemanasPorPeriodoService(intento.anio, intento.semestre);
          const actual = encontrarSemanaActual(data);

          setSemanas(data);
          setCurrentPeriodo(intento);
          setDefaultSemanaId(actual ? String(actual.idSemana) : '');
          resolved = true;
          if (actual) break; // semana exacta encontrada
        }

        // Fallback: usar primer periodo disponible
        if (!resolved) {
          if (periodosData.length > 0) {
            const p = periodosData[0];
            const s = p.semestres[0];
            const data = await obtenerSemanasPorPeriodoService(p.anio, s);
            setSemanas(data);
            setCurrentPeriodo({ anio: p.anio, semestre: s });
            setDefaultSemanaId('');
          } else {
            setNeedsManualInput(true);
          }
        }
      } catch {
        setNeedsManualInput(true);
      } finally {
        setIsLoadingSemanas(false);
      }
    };
    init();
  }, []);

  // ── cambiar periodo manualmente ──
  const handleManualBuscar = async () => {
    const anio = parseInt(manualAnio);
    const semestre = parseInt(manualSemestre);
    if (!anio || !semestre || semestre < 1 || semestre > 2) {
      toast.warning('Ingrese un año válido y seleccione el semestre');
      return;
    }
    setNeedsManualInput(false);
    await cargarSemanasParaPeriodo(anio, semestre);
  };

  // ── totales globales ──
  const resumen = React.useMemo(() => {
    let totalSolicitudes = 0;
    let totalAlumnos = 0;
    const asigConfiguradas: { asig: MockAsignatura; cfg: AsigConfig }[] = [];
    MOCK_ASIGNATURAS.forEach(asig => {
      const cfg = getConfig(asig.id);
      if (cfg.seccionesIds.size > 0 && cfg.recetaId) {
        totalSolicitudes += cfg.seccionesIds.size;
        totalAlumnos += asig.secciones.filter(s => cfg.seccionesIds.has(s.id)).reduce((sum, s) => sum + s.inscritos, 0);
        asigConfiguradas.push({ asig, cfg });
      }
    });
    return { totalSolicitudes, totalAlumnos, asigConfiguradas };
  }, [configs, getConfig]);

  const isFormValid = resumen.totalSolicitudes > 0;

  const limpiar = () => { setConfigs(new Map()); setExpanded(new Set(['1'])); };

  const enviar = async () => {
    if (!isFormValid) { toast.warning('Configure al menos una asignatura'); return; }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsSubmitting(false);
    toast.success(`${resumen.totalSolicitudes} solicitud(es) creada(s) correctamente`);
    limpiar();
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

            {/* Period chips */}
            {periodos.flatMap(p =>
              p.semestres.map(s => {
                const isActive = currentPeriodo?.anio === p.anio && currentPeriodo?.semestre === s;
                return (
                  <Button key={`${p.anio}-${s}`} size="sm"
                    color={isActive ? 'primary' : 'default'}
                    variant={isActive ? 'solid' : 'flat'}
                    onPress={() => !isActive && cargarSemanasParaPeriodo(p.anio, s)}
                    isDisabled={isLoadingSemanas}
                    className="h-7 min-w-0 px-3 font-bold text-xs"
                  >
                    {p.anio} S{s}
                    {isActive && <Icon icon="lucide:check" width={12} className="ml-1" />}
                  </Button>
                );
              })
            )}

            {isLoadingSemanas && <Spinner size="sm" color="primary" />}

            {/* Manual input fallback */}
            {needsManualInput && (
              <div className="flex items-center gap-2 ml-auto">
                <Input size="sm" type="number" placeholder="Año" value={manualAnio}
                  onValueChange={setManualAnio} min="2020" max="2100"
                  className="w-20" variant="bordered"
                  classNames={{ inputWrapper: 'h-7 min-h-7 bg-default-50' }} />
                <Button size="sm" color={manualSemestre === '1' ? 'primary' : 'default'} variant={manualSemestre === '1' ? 'solid' : 'flat'}
                  onPress={() => setManualSemestre('1')} className="h-7 min-w-0 px-3 font-bold text-xs">S1</Button>
                <Button size="sm" color={manualSemestre === '2' ? 'primary' : 'default'} variant={manualSemestre === '2' ? 'solid' : 'flat'}
                  onPress={() => setManualSemestre('2')} className="h-7 min-w-0 px-3 font-bold text-xs">S2</Button>
                <Button size="sm" color="secondary" onPress={handleManualBuscar}
                  isDisabled={!manualAnio || !manualSemestre} className="h-7 px-3 text-xs font-bold">
                  Buscar
                </Button>
              </div>
            )}

            {/* Info del periodo activo */}
            {currentPeriodo && !isLoadingSemanas && (
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
          {MOCK_ASIGNATURAS.map(asig => (
            <AsigCard key={asig.id} asig={asig}
              config={getConfig(asig.id)}
              isExpanded={expanded.has(asig.id)}
              semanas={semanas}
              defaultSemanaId={defaultSemanaId}
              onToggleExpand={() => toggleExpand(asig.id)}
              onUpdate={fn => updateConfig(asig.id, fn)}
            />
          ))}
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
                        <p className="text-xs text-primary-600 font-medium">Alumnos cubiertos</p>
                        <p className="text-2xl font-bold text-primary">{resumen.totalAlumnos}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {resumen.asigConfiguradas.map(({ asig, cfg }) => {
                        const s = semanas.find(s => String(s.idSemana) === cfg.semanaId);
                        const r = MOCK_RECETAS.find(r => r.id === cfg.recetaId);
                        const ins = asig.secciones.filter(sec => cfg.seccionesIds.has(sec.id)).reduce((sum, sec) => sum + sec.inscritos, 0);
                        return (
                          <div key={asig.id} className="rounded-xl border border-default-200 p-3 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Chip size="sm" variant="flat" color="warning" className="font-bold text-[10px]">{asig.codigo}</Chip>
                              <span className="text-xs font-semibold truncate">{asig.nombre}</span>
                            </div>
                            <div className="space-y-0.5 text-xs text-default-500 pl-1">
                              <div className="flex items-center gap-1.5"><Icon icon="lucide:layers" width={11} />{cfg.seccionesIds.size} sección(es) · {ins} alumnos</div>
                              <div className="flex items-center gap-1.5"><Icon icon="lucide:calendar" width={11} />{s?.nombreSemana ?? '—'}</div>
                              <div className="flex items-center gap-1.5"><Icon icon="lucide:book-open" width={11} /><span className="truncate">{r?.nombre ?? '—'}</span></div>
                            </div>
                            <Chip size="sm" color="success" variant="flat" className="text-[10px] w-full justify-center">
                              {cfg.seccionesIds.size} solicitud{cfg.seccionesIds.size > 1 ? 'es' : ''} a crear
                            </Chip>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardBody>
              <CardFooter className="flex flex-col gap-2 px-5 pb-5 pt-0 border-t border-default-100">
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
                {isFormValid && (
                  <Button variant="flat" color="danger" size="sm" fullWidth onPress={limpiar}>
                    Limpiar todo
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SolicitudPage;
