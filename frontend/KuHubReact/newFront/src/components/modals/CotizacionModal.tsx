import React from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';

// Definiciones de interfaces
interface Proveedor {
    nombre: string;
    precio: number;
}

interface CotizacionItem {
    producto: string;
    cantidadNecesaria: number;
    proveedores: Proveedor[];
    selectedProveedor?: string;
}

interface CotizacionModalProps {
    isOpen: boolean;
    onClose: () => void;
    cotizacionData: CotizacionItem[];
    setCotizacionData: React.Dispatch<React.SetStateAction<CotizacionItem[]>>;
    onAccept: (data: CotizacionItem[]) => void;
}

const CotizacionModal: React.FC<CotizacionModalProps> = ({ isOpen, onClose, cotizacionData, setCotizacionData, onAccept }) => {

    const handleProveedorChange = (index: number, value: string) => {
        const newData = [...cotizacionData];
        newData[index] = { ...newData[index], selectedProveedor: value };
        setCotizacionData(newData);
    };

    const getPriceForSelectedProveedor = (item: CotizacionItem) => {
        const selectedProv = item.proveedores.find(p => p.nombre === item.selectedProveedor);
        return selectedProv ? selectedProv.precio : 0;
    };

    const formatPrice = (price: number) => {
        return `$${price.toLocaleString('es-CL')}`;
    };

    const calculateTotal = (item: CotizacionItem) => {
        const precio = getPriceForSelectedProveedor(item);
        return precio * item.cantidadNecesaria;
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onClose} size="4xl">
            <ModalContent>
                {(modalOnClose) => (
                    <>
                        <ModalHeader>Paso 4: Cotización de Proveedores</ModalHeader>
                        <ModalBody>
                            <div className="mb-4">
                                <p className="text-sm text-default-500">
                                    Seleccione el proveedor más conveniente para cada producto. Los precios están en pesos chilenos.
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
                                    <thead className="bg-gray-50 dark:bg-zinc-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PRODUCTO</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CANTIDAD</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PROVEEDOR</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PRECIO UNITARIO</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-zinc-700">
                                        {cotizacionData.map((item, index) => (
                                            <tr key={item.producto}>
                                                <td className="px-6 py-4 whitespace-nowrap font-medium">{item.producto}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-lg font-semibold">{item.cantidadNecesaria}</span>
                                                    <span className="text-sm text-gray-500 ml-1">
                                                        {item.producto === 'Huevos' ? 'unid.' : 
                                                         item.producto === 'Leche' || item.producto === 'Aceite de Oliva' ? 'L' : 'kg'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <select
                                                        value={item.selectedProveedor || ''}
                                                        onChange={(e) => handleProveedorChange(index, e.target.value)}
                                                        className="w-48 px-3 py-2 rounded-md border border-gray-300 dark:bg-zinc-700 dark:border-zinc-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                    >
                                                        <option value="">Seleccionar proveedor</option>
                                                        {item.proveedores.map(prov => (
                                                            <option key={prov.nombre} value={prov.nombre}>
                                                                {prov.nombre} - {formatPrice(prov.precio)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                                                        {item.selectedProveedor ? formatPrice(getPriceForSelectedProveedor(item)) : 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                                                        {item.selectedProveedor ? formatPrice(calculateTotal(item)) : 'N/A'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Resumen total */}
                            <div className="mt-6 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-medium">Total Estimado:</span>
                                    <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                                        {formatPrice(
                                            cotizacionData.reduce((total, item) => {
                                                return total + (item.selectedProveedor ? calculateTotal(item) : 0);
                                            }, 0)
                                        )}
                                    </span>
                                </div>
                                <p className="text-sm text-default-500 mt-2">
                                    Los precios no incluyen IVA ni costos de transporte
                                </p>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="light" onPress={modalOnClose}>Rechazar Cotización</Button>
                            <Button 
                                color="primary" 
                                onPress={() => onAccept(cotizacionData)}
                                isDisabled={cotizacionData.some(item => !item.selectedProveedor)}
                            >
                                Confirmar Pedido
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default CotizacionModal;