/**
 * SERVICIO DE AUTENTICACIÓN CON PERSISTENCIA REAL
 * Ahora usa storage-service para persistencia real
 * 
 * Ubicación: src/services/auth-service.ts
 */

import { IUser, ICambioPassword } from '../types/user.types';
import { obtenerUsuarios } from './storage-service';

// Token simulado para desarrollo
const MOCK_TOKEN = 'mock-jwt-token-';

/**
 * Hash simple para desarrollo (mismo que storage-service)
 */
const hashPassword = (password: string): string => {
  return btoa(password);
};

/**
 * Verifica contraseña
 */
const verificarPassword = (password: string, hash: string): boolean => {
  return btoa(password) === hash;
};

/**
 * Autentica usuario manualmente
 */
const autenticarUsuario = (email: string, password: string): IUser | null => {
  const usuariosStr = localStorage.getItem('kuhub-usuarios');
  if (!usuariosStr) {
    console.error('❌ No hay usuarios en localStorage');
    return null;
  }
  
  const usuarios = JSON.parse(usuariosStr);
  const usuario = usuarios.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  
  if (!usuario) {
    console.error('❌ Usuario no encontrado:', email);
    return null;
  }
  
  if (!verificarPassword(password, usuario.password)) {
    console.error('❌ Contraseña incorrecta');
    return null;
  }
  
  // Actualizar último acceso
  usuario.ultimoAcceso = new Date().toISOString();
  localStorage.setItem('kuhub-usuarios', JSON.stringify(usuarios));
  
  // Retornar sin contraseña
  const { password: _, ...userSinPassword } = usuario;
  return userSinPassword;
};

/**
 * Inicia sesión con las credenciales proporcionadas.
 * Ahora valida contra usuarios reales almacenados en localStorage
 * 
 * @param {string} email - Correo electrónico del usuario.
 * @param {string} password - Contraseña del usuario.
 * @returns {Promise<IUser>} Promesa que resuelve a los datos del usuario.
 */
export const loginService = async (email: string, password: string): Promise<IUser> => {
  console.log("🔐 Intentando login con:", email);
  
  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Autenticar usando la función local
  const usuario = autenticarUsuario(email, password);
  
  if (!usuario) {
    console.error('❌ Autenticación fallida');
    throw new Error('Credenciales inválidas');
  }
  
  // Generar token único
  const token = `${MOCK_TOKEN}${usuario.id}-${Date.now()}`;
  
  // Guardar token y usuario en localStorage
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(usuario));
  
  // Disparar evento personalizado para forzar recarga de roles
  window.dispatchEvent(new CustomEvent('roles-updated'));
  
  console.log("✅ Login exitoso:", usuario.nombre, `(${usuario.rol})`);
  
  return usuario;

  /*
  // --- MODO BACKEND (CUANDO ESTÉ LISTO) ---
  try {
    const respuesta = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!respuesta.ok) {
      throw new Error('Error al iniciar sesión');
    }

    const data: ILoginResponse = await respuesta.json();
    
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data.user;
  } catch (error) {
    console.error('Error en el servicio de autenticación:', error);
    throw error;
  }
  */
};

/**
 * Cierra la sesión del usuario actual.
 * 
 * @returns {Promise<void>} Promesa que resuelve cuando se completa el cierre de sesión.
 */
export const logoutService = async (): Promise<void> => {
  console.log("👋 Cerrando sesión");
  
  // Eliminamos los datos de autenticación del localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  
  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 300));
  
  console.log("✅ Sesión cerrada");
  
  return;

  /*
  // --- MODO BACKEND (CUANDO ESTÉ LISTO) ---
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    const respuesta = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    if (!respuesta.ok) {
      console.warn('Error al cerrar sesión en el servidor');
    }
  } catch (error) {
    console.error('Error en el servicio de cierre de sesión:', error);
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    throw error;
  }
  */
};

/**
 * Obtiene los datos del usuario actual.
 * 
 * @returns {Promise<IUser>} Promesa que resuelve a los datos del usuario.
 */
export const getCurrentUserService = async (): Promise<IUser> => {
  // Verificamos si hay un usuario en localStorage
  const userJson = localStorage.getItem('user');
  const token = localStorage.getItem('authToken');
  
  if (!userJson || !token) {
    throw new Error('No hay sesión activa');
  }
  
  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const user = JSON.parse(userJson) as IUser;
  
  // Verificar que el usuario todavía existe en el sistema
  const usuarios = obtenerUsuarios();
  const usuarioExiste = usuarios.find(u => u.id === user.id);
  
  if (!usuarioExiste) {
    // Usuario eliminado del sistema
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    throw new Error('Usuario no encontrado');
  }
  
  // Devolver datos actualizados del usuario
  return usuarioExiste;

  /*
  // --- MODO BACKEND (CUANDO ESTÉ LISTO) ---
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    const respuesta = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!respuesta.ok) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      throw new Error('Sesión inválida o expirada');
    }

    const data: IUser = await respuesta.json();
    
    localStorage.setItem('user', JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error('Error al obtener el usuario actual:', error);
    throw error;
  }
  */
};

/**
 * Cambia la contraseña del usuario actual.
 * NOTA: Esta es una versión simplificada para desarrollo.
 * En producción, esto debe hacerse en el backend.
 * 
 * @param {ICambioPassword} datos - Datos para el cambio de contraseña.
 * @returns {Promise<boolean>} Promesa que resuelve a true si el cambio fue exitoso.
 */
export const cambiarPasswordService = async (datos: ICambioPassword): Promise<boolean> => {
  console.log("🔑 Cambiando contraseña");
  
  // Validamos que las contraseñas coincidan
  if (datos.passwordNueva !== datos.confirmarPassword) {
    throw new Error('Las contraseñas no coinciden');
  }
  
  // Validar longitud mínima
  if (datos.passwordNueva.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }
  
  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // NOTA: En desarrollo, no validamos la contraseña actual
  // En producción, esto DEBE hacerse en el backend con el hash correcto
  
  console.log("✅ Contraseña actualizada");
  return true;

  /*
  // --- MODO BACKEND (CUANDO ESTÉ LISTO) ---
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    const respuesta = await fetch(`${API_URL}/auth/cambiar-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(datos),
    });

    if (!respuesta.ok) {
      const error = await respuesta.json();
      throw new Error(error.message || 'Error al cambiar la contraseña');
    }

    return true;
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    throw error;
  }
  */
};

/**
 * Actualiza la foto de perfil del usuario.
 * 
 * @param {File} archivo - Archivo de imagen para la foto de perfil.
 * @returns {Promise<string>} Promesa que resuelve a la URL de la nueva foto.
 */
export const actualizarFotoPerfilService = async (archivo: File): Promise<string> => {
  console.log("📸 Actualizando foto de perfil:", archivo.name);
  
  // Validar tipo de archivo
  if (!archivo.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen');
  }
  
  // Validar tamaño (max 5MB)
  if (archivo.size > 5 * 1024 * 1024) {
    throw new Error('La imagen no debe superar los 5MB');
  }
  
  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Generamos una URL de avatar con un hash del nombre del archivo
  const hash = btoa(archivo.name).substr(0, 10);
  const mockUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${hash}`;
  
  // Actualizamos el usuario en localStorage
  const userJson = localStorage.getItem('user');
  if (userJson) {
    const user = JSON.parse(userJson) as IUser;
    user.avatar = mockUrl;
    localStorage.setItem('user', JSON.stringify(user));
  }
  
  console.log("✅ Foto de perfil actualizada");
  return mockUrl;

  /*
  // --- MODO BACKEND (CUANDO ESTÉ LISTO) ---
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    const formData = new FormData();
    formData.append('avatar', archivo);
    
    const respuesta = await fetch(`${API_URL}/auth/actualizar-avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!respuesta.ok) {
      throw new Error('Error al actualizar la foto de perfil');
    }

    const data = await respuesta.json();
    
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson) as IUser;
      user.avatar = data.avatarUrl;
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    return data.avatarUrl;
  } catch (error) {
    console.error('Error al actualizar la foto de perfil:', error);
    throw error;
  }
  */
};

/**
 * UTILIDAD: Obtiene el usuario actual desde localStorage
 * Útil para operaciones síncronas
 */
export const obtenerUsuarioActual = (): IUser | null => {
  const userJson = localStorage.getItem('user');
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson) as IUser;
  } catch {
    return null;
  }
};