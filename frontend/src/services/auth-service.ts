/**
 * SERVICIO DE AUTENTICACIÓN - CONECTADO AL BACKEND
 * Maneja login, logout y sesión actual con API REST
 *
 * ⚠️ CORREGIDO: URL de login actualizada a /login (sin /api/v1/auth)
 */

import api from '../config/Axios';
import { IUsuario } from '../types/usuario.types';
import { ISesion } from '../types/auth.types';

const SESION_KEY = 'sesion_actual';

/**
 * Iniciar sesión - CONECTADO AL BACKEND
 * ✅ CORREGIDO: Ahora usa POST /login (sin /api/v1/auth)
 */
export const iniciarSesionService = async (correo: string, contrasena: string): Promise<ISesion> => {
  try {
    console.log('🔐 Intentando login en backend:', correo);

    // ✅ CAMBIO CRÍTICO: /auth/login → /login
    const response = await api.post('/login', {
      email: correo,
      contrasena: contrasena
    });

    console.log('✅ Respuesta del backend:', response.data);

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

    // Asegurar prefijo en login
    if (usuarioFrontend.fotoPerfil && !usuarioFrontend.fotoPerfil.startsWith('http') && !usuarioFrontend.fotoPerfil.startsWith('data:')) {
      usuarioFrontend.fotoPerfil = `data:image/jpeg;base64,${usuarioFrontend.fotoPerfil}`;
    }

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
    console.error('❌ Detalles del error:', error.response?.data);
    throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
  }
};

/**
 * Cerrar sesión
 * ⚠️ NOTA: El endpoint /auth/logout ya NO existe en el backend
 * El logout se maneja solo en el frontend eliminando el token
 */
export const cerrarSesionService = async (): Promise<void> => {
  try {
    // Ya no hacemos POST /auth/logout porque ese endpoint no existe
    // El backend con JWT no necesita ser notificado del logout
    console.log('📤 Cerrando sesión (solo frontend)');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
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

    // Asegurar prefijo al leer de storage (por si se guardó mal antes)
    if (sesion.usuario && sesion.usuario.fotoPerfil &&
      !sesion.usuario.fotoPerfil.startsWith('http') &&
      !sesion.usuario.fotoPerfil.startsWith('data:')) {
      sesion.usuario.fotoPerfil = `data:image/jpeg;base64,${sesion.usuario.fotoPerfil}`;
    }

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

    // Modificación: Endpoint PATCH /api/v1/usuarios/cambiar-contrasena
    // Payload: { passwordActual, nuevaPassword, confirmacionPassword }
    await api.patch(`/usuarios/cambiar-contrasena`, {
      passwordActual: datos.passwordActual,
      nuevaPassword: datos.passwordNueva,
      confirmacionPassword: datos.confirmarPassword // Mapeo de dato local al esperado
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

    // Modificación: Backend espera multipart/form-data con key 'foto'
    const formData = new FormData();
    formData.append('foto', archivo);

    console.log('📤 Enviando foto de perfil (FormData) al backend...');

    const response = await api.put(`/usuarios/${usuarioActual.id}/foto`, formData);

    console.log('✅ Foto de perfil actualizada en backend');

    // El backend devuelve el objeto usuario actualizado
    const usuarioBackend = response.data;

    // Leemos el archivo localmente para retornar el base64 y actualizar la UI inmediatamente
    const base64Local = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(archivo);
    });

    // Preferir lo que devuelve el backend si viene, sino usar local
    let fotoFinal = usuarioBackend.fotoPerfil || base64Local;

    // Si viene del backend y parece ser raw base64 (no empieza con http ni data:), agregar prefijo
    // Esto evita el error 431 Request Header Fields Too Large (o 404/invalid URL) al interpretarse como path
    if (fotoFinal && !fotoFinal.startsWith('http') && !fotoFinal.startsWith('data:')) {
      fotoFinal = `data:image/jpeg;base64,${fotoFinal}`;
    }

    // Mapeo básico para actualizar la sesión local con los datos frescos del servidor
    const usuarioActualizado: IUsuario = {
      ...usuarioActual,
      fotoPerfil: fotoFinal,
      nombreCompleto: usuarioBackend.nombreCompleto || usuarioActual.nombreCompleto,
      rol: usuarioBackend.nombreRol || usuarioActual.rol
    };

    // Actualizar en la sesión local
    actualizarUsuarioEnSesionService(usuarioActualizado);

    console.log('✅ Sesión local actualizada con nueva foto');
    return fotoFinal;
  } catch (error: any) {
    console.error('❌ Error detallado al subir foto:', error.response?.data);
    throw new Error(error.response?.data?.message || error.message || 'Error al actualizar foto de perfil');
  }
};

// Alias para compatibilidad
export const getCurrentUserService = obtenerUsuarioActualService;