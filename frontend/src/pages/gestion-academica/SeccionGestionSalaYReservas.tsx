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
  Divider,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { CardSkeleton } from '../../components/SkeletonLoader';
import { useToast } from '../../hooks/useToast';
import { useModulePermission, usePermission } from '../../contexts/permission-context';
import { obtenerSalasActivasService, ISala, crearSalaService, actualizarSalaService, eliminarSalaService } from '../../services/academica/sala-service';
import { IReservaActiva, DIA_DISPLAY, obtenerReservasActivasService } from '../../services/academica/reserva-sala-service';

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
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} lines={1} hasBadge />)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} lines={1} hasBadge />)}
        </div>
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

export default SeccionGestionSalaYReservas;
