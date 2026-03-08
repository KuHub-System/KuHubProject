import React from 'react';
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
  Spinner,
  Tooltip
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast, useConfirm } from '../hooks/useToast';
import { useAuth } from '../contexts/auth-context';

// IMPORTAR TIPOS Y SERVICIOS
import { IReceta, IIngrediente } from '../types/receta.types';
import {
  obtenerRecetasPaginadasService,
  crearRecetaService,
  actualizarRecetaService,
  cambiarEstadoRecetaService,
  eliminarRecetaService,
  crearRecetaConDetallesService,
  obtenerRecetasCountService,
  buscarRecetasPaginadasService
} from '../services/receta-service';
import { obtenerProductosParaRecetaService } from '../services/producto-service';
import { IProductoRecetaSelection } from '../types/producto.types';
import { IRecetaPaginedDTO, IPaginationMeta, IRecetaCountResponse } from '../types/receta.types';

/**
 * Página de gestión de recetas simplificada.
 */
const GestionRecetasPage: React.FC = () => {
  usePageTitle('Gestión Recetas', 'Crea, edita y administra las recetas del sistema y sus formulaciones');
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const esSoloLectura = user?.rol === 'Profesor';
  const esAdministrador = user?.rol === 'Administrador';

  const [recetas, setRecetas] = React.useState<IRecetaPaginedDTO[]>([]);
  const [productos, setProductos] = React.useState<IProductoRecetaSelection[]>([]);
  const [recetaSeleccionada, setRecetaSeleccionada] = React.useState<IRecetaPaginedDTO | null>(null);
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar' | 'ver'>('crear');
  const [searchTerm, setSearchTerm] = React.useState<string>('');

  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const nextPageRef = React.useRef<number>(2);
  const isLoadingMoreRef = React.useRef<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false);
  const [recetaCounts, setRecetaCounts] = React.useState<IRecetaCountResponse>({
    totalReceta: 0,
    total_activos: 0,
    total_inactivos: 0
  });

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Cargar recetas iniciales y productos
  React.useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      setIsLoading(true);
      const [resRecetas, resProductos, resCounts] = await Promise.all([
        obtenerRecetasPaginadasService(1),
        obtenerProductosParaRecetaService(),
        obtenerRecetasCountService()
      ]);

      setRecetas(resRecetas.content);
      setProductos(resProductos);
      setRecetaCounts(resCounts);
      setTotalPages(resRecetas.paging.totalPages);
      nextPageRef.current = 2;
    } catch (error) {
      toast.error('Error al cargar las recetas');
    } finally {
      setIsLoading(false);
    }
  };

  const cargarMasRecetas = React.useCallback(async () => {
    if (isLoadingMoreRef.current || nextPageRef.current > totalPages) return;

    try {
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);

      const data = searchTerm
        ? await buscarRecetasPaginadasService(searchTerm, nextPageRef.current)
        : await obtenerRecetasPaginadasService(nextPageRef.current);

      setRecetas(prev => [...prev, ...data.content]);
      nextPageRef.current += 1;
    } catch (error) {
      toast.error('Error al cargar más recetas');
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [totalPages, toast]);

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
        const res = await buscarRecetasPaginadasService(searchTerm, 1);
        setRecetas(res.content);
        setTotalPages(res.paging.totalPages);
        nextPageRef.current = 2;
      } catch (error) {
        toast.error('Error al buscar recetas');
      } finally {
        setIsLoading(false);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const recetasAMostrar = recetas;

  const handleNuevaReceta = () => {
    setModalMode('crear');
    setRecetaSeleccionada(null);
    onOpen();
  };

  const handleEditarReceta = (receta: IRecetaPaginedDTO | any) => {
    setModalMode('editar');
    setRecetaSeleccionada(receta);
    onOpen();
  };

  const handleVerReceta = (receta: IRecetaPaginedDTO | any) => {
    setModalMode('ver');
    setRecetaSeleccionada(receta);
    onOpen();
  };

  const cambiarEstadoReceta = async (id: string | number, nuevoEstado: boolean) => {
    try {
      await cambiarEstadoRecetaService(id.toString(), nuevoEstado);
      await cargarDatosIniciales();
      toast.success(`Receta ${nuevoEstado ? 'activada' : 'inactivada'} correctamente`);
    } catch (error) {
      toast.error('Error al cambiar el estado de la receta');
    }
  };

  const handleGuardarReceta = async (receta: IReceta) => {
    try {
      if (modalMode === 'crear') {
        const success = await crearRecetaConDetallesService({
          nombreReceta: receta.nombre,
          descripcionReceta: receta.descripcion,
          listaItems: receta.ingredientes.map(ing => ({
            idProducto: parseInt(ing.productoId),
            cantUnidadMedida: ing.cantidad
          })),
          instrucciones: receta.instrucciones,
          estadoReceta: receta.estado === 'Activo' || (receta.estado as any) === 'Activa' ? 'Activo' : 'Inactivo'
        });

        if (success) {
          toast.success('Receta creada correctamente');
        } else {
          toast.error('No se pudo crear la receta');
        }
      } else if (modalMode === 'editar') {
        await actualizarRecetaService({
          id: receta.id,
          nombre: receta.nombre,
          descripcion: receta.descripcion,
          ingredientes: receta.ingredientes,
          instrucciones: receta.instrucciones,
          estado: receta.estado === 'Activo' || (receta.estado as any) === 'Activa' ? 'Activo' : 'Inactivo'
        });
        toast.success('Receta actualizada correctamente');
      }
      await cargarDatosIniciales();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la receta');
      throw error;
    }
  };

  const handleEliminarReceta = async (receta: IRecetaPaginedDTO | any) => {
    if (!esAdministrador) {
      toast.warning('Solo el rol Administrador puede eliminar recetas.');
      return;
    }

    const confirmado = await confirm(
      `Eliminarás definitivamente la receta "${receta.nombreReceta}".`,
      {
        title: 'Eliminar receta',
        confirmText: 'Eliminar',
        confirmColor: 'danger',
        requireText: 'ELIMINAR',
        requireTextHelper: 'Esta acción es irreversible. Escribe ELIMINAR para confirmar.',
      }
    );

    if (!confirmado) return;

    try {
      await eliminarRecetaService(receta.idReceta.toString());
      toast.success('Receta eliminada correctamente');
      await cargarDatosIniciales();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la receta');
    }
  };

  const renderEstado = (estado: boolean) => {
    if (estado) return <Chip color="success" size="sm">Activo</Chip>;
    return <Chip color="danger" size="sm">Inactivo</Chip>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Spinner size="lg" color="primary" className="mb-4" />
          <p className="text-default-500 font-bold">Cargando recetas...</p>
        </div>
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
                <p className="text-sm font-semibold text-default-500 uppercase tracking-wide">Total Recetas</p>
                <p className="text-3xl font-bold text-secondary mt-1">{recetaCounts.totalReceta}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 text-primary shrink-0">
                <Icon icon="lucide:book-open" width={24} />
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
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <Input
                placeholder="Buscar recetas por nombre o descripción..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                startContent={<Icon icon="lucide:search" className="text-default-400" />}
                isClearable
                onClear={() => setSearchTerm('')}
                className="w-full md:w-1/3"
                variant="bordered"
                classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
              />

              <div className="flex items-center gap-2">
                {!esSoloLectura && (
                  <Button
                    color="primary"
                    variant="solid"
                    size="md"
                    className="font-bold text-secondary shadow-sm"
                    startContent={<Icon icon="lucide:plus" width={18} />}
                    onPress={handleNuevaReceta}
                  >
                    Nueva Receta
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
          </CardBody>
        </Card>

        {/* Tabla */}
        <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1 mx-4">
          <CardBody className="p-0">
            <Table
              aria-label="Tabla de recetas"
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
                <TableColumn width="25%" align="center">NOMBRE RECETA</TableColumn>
                <TableColumn width="35%" align="center">DESCRIPCIÓN</TableColumn>
                <TableColumn width="15%" align="center">INGREDIENTES</TableColumn>
                <TableColumn width="10%" align="center">ESTADO</TableColumn>
                <TableColumn width="15%" align="center">ACCIONES</TableColumn>
              </TableHeader>
              <TableBody
                emptyContent={
                  <div className="py-12 text-center text-default-400">
                    <Icon icon="lucide:book-x" className="mx-auto mb-3 opacity-50" width={48} />
                    <p className="text-lg font-medium">No se encontraron recetas</p>
                  </div>
                }
              >
                {recetasAMostrar.map((receta) => (
                  <TableRow
                    key={receta.idReceta}
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
                      <Tooltip content={receta.nombreReceta} delay={500} closeDelay={0}>
                        <div className="flex justify-center w-full">
                          <p className="font-semibold text-secondary dark:text-foreground truncate text-center w-full">
                            {receta.nombreReceta}
                          </p>
                        </div>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip content={receta.descripcionReceta || '-'} delay={800} closeDelay={0} className="max-w-[400px]">
                        <div className="flex justify-center w-full">
                          <p className="text-sm text-default-500 text-center w-full">
                            {receta.descripcionReceta && receta.descripcionReceta.length > 100
                              ? `${receta.descripcionReceta.substring(0, 100)}...`
                              : receta.descripcionReceta || '-'}
                          </p>
                        </div>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-center">
                      <Chip size="sm" variant="flat">
                        {receta.totalIngredientes} ingredientes
                      </Chip>
                    </TableCell>
                    <TableCell className="text-center">{renderEstado(receta.estado)}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        {!esSoloLectura && (
                          <>
                            <Tooltip content="Editar receta" delay={0}>
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

                            <Tooltip content={receta.estado ? 'Inactivar receta' : 'Activar receta'} delay={0}>
                              <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                onPress={() => cambiarEstadoReceta(
                                  receta.idReceta,
                                  !receta.estado
                                )}
                                className={receta.estado ? 'text-default-400 hover:text-danger z-10' : 'text-default-400 hover:text-success z-10'}
                                style={{ cursor: 'pointer' }}
                              >
                                <Icon
                                  icon={receta.estado ? 'lucide:x-circle' : 'lucide:check-circle'}
                                  width={18}
                                />
                              </Button>
                            </Tooltip>
                            {esAdministrador && (
                              <Tooltip content="Eliminar receta" delay={0}>
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
        hideCloseButton
        classNames={{
          base: "rounded-[32px] overflow-hidden",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <DetalleReceta
              receta={recetaSeleccionada}
              mode={modalMode}
              productos={productos}
              onClose={onClose}
              onSave={async (nuevaReceta) => {
                try {
                  await handleGuardarReceta(nuevaReceta);
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

interface DetalleRecetaProps {
  receta: IRecetaPaginedDTO | null;
  mode: 'crear' | 'editar' | 'ver';
  productos: IProductoRecetaSelection[];
  onClose: () => void;
  onSave: (receta: IReceta) => Promise<void>;
}

const DetalleReceta: React.FC<DetalleRecetaProps> = ({ receta, mode, productos, onClose, onSave }) => {
  const [isSaving, setIsSaving] = React.useState(false);
  const [isValidForm, setIsValidForm] = React.useState(false);
  const formRef = React.useRef<any>(null);

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

  return (
    <>
      <ModalHeader className="border-b border-default-100 dark:border-default-50/50 bg-white dark:bg-content2 rounded-t-[32px]">
        <div className="flex items-center gap-2">
          <Icon
            icon={mode === 'crear' ? 'lucide:plus-circle' : mode === 'editar' ? 'lucide:edit-3' : 'lucide:book-open'}
            className="text-primary"
            width={24}
          />
          <span className="font-bold text-lg text-secondary dark:text-foreground">
            {mode === 'crear' ? 'Nueva Receta' : mode === 'editar' ? 'Editar Receta' : 'Detalle de Receta'}
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
          />
        )}
      </ModalBody>
      <ModalFooter className="bg-default-50 dark:bg-content2 border-t border-default-100 dark:border-default-50/50 rounded-b-[32px]">
        <Button variant="ghost" onPress={onClose} isDisabled={isSaving} className="font-medium">
          {mode === 'ver' ? 'Cerrar' : 'Cancelar'}
        </Button>
        {mode !== 'ver' && (
          <Button
            color="primary"
            variant="solid"
            onPress={handleSubmit}
            isLoading={isSaving}
            isDisabled={isSaving || !isValidForm}
            className="font-bold text-secondary shadow-md"
            startContent={<Icon icon="lucide:save" />}
          >
            {mode === 'crear' ? 'Crear Receta' : 'Guardar Cambios'}
          </Button>
        )}
      </ModalFooter>
    </>
  );
};

interface VistaRecetaProps {
  receta: IRecetaPaginedDTO;
}

const VistaReceta: React.FC<VistaRecetaProps> = ({ receta }) => {
  return (
    <div className="space-y-6">
      <Card shadow="none" className="border-1 border-default-200 dark:border-default-100 bg-default-50/50">
        <CardBody className="gap-2">
          <h3 className="text-xl font-bold text-secondary dark:text-foreground">{receta.nombreReceta}</h3>
          {receta.descripcionReceta && (
            <p className="text-default-500 text-sm leading-relaxed">{receta.descripcionReceta}</p>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card shadow="none" className="border-1 border-default-200 dark:border-default-100">
          <CardBody className="p-4 flex flex-col justify-center gap-1">
            <p className="text-xs text-default-500 uppercase font-semibold tracking-wider">Estado de Receta</p>
            <div>
              <Chip
                color={receta.estado ? 'success' : 'danger'}
                size="sm"
                variant="flat"
                className="font-medium"
                startContent={<Icon icon={receta.estado ? 'lucide:check-circle-2' : 'lucide:x-circle'} width={14} className="ml-1" />}
              >
                {receta.estado ? 'Activo' : 'Inactivo'}
              </Chip>
            </div>
          </CardBody>
        </Card>

        <Card shadow="none" className="border-1 border-default-200 dark:border-default-100">
          <CardBody className="p-4 flex flex-col justify-center gap-1">
            <p className="text-xs text-default-500 uppercase font-semibold tracking-wider">Total Elementos</p>
            <div className="flex items-center gap-2">
              <Icon icon="lucide:layers" className="text-primary" width={18} />
              <p className="font-semibold text-lg">{receta.totalIngredientes} ingredientes</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4 mt-2">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary">
            <Icon icon="lucide:package-open" width={20} />
          </div>
          <h4 className="font-bold text-lg">Ingredientes de la formulación</h4>
        </div>

        <Card shadow="none" className="border border-default-200 dark:border-default-100">
          <CardBody className="p-0">
            <Table
              aria-label="Ingredientes"
              removeWrapper
              classNames={{
                th: "bg-default-50 text-default-500 font-bold uppercase text-xs h-10 border-b border-default-200/50",
                td: "py-3 border-b border-default-50 dark:border-default-50/10 group-data-[last=true]:border-none px-4"
              }}
            >
              <TableHeader>
                <TableColumn>PRODUCTO</TableColumn>
                <TableColumn align="end">CANTIDAD</TableColumn>
              </TableHeader>
              <TableBody>
                {(receta.detalles || []).map((detalle) => (
                  <TableRow key={detalle.idDetalleReceta} className="hover:bg-default-50 dark:hover:bg-default-100/50">
                    <TableCell>
                      <span className="font-medium">{detalle.nombreProducto}</span>
                    </TableCell>
                    <TableCell>
                      <Chip variant="faded" color="primary" size="sm" className="font-semibold">
                        {detalle.cantProducto} {detalle.abreviatura}
                      </Chip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 mt-4">
          <div className="p-2 rounded-lg bg-secondary-100 dark:bg-secondary-900/30 text-secondary">
            <Icon icon="lucide:file-text" width={20} />
          </div>
          <h4 className="font-bold text-lg">Instrucciones</h4>
        </div>
        <Card shadow="none" className="bg-default-50 dark:bg-default-100/30 border border-default-200 dark:border-default-100/50">
          <CardBody className="p-4">
            <p className="whitespace-pre-line text-sm text-default-600 dark:text-default-400 italic">
              Sin instrucciones disponibles en la vista rápida
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

interface FormularioRecetaProps {
  receta: IRecetaPaginedDTO | null;
  mode: 'crear' | 'editar';
  productos: IProductoRecetaSelection[];
  onSave: (receta: IReceta) => Promise<void>;
  onValidationChange: (isValid: boolean) => void;
}

const FormularioReceta = React.forwardRef<any, FormularioRecetaProps>(
  ({ receta, mode, productos, onSave, onValidationChange }, ref) => {
    const toast = useToast();
    const [nombre, setNombre] = React.useState(receta?.nombreReceta || '');
    const [descripcion, setDescripcion] = React.useState(receta?.descripcionReceta || '');
    const [instrucciones, setInstrucciones] = React.useState(''); // RecetaPaginedDTO no devuelve instrucciones (esto es una carga de listado simple) para el editar se necesitaría un fetch completo si quisieramos las instrucciones. Pero se omitirá o se dejará un fetch condicional. Para simplificar, se la asumimos vacía.
    const [estado, setEstado] = React.useState<'Activo' | 'Inactivo'>(() => {
      if (mode === 'crear') return 'Activo';
      const initial = receta?.estado;
      if (initial) return 'Activo';
      return 'Inactivo';
    });

    const qtyRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

    // Mapeo inverso de los detalles a la estructura IReceta esperada por el form
    const [ingredientes, setIngredientes] = React.useState<IIngrediente[]>(
      (receta?.detalles || []).map(d => ({
        id: Date.now().toString() + Math.random().toString(), // Generar ids al azar
        productoId: d.idProducto.toString(),
        productoNombre: d.nombreProducto,
        cantidad: d.cantProducto,
        unidadMedida: d.abreviatura
      }))
    );

    React.useEffect(() => {
      const isNombreValid = nombre.trim().length > 0;
      const isEstadoValid = !!estado;
      const hasIngredients = ingredientes.length > 0;
      const areIngredientsValid = ingredientes.every(ing =>
        ing.productoId && ing.cantidad > 0
      );

      onValidationChange(isNombreValid && isEstadoValid && hasIngredients && areIngredientsValid);
    }, [nombre, estado, ingredientes, onValidationChange]);

    React.useImperativeHandle(ref, () => ({
      submit: async () => {
        // Validaciones iniciales
        if (!nombre.trim()) {
          toast.warning('El nombre de la receta es obligatorio');
          throw new Error('El nombre es requerido');
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

        const recetaData: IReceta = {
          id: receta?.idReceta?.toString() || '',
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          ingredientes: ingredientesConsolidados,
          instrucciones: instrucciones.trim(),
          estado,
          fechaCreacion: new Date().toISOString(),
          fechaActualizacion: new Date().toISOString(),
        };

        await onSave(recetaData);
      }
    }));

    const agregarIngrediente = () => {
      const nuevoIngrediente: IIngrediente = {
        id: Date.now().toString(),
        productoId: '',
        productoNombre: '',
        cantidad: 0,
        unidadMedida: ''
      };
      setIngredientes([...ingredientes, nuevoIngrediente]);
    };

    const actualizarIngrediente = (index: number, campo: keyof IIngrediente, valor: any) => {
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

    const eliminarIngrediente = (index: number) => {
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
                label="Nombre de la Receta"
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
                placeholder="Descripción breve de la receta..."
                value={descripcion}
                onValueChange={setDescripcion}
                variant="bordered"
                minRows={2}
                classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
              />
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
          </div>

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
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr] gap-3">
                      <Select
                        label="Producto"
                        placeholder="Seleccione producto"
                        selectedKeys={ingrediente.productoId ? [ingrediente.productoId] : []}
                        onSelectionChange={(keys) => actualizarIngrediente(index, 'productoId', Array.from(keys)[0])}
                        size="sm"
                        variant="bordered"
                        classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
                        isRequired
                        items={productos}
                      >
                        {(producto) => (
                          <SelectItem key={producto.idProducto.toString()}>
                            {producto.nombreProducto}
                          </SelectItem>
                        )}
                      </Select>

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
                        type="number"
                        label="Cantidad"
                        placeholder="0"
                        value={ingrediente.cantidad === 0 ? '' : ingrediente.cantidad.toString()}
                        onValueChange={(val) => {
                          if (!esFraccionario && val.includes('.')) {
                            return;
                          }
                          if (esFraccionario && val.includes('.') && val.split('.')[1].length > 3) {
                            return;
                          }
                          actualizarIngrediente(index, 'cantidad', parseFloat(val) || 0);
                        }}
                        size="sm"
                        variant="bordered"
                        min="0"
                        step={esFraccionario ? "0.001" : "1"}
                        isRequired
                        classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                        endContent={
                          <Chip size="sm" variant="flat" color="default" className="text-xs">
                            {ingrediente.unidadMedida || 'unidad'}
                          </Chip>
                        }
                      />
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>

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
        </div>

        {/* === SECCIÓN: Instrucciones === */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-secondary-100 dark:bg-secondary-900/30 text-secondary">
              <Icon icon="lucide:list-ordered" width={20} />
            </div>
            <div>
              <h4 className="font-bold text-base text-secondary dark:text-foreground">Instrucciones</h4>
              <p className="text-xs text-default-400">Opcional - describe los pasos de preparación</p>
            </div>
          </div>
          <Card shadow="none" className="border border-default-200 dark:border-default-100">
            <CardBody className="p-4">
              <Textarea
                placeholder="Paso 1: ...&#10;Paso 2: ...&#10;Paso 3: ..."
                value={instrucciones}
                onValueChange={setInstrucciones}
                variant="bordered"
                minRows={4}
                classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
              />
            </CardBody>
          </Card>
        </div>

        {/* === SECCIÓN: Estado === */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className={`p-2 rounded-lg ${estado === 'Activo' ? 'bg-success-100 dark:bg-success-900/30 text-success' : 'bg-danger-100 dark:bg-danger-900/30 text-danger'}`}>
              <Icon icon={estado === 'Activo' ? 'lucide:check-circle' : 'lucide:x-circle'} width={20} />
            </div>
            <h4 className="font-bold text-base text-secondary dark:text-foreground">Estado de la Receta</h4>
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
                description="Esto permite la disponibilidad de la receta para solicitudes"
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

export default GestionRecetasPage;