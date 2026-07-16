import React from 'react';
import {
  Button,
  Chip,
  Divider,
  Input,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { useHistory } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { usePermission } from '../../contexts/permission-context';
import { IAsignatura, EstadoSeccion } from '../../types/academica/asignatura.types';
import { crearSeccionNuevaService } from '../../services/academica/asignatura-service';
import { obtenerSalasActivasService, ISala } from '../../services/academica/sala-service';
import { filtrarBloquesPorSalaYDiaService, IBloqueDisponible, obtenerBloquesReservadosPorDocenteService } from '../../services/academica/bloque-horario-service';
import { obtenerUsuariosAsignadosSeccionService } from '../../services/usuario/usuario-service';
import { DIAS_SEMANA_OPTIONS } from './constants';

interface CrearSeccionModalProps {
  asignatura: IAsignatura | null;
  onClose: () => void;
  onCreated: () => void;
}

const CrearSeccionModal: React.FC<CrearSeccionModalProps> = ({ asignatura, onClose, onCreated }) => {
  const { canRead } = usePermission();
  const historyCrear = useHistory();
  const toast = useToast();
  const [nombreSeccion, setNombreSeccion] = React.useState('');
  const [docenteId, setDocenteId] = React.useState('');
  const [estado, setEstado] = React.useState<EstadoSeccion>('ACTIVA');
  const [capacidadMax, setCapacidadMax] = React.useState(30);
  const [cantInscritos, setCantInscritos] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);

  // Docentes
  const [docentes, setDocentes] = React.useState<{ idUsuario: number; nombreCompleto: string }[]>([]);
  const [isLoadingDocentes, setIsLoadingDocentes] = React.useState(false);

  // Bloques horarios
  const [salas, setSalas] = React.useState<ISala[]>([]);
  const [isLoadingSalas, setIsLoadingSalas] = React.useState(false);
  const [salaId, setSalaId] = React.useState('');
  const [dia, setDia] = React.useState('');
  const [bloquesDisponibles, setBloquesDisponibles] = React.useState<IBloqueDisponible[]>([]);
  const [isLoadingBloques, setIsLoadingBloques] = React.useState(false);
  const [bloquesSeleccionados, setBloquesSeleccionados] = React.useState<{ idBloque: number; numeroBloque: number; horaInicio: string; horaFin: string; diaSemana: string; idSala: number; codSala: string }[]>([]);
  const [bloquesOcupadosDocente, setBloquesOcupadosDocente] = React.useState<number[]>([]);

  React.useEffect(() => {
    const cargarInicial = async () => {
      try {
        setIsLoadingDocentes(true);
        setIsLoadingSalas(true);
        const [docentesData, salasData] = await Promise.all([
          obtenerUsuariosAsignadosSeccionService(),
          obtenerSalasActivasService()
        ]);
        setDocentes(docentesData);
        setSalas(salasData);
      } catch { /* silencioso */ } finally {
        setIsLoadingDocentes(false);
        setIsLoadingSalas(false);
      }
    };
    cargarInicial();
  }, []);

  // Carga bloques ocupados por el docente cuando docente Y día están seleccionados
  React.useEffect(() => {
    if (!docenteId || !dia) { setBloquesOcupadosDocente([]); return; }
    obtenerBloquesReservadosPorDocenteService(parseInt(docenteId), dia)
      .then(setBloquesOcupadosDocente)
      .catch(() => setBloquesOcupadosDocente([]));
  }, [docenteId, dia]);

  // Carga bloques disponibles cuando sala Y día están seleccionados
  React.useEffect(() => {
    if (!salaId || !dia) {
      setBloquesDisponibles([]);
      return;
    }
    const cargarBloques = async () => {
      try {
        setIsLoadingBloques(true);
        console.log(`[BLOQUES] Cargando sala=${salaId} día=${dia}`);
        const data = await filtrarBloquesPorSalaYDiaService(parseInt(salaId), dia);
        console.log(`[BLOQUES] ✅ ${data.length} bloques recibidos`);
        setBloquesDisponibles(data);
      } catch (err: any) {
        console.error(`[BLOQUES] ❌ Error:`, err?.response?.status, err?.response?.data ?? err?.message);
        console.error(`[BLOQUES]    URL:`, err?.config?.baseURL, err?.config?.url);
      } finally {
        setIsLoadingBloques(false);
      }
    };
    cargarBloques();
  }, [salaId, dia]);

  const salaSeleccionada = salas.find(s => s.idSala.toString() === salaId);

  const currentSalaId = parseInt(salaId);

  // Clave única: idBloque + idSala + diaSemana (un mismo número de bloque puede existir en distintas salas/días)
  const estaSeleccionado = (bloque: IBloqueDisponible) =>
    bloquesSeleccionados.some(
      b => b.idBloque === bloque.idBloque && b.idSala === currentSalaId && b.diaSemana === dia
    );

  // Conflicto de sección: ya tiene ese bloque en OTRA sala el mismo día
  const tieneConflictoSeccion = (bloque: IBloqueDisponible) =>
    bloquesSeleccionados.some(
      b => b.numeroBloque === bloque.numeroBloque && b.diaSemana === dia && b.idSala !== currentSalaId
    );

  // Conflicto de docente: el profesor ya tiene ese bloque reservado en otra sección
  const tieneConflictoDocente = (bloque: IBloqueDisponible) =>
    bloquesOcupadosDocente.includes(bloque.numeroBloque);

  const toggleBloque = (bloque: IBloqueDisponible) => {
    setBloquesSeleccionados(prev => {
      const existe = prev.some(
        b => b.idBloque === bloque.idBloque && b.idSala === currentSalaId && b.diaSemana === dia
      );
      if (existe) {
        return prev.filter(
          b => !(b.idBloque === bloque.idBloque && b.idSala === currentSalaId && b.diaSemana === dia)
        );
      }
      return [...prev, {
        idBloque: bloque.idBloque,
        numeroBloque: bloque.numeroBloque,
        horaInicio: bloque.horaInicio,
        horaFin: bloque.horaFin,
        diaSemana: dia,
        idSala: currentSalaId,
        codSala: salaSeleccionada?.codSala ?? ''
      }];
    });
  };

  const removerBloque = (idBloque: number, idSala: number, diaSemana: string) => {
    setBloquesSeleccionados(prev =>
      prev.filter(b => !(b.idBloque === idBloque && b.idSala === idSala && b.diaSemana === diaSemana))
    );
  };

  const handleSave = async () => {
    if (!asignatura) return;
    setIsSaving(true);
    try {
      await crearSeccionNuevaService({
        idAsignatura: parseInt(asignatura.id),
        nombreSeccion,
        estadoSeccion: estado,
        idUsuarioDocente: parseInt(docenteId),
        capacidadMax,
        cantInscritos,
        bloquesHorarios: bloquesSeleccionados.map(b => ({
          idBloque: b.idBloque,
          numeroBloque: b.numeroBloque,
          horaInicio: b.horaInicio,
          horaFin: b.horaFin,
          diaSemana: b.diaSemana,
          idSala: b.idSala,
        })),
      });
      onCreated();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear la sección');
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid =
    nombreSeccion.trim() &&
    docenteId &&
    cantInscritos > 0 &&
    cantInscritos <= capacidadMax &&
    bloquesSeleccionados.length > 0;

  if (!asignatura) return null;

  return (
    <>
      <ModalHeader>
        <div>
          <h2 className="text-xl font-bold">Nueva Sección</h2>
          <p className="text-sm text-default-500">{asignatura.nombre} · {asignatura.codigo}</p>
        </div>
      </ModalHeader>
      <ModalBody className="overflow-y-scroll custom-scrollbar">
        <div className="space-y-5">

          {/* ── Info básica ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="N° / Nombre de Sección"
              placeholder="Ej: 001 o Sección Mañana"
              value={nombreSeccion}
              onValueChange={setNombreSeccion}
              maxLength={100}
              description={`${nombreSeccion.length}/100 caracteres`}
              isRequired
            />
            <Select
              label="Estado"
              selectedKeys={[estado]}
              onSelectionChange={keys => setEstado(Array.from(keys)[0] as EstadoSeccion)}
              isRequired
              disallowEmptySelection
            >
              <SelectItem key="ACTIVA">Activa</SelectItem>
              <SelectItem key="INACTIVA">Inactiva</SelectItem>
              <SelectItem key="SUSPENDIDA">Suspendida</SelectItem>
            </Select>
          </div>

          <Select
            label="Docente Asignado"
            placeholder={isLoadingDocentes ? 'Cargando docentes...' : 'Seleccione un docente'}
            selectedKeys={docenteId ? [docenteId] : []}
            onSelectionChange={keys => setDocenteId(Array.from(keys)[0] as string)}
            isLoading={isLoadingDocentes}
            isRequired
          >
            {docentes.map(d => (
              <SelectItem key={d.idUsuario.toString()} textValue={d.nombreCompleto}>
                {d.nombreCompleto}
              </SelectItem>
            ))}
          </Select>
          {docentes.length === 0 && !isLoadingDocentes && (
            canRead('GESTION_USUARIOS') ? (
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-600 underline underline-offset-2 cursor-pointer transition-colors"
                onClick={() => historyCrear.push('/gestion-usuarios')}
              >
                <Icon icon="lucide:user-plus" width={14} />
                No hay docentes. Ir a Gestión de Usuarios para agregar uno.
                <Icon icon="lucide:arrow-right" width={12} />
              </button>
            ) : (
              <p className="text-sm text-warning-600 dark:text-warning-400 flex items-center gap-1.5">
                <Icon icon="lucide:alert-triangle" width={13} />
                Contacte el administrador para agregar un Docente al sistema.
              </p>
            )
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Capacidad Máxima"
              value={capacidadMax.toString()}
              onValueChange={v => setCapacidadMax(parseInt(v) || 0)}
              min="1"
              isRequired
            />
            <Input
              type="number"
              label="Cantidad Inscritos"
              value={cantInscritos.toString()}
              onValueChange={v => setCantInscritos(parseInt(v) || 0)}
              min="0"
              max={capacidadMax}
              isRequired
              isInvalid={cantInscritos > capacidadMax}
              errorMessage={
                cantInscritos > capacidadMax
                  ? `No puede superar la capacidad máxima (${capacidadMax})`
                  : undefined
              }
            />
          </div>

          <Divider />

          {/* ── Selector sala + día ── */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Icon icon="lucide:calendar-clock" width={16} className="text-primary" />
              Bloques Horarios
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <Select
                label="Sala"
                placeholder={isLoadingSalas ? 'Cargando salas...' : 'Seleccione una sala'}
                selectedKeys={salaId ? [salaId] : []}
                onSelectionChange={keys => { const v = Array.from(keys as Set<string>)[0]; if (v) setSalaId(v); }}
                isLoading={isLoadingSalas}
              >
                {salas.map(s => (
                  <SelectItem key={s.idSala.toString()} textValue={`Sala: ${s.nombreSala} - Cod: ${s.codSala}`}>
                    Sala: {s.nombreSala} - Cod: {s.codSala}
                  </SelectItem>
                ))}
              </Select>
              <Select
                label="Día de la semana"
                placeholder="Seleccione un día"
                selectedKeys={dia ? [dia] : []}
                onSelectionChange={keys => { const v = Array.from(keys as Set<string>)[0]; if (v) setDia(v); }}
              >
                {DIAS_SEMANA_OPTIONS.map(d => (
                  <SelectItem key={d.value} textValue={d.label}>{d.label}</SelectItem>
                ))}
              </Select>
            </div>

            {/* Área de bloques disponibles */}
            {!salaId || !dia ? (
              <div className="rounded-xl border-2 border-dashed border-default-200 p-6 flex flex-col items-center gap-2 text-default-400">
                <Icon icon="lucide:calendar-search" width={28} className="opacity-50" />
                <p className="text-sm font-medium">Selecciona sala y día</p>
                <p className="text-xs text-center">Una vez seleccionados podrás elegir los bloques horarios disponibles</p>
              </div>
            ) : (
              <div className="rounded-xl border border-default-200 bg-default-50 dark:bg-default-100/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-default-500 uppercase tracking-wider">
                    Bloques disponibles · {DIAS_SEMANA_OPTIONS.find(d => d.value === dia)?.label} · {salaSeleccionada?.codSala}
                  </p>
                  {bloquesSeleccionados.length > 0 && (
                    <Chip size="sm" color="primary" variant="flat">{bloquesSeleccionados.length} seleccionado(s)</Chip>
                  )}
                </div>

                {/* Lista de bloques disponibles */}
                {isLoadingBloques ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-default-400">
                    <Spinner size="sm" />
                    <span className="text-sm">Cargando bloques...</span>
                  </div>
                ) : bloquesDisponibles.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-default-200 p-4 flex flex-col items-center gap-1 text-default-400">
                    <Icon icon="lucide:calendar-x" width={22} className="opacity-50" />
                    <p className="text-sm">No hay bloques disponibles para esta combinación</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {bloquesDisponibles.map(bloque => {
                        const seleccionado      = estaSeleccionado(bloque);
                        const conflictoSeccion  = !seleccionado && tieneConflictoSeccion(bloque);
                        const conflictoDocente  = !seleccionado && !conflictoSeccion && tieneConflictoDocente(bloque);
                        const hayConflicto      = conflictoSeccion || conflictoDocente;
                        return (
                          <button
                            key={bloque.idBloque}
                            type="button"
                            disabled={hayConflicto}
                            onClick={() => !hayConflicto && toggleBloque(bloque)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors text-left ${
                              conflictoSeccion
                                ? 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 cursor-not-allowed opacity-80'
                                : conflictoDocente
                                ? 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 cursor-not-allowed opacity-80'
                                : seleccionado
                                ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700'
                                : 'bg-white dark:bg-default-100/20 border-default-200 hover:border-primary-200 hover:bg-primary-50/30'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Chip size="sm"
                                color={conflictoSeccion ? 'danger' : conflictoDocente ? 'warning' : seleccionado ? 'primary' : 'default'}
                                variant="flat" className="font-bold min-w-[36px]">
                                B{bloque.numeroBloque}
                              </Chip>
                              <span className={`text-xs ${conflictoSeccion ? 'text-danger-600 dark:text-danger-400 font-medium' : conflictoDocente ? 'text-warning-600 dark:text-warning-400 font-medium' : 'text-default-600 dark:text-default-400'}`}>
                                {conflictoSeccion ? 'Conflicto sección' : conflictoDocente ? 'Conflicto profesor' : `${bloque.horaInicio.slice(0, 5)} – ${bloque.horaFin.slice(0, 5)}`}
                              </span>
                            </div>
                            <Icon
                              icon={hayConflicto ? 'lucide:alert-circle' : seleccionado ? 'lucide:check-circle-2' : 'lucide:circle'}
                              width={16}
                              className={conflictoSeccion ? 'text-danger-400' : conflictoDocente ? 'text-warning-400' : seleccionado ? 'text-primary' : 'text-default-300'}
                            />
                          </button>
                        );
                      })}
                    </div>
                    {bloquesDisponibles.some(b => !estaSeleccionado(b) && (tieneConflictoSeccion(b) || tieneConflictoDocente(b))) && (
                      <div className="mt-2 flex flex-col gap-1">
                        {bloquesDisponibles.some(b => !estaSeleccionado(b) && tieneConflictoSeccion(b)) && (
                          <p className="text-xs text-danger-600 dark:text-danger-400 flex items-center gap-1.5">
                            <Icon icon="lucide:alert-circle" width={12} />
                            La sección ya tiene un horario en otra sala para este día y hora.
                          </p>
                        )}
                        {bloquesDisponibles.some(b => !estaSeleccionado(b) && tieneConflictoDocente(b)) && (
                          <p className="text-xs text-warning-600 dark:text-warning-400 flex items-center gap-1.5">
                            <Icon icon="lucide:alert-triangle" width={12} />
                            El profesor ya tiene una clase asignada en este mismo horario.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

              </div>
            )}

            {/* Resumen acumulado — siempre visible si hay bloques seleccionados */}
            {bloquesSeleccionados.length > 0 && (
              <div className="mt-3 rounded-xl border border-primary-200 bg-primary-50 dark:bg-primary-900/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 uppercase tracking-wider">
                    Bloques reservados · {bloquesSeleccionados.length} total
                  </p>
                  <button
                    type="button"
                    onClick={() => setBloquesSeleccionados([])}
                    className="text-xs text-danger hover:underline"
                  >
                    Limpiar todo
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bloquesSeleccionados.map(b => (
                    <Chip
                      key={b.idBloque}
                      size="sm"
                      color="primary"
                      variant="flat"
                      onClose={() => removerBloque(b.idBloque, b.idSala, b.diaSemana)}
                    >
                      B{b.numeroBloque} · {b.horaInicio.slice(0, 5)}–{b.horaFin.slice(0, 5)} · {b.codSala} · {DIAS_SEMANA_OPTIONS.find(d => d.value === b.diaSemana)?.label}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="light" onPress={onClose}>Cancelar</Button>
        <Button
          color="primary"
          onPress={handleSave}
          isLoading={isSaving}
          isDisabled={!isFormValid}
        >
          Crear Sección
        </Button>
      </ModalFooter>
    </>
  );
};

export default CrearSeccionModal;
