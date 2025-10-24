/**
 * SERVICIO DE ALMACENAMIENTO CENTRALIZADO
 * Maneja toda la persistencia de datos en localStorage
 * 
 * Ubicación: src/services/storage-service.ts
 */

import { IProducto, IMovimientoProducto } from '../types/producto.types';
import { IUser, IRole } from '../types/user.types';
import { 
  IReceta, 
  IIngrediente, 
  ISolicitud, 
  IItemSolicitud,
  IActualizarSolicitud
} from '../types/receta.types';
import { ROLES_STORAGE_KEY, ROLES_SISTEMA, guardarRoles as guardarRolesConfig } from '../config/roles-config';

// ==========================================
// CLAVES DE ALMACENAMIENTO
// ==========================================
const STORAGE_KEYS = {
  PRODUCTOS: 'kuhub-productos',
  MOVIMIENTOS: 'kuhub-movimientos',
  USUARIOS: 'kuhub-usuarios',
  ROLES: ROLES_STORAGE_KEY, // ✅ Usar clave centralizada
  AUTH_TOKEN: 'authToken',
  CURRENT_USER: 'user',
  CATEGORIAS: 'kuhub-categorias',
  UNIDADES: 'kuhub-unidades',
  RECETAS: 'kuhub-recetas',
  SOLICITUDES: 'kuhub-solicitudes',
} as const;

// ==========================================
// TIPOS AUXILIARES
// ==========================================
interface StoredUser extends IUser {
  password: string;
}

export interface IIngredienteReceta {
  id: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  unidadMedida: string;
}

// ==========================================
// FUNCIONES DE UTILIDAD
// ==========================================

const generarId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const hashPassword = (password: string): string => {
  return btoa(password);
};

const verificarPassword = (password: string, hash: string): boolean => {
  return btoa(password) === hash;
};

// ==========================================
// INICIALIZACIÓN DEL SISTEMA
// ==========================================

export const inicializarSistema = (): void => {
  if (!localStorage.getItem(STORAGE_KEYS.USUARIOS)) {
    const usuariosIniciales: StoredUser[] = [
      {
        id: '1',
        nombre: 'Administrador',
        email: 'admin@kuhub.cl',
        password: hashPassword('admin123'),
        rol: 'Administrador',
        fechaCreacion: new Date().toISOString(),
        ultimoAcceso: new Date().toISOString(),
      },
      {
        id: '2',
        nombre: 'Co-Administrador',
        email: 'coadmin@kuhub.cl',
        password: hashPassword('coadmin123'),
        rol: 'Co-Administrador',
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

  if (!localStorage.getItem(STORAGE_KEYS.MOVIMIENTOS)) {
    localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify([]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.RECETAS)) {
    localStorage.setItem(STORAGE_KEYS.RECETAS, JSON.stringify([]));
    console.log('✅ Sistema de recetas inicializado');
  }

  if (!localStorage.getItem(STORAGE_KEYS.SOLICITUDES)) {
    localStorage.setItem(STORAGE_KEYS.SOLICITUDES, JSON.stringify([]));
    console.log('✅ Sistema de solicitudes inicializado');
  }

  if (!localStorage.getItem(STORAGE_KEYS.ROLES)) {
    guardarRolesConfig(ROLES_SISTEMA);
    console.log('✅ Roles iniciales creados desde roles-config');
  }

  console.log('🎉 Sistema inicializado correctamente');
};

// ==========================================
// GESTIÓN DE USUARIOS
// ==========================================

export const obtenerUsuarios = (): IUser[] => {
  const usuarios = localStorage.getItem(STORAGE_KEYS.USUARIOS);
  if (!usuarios) return [];
  
  const storedUsers: StoredUser[] = JSON.parse(usuarios);
  return storedUsers.map(({ password, ...user }) => user);
};

export const autenticarUsuario = (email: string, password: string): IUser | null => {
  const usuarios = localStorage.getItem(STORAGE_KEYS.USUARIOS);
  if (!usuarios) return null;
  
  const storedUsers: StoredUser[] = JSON.parse(usuarios);
  const usuario = storedUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!usuario || !verificarPassword(password, usuario.password)) {
    return null;
  }
  
  usuario.ultimoAcceso = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(storedUsers));
  
  const { password: _, ...userSinPassword } = usuario;
  return userSinPassword;
};

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

export const obtenerProductos = (): IProducto[] => {
  const productos = localStorage.getItem(STORAGE_KEYS.PRODUCTOS);
  return productos ? JSON.parse(productos) : [];
};

export const obtenerProductoPorId = (id: string): IProducto | null => {
  const productos = obtenerProductos();
  return productos.find(p => p.id === id) || null;
};

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

export const actualizarProducto = (id: string, cambios: Partial<IProducto>): IProducto | null => {
  const productos = obtenerProductos();
  const index = productos.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  productos[index] = {
    ...productos[index],
    ...cambios,
    id,
    fechaActualizacion: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEYS.PRODUCTOS, JSON.stringify(productos));
  return productos[index];
};

export const eliminarProducto = (id: string): boolean => {
  const productos = obtenerProductos();
  const productosFiltrados = productos.filter(p => p.id !== id);
  
  if (productos.length === productosFiltrados.length) {
    return false;
  }
  
  localStorage.setItem(STORAGE_KEYS.PRODUCTOS, JSON.stringify(productosFiltrados));
  return true;
};

// ==========================================
// GESTIÓN DE MOVIMIENTOS
// ==========================================

export const obtenerMovimientos = (): IMovimientoProducto[] => {
  const movimientos = localStorage.getItem(STORAGE_KEYS.MOVIMIENTOS);
  return movimientos ? JSON.parse(movimientos) : [];
};

export const obtenerMovimientosPorProducto = (productoId: string): IMovimientoProducto[] => {
  const movimientos = obtenerMovimientos();
  return movimientos
    .filter(m => m.productoId === productoId)
    .sort((a, b) => new Date(b.fechaMovimiento).getTime() - new Date(a.fechaMovimiento).getTime());
};

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
  
  const movimientos = obtenerMovimientos();
  movimientos.push(nuevoMovimiento);
  localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(movimientos));
  
  actualizarProducto(producto.id, { stock: nuevoStock });
  
  return nuevoMovimiento;
};

// ==========================================
// GESTIÓN DE ROLES
// ==========================================

export const obtenerRoles = (): IRole[] => {
  const roles = localStorage.getItem(STORAGE_KEYS.ROLES);
  return roles ? JSON.parse(roles) : ROLES_SISTEMA;
};

export const actualizarRoles = (roles: IRole[]): void => {
  guardarRolesConfig(roles);
};

// ==========================================
// GESTIÓN DE RECETAS
// ==========================================

export const obtenerRecetas = (): IReceta[] => {
  const recetas = localStorage.getItem(STORAGE_KEYS.RECETAS);
  return recetas ? JSON.parse(recetas) : [];
};

export const obtenerRecetaPorId = (id: string): IReceta | null => {
  const recetas = obtenerRecetas();
  return recetas.find(r => r.id === id) || null;
};

export const crearReceta = (recetaData: Omit<IReceta, 'id' | 'fechaCreacion' | 'fechaActualizacion'>): IReceta => {
  const recetas = obtenerRecetas();
  
  const ingredientesConId: IIngrediente[] = recetaData.ingredientes.map(ing => ({
    ...ing,
    id: 'id' in ing && ing.id ? ing.id : generarId()
  }));
  
  const nuevaReceta: IReceta = {
    id: generarId(),
    ...recetaData,
    ingredientes: ingredientesConId,
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
  };
  
  recetas.push(nuevaReceta);
  localStorage.setItem(STORAGE_KEYS.RECETAS, JSON.stringify(recetas));
  
  return nuevaReceta;
};

export const actualizarReceta = (id: string, cambios: Partial<Omit<IReceta, 'id' | 'fechaCreacion' | 'fechaActualizacion'>>): IReceta | null => {
  const recetas = obtenerRecetas();
  const index = recetas.findIndex(r => r.id === id);
  
  if (index === -1) return null;
  
  let cambiosConIngredientes = { ...cambios };
  if (cambios.ingredientes) {
    const ingredientesConId: IIngrediente[] = cambios.ingredientes.map((ing: any) => ({
      ...ing,
      id: 'id' in ing && ing.id ? ing.id : generarId()
    }));
    cambiosConIngredientes.ingredientes = ingredientesConId;
  }
  
  recetas[index] = {
    ...recetas[index],
    ...cambiosConIngredientes,
    id,
    fechaActualizacion: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEYS.RECETAS, JSON.stringify(recetas));
  return recetas[index];
};

export const obtenerRecetasActivas = (): IReceta[] => {
  return obtenerRecetas().filter(r => r.estado === 'Activa');
};

export const eliminarReceta = (id: string): boolean => {
  const recetas = obtenerRecetas();
  const recetasFiltradas = recetas.filter(r => r.id !== id);
  
  if (recetas.length === recetasFiltradas.length) {
    return false;
  }
  
  localStorage.setItem(STORAGE_KEYS.RECETAS, JSON.stringify(recetasFiltradas));
  return true;
};

// ==========================================
// GESTIÓN DE SOLICITUDES
// ==========================================

export const obtenerSolicitudes = (): ISolicitud[] => {
  const solicitudes = localStorage.getItem(STORAGE_KEYS.SOLICITUDES);
  return solicitudes ? JSON.parse(solicitudes) : [];
};

export const obtenerSolicitudesPorUsuario = (usuarioId: string): ISolicitud[] => {
  const solicitudes = obtenerSolicitudes();
  return solicitudes
    .filter(s => s.usuarioId === usuarioId)
    .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
};

export const obtenerSolicitudPorId = (id: string): ISolicitud | null => {
  const solicitudes = obtenerSolicitudes();
  return solicitudes.find(s => s.id === id) || null;
};

export const crearSolicitud = (
  solicitudData: Omit<ISolicitud, 'id' | 'fechaCreacion' | 'fechaActualizacion' | 'solicitante' | 'usuarioId' | 'usuarioNombre' | 'estado'>,
  solicitante: string,
  usuarioId: string
): ISolicitud => {
  const solicitudes = obtenerSolicitudes();
  
  const itemsConId: IItemSolicitud[] = solicitudData.items.map(item => ({
    ...item,
    id: 'id' in item && item.id ? item.id : generarId()
  }));
  
  const nuevaSolicitud: ISolicitud = {
    id: generarId(),
    ...solicitudData,
    items: itemsConId,
    solicitante,
    usuarioId,
    usuarioNombre: solicitante,
    estado: 'Pendiente',
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
  };
  
  solicitudes.push(nuevaSolicitud);
  localStorage.setItem(STORAGE_KEYS.SOLICITUDES, JSON.stringify(solicitudes));
  
  return nuevaSolicitud;
};

export const actualizarSolicitud = (datos: IActualizarSolicitud): ISolicitud | null => {
  const solicitudes = obtenerSolicitudes();
  const index = solicitudes.findIndex(s => s.id === datos.id);
  
  if (index === -1) return null;
  
  const { id, ...cambios } = datos;
  
  solicitudes[index] = {
    ...solicitudes[index],
    ...cambios,
    fechaActualizacion: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEYS.SOLICITUDES, JSON.stringify(solicitudes));
  return solicitudes[index];
};

export const eliminarSolicitud = (id: string): boolean => {
  const solicitudes = obtenerSolicitudes();
  const solicitudesFiltradas = solicitudes.filter(s => s.id !== id);
  
  if (solicitudes.length === solicitudesFiltradas.length) {
    return false;
  }
  
  localStorage.setItem(STORAGE_KEYS.SOLICITUDES, JSON.stringify(solicitudesFiltradas));
  return true;
};

export const obtenerSolicitudesPorEstado = (estado: ISolicitud['estado']): ISolicitud[] => {
  return obtenerSolicitudes().filter(s => s.estado === estado);
};

// ==========================================
// UTILIDADES DE DEPURACIÓN
// ==========================================

export const resetearSistema = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  inicializarSistema();
  console.log('🔄 Sistema reseteado completamente');
};

export const exportarDatos = () => {
  return {
    productos: obtenerProductos(),
    movimientos: obtenerMovimientos(),
    usuarios: obtenerUsuarios(),
    roles: obtenerRoles(),
    recetas: obtenerRecetas(),
    solicitudes: obtenerSolicitudes(),
    fecha: new Date().toISOString(),
  };
};

export const estadisticasSistema = () => {
  return {
    totalProductos: obtenerProductos().length,
    totalMovimientos: obtenerMovimientos().length,
    totalUsuarios: obtenerUsuarios().length,
    totalRoles: obtenerRoles().length,
    totalRecetas: obtenerRecetas().length,
    totalSolicitudes: obtenerSolicitudes().length,
    productosBajoStock: obtenerProductos().filter(p => p.stock <= p.stockMinimo).length,
  };
};