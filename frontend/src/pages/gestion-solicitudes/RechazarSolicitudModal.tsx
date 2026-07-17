import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea } from '@heroui/react';
import { Icon } from '@iconify/react';
import { ISolicitudGestion, fmtFecha } from './constants';

interface RechazarSolicitudModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selSol: ISolicitudGestion | null;
  motivoRechazo: string;
  setMotivoRechazo: (v: string) => void;
  isSaving: boolean;
  confirmarRechazo: () => void;
}

const RechazarSolicitudModal: React.FC<RechazarSolicitudModalProps> = ({
  isOpen, onOpenChange, selSol, motivoRechazo, setMotivoRechazo, isSaving, confirmarRechazo,
}) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="sm">
      <ModalContent>
        {onClose => selSol && (
          <>
            <ModalHeader className="flex items-center gap-2 text-danger">
              <Icon icon="lucide:x-circle" width={18} />
              Rechazar solicitud
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-default-600 mb-2">
                <span className="font-semibold">{selSol.nombreAsignatura} §{selSol.nombreSeccion}</span>
                {' — '}{fmtFecha(selSol.fechaClase)}
              </p>
              <Textarea
                label="Motivo del rechazo"
                placeholder="Indique el motivo para informar al docente..."
                value={motivoRechazo}
                onValueChange={setMotivoRechazo}
                minRows={3} maxRows={6} maxLength={500}
                isRequired variant="bordered"
                description={`${motivoRechazo.length}/500 caracteres`}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>Cancelar</Button>
              <Button color="danger" isLoading={isSaving} isDisabled={!motivoRechazo.trim()}
                onPress={confirmarRechazo}
                startContent={!isSaving && <Icon icon="lucide:x-circle" width={14} />}
              >
                Confirmar rechazo
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default RechazarSolicitudModal;
