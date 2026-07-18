import React from 'react';
import { Button, Card, CardBody, Chip, Input, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { IBusquedaProductosGlobal, IProveedorProducto } from '../../types/proveedor/proveedor.types';
import { formatPrecio } from './constants';
import { CardSkeleton } from '../../components/SkeletonLoader';

interface BusquedaResultadosProps {
  resultados: IBusquedaProductosGlobal[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  canEdit: boolean;
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
}

const BusquedaResultados: React.FC<BusquedaResultadosProps> = ({
  resultados,
  loading,
  error,
  searchTerm,
  canEdit,
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
}) => {
  const [expandedProveedores, setExpandedProveedores] = React.useState<Set<number>>(
    new Set(resultados.map(r => r.idProveedor))
  );
  const [expandedCategorias, setExpandedCategorias] = React.useState<Set<string>>(new Set());

  // Actualizar proveedores y categorías expandidos cuando los resultados cambian
  React.useEffect(() => {
    // Expandir todos los proveedores
    setExpandedProveedores(new Set(resultados.map(r => r.idProveedor)));

    // Expandir todas las categorías
    const allCategoriaKeys = new Set<string>();
    resultados.forEach(proveedor => {
      proveedor.categorias.forEach(categoria => {
        allCategoriaKeys.add(`${proveedor.idProveedor}-${categoria.nombreCategoria}`);
      });
    });
    setExpandedCategorias(allCategoriaKeys);
  }, [resultados]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} lines={1} hasBadge />)}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border border-danger-200 bg-danger-50 dark:bg-danger-50/10">
        <CardBody className="flex flex-row items-center gap-3 p-4">
          <Icon icon="lucide:alert-triangle" className="text-danger" width={22} />
          <p className="text-danger text-sm">{error}</p>
        </CardBody>
      </Card>
    );
  }

  if (resultados.length === 0) {
    return (
      <Card className="border border-default-200 bg-default-50">
        <CardBody className="flex flex-col items-center gap-2 py-8 text-default-400">
          <Icon icon="lucide:package-x" width={40} />
          <p className="text-sm text-center">
            No se encontró el producto <strong>"{searchTerm}"</strong>
          </p>
        </CardBody>
      </Card>
    );
  }

  const toggleProveedor = (idProveedor: number) => {
    const newExpanded = new Set(expandedProveedores);
    if (newExpanded.has(idProveedor)) {
      newExpanded.delete(idProveedor);
    } else {
      newExpanded.add(idProveedor);
    }
    setExpandedProveedores(newExpanded);
  };

  const toggleCategoria = (categoriaKey: string) => {
    const newExpanded = new Set(expandedCategorias);
    if (newExpanded.has(categoriaKey)) {
      newExpanded.delete(categoriaKey);
    } else {
      newExpanded.add(categoriaKey);
    }
    setExpandedCategorias(newExpanded);
  };

  return (
    <div className="space-y-3">
      {resultados.map((resultado) => {
        const isProveedorExpanded = expandedProveedores.has(resultado.idProveedor);
        const totalProductos = resultado.categorias.reduce((sum, cat) => sum + cat.productos.length, 0);

        return (
          <Card key={resultado.idProveedor} className="shadow-sm border border-default-200 dark:border-default-100">
            <CardBody className="p-0">
              {/* Header del Proveedor */}
              <div
                onClick={() => toggleProveedor(resultado.idProveedor)}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-3 cursor-pointer hover:bg-default-50 dark:hover:bg-default-100/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Icon
                    icon={isProveedorExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'}
                    className="text-default-400"
                    width={20}
                  />
                  <div>
                    <h3 className="font-bold text-base text-secondary">
                      {resultado.nombreDistribuidora}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-default-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Icon icon="lucide:user" width={12} />
                        {resultado.nombreProveedor}
                      </span>
                      <span className="text-default-300">•</span>
                      <span className="flex items-center gap-1">
                        <Icon icon="lucide:phone" width={12} />
                        {resultado.telefonoProveedor}
                      </span>
                      <span className="text-default-300">•</span>
                      <span className="flex items-center gap-1">
                        <Icon icon="lucide:mail" width={12} />
                        {resultado.emailProveedor}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Chip color="primary" size="sm" variant="flat">
                    {totalProductos} producto{totalProductos !== 1 ? 's' : ''}
                  </Chip>
                  {resultado.estadoProveedor === 'DISPONIBLE'
                    ? <Chip color="success" size="sm" variant="flat">Disponible</Chip>
                    : <Chip color="danger" size="sm" variant="flat">No Disponible</Chip>
                  }
                </div>
              </div>

              {/* Contenido expandible: Categorías y productos */}
              <AnimatePresence>
                {isProveedorExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-default-100"
                  >
                    <div className="p-4 space-y-3 bg-default-50 dark:bg-default-100/20">
                      {/* Mostrar categorías con productos agrupados */}
                      {resultado.categorias.map((categoria) => {
                        const productosEnCategoria = categoria.productos;
                        const categoriaKey = `${resultado.idProveedor}-${categoria.nombreCategoria}`;
                        const isCategoriaExpanded = expandedCategorias.has(categoriaKey);

                        return (
                          <div key={categoriaKey}>
                            {/* Header de categoría */}
                            <div
                              onClick={() => toggleCategoria(categoriaKey)}
                              className="flex items-center justify-between px-3 py-2 mb-1 bg-default-100 dark:bg-default-100/40 rounded-lg cursor-pointer hover:bg-default-200 dark:hover:bg-default-100/60 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Icon
                                  icon={isCategoriaExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'}
                                  width={18}
                                  className="text-default-500 transition-transform"
                                />
                                <p className="text-xs font-semibold text-default-600 dark:text-default-400 uppercase tracking-wide">
                                  {categoria.nombreCategoria}
                                </p>
                              </div>
                              <span className="text-xs text-default-400">
                                {productosEnCategoria.length}
                              </span>
                            </div>

                            {/* Tabla de productos */}
                            {isCategoriaExpanded && (
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
                                      <th className="py-2 px-3 font-medium text-center w-16">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {productosEnCategoria.map((prod) => {
                                      const isEditingEste = editingPrecio?.idProveedorProducto === prod.idProveedorProducto;
                                      const isEditingNetoB = isEditingEste && editingPrecio?.campo === 'neto';
                                      const isEditingIvaB  = isEditingEste && editingPrecio?.campo === 'iva';
                                      const isEditingContenidoB = isEditingEste && editingPrecio?.campo === 'contenido';
                                      const isEditingMarcaB = isEditingEste && editingPrecio?.campo === 'marca';
                                      return (
                                      <tr
                                        key={prod.idProveedorProducto}
                                        className={`border-t border-default-100 ${
                                          !prod.activo
                                            ? 'bg-default-100/30 dark:bg-default-100/10'
                                            : 'hover:bg-default-100 dark:hover:bg-default-100/30'
                                        }`}
                                      >
                                        <td className="py-2 px-3 text-center overflow-hidden">
                                          <Tooltip content={prod.nombreProducto} color="foreground" className="text-xs">
                                            <span className="truncate block">{prod.nombreProducto}</span>
                                          </Tooltip>
                                        </td>
                                        <td className="py-2 px-3 text-center overflow-hidden">
                                          <span className="truncate block">{prod.abreviatura}</span>
                                        </td>
                                        <td className="py-2 px-3 text-center text-default-500 overflow-hidden">
                                          {isEditingContenidoB ? (
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
                                              className={`truncate block ${canEdit ? 'cursor-pointer hover:text-primary underline decoration-dotted' : ''}`}
                                              title={canEdit ? 'Clic para editar contenido' : undefined}
                                              onClick={() => canEdit && onIniciarEditPrecio(prod.idProveedorProducto, prod.formatoContenido ?? '', 'contenido')}
                                            >
                                              {prod.formatoContenido || '—'}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-center text-default-500 overflow-hidden">
                                          {isEditingMarcaB ? (
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
                                              className={`truncate block ${canEdit ? 'cursor-pointer hover:text-primary underline decoration-dotted' : ''}`}
                                              title={canEdit ? 'Clic para editar marca' : undefined}
                                              onClick={() => canEdit && onIniciarEditPrecio(prod.idProveedorProducto, prod.marcaProducto ?? '', 'marca')}
                                            >
                                              {prod.marcaProducto || '—'}
                                            </span>
                                          )}
                                        </td>
                                        {/* Precio Neto — editable inline */}
                                        <td className="py-2 px-3 text-center">
                                          {isEditingNetoB ? (
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
                                              onBlur={onBlurTexto}
                                              autoFocus
                                            />
                                          ) : isEditingIvaB ? (
                                            <span className="text-default-300">—</span>
                                          ) : (
                                            <span
                                              className={`cursor-pointer hover:text-primary transition-colors ${canEdit ? 'underline decoration-dotted' : ''}`}
                                              title={canEdit ? 'Clic para editar precio neto' : undefined}
                                              onClick={() => canEdit && onIniciarEditPrecio(prod.idProveedorProducto, prod.precioNeto, 'neto')}
                                            >
                                              {formatPrecio(prod.precioNeto)}
                                            </span>
                                          )}
                                        </td>
                                        {/* Precio + IVA — editable inline */}
                                        <td className="py-2 px-3 text-center">
                                          {isEditingIvaB ? (
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
                                              onBlur={onBlurTexto}
                                              autoFocus
                                            />
                                          ) : isEditingNetoB ? (
                                            <span className="text-default-300">—</span>
                                          ) : (
                                            <span
                                              className={`cursor-pointer hover:text-primary transition-colors ${canEdit ? 'underline decoration-dotted' : ''}`}
                                              title={canEdit ? 'Clic para editar precio con IVA' : undefined}
                                              onClick={() => canEdit && onIniciarEditPrecio(prod.idProveedorProducto, prod.precioConIva, 'iva')}
                                            >
                                              {formatPrecio(prod.precioConIva)}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <Chip
                                            size="sm"
                                            variant="flat"
                                            color={prod.activo ? 'success' : 'default'}
                                          >
                                            {prod.activo ? 'Activo' : 'Inactivo'}
                                          </Chip>
                                        </td>
                                        <td className="py-2 px-3 text-center text-xs text-default-500">
                                          {prod.fechaActualizacion
                                            ? new Date(prod.fechaActualizacion).toLocaleDateString('es-CL')
                                            : '—'}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <Tooltip content={prod.activo ? 'Deshabilitar producto' : 'Habilitar producto'}>
                                            <Button
                                              isIconOnly
                                              size="sm"
                                              variant="light"
                                              onPress={() =>
                                                prod.activo
                                                  ? onQuitarProducto(resultado.idProveedor, prod as any)
                                                  : onToggleProducto(resultado.idProveedor, prod as any)
                                              }
                                              className={prod.activo ? 'text-success hover:text-danger' : 'text-warning hover:text-success'}
                                            >
                                              <Icon
                                                icon={prod.activo ? 'lucide:check-circle-2' : 'lucide:circle-x'}
                                                width={18}
                                              />
                                            </Button>
                                          </Tooltip>
                                        </td>
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
                  </motion.div>
                )}
              </AnimatePresence>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
};

export default BusquedaResultados;
