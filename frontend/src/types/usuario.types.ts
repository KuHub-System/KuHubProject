/**
 * TIPOS DEL SISTEMA DE USUARIOS Y ROLES
 */

export type RolUsuario = 
  | 'Administrador'
  | 'Co-Administrador'
  | 'Gestor de Pedidos'
  | 'Profesor a Cargo'
  | 'Encargado de Bodega'
  | 'Asistente de Bodega';

export interface IUsuario {
  id: string;
  nombreCompleto: string;
  correo: string;
  contrasena: string; // En producción esto debería estar hasheado
  rol: RolUsuario;
  fotoPerfil?: string; // URL o base64 de la imagen
  activo: boolean;
  fechaCreacion: string;
  ultimoAcceso?: string;
}

export interface IUsuarioCreacion {
  nombreCompleto: string;
  correo: string;
  contrasena: string;
  rol: RolUsuario;
  fotoPerfil?: string;
}

export interface IUsuarioActualizacion {
  nombreCompleto?: string;
  correo?: string;
  contrasena?: string;
  rol?: RolUsuario;
  fotoPerfil?: string;
  activo?: boolean;
}

/**
 * Permisos por rol
 */
export interface IPermisosRol {
  dashboard: boolean;
  gestionUsuarios: boolean;
  gestionSolicitudes: boolean;
  gestionRecetas: boolean;
  inventario: boolean;
  bodegaPrincipal: boolean;
  bodegaTransito: boolean;
  crearSolicitudes: boolean;
  aprobarSolicitudes: boolean;
  gestionarProcesoPedidos: boolean;
}

/**
 * Mapa de permisos por rol
 */
export const PERMISOS_POR_ROL: Record<RolUsuario, IPermisosRol> = {
  'Administrador': {
    dashboard: true,
    gestionUsuarios: true,
    gestionSolicitudes: true,
    gestionRecetas: true,
    inventario: true,
    bodegaPrincipal: true,
    bodegaTransito: true,
    crearSolicitudes: false,
    aprobarSolicitudes: true,
    gestionarProcesoPedidos: true,
  },
  'Co-Administrador': {
    dashboard: true,
    gestionUsuarios: false,
    gestionSolicitudes: true,
    gestionRecetas: true,
    inventario: true,
    bodegaPrincipal: true,
    bodegaTransito: true,
    crearSolicitudes: false,
    aprobarSolicitudes: true,
    gestionarProcesoPedidos: true,
  },
  'Gestor de Pedidos': {
    dashboard: true,
    gestionUsuarios: false,
    gestionSolicitudes: true,
    gestionRecetas: false,
    inventario: true,
    bodegaPrincipal: true,
    bodegaTransito: false,
    crearSolicitudes: false,
    aprobarSolicitudes: false,
    gestionarProcesoPedidos: true,
  },
  'Profesor a Cargo': {
    dashboard: false,
    gestionUsuarios: false,
    gestionSolicitudes: true, // Solo ve las suyas
    gestionRecetas: true,
    inventario: false,
    bodegaPrincipal: false,
    bodegaTransito: false,
    crearSolicitudes: true,
    aprobarSolicitudes: false,
    gestionarProcesoPedidos: false,
  },
  'Encargado de Bodega': {
    dashboard: false,
    gestionUsuarios: false,
    gestionSolicitudes: false,
    gestionRecetas: false,
    inventario: true,
    bodegaPrincipal: true,
    bodegaTransito: false,
    crearSolicitudes: false,
    aprobarSolicitudes: false,
    gestionarProcesoPedidos: false,
  },
  'Asistente de Bodega': {
    dashboard: false,
    gestionUsuarios: false,
    gestionSolicitudes: false,
    gestionRecetas: false,
    inventario: true,
    bodegaPrincipal: false,
    bodegaTransito: true,
    crearSolicitudes: false,
    aprobarSolicitudes: false,
    gestionarProcesoPedidos: false,
  },
};

/**
 * Helper para verificar permisos
 */
export const tienePermiso = (rol: RolUsuario, permiso: keyof IPermisosRol): boolean => {
  return PERMISOS_POR_ROL[rol][permiso];
};