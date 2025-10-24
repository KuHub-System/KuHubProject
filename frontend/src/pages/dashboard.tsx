import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Progress, Divider, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Input, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../contexts/auth-context';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import ComprobacionModal from '../components/modals/ComprobacionModal';
import CotizacionModal from '../components/modals/CotizacionModal';
import FinProcesoModal from '../components/modals/FinProcesoModal';
import { obtenerProductos } from '../services/storage-service';
import { IProducto } from '../types/producto.types';

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

interface Asignatura {
    id: string;
    nombre: string;
    profesor: string;
    pedidosSemanales: number;
    ultimoPedido: string;
}

// Datos simulados de asignaturas (esto debería venir de un servicio real)
const mockAsignaturas: Asignatura[] = [
    { id: '1', nombre: 'Panadería Básica', profesor: 'Juan Pérez', pedidosSemanales: 2, ultimoPedido: '2025-03-15' },
    { id: '2', nombre: 'Pastelería Avanzada', profesor: 'María González', pedidosSemanales: 3, ultimoPedido: '2025-03-14' },
    { id: '3', nombre: 'Cocina Internacional', profesor: 'Pedro Sánchez', pedidosSemanales: 1, ultimoPedido: '2025-03-13' },
    { id: '4', nombre: 'Cocina Chilena', profesor: 'Ana Rodríguez', pedidosSemanales: 2, ultimoPedido: '2025-03-12' },
    { id: '5', nombre: 'Técnicas de Conservación', profesor: 'Carlos Muñoz', pedidosSemanales: 1, ultimoPedido: '2025-03-11' },
    { id: '6', nombre: 'Gastronomía Molecular', profesor: 'Laura Fernández', pedidosSemanales: 1, ultimoPedido: '2025-03-10' },
    { id: '7', nombre: 'Cocina Mediterránea', profesor: 'Roberto Silva', pedidosSemanales: 2, ultimoPedido: '2025-03-09' },
    { id: '8', nombre: 'Repostería Francesa', profesor: 'Sophie Dubois', pedidosSemanales: 3, ultimoPedido: '2025-03-08' },
    { id: '9', nombre: 'Cocina Asiática', profesor: 'Kenji Tanaka', pedidosSemanales: 2, ultimoPedido: '2025-03-07' },
    { id: '10', nombre: 'Chocolatería Artesanal', profesor: 'Diego Morales', pedidosSemanales: 1, ultimoPedido: '2025-03-06' },
    { id: '11', nombre: 'Cocina Vegetariana', profesor: 'Carmen Ruiz', pedidosSemanales: 2, ultimoPedido: '2025-03-05' },
    { id: '12', nombre: 'Enología y Maridaje', profesor: 'Antonio Vega', pedidosSemanales: 1, ultimoPedido: '2025-03-04' },
    { id: '13', nombre: 'Cocina de Autor', profesor: 'Cristina Ortiz', pedidosSemanales: 2, ultimoPedido: '2025-03-03' },
    { id: '14', nombre: 'Panadería Artesanal', profesor: 'Fernando Castro', pedidosSemanales: 3, ultimoPedido: '2025-03-02' },
    { id: '15', nombre: 'Cocina Italiana', profesor: 'Giuseppe Romano', pedidosSemanales: 2, ultimoPedido: '2025-03-01' },
];

// Datos simulados
const mockUser = { nombre: 'Administrador' };
const datosAsignaturas = [
    { nombre: 'Panadería', value: 42, color: '#004A87', monto: 2100000 },
    { nombre: 'Pastelería', value: 29, color: '#0070F0', monto: 1450000 },
    { nombre: 'Cocina Internacional', value: 18, color: '#66aaf9', monto: 900000 },
    { nombre: 'Cocina Chilena', value: 11, color: '#99c7fb', monto: 550000 },
    { nombre: 'Otros cursos', value: 0, color: '#E30613', monto: 0 }
];

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

/**
 * FUNCIONES EXPORTABLES PARA CONTROL DE SOLICITUDES
 * Estas funciones pueden ser importadas en otras páginas para verificar
 * si se permite crear/editar solicitudes según el estado del proceso
 */

/**
 * Verifica si actualmente se pueden crear o editar solicitudes
 * Solo se permite durante el paso 2 (proceso activo)
 */
export const puedenCrearseSolicitudes = (): boolean => {
    const procesoActivo = localStorage.getItem('procesoActivo');
    const currentStep = localStorage.getItem('currentStep');
    
    return procesoActivo === 'true' && currentStep === '2';
};

/**
 * Obtiene información del proceso actual
 */
export const obtenerEstadoProceso = () => {
    const procesoActivo = localStorage.getItem('procesoActivo');
    const fechaInicio = localStorage.getItem('fechaInicioProceso');
    const fechaFin = localStorage.getItem('fechaFinProceso');
    const currentStep = localStorage.getItem('currentStep');
    
    return {
        activo: procesoActivo === 'true',
        paso: currentStep ? parseInt(currentStep) : 1,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
        permiteCrearSolicitudes: procesoActivo === 'true' && currentStep === '2'
    };
};

/**
 * Calcula los días restantes del proceso
 */
export const calcularDiasRestantesProceso = (): number => {
    const fechaFin = localStorage.getItem('fechaFinProceso');
    if (!fechaFin) return 0;
    
    const ahora = new Date();
    const fechaFinDate = new Date(fechaFin);
    const diferencia = fechaFinDate.getTime() - ahora.getTime();
    const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
    
    return Math.max(0, dias);
};

/**
 * Página de dashboard
 */
const DashboardPage: React.FC = () => {
    const user = mockUser;
    const history = useHistory();
    
    // Estados para productos reales
    const [productos, setProductos] = useState<IProducto[]>([]);
    const [productosBajoStock, setProductosBajoStock] = useState<IProducto[]>([]);
    
    // Estado para el flujo de 6 pasos
    const [currentStep, setCurrentStep] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [procesoActivo, setProcesoActivo] = useState(false);
    const [fechaInicioProceso, setFechaInicioProceso] = useState<string | null>(null);
    const [fechaFinProceso, setFechaFinProceso] = useState<string | null>(null);
    
    const { isOpen: isComprobacionOpen, onOpen: onComprobacionOpen, onOpenChange: onComprobacionOpenChange } = useDisclosure();
    const { isOpen: isCotizacionOpen, onOpen: onCotizacionOpen, onOpenChange: onCotizacionOpenChange } = useDisclosure();
    const { isOpen: isFinalOpen, onOpen: onFinalOpen, onOpenChange: onFinalOpenChange } = useDisclosure();

    // Estados para modales adicionales
    const { isOpen: isDetalleOpen, onOpen: onDetalleOpen, onOpenChange: onDetalleOpenChange } = useDisclosure();
    const { isOpen: isAsignaturasOpen, onOpen: onAsignaturasOpen, onOpenChange: onAsignaturasOpenChange } = useDisclosure();
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);

    const [comprobacionData, setComprobacionData] = useState<ComprobacionItem[]>([]);
    const [cotizacionData, setCotizacionData] = useState<CotizacionItem[]>([]);
    const [finalOrderData, setFinalOrderData] = useState<FinalOrder[]>([]);

    // Cargar productos reales al montar el componente
    useEffect(() => {
        const cargarProductos = () => {
            const productosReales = obtenerProductos();
            setProductos(productosReales);
            
            // Filtrar productos con stock bajo
            const bajoStock = productosReales.filter(p => p.stock <= p.stockMinimo);
            setProductosBajoStock(bajoStock);
        };
        
        cargarProductos();
        
        // Cargar estado del proceso desde localStorage
        const procesoGuardado = localStorage.getItem('procesoActivo');
        const fechaInicioGuardada = localStorage.getItem('fechaInicioProceso');
        const fechaFinGuardada = localStorage.getItem('fechaFinProceso');
        const stepGuardado = localStorage.getItem('currentStep');
        const comprobacionGuardada = localStorage.getItem('comprobacionData');
        const cotizacionGuardada = localStorage.getItem('cotizacionData');
        
        if (procesoGuardado === 'true' && fechaInicioGuardada && fechaFinGuardada) {
            setProcesoActivo(true);
            setFechaInicioProceso(fechaInicioGuardada);
            setFechaFinProceso(fechaFinGuardada);
            setStartDate(fechaInicioGuardada);
            setEndDate(fechaFinGuardada);
            
            // Restaurar el paso actual
            if (stepGuardado) {
                setCurrentStep(parseInt(stepGuardado));
            }
            
            // Restaurar datos de comprobación
            if (comprobacionGuardada) {
                try {
                    setComprobacionData(JSON.parse(comprobacionGuardada));
                } catch (e) {
                    console.error('Error al cargar comprobación:', e);
                }
            }
            
            // Restaurar datos de cotización
            if (cotizacionGuardada) {
                try {
                    setCotizacionData(JSON.parse(cotizacionGuardada));
                } catch (e) {
                    console.error('Error al cargar cotización:', e);
                }
            }
        }
    }, []);

    // Guardar estado del proceso cuando cambie
    useEffect(() => {
        if (procesoActivo) {
            localStorage.setItem('currentStep', currentStep.toString());
        }
    }, [currentStep, procesoActivo]);

    useEffect(() => {
        if (comprobacionData.length > 0) {
            localStorage.setItem('comprobacionData', JSON.stringify(comprobacionData));
        }
    }, [comprobacionData]);

    useEffect(() => {
        if (cotizacionData.length > 0) {
            localStorage.setItem('cotizacionData', JSON.stringify(cotizacionData));
        }
    }, [cotizacionData]);

    // Verificar automáticamente si se alcanzó la fecha límite
    useEffect(() => {
        if (!procesoActivo || !fechaFinProceso) return;

        const verificarFechaLimite = () => {
            const ahora = new Date();
            const fechaFin = new Date(fechaFinProceso);
            
            // Si ya pasó la fecha límite, terminar automáticamente
            if (ahora >= fechaFin) {
                handleTerminarProcesoAutomatico();
            }
        };

        // Verificar inmediatamente
        verificarFechaLimite();

        // Verificar cada minuto
        const intervalo = setInterval(verificarFechaLimite, 60000);

        return () => clearInterval(intervalo);
    }, [procesoActivo, fechaFinProceso]);

    // Calcular estadísticas dinámicas
    const estadisticas = {
        pedidosCompletados: 85,
        pedidosPendientes: progresoPedidosDetallados.filter(p => p.estado === 'Pendiente').length,
        pedidosRechazados: 3,
        stockBajo: productosBajoStock.length,
        productosTotal: productos.length,
        asignaturasActivas: mockAsignaturas.length
    };

    // Calcular días restantes del proceso
    const calcularDiasRestantes = (): number => {
        if (!fechaFinProceso) return 0;
        const ahora = new Date();
        const fechaFin = new Date(fechaFinProceso);
        const diferencia = fechaFin.getTime() - ahora.getTime();
        const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
        return Math.max(0, dias);
    };

    const diasRestantes = procesoActivo ? calcularDiasRestantes() : 0;

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

    // Funciones para navegar
    const navegarAInventarioStockBajo = () => {
        // Guardar filtro en sessionStorage para que el inventario lo recoja
        sessionStorage.setItem('inventarioFiltro', 'stockBajo');
        history.push('/inventario');
    };

    const navegarAPedidosPendientes = () => {
        // Guardar filtro en sessionStorage
        sessionStorage.setItem('pedidosFiltro', 'pendiente');
        history.push('/gestion-pedidos');
    };

    const mostrarAsignaturas = () => {
        onAsignaturasOpen();
    };

    // Funciones para gestionar el proceso de pedidos
    const handleIniciarProceso = () => {
        if (!startDate || !endDate) {
            alert('Por favor selecciona ambas fechas (inicio y término)');
            return;
        }

        const fechaInicio = new Date(startDate);
        const fechaFin = new Date(endDate);

        // Validar que la fecha de término sea posterior a la de inicio
        if (fechaFin <= fechaInicio) {
            alert('La fecha de término debe ser posterior a la fecha de inicio');
            return;
        }

        // Guardar en estado y localStorage
        setProcesoActivo(true);
        setFechaInicioProceso(startDate);
        setFechaFinProceso(endDate);
        setCurrentStep(2);
        
        localStorage.setItem('procesoActivo', 'true');
        localStorage.setItem('fechaInicioProceso', startDate);
        localStorage.setItem('fechaFinProceso', endDate);
        localStorage.setItem('currentStep', '2');

        console.log(`✅ Proceso iniciado desde ${startDate} hasta ${endDate}`);
    };

    const handleCancelarProceso = () => {
        if (window.confirm('¿Estás seguro de cancelar el proceso completo? Se perderá todo el progreso actual.')) {
            resetearFlujo();
            alert('Proceso cancelado completamente');
        }
    };

    const handleTerminarProceso = () => {
        // Confirmar antes de terminar
        if (window.confirm('¿Estás seguro de terminar el proceso de pedidos? Esto iniciará la comprobación de inventario.')) {
            iniciarComprobacion();
        }
    };

    const handleTerminarProcesoAutomatico = () => {
        console.log('⏰ Fecha límite alcanzada, terminando proceso automáticamente');
        iniciarComprobacion();
    };

    const iniciarComprobacion = () => {
        // NO limpiar el proceso activo aquí, solo avanzar al paso 3
        handleComprobacionClick();
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
                total: totalEstimado
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
        setProcesoActivo(false);
        setFechaInicioProceso(null);
        setFechaFinProceso(null);
        setStartDate('');
        setEndDate('');
        
        // Limpiar localStorage completamente
        localStorage.removeItem('procesoActivo');
        localStorage.removeItem('fechaInicioProceso');
        localStorage.removeItem('fechaFinProceso');
        localStorage.removeItem('currentStep');
        localStorage.removeItem('comprobacionData');
        localStorage.removeItem('cotizacionData');
    };

    // Función para rechazar específicamente - ahora solo cierra sin resetear
    const handleRechazarComprobacion = () => {
        onComprobacionOpenChange();
        // Ya NO reseteamos el flujo, el proceso sigue activo
    };

    const handleRechazarCotizacion = () => {
        onCotizacionOpenChange();
        // Ya NO reseteamos el flujo, el proceso sigue activo
    };

    const handleAceptarComprobacion = (data: ComprobacionItem[]) => {
        onComprobacionOpenChange();
        const productosFaltantes = data.filter(p => p.total > p.cantidadInventario);
        const dataParaCotizacion: CotizacionItem[] = productosFaltantes.map(p => ({
            producto: p.nombre,
            cantidadNecesaria: p.total,
            proveedores: (mockProveedores[p.nombre] || []).map(prov => ({
                nombre: prov.nombre,
                precio: prov.precio
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
        setTimeout(() => {
            resetearFlujo();
            alert('✅ Proceso completado exitosamente. El sistema está listo para un nuevo ciclo de pedidos.');
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
                        
                        <Card 
                            className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" 
                            isPressable
                            onPress={navegarAPedidosPendientes}
                        >
                            <CardBody className="flex items-center justify-center p-4">
                                <div className="w-12 h-12 rounded-full bg-warning-100 flex items-center justify-center mr-4">
                                    <Icon icon="lucide:clock" className="text-warning text-xl" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-default-500">Pedidos Pendientes</p>
                                    <p className="text-2xl font-semibold">{estadisticas.pedidosPendientes}</p>
                                </div>
                            </CardBody>
                        </Card>
                        
                        <Card 
                            className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" 
                            isPressable
                            onPress={navegarAInventarioStockBajo}
                        >
                            <CardBody className="flex items-center justify-center p-4">
                                <div className="w-12 h-12 rounded-full bg-danger-100 flex items-center justify-center mr-4">
                                    <Icon icon="lucide:alert-triangle" className="text-danger text-xl" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-default-500">Productos con Stock Bajo</p>
                                    <p className="text-2xl font-semibold">{estadisticas.stockBajo}</p>
                                </div>
                            </CardBody>
                        </Card>
                        
                        <Card 
                            className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" 
                            isPressable
                            onPress={mostrarAsignaturas}
                        >
                            <CardBody className="flex items-center justify-center p-4">
                                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mr-4">
                                    <Icon icon="lucide:book-open" className="text-primary text-xl" />
                                </div>
                                <div className="text-center">
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

                                <div className="space-y-3">
                                    <h4 className="text-md font-semibold">Alertas</h4>
                                    <div className="flex items-center gap-2 text-danger">
                                        <Icon icon="lucide:alert-circle" />
                                        <span className="text-sm">5 asignaturas sin pedidos esta semana</span>
                                    </div>
                                    {estadisticas.stockBajo > 0 && (
                                        <div 
                                            className="flex items-center gap-2 text-warning cursor-pointer hover:underline"
                                            onClick={navegarAInventarioStockBajo}
                                        >
                                            <Icon icon="lucide:alert-triangle" />
                                            <span className="text-sm">{estadisticas.stockBajo} productos con stock bajo</span>
                                        </div>
                                    )}
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
                            <div className="flex justify-between items-start w-full">
                                <div>
                                    <h3 className="text-lg font-semibold">Progreso del Proceso de Pedidos</h3>
                                    <p className="text-default-500 text-sm">Estado actual del flujo de trabajo</p>
                                </div>
                                {procesoActivo && fechaInicioProceso && fechaFinProceso && (
                                    <div className="text-right">
                                        <Chip 
                                            color={diasRestantes <= 2 ? "danger" : diasRestantes <= 5 ? "warning" : "primary"} 
                                            variant="flat" 
                                            size="sm"
                                            startContent={<Icon icon="lucide:clock" />}
                                        >
                                            {diasRestantes === 0 ? 'Último día' : `${diasRestantes} días restantes`}
                                        </Chip>
                                        <p className="text-xs text-default-500 mt-1">
                                            Termina: {new Date(fechaFinProceso).toLocaleDateString('es-CL', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short'
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardBody className="px-4 pb-4">
                            <div className="relative h-2 bg-gray-200 rounded-full my-6 overflow-hidden">
                                {/* Barra de progreso con animación */}
                                <motion.div 
                                    className="absolute h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(currentStep - 1) / 5 * 100}%` }}
                                    transition={{ duration: 0.8, ease: "easeInOut" }}
                                >
                                    {/* Efecto de brillo animado */}
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                                        animate={{
                                            x: ['-100%', '200%']
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "linear"
                                        }}
                                    />
                                </motion.div>
                                
                                {/* Círculos de los pasos - fuera de la barra */}
                                <div className="flex justify-between items-center absolute w-full -top-3 left-0">
                                    {[1, 2, 3, 4, 5, 6].map((step) => (
                                        <motion.div 
                                            key={step}
                                            className={`w-10 h-10 rounded-full border-3 flex items-center justify-center text-xs font-bold z-10 shadow-lg ${
                                                isStepActive(step) 
                                                    ? 'bg-primary-500 border-primary-500 text-white' 
                                                    : 'bg-white border-gray-300 text-gray-500'
                                            }`}
                                            initial={{ scale: 0.8 }}
                                            animate={{ 
                                                scale: currentStep === step ? [1, 1.15, 1] : 1
                                            }}
                                            transition={{
                                                duration: 0.5,
                                                repeat: currentStep === step ? Infinity : 0,
                                                repeatDelay: 1
                                            }}
                                        >
                                            {isStepActive(step) && step < currentStep ? (
                                                <Icon icon="lucide:check" className="text-base" />
                                            ) : (
                                                step
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Labels de los pasos */}
                            <div className="flex justify-between text-xs text-default-500 mb-6">
                                <span className="w-16 text-center">Inicio</span>
                                <span className="w-16 text-center">Activo</span>
                                <span className="w-16 text-center">Comprobar</span>
                                <span className="w-16 text-center">Cotizar</span>
                                <span className="w-16 text-center">Ordenar</span>
                                <span className="w-16 text-center">Fin</span>
                            </div>

                            {!procesoActivo ? (
                                // Formulario para iniciar proceso
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            type="date"
                                            label="Fecha de Inicio del Proceso"
                                            value={startDate}
                                            onValueChange={setStartDate}
                                            labelPlacement="outside"
                                            placeholder="Seleccione fecha"
                                            description="Fecha en que comienza la recepción de pedidos"
                                        />
                                        <Input
                                            type="date"
                                            label="Fecha de Término del Proceso"
                                            value={endDate}
                                            onValueChange={setEndDate}
                                            labelPlacement="outside"
                                            placeholder="Seleccione fecha"
                                            description="Fecha límite para recibir pedidos"
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button
                                            color="primary"
                                            size="lg"
                                            startContent={<Icon icon="lucide:play" />}
                                            onPress={handleIniciarProceso}
                                            isDisabled={!startDate || !endDate}
                                        >
                                            Iniciar Proceso de Pedidos
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                // Información del proceso activo y botones
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border-2 border-primary-200 dark:border-primary-800">
                                        <div>
                                            <p className="text-sm text-default-500 mb-1">Fecha de Inicio</p>
                                            <p className="font-semibold flex items-center gap-2">
                                                <Icon icon="lucide:calendar" className="text-primary" />
                                                {new Date(fechaInicioProceso!).toLocaleDateString('es-CL', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-default-500 mb-1">Fecha de Término</p>
                                            <p className="font-semibold flex items-center gap-2">
                                                <Icon icon="lucide:calendar-check" className="text-primary" />
                                                {new Date(fechaFinProceso!).toLocaleDateString('es-CL', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Contador de días con animación */}
                                    <motion.div 
                                        className={`p-4 rounded-lg text-center ${
                                            diasRestantes <= 2 
                                                ? 'bg-danger-50 dark:bg-danger-900/20 border-2 border-danger-200 dark:border-danger-800' 
                                                : diasRestantes <= 5
                                                ? 'bg-warning-50 dark:bg-warning-900/20 border-2 border-warning-200 dark:border-warning-800'
                                                : 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800'
                                        }`}
                                        animate={{
                                            scale: diasRestantes <= 2 ? [1, 1.02, 1] : 1
                                        }}
                                        transition={{
                                            duration: 1,
                                            repeat: diasRestantes <= 2 ? Infinity : 0
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-3">
                                            <Icon 
                                                icon={diasRestantes <= 2 ? "lucide:alert-circle" : "lucide:clock"} 
                                                className={`text-2xl ${
                                                    diasRestantes <= 2 ? 'text-danger' : diasRestantes <= 5 ? 'text-warning' : 'text-success'
                                                }`}
                                            />
                                            <div>
                                                <p className={`text-3xl font-bold ${
                                                    diasRestantes <= 2 ? 'text-danger' : diasRestantes <= 5 ? 'text-warning' : 'text-success'
                                                }`}>
                                                    {diasRestantes}
                                                </p>
                                                <p className="text-sm text-default-600">
                                                    {diasRestantes === 1 ? 'día restante' : 'días restantes'}
                                                </p>
                                            </div>
                                        </div>
                                        {diasRestantes <= 2 && (
                                            <p className="text-xs text-danger mt-2 font-medium">
                                                ⚠️ El proceso está por finalizar
                                            </p>
                                        )}
                                    </motion.div>
                                    
                                    <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                                        <div className="flex items-center gap-2 text-sm text-default-500">
                                            <Icon icon="lucide:info" />
                                            <span>
                                                {currentStep === 2 && 'Los pedidos están siendo recibidos actualmente'}
                                                {currentStep === 3 && 'Comprobando inventario...'}
                                                {currentStep === 4 && 'Cotizando con proveedores...'}
                                                {currentStep === 5 && 'Procesando orden de compra...'}
                                                {currentStep === 6 && 'Proceso completado'}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {/* Botón de cancelar siempre visible */}
                                            <Button
                                                color="danger"
                                                variant="light"
                                                size="sm"
                                                startContent={<Icon icon="lucide:x" />}
                                                onPress={handleCancelarProceso}
                                            >
                                                Cancelar Proceso
                                            </Button>
                                            
                                            {/* Botones para reabrir pasos completados */}
                                            {currentStep >= 3 && currentStep < 6 && comprobacionData.length > 0 && (
                                                <Button
                                                    color="primary"
                                                    variant="bordered"
                                                    size="sm"
                                                    startContent={<Icon icon="lucide:package-check" />}
                                                    onPress={onComprobacionOpen}
                                                >
                                                    Ver Comprobación
                                                </Button>
                                            )}
                                            
                                            {currentStep >= 4 && currentStep < 6 && cotizacionData.length > 0 && (
                                                <Button
                                                    color="primary"
                                                    variant="bordered"
                                                    size="sm"
                                                    startContent={<Icon icon="lucide:receipt" />}
                                                    onPress={onCotizacionOpen}
                                                >
                                                    Ver Cotización
                                                </Button>
                                            )}
                                            
                                            {currentStep >= 5 && currentStep < 6 && finalOrderData.length > 0 && (
                                                <Button
                                                    color="primary"
                                                    variant="bordered"
                                                    size="sm"
                                                    startContent={<Icon icon="lucide:file-text" />}
                                                    onPress={onFinalOpen}
                                                >
                                                    Ver Orden Final
                                                </Button>
                                            )}
                                            
                                            {/* Botón principal según el paso */}
                                            {currentStep === 2 && (
                                                <Button
                                                    color="primary"
                                                    variant="flat"
                                                    size="sm"
                                                    startContent={<Icon icon="lucide:stop-circle" />}
                                                    onPress={handleTerminarProceso}
                                                >
                                                    Terminar y Procesar
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
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

            {/* Modal de Asignaturas Activas */}
            <Modal isOpen={isAsignaturasOpen} onOpenChange={onAsignaturasOpenChange} size="2xl">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <h2 className="text-xl font-bold">Asignaturas Activas</h2>
                                <p className="text-sm text-default-500 font-normal">
                                    Total: {mockAsignaturas.length} asignaturas
                                </p>
                            </ModalHeader>
                            <ModalBody>
                                <Table 
                                    aria-label="Tabla de asignaturas activas"
                                    removeWrapper
                                >
                                    <TableHeader>
                                        <TableColumn>ASIGNATURA</TableColumn>
                                        <TableColumn>PROFESOR</TableColumn>
                                        <TableColumn>PEDIDOS/SEMANA</TableColumn>
                                        <TableColumn>ÚLTIMO PEDIDO</TableColumn>
                                    </TableHeader>
                                    <TableBody>
                                        {mockAsignaturas.map((asignatura) => (
                                            <TableRow key={asignatura.id}>
                                                <TableCell>{asignatura.nombre}</TableCell>
                                                <TableCell>{asignatura.profesor}</TableCell>
                                                <TableCell>
                                                    <Chip size="sm" color="primary" variant="flat">
                                                        {asignatura.pedidosSemanales}
                                                    </Chip>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(asignatura.ultimoPedido).toLocaleDateString('es-CL')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="primary" onPress={onClose}>
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