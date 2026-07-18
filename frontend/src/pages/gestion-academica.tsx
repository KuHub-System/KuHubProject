import React from 'react';
import {
  Card,
  CardBody,
  Input,
  Button,
  Spinner,
  Modal,
  ModalContent,
  useDisclosure,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { usePageTitle } from '../hooks/usePageTitle';
import { CardSkeleton } from '../components/SkeletonLoader';
import { logger } from '../utils/logger';
import { useNotifications } from '../utils/notifications';
import { useModulePermission, usePermission } from '../contexts/permission-context';
import RielNavegacion from '../components/RielNavegacion';

import { IAsignatura, ISeccion } from '../types/academica/asignatura.types';
import {
  obtenerAsignaturasService,
  crearAsignaturaService,
  actualizarAsignaturaService,
  eliminarAsignaturaService,
  actualizarSeccionDeltaService,
  eliminarSeccionService,
} from '../services/academica/asignatura-service';

import SeccionGestionSalaYReservas from './gestion-academica/SeccionGestionSalaYReservas';
import CrearSeccionModal from './gestion-academica/CrearSeccionModal';
import EditarSeccionModal from './gestion-academica/EditarSeccionModal';
import EditarAsignaturaModal from './gestion-academica/EditarAsignaturaModal';
import AsignaturaCard from './gestion-academica/AsignaturaCard';

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
      const { asignaturas: asigs, totalPages: tp } = await obtenerAsignaturasService(1);

      setAsignaturas(asigs);
      setTotalPages(tp);
      setPageLoaded(1);
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
   * Toggle la expansión de una fila
   */
  const toggleRowExpansion = React.useCallback((asignaturaId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(asignaturaId)) next.delete(asignaturaId);
      else next.add(asignaturaId);
      return next;
    });
  }, []);

  /**
   * Abre el modal para editar una sección
   */
  const editarSeccion = React.useCallback((asignatura: IAsignatura, seccion: ISeccion) => {
    setSeccionSeleccionada({ asignatura, seccion });
    onSeccionModalOpen();
  }, [onSeccionModalOpen]);

  /**
   * Abre el modal para crear una sección en una asignatura
   */
  const abrirCrearSeccion = React.useCallback((asignatura: IAsignatura) => {
    setAsignaturaParaSeccion(asignatura);
    onCrearSeccionModalOpen();
  }, [onCrearSeccionModalOpen]);

  /**
   * Guarda una nueva sección creada
   */
  const handleCrearSeccion = React.useCallback(async () => {
    try {
      await cargarDatos();
      onCrearSeccionModalOpenChange();
      toast.success('Sección creada correctamente');
    } catch (error: any) {
      logger.error('Error al recargar datos:', error);
      toast.error(error.message || 'Error al recargar los datos');
    }
  }, [cargarDatos, onCrearSeccionModalOpenChange, toast]);

  /**
   * Guarda los cambios de una sección
   */
  const guardarSeccion = React.useCallback(async (payload: any) => {
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
  }, [seccionSeleccionada, cargarDatos, onSeccionModalOpenChange, toast]);

  /**
   * Abre el modal para editar una asignatura
   */
  const editarAsignatura = React.useCallback((asignatura: IAsignatura) => {
    setAsignaturaSeleccionada(asignatura);
    onAsignaturaModalOpen();
  }, [onAsignaturaModalOpen]);

  /**
   * Guarda los cambios de una asignatura
   */
  const guardarAsignatura = React.useCallback(async (asignaturaEditada: Partial<IAsignatura>) => {
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
  }, [asignaturaSeleccionada, cargarDatos, onAsignaturaModalOpenChange, toast]);

  /**
   * Elimina una asignatura
   */
  const eliminarAsignatura = React.useCallback(async (asignaturaId: string, nombreAsignatura: string) => {
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
  }, [showConfirm, cargarDatos, toast]);

  /**
   * Elimina una sección
   */
  const eliminarSeccion = React.useCallback((asignaturaId: string, seccionId: string, nombreSeccion: string) => {
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
  }, [showConfirm, cargarDatos, toast]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} lines={2} hasBadge />)}
      </div>
    );
  }

  return (
    <>
      <div className="flex h-[calc(100vh-76px)] overflow-hidden font-sans relative -mt-6 -mr-6">
        <div className="flex-grow overflow-y-auto bg-default-50/50 dark:bg-background scrollbar-hide">
          <AnimatePresence mode="wait">
            {currentView === 'academica' ? (
              <motion.div
                key="academica"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="px-4 py-8"
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
            filteredAsignaturas.map((asignatura: IAsignatura) => (
              <AsignaturaCard
                key={asignatura.id}
                asignatura={asignatura}
                isExpanded={expandedRows.has(asignatura.id)}
                onToggleExpand={toggleRowExpansion}
                ramosEditar={ramos_Editar}
                ramosEliminar={ramos_Eliminar}
                seccionesEditar={secciones_Editar}
                seccionesEliminar={secciones_Eliminar}
                seccionesCrear={secciones_Crear}
                onEditarAsignatura={editarAsignatura}
                onEliminarAsignatura={eliminarAsignatura}
                onEditarSeccion={editarSeccion}
                onEliminarSeccion={eliminarSeccion}
                onAgregarSeccion={abrirCrearSeccion}
              />
            ))
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
        <RielNavegacion
          activeKey={currentView}
          onChange={key => setCurrentView(key as 'academica' | 'salas')}
          items={[
            { key: 'academica', label: 'Gestión Académica', icon: 'lucide:graduation-cap', visible: verAcademica },
            { key: 'salas', label: 'Gestión Sala y Reservas', icon: 'lucide:calendar-clock', color: 'warning', visible: verSalaPanel },
          ]}
        />
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

export default GestionAsignaturasPage;
