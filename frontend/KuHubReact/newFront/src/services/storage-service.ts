/**
 * SERVICIO DE ALMACENAMIENTO CENTRALIZADO
 * Maneja toda la persistencia de datos en localStorage
 * 
 * Ubicación: src/services/storage-service.ts
 */

import { IProducto, IMovimientoProducto } from '../types/producto.types';
import { IUser, IRole } from '../types/user.types';

// ==========================================
// CLAVES DE ALMACENAMIENTO
// ==========================================
const STORAGE_KEYS = {
  PRODUCTOS: 'kuhub-productos',
  MOVIMIENTOS: 'kuhub-movimientos',
  USUARIOS: 'kuhub-usuarios',
  ROLES: 'sistema-roles-configurados', // Usar la misma que roles-context
  AUTH_TOKEN: 'authToken',
  CURRENT_USER: 'user',
  CATEGORIAS: 'kuhub-categorias',
  UNIDADES: 'kuhub-unidades',
} as const;

// ==========================================
// TIPOS AUXILIARES
// ==========================================
interface StoredUser extends IUser {
  password: string; // Hash simple de la contraseña
}

// ==========================================
// FUNCIONES DE UTILIDAD
// ==========================================

/**
 * Genera un ID único
 */
const generarId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Hash simple para contraseñas (NO usar en producción real)
 * En producción debes usar bcrypt en el backend
 */
const hashPassword = (password: string): string => {
  return btoa(password); // Simple base64 para desarrollo
};

/**
 * Verifica una contraseña
 */
const verificarPassword = (password: string, hash: string): boolean => {
  return btoa(password) === hash;
};

// ==========================================
// INICIALIZACIÓN DEL SISTEMA
// ==========================================

/**
 * Inicializa el sistema con datos por defecto si no existen
 */
export const inicializarSistema = (): void => {
  // Inicializar usuarios por defecto
  if (!localStorage.getItem(STORAGE_KEYS.USUARIOS)) {
    const usuariosIniciales: StoredUser[] = [
      {
        id: '1',
        nombre: 'Administrador',
        email: 'admin@kuhub.cl',
        password: hashPassword('admin123'),
        rol: 'Admin',
        fechaCreacion: new Date().toISOString(),
        ultimoAcceso: new Date().toISOString(),
      },
      {
        id: '2',
        nombre: 'Co-Administrador',
        email: 'coadmin@kuhub.cl',
        password: hashPassword('coadmin123'),
        rol: 'Co-Admin',
        fechaCreacion: new Date().toISOString(),
        ultimoAcceso: new Date().toISOString(),
      },
      {
        id: '3',
        nombre: 'Gestor de Pedidos',
        email: 'gestor@kuhub.cl',
        password: hashPassword('gestor123'),
        rol: 'Gestor de Pedidos',
        fechaCreacion: new Date().toISOString(),
        ultimoAcceso: new Date().toISOString(),
      },
      {
        id: '4',
        nombre: 'Profesor',
        email: 'profesor@kuhub.cl',
        password: hashPassword('profesor123'),
        rol: 'Profesor a Cargo',
        fechaCreacion: new Date().toISOString(),
        ultimoAcceso: new Date().toISOString(),
      },
      {
        id: '5',
        nombre: 'Encargado Bodega',
        email: 'bodega@kuhub.cl',
        password: hashPassword('bodega123'),
        rol: 'Encargado de Bodega',
        fechaCreacion: new Date().toISOString(),
        ultimoAcceso: new Date().toISOString(),
      },
      {
        id: '6',
        nombre: 'Asistente',
        email: 'asistente@kuhub.cl',
        password: hashPassword('asistente123'),
        rol: 'Asistente de Bodega',
        fechaCreacion: new Date().toISOString(),
        ultimoAcceso: new Date().toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuariosIniciales));
    console.log('✅ Usuarios iniciales creados');
  }

  // Inicializar productos si no existen
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTOS)) {
    const productosIniciales: IProducto[] = [
      {
        id: generarId(),
        nombre: 'Harina',
        descripcion: 'Harina de trigo para todo uso',
        categoria: 'Secos',
        unidadMedida: 'kg',
        stock: 50,
        stockMinimo: 10,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
      },
      {
        id: generarId(),
        nombre: 'Aceite de Oliva',
        descripcion: 'Aceite de oliva extra virgen',
        categoria: 'Líquidos',
        unidadMedida: 'l',
        stock: 25,
        stockMinimo: 5,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
      },
      {
        id: generarId(),
        nombre: 'Azúcar',
        descripcion: 'Azúcar blanca refinada',
        categoria: 'Secos',
        unidadMedida: 'kg',
        stock: 30,
        stockMinimo: 8,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
      },
      {
        id: generarId(),
        nombre: 'Leche',
        descripcion: 'Leche entera',
        categoria: 'Lácteos',
        unidadMedida: 'l',
        stock: 40,
        stockMinimo: 15,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
      },
      {
        id: generarId(),
        nombre: 'Huevos',
        descripcion: 'Huevos frescos tamaño L',
        categoria: 'Frescos',
        unidadMedida: 'unidad',
        stock: 120,
        stockMinimo: 30,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEYS.PRODUCTOS, JSON.stringify(productosIniciales));
    console.log('✅ Productos iniciales creados');
  }

  // Inicializar movimientos vacíos si no existen
  if (!localStorage.getItem(STORAGE_KEYS.MOVIMIENTOS)) {
    localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify([]));
  }

  // Inicializar roles si no existen (los del roles-context)
  if (!localStorage.getItem(STORAGE_KEYS.ROLES)) {
    const rolesIniciales: IRole[] = [
      {
        id: '1',
        nombre: 'Admin',
        permisos: ['dashboard', 'inventario', 'solicitud', 'gestion-pedidos', 'conglomerado-pedidos', 'gestion-proveedores', 'bodega-transito', 'gestion-recetas', 'ramos-admin', 'gestion-roles']
      },
      {
        id: '2',
        nombre: 'Co-Admin',
        permisos: ['dashboard', 'inventario', 'solicitud', 'gestion-pedidos', 'conglomerado-pedidos', 'gestion-proveedores', 'bodega-transito', 'gestion-recetas', 'ramos-admin']
      },
      {
        id: '3',
        nombre: 'Gestor de Pedidos',
        permisos: ['dashboard', 'gestion-pedidos', 'conglomerado-pedidos']
      },
      {
        id: '4',
        nombre: 'Profesor a Cargo',
        permisos: ['dashboard', 'solicitud']
      },
      {
        id: '5',
        nombre: 'Encargado de Bodega',
        permisos: ['dashboard', 'inventario']
      },
      {
        id: '6',
        nombre: 'Asistente de Bodega',
        permisos: ['dashboard', 'bodega-transito']
      }
    ];
    localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(rolesIniciales));
    console.log('✅ Roles iniciales creados');
  }

  console.log('🎉 Sistema inicializado correctamente');
};

// ==========================================
// GESTIÓN DE USUARIOS
// ==========================================

/**
 * Obtiene todos los usuarios (sin contraseñas)
 */
export const obtenerUsuarios = (): IUser[] => {
  const usuarios = localStorage.getItem(STORAGE_KEYS.USUARIOS);
  if (!usuarios) return [];
  
  const storedUsers: StoredUser[] = JSON.parse(usuarios);
  // Excluir contraseñas de la respuesta
  return storedUsers.map(({ password, ...user }) => user);
};

/**
 * Autentica un usuario
 */
export const autenticarUsuario = (email: string, password: string): IUser | null => {
  const usuarios = localStorage.getItem(STORAGE_KEYS.USUARIOS);
  if (!usuarios) return null;
  
  const storedUsers: StoredUser[] = JSON.parse(usuarios);
  const usuario = storedUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!usuario || !verificarPassword(password, usuario.password)) {
    return null;
  }
  
  // Actualizar último acceso
  usuario.ultimoAcceso = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(storedUsers));
  
  // Retornar sin contraseña
  const { password: _, ...userSinPassword } = usuario;
  return userSinPassword;
};

/**
 * Crea un nuevo usuario
 */
export const crearUsuario = (datos: Omit<StoredUser, 'id' | 'fechaCreacion' | 'ultimoAcceso'>): IUser => {
  const usuarios = localStorage.getItem(STORAGE_KEYS.USUARIOS);
  const storedUsers: StoredUser[] = usuarios ? JSON.parse(usuarios) : [];
  
  const nuevoUsuario: StoredUser = {
    id: generarId(),
    ...datos,
    password: hashPassword(datos.password),
    fechaCreacion: new Date().toISOString(),
    ultimoAcceso: new Date().toISOString(),
  };
  
  storedUsers.push(nuevoUsuario);
  localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(storedUsers));
  
  const { password, ...userSinPassword } = nuevoUsuario;
  return userSinPassword;
};

// ==========================================
// GESTIÓN DE PRODUCTOS
// ==========================================

/**
 * Obtiene todos los productos
 */
export const obtenerProductos = (): IProducto[] => {
  const productos = localStorage.getItem(STORAGE_KEYS.PRODUCTOS);
  return productos ? JSON.parse(productos) : [];
};

/**
 * Obtiene un producto por ID
 */
export const obtenerProductoPorId = (id: string): IProducto | null => {
  const productos = obtenerProductos();
  return productos.find(p => p.id === id) || null;
};

/**
 * Crea un nuevo producto
 */
export const crearProducto = (producto: Omit<IProducto, 'id' | 'fechaCreacion' | 'fechaActualizacion'>): IProducto => {
  const productos = obtenerProductos();
  
  const nuevoProducto: IProducto = {
    id: generarId(),
    ...producto,
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
  };
  
  productos.push(nuevoProducto);
  localStorage.setItem(STORAGE_KEYS.PRODUCTOS, JSON.stringify(productos));
  
  return nuevoProducto;
};

/**
 * Actualiza un producto
 */
export const actualizarProducto = (id: string, cambios: Partial<IProducto>): IProducto | null => {
  const productos = obtenerProductos();
  const index = productos.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  productos[index] = {
    ...productos[index],
    ...cambios,
    id, // Asegurar que el ID no cambie
    fechaActualizacion: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEYS.PRODUCTOS, JSON.stringify(productos));
  return productos[index];
};

/**
 * Elimina un producto
 */
export const eliminarProducto = (id: string): boolean => {
  const productos = obtenerProductos();
  const productosFiltrados = productos.filter(p => p.id !== id);
  
  if (productos.length === productosFiltrados.length) {
    return false; // No se encontró el producto
  }
  
  localStorage.setItem(STORAGE_KEYS.PRODUCTOS, JSON.stringify(productosFiltrados));
  return true;
};

// ==========================================
// GESTIÓN DE MOVIMIENTOS
// ==========================================

/**
 * Obtiene todos los movimientos
 */
export const obtenerMovimientos = (): IMovimientoProducto[] => {
  const movimientos = localStorage.getItem(STORAGE_KEYS.MOVIMIENTOS);
  return movimientos ? JSON.parse(movimientos) : [];
};

/**
 * Obtiene movimientos de un producto específico
 */
export const obtenerMovimientosPorProducto = (productoId: string): IMovimientoProducto[] => {
  const movimientos = obtenerMovimientos();
  return movimientos
    .filter(m => m.productoId === productoId)
    .sort((a, b) => new Date(b.fechaMovimiento).getTime() - new Date(a.fechaMovimiento).getTime());
};

/**
 * Crea un movimiento y actualiza el stock del producto
 */
export const crearMovimiento = (
  movimientoData: {
    productoId: string;
    tipo: 'Entrada' | 'Salida' | 'Merma';
    cantidad: number;
    observacion: string;
  },
  responsable: string
): IMovimientoProducto | null => {
  const producto = obtenerProductoPorId(movimientoData.productoId);
  if (!producto) return null;
  
  // Calcular nuevo stock
  let nuevoStock = producto.stock;
  switch (movimientoData.tipo) {
    case 'Entrada':
      nuevoStock += movimientoData.cantidad;
      break;
    case 'Salida':
    case 'Merma':
      nuevoStock -= movimientoData.cantidad;
      if (nuevoStock < 0) {
        throw new Error('Stock insuficiente');
      }
      break;
  }
  
  // Crear el movimiento
  const nuevoMovimiento: IMovimientoProducto = {
    id: generarId(),
    productoId: movimientoData.productoId,
    productoNombre: producto.nombre,
    tipo: movimientoData.tipo,
    cantidad: movimientoData.cantidad,
    observacion: movimientoData.observacion,
    fechaMovimiento: new Date().toISOString(),
    responsable,
  };
  
  // Guardar movimiento
  const movimientos = obtenerMovimientos();
  movimientos.push(nuevoMovimiento);
  localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(movimientos));
  
  // Actualizar stock del producto
  actualizarProducto(producto.id, { stock: nuevoStock });
  
  return nuevoMovimiento;
};

// ==========================================
// GESTIÓN DE ROLES
// ==========================================

/**
 * Obtiene todos los roles
 */
export const obtenerRoles = (): IRole[] => {
  const roles = localStorage.getItem(STORAGE_KEYS.ROLES);
  return roles ? JSON.parse(roles) : [];
};

/**
 * Actualiza los roles
 */
export const actualizarRoles = (roles: IRole[]): void => {
  localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));
};

// ==========================================
// UTILIDADES DE DEPURACIÓN
// ==========================================

/**
 * Resetea todo el sistema (usar con cuidado)
 */
export const resetearSistema = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  inicializarSistema();
  console.log('🔄 Sistema reseteado completamente');
};

/**
 * Exporta todos los datos del sistema
 */
export const exportarDatos = () => {
  return {
    productos: obtenerProductos(),
    movimientos: obtenerMovimientos(),
    usuarios: obtenerUsuarios(),
    roles: obtenerRoles(),
    fecha: new Date().toISOString(),
  };
};

/**
 * Muestra estadísticas del sistema
 */
export const estadisticasSistema = () => {
  return {
    totalProductos: obtenerProductos().length,
    totalMovimientos: obtenerMovimientos().length,
    totalUsuarios: obtenerUsuarios().length,
    totalRoles: obtenerRoles().length,
    productosBajoStock: obtenerProductos().filter(p => p.stock <= p.stockMinimo).length,
  };
};