import { IUsuario } from '../types/usuario.types';
import { IProducto } from '../types/producto.types';
import { IReceta } from '../types/receta.types';
import { ISolicitud } from '../types/solicitud.types';
import { IProveedor } from '../services/proveedor-service';
import { IAsignatura } from '../types/asignatura.types';
import { IPedido } from '../types/pedido.types';

// ==========================================
// MOCK USERS
// ==========================================
export const mockUsers: IUsuario[] = [
    {
        id: '1',
        nombreCompleto: 'Admin General',
        correo: 'admin@duocuc.cl',
        contrasena: '',
        rol: 'Administrador',
        fotoPerfil: null,
        activo: true,
        fechaCreacion: new Date().toISOString(),
        ultimoAcceso: new Date().toISOString()
    },
    {
        id: '2',
        nombreCompleto: 'Juan Pérez',
        correo: 'juan.perez@duocuc.cl',
        contrasena: '',
        rol: 'Profesor',
        fotoPerfil: null,
        activo: true,
        fechaCreacion: new Date('2023-01-15').toISOString(),
        ultimoAcceso: new Date().toISOString()
    },
    {
        id: '3',
        nombreCompleto: 'María González',
        correo: 'maria.gonzalez@duocuc.cl',
        contrasena: '',
        rol: 'Encargado de Bodega',
        fotoPerfil: null,
        activo: true,
        fechaCreacion: new Date('2023-02-10').toISOString(),
        ultimoAcceso: new Date().toISOString()
    },
    {
        id: '4',
        nombreCompleto: 'Pedro Sánchez',
        correo: 'pedro.sanchez@duocuc.cl',
        contrasena: '',
        rol: 'Gestor de Pedidos',
        fotoPerfil: null,
        activo: true,
        fechaCreacion: new Date('2023-03-05').toISOString(),
        ultimoAcceso: new Date().toISOString()
    },
    {
        id: '5',
        nombreCompleto: 'Ana Rodríguez',
        correo: 'ana.rodriguez@duocuc.cl',
        contrasena: '',
        rol: 'Co-Administrador',
        fotoPerfil: null,
        activo: true,
        fechaCreacion: new Date('2023-04-20').toISOString(),
        ultimoAcceso: new Date().toISOString()
    },
    {
        id: '6',
        nombreCompleto: 'Carlos López',
        correo: 'carlos.lopez@duocuc.cl',
        contrasena: '',
        rol: 'Asistente de Bodega',
        fotoPerfil: null,
        activo: true,
        fechaCreacion: new Date('2023-05-12').toISOString(),
        ultimoAcceso: new Date().toISOString()
    },
    {
        id: '7',
        nombreCompleto: 'Laura Martínez',
        correo: 'laura.martinez@duocuc.cl',
        contrasena: '',
        rol: 'Docente',
        fotoPerfil: null,
        activo: true,
        fechaCreacion: new Date('2023-06-18').toISOString(),
        ultimoAcceso: new Date().toISOString()
    },
    {
        id: '8',
        nombreCompleto: 'Profesor Demo',
        correo: 'profesor@duocuc.cl',
        contrasena: '',
        rol: 'Profesor',
        fotoPerfil: null,
        activo: true,
        fechaCreacion: new Date().toISOString(),
        ultimoAcceso: new Date().toISOString()
    }
];

// ==========================================
// MOCK PRODUCTS
// ==========================================
// Note: We include _idInventario to match the structure expected by some services
export const mockProducts: (IProducto & { _idInventario?: number })[] = [
    {
        id: '101',
        nombre: 'Harina sin polvos',
        descripcion: 'Harina de trigo blanca refinada',
        categoria: 'Abarrotes',
        unidadMedida: 'kg',
        stock: 50,
        stockMinimo: 10,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        _idInventario: 1001
    },
    {
        id: '102',
        nombre: 'Azúcar Granulada',
        descripcion: 'Azúcar blanca estándar',
        categoria: 'Abarrotes',
        unidadMedida: 'kg',
        stock: 35,
        stockMinimo: 5,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        _idInventario: 1002
    },
    {
        id: '103',
        nombre: 'Huevos',
        descripcion: 'Huevos frescos calibre grande',
        categoria: 'Lácteos y Huevos',
        unidadMedida: 'un',
        stock: 120,
        stockMinimo: 30,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        _idInventario: 1003
    },
    {
        id: '104',
        nombre: 'Leche Entera',
        descripcion: 'Leche líquida entera caja',
        categoria: 'Lácteos y Huevos',
        unidadMedida: 'lt',
        stock: 45,
        stockMinimo: 12,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        _idInventario: 1004
    },
    {
        id: '105',
        nombre: 'Mantequilla con sal',
        descripcion: 'Mantequilla 250g',
        categoria: 'Lácteos y Huevos',
        unidadMedida: 'un',
        stock: 28,
        stockMinimo: 8,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        _idInventario: 1005
    },
    {
        id: '106',
        nombre: 'Aceite Maravilla',
        descripcion: 'Aceite vegetal botella 1L',
        categoria: 'Abarrotes',
        unidadMedida: 'lt',
        stock: 60,
        stockMinimo: 15,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        _idInventario: 1006
    },
    {
        id: '107',
        nombre: 'Sal Fina',
        descripcion: 'Sal de mesa yodada',
        categoria: 'Abarrotes',
        unidadMedida: 'kg',
        stock: 80,
        stockMinimo: 10,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        _idInventario: 1007
    },
    {
        id: '108',
        nombre: 'Levadura Seca',
        descripcion: 'Levadura instantánea sobre 10g',
        categoria: 'Abarrotes',
        unidadMedida: 'un',
        stock: 200,
        stockMinimo: 50,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        _idInventario: 1008
    },
    {
        id: '109',
        nombre: 'Choclo Congelado',
        descripcion: 'Granos de choclo dulce',
        categoria: 'Congelados',
        unidadMedida: 'kg',
        stock: 25,
        stockMinimo: 5,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        _idInventario: 1009
    },
    {
        id: '110',
        nombre: 'Carne Molida',
        descripcion: 'Posta negra molida 5%',
        categoria: 'Carnes',
        unidadMedida: 'kg',
        stock: 15,
        stockMinimo: 5,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        _idInventario: 1010
    }
];

// ==========================================
// MOCK RECIPES
// ==========================================
export const mockRecipes: IReceta[] = [
    {
        id: '201',
        nombre: 'Pan Amasado',
        descripcion: 'Receta tradicional de pan amasado chileno',
        ingredientes: [
            { id: 'i1', productoId: '101', productoNombre: 'Harina sin polvos', cantidad: 1, unidadMedida: 'kg' },
            { id: 'i2', productoId: '108', productoNombre: 'Levadura Seca', cantidad: 2, unidadMedida: 'un' },
            { id: 'i3', productoId: '107', productoNombre: 'Sal Fina', cantidad: 0.02, unidadMedida: 'kg' },
            { id: 'i4', productoId: '106', productoNombre: 'Aceite Maravilla', cantidad: 0.1, unidadMedida: 'lt' },
            { id: 'i5', productoId: '000', productoNombre: 'Agua Tibia', cantidad: 0.6, unidadMedida: 'lt' } // Producto no inventariado ejemplo
        ],
        instrucciones: '1. Mezclar harina con sal.\n2. Activar levadura.\n3. Unir todo y amasar 10 min.\n4. Dejar leudar 1 hora.\n5. Hornear a 180°C por 20 min.',
        tiempoPreparacion: 90,
        porciones: 12,
        estado: 'Activa',
        fechaCreacion: new Date('2023-01-20').toISOString(),
        fechaActualizacion: new Date().toISOString()
    },
    {
        id: '202',
        nombre: 'Pastel de Choclo',
        descripcion: 'Clásico pastel de choclo con pino',
        ingredientes: [
            { id: 'i6', productoId: '109', productoNombre: 'Choclo Congelado', cantidad: 2, unidadMedida: 'kg' },
            { id: 'i7', productoId: '110', productoNombre: 'Carne Molida', cantidad: 1, unidadMedida: 'kg' },
            { id: 'i8', productoId: '103', productoNombre: 'Huevos', cantidad: 4, unidadMedida: 'un' },
            { id: 'i9', productoId: '102', productoNombre: 'Azúcar Granulada', cantidad: 0.1, unidadMedida: 'kg' },
            { id: 'i10', productoId: '104', productoNombre: 'Leche Entera', cantidad: 0.2, unidadMedida: 'lt' }
        ],
        instrucciones: '1. Preparar pino con carne.\n2. Procesar choclo con leche y albahaca.\n3. Cocer pastelera.\n4. Armar pastel y hornear.',
        tiempoPreparacion: 120,
        porciones: 6,
        estado: 'Activa',
        fechaCreacion: new Date('2023-02-15').toISOString(),
        fechaActualizacion: new Date().toISOString()
    },
    {
        id: '203',
        nombre: 'Queque Básico',
        descripcion: 'Queque de vainilla suave y esponjoso',
        ingredientes: [
            { id: 'i11', productoId: '101', productoNombre: 'Harina sin polvos', cantidad: 0.5, unidadMedida: 'kg' },
            { id: 'i12', productoId: '102', productoNombre: 'Azúcar Granulada', cantidad: 0.3, unidadMedida: 'kg' },
            { id: 'i13', productoId: '103', productoNombre: 'Huevos', cantidad: 3, unidadMedida: 'un' },
            { id: 'i14', productoId: '105', productoNombre: 'Mantequilla con sal', cantidad: 2, unidadMedida: 'un' }, // 2 paquetes de 250 seria mucho, asumamos unidades
            { id: 'i15', productoId: '104', productoNombre: 'Leche Entera', cantidad: 0.2, unidadMedida: 'lt' }
        ],
        instrucciones: '1. Batir mantequilla con azúcar.\n2. Agregar huevos uno a uno.\n3. Incorporar harina y leche alternadamente.\n4. Hornear a 180°C por 45 min.',
        tiempoPreparacion: 60,
        porciones: 10,
        estado: 'Activa',
        fechaCreacion: new Date('2023-03-10').toISOString(),
        fechaActualizacion: new Date().toISOString()
    }
];

// ==========================================
// MOCK REQUESTS
// ==========================================
const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(now.getDate() + 1);
const nextWeek = new Date(now);
nextWeek.setDate(now.getDate() + 7);

export const mockRequests: ISolicitud[] = [
    {
        id: '301',
        profesorId: '2',
        profesorNombre: 'Juan Pérez',
        asignaturaId: '501', // GAS-001
        asignaturaNombre: 'Taller de Panadería',
        semana: 5,
        fecha: now.toISOString().split('T')[0], // Hoy
        bloqueInicio: 1,
        bloqueFin: 4,
        recetaId: '201',
        recetaNombre: 'Pan Amasado',
        items: mockRecipes[0].ingredientes.map(i => ({ ...i, disponible: true })),
        observaciones: 'Necesito hornos precalentados',
        esCustom: false,
        estado: 'Pendiente',
        fechaCreacion: new Date(now.getTime() - 86400000).toISOString(), // Ayer
        fechaUltimaModificacion: new Date().toISOString(),
        estadoBodega: 'Pendiente'
    },
    {
        id: '302',
        profesorId: '8',
        profesorNombre: 'Profesor Demo',
        asignaturaId: '502', // GAS-002
        asignaturaNombre: 'Pastelería Básica',
        semana: 5,
        fecha: tomorrow.toISOString().split('T')[0], // Mañana
        bloqueInicio: 5,
        bloqueFin: 8,
        recetaId: '203',
        recetaNombre: 'Queque Básico',
        items: mockRecipes[2].ingredientes.map(i => ({ ...i, disponible: true })),
        observaciones: 'Sin observaciones',
        esCustom: false,
        estado: 'Aceptada',
        fechaCreacion: new Date(now.getTime() - 172800000).toISOString(), // Anteayer
        fechaUltimaModificacion: new Date().toISOString(),
        aprobadoPor: 'Admin General',
        fechaAprobacion: new Date().toISOString(),
        estadoBodega: 'Pendiente'
    },
    {
        id: '303',
        profesorId: '7',
        profesorNombre: 'Laura Martínez',
        asignaturaId: '503', // GAS-003
        asignaturaNombre: 'Cocina Chilena',
        semana: 6,
        fecha: nextWeek.toISOString().split('T')[0], // Próxima semana
        bloqueInicio: 9,
        bloqueFin: 12,
        recetaId: '202',
        recetaNombre: 'Pastel de Choclo',
        items: mockRecipes[1].ingredientes.map(i => ({ ...i, disponible: true })),
        observaciones: 'Usar fuentes de greda',
        esCustom: false,
        estado: 'Pendiente',
        fechaCreacion: new Date().toISOString(),
        fechaUltimaModificacion: new Date().toISOString(),
        estadoBodega: 'Pendiente'
    },
    {
        id: '304',
        profesorId: '2',
        profesorNombre: 'Juan Pérez',
        asignaturaId: '501', // GAS-001
        asignaturaNombre: 'Taller de Panadería',
        semana: 4,
        fecha: new Date(now.getTime() - 604800000).toISOString().split('T')[0], // Semana pasada
        bloqueInicio: 1,
        bloqueFin: 4,
        recetaId: '201',
        recetaNombre: 'Pan Amasado',
        items: mockRecipes[0].ingredientes.map(i => ({ ...i, disponible: true })),
        observaciones: '',
        esCustom: false,
        estado: 'Aceptada', // Entregada/Finalizada en flujo real
        fechaCreacion: new Date(now.getTime() - 700000000).toISOString(),
        fechaUltimaModificacion: new Date().toISOString(),
        aprobadoPor: 'Admin General',
        fechaAprobacion: new Date(now.getTime() - 650000000).toISOString(),
        estadoBodega: 'Armado'
    }
];

// ==========================================
// MOCK PROVIDERS
// ==========================================
export const mockProviders: IProveedor[] = [
    {
        id: '401',
        nombre: 'Distribuidora Central',
        contacto: 'Roberto Gómez',
        telefono: '+56 9 1234 5678',
        email: 'ventas@distribuidoracentral.cl',
        direccion: 'Av. Principal 100, Santiago',
        estado: 'Activo',
        productos: [
            { id: 'p1', productoId: '101', productoNombre: 'Harina sin polvos', precio: 850, unidadMedida: 'kg', disponible: true, fechaActualizacion: new Date().toISOString() },
            { id: 'p2', productoId: '102', productoNombre: 'Azúcar Granulada', precio: 900, unidadMedida: 'kg', disponible: true, fechaActualizacion: new Date().toISOString() },
            { id: 'p3', productoId: '106', productoNombre: 'Aceite Maravilla', precio: 1800, unidadMedida: 'lt', disponible: true, fechaActualizacion: new Date().toISOString() }
        ],
        fechaCreacion: new Date('2023-01-01').toISOString(),
        fechaActualizacion: new Date().toISOString()
    },
    {
        id: '402',
        nombre: 'Lácteos del Sur',
        contacto: 'Ana Silva',
        telefono: '+56 9 8765 4321',
        email: 'contacto@lacteosdelsur.cl',
        direccion: 'Ruta 5 Sur Km 200, Curicó',
        estado: 'Activo',
        productos: [
            { id: 'p4', productoId: '103', productoNombre: 'Huevos', precio: 150, unidadMedida: 'un', disponible: true, fechaActualizacion: new Date().toISOString() },
            { id: 'p5', productoId: '104', productoNombre: 'Leche Entera', precio: 1100, unidadMedida: 'lt', disponible: true, fechaActualizacion: new Date().toISOString() },
            { id: 'p6', productoId: '105', productoNombre: 'Mantequilla con sal', precio: 2200, unidadMedida: 'un', disponible: true, fechaActualizacion: new Date().toISOString() }
        ],
        fechaCreacion: new Date('2023-02-01').toISOString(),
        fechaActualizacion: new Date().toISOString()
    }
];

// ==========================================
// MOCK SUBJECTS (ASIGNATURAS)
// ==========================================
export const mockAsignaturas: IAsignatura[] = [
    {
        id: '501',
        codigo: 'GAS-001',
        nombre: 'Taller de Panadería',
        profesorACargoId: '2', // Juan Pérez
        profesorACargoNombre: 'Juan Pérez',
        descripcion: 'Fundamentos de panadería tradicional y moderna',
        secciones: [
            {
                id: 's1',
                numeroSeccion: '001D',
                profesorAsignado: 'Juan Pérez',
                profesorAsignadoId: '2',
                capacidadMax: 20,
                cantInscritos: 18,
                estado: 'ACTIVA',
                bloquesHorarios: [
                    { numeroBloque: 1, horaInicio: '08:00', horaFin: '10:00', diaSemana: 'LUNES', idSala: 1, codSala: 'T-101', nombreSala: 'Taller Panadería 1' }
                ]
            },
            {
                id: 's2',
                numeroSeccion: '002V',
                profesorAsignado: 'Laura Martínez',
                profesorAsignadoId: '7',
                capacidadMax: 20,
                cantInscritos: 15,
                estado: 'ACTIVA',
                bloquesHorarios: [
                    { numeroBloque: 5, horaInicio: '15:00', horaFin: '17:00', diaSemana: 'MIERCOLES', idSala: 1, codSala: 'T-101', nombreSala: 'Taller Panadería 1' }
                ]
            }
        ],
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
    },
    {
        id: '502',
        codigo: 'GAS-002',
        nombre: 'Pastelería Básica',
        profesorACargoId: '8', // Profesor Demo
        profesorACargoNombre: 'Profesor Demo',
        descripcion: 'Introducción a la pastelería internacional',
        secciones: [
            {
                id: 's3',
                numeroSeccion: '001D',
                profesorAsignado: 'Profesor Demo',
                profesorAsignadoId: '8',
                capacidadMax: 15,
                cantInscritos: 12,
                estado: 'ACTIVA',
                bloquesHorarios: [
                    { numeroBloque: 3, horaInicio: '11:00', horaFin: '13:00', diaSemana: 'MARTES', idSala: 2, codSala: 'T-102', nombreSala: 'Taller Pastelería' }
                ]
            }
        ],
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
    },
    {
        id: '503',
        codigo: 'GAS-003',
        nombre: 'Cocina Chilena',
        profesorACargoId: '7', // Laura Martínez
        profesorACargoNombre: 'Laura Martínez',
        descripcion: 'Rescate de recetas tradicionales chilenas',
        secciones: [],
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
    }
];

// ==========================================
// MOCK ORDERS (PEDIDOS)
// ==========================================
export const mockPedidos: IPedido[] = [
    {
        id: '601',
        semana: 5,
        estado: 'EnCurso',
        fechaInicio: new Date().toISOString(),
        creadoPor: '4', // Pedro Sánchez
        creadoPorNombre: 'Pedro Sánchez',
        comentario: 'Pedido semanal regular',
        solicitudesAsociadas: ['301', '302'], // IDs de solicitudes de ejemplo
        solicitudesAsociadasData: [], // Añadir si se requiere el objeto completo
    },
    {
        id: '602',
        semana: 4,
        estado: 'Completado',
        fechaInicio: new Date(Date.now() - 604800000).toISOString(),
        creadoPor: '4',
        creadoPorNombre: 'Pedro Sánchez',
        comentario: 'Cierre exitoso',
        solicitudesAsociadas: ['304'],
        fechaCierre: new Date().toISOString(),
        solicitudesAsociadasData: [],
    }
];
