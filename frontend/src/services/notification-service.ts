import api from '../config/Axios';

export interface INotificacionSemana {
  idSemana: number;
  nombreSemana: string;
  fechaInicio: string;
  fechaFin: string;
  anio: number;
  semestre: number;
  cantidadPendientes: number;
}

export interface INotificacionEntrega {
  idOrdenPedido: number;
  nombreDistribuidora: string;
  fechaEntrega: string; // YYYY-MM-DD
  cantidadProductos: number;
}

export interface INotificacionResumen {
  solicitudesPendientes: INotificacionSemana[];
  solicitudesAceptadas: INotificacionSemana[];
  pedidosPendientes: INotificacionSemana[];
  pedidosSinOp: INotificacionSemana[];
  entregasHoyAyer: INotificacionEntrega[];
}

export const obtenerResumenNotificaciones = async (): Promise<INotificacionResumen> => {
  const { data } = await api.get<INotificacionResumen>('/notificacion/resumen');
  return data;
};
