import React from 'react';
import { Card, CardBody, Chip, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { IAsignatura, ISeccion, IBloqueHorario, EstadoSeccion } from '../../types/academica/asignatura.types';

const DIAS_ABREV: Record<string, string> = {
  LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié',
  JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom'
};

/**
 * Agrupa bloques por sala+día, fusiona bloques consecutivos en rangos.
 * Retorna una línea por grupo: { sala, dia, rangos }
 */
const formatearHorarioAgrupado = (bloques: IBloqueHorario[]): { sala: string; dia: string; rangos: string[] }[] => {
  if (!bloques || bloques.length === 0) return [];

  const grupos = new Map<string, IBloqueHorario[]>();
  for (const b of bloques) {
    const key = `${b.idSala}__${b.diaSemana}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(b);
  }

  const result: { sala: string; dia: string; rangos: string[] }[] = [];

  for (const gruposBloques of grupos.values()) {
    const sorted = [...gruposBloques].sort((a, b) => a.numeroBloque - b.numeroBloque);
    const sala = sorted[0].nombreSala;
    const dia = DIAS_ABREV[sorted[0].diaSemana] ?? sorted[0].diaSemana;

    const rangos: string[] = [];
    let inicio = sorted[0];
    let anterior = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const cur = sorted[i];
      if (cur.numeroBloque === anterior.numeroBloque + 1) {
        anterior = cur;
      } else {
        rangos.push(`${inicio.horaInicio.slice(0, 5)}-${anterior.horaFin.slice(0, 5)}`);
        inicio = cur;
        anterior = cur;
      }
    }
    rangos.push(`${inicio.horaInicio.slice(0, 5)}-${anterior.horaFin.slice(0, 5)}`);
    result.push({ sala, dia, rangos });
  }

  return result;
};

/**
 * Renderiza el estado de la sección
 */
const renderEstadoSeccion = (estado: EstadoSeccion) => {
  switch (estado) {
    case 'ACTIVA':
      return <Chip color="success" size="sm">Activa</Chip>;
    case 'INACTIVA':
      return <Chip color="default" size="sm">Inactiva</Chip>;
    case 'SUSPENDIDA':
      return <Chip color="danger" size="sm">Suspendida</Chip>;
    default:
      return <Chip size="sm">{estado}</Chip>;
  }
};

export interface AsignaturaCardProps {
  asignatura: IAsignatura;
  isExpanded: boolean;
  onToggleExpand: (asignaturaId: string) => void;
  ramosEditar: boolean;
  ramosEliminar: boolean;
  seccionesEditar: boolean;
  seccionesEliminar: boolean;
  seccionesCrear: boolean;
  onEditarAsignatura: (asignatura: IAsignatura) => void;
  onEliminarAsignatura: (asignaturaId: string, nombreAsignatura: string) => void;
  onEditarSeccion: (asignatura: IAsignatura, seccion: ISeccion) => void;
  onEliminarSeccion: (asignaturaId: string, seccionId: string, nombreSeccion: string) => void;
  onAgregarSeccion: (asignatura: IAsignatura) => void;
}

/**
 * Card de una asignatura con su lista expandible de secciones.
 * Memoizado: sin esto, cada tecla en el buscador o cualquier otro cambio de
 * estado en GestionAsignaturasPage re-renderiza todas las cards de la lista.
 */
const AsignaturaCard: React.FC<AsignaturaCardProps> = ({
  asignatura,
  isExpanded,
  onToggleExpand,
  ramosEditar,
  ramosEliminar,
  seccionesEditar,
  seccionesEliminar,
  seccionesCrear,
  onEditarAsignatura,
  onEliminarAsignatura,
  onEditarSeccion,
  onEliminarSeccion,
  onAgregarSeccion,
}) => {
  const totalAlumnos = asignatura.secciones
    .filter(s => s.estado === 'ACTIVA')
    .reduce((sum, s) => sum + s.cantInscritos, 0);
  const multiplicadorPedidoSemanaBodega = totalAlumnos > 0 ? (totalAlumnos / 20).toFixed(2) : '0';

  return (
    <Card className="shadow-sm bg-white dark:bg-content1">
      <CardBody className="p-0">
        {/* Fila principal de la asignatura */}
        <div
          className="flex items-center justify-between p-4 border-b border-default-200 cursor-pointer hover:bg-default-50 dark:hover:bg-default-100/10 transition-colors select-none"
          onClick={() => onToggleExpand(asignatura.id)}
        >
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 flex items-center justify-center">
              <Icon
                icon={isExpanded ? "lucide:chevron-down" : "lucide:chevron-right"}
                className="text-default-400"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{asignatura.nombre}</h3>
                <Chip size="sm" color="primary">{asignatura.codigo}</Chip>
              </div>
              <p className="text-sm text-default-500">
                Gestor Asignatura: <span className="font-medium">{asignatura.profesorACargoNombre}</span>
              </p>
              <p className="text-xs text-default-400 mt-1">
                Total alumnos activos: <span className="font-semibold text-primary">{totalAlumnos}</span> •
                Multiplicador pedidoSemanaBodega (base 20): <span className="font-semibold text-primary">{multiplicadorPedidoSemanaBodega}x</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Chip color="secondary" size="sm">
              {asignatura.secciones.length} secciones
            </Chip>
            <Chip
              size="sm"
              color={asignatura.secciones.every((s: ISeccion) => s.estado === 'ACTIVA') ? 'success' : 'warning'}
            >
              {asignatura.secciones.filter((s: ISeccion) => s.estado === 'ACTIVA').length} activas
            </Chip>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {ramosEditar && (
              <Button
                isIconOnly
                variant="light"
                size="md"
                onPress={() => onEditarAsignatura(asignatura)}
              >
                <Icon icon="lucide:edit" width={18} className="text-default-400 hover:text-primary" />
              </Button>
              )}
              {ramosEliminar && (
              <Button
                isIconOnly
                variant="light"
                size="md"
                onPress={() => onEliminarAsignatura(asignatura.id, asignatura.nombre)}
              >
                <Icon icon="lucide:trash-2" width={18} className="text-default-400 hover:text-danger" />
              </Button>
              )}
            </div>
          </div>
        </div>

        {/* Sección expandible con las secciones */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-default-50 dark:bg-default-100/10">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-sm">Secciones ({asignatura.secciones.length})</h4>
                </div>

                {/* Tabla de secciones — cabecera solo si hay datos */}
                {asignatura.secciones.length === 0 ? (
                  <p className="text-center py-6 text-default-400 text-sm">No hay secciones registradas.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '5rem 1fr 2fr 7rem 5rem', columnGap: '1.5rem', textAlign: 'center' }}>
                    {/* Cabecera */}
                    <div className="pb-2 text-xs text-default-400 uppercase tracking-widest font-semibold">Sección</div>
                    <div className="pb-2 text-xs text-default-400 uppercase tracking-widest font-semibold">Docente</div>
                    <div className="pb-2 text-xs text-default-400 uppercase tracking-widest font-semibold">Sala / Horario</div>
                    <div className="pb-2 text-xs text-default-400 uppercase tracking-widest font-semibold">Alumnos</div>
                    <div className="pb-2 text-xs text-default-400 uppercase tracking-widest font-semibold">Acciones</div>
                    {/* Línea divisoria única continua */}
                    <div style={{ gridColumn: '1 / -1' }} className="border-b-2 border-default-300 mb-1" />

                    {/* Filas */}
                    {asignatura.secciones.map((seccion: ISeccion) => (
                      <React.Fragment key={seccion.id}>
                        <div className="py-2.5 border-b border-default-100">
                          <p className="font-semibold text-base">{seccion.numeroSeccion}</p>
                        </div>
                        <div className="py-2.5 border-b border-default-100">
                          <p className="text-base font-medium leading-snug">
                            {seccion.profesorAsignado || <span className="text-default-300 italic text-sm">Sin asignar</span>}
                          </p>
                        </div>
                        <div className="py-2.5 border-b border-default-100">
                          {seccion.bloquesHorarios.length === 0
                            ? <p className="text-sm text-default-300 italic">Sin horario</p>
                            : formatearHorarioAgrupado(seccion.bloquesHorarios).map((item, i) => (
                              <div key={i} className="flex justify-center items-baseline gap-1 text-base leading-6">
                                <span className="font-semibold text-default-700 dark:text-default-300 shrink-0">{item.sala}</span>
                                <span className="text-default-400 shrink-0">·</span>
                                <span className="text-default-500 shrink-0">{item.dia}:</span>
                                <span className="text-default-600 dark:text-default-400">{item.rangos.join(' / ')}</span>
                              </div>
                            ))
                          }
                        </div>
                        <div className="py-2.5 border-b border-default-100">
                          <p className="text-base font-semibold">{seccion.cantInscritos}/{seccion.capacidadMax}</p>
                          <div className="mt-1">{renderEstadoSeccion(seccion.estado)}</div>
                        </div>
                        <div className="py-2.5 border-b border-default-100 flex gap-1 justify-center items-start">
                          {seccionesEditar && (
                          <Button isIconOnly variant="light" size="md" onPress={() => onEditarSeccion(asignatura, seccion)}>
                            <Icon icon="lucide:edit" width={18} className="text-default-400 hover:text-primary" />
                          </Button>
                          )}
                          {seccionesEliminar && (
                          <Button isIconOnly variant="light" size="md" onPress={() => onEliminarSeccion(asignatura.id, seccion.id, seccion.numeroSeccion)}>
                            <Icon icon="lucide:trash-2" width={18} className="text-default-400 hover:text-danger" />
                          </Button>
                          )}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {/* Botón para agregar nueva sección */}
                {seccionesCrear && (
                <button
                  type="button"
                  onClick={() => onAgregarSeccion(asignatura)}
                  className="mt-3 w-full rounded-xl border-2 border-dashed border-primary-200 hover:border-primary-400 bg-white dark:bg-content1 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all cursor-pointer p-5 flex flex-col items-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 group-hover:bg-primary-200 flex items-center justify-center text-primary transition-colors">
                    <Icon icon="lucide:plus-circle" width={22} />
                  </div>
                  <p className="font-semibold text-sm text-primary group-hover:text-primary-600">
                    Agregar nueva sección
                  </p>
                  <p className="text-xs text-default-400">
                    Haz clic aquí para crear una sección para <span className="font-medium text-default-500">{asignatura.nombre}</span>
                  </p>
                </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardBody>
    </Card>
  );
};

export default React.memo(AsignaturaCard);
