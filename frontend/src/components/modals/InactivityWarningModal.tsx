import React from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button
} from '@heroui/react';
import { Icon } from '@iconify/react';

interface InactivityWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStayLoggedIn: () => void;
}

const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
    isOpen,
    onClose,
    onStayLoggedIn
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onClose}
            backdrop="blur"
            hideCloseButton
            isDismissable={false}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1 items-center pt-8">
                    <div className="p-3 bg-warning-50 rounded-full text-warning-500 mb-2">
                        <Icon icon="lucide:alert-triangle" width={40} />
                    </div>
                    <h2 className="text-xl font-bold">¡Tu sesión va a expirar!</h2>
                </ModalHeader>
                <ModalBody className="text-center pb-6">
                    <p className="text-default-600">
                        Has estado inactivo por un tiempo. Por seguridad, tu sesión se cerrará en 5 minutos si no hay actividad.
                    </p>
                    <p className="text-sm text-default-400 mt-2 italic">
                        Cualquier acción reiniciará este contador.
                    </p>
                </ModalBody>
                <ModalFooter className="flex flex-col gap-2 pb-8">
                    <Button
                        color="primary"
                        onPress={onStayLoggedIn}
                        className="w-full font-bold"
                        size="lg"
                    >
                        Continuar Sesión
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default InactivityWarningModal;
