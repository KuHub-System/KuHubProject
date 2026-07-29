import React from 'react';
import { Card, CardHeader, CardBody, Button, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { ISalaEntrega, ISolicitudEntrega } from '../../services/solicitud/solicitud-service';
import { fmtCantidadEntrega, ExpandChangeCallback } from './constants';

const EntregaSalaCard: React.FC<{
  sala: ISalaEntrega;
  onPreparar: (sol: ISolicitudEntrega) => void;
  canPreparar: boolean;
  onExpandChange: ExpandChangeCallback;
}> = ({ sala, onPreparar, canPreparar, onExpandChange }) => {
  const [expandidos, setExpandidos] = React.useState<Set<number>>(new Set());

  // Ref para poder acceder al estado actual en el cleanup de unmount
  const expandidosRef = React.useRef(expandidos);
  expandidosRef.current = expandidos;

  // Al desmontar, notifica al padre que todos los elementos se cerraron
  React.useEffect(() => {
    return () => {
      expandidosRef.current.forEach(id => onExpandChange(id, false, false));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: number, esProcesado: boolean) => {
    const nowOpen = !expandidos.has(id);
    setExpandidos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    onExpandChange(id, nowOpen, esProcesado);
  };

  return (
    <Card className="border border-default-200 shadow-sm bg-white dark:bg-content1">
      <CardHeader className="px-4 py-3 bg-default-50 dark:bg-default-100/30 border-b border-default-200">
        <div className="flex items-center gap-2 w-full">
          <Icon icon="lucide:door-open" className="text-secondary" width={16} />
          <span className="font-bold text-secondary dark:text-foreground">{sala.nombreSala}</span>
          {sala.codSala && (
            <Chip size="sm" variant="flat" color="default" className="text-[10px] h-5">{sala.codSala}</Chip>
          )}
          <span className="ml-auto text-xs text-default-400">
            {sala.solicitudes.length} entrega{sala.solicitudes.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardBody className="p-0 divide-y divide-default-100">
        {sala.solicitudes.map(sol => {
          const abierto = expandidos.has(sol.idSolicitud);
          const esProcesado = sol.estadoSolicitud === 'PROCESADO';
          return (
            <div key={sol.idSolicitud} className={esProcesado ? 'opacity-75' : ''}>
              <button
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-default-50/50 dark:hover:bg-default-100/20 transition-colors text-left ${esProcesado ? 'bg-success-50/30 dark:bg-success-50/10' : ''}`}
                onClick={() => toggle(sol.idSolicitud, esProcesado)}
              >
                {/* Badge de horario */}
                <div className={`shrink-0 flex flex-col items-center justify-center rounded-lg px-2.5 py-1.5 min-w-[72px] text-center ${esProcesado ? 'bg-success-50 border border-success-200' : 'bg-primary-50 border border-primary-100'}`}>
                  <span className={`text-[9px] font-bold uppercase leading-none ${esProcesado ? 'text-success-400' : 'text-primary-400'}`}>Horario</span>
                  <span className={`text-xs font-bold leading-tight mt-0.5 ${esProcesado ? 'text-success-600' : 'text-primary'}`}>{sol.rangoHoras}</span>
                </div>

                {/* Info sección */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-default-800 dark:text-foreground">§{sol.nombreSeccion}</span>
                    <span className="text-xs text-default-400">·</span>
                    <span className="text-sm text-default-600">{sol.nombreDocente}</span>
                    {esProcesado && (
                      <Chip
                        size="sm"
                        color="success"
                        variant="flat"
                        className="h-5 text-[10px]"
                        startContent={<Icon icon="lucide:clipboard-check" width={11} />}
                      >
                        Entregado
                      </Chip>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-default-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Icon icon="lucide:book-open" width={11} />{sol.nombrePedidoSemanaBodega}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon icon="lucide:users" width={11} />{sol.cantInscritos} alumnos
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon icon="lucide:package" width={11} />{sol.productos.length} producto{sol.productos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <Icon
                  icon={abierto ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                  width={16}
                  className="text-default-400 shrink-0"
                />
              </button>

              {/* Lista de productos */}
              {abierto && (
                <div className="px-4 pb-3 pt-1">
                  <div className="rounded-lg border border-default-100 overflow-hidden">
                    {esProcesado ? (
                      <>
                        <div className="grid grid-cols-[1fr_0.4fr_0.3fr] px-3 py-1.5 bg-success-50/50 dark:bg-success-50/10 text-[10px] font-bold text-default-500 uppercase tracking-wider">
                          <span>Producto</span>
                          <span className="text-center">Entregado</span>
                          <span className="text-center">Unidad</span>
                        </div>
                        {sol.productos.map((p, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-[1fr_0.4fr_0.3fr] px-3 py-2 text-sm border-t border-default-100 hover:bg-default-50/50 items-center"
                          >
                            <span className="text-default-700 dark:text-default-300">
                              {p.nombreProducto}
                              {p.observacion && (
                                <span className="text-xs text-default-400 italic ml-1.5">({p.observacion})</span>
                              )}
                            </span>
                            <span className="font-mono font-semibold text-center text-success-600">
                              {fmtCantidadEntrega(p.cantidad)}
                            </span>
                            <span className="text-default-500 text-center">{p.unidadAbreviada}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-[1fr_0.4fr_0.3fr_0.45fr_0.45fr] px-3 py-1.5 bg-default-50 dark:bg-default-100/30 text-[10px] font-bold text-default-500 uppercase tracking-wider">
                          <span>Producto</span>
                          <span className="text-center">Cantidad</span>
                          <span className="text-center">Unidad</span>
                          <span className="text-center">Stock Tránsito</span>
                          <span className="text-center">Diferencia</span>
                        </div>
                        {sol.productos.map((p, i) => {
                          const dif = p.diferencia ?? null;
                          const difColor = dif === null ? 'text-default-400' : dif >= 0 ? 'text-success-600' : 'text-danger-500';
                          return (
                            <div
                              key={i}
                              className="grid grid-cols-[1fr_0.4fr_0.3fr_0.45fr_0.45fr] px-3 py-2 text-sm border-t border-default-100 hover:bg-default-50/50 items-center"
                            >
                              <span className="text-default-700 dark:text-default-300">
                                {p.nombreProducto}
                                {p.observacion && (
                                  <span className="text-xs text-default-400 italic ml-1.5">({p.observacion})</span>
                                )}
                              </span>
                              <span className="font-mono font-semibold text-center text-default-700 dark:text-default-300">
                                {fmtCantidadEntrega(p.cantidad)}
                              </span>
                              <span className="text-default-500 text-center">{p.unidadAbreviada}</span>
                              <span className="font-mono text-center text-default-600">
                                {p.stockTransito != null ? fmtCantidadEntrega(p.stockTransito) : '—'} <span className="text-default-400">{p.unidadAbreviada}</span>
                              </span>
                              <span className={`font-mono font-semibold text-center ${difColor}`}>
                                {dif !== null ? (dif >= 0 ? '+' : '') + fmtCantidadEntrega(dif) : '—'} <span className="text-[10px]">{p.unidadAbreviada}</span>
                              </span>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                  {sol.observaciones && (
                    <div className="flex items-start gap-1.5 mt-2 text-xs text-default-500 italic px-1">
                      <Icon icon="lucide:message-circle" width={11} className="mt-px shrink-0" />
                      <span>{sol.observaciones}</span>
                    </div>
                  )}
                  {!esProcesado && canPreparar && (
                    <div className="flex justify-end mt-3">
                      <Button
                        size="sm"
                        color="secondary"
                        variant="flat"
                        startContent={<Icon icon="lucide:package-check" width={14} />}
                        onPress={() => onPreparar(sol)}
                      >
                        Preparar Entrega
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
};

export default React.memo(EntregaSalaCard);
