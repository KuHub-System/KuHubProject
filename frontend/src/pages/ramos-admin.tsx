import React from 'react';
import {
  Card,
  CardBody,
  Input,
  Button,
  Chip,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Select,
  SelectItem,
  Divider,
  Textarea
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { usePageTitle } from '../hooks/usePageTitle';
import { logger } from '../utils/logger';
import { useNotifications } from '../utils/notifications';

// Importar tipos y servicios actualizados
import { IAsignatura, ISeccion, IBloqueHorario, EstadoSeccion } from '../types/asignatura.types';
import { IUsuario } from '../types/usuario.types';
import {
  obtenerAsignaturasService,
  crearAsignaturaService,
  actualizarAsignaturaService,
  eliminarAsignaturaService,
  actualizarSeccionDeltaService,
  eliminarSeccionService,
  crearSeccionNuevaService,
} from '../services/asignatura-service';
import { obtenerSalasActivasService, ISala } from '../services/sala-service';
import { filtrarBloquesPorSalaYDiaService, IBloqueDisponible } from '../services/bloque-horario-service';
import { obtenerUsuariosService, obtenerUsuariosGestoresAsignaturaService, obtenerUsuariosAsignadosSeccionService } from '../services/usuario-service';

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

/**
 * Página de gestión de asignaturas con secciones
 */
const GestionAsignaturasPage: React.FC = () => {
  usePageTitle('Gestión de Asignaturas', 'Administre asignaturas, secciones y asignaciones de gestores. Las recetas se multiplicarán por el total de alumnos activos.');
  const toast = useToast();
  const { showConfirm } = useNotifications();
  const [asignaturas, setAsignaturas] = React.useState<IAsignatura[]>([]);
  const [profesores, setProfesores] = React.useState<IUsuario[]>([]);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isFetchingMore, setIsFetchingMore] = React.useState<boolean>(false);
  const [pageLoaded, setPageLoaded] = React.useState<number>(1);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  // Estados para modales
  const [seccionSeleccionada, setSeccionSeleccionada] = React.useState<{ asignatura: IAsignatura, seccion: ISeccion } | null>(null);
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = React.useState<IAsignatura | null>(null);

  const { isOpen: isSeccionModalOpen, onOpen: onSeccionModalOpen, onOpenChange: onSeccionModalOpenChange } = useDisclosure();
  const { isOpen: isAsignaturaModalOpen, onOpen: onAsignaturaModalOpen, onOpenChange: onAsignaturaModalOpenChange } = useDisclosure();
  const { isOpen: isCrearSeccionModalOpen, onOpen: onCrearSeccionModalOpen, onOpenChange: onCrearSeccionModalOpenChange } = useDisclosure();
  const [asignaturaParaSeccion, setAsignaturaParaSeccion] = React.useState<IAsignatura | null>(null);

  /** Filtra sobre los datos ya cargados (búsqueda client-side) */
  const filteredAsignaturas = React.useMemo(() => {
    if (!searchTerm) return asignaturas;
    const term = searchTerm.toLowerCase();
    return asignaturas.filter(a =>
      a.nombre.toLowerCase().includes(term) ||
      a.codigo.toLowerCase().includes(term) ||
      a.profesorACargoNombre.toLowerCase().includes(term) ||
      a.secciones.some(s =>
        s.numeroSeccion.includes(term) ||
        s.profesorAsignado.toLowerCase().includes(term)
      )
    );
  }, [asignaturas, searchTerm]);

  /**
   * Carga la página 1 y resetea el estado (inicial o tras mutaciones)
   */
  const cargarDatos = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [{ asignaturas: asigs, totalPages: tp }, usuariosData] = await Promise.all([
        obtenerAsignaturasService(1),
        obtenerUsuariosService()
      ]);

      setAsignaturas(asigs);
      setTotalPages(tp);
      setPageLoaded(1);

      const profesoresData = usuariosData.filter(
        u => u.activo && (u.rol === 'Profesor' || u.rol === 'Profesor a Cargo')
      );
      setProfesores(profesoresData);
    } catch (error) {
      logger.error('Error al cargar datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  /**
   * Carga la siguiente página y acumula resultados
   */
  const cargarMas = React.useCallback(async () => {
    if (isFetchingMore || pageLoaded >= totalPages) return;
    try {
      setIsFetchingMore(true);
      const nextPage = pageLoaded + 1;
      const { asignaturas: mas, totalPages: tp } = await obtenerAsignaturasService(nextPage);
      setAsignaturas(prev => [...prev, ...mas]);
      setTotalPages(tp);
      setPageLoaded(nextPage);
    } catch (error) {
      logger.error('Error al cargar más asignaturas:', error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, pageLoaded, totalPages]);

  /** IntersectionObserver — dispara cargarMas cuando el sentinel entra en pantalla */
  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) cargarMas(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cargarMas]);

  /**
   * Calcula el total de alumnos de una asignatura
   */
  const calcularTotalAlumnos = (asignatura: IAsignatura): number => {
    return asignatura.secciones
      .filter(s => s.estado === 'ACTIVA')
      .reduce((sum, s) => sum + s.cantInscritos, 0);
  };

  /**
   * Toggle la expansión de una fila
   */
  const toggleRowExpansion = (asignaturaId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(asignaturaId)) {
      newExpanded.delete(asignaturaId);
    } else {
      newExpanded.add(asignaturaId);
    }
    setExpandedRows(newExpanded);
  };

  /**
   * Abre el modal para editar una sección
   */
  const editarSeccion = (asignatura: IAsignatura, seccion: ISeccion) => {
    setSeccionSeleccionada({ asignatura, seccion });
    onSeccionModalOpen();
  };

  /**
   * Abre el modal para crear una sección en una asignatura
   */
  const abrirCrearSeccion = (asignatura: IAsignatura) => {
    setAsignaturaParaSeccion(asignatura);
    onCrearSeccionModalOpen();
  };

  /**
   * Guarda una nueva sección creada
   */
  const handleCrearSeccion = async () => {
    try {
      await cargarDatos();
      onCrearSeccionModalOpenChange();
      toast.success('Sección creada correctamente');
    } catch (error: any) {
      logger.error('Error al recargar datos:', error);
      toast.error(error.message || 'Error al recargar los datos');
    }
  };

  /**
   * Guarda los cambios de una sección
   */
  const guardarSeccion = async (payload: any) => {
    if (!seccionSeleccionada) return;
    try {
      await actualizarSeccionDeltaService(payload);
      await cargarDatos();
      onSeccionModalOpenChange();
      setSeccionSeleccionada(null);
      toast.success('Sección actualizada correctamente');
    } catch (error: any) {
      logger.error('Error al guardar sección:', error);
      toast.error(error.message || 'Error al guardar la sección');
    }
  };

  /**
   * Abre el modal para editar una asignatura
   */
  const editarAsignatura = (asignatura: IAsignatura) => {
    setAsignaturaSeleccionada(asignatura);
    onAsignaturaModalOpen();
  };

  /**
   * Guarda los cambios de una asignatura
   */
  const guardarAsignatura = async (asignaturaEditada: Partial<IAsignatura>) => {
    if (!asignaturaSeleccionada) return;

    try {
      await actualizarAsignaturaService(asignaturaSeleccionada.id, asignaturaEditada);
      await cargarDatos();
      onAsignaturaModalOpenChange();
      setAsignaturaSeleccionada(null);
      toast.success('Asignatura actualizada correctamente');
    } catch (error: any) {
      logger.error('Error al guardar asignatura:', error);
      toast.error(error.message || 'Error al guardar la asignatura');
    }
  };

  /**
   * Elimina una asignatura
   */
  const eliminarAsignatura = async (asignaturaId: string, nombreAsignatura: string) => {
    showConfirm({
      title: 'Eliminar Asignatura',
      subtitle: 'Esta acción no se puede deshacer',
      headerVariant: 'danger',
      alertTitle: 'Acción irreversible',
      alertMessage: `Se eliminarán permanentemente la asignatura "${nombreAsignatura}" y todas las secciones vinculadas a ella. Los alumnos inscritos perderán su inscripción.`,
      message: '',
      confirmText: 'Eliminar',
      confirmColor: 'danger',
      requireText: 'ELIMINAR',
      requireTextHelper: 'Esta acción es irreversible. Escribe ELIMINAR para confirmar.',
      onConfirm: async () => {
        try {
          await eliminarAsignaturaService(asignaturaId);
          await cargarDatos();
          toast.success('Asignatura eliminada correctamente');
        } catch (error: any) {
          logger.error('Error al eliminar asignatura:', error);
          toast.error(error.message || 'Error al eliminar la asignatura');
        }
      }
    });
  };

  /**
   * Elimina una sección
   */
  const eliminarSeccion = (asignaturaId: string, seccionId: string, nombreSeccion: string) => {
    showConfirm({
      title: 'Eliminar Sección',
      subtitle: 'Esta acción no se puede deshacer',
      headerVariant: 'danger',
      alertTitle: 'Acción irreversible',
      alertMessage: `Se eliminará permanentemente la sección "${nombreSeccion}". Los alumnos inscritos en esta sección perderán su inscripción.`,
      message: '',
      confirmText: 'Eliminar',
      confirmColor: 'danger',
      requireText: 'ELIMINAR',
      requireTextHelper: 'Esta acción es irreversible. Escribe ELIMINAR para confirmar.',
      onConfirm: async () => {
        try {
          await eliminarSeccionService(asignaturaId, seccionId);
          await cargarDatos();
          toast.success('Sección eliminada correctamente');
        } catch (error: any) {
          logger.error('Error al eliminar sección:', error);
          toast.error(error.message || 'Error al eliminar la sección');
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Input
            placeholder="Buscar asignaturas, códigos, gestores o secciones..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            startContent={<Icon icon="lucide:search" className="text-default-400" />}
            className="w-full md:w-96"
          />
          <Button
            color="primary"
            startContent={<Icon icon="lucide:plus" />}
            onPress={() => {
              setAsignaturaSeleccionada(null);
              onAsignaturaModalOpen();
            }}
          >
            Nueva Asignatura
          </Button>
        </div>

        {/* Cards de asignaturas */}
        <div className="space-y-4">
          {filteredAsignaturas.length === 0 && !isLoading ? (
            <Card>
              <CardBody className="text-center py-10">
                <Icon icon="lucide:book-open" className="text-5xl text-default-300 mx-auto mb-4" />
                <p className="text-default-500">
                  No hay asignaturas registradas. Cree una nueva asignatura para comenzar.
                </p>
              </CardBody>
            </Card>
          ) : (
            filteredAsignaturas.map((asignatura: IAsignatura) => {
              const totalAlumnos = calcularTotalAlumnos(asignatura);
              const multiplicadorReceta = totalAlumnos > 0 ? (totalAlumnos / 20).toFixed(2) : '0';

              return (
                <Card key={asignatura.id} className="shadow-sm bg-white dark:bg-content1">
                  <CardBody className="p-0">
                    {/* Fila principal de la asignatura */}
                    <div className="flex items-center justify-between p-4 border-b border-default-200">
                      <div className="flex items-center gap-4">
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onPress={() => toggleRowExpansion(asignatura.id)}
                        >
                          <Icon
                            icon={expandedRows.has(asignatura.id) ? "lucide:chevron-down" : "lucide:chevron-right"}
                            className="text-default-400"
                          />
                        </Button>
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
                            Multiplicador receta (base 20): <span className="font-semibold text-primary">{multiplicadorReceta}x</span>
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
                        <div className="flex gap-2">
                          <Button
                            isIconOnly
                            variant="light"
                            size="md"
                            onPress={() => editarAsignatura(asignatura)}
                          >
                            <Icon icon="lucide:edit" width={18} className="text-primary" />
                          </Button>
                          <Button
                            isIconOnly
                            variant="light"
                            size="md"
                            color="danger"
                            onPress={() => eliminarAsignatura(asignatura.id, asignatura.nombre)}
                          >
                            <Icon icon="lucide:trash-2" width={18} />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Sección expandible con las secciones */}
                    <AnimatePresence>
                      {expandedRows.has(asignatura.id) && (
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
                                      <Button isIconOnly variant="light" size="md" onPress={() => editarSeccion(asignatura, seccion)}>
                                        <Icon icon="lucide:edit" width={18} className="text-primary" />
                                      </Button>
                                      <Button isIconOnly variant="light" size="md" color="danger" onPress={() => eliminarSeccion(asignatura.id, seccion.id, seccion.numeroSeccion)}>
                                        <Icon icon="lucide:trash-2" width={18} />
                                      </Button>
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>
                            )}

                            {/* Botón para agregar nueva sección */}
                            <button
                              type="button"
                              onClick={() => abrirCrearSeccion(asignatura)}
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
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>

        {/* Sentinel para infinite scroll */}
        <div ref={sentinelRef} className="py-2 flex justify-center">
          {isFetchingMore && (
            <div className="flex items-center gap-2 text-default-400 text-sm">
              <Spinner size="sm" />
              <span>Cargando más asignaturas...</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal para editar sección */}
      <Modal isOpen={isSeccionModalOpen} onOpenChange={onSeccionModalOpenChange} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <EditarSeccionModal
              seccionData={seccionSeleccionada}
              onClose={onClose}
              onSave={guardarSeccion}
            />
          )}
        </ModalContent>
      </Modal>

      {/* Modal para crear sección */}
      <Modal isOpen={isCrearSeccionModalOpen} onOpenChange={onCrearSeccionModalOpenChange} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <CrearSeccionModal
              asignatura={asignaturaParaSeccion}
              onClose={onClose}
              onCreated={handleCrearSeccion}
            />
          )}
        </ModalContent>
      </Modal>

      {/* Modal para editar/crear asignatura */}
      <Modal isOpen={isAsignaturaModalOpen} onOpenChange={onAsignaturaModalOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <EditarAsignaturaModal
              asignatura={asignaturaSeleccionada}
              onClose={onClose}
              onSave={guardarAsignatura}
              onCrear={async (data) => {
                try {
                  await crearAsignaturaService(data);
                  await cargarDatos();
                  onClose();
                  toast.success('Asignatura creada correctamente');
                } catch (error: any) {
                  logger.error('Error al crear asignatura:', error);
                  toast.error(error.message || 'Error al crear la asignatura');
                }
              }}
            />
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

// ─── MODAL: CREAR SECCIÓN ────────────────────────────────────────────────────

const DIAS_SEMANA_OPTIONS = [
  { value: 'LUNES', label: 'Lunes' },
  { value: 'MARTES', label: 'Martes' },
  { value: 'MIERCOLES', label: 'Miércoles' },
  { value: 'JUEVES', label: 'Jueves' },
  { value: 'VIERNES', label: 'Viernes' },
  { value: 'SABADO', label: 'Sábado' },
];

interface CrearSeccionModalProps {
  asignatura: IAsignatura | null;
  onClose: () => void;
  onCreated: () => void;
}

const CrearSeccionModal: React.FC<CrearSeccionModalProps> = ({ asignatura, onClose, onCreated }) => {
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

  // Carga bloques disponibles cuando sala Y día están seleccionados
  React.useEffect(() => {
    if (!salaId || !dia) {
      setBloquesDisponibles([]);
      return;
    }
    const cargarBloques = async () => {
      try {
        setIsLoadingBloques(true);
        const data = await filtrarBloquesPorSalaYDiaService(parseInt(salaId), dia);
        setBloquesDisponibles(data);
      } catch { /* silencioso */ } finally {
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

  // Conflicto: la sección ya tiene ese numeroBloque+diaSemana en OTRA sala
  const tieneConflicto = (bloque: IBloqueDisponible) =>
    bloquesSeleccionados.some(
      b => b.numeroBloque === bloque.numeroBloque && b.diaSemana === dia && b.idSala !== currentSalaId
    );

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
      <ModalBody>
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
                onSelectionChange={keys => setSalaId(Array.from(keys)[0] as string)}
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
                onSelectionChange={keys => setDia(Array.from(keys)[0] as string)}
              >
                {DIAS_SEMANA_OPTIONS.map(d => (
                  <SelectItem key={d.value}>{d.label}</SelectItem>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bloquesDisponibles.map(bloque => {
                      const seleccionado = estaSeleccionado(bloque);
                      const conflicto    = !seleccionado && tieneConflicto(bloque);
                      return (
                        <button
                          key={bloque.idBloque}
                          type="button"
                          disabled={conflicto}
                          onClick={() => !conflicto && toggleBloque(bloque)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors text-left ${
                            conflicto
                              ? 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 cursor-not-allowed opacity-80'
                              : seleccionado
                              ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700'
                              : 'bg-white dark:bg-default-100/20 border-default-200 hover:border-primary-200 hover:bg-primary-50/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Chip size="sm"
                              color={conflicto ? 'danger' : seleccionado ? 'primary' : 'default'}
                              variant="flat" className="font-bold min-w-[36px]">
                              B{bloque.numeroBloque}
                            </Chip>
                            <span className={`text-xs ${conflicto ? 'text-danger-600 dark:text-danger-400 font-medium' : 'text-default-600 dark:text-default-400'}`}>
                              {conflicto ? 'Conflicto' : `${bloque.horaInicio.slice(0, 5)} – ${bloque.horaFin.slice(0, 5)}`}
                            </span>
                          </div>
                          <Icon
                            icon={conflicto ? 'lucide:alert-circle' : seleccionado ? 'lucide:check-circle-2' : 'lucide:circle'}
                            width={16}
                            className={conflicto ? 'text-danger-400' : seleccionado ? 'text-primary' : 'text-default-300'}
                          />
                        </button>
                      );
                    })}
                  </div>
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

/**
 * Modal para editar una sección
 */
interface EditarSeccionModalProps {
  seccionData: { asignatura: IAsignatura, seccion: ISeccion } | null;
  onClose: () => void;
  onSave: (payload: any) => void;
}

// Tipos internos del modal de edición
type BloquePreCargado = {
  idReservaSala: number; idBloque: number; numeroBloque: number;
  horaInicio: string; horaFin: string; diaSemana: string;
  idSala: number; codSala: string; nombreSala: string;
};
type BloqueNuevo = {
  idBloque: number; numeroBloque: number; horaInicio: string; horaFin: string;
  diaSemana: string; idSala: number; codSala: string; nombreSala: string;
};

const EditarSeccionModal: React.FC<EditarSeccionModalProps> = ({ seccionData, onClose, onSave }) => {
  const [numeroSeccion, setNumeroSeccion] = React.useState('');
  const [docenteId, setDocenteId] = React.useState('');
  const [estado, setEstado] = React.useState<EstadoSeccion>('ACTIVA');
  const [capacidadMax, setCapacidadMax] = React.useState(30);
  const [cantInscritos, setCantInscritos] = React.useState(0);

  const [docentes, setDocentes] = React.useState<{ idUsuario: number; nombreCompleto: string }[]>([]);
  const [isLoadingDocentes, setIsLoadingDocentes] = React.useState(false);
  const [salas, setSalas] = React.useState<ISala[]>([]);
  const [isLoadingSalas, setIsLoadingSalas] = React.useState(false);
  const [salaId, setSalaId] = React.useState('');
  const [dia, setDia] = React.useState('');
  const [bloquesDisponibles, setBloquesDisponibles] = React.useState<IBloqueDisponible[]>([]);
  const [isLoadingBloques, setIsLoadingBloques] = React.useState(false);

  // Delta: bloques pre-cargados (existentes con idReservaSala)
  const [bloquesPreCargados, setBloquesPreCargados] = React.useState<BloquePreCargado[]>([]);
  // IDs de reservas eliminadas por el usuario
  const [idsEliminados, setIdsEliminados] = React.useState<Set<number>>(new Set());
  // Bloques nuevos añadidos en esta sesión de edición
  const [bloquesNuevos, setBloquesNuevos] = React.useState<BloqueNuevo[]>([]);

  React.useEffect(() => {
    if (!seccionData?.seccion) return;
    const { seccion } = seccionData;
    setNumeroSeccion(seccion.numeroSeccion);
    setDocenteId(seccion.profesorAsignadoId);
    setCapacidadMax(seccion.capacidadMax);
    setCantInscritos(seccion.cantInscritos);
    setEstado(seccion.estado);
    setSalaId(''); setDia(''); setBloquesDisponibles([]);
    setIdsEliminados(new Set());
    setBloquesNuevos([]);

    const init = async () => {
      try {
        setIsLoadingDocentes(true); setIsLoadingSalas(true);
        const [docentesData, salasData] = await Promise.all([
          obtenerUsuariosAsignadosSeccionService(),
          obtenerSalasActivasService()
        ]);
        setDocentes(docentesData); setSalas(salasData);
        setIsLoadingDocentes(false); setIsLoadingSalas(false);

        if (seccion.bloquesHorarios.length > 0) {
          const combinations = [...new Map(
            seccion.bloquesHorarios.map(b => [`${b.idSala}__${b.diaSemana}`, { idSala: b.idSala, diaSemana: b.diaSemana }])
          ).values()];

          const fetched = await Promise.all(
            combinations.map(({ idSala, diaSemana }) =>
              filtrarBloquesPorSalaYDiaService(idSala, diaSemana)
                .then(blocks => blocks.map(b => ({ ...b, idSala, diaSemana })))
                .catch(() => [])
            )
          );
          const allAvailable = fetched.flat();

          setBloquesPreCargados(seccion.bloquesHorarios.map(bh => {
            const match = allAvailable.find(
              ab => ab.numeroBloque === bh.numeroBloque && ab.idSala === bh.idSala && ab.diaSemana === bh.diaSemana
            );
            return {
              idReservaSala: bh.idReservaSala ?? 0,
              idBloque: match?.idBloque ?? 0,
              numeroBloque: bh.numeroBloque,
              horaInicio: bh.horaInicio, horaFin: bh.horaFin,
              diaSemana: bh.diaSemana, idSala: bh.idSala,
              codSala: bh.codSala, nombreSala: bh.nombreSala
            };
          }));
        } else {
          setBloquesPreCargados([]);
        }
      } catch { /* silencioso */ }
    };
    init();
  }, [seccionData]);

  React.useEffect(() => {
    if (!salaId || !dia) { setBloquesDisponibles([]); return; }
    const cargar = async () => {
      try {
        setIsLoadingBloques(true);
        setBloquesDisponibles(await filtrarBloquesPorSalaYDiaService(parseInt(salaId), dia));
      } catch { /* silencioso */ } finally { setIsLoadingBloques(false); }
    };
    cargar();
  }, [salaId, dia]);

  const salaSeleccionada = salas.find(s => s.idSala.toString() === salaId);
  const currentSalaId = parseInt(salaId);

  const estaSeleccionado = (bloque: IBloqueDisponible) => {
    const enPreCargados = bloquesPreCargados.some(
      b => b.idBloque === bloque.idBloque && b.idSala === currentSalaId && b.diaSemana === dia && !idsEliminados.has(b.idReservaSala)
    );
    const enNuevos = bloquesNuevos.some(
      b => b.idBloque === bloque.idBloque && b.idSala === currentSalaId && b.diaSemana === dia
    );
    return enPreCargados || enNuevos;
  };

  // Conflicto: la sección ya tiene ese numeroBloque+diaSemana activo en OTRA sala
  const tieneConflicto = (bloque: IBloqueDisponible) => {
    const enPreCargadosOtraSala = bloquesPreCargados.some(
      b => b.numeroBloque === bloque.numeroBloque && b.diaSemana === dia && b.idSala !== currentSalaId && !idsEliminados.has(b.idReservaSala)
    );
    const enNuevosOtraSala = bloquesNuevos.some(
      b => b.numeroBloque === bloque.numeroBloque && b.diaSemana === dia && b.idSala !== currentSalaId
    );
    return enPreCargadosOtraSala || enNuevosOtraSala;
  };

  const toggleBloque = (bloque: IBloqueDisponible) => {
    const preExiste = bloquesPreCargados.find(
      b => b.idBloque === bloque.idBloque && b.idSala === currentSalaId && b.diaSemana === dia
    );
    if (preExiste) {
      // Toggle pre-cargado: activar o desactivar via idsEliminados
      setIdsEliminados(prev => {
        const next = new Set(prev);
        if (next.has(preExiste.idReservaSala)) next.delete(preExiste.idReservaSala);
        else next.add(preExiste.idReservaSala);
        return next;
      });
    } else {
      // Toggle nuevo
      const existe = bloquesNuevos.some(
        b => b.idBloque === bloque.idBloque && b.idSala === currentSalaId && b.diaSemana === dia
      );
      if (existe) {
        setBloquesNuevos(prev => prev.filter(
          b => !(b.idBloque === bloque.idBloque && b.idSala === currentSalaId && b.diaSemana === dia)
        ));
      } else {
        setBloquesNuevos(prev => [...prev, {
          idBloque: bloque.idBloque, numeroBloque: bloque.numeroBloque,
          horaInicio: bloque.horaInicio, horaFin: bloque.horaFin,
          diaSemana: dia, idSala: currentSalaId,
          codSala: salaSeleccionada?.codSala ?? '', nombreSala: salaSeleccionada?.nombreSala ?? ''
        }]);
      }
    }
  };

  const removerBloquePreCargado = (idReservaSala: number) =>
    setIdsEliminados(prev => new Set([...prev, idReservaSala]));

  const removerBloqueNuevo = (idBloque: number, idSala: number, diaSemana: string) =>
    setBloquesNuevos(prev => prev.filter(b => !(b.idBloque === idBloque && b.idSala === idSala && b.diaSemana === diaSemana)));

  const limpiarTodo = () => {
    setIdsEliminados(new Set(bloquesPreCargados.map(b => b.idReservaSala)));
    setBloquesNuevos([]);
  };

  const bloquesPreActivos = bloquesPreCargados.filter(b => !idsEliminados.has(b.idReservaSala));
  const totalBloques = bloquesPreActivos.length + bloquesNuevos.length;

  const handleSave = () => {
    if (!seccionData?.seccion) return;
    onSave({
      idAsignatura: parseInt(seccionData.asignatura.id),
      idSeccion: parseInt(seccionData.seccion.id),
      nombreSeccion: numeroSeccion,
      estadoSeccion: estado,
      idUsuarioDocente: parseInt(docenteId),
      capacidadMax,
      cantInscritos,
      bloquesNuevos: bloquesNuevos.map(b => ({
        idBloque: b.idBloque, numeroBloque: b.numeroBloque,
        horaInicio: b.horaInicio, horaFin: b.horaFin,
        diaSemana: b.diaSemana, idSala: b.idSala
      })),
      idsReservasEliminar: [...idsEliminados]
    });
  };

  if (!seccionData) return null;

  const isFormValid = numeroSeccion.trim() && docenteId && capacidadMax > 0 && cantInscritos <= capacidadMax;

  return (
    <>
      <ModalHeader>
        <div>
          <h2 className="text-xl font-bold">Editar Sección {seccionData.seccion.numeroSeccion}</h2>
          <p className="text-sm text-default-500">{seccionData.asignatura.nombre}</p>
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="N° / Nombre de Sección"
              value={numeroSeccion}
              onValueChange={setNumeroSeccion}
              maxLength={100}
              description={`${numeroSeccion.length}/100 caracteres`}
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
              errorMessage={cantInscritos > capacidadMax ? `No puede superar la capacidad máxima (${capacidadMax})` : undefined}
            />
          </div>

          <Divider />

          {/* ── Selector sala + día (mismo que CrearSeccionModal) ── */}
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
                onSelectionChange={keys => setSalaId(Array.from(keys)[0] as string)}
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
                onSelectionChange={keys => setDia(Array.from(keys)[0] as string)}
              >
                {DIAS_SEMANA_OPTIONS.map(d => (
                  <SelectItem key={d.value}>{d.label}</SelectItem>
                ))}
              </Select>
            </div>

            {!salaId || !dia ? (
              <div className="rounded-xl border-2 border-dashed border-default-200 p-6 flex flex-col items-center gap-2 text-default-400">
                <Icon icon="lucide:calendar-search" width={28} className="opacity-50" />
                <p className="text-sm font-medium">Selecciona sala y día para ver bloques</p>
                <p className="text-xs text-center">Los bloques ya seleccionados se muestran abajo</p>
              </div>
            ) : (
              <div className="rounded-xl border border-default-200 bg-default-50 dark:bg-default-100/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-default-500 uppercase tracking-wider">
                    Bloques disponibles · {DIAS_SEMANA_OPTIONS.find(d => d.value === dia)?.label} · {salaSeleccionada?.codSala}
                  </p>
                  {totalBloques > 0 && (
                    <Chip size="sm" color="primary" variant="flat">{totalBloques} seleccionado(s)</Chip>
                  )}
                </div>
                {isLoadingBloques ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-default-400">
                    <Spinner size="sm" /><span className="text-sm">Cargando bloques...</span>
                  </div>
                ) : bloquesDisponibles.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-default-200 p-4 flex flex-col items-center gap-1 text-default-400">
                    <Icon icon="lucide:calendar-x" width={22} className="opacity-50" />
                    <p className="text-sm">No hay bloques disponibles para esta combinación</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bloquesDisponibles.map(bloque => {
                      const seleccionado = estaSeleccionado(bloque);
                      const conflicto    = !seleccionado && tieneConflicto(bloque);
                      return (
                        <button
                          key={bloque.idBloque}
                          type="button"
                          disabled={conflicto}
                          onClick={() => !conflicto && toggleBloque(bloque)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors text-left ${
                            conflicto
                              ? 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 cursor-not-allowed opacity-80'
                              : seleccionado
                              ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700'
                              : 'bg-white dark:bg-default-100/20 border-default-200 hover:border-primary-200 hover:bg-primary-50/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Chip size="sm"
                              color={conflicto ? 'danger' : seleccionado ? 'primary' : 'default'}
                              variant="flat" className="font-bold min-w-[36px]">
                              B{bloque.numeroBloque}
                            </Chip>
                            <span className={`text-xs ${conflicto ? 'text-danger-600 dark:text-danger-400 font-medium' : 'text-default-600 dark:text-default-400'}`}>
                              {conflicto ? 'Conflicto' : `${bloque.horaInicio.slice(0, 5)} – ${bloque.horaFin.slice(0, 5)}`}
                            </span>
                          </div>
                          <Icon icon={conflicto ? 'lucide:alert-circle' : seleccionado ? 'lucide:check-circle-2' : 'lucide:circle'} width={16}
                            className={conflicto ? 'text-danger-400' : seleccionado ? 'text-primary' : 'text-default-300'} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Resumen acumulado */}
            {totalBloques > 0 && (
              <div className="mt-3 rounded-xl border border-primary-200 bg-primary-50 dark:bg-primary-900/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 uppercase tracking-wider">
                    Bloques reservados · {totalBloques} total
                  </p>
                  <button type="button" onClick={limpiarTodo} className="text-xs text-danger hover:underline">
                    Limpiar todo
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bloquesPreActivos.map(b => (
                    <Chip
                      key={`pre-${b.idReservaSala}`}
                      size="sm" color="primary" variant="flat"
                      onClose={() => removerBloquePreCargado(b.idReservaSala)}
                    >
                      B{b.numeroBloque} · {b.horaInicio.slice(0, 5)}–{b.horaFin.slice(0, 5)} · {b.codSala} · {DIAS_SEMANA_OPTIONS.find(d => d.value === b.diaSemana)?.label}
                    </Chip>
                  ))}
                  {bloquesNuevos.map(b => (
                    <Chip
                      key={`new-${b.idBloque}-${b.idSala}-${b.diaSemana}`}
                      size="sm" color="success" variant="flat"
                      onClose={() => removerBloqueNuevo(b.idBloque, b.idSala, b.diaSemana)}
                    >
                      B{b.numeroBloque} · {b.horaInicio.slice(0, 5)}–{b.horaFin.slice(0, 5)} · {b.codSala} · {DIAS_SEMANA_OPTIONS.find(d => d.value === b.diaSemana)?.label} · Nuevo
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
        <Button color="primary" onPress={handleSave} isDisabled={!isFormValid}>
          Guardar Cambios
        </Button>
      </ModalFooter>
    </>
  );
};

/**
 * Modal para editar/crear asignatura
 */
interface EditarAsignaturaModalProps {
  asignatura: IAsignatura | null;
  onClose: () => void;
  onSave: (asignatura: Partial<IAsignatura>) => void;
  onCrear: (data: any) => void;
}

const EditarAsignaturaModal: React.FC<EditarAsignaturaModalProps> = ({
  asignatura,
  onClose,
  onSave,
  onCrear
}) => {
  const [codigo, setCodigo] = React.useState('');
  const [nombre, setNombre] = React.useState('');
  const [profesorACargoId, setProfesorACargoId] = React.useState('');
  const [descripcion, setDescripcion] = React.useState('');
  const [gestores, setGestores] = React.useState<{ idUsuario: number, nombreCompleto: string }[]>([]);
  const [isLoadingGestores, setIsLoadingGestores] = React.useState(false);

  React.useEffect(() => {
    const cargarGestores = async () => {
      try {
        setIsLoadingGestores(true);
        const data = await obtenerUsuariosGestoresAsignaturaService();
        setGestores(data);
      } catch (error) {
        logger.error('Error al cargar gestores:', error);
      } finally {
        setIsLoadingGestores(false);
      }
    };
    cargarGestores();
  }, []);

  React.useEffect(() => {
    if (asignatura) {
      setCodigo(asignatura.codigo);
      setNombre(asignatura.nombre);
      setProfesorACargoId(asignatura.profesorACargoId);
      setDescripcion(asignatura.descripcion);
    } else {
      setCodigo('');
      setNombre('');
      setProfesorACargoId('');
      setDescripcion('');
    }
  }, [asignatura]);

  const hasChanges = React.useMemo(() => {
    if (!asignatura) return true; // creación siempre habilitada
    return (
      codigo.trim() !== asignatura.codigo.trim() ||
      nombre.trim() !== asignatura.nombre.trim() ||
      profesorACargoId !== asignatura.profesorACargoId ||
      descripcion.trim() !== (asignatura.descripcion ?? '').trim()
    );
  }, [asignatura, codigo, nombre, profesorACargoId, descripcion]);

  const handleSave = () => {
    if (asignatura) {
      onSave({ codigo, nombre, profesorACargoId, descripcion });
    } else {
      const gestorSeleccionado = gestores.find(g => g.idUsuario.toString() === profesorACargoId);
      if (!gestorSeleccionado) return;
      onCrear({ codigo, nombre, profesorACargoId, descripcion });
    }
  };

  const profesorSelectedKeys = profesorACargoId ? [profesorACargoId] : [];

  return (
    <>
      <ModalHeader>
        <h2 className="text-xl font-bold">
          {asignatura ? 'Editar Asignatura' : 'Nueva Asignatura'}
        </h2>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Código"
              placeholder="GAS-101"
              value={codigo}
              onValueChange={setCodigo}
              maxLength={50}
              description={`${codigo.length}/50`}
              isRequired
            />
            <Input
              label="Nombre"
              placeholder="Panadería Básica"
              value={nombre}
              onValueChange={setNombre}
              maxLength={100}
              description={`${nombre.length}/100`}
              isRequired
            />
          </div>

          <Select
            label="Gestor Asignatura"
            placeholder={isLoadingGestores ? "Cargando gestores..." : "Seleccione un gestor"}
            selectedKeys={profesorSelectedKeys}
            onSelectionChange={(keys) => setProfesorACargoId(Array.from(keys)[0] as string)}
            description="El gestor de asignatura será quien realice los pedidos para esta asignatura"
            isRequired
            isLoading={isLoadingGestores}
            listboxProps={{ emptyContent: "Sin gestores disponibles. Contacte al administrador." }}
          >
            {gestores.map((gestor) => (
              <SelectItem key={gestor.idUsuario.toString()}>
                {gestor.nombreCompleto}
              </SelectItem>
            ))}
          </Select>

          <Textarea
            label="Descripción"
            placeholder="Fundamentos básicos de panadería..."
            value={descripcion}
            onValueChange={setDescripcion}
            maxLength={250}
            description={`${descripcion.length}/250`}
            minRows={3}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="light" onPress={onClose}>
          Cancelar
        </Button>
        <Button
          color="primary"
          onPress={handleSave}
          isDisabled={!codigo || !nombre || !profesorACargoId || !hasChanges}
        >
          {asignatura ? 'Guardar Cambios' : 'Crear Asignatura'}
        </Button>
      </ModalFooter>
    </>
  );
};

export default GestionAsignaturasPage;