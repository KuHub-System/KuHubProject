import React from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';

// Definiciones de interfaces
interface FinalOrder {
    producto: string;
    cantidad: number;
    proveedor: string;
    precioTotal: number;
}

interface FinProcesoModalProps {
    isOpen: boolean;
    onClose: () => void;
    finalOrderData: FinalOrder[];
}

const FinProcesoModal: React.FC<FinProcesoModalProps> = ({ isOpen, onClose, finalOrderData }: FinProcesoModalProps) => {

    const handleDescargarPDF = () => {
        window.print();
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onClose} size="xl">
            <ModalContent id="final-order-modal">
                {(modalOnClose) => (
                    <>
                        <ModalHeader>Paso 5: Fin del Proceso</ModalHeader>
                        <ModalBody>
                            {finalOrderData && finalOrderData.length > 0 ? (
                                <div className="space-y-4">
                                    <p className="font-semibold text-lg">Pedido Realizado con Éxito</p>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
                                            <thead className="bg-gray-50 dark:bg-zinc-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PRODUCTO</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CANTIDAD</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PROVEEDOR</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PRECIO TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-zinc-700">
                                                {finalOrderData.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className="px-6 py-4 whitespace-nowrap">{item.producto}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">{item.cantidad}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">{item.proveedor}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">${item.precioTotal.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <p>No se ha realizado un pedido final.</p>
                            )}
                        </ModalBody>
                        <ModalFooter className="no-print">
                            <Button color="primary" onPress={handleDescargarPDF}>
                                Descargar PDF
                            </Button>
                            <Button color="success" onPress={modalOnClose}>
                                Cerrar
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default FinProcesoModal;