import React, { useState } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input } from '@heroui/react';

// Definiciones de interfaces
interface ComprobacionItem {
    id: string;
    nombre: string;
    cantidadTotal: number;
    unidad: string;
    cantidadInventario: number;
    totalEstimado: number;
    total: number;
}

interface ComprobacionModalProps {
    isOpen: boolean;
    onClose: () => void;
    comprobacionData: ComprobacionItem[];
    setComprobacionData: React.Dispatch<React.SetStateAction<ComprobacionItem[]>>;
    onAccept: (data: ComprobacionItem[]) => void;
}

const ComprobacionModal: React.FC<ComprobacionModalProps> = ({ isOpen, onClose, comprobacionData, setComprobacionData, onAccept }) => {

    const handleTotalChange = (index: number, value: string) => {
        const newTotal = parseFloat(value);
        if (!isNaN(newTotal) && newTotal >= 0) {
            const newData = [...comprobacionData];
            newData[index] = { ...newData[index], total: newTotal };
            setComprobacionData(newData);
        }
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onClose} size="3xl">
            <ModalContent>
                {(modalOnClose) => (
                    <>
                        <ModalHeader>Paso 3: Comprobación de Conglomerado por Administración</ModalHeader>
                        <ModalBody>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
                                    <thead className="bg-gray-50 dark:bg-zinc-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PRODUCTO</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CANTIDAD PEDIDA</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">INVENTARIO</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TOTAL ESTIMADO</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TOTAL A PEDIR</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-zinc-700">
                                        {comprobacionData.map((item, index) => (
                                            <tr key={item.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">{item.nombre}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{item.cantidadTotal} {item.unidad}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{item.cantidadInventario} {item.unidad}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{item.totalEstimado} {item.unidad}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Input
                                                        type="number"
                                                        value={item.total.toString()}
                                                        onValueChange={(value) => handleTotalChange(index, value)}
                                                        min={0}
                                                        className="w-24"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="light" onPress={modalOnClose}>Rechazar</Button>
                            <Button color="primary" onPress={() => onAccept(comprobacionData)}>Aceptar Pedido</Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default ComprobacionModal;