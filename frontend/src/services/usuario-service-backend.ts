/**
 * SERVICIO DE GESTIÓN DE USUARIOS - CONECTADO AL BACKEND
 * Se comunica con la API REST de Spring Boot
 */

import api from '../config/Axios';
import { IUsuario, IUsuarioCreacion, IUsuarioActualizacion } from '../types/usuario.types';

/**
 * Obtener todos los usuarios - BACKEND
 */
export const obtenerUsuariosService = async (): Promise<IUsuario[]> => {
  try {
    const response = await api.get('/usuarios');
    
    // Convertir del formato backend al formato frontend
    return response.data.map((usuario: any) => convertirUsuarioBackendAFrontend(usuario));
  } catch (error: any) {
    console.error('Error al obtener usuarios:', error);
    throw new Error(error.response?.data?.message || 'Error al cargar usuarios');
  }
};

/**
 * Obtener usuario por ID - BACKEND
 */
export const obtenerUsuarioPorIdService = async (id: string): Promise<IUsuario | null> => {
  try {
    const response = await api.get(`/usuarios/${id}`);
    return convertirUsuarioBackendAFrontend(response.data);
  } catch (error: any) {
    console.error('Error al obtener usuario:', error);
    return null;
  }
};

/**
 * Obtener usuario por correo - BACKEND
 */
export const obtenerUsuarioPorCorreoService = async (correo: string): Promise<IUsuario | null> => {
  try {
    const response = await api.get(`/usuarios/email/${correo}`);
    return convertirUsuarioBackendAFrontend(response.data);
  } catch (error: any) {
    console.error('Error al obtener usuario:', error);
    return null;
  }
};

/**
 * Crear nuevo usuario - BACKEND
 */
export const crearUsuarioService = async (data: IUsuarioCreacion): Promise<IUsuario> => {
  try {
    // Mapear el rol del frontend al ID del backend
    const rolMap: { [key: string]: number } = {
      'Administrador': 1,
      'Co-Administrador': 2,
      'Gestor de Pedidos': 3,
      'Profesor a Cargo': 4,
      'Encargado de Bodega': 5,
      'Asistente de Bodega': 6
    };

    const idRol = rolMap[data.rol];
    
    if (!idRol) {
      throw new Error(`Rol '${data.rol}' no válido`);
    }

    // Separar el nombre completo en sus partes
    const nombres = data.nombreCompleto.split(' ');
    const primerNombre = nombres[0] || '';
    const segundoNombre = nombres.length > 3 ? nombres[1] : '';
    const apellidoPaterno = nombres.length > 2 ? nombres[nombres.length - 2] : (nombres[1] || '');
    const apellidoMaterno = nombres.length > 2 ? nombres[nombres.length - 1] : '';

    const payload = {
      idRol: idRol,
      primerNombre: primerNombre,
      segundoNombre: segundoNombre,
      apellidoPaterno: apellidoPaterno,
      apellidoMaterno: apellidoMaterno,
      email: data.correo.toLowerCase(),
      username: data.correo.split('@')[0], // Generar username desde email
      contrasena: data.contrasena,
      fotoPerfil: data.fotoPerfil,
      activo: true
    };

    const response = await api.post('/usuarios', payload);
    
    console.log('✅ Usuario creado en backend:', response.data.email);
    return convertirUsuarioBackendAFrontend(response.data);
  } catch (error: any) {
    console.error('Error al crear usuario:', error);
    throw new Error(error.response?.data?.message || 'Error al crear usuario');
  }
};

/**
 * Actualizar usuario - BACKEND
 */
export const actualizarUsuarioService = async (
  id: string,
  data: IUsuarioActualizacion
): Promise<IUsuario> => {
  try {
    const payload: any = {};

    // Mapear rol si se proporciona
    if (data.rol) {
      const rolMap: { [key: string]: number } = {
        'Administrador': 1,
        'Co-Administrador': 2,
        'Gestor de Pedidos': 3,
        'Profesor a Cargo': 4,
        'Encargado de Bodega': 5,
        'Asistente de Bodega': 6
      };
      payload.idRol = rolMap[data.rol];
    }

    // Separar nombre completo si se proporciona
    if (data.nombreCompleto) {
      const nombres = data.nombreCompleto.split(' ');
      payload.primerNombre = nombres[0] || '';
      payload.segundoNombre = nombres.length > 3 ? nombres[1] : '';
      payload.apellidoPaterno = nombres.length > 2 ? nombres[nombres.length - 2] : (nombres[1] || '');
      payload.apellidoMaterno = nombres.length > 2 ? nombres[nombres.length - 1] : '';
    }

    if (data.correo) payload.email = data.correo.toLowerCase();
    if (data.contrasena) payload.contrasena = data.contrasena;
    if (data.fotoPerfil !== undefined) payload.fotoPerfil = data.fotoPerfil;
    if (data.activo !== undefined) payload.activo = data.activo;

    const response = await api.put(`/usuarios/${id}`, payload);
    
    console.log('✅ Usuario actualizado en backend:', response.data.email);
    return convertirUsuarioBackendAFrontend(response.data);
  } catch (error: any) {
    console.error('Error al actualizar usuario:', error);
    throw new Error(error.response?.data?.message || 'Error al actualizar usuario');
  }
};

/**
 * Eliminar usuario (desactivar) - BACKEND
 */
export const eliminarUsuarioService = async (id: string): Promise<void> => {
  try {
    await api.patch(`/usuarios/${id}/desactivar`);
    console.log('✅ Usuario desactivado en backend');
  } catch (error: any) {
    console.error('Error al desactivar usuario:', error);
    throw new Error(error.response?.data?.message || 'Error al desactivar usuario');
  }
};

/**
 * Activar usuario - BACKEND
 */
export const activarUsuarioService = async (id: string): Promise<void> => {
  try {
    await api.patch(`/usuarios/${id}/activar`);
    console.log('✅ Usuario activado en backend');
  } catch (error: any) {
    console.error('Error al activar usuario:', error);
    throw new Error(error.response?.data?.message || 'Error al activar usuario');
  }
};

/**
 * Subir foto de perfil (convierte a base64)
 */
export const subirFotoPerfilService = (archivo: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(archivo);
  });
};

/**
 * Función helper para convertir usuario del backend al formato frontend
 */
function convertirUsuarioBackendAFrontend(usuarioBackend: any): IUsuario {
  return {
    id: usuarioBackend.idUsuario.toString(),
    nombreCompleto: usuarioBackend.nombreCompleto,
    correo: usuarioBackend.email,
    contrasena: '', // No devolver contraseña
    rol: usuarioBackend.nombreRol,
    fotoPerfil: usuarioBackend.fotoPerfil,
    activo: usuarioBackend.activo,
    fechaCreacion: usuarioBackend.fechaCreacion,
    ultimoAcceso: usuarioBackend.ultimoAcceso
  };
}

/**
 * NOTA: No es necesario inicializar usuarios por defecto
 * ya que la base de datos ya debe tener datos
 */
export const inicializarUsuariosPorDefecto = (): void => {
  console.log('ℹ️ Usuarios manejados por el backend - no requiere inicialización');
};
