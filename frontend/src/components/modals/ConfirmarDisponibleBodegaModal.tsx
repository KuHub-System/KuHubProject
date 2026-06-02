import React from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
} from '@heroui/react';
import { Icon } from '@iconify/react';

export interface ConfirmarDisponibleBodegaItem {
    idProducto: number;
    nombreProducto: string;
    unidad?: string;
    cantidad: number;
}

interface ConfirmarDisponibleBodegaModalProps {
    isOpen: boolean;
    items: ConfirmarDisponibleBodegaItem[];
    /** Muestra el spinner en "Confirmar" mientras se procesa la operación. */
    isLoading?: boolean;
    /** Procesa la entrada normalmente SIN registrar como stock disponible. */
    onCancelar: () => void;
    /** Procesa la entrada normalmente Y registra como stock disponible (BODEGA_TRANSITO). */
    onConfirmar: () => void;
}

const fmtCantidad = (n: number): string =>
    Number(n).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

/**
 * Diálogo de confirmación reutilizable para bodega de tránsito.
 * Aparece cuando el usuario realiza una ENTRADA (individual o masiva) y pregunta
 * si los productos ingresados deben registrarse también como stock disponible
 * (excedente no asociado a un pedido o solicitud). No puede cerrarse por ESC ni X.
 */
const ConfirmarDisponibleBodegaModal: React.FC<ConfirmarDisponibleBodegaModalProps> = ({
    isOpen,
    items,
    isLoading = false,
    onCancelar,
    onConfirmar,
}) => {
    return (
        <Modal
            isOpen={isOpen}
            isDismissable={false}
            isKeyboardDismissDisabled
            hideCloseButton
            size="lg"
            backdrop="blur"
            radius="lg"
            classNames={{ base: 'rounded-2xl' }}
        >
            <ModalContent>
                <ModalHeader>
                    <div className="flex items-center gap-2">
                        <Icon icon="lucide:alert-triangle" width={20} className="text-warning" />
                        <span className="text-base font-bold">¿Registrar como stock disponible?</span>
                    </div>
                </ModalHeader>
                <ModalBody className="space-y-4 pb-2">
                    <p className="text-sm text-default-600">
                        Estás registrando una entrada a <strong>bodega de tránsito</strong>. ¿Deseas
                        registrar también estos productos como <strong>stock disponible de bodega de
                        tránsito</strong> (excedente no asociado a ningún pedido o solicitud)?
                    </p>
                    <div className="rounded-lg border border-default-200 overflow-hidden">
                        <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
                            <thead className="bg-default-100 dark:bg-default-50">
                                <tr>
                                    <th className="py-2 px-3 font-medium text-left">Producto</th>
                                    <th className="py-2 px-3 font-medium text-center w-40">Cantidad disponible</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((it, idx) => (
                                    <tr key={idx} className="border-t border-default-100">
                                        <td className="py-2 px-3 text-default-700">{it.nombreProducto}</td>
                                        <td className="py-2 px-3 text-center font-semibold text-default-600 tabular-nums">
                                            {fmtCantidad(it.cantidad)} {it.unidad ?? ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-warning-600 dark:text-warning-400 italic">
                        Si cancelas, la entrada se realizará igualmente, pero el sistema no contará con
                        trazabilidad de estos productos como stock disponible.
                    </p>
                </ModalBody>
                <ModalFooter className="border-t border-default-100 gap-2">
                    <Button variant="ghost" onPress={onCancelar} className="font-medium" isDisabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button
                        color="success"
                        onPress={onConfirmar}
                        isLoading={isLoading}
                        startContent={!isLoading ? <Icon icon="lucide:check-circle-2" width={16} /> : undefined}
                    >
                        Confirmar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ConfirmarDisponibleBodegaModal;
