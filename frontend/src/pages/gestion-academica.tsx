import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
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
  Textarea,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { usePageTitle } from '../hooks/usePageTitle';
import { logger } from '../utils/logger';
import { useNotifications } from '../utils/notifications';
import { useModulePermission, usePermission } from '../contexts/permission-context';
import { useHistory } from 'react-router-dom';

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
import { obtenerSalasActivasService, ISala, crearSalaService, actualizarSalaService, eliminarSalaService } from '../services/sala-service';
import { filtrarBloquesPorSalaYDiaService, IBloqueDisponible, obtenerBloquesReservadosPorDocenteService } from '../services/bloque-horario-service';
import { obtenerUsuariosService, obtenerUsuariosGestoresAsignaturaService, obtenerUsuariosAsignadosSeccionService } from '../services/usuario-service';
import { IReservaActiva, DIA_DISPLAY, obtenerReservasActivasService } from '../services/reserva-sala-service';

const DIAS_ABREV: Record<string, string> = {
  LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié',
  JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom'
};

// ─── SALA Y RESERVAS: CONSTANTES ─────────────────────────────────────────────

type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
const DIAS_SEMANA: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_COD = 50;
const MAX_NOMBRE = 100;
let _reservasCache: { data: IReservaActiva[]; ts: number } | null = null;
let _salasCache: { data: ISala[]; ts: number } | null = null;

// ─── COMPONENTE: RESERVAS REGISTRADAS ────────────────────────────────────────

const SeccionReservas: React.FC = () => {
  const toast = useToast();
  const [reservas, setReservas] = React.useState<IReservaActiva[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [filtroDia, setFiltroDia] = React.useState<DiaSemana | 'Todos'>('Todos');
  const [filtroTexto, setFiltroTexto] = React.useState('');

  React.useEffect(() => {
    const now = Date.now();
    if (_reservasCache && now - _reservasCache.ts < CACHE_TTL_MS) {
      setReservas(_reservasCache.data);
      setIsLoading(false);
    } else {
      obtenerReservasActivasService()
        .then((data) => {
          _reservasCache = { data, ts: Date.now() };
          setReservas(data);
        })
        .catch((err: Error) => {
          const msg = err.message || 'Error al cargar las reservas';
          setErrorMsg(msg);
          toast.error(msg);
        })
        .finally(() => setIsLoading(false));
    }
  }, []);

  const reservasFiltradas = reservas.filter((r) => {
    const diaDisplay = DIA_DISPLAY[r.diaSemana] ?? r.diaSemana;
    const matchDia = filtroDia === 'Todos' || diaDisplay === filtroDia;
    const q = filtroTexto.trim().toLowerCase();
    const matchTexto =
      q === '' ||
      r.nombreAsignatura.toLowerCase().includes(q) ||
      r.nombreSeccion.toLowerCase().includes(q) ||
      r.codSala.toLowerCase().includes(q) ||
      r.nombreSala.toLowerCase().includes(q);
    return matchDia && matchTexto;
  });

  const totalReservas = reservas.length;
  const salasUsadas = new Set(reservas.map((r) => r.codSala)).size;
  const seccionesUsadas = new Set(reservas.map((r) => r.nombreSeccion)).size;

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
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
            <Input
              placeholder="Buscar asignatura, sección o sala..."
              value={filtroTexto}
              onValueChange={setFiltroTexto}
              variant="bordered"
              size="sm"
              className="sm:w-80 ml-auto"
              startContent={<Icon icon="lucide:search" className="text-default-400" width={16} />}
              isClearable
              onClear={() => setFiltroTexto('')}
            />
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Spinner size="lg" color="primary" />
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center py-16 gap-3 text-danger">
              <Icon icon="lucide:alert-triangle" width={32} className="opacity-70" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          ) : (
            <Table
              aria-label="Gestión Sala y Reservas"
              removeWrapper
              layout="fixed"
              classNames={{
                th: 'bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs h-10 text-center',
                td: 'py-2.5 border-b border-default-50 dark:border-default-50/10 group-data-[last=true]:border-none px-4 text-center',
              }}
            >
              <TableHeader>
                <TableColumn width="22%" align="center">ASIGNATURA</TableColumn>
                <TableColumn width="24%" align="center">SECCIÓN</TableColumn>
                <TableColumn width="20%" align="center">SALA</TableColumn>
                <TableColumn width="13%" align="center">DÍA</TableColumn>
                <TableColumn width="21%" align="center">BLOQUE / HORARIO</TableColumn>
              </TableHeader>
              <TableBody emptyContent={
                <div className="py-10 text-center text-default-400">
                  <Icon icon="lucide:calendar-x" width={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay reservas para el filtro seleccionado</p>
                </div>
              }>
                {reservasFiltradas.map((reserva, idx) => {
                  const diaDisplay = (DIA_DISPLAY[reserva.diaSemana] ?? reserva.diaSemana) as DiaSemana;
                  return (
                    <TableRow key={idx} className="hover:bg-default-50 dark:hover:bg-default-50/10 transition-colors">
                      <TableCell>
                        <p className="font-semibold text-sm text-secondary dark:text-foreground leading-tight truncate" title={reserva.nombreAsignatura}>
                          {reserva.nombreAsignatura}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-default-700 leading-tight truncate" title={reserva.nombreSeccion}>{reserva.nombreSeccion}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-center">
                          <Chip size="sm" variant="flat" color="primary" className="font-mono font-bold text-xs shrink-0">
                            {reserva.codSala}
                          </Chip>
                          <span className="text-sm text-default-600 truncate" title={reserva.nombreSala}>{reserva.nombreSala}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Chip size="sm" variant="flat" color={diaColors[diaDisplay]} className="font-medium text-xs">
                          {diaDisplay}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-bold text-default-700 mr-1">B{reserva.numeroBloque}</span>
                        <span className="text-xs font-mono text-default-500">{reserva.horaInicio} – {reserva.horaFin}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

// ─── COMPONENTE: GESTIÓN DE SALAS ────────────────────────────────────────────

const SeccionGestionSalas: React.FC = () => {
  const toast = useToast();
  const { canCreate: salaCrear }  = useModulePermission('GA_CREAR_SALA');
  const { canUpdate: salaEditar } = useModulePermission('GA_EDITAR_SALA');
  const { canDelete: salaEliminar } = useModulePermission('GA_ELIMINAR_SALA');
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onOpenChange: onCreateOpenChange } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onOpenChange: onEditOpenChange } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange } = useDisclosure();

  const [salas, setSalas] = React.useState<ISala[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [filtroSala, setFiltroSala] = React.useState('');
  const [formCod, setFormCod] = React.useState('');
  const [formNombre, setFormNombre] = React.useState('');
  const [editId, setEditId] = React.useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ISala | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const now = Date.now();
    if (_salasCache && now - _salasCache.ts < CACHE_TTL_MS) {
      setSalas(_salasCache.data);
      setIsLoading(false);
    } else {
      obtenerSalasActivasService()
        .then((data) => {
          _salasCache = { data, ts: Date.now() };
          setSalas(data);
        })
        .catch((err: Error) => toast.error(err.message))
        .finally(() => setIsLoading(false));
    }
  }, []);

  const salasFiltradas = salas.filter(
    (s) =>
      filtroSala.trim() === '' ||
      s.codSala.toLowerCase().includes(filtroSala.toLowerCase()) ||
      s.nombreSala.toLowerCase().includes(filtroSala.toLowerCase())
  );

  const openCreate = () => { setFormCod(''); setFormNombre(''); onCreateOpen(); };
  const openEdit = (sala: ISala) => { setEditId(sala.idSala); setFormCod(sala.codSala); setFormNombre(sala.nombreSala); onEditOpen(); };
  const openDelete = (sala: ISala) => { setDeleteTarget(sala); onDeleteOpen(); };

  const handleCreate = async (onClose: () => void) => {
    if (!formCod.trim() || !formNombre.trim()) return;
    setIsSubmitting(true);
    try {
      const nueva = await crearSalaService({ codSala: formCod, nombreSala: formNombre });
      setSalas((prev) => { const next = [...prev, nueva]; _salasCache = { data: next, ts: Date.now() }; return next; });
      toast.success('Sala creada correctamente');
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setIsSubmitting(false); }
  };

  const handleEdit = async (onClose: () => void) => {
    if (!editId || !formCod.trim() || !formNombre.trim()) return;
    setIsSubmitting(true);
    try {
      const updated = await actualizarSalaService(editId, { codSala: formCod, nombreSala: formNombre });
      setSalas((prev) => { const next = prev.map((s) => (s.idSala === editId ? updated : s)); _salasCache = { data: next, ts: Date.now() }; return next; });
      toast.success('Sala actualizada correctamente');
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (onClose: () => void) => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await eliminarSalaService(deleteTarget.idSala);
      setSalas((prev) => { const next = prev.filter((s) => s.idSala !== deleteTarget.idSala); _salasCache = { data: next, ts: Date.now() }; return next; });
      toast.success('Sala desactivada correctamente');
      onClose();
    } catch (err: any) { toast.error(err.message); onClose(); }
    finally { setIsSubmitting(false); }
  };

  const canSubmitForm = formCod.trim().length > 0 && formNombre.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="p-2.5 rounded-xl bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400 shrink-0">
          <Icon icon="lucide:building-2" width={22} />
        </div>
        <div className="shrink-0">
          <h3 className="font-bold text-base text-secondary dark:text-foreground leading-tight">Salas Activas</h3>
          <p className="text-xs text-default-400">
            {filtroSala.trim() !== '' && salasFiltradas.length !== salas.length
              ? `${salasFiltradas.length} resultado${salasFiltradas.length !== 1 ? 's' : ''} · ${salas.length} totales`
              : `${salas.length} sala${salas.length !== 1 ? 's' : ''} registrada${salas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {salaCrear && (
          <Button size="sm" color="warning" variant="solid" className="font-bold text-white shadow-sm shrink-0" startContent={<Icon icon="lucide:plus" width={16} />} onPress={openCreate}>
            Nueva Sala
          </Button>
        )}
        <Input
          placeholder="Buscar sala..."
          value={filtroSala}
          onValueChange={setFiltroSala}
          variant="bordered"
          size="sm"
          className="w-48"
          startContent={<Icon icon="lucide:search" className="text-default-400" width={15} />}
          isClearable
          onClear={() => setFiltroSala('')}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20"><Spinner size="lg" color="warning" /></div>
      ) : salasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-default-400">
          <div className="p-4 rounded-2xl bg-default-100 dark:bg-default-50/10 mb-3">
            <Icon icon="lucide:building-2" width={36} className="opacity-40" />
          </div>
          <p className="text-sm font-medium">{filtroSala.trim() !== '' ? 'Sin resultados para esa búsqueda' : 'No hay salas registradas'}</p>
          {filtroSala.trim() !== '' && (
            <button onClick={() => setFiltroSala('')} className="mt-1 text-xs text-warning-500 hover:underline cursor-pointer">Limpiar búsqueda</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {salasFiltradas.map((sala) => (
            <Card key={sala.idSala} className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1 hover:shadow-md transition-shadow">
              <CardBody className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-warning-50 dark:bg-warning-900/20 text-warning-500">
                    <Icon icon="lucide:door-open" width={18} />
                  </div>
                  <Chip size="sm" variant="flat" color="warning" className="font-mono font-bold text-xs max-w-[120px] truncate">
                    {sala.codSala}
                  </Chip>
                </div>
                <p className="text-sm font-semibold text-default-700 dark:text-default-300 truncate mb-3" title={sala.nombreSala}>
                  {sala.nombreSala}
                </p>
                <div className="flex items-center gap-1.5">
                  {salaEditar && (
                    <Button size="sm" variant="flat" color="primary" className="flex-1 font-medium text-xs" startContent={<Icon icon="lucide:pencil" width={13} />} onPress={() => openEdit(sala)}>
                      Editar
                    </Button>
                  )}
                  {salaEliminar && (
                    <Button isIconOnly size="sm" variant="flat" color="danger" onPress={() => openDelete(sala)} aria-label="Desactivar">
                      <Icon icon="lucide:trash-2" width={14} />
                    </Button>
                  )}
                  {!salaEditar && !salaEliminar && <span className="text-xs text-default-400 italic">Solo lectura</span>}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isCreateOpen} onOpenChange={onCreateOpenChange} size="sm" placement="center" scrollBehavior="inside" classNames={{ base: "max-h-[75vh]" }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-warning-100 text-warning-600"><Icon icon="lucide:plus-circle" width={18} /></div>
                <span className="font-bold text-secondary dark:text-white">Nueva Sala</span>
              </ModalHeader>
              <ModalBody className="py-4 flex flex-col gap-3 overflow-y-scroll custom-scrollbar">
                <Input label="Código de sala" placeholder="Ej: LG1, AULA-01" variant="bordered" value={formCod} onValueChange={(v) => { if (v.length <= MAX_COD) setFormCod(v); }} description={`${formCod.length}/${MAX_COD} caracteres`} startContent={<Icon icon="lucide:hash" className="text-default-400" width={16} />} />
                <Input label="Nombre de sala" placeholder="Ej: Laboratorio de Gastronomía" variant="bordered" value={formNombre} onValueChange={(v) => { if (v.length <= MAX_NOMBRE) setFormNombre(v); }} description={`${formNombre.length}/${MAX_NOMBRE} caracteres`} startContent={<Icon icon="lucide:building-2" className="text-default-400" width={16} />} />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" className="font-medium" onPress={onClose} isDisabled={isSubmitting}>Cancelar</Button>
                <Button color="warning" variant="solid" className="font-bold text-white" isDisabled={!canSubmitForm || isSubmitting} isLoading={isSubmitting} onPress={() => handleCreate(onClose)}>Crear Sala</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isEditOpen} onOpenChange={onEditOpenChange} size="sm" placement="center" scrollBehavior="inside" classNames={{ base: "max-h-[75vh]" }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary-100 text-primary-600"><Icon icon="lucide:pencil" width={18} /></div>
                <span className="font-bold text-secondary dark:text-white">Editar Sala</span>
              </ModalHeader>
              <ModalBody className="py-4 flex flex-col gap-3 overflow-y-scroll custom-scrollbar">
                <Input label="Código de sala" variant="bordered" value={formCod} onValueChange={(v) => { if (v.length <= MAX_COD) setFormCod(v); }} description={`${formCod.length}/${MAX_COD} caracteres`} startContent={<Icon icon="lucide:hash" className="text-default-400" width={16} />} />
                <Input label="Nombre de sala" variant="bordered" value={formNombre} onValueChange={(v) => { if (v.length <= MAX_NOMBRE) setFormNombre(v); }} description={`${formNombre.length}/${MAX_NOMBRE} caracteres`} startContent={<Icon icon="lucide:building-2" className="text-default-400" width={16} />} />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" className="font-medium" onPress={onClose} isDisabled={isSubmitting}>Cancelar</Button>
                <Button color="primary" variant="solid" className="font-bold" isDisabled={!canSubmitForm || isSubmitting} isLoading={isSubmitting} onPress={() => handleEdit(onClose)}>Guardar Cambios</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange} size="sm" placement="center" radius="lg" backdrop="blur" isDismissable={!isSubmitting} classNames={{ base: 'rounded-2xl overflow-hidden', closeButton: 'hover:bg-default-100 cursor-pointer' }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-danger-100 text-danger-600"><Icon icon="lucide:alert-triangle" width={18} /></div>
                <span className="font-bold text-secondary dark:text-white">Desactivar Sala</span>
              </ModalHeader>
              <ModalBody className="py-4 flex flex-col gap-3">
                <p className="text-sm text-default-600">
                  Vas a desactivar{' '}
                  <span className="font-bold text-secondary dark:text-foreground">{deleteTarget?.codSala} — {deleteTarget?.nombreSala}</span>. Esta acción solo se permite si la sala no tiene reservas activas.
                </p>
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
                  <Icon icon="lucide:info" className="text-danger-500 shrink-0 mt-0.5" width={15} />
                  <p className="text-xs text-danger-700 dark:text-danger-400">Si la sala tiene reservas vinculadas, el sistema rechazará la operación automáticamente.</p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" className="font-medium" onPress={onClose} isDisabled={isSubmitting}>Cancelar</Button>
                <Button color="danger" variant="solid" className="font-bold" isLoading={isSubmitting} isDisabled={isSubmitting} onPress={() => handleDelete(onClose)}>Desactivar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

// ─── WRAPPER: TOGGLE RESERVAS / GESTIÓN SALAS ────────────────────────────────

const SeccionGestionSalaYReservas: React.FC = () => {
  const [vista, setVista] = React.useState<'reservas' | 'salas'>('reservas');
  const { canRead: verReservas }     = useModulePermission('GA_VER_RESERVAS');
  const { canRead: verGestionSalas } = useModulePermission('GA_VER_SALAS');
  const { isLoading: permLoading }   = usePermission();

  // Si el usuario solo tiene acceso a la vista de Salas (sin Reservas), redirigir
  React.useEffect(() => {
    if (!permLoading && !verReservas && verGestionSalas) {
      setVista('salas');
    }
  }, [permLoading, verReservas, verGestionSalas]);

  return (
    <div className="space-y-4">
      {(verReservas || verGestionSalas) && (
        <div className="flex items-center gap-1 bg-default-100 rounded-lg p-1 w-fit">
          {verReservas && (
            <button
              onClick={() => setVista('reservas')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${vista === 'reservas' ? 'bg-white shadow-sm text-primary dark:bg-content2 dark:text-primary' : 'text-default-500 hover:text-default-700'}`}
            >
              <span className="flex items-center gap-1.5">
                <Icon icon="lucide:calendar-clock" width={12} />
                Reservas Registradas
              </span>
            </button>
          )}
          {verGestionSalas && (
            <button
              onClick={() => setVista('salas')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${vista === 'salas' ? 'bg-white shadow-sm text-warning dark:bg-content2 dark:text-warning' : 'text-default-500 hover:text-default-700'}`}
            >
              <span className="flex items-center gap-1.5">
                <Icon icon="lucide:building-2" width={12} />
                Gestión Salas
              </span>
            </button>
          )}
        </div>
      )}
      {vista === 'reservas' && verReservas     && <SeccionReservas />}
      {vista === 'salas'    && verGestionSalas && <SeccionGestionSalas />}
    </div>
  );
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
  const [currentView, setCurrentView] = React.useState<'academica' | 'salas'>('academica');
  usePageTitle(
    currentView === 'academica' ? 'Gestión Académica' : 'Gestión Sala y Reservas',
    currentView === 'academica'
      ? 'Administre asignaturas, secciones y asignaciones de gestores. Las recetas se multiplicarán por el total de alumnos activos.'
      : 'Consulte las reservas activas y administre las salas del sistema.',
    currentView === 'academica' ? 'lucide:graduation-cap' : 'lucide:calendar-clock'
  );
  const toast = useToast();
  const { showConfirm } = useNotifications();
  const { isLoading: permLoading } = usePermission();
  const { canRead: verAcademicaDirecta }   = useModulePermission('GESTION_ACADEMICA');
  const { canRead: verAcademicaVista }     = useModulePermission('GA_VER_ASIGNATURA');
  const verAcademica = verAcademicaDirecta || verAcademicaVista;
  const { canCreate: ramos_Crear }         = useModulePermission('GA_CREAR_ASIGNATURA');
  const { canCreate: secciones_Crear }     = useModulePermission('GA_CREAR_SECCION');
  const { canUpdate: ramos_Editar }        = useModulePermission('GA_EDITAR_ASIGNATURA');
  const { canDelete: ramos_Eliminar }      = useModulePermission('GA_ELIMINAR_ASIGNATURA');
  const { canUpdate: secciones_Editar }    = useModulePermission('GA_EDITAR_SECCION');
  const { canDelete: secciones_Eliminar }  = useModulePermission('GA_ELIMINAR_SECCION');
  const { canRead: verReservas }       = useModulePermission('GA_VER_RESERVAS');
  const { canRead: verGestionSalas }   = useModulePermission('GA_VER_SALAS');
  const verSalaPanel = verReservas || verGestionSalas;

  // Si el rol solo tiene acceso a "Sala y Reservas" (sin Gestión Académica),
  // redirige automáticamente a esa vista al cargar (OR-gate, patrón Proveedores).
  React.useEffect(() => {
    if (!permLoading && !verAcademica && verSalaPanel) {
      setCurrentView('salas');
    }
  }, [permLoading, verAcademica, verSalaPanel]);
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
    if (!permLoading && verAcademica) {
      cargarDatos();
    } else if (!permLoading && !verAcademica) {
      setIsLoading(false);
    }
  }, [cargarDatos, permLoading, verAcademica]);

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
    <>
      <div className="flex h-[calc(100vh-76px)] overflow-hidden font-sans relative -mt-6">
        <div className="flex-grow overflow-y-auto bg-default-50/50 dark:bg-background scrollbar-hide">
          <AnimatePresence mode="wait">
            {currentView === 'academica' ? (
              <motion.div
                key="academica"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="container mx-auto px-4 py-8"
              >
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
          {ramos_Crear && (
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
          )}
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
                    <div
                      className="flex items-center justify-between p-4 border-b border-default-200 cursor-pointer hover:bg-default-50 dark:hover:bg-default-100/10 transition-colors select-none"
                      onClick={() => toggleRowExpansion(asignatura.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center">
                          <Icon
                            icon={expandedRows.has(asignatura.id) ? "lucide:chevron-down" : "lucide:chevron-right"}
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
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {ramos_Editar && (
                          <Button
                            isIconOnly
                            variant="light"
                            size="md"
                            onPress={() => editarAsignatura(asignatura)}
                          >
                            <Icon icon="lucide:edit" width={18} className="text-default-400 hover:text-primary" />
                          </Button>
                          )}
                          {ramos_Eliminar && (
                          <Button
                            isIconOnly
                            variant="light"
                            size="md"
                            onPress={() => eliminarAsignatura(asignatura.id, asignatura.nombre)}
                          >
                            <Icon icon="lucide:trash-2" width={18} className="text-default-400 hover:text-danger" />
                          </Button>
                          )}
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
                                      {secciones_Editar && (
                                      <Button isIconOnly variant="light" size="md" onPress={() => editarSeccion(asignatura, seccion)}>
                                        <Icon icon="lucide:edit" width={18} className="text-default-400 hover:text-primary" />
                                      </Button>
                                      )}
                                      {secciones_Eliminar && (
                                      <Button isIconOnly variant="light" size="md" onPress={() => eliminarSeccion(asignatura.id, seccion.id, seccion.numeroSeccion)}>
                                        <Icon icon="lucide:trash-2" width={18} className="text-default-400 hover:text-danger" />
                                      </Button>
                                      )}
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>
                            )}

                            {/* Botón para agregar nueva sección */}
                            {secciones_Crear && (
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
                            )}
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
              </motion.div>
            ) : (
              <motion.div
                key="salas"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                <SeccionGestionSalaYReservas />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Riel de Navegación Derecho */}
        <div className="w-[70px] shrink-0 bg-white dark:bg-content1 border-l border-default-200 dark:border-default-100 flex flex-col items-center py-6 gap-4 z-30 sticky right-0 shadow-[-4px_0_15px_rgba(0,0,0,0.02)] -mr-6 self-stretch">
          {verAcademica && (
          <Tooltip content="Gestión Académica" placement="left">
            <Button
              isIconOnly
              variant={currentView === 'academica' ? 'solid' : 'light'}
              color={currentView === 'academica' ? 'primary' : 'default'}
              onPress={() => setCurrentView('academica')}
              className={`w-12 h-12 rounded-2xl transition-all duration-300 ${currentView === 'academica' ? 'shadow-lg shadow-primary/30' : 'text-default-400 hover:bg-default-100'}`}
            >
              <Icon icon="lucide:graduation-cap" width={24} />
            </Button>
          </Tooltip>
          )}
          {verSalaPanel && (
            <Tooltip content="Gestión Sala y Reservas" placement="left">
              <Button
                isIconOnly
                variant={currentView === 'salas' ? 'solid' : 'light'}
                color={currentView === 'salas' ? 'warning' : 'default'}
                onPress={() => setCurrentView('salas')}
                className={`w-12 h-12 rounded-2xl transition-all duration-300 ${currentView === 'salas' ? 'shadow-lg shadow-warning/30' : 'text-default-400 hover:bg-default-100'}`}
              >
                <Icon icon="lucide:calendar-clock" width={24} />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Modal para editar sección */}
      <Modal isOpen={isSeccionModalOpen} onOpenChange={onSeccionModalOpenChange} size="2xl" scrollBehavior="inside" classNames={{ base: "max-h-[75vh]" }}>
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
      <Modal isOpen={isCrearSeccionModalOpen} onOpenChange={onCrearSeccionModalOpenChange} size="2xl" scrollBehavior="inside" classNames={{ base: "max-h-[75vh]" }}>
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
      <Modal isOpen={isAsignaturaModalOpen} onOpenChange={onAsignaturaModalOpenChange} size="lg" scrollBehavior="inside" classNames={{ base: "max-h-[75vh]" }}>
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
    </>
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
  const { canRead } = usePermission();
  const historyEditar = useHistory();
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
  const [bloquesOcupadosDocente, setBloquesOcupadosDocente] = React.useState<number[]>([]);

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

  React.useEffect(() => {
    if (!docenteId || !dia) { setBloquesOcupadosDocente([]); return; }
    obtenerBloquesReservadosPorDocenteService(parseInt(docenteId), dia)
      .then(setBloquesOcupadosDocente)
      .catch(() => setBloquesOcupadosDocente([]));
  }, [docenteId, dia]);

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

  // Conflicto de sección: ya tiene ese bloque en OTRA sala el mismo día
  const tieneConflictoSeccion = (bloque: IBloqueDisponible) => {
    const enPreCargadosOtraSala = bloquesPreCargados.some(
      b => b.numeroBloque === bloque.numeroBloque && b.diaSemana === dia && b.idSala !== currentSalaId && !idsEliminados.has(b.idReservaSala)
    );
    const enNuevosOtraSala = bloquesNuevos.some(
      b => b.numeroBloque === bloque.numeroBloque && b.diaSemana === dia && b.idSala !== currentSalaId
    );
    return enPreCargadosOtraSala || enNuevosOtraSala;
  };

  // Conflicto de docente: el profesor ya tiene ese bloque reservado en otra sección
  const tieneConflictoDocente = (bloque: IBloqueDisponible) =>
    bloquesOcupadosDocente.includes(bloque.numeroBloque);

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
      <ModalBody className="overflow-y-scroll custom-scrollbar">
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
          {docentes.length === 0 && !isLoadingDocentes && (
            canRead('GESTION_USUARIOS') ? (
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-600 underline underline-offset-2 cursor-pointer transition-colors"
                onClick={() => historyEditar.push('/gestion-usuarios')}
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
                            <Icon icon={hayConflicto ? 'lucide:alert-circle' : seleccionado ? 'lucide:check-circle-2' : 'lucide:circle'} width={16}
                              className={conflictoSeccion ? 'text-danger-400' : conflictoDocente ? 'text-warning-400' : seleccionado ? 'text-primary' : 'text-default-300'} />
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
      <ModalBody className="overflow-y-scroll custom-scrollbar">
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