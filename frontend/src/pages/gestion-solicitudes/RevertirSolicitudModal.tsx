import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from '@heroui/react';
import { Icon } from '@iconify/react';
import { ISolicitudGestion, fmtFecha } from './constants';

interface RevertirSolicitudModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selSol: ISolicitudGestion | null;
  revertirConfirm: string;
  setRevertirConfirm: (v: string) => void;
  isSaving: boolean;
  confirmarRevertir: () => void;
}

const RevertirSolicitudModal: React.FC<RevertirSolicitudModalProps> = ({
  isOpen, onOpenChange, selSol,
  revertirConfirm, setRevertirConfirm, isSaving, confirmarRevertir,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="sm"
      radius="lg"
      scrollBehavior="normal"
      classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]' }}
    >
      <ModalContent>
        {onClose => selSol && (
          <div className="max-h-[75vh] overflow-y-scroll custom-scrollbar">
            <ModalHeader className="flex items-center gap-2 text-warning-700">
              <Icon icon="lucide:alert-triangle" width={18} />
              Aceptar solicitud Rechazada
            </ModalHeader>
            <ModalBody className="space-y-3">
              <div className="bg-warning-50 border border-warning-200 rounded-lg px-3 py-2.5 text-sm text-warning-800 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Icon icon="lucide:triangle-alert" width={14} /> Advertencia
                </p>
                <p>
                  Esta acción marcará la solicitud como <strong>Aceptada</strong> directamente desde Rechazada.
                  La solicitud <strong>volverá a considerarse en el pedido consolidado</strong>.
                </p>
              </div>
              <p className="text-sm text-default-600">
                <span className="font-semibold">{selSol.nombreAsignatura} §{selSol.nombreSeccion}</span>
                {' — '}{fmtFecha(selSol.fechaClase)}
              </p>
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
                color="success"
                isLoading={isSaving}
                isDisabled={revertirConfirm.trim().toUpperCase() !== 'CONFIRMAR'}
                onPress={confirmarRevertir}
                startContent={!isSaving && <Icon icon="lucide:check-circle" width={14} />}
              >
                Confirmar aceptación
              </Button>
            </ModalFooter>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
};

export default RevertirSolicitudModal;
