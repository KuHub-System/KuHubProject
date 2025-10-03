/**
 * Interfaz que define la estructura de un rol de usuario.
 */
export interface IRole {
  id: string;
  nombre: string;
  permisos: string[];
}

/**
 * Interfaz que define la estructura de un usuario.
 */
export interface IUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  avatar?: string;
  fechaCreacion: string;
  ultimoAcceso: string;
}

/**
 * Interfaz para los datos de inicio de sesión.
 */
export interface ILoginData {
  email: string;
  password: string;
}

/**
 * Interfaz para los datos de respuesta del inicio de sesión.
 */
export interface ILoginResponse {
  user: IUser;
  token: string;
}

/**
 * Interfaz para los datos de cambio de contraseña.
 */
export interface ICambioPassword {
  passwordActual: string;
  passwordNueva: string;
  confirmarPassword: string;
}
