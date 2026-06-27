import React from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Spinner,
    Checkbox,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { ICategoriaAbastecimientoView } from '../../types/inventario.types';
import {
    obtenerConfigAbastecimientoService,
    actualizarConfigAbastecimientoService,
} from '../../services/inventario-service';
import { useToast } from '../../hooks/useToast';

interface GestionAbastecimientoModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

const GestionAbastecimientoModal: React.FC<GestionAbastecimientoModalProps> = ({
    isOpen,
    onOpenChange,
}) => {
    const toast = useToast();
    const [categorias, setCategorias] = React.useState<ICategoriaAbastecimientoView[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);

    const cargarConfig = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await obtenerConfigAbastecimientoService();
            setCategorias(data);
        } catch {
            toast.error('No se pudo cargar la configuración de abastecimiento');
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (isOpen) cargarConfig();
    }, [isOpen, cargarConfig]);

    const toggleFlag = (idCategoria: number, flag: 'inventario' | 'bodegaTransito') => {
        setCategorias(prev =>
            prev.map(c =>
                c.idCategoria === idCategoria ? { ...c, [flag]: !c[flag] } : c
            )
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await actualizarConfigAbastecimientoService(
                categorias.map(c => ({
                    idCategoria: c.idCategoria,
                    inventario: c.inventario,
                    bodegaTransito: c.bodegaTransito,
                }))
            );
            toast.success('Configuración de abastecimiento guardada');
            onOpenChange(false);
        } catch {
            toast.error('Error al guardar la configuración');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="2xl"
            isDismissable={false}
            scrollBehavior="inside"
            backdrop="blur"
            radius="lg"
            classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]', closeButton: 'hover:bg-default-100 cursor-pointer' }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex items-center gap-2">
                            <Icon icon="lucide:warehouse" width={20} className="text-primary" />
                            <span>Gestión de Abastecimiento</span>
                        </ModalHeader>

                        <ModalBody className="overflow-y-scroll custom-scrollbar">
                            <p className="text-sm text-default-500 mb-3">
                                Configura qué categorías participan en cada tipo de abastecimiento.
                                Las categorías sin ningún tipo activo quedarán excluidas.
                            </p>

                            {isLoading ? (
                                <div className="flex justify-center py-10">
                                    <Spinner size="md" />
                                </div>
                            ) : (
                                <div className="flex flex-col gap-0">
                                    {/* Encabezado tabla */}
                                    <div className="grid grid-cols-[1fr_130px_130px] gap-2 px-3 py-2 rounded-lg bg-default-100 dark:bg-default-50/10 mb-1">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-default-500">Categoría</span>
                                        <span className="text-xs font-semibold uppercase tracking-wide text-default-500 text-center">Inventario</span>
                                        <span className="text-xs font-semibold uppercase tracking-wide text-default-500 text-center">Bodega Tránsito</span>
                                    </div>

                                    {categorias.length === 0 ? (
                                        <p className="text-sm text-default-400 text-center py-8">
                                            No hay categorías activas
                                        </p>
                                    ) : (
                                        categorias.map((cat, idx) => (
                                            <div
                                                key={cat.idCategoria}
                                                className={`grid grid-cols-[1fr_130px_130px] gap-2 px-3 py-2.5 rounded-lg items-center ${idx % 2 === 0 ? 'bg-default-50/50 dark:bg-default-100/5' : ''}`}
                                            >
                                                <span className="text-sm text-default-700 dark:text-default-300 font-medium">
                                                    {cat.nombreCategoria}
                                                </span>
                                                <div className="flex justify-center">
                                                    <Checkbox
                                                        isSelected={cat.inventario}
                                                        onValueChange={() => toggleFlag(cat.idCategoria, 'inventario')}
                                                        color="primary"
                                                        size="sm"
                                                    />
                                                </div>
                                                <div className="flex justify-center">
                                                    <Checkbox
                                                        isSelected={cat.bodegaTransito}
                                                        onValueChange={() => toggleFlag(cat.idCategoria, 'bodegaTransito')}
                                                        color="secondary"
                                                        size="sm"
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </ModalBody>

                        <ModalFooter>
                            <Button variant="flat" onPress={onClose} isDisabled={isSaving}>
                                Cancelar
                            </Button>
                            <Button
                                color="primary"
                                onPress={handleSave}
                                isLoading={isSaving}
                                isDisabled={isLoading || categorias.length === 0}
                                startContent={!isSaving && <Icon icon="lucide:save" width={16} />}
                            >
                                Guardar
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default GestionAbastecimientoModal;
