import { IBulkProductoInventoryListing } from '../../services/inventario/inventario-service';

export interface ItemPedidoMasivo {
  id: string;
  producto: IBulkProductoInventoryListing;
  delta: number;
  motivo: string;
  idDetalleOrdenPedido?: number;
  marcaProducto?: string | null;
  idDetalleSolicitud?: number;
  cantidadOriginal?: number;
  idSolicitud?: number;
  idOrdenPedido?: number;
  idPedido?: number;
}
