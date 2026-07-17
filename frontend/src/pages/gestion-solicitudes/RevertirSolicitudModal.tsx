import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea, Input } from '@heroui/react';
import { Icon } from '@iconify/react';
import { ISolicitudGestion, fmtFecha } from './constants';

interface RevertirSolicitudModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selSol: ISolicitudGestion | null;
  revertirAccion: 'pendiente' | 'rechazar' | 'aceptar';
  revertirDesde: 'Aceptada' | 'Rechazada';
  revertirMotivo: string;
  setRevertirMotivo: (v: string) => void;
  revertirConfirm: string;
  setRevertirConfirm: (v: string) => void;
  isSaving: boolean;
  confirmarRevertir: () => void;
}

const RevertirSolicitudModal: React.FC<RevertirSolicitudModalProps> = ({
  isOpen, onOpenChange, selSol,
  revertirAccion, revertirDesde, revertirMotivo, setRevertirMotivo,
  revertirConfirm, setRevertirConfirm, isSaving, confirmarRevertir,
}) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="sm">
      <ModalContent>
        {onClose => selSol && (
          <>
            <ModalHeader className="flex items-center gap-2 text-warning-700">
              <Icon icon="lucide:alert-triangle" width={18} />
              {revertirAccion === 'pendiente' ? 'Revertir a Pendiente' : revertirAccion === 'aceptar' ? 'Aceptar solicitud Rechazada' : 'Rechazar solicitud Aceptada'}
            </ModalHeader>
            <ModalBody className="space-y-3">
              <div className="bg-warning-50 border border-warning-200 rounded-lg px-3 py-2.5 text-sm text-warning-800 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Icon icon="lucide:triangle-alert" width={14} /> Advertencia
                </p>
                {revertirDesde === 'Aceptada' ? (
                  <p>
                    Esta solicitud está marcada como <strong>Aceptada</strong> y podría estar incluida en el pedido consolidado.
                    Al cambiar su estado, <strong>dejará de considerarse en el pedido</strong>.
                  </p>
                ) : revertirAccion === 'aceptar' ? (
                  <p>
                    Esta acción marcará la solicitud como <strong>Aceptada</strong> directamente desde Rechazada.
                    La solicitud <strong>volverá a considerarse en el pedido consolidado</strong>.
                  </p>
                ) : (
                  <p>
                    Esta acción revertirá la solicitud al estado <strong>Pendiente</strong>.
                    El docente podrá ver que su solicitud vuelve a estar en revisión.
                  </p>
                )}
              </div>
              <p className="text-sm text-default-600">
                <span className="font-semibold">{selSol.nombreAsignatura} §{selSol.nombreSeccion}</span>
                {' — '}{fmtFecha(selSol.fechaClase)}
              </p>
              {revertirAccion === 'rechazar' && (
                <Textarea
                  label="Motivo del rechazo"
                  placeholder="Indique el motivo para informar al docente..."
                  value={revertirMotivo}
                  onValueChange={setRevertirMotivo}
                  minRows={2} maxRows={4} maxLength={500}
                  isRequired variant="bordered"
                  description={`${revertirMotivo.length}/500 caracteres`}
                />
              )}
              <Input
                label='Escriba "CONFIRMAR" para continuar'
                placeholder="CONFIRMAR"
                value={revertirConfirm}
                onValueChange={setRevertirConfirm}
                variant="bordered"
                color={revertirConfirm.trim().toUpperCase() === 'CONFIRMAR' ? 'success' : 'default'}
                endContent={revertirConfirm.trim().toUpperCase() === 'CONFIRMAR'
                  ? <Icon icon="lucide:check-circle" width={16} className="text-success" />
                  : null}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>Cancelar</Button>
              <Button
                color={revertirAccion === 'pendiente' ? 'warning' : revertirAccion === 'aceptar' ? 'success' : 'danger'}
                isLoading={isSaving}
                isDisabled={
                  revertirConfirm.trim().toUpperCase() !== 'CONFIRMAR' ||
                  (revertirAccion === 'rechazar' && !revertirMotivo.trim())
                }
                onPress={confirmarRevertir}
                startContent={!isSaving && <Icon icon={revertirAccion === 'pendiente' ? 'lucide:undo-2' : revertirAccion === 'aceptar' ? 'lucide:check-circle' : 'lucide:x-circle'} width={14} />}
              >
                {revertirAccion === 'pendiente' ? 'Revertir a Pendiente' : revertirAccion === 'aceptar' ? 'Confirmar aceptación' : 'Confirmar rechazo'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default RevertirSolicitudModal;
