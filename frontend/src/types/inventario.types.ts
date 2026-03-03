/**
 * Interfaz para una Categoría de producto.
 */
export interface ICategoria {
  id: string;
  nombre: string;
  activo: boolean; // Para "prender y apagar"
  asociados?: number; // Cantidad de productos asociados
}

/**
 * Interfaz para una Unidad de Medida.
 */
export interface IUnidadMedida {
  id: string;
  nombre: string;
  abreviatura: string;
  activo: boolean; // Para "prender y apagar"
  esFraccionario: boolean; // Tipo: Entera (false) o Decimal (true)
  asociados?: number; // Cantidad de productos asociados
}
