/**
 * SERVICIO DE GESTIÓN DE USUARIOS
 * Simula una API REST usando localStorage
 */

import { IUsuario, IUsuarioCreacion, IUsuarioActualizacion } from '../types/usuario.types';

const STORAGE_KEY = 'usuarios';

/**
 * Helper para obtener usuarios del localStorage
 */
const obtenerUsuariosStorage = (): IUsuario[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

/**
 * Helper para guardar usuarios en localStorage
 */
const guardarUsuariosStorage = (usuarios: IUsuario[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usuarios));
};

/**
 * Inicializar usuarios por defecto si no existen
 */
export const inicializarUsuariosPorDefecto = (): void => {
  const usuarios = obtenerUsuariosStorage();
  
  if (usuarios.length === 0) {
    const usuariosPorDefecto: IUsuario[] = [
      {
        id: '1',
        nombreCompleto: 'Administrador Principal',
        correo: 'admin@kuhub.cl',
        contrasena: 'admin123',
        rol: 'Administrador',
        activo: true,
        fechaCreacion: new Date().toISOString(),
      },
      {
        id: '2',
        nombreCompleto: 'Co-Administrador Sistema',
        correo: 'coadmin@kuhub.cl',
        contrasena: 'coadmin123',
        rol: 'Co-Administrador',
        activo: true,
        fechaCreacion: new Date().toISOString(),
      },
      {
        id: '3',
        nombreCompleto: 'Gestor de Pedidos',
        correo: 'gestor@kuhub.cl',
        contrasena: 'gestor123',
        rol: 'Gestor de Pedidos',
        activo: true,
        fechaCreacion: new Date().toISOString(),
      },
      {
        id: '4',
        nombreCompleto: 'Profesor a Cargo',
        correo: 'profesor@kuhub.cl',
        contrasena: 'profesor123',
        rol: 'Profesor a Cargo',
        activo: true,
        fechaCreacion: new Date().toISOString(),
      },
      {
        id: '7',
        nombreCompleto: 'Profesor Invitado',
        correo: 'profesor.inv@kuhub.cl',
        contrasena: 'profesor123',
        rol: 'Profesor',
        activo: true,
        fechaCreacion: new Date().toISOString(),
      },
      {
        id: '5',
        nombreCompleto: 'Encargado de Bodega',
        correo: 'bodega@kuhub.cl',
        contrasena: 'bodega123',
        rol: 'Encargado de Bodega',
        activo: true,
        fechaCreacion: new Date().toISOString(),
      },
      {
        id: '6',
        nombreCompleto: 'Asistente de Bodega',
        correo: 'asistente@kuhub.cl',
        contrasena: 'asistente123',
        rol: 'Asistente de Bodega',
        activo: true,
        fechaCreacion: new Date().toISOString(),
      },
    ];
    
    guardarUsuariosStorage(usuariosPorDefecto);
    console.log('✅ Usuarios por defecto inicializados (7 usuarios demo)');
  }
};

/**
 * Obtener todos los usuarios
 */
export const obtenerUsuariosService = (): Promise<IUsuario[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const usuarios = obtenerUsuariosStorage();
      // No devolver las contraseñas en producción
      resolve(usuarios);
    }, 100);
  });
};

/**
 * Obtener usuario por ID
 */
export const obtenerUsuarioPorIdService = (id: string): Promise<IUsuario | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const usuarios = obtenerUsuariosStorage();
      const usuario = usuarios.find(u => u.id === id);
      resolve(usuario || null);
    }, 100);
  });
};

/**
 * Obtener usuario por correo
 */
export const obtenerUsuarioPorCorreoService = (correo: string): Promise<IUsuario | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const usuarios = obtenerUsuariosStorage();
      const usuario = usuarios.find(u => u.correo.toLowerCase() === correo.toLowerCase());
      resolve(usuario || null);
    }, 100);
  });
};

/**
 * Crear nuevo usuario
 */
export const crearUsuarioService = (data: IUsuarioCreacion): Promise<IUsuario> => {
  return new Promise(async (resolve, reject) => {
    setTimeout(async () => {
      try {
        const usuarios = obtenerUsuariosStorage();
        
        // Validar que el correo no exista
        const correoExiste = usuarios.some(
          u => u.correo.toLowerCase() === data.correo.toLowerCase()
        );
        
        if (correoExiste) {
          reject(new Error('El correo ya está registrado'));
          return;
        }
        
        // Crear nuevo usuario
        const nuevoUsuario: IUsuario = {
          id: Date.now().toString(),
          nombreCompleto: data.nombreCompleto,
          correo: data.correo,
          contrasena: data.contrasena,
          rol: data.rol,
          fotoPerfil: data.fotoPerfil,
          activo: true,
          fechaCreacion: new Date().toISOString(),
        };
        
        usuarios.push(nuevoUsuario);
        guardarUsuariosStorage(usuarios);
        
        console.log('✅ Usuario creado:', nuevoUsuario.correo);
        resolve(nuevoUsuario);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Actualizar usuario
 */
export const actualizarUsuarioService = (
  id: string,
  data: IUsuarioActualizacion
): Promise<IUsuario> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const usuarios = obtenerUsuariosStorage();
        const index = usuarios.findIndex(u => u.id === id);
        
        if (index === -1) {
          reject(new Error('Usuario no encontrado'));
          return;
        }
        
        // Si se está actualizando el correo, validar que no exista
        if (data.correo) {
          const correoExiste = usuarios.some(
            u => u.id !== id && u.correo.toLowerCase() === data.correo!.toLowerCase()
          );
          
          if (correoExiste) {
            reject(new Error('El correo ya está registrado por otro usuario'));
            return;
          }
        }
        
        // Actualizar usuario
        usuarios[index] = {
          ...usuarios[index],
          ...data,
        };
        
        guardarUsuariosStorage(usuarios);
        
        console.log('✅ Usuario actualizado:', usuarios[index].correo);
        resolve(usuarios[index]);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Eliminar usuario (desactivar)
 */
export const eliminarUsuarioService = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const usuarios = obtenerUsuariosStorage();
        const index = usuarios.findIndex(u => u.id === id);
        
        if (index === -1) {
          reject(new Error('Usuario no encontrado'));
          return;
        }
        
        // Desactivar en lugar de eliminar
        usuarios[index].activo = false;
        guardarUsuariosStorage(usuarios);
        
        console.log('✅ Usuario desactivado:', usuarios[index].correo);
        resolve();
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
};

/**
 * Activar usuario
 */
export const activarUsuarioService = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const usuarios = obtenerUsuariosStorage();
        const index = usuarios.findIndex(u => u.id === id);
        
        if (index === -1) {
          reject(new Error('Usuario no encontrado'));
          return;
        }
        
        usuarios[index].activo = true;
        guardarUsuariosStorage(usuarios);
        
        console.log('✅ Usuario activado:', usuarios[index].correo);
        resolve();
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
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
    
    reader.onerror = (error) => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsDataURL(archivo);
  });
};