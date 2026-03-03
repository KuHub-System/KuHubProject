/**
 * SERVICIO DE GESTIÓN DE USUARIOS - CONECTADO AL BACKEND
 * Se comunica con la API REST de Spring Boot
 *
 * ⚠️ VERSIÓN CORREGIDA CON DEBUG
 */

import api from '../config/Axios';
import { IUsuario, IUsuarioCreacion, IUsuarioActualizacion } from '../types/usuario.types';

/**
 * Mapeo centralizado de roles Frontend → Backend
 * ⚠️ IMPORTANTE: Los nombres deben coincidir EXACTAMENTE con los del Select en el frontend
 */
const ROL_MAP: { [key: string]: number } = {
  'Administrador': 1,           // → ADMINISTRADOR en BD
  'Co-Administrador': 2,        // → CO_ADMINISTRADOR en BD
  'Gestor de Pedidos': 3,       // → GESTOR_PEDIDOS en BD
  'Profesor a Cargo': 4,        // → PROFESOR_A_CARGO en BD
  'Docente': 5,                 // → DOCENTE en BD ✅ CORREGIDO
  'Profesor': 5,                // → Alias para "Docente" (por si se usa este nombre)
  'Encargado de Bodega': 6,     // → ENCARGADO_BODEGA en BD
  'Bodeguero': 6,               // → Alias para "Encargado de Bodega"
  'Asistente de Bodega': 7      // → ASISTENTE_BODEGA en BD
};

/**
 * Función helper para obtener el ID del rol con validación
 */
const obtenerIdRol = (nombreRol: string): number => {

  const idRol = ROL_MAP[nombreRol];

  if (!idRol) {
    throw new Error(`Rol '${nombreRol}' no válido. Roles disponibles: ${Object.keys(ROL_MAP).join(', ')}`);
  }

  return idRol;
};

/**
 * Obtener todos los usuarios - BACKEND
 */
export const obtenerUsuariosService = async (): Promise<IUsuario[]> => {
  try {
    const response = await api.get('/usuarios');


    // Convertir del formato backend al formato frontend
    return response.data.map((usuario: any) => convertirUsuarioBackendAFrontend(usuario));
  } catch (error: any) {
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
    return null;
  }
};

/**
 * Crear nuevo usuario - BACKEND
 */
export const crearUsuarioService = async (data: IUsuarioCreacion): Promise<IUsuario> => {
  try {

    // Obtener ID del rol con validación
    const idRol = obtenerIdRol(data.rol);

    // Separar el nombre completo en sus partes
    const nombres = data.nombreCompleto.trim().split(' ');
    const primerNombre = nombres[0] || '';
    const segundoNombre = nombres.length > 3 ? nombres[1] : '';
    const apellidoPaterno = nombres.length > 2 ? nombres[nombres.length - 2] : (nombres[1] || '');
    const apellidoMaterno = nombres.length > 2 ? nombres[nombres.length - 1] : '';

    const payload = {
      idRol: idRol,
      primerNombre: primerNombre,
      segundoNombre: segundoNombre || null,
      apellidoPaterno: apellidoPaterno,
      apellidoMaterno: apellidoMaterno || null,
      email: data.correo.toLowerCase(),
      username: data.correo.split('@')[0], // Generar username desde email
      contrasena: data.contrasena,
      fotoPerfil: data.fotoPerfil || null,
      activo: true
    };


    const response = await api.post('/usuarios', payload);

    return convertirUsuarioBackendAFrontend(response.data);
  } catch (error: any) {
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
      payload.idRol = obtenerIdRol(data.rol);
    }

    // Separar nombre completo si se proporciona
    if (data.nombreCompleto) {
      const nombres = data.nombreCompleto.trim().split(' ');
      payload.primerNombre = nombres[0] || '';
      payload.segundoNombre = nombres.length > 3 ? nombres[1] : null;
      payload.apellidoPaterno = nombres.length > 2 ? nombres[nombres.length - 2] : (nombres[1] || '');
      payload.apellidoMaterno = nombres.length > 2 ? nombres[nombres.length - 1] : null;
    }

    if (data.correo) payload.email = data.correo.toLowerCase();
    if (data.contrasena) payload.contrasena = data.contrasena;
    if (data.fotoPerfil !== undefined) payload.fotoPerfil = data.fotoPerfil;
    if (data.activo !== undefined) payload.activo = data.activo;


    const response = await api.put(`/usuarios/${id}`, payload);

    return convertirUsuarioBackendAFrontend(response.data);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al actualizar usuario');
  }
};

/**
 * Eliminar usuario (desactivar) - BACKEND
 */
export const eliminarUsuarioService = async (id: string): Promise<void> => {
  try {
    await api.patch(`/usuarios/${id}/desactivar`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al desactivar usuario');
  }
};

/**
 * Activar usuario - BACKEND
 */
export const activarUsuarioService = async (id: string): Promise<void> => {
  try {
    await api.patch(`/usuarios/${id}/activar`);
  } catch (error: any) {
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
};

/**
 * FUNCIÓN DE UTILIDAD: Exportar el mapeo de roles para uso en otros componentes
 */
export const obtenerRolesDisponibles = (): string[] => {
  return Object.keys(ROL_MAP);
};

export const validarNombreRol = (nombreRol: string): boolean => {
  return nombreRol in ROL_MAP;
};