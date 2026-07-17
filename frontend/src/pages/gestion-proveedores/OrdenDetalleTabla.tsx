import React from 'react';
import { Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { IOrdenPedidoConDetalles, IDetalleOrdenPedido, EstadoOrdenPedido, IEntregaReal } from '../../types/proveedor/proveedor.types';
import { fmtN } from './constants';

/** Tabla de detalle de una Orden de Pedido — pivota productos × fechas, con columnas Solicitado/Real si la OP ya tiene entregas registradas. */
const OrdenDetalleTabla: React.FC<{ detalle: IOrdenPedidoConDetalles; mostrarEntregados?: boolean }> = ({ detalle, mostrarEntregados = true }) => {
  // Fechas únicas ordenadas ascendente
  const fechas = React.useMemo(() => {
    const set = new Set<string>();
    for (const d of detalle.detalles) set.add(d.fechaEntrega);
    return [...set].sort();
  }, [detalle.detalles]);

  // Producto → { fecha → detalle }
  type ProductoKey = { idProducto: number; nombreProducto: string; nombreCategoria: string; abreviatura: string; esFraccionario: boolean; precioNeto: number | null; precioConIva: number | null };
  const productos = React.useMemo(() => {
    const map = new Map<number, { meta: ProductoKey; porFecha: Map<string, IDetalleOrdenPedido> }>();
    for (const d of detalle.detalles) {
      if (!map.has(d.idProducto)) {
        map.set(d.idProducto, {
          meta: { idProducto: d.idProducto, nombreProducto: d.nombreProducto, nombreCategoria: d.nombreCategoria ?? '', abreviatura: d.abreviatura, esFraccionario: d.esFraccionario, precioNeto: d.precioNetoUnitario, precioConIva: d.precioConIvaUnitario },
          porFecha: new Map(),
        });
      }
      map.get(d.idProducto)!.porFecha.set(d.fechaEntrega, d);
    }
    return [...map.values()].sort((a, b) => {
      const cat = a.meta.nombreCategoria.localeCompare(b.meta.nombreCategoria);
      return cat !== 0 ? cat : a.meta.nombreProducto.localeCompare(b.meta.nombreProducto);
    });
  }, [detalle.detalles]);

  // Mapa idDetalleOrdenPedido → IEntregaReal (mapeo exacto por línea/fecha de la OP)
  const entregaMap = React.useMemo(() => {
    const map = new Map<number, IEntregaReal>();
    for (const er of detalle.entregasReales ?? []) {
      map.set(er.idDetalleOrdenPedido, er);
    }
    return map;
  }, [detalle.entregasReales]);

  const hasEntregas = (['CONFIRMADA', 'RECIBIDA'] as EstadoOrdenPedido[]).includes(detalle.estadoOrdenPedido)
    && (detalle.entregasReales?.length ?? 0) > 0;

  const fmtDDMM = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };

  const fmtCant = (v: number, fraccionario: boolean) =>
    fraccionario ? fmtN(v) : fmtN(Math.round(v));

  // Número de columnas totales (para el colSpan de separadores de categoría)
  const totalCols = 2 + (hasEntregas ? fechas.length * 2 : fechas.length) + 4;

  return (
    <div className="mt-3 space-y-3">
      {/* Info cabecera detalle */}
      <div className="flex flex-wrap gap-4 text-xs text-default-500 bg-white dark:bg-default-100/20 rounded-lg px-4 py-2 border border-default-100">
        {detalle.telefonoProveedor && (
          <span className="flex items-center gap-1"><Icon icon="lucide:phone" width={12} />{detalle.telefonoProveedor}</span>
        )}
        {detalle.emailProveedor && (
          <span className="flex items-center gap-1"><Icon icon="lucide:mail" width={12} />{detalle.emailProveedor}</span>
        )}
        {detalle.observaciones && (
          <span className="flex items-center gap-1 text-warning-700 dark:text-warning-400">
            <Icon icon="lucide:message-square" width={12} />{detalle.observaciones}
          </span>
        )}
      </div>

      {/* Tabla pivotada */}
      <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
        <table className="w-full text-xs">
          <thead className="bg-default-100 dark:bg-default-50">
            {/* Fila 1: cabeceras fijas + una cabecera por fecha (con colSpan=2 si hay entregas reales) */}
            <tr>
              <th rowSpan={hasEntregas ? 2 : 1} className="text-left py-2 px-3 font-medium w-[170px]">Producto</th>
              <th rowSpan={hasEntregas ? 2 : 1} className="text-center py-2 px-2 font-medium w-14">U/M</th>
              {fechas.map(f => (
                <th key={f} colSpan={hasEntregas ? 2 : 1} className="text-center py-2 px-2 font-semibold bg-warning-100 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 whitespace-nowrap">
                  {fmtDDMM(f)}
                </th>
              ))}
              <th rowSpan={hasEntregas ? 2 : 1} className="text-center py-2 px-2 font-medium w-[100px] whitespace-nowrap">P. Neto</th>
              <th rowSpan={hasEntregas ? 2 : 1} className="text-center py-2 px-2 font-medium w-[100px] whitespace-nowrap">P. c/IVA</th>
              <th rowSpan={hasEntregas ? 2 : 1} className="text-center py-2 px-2 font-medium w-[100px] whitespace-nowrap">T. Neto</th>
              <th rowSpan={hasEntregas ? 2 : 1} className="text-center py-2 px-2 font-medium w-[100px] whitespace-nowrap">T. c/IVA</th>
            </tr>
            {/* Fila 2: sub-cabeceras Solic. / Real bajo cada fecha */}
            {hasEntregas && (
              <tr>
                {fechas.map(f => (
                  <React.Fragment key={f}>
                    <th className="text-center py-1 px-2 text-[9px] font-medium text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/10 border-t border-warning-200 dark:border-warning-800 w-[62px]">Solic.</th>
                    <th className="text-center py-1 px-2 text-[9px] font-medium text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/10 border-t border-success-200 dark:border-success-800 w-[62px]">Real</th>
                  </React.Fragment>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {productos.map(({ meta, porFecha }, prodIdx, allProds) => {
              const isNewCat = prodIdx === 0 || allProds[prodIdx - 1].meta.nombreCategoria !== meta.nombreCategoria;
              const cantTotal = [...porFecha.values()].reduce((s, d) => s + d.cantidadSolicitada, 0);
              const tNeto   = meta.precioNeto   != null ? cantTotal * meta.precioNeto   : null;
              const tConIva = meta.precioConIva != null ? cantTotal * meta.precioConIva : null;
              return (
                <React.Fragment key={meta.idProducto}>
                  {isNewCat && (
                    <tr>
                      <td colSpan={totalCols} className="py-1 px-3 bg-default-100/80 dark:bg-default-50/20 text-default-600 dark:text-default-400 text-[10px] font-bold uppercase tracking-wide border-t-2 border-default-300 dark:border-default-600">
                        <span className="flex items-center gap-1.5">
                          <Icon icon="lucide:tag" width={10} />
                          {meta.nombreCategoria}
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-default-100 dark:border-default-50 hover:bg-default-50 dark:hover:bg-default-100/20">
                    <td className="py-2 px-3 font-medium text-left w-[170px]">
                      <Tooltip content={meta.nombreProducto} color="default" placement="top">
                        <div className="w-[146px] truncate">{meta.nombreProducto}</div>
                      </Tooltip>
                    </td>
                    <td className="py-2 px-2 text-center text-default-500 whitespace-nowrap">{meta.abreviatura}</td>
                    {fechas.map(f => {
                      const d = porFecha.get(f);
                      const er = d ? entregaMap.get(d.idDetalleOrdenPedido) : undefined;
                      const solicitado = d?.cantidadSolicitada ?? 0;
                      const entregado  = er?.cantidadEntregada ?? null;
                      const match = entregado != null && Math.abs(entregado - solicitado) < 0.001;
                      const short = entregado != null && entregado < solicitado - 0.001;
                      return (
                        <React.Fragment key={f}>
                          {/* Columna solicitado */}
                          <td className="py-2 px-2 text-center bg-warning-50/40 dark:bg-warning-900/10 font-semibold whitespace-nowrap">
                            {d ? (
                              <div className="flex items-center justify-center gap-1">
                                {fmtCant(d.cantidadSolicitada, meta.esFraccionario)}
                                {mostrarEntregados && d.entregado && <Icon icon="lucide:check-circle-2" width={11} className="text-success shrink-0" />}
                              </div>
                            ) : <span className="text-default-300">—</span>}
                          </td>
                          {/* Columna real — solo cuando hay entregas */}
                          {hasEntregas && (
                            <td className={`py-2 px-2 text-center whitespace-nowrap font-semibold ${
                              entregado != null
                                ? match
                                  ? 'bg-success-50/60 dark:bg-success-900/20 text-success-600 dark:text-success-400'
                                  : short
                                  ? 'bg-warning-50/60 dark:bg-warning-900/20 text-warning-600 dark:text-warning-400'
                                  : 'bg-primary-50/60 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                : 'bg-default-50/20'
                            }`}>
                              {entregado != null ? (
                                <div className="flex items-center justify-center gap-0.5">
                                  {fmtCant(entregado, meta.esFraccionario)}
                                  {match && <Icon icon="lucide:check-circle-2" width={10} className="shrink-0" />}
                                  {short && <Icon icon="lucide:alert-circle" width={10} className="shrink-0" />}
                                  {!match && !short && <Icon icon="lucide:arrow-up-circle" width={10} className="shrink-0" />}
                                </div>
                              ) : <span className="text-default-300 text-[10px]">—</span>}
                            </td>
                          )}
                        </React.Fragment>
                      );
                    })}
                    <td className="py-2 px-2 text-center whitespace-nowrap text-default-600">
                      {meta.precioNeto != null ? `$${fmtN(meta.precioNeto)}` : '—'}
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap text-default-600">
                      {meta.precioConIva != null ? `$${fmtN(meta.precioConIva)}` : '—'}
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap text-success-700 font-semibold">
                      {tNeto != null ? `$${fmtN(tNeto)}` : '—'}
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap text-warning-700 font-semibold">
                      {tConIva != null ? `$${fmtN(tConIva)}` : '—'}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end items-center gap-3 text-xs bg-default-50 dark:bg-default-100/10 rounded-lg px-4 py-2.5 border border-default-200/60">
        <span className="font-bold text-default-700">Sub totales esperado:</span>
        <span className="text-success-600 font-semibold">Neto: ${fmtN(detalle.totalNeto)}</span>
        <span className="text-warning-600 font-semibold">c/IVA: ${fmtN(detalle.totalConIva)}</span>
      </div>
    </div>
  );
};

export default React.memo(OrdenDetalleTabla);
