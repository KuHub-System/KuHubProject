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

export interface ConfirmarSalidaDisponibleItem {
    idProducto: number;
    nombreProducto: string;
    unidad?: string;
    /** Cantidad ingresada: sale completa del stock real de bodega de tránsito. */
    cantidadSalida: number;
    /** Stock disponible (sobrante) registrado actualmente para el producto. */
    disponible: number;
    /** Lo que se descuenta del disponible = min(cantidadSalida, disponible). */
    aDescontar: number;
}

interface ConfirmarSalidaDisponibleModalProps {
    isOpen: boolean;
    items: ConfirmarSalidaDisponibleItem[];
    /** Texto del tipo de movimiento (Salida, Merma, Devolución). */
    tipoMovimientoLabel?: string;
    /** Muestra el spinner en "Confirmar" mientras se procesa la operación. */
    isLoading?: boolean;
    /** Procesa la salida normalmente SIN descontar del stock disponible. */
    onCancelar: () => void;
    /** Procesa la salida normalmente Y descuenta del stock disponible (hasta su máximo). */
    onConfirmar: () => void;
}

const fmtCantidad = (n: number): string =>
    Number(n).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

/**
 * Diálogo de confirmación para salidas (salida / merma / devolución) en bodega de
 * tránsito cuando el producto tiene stock disponible (sobrante) registrado.
 * La cantidad ingresada sale completa del stock real de bodega (incluye el sobrante y el
 * stock destinado a pedidos); del disponible se descuenta hasta su máximo (puede quedar en 0).
 * No se cierra por ESC ni X.
 */
const ConfirmarSalidaDisponibleModal: React.FC<ConfirmarSalidaDisponibleModalProps> = ({
    isOpen,
    items,
    tipoMovimientoLabel = 'salida',
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
            size="2xl"
            backdrop="blur"
            radius="lg"
            classNames={{ base: 'rounded-2xl' }}
        >
            <ModalContent>
                <ModalHeader>
                    <div className="flex items-center gap-2">
                        <Icon icon="lucide:alert-triangle" width={20} className="text-warning" />
                        <span className="text-base font-bold">
                            {tipoMovimientoLabel} de productos con stock disponible
                        </span>
                    </div>
                </ModalHeader>
                <ModalBody className="space-y-4 pb-2">
                    <p className="text-sm text-default-600">
                        Estás registrando una <strong>{tipoMovimientoLabel.toLowerCase()}</strong> desde
                        bodega de tránsito. La cantidad ingresada sale <strong>completa</strong> del stock
                        real (incluye el sobrante y el stock destinado a pedidos). Si confirmas, además se
                        descuenta del <strong>stock disponible</strong> hasta su máximo (puede quedar en 0).
                    </p>
                    <div className="rounded-lg border border-default-200 overflow-hidden">
                        <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
                            <thead className="bg-default-100 dark:bg-default-50">
                                <tr>
                                    <th className="py-2 px-3 font-medium text-left">Producto</th>
                                    <th className="py-2 px-3 font-medium text-center w-28">Sale de bodega</th>
                                    <th className="py-2 px-3 font-medium text-center w-28">Disponible actual</th>
                                    <th className="py-2 px-3 font-medium text-center w-32">Disponible después</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((it, idx) => (
                                    <tr key={idx} className="border-t border-default-100">
                                        <td className="py-2 px-3 text-default-700 truncate">{it.nombreProducto}</td>
                                        <td className="py-2 px-3 text-center text-default-600 tabular-nums">
                                            {fmtCantidad(it.cantidadSalida)} {it.unidad ?? ''}
                                        </td>
                                        <td className="py-2 px-3 text-center text-default-600 tabular-nums">
                                            {fmtCantidad(it.disponible)} {it.unidad ?? ''}
                                        </td>
                                        <td className="py-2 px-3 text-center font-semibold text-warning-600 dark:text-warning-400 tabular-nums">
                                            {fmtCantidad(Math.max(0, it.disponible - it.aDescontar))} {it.unidad ?? ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-warning-600 dark:text-warning-400 italic">
                        El stock que sale por encima del disponible corresponde al destinado a pedidos y
                        deberá reponerse luego o generar nuevas órdenes de compra. Si un proceso en paralelo
                        dejó el disponible por debajo, no se descuenta y se te avisa el valor actual; la
                        salida se realiza igualmente.
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

export default ConfirmarSalidaDisponibleModal;
