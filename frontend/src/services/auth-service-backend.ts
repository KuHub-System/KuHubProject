/**
 * SERVICIO DE AUTENTICACIÓN - CONECTADO AL BACKEND
 * Maneja login, logout y sesión actual con API REST
 */

import api from '../config/Axios';
import { IUsuario } from '../types/usuario.types';
import { ISesion } from '../types/auth.types';

const SESION_KEY = 'sesion_actual';

/**
 * Iniciar sesión - CONECTADO AL BACKEND
 */
export const iniciarSesionService = async (correo: string, contrasena: string): Promise<ISesion> => {
  try {
    // Llamada al backend
    const response = await api.post('/auth/login', {
      email: correo,
      contrasena: contrasena
    });

    // El backend devuelve: { usuario: {...}, token: "...", mensaje: "..." }
    const { usuario, token } = response.data;

    // Convertir el usuario del backend al formato del frontend
    const usuarioFrontend: IUsuario = {
      id: usuario.idUsuario.toString(),
      nombreCompleto: usuario.nombreCompleto,
      correo: usuario.email,
      contrasena: '', // No guardar la contraseña
      rol: usuario.nombreRol,
      fotoPerfil: usuario.fotoPerfil,
      activo: usuario.activo,
      fechaCreacion: usuario.fechaCreacion,
      ultimoAcceso: usuario.ultimoAcceso
    };

    // Crear sesión
    const sesion: ISesion = {
      usuario: usuarioFrontend,
      token: token,
      fechaInicio: new Date().toISOString(),
    };

    // Guardar sesión en localStorage
    localStorage.setItem(SESION_KEY, JSON.stringify(sesion));

    console.log('✅ Sesión iniciada (BACKEND):', usuarioFrontend.correo, `(${usuarioFrontend.rol})`);
    return sesion;
  } catch (error: any) {
    console.error('❌ Error al iniciar sesión:', error);
    throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
  }
};

/**
 * Cerrar sesión
 */
export const cerrarSesionService = async (): Promise<void> => {
  try {
    // Opcional: notificar al backend (si quieres llevar registro)
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Error al notificar logout al backend:', error);
  } finally {
    localStorage.removeItem(SESION_KEY);
    console.log('✅ Sesión cerrada');
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
export const obtenerUsuarioActualService = (): IUsuario | null => {
  const sesion = obtenerSesionActualService();
  return sesion ? sesion.usuario : null;
};

/**
 * Actualizar usuario en sesión actual
 */
export const actualizarUsuarioEnSesionService = (usuario: IUsuario): void => {
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

    // Verificar que las contraseñas nuevas coincidan
    if (datos.passwordNueva !== datos.confirmarPassword) {
      throw new Error('Las contraseñas nuevas no coinciden');
    }

    // Llamar al backend para cambiar la contraseña
    await api.patch(`/usuarios/${usuarioActual.id}/cambiar-contrasena`, {
      nuevaContrasena: datos.passwordNueva
    });

    console.log('✅ Contraseña actualizada correctamente');
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || 'Error al cambiar la contraseña');
  }
};

/**
 * Actualizar foto de perfil del usuario actual - CONECTADO AL BACKEND
 */
export const actualizarFotoPerfilService = async (archivo: File): Promise<string> => {
  try {
    const usuarioActual = obtenerUsuarioActualService();

    if (!usuarioActual) {
      throw new Error('No hay sesión activa');
    }

    // Leer el archivo como base64
    const base64String = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(archivo);
    });

    // Actualizar en el backend
    const response = await api.patch(`/usuarios/${usuarioActual.id}/foto-perfil`, {
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
