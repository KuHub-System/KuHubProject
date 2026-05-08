import React from 'react';
import * as XLSX from 'xlsx';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Card,
  CardBody,
  Input,
  Chip,
  Pagination,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Divider,
  Textarea,
  Select,
  SelectItem,
  Autocomplete,
  AutocompleteItem,
  Spinner,
  Tooltip
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useHistory } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast, useConfirm } from '../hooks/useToast';
import { useAuth } from '../contexts/auth-context';
import { useModulePermission, usePermission } from '../contexts/permission-context';
import { usePeriodoSemana } from '../contexts/periodo-semana-context';
import BookPageLoader from '../components/BookPageLoader';

// IMPORTAR TIPOS Y SERVICIOS
import { IPedidoSemanaBodega, IIngrediente, IPedidoSemanaBodegaWithDetailsUpdateDTO, IResultadoItemExcel, IImportarExcelResultado, IAsignatura } from '../types/receta.types';
import { parallelWithLimit } from '../utils/request-throttle';
import {
  obtenerRecetasPaginadasService,
  crearRecetaService,
  actualizarRecetaService,
  cambiarEstadoRecetaService,
  eliminarRecetaService,
  crearRecetaConDetallesService,
  actualizarRecetaConDetallesService,
  obtenerRecetasCountService,
  buscarRecetasPaginadasService,
  softDeleteRecetaService,
  importarExcelPedidoService,
  obtenerAsignaturasActivasService
} from '../services/pedido-semanal-bodega-service';
import { obtenerProductosParaRecetaService } from '../services/producto-service';
import { IProductoRecetaSelection } from '../types/producto.types';
import { IPedidoSemanaBodegaPaginedDTO, IDetallePedidoSemanaBodegaDTO, IPaginationMeta, IPedidoSemanaBodegaCountResponse } from '../types/receta.types';

/**
 * Página de pedido semanal a bodega.
 */
const PedidoSemanalABodegaPage: React.FC = () => {
  usePageTitle('Pedido Semanal a Bodega', 'Gestiona los pedidos semanales para la bodega', 'lucide:package-open');
  const toast = useToast();
  const confirm = useConfirm();
  const history = useHistory();
  const { user } = useAuth();
  const { canCreate: rec_Crear, canUpdate: rec_Editar, canDelete: rec_Eliminar } = useModulePermission('PEDIDO_SEMANAL_BODEGA');
  const { periodos, semanas: contextSemanas, periodo: contextPeriodo, defaultSemanaId, isLoading: isLoadingSemanas, seleccionarPeriodo, seleccionarSemana } = usePeriodoSemana();
  const esSoloLectura = user?.rol === 'Profesor';
  const isAdmin = user?.rol === 'Administrador';

  const [recetas, setRecetas] = React.useState<IPedidoSemanaBodegaPaginedDTO[]>([]);
  const [productos, setProductos] = React.useState<IProductoRecetaSelection[]>([]);
  const [recetaSeleccionada, setRecetaSeleccionada] = React.useState<IPedidoSemanaBodegaPaginedDTO | null>(null);
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar' | 'ver'>('crear');
  const [searchTerm, setSearchTerm] = React.useState<string>('');

  // Filtro de semana
  const [filterIdSemana, setFilterIdSemana] = React.useState<string>('todas');
  const [filterPeriodo, setFilterPeriodo] = React.useState<{ anio: number; semestre: number } | null>(null);
  const [filterSemanas, setFilterSemanas] = React.useState<Array<{ idSemana: number; nombreSemana: string; fechaInicio: string; fechaFin: string }>>([]);

  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const nextPageRef = React.useRef<number>(2);
  const isLoadingMoreRef = React.useRef<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false);
  const [recetaCounts, setRecetaCounts] = React.useState<IPedidoSemanaBodegaCountResponse>({
    totalPedidos: 0,
    total_activos: 0,
    total_inactivos: 0
  });

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Actualizar semanas del filtro cuando cambia el período
  React.useEffect(() => {
    if (contextPeriodo && contextSemanas.length > 0) {
      setFilterPeriodo(contextPeriodo);
      setFilterSemanas(contextSemanas);
      // Resetear filtro de semana cuando cambia período
      setFilterIdSemana('todas');
    }
  }, [contextPeriodo, contextSemanas]);

  // Cargar recetas iniciales y productos (esperar a que contexto termine de cargar)
  React.useEffect(() => {
    if (!isLoadingSemanas) {
      cargarDatosIniciales();
    }
  }, [isLoadingSemanas]);

  const cargarDatosIniciales = async () => {
    try {
      setIsLoading(true);

      const idSemanaFilter = filterIdSemana !== 'todas' ? Number(filterIdSemana) : undefined;

      // Cargar recetas primero (datos críticos)
      const resRecetas = await obtenerRecetasPaginadasService(1, idSemanaFilter);
      setRecetas(resRecetas.content);
      setTotalPages(resRecetas.paging.totalPages);
      nextPageRef.current = 2;

      // Cargar datos secundarios con límite de concurrencia (máx 2 simultáneas)
      // Esto evita sobrecargar el servidor con 429 Too Many Requests
      const secondaryRequests = [
        async () => {
          if (productos.length === 0) {
            const prods = await obtenerProductosParaRecetaService();
            setProductos(prods);
            return prods;
          }
          return productos;
        },
        async () => {
          const counts = await obtenerRecetasCountService();
          setRecetaCounts(counts);
          return counts;
        }
      ];

      // Ejecutar con límite de concurrencia
      parallelWithLimit(secondaryRequests, 2)
        .catch(() => console.error('Error al cargar datos secundarios'));
    } catch (error) {
      toast.error('Error al cargar las pedidos semanales');
    } finally {
      setIsLoading(false);
    }
  };

  const cargarMasRecetas = React.useCallback(async () => {
    if (isLoadingMoreRef.current || nextPageRef.current > totalPages) return;

    try {
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);

      const idSemanaFilter = filterIdSemana !== 'todas' ? Number(filterIdSemana) : undefined;

      const data = searchTerm
        ? await buscarRecetasPaginadasService(searchTerm, nextPageRef.current, idSemanaFilter)
        : await obtenerRecetasPaginadasService(nextPageRef.current, idSemanaFilter);

      setRecetas(prev => [...prev, ...data.content]);
      nextPageRef.current += 1;
    } catch (error) {
      toast.error('Error al cargar más pedidos semanales');
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [totalPages, toast, filterIdSemana, searchTerm]);

  React.useEffect(() => {
    const onScroll = () => {
      // Si ya está cargando, salir
      if (isLoadingMoreRef.current) return;

      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;

      if (scrollY + windowHeight > fullHeight - 500) {
        if (nextPageRef.current <= totalPages) {
          cargarMasRecetas();
        }
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [totalPages, searchTerm, cargarMasRecetas]);

  // Lógica de búsqueda con debounce desde el backend
  React.useEffect(() => {
    if (!searchTerm) {
      cargarDatosIniciales();
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const idSemanaFilter = filterIdSemana !== 'todas' ? Number(filterIdSemana) : undefined;
        const res = await buscarRecetasPaginadasService(searchTerm, 1, idSemanaFilter);
        setRecetas(res.content);
        setTotalPages(res.paging.totalPages);
        nextPageRef.current = 2;
      } catch (error) {
        toast.error('Error al buscar pedidos semanales');
      } finally {
        setIsLoading(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [searchTerm, filterIdSemana, toast]);

  const recetasAMostrar = recetas;

  const handleNuevaReceta = () => {
    setModalMode('crear');
    setRecetaSeleccionada(null);
    onOpen();
  };

  const handleEditarReceta = (receta: IPedidoSemanaBodegaPaginedDTO | any) => {
    setModalMode('editar');
    setRecetaSeleccionada(receta);
    onOpen();
  };

  const handleVerReceta = (receta: IPedidoSemanaBodegaPaginedDTO | any) => {
    setModalMode('ver');
    setRecetaSeleccionada(receta);
    onOpen();
  };

  const cambiarEstadoReceta = async (id: number | string, receta: IPedidoSemanaBodegaPaginedDTO) => {
    try {
      console.log(`🔄 Cambiando estado de receta ${id}`);
      const success = await cambiarEstadoRecetaService(id.toString());

      if (success) {
        // Actualizar el estado en la tabla sin recargar
        const nuevoEstado = receta.estadoPedido === 'Activo' ? 'Inactivo' : 'Activo';
        setRecetas(prevRecetas =>
          prevRecetas.map(r =>
            r.idPedidoSemanaBodega === receta.idPedidoSemanaBodega
              ? { ...r, estadoPedido: nuevoEstado as 'Activo' | 'Inactivo' }
              : r
          )
        );

        // Actualizar contadores
        setRecetaCounts(prev => {
          const newCounts = { ...prev };
          if (receta.estadoPedido === 'Activo') {
            newCounts.total_activos--;
            newCounts.total_inactivos++;
          } else {
            newCounts.total_inactivos--;
            newCounts.total_activos++;
          }
          return newCounts;
        });

        toast.success(`Estado de la pedido semanal actualizado correctamente`);
      } else {
        toast.error('No se pudo cambiar el estado de la pedido semanal');
      }
    } catch (error) {
      console.error('❌ Error al cambiar estado:', error);
      toast.error('Error al cambiar el estado de la pedido semanal');
    }
  };

  const handleGuardarReceta = async (receta: any, updatePayload?: IPedidoSemanaBodegaWithDetailsUpdateDTO) => {
    try {
      if (modalMode === 'crear') {
        const success = await crearRecetaConDetallesService({
          nombrePedido: receta.nombre,
          descripcionPedido: receta.descripcion,
          listaItems: (receta.ingredientes || []).map((ing: IIngrediente & { observacion?: string }) => ({
            idProducto: parseInt(ing.productoId),
            cantUnidadMedida: ing.cantidad,
            observacion: ing.observacion || undefined
          })),
          estadoPedido: receta.estado === 'Activo' || (receta.estado as any) === 'Activa' ? 'Activo' : 'Inactivo',
          idSemana: receta.idSemana,
          idAsignatura: receta.idAsignatura
        });

        if (success) {
          toast.success('Pedido Semanal creada correctamente');
        } else {
          toast.error('No se pudo crear la pedido semanal');
        }
      } else if (modalMode === 'editar' && updatePayload) {
        const success = await actualizarRecetaConDetallesService(updatePayload);
        if (success) {
          toast.success('Pedido Semanal actualizada correctamente');
        } else {
          toast.error('No se pudo actualizar la pedido semanal');
        }
      }
      await cargarDatosIniciales();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la receta');
      throw error;
    }
  };

  const handleEliminarReceta = async (receta: IPedidoSemanaBodegaPaginedDTO | any) => {
    if (!isAdmin) {
      toast.warning('Solo el rol Administrador puede eliminar pedidos semanales.');
      return;
    }

    const confirmado = await confirm('', {
      title: 'Eliminar pedido semanal',
      subtitle: 'Esta acción es irreversible',
      headerVariant: 'danger',
      alertTitle: 'Atención',
      alertMessage: `Eliminarás definitivamente la pedido semanal "${receta.nombrePedido}". Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      confirmColor: 'danger',
      requireText: 'ELIMINAR',
      requireTextLabel: undefined,
      requireTextHelper: 'Esta acción es irreversible. Escribe ELIMINAR para confirmar.',
    });

    if (!confirmado) return;

    try {
      await softDeleteRecetaService(receta.idReceta);
      toast.success('Pedido Semanal eliminada correctamente', { title: 'Pedido Semanal eliminada' });
      await cargarDatosIniciales();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la receta');
    }
  };

  const renderEstado = (estado: string) => {
    if (estado === 'Activo') return <Chip color="success" size="sm">Activo</Chip>;
    return <Chip color="danger" size="sm">Inactivo</Chip>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-default-50/50 dark:bg-background">
        <BookPageLoader message="Cargando pedidos semanales" subMessage="Organizando tus pedidos semanales..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-default-50/50 dark:bg-background pb-20 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >


        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
          <Card className="shadow-sm border-l-4 border-primary bg-white dark:bg-content1">
            <CardBody className="flex flex-row items-center justify-between p-4 gap-4">
              <div>
                <p className="text-sm font-semibold text-default-500 uppercase tracking-wide">Total Formulaciones</p>
                <p className="text-3xl font-bold text-secondary mt-1">{recetaCounts.totalPedidos}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 text-primary shrink-0">
                <Icon icon="lucide:package-open" width={24} />
              </div>
            </CardBody>
          </Card>
          <Card className="shadow-sm border-l-4 border-success bg-white dark:bg-content1">
            <CardBody className="flex flex-row items-center justify-between p-4 gap-4">
              <div>
                <p className="text-sm font-semibold text-default-500 uppercase tracking-wide">Activos</p>
                <p className="text-3xl font-bold text-secondary mt-1">
                  {recetaCounts.total_activos}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-success-100 dark:bg-success-900/30 text-success shrink-0">
                <Icon icon="lucide:check-circle" width={24} />
              </div>
            </CardBody>
          </Card>
          <Card className="shadow-sm border-l-4 border-danger bg-white dark:bg-content1">
            <CardBody className="flex flex-row items-center justify-between p-4 gap-4">
              <div>
                <p className="text-sm font-semibold text-default-500 uppercase tracking-wide">Inactivos</p>
                <p className="text-3xl font-bold text-secondary mt-1">
                  {recetaCounts.total_inactivos}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-danger-100 dark:bg-danger-900/30 text-danger shrink-0">
                <Icon icon="lucide:x-circle" width={24} />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="shadow-sm bg-white dark:bg-content1 border border-default-200 dark:border-default-100 mx-4">
          <CardBody className="p-4">
            <div className="flex flex-col gap-4">
              {/* Primera fila: Buscador + Botones de período + Select de semana + Botones */}
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                {/* Buscador */}
                <Input
                  placeholder="Buscar pedidos semanales por nombre o descripción..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  startContent={<Icon icon="lucide:search" className="text-default-400" />}
                  isClearable
                  onClear={() => setSearchTerm('')}
                  className="w-full lg:w-1/4"
                  variant="bordered"
                  classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                />

                {/* Select de período */}
                {isLoadingSemanas ? (
                  <Spinner size="sm" />
                ) : !periodos || periodos.length === 0 ? (
                  <div className="flex items-center gap-3 px-4 py-2 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-200/30 rounded-lg">
                    <Icon icon="lucide:alert-circle" width={16} className="text-warning-600 dark:text-warning-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-warning-700 dark:text-warning-300">
                        No hay períodos académicos disponibles.
                      </p>
                      <p className="text-[11px] text-warning-600 dark:text-warning-400 mt-0.5">
                        {isAdmin
                          ? 'Para crear pedidos semanales, genere el período académico.'
                          : 'Contacte al Administrador para generar el período académico.'}
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        className="text-warning-600 dark:text-warning-400 hover:bg-warning-100 dark:hover:bg-warning-900/30 shrink-0"
                        onPress={() => history.push('/admin-sistema?tab=semanas')}
                        title="Ir a crear período académico"
                      >
                        <Icon icon="lucide:arrow-right" width={16} />
                      </Button>
                    )}
                  </div>
                ) : (() => {
                  // Detectar el período actual basado en sysdate
                  const hoy = new Date();
                  const mesActual = hoy.getMonth() + 1;
                  const semestreActual = mesActual <= 6 ? 1 : 2;
                  const anioActual = hoy.getFullYear();

                  return (
                    <Select
                      selectedKeys={filterPeriodo ? new Set([`${filterPeriodo.anio}-${filterPeriodo.semestre}`]) : new Set()}
                      onSelectionChange={(keys) => {
                        const v = Array.from(keys as Set<string>)[0];
                        if (v) {
                          const [anio, semestre] = v.split('-');
                          seleccionarPeriodo(Number(anio), Number(semestre));
                        }
                      }}
                      placeholder="Período"
                      variant="bordered"
                      size="sm"
                      className="w-48"
                      classNames={{ trigger: "bg-default-50", base: "max-w-xs" }}
                    >
                      {periodos?.flatMap(p =>
                        p.semestres.map((s: number) => (
                          <SelectItem key={`${p.anio}-${s}`} textValue={`${p.anio} - S${s}`}>
                            <div className="flex items-center w-full gap-2">
                              <span className="font-semibold">{p.anio} - S{s}</span>
                              {p.anio === anioActual && s === semestreActual && (
                                <Chip size="sm" color="success" variant="flat" className="ml-auto shrink-0 text-[10px]">Actual</Chip>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </Select>
                  );
                })()}

                {/* Select de semana */}
                {filterPeriodo && filterSemanas.length > 0 && (
                  <>
                    {isLoadingSemanas ? (
                      <Spinner size="sm" />
                    ) : (
                      <Select
                        selectedKeys={new Set([filterIdSemana])}
                        onSelectionChange={(keys) => {
                          const v = Array.from(keys as Set<string>)[0];
                          setFilterIdSemana(v || 'todas');
                        }}
                        placeholder="Semana"
                        variant="bordered"
                        size="sm"
                        className="w-96"
                        classNames={{ trigger: "bg-default-50", base: "max-w-96" }}
                      >
                        <SelectItem key="todas" textValue="Todas">
                          Todas
                        </SelectItem>
                        <>
                          {filterSemanas?.map((semana) => (
                            <SelectItem key={String(semana.idSemana)} textValue={semana.nombreSemana}>
                              <div className="flex items-center w-full gap-2">
                                <span className="font-semibold">{semana.nombreSemana}</span>
                                <span className="text-default-400 text-xs">
                                  {new Date(semana.fechaInicio + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                  {' – '}
                                  {new Date(semana.fechaFin + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                </span>
                                {String(semana.idSemana) === defaultSemanaId && defaultSemanaId && (
                                  <Chip size="sm" color="success" variant="flat" className="ml-auto shrink-0">Actual</Chip>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      </Select>
                    )}
                  </>
                )}

                {/* Botones de acción */}
                <div className="flex items-center gap-2 ml-auto">
                  {!esSoloLectura && rec_Crear && (
                    <Button
                      color="primary"
                      variant="solid"
                      size="md"
                      className="font-bold text-secondary shadow-sm"
                      startContent={<Icon icon="lucide:plus" width={18} />}
                      onPress={handleNuevaReceta}
                    >
                      Nuevo Pedido Semanal
                    </Button>
                  )}
                  {esSoloLectura && (
                    <div className="flex items-center gap-2 text-sm text-warning-700 font-medium bg-warning-50 dark:bg-warning-50/10 px-3 py-2 rounded-lg border border-warning-200 dark:border-warning-200/20">
                      <Icon icon="lucide:info" width={15} className="shrink-0" />
                      Solo lectura
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Tabla */}
        <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1 mx-4">
          <CardBody className="p-0">
            <Table
              aria-label="Tabla de pedidos semanales"
              removeWrapper
              layout="fixed"
              classNames={{
                th: "bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs h-12",
                td: "py-3 border-b border-default-50 dark:border-default-50/10 group-data-[last=true]:border-none px-4",
              }}
              bottomContent={
                isLoadingMore && !searchTerm ? (
                  <div className="flex w-full justify-center py-4">
                    <Spinner size="sm" />
                  </div>
                ) : null
              }
            >
              <TableHeader>
                <TableColumn width="25%" align="center">NOMBRE PEDIDO SEMANAL</TableColumn>
                <TableColumn width="35%" align="center">DESCRIPCIÓN</TableColumn>
                <TableColumn width="15%" align="center">INGREDIENTES</TableColumn>
                <TableColumn width="10%" align="center">ESTADO</TableColumn>
                <TableColumn width="15%" align="center">ACCIONES</TableColumn>
              </TableHeader>
              <TableBody
                emptyContent={
                  <div className="py-12 text-center text-default-400">
                    <Icon icon="lucide:inbox" className="mx-auto mb-3 opacity-50" width={48} />
                    <p className="text-lg font-medium">No se encontraron pedidos semanales</p>
                  </div>
                }
              >
                {recetasAMostrar.map((receta) => (
                  <TableRow
                    key={receta.idPedidoSemanaBodega}
                    className="hover:bg-default-100 dark:hover:bg-default-100/50 transition-colors"
                    style={{ cursor: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><path d=\"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>') 12 12, pointer" }}
                    onClick={(e: React.MouseEvent<Element>) => {
                      // Prevenir que se abra si hace clic en un botón de los de Acciones
                      const target = e.target as HTMLElement;
                      if (!target.closest('button')) {
                        handleVerReceta(receta);
                      }
                    }}
                  >
                    <TableCell className="text-center">
                      <Tooltip content={receta.nombrePedido} delay={500} closeDelay={0}>
                        <div className="flex justify-center w-full">
                          <p className="font-semibold text-secondary dark:text-foreground truncate text-center w-full">
                            {receta.nombrePedido}
                          </p>
                        </div>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip content={receta.descripcionPedido || '-'} delay={800} closeDelay={0} className="max-w-[400px]">
                        <div className="flex justify-center w-full">
                          <p className="text-sm text-default-500 text-center w-full">
                            {receta.descripcionPedido && receta.descripcionPedido.length > 100
                              ? `${receta.descripcionPedido.substring(0, 100)}...`
                              : receta.descripcionPedido || '-'}
                          </p>
                        </div>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-center">
                      <Chip size="sm" variant="flat">
                        {receta.detalles?.length || 0} producto{(receta.detalles?.length || 0) > 1 ? 's' : ''}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-center">{renderEstado(receta.estadoPedido)}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        {!esSoloLectura && (
                          <>
                            {rec_Editar && (
                            <Tooltip content="Editar pedido semanal" delay={0}>
                              <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                onPress={() => handleEditarReceta(receta)}
                                className="text-default-400 hover:text-secondary z-10"
                                style={{ cursor: 'pointer' }}
                              >
                                <Icon icon="lucide:edit" width={18} />
                              </Button>
                            </Tooltip>
                            )}

                            {rec_Editar && (
                            <Tooltip content={receta.estadoPedido === 'Activo' ? 'Inactivar pedido semanal' : 'Activar pedido semanal'} delay={0}>
                              <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                onPress={() => cambiarEstadoReceta(receta.idPedidoSemanaBodega, receta)}
                                className={receta.estadoPedido === 'Activo' ? 'text-default-400 hover:text-danger z-10' : 'text-default-400 hover:text-success z-10'}
                                style={{ cursor: 'pointer' }}
                              >
                                <Icon
                                  icon={receta.estadoPedido === 'Activo' ? 'lucide:x-circle' : 'lucide:check-circle'}
                                  width={18}
                                />
                              </Button>
                            </Tooltip>
                            )}
                            {isAdmin && rec_Eliminar && (
                              <Tooltip content="Eliminar pedido semanal" delay={0}>
                                <Button
                                  isIconOnly
                                  variant="light"
                                  size="sm"
                                  onPress={() => handleEliminarReceta(receta)}
                                  className="text-default-400 hover:text-danger z-10"
                                  style={{ cursor: 'pointer' }}
                                >
                                  <Icon icon="lucide:trash" width={18} />
                                </Button>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </motion.div>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="3xl"
        scrollBehavior="inside"
        radius="lg"
        backdrop="blur"
        classNames={{
          base: "rounded-[32px] overflow-hidden",
          closeButton: "hover:bg-default-100 dark:hover:bg-default-100/50 transition-colors text-default-500 hover:text-secondary cursor-pointer",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <DetallePedidoSemanaBodega
              receta={recetaSeleccionada}
              mode={modalMode}
              productos={productos}
              onClose={onClose}
              onSave={async (nuevaReceta, updatePayload) => {
                try {
                  await handleGuardarReceta(nuevaReceta, updatePayload);
                  onClose();
                } catch (error) {
                  // Error ya manejado
                }
              }}
            />
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

interface DetallePedidoSemanaBodegaProps {
  receta: IPedidoSemanaBodegaPaginedDTO | null;
  mode: 'crear' | 'editar' | 'ver';
  productos: IProductoRecetaSelection[];
  onClose: () => void;
  onSave: (receta: IPedidoSemanaBodega, updatePayload?: IPedidoSemanaBodegaWithDetailsUpdateDTO) => Promise<void>;
}

const leerNombresHojas = (file: File): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', bookSheets: true });
        resolve(wb.SheetNames);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

const DetallePedidoSemanaBodega: React.FC<DetallePedidoSemanaBodegaProps> = ({ receta, mode, productos, onClose, onSave }) => {
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.rol === 'Administrador';
  const { semanas } = usePeriodoSemana();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isValidForm, setIsValidForm] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [sheetOptions, setSheetOptions] = React.useState<string[]>([]);
  const { isOpen: isSheetOpen, onOpen: onSheetOpen, onClose: onSheetClose } = useDisclosure();
  const [noEncontradosResultados, setNoEncontradosResultados] = React.useState<IResultadoItemExcel[]>([]);
  const { isOpen: isNoEncontradosOpen, onOpen: onNoEncontradosOpen, onClose: onNoEncontradosClose } = useDisclosure();
  const formRef = React.useRef<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (formRef.current) {
      setIsSaving(true);
      try {
        await formRef.current.submit();
      } finally {
        setIsSaving(false);
      }
    }
  };

  const doImport = async (file: File, nombreHoja?: string) => {
    setIsImporting(true);
    setPendingFile(null);
    setSheetOptions([]);
    try {
      const resultado = await importarExcelPedidoService(file, nombreHoja);

      if (resultado.totalOk > 0 && formRef.current?.importarDesdeExcel) {
        formRef.current.importarDesdeExcel(resultado.resultados);
        toast.success(
          `${resultado.totalOk} producto${resultado.totalOk > 1 ? 's' : ''} importado${resultado.totalOk > 1 ? 's' : ''} correctamente`
        );
      }

      if (resultado.numeroSemanaExcel > 0 && formRef.current?.setSemanaDesdeNumero) {
        formRef.current.setSemanaDesdeNumero(resultado.numeroSemanaExcel);
      }

      if (resultado.preparaciones && formRef.current?.setDescripcionDesdeExcel) {
        formRef.current.setDescripcionDesdeExcel(resultado.preparaciones);
      }

      if (resultado.totalNoEncontrados > 0) {
        const noEncontrados = resultado.resultados.filter(r => r.estado === 'no_encontrado');
        setNoEncontradosResultados(noEncontrados);
        onNoEncontradosOpen();
      }

      if (resultado.totalOk === 0 && resultado.totalNoEncontrados === 0) {
        toast.warning('El archivo no contiene datos válidos para importar');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Error al procesar el archivo Excel');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsImporting(true);
    try {
      const allSheets = await leerNombresHojas(file);

      if (allSheets.length <= 1) {
        await doImport(file, allSheets[0]);
      } else {
        setIsImporting(false);
        setPendingFile(file);
        setSheetOptions(allSheets);
        onSheetOpen();
      }
    } catch {
      setIsImporting(false);
      toast.error('No se pudo leer el archivo Excel');
    }
  };

  const handleSelectSheet = async (sheetName: string) => {
    onSheetClose();
    if (pendingFile) await doImport(pendingFile, sheetName);
  };

  const handleCancelarSeleccion = () => {
    onSheetClose();
    setPendingFile(null);
    setSheetOptions([]);
  };

  return (
    <>
      {/* Modal de selección de semana */}
      <Modal
        isOpen={isSheetOpen}
        onOpenChange={(open) => { if (!open) handleCancelarSeleccion(); }}
        size="md"
        backdrop="blur"
        radius="lg"
        classNames={{ base: 'rounded-[24px] overflow-hidden' }}
      >
        <ModalContent>
          <ModalHeader className="border-b border-default-100 dark:border-default-50/50 bg-white dark:bg-content2">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:layers" className="text-primary" width={20} />
              <span className="font-bold text-secondary dark:text-foreground">Seleccionar semana</span>
            </div>
          </ModalHeader>
          <ModalBody className="py-4">
            <p className="text-sm text-default-500 mb-3">
              El archivo contiene <span className="font-semibold text-secondary dark:text-foreground">{sheetOptions.length} hojas</span>. Seleccione cuál desea cargar:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {sheetOptions.map(sheetName => {
                const num = parseInt(sheetName.match(/\((\d+)\)/)?.[1] || '0');
                const esSemana = /^SEMANA \(\d+\)$/.test(sheetName);
                const semanaInfo = esSemana && num >= 1 ? semanas[num - 1] : undefined;
                return (
                  <button
                    key={sheetName}
                    onClick={() => handleSelectSheet(sheetName)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl border border-default-200 dark:border-default-100 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <span className="font-bold text-secondary dark:text-foreground text-sm">
                      {esSemana ? `Semana ${num}` : sheetName}
                    </span>
                    {semanaInfo ? (
                      <span className="text-xs text-default-400 text-center leading-tight">
                        {new Date(semanaInfo.fechaInicio + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                        {' – '}
                        {new Date(semanaInfo.fechaFin + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      </span>
                    ) : (
                      <span className="text-xs text-default-300">—</span>
                    )}
                  </button>
                );
              })}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onPress={handleCancelarSeleccion} className="font-medium">
              Cancelar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de productos no encontrados en el Excel */}
      <Modal
        isOpen={isNoEncontradosOpen}
        onOpenChange={(open) => { if (!open) onNoEncontradosClose(); }}
        size="lg"
        backdrop="blur"
        radius="lg"
        classNames={{ base: 'rounded-[24px] overflow-hidden' }}
      >
        <ModalContent>
          <ModalHeader className="border-b border-default-100 dark:border-default-50/50 bg-white dark:bg-content2">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:alert-triangle" className="text-warning" width={20} />
              <span className="font-bold text-secondary dark:text-foreground">
                {noEncontradosResultados.length} producto{noEncontradosResultados.length !== 1 ? 's' : ''} no encontrado{noEncontradosResultados.length !== 1 ? 's' : ''}
              </span>
            </div>
          </ModalHeader>
          <ModalBody className="py-4">
            <p className="text-sm text-default-500 mb-3">
              Los siguientes productos del Excel no existen en el sistema. Verifique los nombres o agréguelos manualmente si es necesario.
            </p>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {noEncontradosResultados.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl border border-warning-200 dark:border-warning-400/30 bg-warning-50/50 dark:bg-warning-900/10"
                >
                  <div className="shrink-0 mt-0.5">
                    <Icon icon="lucide:package-x" className="text-warning-600" width={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-secondary dark:text-foreground truncate">
                      {item.nombreExcel}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {item.cantidad != null && (
                        <span className="text-xs text-default-500">Cant: <span className="font-medium text-foreground">{item.cantidad}</span></span>
                      )}
                      {item.observacion && (
                        <span className="text-xs text-default-500">Obs: <span className="font-medium text-foreground">{item.observacion}</span></span>
                      )}
                      <span className="text-xs text-default-400">Fila {item.fila}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="warning" variant="solid" onPress={onNoEncontradosClose} className="font-bold text-white">
              Entendido
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ModalHeader className="border-b border-default-100 dark:border-default-50/50 bg-white dark:bg-content2 rounded-t-[32px]">
        <div className="flex items-center gap-2">
          <Icon
            icon={mode === 'crear' ? 'lucide:plus-circle' : mode === 'editar' ? 'lucide:edit-3' : 'lucide:book-open'}
            className="text-primary"
            width={24}
          />
          <span className="font-bold text-lg text-secondary dark:text-foreground">
            {mode === 'crear' ? 'Nuevo Pedido Semanal' : mode === 'editar' ? 'Editar Pedido Semanal' : 'Detalle de Pedido Semanal'}
          </span>
        </div>
      </ModalHeader>
      <ModalBody>
        {mode === 'ver' ? (
          receta && <VistaReceta receta={receta} />
        ) : (
          <FormularioReceta
            ref={formRef}
            receta={receta}
            mode={mode}
            productos={productos}
            onSave={onSave}
            onValidationChange={setIsValidForm}
            history={history}
            isAdmin={isAdmin}
          />
        )}
      </ModalBody>
      <ModalFooter className="bg-default-50 dark:bg-content2 border-t border-default-100 dark:border-default-50/50 rounded-b-[32px]">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xlsm,.xls"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <Button variant="ghost" onPress={onClose} isDisabled={isSaving || isImporting} className="font-medium">
          {mode === 'ver' ? 'Cerrar' : 'Cancelar'}
        </Button>

        {mode !== 'ver' && (
          <Button
            variant="bordered"
            onPress={() => fileInputRef.current?.click()}
            isLoading={isImporting}
            isDisabled={isSaving || isImporting}
            className="font-medium border-default-300"
            startContent={!isImporting ? <Icon icon="lucide:file-spreadsheet" width={16} /> : undefined}
          >
            Importar Excel
          </Button>
        )}

        {mode !== 'ver' && (
          <Button
            color="primary"
            variant="solid"
            onPress={handleSubmit}
            isLoading={isSaving}
            isDisabled={isSaving || !isValidForm || isImporting}
            className="font-bold text-secondary shadow-md"
            startContent={<Icon icon="lucide:save" />}
          >
            {mode === 'crear' ? 'Crear Pedido Semanal' : 'Guardar Cambios'}
          </Button>
        )}
      </ModalFooter>
    </>
  );
};

interface VistaRecetaProps {
  receta: IPedidoSemanaBodegaPaginedDTO;
}

const VistaReceta: React.FC<VistaRecetaProps> = ({ receta }) => {
  const isActivo = receta.estadoPedido === 'Activo';

  return (
    <div className="space-y-6">
      {/* === Header con gradiente y nombre === */}
      <div
        className="relative rounded-2xl overflow-hidden p-5"
        style={{
          background: isActivo
            ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)'
            : 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 50%, #f48fb1 100%)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="p-3 rounded-xl shrink-0"
              style={{
                background: 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Icon icon="lucide:chef-hat" width={28} className={isActivo ? 'text-success-700' : 'text-danger-700'} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-secondary dark:text-foreground truncate">{receta.nombrePedido}</h3>
              {receta.descripcionPedido && (
                <p className="text-sm text-default-600 mt-1 line-clamp-2">{receta.descripcionPedido}</p>
              )}
            </div>
          </div>
          <Chip
            color={isActivo ? 'success' : 'danger'}
            size="sm"
            variant="flat"
            className="font-bold shrink-0"
            startContent={<Icon icon={isActivo ? 'lucide:check-circle-2' : 'lucide:x-circle'} width={14} className="ml-1" />}
          >
            {receta.estadoPedido}
          </Chip>
        </div>
      </div>


      {/* === SECCIÓN: Ingredientes === */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30 text-warning-600">
              <Icon icon="lucide:package-open" width={20} />
            </div>
            <div>
              <h4 className="font-bold text-base text-secondary dark:text-foreground">Ingredientes de la Pedido Semanal</h4>
              <p className="text-xs text-default-400">
                {receta.totalDetalles} producto{receta.totalDetalles > 1 ? 's' : ''} en esta receta
              </p>
            </div>
          </div>
          <Chip color="warning" size="sm" variant="flat">
            Total: {receta.detalles?.length || 0} item{(receta.detalles?.length || 0) > 1 ? 's' : ''}
          </Chip>
        </div>

        <div className="space-y-2">
          {(receta.detalles || []).map((detalle, index) => (
            <Card
              key={detalle.idDetallePedido}
              shadow="none"
              className="border border-default-200 dark:border-default-100 hover:border-primary-200 dark:hover:border-primary-400/30 transition-colors"
            >
              <CardBody className="p-3">
                <div className="flex items-center gap-3">
                  <Chip size="sm" variant="flat" color="primary" className="font-bold min-w-[28px] h-6">
                    {index + 1}
                  </Chip>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-secondary dark:text-foreground">{detalle.nombreProducto}</span>
                  </div>
                  <Chip variant="faded" size="sm" className="shrink-0 bg-default-100 border-default-200">
                    <span className="font-bold text-foreground">{detalle.cantProducto}</span>
                    <span className="ml-1" style={{ opacity: 0.7 }}>{detalle.abreviatura}</span>
                  </Chip>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
};

interface FormularioRecetaProps {
  receta: IPedidoSemanaBodegaPaginedDTO | null;
  mode: 'crear' | 'editar';
  productos: IProductoRecetaSelection[];
  onSave: (receta: IPedidoSemanaBodega, updatePayload?: IPedidoSemanaBodegaWithDetailsUpdateDTO) => Promise<void>;
  onValidationChange: (isValid: boolean) => void;
  history: any;
  isAdmin: boolean;
}

const FormularioReceta = React.forwardRef<any, FormularioRecetaProps>(
  ({ receta, mode, productos, onSave, onValidationChange, history, isAdmin }, ref) => {
    const toast = useToast();
    const { periodos, semanas, periodo, defaultSemanaId, isLoading: isLoadingSemanas, seleccionarPeriodo, seleccionarSemana } = usePeriodoSemana();
    const [nombre, setNombre] = React.useState(receta?.nombrePedido || '');
    const [descripcion, setDescripcion] = React.useState(receta?.descripcionPedido || '');
    const [estado, setEstado] = React.useState<'Activo' | 'Inactivo'>(receta?.estadoPedido || 'Activo');
    const [vistaTabla, setVistaTabla] = React.useState(false);
    const [asignaturas, setAsignaturas] = React.useState<IAsignatura[]>([]);
    const [idAsignaturaSeleccionada, setIdAsignaturaSeleccionada] = React.useState<string>(() => {
      if (mode === 'editar' && receta?.idAsignatura) {
        return receta.idAsignatura.toString();
      }
      return '';
    });

    // Texto local de cada input de cantidad (permite escribir coma y valores intermedios como "1,")
    // El valor real del ingrediente se actualiza solo cuando el texto es un número válido.
    // Se guarda en BD como NUMERIC(10, 3) de PostgreSQL (ej: 1500.5), pero se muestra con formato CL (ej: 1.500,5)
    const [cantidadesTexto, setCantidadesTexto] = React.useState<Record<string, string>>(() => {
      const inicial: Record<string, string> = {};
      (receta?.detalles || []).forEach(d => {
        inicial[d.idDetallePedido.toString()] = d.cantProducto
          ? d.cantProducto.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
          : '';
      });
      return inicial;
    });

    // Formatea cantidad con separador de miles (.) y decimal (,) solo para mostrar al usuario
    // El valor interno se mantiene sin formato y se guarda en BD como NUMERIC(10, 3) de PostgreSQL
    const formatearCantidadParaUsuario = (valor: number): string => {
      const partes = valor.toString().split('.');
      const enteros = partes[0];
      const decimales = partes[1] || '';

      // Agregar puntos de miles a los enteros
      const enterosFormateados = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

      // Combinar: enteros.decimales (con coma como separador decimal)
      return decimales
        ? `${enterosFormateados},${decimales}`
        : enterosFormateados;
    };

    const validarYActualizarCantidad = (
      val: string,
      index: number,
      id: string,
      esFraccionario: boolean,
      isTabla: boolean
    ) => {
      if (val === '') {
        setCantidadesTexto(prev => ({ ...prev, [id]: '' }));
        actualizarIngrediente(index, 'cantidad', 0);
        return;
      }

      if (/[^0-9,.]/.test(val)) return;

      // Eliminar puntos (el usuario NO debe escribirlos, el sistema los agrega)
      // Dejar números y coma (que será el decimal)
      let limpiado = val.replace(/\./g, ''); // Quitar puntos que intente escribir

      // Validar que solo tenga números y UNA coma
      const cantidadComas = (limpiado.match(/,/g) || []).length;
      if (cantidadComas > 1) {
        return; // Rechazar si más de una coma
      }

      // Normalizar coma a punto para cálculos
      const normalizado = limpiado.replace(',', '.');

      // Validar máximo 3 decimales después de la coma
      if (normalizado.includes('.')) {
        const decimals = normalizado.split('.')[1];
        if (decimals.length > 3) {
          return; // Rechazar si más de 3 decimales
        }
      }

      const numericValue = parseFloat(normalizado || '0');

      if (numericValue < 0) return;

      if (numericValue > 9999999.999) {
        toast.warning('La cantidad no puede superar 9.999.999,999');
        setCantidadesTexto(prev => ({ ...prev, [id]: formatearCantidadParaUsuario(9999999.999) }));
        actualizarIngrediente(index, 'cantidad', 9999999.999);
        return;
      }

      const digitsOnly = normalizado.replace('.', '');
      if (digitsOnly.length > 10) return;

      // normalizado termina en '.' cuando el usuario acaba de escribir la coma (ej: "1234567,")
      const terminaEnComa = normalizado.endsWith('.');

      if (limpiado && limpiado !== ',' && !isNaN(numericValue) && !terminaEnComa) {
        // Número completo — formatear entero con puntos de miles y preservar ceros decimales finales
        if (limpiado.includes(',')) {
          const [intParte, decParte] = limpiado.split(',');
          const intFormateado = intParte.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
          setCantidadesTexto(prev => ({ ...prev, [id]: `${intFormateado},${decParte}` }));
        } else {
          setCantidadesTexto(prev => ({ ...prev, [id]: formatearCantidadParaUsuario(numericValue) }));
        }
        actualizarIngrediente(index, 'cantidad', numericValue);
      } else if (terminaEnComa && limpiado !== ',') {
        // Usuario acaba de escribir la coma — mostrar entero formateado + coma
        const intParte = limpiado.slice(0, -1);
        const intFormateado = intParte.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        setCantidadesTexto(prev => ({ ...prev, [id]: `${intFormateado},` }));
        actualizarIngrediente(index, 'cantidad', parseFloat(intParte || '0'));
      } else {
        // Incompleto — mostrar sin formatear
        setCantidadesTexto(prev => ({ ...prev, [id]: limpiado }));
      }
    };

    // Inicializar idSemana desde sessionStorage (cache) o valor guardado en receta
    const [idSemana, setIdSemana] = React.useState<string>(() => {
      if (mode === 'editar' && receta?.idSemana) {
        return receta.idSemana.toString();
      }
      const stored = sessionStorage.getItem('kuhub_semana_id');
      return stored || 'ninguno';
    });

    // Verificar si hay periodos disponibles
    const sinPeriodos = !periodos || periodos.length === 0;

    const qtyRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

    // Snapshot de los detalles originales para calcular deltas en modo editar
    const originalDetallesRef = React.useRef<IDetallePedidoSemanaBodegaDTO[]>(receta?.detalles || []);

    // REEMPLAZAR deletedDetailIds por deletedProductIds
    const [deletedProductIds, setDeletedProductIds] = React.useState<number[]>([]);

    // Set de IDs de productos originales (los que vinieron de la DB)
    const originalProductIdsRef = React.useRef<Set<string>>(
      new Set((receta?.detalles || []).map(d => d.idProducto.toString()))
    );

    // REEMPLAZAR el estado y la inicialización de ingredientes en FormularioReceta
    const [ingredientes, setIngredientes] = React.useState<(IIngrediente & { observacion?: string })[]>(
      (receta?.detalles || []).map(d => ({
        id: d.idDetallePedido.toString(),
        productoId: d.idProducto.toString(),
        productoNombre: d.nombreProducto,
        cantidad: d.cantProducto,
        unidadMedida: d.abreviatura,
        observacion: d.observacion || '',
      }))
    );

    // Guardar idSemana en sessionStorage cuando cambia
    React.useEffect(() => {
      if (idSemana && idSemana !== 'ninguno') {
        sessionStorage.setItem('kuhub_semana_id', idSemana);
        seleccionarSemana(idSemana);
      } else if (idSemana === 'ninguno') {
        sessionStorage.removeItem('kuhub_semana_id');
      }
    }, [idSemana, seleccionarSemana]);

    React.useEffect(() => {
      obtenerAsignaturasActivasService()
        .then(setAsignaturas)
        .catch(err => {
          console.warn('Error cargando asignaturas:', err);
        });
    }, []);

    React.useEffect(() => {
      // 1. Validaciones básicas de integridad
      const isNombreValid = nombre.trim().length > 0;
      const isEstadoValid = !!estado;
      const hasIngredients = ingredientes.length > 0;
      const areIngredientsValid = ingredientes.every(ing =>
        ing.productoId && ing.cantidad > 0
      );
      const isValid = isNombreValid && isEstadoValid && hasIngredients && areIngredientsValid;

      // 2. Detección de cambios (solo relevante en modo editar)
      let hasChanges = false;
      if (mode === 'editar' && receta) {
        const changedNombre = nombre.trim() !== (receta.nombrePedido || '');
        const changedDesc = descripcion.trim() !== (receta.descripcionPedido || '');
        const changedEstado = estado !== (receta.estadoPedido || 'Activo');

        // Comparar idSemana (convertir a string para comparación)
        const currentIdSemana = idSemana && idSemana !== 'ninguno' ? Number(idSemana) : null;
        const originalIdSemana = receta.idSemana || null;
        const changedSemana = currentIdSemana !== originalIdSemana;

        // Comparar ingredientes consolidando cantidades para la comparación
        const currentIngsMap = new Map<string, { cantidad: number; observacion?: string }>();
        ingredientes.forEach(ing => {
          if (ing.productoId) {
            const existing = currentIngsMap.get(ing.productoId);
            if (existing) {
              existing.cantidad += ing.cantidad;
            } else {
              currentIngsMap.set(ing.productoId, {
                cantidad: ing.cantidad,
                observacion: ing.observacion
              });
            }
          }
        });

        const originalIngsMap = new Map(
          (receta.detalles || []).map(d => [d.idProducto.toString(), { cantidad: d.cantProducto, observacion: d.observacion }])
        );

        // ¿Diferente cantidad de productos únicos?
        let changedIngs = currentIngsMap.size !== originalIngsMap.size;

        if (!changedIngs) {
          // Si tienen el mismo número de productos, verificar si los IDs, cantidades y observaciones coinciden
          for (const [prodId, current] of currentIngsMap.entries()) {
            const original = originalIngsMap.get(prodId);
            if (!original ||
                Math.abs(original.cantidad - current.cantidad) > 0.0001 ||
                (current.observacion || '') !== (original.observacion || '')) {
              changedIngs = true;
              break;
            }
          }
        }

        const currentIdAsignatura = idAsignaturaSeleccionada ? parseInt(idAsignaturaSeleccionada) : null;
        const originalIdAsignatura = receta.idAsignatura || null;
        const changedAsignatura = currentIdAsignatura !== originalIdAsignatura;

        hasChanges = changedNombre || changedDesc || changedEstado || changedIngs || changedSemana || changedAsignatura;
      }

      // En modo 'crear' habilitamos si es válido. En 'editar' solo si es válido Y hubo cambios.
      const canSave = mode === 'crear' ? isValid : (isValid && hasChanges);
      onValidationChange(canSave);
    }, [nombre, descripcion, estado, ingredientes, idSemana, idAsignaturaSeleccionada, mode, receta, onValidationChange]);

    React.useImperativeHandle(ref, () => ({
      importarDesdeExcel: (resultados: IResultadoItemExcel[]) => {
        const nuevos = resultados
          .filter(r => r.estado === 'ok' && r.idProducto != null)
          .map(r => ({
            id: `excel_${r.fila}_${r.idProducto}_${Math.random().toString(36).slice(2)}`,
            productoId: r.idProducto!.toString(),
            productoNombre: r.nombreProducto ?? '',
            cantidad: r.cantidad ?? 0,
            unidadMedida: r.nombreUnidadMedida ?? '',
            observacion: r.observacion ?? ''
          }));
        if (nuevos.length > 0) {
          setIngredientes(prev => [...prev, ...nuevos]);
        }
      },

      setSemanaDesdeNumero: (numeroSemana: number) => {
        if (numeroSemana >= 1 && numeroSemana <= semanas.length) {
          const semanaTarget = semanas[numeroSemana - 1];
          if (semanaTarget) {
            setIdSemana(String(semanaTarget.idSemana));
          }
        }
      },

      setDescripcionDesdeExcel: (valor: string) => {
        setDescripcion(valor);
      },

      submit: async () => {
        // Validaciones iniciales
        if (!nombre.trim()) {
          toast.warning('El nombre de la pedido semanal es obligatorio');
          throw new Error('El nombre es requerido');
        }
        if (!idSemana || idSemana === 'ninguno') {
          toast.warning('El pedido semanal será creado sin vinculación a una semana');
        }
        if (ingredientes.length === 0) {
          toast.warning('Debe agregar al menos un ingrediente');
          throw new Error('Debe agregar al menos un ingrediente');
        }

        // Validar que todos los ingredientes tengan producto y cantidad antes de consolidar
        for (let i = 0; i < ingredientes.length; i++) {
          const ing = ingredientes[i];
          if (!ing.productoId) {
            toast.warning(`Seleccione un producto para el ingrediente ${i + 1}`);
            throw new Error('Producto no seleccionado');
          }
          if (ing.cantidad <= 0) {
            toast.warning(`La cantidad del ingrediente ${i + 1} debe ser mayor a 0`);
            throw new Error('Cantidad inválida');
          }
        }

        // Consolidar productos duplicados
        const ingredientesConsolidados: IIngrediente[] = [];
        const seenProductsMap = new Map<string, number>();

        ingredientes.forEach(ing => {
          if (seenProductsMap.has(ing.productoId)) {
            const index = seenProductsMap.get(ing.productoId)!;
            ingredientesConsolidados[index].cantidad += ing.cantidad;
          } else {
            seenProductsMap.set(ing.productoId, ingredientesConsolidados.length);
            ingredientesConsolidados.push({ ...ing });
          }
        });

        const recetaData: any = {
          id: receta?.idPedidoSemanaBodega?.toString() || '',
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          ingredientes: ingredientesConsolidados,
          instrucciones: '',
          estado,
          idSemana: idSemana && idSemana !== 'ninguno' ? Number(idSemana) : undefined,
          idAsignatura: idAsignaturaSeleccionada ? parseInt(idAsignaturaSeleccionada) : null,
          fechaCreacion: new Date().toISOString(),
          fechaActualizacion: new Date().toISOString(),
        };

        // REEMPLAZAR la sección de cálculo de deltas dentro del submit (modo editar)
        if (mode === 'editar' && receta) {
          const originalDetalles = originalDetallesRef.current;
          const originalMap = new Map(originalDetalles.map(d => [d.idProducto.toString(), d]));

          const newItems: { idProducto: number; cantUnidadMedida: number; observacion?: string }[] = [];
          const updateItems: { idProducto: number; cantUnidadMedida: number; observacion?: string }[] = [];

          ingredientesConsolidados.forEach(ing => {
            const original = originalMap.get(ing.productoId);
            const observacion = (ing as any).observacion || undefined;

            if (!original) {
              // Producto nuevo (no estaba en la DB)
              newItems.push({ idProducto: parseInt(ing.productoId), cantUnidadMedida: ing.cantidad, observacion });
            } else if (original.cantProducto !== ing.cantidad) {
              // Producto existente con cantidad modificada
              updateItems.push({ idProducto: parseInt(ing.productoId), cantUnidadMedida: ing.cantidad, observacion });
            }
          });

          const updatePayload: IPedidoSemanaBodegaWithDetailsUpdateDTO = {
            idPedidoSemanaBodega: receta.idPedidoSemanaBodega,
            nombrePedido: nombre.trim(),
            descripcionPedido: descripcion.trim() || undefined,
            estadoPedido: estado,
            newItems,
            updateItems,
            deleteItems: deletedProductIds, // IDs de PRODUCTOS, no de detalles
            idSemana: idSemana && idSemana !== 'ninguno' ? Number(idSemana) : undefined,
            idAsignatura: idAsignaturaSeleccionada ? parseInt(idAsignaturaSeleccionada) : null,
          };

          await onSave(recetaData, updatePayload);
        } else {
          await onSave(recetaData);
        }
      }
    }));

    const agregarIngrediente = () => {
      const nuevoIngrediente: IIngrediente & { observacion?: string } = {
        id: Date.now().toString(),
        productoId: '',
        productoNombre: '',
        cantidad: 0,
        unidadMedida: '',
        observacion: ''
      };
      setIngredientes([...ingredientes, nuevoIngrediente]);
    };

    const actualizarIngrediente = (index: number, campo: keyof (IIngrediente & { observacion?: string }), valor: any) => {
      const nuevosIngredientes = [...ingredientes];

      if (campo === 'productoId') {
        // Verificar si el producto ya existe en otra fila
        const indexDuplicado = ingredientes.findIndex((ing, i) => i !== index && ing.productoId === valor);
        if (indexDuplicado !== -1) {
          const duplicado = ingredientes[indexDuplicado];

          // Eliminamos la fila actual que intentaba ser un duplicado
          eliminarIngrediente(index);

          // Enfocamos y posicionamos el cursor al final de la cantidad para edición inmediata
          setTimeout(() => {
            // Intentamos obtener el input por ref o por selector de DOM como fallback
            let inputEl = qtyRefs.current[duplicado.id];

            if (!inputEl) {
              inputEl = document.querySelector(`input[data-ingrediente-id="${duplicado.id}"]`) as HTMLInputElement;
            }

            if (inputEl) {
              // Scroll para asegurar visibilidad
              inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

              // Foco y click simulado
              inputEl.focus();
              try {
                inputEl.click();
              } catch (e) { }

              // Truco para mover el cursor al final en lugar de seleccionar todo
              const val = inputEl.value;
              inputEl.value = '';
              inputEl.value = val;
            }
          }, 300);
          return;
        }

        const producto = productos.find(p => p.idProducto.toString() === valor);

        if (producto) {
          nuevosIngredientes[index] = {
            ...nuevosIngredientes[index],
            productoId: producto.idProducto.toString(),
            productoNombre: producto.nombreProducto,
            unidadMedida: producto.nombreUnidad
          };
        }
      } else {
        nuevosIngredientes[index] = {
          ...nuevosIngredientes[index],
          [campo]: valor
        };
      }

      setIngredientes(nuevosIngredientes);
    };

    // REEMPLAZAR la función eliminarIngrediente
    const eliminarIngrediente = (index: number) => {
      const ingToRemove = ingredientes[index];
      // Solo agregar a deleteItems si el producto existía originalmente en la DB
      if (originalProductIdsRef.current.has(ingToRemove.productoId)) {
        setDeletedProductIds(prev => [...prev, parseInt(ingToRemove.productoId)]);
      }
      setIngredientes(ingredientes.filter((_, i) => i !== index));
    };

    return (
      <div className="space-y-6">
        {/* === SECCIÓN: Información General === */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary">
              <Icon icon="lucide:file-text" width={20} />
            </div>
            <h4 className="font-bold text-base text-secondary dark:text-foreground">Información General</h4>
          </div>
          <Card shadow="none" className="border border-default-200 dark:border-default-100">
            <CardBody className="p-4 space-y-4">
              <Input
                label="Nombre del Pedido Semanal"
                placeholder="Ej: Pan Amasado, Torta de Chocolate, etc."
                value={nombre}
                onValueChange={setNombre}
                isRequired
                variant="bordered"
                maxLength={100}
                description={`${nombre.length}/100 caracteres`}
                classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                startContent={<Icon icon="lucide:chef-hat" className="text-default-400" width={18} />}
              />
              <Textarea
                label="Descripción (Opcional)"
                placeholder="Descripción breve del pedido semanal..."
                value={descripcion}
                onValueChange={setDescripcion}
                variant="bordered"
                minRows={2}
                classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
              />
              <div className="space-y-3">
                <label className="text-sm font-medium text-default-700">Semana (Opcional)</label>

                {/* Seleccionar Período */}
                {isLoadingSemanas ? (
                  <div className="flex items-center gap-2 text-sm text-default-500">
                    <Spinner size="sm" /> Cargando periodos...
                  </div>
                ) : sinPeriodos ? (
                  <p className="text-sm text-warning-600 dark:text-warning-400">
                    No hay periodos académicos disponibles. Contacte al administrador.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {periodos?.map(p =>
                      p.semestres.map((s: number) => (
                        <button
                          key={`${p.anio}-${s}`}
                          onClick={() => seleccionarPeriodo(p.anio, s)}
                          disabled={isLoadingSemanas}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            periodo?.anio === p.anio && periodo?.semestre === s
                              ? 'bg-primary text-white border-primary'
                              : 'border-default-200 dark:border-default-100 hover:border-primary'
                          }`}
                        >
                          {p.anio} - S{s}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Seleccionar Semana */}
                {!sinPeriodos && periodo && (
                  <>
                    {isLoadingSemanas ? (
                      <div className="flex items-center gap-2 text-sm text-default-500">
                        <Spinner size="sm" /> Cargando semanas...
                      </div>
                    ) : semanas.length === 0 ? (
                      <div className="flex items-center gap-3 p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-200/30 rounded-lg">
                        <Icon icon="lucide:alert-circle" width={18} className="text-warning-600 dark:text-warning-400 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-warning-700 dark:text-warning-300">
                            No hay períodos académicos disponibles.
                          </p>
                          <p className="text-xs text-warning-600 dark:text-warning-400 mt-1">
                            {isAdmin
                              ? 'Para realizar pedidos, genere el período académico desde Gestión Académica.'
                              : 'Contacte al Administrador para generar el período académico.'}
                          </p>
                        </div>
                        {isAdmin && (
                          <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            className="text-warning-600 dark:text-warning-400 hover:bg-warning-100 dark:hover:bg-warning-900/30 shrink-0"
                            onPress={() => history.push('/admin-sistema?tab=semanas')}
                            title="Ir a crear período académico"
                          >
                            <Icon icon="lucide:arrow-right" width={18} />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        <Select size="sm" variant="bordered"
                          selectedKeys={idSemana ? new Set([idSemana]) : new Set()}
                          onSelectionChange={(keys) => {
                            const v = Array.from(keys as Set<string>)[0];
                            setIdSemana(v || 'ninguno');
                          }}
                          placeholder="Seleccione una semana"
                          classNames={{ trigger: "bg-default-50", base: "max-w-xs" }}
                          startContent={<Icon icon="lucide:calendar" width={14} className="text-default-400 shrink-0" />}
                        >
                          <SelectItem key="ninguno" textValue="Ninguno">
                            <span className="text-default-500">Ninguno</span>
                          </SelectItem>
                          <>
                            {semanas?.map((semana) => (
                              <SelectItem key={String(semana.idSemana)} textValue={semana.nombreSemana}>
                                <div className="flex items-center w-full gap-2">
                                  <span className="font-semibold">{semana.nombreSemana}</span>
                                  <span className="text-default-400 text-xs">
                                    {new Date(semana.fechaInicio + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                    {' – '}
                                    {new Date(semana.fechaFin + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                  </span>
                                  {String(semana.idSemana) === defaultSemanaId && defaultSemanaId && (
                                    <Chip size="sm" color="success" variant="flat" className="ml-auto shrink-0">Actual</Chip>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        </Select>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Asignatura (Opcional) */}
              {asignaturas.length > 0 && (
                <Select
                  label="Asignatura (Opcional)"
                  placeholder="Selecciona una asignatura"
                  variant="bordered"
                  selectedKeys={idAsignaturaSeleccionada ? new Set([idAsignaturaSeleccionada]) : new Set()}
                  onSelectionChange={(keys) => setIdAsignaturaSeleccionada(Array.from(keys as Set<string>)[0] || '')}
                  classNames={{
                    label: 'text-sm font-medium text-default-700',
                    trigger: 'bg-white dark:bg-default-100/50',
                  }}
                  startContent={<Icon icon="lucide:book-open" width={14} className="text-default-400 shrink-0" />}
                >
                  <SelectItem key="" textValue="Ninguna">
                    <span className="text-default-500">Ninguna</span>
                  </SelectItem>
                  <>
                    {asignaturas?.map(asignatura => (
                      <SelectItem key={asignatura.idAsignatura.toString()} textValue={`${asignatura.nombreAsignatura} (${asignatura.codAsignatura})`}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{asignatura.nombreAsignatura}</span>
                          <span className="text-default-400 text-xs">({asignatura.codAsignatura})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                </Select>
              )}
            </CardBody>
          </Card>
        </div>

        {/* === SECCIÓN: Ingredientes === */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30 text-warning-600">
                <Icon icon="lucide:package-open" width={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-secondary dark:text-foreground">Ingredientes</h4>
                <p className="text-xs text-default-400">
                  {ingredientes.length === 0 ? 'Agrega al menos un ingrediente' : `${ingredientes.length} ingrediente${ingredientes.length > 1 ? 's' : ''} agregado${ingredientes.length > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {ingredientes.length > 0 && (
                <Button
                  variant="light"
                  size="sm"
                  color="danger"
                  onPress={() => {
                    if (mode === 'editar') {
                      setDeletedProductIds(
                        ingredientes
                          .filter(ing => originalProductIdsRef.current.has(ing.productoId))
                          .map(ing => parseInt(ing.productoId))
                      );
                    }
                    setIngredientes([]);
                    setCantidadesTexto({});
                  }}
                  startContent={<Icon icon="lucide:trash-2" width={14} />}
                  className="text-danger-500 hover:bg-danger-50 text-xs font-medium"
                >
                  Limpiar todo
                </Button>
              )}
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={() => setVistaTabla(!vistaTabla)}
                className="text-warning-600 hover:bg-warning-50"
                title={vistaTabla ? 'Ver como tarjetas' : 'Ver como tabla'}
              >
                <Icon icon={vistaTabla ? 'lucide:layout-grid' : 'lucide:table'} width={20} />
              </Button>
            </div>
          </div>

          {vistaTabla ? (
            // === VISTA TABLA ===
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
                <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                  <thead className="bg-warning-50 dark:bg-warning-900/20">
                    <tr>
                      <th className="text-center py-3 px-4 font-bold text-warning-700 dark:text-warning-400 w-[5%]">#</th>
                      <th className="text-center py-3 px-4 font-bold text-warning-700 dark:text-warning-400 w-[28%] truncate">Producto</th>
                      <th className="text-center py-3 px-4 font-bold text-warning-700 dark:text-warning-400 w-[27%] truncate">Cantidad</th>
                      <th className="text-center py-3 px-4 font-bold text-warning-700 dark:text-warning-400 w-[24%] truncate">Observación</th>
                      <th className="text-center py-3 px-4 font-bold text-warning-700 dark:text-warning-400 w-[5%]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredientes.map((ingrediente, index) => {
                      const productoInfo = productos.find(p => p.idProducto.toString() === ingrediente.productoId);
                      const esFraccionario = productoInfo?.esFraccionario || false;

                      return (
                        <tr key={ingrediente.id || index} className="border-b border-default-100 dark:border-default-50 hover:bg-default-50 dark:hover:bg-default-100/20">
                          <td className="py-3 px-4 text-center">
                            <Chip size="sm" variant="flat" color="warning" className="font-bold">
                              {index + 1}
                            </Chip>
                          </td>
                          <td className="py-3 px-4">
                            <Autocomplete
                              selectedKey={ingrediente.productoId || null}
                              onSelectionChange={(key) => {
                                if (key) actualizarIngrediente(index, 'productoId', key.toString());
                              }}
                              placeholder="Buscar producto..."
                              size="sm"
                              variant="bordered"
                              defaultItems={productos}
                              isClearable={false}
                              classNames={{ base: "bg-white dark:bg-default-100/50" }}
                            >
                              {(producto) => (
                                <AutocompleteItem key={producto.idProducto.toString()}>
                                  {producto.nombreProducto}
                                </AutocompleteItem>
                              )}
                            </Autocomplete>
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="text"
                              placeholder="Ej: 1500,5"
                              value={cantidadesTexto[ingrediente.id] ?? (ingrediente.cantidad === 0 ? '' : formatearCantidadParaUsuario(ingrediente.cantidad))}
                              onValueChange={(val) => {
                                if (val && val[0] === '-') return;
                                validarYActualizarCantidad(val, index, ingrediente.id, esFraccionario, true);
                              }}
                              size="sm"
                              variant="bordered"
                              endContent={
                                <span className="text-xs text-default-400 font-medium pr-2">
                                  {ingrediente.unidadMedida || '-'}
                                </span>
                              }
                              classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              placeholder="Notas especiales..."
                              value={ingrediente.observacion || ''}
                              onValueChange={(val) => {
                                if (val.length <= 100) {
                                  actualizarIngrediente(index, 'observacion', val);
                                }
                              }}
                              size="sm"
                              variant="bordered"
                              maxLength={100}
                              classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              color="danger"
                              onPress={() => eliminarIngrediente(index)}
                            >
                              <Icon icon="lucide:trash-2" width={16} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Button
                fullWidth
                size="lg"
                variant="bordered"
                onPress={agregarIngrediente}
                className="border-dashed border-2 border-default-200 dark:border-default-100 hover:border-primary/50 hover:bg-primary/5 font-bold text-primary"
                startContent={<Icon icon="lucide:plus" width={18} />}
              >
                Agregar Ingrediente
              </Button>
            </div>
          ) : (
            // === VISTA CARDS ===
            <div className="space-y-3">
              {ingredientes.map((ingrediente, index) => {
                const productoInfo = productos.find(p => p.idProducto.toString() === ingrediente.productoId);
                const esFraccionario = productoInfo?.esFraccionario || false;

                return (
                  <Card key={ingrediente.id || index} shadow="none" className="border border-default-200 dark:border-default-100 hover:border-primary-200 dark:hover:border-primary-400/30 transition-colors">
                    <CardBody className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Chip size="sm" variant="flat" color="primary" className="font-bold min-w-[28px] h-6">
                          {index + 1}
                        </Chip>
                        <span className="text-xs text-default-400 font-medium">
                          {ingrediente.productoNombre || 'Nuevo ingrediente'}
                        </span>
                        <div className="flex-1" />
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          color="danger"
                          onPress={() => eliminarIngrediente(index)}
                          className="h-8 w-8"
                        >
                          <Icon icon="lucide:trash-2" width={16} />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-[1.4fr_0.62fr_0.98fr] gap-3">
                          <Autocomplete
                            label="Producto"
                            placeholder="Buscar producto..."
                            selectedKey={ingrediente.productoId || null}
                            onSelectionChange={(key) => {
                              if (key) actualizarIngrediente(index, 'productoId', key.toString());
                            }}
                            size="sm"
                            variant="bordered"
                            classNames={{ base: "bg-white dark:bg-default-100/50", listboxWrapper: "max-h-[200px]" }}
                            isRequired
                            defaultItems={productos}
                            isClearable={false}
                          >
                            {(producto) => (
                              <AutocompleteItem key={producto.idProducto.toString()}>
                                {producto.nombreProducto}
                              </AutocompleteItem>
                            )}
                          </Autocomplete>

                          <Input
                            ref={(el) => {
                              if (el) {
                                const nativeInput = el.querySelector('input');
                                if (nativeInput) {
                                  qtyRefs.current[ingrediente.id] = nativeInput;
                                }
                              }
                            }}
                            data-ingrediente-id={ingrediente.id}
                            type="text"
                            label={
                              ingrediente.unidadMedida && ingrediente.unidadMedida.length > 8 ? (
                                <Tooltip
                                  content={ingrediente.unidadMedida}
                                  color="foreground"
                                  className="text-xs"
                                  placement="top"
                                >
                                  <span className="flex items-center gap-0.5">
                                    <span>Cant.</span>
                                    <span className="text-xs truncate max-w-[40px]">{ingrediente.unidadMedida.substring(0, 5)}...</span>
                                  </span>
                                </Tooltip>
                              ) : (
                                `Cant. ${ingrediente.unidadMedida || ''}`
                              )
                            }
                            placeholder="Ej: 1500,5"
                            value={cantidadesTexto[ingrediente.id] ?? (ingrediente.cantidad === 0 ? '' : formatearCantidadParaUsuario(ingrediente.cantidad))}
                            onValueChange={(val) => {
                              if (val && val[0] === '-') return;
                              validarYActualizarCantidad(val, index, ingrediente.id, esFraccionario, false);
                            }}
                            size="sm"
                            variant="bordered"
                            isRequired
                            classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                            description="Máx: 9.999.999,999"
                          />

                          <Input
                            label="Observación (Opcional)"
                            placeholder="Notas o instrucciones especiales..."
                            value={ingrediente.observacion || ''}
                            onValueChange={(val) => {
                              if (val.length <= 100) {
                                actualizarIngrediente(index, 'observacion', val);
                              }
                            }}
                            size="sm"
                            variant="bordered"
                            maxLength={100}
                            classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                            startContent={<Icon icon="lucide:note" className="text-default-400" width={16} />}
                            description={`${(ingrediente.observacion || '').length}/100 caracteres`}
                          />
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}

          {!vistaTabla && (
            <div className="mt-4">
              <Card
                shadow="none"
                className={`w-full border-2 border-dashed transition-all ${ingredientes.some(ing => !ing.productoId || ing.cantidad <= 0)
                  ? 'border-default-200 dark:border-default-100 opacity-50 cursor-not-allowed'
                  : 'border-default-200 dark:border-default-100 hover:border-primary/50 hover:bg-primary/5 cursor-pointer group'
                  }`}
                isPressable={!ingredientes.some(ing => !ing.productoId || ing.cantidad <= 0)}
                onPress={() => {
                  if (!ingredientes.some(ing => !ing.productoId || ing.cantidad <= 0)) {
                    agregarIngrediente();
                  }
                }}
              >
                <CardBody className="p-4 flex flex-col items-center justify-center gap-2">
                  <div className="p-2 rounded-full bg-default-100 dark:bg-default-100/30 group-hover:bg-primary/10 transition-colors">
                    <Icon icon="lucide:package-open" className="text-default-300 group-hover:text-primary transition-colors" width={24} />
                  </div>
                  <div className="text-center transition-colors">
                    <p className="text-default-400 text-sm font-medium group-hover:text-default-500">
                      {ingredientes.length === 0 ? 'No hay ingredientes agregados.' : '¿Necesitas añadir algo más?'}
                    </p>
                    <p className="text-primary font-bold">
                      {ingredientes.length === 0 ? 'Click aquí para agregar el primero' : 'Click aquí para agregar más'}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>

        {/* === SECCIÓN: Estado === */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className={`p-2 rounded-lg ${estado === 'Activo' ? 'bg-success-100 dark:bg-success-900/30 text-success' : 'bg-danger-100 dark:bg-danger-900/30 text-danger'}`}>
              <Icon icon={estado === 'Activo' ? 'lucide:check-circle' : 'lucide:x-circle'} width={20} />
            </div>
            <h4 className="font-bold text-base text-secondary dark:text-foreground">Estado de la Pedido Semanal</h4>
          </div>
          <Card shadow="none" className="border border-default-200 dark:border-default-100">
            <CardBody className="p-4">
              <Select
                label="Estado"
                placeholder="Seleccione el estado"
                selectedKeys={[estado]}
                onSelectionChange={(keys) => setEstado(Array.from(keys)[0] as 'Activo' | 'Inactivo')}
                variant="bordered"
                isRequired
                classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
                description="Esto permite la disponibilidad de la pedido semanal para solicitudes"
              >
                <SelectItem key="Activo" startContent={<Icon icon="lucide:check-circle" className="text-success" width={16} />}>Activo</SelectItem>
                <SelectItem key="Inactivo" startContent={<Icon icon="lucide:x-circle" className="text-danger" width={16} />}>Inactivo</SelectItem>
              </Select>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }
);

export default PedidoSemanalABodegaPage;