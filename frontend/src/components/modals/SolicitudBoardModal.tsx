
import React from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Chip,
    ScrollShadow,
    Tooltip
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { ISolicitud } from '../../types/solicitud.types';
import { IAsignatura, DiaSemana } from '../../types/asignatura.types';
import { obtenerAsignaturasService } from '../../services/asignatura-service';

interface SolicitudBoardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedIds: string[]) => void;
    onRequestClick: (solicitud: ISolicitud) => void;
    solicitudes: ISolicitud[];
}

const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const SolicitudBoardModal: React.FC<SolicitudBoardModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    onRequestClick,
    solicitudes
}) => {
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
    const [asignaturas, setAsignaturas] = React.useState<IAsignatura[]>([]);
    const [expandedDays, setExpandedDays] = React.useState<Record<string, boolean>>({}); // Key: "week-day"
    const scrollRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (isOpen) {
            obtenerAsignaturasService().then(data => setAsignaturas(data)).catch(console.error);
        }
    }, [isOpen]);

    const getBloqueHorario = (req: ISolicitud): string => {
        const asignatura = asignaturas.find(a => a.id === req.asignaturaId);
        if (!asignatura) return req.profesorNombre; // Fallback

        // Find section by professor (assuming 1 section per prof for simplicity or exact match)
        const seccion = asignatura.secciones.find(s => s.profesorAsignadoId === req.profesorId);
        if (!seccion) return req.profesorNombre;

        const date = new Date(req.fecha);
        const dayMap = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
        const dayName = dayMap[date.getDay()] as DiaSemana;

        const bloque = seccion.bloquesHorarios.find(b => b.diaSemana === dayName);
        if (!bloque) return req.profesorNombre;

        return `${bloque.horaInicio} - ${bloque.horaFin}`;
    };

    const toggleDayExpand = (week: number, day: string) => {
        const key = `${week}-${day}`;
        setExpandedDays(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Initialize all days as expanded by default when requests change
    React.useEffect(() => {
        const initialExpanded: Record<string, boolean> = {};
        WEEKS.forEach(w => {
            DAYS.forEach(d => {
                initialExpanded[`${w}-${d}`] = true;
            });
        });
        setExpandedDays(initialExpanded);
    }, []);

    // Group requests by Week -> Day
    const groupedRequests = React.useMemo(() => {
        const map = new Map<number, Map<string, ISolicitud[]>>();

        WEEKS.forEach(week => {
            const dayMap = new Map<string, ISolicitud[]>();
            DAYS.forEach(day => dayMap.set(day, []));
            map.set(week, dayMap);
        });

        solicitudes.forEach(s => {
            if (map.has(s.semana)) {
                // Map backend date/day to our DAYS array if needed
                // Assuming s.fecha or s.diaSemana maps correctly. 
                // For now, let's assume we can derive the day name or use a mock distribution if data is missing.
                // We'll try to use a simple mapping or just push to 'Lunes' if undefined for safety, 
                // but ideally the backend provides the day.
                // Let's assume we parse the date to get the day name.
                const date = new Date(s.fecha);
                const dayIndex = date.getDay(); // 0=Sun, 1=Mon...
                const dayName = dayIndex === 0 ? 'Sábado' : DAYS[dayIndex - 1] || 'Lunes';

                map.get(s.semana)?.get(dayName)?.push(s);
            }
        });

        return map;
    }, [solicitudes]);

    // Auto-scroll to current week on open
    React.useEffect(() => {
        if (isOpen && scrollRef.current) {
            // Simple logic: Scroll to week 1 for now, or implement current week logic
            // If we want to scroll to "Current Week", we probably need to know it.
            // For now, let's just scroll to start.
        }
    }, [isOpen]);

    const toggleOne = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleDay = (week: number, day: string) => {
        const requests = groupedRequests.get(week)?.get(day) || [];
        const allSelected = requests.every(r => selectedIds.has(r.id));
        const next = new Set(selectedIds);

        requests.forEach(r => {
            if (allSelected) next.delete(r.id);
            else next.add(r.id);
        });
        setSelectedIds(next);
    };

    const toggleWeek = (week: number) => {
        const dayMap = groupedRequests.get(week);
        if (!dayMap) return;

        // Collect all requests in this week
        let allRequests: ISolicitud[] = [];
        dayMap.forEach((reqs) => allRequests.push(...reqs));

        if (allRequests.length === 0) return;

        const allSelected = allRequests.every(r => selectedIds.has(r.id));
        const next = new Set(selectedIds);

        allRequests.forEach(r => {
            if (allSelected) next.delete(r.id);
            else next.add(r.id);
        });
        setSelectedIds(next);
    };

    const handleConfirm = () => {
        onConfirm(Array.from(selectedIds));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="full"
            classNames={{
                body: "p-0",
                base: "h-[95vh] w-[98vw] max-w-none m-4"
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 px-6 py-4 border-b border-default-100">
                            <h2 className="text-2xl font-bold">Selección de Solicitudes</h2>
                            <p className="text-default-500 font-normal">
                                Doble click en una solicitud para seleccionarla. Doble click en el encabezado de día o semana para seleccionar el grupo completo.
                            </p>
                        </ModalHeader>

                        <ModalBody className="overflow-hidden flex flex-col bg-content2/50">
                            {/* Board Scroll Container */}
                            <ScrollShadow
                                ref={scrollRef}
                                orientation="horizontal"
                                className="flex-grow flex overflow-x-auto p-6 gap-4"
                            >
                                {WEEKS.map(week => (
                                    <div
                                        key={week}
                                        className="flex-shrink-0 w-[30vw] min-w-[350px] bg-content1 rounded-xl border border-default-200 shadow-sm flex flex-col h-full overflow-hidden"
                                    >
                                        {/* Week Header */}
                                        <div
                                            className="p-3 bg-default-100 border-b border-default-200 text-center cursor-pointer hover:bg-default-200 transition-colors select-none"
                                            onDoubleClick={() => toggleWeek(week)}
                                        >
                                            <span className="font-bold text-lg">Semana {week}</span>
                                        </div>

                                        {/* Days Column */}
                                        <div className="flex-grow overflow-y-auto p-2 space-y-3">
                                            {DAYS.map(day => {
                                                const requests = groupedRequests.get(week)?.get(day) || [];
                                                const isDayEmpty = requests.length === 0;
                                                const dayKey = `${week}-${day}`;
                                                const isExpanded = expandedDays[dayKey] ?? true;

                                                return (
                                                    <div key={day} className="space-y-1">
                                                        <div className="flex items-center justify-between px-2 py-1 bg-default-50 rounded-lg group hover:bg-default-100 transition-colors">
                                                            <div
                                                                className={`flex-grow text-xs font-semibold uppercase text-default-500 select-none ${!isDayEmpty ? 'cursor-pointer hover:text-primary' : ''}`}
                                                                onDoubleClick={() => !isDayEmpty && toggleDay(week, day)}
                                                            >
                                                                {day}
                                                                {!isDayEmpty && <span className="ml-2 text-[10px] text-default-300">({requests.length})</span>}
                                                            </div>
                                                            {!isDayEmpty && (
                                                                <Button
                                                                    isIconOnly
                                                                    size="sm"
                                                                    variant="light"
                                                                    className="h-6 w-6 min-w-4 text-default-400"
                                                                    onPress={() => toggleDayExpand(week, day)}
                                                                >
                                                                    <Icon
                                                                        icon="lucide:chevron-down"
                                                                        className={`transition-transform duration-200 ${!isExpanded ? '-rotate-90' : ''}`}
                                                                    />
                                                                </Button>
                                                            )}
                                                        </div>

                                                        {!isDayEmpty && isExpanded && (
                                                            <div className="grid grid-cols-2 gap-2 pl-2 animate-appearance-in">
                                                                {requests.map(req => {
                                                                    const isSelected = selectedIds.has(req.id);
                                                                    return (
                                                                        <Tooltip
                                                                            key={req.id}
                                                                            delay={0}
                                                                            closeDelay={0}
                                                                            placement="right-start"
                                                                            content={
                                                                                <div className="px-1 py-2 max-w-[300px]">
                                                                                    <div className="font-bold text-small mb-1">{req.asignaturaNombre}</div>
                                                                                    <div className="text-tiny text-default-500 mb-2">{req.profesorNombre}</div>

                                                                                    {req.recetaNombre && (
                                                                                        <div className="bg-default-100 p-2 rounded-medium mb-2">
                                                                                            <div className="text-tiny font-semibold block mb-1">Receta:</div>
                                                                                            <span className="text-tiny">{req.recetaNombre}</span>
                                                                                        </div>
                                                                                    )}

                                                                                    <div className="text-tiny mb-2">
                                                                                        <span className="font-semibold block mb-1">Productos ({req.items.length}):</span>
                                                                                        <ul className="list-disc pl-4 space-y-0.5 max-h-[100px] overflow-y-auto">
                                                                                            {req.items.slice(0, 5).map((item, idx) => (
                                                                                                <li key={idx} className="text-default-500">
                                                                                                    {item.cantidad} {item.unidadMedida} {item.productoNombre}
                                                                                                </li>
                                                                                            ))}
                                                                                            {req.items.length > 5 && (
                                                                                                <li className="text-default-400 italic">
                                                                                                    +{req.items.length - 5} más...
                                                                                                </li>
                                                                                            )}
                                                                                        </ul>
                                                                                    </div>

                                                                                    {req.observaciones && (
                                                                                        <div className="border-t border-default-200 pt-2 mt-2">
                                                                                            <span className="text-tiny font-semibold block mb-1">Observaciones:</span>
                                                                                            <p className="text-tiny text-default-500 italic">"{req.observaciones}"</p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            }
                                                                        >
                                                                            <div
                                                                                className={`
                                                                        p-2 rounded-lg border text-xs cursor-pointer transition-all select-none h-full flex flex-col justify-between
                                                                        ${isSelected
                                                                                        ? 'bg-default-100 border-default-300 opacity-60 grayscale'
                                                                                        : 'bg-background border-default-200 hover:border-primary hover:shadow-md'
                                                                                    }
                                                                      `}
                                                                                onDoubleClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleOne(req.id);
                                                                                }}
                                                                            >
                                                                                <div className="mb-1">
                                                                                    <span className="font-semibold block truncate" title={req.asignaturaNombre}>
                                                                                        {req.asignaturaNombre}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex justify-between items-end mt-1">
                                                                                    <span className="text-default-500 font-mono font-medium truncate">
                                                                                        {getBloqueHorario(req)}
                                                                                    </span>
                                                                                    <Chip size="sm" variant="flat" color={req.items.some(i => i.esAdicional) ? 'warning' : 'default'} className="h-4 text-[9px] px-1 min-w-0">
                                                                                        {req.items.length}
                                                                                    </Chip>
                                                                                </div>
                                                                            </div>
                                                                        </Tooltip>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}

                                                        {!isDayEmpty && !isExpanded && (
                                                            <div className="pl-4 text-xs text-default-400 italic">
                                                                {requests.length} solicitudes ocultas...
                                                            </div>
                                                        )}

                                                        {isDayEmpty && (
                                                            <div className="pl-4 py-2 border-l-2 border-dashed border-default-100">
                                                                {/* Empty placeholder */}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </ScrollShadow>
                        </ModalBody>

                        <ModalFooter className="border-t border-default-100 bg-content1 justify-between items-center px-6 py-4">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="flex-shrink-0">
                                    <span className="text-default-500">Seleccionadas:</span>
                                    <span className="ml-2 text-xl font-bold text-primary">{selectedIds.size}</span>
                                </div>

                                {/* Pool Representation (Horizontal Scroll of Chips) */}
                                <div className="flex-grow flex gap-2 overflow-x-auto scrollbar-hide px-2">
                                    {Array.from(selectedIds).map(id => {
                                        const req = solicitudes.find(s => s.id === id);
                                        if (!req) return null;
                                        return (
                                            <Chip
                                                key={id}
                                                onClose={() => toggleOne(id)}
                                                variant="flat"
                                                className="flex-shrink-0"
                                            >
                                                {req.asignaturaNombre} (S{req.semana})
                                            </Chip>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-2 flex-shrink-0 ml-4">
                                <Button variant="flat" color="danger" onPress={onClose}>
                                    Cancelar
                                </Button>
                                <Button
                                    color="primary"
                                    onPress={handleConfirm}
                                    isDisabled={selectedIds.size === 0}
                                    endContent={<Icon icon="lucide:arrow-right" />}
                                >
                                    Continuar
                                </Button>
                            </div>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
