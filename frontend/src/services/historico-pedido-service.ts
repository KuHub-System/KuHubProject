import api from '../config/Axios';

export interface IProductoResumenHistorico {
  idProducto:      number;
  codProducto:     string | null;
  nombreProducto:  string;
  unidadMedida:    string;
  abreviatura:     string;
  cantidadTotal:   number;
  vecesEnPedidos:  number;
}

export interface IResumenHistorico {
  fechaInicio:              string;
  fechaFin:                 string;
  estados:                  string[];
  totalPedidos:             number;
  totalProductosDistintos:  number;
  productos:                IProductoResumenHistorico[];
}

export const obtenerResumenHistoricoService = async (
  fechaInicio: string,
  fechaFin:    string,
  estadosCsv:  string,
): Promise<IResumenHistorico> => {
  const response = await api.post<IResumenHistorico>(
    '/pedido/resumen-historico',
    { fechaInicio, fechaFin, estadosCsv },
  );
  return response.data;
};
