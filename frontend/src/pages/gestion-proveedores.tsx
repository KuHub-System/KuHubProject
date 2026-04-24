/**
 * PÁGINA DE GESTIÓN DE PROVEEDORES
 * Conectada con el backend /api/v1/proveedor
 * Incluye cotización por rango de fechas con exportación a Excel.
 */

import React from 'react';
import {
  Button,
  Card,
  CardBody,
  Chip,
  DateRangePicker,
  Divider,
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
  Tooltip,
  useDisclosure,
} from '@heroui/react';
import { CalendarDate } from '@internationalized/date';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import XLSXStyle from 'xlsx-js-style';
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
  obtenerCotizacionPorRangoService,
} from '../services/proveedor-service';
import { obtenerProductosParaRecetaService } from '../services/inventario-service';
import type {
  IProveedor,
  IProveedorDetalle,
  IProveedorProducto,
  IProveedorCreateDTO,
  IProveedorUpdateDTO,
  EstadoProveedor,
  ICotizacionResponse,
  ICotizacionProveedor,
  IDiaEntregaDTO,
  DiaSemana,
} from '../types/proveedor.types';
import type { IProductoRecetaSelection } from '../types/producto.types';

// ── Constantes de días de semana ──────────────────────────────────────────────

const DIAS_SEMANA_OPTIONS = [
  { value: 'LUNES', label: 'Lunes' },
  { value: 'MARTES', label: 'Martes' },
  { value: 'MIERCOLES', label: 'Miércoles' },
  { value: 'JUEVES', label: 'Jueves' },
  { value: 'VIERNES', label: 'Viernes' },
  { value: 'SABADO', label: 'Sábado' },
  { value: 'DOMINGO', label: 'Domingo' },
] as const;

const DIAS_ABREV: Record<DiaSemana, string> = {
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIERCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
};

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

// ── Helpers Excel (estándar EXCEL.MD) ─────────────────────────────────────────

const fmtN = (v: number): string =>
  v.toLocaleString('es-CL', { maximumFractionDigits: 3 });

const cl = (c: number): string => {
  let s = ''; let n = c + 1;
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
};

const sc = (v: string | number | null, s: object) => ({
  v: typeof v === 'number' ? fmtN(v) : (v ?? ''),
  t: 's' as const,
  s,
});

const styleTitle = {
  font: { bold: true, sz: 14, color: { rgb: '1A1A1A' } },
  fill: { fgColor: { rgb: 'FFB800' } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: false },
};

const styleHeader = {
  font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '2D3748' } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'FFFFFF' } },
    bottom: { style: 'thin' as const, color: { rgb: 'FFFFFF' } },
    left: { style: 'thin' as const, color: { rgb: 'FFFFFF' } },
    right: { style: 'thin' as const, color: { rgb: 'FFFFFF' } },
  },
};

const styleCat = {
  font: { bold: true, sz: 11, color: { rgb: '1A1A1A' } },
  fill: { fgColor: { rgb: 'FFF3CD' } },
  alignment: { horizontal: 'left' as const, vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'E2C97E' } },
    bottom: { style: 'thin' as const, color: { rgb: 'E2C97E' } },
    left: { style: 'thin' as const, color: { rgb: 'E2C97E' } },
    right: { style: 'thin' as const, color: { rgb: 'E2C97E' } },
  },
};

const styleNum = {
  font: { sz: 10 },
  fill: { fgColor: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'right' as const, vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    bottom: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    left: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    right: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
  },
};

const styleText = {
  font: { sz: 10 },
  fill: { fgColor: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'left' as const, vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    bottom: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    left: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    right: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
  },
};

const styleTotal = {
  font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '4A5568' } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: '718096' } },
    bottom: { style: 'thin' as const, color: { rgb: '718096' } },
    left: { style: 'thin' as const, color: { rgb: '718096' } },
    right: { style: 'thin' as const, color: { rgb: '718096' } },
  },
};

const styleSinProveedor = {
  font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: 'E53E3E' } },
  alignment: { horizontal: 'left' as const, vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'E53E3E' } },
    bottom: { style: 'thin' as const, color: { rgb: 'E53E3E' } },
    left: { style: 'thin' as const, color: { rgb: 'E53E3E' } },
    right: { style: 'thin' as const, color: { rgb: 'E53E3E' } },
  },
};

const styleProvHeader = {
  font: { bold: true, sz: 11, color: { rgb: '1A1A1A' } },
  fill: { fgColor: { rgb: 'EBF8FF' } },
  alignment: { horizontal: 'left' as const, vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'BEE3F8' } },
    bottom: { style: 'thin' as const, color: { rgb: 'BEE3F8' } },
    left: { style: 'thin' as const, color: { rgb: 'BEE3F8' } },
    right: { style: 'thin' as const, color: { rgb: 'BEE3F8' } },
  },
};

const styleTotalPositivo = {
  font: { bold: true, sz: 10, color: { rgb: '276749' } },
  fill: { fgColor: { rgb: 'C6F6D5' } },
  alignment: { horizontal: 'right' as const, vertical: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    bottom: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    left: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
    right: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
  },
};

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

  // ── Modal cotización ──
  const { isOpen: isCotizModal, onOpen: openCotizModal, onOpenChange: onCotizModalChange } = useDisclosure();
  const [dateRangeProyeccion, setDateRangeProyeccion] = React.useState<{ start: CalendarDate; end: CalendarDate } | null>(null);
  const [cotizacionData, setCotizacionData] = React.useState<ICotizacionResponse | null>(null);
  const [loadingCotizacion, setLoadingCotizacion] = React.useState(false);
  const [errorCotizacion, setErrorCotizacion] = React.useState<string | null>(null);

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

  const handleEditarProveedor = async (p: IProveedor) => {
    setModalMode('editar');
    try {
      const detalle = await obtenerProveedorDetalleService(p.idProveedor);
      setProveedorSeleccionado(detalle as any);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar detalles del proveedor', 'error');
      setProveedorSeleccionado(p);
    }
    openProvModal();
  };

  const handleVerProveedor = async (p: IProveedor) => {
    setModalMode('ver');
    try {
      const detalle = await obtenerProveedorDetalleService(p.idProveedor);
      setProveedorSeleccionado(detalle as any);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar detalles del proveedor', 'error');
      setProveedorSeleccionado(p);
    }
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
        {/* Filtros + Acciones */}
        <Card className="shadow-sm bg-default-50 dark:bg-content1 border border-default-200 dark:border-default-100">
          <CardBody className="p-4 space-y-3">
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
            <Divider />
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {prov_Crear && (
                <Button
                  color="primary"
                  variant="solid"
                  className="font-bold text-secondary shadow-md cursor-pointer"
                  startContent={<Icon icon="lucide:plus" width={20} />}
                  onPress={handleNuevoProveedor}
                >
                  Nuevo Proveedor
                </Button>
              )}
              <Button
                color="secondary"
                variant="flat"
                className="font-bold cursor-pointer"
                startContent={<Icon icon="lucide:file-spreadsheet" width={20} />}
                onPress={() => {
                  setCotizacionData(null);
                  setDateRangeProyeccion(null);
                  setErrorCotizacion(null);
                  openCotizModal();
                }}
              >
                Proyección Cotización
              </Button>
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
                      <div
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-3 cursor-pointer hover:bg-default-50 dark:hover:bg-default-100/30 transition-colors"
                        onClick={() => toggleRowExpansion(proveedor.idProveedor)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 flex items-center justify-center cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(proveedor.idProveedor);
                            }}
                          >
                            {!loadingDetalle.has(proveedor.idProveedor) && (
                              <Icon
                                icon={expandedRows.has(proveedor.idProveedor) ? 'lucide:chevron-down' : 'lucide:chevron-right'}
                                className="text-default-400"
                              />
                            )}
                          </div>
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

      {/* ── Modal Cotización por Rango ── */}
      <CotizacionModal
        isOpen={isCotizModal}
        onOpenChange={onCotizModalChange}
        dateRange={dateRangeProyeccion}
        onDateRangeChange={setDateRangeProyeccion}
        cotizacionData={cotizacionData}
        loading={loadingCotizacion}
        error={errorCotizacion}
        onConsultar={async () => {
          if (!dateRangeProyeccion) return;
          setLoadingCotizacion(true);
          setErrorCotizacion(null);
          setCotizacionData(null);
          try {
            const fi = `${dateRangeProyeccion.start.year}-${String(dateRangeProyeccion.start.month).padStart(2, '0')}-${String(dateRangeProyeccion.start.day).padStart(2, '0')}`;
            const ff = `${dateRangeProyeccion.end.year}-${String(dateRangeProyeccion.end.month).padStart(2, '0')}-${String(dateRangeProyeccion.end.day).padStart(2, '0')}`;
            const data = await obtenerCotizacionPorRangoService(fi, ff);
            setCotizacionData(data);
          } catch (err: any) {
            setErrorCotizacion(err.message || 'Error al consultar cotización');
          } finally {
            setLoadingCotizacion(false);
          }
        }}
        onExportExcel={() => {
          if (!cotizacionData || !dateRangeProyeccion) return;
          exportarCotizacionExcel(cotizacionData, dateRangeProyeccion);
        }}
      />

      {/* ── Modal Crear / Editar / Ver Proveedor ── */}
      <Modal isOpen={isProvModal} onOpenChange={onProvModalChange} size="lg" scrollBehavior="inside" radius="lg" classNames={{ base: 'rounded-2xl' }}>
        <ModalContent className="rounded-2xl overflow-hidden">
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
      <Modal isOpen={isProdModal} onOpenChange={onProdModalChange} size="md" radius="lg" classNames={{ base: 'rounded-2xl' }}>
        <ModalContent className="rounded-2xl overflow-hidden">
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
      <Modal isOpen={isDelModal} onOpenChange={onDelModalChange} size="sm" radius="lg" classNames={{ base: 'rounded-2xl' }}>
        <ModalContent className="rounded-2xl overflow-hidden">
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-danger/10 to-danger/5 dark:from-danger/20 dark:to-danger/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-danger/20 rounded-lg">
                    <Icon icon="lucide:alert-triangle" className="text-danger" width={20} />
                  </div>
                  <span className="font-bold text-lg text-secondary dark:text-foreground">
                    Eliminar Proveedor
                  </span>
                </div>
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
              <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
                <Button variant="ghost" onPress={onClose} className="font-medium">
                  Cancelar
                </Button>
                <Button
                  color="danger"
                  variant="solid"
                  onPress={async () => {
                    await handleEliminarProveedor();
                    onClose();
                  }}
                  isLoading={deletingId !== null}
                  className="font-bold shadow-md cursor-pointer"
                  startContent={!deletingId && <Icon icon="lucide:trash-2" width={16} />}
                  size="lg"
                >
                  Eliminar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Modal Confirmar Quitar Producto ── */}
      <Modal isOpen={isQuitarModal} onOpenChange={onQuitarModalChange} size="sm" radius="lg" classNames={{ base: 'rounded-2xl' }}>
        <ModalContent className="rounded-2xl overflow-hidden">
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-warning/10 to-warning/5 dark:from-warning/20 dark:to-warning/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning/20 rounded-lg">
                    <Icon icon="lucide:package-minus" className="text-warning" width={20} />
                  </div>
                  <span className="font-bold text-lg text-secondary dark:text-foreground">
                    Quitar Producto
                  </span>
                </div>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600">
                  ¿Quitar <strong>{quitarTarget?.nombre}</strong> de este proveedor?
                  La relación quedará inactiva pero se puede reactivar asignando el producto nuevamente.
                </p>
              </ModalBody>
              <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
                <Button variant="ghost" onPress={onClose} className="font-medium">
                  Cancelar
                </Button>
                <Button
                  color="warning"
                  variant="solid"
                  onPress={async () => {
                    await handleQuitarProducto();
                    onClose();
                  }}
                  className="font-bold shadow-md cursor-pointer"
                  startContent={<Icon icon="lucide:package-minus" width={16} />}
                  size="lg"
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
                  <th className="text-center py-2 px-3 font-medium">Producto</th>
                  <th className="text-center py-2 px-3 font-medium">Unidad</th>
                  <th className="text-center py-2 px-3 font-medium">Precio</th>
                  <th className="text-center py-2 px-3 font-medium">Estado</th>
                  <th className="text-center py-2 px-3 font-medium">Actualizado</th>
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
                      <td className="py-2 px-3 font-medium text-center max-w-xs">
                        <span title={prod.nombreProducto} className="truncate block">
                          {prod.nombreProducto}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-default-500 text-center">
                        {prod.abreviatura || prod.nombreUnidad}
                      </td>
                      <td className="py-2 px-3 text-center">
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
                      <td className="py-2 px-3 text-center">{renderDisponibilidad(prod.activo)}</td>
                      <td className="py-2 px-3 text-default-400 text-center">
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
  const [diasEntrega, setDiasEntrega] = React.useState<IDiaEntregaDTO[]>([]);
  const [diaSeleccionado, setDiaSeleccionado] = React.useState<DiaSemana>('LUNES');
  const [horaInicio, setHoraInicio] = React.useState('');
  const [horaFin, setHoraFin] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const isReadOnly = mode === 'ver';

  React.useEffect(() => {
    if (proveedor && (mode === 'editar' || mode === 'ver')) {
      const prov = proveedor as any;
      if (prov.diasEntrega && Array.isArray(prov.diasEntrega)) {
        const diasConvertidos = prov.diasEntrega.map((dia: any) => ({
          diaSemana: dia.diaSemana,
          horaInicio: dia.horaInicioEntrega ? dia.horaInicioEntrega.slice(0, 5) : undefined,
          horaFin: dia.horaFinEntrega ? dia.horaFinEntrega.slice(0, 5) : undefined,
        }));
        setDiasEntrega(diasConvertidos);
      }
    }
  }, [proveedor, mode]);

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
      diasEntrega: diasEntrega.length > 0 ? diasEntrega : undefined,
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

  const agregarDiaEntrega = () => {
    if (!diaSeleccionado) {
      setError('Selecciona un día de la semana');
      return;
    }

    // Validar que no exista duplicado
    if (diasEntrega.some(d => d.diaSemana === diaSeleccionado)) {
      setError(`El día ${diaSeleccionado} ya está agregado`);
      return;
    }

    // Validar horas si se proporcionan
    if (horaInicio && horaFin) {
      if (horaInicio >= horaFin) {
        setError('La hora de inicio debe ser menor a la hora de fin');
        return;
      }
    }

    const nuevoDia: IDiaEntregaDTO = {
      diaSemana: diaSeleccionado,
      horaInicio: horaInicio || undefined,
      horaFin: horaFin || undefined,
    };

    setDiasEntrega([...diasEntrega, nuevoDia]);
    setHoraInicio('');
    setHoraFin('');
    setError(null);
  };

  const eliminarDiaEntrega = (index: number) => {
    setDiasEntrega(diasEntrega.filter((_, i) => i !== index));
  };

  return (
    <>
      <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-secondary/10 to-secondary/5 dark:from-secondary/20 dark:to-secondary/10 px-6 py-4">
        <div className="flex items-center gap-3 w-full">
          <div className={`p-2 rounded-lg ${mode === 'crear' ? 'bg-success/20' : mode === 'editar' ? 'bg-warning/20' : 'bg-secondary/20'}`}>
            <Icon
              icon={
                mode === 'crear'
                  ? 'lucide:plus-circle'
                  : mode === 'editar'
                  ? 'lucide:edit-3'
                  : 'lucide:building-2'
              }
              className={mode === 'crear' ? 'text-success' : mode === 'editar' ? 'text-warning' : 'text-secondary'}
              width={20}
            />
          </div>
          <span className="font-bold text-lg text-secondary dark:text-foreground">
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

        {/* Selector de Días de Entrega */}
        {!isReadOnly && (
          <div className="border-t border-default-200 dark:border-default-100 pt-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="lucide:calendar" width={16} className="text-primary" />
              <span className="text-sm font-semibold text-secondary dark:text-foreground">
                Días de Entrega (Opcional)
              </span>
            </div>

            {/* Selector de día */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Select
                label="Día de semana"
                selectedKeys={new Set([diaSeleccionado])}
                onSelectionChange={(keys) => {
                  setDiaSeleccionado(Array.from(keys)[0] as DiaSemana);
                }}
                variant="bordered"
                size="sm"
              >
                {DIAS_SEMANA_OPTIONS.map((d) => (
                  <SelectItem key={d.value} textValue={d.label}>
                    {d.label}
                  </SelectItem>
                ))}
              </Select>

              <Input
                label="Hora inicio (HH:mm)"
                placeholder="08:00"
                value={horaInicio}
                onValueChange={setHoraInicio}
                variant="bordered"
                size="sm"
                type="time"
              />

              <Input
                label="Hora fin (HH:mm)"
                placeholder="17:00"
                value={horaFin}
                onValueChange={setHoraFin}
                variant="bordered"
                size="sm"
                type="time"
              />
            </div>

            <Button
              size="sm"
              variant="bordered"
              color="primary"
              onPress={agregarDiaEntrega}
              startContent={<Icon icon="lucide:plus" width={14} />}
              className="w-full md:w-auto"
            >
              Agregar Día
            </Button>

            {/* Lista de días agregados */}
            {diasEntrega.length > 0 && (
              <div className="space-y-2">
                {diasEntrega.map((dia, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-primary-50 dark:bg-primary-50/20 border border-primary-200 dark:border-primary-300"
                  >
                    <div className="flex items-center gap-2">
                      <Chip
                        size="sm"
                        color="primary"
                        variant="flat"
                      >
                        {DIAS_SEMANA_OPTIONS.find(d => d.value === dia.diaSemana)?.label}
                      </Chip>
                      {dia.horaInicio && dia.horaFin && (
                        <span className="text-xs text-default-600">
                          {dia.horaInicio.slice(0, 5)} – {dia.horaFin.slice(0, 5)}
                        </span>
                      )}
                    </div>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => eliminarDiaEntrega(idx)}
                    >
                      <Icon icon="lucide:x" width={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Visualizar Días de Entrega (modo ver) */}
        {isReadOnly && proveedor && (
          <div className="border-t border-default-200 dark:border-default-100 pt-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="lucide:calendar" width={16} className="text-primary" />
              <span className="text-sm font-semibold text-secondary dark:text-foreground">
                Días de Entrega
              </span>
            </div>

            {proveedor.diasEntrega && proveedor.diasEntrega.length > 0 ? (
              <div className="space-y-2">
                {proveedor.diasEntrega.map((dia) => (
                  <div
                    key={dia.idDiaEntrega}
                    className="flex items-center gap-3 p-3 rounded-lg bg-primary-50 dark:bg-primary-50/20 border border-primary-200 dark:border-primary-300"
                  >
                    <Chip
                      size="sm"
                      color="primary"
                      variant="flat"
                    >
                      {DIAS_SEMANA_OPTIONS.find(d => d.value === dia.diaSemana)?.label}
                    </Chip>
                    {dia.horaInicioEntrega && dia.horaFinEntrega && (
                      <span className="text-sm text-default-600">
                        {dia.horaInicioEntrega.slice(0, 5)} – {dia.horaFinEntrega.slice(0, 5)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-default-400 italic">
                No hay días de entrega configurados
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
        <Button variant="ghost" onPress={onClose} className="font-medium">
          {isReadOnly ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!isReadOnly && (
          <Button
            color="primary"
            variant="solid"
            onPress={handleSubmit}
            isLoading={saving}
            className="font-bold text-secondary shadow-md cursor-pointer"
            startContent={!saving && <Icon icon={mode === 'crear' ? 'lucide:plus' : 'lucide:save'} width={16} />}
            size="lg"
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

      <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
        <Button variant="ghost" onPress={onClose} className="font-medium">
          Cancelar
        </Button>
        <Button
          color="success"
          variant="solid"
          onPress={handleSubmit}
          isLoading={saving}
          startContent={!saving && <Icon icon="lucide:plus" width={16} />}
          className="font-bold text-secondary shadow-md cursor-pointer"
          size="lg"
        >
          Asignar Producto
        </Button>
      </ModalFooter>
    </>
  );
};

// ── Función de exportación Excel (estándar EXCEL.MD) ──────────────────────────

const exportarCotizacionExcel = (
  data: ICotizacionResponse,
  dateRange: { start: CalendarDate; end: CalendarDate }
) => {
  const fi = `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`;
  const ff = `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`;

  const nCols = 6; // Proveedor | Categoría | Producto | Unidad | Cantidad | Precio Unit. | Subtotal
  const totalCols = 7;
  const ws: Record<string, unknown> = {};
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  let row = 0;

  // ── Título ──
  for (let c = 0; c < totalCols; c++) {
    ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(
      c === 0 ? `Cotización Proveedores — ${fi} al ${ff}` : '',
      styleTitle
    );
  }
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });
  row++;

  // ── Encabezados ──
  const headers = ['Proveedor', 'Categoría', 'Producto', 'Unidad', 'Cantidad', 'Precio Unit.', 'Subtotal'];
  headers.forEach((h, c) => {
    ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(h, styleHeader);
  });
  row++;

  const proveedoresConId = data.cotizacion.filter(p => p.idProveedor !== null);
  const proveedoresSinId = data.cotizacion.filter(p => p.idProveedor === null);

  // ── Proveedores con datos ──
  for (const prov of proveedoresConId) {
    // Fila de proveedor
    const provLabel = `${prov.nombreDistribuidora ?? 'Sin nombre'} — ${prov.nombreProveedor ?? ''} | Tel: ${prov.telefono ?? '—'} | Email: ${prov.email ?? '—'} | Productos: ${prov.totalProductos}`;
    for (let c = 0; c < totalCols; c++) {
      ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(c === 0 ? provLabel : '', styleProvHeader);
    }
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: totalCols - 1 } });
    row++;

    let totalProveedor = 0;

    for (const cat of prov.categorias) {
      // Fila de categoría
      for (let c = 0; c < totalCols; c++) {
        ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(c === 0 ? cat.nombreCategoria : '', styleCat);
      }
      merges.push({ s: { r: row, c: 0 }, e: { r: row, c: totalCols - 1 } });
      row++;

      for (const prod of cat.productos) {
        ws[XLSXStyle.utils.encode_cell({ r: row, c: 0 })] = sc('', styleText);
        ws[XLSXStyle.utils.encode_cell({ r: row, c: 1 })] = sc(cat.nombreCategoria, styleText);
        ws[XLSXStyle.utils.encode_cell({ r: row, c: 2 })] = sc(prod.nombreProducto, styleText);
        ws[XLSXStyle.utils.encode_cell({ r: row, c: 3 })] = sc(prod.abreviatura, styleText);
        ws[XLSXStyle.utils.encode_cell({ r: row, c: 4 })] = sc(prod.cantidadTotal, styleNum);
        ws[XLSXStyle.utils.encode_cell({ r: row, c: 5 })] = sc(
          prod.precioUnitario !== null ? prod.precioUnitario : '—',
          styleNum
        );
        ws[XLSXStyle.utils.encode_cell({ r: row, c: 6 })] = sc(
          prod.subtotal !== null ? prod.subtotal : '—',
          styleNum
        );
        if (prod.subtotal !== null) totalProveedor += prod.subtotal;
        row++;
      }
    }

    // Subtotal proveedor
    for (let c = 0; c < totalCols; c++) {
      if (c < totalCols - 1) {
        ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(
          c === 0 ? `Total ${prov.nombreDistribuidora ?? ''}` : '',
          styleTotal
        );
      } else {
        ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(totalProveedor, styleTotalPositivo);
      }
    }
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: totalCols - 2 } });
    row++;
  }

  // ── Productos sin proveedor ──
  if (proveedoresSinId.length > 0) {
    for (const sinProv of proveedoresSinId) {
      // Encabezado "Sin Proveedor"
      for (let c = 0; c < totalCols; c++) {
        ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(
          c === 0 ? `⚠ PRODUCTOS SIN PROVEEDOR (${sinProv.totalProductos} producto${sinProv.totalProductos !== 1 ? 's' : ''})` : '',
          styleSinProveedor
        );
      }
      merges.push({ s: { r: row, c: 0 }, e: { r: row, c: totalCols - 1 } });
      row++;

      for (const cat of sinProv.categorias) {
        for (let c = 0; c < totalCols; c++) {
          ws[XLSXStyle.utils.encode_cell({ r: row, c })] = sc(c === 0 ? cat.nombreCategoria : '', styleCat);
        }
        merges.push({ s: { r: row, c: 0 }, e: { r: row, c: totalCols - 1 } });
        row++;

        for (const prod of cat.productos) {
          ws[XLSXStyle.utils.encode_cell({ r: row, c: 0 })] = sc('Sin proveedor', styleText);
          ws[XLSXStyle.utils.encode_cell({ r: row, c: 1 })] = sc(cat.nombreCategoria, styleText);
          ws[XLSXStyle.utils.encode_cell({ r: row, c: 2 })] = sc(prod.nombreProducto, styleText);
          ws[XLSXStyle.utils.encode_cell({ r: row, c: 3 })] = sc(prod.abreviatura, styleText);
          ws[XLSXStyle.utils.encode_cell({ r: row, c: 4 })] = sc(prod.cantidadTotal, styleNum);
          ws[XLSXStyle.utils.encode_cell({ r: row, c: 5 })] = sc('—', styleNum);
          ws[XLSXStyle.utils.encode_cell({ r: row, c: 6 })] = sc('—', styleNum);
          row++;
        }
      }
    }
  }

  // ── Configuración de hoja ──
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row - 1, c: totalCols - 1 } });
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 40 }, // Proveedor
    { wch: 18 }, // Categoría
    { wch: 30 }, // Producto
    { wch: 10 }, // Unidad
    { wch: 14 }, // Cantidad
    { wch: 14 }, // Precio Unit.
    { wch: 14 }, // Subtotal
  ];
  ws['!rows'] = [{ hpt: 28 }];
  (ws as Record<string, unknown>)['!freeze'] = { xSplit: 0, ySplit: 2 };

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, 'Cotización');
  XLSXStyle.writeFile(wb, `cotizacion_proveedores_${fi}_${ff}.xlsx`);
};

// ── Sub-componente: Modal de Cotización por Rango ─────────────────────────────

interface CotizacionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: { start: CalendarDate; end: CalendarDate } | null;
  onDateRangeChange: (val: { start: CalendarDate; end: CalendarDate } | null) => void;
  cotizacionData: ICotizacionResponse | null;
  loading: boolean;
  error: string | null;
  onConsultar: () => void;
  onExportExcel: () => void;
}

const CotizacionModal: React.FC<CotizacionModalProps> = ({
  isOpen,
  onOpenChange,
  dateRange,
  onDateRangeChange,
  cotizacionData,
  loading,
  error,
  onConsultar,
  onExportExcel,
}) => {
  const proveedoresConId = cotizacionData?.cotizacion.filter(p => p.idProveedor !== null) ?? [];
  const proveedoresSinId = cotizacionData?.cotizacion.filter(p => p.idProveedor === null) ?? [];

  const calcularTotalProveedor = (prov: ICotizacionProveedor): number => {
    let total = 0;
    for (const cat of prov.categorias) {
      for (const prod of cat.productos) {
        if (prod.subtotal !== null) total += prod.subtotal;
      }
    }
    return total;
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl" scrollBehavior="inside" radius="lg" classNames={{ base: 'rounded-2xl' }}>
      <ModalContent className="rounded-2xl overflow-hidden">
        {(onClose) => (
          <>
            <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 px-6 py-4">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Icon icon="lucide:file-spreadsheet" className="text-primary" width={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-lg text-secondary dark:text-foreground">
                    Cotización por Rango
                  </span>
                  <span className="text-xs text-default-500">Agrupe productos por proveedor (menor precio)</span>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="gap-6 py-6">
              {/* Selector de rango */}
              <div className="flex flex-col sm:flex-row gap-3 items-end bg-default-50 dark:bg-default-100/20 rounded-xl p-4 border border-default-200 dark:border-default-100">
                <div className="flex-1">
                  <DateRangePicker
                    label="Seleccione rango de fechas"
                    variant="bordered"
                    value={dateRange}
                    onChange={onDateRangeChange}
                    className="w-full"
                  />
                </div>
                <Button
                  color="primary"
                  variant="solid"
                  className="font-bold text-secondary shadow-md cursor-pointer min-w-fit"
                  startContent={<Icon icon="lucide:search" width={18} />}
                  isLoading={loading}
                  isDisabled={!dateRange}
                  onPress={onConsultar}
                  size="lg"
                >
                  Consultar
                </Button>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 bg-danger-50 dark:bg-danger-50/10 border border-danger/30 text-danger text-sm p-4 rounded-xl">
                  <Icon icon="lucide:alert-circle" width={18} className="mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">Error en la consulta</p>
                    <p className="text-xs text-danger/80 dark:text-danger/70 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="flex justify-center py-10">
                  <Spinner size="lg" color="primary" label="Consultando cotización..." />
                </div>
              )}

              {/* Resultados */}
              {!loading && cotizacionData && (
                <div className="space-y-4">
                  {cotizacionData.cotizacion.length === 0 ? (
                    <div className="text-center py-10 text-default-400">
                      <Icon icon="lucide:inbox" width={40} className="mx-auto mb-2" />
                      <p>No hay productos solicitados en el rango seleccionado.</p>
                    </div>
                  ) : (
                    <>
                      {/* Proveedores con datos */}
                      {proveedoresConId.map((prov) => {
                        const totalProv = calcularTotalProveedor(prov);
                        return (
                          <Card
                            key={prov.idProveedor}
                            className="shadow-sm border border-default-200 dark:border-default-100"
                          >
                            <CardBody className="p-0">
                              {/* Header proveedor */}
                              <div className="bg-primary-50 dark:bg-primary-50/10 px-4 py-3 border-b border-default-100">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div>
                                    <h4 className="font-bold text-base text-secondary dark:text-foreground">
                                      {prov.nombreDistribuidora}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-default-500 mt-0.5">
                                      <span className="flex items-center gap-1">
                                        <Icon icon="lucide:user" width={12} />
                                        {prov.nombreProveedor ?? '—'}
                                      </span>
                                      {prov.telefono && (
                                        <>
                                          <span className="text-default-300">•</span>
                                          <span className="flex items-center gap-1">
                                            <Icon icon="lucide:phone" width={12} />
                                            {prov.telefono}
                                          </span>
                                        </>
                                      )}
                                      {prov.email && (
                                        <>
                                          <span className="text-default-300">•</span>
                                          <span className="flex items-center gap-1">
                                            <Icon icon="lucide:mail" width={12} />
                                            {prov.email}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Chip color="primary" size="sm" variant="flat">
                                      {prov.totalProductos} producto{prov.totalProductos !== 1 ? 's' : ''}
                                    </Chip>
                                    <Chip color="success" size="sm" variant="flat" className="font-bold">
                                      Total: ${fmtN(totalProv)}
                                    </Chip>
                                  </div>
                                </div>
                              </div>

                              {/* Tabla de productos */}
                              <div className="px-4 py-3">
                                {prov.categorias.map((cat) => (
                                  <div key={cat.idCategoria} className="mb-3 last:mb-0">
                                    <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-1">
                                      {cat.nombreCategoria}
                                    </p>
                                    <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
                                      <table className="w-full text-xs table-fixed">
                                        <colgroup>
                                          <col style={{ width: '40%' }} />
                                          <col style={{ width: '12%' }} />
                                          <col style={{ width: '15%' }} />
                                          <col style={{ width: '15%' }} />
                                          <col style={{ width: '18%' }} />
                                        </colgroup>
                                        <thead className="bg-default-100 dark:bg-default-50">
                                          <tr>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Producto</th>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Unidad</th>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Cantidad</th>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Precio Unit.</th>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {cat.productos.map((prod) => (
                                            <tr
                                              key={prod.idProducto}
                                              className="border-t border-default-100 dark:border-default-50 hover:bg-default-50 dark:hover:bg-default-100/20"
                                            >
                                              <td className="py-2 px-3 font-medium text-center overflow-hidden">
                                                <Tooltip content={prod.nombreProducto} color="default">
                                                  <span className="truncate">{prod.nombreProducto}</span>
                                                </Tooltip>
                                              </td>
                                              <td className="py-2 px-3 text-center text-default-500 overflow-hidden">
                                                <Tooltip content={prod.abreviatura} color="default">
                                                  <span className="truncate">{prod.abreviatura}</span>
                                                </Tooltip>
                                              </td>
                                              <td className="py-2 px-3 text-center overflow-hidden">{fmtN(prod.cantidadTotal)}</td>
                                              <td className="py-2 px-3 text-center overflow-hidden">
                                                {prod.precioUnitario !== null ? `$${fmtN(prod.precioUnitario)}` : '—'}
                                              </td>
                                              <td className="py-2 px-3 text-center font-semibold overflow-hidden">
                                                {prod.subtotal !== null ? `$${fmtN(prod.subtotal)}` : '—'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardBody>
                          </Card>
                        );
                      })}

                      {/* Productos sin proveedor */}
                      {proveedoresSinId.length > 0 && proveedoresSinId.map((sinProv, idx) => (
                        <Card
                          key={`sin-prov-${idx}`}
                          className="shadow-sm border-2 border-danger-200 dark:border-danger-300"
                        >
                          <CardBody className="p-0">
                            <div className="bg-danger-50 dark:bg-danger-50/10 px-4 py-3 border-b border-danger-200">
                              <div className="flex items-center gap-2">
                                <Icon icon="lucide:alert-triangle" className="text-danger" width={20} />
                                <h4 className="font-bold text-base text-danger">
                                  Productos Sin Proveedor
                                </h4>
                                <Chip color="danger" size="sm" variant="flat">
                                  {sinProv.totalProductos} producto{sinProv.totalProductos !== 1 ? 's' : ''}
                                </Chip>
                              </div>
                              <p className="text-xs text-danger-400 mt-1">
                                Estos productos no tienen un proveedor asignado. No hay precio asociado.
                              </p>
                            </div>

                            <div className="px-4 py-3">
                              {sinProv.categorias.map((cat) => (
                                <div key={cat.idCategoria} className="mb-3 last:mb-0">
                                  <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-1">
                                    {cat.nombreCategoria}
                                  </p>
                                  <div className="overflow-x-auto rounded-lg border border-danger-100 dark:border-danger-200">
                                    <table className="w-full text-xs table-fixed">
                                      <colgroup>
                                        <col style={{ width: '40%' }} />
                                        <col style={{ width: '12%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '18%' }} />
                                      </colgroup>
                                      <thead className="bg-danger-50/50 dark:bg-danger-50/10">
                                        <tr>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Producto</th>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Unidad</th>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Cantidad</th>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Precio Unit.</th>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Subtotal</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {cat.productos.map((prod) => (
                                          <tr
                                            key={prod.idProducto}
                                            className="border-t border-danger-50 dark:border-danger-100 hover:bg-danger-50/30"
                                          >
                                            <td className="py-2 px-3 font-medium text-center overflow-hidden">
                                              <Tooltip content={prod.nombreProducto} color="default">
                                                <span className="truncate">{prod.nombreProducto}</span>
                                              </Tooltip>
                                            </td>
                                            <td className="py-2 px-3 text-center text-default-500 overflow-hidden">{prod.abreviatura}</td>
                                            <td className="py-2 px-3 text-center overflow-hidden">{fmtN(prod.cantidadTotal)}</td>
                                            <td className="py-2 px-3 text-center text-default-400 overflow-hidden">—</td>
                                            <td className="py-2 px-3 text-center text-default-400 overflow-hidden">—</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </>
                  )}
                </div>
              )}
            </ModalBody>

            <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
              <Button variant="ghost" onPress={onClose} className="font-medium">
                Cerrar
              </Button>
              {cotizacionData && cotizacionData.cotizacion.length > 0 && (
                <Button
                  color="success"
                  variant="solid"
                  className="font-bold text-secondary shadow-md cursor-pointer"
                  startContent={<Icon icon="lucide:download" width={18} />}
                  onPress={onExportExcel}
                  size="lg"
                >
                  Descargar Excel
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default GestionProveedoresPage;
