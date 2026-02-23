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
import {
    obtenerUnidadesService,
    crearUnidadService,
    cambiarEstadoUnidadService,
    actualizarUnidadService,
    eliminarUnidadService,
    transferirProductosUnidadService
} from '../../services/unidad-medida-service';
import { useToast } from '../../hooks/useToast';
import { Spinner, Select, SelectItem, Alert } from '@heroui/react';

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
    const [isLoading, setIsLoading] = React.useState(false);
    const [togglingIds, setTogglingIds] = React.useState<Set<string>>(new Set());
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editNombre, setEditNombre] = React.useState('');
    const [editAbreviatura, setEditAbreviatura] = React.useState('');

    // Estados para reasociación (eliminación con productos asociados)
    const [showReassociate, setShowReassociate] = React.useState(false);
    const [uniParaEliminar, setUniParaEliminar] = React.useState<IUnidadMedida | null>(null);
    const [uniDestinoId, setUniDestinoId] = React.useState<string>('');
    const [confirmText, setConfirmText] = React.useState('');
    const [isTransferring, setIsTransferring] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const cargarUnidades = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await obtenerUnidadesService();
            setUnidades(data);
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (isOpen) {
            cargarUnidades();
        }
    }, [isOpen, cargarUnidades]);

    const handleToggleActivo = async (id: string, activo: boolean) => {
        try {
            setTogglingIds(prev => {
                const next = new Set(prev);
                next.add(id);
                return next;
            });

            // Delay solicitado de 800ms
            await new Promise(resolve => setTimeout(resolve, 800));

            const exito = await cambiarEstadoUnidadService(id, !activo);

            if (exito) {
                cargarUnidades();
                if (onRefresh) onRefresh();
            } else {
                toast.error('No se pudo cambiar el estado');
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al cambiar el estado');
        } finally {
            setTogglingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleAgregar = async () => {
        if (!nombre.trim()) {
            toast.warning('El nombre es requerido');
            return;
        }
        if (!abreviatura.trim()) {
            toast.warning('La abreviatura es requerida');
            return;
        }

        setIsLoading(true);
        try {
            const exito = await crearUnidadService(nombre.trim(), abreviatura.trim());
            if (exito) {
                setNombre('');
                setAbreviatura('');
                setIsAdding(false);
                cargarUnidades();
                toast.success('Unidad agregada correctamente');
                if (onRefresh) onRefresh();
            } else {
                toast.error('No se pudo crear la unidad');
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al crear la unidad');
        } finally {
            setIsLoading(false);
        }
    };

    const handleActualizar = async () => {
        if (!editingId) return;
        if (!editNombre.trim() || !editAbreviatura.trim()) {
            toast.warning('El nombre y la abreviatura son requeridos');
            return;
        }

        // Protección extra: Evitar duplicados en el frontend
        const esDuplicado = unidades.some(u =>
            u.id !== editingId &&
            u.nombre.toLowerCase() === editNombre.trim().toLowerCase()
        );

        if (esDuplicado) {
            toast.error('Ya existe otra unidad con ese nombre');
            return;
        }

        setIsLoading(true);
        try {
            const exito = await actualizarUnidadService(editingId, editNombre.trim(), editAbreviatura.trim());
            if (exito) {
                setEditingId(null);
                cargarUnidades();
                toast.success('Unidad actualizada correctamente');
                if (onRefresh) onRefresh();
            } else {
                toast.error('No se pudo actualizar la unidad');
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al actualizar la unidad');
        } finally {
            setIsLoading(false);
        }
    };

    const iniciarEdicion = (uni: IUnidadMedida) => {
        setEditingId(uni.id);
        setEditNombre(uni.nombre);
        setEditAbreviatura(uni.abreviatura);
        setIsAdding(false);
    };

    const handleEliminar = (uni: IUnidadMedida) => {
        setUniParaEliminar(uni);
        setConfirmText('');

        if (uni.asociados && uni.asociados > 0) {
            setShowReassociate(true);
            setShowDeleteConfirm(false);
            setUniDestinoId('');
        } else {
            setShowDeleteConfirm(true);
            setShowReassociate(false);
        }
    };

    const handleConfirmarEliminacionSimple = async () => {
        if (!uniParaEliminar) return;

        if (confirmText !== 'ELIMINAR') {
            toast.warning('Escribe ELIMINAR para confirmar');
            return;
        }

        setIsDeleting(true);
        try {
            const exito = await eliminarUnidadService(uniParaEliminar.id);
            if (exito) {
                toast.success('Unidad eliminada');
                setShowDeleteConfirm(false);
                setUniParaEliminar(null);
                cargarUnidades();
                if (onRefresh) onRefresh();
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al eliminar');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleTransferirProductos = async () => {
        if (!uniParaEliminar || !uniDestinoId) {
            toast.warning('Selecciona una unidad de destino');
            return;
        }

        if (confirmText !== 'CONFIRMAR') {
            toast.warning('Escribe CONFIRMAR para continuar');
            return;
        }

        setIsTransferring(true);
        try {
            const mensaje = await transferirProductosUnidadService(uniParaEliminar.id, uniDestinoId);
            toast.success(mensaje || 'Productos transferidos correctamente');
            setShowReassociate(false);
            setUniParaEliminar(null);
            cargarUnidades();
            if (onRefresh) onRefresh();
        } catch (error: any) {
            toast.error(error.message || 'Error en el proceso de transferencia');
        } finally {
            setIsTransferring(false);
        }
    };

    return (
        <>
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

                                    {editingId ? (
                                        <div className="flex flex-col gap-2 p-3 bg-default-100 rounded-xl animate-in fade-in slide-in-from-top-1">
                                            <div className="flex gap-2 text-xs font-bold text-default-500 uppercase px-1">
                                                Editando Unidad
                                            </div>
                                            <div className="flex gap-2">
                                                <Input
                                                    size="sm"
                                                    label="Nombre"
                                                    value={editNombre}
                                                    onValueChange={setEditNombre}
                                                />
                                                <Input
                                                    size="sm"
                                                    label="Abrev."
                                                    value={editAbreviatura}
                                                    onValueChange={setEditAbreviatura}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" color="primary" onPress={handleActualizar} className="flex-1">
                                                    Guardar Cambios
                                                </Button>
                                                <Button size="sm" variant="flat" onPress={() => setEditingId(null)}>
                                                    Cancelar
                                                </Button>
                                            </div>
                                        </div>
                                    ) : isAdding && (
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
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] bg-default-200 px-1 rounded text-default-500 uppercase font-bold">{uni.abreviatura}</span>
                                                            <span className="text-xs text-default-400 italic">
                                                                {uni.asociados ?? 0} {uni.asociados === 1 ? 'producto' : 'productos'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="light"
                                                            className="text-default-400 hover:text-primary"
                                                            onPress={() => iniciarEdicion(uni)}
                                                        >
                                                            <Icon icon="lucide:edit-2" width={14} />
                                                        </Button>
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="light"
                                                            color="danger"
                                                            onPress={() => handleEliminar(uni)}
                                                        >
                                                            <Icon icon="lucide:trash-2" width={14} />
                                                        </Button>
                                                        {togglingIds.has(uni.id) && (
                                                            <Spinner size="sm" color="success" />
                                                        )}
                                                        <Switch
                                                            size="sm"
                                                            isSelected={uni.activo}
                                                            onValueChange={() => handleToggleActivo(uni.id, uni.activo)}
                                                            color="success"
                                                            isDisabled={togglingIds.has(uni.id)}
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

            {/* Modal de Reasociación de Unidades */}
            <Modal
                isOpen={showReassociate}
                onOpenChange={setShowReassociate}
                size="md"
                backdrop="blur"
                scrollBehavior="inside"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="bg-danger-50 border-b border-danger-100 py-4">
                                <div className="flex items-center gap-3 text-danger-600">
                                    <Icon icon="lucide:alert-triangle" width={28} />
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-lg">Unidad con productos asociados</h3>
                                        <p className="text-xs opacity-70">Acción requerida para eliminar</p>
                                    </div>
                                </div>
                            </ModalHeader>
                            <ModalBody className="py-6">
                                <div className="flex flex-col gap-6">
                                    <Alert
                                        color="danger"
                                        variant="flat"
                                        title="Productos detectados"
                                        description={`La unidad "${uniParaEliminar?.nombre}" está asociada a ${uniParaEliminar?.asociados} productos. Para poder eliminarla, primero debes mover sus productos a otra unidad de medida.`}
                                    />
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <p className="text-sm font-semibold text-default-700">
                                                Asocia todos los productos a otra unidad para ser posible eliminar:
                                            </p>
                                            <Select
                                                label="Nueva unidad de destino"
                                                placeholder="Selecciona una unidad diferente"
                                                selectedKeys={uniDestinoId ? [uniDestinoId] : []}
                                                onChange={(e) => setUniDestinoId(e.target.value)}
                                                variant="bordered"
                                            >
                                                {unidades
                                                    .filter(u => u.id !== uniParaEliminar?.id)
                                                    .map((u) => (
                                                        <SelectItem key={u.id} textValue={u.nombre}>
                                                            {u.nombre} ({u.abreviatura})
                                                        </SelectItem>
                                                    ))
                                                }
                                            </Select>
                                        </div>
                                        <div className="flex flex-col gap-2 pt-2 border-t border-default-100">
                                            <p className="text-sm text-default-600 italic">
                                                Escribe <strong>CONFIRMAR</strong> para proceder con la transferencia:
                                            </p>
                                            <Input
                                                placeholder="Escribe CONFIRMAR"
                                                value={confirmText}
                                                onValueChange={setConfirmText}
                                                variant="bordered"
                                                isInvalid={confirmText !== '' && confirmText !== 'CONFIRMAR'}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="border-t border-default-100">
                                <Button variant="light" onPress={onClose} isDisabled={isTransferring}>
                                    Cancelar
                                </Button>
                                <Button
                                    color="danger"
                                    onPress={handleTransferirProductos}
                                    isLoading={isTransferring}
                                    isDisabled={confirmText !== 'CONFIRMAR' || !uniDestinoId}
                                >
                                    Transferir
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Modal de Confirmación Simple de Eliminación */}
            <Modal
                isOpen={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                size="sm"
                backdrop="blur"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="bg-danger-50 border-b border-danger-100 py-4">
                                <div className="flex items-center gap-3 text-danger-600">
                                    <Icon icon="lucide:trash-2" width={24} />
                                    <h3 className="font-bold text-lg">Confirmar Eliminación</h3>
                                </div>
                            </ModalHeader>
                            <ModalBody className="py-6">
                                <div className="flex flex-col gap-4">
                                    <p className="text-sm text-default-600">
                                        ¿Estás seguro de eliminar la unidad <strong>{uniParaEliminar?.nombre}</strong>?
                                        Esta acción no se puede deshacer.
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <p className="text-xs text-danger-500 italic">
                                            Escribe <strong>ELIMINAR</strong> para confirmar:
                                        </p>
                                        <Input
                                            placeholder="ELIMINAR"
                                            value={confirmText}
                                            onValueChange={setConfirmText}
                                            variant="bordered"
                                            isInvalid={confirmText !== '' && confirmText !== 'ELIMINAR'}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="border-t border-default-100">
                                <Button variant="light" onPress={onClose} isDisabled={isDeleting}>
                                    Cancelar
                                </Button>
                                <Button
                                    color="danger"
                                    onPress={handleConfirmarEliminacionSimple}
                                    isLoading={isDeleting}
                                    isDisabled={confirmText !== 'ELIMINAR'}
                                >
                                    Eliminar Definitivamente
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
};

export default GestionUnidadesModal;
