/**
 * SERVICIO DE GESTIÓN DE PEDIDOS SEMANALES
 * Persiste los procesos de pedidos iniciados por la administración.
 */

import { IPedido, EstadoPedido } from '../types/pedido.types';

const STORAGE_KEY = 'kuhub-pedidos';

const obtenerPedidosStorage = (): IPedido[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const guardarPedidosStorage = (pedidos: IPedido[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pedidos));
};

export const obtenerPedidosService = (): Promise<IPedido[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const pedidos = obtenerPedidosStorage().sort(
        (a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
      );
      resolve(pedidos);
    }, 100);
  });
};

export const obtenerPedidoPorIdService = (id: string): Promise<IPedido | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const pedidos = obtenerPedidosStorage();
      const pedido = pedidos.find((p) => p.id === id) || null;
      resolve(pedido);
    }, 100);
  });
};

interface CrearPedidoPayload {
  semana: number;
  creadoPor: string;
  creadoPorNombre?: string;
  comentario?: string;
}

export const crearPedidoService = (payload: CrearPedidoPayload): Promise<IPedido> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        if (!Number.isInteger(payload.semana) || payload.semana < 1 || payload.semana > 18) {
          throw new Error('La semana seleccionada no es válida para el pedido.');
        }

        const pedidos = obtenerPedidosStorage();

        const nuevoPedido: IPedido = {
          id: Date.now().toString(),
          semana: payload.semana,
          estado: 'EnCurso',
          fechaInicio: new Date().toISOString(),
          creadoPor: payload.creadoPor,
          creadoPorNombre: payload.creadoPorNombre,
          comentario: payload.comentario,
          solicitudesAsociadas: [],
        };

        pedidos.push(nuevoPedido);
        guardarPedidosStorage(pedidos);

        resolve(nuevoPedido);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

export const actualizarPedidoService = (
  id: string,
  data: Partial<IPedido>
): Promise<IPedido> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const pedidos = obtenerPedidosStorage();
        const index = pedidos.findIndex((p) => p.id === id);

        if (index === -1) {
          throw new Error('Pedido no encontrado');
        }

        pedidos[index] = {
          ...pedidos[index],
          ...data,
          id,
        };

        guardarPedidosStorage(pedidos);
        resolve(pedidos[index]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

export const marcarPedidoComoCompletadoService = (
  id: string,
  solicitudesAsociadas: string[]
): Promise<IPedido> => {
  return actualizarPedidoService(id, {
    estado: 'Completado',
    fechaCierre: new Date().toISOString(),
    solicitudesAsociadas,
  });
};

export const marcarPedidoComoCanceladoService = (
  id: string
): Promise<IPedido> => {
  return actualizarPedidoService(id, {
    estado: 'Cancelado',
    fechaCierre: new Date().toISOString(),
  });
};

export const sincronizarSolicitudesPedidoService = (
  id: string,
  solicitudesIds: string[]
): Promise<IPedido> => {
  return actualizarPedidoService(id, {
    solicitudesAsociadas: Array.from(new Set(solicitudesIds)),
  });
};

