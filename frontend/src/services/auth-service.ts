/**
 * SERVICIO DE AUTENTICACIÓN - CONECTADO AL BACKEND
 * Maneja login, logout y sesión actual con API REST
 */

import api from '../config/Axios';
import { RolUsuario } from '../types/usuario.types';

// --- DEFINICIÓN DE INTERFAZ (Según tu solicitud) ---
export interface IUsuarioAuth {
  nombreCompleto: string;
  correo: string;
  rol: RolUsuario; // Asegúrate de que 'Administrador' | 'Usuario' coincida con lo que viene del back
  fotoPerfil?: string;
  ultimoAcceso?: string;
}

// Actualizamos la definición de Sesión para usar la nueva interfaz
export interface ISesion {
  usuario: IUsuarioAuth;
  token: string;
  fechaInicio: string;
}

const SESION_KEY = 'sesion_actual';

/**
 * Iniciar sesión - ESTANDARIZADO A /api/v1/auth/login
 */
export const iniciarSesionService = async (correo: string, contrasena: string): Promise<ISesion> => {
  try {
    console.log('🔐 Intentando login en:', correo);

    // Axios usará baseURL (http://localhost:8080/api/v1) + /auth/login
    const response = await api.post('/auth/login', {
      email: correo,
      contrasena: contrasena
    });

    const { usuario, token } = response.data;

    const usuarioFrontend: IUsuarioAuth = {
      nombreCompleto: usuario.nombreCompleto,
      correo: usuario.email,             // Mapeo: email -> correo
      rol: usuario.nombreRol,            // Mapeo: nombreRol -> rol
      fotoPerfil: usuario.urlFotoPerfil, // Mapeo: urlFotoPerfil -> fotoPerfil
      ultimoAcceso: usuario.ultimoAcceso
    };

    const sesion: ISesion = {
      usuario: usuarioFrontend,
      token: token,
      fechaInicio: new Date().toISOString(),
    };

    localStorage.setItem(SESION_KEY, JSON.stringify(sesion));
    return sesion;
  } catch (error: any) {
    console.error('❌ Error login:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
  }
};

/**
 * Cerrar sesión - Solo limpieza local (JWT no requiere notificación al backend)
 */
export const cerrarSesionService = async (): Promise<void> => {
  localStorage.removeItem(SESION_KEY);
  console.log('✅ Sesión cerrada localmente');
};

/**
 * Obtener sesión actual
 */
export const obtenerSesionActualService = (): ISesion | null => {
  const data = localStorage.getItem(SESION_KEY);
  if (!data) return null;

  try {
    const sesion: ISesion = JSON.parse(data);
    return sesion;
  } catch (error) {
    console.error('Error al parsear sesión:', error);
    return null;
  }
};

/**
 * Verificar si hay sesión activa
 */
export const hayaSesionActivaService = (): boolean => {
  return obtenerSesionActualService() !== null;
};

/**
 * Obtener usuario actual
 */
export const obtenerUsuarioActualService = (): IUsuarioAuth | null => {
  const sesion = obtenerSesionActualService();
  return sesion ? sesion.usuario : null;
};

/**
 * Actualizar usuario en sesión actual
 */
export const actualizarUsuarioEnSesionService = (usuario: IUsuarioAuth): void => {
  const sesion = obtenerSesionActualService();
  if (sesion) {
    sesion.usuario = usuario;
    localStorage.setItem(SESION_KEY, JSON.stringify(sesion));
  }
};

/**
 * Cambiar contraseña del usuario actual - CONECTADO AL BACKEND
 */
export const cambiarPasswordService = async (datos: {
  passwordActual: string;
  passwordNueva: string;
  confirmarPassword: string;
}): Promise<void> => {
  try {
    const usuarioActual = obtenerUsuarioActualService();

    if (!usuarioActual) {
      throw new Error('No hay sesión activa');
    }

    if (datos.passwordNueva !== datos.confirmarPassword) {
      throw new Error('Las contraseñas nuevas no coinciden');
    }

    // MODIFICADO: Se elimina ${id} de la URL. 
    // Se asume ruta: PATCH /usuarios/cambiar-contrasena (usando Token)
    await api.patch(`/usuarios/cambiar-contrasena`, {
      nuevaContrasena: datos.passwordNueva
    });

    console.log('✅ Contraseña actualizada correctamente');
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || 'Error al cambiar la contraseña');
  }
};

/**
 * Actualizar foto de perfil del usuario actual
 * NOTA: Al no tener ID, la ruta debe ser genérica y usar el Token.
 */
export const actualizarFotoPerfilService = async (archivo: File): Promise<string> => {
  try {
    const usuarioActual = obtenerUsuarioActualService();

    if (!usuarioActual) {
      throw new Error('No hay sesión activa');
    }

    const base64String = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(archivo);
    });

    // MODIFICADO: Se elimina ${id} de la URL.
    // Se asume ruta: PATCH /usuarios/foto-perfil (usando Token)
    await api.patch(`/usuarios/foto-perfil`, {
      fotoPerfil: base64String
    });

    // Actualizar en la sesión local
    const usuarioActualizado = { ...usuarioActual, fotoPerfil: base64String };
    actualizarUsuarioEnSesionService(usuarioActualizado);

    console.log('✅ Foto de perfil actualizada correctamente');
    return base64String;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || 'Error al actualizar foto de perfil');
  }
};

// Alias para compatibilidad
export const getCurrentUserService = obtenerUsuarioActualService;