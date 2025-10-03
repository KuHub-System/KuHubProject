import React, { useState } from 'react';
import { Card, CardBody, CardHeader, Progress, Divider, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Input, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../contexts/auth-context';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import ComprobacionModal from '../components/modals/ComprobacionModal';
import CotizacionModal from '../components/modals/CotizacionModal';
import FinProcesoModal from '../components/modals/FinProcesoModal';

// Definiciones de interfaces
interface Pedido {
    id: string;
    asignatura: string;
    profesor: string;
    fechaSolicitud: string;
    fechaClase: string;
    estado: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Entregado';
    items: {
        id: string;
        producto: string;
        cantidad: number;
        unidad: string;
    }[];
}

interface ProductoConglomerado {
    id: string;
    nombre: string;
    cantidadTotal: number;
    unidad: string;
    pedidos: number;
    prioridad: 'Alta' | 'Media' | 'Baja';
}

interface ComprobacionItem {
    id: string;
    nombre: string;
    cantidadTotal: number;
    unidad: string;
    cantidadInventario: number;
    totalEstimado: number;
    total: number;
}

interface ProductoInventario {
    nombre: string;
    cantidad: number;
    unidad: string;
}

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

interface FinalOrder {
    producto: string;
    cantidad: number;
    proveedor: string;
    precioTotal: number;
}

// Datos simulados
const mockUser = { nombre: 'Administrador' };
const datosAsignaturas = [
    { nombre: 'Panadería', value: 42, color: '#004A87', monto: 2100000 },
    { nombre: 'Pastelería', value: 29, color: '#0070F0', monto: 1450000 },
    { nombre: 'Cocina Internacional', value: 18, color: '#66aaf9', monto: 900000 },
    { nombre: 'Cocina Chilena', value: 11, color: '#99c7fb', monto: 550000 },
    { nombre: 'Otros cursos', value: 0, color: '#E30613', monto: 0 }
];

const estadisticas = {
    pedidosCompletados: 85,
    pedidosPendientes: 12,
    pedidosRechazados: 3,
    stockBajo: 8,
    productosTotal: 120,
    asignaturasActivas: 15
};

// Datos detallados de los pedidos para el progreso
const progresoPedidosDetallados: (Pedido & { porcentaje: number })[] = [
    { 
        id: '3', 
        porcentaje: 100,
        asignatura: 'Panadería Básica',
        profesor: 'Juan Pérez',
        fechaSolicitud: '2025-03-10T14:20:00Z',
        fechaClase: '2025-03-15T09:00:00Z',
        estado: 'Entregado',
        items: [
            { id: '1', producto: 'Harina', cantidad: 5, unidad: 'kg' },
            { id: '2', producto: 'Levadura', cantidad: 0.5, unidad: 'kg' },
            { id: '3', producto: 'Sal', cantidad: 0.2, unidad: 'kg' }
        ]
    },
    { 
        id: '2', 
        porcentaje: 75,
        asignatura: 'Pastelería Avanzada',
        profesor: 'María González',
        fechaSolicitud: '2025-03-09T10:15:00Z',
        fechaClase: '2025-03-14T14:00:00Z',
        estado: 'Aprobado',
        items: [
            { id: '1', producto: 'Harina', cantidad: 3, unidad: 'kg' },
            { id: '2', producto: 'Azúcar', cantidad: 2, unidad: 'kg' },
            { id: '3', producto: 'Mantequilla', cantidad: 1.5, unidad: 'kg' },
            { id: '4', producto: 'Huevos', cantidad: 24, unidad: 'unidad' }
        ]
    },
    { 
        id: '5', 
        porcentaje: 50,
        asignatura: 'Técnicas de Conservación',
        profesor: 'Carlos Muñoz',
        fechaSolicitud: '2025-03-06T09:30:00Z',
        fechaClase: '2025-03-11T10:00:00Z',
        estado: 'Aprobado',
        items: [
            { id: '1', producto: 'Sal', cantidad: 2, unidad: 'kg' },
            { id: '2', producto: 'Azúcar', cantidad: 1.5, unidad: 'kg' },
            { id: '3', producto: 'Vinagre', cantidad: 2, unidad: 'l' }
        ]
    },
    { 
        id: '4', 
        porcentaje: 25,
        asignatura: 'Cocina Chilena',
        profesor: 'Ana Rodríguez',
        fechaSolicitud: '2025-03-07T11:45:00Z',
        fechaClase: '2025-03-12T14:00:00Z',
        estado: 'Pendiente',
        items: [
            { id: '1', producto: 'Carne', cantidad: 3, unidad: 'kg' },
            { id: '2', producto: 'Papas', cantidad: 2, unidad: 'kg' },
            { id: '3', producto: 'Cebolla', cantidad: 1, unidad: 'kg' }
        ]
    },
    { 
        id: '1', 
        porcentaje: 0,
        asignatura: 'Cocina Internacional',
        profesor: 'Pedro Sánchez',
        fechaSolicitud: '2025-03-08T16:30:00Z',
        fechaClase: '2025-03-13T10:00:00Z',
        estado: 'Pendiente',
        items: [
            { id: '1', producto: 'Arroz', cantidad: 2, unidad: 'kg' },
            { id: '2', producto: 'Aceite de Oliva', cantidad: 1, unidad: 'l' },
            { id: '3', producto: 'Especias', cantidad: 0.5, unidad: 'kg' }
        ]
    }
];

const mockProductosConglomerados: ProductoConglomerado[] = [
    { id: '1', nombre: 'Harina', cantidadTotal: 8, unidad: 'kg', pedidos: 5, prioridad: 'Alta' },
    { id: '2', nombre: 'Azúcar', cantidadTotal: 3.5, unidad: 'kg', pedidos: 4, prioridad: 'Media' },
    { id: '3', nombre: 'Huevos', cantidadTotal: 120, unidad: 'unidad', pedidos: 6, prioridad: 'Alta' },
    { id: '4', nombre: 'Mantequilla', cantidadTotal: 1.5, unidad: 'kg', pedidos: 3, prioridad: 'Media' },
    { id: '5', nombre: 'Aceite de Oliva', cantidadTotal: 1, unidad: 'l', pedidos: 2, prioridad: 'Baja' },
    { id: '6', nombre: 'Levadura', cantidadTotal: 0.5, unidad: 'kg', pedidos: 4, prioridad: 'Alta' },
    { id: '7', nombre: 'Sal', cantidadTotal: 2.2, unidad: 'kg', pedidos: 5, prioridad: 'Baja' },
    { id: '8', nombre: 'Leche', cantidadTotal: 12, unidad: 'l', pedidos: 3, prioridad: 'Media' }
];

const mockInventario: ProductoInventario[] = [
    { nombre: 'Harina', cantidad: 5, unidad: 'kg' },
    { nombre: 'Azúcar', cantidad: 10, unidad: 'kg' },
    { nombre: 'Huevos', cantidad: 50, unidad: 'unidad' },
    { nombre: 'Mantequilla', cantidad: 2, unidad: 'kg' },
    { nombre: 'Aceite de Oliva', cantidad: 0.5, unidad: 'l' },
    { nombre: 'Levadura', cantidad: 1, unidad: 'kg' },
    { nombre: 'Sal', cantidad: 3, unidad: 'kg' },
    { nombre: 'Leche', cantidad: 10, unidad: 'l' }
];

const mockProveedores: Record<string, Proveedor[]> = {
    'Harina': [{ nombre: 'Proveedor A', precio: 1.5 }, { nombre: 'Proveedor B', precio: 1.6 }],
    'Azúcar': [{ nombre: 'Proveedor A', precio: 1.2 }, { nombre: 'Proveedor C', precio: 1.3 }],
    'Huevos': [{ nombre: 'Proveedor D', precio: 0.2 }, { nombre: 'Proveedor E', precio: 0.25 }],
    'Mantequilla': [{ nombre: 'Proveedor B', precio: 5.5 }, { nombre: 'Proveedor C', precio: 5.8 }],
    'Aceite de Oliva': [{ nombre: 'Proveedor A', precio: 8.0 }, { nombre: 'Proveedor C', precio: 8.5 }],
    'Levadura': [{ nombre: 'Proveedor D', precio: 4.0 }, { nombre: 'Proveedor E', precio: 4.2 }],
    'Sal': [{ nombre: 'Proveedor B', precio: 0.5 }, { nombre: 'Proveedor C', precio: 0.6 }],
    'Leche': [{ nombre: 'Proveedor A', precio: 1.1 }, { nombre: 'Proveedor D', precio: 1.2 }]
};

const DashboardPage: React.FC = () => {
    const user = mockUser;
    
    // Estado para el flujo de 6 pasos
    const [currentStep, setCurrentStep] = useState(1);
    const [startDate, setStartDate] = useState('');
    const { isOpen: isComprobacionOpen, onOpen: onComprobacionOpen, onOpenChange: onComprobacionOpenChange } = useDisclosure();
    const { isOpen: isCotizacionOpen, onOpen: onCotizacionOpen, onOpenChange: onCotizacionOpenChange } = useDisclosure();
    const { isOpen: isFinalOpen, onOpen: onFinalOpen, onOpenChange: onFinalOpenChange } = useDisclosure();

    // Estados para el modal de detalles
    const { isOpen: isDetalleOpen, onOpen: onDetalleOpen, onOpenChange: onDetalleOpenChange } = useDisclosure();
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);

    const [comprobacionData, setComprobacionData] = useState<ComprobacionItem[]>([]);
    const [cotizacionData, setCotizacionData] = useState<CotizacionItem[]>([]);
    const [finalOrderData, setFinalOrderData] = useState<FinalOrder[]>([]);

    // Variantes para las animaciones
    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

    const isStepActive = (step: number) => currentStep >= step;

    // Función para ver detalles del pedido
    const verDetallePedido = (pedido: Pedido) => {
        setPedidoSeleccionado(pedido);
        onDetalleOpen();
    };

    // Función para formatear fecha
    const formatearFecha = (fechaISO: string) => {
        const fecha = new Date(fechaISO);
        return fecha.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Función para renderizar estado
    const renderEstado = (estado: string) => {
        switch (estado) {
            case 'Pendiente':
                return <Chip color="warning" size="sm">{estado}</Chip>;
            case 'Aprobado':
                return <Chip color="primary" size="sm">{estado}</Chip>;
            case 'Rechazado':
                return <Chip color="danger" size="sm">{estado}</Chip>;
            case 'Entregado':
                return <Chip color="success" size="sm">{estado}</Chip>;
            default:
                return <Chip size="sm">{estado}</Chip>;
        }
    };

    // Lógica del flujo de pedidos
    const handleComprobacionClick = () => {
        const data: ComprobacionItem[] = [
            { id: '1', nombre: 'Harina', cantidadTotal: 8, unidad: 'kg' },
            { id: '2', nombre: 'Azúcar', cantidadTotal: 3.5, unidad: 'kg' },
            { id: '3', nombre: 'Huevos', cantidadTotal: 120, unidad: 'unidad' },
            { id: '4', nombre: 'Mantequilla', cantidadTotal: 1.5, unidad: 'kg' },
        ].map(p => {
            const inventarioItem = mockInventario.find(inv => inv.nombre === p.nombre);
            const cantidadInventario = inventarioItem ? inventarioItem.cantidad : 0;
            const totalEstimado = Math.max(0, p.cantidadTotal - cantidadInventario);
            return { 
                ...p, 
                cantidadInventario, 
                totalEstimado, 
                total: totalEstimado // Cambiado: ahora usa totalEstimado en lugar de cantidadTotal
            };
        });
        setComprobacionData(data);
        onComprobacionOpen();
        setCurrentStep(3);
    };

    // Función para resetear el flujo
    const resetearFlujo = () => {
        setCurrentStep(1);
        setComprobacionData([]);
        setCotizacionData([]);
        setFinalOrderData([]);
    };

    // Función para rechazar específicamente
    const handleRechazarComprobacion = () => {
        onComprobacionOpenChange();
        resetearFlujo();
    };

    const handleRechazarCotizacion = () => {
        onCotizacionOpenChange();
        resetearFlujo();
    };

    const handleAceptarComprobacion = (data: ComprobacionItem[]) => {
        onComprobacionOpenChange();
        const productosFaltantes = data.filter(p => p.total > p.cantidadInventario);
        const dataParaCotizacion: CotizacionItem[] = productosFaltantes.map(p => ({
            producto: p.nombre,
            cantidadNecesaria: p.total,
            proveedores: (mockProveedores[p.nombre] || []).map(prov => ({
                nombre: prov.nombre,
                precio: prov.precio // Mantener precios en pesos chilenos
            })),
            selectedProveedor: mockProveedores[p.nombre]?.[0]?.nombre
        }));
        setCotizacionData(dataParaCotizacion);
        onCotizacionOpen();
        setCurrentStep(4);
    };

    const handleHacerPedido = (data: CotizacionItem[]) => {
        onCotizacionOpenChange();
        const finalOrder = data.map(item => {
            const selectedProveedor = item.proveedores.find(p => p.nombre === item.selectedProveedor);
            const precioTotal = selectedProveedor ? selectedProveedor.precio * item.cantidadNecesaria : 0;
            return {
                producto: item.producto,
                cantidad: item.cantidadNecesaria,
                proveedor: selectedProveedor ? selectedProveedor.nombre : 'N/A',
                precioTotal
            };
        });
        setFinalOrderData(finalOrder);
        onFinalOpen();
        setCurrentStep(5);
    };

    const handleCerrarFinal = () => {
        onFinalOpenChange();
        setCurrentStep(6);
        // Auto-reset después de completar exitosamente
        setTimeout(() => {
            resetearFlujo();
        }, 2000);
    };

    return (
        <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen py-8 font-sans">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                <div className="container mx-auto px-4">
                    <motion.div variants={itemVariants}>
                        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
                        <p className="text-default-500">
                            Bienvenido, <span className="font-medium">{user.nombre}</span>. Aquí tienes un resumen de la actividad reciente.
                        </p>
                    </motion.div>
                </div>
                
                <div className="container mx-auto px-4">
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="shadow-sm">
                            <CardBody className="flex items-center p-4">
                                <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center mr-4">
                                    <Icon icon="lucide:check-circle" className="text-success text-xl" />
                                </div>
                                <div>
                                    <p className="text-sm text-default-500">Pedidos Completados</p>
                                    <p className="text-2xl font-semibold">{estadisticas.pedidosCompletados}%</p>
                                </div>
                            </CardBody>
                        </Card>
                        <Card className="shadow-sm">
                            <CardBody className="flex items-center p-4">
                                <div className="w-12 h-12 rounded-full bg-warning-100 flex items-center justify-center mr-4">
                                    <Icon icon="lucide:clock" className="text-warning text-xl" />
                                </div>
                                <div>
                                    <p className="text-sm text-default-500">Pedidos Pendientes</p>
                                    <p className="text-2xl font-semibold">{estadisticas.pedidosPendientes}</p>
                                </div>
                            </CardBody>
                        </Card>
                        <Card className="shadow-sm">
                            <CardBody className="flex items-center p-4">
                                <div className="w-12 h-12 rounded-full bg-danger-100 flex items-center justify-center mr-4">
                                    <Icon icon="lucide:alert-triangle" className="text-danger text-xl" />
                                </div>
                                <div>
                                    <p className="text-sm text-default-500">Productos con Stock Bajo</p>
                                    <p className="text-2xl font-semibold">{estadisticas.stockBajo}</p>
                                </div>
                            </CardBody>
                        </Card>
                        <Card className="shadow-sm">
                            <CardBody className="flex items-center p-4">
                                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mr-4">
                                    <Icon icon="lucide:book-open" className="text-primary text-xl" />
                                </div>
                                <div>
                                    <p className="text-sm text-default-500">Asignaturas Activas</p>
                                    <p className="text-2xl font-semibold">{estadisticas.asignaturasActivas}</p>
                                </div>
                            </CardBody>
                        </Card>
                    </motion.div>
                </div>

                <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <motion.div variants={itemVariants} className="lg:col-span-2">
                        <Card className="shadow-sm h-full">
                            <CardHeader className="pb-0 pt-4 px-4">
                                <h3 className="text-lg font-semibold">Progreso de Pedidos</h3>
                                <p className="text-default-500 text-sm">Semana actual</p>
                            </CardHeader>
                            <CardBody className="px-4 pb-4">
                                <div className="space-y-4">
                                    {progresoPedidosDetallados.map((pedido) => (
                                        <div key={pedido.id}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm">{pedido.asignatura}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">{pedido.porcentaje}%</span>
                                                    <Button 
                                                        isIconOnly 
                                                        variant="light" 
                                                        size="sm" 
                                                        className="text-primary hover:bg-default-100 active:bg-default-200"
                                                        onPress={() => verDetallePedido(pedido)}
                                                    >
                                                        <Icon icon="lucide:eye" className="text-xl" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <Progress
                                                aria-label={`Progreso ${pedido.asignatura}`}
                                                value={pedido.porcentaje}
                                                color={pedido.porcentaje === 100 ? 'success' : pedido.porcentaje === 0 ? 'danger' : 'primary'}
                                                className="h-2"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </CardBody>
                        </Card>
                    </motion.div>
                    
                    <motion.div variants={itemVariants} className="lg:col-span-1">
                        <Card className="shadow-sm h-full">
                            <CardHeader className="pb-0 pt-4 px-4">
                                <h3 className="text-lg font-semibold">Distribución de Pedidos</h3>
                                <p className="text-default-500 text-sm">Por valor monetario</p>
                            </CardHeader>
                            <CardBody className="px-4 pb-4">
                                {/* Gráfico con leyenda al lado */}
                                <div className="flex items-center justify-center mb-4">
                                    <div style={{ width: '160px', height: '160px' }}>
                                        <PieChart width={160} height={160}>
                                            <Pie
                                                data={datosAsignaturas}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                outerRadius={60}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {datosAsignaturas.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [`${value}%`, 'Porcentaje']} />
                                        </PieChart>
                                    </div>
                                    
                                    {/* Leyenda al lado derecho */}
                                    <div className="flex flex-col gap-2 ml-4 flex-1">
                                        {datosAsignaturas.map((entry, index) => (
                                            <div key={index} className="flex items-center gap-2 text-xs">
                                                <div 
                                                    className="w-3 h-3 rounded-sm flex-shrink-0" 
                                                    style={{ backgroundColor: entry.color }}
                                                />
                                                <div className="flex-1">
                                                    <div className="text-left font-medium">{entry.nombre}</div>
                                                    <div className="text-gray-500">
                                                        ${entry.monto.toLocaleString('es-CL')}
                                                    </div>
                                                </div>
                                                <span className="font-semibold">{entry.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Divider className="my-4" />

                                {/* Alertas abajo */}
                                <div className="space-y-3">
                                    <h4 className="text-md font-semibold">Alertas</h4>
                                    <div className="flex items-center gap-2 text-danger">
                                        <Icon icon="lucide:alert-circle" />
                                        <span className="text-sm">5 asignaturas sin pedidos esta semana</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-warning">
                                        <Icon icon="lucide:alert-triangle" />
                                        <span className="text-sm">8 productos con stock bajo</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-success">
                                        <Icon icon="lucide:check-circle" />
                                        <span className="text-sm">Todos los pedidos urgentes procesados</span>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </motion.div>
                </div>

                <div className="container mx-auto px-4">
                    <Card className="shadow-sm">
                        <CardHeader className="pb-0 pt-4 px-4">
                            <h3 className="text-lg font-semibold">Progreso del Proceso de Pedidos</h3>
                            <p className="text-default-500 text-sm">Estado actual del flujo de trabajo</p>
                        </CardHeader>
                    <CardBody className="px-4 pb-4">
                        <div className="relative h-2 bg-gray-200 rounded-full my-6">
                            <div className="absolute h-full bg-primary rounded-full" style={{ width: `${(currentStep - 1) / 5 * 100}%` }} />
                            <div className="flex justify-between items-center absolute w-full top-1/2 left-0 transform -translate-y-1/2">
                                {[1, 2, 3, 4, 5, 6].map((step) => (
                                    <div key={step} className={`w-8 h-8 rounded-full border-2 bg-white -top-1.5 flex items-center justify-center text-[10px] font-semibold ${isStepActive(step) ? 'bg-primary-500 border-primary-500 text-white' : 'bg-gray-200 border-gray-400 text-gray-500'}`}>
                                        {step}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col sm:flex-row gap-4">
                            <Input
                                type="date"
                                label="1. Fecha Inicio Pedidos (lunes)"
                                value={startDate}
                                onValueChange={setStartDate}
                                labelPlacement="outside"
                                className="flex-1"
                            />
                            <Button
                                color="primary"
                                startContent={<Icon icon="lucide:check" />}
                                onPress={handleComprobacionClick}
                                isDisabled={!startDate}
                                className="sm:self-end"
                            >
                                Iniciar Flujo
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </div>
            </motion.div>

            {/* Modal de detalle de pedido */}
            <Modal isOpen={isDetalleOpen} onOpenChange={onDetalleOpenChange} size="lg">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>Detalle del Pedido</ModalHeader>
                            <ModalBody>
                                {pedidoSeleccionado && (
                                    <div className="space-y-6">
                                        {/* Información general */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-default-500">Asignatura</p>
                                                <p className="font-semibold">{pedidoSeleccionado.asignatura}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-default-500">Profesor</p>
                                                <p className="font-semibold">{pedidoSeleccionado.profesor}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-default-500">Fecha de Solicitud</p>
                                                <p className="font-semibold">{formatearFecha(pedidoSeleccionado.fechaSolicitud)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-default-500">Fecha de Clase</p>
                                                <p className="font-semibold">{formatearFecha(pedidoSeleccionado.fechaClase)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-default-500">Estado</p>
                                                <div>{renderEstado(pedidoSeleccionado.estado)}</div>
                                            </div>
                                        </div>
                                        
                                        {/* Lista de productos */}
                                        <div>
                                            <p className="font-medium mb-2">Productos Solicitados</p>
                                            <Table 
                                                aria-label="Productos solicitados"
                                                removeWrapper
                                            >
                                                <TableHeader>
                                                    <TableColumn>PRODUCTO</TableColumn>
                                                    <TableColumn>CANTIDAD</TableColumn>
                                                </TableHeader>
                                                <TableBody>
                                                    {pedidoSeleccionado.items.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell>{item.producto}</TableCell>
                                                            <TableCell>{item.cantidad} {item.unidad}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="flat" onPress={onClose}>
                                    Cerrar
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Modals para los pasos del flujo */}
            <ComprobacionModal
                isOpen={isComprobacionOpen}
                onClose={handleRechazarComprobacion}
                comprobacionData={comprobacionData}
                setComprobacionData={setComprobacionData}
                onAccept={handleAceptarComprobacion}
            />
            
            <CotizacionModal
                isOpen={isCotizacionOpen}
                onClose={handleRechazarCotizacion}
                cotizacionData={cotizacionData}
                setCotizacionData={setCotizacionData}
                onAccept={handleHacerPedido}
            />

            <FinProcesoModal
                isOpen={isFinalOpen}
                onClose={handleCerrarFinal}
                finalOrderData={finalOrderData}
            />
        </div>
    );
};

export default DashboardPage;