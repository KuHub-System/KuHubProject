import React from 'react';
import { Button, Checkbox, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem } from '@heroui/react';
import { Icon } from '@iconify/react';
import BookPageLoader from '../../components/BookPageLoader';
import type { ISemana } from '../../types/academica/semana.types';
import { IPedidoSemanaResumen, ICotizacionConsolidadaResponse, EstadoProveedor, IProveedorGrupoConsolidado } from '../../types/proveedor/proveedor.types';
import { IDisponibleReal } from '../../services/proveedor/proveedor-service';
import { ColSpecOC, getMondayISO, addDaysISO } from './constants';
import ProveedorCotizacionTabla from './ProveedorCotizacionTabla';

interface OrdenPedidoModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  paso: 1 | 2;
  periodos: { anio: number; semestres: number[] }[];
  periodo: { anio: number; semestre: number } | null;
  onPeriodoChange: (p: { anio: number; semestre: number } | null) => void;
  semanas: ISemana[];
  semana: ISemana | null;
  onSemanaChange: (s: ISemana | null) => void;
  pedidos: IPedidoSemanaResumen[];
  loadingPedidos: boolean;
  errorPedidos: string | null;
  seleccionados: Set<number>;
  onToggleSeleccion: (id: number) => void;
  onGenerar: () => void;
  cotizacion: ICotizacionConsolidadaResponse | null;
  loadingCotizacion: boolean;
  errorCotizacion: string | null;
  cantidades: Record<number, Record<number, Record<string, number>>>;
  cantidadesOriginales: Record<number, Record<number, Record<string, number>>>;
  /** idProveedor → idSolicitud → entregaKey: día de entrega actual de cada solicitud. */
  solicitudDias: Record<number, Record<number, string>>;
  /** idProducto → disponible real (inventario+tránsito − demanda comprometida). */
  disponible: Record<number, IDisponibleReal>;
  /** Estado del checkbox "Cubrir con disponible". */
  cubrirDisponible: boolean;
  /** Marca/desmarca "cubrir con disponible" (reduce el pedido por el disponible). */
  onToggleCubrirDisponible: (checked: boolean) => void;
  onCantidadChange: (idProveedor: number, idProducto: number, dia: string, valor: number) => void;
  onIncrement: (idProveedor: number, idProducto: number, entregaKey: string, delta: number, colSpecs: ColSpecOC[]) => void;
  onRestaurar: (idProveedor: number, idProducto: number) => void;
  /** Mueve una solicitud completa a otro día de entrega dentro de un proveedor. */
  onMoverSolicitud: (idProveedor: number, idSolicitud: number, nuevoKey: string) => void;
  /** Vuelve un proveedor a su distribución inicial (cantidades + selectores de mover). */
  onResetProveedor: (idProveedor: number) => void;
  onVolver: () => void;
  fechaEntrega: string | null;
  onFechaEntregaChange: (f: string) => void;
  proveedoresEstados?: Record<number, EstadoProveedor>;
  togglingEstadoPaso2Id?: number | null;
  onToggleEstadoProveedor?: (prov: IProveedorGrupoConsolidado, estadoActual: EstadoProveedor) => void;
  onConfirmarOrden: () => void;
  onReservarYSalir: () => void;
  isGenerandoOrdenes: boolean;
}

const chipOrdenPedido = (cantidad: number, canceladas: number) => {
  if (cantidad === 0 && canceladas === 0) return <Chip color="default" size="sm" variant="flat">Sin OP</Chip>;
  if (cantidad === 0 && canceladas > 0)   return <Chip color="warning" size="sm" variant="flat">Existe un registro cancelado, realizar nuevo</Chip>;
  if (cantidad >= 1 && canceladas > 0)    return <Chip color="secondary" size="sm" variant="flat">OP activa + canceladas por regenerar</Chip>;
  if (cantidad === 1)                     return <Chip color="success" size="sm" variant="flat">OP Generada</Chip>;
  return <Chip color="danger" size="sm" variant="flat">Ya existe un registro para este pedido</Chip>;
};

const formatRangoPedido = (inicio: string, fin: string) => `${inicio} → ${fin}`;

const OrdenPedidoModal: React.FC<OrdenPedidoModalProps> = ({
  isOpen,
  onOpenChange,
  paso,
  periodos,
  periodo,
  onPeriodoChange,
  semanas,
  semana,
  onSemanaChange,
  pedidos,
  loadingPedidos,
  errorPedidos,
  seleccionados,
  onToggleSeleccion,
  onGenerar,
  cotizacion,
  loadingCotizacion,
  errorCotizacion,
  cantidades,
  cantidadesOriginales,
  solicitudDias,
  disponible,
  cubrirDisponible,
  onToggleCubrirDisponible,
  onCantidadChange,
  onIncrement,
  onRestaurar,
  onMoverSolicitud,
  onResetProveedor,
  onVolver,
  fechaEntrega,
  onFechaEntregaChange,
  proveedoresEstados,
  togglingEstadoPaso2Id,
  onToggleEstadoProveedor,
  onConfirmarOrden,
  onReservarYSalir,
  isGenerandoOrdenes,
}) => {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const semestreActual = hoy.getMonth() + 1 <= 6 ? 1 : 2;

  const todoCubierto =
    cubrirDisponible &&
    cotizacion != null &&
    cotizacion.cotizacion.length > 0 &&
    Object.values(cantidades).length > 0 &&
    Object.values(cantidades).every(byProd =>
      Object.values(byProd).every(byDia =>
        Object.values(byDia).every(v => !v || v <= 0)
      )
    );

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size={paso === 1 ? '3xl' : '5xl'}
      backdrop="blur"
      scrollBehavior="inside"
      isDismissable={false}
      radius="lg"
      classNames={{ base: 'rounded-2xl', body: 'min-h-[400px]' }}
    >
      <ModalContent className="rounded-2xl overflow-hidden">
        {(onClose) => (
          <>
            <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-warning/10 to-warning/5 dark:from-warning/20 dark:to-warning/10 px-6 py-4">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 bg-warning/20 rounded-lg">
                  <Icon icon="lucide:clipboard-list" className="text-warning" width={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-lg text-secondary dark:text-foreground">
                    Generar Orden Pedido
                  </span>
                  <span className="text-xs text-default-500">
                    {paso === 1
                      ? 'Paso 1 — Seleccione la semana y los pedidos APROBADO a consolidar'
                      : 'Paso 2 — Cotización consolidada con menor precio + distribución por día'}
                  </span>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="gap-6 py-6">
              {paso === 1 && (
                <>
                  {/* Selectores Período + Semana */}
                  <div className="flex flex-col sm:flex-row gap-3 items-end bg-default-50 dark:bg-default-100/20 rounded-xl p-4 border border-default-200 dark:border-default-100">
                    <div className="w-full sm:w-48">
                      <Select
                        label="Período"
                        placeholder="Año - Semestre"
                        variant="bordered"
                        size="sm"
                        selectedKeys={periodo ? new Set([`${periodo.anio}-${periodo.semestre}`]) : new Set()}
                        onSelectionChange={(keys) => {
                          const v = Array.from(keys as Set<string>)[0];
                          if (v) {
                            const [a, s] = v.split('-');
                            onPeriodoChange({ anio: Number(a), semestre: Number(s) });
                          }
                        }}
                        classNames={{ trigger: 'bg-white dark:bg-default-100/50' }}
                      >
                        {periodos.flatMap(p =>
                          p.semestres.map(s => (
                            <SelectItem key={`${p.anio}-${s}`} textValue={`${p.anio} - S${s}`}>
                              <div className="flex items-center w-full gap-2">
                                <span className="font-semibold">{p.anio} - S{s}</span>
                                {p.anio === anioActual && s === semestreActual && (
                                  <Chip size="sm" color="success" variant="flat" className="ml-auto shrink-0 text-[10px]">
                                    Actual
                                  </Chip>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </Select>
                    </div>
                    <div className="flex-1 w-full">
                      <Select
                        label="Semana"
                        placeholder={semanas.length === 0 ? 'Seleccione un período primero' : 'Seleccione la semana'}
                        variant="bordered"
                        size="sm"
                        isDisabled={semanas.length === 0}
                        selectedKeys={semana ? new Set([String(semana.idSemana)]) : new Set()}
                        onSelectionChange={(keys) => {
                          const v = Array.from(keys as Set<string>)[0];
                          if (!v) {
                            onSemanaChange(null);
                            return;
                          }
                          const s = semanas.find(x => String(x.idSemana) === v) ?? null;
                          onSemanaChange(s);
                        }}
                        classNames={{ trigger: 'bg-white dark:bg-default-100/50' }}
                      >
                        {semanas.map(s => (
                          <SelectItem key={String(s.idSemana)} textValue={s.nombreSemana}>
                            <div className="flex items-center w-full gap-2">
                              <span className="font-semibold">{s.nombreSemana}</span>
                              <span className="text-default-400 text-xs">
                                {s.fechaInicio} – {s.fechaFin}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* Selector de fecha de entrega — visible cuando hay semana seleccionada */}
                  {semana && (() => {
                    const minISO = semana.fechaInicio;
                    const maxISO = semana.fechaFin;
                    const lunesEntrega = fechaEntrega ? getMondayISO(fechaEntrega) : null;
                    const domEntrega  = lunesEntrega ? addDaysISO(lunesEntrega, 6) : null;
                    return (
                      <div className="bg-warning-50 dark:bg-warning-50/10 border border-warning-200 dark:border-warning-400/30 rounded-xl p-3 space-y-2">
                        <p className="text-xs font-semibold text-warning-700 dark:text-warning-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Icon icon="lucide:truck" width={13} />
                          Semana de entrega
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <input
                            type="date"
                            min={minISO}
                            max={maxISO}
                            value={fechaEntrega ?? ''}
                            onChange={(e) => onFechaEntregaChange(e.target.value)}
                            className="rounded-lg border border-warning-300 dark:border-warning-500/50 bg-white dark:bg-default-100/50 px-3 py-1.5 text-sm focus:outline-none focus:border-warning-500 text-default-700"
                          />
                          {lunesEntrega && domEntrega ? (
                            <span className="text-sm text-default-600">
                              Semana del{' '}
                              <span className="font-semibold text-warning-700 dark:text-warning-400">{lunesEntrega}</span>
                              {' '}al{' '}
                              <span className="font-semibold text-warning-700 dark:text-warning-400">{domEntrega}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-default-400 italic">Seleccione una fecha (máx: {maxISO})</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Error de carga de pedidos */}
                  {errorPedidos && (
                    <div className="flex items-start gap-3 bg-danger-50 dark:bg-danger-50/10 border border-danger/30 text-danger text-sm p-4 rounded-xl">
                      <Icon icon="lucide:alert-circle" width={18} className="mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">Error al cargar pedidos</p>
                        <p className="text-xs text-danger/80 dark:text-danger/70 mt-0.5">{errorPedidos}</p>
                      </div>
                    </div>
                  )}

                  {/* BookPageLoader mientras se cargan los pedidos */}
                  {loadingPedidos && (
                    <div className="flex justify-center items-center py-6 min-h-[220px]">
                      <BookPageLoader
                        message="Cargando pedidos"
                        subMessage="Obteniendo pedidos APROBADO de la semana..."
                      />
                    </div>
                  )}

                  {/* Tabla de pedidos */}
                  {!loadingPedidos && semana && (
                    <div className="space-y-2">
                      {pedidos.length === 0 ? (
                        <div className="text-center py-10 text-default-400">
                          <Icon icon="lucide:inbox" width={40} className="mx-auto mb-2" />
                          <p>No hay pedidos APROBADO en la semana seleccionada.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
                          <table className="w-full text-xs">
                            <thead className="bg-default-100 dark:bg-default-50">
                              <tr>
                                <th className="text-center py-2 px-3 font-medium w-12">Sel.</th>
                                <th className="text-center py-2 px-3 font-medium w-16">ID</th>
                                <th className="text-center py-2 px-3 font-medium">Rango del Pedido</th>
                                <th className="text-center py-2 px-3 font-medium">Estado</th>
                                <th className="text-center py-2 px-3 font-medium">OC asociadas</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pedidos.map(p => {
                                // cubiertoPorReservados bloquea siempre (stock cubre todo, no se necesita OP).
                                // Sin eso: bloquear solo si hay OPs activas y ninguna cancelada pendiente.
                                const bloqueado = p.cubiertoPorReservados || (p.cantidadOrdenPedido >= 1 && p.cantidadOrdenCanceladas === 0);
                                return (
                                <tr
                                  key={p.idPedido}
                                  className={`border-t border-default-100 dark:border-default-50 transition-colors ${
                                    bloqueado
                                      ? 'opacity-50 cursor-not-allowed'
                                      : 'cursor-pointer hover:bg-default-50 dark:hover:bg-default-100/20'
                                  }`}
                                  onClick={() => !bloqueado && onToggleSeleccion(p.idPedido)}
                                >
                                  <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 accent-warning"
                                      style={{ cursor: bloqueado ? 'not-allowed' : 'pointer' }}
                                      checked={seleccionados.has(p.idPedido)}
                                      disabled={bloqueado}
                                      onChange={() => !bloqueado && onToggleSeleccion(p.idPedido)}
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-center text-default-400 font-mono">
                                    #{p.idPedido}
                                  </td>
                                  <td className="py-2 px-3 text-center font-medium">
                                    {formatRangoPedido(p.fechaInicioPedido, p.fechaFinPedido)}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <Chip color="primary" size="sm" variant="flat">{p.estadoPedido}</Chip>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {p.cubiertoPorReservados
                                      ? <Chip color="primary" size="sm" variant="solid">Cubierto por reservados</Chip>
                                      : chipOrdenPedido(p.cantidadOrdenPedido, p.cantidadOrdenCanceladas)
                                    }
                                  </td>
                                </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {paso === 2 && (
                <>
                  {/* Resumen semana solicitud + selector de fecha de entrega editable */}
                  {semana && (() => {
                    const minISO      = semana.fechaInicio;
                    const maxISO      = semana.fechaFin;
                    const lunesEntrega = fechaEntrega ? getMondayISO(fechaEntrega) : null;
                    const domEntrega   = lunesEntrega ? addDaysISO(lunesEntrega, 6) : null;
                    return (
                      <div className="flex flex-wrap items-center gap-3 bg-default-50 dark:bg-default-100/20 rounded-xl px-4 py-3 border border-default-200 dark:border-default-100 text-sm">
                        <span className="flex items-center gap-1.5 text-default-600">
                          <Icon icon="lucide:calendar" width={15} className="text-default-400" />
                          Semana solicitud:
                          <span className="font-semibold text-secondary dark:text-foreground">{semana.nombreSemana}</span>
                          <span className="text-default-400 text-xs">({semana.fechaInicio})</span>
                        </span>
                        <span className="text-default-300">|</span>
                        <span className="flex flex-wrap items-center gap-2 text-default-600">
                          <Icon icon="lucide:truck" width={15} className="text-warning" />
                          <span>Semana de entrega:</span>
                          <input
                            type="date"
                            min={minISO}
                            max={maxISO}
                            value={fechaEntrega ?? ''}
                            onChange={(e) => onFechaEntregaChange(e.target.value)}
                            className="rounded-md border border-warning-300 dark:border-warning-500/50 bg-white dark:bg-default-100/50 px-2 py-0.5 text-sm focus:outline-none focus:border-warning-500 text-default-700"
                          />
                          {lunesEntrega && domEntrega && (
                            <span className="text-xs text-default-500">
                              ({lunesEntrega} al {domEntrega})
                            </span>
                          )}
                          {!fechaEntrega && (
                            <span className="text-xs text-warning-600 italic">Seleccione una fecha de entrega</span>
                          )}
                        </span>
                      </div>
                    );
                  })()}

                  {errorCotizacion && (
                    <div className="flex items-start gap-3 bg-danger-50 dark:bg-danger-50/10 border border-danger/30 text-danger text-sm p-4 rounded-xl">
                      <Icon icon="lucide:alert-circle" width={18} className="mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">Error en la cotización</p>
                        <p className="text-xs text-danger/80 dark:text-danger/70 mt-0.5">{errorCotizacion}</p>
                      </div>
                    </div>
                  )}

                  {loadingCotizacion && (
                    <div className="flex justify-center items-center py-6 min-h-[220px]">
                      <BookPageLoader
                        message="Consolidando cotización"
                        subMessage="Calculando menor precio y distribución por día..."
                      />
                    </div>
                  )}

                  {!loadingCotizacion && cotizacion && cotizacion.cotizacion.length === 0 && (
                    <div className="text-center py-10 text-default-400">
                      <Icon icon="lucide:inbox" width={40} className="mx-auto mb-2" />
                      <p>No hay productos para los pedidos seleccionados.</p>
                    </div>
                  )}

                  {!loadingCotizacion && cotizacion && cotizacion.cotizacion.length > 0 && semana && (
                    <div className="space-y-6">
                      {/* Cubrir con disponible: reduce el pedido por el stock disponible (parcial o total) */}
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-default-200 dark:border-default-100 bg-default-50/60 dark:bg-default-100/5 px-4 py-2">
                        <Checkbox
                          size="sm"
                          isSelected={cubrirDisponible}
                          onValueChange={onToggleCubrirDisponible}
                        >
                          <span className="text-xs font-medium text-default-700 dark:text-default-300">
                            Cubrir con disponible
                          </span>
                        </Checkbox>
                        <span className="text-[11px] text-default-400">
                          Resta de cada producto lo que ya tienes disponible; deja por pedir solo el saldo faltante.
                        </span>
                      </div>
                      {cotizacion.cotizacion.map((prov, idx) => (
                        <ProveedorCotizacionTabla
                          key={prov.idProveedor ?? `sin-prov-${idx}`}
                          proveedor={prov}
                          cantidadesProv={prov.idProveedor != null ? (cantidades[prov.idProveedor] ?? {}) : {}}
                          cantidadesOriginalesProv={prov.idProveedor != null ? (cantidadesOriginales[prov.idProveedor] ?? {}) : {}}
                          solicitudDiaProv={prov.idProveedor != null ? (solicitudDias[prov.idProveedor] ?? {}) : {}}
                          disponible={disponible}
                          onCantidadChange={onCantidadChange}
                          onIncrement={(idProducto, entregaKey, delta, colSpecs) => {
                            if (prov.idProveedor != null) onIncrement(prov.idProveedor, idProducto, entregaKey, delta, colSpecs);
                          }}
                          onRestaurar={(idProducto) => {
                            if (prov.idProveedor != null) onRestaurar(prov.idProveedor, idProducto);
                          }}
                          onMoverSolicitud={(idSolicitud, nuevoKey) => {
                            if (prov.idProveedor != null) onMoverSolicitud(prov.idProveedor, idSolicitud, nuevoKey);
                          }}
                          onResetProveedor={() => {
                            if (prov.idProveedor != null) onResetProveedor(prov.idProveedor);
                          }}
                          fechaEntrega={fechaEntrega}
                          estadoProveedor={prov.idProveedor != null ? (proveedoresEstados?.[prov.idProveedor] ?? null) : null}
                          isToggling={togglingEstadoPaso2Id === prov.idProveedor}
                          onToggleEstado={
                            prov.idProveedor != null && onToggleEstadoProveedor && proveedoresEstados?.[prov.idProveedor] != null
                              ? () => onToggleEstadoProveedor(prov, proveedoresEstados![prov.idProveedor!])
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </ModalBody>

            <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
              {paso === 1 && (
                <>
                  <Button variant="ghost" onPress={onClose} className="font-medium">
                    Cerrar
                  </Button>
                  <Button
                    color="warning"
                    variant="solid"
                    className="font-bold shadow-md cursor-pointer"
                    startContent={<Icon icon="lucide:arrow-right" width={18} />}
                    isDisabled={seleccionados.size === 0 || !fechaEntrega}
                    onPress={onGenerar}
                    size="lg"
                  >
                    Generar ({seleccionados.size})
                  </Button>
                </>
              )}
              {paso === 2 && (
                <>
                  <Button
                    variant="ghost"
                    onPress={onVolver}
                    startContent={<Icon icon="lucide:arrow-left" width={16} />}
                    className="font-medium"
                  >
                    Volver
                  </Button>
                  <Button variant="ghost" onPress={onClose} className="font-medium">
                    Cerrar
                  </Button>
                  {todoCubierto ? (
                    <Button
                      color="primary"
                      variant="solid"
                      isLoading={isGenerandoOrdenes}
                      onPress={onReservarYSalir}
                      startContent={!isGenerandoOrdenes && <Icon icon="lucide:package-check" width={18} />}
                      className="font-medium"
                    >
                      Reservar productos y salir
                    </Button>
                  ) : (
                    <Button
                      color="success"
                      variant="solid"
                      isLoading={isGenerandoOrdenes}
                      onPress={onConfirmarOrden}
                      startContent={!isGenerandoOrdenes && <Icon icon="lucide:shopping-cart" width={18} />}
                      className="font-medium"
                    >
                      Generar Ordenes de Pedidos
                    </Button>
                  )}
                </>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default OrdenPedidoModal;
