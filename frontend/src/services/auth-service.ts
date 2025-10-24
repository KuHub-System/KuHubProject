/**
 * SERVICIO DE AUTENTICACIÓN
 * Maneja login, logout y sesión actual
 */

import { IUsuario } from '../types/usuario.types';
import { ISesion } from '../types/auth.types';
import { obtenerUsuarioPorCorreoService, inicializarUsuariosPorDefecto } from './usuario-service';

const SESION_KEY = 'sesion_actual';

/**
 * Inicializar el servicio de autenticación
 */
export const inicializarAuthService = (): void => {
  inicializarUsuariosPorDefecto();
};

/**
 * Iniciar sesión
 */
export const iniciarSesionService = (correo: string, contrasena: string): Promise<ISesion> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Buscar usuario por correo
      const usuario = await obtenerUsuarioPorCorreoService(correo);
      
      if (!usuario) {
        reject(new Error('Correo o contraseña incorrectos'));
        return;
      }
      
      // Verificar si está activo
      if (!usuario.activo) {
        reject(new Error('Usuario desactivado. Contacte al administrador'));
        return;
      }
      
      // Verificar contraseña (en producción usar bcrypt)
      if (usuario.contrasena !== contrasena) {
        reject(new Error('Correo o contraseña incorrectos'));
        return;
      }
      
      // Crear sesión
      const sesion: ISesion = {
        usuario: {
          ...usuario,
          ultimoAcceso: new Date().toISOString(),
        },
        token: btoa(`${usuario.id}:${Date.now()}`), // Token simulado
        fechaInicio: new Date().toISOString(),
      };
      
      // Guardar sesión
      localStorage.setItem(SESION_KEY, JSON.stringify(sesion));
      
      // Actualizar último acceso del usuario
      const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
      const index = usuarios.findIndex((u: IUsuario) => u.id === usuario.id);
      if (index !== -1) {
        usuarios[index].ultimoAcceso = sesion.usuario.ultimoAcceso;
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
      }
      
      console.log('✅ Sesión iniciada:', usuario.correo, `(${usuario.rol})`);
      resolve(sesion);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Cerrar sesión
 */
export const cerrarSesionService = (): Promise<void> => {
  return new Promise((resolve) => {
    localStorage.removeItem(SESION_KEY);
    console.log('✅ Sesión cerrada');
    resolve();
  });
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
 * Cambiar contraseña del usuario actual
 */
export const cambiarPasswordService = (datos: {
  passwordActual: string;
  passwordNueva: string;
  confirmarPassword: string;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const usuarioActual = obtenerUsuarioActualService();
      
      if (!usuarioActual) {
        reject(new Error('No hay sesión activa'));
        return;
      }

      // Verificar contraseña actual
      if (usuarioActual.contrasena !== datos.passwordActual) {
        reject(new Error('La contraseña actual es incorrecta'));
        return;
      }

      // Verificar que las contraseñas nuevas coincidan
      if (datos.passwordNueva !== datos.confirmarPassword) {
        reject(new Error('Las contraseñas nuevas no coinciden'));
        return;
      }

      // Actualizar contraseña en localStorage
      const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
      const index = usuarios.findIndex((u: IUsuario) => u.id === usuarioActual.id);
      
      if (index !== -1) {
        usuarios[index].contrasena = datos.passwordNueva;
        localStorage.setItem('usuarios', JSON.stringify(usuarios));

        // Actualizar también en la sesión
        const usuarioActualizado = { ...usuarioActual, contrasena: datos.passwordNueva };
        actualizarUsuarioEnSesionService(usuarioActualizado);

        console.log('✅ Contraseña actualizada correctamente');
        resolve();
      } else {
        reject(new Error('Usuario no encontrado'));
      }
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Actualizar foto de perfil del usuario actual
 */
export const actualizarFotoPerfilService = (archivo: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const usuarioActual = obtenerUsuarioActualService();
      
      if (!usuarioActual) {
        reject(new Error('No hay sesión activa'));
        return;
      }

      // Leer el archivo como base64
      const reader = new FileReader();
      
      reader.onload = () => {
        const base64String = reader.result as string;

        // Actualizar foto en localStorage
        const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
        const index = usuarios.findIndex((u: IUsuario) => u.id === usuarioActual.id);
        
        if (index !== -1) {
          usuarios[index].fotoPerfil = base64String;
          localStorage.setItem('usuarios', JSON.stringify(usuarios));

          // Actualizar también en la sesión
          const usuarioActualizado = { ...usuarioActual, fotoPerfil: base64String };
          actualizarUsuarioEnSesionService(usuarioActualizado);

          console.log('✅ Foto de perfil actualizada correctamente');
          resolve(base64String);
        } else {
          reject(new Error('Usuario no encontrado'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };

      reader.readAsDataURL(archivo);
    } catch (error) {
      reject(error);
    }
  });
};

// Alias para compatibilidad
export const getCurrentUserService = obtenerUsuarioActualService;