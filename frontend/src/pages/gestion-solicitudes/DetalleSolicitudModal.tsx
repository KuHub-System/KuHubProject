import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { fmtCL } from '../../utils/format-numbers';
import { ISolicitudGestion, ESTADO_CFG, fmtFecha } from './constants';

interface DetalleSolicitudModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selSol: ISolicitudGestion | null;
  sol_Rechazar: boolean;
  sol_Gestionar: boolean;
  aceptar: (sol: ISolicitudGestion) => Promise<void>;
  abrirRechazar: (sol: ISolicitudGestion) => void;
  abrirRechazarPedido: (sol: ISolicitudGestion) => void;
  abrirRevertir: (sol: ISolicitudGestion) => void;
  revertirAPendiente: (sol: ISolicitudGestion) => void;
  rechazarAceptada: (sol: ISolicitudGestion) => void;
  handleImprimir: (sol: ISolicitudGestion) => void;
}

const DetalleSolicitudModal: React.FC<DetalleSolicitudModalProps> = ({
  isOpen, onOpenChange, selSol,
  sol_Rechazar, sol_Gestionar,
  aceptar, abrirRechazar, abrirRechazarPedido, abrirRevertir, revertirAPendiente, rechazarAceptada, handleImprimir,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="3xl"
      scrollBehavior="inside"
      isDismissable={false}
      classNames={{
        base: "max-h-[75vh]"
      }}
    >
      <ModalContent>
        {onClose => selSol && (
          <>
            <ModalHeader className="flex flex-col gap-0 pb-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary">
                  <Icon icon="lucide:file-text" width={18} />
                </div>
                <span className="font-bold text-secondary dark:text-foreground text-base">Detalle de Solicitud</span>
                <Chip
                  size="sm"
                  color={ESTADO_CFG[selSol.estado].color}
                  variant="flat"
                  className="ml-auto mr-6 font-semibold"
                >
                  {ESTADO_CFG[selSol.estado].label}
                </Chip>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3 px-4 py-2 bg-default-50 dark:bg-default-100/10 rounded-xl mx-1">
                <Icon icon="lucide:graduation-cap" width={13} className="text-default-400 shrink-0" />
                <p className="text-xs text-default-500 font-medium truncate">
                  {selSol.nombreAsignatura}
                </p>
                <span className="text-default-300">·</span>
                <span className="text-xs font-mono text-default-500">§{selSol.nombreSeccion}</span>
                <span className="text-default-300">·</span>
                <span className="text-xs text-default-400">{fmtFecha(selSol.fechaClase)}</span>
              </div>
            </ModalHeader>

            <ModalBody className="pt-4 space-y-4 overflow-y-scroll custom-scrollbar">
              {/* Grid de info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { icon: 'lucide:book-open', label: 'PedidoSemanaBodega',    val: selSol.nombrePedidoSemanaBodega,  color: 'text-warning-500',  bg: 'bg-warning-50 dark:bg-warning-900/20'  },
                  { icon: 'lucide:user',       label: 'Docente',   val: selSol.nombreDocente, color: 'text-primary-500',  bg: 'bg-primary-50 dark:bg-primary-900/20'  },
                  { icon: 'lucide:clock',      label: 'Horario',   val: `${selSol.horaInicio} – ${selSol.horaFin}`, color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-900/20' },
                  { icon: 'lucide:door-open',  label: 'Sala',      val: selSol.nombreSala,    color: 'text-success-600',  bg: 'bg-success-50 dark:bg-success-900/20'  },
                  { icon: 'lucide:users',      label: 'Alumnos',   val: `${selSol.cantInscritos} estudiantes`, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
                  { icon: 'lucide:package',    label: 'Productos', val: `${selSol.detalles.length} ítem${selSol.detalles.length !== 1 ? 's' : ''}`, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
                ].map(r => (
                  <div
                    key={r.label}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-default-100 dark:border-default-50/20 bg-white dark:bg-content1"
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${r.bg}`}>
                      <Icon icon={r.icon} width={14} className={r.color} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-default-400 font-semibold leading-none mb-0.5">{r.label}</p>
                      <p className="text-sm font-semibold text-default-700 dark:text-default-200 truncate">{r.val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Observación general */}
              {selSol.observacion && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-default-50 dark:bg-default-100/10 border border-default-200 dark:border-default-100/20">
                  <Icon icon="lucide:message-square" width={15} className="text-default-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-default-400 font-semibold mb-0.5">Observación</p>
                    <p className="text-sm italic text-default-600 dark:text-default-300">{selSol.observacion}</p>
                  </div>
                </div>
              )}

              {/* Motivo de rechazo */}
              {selSol.motivoRechazo && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
                  <Icon icon="lucide:alert-circle" width={15} className="text-danger-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-danger-500 font-semibold mb-0.5">Motivo de rechazo</p>
                    <p className="text-sm italic text-danger-700 dark:text-danger-300">{selSol.motivoRechazo}</p>
                  </div>
                </div>
              )}

              {/* Tabla productos */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 rounded-md bg-default-100 dark:bg-default-50/10">
                    <Icon icon="lucide:shopping-basket" width={13} className="text-default-500" />
                  </div>
                  <p className="text-xs font-bold text-default-600 dark:text-default-400 uppercase tracking-wider">
                    Productos solicitados
                  </p>
                  <Chip size="sm" variant="flat" color="default" className="text-xs ml-auto">
                    {selSol.detalles.length} ítem{selSol.detalles.length !== 1 ? 's' : ''}
                  </Chip>
                </div>
                <div className="rounded-xl border border-default-200 dark:border-default-100/20 overflow-hidden">
                  <Table
                    removeWrapper
                    aria-label="Productos"
                    classNames={{
                      th: 'bg-default-50 dark:bg-default-100/10 text-[10px] uppercase tracking-wide text-default-500 font-bold h-9 first:rounded-tl-xl last:rounded-tr-xl',
                      td: 'py-2.5 border-b border-default-100 dark:border-default-50/10 group-data-[last=true]:border-none',
                    }}
                  >
                    <TableHeader>
                      <TableColumn>PRODUCTO</TableColumn>
                      <TableColumn>OBSERVACIÓN</TableColumn>
                      <TableColumn className="text-center">CANTIDAD</TableColumn>
                      <TableColumn className="text-center">UNIDAD</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {selSol.detalles.map((d, idx) => (
                        <TableRow key={d.idProducto} className={idx % 2 === 0 ? '' : 'bg-default-50/50 dark:bg-default-50/5'}>
                          <TableCell>
                            <Tooltip content={d.nombreProducto} delay={500} placement="top-start">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-warning-400 shrink-0" />
                                <span className="max-w-[160px] truncate text-sm font-medium text-default-700 dark:text-default-200 cursor-default">
                                  {d.nombreProducto}
                                </span>
                              </div>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip content={d.observacion || 'Sin observación'} placement="top" delay={500} isDisabled={!d.observacion}>
                              <span className="max-w-[180px] truncate text-xs text-default-400 italic cursor-default block">
                                {d.observacion ?? '—'}
                              </span>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono font-bold text-sm text-default-700 dark:text-default-200">
                              {fmtCL(d.cantidad)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Chip size="sm" variant="flat" color="default" className="text-xs font-medium">
                              {d.unidad}
                            </Chip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </ModalBody>
            <ModalFooter className="gap-2">
              {selSol.estado === 'Pendiente' && (
                <>
                  {sol_Rechazar && (
                    <Button color="danger" variant="flat"
                      onPress={() => { onClose(); abrirRechazar(selSol); }}
                      startContent={<Icon icon="lucide:x" width={14} />}>
                      Rechazar
                    </Button>
                  )}
                  {sol_Gestionar && (
                    <Button color="success"
                      onPress={async () => { await aceptar(selSol); onClose(); }}
                      startContent={<Icon icon="lucide:check" width={14} />}>
                      Aceptar
                    </Button>
                  )}
                </>
              )}
              {selSol.estado === 'Aceptada' && (
                <>
                  {sol_Gestionar && (
                    <Button color="warning" variant="flat"
                      onPress={() => { onClose(); revertirAPendiente(selSol); }}
                      startContent={<Icon icon="lucide:undo-2" width={14} />}>
                      Revertir a Pendiente
                    </Button>
                  )}
                  {sol_Rechazar && (
                    <Button color="danger" variant="flat"
                      onPress={() => { onClose(); rechazarAceptada(selSol); }}
                      startContent={<Icon icon="lucide:x" width={14} />}>
                      Rechazar
                    </Button>
                  )}
                </>
              )}
              {selSol.estado === 'Rechazada' && !selSol.motivoRechazo?.includes('automáticamente') && sol_Gestionar && (
                <>
                <Button color="success" variant="flat"
                  onPress={() => { onClose(); abrirRevertir(selSol); }}
                  startContent={<Icon icon="lucide:check-circle" width={14} />}>
                  Aceptar
                </Button>
                <Button color="warning" variant="flat"
                  onPress={() => { onClose(); revertirAPendiente(selSol); }}
                  startContent={<Icon icon="lucide:undo-2" width={14} />}>
                  Revertir a Pendiente
                </Button>
                </>
              )}
              {selSol.estado === 'En Pedido' && !selSol.tieneOrdenPedidoActiva && sol_Rechazar && (
                <Button color="danger" variant="flat"
                  onPress={() => { onClose(); abrirRechazarPedido(selSol); }}
                  startContent={<Icon icon="lucide:x" width={14} />}>
                  Rechazar
                </Button>
              )}
              <Button variant="flat" onPress={() => handleImprimir(selSol)}
                startContent={<Icon icon="lucide:printer" width={14} />}>
                Imprimir
              </Button>
              <Button variant="light" onPress={onClose}>Cerrar</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default DetalleSolicitudModal;
