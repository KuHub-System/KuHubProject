/**
 * TIPOS DEL SISTEMA DE AUTENTICACIÓN
 */

import { IUsuario, RolUsuario } from './usuario.types';

export interface ICredenciales {
  correo: string;
  contrasena: string;
}

export interface ISesion {
  usuario: IUsuario;
  token: string; // Simulado
  fechaInicio: string;
}

export interface IAuthContext {
  usuario: IUsuario | null;
  estaAutenticado: boolean;
  iniciarSesion: (correo: string, contrasena: string) => Promise<void>;
  cerrarSesion: () => void;
  actualizarUsuario: (usuario: IUsuario) => void;
  tienePermiso: (permiso: string) => boolean;
}