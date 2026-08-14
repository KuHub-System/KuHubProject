import React from 'react';
import { Button, DatePicker, Input, Spinner, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { CalendarDate } from '@internationalized/date';
import { IProveedor, IProveedorCategoriaResumen, IProveedorDetalle, IProveedorProducto } from '../../types/proveedor/proveedor.types';
import {
  obtenerProductosPorFechaService,
  obtenerProductosPorCategoriaPaginadoService,
  descargarExcelPlantillaService,
} from '../../services/proveedor/proveedor-service';
import { esDesincronizado, formatPrecio, EVT_PROVEEDOR_PRODUCTO_ACTUALIZADO, ProveedorProductoPatchDetail } from './constants';
import { renderDisponibilidad } from './ui-helpers';

interface ProductosProveedorProps {
  proveedor: IProveedor;
  resumenCategorias: IProveedorCategoriaResumen[];
  canEdit: boolean;
  canExportDatos: boolean;
  editingPrecio: { idProveedorProducto: number; campo: 'neto' | 'iva' | 'marca' | 'contenido' } | null;
  precioTemp: string;
  savingPrecio: boolean;
  onIniciarEditPrecio: (idProveedorProducto: number, valorActual: string | number, campo?: 'neto' | 'iva' | 'marca' | 'contenido') => void;
  onPrecioTempChange: (val: string) => void;
  onGuardarPrecio: () => void;
  onCancelarEditPrecio: () => void;
  onBlurTexto: () => void;
  onToggleProducto: (idProveedor: number, prod: IProveedorProducto) => void;
  onQuitarProducto: (idProveedor: number, prod: IProveedorProducto) => void;
  onSincronizarPrecio: (idProveedor: number, prod: IProveedorProducto, direccion: 'desde-neto' | 'desde-iva') => void;
  mostrarInactivos?: boolean;
  onMostrarInactivosChange?: (mostrar: boolean) => void;
}

/** Estado de paginación por scroll infinito de una categoría dentro de la card del proveedor. */
interface CategoriaState {
  productos: IProveedorProducto[];
  page: number;
  totalPaginas: number;
  totalRegistros: number;
  loading: boolean;     // cargando la primera página (reset)
  loadingMore: boolean; // cargando una página siguiente (scroll)
  error: string | null;
}

const ESTADO_CATEGORIA_VACIO: CategoriaState = {
  productos: [], page: 0, totalPaginas: 0, totalRegistros: 0,
  loading: false, loadingMore: false, error: null,
};

const ProductosProveedor: React.FC<ProductosProveedorProps> = ({
  proveedor,
  resumenCategorias,
  canEdit,
  canExportDatos,
  editingPrecio,
  precioTemp,
  savingPrecio,
  onIniciarEditPrecio,
  onPrecioTempChange,
  onGuardarPrecio,
  onCancelarEditPrecio,
  onBlurTexto,
  onToggleProducto,
  onQuitarProducto,
  onSincronizarPrecio,
  mostrarInactivos = true,
  onMostrarInactivosChange,
}) => {
  // Vista histórica de precios: cuando el usuario elige una fecha, se carga el
  // detalle completo del proveedor con los precios vigentes hasta esa fecha (read-only).
  // A diferencia de la vista en vivo, esta vista NO se pagina: es una auditoría puntual
  // que se consulta ocasionalmente, no el catálogo completo que se scrollea a diario.
  const [fechaHistorica, setFechaHistorica] = React.useState<CalendarDate | null>(null);
  const [detalleHistorico, setDetalleHistorico] = React.useState<IProveedorDetalle | null>(null);
  const [loadingHistorico, setLoadingHistorico] = React.useState(false);
  const [errorHistorico, setErrorHistorico] = React.useState<string | null>(null);

  const [descargandoExcel, setDescargandoExcel] = React.useState(false);
  const [errorDescarga, setErrorDescarga] = React.useState<string | null>(null);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [expandedCategories, setExpandedCategories] = React.useState<Set<number>>(new Set());
  const [catState, setCatState] = React.useState<Record<number, CategoriaState>>({});

  const handleDescargarExcel = async () => {
    setDescargandoExcel(true);
    setErrorDescarga(null);
    try {
      const slug = (proveedor.nombreDistribuidora || `proveedor-${proveedor.idProveedor}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const fecha = new Date().toISOString().slice(0, 10);
      await descargarExcelPlantillaService(proveedor.idProveedor, `${slug}-${fecha}`);
    } catch (err: any) {
      setErrorDescarga(err.message || 'Error al descargar el archivo Excel');
    } finally {
      setDescargandoExcel(false);
    }
  };

  const esHistorico = detalleHistorico !== null;
  const editable = canEdit && !esHistorico;

  React.useEffect(() => {
    if (!fechaHistorica) {
      setDetalleHistorico(null);
      setErrorHistorico(null);
      return;
    }
    let cancelado = false;
    const fechaStr = fechaHistorica.toString();
    setLoadingHistorico(true);
    setErrorHistorico(null);
    obtenerProductosPorFechaService(proveedor.idProveedor, fechaStr)
      .then(d => { if (!cancelado) setDetalleHistorico(d); })
      .catch(err => { if (!cancelado) setErrorHistorico(err.message || 'Error al cargar el historial'); })
      .finally(() => { if (!cancelado) setLoadingHistorico(false); });
    return () => { cancelado = true; };
  }, [fechaHistorica, proveedor.idProveedor]);

  const limpiarFecha = () => {
    setFechaHistorica(null);
    setDetalleHistorico(null);
    setErrorHistorico(null);
  };

  // Debounce de la búsqueda (400ms) antes de mandarla al backend por categoría.
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const hoy = new Date();
  const calendarHoy = new CalendarDate(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate());

  // ── Carga paginada por categoría (vista en vivo) ──────────────────────────

  const cargarPaginaCategoria = React.useCallback((idCategoria: number, page: number, reset: boolean) => {
    setCatState(prev => ({
      ...prev,
      [idCategoria]: { ...(prev[idCategoria] ?? ESTADO_CATEGORIA_VACIO), loading: reset, loadingMore: !reset, error: null },
    }));
    obtenerProductosPorCategoriaPaginadoService(proveedor.idProveedor, idCategoria, {
      page,
      busqueda: debouncedSearch || undefined,
      soloActivos: !mostrarInactivos,
    })
      .then(resp => {
        setCatState(prev => {
          const prevProductos = reset ? [] : (prev[idCategoria]?.productos ?? []);
          return {
            ...prev,
            [idCategoria]: {
              productos: [...prevProductos, ...resp.data],
              page: resp.page,
              totalPaginas: resp.totalPaginas,
              totalRegistros: resp.totalRegistros,
              loading: false,
              loadingMore: false,
              error: null,
            },
          };
        });
      })
      .catch(err => {
        setCatState(prev => ({
          ...prev,
          [idCategoria]: { ...(prev[idCategoria] ?? ESTADO_CATEGORIA_VACIO), loading: false, loadingMore: false, error: err.message || 'Error al cargar productos' },
        }));
      });
  }, [proveedor.idProveedor, debouncedSearch, mostrarInactivos]);

  // Al cambiar el resumen (proveedor distinto, o invalidación tras asignar producto /
  // sincronizar Excel), o al cambiar la búsqueda / filtro de activos: expandir todas
  // las categorías (mismo comportamiento por defecto que antes) y recargar su página 1.
  React.useEffect(() => {
    if (esHistorico) return;
    const ids = resumenCategorias.map(c => c.idCategoria);
    setExpandedCategories(new Set(ids));
    ids.forEach(id => cargarPaginaCategoria(id, 1, true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumenCategorias, debouncedSearch, mostrarInactivos, esHistorico]);

  const toggleCategoria = (idCategoria: number) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(idCategoria)) {
        next.delete(idCategoria);
      } else {
        next.add(idCategoria);
        if (!catState[idCategoria]) cargarPaginaCategoria(idCategoria, 1, true);
      }
      return next;
    });
  };

  const handleScrollCategoria = (idCategoria: number) => (e: React.UIEvent<HTMLDivElement>) => {
    const st = catState[idCategoria];
    if (!st || st.loading || st.loadingMore || st.page >= st.totalPaginas) return;
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) {
      cargarPaginaCategoria(idCategoria, st.page + 1, false);
    }
  };

  // ── Escucha de patches puntuales (editar precio/marca/contenido, toggle, quitar) ──
  // Estos handlers viven en la página padre (compartidos con la búsqueda global), pero
  // ya no tienen un caché completo del proveedor para parchear directamente: emiten este
  // evento y cada card parchea su propio estado paginado si el producto está cargado.
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ProveedorProductoPatchDetail>).detail;
      if (!detail) return;
      setCatState(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          const idCat = Number(key);
          const st = next[idCat];
          const idx = st.productos.findIndex(p =>
            p.idProveedorProducto === detail.idProveedorProducto ||
            (detail.idProducto !== undefined && p.idProducto === detail.idProducto)
          );
          if (idx >= 0) {
            const productos = [...st.productos];
            productos[idx] = { ...productos[idx], ...detail.cambios };
            next[idCat] = { ...st, productos };
          }
        }
        return next;
      });
    };
    window.addEventListener(EVT_PROVEEDOR_PRODUCTO_ACTUALIZADO, handler);
    return () => window.removeEventListener(EVT_PROVEEDOR_PRODUCTO_ACTUALIZADO, handler);
  }, [proveedor.idProveedor]);

  // ── Filtro en memoria — SOLO para la vista histórica (no paginada) ────────
  const filtrarProductosHistorico = (productos: IProveedorProducto[]) => {
    let filtered = mostrarInactivos ? productos : productos.filter(p => p.activo);
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => p.nombreProducto.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered;
  };

  const categoriasHistorico = esHistorico ? Object.keys(detalleHistorico!.productosPorCategoria) : [];

  // Contador de productos desincronizados: viene precomputado del resumen del backend
  // (no depende de cuántos productos estén cargados en el cliente).
  const cantDesincronizados = React.useMemo(
    () => resumenCategorias.reduce((acc, c) => acc + c.totalDesincronizados, 0),
    [resumenCategorias]
  );

  const inlineEditUI = (
    <Input
      size="sm"
      value={precioTemp}
      onValueChange={onPrecioTempChange}
      className="w-20"
      classNames={{ inputWrapper: 'h-6 min-h-6' }}
      startContent={<span className="text-default-400 text-xs">$</span>}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onGuardarPrecio();
        if (e.key === 'Escape') onCancelarEditPrecio();
      }}
      onBlur={onBlurTexto}
      autoFocus
    />
  );

  const renderFilaProducto = (prod: IProveedorProducto) => {
    const isEditing = editingPrecio?.idProveedorProducto === prod.idProveedorProducto;
    const isEditingNeto = isEditing && editingPrecio?.campo === 'neto';
    const isEditingIva = isEditing && editingPrecio?.campo === 'iva';
    const isEditingContenido = isEditing && editingPrecio?.campo === 'contenido';
    const isEditingMarca = isEditing && editingPrecio?.campo === 'marca';

    return (
      <tr
        key={prod.idProveedorProducto}
        className={`border-t border-default-100 dark:border-default-50 ${
          prod.activo
            ? 'hover:bg-default-50 dark:hover:bg-default-100/20'
            : 'bg-default-50/30 dark:bg-default-100/10 opacity-60'
        }`}
      >
        <td className="py-2 px-3 font-medium text-center overflow-hidden">
          <Tooltip content={prod.nombreProducto} color="foreground" className="text-xs">
            <span className="truncate block">{prod.nombreProducto}</span>
          </Tooltip>
        </td>
        <td className="py-2 px-3 text-default-500 text-center overflow-hidden">
          <span className="truncate block">{prod.abreviatura || prod.nombreUnidad}</span>
        </td>
        <td className="py-2 px-3 text-default-500 text-center overflow-hidden">
          {isEditingContenido ? (
            <Input
              size="sm"
              value={precioTemp}
              onValueChange={onPrecioTempChange}
              className="w-20"
              classNames={{ inputWrapper: 'h-6 min-h-6' }}
              placeholder="—"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onGuardarPrecio();
                if (e.key === 'Escape') onCancelarEditPrecio();
              }}
              onBlur={onBlurTexto}
              autoFocus
            />
          ) : (
            <span
              className={`truncate block ${editable ? 'cursor-pointer hover:text-primary underline decoration-dotted' : ''}`}
              title={editable ? 'Clic para editar contenido' : undefined}
              onClick={() => editable && onIniciarEditPrecio(prod.idProveedorProducto, prod.formatoContenido ?? '', 'contenido')}
            >
              {prod.formatoContenido || '—'}
            </span>
          )}
        </td>
        <td className="py-2 px-3 text-default-500 text-center overflow-hidden">
          {isEditingMarca ? (
            <Input
              size="sm"
              value={precioTemp}
              onValueChange={onPrecioTempChange}
              className="w-20"
              classNames={{ inputWrapper: 'h-6 min-h-6' }}
              placeholder="—"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onGuardarPrecio();
                if (e.key === 'Escape') onCancelarEditPrecio();
              }}
              onBlur={onBlurTexto}
              autoFocus
            />
          ) : (
            <span
              className={`truncate block ${editable ? 'cursor-pointer hover:text-primary underline decoration-dotted' : ''}`}
              title={editable ? 'Clic para editar marca' : undefined}
              onClick={() => editable && onIniciarEditPrecio(prod.idProveedorProducto, prod.marcaProducto ?? '', 'marca')}
            >
              {prod.marcaProducto || '—'}
            </span>
          )}
        </td>
        {/* Precio Neto — editable inline (deshabilitado en vista histórica) */}
        <td className="py-2 px-3 text-center">
          {isEditingNeto ? inlineEditUI : isEditingIva ? (
            <span className="text-default-300">—</span>
          ) : (
            <span
              className={`cursor-pointer hover:text-primary transition-colors ${editable ? 'underline decoration-dotted' : ''}`}
              title={editable ? 'Clic para editar precio neto' : undefined}
              onClick={() => editable && onIniciarEditPrecio(prod.idProveedorProducto, prod.precioNeto, 'neto')}
            >
              {formatPrecio(prod.precioNeto)}
            </span>
          )}
        </td>
        {/* Precio + IVA — editable inline (deshabilitado en vista histórica) */}
        <td className="py-2 px-3 text-center">
          {isEditingIva ? inlineEditUI : isEditingNeto ? (
            <span className="text-default-300">—</span>
          ) : (
            <span
              className={`cursor-pointer hover:text-primary transition-colors ${editable ? 'underline decoration-dotted' : ''}`}
              title={editable ? 'Clic para editar precio con IVA' : undefined}
              onClick={() => editable && onIniciarEditPrecio(prod.idProveedorProducto, prod.precioConIva, 'iva')}
            >
              {formatPrecio(prod.precioConIva)}
            </span>
          )}
        </td>
        <td className="py-2 px-3 text-center">{renderDisponibilidad(prod.activo)}</td>
        <td className="py-2 px-3 text-default-400 text-center">
          {prod.fechaActualizacion ? new Date(prod.fechaActualizacion).toLocaleDateString('es-CL') : '—'}
        </td>
        {editable && (
          <td className="py-2 px-3 text-center">
            <div className="flex items-center justify-center gap-1">
              {/* Iconos de sincronización — solo aparecen cuando neto/IVA no coinciden.
                  Al hacer clic se llama al backend; cuando retorna true, el evento de patch
                  actualiza el valor localmente y el icono desaparece (esDesincronizado
                  vuelve a dar false en el próximo render). */}
              {esDesincronizado(prod) && (
                <>
                  <Tooltip content="Sincronizar IVA desde el precio neto">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => onSincronizarPrecio(proveedor.idProveedor, prod, 'desde-neto')}
                      className="text-primary hover:text-primary-600"
                    >
                      <Icon icon="lucide:arrow-right-from-line" width={16} />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Sincronizar neto desde el precio con IVA">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => onSincronizarPrecio(proveedor.idProveedor, prod, 'desde-iva')}
                      className="text-primary hover:text-primary-600"
                    >
                      <Icon icon="lucide:arrow-left-from-line" width={16} />
                    </Button>
                  </Tooltip>
                </>
              )}
              <Tooltip content={prod.activo ? 'Deshabilitar producto' : 'Habilitar producto'}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() =>
                    prod.activo
                      ? onQuitarProducto(proveedor.idProveedor, prod)
                      : onToggleProducto(proveedor.idProveedor, prod)
                  }
                  className={prod.activo ? 'text-success hover:text-danger' : 'text-warning hover:text-success'}
                >
                  <Icon icon={prod.activo ? 'lucide:check-circle-2' : 'lucide:circle-x'} width={18} />
                </Button>
              </Tooltip>
            </div>
          </td>
        )}
      </tr>
    );
  };

  const columnasHeader = (
    <thead className="bg-default-100 dark:bg-default-50 sticky top-0 z-10">
      <tr>
        <th className="text-center py-2 px-3 font-medium w-[160px]">Producto</th>
        <th className="text-center py-2 px-3 font-medium w-12">Unidad</th>
        <th className="text-center py-2 px-3 font-medium w-24">Contenido</th>
        <th className="text-center py-2 px-3 font-medium w-24">Marca</th>
        <th className="text-center py-2 px-3 font-medium w-28">Precio Neto</th>
        <th className="text-center py-2 px-3 font-medium w-28">Precio + IVA</th>
        <th className="text-center py-2 px-3 font-medium w-14">Estado</th>
        <th className="text-center py-2 px-3 font-medium w-20">Actualizado</th>
        {editable && <th className="py-2 px-3 font-medium text-center w-20">Acciones</th>}
      </tr>
    </thead>
  );

  return (
    <div className="space-y-3 mt-2">
      {/* Controles: búsqueda, vista histórica y mostrar/esconder deshabilitados */}
      <div className="space-y-2 px-2 pb-3">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:search" width={16} className="text-default-400" />
          <input
            type="text"
            placeholder="Buscar producto por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 text-xs border border-default-200 dark:border-default-100 rounded-lg bg-default-50 dark:bg-default-100/30 focus:outline-none focus:border-primary transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-default-400 hover:text-default-600 transition-colors"
            >
              <Icon icon="lucide:x" width={16} />
            </button>
          )}
        </div>

        {/* Vista histórica de precios — DatePicker + descarga de plantilla Excel */}
        <div className="flex items-center gap-2 flex-wrap">
          <Icon icon="lucide:history" width={16} className="text-default-400" />
          <span className="text-xs text-default-500">Ver precios al:</span>
          <DatePicker
            size="sm"
            value={fechaHistorica}
            onChange={setFechaHistorica}
            maxValue={calendarHoy}
            granularity="day"
            aria-label="Fecha para vista histórica de precios"
            className="max-w-[180px]"
          />
          {fechaHistorica && (
            <Button size="sm" variant="light" onPress={limpiarFecha}>
              <Icon icon="lucide:x" width={14} className="mr-1" />
              Ver actual
            </Button>
          )}
          {loadingHistorico && <Spinner size="sm" color="primary" />}
          {canExportDatos && (
            <div className="ml-auto">
              <Button
                size="sm"
                variant="flat"
                color="success"
                isDisabled={descargandoExcel}
                onPress={handleDescargarExcel}
              >
                {descargandoExcel ? (
                  <Spinner size="sm" color="success" />
                ) : (
                  <Icon icon="lucide:file-down" width={14} className="mr-1" />
                )}
                Descargar Excel
              </Button>
            </div>
          )}
        </div>

        {errorDescarga && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
            <Icon icon="lucide:alert-circle" width={14} className="text-danger-600 mt-0.5" />
            <p className="text-xs text-danger-700 dark:text-danger-300">{errorDescarga}</p>
          </div>
        )}

        {/* Banner indicando vista histórica */}
        {esHistorico && fechaHistorica && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
            <Icon icon="lucide:eye" width={14} className="text-warning-600 mt-0.5" />
            <p className="text-xs text-warning-700 dark:text-warning-300">
              Vista histórica al <strong>{fechaHistorica.toString()}</strong> — los precios mostrados eran los vigentes a esa fecha. La edición está deshabilitada.
            </p>
          </div>
        )}

        {errorHistorico && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
            <Icon icon="lucide:alert-circle" width={14} className="text-danger-600 mt-0.5" />
            <p className="text-xs text-danger-700 dark:text-danger-300">{errorHistorico}</p>
          </div>
        )}

        {/* Opción para mostrar/esconder deshabilitados */}
        {editable && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`esconderInactivos-${proveedor.idProveedor}`}
              checked={!mostrarInactivos}
              onChange={(e) => onMostrarInactivosChange?.(!e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer accent-warning"
            />
            <label
              htmlFor={`esconderInactivos-${proveedor.idProveedor}`}
              className="text-xs text-default-500 cursor-pointer hover:text-default-700 transition-colors"
            >
              {mostrarInactivos ? 'Esconder deshabilitados' : 'Mostrar deshabilitados'}
            </label>

            {cantDesincronizados > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-50 dark:bg-warning-900/30 border border-warning-200 dark:border-warning-800 text-warning-700 dark:text-warning-300 text-[11px]">
                <Icon icon="lucide:alert-triangle" width={12} />
                {cantDesincronizados} producto{cantDesincronizados === 1 ? '' : 's'} con precios desincronizados
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Vista histórica: full, sin paginar (auditoría puntual) ── */}
      {esHistorico ? (
        <>
          {categoriasHistorico.length === 0 && !loadingHistorico && (
            <p className="text-xs text-default-400 py-4 text-center">
              No había productos para este proveedor en la fecha seleccionada.
            </p>
          )}
          {categoriasHistorico.map((categoria) => {
            const productosEnCategoria = filtrarProductosHistorico(detalleHistorico!.productosPorCategoria[categoria]);
            const total = detalleHistorico!.productosPorCategoria[categoria].length;
            if (productosEnCategoria.length === 0 && searchQuery.trim()) return null;

            return (
              <div key={categoria}>
                <div className="flex items-center justify-between px-3 py-2 mb-1 bg-default-50 dark:bg-default-100/20 rounded-lg border border-default-200 dark:border-default-100">
                  <p className="text-xs font-semibold text-default-600 dark:text-default-400 uppercase tracking-wide">{categoria}</p>
                  <span className="text-xs text-default-400">{productosEnCategoria.length} / {total}</span>
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-72 rounded-lg border border-default-200 dark:border-default-100">
                  <table className="min-w-[820px] w-full text-xs table-fixed">
                    {columnasHeader}
                    <tbody>{productosEnCategoria.map(renderFilaProducto)}</tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        /* ── Vista en vivo: paginada por categoría con scroll infinito ── */
        <>
          {resumenCategorias.length === 0 && (
            <p className="text-xs text-default-400 py-4 text-center">
              Este proveedor no tiene productos asignados aún.
            </p>
          )}

          {resumenCategorias.map((cat) => {
            const isExpanded = expandedCategories.has(cat.idCategoria);
            const st = catState[cat.idCategoria];
            const productosCargados = st?.productos.length ?? 0;
            const totalFiltrado = st?.totalRegistros ?? (mostrarInactivos ? cat.totalProductos : cat.totalActivos);

            // Con búsqueda activa y ya resuelta (no loading) sin resultados, ocultar la categoría.
            if (debouncedSearch && st && !st.loading && st.totalRegistros === 0) return null;

            return (
              <div key={cat.idCategoria}>
                <div
                  onClick={() => toggleCategoria(cat.idCategoria)}
                  className="flex items-center justify-between px-3 py-2 mb-1 bg-default-50 dark:bg-default-100/20 rounded-lg border border-default-200 dark:border-default-100 cursor-pointer hover:bg-default-100 dark:hover:bg-default-100/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      icon={isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'}
                      width={18}
                      className="text-default-500 transition-transform"
                    />
                    <p className="text-xs font-semibold text-default-600 dark:text-default-400 uppercase tracking-wide">
                      {cat.nombreCategoria}
                    </p>
                  </div>
                  <span className="text-xs text-default-400">
                    {productosCargados} / {totalFiltrado}
                  </span>
                </div>

                {isExpanded && (
                  <div
                    className="overflow-x-auto overflow-y-auto max-h-72 rounded-lg border border-default-200 dark:border-default-100"
                    onScroll={handleScrollCategoria(cat.idCategoria)}
                  >
                    <table className="min-w-[820px] w-full text-xs table-fixed">
                      {columnasHeader}
                      <tbody>
                        {(st?.productos ?? []).map(renderFilaProducto)}
                        {st?.loading && (
                          <tr>
                            <td colSpan={editable ? 9 : 8} className="py-6 text-center">
                              <Spinner size="sm" color="primary" />
                            </td>
                          </tr>
                        )}
                        {st?.loadingMore && (
                          <tr>
                            <td colSpan={editable ? 9 : 8} className="py-3 text-center">
                              <Spinner size="sm" color="primary" />
                            </td>
                          </tr>
                        )}
                        {st?.error && (
                          <tr>
                            <td colSpan={editable ? 9 : 8} className="py-3 text-center text-danger text-xs">
                              {st.error}
                              <button
                                className="ml-2 underline"
                                onClick={() => cargarPaginaCategoria(cat.idCategoria, 1, true)}
                              >
                                Reintentar
                              </button>
                            </td>
                          </tr>
                        )}
                        {!st?.loading && !st?.error && productosCargados === 0 && (
                          <tr>
                            <td colSpan={editable ? 9 : 8} className="py-4 text-center text-default-400 text-xs">
                              Sin productos que coincidan
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default ProductosProveedor;
