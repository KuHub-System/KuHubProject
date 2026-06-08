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

export const obtenerNotificacionesPorSemana = async (): Promise<INotificacionSemana[]> => {
  const { data } = await api.get<INotificacionSemana[]>('/solicitud/notificacion-pendientes-lista');
  return data;
};

export const obtenerNotificacionesAceptadasPorSemana = async (): Promise<INotificacionSemana[]> => {
  const { data } = await api.get<INotificacionSemana[]>('/solicitud/notificacion-aceptadas-lista');
  return data;
};
