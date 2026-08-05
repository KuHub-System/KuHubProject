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
  /**
   * Cantidad de la ENTRADA_INVENTARIO que efectivamente proviene de una orden de
   * Abastecimiento de Proveedores (se fija al cargar desde Abastecimiento y no cambia si el
   * usuario suma más cantidad manualmente al mismo ítem). Usado por la detección de disponibles
   * para saber cuánto del delta actual es excedente ("entrada falsa") sobre lo realmente pedido.
   */
  cargadoAbastecimiento?: number;
}
