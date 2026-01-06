/**
 * DASHBOARD PARA ADMINISTRADORES
 * Vista completa con proceso de pedidos y gestión de solicitudes
 */

import React, { useState, useEffect } from 'react';
import {
  Card, CardBody, CardHeader, Button, Table, TableBody, TableHeader, TableColumn, TableRow, TableCell,
  Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem, Textarea, Divider
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useHistory } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useToast, useConfirm } from '../../hooks/useToast';
import { logger } from '../../utils/logger';
import {
  cargarDashboardAdmin,
  obtenerEstadoProceso,
  calcularDiasRestantesProceso,
} from '../../services/dashboard-service';
import {
  aprobarRechazarSolicitudService,
  obtenerSolicitudesAceptadasParaPedidoService,
  obtenerTodasSolicitudesService
} from '../../services/solicitud-service';
import {
  obtenerProveedoresConPreciosService,
  IProveedor
} from '../../services/proveedor-service';
import { obtenerProductos } from '../../services/storage-service';
import { DashboardHeader } from './shared/DashboardHeader';
import { StatsCard } from './shared/StatsCard';
import { EstadoSolicitudChip } from './shared/EstadoSolicitudChip';
import { ProcesoPedidosSection } from './ProcesoPedidosSection';
import ComprobacionModal from '../modals/ComprobacionModal';
import CotizacionModal from '../modals/CotizacionModal';
import FinProcesoModal from '../modals/FinProcesoModal';
import { SolicitudBoardModal } from '../modals/SolicitudBoardModal';
import { ISolicitud, EstadoSolicitud } from '../../types/solicitud.types';
import { IProducto } from '../../types/producto.types';
import { useAuth } from '../../contexts/auth-context';
import { useDisclosure } from '@heroui/react';
import {
  crearPedidoService,
  marcarPedidoComoCanceladoService,
  marcarPedidoComoCompletadoService,
  sincronizarSolicitudesPedidoService,
  obtenerPedidoPorIdService,
} from '../../services/pedido-service';

const getFirstSelectionValue = (keys: any): string | undefined => {
  if (!keys || keys === 'all') return undefined;
  const firstKey = Array.from(keys as Set<React.Key>)[0];
  return firstKey != null ? String(firstKey) : undefined;
};

const COLORS_PIE = ['#F5A524', '#17C964', '#F31260', '#9ca3af'];

// Interfaces para el flujo de pedidos
interface ComprobacionItem {
  id: string;
  nombre: string;
  cantidadTotal: number;
  unidad: string;
  cantidadInventario: number;
  totalEstimado: number;
  total: number;
}

interface CotizacionItem {
  producto: string;
  cantidadNecesaria: number;
  proveedores: { nombre: string; precio: number }[];
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

export const DashboardAdmin: React.FC = () => {
  const { user } = useAuth();
  const history = useHistory();
  const toast = useToast();
  const confirm = useConfirm();

  // Estados de datos
  const [solicitudes, setSolicitudes] = useState<ISolicitud[]>([]);
  const [productos, setProductos] = useState<IProducto[]>([]);
  const [productosBajoStock, setProductosBajoStock] = useState<IProducto[]>([]);
  // Estados del proceso
  const [estadoProceso, setEstadoProceso] = useState(obtenerEstadoProceso());
  const [semanaSeleccionada, setSemanaSeleccionada] = useState<number | null>(estadoProceso.semanaSeleccionada);

  // Estados para modales
  const { isOpen: isPendientesOpen, onOpen: onPendientesOpen, onOpenChange: onPendientesOpenChange } = useDisclosure();
  const { isOpen: isDetalleOpen, onOpen: onDetalleOpen, onOpenChange: onDetalleOpenChange } = useDisclosure();
  const { isOpen: isRechazarOpen, onOpen: onRechazarOpen, onOpenChange: onRechazarOpenChange } = useDisclosure();
  const { isOpen: isComprobacionOpen, onOpen: onComprobacionOpen, onOpenChange: onComprobacionOpenChange } = useDisclosure();
  const { isOpen: isCotizacionOpen, onOpen: onCotizacionOpen, onOpenChange: onCotizacionOpenChange } = useDisclosure();
  const { isOpen: isFinalOpen, onOpen: onFinalOpen, onOpenChange: onFinalOpenChange } = useDisclosure();
  const { isOpen: isBoardOpen, onOpen: onBoardOpen, onOpenChange: onBoardOpenChange } = useDisclosure();
  const [allSolicitudesBoard, setAllSolicitudesBoard] = useState<ISolicitud[]>([]);

  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<ISolicitud | null>(null);
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  const [comentarioAdministrador, setComentarioAdministrador] = useState('');
  const [semanaAprobacion, setSemanaAprobacion] = useState<number | null>(null);
  const [modoDetalle, setModoDetalle] = useState<'view' | 'approve'>('view');
  const [isAprobando, setIsAprobando] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const semanaAprobacionSelectedKeys = React.useMemo(
    () => (semanaAprobacion !== null ? new Set([semanaAprobacion.toString()]) : new Set<string>()),
    [semanaAprobacion]
  );

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
      const data = await cargarDashboardAdmin();

      setSolicitudes(data.solicitudes);
      setProductos(data.productos);
      setProductosBajoStock(data.productosBajoStock);

      // Mapear asignaturas con solicitudes
      logger.log('✅ Datos del dashboard cargados');
    } catch (error) {
      logger.error('❌ Error al cargar datos del dashboard:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const cargarEstadoProceso = () => {
    const estado = obtenerEstadoProceso();
    setEstadoProceso(estado);
    setSemanaSeleccionada(estado.semanaSeleccionada);
  };

  // Función para iniciar proceso
  const handleIniciarProceso = async () => {
    if (estadoProceso.activo) {
      toast.info('Ya existe un proceso de pedidos en curso.');
      return;
    }

    if (semanaSeleccionada === null) {
      toast.warning('Por favor selecciona la semana que deseas procesar');
      return;
    }

    if (!user) {
      toast.error('No se encontró información del usuario autenticado.');
      return;
    }

    try {
      const pedido = await crearPedidoService({
        semana: semanaSeleccionada,
        creadoPor: user.id || user.nombre,
        creadoPorNombre: user.nombre,
      });

      localStorage.setItem('procesoActivo', 'true');
      localStorage.setItem('procesoSemana', semanaSeleccionada.toString());
      localStorage.setItem('currentStep', '2');
      localStorage.setItem('procesoPedidoId', pedido.id);

      setEstadoProceso({
        activo: true,
        paso: 2,
        semanaSeleccionada,
        pedidoId: pedido.id,
      });

      logger.log(`✅ Proceso iniciado para la semana ${semanaSeleccionada} (pedido ${pedido.id})`);
      toast.success(`Proceso de pedidos iniciado para la semana ${semanaSeleccionada}.`);
    } catch (error) {
      logger.error('❌ Error al iniciar el proceso de pedidos:', error);
      toast.error('No se pudo iniciar el proceso de pedidos. Intenta nuevamente.');
    }
  };

  // NEW: Function to prepare and open the board
  const handleIniciarProcesoBoard = async () => {
    console.log('🚀 handleIniciarProcesoBoard started');
    if (estadoProceso.activo) {
      toast.info('Ya existe un proceso de pedidos en curso.');
      return;
    }

    console.log('❓ Requesting confirmation...');
    const confirmResult = await confirm('¿Deseas iniciar un nuevo proceso de pedido semanal?');
    console.log('✅ Confirmation result:', confirmResult);

    if (!confirmResult) return;

    try {
      console.log('🔄 Fetching accepted requests...');
      setIsLoading(true);
      // Fetch ALL requests (or maybe just accepted ones? User said "pool de solicitudes agregadas", implies picking from accepted pending ones)
      // Ideally we pick 'Aceptada' requests that haven't been processed yet.
      const all = await obtenerSolicitudesAceptadasParaPedidoService();
      console.log('📦 Fetched requests:', all.length);
      setAllSolicitudesBoard(all);
      console.log('🔓 Opening Board Modal...');
      onBoardOpen();
      console.log('✅ Board Modal Open Signal Sent');
    } catch (error) {
      console.error('❌ Error in handleIniciarProcesoBoard:', error);
      toast.error('Error al cargar solicitudes para el tablero');
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Handle board confirmation
  const handleSolicitudClickFromBoard = (solicitud: ISolicitud) => {
    verDetalleSolicitud(solicitud);
  };

  const handleConfirmBoard = async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;

    onBoardOpenChange(); // Close board

    try {
      setIsLoading(true);
      // We need a "Week" for the order. I'll pick the most frequent week in the selection or default to current.
      // For now, let's use the current week number relative to start of year or just '1' if generic.
      // But `crearPedidoService` validates 1-18.
      // Let's find the week of the first selected item.
      const selectedReqs = allSolicitudesBoard.filter(s => selectedIds.includes(s.id));
      const primaryWeek = selectedReqs[0]?.semana || 1;

      if (!user) return;

      // 1. Create the Order
      const pedido = await crearPedidoService({
        semana: primaryWeek, // Using the first week found as the "label" week
        creadoPor: user.id || user.nombre,
        creadoPorNombre: user.nombre,
        comentario: `Pedido generado desde tablero con ${selectedIds.length} solicitudes.`
      });

      // 2. Link the selected requests to this order
      await sincronizarSolicitudesPedidoService(pedido.id, selectedIds);

      // 3. Update Local State & Storage
      localStorage.setItem('procesoActivo', 'true');
      localStorage.setItem('procesoSemana', primaryWeek.toString());
      localStorage.setItem('currentStep', '2');
      localStorage.setItem('procesoPedidoId', pedido.id);

      setEstadoProceso({
        activo: true,
        paso: 2,
        semanaSeleccionada: primaryWeek,
        pedidoId: pedido.id,
      });

      setSemanaSeleccionada(primaryWeek);
      toast.success(`Proceso iniciado con ${selectedIds.length} solicitudes.`);
      logger.log(`✅ Proceso board iniciado. Pedido ${pedido.id}`);

    } catch (error) {
      logger.error('Error creando pedido desde board', error);
      toast.error('Ocurrió un error al crear el pedido.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para terminar proceso
  const handleTerminarProceso = async () => {
    if (!estadoProceso.semanaSeleccionada) {
      toast.warning('Selecciona una semana para procesar las solicitudes.');
      return;
    }

    const solicitudesPendientes = solicitudes.filter(
      s => s.estado === 'Pendiente' && s.semana === estadoProceso.semanaSeleccionada
    );

    if (solicitudesPendientes.length > 0) {
      onPendientesOpen();
      return;
    }

    const result = await confirm('¿Estás seguro de terminar el proceso de pedidos? Esto iniciará la comprobación de inventario.');
    if (result) {
      await iniciarComprobacion();
    }
  };

  // Función para cancelar proceso
  const handleCancelarProceso = async () => {
    const result = await confirm('¿Estás seguro de cancelar el proceso completo? Se perderá todo el progreso actual.');
    if (result) {
      const pedidoId = estadoProceso.pedidoId;
      if (pedidoId) {
        try {
          await marcarPedidoComoCanceladoService(pedidoId);
        } catch (error) {
          logger.error('❌ Error al marcar pedido como cancelado:', error);
        }
      }
      resetearProceso();
      toast.info('Proceso cancelado completamente');
    }
  };

  const resetearProceso = () => {
    setComprobacionData([]);
    setCotizacionData([]);
    setFinalOrderData([]);
    setEstadoProceso({
      activo: false,
      paso: 1,
      semanaSeleccionada: null,
      pedidoId: null,
    });
    setSemanaSeleccionada(null);

    localStorage.removeItem('procesoActivo');
    localStorage.removeItem('procesoSemana');
    localStorage.removeItem('currentStep');
    localStorage.removeItem('procesoPedidoId');
  };

  // Función para iniciar comprobación
  const iniciarComprobacion = async () => {
    try {
      logger.log('📦 Iniciando comprobación de inventario...');

      const solicitudesAceptadas = await obtenerSolicitudesAceptadasParaPedidoService();
      let solicitudesSeleccionadas: ISolicitud[] = [];

      // Logic updated to support "Board Selection" which links specific requests to the order
      if (estadoProceso.pedidoId) {
        try {
          // Fetch the order to get the linked request IDs
          const pedido = await obtenerPedidoPorIdService(estadoProceso.pedidoId);

          if (pedido && pedido.solicitudesAsociadas && pedido.solicitudesAsociadas.length > 0) {
            // ✅ Modern Flow: Use requests explicitly selected in Board
            console.log('📦 Using requests from Order:', pedido.solicitudesAsociadas.length);
            solicitudesSeleccionadas = solicitudesAceptadas.filter(s =>
              pedido.solicitudesAsociadas.includes(s.id)
            );
          } else {
            // ⚠️ Legacy/Fallback: If no requests linked, use Week logic and Sync
            console.log('⚠️ No linked requests, using Week logic fallback');
            const solicitudesSemana = estadoProceso.semanaSeleccionada
              ? solicitudesAceptadas.filter(s => s.semana === estadoProceso.semanaSeleccionada)
              : solicitudesAceptadas;

            // Sync these fallback requests to the order so persistence works
            await sincronizarSolicitudesPedidoService(
              estadoProceso.pedidoId,
              solicitudesSemana.map(s => s.id)
            );
            solicitudesSeleccionadas = solicitudesSemana;
          }
        } catch (error) {
          logger.error('Error fetching order details for comprobacion', error);
          // Fallback
          solicitudesSeleccionadas = estadoProceso.semanaSeleccionada
            ? solicitudesAceptadas.filter(s => s.semana === estadoProceso.semanaSeleccionada)
            : solicitudesAceptadas;
        }
      } else {
        // Legacy/Fallback flow without active order ID
        solicitudesSeleccionadas = estadoProceso.semanaSeleccionada
          ? solicitudesAceptadas.filter(s => s.semana === estadoProceso.semanaSeleccionada)
          : solicitudesAceptadas;
      }

      // Consolidar productos
      const productosConsolidados = new Map<string, { nombre: string, cantidad: number, unidad: string }>();

      solicitudesSeleccionadas.forEach(solicitud => {
        solicitud.items.forEach(item => {
          // Use ID as key if available, otherwise fallback to name (though ID should exist)
          const key = item.productoId || item.productoNombre.toLowerCase();

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

      // Comparar con inventario
      const inventarioActual = obtenerProductos();
      const datosComprobacion: ComprobacionItem[] = [];

      productosConsolidados.forEach((consolidado, key) => {
        // Try to find by ID first
        let productoInventario = inventarioActual.find(p => p.id === key);

        // If key was name (fallback), try finding by name
        if (!productoInventario) {
          productoInventario = inventarioActual.find(p => p.nombre.toLowerCase() === key);
        }

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

      setComprobacionData(datosComprobacion);
      setEstadoProceso(prev => ({ ...prev, paso: 3 }));
      localStorage.setItem('currentStep', '3');
      onComprobacionOpen();

    } catch (error) {
      logger.error('❌ Error en comprobación:', error);
      toast.error('Error al iniciar la comprobación de inventario');
    }
  };

  // Funciones para aprobar/rechazar solicitudes
  const handleRechazarSolicitud = async () => {
    try {
      if (!user || !solicitudSeleccionada) return;

      if (!comentarioRechazo.trim()) {
        toast.warning('Debes especificar un motivo de rechazo');
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
      toast.success('Solicitud rechazada');
    } catch (error: any) {
      logger.error('❌ Error al rechazar solicitud:', error);
      toast.error(error.message || 'Error al rechazar la solicitud');
    }
  };

  const verDetalleSolicitud = (solicitud: ISolicitud) => {
    setSolicitudSeleccionada(solicitud);
    setSemanaAprobacion(solicitud.semana);
    setComentarioAdministrador('');
    setModoDetalle('view');
    onDetalleOpen();
  };

  const abrirModalAprobar = (solicitud: ISolicitud) => {
    setSolicitudSeleccionada(solicitud);
    setSemanaAprobacion(solicitud.semana);
    setComentarioAdministrador('');
    setModoDetalle('approve');
    onDetalleOpen();
  };

  const abrirModalRechazar = (solicitud: ISolicitud) => {
    setSolicitudSeleccionada(solicitud);
    setComentarioRechazo('');
    onRechazarOpen();
  };

  // Manejo simplificado de modales del flujo
  const handleRechazarComprobacion = () => {
    onComprobacionOpenChange();
  };

  const handleAceptarComprobacion = (data: ComprobacionItem[]) => {
    setComprobacionData(data);
    onComprobacionOpenChange();
    setCotizacionData([]);
    setFinalOrderData([]);
    onCotizacionOpen();
    setEstadoProceso(prev => ({ ...prev, paso: 4 }));
    localStorage.setItem('currentStep', '4');
  };

  const handleRechazarCotizacion = () => {
    onCotizacionOpenChange();
  };

  const handleAceptarCotizacion = (data: CotizacionItem[]) => {
    setCotizacionData(data);
    onCotizacionOpenChange();
    setFinalOrderData([]);
    onFinalOpen();
    setEstadoProceso(prev => ({ ...prev, paso: 5 }));
    localStorage.setItem('currentStep', '5');
  };

  const handleGenerarYDescargarPDFs = async () => {
    onFinalOpenChange();
    toast.info('Generación de PDFs pendiente de implementación.');
    setEstadoProceso(prev => ({ ...prev, paso: 6 }));
    localStorage.setItem('currentStep', '6');

    const { pedidoId, semanaSeleccionada: semanaProceso } = estadoProceso;

    if (pedidoId) {
      try {
        const solicitudesIds = solicitudes
          .filter((s) => (semanaProceso ? s.semana === semanaProceso : true))
          .map((s) => s.id);

        await marcarPedidoComoCompletadoService(pedidoId, solicitudesIds);
      } catch (error) {
        logger.error('❌ Error al marcar pedido como completado:', error);
      }
    }

    toast.success('Pedido semanal finalizado.');
    resetearProceso();
  };

  const handleCerrarModalFinal = () => {
    onFinalOpenChange();
  };

  const handleConfirmarAprobacion = async () => {
    if (!solicitudSeleccionada || !user) {
      toast.error('No se ha seleccionado ninguna solicitud.');
      return;
    }

    try {
      setIsAprobando(true);
      const semanaFinal = semanaAprobacion ?? solicitudSeleccionada.semana;
      const comentario = comentarioAdministrador.trim();
      const hayCambioSemana = semanaFinal !== solicitudSeleccionada.semana;

      await aprobarRechazarSolicitudService({
        solicitudId: solicitudSeleccionada.id,
        estado: comentario || hayCambioSemana ? 'AceptadaModificada' : 'Aceptada',
        comentarioAdministrador: comentario || undefined,
        aprobadoPor: user.id || user.nombre,
        actualizacion: hayCambioSemana ? { semana: semanaFinal } : undefined,
      });

      await cargarDatos();
      onDetalleOpenChange();
      setSolicitudSeleccionada(null);
      setModoDetalle('view');
      setComentarioAdministrador('');
      toast.success('Solicitud aprobada correctamente');
    } catch (error: any) {
      logger.error('❌ Error al aprobar solicitud:', error);
      toast.error(error.message || 'Error al aprobar la solicitud');
    } finally {
      setIsAprobando(false);
    }
  };

  // Datos para gráfico
  const renderEstadoSolicitud = (estado: EstadoSolicitud | null) => {
    if (!estado) {
      return <Chip size="sm" variant="flat">Sin solicitud</Chip>;
    }

    switch (estado) {
      case 'Pendiente':
        return <Chip color="warning" size="sm">Pendiente</Chip>;
      case 'Aceptada':
        return <Chip color="success" size="sm">Aceptada</Chip>;
      case 'AceptadaModificada':
        return <Chip color="success" size="sm">Aceptada (modificada)</Chip>;
      case 'Rechazada':
        return <Chip color="danger" size="sm">Rechazada</Chip>;
      default:
        return <Chip size="sm" variant="flat">{estado}</Chip>;
    }
  };

  const semanasDisponibles = React.useMemo(() => Array.from({ length: 18 }, (_, index) => index + 1), []);

  const solicitudesSemana = estadoProceso.semanaSeleccionada
    ? solicitudes.filter(s => s.semana === estadoProceso.semanaSeleccionada)
    : solicitudes;

  const asignaturasParaMostrar: AsignaturaConSolicitud[] = ASIGNATURAS_BASE.map(asignatura => {
    const solicitud = solicitudesSemana.find(s => s.asignaturaId === asignatura.id) || null;
    return { ...asignatura, solicitud };
  });

  const conteoSemana = {
    pendientes: solicitudesSemana.filter(s => s.estado === 'Pendiente').length,
    aceptadas: solicitudesSemana.filter(s => s.estado === 'Aceptada' || s.estado === 'AceptadaModificada').length,
    rechazadas: solicitudesSemana.filter(s => s.estado === 'Rechazada').length,
    total: solicitudesSemana.length,
  };

  const datosPieChart = [
    { name: 'Pendientes', value: conteoSemana.pendientes, color: COLORS_PIE[0] },
    { name: 'Aceptadas', value: conteoSemana.aceptadas, color: COLORS_PIE[1] },
    { name: 'Rechazadas', value: conteoSemana.rechazadas, color: COLORS_PIE[2] },
    {
      name: 'Sin solicitud',
      value: ASIGNATURAS_BASE.length - conteoSemana.total,
      color: COLORS_PIE[3]
    }
  ].filter(item => item.value > 0);

  const solicitudesPendientes = solicitudesSemana.filter(s => s.estado === 'Pendiente');

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
    <>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <DashboardHeader userName={user?.nombre || 'Usuario'} />

        {/* Proceso de Pedidos */}
        <ProcesoPedidosSection
          estadoProceso={estadoProceso}
          semanaSeleccionada={semanaSeleccionada}
          pedidoId={estadoProceso.pedidoId}
          onSemanaSeleccionadaChange={setSemanaSeleccionada}
          onIniciarProceso={handleIniciarProcesoBoard}
          onTerminarProceso={handleTerminarProceso}
          onCancelarProceso={handleCancelarProceso}
          solicitudesPendientesCount={solicitudesPendientes.length}
          onVerPendientes={onPendientesOpen}
          onVerComprobacion={onComprobacionOpen}
          onVerCotizacion={onCotizacionOpen}
          onVerOrdenFinal={onFinalOpen}
          showComprobacion={estadoProceso.paso >= 3 && comprobacionData.length > 0}
          showCotizacion={estadoProceso.paso >= 4 && cotizacionData.length > 0}
          showOrdenFinal={estadoProceso.paso >= 5 && finalOrderData.length > 0}
        />

        {/* Tarjetas de Estadísticas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch"
        >
          <StatsCard
            title="Pendientes"
            value={conteoSemana.pendientes}
            icon="lucide:clock"
            color="warning"
            onClick={solicitudesPendientes.length > 0 ? onPendientesOpen : undefined}
          />
          <StatsCard
            title="Aceptadas"
            value={conteoSemana.aceptadas}
            icon="lucide:check-circle"
            color="success"
          />
          <StatsCard
            title="Rechazadas"
            value={conteoSemana.rechazadas}
            icon="lucide:x-circle"
            color="danger"
          />
          <StatsCard
            title="Stock Bajo"
            value={productosBajoStock.length}
            icon="lucide:package"
            color="primary"
            onClick={() => history.push('/inventario')}
          />
        </motion.div>

        {/* Tabla y Gráfico */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card className="shadow-sm h-full">
              <CardHeader className="pb-0 pt-4 px-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Asignaturas y sus solicitudes</h3>
                {estadoProceso.semanaSeleccionada && (
                  <Chip color="primary" variant="flat" size="sm">
                    Semana {estadoProceso.semanaSeleccionada}
                  </Chip>
                )}
              </CardHeader>
              <CardBody className="px-4 pb-4">
                <Table removeWrapper aria-label="Asignaturas y solicitudes por semana">
                  <TableHeader>
                    <TableColumn>ASIGNATURA</TableColumn>
                    <TableColumn>PROFESOR</TableColumn>
                    <TableColumn>ESTADO</TableColumn>
                    <TableColumn>ACCIONES</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="No hay solicitudes registradas para esta semana">
                    {asignaturasParaMostrar.map((asignatura) => (
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
                          {renderEstadoSolicitud(asignatura.solicitud?.estado ?? null)}
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
              </CardBody>
            </Card>
          </motion.div>
        </div>

        {/* Productos con Stock Bajo */}
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
                      className="p-3 border border-danger-200 rounded-lg bg-default-50 dark:bg-default-900/10"
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

      <Modal
        isOpen={isDetalleOpen}
        onOpenChange={(open) => {
          if (!open) {
            setModoDetalle('view');
            setComentarioAdministrador('');
            setSemanaAprobacion(null);
            setSolicitudSeleccionada(null);
          }
          onDetalleOpenChange();
        }}
        size="lg"
      >
        <ModalContent>
          {(onClose) => {
            const handleClose = () => {
              setModoDetalle('view');
              setComentarioAdministrador('');
              setSemanaAprobacion(null);
              setSolicitudSeleccionada(null);
              onClose();
            };

            return (
              <>
                <ModalHeader>Detalle de solicitud</ModalHeader>
                <ModalBody>
                  {solicitudSeleccionada ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-default-500">Asignatura</p>
                          <p className="font-semibold">{solicitudSeleccionada.asignaturaNombre}</p>
                        </div>
                        <div>
                          <p className="text-sm text-default-500">Profesor</p>
                          <p className="font-semibold">{solicitudSeleccionada.profesorNombre}</p>
                        </div>
                        <div>
                          <p className="text-sm text-default-500">Fecha de clase</p>
                          <p className="font-semibold">
                            {new Date(solicitudSeleccionada.fecha).toLocaleDateString('es-CL')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-default-500">Semana asignada</p>
                          <p className="font-semibold">
                            Semana {solicitudSeleccionada.semana}
                          </p>
                        </div>
                      </div>

                      <Divider />

                      <div>
                        <p className="text-sm text-default-500 mb-1">Observaciones</p>
                        <p className="text-sm">
                          {solicitudSeleccionada.observaciones || 'Sin observaciones.'}
                        </p>
                      </div>

                      <Divider />

                      <div>
                        <p className="text-sm font-semibold mb-2">Productos solicitados</p>
                        <Table removeWrapper aria-label="Productos de la solicitud">
                          <TableHeader>
                            <TableColumn>PRODUCTO</TableColumn>
                            <TableColumn>CANTIDAD</TableColumn>
                            <TableColumn>TIPO</TableColumn>
                          </TableHeader>
                          <TableBody emptyContent="Sin productos">
                            {solicitudSeleccionada.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{item.productoNombre}</TableCell>
                                <TableCell>{item.cantidad} {item.unidadMedida}</TableCell>
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

                      {modoDetalle === 'approve' && (
                        <>
                          <Divider />
                          <Select
                            label="Semana a asignar"
                            selectedKeys={semanaAprobacionSelectedKeys}
                            onSelectionChange={(keys) => {
                              const valor = getFirstSelectionValue(keys);
                              setSemanaAprobacion(valor ? parseInt(valor, 10) : null);
                            }}
                          >
                            {semanasDisponibles.map((semana) => {
                              const label = `Semana ${semana}`;
                              return (
                                <SelectItem key={semana.toString()} textValue={label}>
                                  {label}
                                </SelectItem>
                              );
                            })}
                          </Select>

                          <Textarea
                            label="Comentario para el profesor"
                            placeholder="Opcional: escribe un comentario sobre los cambios realizados."
                            value={comentarioAdministrador}
                            onValueChange={setComentarioAdministrador}
                            minRows={3}
                          />
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-default-500 text-sm">Selecciona una solicitud para ver los detalles.</p>
                  )}
                </ModalBody>
                <ModalFooter>
                  {modoDetalle === 'approve' ? (
                    <>
                      <Button
                        variant="flat"
                        onPress={() => {
                          setModoDetalle('view');
                          setComentarioAdministrador('');
                          setSemanaAprobacion(solicitudSeleccionada?.semana ?? null);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        color="primary"
                        onPress={handleConfirmarAprobacion}
                        isLoading={isAprobando}
                        isDisabled={!semanaAprobacion}
                      >
                        Aprobar solicitud
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="flat" onPress={handleClose}>
                        Cerrar
                      </Button>
                      {solicitudSeleccionada?.estado === 'Pendiente' && (
                        <div className="flex gap-2">
                          <Button
                            color="danger"
                            variant="flat"
                            onPress={() => abrirModalRechazar(solicitudSeleccionada!)}
                          >
                            Rechazar
                          </Button>
                          <Button
                            color="primary"
                            onPress={() => {
                              setModoDetalle('approve');
                              setComentarioAdministrador('');
                              setSemanaAprobacion(solicitudSeleccionada?.semana ?? null);
                            }}
                          >
                            Aceptar / Modificar
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </ModalFooter>
              </>
            );
          }}
        </ModalContent>
      </Modal>

      {/* TABLERO SELECCION PEDIDOS NUEVO */}
      <SolicitudBoardModal
        isOpen={isBoardOpen}
        onClose={onBoardOpenChange}
        onConfirm={handleConfirmBoard}
        onRequestClick={handleSolicitudClickFromBoard}
        solicitudes={allSolicitudesBoard}
      />

      {/* Modales */}
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
        onAccept={handleAceptarCotizacion}
      />

      <FinProcesoModal
        isOpen={isFinalOpen}
        onClose={handleCerrarModalFinal}
        onGenerarPDFs={handleGenerarYDescargarPDFs}
        finalOrderData={finalOrderData}
      />

      {/* Modal Rechazo */}
      <Modal isOpen={isRechazarOpen} onOpenChange={onRechazarOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Rechazar Solicitud</ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-500 mb-2">
                  Indica el motivo por el cual rechazas esta solicitud. El profesor recibirá esta notificación.
                </p>
                <Textarea
                  label="Motivo de rechazo"
                  placeholder="Ej: No hay stock suficiente, receta no corresponde a la semana..."
                  value={comentarioRechazo}
                  onValueChange={setComentarioRechazo}
                  minRows={3}
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
                  Confirmar Rechazo
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

