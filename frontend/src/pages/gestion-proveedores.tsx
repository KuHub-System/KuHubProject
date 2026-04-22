/**
 * PÁGINA DE GESTIÓN DE PROVEEDORES
 * Conectada con el backend /api/v1/proveedor
 * Reemplaza el mock data anterior por llamadas reales a la API.
 */

import React from 'react';
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  useDisclosure,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTitle } from '../hooks/usePageTitle';
import { useModulePermission } from '../contexts/permission-context';
import {
  obtenerProveedoresService,
  obtenerProveedorDetalleService,
  crearProveedorService,
  actualizarProveedorService,
  eliminarProveedorService,
  agregarProductoProveedorService,
  actualizarPrecioProductoService,
  quitarProductoProveedorService,
} from '../services/proveedor-service';
import { obtenerProductosParaRecetaService } from '../services/inventario-service';
import type {
  IProveedor,
  IProveedorDetalle,
  IProveedorProducto,
  IProveedorCreateDTO,
  IProveedorUpdateDTO,
  EstadoProveedor,
} from '../types/proveedor.types';
import type { IProductoRecetaSelection } from '../types/producto.types';

// ── Helpers de UI ─────────────────────────────────────────────────────────────

const renderEstado = (estado: EstadoProveedor) => {
  return estado === 'DISPONIBLE'
    ? <Chip color="success" size="sm" variant="flat">Disponible</Chip>
    : <Chip color="danger" size="sm" variant="flat">No Disponible</Chip>;
};

const renderDisponibilidad = (activo: boolean) => {
  return activo
    ? <Chip color="success" size="sm" variant="flat">Activo</Chip>
    : <Chip color="warning" size="sm" variant="flat">Inactivo</Chip>;
};

const formatPrecio = (precio: number) =>
  `$${precio.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// ── Componente principal ──────────────────────────────────────────────────────

const GestionProveedoresPage: React.FC = () => {
  const {
    canCreate: prov_Crear,
    canUpdate: prov_Editar,
    canDelete: prov_Eliminar,
  } = useModulePermission('GESTION_PROVEEDORES');

  usePageTitle(
    'Gestión de Proveedores',
    'Administre los proveedores y sus productos con precios actualizados.',
    'lucide:truck'
  );

  // ── Estado principal ──
  const [proveedores, setProveedores] = React.useState<IProveedor[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // ── Filtros ──
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filtroEstado, setFiltroEstado] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 8;

  // ── Filas expandidas ──
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());
  const [detalleCache, setDetalleCache] = React.useState<Record<number, IProveedorDetalle>>({});
  const [loadingDetalle, setLoadingDetalle] = React.useState<Set<number>>(new Set());

  // ── Modal proveedor ──
  const { isOpen: isProvModal, onOpen: openProvModal, onOpenChange: onProvModalChange } = useDisclosure();
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar' | 'ver'>('crear');
  const [proveedorSeleccionado, setProveedorSeleccionado] = React.useState<IProveedor | null>(null);

  // ── Modal producto ──
  const { isOpen: isProdModal, onOpen: openProdModal, onOpenChange: onProdModalChange } = useDisclosure();
  const [proveedorParaProducto, setProveedorParaProducto] = React.useState<number | null>(null);
  const [productos, setProductos] = React.useState<IProductoRecetaSelection[]>([]);

  // ── Modal confirmar eliminar proveedor ──
  const { isOpen: isDelModal, onOpen: openDelModal, onOpenChange: onDelModalChange } = useDisclosure();
  const [proveedorAEliminar, setProveedorAEliminar] = React.useState<IProveedor | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  // ── Modal confirmar quitar producto ──
  const { isOpen: isQuitarModal, onOpen: openQuitarModal, onOpenChange: onQuitarModalChange } = useDisclosure();
  const [quitarTarget, setQuitarTarget] = React.useState<{ idProveedor: number; idProducto: number; nombre: string } | null>(null);

  // ── Precio inline ──
  const [editingPrecio, setEditingPrecio] = React.useState<{ idProveedor: number; idProducto: number } | null>(null);
  const [precioTemp, setPrecioTemp] = React.useState('');
  const [savingPrecio, setSavingPrecio] = React.useState(false);

  // ── Toast simple ──
  const [toast, setToast] = React.useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Carga inicial ─────────────────────────────────────────────────────────

  const cargarProveedores = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await obtenerProveedoresService(
        filtroEstado || undefined,
        searchTerm || undefined
      );
      setProveedores(data);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || 'Error al cargar proveedores');
    } finally {
      setIsLoading(false);
    }
  }, [filtroEstado, searchTerm]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      cargarProveedores();
    }, 300);
    return () => clearTimeout(timer);
  }, [cargarProveedores]);

  // ── Paginación ────────────────────────────────────────────────────────────

  const paginatedProveedores = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return proveedores.slice(start, start + rowsPerPage);
  }, [currentPage, proveedores, rowsPerPage]);

  const totalPages = Math.ceil(proveedores.length / rowsPerPage);

  // ── Expansión de filas ────────────────────────────────────────────────────

  const toggleRowExpansion = async (idProveedor: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(idProveedor)) {
      newExpanded.delete(idProveedor);
    } else {
      newExpanded.add(idProveedor);
      // Cargar detalle si no está en caché
      if (!detalleCache[idProveedor]) {
        setLoadingDetalle(prev => new Set(prev).add(idProveedor));
        try {
          const detalle = await obtenerProveedorDetalleService(idProveedor);
          setDetalleCache(prev => ({ ...prev, [idProveedor]: detalle }));
        } catch (err: any) {
          showToast(err.message || 'Error al cargar productos del proveedor', 'error');
          newExpanded.delete(idProveedor);
        } finally {
          setLoadingDetalle(prev => {
            const s = new Set(prev);
            s.delete(idProveedor);
            return s;
          });
        }
      }
    }
    setExpandedRows(newExpanded);
  };

  const invalidarCacheProveedor = (idProveedor: number) => {
    setDetalleCache(prev => {
      const next = { ...prev };
      delete next[idProveedor];
      return next;
    });
  };

  // ── Acciones de proveedor ─────────────────────────────────────────────────

  const handleNuevoProveedor = () => {
    setModalMode('crear');
    setProveedorSeleccionado(null);
    openProvModal();
  };

  const handleEditarProveedor = (p: IProveedor) => {
    setModalMode('editar');
    setProveedorSeleccionado(p);
    openProvModal();
  };

  const handleVerProveedor = (p: IProveedor) => {
    setModalMode('ver');
    setProveedorSeleccionado(p);
    openProvModal();
  };

  const handleConfirmarEliminar = (p: IProveedor) => {
    setProveedorAEliminar(p);
    openDelModal();
  };

  const handleEliminarProveedor = async () => {
    if (!proveedorAEliminar) return;
    setDeletingId(proveedorAEliminar.idProveedor);
    try {
      await eliminarProveedorService(proveedorAEliminar.idProveedor);
      showToast(`Proveedor "${proveedorAEliminar.nombreDistribuidora}" eliminado correctamente`);
      await cargarProveedores();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar el proveedor', 'error');
    } finally {
      setDeletingId(null);
      setProveedorAEliminar(null);
    }
  };

  const handleGuardarProveedor = async (dto: IProveedorCreateDTO | IProveedorUpdateDTO) => {
    try {
      if (modalMode === 'crear') {
        await crearProveedorService(dto as IProveedorCreateDTO);
        showToast('Proveedor creado correctamente');
      } else if (modalMode === 'editar' && proveedorSeleccionado) {
        await actualizarProveedorService(proveedorSeleccionado.idProveedor, dto as IProveedorUpdateDTO);
        showToast('Proveedor actualizado correctamente');
        invalidarCacheProveedor(proveedorSeleccionado.idProveedor);
      }
      await cargarProveedores();
    } catch (err: any) {
      throw err; // El formulario lo captura y muestra el error
    }
  };

  // ── Acciones de producto ──────────────────────────────────────────────────

  const handleAbrirAsignarProducto = async (idProveedor: number) => {
    setProveedorParaProducto(idProveedor);
    if (productos.length === 0) {
      try {
        const data = await obtenerProductosParaRecetaService();
        setProductos(data);
      } catch {
        showToast('Error al cargar la lista de productos', 'error');
      }
    }
    openProdModal();
  };

  const handleGuardarProducto = async (idProducto: number, precio: number) => {
    if (!proveedorParaProducto) return;
    try {
      await agregarProductoProveedorService(proveedorParaProducto, { idProducto, precioProducto: precio });
      showToast('Producto asignado correctamente');
      invalidarCacheProveedor(proveedorParaProducto);
      // Recargar detalle si la fila está expandida
      if (expandedRows.has(proveedorParaProducto)) {
        const detalle = await obtenerProveedorDetalleService(proveedorParaProducto);
        setDetalleCache(prev => ({ ...prev, [proveedorParaProducto]: detalle }));
      }
      await cargarProveedores();
    } catch (err: any) {
      throw err;
    }
  };

  // ── Precio inline ─────────────────────────────────────────────────────────

  const handleIniciarEditPrecio = (idProveedor: number, idProducto: number, precioActual: number) => {
    setEditingPrecio({ idProveedor, idProducto });
    setPrecioTemp(precioActual.toString());
  };

  const handleGuardarPrecio = async () => {
    if (!editingPrecio) return;
    const precio = parseFloat(precioTemp);
    if (isNaN(precio) || precio <= 0) {
      showToast('El precio debe ser un número mayor a 0', 'error');
      return;
    }
    setSavingPrecio(true);
    try {
      await actualizarPrecioProductoService(
        editingPrecio.idProveedor,
        editingPrecio.idProducto,
        { precioProducto: precio }
      );
      showToast('Precio actualizado');
      invalidarCacheProveedor(editingPrecio.idProveedor);
      const detalle = await obtenerProveedorDetalleService(editingPrecio.idProveedor);
      setDetalleCache(prev => ({ ...prev, [editingPrecio.idProveedor]: detalle }));
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar el precio', 'error');
    } finally {
      setSavingPrecio(false);
      setEditingPrecio(null);
      setPrecioTemp('');
    }
  };

  // ── Quitar producto ───────────────────────────────────────────────────────

  const handleConfirmarQuitarProducto = (idProveedor: number, prod: IProveedorProducto) => {
    setQuitarTarget({ idProveedor, idProducto: prod.idProducto, nombre: prod.nombreProducto });
    openQuitarModal();
  };

  const handleQuitarProducto = async () => {
    if (!quitarTarget) return;
    try {
      await quitarProductoProveedorService(quitarTarget.idProveedor, quitarTarget.idProducto);
      showToast(`Producto "${quitarTarget.nombre}" quitado del proveedor`);
      invalidarCacheProveedor(quitarTarget.idProveedor);
      const detalle = await obtenerProveedorDetalleService(quitarTarget.idProveedor);
      setDetalleCache(prev => ({ ...prev, [quitarTarget.idProveedor]: detalle }));
      await cargarProveedores();
    } catch (err: any) {
      showToast(err.message || 'Error al quitar el producto', 'error');
    } finally {
      setQuitarTarget(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 font-sans">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-success-500' : 'bg-danger-500'
            }`}
          >
            <Icon icon={toast.type === 'success' ? 'lucide:check-circle' : 'lucide:alert-circle'} width={18} />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4 border-b border-default-200 dark:border-default-100 pb-4">
          {prov_Crear && (
            <Button
              color="primary"
              variant="solid"
              className="font-bold text-secondary shadow-md"
              startContent={<Icon icon="lucide:plus" width={20} />}
              onPress={handleNuevoProveedor}
            >
              Nuevo Proveedor
            </Button>
          )}
        </div>

        {/* Filtros */}
        <Card className="shadow-sm bg-default-50 dark:bg-content1 border border-default-200 dark:border-default-100">
          <CardBody className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                placeholder="Buscar por nombre, distribuidora o RUT..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                startContent={<Icon icon="lucide:search" className="text-default-400" />}
                className="w-full md:w-1/2"
                variant="bordered"
                classNames={{ inputWrapper: 'bg-white dark:bg-default-100/50' }}
                isClearable
                onClear={() => setSearchTerm('')}
              />
              <Select
                placeholder="Filtrar por estado"
                selectedKeys={filtroEstado ? new Set([filtroEstado]) : new Set()}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0] as string;
                  setFiltroEstado(val || '');
                }}
                className="w-full md:w-56"
                variant="bordered"
                classNames={{ trigger: 'bg-white dark:bg-default-100/50' }}
              >
                <SelectItem key="" textValue="Todos">Todos</SelectItem>
                <SelectItem key="DISPONIBLE" textValue="Disponible">Disponible</SelectItem>
                <SelectItem key="NO_DISPONIBLE" textValue="No Disponible">No Disponible</SelectItem>
              </Select>
            </div>
          </CardBody>
        </Card>

        {/* Estado de carga / error */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" color="primary" label="Cargando proveedores..." />
          </div>
        )}

        {!isLoading && error && (
          <Card className="border border-danger-200 bg-danger-50 dark:bg-danger-50/10">
            <CardBody className="flex flex-row items-center gap-3 p-4">
              <Icon icon="lucide:alert-triangle" className="text-danger" width={22} />
              <p className="text-danger text-sm">{error}</p>
              <Button size="sm" variant="flat" color="danger" onPress={cargarProveedores}>
                Reintentar
              </Button>
            </CardBody>
          </Card>
        )}

        {/* Lista de proveedores */}
        {!isLoading && !error && (
          <>
            {proveedores.length === 0 ? (
              <Card className="border border-default-200">
                <CardBody className="flex flex-col items-center gap-3 py-16 text-default-400">
                  <Icon icon="lucide:truck" width={48} />
                  <p className="text-sm">No se encontraron proveedores</p>
                  {prov_Crear && (
                    <Button size="sm" color="primary" variant="flat" onPress={handleNuevoProveedor}>
                      Crear primer proveedor
                    </Button>
                  )}
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-3">
                {paginatedProveedores.map((proveedor) => (
                  <Card
                    key={proveedor.idProveedor}
                    className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1"
                  >
                    <CardBody className="p-0">
                      {/* Fila principal */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-3">
                        <div className="flex items-center gap-3">
                          <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            onPress={() => toggleRowExpansion(proveedor.idProveedor)}
                            isLoading={loadingDetalle.has(proveedor.idProveedor)}
                          >
                            {!loadingDetalle.has(proveedor.idProveedor) && (
                              <Icon
                                icon={expandedRows.has(proveedor.idProveedor) ? 'lucide:chevron-down' : 'lucide:chevron-right'}
                                className="text-default-400"
                              />
                            )}
                          </Button>
                          <div>
                            <h3 className="font-bold text-base text-secondary">
                              {proveedor.nombreDistribuidora}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-default-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Icon icon="lucide:user" width={12} />
                                {proveedor.nombreProveedor}
                              </span>
                              <span className="text-default-300">•</span>
                              <span className="flex items-center gap-1">
                                <Icon icon="lucide:phone" width={12} />
                                {proveedor.telefonoProveedor}
                              </span>
                              {proveedor.emailProveedor && (
                                <>
                                  <span className="text-default-300">•</span>
                                  <span className="flex items-center gap-1">
                                    <Icon icon="lucide:mail" width={12} />
                                    {proveedor.emailProveedor}
                                  </span>
                                </>
                              )}
                              {proveedor.rutProveedor && (
                                <>
                                  <span className="text-default-300">•</span>
                                  <span>RUT: {proveedor.rutProveedor}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <Chip color="primary" size="sm" variant="flat">
                            {proveedor.cantidadProductosActivos} producto{proveedor.cantidadProductosActivos !== 1 ? 's' : ''}
                          </Chip>
                          {renderEstado(proveedor.estadoProveedor)}

                          {/* Acciones */}
                          <div className="flex gap-1">
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              title="Ver detalle"
                              onPress={() => handleVerProveedor(proveedor)}
                            >
                              <Icon icon="lucide:eye" className="text-primary" width={17} />
                            </Button>
                            {prov_Editar && (
                              <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                title="Editar proveedor"
                                onPress={() => handleEditarProveedor(proveedor)}
                              >
                                <Icon icon="lucide:edit" className="text-default-500 hover:text-secondary" width={17} />
                              </Button>
                            )}
                            {prov_Editar && (
                              <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                title="Asignar producto"
                                onPress={() => handleAbrirAsignarProducto(proveedor.idProveedor)}
                              >
                                <Icon icon="lucide:package-plus" className="text-default-500 hover:text-success" width={17} />
                              </Button>
                            )}
                            {prov_Eliminar && (
                              <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                title="Eliminar proveedor"
                                isLoading={deletingId === proveedor.idProveedor}
                                onPress={() => handleConfirmarEliminar(proveedor)}
                              >
                                <Icon icon="lucide:trash-2" className="text-default-400 hover:text-danger" width={17} />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sección expandible — productos */}
                      <AnimatePresence>
                        {expandedRows.has(proveedor.idProveedor) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-1 bg-default-50 dark:bg-default-100/20 border-t border-default-100">
                              {detalleCache[proveedor.idProveedor] ? (
                                <ProductosProveedor
                                  detalle={detalleCache[proveedor.idProveedor]}
                                  canEdit={prov_Editar}
                                  editingPrecio={editingPrecio}
                                  precioTemp={precioTemp}
                                  savingPrecio={savingPrecio}
                                  onIniciarEditPrecio={handleIniciarEditPrecio}
                                  onPrecioTempChange={setPrecioTemp}
                                  onGuardarPrecio={handleGuardarPrecio}
                                  onCancelarEditPrecio={() => setEditingPrecio(null)}
                                  onQuitarProducto={handleConfirmarQuitarProducto}
                                />
                              ) : (
                                <div className="flex justify-center py-6">
                                  <Spinner size="sm" color="primary" />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex w-full justify-center pt-2">
                <Pagination
                  total={totalPages}
                  page={currentPage}
                  onChange={setCurrentPage}
                  showControls
                  color="primary"
                />
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* ── Modal Crear / Editar / Ver Proveedor ── */}
      <Modal isOpen={isProvModal} onOpenChange={onProvModalChange} size="lg" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <FormularioProveedor
              proveedor={proveedorSeleccionado}
              mode={modalMode}
              onClose={onClose}
              onSave={async (dto) => {
                await handleGuardarProveedor(dto);
                onClose();
              }}
            />
          )}
        </ModalContent>
      </Modal>

      {/* ── Modal Asignar Producto ── */}
      <Modal isOpen={isProdModal} onOpenChange={onProdModalChange} size="md">
        <ModalContent>
          {(onClose) => (
            <FormularioAsignarProducto
              productos={productos}
              onClose={onClose}
              onSave={async (idProducto, precio) => {
                await handleGuardarProducto(idProducto, precio);
                onClose();
              }}
            />
          )}
        </ModalContent>
      </Modal>

      {/* ── Modal Confirmar Eliminar Proveedor ── */}
      <Modal isOpen={isDelModal} onOpenChange={onDelModalChange} size="sm">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-danger flex items-center gap-2">
                <Icon icon="lucide:alert-triangle" width={20} />
                Eliminar Proveedor
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600">
                  ¿Estás seguro de que deseas eliminar a{' '}
                  <strong>{proveedorAEliminar?.nombreDistribuidora}</strong>?
                  Esta acción no se puede deshacer.
                </p>
                <p className="text-xs text-warning-600 bg-warning-50 dark:bg-warning-50/10 rounded p-2 mt-1">
                  Solo se puede eliminar si no tiene productos activos asignados.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onPress={onClose}>Cancelar</Button>
                <Button
                  color="danger"
                  onPress={async () => {
                    await handleEliminarProveedor();
                    onClose();
                  }}
                  isLoading={deletingId !== null}
                >
                  Eliminar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Modal Confirmar Quitar Producto ── */}
      <Modal isOpen={isQuitarModal} onOpenChange={onQuitarModalChange} size="sm">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-warning flex items-center gap-2">
                <Icon icon="lucide:package-minus" width={20} />
                Quitar Producto
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600">
                  ¿Quitar <strong>{quitarTarget?.nombre}</strong> de este proveedor?
                  La relación quedará inactiva pero se puede reactivar asignando el producto nuevamente.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onPress={onClose}>Cancelar</Button>
                <Button
                  color="warning"
                  variant="flat"
                  onPress={async () => {
                    await handleQuitarProducto();
                    onClose();
                  }}
                >
                  Quitar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

// ── Sub-componente: tabla de productos del proveedor ──────────────────────────

interface ProductosProveedorProps {
  detalle: IProveedorDetalle;
  canEdit: boolean;
  editingPrecio: { idProveedor: number; idProducto: number } | null;
  precioTemp: string;
  savingPrecio: boolean;
  onIniciarEditPrecio: (idProveedor: number, idProducto: number, precioActual: number) => void;
  onPrecioTempChange: (val: string) => void;
  onGuardarPrecio: () => void;
  onCancelarEditPrecio: () => void;
  onQuitarProducto: (idProveedor: number, prod: IProveedorProducto) => void;
}

const ProductosProveedor: React.FC<ProductosProveedorProps> = ({
  detalle,
  canEdit,
  editingPrecio,
  precioTemp,
  savingPrecio,
  onIniciarEditPrecio,
  onPrecioTempChange,
  onGuardarPrecio,
  onCancelarEditPrecio,
  onQuitarProducto,
}) => {
  const categorias = Object.keys(detalle.productosPorCategoria);

  if (categorias.length === 0) {
    return (
      <p className="text-xs text-default-400 py-4 text-center">
        Este proveedor no tiene productos asignados aún.
      </p>
    );
  }

  return (
    <div className="space-y-3 mt-2">
      {categorias.map((categoria) => (
        <div key={categoria}>
          <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-1">
            {categoria}
          </p>
          <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
            <table className="w-full text-xs">
              <thead className="bg-default-100 dark:bg-default-50">
                <tr>
                  <th className="text-left py-2 px-3 font-medium">Producto</th>
                  <th className="text-left py-2 px-3 font-medium">Unidad</th>
                  <th className="text-left py-2 px-3 font-medium">Precio</th>
                  <th className="text-left py-2 px-3 font-medium">Estado</th>
                  <th className="text-left py-2 px-3 font-medium">Actualizado</th>
                  {canEdit && <th className="py-2 px-3 font-medium text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {detalle.productosPorCategoria[categoria].map((prod) => {
                  const isEditing =
                    editingPrecio?.idProveedor === detalle.idProveedor &&
                    editingPrecio?.idProducto === prod.idProducto;

                  return (
                    <tr
                      key={prod.idProveedorProducto}
                      className="border-t border-default-100 dark:border-default-50 hover:bg-default-50 dark:hover:bg-default-100/20"
                    >
                      <td className="py-2 px-3 font-medium">{prod.nombreProducto}</td>
                      <td className="py-2 px-3 text-default-500">
                        {prod.abreviatura || prod.nombreUnidad}
                      </td>
                      <td className="py-2 px-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              size="sm"
                              value={precioTemp}
                              onValueChange={onPrecioTempChange}
                              className="w-24"
                              classNames={{ inputWrapper: 'h-6 min-h-6' }}
                              startContent={<span className="text-default-400 text-xs">$</span>}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') onGuardarPrecio();
                                if (e.key === 'Escape') onCancelarEditPrecio();
                              }}
                              autoFocus
                            />
                            <Button
                              isIconOnly
                              size="sm"
                              variant="flat"
                              color="success"
                              isLoading={savingPrecio}
                              onPress={onGuardarPrecio}
                            >
                              <Icon icon="lucide:check" width={13} />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={onCancelarEditPrecio}
                            >
                              <Icon icon="lucide:x" width={13} />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className={`cursor-pointer hover:text-primary transition-colors ${canEdit ? 'underline decoration-dotted' : ''}`}
                            title={canEdit ? 'Clic para editar precio' : undefined}
                            onClick={() =>
                              canEdit &&
                              onIniciarEditPrecio(detalle.idProveedor, prod.idProducto, prod.precioProducto)
                            }
                          >
                            {formatPrecio(prod.precioProducto)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">{renderDisponibilidad(prod.activo)}</td>
                      <td className="py-2 px-3 text-default-400">
                        {prod.fechaActualizacion
                          ? new Date(prod.fechaActualizacion).toLocaleDateString('es-CL')
                          : '—'}
                      </td>
                      {canEdit && (
                        <td className="py-2 px-3 text-center">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            title="Quitar producto"
                            onPress={() => onQuitarProducto(detalle.idProveedor, prod)}
                          >
                            <Icon icon="lucide:x-circle" className="text-default-400 hover:text-danger" width={15} />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Sub-componente: formulario crear/editar/ver proveedor ─────────────────────

interface FormularioProveedorProps {
  proveedor: IProveedor | null;
  mode: 'crear' | 'editar' | 'ver';
  onClose: () => void;
  onSave: (dto: IProveedorCreateDTO | IProveedorUpdateDTO) => Promise<void>;
}

const FormularioProveedor: React.FC<FormularioProveedorProps> = ({
  proveedor,
  mode,
  onClose,
  onSave,
}) => {
  const [nombreDistribuidora, setNombreDistribuidora] = React.useState(proveedor?.nombreDistribuidora || '');
  const [nombreProveedor, setNombreProveedor] = React.useState(proveedor?.nombreProveedor || '');
  const [telefonoProveedor, setTelefonoProveedor] = React.useState(proveedor?.telefonoProveedor || '');
  const [emailProveedor, setEmailProveedor] = React.useState(proveedor?.emailProveedor || '');
  const [rutProveedor, setRutProveedor] = React.useState(proveedor?.rutProveedor || '');
  const [estadoProveedor, setEstadoProveedor] = React.useState<EstadoProveedor>(
    proveedor?.estadoProveedor || 'DISPONIBLE'
  );
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const isReadOnly = mode === 'ver';

  const handleSubmit = async () => {
    setError(null);

    if (!nombreDistribuidora.trim()) {
      setError('El nombre de la distribuidora es obligatorio');
      return;
    }
    if (!nombreProveedor.trim()) {
      setError('El nombre del contacto es obligatorio');
      return;
    }
    if (!telefonoProveedor.trim()) {
      setError('El teléfono es obligatorio');
      return;
    }
    if (emailProveedor.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailProveedor)) {
      setError('El email no tiene un formato válido');
      return;
    }

    const dto: IProveedorCreateDTO = {
      rutProveedor: rutProveedor.trim() || undefined,
      nombreDistribuidora: nombreDistribuidora.trim(),
      nombreProveedor: nombreProveedor.trim(),
      telefonoProveedor: telefonoProveedor.trim(),
      emailProveedor: emailProveedor.trim() || undefined,
      estadoProveedor,
    };

    setSaving(true);
    try {
      await onSave(dto);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ModalHeader className="border-b border-default-100 dark:border-default-50 bg-secondary-50 dark:bg-secondary-50/10">
        <div className="flex items-center gap-2">
          <Icon
            icon={
              mode === 'crear'
                ? 'lucide:plus-circle'
                : mode === 'editar'
                ? 'lucide:edit-3'
                : 'lucide:building-2'
            }
            className="text-secondary dark:text-secondary-400"
            width={22}
          />
          <span className="font-bold text-secondary dark:text-foreground">
            {mode === 'crear'
              ? 'Nuevo Proveedor'
              : mode === 'editar'
              ? 'Editar Proveedor'
              : 'Detalle del Proveedor'}
          </span>
        </div>
      </ModalHeader>

      <ModalBody className="gap-3 py-4">
        {error && (
          <div className="flex items-center gap-2 bg-danger-50 dark:bg-danger-50/10 text-danger text-sm p-3 rounded-lg">
            <Icon icon="lucide:alert-circle" width={16} />
            {error}
          </div>
        )}

        <Input
          label="Nombre Distribuidora"
          placeholder="Ej: Distribuidora Central S.A."
          value={nombreDistribuidora}
          onValueChange={setNombreDistribuidora}
          isReadOnly={isReadOnly}
          variant="bordered"
          isRequired={!isReadOnly}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Nombre Contacto"
            placeholder="Ej: Juan Pérez"
            value={nombreProveedor}
            onValueChange={setNombreProveedor}
            isReadOnly={isReadOnly}
            variant="bordered"
            isRequired={!isReadOnly}
          />
          <Input
            label="Teléfono"
            placeholder="Ej: +56 9 1234 5678"
            value={telefonoProveedor}
            onValueChange={setTelefonoProveedor}
            isReadOnly={isReadOnly}
            variant="bordered"
            isRequired={!isReadOnly}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Input
              label="RUT (opcional)"
              placeholder="Ej: 12.345.678-9"
              value={rutProveedor}
              onValueChange={setRutProveedor}
              isReadOnly={isReadOnly}
              variant="bordered"
              maxLength={13}
            />
            <p className="text-xs text-default-400 text-right">{rutProveedor.length}/13</p>
          </div>
          <Input
            label="Email (opcional)"
            placeholder="Ej: contacto@empresa.cl"
            value={emailProveedor}
            onValueChange={setEmailProveedor}
            isReadOnly={isReadOnly}
            variant="bordered"
            type="email"
          />
        </div>

        {!isReadOnly ? (
          <Select
            label="Estado"
            selectedKeys={new Set([estadoProveedor])}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0] as EstadoProveedor;
              if (val) setEstadoProveedor(val);
            }}
            variant="bordered"
          >
            <SelectItem key="DISPONIBLE" textValue="Disponible">Disponible</SelectItem>
            <SelectItem key="NO_DISPONIBLE" textValue="No Disponible">No Disponible</SelectItem>
          </Select>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-default-500">Estado</span>
            {renderEstado(estadoProveedor)}
          </div>
        )}
      </ModalBody>

      <ModalFooter className="bg-default-50 dark:bg-content2 border-t border-default-100 dark:border-default-50">
        <Button variant="ghost" onPress={onClose} className="font-medium">
          {isReadOnly ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!isReadOnly && (
          <Button
            color="primary"
            variant="solid"
            onPress={handleSubmit}
            isLoading={saving}
            className="font-bold text-secondary shadow-md"
            startContent={!saving && <Icon icon="lucide:save" width={16} />}
          >
            {mode === 'crear' ? 'Crear Proveedor' : 'Guardar Cambios'}
          </Button>
        )}
      </ModalFooter>
    </>
  );
};

// ── Sub-componente: formulario asignar producto ───────────────────────────────

interface FormularioAsignarProductoProps {
  productos: IProductoRecetaSelection[];
  onClose: () => void;
  onSave: (idProducto: number, precio: number) => Promise<void>;
}

const FormularioAsignarProducto: React.FC<FormularioAsignarProductoProps> = ({
  productos,
  onClose,
  onSave,
}) => {
  const [searchProd, setSearchProd] = React.useState('');
  const [selectedProducto, setSelectedProducto] = React.useState<IProductoRecetaSelection | null>(null);
  const [precio, setPrecio] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const productosFiltrados = React.useMemo(() => {
    if (!searchProd.trim()) return productos.slice(0, 50);
    const term = searchProd.toLowerCase();
    return productos
      .filter((p) => p.nombreProducto.toLowerCase().includes(term))
      .slice(0, 50);
  }, [searchProd, productos]);

  const handleSubmit = async () => {
    setError(null);
    if (!selectedProducto) {
      setError('Selecciona un producto');
      return;
    }
    const precioNum = parseFloat(precio);
    if (isNaN(precioNum) || precioNum <= 0) {
      setError('El precio debe ser un número mayor a 0');
      return;
    }
    setSaving(true);
    try {
      await onSave(selectedProducto.idProducto, precioNum);
    } catch (err: any) {
      setError(err.message || 'Error al asignar el producto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ModalHeader className="border-b border-default-100 bg-success-50 dark:bg-success-50/10">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:package-plus" className="text-success" width={20} />
          <span className="font-bold text-success dark:text-foreground">Asignar Producto</span>
        </div>
      </ModalHeader>

      <ModalBody className="gap-3 py-4">
        {error && (
          <div className="flex items-center gap-2 bg-danger-50 dark:bg-danger-50/10 text-danger text-sm p-3 rounded-lg">
            <Icon icon="lucide:alert-circle" width={16} />
            {error}
          </div>
        )}

        <Input
          label="Buscar producto"
          placeholder="Nombre o código..."
          value={searchProd}
          onValueChange={setSearchProd}
          startContent={<Icon icon="lucide:search" className="text-default-400" width={15} />}
          variant="bordered"
          isClearable
          onClear={() => setSearchProd('')}
        />

        {/* Lista de productos */}
        <div className="max-h-52 overflow-y-auto border border-default-200 rounded-lg divide-y divide-default-100">
          {productosFiltrados.length === 0 ? (
            <p className="text-xs text-default-400 text-center py-6">Sin resultados</p>
          ) : (
            productosFiltrados.map((p) => (
              <button
                key={p.idProducto}
                type="button"
                onClick={() => setSelectedProducto(p)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-primary-50 dark:hover:bg-primary-50/10 transition-colors ${
                  selectedProducto?.idProducto === p.idProducto
                    ? 'bg-primary-100 dark:bg-primary-100/20 font-semibold'
                    : ''
                }`}
              >
                <span className="font-medium">{p.nombreProducto}</span>
                <span className="text-default-400 ml-1">— {p.abreviatura}</span>
              </button>
            ))
          )}
        </div>

        {selectedProducto && (
          <div className="bg-primary-50 dark:bg-primary-50/10 rounded-lg px-3 py-2 text-xs text-primary-700 dark:text-primary-300 flex items-center gap-2">
            <Icon icon="lucide:check-circle" width={14} />
            Seleccionado: <strong>{selectedProducto.nombreProducto}</strong>
          </div>
        )}

        <Input
          label="Precio"
          placeholder="0.00"
          value={precio}
          onValueChange={setPrecio}
          variant="bordered"
          type="number"
          min="0.01"
          step="0.01"
          startContent={<span className="text-default-400 text-sm">$</span>}
          isRequired
        />
      </ModalBody>

      <ModalFooter className="bg-default-50 dark:bg-content2 border-t border-default-100">
        <Button variant="ghost" onPress={onClose}>Cancelar</Button>
        <Button
          color="success"
          variant="flat"
          onPress={handleSubmit}
          isLoading={saving}
          startContent={!saving && <Icon icon="lucide:plus" width={16} />}
          className="font-bold"
        >
          Asignar Producto
        </Button>
      </ModalFooter>
    </>
  );
};

export default GestionProveedoresPage;
