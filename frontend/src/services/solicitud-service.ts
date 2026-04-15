/**
 * SERVICIO DE GESTIÓN DE SOLICITUDES (ACTUALIZADO)
 * Incluye sistema de aprobación y gestión de estados
 */

import {
  ISolicitud,
  ISolicitudCreacion,
  ISolicitudActualizacion,
  IAprobarRechazarSolicitud,
  IFiltrosSolicitudes,
  EstadoSolicitud
} from '../types/solicitud.types';
import { obtenerUsuarioActualService } from './auth-service';
import api from '../config/Axios';

// ── Tipos para cursos/asignaturas disponibles para solicitud ──
export interface IHorarioCurso {
  idReservaSala: number;
  numeroBloque: number;
  horaInicio: string;   // "08:01:00"
  horaFin: string;      // "08:40:00"
  diaSemana: string;    // "LUNES" | "MARTES" | ...
  idSala: number;
  codSala: string;
  nombreSala: string;
}
export interface ISeccionCurso {
  id_seccion: number;
  nombre_seccion: string;
  id_usuario: number;
  nombre_docente: string;
  cant_inscritos: number;
  capacidad_max: number;
  horarios: IHorarioCurso[];
  solicitudes?: string[]; // fechas "YYYY-MM-DD" con solicitudes ya registradas
}
export interface IAsignaturaCurso {
  idAsignatura: number;
  nombreAsignatura: string;
  secciones: ISeccionCurso[];
}

export const obtenerCursosParaSolicitudService = async (): Promise<IAsignaturaCurso[]> => {
  const response = await api.get<IAsignaturaCurso[]>('/solicitud/curses-by-solicitation');
  return response.data;
};

// ── Recetas con detalles ──────────────────────────────────────────────────────
export interface IDetalleReceta {
  idDetalleReceta: number;
  idProducto: number;
  idUnidad: number;
  nombreProducto: string;
  cantProducto: number;
  abreviatura: string;
  esFraccionario: boolean;
  activoProducto: boolean;
}
export interface IReceta {
  idReceta: number;
  nombreReceta: string;
  detalles: IDetalleReceta[];
}

export const obtenerRecetasSolicitudService = async (): Promise<IReceta[]> => {
  const response = await api.get<IReceta[]>('/solicitud/recipes-with-details-by-solicitation');
  return response.data;
};

// ── Productos activos para selección ─────────────────────────────────────────
export interface IProductoOpcion {
  idProducto: number;
  idUnidad: number;
  nombreProducto: string;
  nombreUnidad: string;
  abreviatura: string;
  esFraccionario: boolean;
}

export const obtenerProductosOpcionService = async (): Promise<IProductoOpcion[]> => {
  const response = await api.get<IProductoOpcion[]>('/producto/find-all-product-active-for-option');
  return response.data;
};

// ── DTOs para solicitud masiva ────────────────────────────────────────────────
export interface IScheduleSolicitationDTO {
  idReservaSala: number;
  fechaSolicitadaCalculada: string; // "YYYY-MM-DD"
}
export interface ISectionCreateSolicitationDTO {
  idSeccion: number;
  idUsuario: number;
  cantInscritos: number;
  horarios: IScheduleSolicitationDTO[];
}
export interface IModifiedDetailSolicitationDTO {
  idDetalleReceta: number;
  cantProducto: number;
  observacion?: string;
}
export interface INewProductSolicitationDTO {
  idProducto: number;
  cantProducto: number;
  observacion?: string;
}
export interface IDeltasSolicitationDTO {
  eliminados: number[];
  modificados: IModifiedDetailSolicitationDTO[];
  nuevos: INewProductSolicitationDTO[];
}
export interface IMassiveSolicitationDTO {
  idAsignatura: number;
  idSemana: number;
  idReceta?: number;
  observacion?: string;
  secciones: ISectionCreateSolicitationDTO[];
  deltas?: IDeltasSolicitationDTO;
}
export interface IResultsMassSolicitation {
  totalSolicitudes: number;
  totalDetalles: number;
}

export const generarSolicitudesMasivasService = async (
  payload: IMassiveSolicitationDTO[]
): Promise<IResultsMassSolicitation> => {
  const response = await api.post<IResultsMassSolicitation>('/solicitud/generate-mass-solicitions', payload);
  return response.data;
};

// ── Gestión de solicitudes por semana (admin) ─────────────────────────────────

export interface IDateRangeDTO {
  fechaInicio: string; // "YYYY-MM-DD"
  fechaFin: string;    // "YYYY-MM-DD"
}

export interface IHorarioItemResponse {
  numeroBloque: number;
  horaInicio: string;  // "HH:mm:ss"
  horaFin: string;     // "HH:mm:ss"
  nombreSala: string;
}

export interface IProductoSolicitudResponse {
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  observacion?: string | null;
}

export interface ISolicitudPorSemanaResponse {
  idSolicitud: number;
  idReservaSala: number;
  idReceta: number;
  nombreReceta: string;
  fechaSolicitada: string;    // "YYYY-MM-DD"
  estadoSolicitud: string;    // "PENDIENTE" | "ACEPTADA" | "RECHAZADA" | "PROCESADO"
  motivoRechazo?: string;
  observaciones?: string;
  productos: IProductoSolicitudResponse[];
  asignaturaDetalle: {
    id_asignatura: number;
    nombre_asignatura: string;
    seccion: {
      id_seccion: number;
      nombre_seccion: string;
      id_usuario: number;
      nombre_docente: string;
      cant_inscritos: number;
      capacidad_max: number;
      horarios: IHorarioItemResponse[];
    };
  };
}

export const obtenerSolicitudesPorSemanaService = async (
  dto: IDateRangeDTO
): Promise<ISolicitudPorSemanaResponse[]> => {
  const response = await api.post<ISolicitudPorSemanaResponse[]>(
    '/solicitud/find-solicitations-per-week',
    dto
  );
  return response.data;
};

export interface ISolicitationStatusItemDTO {
  idSolicitud: number;
  estado: string; // "PENDIENTE" | "ACEPTADA" | "RECHAZADA"
  motivo?: string; // Solo cuando estado === "RECHAZADA"
}

export interface IChangeMassiveStatusDTO {
  estadosSolicitudes: ISolicitationStatusItemDTO[];
}

export const cambiarEstadoMasivoService = async (
  payload: IChangeMassiveStatusDTO
): Promise<boolean> => {
  const response = await api.patch<boolean>('/solicitud/change-massive-status', payload);
  return response.data;
};

// ── Order for consolidation ───────────────────────────────────────────────────

export interface IProductoSolicitadoItem {
  nombreProducto: string;
  cantidad: number;
  unidad_abreviada: string;
  observacion?: string | null;
}

export interface IHorarioConsolidacion {
  nombreSala: string;
  rangoHoras: string;
}

export interface ISeccionConsolidacionItem {
  id_seccion: number;
  nombre_seccion: string;
  id_usuario: number;
  nombre_docente: string;
  cant_inscritos: number;
  cant_productos: number;
  productos_solicitados: IProductoSolicitadoItem[];
  horarios: IHorarioConsolidacion;
}

export interface IAsignaturaConsolidacionDetalle {
  id_asignatura: number;
  nombre_asignatura: string;
  seccion: ISeccionConsolidacionItem;
}

export interface ISolicitudConsolidacionItem {
  idSolicitud: number;
  fechaSolicitada: string;
  nombreReceta: string;
  observaciones?: string;
  asignaturaDetalle: IAsignaturaConsolidacionDetalle;
}

export interface IDetalleConsolidadoItem {
  idSolicitud: number;
  fechaSolicitada: string;
  nombreSeccion: string;
  nombreAsignatura: string;
  nombreDocente: string;
  cantidad: number;
  observacion?: string | null;
  alumnos: number;
  nombreSala: string;
  rangoHoras: string;
}

export interface IProductoConsolidadoResponse {
  idProducto: number;
  nombreProducto: string;
  cantidadTotal: number;
  unidad: string;
  totalSecciones: number;
  detalles: IDetalleConsolidadoItem[];
}

export interface IOrderConsolidationResponse {
  solicitudes: ISolicitudConsolidacionItem[];
  consolidado: IProductoConsolidadoResponse[];
}

export const obtenerOrdenConsolidacionService = async (
  dto: IDateRangeDTO
): Promise<IOrderConsolidationResponse> => {
  const response = await api.post<IOrderConsolidationResponse>(
    '/solicitud/order-for-consolidation',
    dto
  );
  return response.data;
};

// ── Consolidar pedido semanal ─────────────────────────────────────────────────

export interface ISolicitudItemRequest {
  idSolicitud: number;
  fechaSolicitada: string; // "YYYY-MM-DD"
}

export interface IDetalleItemRequest {
  idProducto: number;
  cantidadTotal: number;
}

export interface ICreateOrderRequest {
  fechaInicio: string; // "YYYY-MM-DD"
  fechaFin: string;    // "YYYY-MM-DD"
  solicitudes: ISolicitudItemRequest[];
  detalles: IDetalleItemRequest[];
}

export const consolidarPedidoService = async (
  payload: ICreateOrderRequest
): Promise<boolean> => {
  const response = await api.post<boolean>('/pedido/consolidate-order', payload);
  return response.data;
};

// ── POST /v1/pedido/consolidate ───────────────────────────────────────────────

export interface IDetallePorSolicitudCompleto {
  idSolicitud: number;
  fechaSolicitada: string;      // "YYYY-MM-DD"
  nombreSeccion: string;
  nombreAsignatura: string;
  nombreDocente: string;
  cantidad: number;
  unidadAbreviada: string;
  observacion?: string | null;
  alumnos: number;
  nombreReceta: string;
  nombreSala: string;
  rangoHoras: string;           // "08:01-09:20"
}

export interface IProductoCompleto {
  idProducto: number;
  nombreProducto: string;
  idCategoria: number;
  nombreCategoria: string;
  cantidadTotalPedido: number;
  unidad: string;
  abreviatura: string;
  totalSecciones: number;
  detallesPorSolicitud: IDetallePorSolicitudCompleto[];
}

export interface IProductoSolicitadoVinculado {
  nombreProducto: string;
  cantidad: number;
  unidadAbreviada: string;
  observacion?: string | null;
}

export interface ISeccionVinculada {
  idSeccion: number;
  nombreSeccion: string;
  nombreAsignatura: string;
  nombreDocente: string;
  cantInscritos: number;
}

export interface IHorariosVinculados {
  nombreSala: string;
  rangoHoras: string;           // "08:01 - 09:20"
}

export interface ISolicitudVinculada {
  idSolicitud: number;
  fechaSolicitada: string;
  estadoSolicitud: string;
  nombreReceta: string;
  observaciones?: string | null;
  seccion: ISeccionVinculada;
  cantProductos: number;
  productosSolicitados: IProductoSolicitadoVinculado[];
  horarios: IHorariosVinculados;
}

export interface IPedidoCompleto {
  idPedido: number;
  fechaInicioPedido: string;
  fechaFinPedido: string;
  fechaRegistro?: string;
  estadoPedido: string;
  totalSolicitudes: number;
  totalProductos: number;
  productos: IProductoCompleto[];
  solicitudesVinculadas: ISolicitudVinculada[];
}

export interface IProductoResumen {
  nombreProducto: string;
  cantidadTotal: number;
  abreviatura: string;
  totalSecciones: number;
  detalles: IDetalleConsolidadoItem[];
}

export interface IPedidoResumen {
  idPedido: number;
  totalProductosDistintos: number;
  productosConsolidados: IProductoResumen[];
}

export interface IProductoAprobacion {
  nombreProducto: string;
  cantidadPedido: number;
  abreviatura: string;
  categoria?: string;
  stockBodegaTransito: number;
  stockInventarioPrincipal: number;
  diferenciaTransito: number;
}

export interface IPedidoAprobacion {
  idPedido: number;
  estadoPedido: string;         // "PENDIENTE" | "APROVADO" | "RECHAZADO"
  productos: IProductoAprobacion[];
}

export interface IConsolidatePedidoResponse {
  pedidosCompletos: IPedidoCompleto[];
  pedidosResumen: IPedidoResumen[];
  pedidosAprobacion: IPedidoAprobacion[];
}

export const consolidatePedidoQueryService = async (
  dto: IDateRangeDTO
): Promise<IConsolidatePedidoResponse> => {
  const response = await api.post<IConsolidatePedidoResponse>('/pedido/consolidate', dto);
  return response.data;
};

// ── Aprobar pedidos (PATCH /pedido/change-massive-status) ─────────────────────

export interface IChangePedidoStatusDTO {
  idsPedidos: number[];
  estado: string; // "PROCESADO" | "CANCELADO"
}

export const aprobarPedidosService = async (dto: IChangePedidoStatusDTO): Promise<boolean> => {
  const response = await api.patch<boolean>('/pedido/change-massive-status', dto);
  return response.data;
};

// ── Entregas diarias Bodega de Tránsito (POST /pedido/entregas-diarias) ────────

export interface IProductoEntrega {
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
  unidadAbreviada: string;
  esFraccionario: boolean;
  observacion: string | null;
  stockTransito: number;
  diferencia: number;
}

export interface ISolicitudEntrega {
  idSolicitud: number;
  estadoSolicitud: string;  // "ACEPTADA" | "PROCESADO"
  horaInicio: string;       // "HH:MM" — usado para ordenar en UI
  rangoHoras: string;       // "HH:MM - HH:MM" — para mostrar
  nombreSeccion: string;
  nombreAsignatura: string;
  nombreDocente: string;
  cantInscritos: number;
  nombreReceta: string;
  observaciones: string | null;
  productos: IProductoEntrega[];
}

export interface ISalaEntrega {
  idSala: number;
  nombreSala: string;
  codSala: string;
  solicitudes: ISolicitudEntrega[];
}

export interface IEntregaDiaria {
  fecha: string;              // "YYYY-MM-DD"
  totalSolicitudes: number;
  salas: ISalaEntrega[];
}

export const obtenerEntregasDiariasService = async (
  dto: IDateRangeDTO
): Promise<IEntregaDiaria[]> => {
  const response = await api.post<IEntregaDiaria[]>('/pedido/entregas-diarias', dto);
  return response.data;
};

// ── Preparar Entrega (POST /pedido/preparar-entrega) ──────────────────────────

export interface IPrepararEntregaItem {
  idProducto: number;
  stockEnVista: number;
  cantidadAEntregar: number;
}

export interface IPrepararEntregaDTO {
  idSolicitud: number;
  productos: IPrepararEntregaItem[];
}

export interface IPrepararEntregaResult {
  mensaje: string;
  exito: boolean;
  desincronizado?: boolean;
}

export const prepararEntregaService = async (
  dto: IPrepararEntregaDTO
): Promise<IPrepararEntregaResult> => {
  const response = await api.post<IPrepararEntregaResult>('/pedido/preparar-entrega', dto);
  return response.data;
};

const API_BASE_URL = 'http://localhost:8083/api/v1';
const ENDPOINTS = {
  SOLICITUDES_DETALLES: `${API_BASE_URL}/solicituddocente/detalles`
};

// ✅ CAMBIO CRÍTICO: Usar la misma clave que storage-service
const STORAGE_KEY = 'kuhub-solicitudes';

/**
 * Helper para obtener solicitudes del localStorage
 */
const obtenerSolicitudesStorage = (): ISolicitud[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

/**
 * Helper para guardar solicitudes en localStorage
 */
const guardarSolicitudesStorage = (solicitudes: ISolicitud[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(solicitudes));
  console.log('💾 Solicitudes guardadas:', solicitudes.length);
};

/**
 * Crear nueva solicitud
 */
export const crearSolicitudService = (data: ISolicitudCreacion): Promise<ISolicitud> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const usuario = obtenerUsuarioActualService();
        if (!usuario) {
          reject(new Error('No hay sesión activa'));
          return;
        }

        if (!Number.isInteger(data.semana) || data.semana < 1 || data.semana > 18) {
          reject(new Error('La semana seleccionada no es válida'));
          return;
        }

        const solicitudes = obtenerSolicitudesStorage();
        console.log('📋 Solicitudes antes de crear:', solicitudes.length);

        const nuevaSolicitud: ISolicitud = {
          id: Date.now().toString(),
          profesorId: usuario.id,
          profesorNombre: usuario.nombreCompleto,
          asignaturaId: data.asignaturaId,
          asignaturaNombre: data.asignaturaNombre,
          semana: data.semana,
          fecha: data.fecha,
          bloqueInicio: data.bloqueInicio,
          bloqueFin: data.bloqueFin,
          recetaId: data.recetaId,
          recetaNombre: data.recetaNombre,
          items: data.items.map(item => ({
            ...item,
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
          })),
          observaciones: data.observaciones,
          esCustom: data.esCustom,
          estado: 'Pendiente',
          fechaCreacion: new Date().toISOString(),
          fechaUltimaModificacion: new Date().toISOString(),
        };

        solicitudes.push(nuevaSolicitud);
        guardarSolicitudesStorage(solicitudes);

        console.log('✅ Solicitud creada:', nuevaSolicitud.id);
        console.log('📋 Solicitudes después de crear:', solicitudes.length);
        resolve(nuevaSolicitud);
      } catch (error) {
        console.error('❌ Error al crear solicitud:', error);
        reject(error);
      }
    }, 100);
  });
};

/**
 * Obtener todas las solicitudes (para Admin)
 * @deprecated Endpoint antiguo. Usar los endpoints del API v1 directamente.
 */
export const obtenerTodasSolicitudesService = (
  _filtros?: IFiltrosSolicitudes
): Promise<ISolicitud[]> => {
  return Promise.resolve([]);
};

/**
 * Obtener solicitudes del profesor actual
 */
export const obtenerMisSolicitudesService = (): Promise<ISolicitud[]> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const usuario = obtenerUsuarioActualService();
        if (!usuario) {
          reject(new Error('No hay sesión activa'));
          return;
        }

        const solicitudes = obtenerSolicitudesStorage();
        console.log('📋 Solicitudes totales:', solicitudes.length);

        const misSolicitudes = solicitudes
          .filter(s => s.profesorId === usuario.id)
          .sort((a, b) =>
            new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
          );

        console.log('📋 Mis solicitudes:', misSolicitudes.length);
        resolve(misSolicitudes);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Obtener solicitud por ID
 */
export const obtenerSolicitudPorIdService = (id: string): Promise<ISolicitud | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const solicitudes = obtenerSolicitudesStorage();
      const solicitud = solicitudes.find(s => s.id === id);
      resolve(solicitud || null);
    }, 100);
  });
};

/**
 * Actualizar solicitud (solo si está en Pendiente o dentro del período)
 */
export const actualizarSolicitudService = (
  id: string,
  data: ISolicitudActualizacion
): Promise<ISolicitud> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const usuario = obtenerUsuarioActualService();
        if (!usuario) {
          reject(new Error('No hay sesión activa'));
          return;
        }

        const solicitudes = obtenerSolicitudesStorage();
        const index = solicitudes.findIndex(s => s.id === id);

        if (index === -1) {
          reject(new Error('Solicitud no encontrada'));
          return;
        }

        const solicitud = solicitudes[index];

        // Verificar que sea el dueño de la solicitud
        if (solicitud.profesorId !== usuario.id) {
          reject(new Error('No tienes permiso para editar esta solicitud'));
          return;
        }

        if (data.semana !== undefined) {
          if (!Number.isInteger(data.semana) || data.semana < 1 || data.semana > 18) {
            reject(new Error('La semana seleccionada no es válida'));
            return;
          }
        }

        // Si la solicitud estaba aceptada (normal o modificada), volver a Pendiente
        const estabaAceptada = solicitud.estado === 'Aceptada' || solicitud.estado === 'AceptadaModificada';
        const nuevoEstado: EstadoSolicitud = estabaAceptada ? 'Pendiente' : solicitud.estado;

        const itemsActualizados = data.items
          ? data.items.map(item => ({
            ...item,
            id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
          }))
          : solicitud.items;

        // Actualizar solicitud
        solicitudes[index] = {
          ...solicitud,
          ...data,
          items: itemsActualizados,
          estado: nuevoEstado,
          fechaUltimaModificacion: new Date().toISOString(),
        };

        guardarSolicitudesStorage(solicitudes);

        console.log('✅ Solicitud actualizada:', id);
        if (nuevoEstado === 'Pendiente' && estabaAceptada) {
          console.log('⚠️ Solicitud volvió a Pendiente por modificación');
        }

        resolve(solicitudes[index]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Eliminar solicitud (solo si está en Pendiente)
 */
export const eliminarSolicitudService = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const usuario = obtenerUsuarioActualService();
        if (!usuario) {
          reject(new Error('No hay sesión activa'));
          return;
        }

        const solicitudes = obtenerSolicitudesStorage();
        const index = solicitudes.findIndex(s => s.id === id);

        if (index === -1) {
          reject(new Error('Solicitud no encontrada'));
          return;
        }

        const solicitud = solicitudes[index];

        const esAdmin = usuario.rol === 'Administrador';

        // Verificar permisos: el profesor dueño o el administrador pueden eliminar
        if (!esAdmin && solicitud.profesorId !== usuario.id) {
          reject(new Error('No tienes permiso para eliminar esta solicitud'));
          return;
        }

        // Solo limitar estado cuando no es administrador
        if (!esAdmin && solicitud.estado !== 'Pendiente') {
          reject(new Error('Solo se pueden eliminar solicitudes en estado Pendiente'));
          return;
        }

        solicitudes.splice(index, 1);
        guardarSolicitudesStorage(solicitudes);

        console.log('✅ Solicitud eliminada:', id);
        resolve();
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Aprobar o rechazar solicitud (solo Admin/Co-Admin)
 */
export const aprobarRechazarSolicitudService = (
  data: IAprobarRechazarSolicitud
): Promise<ISolicitud> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const solicitudes = obtenerSolicitudesStorage();
        console.log('📋 Solicitudes antes de aprobar/rechazar:', solicitudes.length);

        const index = solicitudes.findIndex(s => s.id === data.solicitudId);

        if (index === -1) {
          reject(new Error('Solicitud no encontrada'));
          return;
        }

        console.log(`🔄 Cambiando estado de "${solicitudes[index].estado}" a "${data.estado}"`);

        if (data.actualizacion?.semana !== undefined) {
          if (!Number.isInteger(data.actualizacion.semana) || data.actualizacion.semana < 1 || data.actualizacion.semana > 18) {
            reject(new Error('La semana seleccionada no es válida'));
            return;
          }
        }

        // Actualizar estado
        solicitudes[index] = {
          ...solicitudes[index],
          ...data.actualizacion,
          estado: data.estado,
          semana: data.actualizacion?.semana ?? solicitudes[index].semana,
          comentarioRechazo: data.estado === 'Rechazada' ? data.comentarioRechazo : undefined,
          comentarioAdministrador: data.estado === 'Rechazada' ? undefined : data.comentarioAdministrador,
          fechaAprobacion: new Date().toISOString(),
          aprobadoPor: data.aprobadoPor,
          fechaUltimaModificacion: new Date().toISOString(),
        };
        if (data.actualizacion?.items) {
          solicitudes[index].items = data.actualizacion.items.map(item => ({
            ...item,
            id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
          }));
        }

        guardarSolicitudesStorage(solicitudes);

        console.log(`✅ Solicitud ${data.estado.toLowerCase()}:`, data.solicitudId);
        console.log('📋 Estado guardado:', solicitudes[index].estado);
        resolve(solicitudes[index]);
      } catch (error) {
        console.error('❌ Error al aprobar/rechazar:', error);
        reject(error);
      }
    }, 100);
  });
};

/**
 * Aprobar todas las solicitudes pendientes
 */
export const aceptarTodasSolicitudesService = (aprobadoPor: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const solicitudes = obtenerSolicitudesStorage();
        console.log('📋 Solicitudes antes de aceptar todas:', solicitudes.length);

        let contador = 0;

        solicitudes.forEach((solicitud) => {
          if (solicitud.estado === 'Pendiente') {
            console.log(`🔄 Aceptando solicitud: ${solicitud.id}`);
            solicitud.estado = 'Aceptada';
            solicitud.fechaAprobacion = new Date().toISOString();
            solicitud.aprobadoPor = aprobadoPor;
            contador++;
          }
        });

        guardarSolicitudesStorage(solicitudes);

        console.log(`✅ ${contador} solicitudes aceptadas automáticamente`);
        resolve(contador);
      } catch (error) {
        console.error('❌ Error al aceptar todas:', error);
        reject(error);
      }
    }, 100);
  });
};

/**
 * Obtener conteo de solicitudes por estado
 */
export const obtenerConteoSolicitudesService = (): Promise<{
  pendientes: number;
  aceptadas: number;
  rechazadas: number;
  total: number;
}> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const solicitudes = obtenerSolicitudesStorage();

      const conteo = {
        pendientes: solicitudes.filter(s => s.estado === 'Pendiente').length,
        aceptadas: solicitudes.filter(s => s.estado === 'Aceptada' || s.estado === 'AceptadaModificada').length,
        rechazadas: solicitudes.filter(s => s.estado === 'Rechazada').length,
        total: solicitudes.length,
      };

      console.log('📊 Conteo de solicitudes:', conteo);
      resolve(conteo);
    }, 100);
  });
};

/**
 * Obtener solicitudes aceptadas para el proceso de pedidos
 */
export const obtenerSolicitudesAceptadasParaPedidoService = (): Promise<ISolicitud[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const solicitudes = obtenerSolicitudesStorage();
      const aceptadas = solicitudes.filter(s => s.estado === 'Aceptada' || s.estado === 'AceptadaModificada');
      console.log('✅ Solicitudes aceptadas para pedido:', aceptadas.length);
      resolve(aceptadas);
    }, 100);
  });
};

/**
 * Actualizar estado de bodega y agregar ítems adicionales
 */
export const actualizarEstadoBodegaService = (
  id: string,
  estado: 'Pendiente' | 'Armado',
  itemsAdicionales?: import('../types/solicitud.types').IItemSolicitud[]
): Promise<ISolicitud> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const solicitudes = obtenerSolicitudesStorage();
        const index = solicitudes.findIndex(s => s.id === id);

        if (index === -1) {
          reject(new Error('Solicitud no encontrada'));
          return;
        }

        // Actualizar solo campos de bodega
        solicitudes[index] = {
          ...solicitudes[index],
          estadoBodega: estado,
          itemsAdicionalesBodega: itemsAdicionales || solicitudes[index].itemsAdicionalesBodega || [],
          fechaUltimaModificacion: new Date().toISOString(),
        };

        guardarSolicitudesStorage(solicitudes);

        console.log(`✅ Estado bodega actualizado para solicitud ${id}: ${estado}`);
        resolve(solicitudes[index]);
      } catch (error) {
        console.error('❌ Error al actualizar estado bodega:', error);
        reject(error);
      }
    }, 100);
  });
};