import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Button, 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  useDisclosure, 
  Input,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Textarea,
  Divider
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../contexts/auth-context';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// IMPORTAR SERVICIOS REALES
import { 
  obtenerTodasSolicitudesService,
  obtenerConteoSolicitudesService,
  aprobarRechazarSolicitudService,
  obtenerSolicitudesAceptadasParaPedidoService
} from '../services/solicitud-service';
import { obtenerProductos } from '../services/storage-service';
import { 
  obtenerProveedoresActivosService,
  obtenerProveedoresConPreciosService,
  IProveedor,
  IProveedorConPrecio
} from '../services/proveedor-service';
import {
  generarYDescargarTodosPDFs,
  IProductoPedido,
  IPedidoProveedor
} from '../services/pdf-service';
import { ISolicitud } from '../types/solicitud.types';
import { IProducto } from '../types/producto.types';

// IMPORTAR MODALES
import ComprobacionModal from '../components/modals/ComprobacionModal';
import CotizacionModal from '../components/modals/CotizacionModal';
import FinProcesoModal from '../components/modals/FinProcesoModal';

/**
 * Interfaces para el flujo de pedidos
 */
interface ComprobacionItem {
  id: string;
  nombre: string;
  cantidadTotal: number;
  unidad: string;
  cantidadInventario: number;
  totalEstimado: number;
  total: number;
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

interface AsignaturaConSolicitud {
  id: string;
  codigo: string;
  nombre: string;
  profesorCoordinador: string;
  solicitud: ISolicitud | null;
  totalSecciones: number;
}

const ASIGNATURAS_BASE = [
  { id: '1', codigo: 'GAS-101', nombre: 'Panadería Básica', profesorCoordinador: 'Juan Pérez García', totalSecciones: 3 },
  { id: '2', codigo: 'GAS-102', nombre: 'Pastelería Avanzada', profesorCoordinador: 'María González López', totalSecciones: 3 },
  { id: '3', codigo: 'GAS-201', nombre: 'Cocina Internacional', profesorCoordinador: 'Pedro Sánchez Ruiz', totalSecciones: 2 },
  { id: '4', codigo: 'GAS-202', nombre: 'Cocina Chilena', profesorCoordinador: 'Ana Rodríguez Silva', totalSecciones: 2 }
];

/**
 * FUNCIONES EXPORTABLES
 */
export const puedenCrearseSolicitudes = (): boolean => {
  const procesoActivo = localStorage.getItem('procesoActivo');
  const currentStep = localStorage.getItem('currentStep');
  return procesoActivo === 'true' && currentStep === '2';
};

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

export const calcularDiasRestantesProceso = (): number => {
  const fechaFin = localStorage.getItem('fechaFinProceso');
  if (!fechaFin) return 0;
  
  const ahora = new Date();
  const fechaFinDate = new Date(fechaFin);
  const diferencia = fechaFinDate.getTime() - ahora.getTime();
  const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  
  return Math.max(0, dias);
};

const COLORS_PIE = ['#F5A524', '#17C964', '#F31260', '#9ca3af'];

/**
 * Dashboard Principal
 */
const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const history = useHistory();
  
  // Estados para datos reales
  const [solicitudes, setSolicitudes] = useState<ISolicitud[]>([]);
  const [productos, setProductos] = useState<IProducto[]>([]);
  const [productosBajoStock, setProductosBajoStock] = useState<IProducto[]>([]);
  const [asignaturasConSolicitudes, setAsignaturasConSolicitudes] = useState<AsignaturaConSolicitud[]>([]);
  const [conteoSolicitudes, setConteoSolicitudes] = useState({
    pendientes: 0,
    aceptadas: 0,
    rechazadas: 0,
    total: 0
  });
  
  // Estados para el proceso de pedidos
  const [currentStep, setCurrentStep] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [procesoActivo, setProcesoActivo] = useState(false);
  const [fechaInicioProceso, setFechaInicioProceso] = useState<string | null>(null);
  const [fechaFinProceso, setFechaFinProceso] = useState<string | null>(null);
  
  // Estados para modales
  const { isOpen: isPendientesOpen, onOpen: onPendientesOpen, onOpenChange: onPendientesOpenChange } = useDisclosure();
  const { isOpen: isDetalleOpen, onOpen: onDetalleOpen, onOpenChange: onDetalleOpenChange } = useDisclosure();
  const { isOpen: isRechazarOpen, onOpen: onRechazarOpen, onOpenChange: onRechazarOpenChange } = useDisclosure();
  const { isOpen: isComprobacionOpen, onOpen: onComprobacionOpen, onOpenChange: onComprobacionOpenChange } = useDisclosure();
  const { isOpen: isCotizacionOpen, onOpen: onCotizacionOpen, onOpenChange: onCotizacionOpenChange } = useDisclosure();
  const { isOpen: isFinalOpen, onOpen: onFinalOpen, onOpenChange: onFinalOpenChange } = useDisclosure();
  
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<ISolicitud | null>(null);
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Estados para el flujo de pedidos
  const [comprobacionData, setComprobacionData] = useState<ComprobacionItem[]>([]);
  const [cotizacionData, setCotizacionData] = useState<CotizacionItem[]>([]);
  const [finalOrderData, setFinalOrderData] = useState<FinalOrder[]>([]);
  const [proveedoresDisponibles, setProveedoresDisponibles] = useState<IProveedor[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
    cargarEstadoProceso();
  }, []);

  const cargarDatos = async () => {
    try {
      setIsLoading(true);
      
      const [solicitudesData, conteo, proveedores] = await Promise.all([
        obtenerTodasSolicitudesService(),
        obtenerConteoSolicitudesService(),
        obtenerProveedoresActivosService()
      ]);
      
      setSolicitudes(solicitudesData);
      setConteoSolicitudes(conteo);
      setProveedoresDisponibles(proveedores);
      
      const productosData = obtenerProductos();
      setProductos(productosData);
      
      const bajoStock = productosData.filter(p => p.stock <= p.stockMinimo);
      setProductosBajoStock(bajoStock);
      
      const asignaturasRelacionadas: AsignaturaConSolicitud[] = ASIGNATURAS_BASE.map(asignatura => {
        const solicitud = solicitudesData.find(s => s.asignaturaId === asignatura.id) || null;
        return { ...asignatura, solicitud };
      });
      setAsignaturasConSolicitudes(asignaturasRelacionadas);
      
      console.log('✅ Datos del dashboard cargados');
      console.log('📦 Proveedores activos:', proveedores.length);
    } catch (error) {
      console.error('❌ Error al cargar datos del dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cargarEstadoProceso = () => {
    const procesoGuardado = localStorage.getItem('procesoActivo');
    const fechaInicioGuardada = localStorage.getItem('fechaInicioProceso');
    const fechaFinGuardada = localStorage.getItem('fechaFinProceso');
    const stepGuardado = localStorage.getItem('currentStep');
    
    if (procesoGuardado === 'true' && fechaInicioGuardada && fechaFinGuardada) {
      setProcesoActivo(true);
      setFechaInicioProceso(fechaInicioGuardada);
      setFechaFinProceso(fechaFinGuardada);
      setStartDate(fechaInicioGuardada);
      setEndDate(fechaFinGuardada);
      
      if (stepGuardado) {
        setCurrentStep(parseInt(stepGuardado));
      }
    }
  };

  useEffect(() => {
    if (procesoActivo) {
      localStorage.setItem('currentStep', currentStep.toString());
    }
  }, [currentStep, procesoActivo]);

  const calcularDiasRestantes = (): number => {
    if (!fechaFinProceso) return 0;
    return calcularDiasRestantesProceso();
  };

  const diasRestantes = procesoActivo ? calcularDiasRestantes() : 0;

  const datosPieChart = [
    { name: 'Pendientes', value: conteoSolicitudes.pendientes, color: COLORS_PIE[0] },
    { name: 'Aceptadas', value: conteoSolicitudes.aceptadas, color: COLORS_PIE[1] },
    { name: 'Rechazadas', value: conteoSolicitudes.rechazadas, color: COLORS_PIE[2] },
    { 
      name: 'Sin solicitud', 
      value: ASIGNATURAS_BASE.length - conteoSolicitudes.total, 
      color: COLORS_PIE[3] 
    }
  ].filter(item => item.value > 0);

  // ==================== FUNCIONES DEL PROCESO ====================

  const handleIniciarProceso = () => {
    if (!startDate || !endDate) {
      alert('⚠️ Por favor selecciona ambas fechas (inicio y término)');
      return;
    }

    const fechaInicio = new Date(startDate);
    const fechaFin = new Date(endDate);

    if (fechaFin <= fechaInicio) {
      alert('⚠️ La fecha de término debe ser posterior a la fecha de inicio');
      return;
    }

    setProcesoActivo(true);
    setFechaInicioProceso(startDate);
    setFechaFinProceso(endDate);
    setCurrentStep(2);
    
    localStorage.setItem('procesoActivo', 'true');
    localStorage.setItem('fechaInicioProceso', startDate);
    localStorage.setItem('fechaFinProceso', endDate);
    localStorage.setItem('currentStep', '2');

    console.log(`✅ Proceso iniciado desde ${startDate} hasta ${endDate}`);
    alert('✅ Proceso de pedidos iniciado. Los profesores ahora pueden crear solicitudes.');
  };

  const handleTerminarProceso = async () => {
    const solicitudesPendientes = solicitudes.filter(s => s.estado === 'Pendiente');
    
    if (solicitudesPendientes.length > 0) {
      onPendientesOpen();
      return;
    }

    if (window.confirm('¿Estás seguro de terminar el proceso de pedidos? Esto iniciará la comprobación de inventario.')) {
      await iniciarComprobacion();
    }
  };

  const handleCancelarProceso = () => {
    if (window.confirm('¿Estás seguro de cancelar el proceso completo? Se perderá todo el progreso actual.')) {
      resetearProceso();
      alert('🔄 Proceso cancelado completamente');
    }
  };

  const resetearProceso = () => {
    setCurrentStep(1);
    setComprobacionData([]);
    setCotizacionData([]);
    setFinalOrderData([]);
    setProcesoActivo(false);
    setFechaInicioProceso(null);
    setFechaFinProceso(null);
    setStartDate('');
    setEndDate('');
    
    localStorage.removeItem('procesoActivo');
    localStorage.removeItem('fechaInicioProceso');
    localStorage.removeItem('fechaFinProceso');
    localStorage.removeItem('currentStep');
  };

  // ==================== PASO 3: COMPROBACIÓN ====================

  const iniciarComprobacion = async () => {
    try {
      console.log('📦 Iniciando comprobación de inventario...');
      
      // Obtener solicitudes aceptadas
      const solicitudesAceptadas = await obtenerSolicitudesAceptadasParaPedidoService();
      console.log('✅ Solicitudes aceptadas:', solicitudesAceptadas.length);
      
      if (solicitudesAceptadas.length === 0) {
        alert('⚠️ No hay solicitudes aceptadas para procesar');
        return;
      }

      // Consolidar productos de todas las solicitudes
      const productosConsolidados = new Map<string, { nombre: string, cantidad: number, unidad: string }>();
      
      solicitudesAceptadas.forEach(solicitud => {
        solicitud.items.forEach(item => {
          const key = item.productoNombre.toLowerCase();
          if (productosConsolidados.has(key)) {
            const existente = productosConsolidados.get(key)!;
            existente.cantidad += item.cantidad;
          } else {
            productosConsolidados.set(key, {
              nombre: item.productoNombre,
              cantidad: item.cantidad,
              unidad: item.unidadMedida
            });
          }
        });
      });

      console.log('📊 Productos consolidados:', productosConsolidados.size);

      // Comparar con inventario
      const inventarioActual = obtenerProductos();
      const datosComprobacion: ComprobacionItem[] = [];

      productosConsolidados.forEach((consolidado, key) => {
        const productoInventario = inventarioActual.find(
          p => p.nombre.toLowerCase() === key
        );

        const cantidadInventario = productoInventario ? productoInventario.stock : 0;
        const totalEstimado = Math.max(0, consolidado.cantidad - cantidadInventario);

        datosComprobacion.push({
          id: key,
          nombre: consolidado.nombre,
          cantidadTotal: consolidado.cantidad,
          unidad: consolidado.unidad,
          cantidadInventario,
          totalEstimado,
          total: totalEstimado
        });
      });

      console.log('✅ Datos de comprobación preparados:', datosComprobacion.length);
      
      setComprobacionData(datosComprobacion);
      setCurrentStep(3);
      onComprobacionOpen();
      
    } catch (error) {
      console.error('❌ Error en comprobación:', error);
      alert('Error al iniciar la comprobación de inventario');
    }
  };

  const handleAceptarComprobacion = async (data: ComprobacionItem[]) => {
    try {
      console.log('✅ Comprobación aceptada');
      onComprobacionOpenChange();
      
      // Filtrar solo productos que necesitan ser comprados
      const productosFaltantes = data.filter(p => p.total > 0);
      
      if (productosFaltantes.length === 0) {
        alert('✅ No hay productos faltantes. El inventario cubre todas las solicitudes.');
        setCurrentStep(6);
        setTimeout(() => resetearProceso(), 2000);
        return;
      }

      console.log('🔍 Buscando proveedores para', productosFaltantes.length, 'productos...');
      
      // Obtener proveedores con precios para cada producto
      const nombresProductos = productosFaltantes.map(p => p.nombre);
      const cotizaciones = await obtenerProveedoresConPreciosService(nombresProductos);
      
      const datosCotizacion: CotizacionItem[] = [];
      
      productosFaltantes.forEach(producto => {
        const proveedoresProducto = cotizaciones.get(producto.nombre) || [];
        
        if (proveedoresProducto.length === 0) {
          console.warn(`⚠️ No hay proveedores para: ${producto.nombre}`);
        }

        datosCotizacion.push({
          producto: producto.nombre,
          cantidadNecesaria: producto.total,
          proveedores: proveedoresProducto.map(p => ({
            nombre: p.proveedorNombre,
            precio: p.precio
          })),
          selectedProveedor: proveedoresProducto[0]?.proveedorNombre // Seleccionar el más barato por defecto
        });
      });

      console.log('💰 Cotizaciones preparadas:', datosCotizacion.length);
      
      setCotizacionData(datosCotizacion);
      setCurrentStep(4);
      onCotizacionOpen();
      
    } catch (error) {
      console.error('❌ Error al procesar comprobación:', error);
      alert('Error al buscar proveedores');
    }
  };

  const handleRechazarComprobacion = () => {
    onComprobacionOpenChange();
  };

  // ==================== PASO 4: COTIZACIÓN ====================

  const handleHacerPedido = (data: CotizacionItem[]) => {
    try {
      console.log('📝 Generando orden de compra...');
      
      const ordenFinal: FinalOrder[] = data.map(item => {
        const proveedorSeleccionado = item.proveedores.find(p => p.nombre === item.selectedProveedor);
        const precioTotal = proveedorSeleccionado ? proveedorSeleccionado.precio * item.cantidadNecesaria : 0;
        
        return {
          producto: item.producto,
          cantidad: item.cantidadNecesaria,
          proveedor: item.selectedProveedor || 'N/A',
          precioTotal
        };
      });

      setFinalOrderData(ordenFinal);
      onCotizacionOpenChange();
      setCurrentStep(5);
      onFinalOpen();
      
      console.log('✅ Orden final generada con', ordenFinal.length, 'productos');
      
    } catch (error) {
      console.error('❌ Error al generar pedido:', error);
      alert('Error al generar la orden de compra');
    }
  };

  const handleRechazarCotizacion = () => {
    onCotizacionOpenChange();
  };

// ==================== PASO 5: ORDEN FINAL ====================

const handleGenerarYDescargarPDFs = async () => {
  try {
    console.log('📄 Generando PDFs...');
    
    // Preparar datos para PDFs
    const productosPDF: IProductoPedido[] = finalOrderData.map(item => {
      const proveedorInfo = proveedoresDisponibles.find(p => p.nombre === item.proveedor);
      const productoProveedor = proveedorInfo?.productos.find(
        p => p.productoNombre === item.producto
      );

      return {
        productoNombre: item.producto,
        cantidad: item.cantidad,
        unidadMedida: productoProveedor?.unidadMedida || 'unidad',
        proveedorNombre: item.proveedor,
        precioUnitario: productoProveedor?.precio || 0,
        precioTotal: item.precioTotal
      };
    });

    // Agrupar por proveedor para PDFs individuales
    const pedidosPorProveedor = new Map<string, IPedidoProveedor>();
    
    productosPDF.forEach(producto => {
      if (!pedidosPorProveedor.has(producto.proveedorNombre)) {
        const proveedorInfo = proveedoresDisponibles.find(p => p.nombre === producto.proveedorNombre);
        
        pedidosPorProveedor.set(producto.proveedorNombre, {
          proveedorNombre: producto.proveedorNombre,
          proveedorContacto: proveedorInfo?.contacto || 'N/A',
          proveedorTelefono: proveedorInfo?.telefono || 'N/A',
          proveedorEmail: proveedorInfo?.email || 'N/A',
          proveedorDireccion: proveedorInfo?.direccion || 'N/A',
          productos: [],
          totalPedido: 0
        });
      }

      const pedido = pedidosPorProveedor.get(producto.proveedorNombre)!;
      pedido.productos.push({
        productoNombre: producto.productoNombre,
        cantidad: producto.cantidad,
        unidadMedida: producto.unidadMedida,
        precioUnitario: producto.precioUnitario,
        precioTotal: producto.precioTotal
      });
      pedido.totalPedido += producto.precioTotal;
    });

    const pedidosArray = Array.from(pedidosPorProveedor.values());

    // Generar y descargar todos los PDFs
    generarYDescargarTodosPDFs(productosPDF, pedidosArray, new Date().toISOString());

    console.log('✅ PDFs generados exitosamente');
    alert('✅ PDFs generados y descargados. Revisa tu carpeta de descargas.');

    // Cerrar modal y avanzar al paso 6
    onFinalOpenChange();
    setCurrentStep(6);
    
    setTimeout(() => {
      resetearProceso();
      alert('✅ Proceso completado exitosamente. El sistema está listo para un nuevo ciclo de pedidos.');
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error al generar PDFs:', error);
    alert('Error al generar los documentos PDF');
  }
};

const handleCerrarModalFinal = () => {
  // Simplemente cerrar el modal sin generar PDFs
  onFinalOpenChange();
};

  // ==================== GESTIÓN DE SOLICITUDES ====================

  const verDetalleSolicitud = (solicitud: ISolicitud) => {
    setSolicitudSeleccionada(solicitud);
    onDetalleOpen();
  };

  const abrirModalAprobar = (solicitud: ISolicitud) => {
    setSolicitudSeleccionada(solicitud);
    handleAprobarSolicitud(solicitud.id);
  };

  const abrirModalRechazar = (solicitud: ISolicitud) => {
    setSolicitudSeleccionada(solicitud);
    setComentarioRechazo('');
    onRechazarOpen();
  };

  const handleAprobarSolicitud = async (solicitudId: string) => {
    try {
      if (!user) return;
      
      await aprobarRechazarSolicitudService({
        solicitudId,
        estado: 'Aceptada',
        aprobadoPor: user.id || user.nombre
      });

      await cargarDatos();
      alert('✅ Solicitud aprobada correctamente');
    } catch (error: any) {
      console.error('❌ Error al aprobar solicitud:', error);
      alert(error.message || 'Error al aprobar la solicitud');
    }
  };

  const handleRechazarSolicitud = async () => {
    try {
      if (!user || !solicitudSeleccionada) return;
      
      if (!comentarioRechazo.trim()) {
        alert('⚠️ Debes especificar un motivo de rechazo');
        return;
      }

      await aprobarRechazarSolicitudService({
        solicitudId: solicitudSeleccionada.id,
        estado: 'Rechazada',
        comentarioRechazo: comentarioRechazo.trim(),
        aprobadoPor: user.id || user.nombre
      });

      await cargarDatos();
      onRechazarOpenChange();
      setSolicitudSeleccionada(null);
      setComentarioRechazo('');
      alert('✅ Solicitud rechazada');
    } catch (error: any) {
      console.error('❌ Error al rechazar solicitud:', error);
      alert(error.message || 'Error al rechazar la solicitud');
    }
  };

  const renderEstadoSolicitud = (estado: string | null) => {
    if (!estado) return <Chip size="sm" variant="flat">Sin solicitud</Chip>;
    
    switch (estado) {
      case 'Pendiente':
        return <Chip color="warning" size="sm">{estado}</Chip>;
      case 'Aceptada':
        return <Chip color="success" size="sm">{estado}</Chip>;
      case 'Rechazada':
        return <Chip color="danger" size="sm">{estado}</Chip>;
      default:
        return <Chip size="sm">{estado}</Chip>;
    }
  };

  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'Pendiente');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen py-8">
      <div className="container mx-auto px-4 space-y-6">
        {/* Encabezado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
          <p className="text-default-500">
            Bienvenido, <span className="font-medium">{user?.nombre}</span>
          </p>
        </motion.div>

        {/* PROCESO DE PEDIDOS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="shadow-md border-2 border-primary-200">
            <CardHeader className="pb-0 pt-4 px-4">
              <div className="flex justify-between items-start w-full">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Icon icon="lucide:calendar-clock" className="text-primary" />
                    Proceso de Pedidos
                  </h3>
                  <p className="text-default-500 text-sm">Estado actual del flujo de trabajo</p>
                </div>
                {procesoActivo && fechaInicioProceso && fechaFinProceso && (
                  <Chip 
                    color={diasRestantes <= 2 ? "danger" : diasRestantes <= 5 ? "warning" : "success"} 
                    variant="flat"
                    size="lg"
                    startContent={<Icon icon="lucide:clock" />}
                  >
                    {diasRestantes === 0 ? 'Último día' : `${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`}
                  </Chip>
                )}
              </div>
            </CardHeader>
            <CardBody className="px-4 pb-4">
              {/* Barra de progreso */}
              <div className="relative h-2 bg-default-200 rounded-full my-6">
                <motion.div 
                  className="absolute h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep - 1) / 5) * 100}%` }}
                  transition={{ duration: 0.8 }}
                />
                
                <div className="flex justify-between items-center absolute w-full -top-3">
                  {[1, 2, 3, 4, 5, 6].map((step) => (
                    <motion.div 
                      key={step}
                      className={`w-10 h-10 rounded-full border-3 flex items-center justify-center text-xs font-bold z-10 shadow-lg ${
                        currentStep >= step
                          ? 'bg-primary-500 border-primary-500 text-white' 
                          : 'bg-white dark:bg-zinc-800 border-default-300 text-default-500'
                      }`}
                      animate={{ 
                        scale: currentStep === step ? [1, 1.1, 1] : 1
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: currentStep === step ? Infinity : 0,
                        repeatDelay: 1
                      }}
                    >
                      {currentStep > step ? (
                        <Icon icon="lucide:check" className="text-base" />
                      ) : (
                        step
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between text-xs text-default-500 mb-6">
                <span className="w-16 text-center">Inicio</span>
                <span className="w-16 text-center">Activo</span>
                <span className="w-16 text-center">Comprobar</span>
                <span className="w-16 text-center">Cotizar</span>
                <span className="w-16 text-center">Ordenar</span>
                <span className="w-16 text-center">Fin</span>
              </div>

              {!procesoActivo ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      type="date"
                      label="Fecha de Inicio"
                      value={startDate}
                      onValueChange={setStartDate}
                      description="Inicio de recepción de solicitudes"
                    />
                    <Input
                      type="date"
                      label="Fecha de Término"
                      value={endDate}
                      onValueChange={setEndDate}
                      description="Fecha límite para solicitudes"
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
                <div className="space-y-4">
                  {solicitudesPendientes.length > 0 && currentStep === 2 && (
                    <motion.div
                      initial={{ scale: 0.95 }}
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="p-4 bg-warning-50 dark:bg-warning-900/20 border-2 border-warning-500 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Icon icon="lucide:alert-triangle" className="text-warning text-2xl" />
                        <div className="flex-1">
                          <p className="font-semibold text-warning-700 dark:text-warning-400">
                            ⚠️ {solicitudesPendientes.length} solicitud{solicitudesPendientes.length !== 1 ? 'es' : ''} pendiente{solicitudesPendientes.length !== 1 ? 's' : ''} de revisar
                          </p>
                          <p className="text-sm text-warning-600 dark:text-warning-500">
                            Debes aprobar o rechazar todas las solicitudes antes de cerrar el proceso
                          </p>
                        </div>
                        <Button
                          color="warning"
                          variant="flat"
                          onPress={onPendientesOpen}
                          startContent={<Icon icon="lucide:eye" />}
                        >
                          Ver Pendientes
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200">
                    <div>
                      <p className="text-sm text-default-500 mb-1">Fecha de Inicio</p>
                      <p className="font-semibold">{new Date(fechaInicioProceso!).toLocaleDateString('es-CL')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-default-500 mb-1">Fecha de Término</p>
                      <p className="font-semibold">{new Date(fechaFinProceso!).toLocaleDateString('es-CL')}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-default-500">
                      {currentStep === 2 && 'Recepción de solicitudes activa'}
                      {currentStep === 3 && 'Comprobando inventario...'}
                      {currentStep === 4 && 'Cotizando con proveedores...'}
                      {currentStep === 5 && 'Procesando orden de compra...'}
                      {currentStep === 6 && 'Proceso completado'}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        color="danger"
                        variant="light"
                        size="sm"
                        onPress={handleCancelarProceso}
                      >
                        Cancelar
                      </Button>
                      
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
                      
                      {currentStep === 2 && (
                        <Button
                          color="primary"
                          size="sm"
                          startContent={<Icon icon="lucide:check-circle" />}
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
        </motion.div>

        {/* TARJETAS DE ESTADÍSTICAS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <Card 
            className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" 
            isPressable
            onPress={() => solicitudesPendientes.length > 0 && onPendientesOpen()}
          >
            <CardBody className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center mx-auto mb-2">
                <Icon icon="lucide:clock" className="text-warning text-2xl" />
              </div>
              <p className="text-sm text-default-500">Pendientes</p>
              <p className="text-3xl font-bold text-warning">{conteoSolicitudes.pendientes}</p>
            </CardBody>
          </Card>

          <Card className="shadow-sm">
            <CardBody className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mx-auto mb-2">
                <Icon icon="lucide:check-circle" className="text-success text-2xl" />
              </div>
              <p className="text-sm text-default-500">Aceptadas</p>
              <p className="text-3xl font-bold text-success">{conteoSolicitudes.aceptadas}</p>
            </CardBody>
          </Card>

          <Card className="shadow-sm">
            <CardBody className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center mx-auto mb-2">
                <Icon icon="lucide:x-circle" className="text-danger text-2xl" />
              </div>
              <p className="text-sm text-default-500">Rechazadas</p>
              <p className="text-3xl font-bold text-danger">{conteoSolicitudes.rechazadas}</p>
            </CardBody>
          </Card>

          <Card 
            className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" 
            isPressable
            onPress={() => history.push('/inventario')}
          >
            <CardBody className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-2">
                <Icon icon="lucide:package" className="text-primary text-2xl" />
              </div>
              <p className="text-sm text-default-500">Stock Bajo</p>
              <p className="text-3xl font-bold text-primary">{productosBajoStock.length}</p>
            </CardBody>
          </Card>
        </motion.div>

        {/* TABLA Y GRÁFICO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card className="shadow-sm h-full">
              <CardHeader className="pb-0 pt-4 px-4">
                <h3 className="text-lg font-semibold">Asignaturas y Sus Solicitudes</h3>
              </CardHeader>
              <CardBody className="px-4 pb-4">
                <Table removeWrapper aria-label="Tabla de asignaturas">
                  <TableHeader>
                    <TableColumn>ASIGNATURA</TableColumn>
                    <TableColumn>PROFESOR</TableColumn>
                    <TableColumn>ESTADO</TableColumn>
                    <TableColumn>ACCIONES</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="No hay asignaturas registradas">
                    {asignaturasConSolicitudes.map((asignatura) => (
                      <TableRow key={asignatura.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{asignatura.nombre}</p>
                            <p className="text-xs text-default-400">{asignatura.codigo}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{asignatura.profesorCoordinador}</p>
                        </TableCell>
                        <TableCell>
                          {renderEstadoSolicitud(asignatura.solicitud?.estado || null)}
                        </TableCell>
                        <TableCell>
                          {asignatura.solicitud ? (
                            <div className="flex gap-2">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => verDetalleSolicitud(asignatura.solicitud!)}
                              >
                                <Icon icon="lucide:eye" className="text-primary" />
                              </Button>
                              {asignatura.solicitud.estado === 'Pendiente' && (
                                <>
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    color="success"
                                    onPress={() => abrirModalAprobar(asignatura.solicitud!)}
                                  >
                                    <Icon icon="lucide:check" />
                                  </Button>
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    color="danger"
                                    onPress={() => abrirModalRechazar(asignatura.solicitud!)}
                                  >
                                    <Icon icon="lucide:x" />
                                  </Button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-default-400">Sin solicitud</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className="shadow-sm h-full">
              <CardHeader className="pb-0 pt-4 px-4">
                <h3 className="text-lg font-semibold">Distribución por Estado</h3>
              </CardHeader>
              <CardBody className="px-4 pb-4">
                {datosPieChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={datosPieChart}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {datosPieChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-default-400">
                    Sin datos para mostrar
                  </div>
                )}
                
                <Divider className="my-4" />
                
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold mb-2">Resumen</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-default-500">Total Asignaturas:</span>
                    <span className="font-semibold">{ASIGNATURAS_BASE.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-default-500">Con Solicitud:</span>
                    <span className="font-semibold">{conteoSolicitudes.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-default-500">Sin Solicitud:</span>
                    <span className="font-semibold">{ASIGNATURAS_BASE.length - conteoSolicitudes.total}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        </div>

        {/* PRODUCTOS CON STOCK BAJO */}
        {productosBajoStock.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="shadow-sm">
              <CardHeader className="pb-0 pt-4 px-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">⚠️ Productos con Stock Bajo</h3>
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  onPress={() => history.push('/inventario')}
                  endContent={<Icon icon="lucide:arrow-right" />}
                >
                  Ver Inventario
                </Button>
              </CardHeader>
              <CardBody className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {productosBajoStock.slice(0, 8).map((producto) => (
                    <div 
                      key={producto.id}
                      className="p-3 border border-danger-200 rounded-lg bg-danger-50 dark:bg-danger-900/10"
                    >
                      <p className="font-medium text-sm">{producto.nombre}</p>
                      <p className="text-xs text-danger-600 dark:text-danger-400">
                        {producto.stock} {producto.unidadMedida} (Mín: {producto.stockMinimo})
                      </p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </div>

      {/* MODALES */}
      
      {/* Modal: Solicitudes Pendientes */}
      <Modal 
        isOpen={isPendientesOpen} 
        onOpenChange={onPendientesOpenChange}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Icon icon="lucide:alert-triangle" className="text-warning" />
                    Solicitudes Pendientes
                  </h2>
                  <p className="text-sm text-default-500 font-normal">
                    {solicitudesPendientes.length} solicitud{solicitudesPendientes.length !== 1 ? 'es' : ''} requiere{solicitudesPendientes.length === 1 ? '' : 'n'} tu revisión
                  </p>
                </div>
              </ModalHeader>
              <ModalBody>
                <Table removeWrapper aria-label="Solicitudes pendientes">
                  <TableHeader>
                    <TableColumn>ASIGNATURA</TableColumn>
                    <TableColumn>PROFESOR</TableColumn>
                    <TableColumn>FECHA</TableColumn>
                    <TableColumn>ACCIONES</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="No hay solicitudes pendientes">
                    {solicitudesPendientes.map((solicitud) => (
                      <TableRow key={solicitud.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{solicitud.asignaturaNombre}</p>
                            {solicitud.recetaNombre && (
                              <p className="text-xs text-default-400">{solicitud.recetaNombre}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{solicitud.profesorNombre}</TableCell>
                        <TableCell>
                          {new Date(solicitud.fechaCreacion).toLocaleDateString('es-CL')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="flat"
                              onPress={() => verDetalleSolicitud(solicitud)}
                            >
                              Ver
                            </Button>
                            <Button
                              size="sm"
                              color="success"
                              onPress={() => {
                                handleAprobarSolicitud(solicitud.id);
                                if (solicitudesPendientes.length === 1) {
                                  onClose();
                                }
                              }}
                            >
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              color="danger"
                              onPress={() => {
                                setSolicitudSeleccionada(solicitud);
                                onRechazarOpen();
                              }}
                            >
                              Rechazar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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

      {/* Modal: Detalle de Solicitud */}
      <Modal isOpen={isDetalleOpen} onOpenChange={onDetalleOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Detalle de Solicitud</ModalHeader>
              <ModalBody>
                {solicitudSeleccionada && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-default-500">Asignatura</p>
                        <p className="font-semibold">{solicitudSeleccionada.asignaturaNombre}</p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Profesor</p>
                        <p className="font-semibold">{solicitudSeleccionada.profesorNombre}</p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Estado</p>
                        {renderEstadoSolicitud(solicitudSeleccionada.estado)}
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Fecha de Clase</p>
                        <p className="font-semibold">
                          {new Date(solicitudSeleccionada.fecha).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                    </div>

                    {solicitudSeleccionada.recetaNombre && (
                      <div>
                        <p className="text-sm text-default-500">Receta Base</p>
                        <p className="font-semibold">{solicitudSeleccionada.recetaNombre}</p>
                      </div>
                    )}

                    <Divider />

                    <div>
                      <p className="font-semibold mb-2">Productos Solicitados</p>
                      <Table removeWrapper aria-label="Productos">
                        <TableHeader>
                          <TableColumn>PRODUCTO</TableColumn>
                          <TableColumn>CANTIDAD</TableColumn>
                          <TableColumn>TIPO</TableColumn>
                        </TableHeader>
                        <TableBody>
                          {solicitudSeleccionada.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.productoNombre}</TableCell>
                              <TableCell>
                                {item.cantidad} {item.unidadMedida}
                              </TableCell>
                              <TableCell>
                                {item.esAdicional ? (
                                  <Chip size="sm" color="warning" variant="flat">Adicional</Chip>
                                ) : (
                                  <Chip size="sm" variant="flat">Receta</Chip>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {solicitudSeleccionada.observaciones && (
                      <>
                        <Divider />
                        <div>
                          <p className="text-sm text-default-500 mb-1">Observaciones</p>
                          <p className="text-sm">{solicitudSeleccionada.observaciones}</p>
                        </div>
                      </>
                    )}

                    {solicitudSeleccionada.comentarioRechazo && (
                      <>
                        <Divider />
                        <div className="bg-danger-50 dark:bg-danger-900/20 p-3 rounded-lg">
                          <p className="text-sm text-danger-600 dark:text-danger-400 font-medium mb-1">
                            Motivo de Rechazo:
                          </p>
                          <p className="text-sm">{solicitudSeleccionada.comentarioRechazo}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Cerrar
                </Button>
                {solicitudSeleccionada?.estado === 'Pendiente' && (
                  <>
                    <Button 
                      color="danger"
                      onPress={() => {
                        onClose();
                        onRechazarOpen();
                      }}
                    >
                      Rechazar
                    </Button>
                    <Button 
                      color="success"
                      onPress={() => {
                        handleAprobarSolicitud(solicitudSeleccionada.id);
                        onClose();
                      }}
                    >
                      Aprobar
                    </Button>
                  </>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: Rechazar Solicitud */}
      <Modal isOpen={isRechazarOpen} onOpenChange={onRechazarOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:x-circle" className="text-danger" />
                  Rechazar Solicitud
                </div>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-500 mb-4">
                  Estás a punto de rechazar la solicitud de <strong>{solicitudSeleccionada?.profesorNombre}</strong> para <strong>{solicitudSeleccionada?.asignaturaNombre}</strong>.
                </p>
                <Textarea
                  label="Motivo del Rechazo"
                  placeholder="Explica por qué se rechaza esta solicitud..."
                  value={comentarioRechazo}
                  onValueChange={setComentarioRechazo}
                  minRows={4}
                  isRequired
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Cancelar
                </Button>
                <Button 
                  color="danger"
                  onPress={handleRechazarSolicitud}
                  isDisabled={!comentarioRechazo.trim()}
                >
                  Rechazar Solicitud
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* MODALES DEL PROCESO */}
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
        onClose={handleCerrarModalFinal}
        onGenerarPDFs={handleGenerarYDescargarPDFs}
        finalOrderData={finalOrderData}
        />
    </div>
  );
};

export default DashboardPage;