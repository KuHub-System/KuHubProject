import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Divider,
  Tabs,
  Tab,
  Tooltip,
  Spinner,
  DatePicker,
  Select,
  SelectItem,
} from '@heroui/react';
import { type DateValue } from '@internationalized/date';
import { I18nProvider } from '@react-aria/i18n';
import { useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../hooks/useToast';
import { useModulePermission } from '../contexts/permission-context';

// ─── TIPOS Y SERVICIOS ───────────────────────────────────────────────────────
import { IBloqueHorario } from '../types/bloque-horario.types';
import { obtenerBloquesHorarioService } from '../services/bloque-horario-service';
import { ISemana } from '../types/semana.types';
import { obtenerSemanasService, generarCalendarioService, obtenerAniosFiltroService, invalidarCacheSemanas } from '../services/semana-service';

// ISala importada desde sala-service

type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';

interface ReservaSala {
  idReservaSala: number;
  idSeccion: number;
  nombreSeccion: string;
  idSala: number;
  codSala: string;
  nombreSala: string;
  diaSemana: DiaSemana;
  idBloque: number;
  numeroBloque: number;
  horaInicio: string;
  horaFin: string;
}

const DIAS_SEMANA: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const MOCK_RESERVAS: ReservaSala[] = [
  { idReservaSala: 1, idSeccion: 1, nombreSeccion: 'Gastronomía Internacional - 1A', idSala: 1, codSala: 'AULA-01', nombreSala: 'Aula 01 - Cocina Principal', diaSemana: 'Lunes', idBloque: 1, numeroBloque: 1, horaInicio: '08:01', horaFin: '08:40' },
  { idReservaSala: 2, idSeccion: 1, nombreSeccion: 'Gastronomía Internacional - 1A', idSala: 1, codSala: 'AULA-01', nombreSala: 'Aula 01 - Cocina Principal', diaSemana: 'Lunes', idBloque: 2, numeroBloque: 2, horaInicio: '08:41', horaFin: '09:20' },
  { idReservaSala: 3, idSeccion: 2, nombreSeccion: 'Pastelería Artesanal - 2B', idSala: 2, codSala: 'AULA-02', nombreSala: 'Aula 02 - Pastelería', diaSemana: 'Lunes', idBloque: 5, numeroBloque: 5, horaInicio: '11:01', horaFin: '11:40' },
  { idReservaSala: 4, idSeccion: 2, nombreSeccion: 'Pastelería Artesanal - 2B', idSala: 2, codSala: 'AULA-02', nombreSala: 'Aula 02 - Pastelería', diaSemana: 'Lunes', idBloque: 6, numeroBloque: 6, horaInicio: '11:41', horaFin: '12:20' },
  { idReservaSala: 5, idSeccion: 3, nombreSeccion: 'Técnicas Culinarias - 3C', idSala: 3, codSala: 'LAB-01', nombreSala: 'Laboratorio de Gastronomía', diaSemana: 'Martes', idBloque: 3, numeroBloque: 3, horaInicio: '09:31', horaFin: '10:10' },
  { idReservaSala: 6, idSeccion: 3, nombreSeccion: 'Técnicas Culinarias - 3C', idSala: 3, codSala: 'LAB-01', nombreSala: 'Laboratorio de Gastronomía', diaSemana: 'Martes', idBloque: 4, numeroBloque: 4, horaInicio: '10:11', horaFin: '10:50' },
  { idReservaSala: 7, idSeccion: 1, nombreSeccion: 'Gastronomía Internacional - 1A', idSala: 1, codSala: 'AULA-01', nombreSala: 'Aula 01 - Cocina Principal', diaSemana: 'Miércoles', idBloque: 7, numeroBloque: 7, horaInicio: '12:31', horaFin: '13:10' },
  { idReservaSala: 8, idSeccion: 4, nombreSeccion: 'Repostería Avanzada - 4A', idSala: 2, codSala: 'AULA-02', nombreSala: 'Aula 02 - Pastelería', diaSemana: 'Miércoles', idBloque: 9, numeroBloque: 9, horaInicio: '14:01', horaFin: '14:40' },
  { idReservaSala: 9, idSeccion: 4, nombreSeccion: 'Repostería Avanzada - 4A', idSala: 2, codSala: 'AULA-02', nombreSala: 'Aula 02 - Pastelería', diaSemana: 'Miércoles', idBloque: 10, numeroBloque: 10, horaInicio: '14:41', horaFin: '15:20' },
  { idReservaSala: 10, idSeccion: 2, nombreSeccion: 'Pastelería Artesanal - 2B', idSala: 3, codSala: 'LAB-01', nombreSala: 'Laboratorio de Gastronomía', diaSemana: 'Jueves', idBloque: 1, numeroBloque: 1, horaInicio: '08:01', horaFin: '08:40' },
  { idReservaSala: 11, idSeccion: 5, nombreSeccion: 'Enología y Maridaje - 5B', idSala: 1, codSala: 'AULA-01', nombreSala: 'Aula 01 - Cocina Principal', diaSemana: 'Jueves', idBloque: 13, numeroBloque: 13, horaInicio: '17:01', horaFin: '17:40' },
  { idReservaSala: 12, idSeccion: 5, nombreSeccion: 'Enología y Maridaje - 5B', idSala: 1, codSala: 'AULA-01', nombreSala: 'Aula 01 - Cocina Principal', diaSemana: 'Jueves', idBloque: 14, numeroBloque: 14, horaInicio: '17:41', horaFin: '18:20' },
  { idReservaSala: 13, idSeccion: 3, nombreSeccion: 'Técnicas Culinarias - 3C', idSala: 3, codSala: 'LAB-01', nombreSala: 'Laboratorio de Gastronomía', diaSemana: 'Viernes', idBloque: 5, numeroBloque: 5, horaInicio: '11:01', horaFin: '11:40' },
  { idReservaSala: 14, idSeccion: 6, nombreSeccion: 'Cocina Chilena - 6A', idSala: 1, codSala: 'AULA-01', nombreSala: 'Aula 01 - Cocina Principal', diaSemana: 'Viernes', idBloque: 16, numeroBloque: 16, horaInicio: '19:01', horaFin: '19:40' },
  { idReservaSala: 15, idSeccion: 6, nombreSeccion: 'Cocina Chilena - 6A', idSala: 1, codSala: 'AULA-01', nombreSala: 'Aula 01 - Cocina Principal', diaSemana: 'Viernes', idBloque: 17, numeroBloque: 17, horaInicio: '19:41', horaFin: '20:20' },
];

// DATOS MOCK REMOVIDOS - Se obtienen del backend

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Agrega días a una fecha y retorna el resultado como string YYYY-MM-DD */
const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

/** Formatea una fecha YYYY-MM-DD a DD/MM/YYYY */
const formatDate = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

const AdminSistemaPage: React.FC = () => {
  usePageTitle('Administración del Sistema', 'Centro de control: horarios, semanas académicas y salas', 'lucide:settings-2');
  const toast = useToast();
  const location = useLocation();

  const tabFromUrl = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('tab');
    return t === 'semanas' || t === 'horarios' || t === 'reservas' ? t : 'horarios';
  }, [location.search]);

  const [activeTab, setActiveTab] = React.useState<string>(tabFromUrl);

  React.useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);
  const [bloques, setBloques] = React.useState<IBloqueHorario[]>([]);
  const [isLoadingBloques, setIsLoadingBloques] = React.useState(true);

  React.useEffect(() => {
    const fetchBloques = async () => {
      try {
        setIsLoadingBloques(true);
        const data = await obtenerBloquesHorarioService();
        setBloques(data);
      } catch (error: any) {
        toast.error(error.message || 'Error al cargar bloques horarios');
      } finally {
        setIsLoadingBloques(false);
      }
    };
    fetchBloques();
  }, [toast]);

  return (
    <div className="min-h-screen bg-default-50/50 dark:bg-background pb-20 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Header resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
          <Card className="shadow-sm border-l-4 border-primary bg-white dark:bg-content1">
            <CardBody className="flex flex-row items-center justify-between p-4 gap-4">
              <div>
                <p className="text-sm font-semibold text-default-500 uppercase tracking-wide">Bloques Horarios</p>
                <p className="text-3xl font-bold text-secondary mt-1">{bloques.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 text-primary shrink-0">
                <Icon icon="lucide:clock" width={24} />
              </div>
            </CardBody>
          </Card>
          <Card className="shadow-sm border-l-4 border-warning bg-white dark:bg-content1">
            <CardBody className="flex flex-row items-center justify-between p-4 gap-4">
              <div>
                <p className="text-sm font-semibold text-default-500 uppercase tracking-wide">Semanas x Semestre</p>
                <p className="text-3xl font-bold text-secondary mt-1">18</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-warning-100 dark:bg-warning-900/30 text-warning shrink-0">
                <Icon icon="lucide:calendar-days" width={24} />
              </div>
            </CardBody>
          </Card>
          <Card className="shadow-sm border-l-4 border-success bg-white dark:bg-content1">
            <CardBody className="flex flex-row items-center justify-between p-4 gap-4">
              <div>
                <p className="text-sm font-semibold text-default-500 uppercase tracking-wide">Módulos Activos</p>
                <p className="text-3xl font-bold text-secondary mt-1">4</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-success-100 dark:bg-success-900/30 text-success shrink-0">
                <Icon icon="lucide:settings-2" width={24} />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Tabs principales */}
        <div className="px-4">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
            color="primary"
            variant="underlined"
            classNames={{
              tabList: 'gap-6 border-b border-default-200 dark:border-default-100 w-full pb-0',
              cursor: 'w-full bg-primary',
              tab: 'max-w-fit px-0 h-12 font-semibold',
              tabContent: 'group-data-[selected=true]:text-primary',
            }}
          >
            <Tab
              key="horarios"
              title={
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:clock-4" width={18} />
                  <span>Bloques Horarios</span>
                </div>
              }
            />
            <Tab
              key="semanas"
              title={
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:calendar-range" width={18} />
                  <span>Gestión de Semanas</span>
                </div>
              }
            />
            <Tab
              key="reservas"
              title={
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:calendar-clock" width={18} />
                  <span>Reservas de Salas por Sección</span>
                </div>
              }
            />
          </Tabs>

          <div className="mt-6">
            {activeTab === 'horarios' && (
              <SeccionBloques
                bloques={bloques}
                isLoading={isLoadingBloques}
              />
            )}
            {activeTab === 'semanas' && <SeccionSemanas toast={toast} />}
            {activeTab === 'reservas' && <SeccionReservas />}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── SECCIÓN: BLOQUES HORARIOS ────────────────────────────────────────────────

interface SeccionBloquesProps {
  bloques: IBloqueHorario[];
  isLoading: boolean;
}

const SeccionBloques: React.FC<SeccionBloquesProps> = ({ bloques, isLoading }) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { canCreate: admin_Crear, canUpdate: admin_Editar, canDelete: admin_Eliminar } = useModulePermission('ADMIN_SISTEMA');
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar' | 'mantenimiento'>('crear');

  // Identificar bloques con "recreo" (gap > 1 min entre bloques consecutivos)
  const getBloqueGroup = (bloque: IBloqueHorario): string => {
    const num = bloque.numeroBloque;
    if (num <= 6) return 'Mañana';
    if (num <= 12) return 'Tarde';
    if (num <= 14) return 'Vespertino';
    return 'Nocturno';
  };

  const groupColors: Record<string, { bg: string; text: string; chip: 'primary' | 'warning' | 'secondary' | 'danger' }> = {
    'Mañana': { bg: 'bg-primary-50', text: 'text-primary-600', chip: 'primary' },
    'Tarde': { bg: 'bg-warning-50', text: 'text-warning-600', chip: 'warning' },
    'Vespertino': { bg: 'bg-secondary-50', text: 'text-secondary-600', chip: 'secondary' },
    'Nocturno': { bg: 'bg-danger-50', text: 'text-danger-600', chip: 'danger' },
  };

  /** Formatea HH:mm:ss a HH:mm */
  const formatTime = (time: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  const handleNuevoBloque = () => {
    setModalMode('mantenimiento');
    onOpen();
  };

  const handleEditarBloque = (_bloque: IBloqueHorario) => {
    setModalMode('mantenimiento');
    onOpen();
  };

  const handleEliminar = async (_bloque: IBloqueHorario) => {
    setModalMode('mantenimiento');
    onOpen();
  };


  return (
    <div className="space-y-4">
      <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1 mx-4">
        <CardHeader className="px-6 pt-5 pb-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary">
            <Icon icon="lucide:clock" width={20} />
          </div>
          <div>
            <h3 className="font-bold text-base text-secondary dark:text-foreground">Bloques Horarios del Sistema</h3>
            <p className="text-xs text-default-400">Configuración académica vigente</p>
          </div>
          <div className="hidden md:flex gap-2 ml-4">
            {Object.entries(groupColors).map(([label, style]) => (
              <Chip key={label} color={style.chip} size="sm" variant="flat">{label}</Chip>
            ))}
          </div>
          {admin_Crear && (
          <Button
            color="primary"
            variant="solid"
            size="sm"
            className="ml-auto font-bold text-secondary"
            startContent={<Icon icon="lucide:plus" width={16} />}
            onPress={handleNuevoBloque}
          >
            Nuevo Bloque
          </Button>
          )}
        </CardHeader>
        <Divider />
        <CardBody className="p-0">
          <Table
            aria-label="Bloques horarios"
            removeWrapper
            layout="fixed"
            classNames={{
              th: 'bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs h-10',
              td: 'py-2.5 border-b border-default-50 dark:border-default-50/10 group-data-[last=true]:border-none px-4',
            }}
          >
            <TableHeader>
              <TableColumn width="15%" align="center">BLOQUE</TableColumn>
              <TableColumn width="25%" align="center">HORA INICIO</TableColumn>
              <TableColumn width="25%" align="center">HORA FIN</TableColumn>
              <TableColumn width="20%" align="center">TURNO</TableColumn>
              <TableColumn width="15%" align="center">ACCIONES</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading}
              loadingContent={<Spinner label="Cargando bloques..." />}
              emptyContent={!isLoading && bloques.length === 0 && "No hay bloques horarios configurados"}
            >
              {bloques.map((bloque) => {
                const group = getBloqueGroup(bloque);
                const style = groupColors[group];
                return (
                  <TableRow key={bloque.idBloque || bloque.numeroBloque} className="hover:bg-default-50 dark:hover:bg-default-50/10 transition-colors">
                    <TableCell className="text-center">
                      <Chip size="sm" variant="flat" color="default" className="font-bold">
                        {bloque.numeroBloque}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm font-semibold text-secondary dark:text-foreground">
                      {formatTime(bloque.horaInicio)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm font-semibold text-secondary dark:text-foreground">
                      {formatTime(bloque.horaFin)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Chip size="sm" variant="flat" color={style.chip}>{group}</Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        {admin_Editar && (
                        <Tooltip content="Editar horario">
                          <Button
                            isIconOnly size="sm" variant="light"
                            className="text-default-400 hover:text-secondary"
                            onPress={() => handleEditarBloque(bloque)}
                          >
                            <Icon icon="lucide:edit" width={16} />
                          </Button>
                        </Tooltip>
                        )}
                        {admin_Eliminar && (
                        <Tooltip content="Eliminar bloque" color="danger">
                          <Button
                            isIconOnly size="sm" variant="light"
                            className="text-default-400 hover:text-danger"
                            onPress={() => handleEliminar(bloque)}
                          >
                            <Icon icon="lucide:trash" width={16} />
                          </Button>
                        </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="sm" placement="center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="flex items-center gap-2">
                  <Icon
                    icon={modalMode === 'mantenimiento' ? 'lucide:alert-triangle' : (modalMode === 'crear' ? 'lucide:plus-circle' : 'lucide:edit-3')}
                    className={modalMode === 'mantenimiento' ? 'text-warning' : 'text-primary'}
                    width={22}
                  />
                  <span className="font-bold">
                    {modalMode === 'mantenimiento' ? 'Función no disponible' : (modalMode === 'crear' ? 'Nuevo Bloque' : 'Editar Bloque')}
                  </span>
                </div>
              </ModalHeader>
              <ModalBody className={`space-y-4 ${modalMode === 'mantenimiento' ? 'py-8 text-center' : ''}`}>
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-warning-50 dark:bg-warning-900/20 text-warning-500">
                    <Icon icon="lucide:construction" width={48} />
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-lg text-secondary dark:text-foreground">Módulo en Mantenimiento</p>
                    <p className="text-default-500 text-sm leading-relaxed px-2">
                      Las acciones de gestión de bloques horarios están temporalmente deshabilitadas por actualizaciones técnicas.
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Entendido
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

// ─── SECCIÓN: GESTIÓN DE SEMANAS ──────────────────────────────────────────────

interface SeccionSemanasProps {
  toast: ReturnType<typeof useToast>;
}

const SeccionSemanas: React.FC<SeccionSemanasProps> = ({ toast }) => {
  const [fechaSeleccionada, setFechaSeleccionada] = React.useState<DateValue | null>(null);
  const [semestre, setSemestre] = React.useState<1 | 2>(1);
  const [semanas, setSemanas] = React.useState<ISemana[]>([]);
  const [isGenerando, setIsGenerando] = React.useState(false);
  const [isLoadingSemanas, setIsLoadingSemanas] = React.useState(true);
  const [isLoadingAnios, setIsLoadingAnios] = React.useState(true);
  const [filtroAnio, setFiltroAnio] = React.useState<string>(new Date().getFullYear().toString());
  const [aniosDisponibles, setAniosDisponibles] = React.useState<string[]>([]);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Cargar años disponibles al montar
  React.useEffect(() => {
    const fetchAnios = async () => {
      try {
        setIsLoadingAnios(true);
        const data = await obtenerAniosFiltroService();
        const yearsStr = data.map((y: number) => y.toString());

        // Asegurarse de que el año actual esté disponible en el filtro para evitar inconsistencia inicial
        const currentYearStr = new Date().getFullYear().toString();
        if (yearsStr.length > 0) {
          if (!yearsStr.includes(currentYearStr)) {
            // Si el backend no devuelve el año actual pero queremos filtrarlo inicialmente, lo añadimos y ordenamos
            const combined = [...yearsStr, currentYearStr].sort((a, b) => parseInt(b) - parseInt(a));
            setAniosDisponibles(combined);
          } else {
            setAniosDisponibles(yearsStr);
          }
        } else {
          // Fallback si viene vacío
          setAniosDisponibles([currentYearStr]);
        }
      } catch (error) {
        // Fallback en caso de error: usar al menos el año actual
        setAniosDisponibles([new Date().getFullYear().toString()]);
      } finally {
        setIsLoadingAnios(false);
      }
    };
    fetchAnios();
  }, []);

  // Solo lunes (getDay() === 1 en JS nativo: 0=dom, 1=lun, ...)
  const esDiaNoLunes = (date: DateValue) => {
    const jsDate = new Date(date.year, date.month - 1, date.day);
    return jsDate.getDay() !== 1;
  };

  // Cargar semanas existentes cuando cambie el filtro de año
  React.useEffect(() => {
    const fetchSemanas = async () => {
      try {
        setIsLoadingSemanas(true);
        const data = await obtenerSemanasService(parseInt(filtroAnio));
        setSemanas(data);
      } catch (error: any) {
        toast.error(error.message || 'Error al cargar las semanas');
      } finally {
        setIsLoadingSemanas(false);
      }
    };
    fetchSemanas();
  }, [toast, filtroAnio]);

  const handleGenerar = async () => {
    if (!fechaSeleccionada) {
      toast.warning('Selecciona una fecha de inicio (lunes) antes de generar.');
      return;
    }
    // Convertir DateValue → string YYYY-MM-DD
    const fechaInicio = `${fechaSeleccionada.year}-${String(fechaSeleccionada.month).padStart(2, '0')}-${String(fechaSeleccionada.day).padStart(2, '0')}`;
    setIsGenerando(true);
    try {
      await generarCalendarioService({ fechaInicio, semestre });
      toast.success(`Calendario generado: 18 semanas para el ${semestre}° semestre.`);

      const anioGeneradoNum = fechaSeleccionada.year;
      const anioGeneradoStr = anioGeneradoNum.toString();

      // Invalidar el caché del año generado para forzar recarga
      invalidarCacheSemanas(anioGeneradoNum);

      // Si el año generado no estaba en la lista, lo añadimos
      setAniosDisponibles(prev => {
        if (!prev.includes(anioGeneradoStr)) {
          return [...prev, anioGeneradoStr].sort((a, b) => parseInt(b) - parseInt(a));
        }
        return prev;
      });

      setFiltroAnio(anioGeneradoStr);

      // Refrescar datos (forzando refresh tras generación)
      const data = await obtenerSemanasService(anioGeneradoNum, true);
      setSemanas(data);
    } catch (error: any) {
      toast.error(error.message || 'Error al generar el calendario semestral');
    } finally {
      setIsGenerando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Formulario de generación */}
      <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
        <CardHeader className="px-6 pt-5 pb-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30 text-warning-600">
            <Icon icon="lucide:calendar-plus" width={20} />
          </div>
          <div>
            <h3 className="font-bold text-base text-secondary dark:text-foreground">Generar Calendario Académico</h3>
            <p className="text-xs text-default-400">Se generarán 18 semanas consecutivas a partir del lunes seleccionado</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-default-500 px-1">Solo los lunes están disponibles</p>
              <I18nProvider locale="es-CL">
                <DatePicker
                  label="Fecha de inicio (lunes)"
                  value={fechaSeleccionada}
                  onChange={setFechaSeleccionada}
                  isDateUnavailable={esDiaNoLunes}
                  variant="bordered"
                  className="md:w-64"
                  showMonthAndYearPickers
                />
              </I18nProvider>
            </div>
            <div className="flex gap-2">
              <Button
                variant={semestre === 1 ? 'solid' : 'bordered'}
                color={semestre === 1 ? 'primary' : 'default'}
                onPress={() => setSemestre(1)}
                className={semestre === 1 ? 'font-bold text-secondary' : 'font-medium'}
              >
                1° Semestre
              </Button>
              <Button
                variant={semestre === 2 ? 'solid' : 'bordered'}
                color={semestre === 2 ? 'primary' : 'default'}
                onPress={() => setSemestre(2)}
                className={semestre === 2 ? 'font-bold text-secondary' : 'font-medium'}
              >
                2° Semestre
              </Button>
            </div>
            <Button
              color="warning"
              variant="solid"
              startContent={<Icon icon="lucide:refresh-cw" width={18} />}
              onPress={handleGenerar}
              isLoading={isGenerando}
              isDisabled={!fechaSeleccionada}
              className="font-bold text-white"
            >
              Generar 18 Semanas
            </Button>
            <Button
              color="secondary"
              variant="flat"
              startContent={<Icon icon="lucide:list-restart" width={18} />}
              onPress={onOpen}
              className="font-bold"
            >
              Reasignar Semanas
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Semanas registradas — cabecera con filtro */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary">
            <Icon icon="lucide:calendar-range" width={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-secondary dark:text-foreground">Semanas Registradas</h3>
            <p className="text-xs text-default-400">
              {isLoadingSemanas ? 'Cargando...' : `${semanas.length} semana(s) · ${filtroAnio}`}
            </p>
          </div>
        </div>
        <div className="w-36">
          <Select
            size="sm"
            label="Filtrar por año"
            variant="bordered"
            selectedKeys={[filtroAnio]}
            isLoading={isLoadingAnios}
            onSelectionChange={(keys: any) => {
              const year = Array.from(keys)[0] as string;
              if (year) setFiltroAnio(year);
            }}
            disallowEmptySelection
          >
            {aniosDisponibles.map((year) => (
              <SelectItem key={year} textValue={year}>{year}</SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* Semanas — grid por semestre */}
      {isLoadingSemanas ? (
        <div className="flex justify-center py-12">
          <Spinner label="Cargando semanas..." />
        </div>
      ) : semanas.length === 0 ? (
        <div className="py-14 text-center text-default-400">
          <Icon icon="lucide:calendar-off" width={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-sm">No hay semanas registradas</p>
          <p className="text-xs mt-1 text-default-300">Selecciona una fecha de inicio y genera el calendario</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((sem) => {
            const semanasSem = semanas.filter((s) => s.semestre === sem);
            if (semanasSem.length === 0) return null;
            const isSem1 = sem === 1;
            return (
              <Card key={sem} className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
                {/* Cabecera del semestre */}
                <CardHeader className={`px-4 py-3 ${isSem1 ? 'bg-warning-50 dark:bg-warning-900/20' : 'bg-secondary-50 dark:bg-secondary-900/20'}`}>
                  <div className="flex items-center gap-2 w-full">
                    <div className={`p-1.5 rounded-md ${isSem1 ? 'bg-warning-100 text-warning-600' : 'bg-secondary-100 text-secondary-600'}`}>
                      <Icon icon={isSem1 ? 'lucide:book-open' : 'lucide:graduation-cap'} width={16} />
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${isSem1 ? 'text-warning-700 dark:text-warning-400' : 'text-secondary-700 dark:text-secondary-400'}`}>
                        {sem}° Semestre
                      </p>
                      <p className="text-xs text-default-400">{semanasSem.length} semanas</p>
                    </div>
                    <div className="ml-auto text-xs text-default-400 font-medium">
                      {formatDate(semanasSem[0]?.fechaInicio)} – {formatDate(semanasSem[semanasSem.length - 1]?.fechaFin)}
                    </div>
                  </div>
                </CardHeader>
                <Divider />
                <CardBody className="p-0 max-h-[420px] overflow-y-auto">
                  {semanasSem.map((semana, idx) => (
                    <div
                      key={semana.idSemana}
                      className="flex items-center gap-3 px-4 py-2 border-b border-default-50 dark:border-default-50/10 last:border-none hover:bg-default-50 dark:hover:bg-default-50/5 transition-colors"
                    >
                      {/* Número de semana */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isSem1 ? 'bg-warning-100 text-warning-700' : 'bg-secondary-100 text-secondary-700'}`}>
                        {idx + 1}
                      </div>
                      {/* Nombre */}
                      <p className="text-sm font-semibold text-secondary dark:text-foreground flex-1">{semana.nombreSemana}</p>
                      {/* Rango de fechas */}
                      <div className="flex items-center gap-1 text-xs text-default-500">
                        <span>{formatDate(semana.fechaInicio)}</span>
                        <Icon icon="lucide:arrow-right" width={12} className="text-default-300" />
                        <span>{formatDate(semana.fechaFin)}</span>
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Mantenimiento para Reasignar */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="sm" placement="center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:construction" className="text-warning" width={22} />
                  <span className="font-bold">Función no disponible</span>
                </div>
              </ModalHeader>
              <ModalBody className="py-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-warning-50 dark:bg-warning-900/20 text-warning-500">
                    <Icon icon="lucide:construction" width={48} />
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-lg text-secondary dark:text-foreground">Módulo en Mantenimiento</p>
                    <p className="text-default-500 text-sm leading-relaxed px-2">
                      La reasignación de semanas está temporalmente deshabilitada por actualizaciones técnicas.
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Entendido
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

// ─── SECCIÓN: RESERVAS DE SALAS POR SECCIÓN ──────────────────────────────────

const SeccionReservas: React.FC = () => {
  const { isOpen: isModalOpen, onOpen: onModalOpen, onOpenChange: onModalOpenChange } = useDisclosure();
  const [filtroDia, setFiltroDia] = React.useState<DiaSemana | 'Todos'>('Todos');
  const [filtroSala, setFiltroSala] = React.useState('');

  const reservasFiltradas = MOCK_RESERVAS.filter((r) => {
    const matchDia = filtroDia === 'Todos' || r.diaSemana === filtroDia;
    const matchSala = filtroSala.trim() === '' || r.codSala.toLowerCase().includes(filtroSala.toLowerCase()) || r.nombreSala.toLowerCase().includes(filtroSala.toLowerCase());
    return matchDia && matchSala;
  });

  const totalReservas = MOCK_RESERVAS.length;
  const salasUsadas = new Set(MOCK_RESERVAS.map((r) => r.idSala)).size;
  const seccionesUsadas = new Set(MOCK_RESERVAS.map((r) => r.idSeccion)).size;

  const diaColors: Record<DiaSemana, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'> = {
    Lunes: 'primary',
    Martes: 'secondary',
    Miércoles: 'success',
    Jueves: 'warning',
    Viernes: 'danger',
    Sábado: 'default',
    Domingo: 'default',
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
          <CardBody className="flex flex-row items-center justify-between p-4 gap-3">
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wide">Total Reservas</p>
              <p className="text-2xl font-bold text-secondary mt-0.5">{totalReservas}</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 text-primary shrink-0">
              <Icon icon="lucide:calendar-clock" width={20} />
            </div>
          </CardBody>
        </Card>
        <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
          <CardBody className="flex flex-row items-center justify-between p-4 gap-3">
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wide">Salas en Uso</p>
              <p className="text-2xl font-bold text-secondary mt-0.5">{salasUsadas}</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-warning-100 dark:bg-warning-900/30 text-warning shrink-0">
              <Icon icon="lucide:door-open" width={20} />
            </div>
          </CardBody>
        </Card>
        <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
          <CardBody className="flex flex-row items-center justify-between p-4 gap-3">
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wide">Secciones Activas</p>
              <p className="text-2xl font-bold text-secondary mt-0.5">{seccionesUsadas}</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-success-100 dark:bg-success-900/30 text-success shrink-0">
              <Icon icon="lucide:users" width={20} />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabla + filtros */}
      <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
        <CardHeader className="px-6 pt-5 pb-3 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary">
              <Icon icon="lucide:table-2" width={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-secondary dark:text-foreground">Reservas Registradas</h3>
              <p className="text-xs text-default-400">
                Mostrando {reservasFiltradas.length} de {totalReservas} reservas
              </p>
            </div>
            <Button
              size="sm"
              color="warning"
              variant="solid"
              className="ml-auto font-bold text-white shadow-sm"
              startContent={<Icon icon="lucide:plus" width={16} />}
              onPress={onModalOpen}
            >
              Nueva Sala
            </Button>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Filtro por día */}
            <div className="flex flex-wrap gap-1.5">
              <Chip
                variant={filtroDia === 'Todos' ? 'solid' : 'flat'}
                color={filtroDia === 'Todos' ? 'primary' : 'default'}
                className="cursor-pointer font-semibold"
                onClick={() => setFiltroDia('Todos')}
              >
                Todos
              </Chip>
              {DIAS_SEMANA.map((dia) => (
                <Chip
                  key={dia}
                  variant={filtroDia === dia ? 'solid' : 'flat'}
                  color={filtroDia === dia ? diaColors[dia] : 'default'}
                  className="cursor-pointer font-medium"
                  onClick={() => setFiltroDia(dia)}
                >
                  {dia}
                </Chip>
              ))}
            </div>
            {/* Filtro por sala */}
            <Input
              placeholder="Buscar sala..."
              value={filtroSala}
              onValueChange={setFiltroSala}
              variant="bordered"
              size="sm"
              className="sm:w-52 ml-auto"
              startContent={<Icon icon="lucide:search" className="text-default-400" width={16} />}
              isClearable
              onClear={() => setFiltroSala('')}
            />
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="p-0">
          <Table
            aria-label="Reservas de salas por sección"
            removeWrapper
            layout="fixed"
            classNames={{
              th: 'bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs h-10',
              td: 'py-2.5 border-b border-default-50 dark:border-default-50/10 group-data-[last=true]:border-none px-4',
            }}
          >
            <TableHeader>
              <TableColumn width="6%" align="center">ID</TableColumn>
              <TableColumn width="28%">SECCIÓN</TableColumn>
              <TableColumn width="22%">SALA</TableColumn>
              <TableColumn width="13%" align="center">DÍA</TableColumn>
              <TableColumn width="9%" align="center">BLOQUE</TableColumn>
              <TableColumn width="11%" align="center">INICIO</TableColumn>
              <TableColumn width="11%" align="center">FIN</TableColumn>
            </TableHeader>
            <TableBody emptyContent={
              <div className="py-10 text-center text-default-400">
                <Icon icon="lucide:calendar-x" width={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay reservas para el filtro seleccionado</p>
              </div>
            }>
              {reservasFiltradas.map((reserva) => (
                <TableRow key={reserva.idReservaSala} className="hover:bg-default-50 dark:hover:bg-default-50/10 transition-colors">
                  <TableCell className="text-center">
                    <Chip size="sm" variant="flat" color="default" className="font-bold text-xs">
                      #{reserva.idReservaSala}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-sm text-secondary dark:text-foreground leading-tight">
                      {reserva.nombreSeccion}
                    </p>
                    <p className="text-xs text-default-400">ID: {reserva.idSeccion}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Chip size="sm" variant="flat" color="primary" className="font-mono font-bold text-xs shrink-0">
                        {reserva.codSala}
                      </Chip>
                      <span className="text-sm text-default-600 truncate">{reserva.nombreSala}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Chip size="sm" variant="flat" color={diaColors[reserva.diaSemana]} className="font-medium text-xs">
                      {reserva.diaSemana}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-bold text-default-700">B{reserva.numeroBloque}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-mono text-default-600">{reserva.horaInicio}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-mono text-default-600">{reserva.horaFin}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Badge de datos mock */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-default-100 dark:bg-default-50/20 border border-default-200 dark:border-default-100 w-fit">
        <Icon icon="lucide:database" className="text-default-400" width={16} />
        <p className="text-xs text-default-500">
          Datos de ejemplo — pendiente de conexión con backend (<code className="font-mono">reserva_sala</code>)
        </p>
      </div>

      {/* Modal: Nueva Sala */}
      <Modal isOpen={isModalOpen} onOpenChange={onModalOpenChange} size="sm" placement="center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-warning-100 text-warning-600">
                  <Icon icon="lucide:door-open" width={18} />
                </div>
                <span className="font-bold text-secondary dark:text-white">Nueva Sala</span>
              </ModalHeader>
              <ModalBody className="py-6">
                <div className="flex flex-col gap-3">
                  <Input
                    label="Código de sala"
                    placeholder="Ej: LG1, AULA-01"
                    variant="bordered"
                    size="sm"
                    startContent={<Icon icon="lucide:hash" className="text-default-400" width={16} />}
                  />
                  <Input
                    label="Nombre de sala"
                    placeholder="Ej: Laboratorio de Gastronomía"
                    variant="bordered"
                    size="sm"
                    startContent={<Icon icon="lucide:school" className="text-default-400" width={16} />}
                  />
                </div>
                <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
                  <Icon icon="lucide:construction" className="text-warning-500 shrink-0" width={16} />
                  <p className="text-xs text-warning-700 dark:text-warning-400">
                    Creación de salas pendiente de integración con backend.
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" className="font-medium" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="warning" variant="solid" className="font-bold text-white" isDisabled onPress={onClose}>
                  Crear Sala
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default AdminSistemaPage;
