import React from 'react';
import { Button, Card, CardBody, Checkbox, Chip, Divider, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { IProveedorGrupoConsolidado, EstadoProveedor, TDiaSemana } from '../../types/proveedor/proveedor.types';
import { IDisponibleReal } from '../../services/proveedor/proveedor-service';
import { nombreFeriadoChile } from '../../utils/feriados-chile';
import { ColSpecOC, fmtN, DIA_ORDEN, DIAS_ABREV_OC, getEntregaKey, buildColsOC, getMondayISO, addDaysISO } from './constants';
import EntregaInput from './EntregaInput';

interface ProveedorCotizacionTablaProps {
  proveedor: IProveedorGrupoConsolidado;
  /** idProducto → diaSemana → cantidad editable (sólo para días de entrega) */
  cantidadesProv: Record<number, Record<string, number>>;
  /** idProducto → diaSemana → cantidad original (base de comparación para el icono de restaurar) */
  cantidadesOriginalesProv: Record<number, Record<string, number>>;
  onCantidadChange: (idProveedor: number, idProducto: number, dia: string, valor: number) => void;
  /** Incremento/decremento con redistribución automática (botones ±). */
  onIncrement: (idProducto: number, entregaKey: string, delta: number, colSpecs: ColSpecOC[]) => void;
  /** Restaura la distribución de un producto a los valores iniciales. */
  onRestaurar: (idProducto: number) => void;
  /** idSolicitud → entregaKey: día de entrega actual de cada solicitud de este proveedor. */
  solicitudDiaProv?: Record<number, string>;
  /** idProducto → disponible real (inventario+tránsito − demanda comprometida). */
  disponible?: Record<number, IDisponibleReal>;
  /** Mueve una solicitud completa a otro día de entrega. */
  onMoverSolicitud?: (idSolicitud: number, nuevoKey: string) => void;
  /** Vuelve este proveedor a su distribución inicial. */
  onResetProveedor?: () => void;
  /** Fecha elegida por el usuario para calcular la semana de entrega real (YYYY-MM-DD). */
  fechaEntrega: string | null;
  estadoProveedor?: EstadoProveedor | null;
  isToggling?: boolean;
  onToggleEstado?: () => void;
}

const ProveedorCotizacionTabla: React.FC<ProveedorCotizacionTablaProps> = ({
  proveedor,
  cantidadesProv,
  cantidadesOriginalesProv,
  solicitudDiaProv,
  disponible,
  onCantidadChange,
  onIncrement,
  onRestaurar,
  onMoverSolicitud,
  onResetProveedor,
  fechaEntrega,
  estadoProveedor,
  isToggling,
  onToggleEstado,
}) => {
  /** Solicitud cuyo detalle de productos está desplegado en el panel (null = ninguno). */
  const [solDetalleAbierta, setSolDetalleAbierta] = React.useState<number | null>(null);
  const [ordenSol, setOrdenSol] = React.useState<'dia' | 'id'>('dia');
  const [ocultarReservadas, setOcultarReservadas] = React.useState(false);

  /** Productos (cantidad y reservado) que aporta una solicitud específica en este proveedor. */
  const productosDeSolicitud = React.useCallback((idSolicitud: number) => {
    const out: Array<{ nombreProducto: string; abreviatura: string; cantidad: number; reservado: number }> = [];
    for (const cat of proveedor.categorias)
      for (const prod of cat.productos)
        for (const s of prod.solicitudes)
          if (s.idSolicitud === idSolicitud && s.cantidad > 0)
            out.push({ nombreProducto: prod.nombreProducto, abreviatura: prod.abreviatura, cantidad: s.cantidad, reservado: s.reservado ?? 0 });
    return out;
  }, [proveedor]);

  /** Dado un día de la semana del proveedor, devuelve la fecha exacta de entrega (DD/MM)
   *  usando el lunes de la semana elegida por el usuario como base. */
  const fechaExactaEntrega = React.useCallback((dia: TDiaSemana, semanaAnterior?: boolean): string | null => {
    if (!fechaEntrega) return null;
    const lunes = getMondayISO(fechaEntrega);
    const base = semanaAnterior ? addDaysISO(lunes, -7) : lunes;
    const fecha = addDaysISO(base, DIA_ORDEN[dia] - 1);
    const [, mm, dd] = fecha.split('-');
    return `${dd}/${mm}`;
  }, [fechaEntrega]);

  /** Calcula la info de entrega para una columna E: fecha ajustada + detección de feriados.
   *  Si la fecha cae en feriado, retrocede al día anterior disponible del proveedor. */
  const calcEntregaInfo = React.useCallback((col: ColSpecOC): {
    fechaDisplay: string | null;
    esFeriado: boolean;
    fechaOriginal: string | null;
    nombreFeriado: string | null;
  } => {
    if (!fechaEntrega || col.tipo !== 'entrega') {
      return { fechaDisplay: null, esFeriado: false, fechaOriginal: null, nombreFeriado: null };
    }
    const lunes = getMondayISO(fechaEntrega);
    const base = col.semanaAnterior ? addDaysISO(lunes, -7) : lunes;
    const fechaISO = addDaysISO(base, DIA_ORDEN[col.dia] - 1);
    const [añoS, mmS, ddS] = fechaISO.split('-');
    const fechaDate = new Date(Number(añoS), Number(mmS) - 1, Number(ddS));
    const fmt = (dt: Date) =>
      `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const nombreF = nombreFeriadoChile(fechaDate);
    if (!nombreF) {
      return { fechaDisplay: fmt(fechaDate), esFeriado: false, fechaOriginal: null, nombreFeriado: null };
    }
    // Es feriado: buscar día de entrega anterior del proveedor que no sea feriado
    const diasProvNum = [...(proveedor.diasEntrega ?? [])]
      .map(d => DIA_ORDEN[d]).sort((a, b) => a - b);
    const diaOriginalNum = DIA_ORDEN[col.dia];
    const originalDisplay = fmt(fechaDate);
    let fechaAjustada: Date | null = null;
    // Buscar hacia atrás en días del proveedor de la misma semana base
    for (let i = diasProvNum.length - 1; i >= 0; i--) {
      if (diasProvNum[i] < diaOriginalNum) {
        const candISO = addDaysISO(base, diasProvNum[i] - 1);
        const [cA, cM, cD] = candISO.split('-');
        const cand = new Date(Number(cA), Number(cM) - 1, Number(cD));
        if (!nombreFeriadoChile(cand)) { fechaAjustada = cand; break; }
      }
    }
    // Si no encontró en la misma semana, buscar en semana anterior
    if (!fechaAjustada) {
      const baseAnterior = addDaysISO(lunes, -7);
      for (let i = diasProvNum.length - 1; i >= 0; i--) {
        const candISO = addDaysISO(baseAnterior, diasProvNum[i] - 1);
        const [cA, cM, cD] = candISO.split('-');
        const cand = new Date(Number(cA), Number(cM) - 1, Number(cD));
        if (!nombreFeriadoChile(cand)) { fechaAjustada = cand; break; }
      }
    }
    return {
      fechaDisplay: fechaAjustada ? fmt(fechaAjustada) : originalDisplay,
      esFeriado: true,
      fechaOriginal: originalDisplay,
      nombreFeriado: nombreF,
    };
  }, [fechaEntrega, proveedor.diasEntrega]);

  const esSinProveedor = proveedor.idProveedor == null;

  // Días con cantidad > 0 en cualquier producto de este proveedor.
  const diasConQty = React.useMemo<Set<TDiaSemana>>(() => {
    const s = new Set<TDiaSemana>();
    for (const cat of proveedor.categorias)
      for (const prod of cat.productos)
        for (const c of prod.cantidadPorDia)
          if (c.dia !== 'SIN_DIA' && c.cantidad > 0) s.add(c.dia as TDiaSemana);
    return s;
  }, [proveedor]);

  // Especificación de columnas: Cant.{día} (read-only) o Entrega {día} (editable).
  const colSpecs = React.useMemo<ColSpecOC[]>(
    () => buildColsOC(proveedor.diasEntrega ?? [], diasConQty),
    [proveedor.diasEntrega, diasConQty],
  );

  // Solicitudes únicas que aporta este proveedor, con su día de necesidad (para el panel de mover).
  const solicitudesProvTodas = React.useMemo<Array<{ idSolicitud: number; dia: TDiaSemana | 'SIN_DIA'; totalmenteReservada: boolean }>>(() => {
    const map = new Map<number, TDiaSemana | 'SIN_DIA'>();
    for (const cat of proveedor.categorias)
      for (const prod of cat.productos)
        for (const s of prod.solicitudes)
          if (!map.has(s.idSolicitud)) map.set(s.idSolicitud, s.dia);
    const getDiaOrden = (d: TDiaSemana | 'SIN_DIA') => d === 'SIN_DIA' ? 99 : DIA_ORDEN[d];
    return [...map.entries()]
      .map(([idSolicitud, dia]) => {
        const prods = productosDeSolicitud(idSolicitud);
        const totalmenteReservada = prods.length > 0 && prods.every(p => p.cantidad <= p.reservado);
        return { idSolicitud, dia, totalmenteReservada };
      })
      .sort((a, b) => {
        if (ordenSol === 'dia') {
          const diff = getDiaOrden(a.dia) - getDiaOrden(b.dia);
          if (diff !== 0) return diff;
        }
        return a.idSolicitud - b.idSolicitud;
      });
  }, [proveedor, ordenSol, productosDeSolicitud]);

  const solicitudesProv = React.useMemo(() => {
    return solicitudesProvTodas.filter(sol => !ocultarReservadas || !sol.totalmenteReservada);
  }, [solicitudesProvTodas, ocultarReservadas]);

  // Días de entrega disponibles como destino (las columnas de entrega reales, con su fecha).
  const entregaOpciones = React.useMemo<Array<{ key: string; diaNum: number; semanaAnterior: boolean; label: string }>>(() =>
    colSpecs
      .filter((c): c is Extract<ColSpecOC, { tipo: 'entrega' }> => c.tipo === 'entrega')
      .map(c => {
        const info = calcEntregaInfo(c);
        return {
          key: getEntregaKey(c),
          diaNum: DIA_ORDEN[c.dia],
          semanaAnterior: !!c.semanaAnterior,
          label: `${DIAS_ABREV_OC[c.dia]}${c.semanaAnterior ? ' (sem. ant.)' : ''}${info.fechaDisplay ? ' · ' + info.fechaDisplay : ''}`,
        };
      }),
    [colSpecs, calcEntregaInfo],
  );

  /**
   * Destinos válidos para una solicitud: la entrega debe ser ESTRICTAMENTE anterior a su día de
   * necesidad (no el mismo día — no hay tiempo de abastecer y entregar). Los días de semana
   * anterior siempre califican.
   */
  const targetsParaSolicitud = React.useCallback((dia: TDiaSemana | 'SIN_DIA') =>
    dia === 'SIN_DIA'
      ? entregaOpciones
      : entregaOpciones.filter(o => o.semanaAnterior || o.diaNum < DIA_ORDEN[dia]),
    [entregaOpciones],
  );

  // Totales del proveedor: Σ (entrega × precioUnitario) para todos los productos.
  const totales = React.useMemo(() => {
    let neto = 0; let conIva = 0;
    for (const cat of proveedor.categorias)
      for (const prod of cat.productos) {
        const sum = Object.values(cantidadesProv[prod.idProducto] ?? {}).reduce((s, v) => s + v, 0);
        if (prod.precioNeto != null) neto += sum * prod.precioNeto;
        if (prod.precioConIva != null) conIva += sum * prod.precioConIva;
      }
    return { neto, conIva };
  }, [proveedor, cantidadesProv]);

  return (
    <Card className={esSinProveedor
      ? 'shadow-sm border-2 border-danger-200 dark:border-danger-300'
      : 'shadow-sm border border-default-200 dark:border-default-100'
    }>
      <CardBody className="p-0">
        {/* Header del proveedor */}
        <div className={esSinProveedor
          ? 'bg-danger-50 dark:bg-danger-50/10 px-4 py-3 border-b border-danger-200'
          : 'bg-warning-50 dark:bg-warning-50/10 px-4 py-3 border-b border-default-100'
        }>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className={esSinProveedor ? 'font-bold text-base text-danger' : 'font-bold text-base text-secondary dark:text-foreground'}>
                {esSinProveedor ? 'Productos Sin Proveedor' : proveedor.nombreDistribuidora}
              </h4>
              {!esSinProveedor && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-default-500 mt-0.5">
                  <span className="flex items-center gap-1"><Icon icon="lucide:user" width={12} />{proveedor.nombreProveedor ?? '—'}</span>
                  {proveedor.telefono && (<><span className="text-default-300">•</span><span className="flex items-center gap-1"><Icon icon="lucide:phone" width={12} />{proveedor.telefono}</span></>)}
                  {proveedor.email && (<><span className="text-default-300">•</span><span className="flex items-center gap-1"><Icon icon="lucide:mail" width={12} />{proveedor.email}</span></>)}
                </div>
              )}
              {!esSinProveedor && proveedor.diasEntrega && proveedor.diasEntrega.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  <span className="text-[11px] text-default-500 mr-1">Días de entrega:</span>
                  {proveedor.diasEntrega.map(d => (
                    <Chip key={d} size="sm" color="warning" variant="flat" className="text-[10px]">{DIAS_ABREV_OC[d]}</Chip>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Chip color="primary" size="sm" variant="flat">{proveedor.totalProductos} producto{proveedor.totalProductos !== 1 ? 's' : ''}</Chip>
              {!esSinProveedor && (
                <>
                  <Chip color="success" size="sm" variant="flat" className="font-bold">Neto: ${fmtN(totales.neto)}</Chip>
                  <Chip color="warning" size="sm" variant="flat" className="font-bold">c/IVA: ${fmtN(totales.conIva)}</Chip>
                </>
              )}
              {!esSinProveedor && onToggleEstado && estadoProveedor != null && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Chip
                    color={estadoProveedor === 'DISPONIBLE' ? 'success' : 'danger'}
                    size="sm"
                    variant="flat"
                    className="text-[10px]"
                  >
                    {estadoProveedor === 'DISPONIBLE' ? 'Disponible' : 'No Disponible'}
                  </Chip>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    title={estadoProveedor === 'DISPONIBLE' ? 'Cambiar a No Disponible' : 'Cambiar a Disponible'}
                    isLoading={isToggling}
                    onPress={onToggleEstado}
                  >
                    <Icon
                      icon={estadoProveedor === 'DISPONIBLE' ? 'lucide:toggle-right' : 'lucide:toggle-left'}
                      className={estadoProveedor === 'DISPONIBLE' ? 'text-success' : 'text-danger'}
                      width={20}
                    />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel: mover solicitudes a un día de entrega (la entrega nunca pasa la necesidad) */}
        {!esSinProveedor && onMoverSolicitud && solicitudesProvTodas.length > 0 && entregaOpciones.length > 0 && (
          <div className="px-4 pt-3">
            <div className="rounded-lg border border-default-200 dark:border-default-100 bg-default-50/60 dark:bg-default-100/5 p-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-default-600 dark:text-default-400 flex items-center gap-1">
                  <Icon icon="lucide:calendar-clock" width={14} />
                  Mover solicitudes a un día de entrega
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-default-500">Ordenar por:</span>
                  <button
                    type="button"
                    onClick={() => setOrdenSol('dia')}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      ordenSol === 'dia'
                        ? 'bg-warning text-white font-semibold'
                        : 'bg-default-100 text-default-600 hover:bg-default-200'
                    }`}
                  >
                    Día Clase
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrdenSol('id')}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      ordenSol === 'id'
                        ? 'bg-warning text-white font-semibold'
                        : 'bg-default-100 text-default-600 hover:bg-default-200'
                    }`}
                  >
                    ID Solicitud
                  </button>

                  <Divider orientation="vertical" className="h-4 hidden sm:block" />

                  <Checkbox
                    size="sm"
                    color="warning"
                    isSelected={ocultarReservadas}
                    onValueChange={setOcultarReservadas}
                    classNames={{ label: "text-[11px] text-default-600 font-medium cursor-pointer" }}
                  >
                    Ocultar reservados
                  </Checkbox>

                  {onResetProveedor && (
                    <>
                      <Divider orientation="vertical" className="h-4 hidden sm:block" />
                      <button
                        type="button"
                        onClick={() => { setSolDetalleAbierta(null); onResetProveedor(); }}
                        title="Volver a la distribución inicial (deshace movimientos y ajustes ±)"
                        className="flex items-center gap-1 text-[11px] text-default-500 hover:text-warning border border-default-200 dark:border-default-100 rounded-md px-2 py-0.5 hover:bg-warning-50 dark:hover:bg-warning-900/20 transition-colors cursor-pointer"
                      >
                        <Icon icon="lucide:rotate-ccw" width={12} />
                        Volver al inicial
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {solicitudesProv.length === 0 ? (
                  <p className="text-[11px] text-default-400 italic">No hay solicitudes para mostrar.</p>
                ) : (
                  solicitudesProv.map(sol => {
                    const actual = solicitudDiaProv?.[sol.idSolicitud] ?? '';
                    const opciones = targetsParaSolicitud(sol.dia);
                    const abierta = solDetalleAbierta === sol.idSolicitud;
                    const totalmenteReservada = sol.totalmenteReservada;
                    return (
                      <div
                        key={sol.idSolicitud}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 ${
                          abierta
                            ? 'border-warning bg-warning-50/60 dark:bg-warning-900/20'
                            : 'border-default-200 dark:border-default-100 bg-content1 dark:bg-default-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSolDetalleAbierta(abierta ? null : sol.idSolicitud)}
                          title="Ver productos de esta solicitud"
                          className="flex items-center gap-1 text-[11px] font-semibold text-secondary dark:text-foreground hover:text-warning whitespace-nowrap cursor-pointer"
                        >
                          <Icon icon="lucide:list" width={11} />
                          Sol. #{sol.idSolicitud}
                        </button>
                        <span className="text-[10px] text-default-400 whitespace-nowrap">
                          nec. {sol.dia === 'SIN_DIA' ? '—' : DIAS_ABREV_OC[sol.dia as TDiaSemana]}
                        </span>
                        <Icon icon="lucide:arrow-right" width={11} className="text-default-300" />
                        {totalmenteReservada ? (
                          <Tooltip content="Todos los productos de la solicitud se encuentran reservados" color="warning" placement="top">
                            <span className="inline-block">
                              <select
                                disabled
                                value={actual}
                                className="text-[11px] rounded border border-default-200 dark:border-default-100 bg-transparent px-1 py-0.5 outline-none opacity-50 cursor-not-allowed max-w-[150px]"
                                title="Todos los productos de la solicitud se encuentran reservados"
                              >
                                <option value={actual}>{actual}</option>
                              </select>
                            </span>
                          </Tooltip>
                        ) : (
                          <select
                            value={actual}
                            onChange={e => onMoverSolicitud(sol.idSolicitud, e.target.value)}
                            className="text-[11px] rounded border border-default-200 dark:border-default-100 bg-transparent px-1 py-0.5 outline-none focus:border-warning cursor-pointer max-w-[150px]"
                            title="Día de entrega de esta solicitud"
                          >
                            {opciones.map(o => (
                              <option key={o.key} value={o.key}>{o.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>
        )}

        {/* Modal: detalle de productos de una solicitud */}
        <Modal
          isOpen={solDetalleAbierta != null}
          onOpenChange={(open) => { if (!open) setSolDetalleAbierta(null); }}
          size="lg"
          backdrop="blur"
          radius="lg"
          scrollBehavior="inside"
          classNames={{ base: 'rounded-2xl', body: 'min-h-[200px]' }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <span className="text-base font-bold text-secondary dark:text-foreground">
                    Solicitud #{solDetalleAbierta}
                  </span>
                  <span className="text-xs font-normal text-default-500">
                    Productos que aporta a {proveedor.nombreDistribuidora ?? 'este proveedor'}
                  </span>
                </ModalHeader>
                <ModalBody>
                  <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
                    <table className="w-full text-xs">
                      <thead className="bg-default-100 dark:bg-default-50">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium">Producto</th>
                          <th className="text-center py-2 px-3 font-medium w-24">Cantidad</th>
                          <th className="text-center py-2 px-3 font-medium w-24">Reservado</th>
                          <th className="text-center py-2 px-3 font-medium w-16">U/M</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(solDetalleAbierta != null ? productosDeSolicitud(solDetalleAbierta) : []).map((p, i) => (
                          <tr key={i} className="border-t border-default-100 dark:border-default-50">
                            <td className="py-2 px-3 text-left">
                              <Tooltip content={p.nombreProducto} color="foreground" className="text-xs">
                                <span className="truncate block whitespace-nowrap max-w-[320px]">{p.nombreProducto}</span>
                              </Tooltip>
                            </td>
                            <td className="py-2 px-3 text-center font-medium text-default-700 dark:text-default-300 whitespace-nowrap">{fmtN(p.cantidad)}</td>
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              {p.reservado > 0
                                ? <span className="font-semibold text-primary">{fmtN(p.reservado)}</span>
                                : <span className="text-default-300">—</span>}
                            </td>
                            <td className="py-2 px-3 text-center text-default-500 whitespace-nowrap">{p.abreviatura}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={onClose}>Cerrar</Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Tabla productos por categoría */}
        <div className="px-4 py-3">
          {proveedor.categorias.map(cat => (
            <div key={cat.idCategoria} className="mb-3 last:mb-0">
              <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-1">{cat.nombreCategoria}</p>
              <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
                <table className="w-full text-xs">
                  <thead className="bg-default-100 dark:bg-default-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium w-[170px]">Producto</th>
                      <th className="text-center py-2 px-2 font-medium w-16">U/M</th>
                      <th className="text-center py-2 px-2 font-medium w-[90px]" title="Cantidad ya reservada desde stock (cubierta al aprobar el pedido); se descuenta de lo que se pide.">Reservado</th>
                      <th className="text-center py-2 px-2 font-medium w-[110px]">Total Ped.</th>
                      <th className="text-center py-2 px-2 font-medium w-[110px]" title="Disponible real = inventario + bodega de tránsito − demanda comprometida (solicitudes EN_PEDIDO ya abastecidas)">Disponible</th>
                      {!esSinProveedor && colSpecs.map(col => {
                        if (col.tipo === 'entrega') {
                          const info = calcEntregaInfo(col);
                          const thBase = 'text-center py-2 px-2 font-semibold w-[110px] whitespace-nowrap';
                          const thClass = info.esFeriado
                            ? `${thBase} bg-danger-100 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400`
                            : `${thBase} bg-warning-100 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400`;
                          const contenido = (
                            <>
                              Entrega {DIAS_ABREV_OC[col.dia]}{col.semanaAnterior ? '*' : ''}
                              {info.esFeriado && <span className="text-[9px] font-bold ml-0.5">⚠ FERIADO</span>}
                              {info.fechaDisplay && (
                                <><br /><span className="text-[10px] font-normal">{info.fechaDisplay}{info.esFeriado && info.fechaOriginal && ` (era ${info.fechaOriginal})`}</span></>
                              )}
                            </>
                          );
                          return (
                            <th key={`entrega-${getEntregaKey(col)}`} className={thClass}>
                              {info.esFeriado ? (
                                <Tooltip
                                  content={`Entrega retrasada: ${info.nombreFeriado} (${info.fechaOriginal})`}
                                  color="danger"
                                  placement="top"
                                >
                                  <span>{contenido}</span>
                                </Tooltip>
                              ) : contenido}
                            </th>
                          );
                        }
                        const fechaCant = fechaExactaEntrega(col.dia);
                        return (
                          <th key={`cant-${col.dia}`} className="text-center py-2 px-2 font-medium w-[92px] text-default-500 whitespace-nowrap">
                            Cant.<br />{DIAS_ABREV_OC[col.dia]}
                            {fechaCant && <><br /><span className="text-[10px] font-normal">{fechaCant}</span></>}
                          </th>
                        );
                      })}
                      <th className="text-center py-2 px-2 font-medium w-[110px]">P. Neto</th>
                      <th className="text-center py-2 px-2 font-medium w-[110px]">P. c/IVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.productos.map(prod => {
                      const entregasProd  = cantidadesProv[prod.idProducto] ?? {};
                      const sumEntregas   = Object.values(entregasProd).reduce((s, v) => s + v, 0);
                      const pNetoFila   = prod.precioNeto   != null ? sumEntregas * prod.precioNeto   : null;
                      const pConIvaFila = prod.precioConIva != null ? sumEntregas * prod.precioConIva : null;
                      return (
                        <tr key={prod.idProducto} className="border-t border-default-100 dark:border-default-50 hover:bg-default-50 dark:hover:bg-default-100/20">
                          <td className="py-2 px-3 font-medium text-left w-[170px]">
                            <Tooltip content={prod.nombreProducto} color="default" placement="top">
                              <div className="w-[146px] truncate">{prod.nombreProducto}</div>
                            </Tooltip>
                          </td>
                          <td className="py-2 px-2 text-center text-default-500 whitespace-nowrap">{prod.abreviatura}</td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            {(() => {
                              const res = (prod.solicitudes ?? []).reduce((s, x) => s + (x.reservado ?? 0), 0);
                              return res > 0
                                ? <span className="font-semibold text-primary">{fmtN(res)}</span>
                                : <span className="text-default-300">—</span>;
                            })()}
                          </td>
                          <td className="py-2 px-2 text-center font-medium text-default-700 whitespace-nowrap">{fmtN(prod.cantidadTotal)}</td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            {(() => {
                              const d = disponible?.[prod.idProducto];
                              if (!d) return <span className="text-default-300">—</span>;
                              // El disponible no puede ser negativo: si no hay stock real, es CERO.
                              const dispMostrado = Math.max(0, d.disponible);
                              const color = dispMostrado > 0 ? 'text-success' : 'text-default-500';
                              return (
                                <Tooltip
                                  content={`Stock físico (inv. + tránsito): ${fmtN(d.stockFisico)} · Comprometido: ${fmtN(d.demandaComprometida)}`}
                                  color="foreground"
                                  className="text-xs"
                                >
                                  <span className={`font-semibold ${color}`}>{fmtN(dispMostrado)}</span>
                                </Tooltip>
                              );
                            })()}
                          </td>
                          {!esSinProveedor && colSpecs.map(col => {
                            if (col.tipo === 'cant') {
                              const qty = prod.cantidadPorDia.find(c => c.dia === col.dia)?.cantidad ?? 0;
                              return (
                                <td key={`cant-${col.dia}`} className="py-2 px-2 text-center text-default-500 whitespace-nowrap">
                                  {qty > 0 ? fmtN(qty) : <span className="text-default-300">—</span>}
                                </td>
                              );
                            }
                            // tipo === 'entrega' — editable
                            const entregaKey = getEntregaKey(col);
                            const v = entregasProd[entregaKey] ?? 0;
                            return (
                              <td key={`entrega-${entregaKey}`} className="py-1 px-1 text-center bg-warning-50/40 dark:bg-warning-900/10 whitespace-nowrap">
                                <EntregaInput
                                  value={v}
                                  esFraccionario={prod.esFraccionario}
                                  onChange={(valor) => {
                                    if (proveedor.idProveedor == null) return;
                                    onCantidadChange(proveedor.idProveedor, prod.idProducto, entregaKey, valor);
                                  }}
                                  onIncrement={(delta) => onIncrement(prod.idProducto, entregaKey, delta, colSpecs)}
                                />
                              </td>
                            );
                          })}
                          <td className="py-2 px-2 text-center whitespace-nowrap">{pNetoFila   !== null ? `$${fmtN(pNetoFila)}`   : '—'}</td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">{pConIvaFila !== null ? `$${fmtN(pConIvaFila)}` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};

export default ProveedorCotizacionTabla;
