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
import { obtenerBloquesHorarioService, reasignarBloquesService, restaurarBloquesDefaultService, IBloqueReasignar } from '../services/bloque-horario-service';
import { ISemana } from '../types/semana.types';
import { obtenerSemanasService, generarCalendarioService, obtenerAniosFiltroService, invalidarCacheSemanas, reasignarCalendarioService } from '../services/semana-service';

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
                onBloquesChange={setBloques}
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

// ─── CONSTANTES: BLOQUES PREDETERMINADOS ─────────────────────────────────────

const BLOQUES_DEFAULT_TIMES = [
  { horaInicio: '08:01', horaFin: '08:40' },
  { horaInicio: '08:41', horaFin: '09:20' },
  { horaInicio: '09:31', horaFin: '10:10' },
  { horaInicio: '10:11', horaFin: '10:50' },
  { horaInicio: '11:01', horaFin: '11:40' },
  { horaInicio: '11:41', horaFin: '12:20' },
  { horaInicio: '12:31', horaFin: '13:10' },
  { horaInicio: '13:11', horaFin: '13:50' },
  { horaInicio: '14:01', horaFin: '14:40' },
  { horaInicio: '14:41', horaFin: '15:20' },
  { horaInicio: '15:31', horaFin: '16:10' },
  { horaInicio: '16:11', horaFin: '16:50' },
  { horaInicio: '17:01', horaFin: '17:40' },
  { horaInicio: '17:41', horaFin: '18:20' },
  { horaInicio: '18:21', horaFin: '19:00' },
  { horaInicio: '19:01', horaFin: '19:40' },
  { horaInicio: '19:41', horaFin: '20:20' },
  { horaInicio: '20:21', horaFin: '21:00' },
  { horaInicio: '21:01', horaFin: '21:40' },
  { horaInicio: '21:41', horaFin: '22:10' },
];

// ─── HELPERS: TIEMPO ──────────────────────────────────────────────────────────

const timeToMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

const minutesToHHmm = (mins: number): string => {
  const clamped = Math.max(0, Math.min(mins, 23 * 60 + 59));
  return `${Math.floor(clamped / 60).toString().padStart(2, '0')}:${(clamped % 60).toString().padStart(2, '0')}`;
};

// ─── MODAL: REASIGNAR BLOQUES ─────────────────────────────────────────────────

interface EditableBloque {
  key: number;
  idBloque?: number;
  horaInicio: string; // HH:mm
  horaFin: string;    // HH:mm
}

interface ReasignarBloquesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bloquesActuales: IBloqueHorario[];
  onSuccess: (bloques: IBloqueHorario[]) => void;
}

const ReasignarBloquesModal: React.FC<ReasignarBloquesModalProps> = ({
  isOpen, onOpenChange, bloquesActuales, onSuccess,
}) => {
  const toast = useToast();
  const nextKey = React.useRef(0);
  const [bloques, setBloques] = React.useState<EditableBloque[]>([]);
  const [confirmarTexto, setConfirmarTexto] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setBloques(
        bloquesActuales.map((b) => ({
          key: nextKey.current++,
          idBloque: b.idBloque,
          horaInicio: b.horaInicio.substring(0, 5),
          horaFin: b.horaFin.substring(0, 5),
        }))
      );
      setConfirmarTexto('');
    }
  }, [isOpen, bloquesActuales]);

  // Por cada bloque: null si válido, string con el error si hay conflicto
  const validationErrors = React.useMemo((): (string | null)[] => {
    return bloques.map((b, i) => {
      const inicioMins = timeToMinutes(b.horaInicio);
      const finMins = timeToMinutes(b.horaFin);
      if (finMins <= inicioMins) {
        return 'La hora de fin debe ser posterior a la hora de inicio';
      }
      if (i > 0) {
        const prevFin = timeToMinutes(bloques[i - 1].horaFin);
        if (inicioMins <= prevFin) {
          return `Debe iniciar al menos 1 min después del bloque anterior (mín. ${minutesToHHmm(prevFin + 1)})`;
        }
      }
      return null;
    });
  }, [bloques]);

  const hasErrors = validationErrors.some((e) => e !== null);
  const canSubmit = !hasErrors && confirmarTexto.trim().toUpperCase() === 'CONFIRMAR' && bloques.length > 0;

  const handleAdd = () => {
    const last = bloques[bloques.length - 1];
    const baseMin = last ? timeToMinutes(last.horaFin) : timeToMinutes('08:00');
    setBloques((prev) => [
      ...prev,
      { key: nextKey.current++, horaInicio: minutesToHHmm(baseMin + 1), horaFin: minutesToHHmm(baseMin + 40) },
    ]);
  };

  const handleRemove = (key: number) => {
    setBloques((prev) => prev.filter((b) => b.key !== key));
  };

  const handleUpdate = (key: number, field: 'horaInicio' | 'horaFin', value: string) => {
    setBloques((prev) => prev.map((b) => (b.key === key ? { ...b, [field]: value } : b)));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const payload: IBloqueReasignar[] = bloques.map((b, i) => ({
        idBloque: b.idBloque,
        numeroBloque: i + 1,
        horaInicio: b.horaInicio + ':00',
        horaFin: b.horaFin + ':00',
      }));
      const updated = await reasignarBloquesService(payload);
      onSuccess(updated);
      toast.success(`${updated.length} bloques horarios actualizados correctamente`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al reasignar los bloques');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" placement="center" scrollBehavior="inside">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2 border-b border-default-100 pb-3">
              <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary">
                <Icon icon="lucide:clock-4" width={18} />
              </div>
              <span className="font-bold text-secondary dark:text-foreground">Reasignar Bloques Horarios</span>
              <Chip size="sm" variant="flat" color="default" className="ml-1">{bloques.length} bloques</Chip>
            </ModalHeader>

            <ModalBody className="px-5 py-4 space-y-4">
              {/* ── Lista editable ── */}
              <div className="space-y-2">
                {/* Encabezado de columnas */}
                <div className="grid grid-cols-[40px_1fr_1fr_32px] gap-2 px-1.5">
                  <span className="text-[11px] font-bold text-default-400 uppercase tracking-wide text-center">Nº</span>
                  <span className="text-[11px] font-bold text-default-400 uppercase tracking-wide text-center">Hora Inicio</span>
                  <span className="text-[11px] font-bold text-default-400 uppercase tracking-wide text-center">Hora Fin</span>
                  <span />
                </div>
                <Divider />
                {/* Filas */}
                <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                  {bloques.map((bloque, idx) => {
                    const error = validationErrors[idx];
                    return (
                      <div key={bloque.key} className="space-y-0.5">
                        <div className={`grid grid-cols-[40px_1fr_1fr_32px] gap-2 items-center p-1.5 rounded-lg transition-colors ${error ? 'bg-danger-50 dark:bg-danger-900/10' : 'hover:bg-default-50 dark:hover:bg-default-50/5'}`}>
                          <div className="flex justify-center">
                            <Chip size="sm" variant="flat" color={error ? 'danger' : 'default'} className="font-bold text-xs min-w-[30px]">
                              {idx + 1}
                            </Chip>
                          </div>
                          <Input
                            type="time"
                            size="sm"
                            variant="bordered"
                            value={bloque.horaInicio}
                            onChange={(e) => handleUpdate(bloque.key, 'horaInicio', e.target.value)}
                            color={error ? 'danger' : 'default'}
                            classNames={{ input: 'text-center font-mono font-semibold' }}
                          />
                          <Input
                            type="time"
                            size="sm"
                            variant="bordered"
                            value={bloque.horaFin}
                            onChange={(e) => handleUpdate(bloque.key, 'horaFin', e.target.value)}
                            color={error ? 'danger' : 'default'}
                            classNames={{ input: 'text-center font-mono font-semibold' }}
                          />
                          <Button
                            isIconOnly size="sm" variant="light"
                            className="text-default-300 hover:text-danger"
                            isDisabled={bloques.length <= 1}
                            onPress={() => handleRemove(bloque.key)}
                          >
                            <Icon icon="lucide:x" width={14} />
                          </Button>
                        </div>
                        {error && (
                          <p className="text-danger text-xs pl-12 flex items-center gap-1 pb-0.5">
                            <Icon icon="lucide:alert-circle" width={11} />
                            {error}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="font-semibold w-full mt-1"
                  startContent={<Icon icon="lucide:plus" width={14} />}
                  onPress={handleAdd}
                >
                  Agregar Bloque
                </Button>
              </div>

              <Divider />

              {/* ── Advertencia ── */}
              <div className="flex gap-3 p-4 rounded-xl bg-warning-50 dark:bg-warning-900/15 border border-warning-200 dark:border-warning-800">
                <Icon icon="lucide:alert-triangle" className="text-warning-600 dark:text-warning-400 shrink-0 mt-0.5" width={18} />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-warning-800 dark:text-warning-300">Advertencia: Impacto en el sistema</p>
                  <p className="text-sm text-warning-700 dark:text-warning-300 leading-relaxed">
                    Los cambios se reflejarán en <strong>todas las secciones y reservas de sala</strong> que estén asociadas a estos bloques. Esta acción no puede deshacerse automáticamente.
                  </p>
                </div>
              </div>

              {/* ── Confirmación ── */}
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
              <Button variant="light" onPress={onClose} isDisabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                color="primary"
                variant="solid"
                className="font-bold text-secondary"
                isDisabled={!canSubmit}
                isLoading={isSubmitting}
                onPress={handleSubmit}
              >
                Guardar Bloques
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

// ─── SECCIÓN: BLOQUES HORARIOS ────────────────────────────────────────────────

interface SeccionBloquesProps {
  bloques: IBloqueHorario[];
  isLoading: boolean;
  onBloquesChange: (bloques: IBloqueHorario[]) => void;
}

const SeccionBloques: React.FC<SeccionBloquesProps> = ({ bloques, isLoading, onBloquesChange }) => {
  const toast = useToast();
  const { isOpen: isReasignarOpen, onOpen: onReasignarOpen, onOpenChange: onReasignarOpenChange } = useDisclosure();
  const { isOpen: isRestaurarOpen, onOpen: onRestaurarOpen, onOpenChange: onRestaurarOpenChange } = useDisclosure();
  const { canCreate: admin_Crear } = useModulePermission('ADMIN_SISTEMA');
  const [isRestaurando, setIsRestaurando] = React.useState(false);
  const [confirmarRestaurar, setConfirmarRestaurar] = React.useState('');

  const getBloqueGroup = (bloque: IBloqueHorario): string => {
    const num = bloque.numeroBloque;
    if (num <= 6) return 'Mañana';
    if (num <= 12) return 'Tarde';
    if (num <= 14) return 'Vespertino';
    return 'Nocturno';
  };

  const groupColors: Record<string, { chip: 'primary' | 'warning' | 'secondary' | 'danger' }> = {
    'Mañana':     { chip: 'primary' },
    'Tarde':      { chip: 'warning' },
    'Vespertino': { chip: 'secondary' },
    'Nocturno':   { chip: 'danger' },
  };

  const formatTime = (time: string) => (time ? time.substring(0, 5) : '');

  const handleRestaurar = async () => {
    setIsRestaurando(true);
    try {
      const restaurados = await restaurarBloquesDefaultService();
      onBloquesChange(restaurados);
      toast.success('Bloques restaurados a los valores predeterminados');
      onRestaurarOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al restaurar los bloques predeterminados');
    } finally {
      setIsRestaurando(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1 mx-4">
        <CardHeader className="px-6 pt-5 pb-3 flex items-center gap-3 flex-wrap">
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
            <div className="ml-auto flex gap-2 flex-wrap justify-end">
              <Button
                color="default"
                variant="flat"
                size="sm"
                className="font-semibold"
                startContent={<Icon icon="lucide:rotate-ccw" width={15} />}
                onPress={() => { setConfirmarRestaurar(''); onRestaurarOpen(); }}
              >
                Restaurar predeterminados
              </Button>
              <Button
                color="primary"
                variant="solid"
                size="sm"
                className="font-bold text-secondary"
                startContent={<Icon icon="lucide:sliders-horizontal" width={15} />}
                onPress={onReasignarOpen}
              >
                Reasignar Bloques
              </Button>
            </div>
          )}
        </CardHeader>
        <Divider />
        <CardBody className="p-0">
          <Table
            aria-label="Bloques horarios"
            removeWrapper
            layout="fixed"
            classNames={{
              th: 'bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs h-10 text-center',
              td: 'py-2.5 border-b border-default-50 dark:border-default-50/10 group-data-[last=true]:border-none px-4 text-center',
            }}
          >
            <TableHeader>
              <TableColumn width="20%" align="center">BLOQUE</TableColumn>
              <TableColumn width="30%" align="center">HORA INICIO</TableColumn>
              <TableColumn width="30%" align="center">HORA FIN</TableColumn>
              <TableColumn width="20%" align="center">TURNO</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading}
              loadingContent={<Spinner label="Cargando bloques..." />}
              emptyContent={!isLoading && bloques.length === 0 ? 'No hay bloques horarios configurados' : ' '}
            >
              {bloques.map((bloque) => {
                const group = getBloqueGroup(bloque);
                const style = groupColors[group];
                return (
                  <TableRow key={bloque.idBloque || bloque.numeroBloque} className="hover:bg-default-50 dark:hover:bg-default-50/10 transition-colors">
                    <TableCell>
                      <div className="flex justify-center">
                        <Chip size="sm" variant="flat" color="default" className="font-bold">
                          {bloque.numeroBloque}
                        </Chip>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-secondary dark:text-foreground">
                      {formatTime(bloque.horaInicio)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-secondary dark:text-foreground">
                      {formatTime(bloque.horaFin)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Chip size="sm" variant="flat" color={style.chip}>{group}</Chip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Modal: Reasignar Bloques */}
      <ReasignarBloquesModal
        isOpen={isReasignarOpen}
        onOpenChange={onReasignarOpenChange}
        bloquesActuales={bloques}
        onSuccess={onBloquesChange}
      />

      {/* Modal: Confirmar restaurar */}
      <Modal isOpen={isRestaurarOpen} onOpenChange={onRestaurarOpenChange} size="sm" placement="center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Icon icon="lucide:rotate-ccw" className="text-warning" width={20} />
                <span className="font-bold">Restaurar Bloques Predeterminados</span>
              </ModalHeader>
              <ModalBody className="space-y-3 py-4">
                <div className="flex gap-3 p-3 rounded-xl bg-warning-50 dark:bg-warning-900/15 border border-warning-200 dark:border-warning-800">
                  <Icon icon="lucide:alert-triangle" className="text-warning-600 dark:text-warning-400 shrink-0 mt-0.5" width={16} />
                  <p className="text-sm text-warning-700 dark:text-warning-300 leading-relaxed">
                    Los <strong>{bloques.length} bloques actuales</strong> serán reemplazados por los <strong>20 bloques predeterminados</strong> originales del sistema. Los cambios afectarán todas las secciones y reservas asociadas.
                  </p>
                </div>
                <Input
                  label='Escriba "CONFIRMAR" para continuar'
                  placeholder="CONFIRMAR"
                  value={confirmarRestaurar}
                  onValueChange={setConfirmarRestaurar}
                  variant="bordered"
                  color={confirmarRestaurar.trim().toUpperCase() === 'CONFIRMAR' ? 'success' : 'default'}
                  endContent={confirmarRestaurar.trim().toUpperCase() === 'CONFIRMAR'
                    ? <Icon icon="lucide:check-circle" width={16} className="text-success" /> : null}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} isDisabled={isRestaurando}>
                  Cancelar
                </Button>
                <Button
                  color="warning"
                  variant="solid"
                  className="font-bold text-white"
                  isLoading={isRestaurando}
                  isDisabled={confirmarRestaurar.trim().toUpperCase() !== 'CONFIRMAR'}
                  onPress={handleRestaurar}
                >
                  Restaurar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

// ─── MODAL: REASIGNAR SEMANAS ─────────────────────────────────────────────────

interface ReasignarSemanasModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  aniosDisponibles: string[];
  filtroAnioActual: string;
  onSuccess: (anio: string, semanas: ISemana[]) => void;
}

const ReasignarSemanasModal: React.FC<ReasignarSemanasModalProps> = ({
  isOpen, onOpenChange, aniosDisponibles, filtroAnioActual, onSuccess,
}) => {
  const toast = useToast();
  const [anioSeleccionado, setAnioSeleccionado] = React.useState<string>('');
  const [semestre, setSemestre] = React.useState<1 | 2>(1);
  const [fechaSeleccionada, setFechaSeleccionada] = React.useState<DateValue | null>(null);
  const [confirmarTexto, setConfirmarTexto] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Inicializar estado al abrir el modal
  React.useEffect(() => {
    if (isOpen) {
      const anioDefault = filtroAnioActual || aniosDisponibles[0] || new Date().getFullYear().toString();
      setAnioSeleccionado(anioDefault);
      setSemestre(new Date().getMonth() + 1 <= 6 ? 1 : 2);
      setFechaSeleccionada(null);
      setConfirmarTexto('');
    }
  }, [isOpen, filtroAnioActual, aniosDisponibles]);

  // Solo lunes disponibles en el DatePicker
  const esDiaNoLunes = (date: DateValue) => {
    const jsDate = new Date(date.year, date.month - 1, date.day);
    return jsDate.getDay() !== 1;
  };

  // Preview de las 18 semanas calculadas desde la fecha seleccionada
  const previewSemanas = React.useMemo(() => {
    if (!fechaSeleccionada) return [];
    const base = new Date(fechaSeleccionada.year, fechaSeleccionada.month - 1, fechaSeleccionada.day);
    return Array.from({ length: 18 }, (_, i) => {
      const inicio = new Date(base);
      inicio.setDate(base.getDate() + i * 7);
      const fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 6);
      const toStr = (d: Date) => d.toISOString().split('T')[0];
      return { num: i + 1, inicio: toStr(inicio), fin: toStr(fin) };
    });
  }, [fechaSeleccionada]);

  const canSubmit = anioSeleccionado !== '' && fechaSeleccionada !== null && confirmarTexto.trim().toUpperCase() === 'CONFIRMAR';

  const handleSubmit = async () => {
    if (!canSubmit || !fechaSeleccionada) return;
    setIsSubmitting(true);
    try {
      const nuevaFechaInicio = `${fechaSeleccionada.year}-${String(fechaSeleccionada.month).padStart(2, '0')}-${String(fechaSeleccionada.day).padStart(2, '0')}`;
      const updatedSemanas = await reasignarCalendarioService({
        anio: parseInt(anioSeleccionado),
        semestre,
        nuevaFechaInicio,
      });
      onSuccess(anioSeleccionado, updatedSemanas);
      toast.success(`18 semanas del ${semestre}° semestre ${anioSeleccionado} reasignadas correctamente`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al reasignar el calendario semestral');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lista de años para el selector: siempre incluir al menos el año actual
  const aniosParaSelector = React.useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    return aniosDisponibles.includes(currentYear) ? aniosDisponibles : [...aniosDisponibles, currentYear].sort((a, b) => parseInt(b) - parseInt(a));
  }, [aniosDisponibles]);

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" placement="center" scrollBehavior="inside">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2 border-b border-default-100 pb-3">
              <div className="p-1.5 rounded-lg bg-warning-100 dark:bg-warning-900/30 text-warning-600">
                <Icon icon="lucide:calendar-clock" width={18} />
              </div>
              <span className="font-bold text-secondary dark:text-foreground">Reasignar Semanas Académicas</span>
            </ModalHeader>

            <ModalBody className="px-5 py-4 space-y-5">

              {/* ── Período a reasignar ── */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-default-700">Período a reasignar</p>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                  {/* Selector de año */}
                  <div className="w-36">
                    <Select
                      label="Año"
                      size="sm"
                      variant="bordered"
                      selectedKeys={anioSeleccionado ? [anioSeleccionado] : []}
                      onSelectionChange={(keys: any) => {
                        const val = Array.from(keys)[0] as string;
                        if (val) { setAnioSeleccionado(val); setFechaSeleccionada(null); }
                      }}
                      disallowEmptySelection
                    >
                      {aniosParaSelector.map((anio) => (
                        <SelectItem key={anio} textValue={anio}>{anio}</SelectItem>
                      ))}
                    </Select>
                  </div>
                  {/* Selector de semestre */}
                  <div className="flex gap-2">
                    <Button
                      variant={semestre === 1 ? 'solid' : 'bordered'}
                      color={semestre === 1 ? 'warning' : 'default'}
                      size="sm"
                      onPress={() => { setSemestre(1); setFechaSeleccionada(null); }}
                      className={semestre === 1 ? 'font-bold text-white' : 'font-medium'}
                    >
                      1° Semestre
                    </Button>
                    <Button
                      variant={semestre === 2 ? 'solid' : 'bordered'}
                      color={semestre === 2 ? 'warning' : 'default'}
                      size="sm"
                      onPress={() => { setSemestre(2); setFechaSeleccionada(null); }}
                      className={semestre === 2 ? 'font-bold text-white' : 'font-medium'}
                    >
                      2° Semestre
                    </Button>
                  </div>
                </div>
                {anioSeleccionado && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-default-100 dark:bg-default-50/20">
                    <Icon icon="lucide:info" className="text-default-400" width={13} />
                    <span className="text-xs text-default-500">
                      Reasignando: <strong className="text-secondary dark:text-foreground">{semestre}° Semestre {anioSeleccionado}</strong>
                    </span>
                  </div>
                )}
              </div>

              <Divider />

              {/* ── Nueva fecha de inicio ── */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-default-700">Nueva fecha de inicio</p>
                <p className="text-xs text-default-400">Solo los lunes están disponibles. Las 18 semanas se calcularán automáticamente.</p>
                <I18nProvider locale="es-CL">
                  <DatePicker
                    label="Fecha de inicio (lunes)"
                    value={fechaSeleccionada}
                    onChange={setFechaSeleccionada}
                    isDateUnavailable={esDiaNoLunes}
                    variant="bordered"
                    className="max-w-xs"
                    showMonthAndYearPickers
                  />
                </I18nProvider>
              </div>

              {/* ── Vista previa de semanas ── */}
              {previewSemanas.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-default-700">Vista previa — 18 semanas a generar</p>
                    <Chip size="sm" variant="flat" color="warning">18 semanas</Chip>
                  </div>
                  <div className="border border-default-200 dark:border-default-100 rounded-xl overflow-hidden">
                    {/* Cabecera */}
                    <div className="grid grid-cols-3 bg-default-100 dark:bg-default-50/20 px-4 py-2">
                      <span className="text-[11px] font-bold text-default-500 uppercase tracking-wide text-center">Semana</span>
                      <span className="text-[11px] font-bold text-default-500 uppercase tracking-wide text-center">Inicio</span>
                      <span className="text-[11px] font-bold text-default-500 uppercase tracking-wide text-center">Fin</span>
                    </div>
                    {/* Filas */}
                    <div className="max-h-[200px] overflow-y-auto divide-y divide-default-50 dark:divide-default-50/10">
                      {previewSemanas.map((s) => (
                        <div key={s.num} className="grid grid-cols-3 px-4 py-1.5 hover:bg-default-50 dark:hover:bg-default-50/5 transition-colors">
                          <span className="text-center text-xs font-bold text-default-700">S{s.num}</span>
                          <span className="text-center text-xs font-mono text-default-600">{formatDate(s.inicio)}</span>
                          <span className="text-center text-xs font-mono text-default-600">{formatDate(s.fin)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Divider />

              {/* ── Advertencia ── */}
              <div className="flex gap-3 p-4 rounded-xl bg-warning-50 dark:bg-warning-900/15 border border-warning-200 dark:border-warning-800">
                <Icon icon="lucide:alert-triangle" className="text-warning-600 dark:text-warning-400 shrink-0 mt-0.5" width={18} />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-warning-800 dark:text-warning-300">Advertencia: Impacto en todo el sistema</p>
                  <p className="text-sm text-warning-700 dark:text-warning-300 leading-relaxed">
                    Alterar las semanas del período académico se reflejará en <strong>todo el sistema</strong> donde la semana estaba previamente asociada, incluyendo <strong>solicitudes</strong> y <strong>conglomerados de pedido</strong>. Esta acción no puede deshacerse automáticamente.
                  </p>
                </div>
              </div>

              {/* ── Confirmación ── */}
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
              <Button variant="light" onPress={onClose} isDisabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                color="warning"
                variant="solid"
                className="font-bold text-white"
                isDisabled={!canSubmit}
                isLoading={isSubmitting}
                onPress={handleSubmit}
              >
                Reasignar Semanas
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
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

  // Callback llamado por ReasignarSemanasModal tras éxito
  // updatedSemanas contiene TODAS las semanas del año de la nueva fecha (backend devuelve año completo)
  const handleReasignarSuccess = (anioSolicitado: string, updatedSemanas: ISemana[]) => {
    // Determinar el año real de los datos devueltos (puede diferir si la nueva fecha es otro año)
    const anioReal = updatedSemanas.length > 0
      ? updatedSemanas[0].anio.toString()
      : anioSolicitado;
    invalidarCacheSemanas(parseInt(anioSolicitado));
    if (anioReal !== anioSolicitado) invalidarCacheSemanas(parseInt(anioReal));
    setFiltroAnio(anioReal);
    setSemanas(updatedSemanas);
  };

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

      {/* Modal: Reasignar Semanas */}
      <ReasignarSemanasModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        aniosDisponibles={aniosDisponibles}
        filtroAnioActual={filtroAnio}
        onSuccess={handleReasignarSuccess}
      />
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
