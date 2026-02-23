import React from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Switch,
    Divider
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { IUnidadMedida } from '../../types/inventario.types';
import { obtenerUnidades, crearUnidad, actualizarUnidad } from '../../services/storage-service';
import { useToast } from '../../hooks/useToast';

interface GestionUnidadesModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onRefresh?: () => void;
}

const GestionUnidadesModal: React.FC<GestionUnidadesModalProps> = ({
    isOpen,
    onOpenChange,
    onRefresh
}) => {
    const toast = useToast();
    const [unidades, setUnidades] = React.useState<IUnidadMedida[]>([]);
    const [nombre, setNombre] = React.useState('');
    const [abreviatura, setAbreviatura] = React.useState('');
    const [isAdding, setIsAdding] = React.useState(false);

    const cargarUnidades = React.useCallback(() => {
        setUnidades(obtenerUnidades());
    }, []);

    React.useEffect(() => {
        if (isOpen) {
            cargarUnidades();
        }
    }, [isOpen, cargarUnidades]);

    const handleToggleActivo = async (id: string, activo: boolean) => {
        actualizarUnidad(id, { activo: !activo });
        cargarUnidades();
        if (onRefresh) onRefresh();
    };

    const handleAgregar = () => {
        if (!nombre.trim()) {
            toast.warning('El nombre es requerido');
            return;
        }
        if (!abreviatura.trim()) {
            toast.warning('La abreviatura es requerida');
            return;
        }
        crearUnidad(nombre.trim(), abreviatura.trim());
        setNombre('');
        setAbreviatura('');
        setIsAdding(false);
        cargarUnidades();
        toast.success('Unidad agregada correctamente');
        if (onRefresh) onRefresh();
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md" scrollBehavior="inside">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            Gestión de Unidades de Medida
                        </ModalHeader>
                        <ModalBody>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-default-500 uppercase">Lista de Unidades</h3>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        color="primary"
                                        variant="flat"
                                        onPress={() => setIsAdding(!isAdding)}
                                    >
                                        <Icon icon={isAdding ? "lucide:minus" : "lucide:plus"} />
                                    </Button>
                                </div>

                                {isAdding && (
                                    <div className="flex flex-col gap-2 p-3 bg-default-50 rounded-xl animate-in fade-in slide-in-from-top-1">
                                        <div className="flex gap-2">
                                            <Input
                                                size="sm"
                                                label="Nombre"
                                                placeholder="Ej: Kilogramo"
                                                value={nombre}
                                                onValueChange={setNombre}
                                            />
                                            <Input
                                                size="sm"
                                                label="Abrev."
                                                placeholder="Ej: kg"
                                                value={abreviatura}
                                                onValueChange={setAbreviatura}
                                            />
                                        </div>
                                        <Button size="sm" color="primary" onPress={handleAgregar} className="w-full">
                                            Añadir Unidad
                                        </Button>
                                    </div>
                                )}

                                <Divider />

                                <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-2">
                                    {unidades.length === 0 ? (
                                        <p className="text-center text-default-400 py-4 italic">No hay unidades registradas</p>
                                    ) : (
                                        unidades.map((uni) => (
                                            <div
                                                key={uni.id}
                                                className="flex items-center justify-between p-3 rounded-xl hover:bg-default-100 transition-colors"
                                            >
                                                <div className="flex flex-col">
                                                    <span className={`font-medium ${!uni.activo ? 'text-default-400 line-through' : ''}`}>
                                                        {uni.nombre}
                                                    </span>
                                                    <span className="text-xs text-default-400 uppercase font-bold">{uni.abreviatura}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        size="sm"
                                                        isSelected={uni.activo}
                                                        onValueChange={() => handleToggleActivo(uni.id, uni.activo)}
                                                        color="success"
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="light" onPress={onClose}>
                                Cerrar
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default GestionUnidadesModal;
