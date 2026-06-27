import React from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Listbox,
    ListboxItem,
    Divider,
    Select,
    SelectItem,
    Alert
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { ICategoria } from '../../types/inventario.types';
import { obtenerCategorias, crearCategoria, actualizarCategoria } from '../../services/storage-service';
import {
    crearCategoriaService,
    obtenerCategoriasService,
    actualizarCategoriaService,
    eliminarCategoriaService,
    transferirProductosService,
    cambiarEstadoCategoriaService
} from '../../services/categoria-service';
import { useToast } from '../../hooks/useToast';
import { useModulePermission } from '../../contexts/permission-context';

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
    const { canCreate: puedeCrear, canUpdate: puedeActualizar, canDelete: puedeEliminar } = useModulePermission('GESTION_CATEGORIAS');
    const [categorias, setCategorias] = React.useState<ICategoria[]>([]);
    const [nuevaCategoria, setNuevaCategoria] = React.useState('');
    const [isAdding, setIsAdding] = React.useState(false);
    const [isLoadingBackend, setIsLoadingBackend] = React.useState(false);
    const [isFetchingCategorias, setIsFetchingCategorias] = React.useState(false);

    // Estados para edición
    const [editId, setEditId] = React.useState<string | null>(null);
    const [editNombre, setEditNombre] = React.useState('');
    const [isUpdating, setIsUpdating] = React.useState(false);

    // Estados para reasociación (eliminación con productos asociados)
    const [showReassociate, setShowReassociate] = React.useState(false);
    const [catParaEliminar, setCatParaEliminar] = React.useState<ICategoria | null>(null);
    const [catDestinoId, setCatDestinoId] = React.useState<string>('');
    const [confirmText, setConfirmText] = React.useState('');
    const [isTransferring, setIsTransferring] = React.useState(false);

    // Estado para confirmación simple de eliminación
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    // Estado para tracking de carga individual en los toggles (Switches)
    const [togglingIds, setTogglingIds] = React.useState<Set<string>>(new Set());

    const cargarCategorias = React.useCallback(async () => {
        setIsFetchingCategorias(true);
        try {
            const data = await obtenerCategoriasService();
            setCategorias(data);

            // Opcional: Sincronizar localmente si la app lo requiere en otros sitios
            // localStorage.setItem('kuhub-categorias', JSON.stringify(data));
        } catch (error: any) {
            toast.error(error.message || 'Error al cargar las categorías');
            // Fallback al storage local si falla el backend
            setCategorias(obtenerCategorias());
        } finally {
            setIsFetchingCategorias(false);
        }
    }, [toast]);

    React.useEffect(() => {
        if (isOpen) {
            cargarCategorias();
            // Resetear estados al abrir
            setShowReassociate(false);
            setCatParaEliminar(null);
        }
    }, [isOpen, cargarCategorias]);

    const handleToggleActivo = async (id: string, activo: boolean) => {
        try {
            // 0. Delay / Efecto de carga
            setTogglingIds(prev => {
                const next = new Set(prev);
                next.add(id);
                return next;
            });

            // Simular un retraso para "derlay" (aprox 800ms)
            await new Promise(resolve => setTimeout(resolve, 800));

            // 1. Actualizar en Backend (usando el nuevo PATCH solicitado)
            const exito = await cambiarEstadoCategoriaService(id, !activo);

            if (exito) {
                // 2. Sincronizar localmente si el backend aceptó
                actualizarCategoria(id, { activo: !activo });
                cargarCategorias();
                if (onRefresh) onRefresh();
            } else {

            }
        } catch (error: any) {
            toast.error(error.message || 'Error al cambiar el estado de la categoría');
        } finally {
            setTogglingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleAgregar = async () => {
        const nombreTramado = nuevaCategoria.trim();
        if (!nombreTramado) {
            toast.warning('El nombre de la categoría es requerido');
            return;
        }

        // 0. Validar si ya existe en la lista local
        const existe = categorias.some(
            cat => cat.nombre.toLowerCase() === nombreTramado.toLowerCase()
        );

        if (existe) {
            return;
        }

        setIsLoadingBackend(true);
        try {
            // 1. Llamar al backend
            const exitoBackend = await crearCategoriaService(nombreTramado);

            if (exitoBackend) {
                // 2. Si el backend retorna true (éxito), persistir localmente (opcional si el backend es el origen ahora)
                // Por ahora mantenemos sincronizado con el storage local que usa la app
                crearCategoria(nombreTramado);

                setNuevaCategoria('');
                setIsAdding(false);
                cargarCategorias();
                toast.success('Categoría agregada correctamente');
                if (onRefresh) onRefresh();
            } else {
                toast.error('No se pudo crear la categoría');
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al crear la categoría');
        } finally {
            setIsLoadingBackend(false);
        }
    };

    const handleEditar = async (id: string) => {
        if (editId === id) {
            const nombreTrim = editNombre.trim();
            if (!nombreTrim) {
                toast.warning('El nombre no puede estar vacío');
                return;
            }

            const catActual = categorias.find(c => c.id === id);
            if (!catActual) return;

            setIsUpdating(true);
            try {
                // Ahora enviamos id, nombre y el estado activo actual
                const exito = await actualizarCategoriaService(id, nombreTrim, catActual.activo);
                if (exito) {
                    toast.success('Categoría actualizada');
                    setEditId(null);
                    cargarCategorias();
                    if (onRefresh) onRefresh();
                } else {
                    toast.error('No se pudo actualizar la categoría');
                }
            } catch (error: any) {
                toast.error(error.message || 'Error al actualizar');
            } finally {
                setIsUpdating(false);
            }
        } else {
            const cat = categorias.find(c => c.id === id);
            if (cat) {
                setEditId(id);
                setEditNombre(cat.nombre);
            }
        }
    };

    const handleEliminar = (id: string, nombre: string) => {
        const cat = categorias.find(c => c.id === id);
        if (cat) {
            setCatParaEliminar(cat);
            setConfirmText('');

            // Lógica de ramificación basada en cantidad de productos
            if (cat.asociados && cat.asociados > 0) {
                // Si tiene productos, abrimos directamente el modal de transferencia
                setShowReassociate(true);
                setShowDeleteConfirm(false);
                setCatDestinoId('');
            } else {
                // Si NO tiene productos, abrimos la confirmación simple de eliminación
                setShowDeleteConfirm(true);
                setShowReassociate(false);
            }
        }
    };

    const handleConfirmarEliminacionSimple = async () => {
        if (!catParaEliminar) return;

        // VERIFICACIÓN REDUNDANTE: Si por algún error llegamos aquí con productos, bloqueamos
        if (catParaEliminar.asociados && catParaEliminar.asociados > 0) {
            setShowDeleteConfirm(false);
            setShowReassociate(true); // Redirigimos al modal de transferencia por seguridad
            toast.error('No se puede eliminar: La categoría aún tiene productos asociados');
            return;
        }

        setIsDeleting(true);
        try {
            const exito = await eliminarCategoriaService(catParaEliminar.id);
            if (exito) {
                toast.success('Categoría eliminada');
                setShowDeleteConfirm(false);
                setCatParaEliminar(null);
                cargarCategorias();
                if (onRefresh) onRefresh();
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al eliminar');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleTransferirProductos = async () => {
        if (!catParaEliminar || !catDestinoId) {
            toast.warning('Selecciona una categoría de destino');
            return;
        }

        if (confirmText !== 'CONFIRMAR') {
            toast.warning('Escribe CONFIRMAR para continuar');
            return;
        }

        setIsTransferring(true);
        try {
            // Se llama ÚNICAMENTE al servicio de transferencia. 
            // NO se debe llamar a eliminarCategoriaService aquí.
            const mensaje = await transferirProductosService(catParaEliminar.id, catDestinoId);
            toast.success(mensaje || 'Productos transferidos correctamente');

            // Cerramos solo este modal. catParaEliminar se limpia para resetear el estado.
            setShowReassociate(false);
            setCatParaEliminar(null);

            // Refrescamos la lista. La categoría de origen debe seguir existiendo.
            cargarCategorias();
            if (onRefresh) onRefresh();
        } catch (error: any) {
            toast.error(error.message || 'Error en el proceso de transferencia');
        } finally {
            setIsTransferring(false);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md" scrollBehavior="inside" isDismissable={false} backdrop="blur" radius="lg" classNames={{ base: 'rounded-2xl overflow-hidden max-h-[75vh]', closeButton: 'hover:bg-default-100 cursor-pointer' }}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Gestión de Categorías
                            </ModalHeader>
                            <ModalBody className="overflow-y-scroll custom-scrollbar">
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-default-500 uppercase">Lista de Categorías</h3>
                                        {puedeCrear && (
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            color="primary"
                                            variant="flat"
                                            onPress={() => setIsAdding(!isAdding)}
                                        >
                                            <Icon icon={isAdding ? "lucide:minus" : "lucide:plus"} />
                                        </Button>
                                        )}
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
                                            <Button
                                                size="sm"
                                                color="primary"
                                                onPress={handleAgregar}
                                                isLoading={isLoadingBackend}
                                                isDisabled={!nuevaCategoria.trim()}
                                            >
                                                Añadir
                                            </Button>
                                        </div>
                                    )}

                                    {showDeleteConfirm && catParaEliminar && !showReassociate && (
                                        <div className="bg-danger-50 p-4 rounded-xl flex flex-col gap-3 border border-danger-200 animate-in fade-in zoom-in">
                                            <div className="flex items-center gap-2 text-danger-600">
                                                <Icon icon="lucide:trash-2" width={20} />
                                                <span className="font-bold">Confirmar Eliminación</span>
                                            </div>

                                            <p className="text-sm text-danger-700">
                                                ¿Estás seguro de eliminar la categoría <strong>{catParaEliminar.nombre}</strong>?
                                                Esta acción no se puede deshacer.
                                            </p>

                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    onPress={() => {
                                                        setShowDeleteConfirm(false);
                                                        setCatParaEliminar(null);
                                                    }}
                                                    isDisabled={isDeleting}
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    color="danger"
                                                    onPress={handleConfirmarEliminacionSimple}
                                                    isLoading={isDeleting}
                                                >
                                                    Eliminar
                                                </Button>
                                            </div>
                                        </div>
                                    )}


                                    <Divider />

                                    <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-2">
                                        {isFetchingCategorias ? (
                                            <div className="flex flex-col items-center justify-center py-8 gap-2">
                                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-sm text-default-400">Cargando categorías...</p>
                                            </div>
                                        ) : categorias.length === 0 ? (
                                            <p className="text-center text-default-400 py-4 italic">No hay categorías registradas</p>
                                        ) : (
                                            categorias.map((cat) => (
                                                <div
                                                    key={cat.id}
                                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-default-100 transition-colors group"
                                                >
                                                    {editId === cat.id ? (
                                                        <div className="flex-1 flex flex-col gap-1">
                                                            <div className="flex gap-2">
                                                                <Input
                                                                    size="sm"
                                                                    value={editNombre}
                                                                    onValueChange={setEditNombre}
                                                                    isDisabled={isUpdating}
                                                                    autoFocus
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    color="success"
                                                                    variant="flat"
                                                                    isIconOnly
                                                                    onPress={() => handleEditar(cat.id)}
                                                                    isLoading={isUpdating}
                                                                >
                                                                    <Icon icon="lucide:check" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    color="danger"
                                                                    variant="flat"
                                                                    isIconOnly
                                                                    onPress={() => setEditId(null)}
                                                                    isDisabled={isUpdating}
                                                                >
                                                                    <Icon icon="lucide:x" />
                                                                </Button>
                                                            </div>
                                                            <p className="text-[10px] text-warning-500 font-medium px-1">
                                                                ⚠️ Este cambio se reflejará en todos los productos asociados
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col">
                                                            <span className={`font-medium ${!cat.activo ? 'text-default-400 line-through' : ''}`}>
                                                                {cat.nombre}
                                                            </span>
                                                            {cat.asociados !== undefined && (
                                                                <span className="text-[10px] text-default-400">
                                                                    {cat.asociados} {cat.asociados === 1 ? 'producto asociado' : 'productos asociados'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-1">
                                                        {editId !== cat.id && (puedeActualizar || puedeEliminar) && (
                                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {puedeActualizar && (
                                                                <Button
                                                                    isIconOnly
                                                                    size="sm"
                                                                    variant="light"
                                                                    onPress={() => handleEditar(cat.id)}
                                                                >
                                                                    <Icon icon="lucide:edit-2" className="text-default-500" />
                                                                </Button>
                                                                )}
                                                                {puedeEliminar && (
                                                                <Button
                                                                    isIconOnly
                                                                    size="sm"
                                                                    variant="light"
                                                                    color="danger"
                                                                    onPress={() => handleEliminar(cat.id, cat.nombre)}
                                                                >
                                                                    <Icon icon="lucide:trash-2" />
                                                                </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                        {puedeActualizar && (
                                                        <div className="flex items-center gap-2">
                                                            {togglingIds.has(cat.id) && (
                                                                <div className="w-3 h-3 border-2 border-success border-t-transparent rounded-full animate-spin"></div>
                                                            )}
                                                            <label className={`relative inline-flex items-center cursor-pointer transition-all duration-300 ${togglingIds.has(cat.id) ? 'opacity-50 pointer-events-none' : ''}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    className="sr-only peer"
                                                                    checked={cat.activo}
                                                                    onChange={() => handleToggleActivo(cat.id, cat.activo)}
                                                                    disabled={togglingIds.has(cat.id)}
                                                                />
                                                                <div className="w-11 h-6 bg-default-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success flex items-center justify-between px-1 gap-1">
                                                                    <svg aria-label="enabled" className={`w-3 h-3 text-white transition-opacity duration-300 ${cat.activo ? 'opacity-100' : 'opacity-0'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                                                        <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="4" fill="none" stroke="currentColor">
                                                                            <path d="M20 6 9 17l-5-5"></path>
                                                                        </g>
                                                                    </svg>
                                                                    <svg aria-label="disabled" className={`w-3 h-3 text-default-400 transition-opacity duration-300 ${!cat.activo ? 'opacity-100' : 'opacity-0'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M18 6 6 18" />
                                                                        <path d="m6 6 12 12" />
                                                                    </svg>
                                                                </div>
                                                            </label>
                                                        </div>
                                                        )}
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

            {/* Modal de Reasociación (Ventana Flotante Separada) */}
            <Modal
                isOpen={showReassociate}
                onOpenChange={setShowReassociate}
                size="md"
                backdrop="blur"
                scrollBehavior="inside"
                isDismissable={false}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="bg-danger-50 border-b border-danger-100 py-4">
                                <div className="flex items-center gap-3 text-danger-600">
                                    <Icon icon="lucide:alert-triangle" width={28} />
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-lg">Categoría con productos asociados</h3>
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
                                        description={`La categoría "${catParaEliminar?.nombre}" está asociada a muchos productos. Para poder eliminarla, primero debes mover sus productos a otra categoría.`}
                                    />

                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <p className="text-sm font-semibold text-default-700">
                                                Asocia todos los productos a otra categoría para ser posible eliminar:
                                            </p>
                                            <Select
                                                label="Nueva categoría de destino"
                                                placeholder="Selecciona una categoría diferente"
                                                selectedKeys={catDestinoId ? [catDestinoId] : []}
                                                onChange={(e) => setCatDestinoId(e.target.value)}
                                                variant="bordered"
                                            >
                                                {categorias
                                                    .filter(c => c.id !== catParaEliminar?.id)
                                                    .map((cat) => (
                                                        <SelectItem key={cat.id} textValue={cat.nombre}>
                                                            {cat.nombre}
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
                                <Button
                                    variant="light"
                                    onPress={onClose}
                                    isDisabled={isTransferring}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    color="danger"
                                    onPress={handleTransferirProductos}
                                    isLoading={isTransferring}
                                    isDisabled={confirmText !== 'CONFIRMAR' || !catDestinoId}
                                >
                                    Transferir
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
};

export default GestionCategoriasModal;
