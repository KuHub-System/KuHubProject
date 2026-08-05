import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea } from '@heroui/react';
import { Icon } from '@iconify/react';
import { ISolicitudGestion, fmtFecha } from './constants';

interface RechazarPedidoSolicitudModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selSol: ISolicitudGestion | null;
  motivoRechazoPedido: string;
  setMotivoRechazoPedido: (v: string) => void;
  isSaving: boolean;
  confirmarRechazoPedido: () => void;
}

const RechazarPedidoSolicitudModal: React.FC<RechazarPedidoSolicitudModalProps> = ({
  isOpen, onOpenChange, selSol, motivoRechazoPedido, setMotivoRechazoPedido, isSaving, confirmarRechazoPedido,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="sm"
      isDismissable={false}
      radius="lg"
      scrollBehavior="normal"
      classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]' }}
    >
      <ModalContent>
        {onClose => selSol && (
          <div className="max-h-[75vh] overflow-y-scroll custom-scrollbar">
            <ModalHeader className="flex items-center gap-2 text-danger">
              <Icon icon="lucide:x-circle" width={18} />
              Rechazar solicitud en pedido
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-default-600 mb-1">
                <span className="font-semibold">{selSol.nombreAsignatura} §{selSol.nombreSeccion}</span>
                {' — '}{fmtFecha(selSol.fechaClase)}
              </p>
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
                <Icon icon="lucide:alert-triangle" width={16} className="text-warning-500 shrink-0 mt-0.5" />
                <p className="text-xs text-warning-700 dark:text-warning-300">
                  Esta acción <strong>restará automáticamente las cantidades de esta solicitud del pedido</strong> asociado
                  y la desvinculará. Solo es posible mientras el pedido no tenga una Orden de Pedido vigente.
                </p>
              </div>
              <Textarea
                className="mt-3"
                label="Motivo del rechazo"
                placeholder="Indique el motivo para informar al docente..."
                value={motivoRechazoPedido}
                onValueChange={setMotivoRechazoPedido}
                minRows={3} maxRows={6} maxLength={500}
                isRequired variant="bordered"
                description={`${motivoRechazoPedido.length}/500 caracteres`}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>Cancelar</Button>
              <Button color="danger" isLoading={isSaving} isDisabled={!motivoRechazoPedido.trim()}
                onPress={confirmarRechazoPedido}
                startContent={!isSaving && <Icon icon="lucide:x-circle" width={14} />}
              >
                Confirmar y restar del pedido
              </Button>
            </ModalFooter>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
};

export default RechazarPedidoSolicitudModal;
