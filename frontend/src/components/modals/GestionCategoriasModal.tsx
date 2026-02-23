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
    Listbox,
    ListboxItem,
    Divider
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { ICategoria } from '../../types/inventario.types';
import { obtenerCategorias, crearCategoria, actualizarCategoria } from '../../services/storage-service';
import { useToast } from '../../hooks/useToast';

interface GestionCategoriasModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onRefresh?: () => void;
}

const GestionCategoriasModal: React.FC<GestionCategoriasModalProps> = ({
    isOpen,
    onOpenChange,
    onRefresh
}) => {
    const toast = useToast();
    const [categorias, setCategorias] = React.useState<ICategoria[]>([]);
    const [nuevaCategoria, setNuevaCategoria] = React.useState('');
    const [isAdding, setIsAdding] = React.useState(false);

    const cargarCategorias = React.useCallback(() => {
        setCategorias(obtenerCategorias());
    }, []);

    React.useEffect(() => {
        if (isOpen) {
            cargarCategorias();
        }
    }, [isOpen, cargarCategorias]);

    const handleToggleActivo = async (id: string, activo: boolean) => {
        actualizarCategoria(id, { activo: !activo });
        cargarCategorias();
        if (onRefresh) onRefresh();
    };

    const handleAgregar = () => {
        if (!nuevaCategoria.trim()) {
            toast.warning('El nombre de la categoría es requerido');
            return;
        }
        crearCategoria(nuevaCategoria.trim());
        setNuevaCategoria('');
        setIsAdding(false);
        cargarCategorias();
        toast.success('Categoría agregada correctamente');
        if (onRefresh) onRefresh();
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md" scrollBehavior="inside">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            Gestión de Categorías
                        </ModalHeader>
                        <ModalBody>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-default-500 uppercase">Lista de Categorías</h3>
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
                                    <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                                        <Input
                                            size="sm"
                                            placeholder="Nombre de la categoría"
                                            value={nuevaCategoria}
                                            onValueChange={setNuevaCategoria}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAgregar()}
                                        />
                                        <Button size="sm" color="primary" onPress={handleAgregar}>
                                            Añadir
                                        </Button>
                                    </div>
                                )}

                                <Divider />

                                <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-2">
                                    {categorias.length === 0 ? (
                                        <p className="text-center text-default-400 py-4 italic">No hay categorías registradas</p>
                                    ) : (
                                        categorias.map((cat) => (
                                            <div
                                                key={cat.id}
                                                className="flex items-center justify-between p-3 rounded-xl hover:bg-default-100 transition-colors"
                                            >
                                                <span className={`font-medium ${!cat.activo ? 'text-default-400 line-through' : ''}`}>
                                                    {cat.nombre}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        size="sm"
                                                        isSelected={cat.activo}
                                                        onValueChange={() => handleToggleActivo(cat.id, cat.activo)}
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

export default GestionCategoriasModal;
