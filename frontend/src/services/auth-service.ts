/**
 * SERVICIO DE AUTENTICACIÓN - CONECTADO AL BACKEND
 * Maneja login, logout y sesión actual con API REST
 */

import api from '../config/Axios';
import { RolUsuario, IUsuarioAuth } from '../types/usuario.types';
import { logger } from '../utils/logger';

// Actualizamos la definición de Sesión para usar la nueva interfaz
export interface ISesion {
  usuario: IUsuarioAuth;
  token: string;
  fechaInicio: string;
  terminosAceptados: boolean;
}

const SESION_KEY = 'sesion_actual';

/**
 * Iniciar sesión - ESTANDARIZADO A /api/v1/auth/login
 */
export const iniciarSesionService = async (correo: string, contrasena: string, recordarSesion = false): Promise<ISesion> => {
  try {
    const endpoint = '/auth/login';
    logger.log(`[AUTH] POST ${(api.defaults.baseURL ?? '')}${endpoint}`);
    logger.log(`[AUTH] Payload →`, { email: correo, contrasena: '***', recordarSesion });

    const response = await api.post(endpoint, {
      email: correo,
      contrasena: contrasena,
      recordarSesion: recordarSesion
    });

    console.log(`[AUTH] ✅ ${response.status} OK →`, response.data);
    const { usuario, token, terminosAceptados } = response.data;

    const usuarioFrontend: IUsuarioAuth = {
      id: (usuario.idUsuario || usuario.id || '').toString(),
      nombreCompleto: usuario.nombreCompleto || '',
      correo: usuario.email || correo,
      rol: usuario.nombreRol || usuario.rol || '',
      fotoPerfil: usuario.urlFotoPerfil || usuario.fotoPerfil,
      fechaCreacion: usuario.fechaCreacion || new Date().toISOString(),
      ultimoAcceso: usuario.ultimoAcceso || new Date().toISOString()
    };

    const sesion: ISesion = {
      usuario: usuarioFrontend,
      token: token,
      fechaInicio: new Date().toISOString(),
      terminosAceptados: terminosAceptados === true,
    };

    localStorage.setItem(SESION_KEY, JSON.stringify(sesion));
    return sesion;
  } catch (error: any) {
    logger.error(`[AUTH] ❌ Error en login:`);
    logger.error(`  → Status:  `, error.response?.status ?? 'SIN RESPUESTA (red/timeout)');
    logger.error(`  → URL:     `, error.config?.url);
    logger.error(`  → BaseURL: `, error.config?.baseURL);
    logger.error(`  → Message: `, error.response?.data ?? error.message);
    throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
  }
};

/**
 * Renovar Access Token usando el Refresh Token almacenado en cookie HttpOnly.
 * El backend lee la cookie automáticamente.
 * Retorna el nuevo token o null si falló.
 */
export const renovarSesionService = async (): Promise<string | null> => {
  try {
    const response = await api.post('/auth/refresh', {}, { withCredentials: true });
    const { token } = response.data;

    const sesionStr = localStorage.getItem(SESION_KEY);
    if (sesionStr && token) {
      const sesion: ISesion = JSON.parse(sesionStr);
      sesion.token = token;
      localStorage.setItem(SESION_KEY, JSON.stringify(sesion));
    }

    return token ?? null;
  } catch {
    return null;
  }
};

/**
 * Cerrar sesión - Notifica al backend para revocar el Refresh Token y limpia localStorage.
 */
export const cerrarSesionService = async (): Promise<void> => {
  try {
    await api.post('/auth/logout', {}, { withCredentials: true });
  } catch {
    // Aunque falle el backend, limpiamos la sesión local
  } finally {
    localStorage.removeItem(SESION_KEY);
  }
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

    return base64String;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || 'Error al actualizar foto de perfil');
  }
};

// Alias para compatibilidad
export const getCurrentUserService = obtenerUsuarioActualService;

/**
 * Registra la aceptación de los términos y condiciones en el backend.
 * Actualiza el flag en la sesión local para que no vuelva a mostrar el modal.
 */
export const aceptarTerminosService = async (): Promise<void> => {
  await api.post('/auth/terminos/aceptar', {}, { withCredentials: true });
  const sesionStr = localStorage.getItem(SESION_KEY);
  if (sesionStr) {
    const sesion: ISesion = JSON.parse(sesionStr);
    sesion.terminosAceptados = true;
    localStorage.setItem(SESION_KEY, JSON.stringify(sesion));
  }
};

/**
 * Retorna si el usuario de la sesión actual ya aceptó los términos vigentes.
 */
export const obtenerTerminosAceptadosService = (): boolean => {
  const sesion = obtenerSesionActualService();
  return sesion?.terminosAceptados === true;
};