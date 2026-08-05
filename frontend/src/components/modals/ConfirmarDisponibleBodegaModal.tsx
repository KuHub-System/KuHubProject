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
    /** 'bodega' (default, texto original) o 'inventario' — ajusta el copy del diálogo. */
    contexto?: 'inventario' | 'bodega';
    /** Aborta todo el proceso: no guarda nada, cierra el modal y vuelve al formulario/lista. */
    onCancelar: () => void;
    /** Procesa la entrada normalmente Y registra como stock disponible. */
    onConfirmar: () => void;
}

const fmtCantidad = (n: number): string =>
    Number(n).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

/**
 * Diálogo de confirmación reutilizable para bodega de tránsito e inventario.
 * Solo se abre cuando la config global "Registro de disponible obligatorio"
 * (Administración del Sistema › Gestión del Sistema) está activada — con la config apagada
 * (default), la entrada se guarda directo sin preguntar nada. Aparece cuando el usuario
 * realiza una ENTRADA (individual o masiva) que no proviene de una orden de Abastecimiento de
 * Proveedores, y pregunta si los productos ingresados deben registrarse también como stock
 * disponible (excedente no asociado a un pedido o solicitud). No puede cerrarse por ESC ni X.
 */
const ConfirmarDisponibleBodegaModal: React.FC<ConfirmarDisponibleBodegaModalProps> = ({
    isOpen,
    items,
    isLoading = false,
    contexto = 'bodega',
    onCancelar,
    onConfirmar,
}) => {
    const nombreDestino = contexto === 'inventario' ? 'inventario' : 'bodega de tránsito';
    return (
        <Modal
            isOpen={isOpen}
            isDismissable={false}
            isKeyboardDismissDisabled
            hideCloseButton
            size="lg"
            backdrop="blur"
            radius="lg"
            scrollBehavior="normal"
            classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]' }}
        >
            <ModalContent>
              <div className="max-h-[75vh] overflow-y-scroll custom-scrollbar">
                <ModalHeader>
                    <div className="flex items-center gap-2">
                        <Icon icon="lucide:alert-triangle" width={20} className="text-warning" />
                        <span className="text-base font-bold">¿Registrar como stock disponible?</span>
                    </div>
                </ModalHeader>
                <ModalBody className="space-y-4 pb-2">
                    <p className="text-sm text-default-600">
                        Estás registrando una entrada a <strong>{nombreDestino}</strong> que no proviene
                        de una orden de <strong>Abastecimiento de Proveedores</strong>. ¿Deseas
                        registrar también estos productos como <strong>stock disponible de {nombreDestino}</strong> (excedente
                        no asociado a ningún pedido o solicitud)?
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
                        El registro de stock disponible es obligatorio para este tipo de entrada.
                        "Cancelar" no guarda nada.
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
                        Sí, registrar disponibles
                    </Button>
                </ModalFooter>
              </div>
            </ModalContent>
        </Modal>
    );
};

export default ConfirmarDisponibleBodegaModal;
