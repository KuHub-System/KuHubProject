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

// Importar tipos y servicios actualizados
import { IAsignatura, ISeccion, IBloqueHorario, EstadoSeccion } from '../types/asignatura.types';
import { IUsuario } from '../types/usuario.types';
import {
  obtenerAsignaturasService,
  crearAsignaturaService,
  actualizarAsignaturaService,
  eliminarAsignaturaService,
  agregarSeccionService,
  actualizarSeccionService,
  eliminarSeccionService,
} from '../services/asignatura-service';
import { obtenerSalasActivasService, ISala } from '../services/sala-service';
import { obtenerUsuariosService, obtenerUsuariosGestoresAsignaturaService } from '../services/usuario-service';

/**
 * Formatea los bloques horarios en un string legible
 * Formato: "Lun 08:00-10:00, Mie 14:00-16:00"
 */
const formatearHorario = (bloques: IBloqueHorario[]): string => {
  if (!bloques || bloques.length === 0) return 'Sin horario';

  const diasAbrev: Record<string, string> = {
    'LUNES': 'Lun',
    'MARTES': 'Mar',
    'MIERCOLES': 'Mié',
    'JUEVES': 'Jue',
    'VIERNES': 'Vie',
    'SABADO': 'Sáb',
    'DOMINGO': 'Dom'
  };

  return bloques
    .map(b => `${diasAbrev[b.diaSemana]} ${b.horaInicio}-${b.horaFin}`)
    .join(', ');
};

/**
 * Obtiene la lista única de salas de los bloques horarios
 */
const obtenerSalas = (bloques: IBloqueHorario[]): string => {
  if (!bloques || bloques.length === 0) return 'Sin sala';

  const salasUnicas = Array.from(new Set(bloques.map(b => b.nombreSala)));
  return salasUnicas.join(', ');
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
  usePageTitle('Gestión de Asignaturas', 'Administre asignaturas, secciones y asignaciones de gestores');
  const toast = useToast();
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
  const handleCrearSeccion = async (seccionData: any) => {
    if (!asignaturaParaSeccion) return;
    try {
      await agregarSeccionService(asignaturaParaSeccion.id, seccionData);
      await cargarDatos();
      onCrearSeccionModalOpenChange();
      toast.success('Sección creada correctamente');
    } catch (error: any) {
      logger.error('Error al crear sección:', error);
      toast.error(error.message || 'Error al crear la sección');
    }
  };

  /**
   * Guarda los cambios de una sección
   */
  const guardarSeccion = async (seccionEditada: any) => {
    if (!seccionSeleccionada) return;

    try {
      // Construir payload completo para el backend
      const payload = {
        idSeccion: parseInt(seccionEditada.id),
        idAsignatura: parseInt(seccionSeleccionada.asignatura.id),
        nombreSeccion: seccionEditada.numeroSeccion,
        estadoSeccion: seccionEditada.estado,
        idDocente: parseInt(seccionEditada.profesorAsignadoId),
        NombreCompletoDocente: seccionEditada.profesorAsignado,
        capacidadMaxInscritos: seccionEditada.capacidadMax,
        cantInscritos: seccionEditada.cantInscritos,
        bloquesHorarios: seccionEditada.bloquesHorarios,
        crearSala: false
      };

      await actualizarSeccionService(
        seccionSeleccionada.asignatura.id,
        seccionEditada.id,
        payload as any
      );

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
  const eliminarAsignatura = async (asignaturaId: string) => {
    if (!confirm('¿Está seguro de eliminar esta asignatura? Esto eliminará todas sus secciones.')) return;

    try {
      await eliminarAsignaturaService(asignaturaId);
      await cargarDatos();
      toast.success('Asignatura eliminada correctamente');
    } catch (error: any) {
      logger.error('Error al eliminar asignatura:', error);
      toast.error(error.message || 'Error al eliminar la asignatura');
    }
  };

  /**
   * Elimina una sección
   */
  const eliminarSeccion = async (asignaturaId: string, seccionId: string) => {
    if (!confirm('¿Está seguro de eliminar esta sección?')) return;

    try {
      await eliminarSeccionService(asignaturaId, seccionId);
      await cargarDatos();
      toast.success('Sección eliminada correctamente');
    } catch (error: any) {
      logger.error('Error al eliminar sección:', error);
      toast.error(error.message || 'Error al eliminar la sección');
    }
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
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Gestión de Asignaturas</h1>
            <p className="text-default-500">
              Administre asignaturas, secciones y asignaciones de gestores. Las recetas se multiplicarán por el total de alumnos activos.
            </p>
          </div>
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

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Buscar asignaturas, códigos, gestores o secciones..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            startContent={<Icon icon="lucide:search" className="text-default-400" />}
            className="w-full md:w-96"
          />
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
                            size="sm"
                            onPress={() => editarAsignatura(asignatura)}
                          >
                            <Icon icon="lucide:edit" className="text-primary" />
                          </Button>
                          <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            color="danger"
                            onPress={() => eliminarAsignatura(asignatura.id)}
                          >
                            <Icon icon="lucide:trash-2" />
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
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-semibold text-sm">Secciones ({asignatura.secciones.length})</h4>
                            </div>

                            <div className="grid gap-3">
                              {asignatura.secciones.map((seccion: ISeccion) => (
                                <div key={seccion.id} className="flex items-center justify-between p-3 bg-white dark:bg-content1 rounded-lg border border-default-200">
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                      <p className="text-xs text-default-500 mb-1">SECCIÓN</p>
                                      <p className="font-semibold text-lg">{seccion.numeroSeccion}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-default-500 mb-1">PROFESOR ASIGNADO</p>
                                      <p className="font-medium text-sm">{seccion.profesorAsignado}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-default-500 mb-1">HORARIO / AULA</p>
                                      <p className="text-sm">{formatearHorario(seccion.bloquesHorarios)}</p>
                                      <p className="text-xs text-default-400">{obtenerSalas(seccion.bloquesHorarios)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-default-500 mb-1">ALUMNOS / ESTADO</p>
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold">
                                          {seccion.cantInscritos}/{seccion.capacidadMax} alumnos
                                        </p>
                                        {renderEstadoSeccion(seccion.estado)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 ml-4">
                                    <Button
                                      isIconOnly
                                      variant="light"
                                      size="sm"
                                      onPress={() => editarSeccion(asignatura, seccion)}
                                    >
                                      <Icon icon="lucide:edit" className="text-primary" />
                                    </Button>
                                    <Button
                                      isIconOnly
                                      variant="light"
                                      size="sm"
                                      color="danger"
                                      onPress={() => eliminarSeccion(asignatura.id, seccion.id)}
                                    >
                                      <Icon icon="lucide:trash-2" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              {asignatura.secciones.length === 0 && (
                                <div className="text-center py-6 text-default-400">
                                  <Icon icon="lucide:book-open" className="text-3xl mx-auto mb-2" />
                                  <p>No hay secciones registradas.</p>
                                </div>
                              )}
                            </div>

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
              profesores={profesores}
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
              profesores={profesores}
              onClose={onClose}
              onSave={handleCrearSeccion}
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
  { value: 'LUNES',     label: 'Lunes' },
  { value: 'MARTES',    label: 'Martes' },
  { value: 'MIERCOLES', label: 'Miércoles' },
  { value: 'JUEVES',    label: 'Jueves' },
  { value: 'VIERNES',   label: 'Viernes' },
];

interface CrearSeccionModalProps {
  asignatura: IAsignatura | null;
  profesores: IUsuario[];
  onClose: () => void;
  onSave: (seccion: any) => void;
}

const CrearSeccionModal: React.FC<CrearSeccionModalProps> = ({ asignatura, profesores, onClose, onSave }) => {
  const [nombreSeccion, setNombreSeccion] = React.useState('');
  const [docenteId, setDocenteId] = React.useState('');
  const [estado, setEstado] = React.useState<EstadoSeccion>('ACTIVA');
  const [capacidadMax, setCapacidadMax] = React.useState(30);
  const [cantInscritos, setCantInscritos] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);

  // Bloques horarios
  const [salas, setSalas] = React.useState<ISala[]>([]);
  const [isLoadingSalas, setIsLoadingSalas] = React.useState(false);
  const [salaId, setSalaId] = React.useState('');
  const [dia, setDia] = React.useState('');
  const [bloquesSeleccionados, setBloquesSeleccionados] = React.useState<{ numeroBloque: number; horaInicio: string; horaFin: string; diaSemana: string }[]>([]);

  React.useEffect(() => {
    const cargarSalas = async () => {
      try {
        setIsLoadingSalas(true);
        const data = await obtenerSalasActivasService();
        setSalas(data);
      } catch { /* silencioso */ } finally {
        setIsLoadingSalas(false);
      }
    };
    cargarSalas();
  }, []);

  const salaSeleccionada = salas.find(s => s.idSala.toString() === salaId);

  const toggleBloque = (bloque: { numeroBloque: number; horaInicio: string; horaFin: string; diaSemana: string }) => {
    setBloquesSeleccionados(prev => {
      const existe = prev.some(b => b.numeroBloque === bloque.numeroBloque);
      return existe ? prev.filter(b => b.numeroBloque !== bloque.numeroBloque) : [...prev, bloque];
    });
  };

  const handleSave = async () => {
    if (!asignatura) return;
    setIsSaving(true);
    try {
      await onSave({
        nombreSeccion,
        idUsuarioDocente: parseInt(docenteId),
        estadoSeccion: estado,
        capacidadMaxInscritos: capacidadMax,
        cantInscritos,
        bloquesHorarios: bloquesSeleccionados.map(b => ({
          numeroBloque: b.numeroBloque,
          diaSemana: b.diaSemana,
          idSala: parseInt(salaId) || undefined,
        })),
        crearSala: false,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = nombreSeccion.trim() && docenteId;

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
              label="Número de Sección"
              placeholder="001"
              value={nombreSeccion}
              onValueChange={setNombreSeccion}
              isRequired
            />
            <Select
              label="Estado"
              selectedKeys={[estado]}
              onSelectionChange={keys => setEstado(Array.from(keys)[0] as EstadoSeccion)}
            >
              <SelectItem key="ACTIVA">Activa</SelectItem>
              <SelectItem key="INACTIVA">Inactiva</SelectItem>
              <SelectItem key="SUSPENDIDA">Suspendida</SelectItem>
            </Select>
          </div>

          <Select
            label="Docente Asignado"
            placeholder="Seleccione un docente"
            selectedKeys={docenteId ? [docenteId] : []}
            onSelectionChange={keys => setDocenteId(Array.from(keys)[0] as string)}
            isRequired
          >
            {profesores.map(p => (
              <SelectItem key={p.id}>{p.nombreCompleto} ({p.rol})</SelectItem>
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
                onSelectionChange={keys => { setSalaId(Array.from(keys)[0] as string); setBloquesSeleccionados([]); }}
                isLoading={isLoadingSalas}
              >
                {salas.map(s => (
                  <SelectItem key={s.idSala.toString()}>
                    {s.codSala} — {s.nombreSala}
                  </SelectItem>
                ))}
              </Select>
              <Select
                label="Día de la semana"
                placeholder="Seleccione un día"
                selectedKeys={dia ? [dia] : []}
                onSelectionChange={keys => { setDia(Array.from(keys)[0] as string); setBloquesSeleccionados([]); }}
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
                {/* Placeholder — reemplazar con fetch real de bloques disponibles */}
                <div className="rounded-lg border-2 border-dashed border-warning-200 bg-warning-50 dark:bg-warning-900/10 p-4 flex items-center gap-3">
                  <Icon icon="lucide:construction" className="text-warning-500 shrink-0" width={20} />
                  <div>
                    <p className="text-sm font-semibold text-warning-700 dark:text-warning-400">Consulta de bloques pendiente</p>
                    <p className="text-xs text-warning-600 dark:text-warning-500">
                      La búsqueda de bloques disponibles se implementará próximamente. Los bloques seleccionados se enviarán al guardar.
                    </p>
                  </div>
                </div>

                {/* Bloques seleccionados manualmente */}
                {bloquesSeleccionados.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-default-500">Bloques seleccionados:</p>
                    {bloquesSeleccionados.map(b => (
                      <div key={b.numeroBloque} className="flex items-center justify-between px-3 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200">
                        <div className="flex items-center gap-2">
                          <Chip size="sm" color="primary" variant="flat" className="font-bold">B{b.numeroBloque}</Chip>
                          <span className="text-xs text-default-600">{b.horaInicio} – {b.horaFin}</span>
                        </div>
                        <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => toggleBloque(b)}>
                          <Icon icon="lucide:x" width={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
  profesores: IUsuario[];
  onClose: () => void;
  onSave: (seccion: any) => void;
}

const EditarSeccionModal: React.FC<EditarSeccionModalProps> = ({
  seccionData,
  profesores,
  onClose,
  onSave
}) => {
  const [numeroSeccion, setNumeroSeccion] = React.useState('');
  const [profesorAsignadoId, setProfesorAsignadoId] = React.useState('');
  const [capacidadMax, setCapacidadMax] = React.useState(20);
  const [cantInscritos, setCantInscritos] = React.useState(0);
  const [estado, setEstado] = React.useState<EstadoSeccion>('ACTIVA');
  const [bloquesHorarios, setBloquesHorarios] = React.useState<IBloqueHorario[]>([]);

  React.useEffect(() => {
    if (seccionData?.seccion) {
      const { seccion } = seccionData;
      setNumeroSeccion(seccion.numeroSeccion);
      setProfesorAsignadoId(seccion.profesorAsignadoId);
      setCapacidadMax(seccion.capacidadMax);
      setCantInscritos(seccion.cantInscritos);
      setEstado(seccion.estado);
      setBloquesHorarios([...seccion.bloquesHorarios]);
    }
  }, [seccionData]);

  const handleSave = () => {
    if (!seccionData?.seccion) return;

    const profesorSeleccionado = profesores.find(p => p.id === profesorAsignadoId);

    const seccionEditada = {
      id: seccionData.seccion.id,
      numeroSeccion,
      profesorAsignadoId,
      profesorAsignado: profesorSeleccionado?.nombreCompleto || '',
      capacidadMax,
      cantInscritos,
      estado,
      bloquesHorarios
    };

    onSave(seccionEditada);
  };

  if (!seccionData) return null;

  const profesorSelectedKeys = profesorAsignadoId ? [profesorAsignadoId] : [];

  return (
    <>
      <ModalHeader>
        <div>
          <h2 className="text-xl font-bold">Editar Sección {seccionData.seccion.numeroSeccion}</h2>
          <p className="text-sm text-default-500">{seccionData.asignatura.nombre}</p>
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Número de Sección"
              placeholder="101"
              value={numeroSeccion}
              onValueChange={setNumeroSeccion}
              isRequired
            />

            <Select
              label="Estado"
              selectedKeys={[estado]}
              onSelectionChange={(keys) => setEstado(Array.from(keys)[0] as EstadoSeccion)}
            >
              <SelectItem key="ACTIVA">Activa</SelectItem>
              <SelectItem key="INACTIVA">Inactiva</SelectItem>
              <SelectItem key="SUSPENDIDA">Suspendida</SelectItem>
            </Select>
          </div>

          <Select
            label="Profesor Asignado"
            placeholder="Seleccione un profesor"
            selectedKeys={profesorSelectedKeys}
            onSelectionChange={(keys) => setProfesorAsignadoId(Array.from(keys)[0] as string)}
            isRequired
          >
            {profesores.map((profesor) => (
              <SelectItem key={profesor.id}>
                {profesor.nombreCompleto} ({profesor.rol})
              </SelectItem>
            ))}
          </Select>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Capacidad Máxima"
              value={capacidadMax.toString()}
              onValueChange={(val) => setCapacidadMax(parseInt(val) || 0)}
              min="0"
              isRequired
            />

            <Input
              type="number"
              label="Cantidad Inscritos"
              value={cantInscritos.toString()}
              onValueChange={(val) => setCantInscritos(parseInt(val) || 0)}
              min="0"
              max={capacidadMax}
              isRequired
            />
          </div>

          <Divider />

          <div>
            <h3 className="text-sm font-semibold mb-2">Bloques Horarios y Salas</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {bloquesHorarios.map((bloque, index) => (
                <div key={index} className="p-3 bg-default-100 dark:bg-default-50/20 rounded-lg text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">Bloque {bloque.numeroBloque}</p>
                      <p className="text-xs text-default-500">
                        {bloque.diaSemana} • {bloque.horaInicio} - {bloque.horaFin}
                      </p>
                      <p className="text-xs text-default-600">
                        {bloque.nombreSala} ({bloque.codSala})
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {bloquesHorarios.length === 0 && (
                <p className="text-sm text-default-400 text-center py-4">
                  No hay bloques horarios asignados
                </p>
              )}
            </div>
            <p className="text-xs text-default-400 mt-2">
              Nota: La edición de bloques horarios no está disponible en esta versión.
              Para cambiar horarios, contacte al administrador del sistema.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="light" onPress={onClose}>
          Cancelar
        </Button>
        <Button
          color="primary"
          onPress={handleSave}
          isDisabled={!numeroSeccion || !profesorAsignadoId || capacidadMax < cantInscritos}
        >
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

  const handleSave = () => {
    if (asignatura) {
      // Editar
      onSave({
        codigo,
        nombre,
        profesorACargoId,
        profesorACargoNombre: gestores.find(g => g.idUsuario.toString() === profesorACargoId)?.nombreCompleto || '',
        descripcion
      });
    } else {
      // Crear
      const gestorSeleccionado = gestores.find(g => g.idUsuario.toString() === profesorACargoId);
      if (!gestorSeleccionado) return;

      onCrear({
        codigo,
        nombre,
        profesorACargoId,
        descripcion
      });
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
          isDisabled={!codigo || !nombre || !profesorACargoId}
        >
          {asignatura ? 'Guardar Cambios' : 'Crear Asignatura'}
        </Button>
      </ModalFooter>
    </>
  );
};

export default GestionAsignaturasPage;