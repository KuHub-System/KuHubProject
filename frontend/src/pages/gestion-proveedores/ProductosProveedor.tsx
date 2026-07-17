import React from 'react';
import { Button, DatePicker, Input, Spinner, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { CalendarDate } from '@internationalized/date';
import { IProveedorDetalle, IProveedorProducto } from '../../types/proveedor/proveedor.types';
import { obtenerProductosPorFechaService, descargarExcelPlantillaService } from '../../services/proveedor/proveedor-service';
import { esDesincronizado, formatPrecio } from './constants';
import { renderDisponibilidad } from './ui-helpers';

interface ProductosProveedorProps {
  detalle: IProveedorDetalle;
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

const ProductosProveedor: React.FC<ProductosProveedorProps> = ({
  detalle,
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
  // detalle del proveedor con los precios vigentes hasta esa fecha (read-only).
  const [fechaHistorica, setFechaHistorica] = React.useState<CalendarDate | null>(null);
  const [detalleHistorico, setDetalleHistorico] = React.useState<IProveedorDetalle | null>(null);
  const [loadingHistorico, setLoadingHistorico] = React.useState(false);
  const [errorHistorico, setErrorHistorico] = React.useState<string | null>(null);

  const [descargandoExcel, setDescargandoExcel] = React.useState(false);
  const [errorDescarga, setErrorDescarga] = React.useState<string | null>(null);

  const handleDescargarExcel = async () => {
    setDescargandoExcel(true);
    setErrorDescarga(null);
    try {
      const slug = (detalle.nombreDistribuidora || `proveedor-${detalle.idProveedor}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const fecha = new Date().toISOString().slice(0, 10);
      await descargarExcelPlantillaService(detalle.idProveedor, `${slug}-${fecha}`);
    } catch (err: any) {
      setErrorDescarga(err.message || 'Error al descargar el archivo Excel');
    } finally {
      setDescargandoExcel(false);
    }
  };

  const esHistorico = detalleHistorico !== null;
  const detalleVisible = detalleHistorico ?? detalle;
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
    obtenerProductosPorFechaService(detalle.idProveedor, fechaStr)
      .then(d => { if (!cancelado) setDetalleHistorico(d); })
      .catch(err => { if (!cancelado) setErrorHistorico(err.message || 'Error al cargar el historial'); })
      .finally(() => { if (!cancelado) setLoadingHistorico(false); });
    return () => { cancelado = true; };
  }, [fechaHistorica, detalle.idProveedor]);

  const limpiarFecha = () => {
    setFechaHistorica(null);
    setDetalleHistorico(null);
    setErrorHistorico(null);
  };

  const categorias = Object.keys(detalleVisible.productosPorCategoria);
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(
    new Set(categorias)
  );
  const [searchQuery, setSearchQuery] = React.useState('');

  // Cuando cambian las categorías visibles (ej. al cargar histórico), expandir todas
  React.useEffect(() => {
    setExpandedCategories(new Set(Object.keys(detalleVisible.productosPorCategoria)));
  }, [detalleVisible]);

  const hoy = new Date();
  const calendarHoy = new CalendarDate(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate());

  // Filtrar productos según mostrarInactivos y búsqueda
  const filtrarProductos = (productos: typeof detalleVisible.productosPorCategoria[string]) => {
    let filtered = mostrarInactivos ? productos : productos.filter(p => p.activo);

    if (searchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.nombreProducto.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const toggleCategoria = (categoria: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoria)) {
      newExpanded.delete(categoria);
    } else {
      newExpanded.add(categoria);
    }
    setExpandedCategories(newExpanded);
  };

  // Contador de productos con neto/IVA desincronizados — recorre todos los productos
  // del detalle visible (actual o histórico) y aplica esDesincronizado().
  const cantDesincronizados = React.useMemo(() => {
    let n = 0;
    Object.values(detalleVisible.productosPorCategoria).forEach(prods => {
      prods.forEach(p => { if (esDesincronizado(p)) n++; });
    });
    return n;
  }, [detalleVisible]);

  return (
    <div className="space-y-3 mt-2">
      {/* Controles: búsqueda, vista histórica y mostrar/esconder deshabilitados */}
      <div className="space-y-2 px-2 pb-3">
        {/* Buscador de productos (siempre visible, pero se prioriza si el usuario escribe) */}
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
              id={`esconderInactivos-${detalleVisible.idProveedor}`}
              checked={!mostrarInactivos}
              onChange={(e) => onMostrarInactivosChange?.(!e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer accent-warning"
            />
            <label
              htmlFor={`esconderInactivos-${detalleVisible.idProveedor}`}
              className="text-xs text-default-500 cursor-pointer hover:text-default-700 transition-colors"
            >
              {mostrarInactivos ? 'Esconder deshabilitados' : 'Mostrar deshabilitados'}
            </label>

            {/* Label de productos con precios desincronizados (neto y IVA no coinciden) */}
            {cantDesincronizados > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-50 dark:bg-warning-900/30 border border-warning-200 dark:border-warning-800 text-warning-700 dark:text-warning-300 text-[11px]">
                <Icon icon="lucide:alert-triangle" width={12} />
                {cantDesincronizados} producto{cantDesincronizados === 1 ? '' : 's'} con precios desincronizados
              </span>
            )}
          </div>
        )}
      </div>

      {categorias.length === 0 && !loadingHistorico && (
        <p className="text-xs text-default-400 py-4 text-center">
          {esHistorico
            ? 'No había productos para este proveedor en la fecha seleccionada.'
            : 'Este proveedor no tiene productos asignados aún.'}
        </p>
      )}

      {categorias.map((categoria) => {
        const isExpanded = expandedCategories.has(categoria);
        const productosEnCategoria = filtrarProductos(detalleVisible.productosPorCategoria[categoria]);
        const total = detalleVisible.productosPorCategoria[categoria].length;

        // No renderizar categoría si no hay productos coincidentes con búsqueda
        if (productosEnCategoria.length === 0 && searchQuery.trim()) {
          return null;
        }

        return (
          <div key={categoria}>
            {/* Header de categoría con toggle */}
            <div
              onClick={() => toggleCategoria(categoria)}
              className="flex items-center justify-between px-3 py-2 mb-1 bg-default-50 dark:bg-default-100/20 rounded-lg border border-default-200 dark:border-default-100 cursor-pointer hover:bg-default-100 dark:hover:bg-default-100/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon
                  icon={isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'}
                  width={18}
                  className="text-default-500 transition-transform"
                />
                <p className="text-xs font-semibold text-default-600 dark:text-default-400 uppercase tracking-wide">
                  {categoria}
                </p>
              </div>
              <span className="text-xs text-default-400">
                {productosEnCategoria.length} / {total}
              </span>
            </div>

            {/* Tabla de productos (solo si la categoría está expandida) */}
            {isExpanded && (
              <div className="overflow-x-auto overflow-y-auto max-h-72 rounded-lg border border-default-200 dark:border-default-100">
                <table className="min-w-[820px] w-full text-xs table-fixed">
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
                  <tbody>
                {filtrarProductos(detalleVisible.productosPorCategoria[categoria]).map((prod) => {
                  const isEditing = editingPrecio?.idProveedorProducto === prod.idProveedorProducto;
                  const isEditingNeto = isEditing && editingPrecio?.campo === 'neto';
                  const isEditingIva  = isEditing && editingPrecio?.campo === 'iva';
                  const isEditingContenido = isEditing && editingPrecio?.campo === 'contenido';
                  const isEditingMarca = isEditing && editingPrecio?.campo === 'marca';

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
                        {prod.fechaActualizacion
                          ? new Date(prod.fechaActualizacion).toLocaleDateString('es-CL')
                          : '—'}
                      </td>
                      {editable && (
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Iconos de sincronización — solo aparecen cuando neto/IVA no coinciden.
                                Al hacer clic se llama al backend; cuando retorna true, el caché local
                                se actualiza con el nuevo valor calculado y el icono desaparece
                                (esDesincronizado vuelve a dar false en el próximo render). */}
                            {esDesincronizado(prod) && (
                              <>
                                <Tooltip content="Sincronizar IVA desde el precio neto">
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    onPress={() => onSincronizarPrecio(detalleVisible.idProveedor, prod, 'desde-neto')}
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
                                    onPress={() => onSincronizarPrecio(detalleVisible.idProveedor, prod, 'desde-iva')}
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
                                    ? onQuitarProducto(detalleVisible.idProveedor, prod)
                                    : onToggleProducto(detalleVisible.idProveedor, prod)
                                }
                                className={prod.activo ? 'text-success hover:text-danger' : 'text-warning hover:text-success'}
                              >
                                <Icon
                                  icon={prod.activo ? 'lucide:check-circle-2' : 'lucide:circle-x'}
                                  width={18}
                                />
                              </Button>
                            </Tooltip>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProductosProveedor;
