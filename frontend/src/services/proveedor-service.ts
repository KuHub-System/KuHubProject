/**
 * SERVICIO DE GESTIÓN DE PROVEEDORES
 * Maneja proveedores y sus productos con precios
 */

export interface IProductoProveedor {
  id: string;
  productoId: string; // ID del producto en inventario
  productoNombre: string;
  precio: number;
  unidadMedida: string;
  disponible: boolean;
  fechaActualizacion: string;
}

export interface IProveedor {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  estado: 'Activo' | 'Inactivo';
  productos: IProductoProveedor[];
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface ICrearProveedor {
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  estado: 'Activo' | 'Inactivo';
  productos?: IProductoProveedor[];
}

export interface IActualizarProveedor {
  id: string;
  nombre?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  estado?: 'Activo' | 'Inactivo';
  productos?: IProductoProveedor[];
}

const STORAGE_KEY = 'kuhub-proveedores';

/**
 * Helper para obtener proveedores del localStorage
 */
const obtenerProveedoresStorage = (): IProveedor[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    return JSON.parse(data);
  }
  
  // Si no hay datos, inicializar con proveedores de ejemplo
  const proveedoresIniciales = inicializarProveedoresEjemplo();
  guardarProveedoresStorage(proveedoresIniciales);
  return proveedoresIniciales;
};

/**
 * Helper para guardar proveedores en localStorage
 */
const guardarProveedoresStorage = (proveedores: IProveedor[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(proveedores));
  console.log('💾 Proveedores guardados:', proveedores.length);
};

/**
 * Inicializar proveedores de ejemplo (primera vez)
 */
const inicializarProveedoresEjemplo = (): IProveedor[] => {
  return [
    {
      id: '1',
      nombre: 'Distribuidora Central',
      contacto: 'Juan Pérez',
      telefono: '+56 9 1234 5678',
      email: 'contacto@distribuidoracentral.cl',
      direccion: 'Av. Principal 123, Santiago',
      estado: 'Activo',
      productos: [
        { 
          id: '1-1', 
          productoId: 'harina-001',
          productoNombre: 'Harina', 
          precio: 1200, 
          unidadMedida: 'kg', 
          disponible: true, 
          fechaActualizacion: new Date().toISOString()
        },
        { 
          id: '1-2', 
          productoId: 'azucar-001',
          productoNombre: 'Azúcar', 
          precio: 800, 
          unidadMedida: 'kg', 
          disponible: true, 
          fechaActualizacion: new Date().toISOString()
        },
        { 
          id: '1-3', 
          productoId: 'sal-001',
          productoNombre: 'Sal', 
          precio: 400, 
          unidadMedida: 'kg', 
          disponible: true, 
          fechaActualizacion: new Date().toISOString()
        },
        { 
          id: '1-4', 
          productoId: 'levadura-001',
          productoNombre: 'Levadura', 
          precio: 3500, 
          unidadMedida: 'kg', 
          disponible: true, 
          fechaActualizacion: new Date().toISOString()
        }
      ],
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString()
    },
    {
      id: '2',
      nombre: 'Importadora Mediterránea',
      contacto: 'María González',
      telefono: '+56 9 8765 4321',
      email: 'ventas@mediterranea.cl',
      direccion: 'Calle Comercio 456, Viña del Mar',
      estado: 'Activo',
      productos: [
        { 
          id: '2-1', 
          productoId: 'aceite-oliva-001',
          productoNombre: 'Aceite de Oliva', 
          precio: 8500, 
          unidadMedida: 'l', 
          disponible: true, 
          fechaActualizacion: new Date().toISOString()
        },
        { 
          id: '2-2', 
          productoId: 'harina-001',
          productoNombre: 'Harina', 
          precio: 1300, 
          unidadMedida: 'kg', 
          disponible: true, 
          fechaActualizacion: new Date().toISOString()
        },
        { 
          id: '2-3', 
          productoId: 'sal-001',
          productoNombre: 'Sal', 
          precio: 450, 
          unidadMedida: 'kg', 
          disponible: true, 
          fechaActualizacion: new Date().toISOString()
        }
      ],
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString()
    },
    {
      id: '3',
      nombre: 'Lácteos del Sur',
      contacto: 'Pedro Sánchez',
      telefono: '+56 9 2345 6789',
      email: 'contacto@lacteosdelsur.cl',
      direccion: 'Ruta 5 Sur Km 10, Osorno',
      estado: 'Activo',
      productos: [
        { 
          id: '3-1', 
          productoId: 'leche-001',
          productoNombre: 'Leche', 
          precio: 950, 
          unidadMedida: 'l', 
          disponible: true, 
          fechaActualizacion: new Date().toISOString()
        },
        { 
          id: '3-2', 
          productoId: 'mantequilla-001',
          productoNombre: 'Mantequilla', 
          precio: 5200, 
          unidadMedida: 'kg', 
          disponible: true, 
          fechaActualizacion: new Date().toISOString()
        },
        { 
          id: '3-3', 
          productoId: 'azucar-001',
          productoNombre: 'Azúcar', 
          precio: 850, 
          unidadMedida: 'kg', 
          disponible: true, 
          fechaActualizacion: new Date().toISOString()
        }
      ],
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString()
    },
    {
      id: '4',
      nombre: 'Granja Avícola',
      contacto: 'Ana Rodríguez',
      telefono: '+56 9 3456 7890',
      email: 'ventas@granjaavicola.cl',
      direccion: 'Camino Rural 78, Melipilla',
      estado: 'Activo',
      productos: [
        { 
          id: '4-1', 
          productoId: 'huevos-001',
          productoNombre: 'Huevos', 
          precio: 180, 
          unidadMedida: 'unidad', 
          disponible: true, 
          fechaActualizacion: new Date().toISOString()
        },
        { 
          id: '4-2', 
          productoId: 'levadura-001',
          productoNombre: 'Levadura', 
          precio: 3800, 
          unidadMedida: 'kg', 
          disponible: true, 
          fechaActualizacion: new Date().toISOString()
        }
      ],
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString()
    }
  ];
};

/**
 * Obtener todos los proveedores
 */
export const obtenerProveedoresService = (): Promise<IProveedor[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const proveedores = obtenerProveedoresStorage();
      console.log('📋 Proveedores cargados:', proveedores.length);
      resolve(proveedores);
    }, 100);
  });
};

/**
 * Obtener solo proveedores activos
 */
export const obtenerProveedoresActivosService = (): Promise<IProveedor[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const proveedores = obtenerProveedoresStorage();
      const activos = proveedores.filter(p => p.estado === 'Activo');
      console.log('✅ Proveedores activos:', activos.length);
      resolve(activos);
    }, 100);
  });
};

/**
 * Obtener proveedor por ID
 */
export const obtenerProveedorPorIdService = (id: string): Promise<IProveedor | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const proveedores = obtenerProveedoresStorage();
      const proveedor = proveedores.find(p => p.id === id);
      resolve(proveedor || null);
    }, 100);
  });
};

/**
 * Crear nuevo proveedor
 */
export const crearProveedorService = (data: ICrearProveedor): Promise<IProveedor> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const proveedores = obtenerProveedoresStorage();
        
        const nuevoProveedor: IProveedor = {
          id: Date.now().toString(),
          nombre: data.nombre,
          contacto: data.contacto,
          telefono: data.telefono,
          email: data.email,
          direccion: data.direccion,
          estado: data.estado,
          productos: data.productos || [],
          fechaCreacion: new Date().toISOString(),
          fechaActualizacion: new Date().toISOString()
        };
        
        proveedores.push(nuevoProveedor);
        guardarProveedoresStorage(proveedores);
        
        console.log('✅ Proveedor creado:', nuevoProveedor.nombre);
        resolve(nuevoProveedor);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Actualizar proveedor
 */
export const actualizarProveedorService = (data: IActualizarProveedor): Promise<IProveedor> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const proveedores = obtenerProveedoresStorage();
        const index = proveedores.findIndex(p => p.id === data.id);
        
        if (index === -1) {
          reject(new Error('Proveedor no encontrado'));
          return;
        }
        
        proveedores[index] = {
          ...proveedores[index],
          ...data,
          fechaActualizacion: new Date().toISOString()
        };
        
        guardarProveedoresStorage(proveedores);
        
        console.log('✅ Proveedor actualizado:', proveedores[index].nombre);
        resolve(proveedores[index]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Cambiar estado de proveedor
 */
export const cambiarEstadoProveedorService = (
  id: string, 
  estado: 'Activo' | 'Inactivo'
): Promise<IProveedor> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const proveedores = obtenerProveedoresStorage();
        const index = proveedores.findIndex(p => p.id === id);
        
        if (index === -1) {
          reject(new Error('Proveedor no encontrado'));
          return;
        }
        
        proveedores[index].estado = estado;
        proveedores[index].fechaActualizacion = new Date().toISOString();
        
        guardarProveedoresStorage(proveedores);
        
        console.log(`🔄 Proveedor ${estado}:`, proveedores[index].nombre);
        resolve(proveedores[index]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Eliminar proveedor
 */
export const eliminarProveedorService = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const proveedores = obtenerProveedoresStorage();
        const index = proveedores.findIndex(p => p.id === id);
        
        if (index === -1) {
          reject(new Error('Proveedor no encontrado'));
          return;
        }
        
        proveedores.splice(index, 1);
        guardarProveedoresStorage(proveedores);
        
        console.log('🗑️ Proveedor eliminado');
        resolve();
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Agregar producto a proveedor
 */
export const agregarProductoProveedorService = (
  proveedorId: string,
  producto: Omit<IProductoProveedor, 'id'>
): Promise<IProveedor> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const proveedores = obtenerProveedoresStorage();
        const index = proveedores.findIndex(p => p.id === proveedorId);
        
        if (index === -1) {
          reject(new Error('Proveedor no encontrado'));
          return;
        }
        
        const nuevoProducto: IProductoProveedor = {
          ...producto,
          id: `${proveedorId}-${Date.now()}`
        };
        
        proveedores[index].productos.push(nuevoProducto);
        proveedores[index].fechaActualizacion = new Date().toISOString();
        
        guardarProveedoresStorage(proveedores);
        
        console.log('➕ Producto agregado al proveedor');
        resolve(proveedores[index]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Actualizar producto de proveedor
 */
export const actualizarProductoProveedorService = (
  proveedorId: string,
  productoId: string,
  datos: Partial<IProductoProveedor>
): Promise<IProveedor> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const proveedores = obtenerProveedoresStorage();
        const proveedorIndex = proveedores.findIndex(p => p.id === proveedorId);
        
        if (proveedorIndex === -1) {
          reject(new Error('Proveedor no encontrado'));
          return;
        }
        
        const productoIndex = proveedores[proveedorIndex].productos.findIndex(
          p => p.id === productoId
        );
        
        if (productoIndex === -1) {
          reject(new Error('Producto no encontrado'));
          return;
        }
        
        proveedores[proveedorIndex].productos[productoIndex] = {
          ...proveedores[proveedorIndex].productos[productoIndex],
          ...datos,
          fechaActualizacion: new Date().toISOString()
        };
        
        proveedores[proveedorIndex].fechaActualizacion = new Date().toISOString();
        
        guardarProveedoresStorage(proveedores);
        
        console.log('✏️ Producto actualizado');
        resolve(proveedores[proveedorIndex]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Eliminar producto de proveedor
 */
export const eliminarProductoProveedorService = (
  proveedorId: string,
  productoId: string
): Promise<IProveedor> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const proveedores = obtenerProveedoresStorage();
        const proveedorIndex = proveedores.findIndex(p => p.id === proveedorId);
        
        if (proveedorIndex === -1) {
          reject(new Error('Proveedor no encontrado'));
          return;
        }
        
        proveedores[proveedorIndex].productos = proveedores[proveedorIndex].productos.filter(
          p => p.id !== productoId
        );
        
        proveedores[proveedorIndex].fechaActualizacion = new Date().toISOString();
        
        guardarProveedoresStorage(proveedores);
        
        console.log('🗑️ Producto eliminado del proveedor');
        resolve(proveedores[proveedorIndex]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Buscar proveedores que tengan un producto específico
 */
export const buscarProveedoresPorProductoService = (
  productoNombre: string
): Promise<IProveedor[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const proveedores = obtenerProveedoresStorage();
      const proveedoresConProducto = proveedores.filter(proveedor =>
        proveedor.estado === 'Activo' &&
        proveedor.productos.some(p => 
          p.productoNombre.toLowerCase().includes(productoNombre.toLowerCase()) &&
          p.disponible
        )
      );
      
      console.log(`🔍 Proveedores con "${productoNombre}":`, proveedoresConProducto.length);
      resolve(proveedoresConProducto);
    }, 100);
  });
};

/**
 * Obtener proveedores con sus precios para productos específicos
 */
export interface IProveedorConPrecio {
  proveedorId: string;
  proveedorNombre: string;
  precio: number;
  unidadMedida: string;
  disponible: boolean;
}

export const obtenerProveedoresConPreciosService = (
  productosNombres: string[]
): Promise<Map<string, IProveedorConPrecio[]>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const proveedores = obtenerProveedoresStorage();
      const resultado = new Map<string, IProveedorConPrecio[]>();
      
      productosNombres.forEach(productoNombre => {
        const proveedoresConProducto: IProveedorConPrecio[] = [];
        
        proveedores.forEach(proveedor => {
          if (proveedor.estado === 'Activo') {
            const producto = proveedor.productos.find(p =>
              p.productoNombre.toLowerCase() === productoNombre.toLowerCase()
            );
            
            if (producto) {
              proveedoresConProducto.push({
                proveedorId: proveedor.id,
                proveedorNombre: proveedor.nombre,
                precio: producto.precio,
                unidadMedida: producto.unidadMedida,
                disponible: producto.disponible
              });
            }
          }
        });
        
        // Ordenar por precio (menor a mayor)
        proveedoresConProducto.sort((a, b) => a.precio - b.precio);
        
        resultado.set(productoNombre, proveedoresConProducto);
      });
      
      console.log('💰 Cotizaciones obtenidas para', productosNombres.length, 'productos');
      resolve(resultado);
    }, 100);
  });
};