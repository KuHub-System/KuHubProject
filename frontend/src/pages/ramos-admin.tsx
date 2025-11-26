import React from 'react';
import {
  Card,
  CardBody,
  Input,
  Button,
  Chip,
  Pagination,
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
  calcularTotalAlumnosService
} from '../services/asignatura-service';
import { obtenerUsuariosService } from '../services/usuario-service';

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
  const toast = useToast();
  const [asignaturas, setAsignaturas] = React.useState<IAsignatura[]>([]);
  const [filteredAsignaturas, setFilteredAsignaturas] = React.useState<IAsignatura[]>([]);
  const [profesores, setProfesores] = React.useState<IUsuario[]>([]);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Estados para modales
  const [seccionSeleccionada, setSeccionSeleccionada] = React.useState<{asignatura: IAsignatura, seccion: ISeccion} | null>(null);
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = React.useState<IAsignatura | null>(null);

  const { isOpen: isSeccionModalOpen, onOpen: onSeccionModalOpen, onOpenChange: onSeccionModalOpenChange } = useDisclosure();
  const { isOpen: isAsignaturaModalOpen, onOpen: onAsignaturaModalOpen, onOpenChange: onAsignaturaModalOpenChange } = useDisclosure();

  const rowsPerPage = 5;

  /**
   * Cargar datos iniciales
   */
  const cargarDatos = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [asignaturasData, usuariosData] = await Promise.all([
        obtenerAsignaturasService(),
        obtenerUsuariosService()
      ]);

      setAsignaturas(asignaturasData);
      setFilteredAsignaturas(asignaturasData);

      // Filtrar solo usuarios con rol de Profesor o Profesor a Cargo
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
   * Filtra las asignaturas según el término de búsqueda
   */
  React.useEffect(() => {
    let filtered = [...asignaturas];

    if (searchTerm) {
      filtered = filtered.filter(asignatura =>
          asignatura.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asignatura.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asignatura.profesorACargoNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asignatura.secciones.some(seccion =>
              seccion.numeroSeccion.includes(searchTerm) ||
              seccion.profesorAsignado.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    setFilteredAsignaturas(filtered);
    setCurrentPage(1);
  }, [searchTerm, asignaturas]);

  /**
   * Calcula las asignaturas a mostrar en la página actual
   */
  const paginatedAsignaturas = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredAsignaturas.slice(start, end);
  }, [currentPage, filteredAsignaturas, rowsPerPage]);

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
                Administre asignaturas, secciones y asignaciones de profesores. Las recetas se multiplicarán por el total de alumnos activos.
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
                placeholder="Buscar asignaturas, códigos, profesores o secciones..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                startContent={<Icon icon="lucide:search" className="text-default-400" />}
                className="w-full md:w-96"
            />
          </div>

          {/* Cards de asignaturas */}
          <div className="space-y-4">
            {paginatedAsignaturas.length === 0 ? (
                <Card>
                  <CardBody className="text-center py-10">
                    <Icon icon="lucide:book-open" className="text-5xl text-default-300 mx-auto mb-4" />
                    <p className="text-default-500">
                      No hay asignaturas registradas. Cree una nueva asignatura para comenzar.
                    </p>
                  </CardBody>
                </Card>
            ) : (
                paginatedAsignaturas.map((asignatura) => {
                  const totalAlumnos = calcularTotalAlumnos(asignatura);
                  const multiplicadorReceta = totalAlumnos > 0 ? (totalAlumnos / 20).toFixed(2) : '0';

                  return (
                      <Card key={asignatura.id} className="shadow-sm">
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
                                  Profesor a Cargo: <span className="font-medium">{asignatura.profesorACargoNombre}</span>
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
                                  color={asignatura.secciones.every(s => s.estado === 'ACTIVA') ? 'success' : 'warning'}
                              >
                                {asignatura.secciones.filter(s => s.estado === 'ACTIVA').length} activas
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
                                  <div className="p-4 bg-default-50 dark:bg-default-100">
                                    <div className="flex justify-between items-center mb-4">
                                      <h4 className="font-semibold text-sm">Secciones ({asignatura.secciones.length})</h4>
                                    </div>

                                    <div className="grid gap-3">
                                      {asignatura.secciones.map((seccion) => (
                                          <div key={seccion.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-lg border border-default-200">
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

          {/* Paginación */}
          {filteredAsignaturas.length > rowsPerPage && (
              <div className="flex w-full justify-center">
                <Pagination
                    total={Math.ceil(filteredAsignaturas.length / rowsPerPage)}
                    page={currentPage}
                    onChange={setCurrentPage}
                    showControls
                />
              </div>
          )}
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

        {/* Modal para editar/crear asignatura */}
        <Modal isOpen={isAsignaturaModalOpen} onOpenChange={onAsignaturaModalOpenChange} size="lg">
          <ModalContent>
            {(onClose) => (
                <EditarAsignaturaModal
                    asignatura={asignaturaSeleccionada}
                    profesores={profesores}
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

/**
 * Modal para editar una sección
 */
interface EditarSeccionModalProps {
  seccionData: {asignatura: IAsignatura, seccion: ISeccion} | null;
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
                    <div key={index} className="p-3 bg-default-100 rounded-lg text-sm">
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
  profesores: IUsuario[];
  onClose: () => void;
  onSave: (asignatura: Partial<IAsignatura>) => void;
  onCrear: (data: any) => void;
}

const EditarAsignaturaModal: React.FC<EditarAsignaturaModalProps> = ({
                                                                       asignatura,
                                                                       profesores,
                                                                       onClose,
                                                                       onSave,
                                                                       onCrear
                                                                     }) => {
  const [codigo, setCodigo] = React.useState('');
  const [nombre, setNombre] = React.useState('');
  const [profesorACargoId, setProfesorACargoId] = React.useState('');
  const [descripcion, setDescripcion] = React.useState('');

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
        profesorACargoNombre: profesores.find(p => p.id === profesorACargoId)?.nombreCompleto || '',
        descripcion
      });
    } else {
      // Crear
      const profesorSeleccionado = profesores.find(p => p.id === profesorACargoId);
      if (!profesorSeleccionado) return;

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
                  isRequired
              />
              <Input
                  label="Nombre"
                  placeholder="Panadería Básica"
                  value={nombre}
                  onValueChange={setNombre}
                  isRequired
              />
            </div>

            <Select
                label="Profesor a Cargo"
                placeholder="Seleccione un profesor"
                selectedKeys={profesorSelectedKeys}
                onSelectionChange={(keys) => setProfesorACargoId(Array.from(keys)[0] as string)}
                description="El profesor a cargo será quien realice los pedidos para esta asignatura"
                isRequired
            >
              {profesores.map((profesor) => (
                  <SelectItem key={profesor.id}>
                    {profesor.nombreCompleto} ({profesor.rol})
                  </SelectItem>
              ))}
            </Select>

            <Textarea
                label="Descripción"
                placeholder="Fundamentos básicos de panadería..."
                value={descripcion}
                onValueChange={setDescripcion}
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