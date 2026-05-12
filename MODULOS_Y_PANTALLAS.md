# KuHub — Documentación de Módulos y Pantallas

**Proyecto**: Sistema de Gestión de Bodega e Inventario para Institución DuocUC  
**Versión**: v1.0.8  
**Última actualización**: 11 de mayo de 2026

---

## 📑 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Módulos del Backend](#módulos-del-backend)
4. [Páginas del Frontend](#páginas-del-frontend)
5. [Flujos Principales](#flujos-principales)
6. [Stack Tecnológico](#stack-tecnológico)

> **📊 Diagramas 4+1 Views**: Ver archivo `ARQUITECTURA_4+1_VIEWS.md` y carpeta `/diagramas` con archivos editables

---

## 🎯 Visión General

**KuHub** es una solución integral de gestión de bodega e inventario diseñada para instituciones educativas. El sistema permite:

- **Gestión de Inventario**: Control de productos, categorías, unidades de medida
- **Gestión Académica**: Manejo de asignaturas, secciones, salas, horarios
- **Solicitudes y Pedidos**: Docentes solicitan ingredientes → Gestor consolida → Se genera pedido
- **Gestión de Usuarios**: Autenticación basada en roles (7 roles distintos)
- **Permisos Granulares**: Control módulo a módulo, operación a operación
- **Tránsito y Recepción**: Seguimiento de productos en bodega
- **Análisis y Reportes**: Dashboards por rol

---

## 🏗️ Arquitectura del Sistema

### Estructura General

```
KuHubProject/
├── backend/                          # API REST en Java Spring Boot
│   ├── src/main/java/KuHub/modules/  # 9 módulos de negocio
│   ├── pom.xml                       # Dependencias Maven
│   └── application.properties         # Configuración
│
├── frontend/                          # SPA en React + TypeScript
│   ├── src/
│   │   ├── pages/                    # 18 páginas lazy-loaded
│   │   ├── components/               # Componentes reutilizables
│   │   ├── services/                 # 25+ servicios API tipados
│   │   ├── contexts/                 # Auth, permisos, tema
│   │   ├── hooks/                    # useToast, usePageTitle, etc.
│   │   └── types/                    # Interfaces TypeScript
│   ├── vite.config.ts                # Configuración Vite
│   └── package.json                  # Dependencias npm
│
└── [Documentación y configuración]
```

### Capas Arquitectónicas

**Backend (Java Spring Boot)**
```
Controllers → Services → Repository → Database
   ↓            ↓              ↓
HTTPReq    BusinessLogic   JPA/Persistence
```

**Frontend (React SPA)**
```
Pages → Components → Services (Axios) → API Backend
  ↓                       ↓
Routes            /api/v1/...
             Auth + JWT Token
```

---

## 📦 Módulos del Backend

El backend está organizado en **9 módulos** bajo `backend/src/main/java/KuHub/modules/`.

### 1. **gestion_usuario** — Autenticación y Gestión de Usuarios

**Responsabilidad**: Manejo de usuarios, roles, permisos y autenticación JWT.

**Controladores**:
- `AuthController.java` — Login, logout, refresh token
- `UsuarioController.java` — CRUD de usuarios (listar, crear, actualizar, eliminar)
- `UsuarioControllerV2.java` — Versión mejorada de endpoints de usuario
- `RolController.java` — Gestión de roles
- `RolControllerV2.java` — Versión mejorada de roles
- `PermisoRolController.java` — Matriz de permisos por rol

**Endpoints principales**:
- `POST /v1/auth/login` — Autenticación (email + contraseña → JWT token)
- `GET /v1/usuarios` — Listar usuarios paginados
- `POST /v1/usuarios` — Crear usuario
- `PUT /v1/usuarios/{id}` — Actualizar usuario
- `DELETE /v1/usuarios/{id}` — Eliminar usuario
- `GET /v1/permisos/matriz` — Obtener matriz completa de permisos

**Entidades**:
- `Usuario` — Email, contraseña (hash), nombre, activo
- `Rol` — Administrador, Co-Administrador, Gestor, Profesor, Docente, Enc. Bodega, Asist. Bodega
- `PermisoRol` — Matriz de permisos (módulo × rol × operación)

**Características**:
- Sistema de roles jerárquico (7 roles)
- Matriz de permisos granular (lectura, creación, actualización, eliminación por módulo)
- Tokens JWT con refresh automático
- Validación de credenciales contra base de datos

---

### 2. **gestion_academica** — Gestión Académica

**Responsabilidad**: Gestión de estructura académica: asignaturas, secciones, salas, horarios, bloques de horario.

**Controladores**:
- `AsignaturaController.java` — CRUD asignaturas
- `SeccionController.java` — CRUD secciones (grupos de estudiantes)
- `SalaController.java` — CRUD salas de clase
- `SalaControllerV2.java` — Versión mejorada
- `BloqueHorarioController.java` — CRUD bloques horarios (franjas de tiempo)
- `BloqueHorarioControllerV2.java` — Versión mejorada
- `ReservaSalaController.java` — Reservas de salas
- `ReservaSalaControllerV2.java` — Versión mejorada
- `SemanaController.java` — Gestión de semanas académicas

**Endpoints principales**:
- `GET /v1/asignaturas` — Listar asignaturas
- `POST /v1/secciones` — Crear sección
- `GET /v1/salas` — Listar salas disponibles
- `GET /v1/bloques-horarios` — Obtener bloques de horario
- `GET /v1/semanas` — Listar semanas académicas

**Entidades**:
- `Asignatura` — Código, nombre, descripción
- `Seccion` — Grupo de estudiantes, asignatura, cantidad inscritos
- `Sala` — Nombre, piso, capacidad
- `BloqueHorario` — Hora inicio, hora fin, nombre
- `ReservaSala` — Sala × Bloque × Sección × Docente
- `Semana` — Fecha inicio, fecha fin, período académico

**Características**:
- Gestión completa de calendario académico
- Control de disponibilidad de salas
- Asociación docente-sección-asignatura
- Períodos académicos y semanas para contextualizar solicitudes

---

### 3. **gestion_inventario** — Gestión de Inventario

**Responsabilidad**: Gestión completa del inventario de productos: productos, categorías, unidades de medida, stock, tránsito.

**Controladores**:
- `ProductoController.java` — CRUD productos
- `ProductoControllerV2.java` — Versión mejorada con búsqueda avanzada
- `CategoriaController.java` — CRUD categorías de productos
- `UnidadMedidaController.java` — CRUD unidades de medida
- `InventarioController.java` — Consulta de stock y movimientos
- `InventarioControllerV2.java` — Versión mejorada con búsqueda bulk
- `MovimientoController.java` — Registro de movimientos de inventario
- `BodegaTransitoController.java` — Gestión de productos en tránsito

**Endpoints principales**:
- `GET /v1/productos` — Listar productos paginados
- `POST /v1/productos` — Crear producto (nombre, código, categoría, unidad)
- `PUT /v1/productos/{id}` — Actualizar producto
- `DELETE /v1/productos/{id}` — Eliminación lógica (soft delete)
- `GET /v1/inventario/stock` — Obtener stock disponible por producto
- `POST /v1/movimientos` — Registrar movimiento (ingreso, salida, ajuste)
- `GET /v1/bodega-transito` — Productos en tránsito (sin recibir)
- `POST /v1/bodega-transito/recibir` — Marcar producto como recibido

**Entidades**:
- `Producto` — Código, nombre, categoría, unidad de medida, activo
- `Categoria` — Nombre, descripción (ej. "Frutas", "Proteínas")
- `UnidadMedida` — Abreviatura, nombre (ej. "kg", "L", "unidad")
- `Inventario` — Producto × Stock actual × Stock mínimo
- `Movimiento` — Tipo (ingreso/salida/ajuste), cantidad, fecha, motivo
- `BodegaTransito` — Producto recibido pero no confirmado en inventario

**Características**:
- Búsqueda avanzada por código, nombre, categoría
- Control de stock mínimo con alertas
- Historial completo de movimientos
- Sincronización automática bodega-tránsito
- Soft delete (eliminación lógica) para auditoría

---

### 4. **gestion_solicitud** — Gestión de Solicitudes de Ingredientes

**Responsabilidad**: Flujo de solicitudes de docentes por ingredientes para clases → Estados (Pendiente/Aceptada/Rechazada/Procesada/En Pedido).

**Controladores**:
- `SolicitudController.java` — CRUD solicitudes, cambio de estado

**Endpoints principales**:
- `GET /v1/solicitudes` — Listar solicitudes (filtro por semana, docente, estado)
- `POST /v1/solicitudes` — Crear nueva solicitud
- `GET /v1/solicitudes/{id}` — Obtener detalles de una solicitud
- `PUT /v1/solicitudes/{id}/estado` — Cambiar estado (Aceptar/Rechazar)
- `POST /v1/solicitud/order-for-consolidation` — Obtener solicitudes ACEPTADAS para consolidar en pedido
- `POST /v1/solicitudes/cambiar-estado-masivo` — Cambio de estado múltiple

**Entidades**:
- `Solicitud` — Docente, asignatura, sección, fecha clase, hora
- `DetalleSolicitud` — Solicitud × Producto × Cantidad
- `EstadoSolicitud` — PENDIENTE, ACEPTADA, RECHAZADA, PROCESADA, EN_PEDIDO

**Estados y Transiciones**:
```
PENDIENTE → (Aceptar) → ACEPTADA → (Procesar automaticamente) → PROCESADA
         → (Rechazar) → RECHAZADA
ACEPTADA → (Consolidar a pedido) → EN_PEDIDO
```

**Características**:
- Creación de solicitud por docente: selecciona asignatura, sección, receta
- Automáticamente calcula productos de la receta según cantidad de inscritos
- Gestor acepta/rechaza solicitudes
- Sistema cache por semana para evitar re-consultas
- Consolidación masiva: agrupa todas las solicitudes aceptadas en un pedido

---

### 5. **gestion_pedido** — Gestión de Pedidos

**Responsabilidad**: Generación y gestión de pedidos consolidados a partir de solicitudes aceptadas.

**Controladores**:
- `PedidoController.java` — CRUD pedidos, consolidación
- `DetallePedidoController.java` — Detalles de líneas en el pedido
- `PedidoSolicitudController.java` — Relación entre pedidos y solicitudes

**Endpoints principales**:
- `GET /v1/pedidos` — Listar pedidos
- `POST /v1/pedidos/consolidar` — Crear pedido consolidado a partir de solicitudes
- `GET /v1/pedidos/{id}` — Obtener detalles del pedido
- `PUT /v1/pedidos/{id}` — Actualizar pedido (antes de confirmar)
- `POST /v1/pedidos/{id}/confirmar` — Confirmar pedido (genera orden a proveedores)

**Entidades**:
- `Pedido` — Número, fecha, estado (BORRADOR/CONFIRMADO/ENVIADO/RECIBIDO), total
- `DetallePedido` — Pedido × Producto × Cantidad × Precio unitario
- `PedidoSolicitud` — Relación: qué solicitudes conforman este pedido

**Características**:
- Consolidación automática: agrupa solicitudes aceptadas por producto
- Calcula cantidades totales por producto
- Soporte para editar antes de confirmar
- Confirmación genera orden a proveedores

---

### 6. **gestion_proveedor** — Gestión de Proveedores

**Responsabilidad**: Base de datos de proveedores y contactos.

**Controladores**:
- `ProveedorController.java` — CRUD proveedores

**Endpoints principales**:
- `GET /v1/proveedores` — Listar proveedores
- `POST /v1/proveedores` — Crear proveedor
- `PUT /v1/proveedores/{id}` — Actualizar proveedor
- `DELETE /v1/proveedores/{id}` — Eliminar proveedor

**Entidades**:
- `Proveedor` — Nombre, RUT, email, teléfono, contacto, activo

**Características**:
- Registro de proveedores y sus contactos
- Información de contacto centralizada

---

### 7. **gestion_sistema** — Gestión del Sistema

**Responsabilidad**: Configuración global del sistema, parámetros, auditoría.

**Controladores**:
- `GestionSistemaController.java` — Parámetros de configuración

**Endpoints principales**:
- `GET /v1/sistema/config` — Obtener configuración global
- `PUT /v1/sistema/config` — Actualizar configuración

**Configuraciones**:
- Stock mínimo por defecto
- Días de anticipación para solicitudes
- Períodos académicos activos
- Parámetros de auditoría

**Características**:
- Centralización de parámetros globales
- Control de características activas/inactivas

---

### 8. **pedido_semana_a_bodega** — Gestión de Pedido Semanal a Bodega

**Responsabilidad**: Flujo especial para pedidos semanales que van a bodega (tránsito y recepción).

**Controladores**:
- `PedidoSemanaBodegaController.java` — Gestión del pedido semanal
- `DetallePedidoSemanaBodegaController.java` — Líneas del pedido semanal

**Endpoints principales**:
- `GET /v1/pedido-semanal-bodega` — Obtener pedido de la semana actual
- `POST /v1/pedido-semanal-bodega/crear` — Crear pedido semanal
- `POST /v1/pedido-semanal-bodega/{id}/enviar` — Enviar a bodega (tránsito)
- `POST /v1/pedido-semanal-bodega/{id}/recibir` — Recibir en bodega

**Entidades**:
- `PedidoSemanaBodega` — Pedido semanal específico
- `DetallePedidoSemanaBodega` — Línea × Producto × Cantidad

**Características**:
- Pedidos especiales para bodega
- Flujo de tránsito y recepción separado
- Sincronización con inventario al recibir

---

### 9. **dashboard** — Analítica y Reportes

**Responsabilidad**: Datos consolidados para dashboards por rol.

**Controladores**:
- `DashboardController.java` — Endpoints de analytics

**Endpoints principales**:
- `GET /v1/dashboard/inventario` — KPIs de inventario (productos, stock, movimientos)
- `GET /v1/dashboard/solicitudes` — KPIs de solicitudes (pendientes, aceptadas, rechazadas)
- `GET /v1/dashboard/pedidos` — KPIs de pedidos (en proceso, confirmados)

**Datos expuestos**:
- Total productos en inventario
- Stock bajo / crítico
- Solicitudes pendientes por semana
- Pedidos en tránsito
- Histórico de movimientos

**Características**:
- Datos optimizados para rendering en gráficos
- Vistas diferenciadas por rol (admin ve todo, bodega ve solo inventario, gestor ve pedidos)

---

## 🎨 Páginas del Frontend

El frontend tiene **18 páginas lazy-loaded** en `frontend/src/pages/`. Cada página corresponde a un módulo o funcionalidad específica.

### Páginas Autenticadas (requieren login)

#### 1. **login.tsx** — Autenticación

**Ruta**: `/login`  
**Acceso**: Público (sin autenticación)  
**Descripción**: Página de login del sistema.

**Funcionalidades**:
- Formulario de email + contraseña (línea 206-282)
- Validación de formato email (línea 104)
- Checkbox "Recordar sesión" (línea 252-260)
- Link "¿Olvidó su contraseña?" (línea 261-268)
- Accesos rápidos demo (locales) con 7 usuarios predefinidos (línea 284-316)
- Animación de entrada iris con logo (línea 328-376)

**Componentes**:
- HeroUI: Card, Input, Button, Checkbox, Divider
- Framer Motion: AnimatePresence, motion.div para animaciones
- Iconify: lucide:mail, lucide:lock, lucide:eye, lucide:log-in

**Estados**: loading, error, recordar, irisOpen (animación)

**Referencias de código**: 
- Login form: línea 205-282
- Demo users config: línea 21-78
- Iris animation: línea 328-376

---

#### 2. **dashboard.tsx** — Dashboard Principal

**Ruta**: `/`  
**Acceso**: Todos los roles autenticados  
**Descripción**: Panel de control central del sistema con vistas personalizadas por rol.

**Vistas por Rol**:

| Rol | Vistas |
|---|---|
| **Administrador / Co-Admin** | Tabs: Inventario, Solicitudes, Recetas |
| **Gestor de Pedidos** | Analítica de gestión (solicitudes pendientes, pedidos en tránsito) |
| **Enc. Bodega / Asist. Bodega** | Inventario (stock, movimientos, tránsito) |
| **Profesor / Docente** | Recetas (dashboard de asignaturas) |

**Componentes**:
- `DashboardInventarioView` — Gráficos de stock, productos bajo mínimo (línea 14)
- `DashboardGestor` — KPIs de solicitudes y pedidos (línea 15)
- `DashboardRecetasView` — Recetas por asignatura (línea 16)
- Tabs con routing por permisos (línea 30-75)

**Lógica**:
- Detecta rol del usuario (línea 89)
- Valida permisos con `canRead()` (línea 106-130)
- Fallback "Sin permisos" si el rol no tiene acceso a ningún dashboard (línea 134-146)

**Referencias de código**:
- Admin tabs layout: línea 27-76
- Permission-based routing: línea 105-131

---

#### 3. **inventario.tsx** — Gestión de Inventario

**Ruta**: `/inventario`  
**Acceso**: Administrador, Enc. Bodega, Asist. Bodega  
**Descripción**: CRUD completo de productos con filtros avanzados, búsqueda, edición masiva y gestión de categorías/unidades.

**Funcionalidades principales**:
- Tabla paginada de productos (línea ~100+)
- Búsqueda por nombre, código, categoría (línea ~150)
- Filtro por rango de fechas (DateRangePicker)
- Crear producto modal
- Editar producto en línea
- Eliminación lógica (soft delete)
- Gestión de categorías (modal)
- Gestión de unidades de medida (modal)
- Edición masiva de stock (línea ~76-80)
- Proyección de abastecimiento (calcula cuándo falta stock según solicitudes)

**Componentes**:
- Tabla con truncado de nombres + tooltips (línea ~200+)
- Modales para crear/editar: `GestionCategoriasModal`, `GestionUnidadesModal`
- Inputs en línea para editar stock
- Autocomplete para búsqueda de productos

**Estados principales**:
- `productos: IProducto[]` — Lista de productos
- `filtro: string` — Término de búsqueda
- `filtroCategoria: string` — Filtro por categoría
- `productoEditando: IProducto | null` — Producto en edición
- `editandoStock: Record<string, number>` — Stock en edición masiva

**Referencias de código**:
- Búsqueda: línea ~150
- Tabla paginada: línea ~200
- Modal crear/editar: línea ~400+

---

#### 4. **gestion-solicitudes.tsx** — Gestión de Solicitudes

**Ruta**: `/gestion-solicitudes`  
**Acceso**: Gestor de Pedidos, Administrador  
**Descripción**: Vista de solicitudes de ingredientes agrupadas por semana y asignatura.

**Funcionalidades**:
- Selector de semana (semanas académicas)
- Agrupación por asignatura (expandible)
- Tabla de solicitudes con detalles (docente, sección, fecha, productos solicitados)
- Estados: Pendiente → Aceptada | Rechazada → Procesada
- Cambio de estado individual (aceptar/rechazar)
- Cambio de estado masivo (seleccionar múltiples, cambiar todas a la vez)
- Modal para ingresar motivo de rechazo
- Filtro por estado

**Entidades mostradas**:
```
Asignatura
├── Solicitud 1 (Docente X, Sección A)
│   ├── Producto 1 - Cantidad 5 kg
│   └── Producto 2 - Cantidad 3 L
└── Solicitud 2 (Docente Y, Sección B)
    ├── Producto 1 - Cantidad 2 kg
    └── Producto 3 - Cantidad 4 unidades
```

**Componentes**:
- Select para cambiar semana (línea ~64)
- Checkbox para selección masiva
- Tabla expandible de detalles
- Modal para confirmar cambios

**Estados principales**:
- `solicitudes: ISolicitudGestion[]` — Lista de solicitudes
- `semanaSeleccionada: ISemana` — Semana actual
- `seleccionadas: Set<number>` — IDs de solicitudes seleccionadas
- `expandidos: Set<number>` — Solicitudes expandidas para ver detalles

**Referencias de código**:
- Mapeo de estados: línea 68-75
- Selector de semana: línea ~80
- Tabla de solicitudes: línea ~150+

---

#### 5. **gestion-pedidos.tsx** — Gestión de Pedidos (Consolidación)

**Ruta**: `/gestion-pedidos`  
**Acceso**: Gestor de Pedidos, Administrador  
**Descripción**: Consolidación de solicitudes aceptadas en pedidos finales agrupados por producto.

**Funcionalidades**:
- Selector de semana
- Vista de solicitudes aceptadas (antes de consolidar)
- Vista consolidada: agrupa por producto y suma cantidades
- Botón "Consolidar Pedido" → crea el pedido oficial
- Cache por semana (evita re-peticiones)
- Búsqueda por producto en la vista consolidada
- Muestra detalles expandibles (qué secciones requieren cada producto)

**Flujo**:
1. Usuario elige semana
2. Sistema obtiene solicitudes ACEPTADAS desde `/v1/solicitud/order-for-consolidation`
3. Usuario ve lista de solicitudes por asignatura
4. Usuario pulsa "Consolidar"
5. Sistema agrupa por producto y crea un Pedido

**Componentes**:
- Tabs: "Solicitudes" vs "Consolidado"
- Card de productos consolidados con expandible
- Botón "Consolidar Pedido"
- Modal de confirmación

**Estados principales**:
- `solicitudes: ISolicitudConsolidacionItem[]` — Solicitudes antes de consolidar
- `consolidadoData: IProductoConsolidadoResponse[]` — Productos agrupados + cantidades
- `consolidado: boolean` — Ya se consolidó?
- `cache: Map<string, IOrderConsolidationResponse>` — Cache por semanaId (línea 75)

**Referencias de código**:
- Cache por semana: línea 75
- Consolidación: línea ~200+
- Helpers de formato: línea 34-50

---

#### 6. **gestion-usuarios.tsx** — Gestión de Usuarios

**Ruta**: `/gestion-usuarios`  
**Acceso**: Administrador  
**Descripción**: CRUD de usuarios del sistema con gestión de roles.

**Funcionalidades**:
- Tabla paginada de usuarios
- Búsqueda/filtro por nombre, email, rol
- Crear usuario (email, nombre, contraseña, rol)
- Editar usuario (nombre, rol, estado activo/inactivo)
- Eliminar usuario (con confirmación)
- Subir foto de perfil
- Filtro por rol

**Estados de usuario**:
- Activo / Inactivo

**Roles disponibles** (línea 25-32):
```typescript
'Administrador',
'Co-Administrador',
'Gestor de Pedidos',
'Profesor',
'Profesor a Cargo',
'Encargado de Bodega',
'Asistente de Bodega'
```

**Componentes**:
- Tabla con avatar, email, rol, acciones
- Modal crear usuario
- Modal editar usuario
- Modal subir foto
- Select de rol

**Servicios**:
- `crearUsuarioService()` — Crear nuevo usuario
- `actualizarUsuarioService()` — Actualizar datos
- `eliminarUsuarioService()` — Eliminación lógica
- `subirFotoPerfilService()` — Upload de foto
- `obtenerUsuariosPaginadosService()` — Listar con paginación
- `buscarUsuariosService()` — Búsqueda

**Referencias de código**:
- Tabla: línea ~80+
- Modal crear: línea ~200+
- Validaciones: línea ~250+

---

#### 7. **gestion-roles.tsx** — Gestión de Roles y Permisos

**Ruta**: `/gestion-roles`  
**Acceso**: Administrador  
**Descripción**: Matriz de permisos: asigna lectura, creación, actualización, eliminación a cada rol por módulo.

**Funcionalidades**:
- Tabla matriz: filas = roles, columnas = módulos
- Checkboxes para cada operación: Lectura, Crear, Actualizar, Eliminar
- Guardar cambios y sincronizar en backend
- Vista de permisos por rol (dropdown)

**Módulos controlables** (línea ~40):
```
DASHBOARD
INVENTARIO
GESTION_PEDIDOS
GESTION_SOLICITUDES
GESTION_USUARIOS
GESTION_ROLES
GESTION_ACADEMICA
GESTION_PROVEEDOR
ADMIN_SISTEMA
BODEGA_TRANSITO
```

**Componentes**:
- Tabla matriz de permisos
- Checkboxes para cada operación (4 por módulo)
- Botón guardar cambios

**Servicios**:
- `obtenerMatrizPermisosService()` — Obtener estado actual
- `actualizarPermisosService()` — Guardar cambios masivos

**Referencias de código**:
- Matriz layout: línea ~100+
- Checkboxes de permisos: línea ~150+

---

#### 8. **gestion-academica.tsx** — Gestión Académica

**Ruta**: `/gestion-academica`  
**Acceso**: Administrador, Profesor a Cargo  
**Descripción**: CRUD de estructura académica: asignaturas, secciones, salas, bloques horarios, reservas.

**Funcionalidades**:
- Tabs para cada entidad: Asignaturas, Secciones, Salas, Bloques Horarios, Reservas
- Crear, editar, eliminar en cada pestaña
- Búsqueda y filtros

**Tabs**:
1. **Asignaturas** — Código, nombre, descripción
2. **Secciones** — Grupo de estudiantes, asignatura, cantidad inscritos
3. **Salas** — Nombre, piso, capacidad
4. **Bloques Horarios** — Hora inicio, hora fin, nombre
5. **Reservas de Salas** — Sala × Bloque × Sección × Docente

**Componentes**:
- Tabs con routing
- Tablas para cada entidad
- Modales crear/editar
- Validaciones de datos

**Referencias de código**:
- Tabs layout: línea ~50+
- Tabla asignaturas: línea ~100+

---

#### 9. **gestion-solicitudes.tsx** (página, no módulo) — Crear Solicitud

**Ruta**: `/solicitud`  
**Acceso**: Docente, Profesor a Cargo  
**Descripción**: Formulario para crear solicitud de ingredientes.

**Flujo**:
1. Docente selecciona asignatura
2. Sistema carga secciones de esa asignatura
3. Docente elige sección
4. Sistema carga recetas disponibles
5. Docente elige receta
6. Sistema carga productos de la receta
7. Sistema calcula cantidades basado en inscritos: `cantidad_receta × inscritos / porción`
8. Docente puede ajustar cantidades manualmente
9. Docente envía solicitud

**Componentes**:
- Cascading selects: Asignatura → Sección → Receta
- Tabla de productos con cantidades editable
- Observaciones (textarea)
- Botón enviar

**Servicios**:
- `crearSolicitudService()` — Guardar solicitud
- `obtenerRecetasService()` — Cargar recetas por asignatura
- `obtenerProductosRecetaService()` — Productos de la receta

**Referencias de código**:
- Form: línea ~80+
- Cascading logic: línea ~120+

---

#### 10. **gestion-proveedores.tsx** — Gestión de Proveedores

**Ruta**: `/gestion-proveedores`  
**Acceso**: Administrador, Gestor de Pedidos  
**Descripción**: CRUD de proveedores.

**Funcionalidades**:
- Tabla paginada de proveedores
- Crear proveedor (nombre, RUT, email, teléfono, contacto)
- Editar proveedor
- Eliminar proveedor
- Búsqueda por nombre, RUT, email

**Componentes**:
- Tabla con datos de proveedor
- Modal crear/editar
- Input de búsqueda

**Servicios**:
- `crearProveedorService()`
- `actualizarProveedorService()`
- `eliminarProveedorService()`
- `obtenerProveedoresService()`

**Referencias de código**:
- Tabla: línea ~80+
- Modal: línea ~150+

---

#### 11. **bodega-transito.tsx** — Tránsito de Bodega

**Ruta**: `/bodega-transito`  
**Acceso**: Enc. Bodega, Asist. Bodega  
**Descripción**: Gestión de productos en tránsito (recibidos pero no confirmados en inventario).

**Funcionalidades**:
- Lista de productos en tránsito
- Botón "Recibir en Bodega" → mueve a inventario oficial
- Búsqueda y filtros
- Detalles: qué se espera, qué se recibió

**Estados**:
- EN_TRANSITO → (Confirmar recepción) → EN_INVENTARIO

**Componentes**:
- Tabla de tránsito
- Modal de recepción (confirmar cantidades)

**Servicios**:
- `obtenerBodegaTransitoService()` — Listar en tránsito
- `recibirProductoService()` — Mover a inventario

**Referencias de código**:
- Tabla: línea ~80+
- Recepción logic: línea ~150+

---

#### 12. **movimientos-producto.tsx** — Histórico de Movimientos

**Ruta**: `/movimientos-producto`  
**Acceso**: Enc. Bodega, Administrador  
**Descripción**: Histórico de todos los movimientos de inventario (entradas, salidas, ajustes).

**Funcionalidades**:
- Tabla de movimientos con filtros
- Filtro por producto, tipo (entrada/salida/ajuste), rango de fechas
- Búsqueda
- Detalles: usuario, cantidad, motivo, fecha

**Columnas**:
- Producto
- Tipo de movimiento
- Cantidad
- Motivo
- Usuario
- Fecha
- Hora

**Componentes**:
- Tabla con paginación
- Filtros: date range picker, select de tipo
- Búsqueda

**Servicios**:
- `obtenerMovimientosService()` — Listar movimientos
- `crearMovimientoService()` — Registrar nuevo movimiento

**Referencias de código**:
- Tabla: línea ~80+
- Filtros: línea ~120+

---

#### 13. **conglomerado-pedidos.tsx** — Conglomerado de Pedidos

**Ruta**: `/conglomerado-pedidos`  
**Acceso**: Administrador, Gestor de Pedidos  
**Descripción**: Vista consolidada de múltiples pedidos por período (semanal/mensual).

**Funcionalidades**:
- Selector de período
- Tabla de pedidos con estado
- Agrupación por semana
- KPIs: total pedidos, valor total, pendientes de recibir
- Búsqueda y filtros

**Estados de pedido**:
- BORRADOR
- CONFIRMADO
- ENVIADO
- RECIBIDO

**Componentes**:
- Selector de período (week/month picker)
- Tabla de pedidos
- Cards de KPI
- Filtros

**Referencias de código**:
- Tabla: línea ~80+
- Agrupación: línea ~120+

---

#### 14. **historico-pedidos.tsx** — Histórico de Pedidos

**Ruta**: `/historico-pedidos`  
**Acceso**: Administrador, Gestor de Pedidos  
**Descripción**: Histórico completo de pedidos finalizados o viejos.

**Funcionalidades**:
- Tabla de pedidos históricos
- Filtro por rango de fechas, estado
- Búsqueda por número de pedido
- Ver detalles (productos, cantidades, precios)
- Exportar a PDF/Excel

**Componentes**:
- Tabla paginada
- Filtros
- Modal de detalles
- Botones de exportación

**Referencias de código**:
- Tabla: línea ~80+
- Exportación: línea ~200+

---

#### 15. **pedido-semanal-a-bodega.tsx** — Pedido Semanal a Bodega

**Ruta**: `/pedido-semanal-a-bodega`  
**Acceso**: Administrador, Gestor de Pedidos, Enc. Bodega  
**Descripción**: Gestión especial de pedidos semanales que van a bodega.

**Funcionalidades**:
- Crear pedido semanal
- Enviar a bodega (tránsito)
- Recibir en bodega (confirmar)
- Sincronización con inventario
- Histórico de pedidos semanales

**Estados**:
- CREADO → ENVIADO → RECIBIDO

**Componentes**:
- Tabla de pedidos semanales
- Modal para crear
- Botones de acciones (enviar, recibir)

**Servicios**:
- `crearPedidoSemanaBodegaService()`
- `enviarABodegaService()`
- `recibirEnBodegaService()`

**Referencias de código**:
- Tabla: línea ~80+
- Acciones: línea ~150+

---

#### 16. **perfil-usuario.tsx** — Perfil del Usuario

**Ruta**: `/perfil-usuario`  
**Acceso**: Todos los usuarios autenticados  
**Descripción**: Página de perfil del usuario actual.

**Funcionalidades**:
- Mostrar información personal (nombre, email, rol)
- Editar nombre, foto de perfil
- Cambiar contraseña
- Ver última actividad
- Cerrar sesión

**Componentes**:
- Card de perfil con avatar
- Formularios de edición
- Modal cambiar contraseña
- Botón cerrar sesión

**Servicios**:
- `obtenerPerfilService()` — Obtener datos del usuario
- `actualizarPerfilService()` — Actualizar nombre/foto
- `cambiarContraseñaService()` — Cambiar contraseña

**Referencias de código**:
- Formulario perfil: línea ~80+
- Cambiar contraseña: línea ~150+

---

#### 17. **admin-sistema.tsx** — Administración del Sistema

**Ruta**: `/admin-sistema`  
**Acceso**: Administrador  
**Descripción**: Panel de control de parámetros globales del sistema.

**Funcionalidades**:
- Configurar stock mínimo por defecto
- Configurar días de anticipación para solicitudes
- Activar/desactivar períodos académicos
- Ver auditoría (últimas acciones del sistema)
- Resetear datos de demostración

**Parámetros**:
- `stockMinimoDefecto: number` — Stock mínimo inicial para productos nuevos
- `diasAnticipacionSolicitud: number` — Cuántos días anticipado debe enviar solicitud
- `periodoActivo: IPeriodo` — Período académico actual

**Componentes**:
- Inputs de configuración
- Toggle de períodos
- Tabla de auditoría
- Botón resetear demo

**Servicios**:
- `obtenerConfiguracionService()` — Obtener parámetros
- `actualizarConfiguracionService()` — Guardar cambios
- `obtenerAuditoriaService()` — Listar acciones

**Referencias de código**:
- Inputs de config: línea ~80+
- Tabla auditoría: línea ~150+

---

#### 18. **not-found.tsx** — Página No Encontrada

**Ruta**: `*` (rutas no definidas)  
**Acceso**: Público  
**Descripción**: Página 404 personalizada.

**Funcionalidades**:
- Mensaje amigable
- Link a home
- Icono de error

**Componentes**:
- Card vacía
- Botón volver a home

**Referencias de código**:
- Layout: línea ~30+

---

## 🔄 Flujos Principales

### 1. Flujo de Solicitud → Pedido

```
1. Docente accede a /solicitud
   ↓
2. Selecciona: Asignatura → Sección → Receta
   ↓
3. Sistema carga productos de receta
   ↓
4. Sistema calcula: cantidad_receta × inscritos / porción_receta
   ↓
5. Docente ajusta cantidades si es necesario
   ↓
6. Envía solicitud → Estado: PENDIENTE
   ↓
7. Gestor accede a /gestion-solicitudes
   ↓
8. Gestor aceptada/rechaza solicitud → Estado: ACEPTADA o RECHAZADA
   ↓
9. Gestor accede a /gestion-pedidos
   ↓
10. Elige semana, ve solicitudes ACEPTADAS
   ↓
11. Pulsa "Consolidar Pedido"
   ↓
12. Sistema agrupa por producto, suma cantidades
   ↓
13. Se crea Pedido → Estado: BORRADOR
   ↓
14. Gestor confirma pedido → Estado: CONFIRMADO
   ↓
15. Pedido se envía a bodega → Estado: ENVIADO
   ↓
16. Bodega recibe → Estado: RECIBIDO
   ↓
17. Stock se actualiza en inventario
```

### 2. Flujo de Control de Inventario

```
1. Bodega recibe productos (físicamente)
   ↓
2. Sistema registra en BodegaTransito (pendiente confirmación)
   ↓
3. Bodega accede a /bodega-transito
   ↓
4. Pulsa "Recibir en Bodega" → confirma cantidades
   ↓
5. Sistema crea Movimiento (tipo: INGRESO)
   ↓
6. Stock en Inventario se incrementa
   ↓
7. Se registra en histórico /movimientos-producto
```

### 3. Flujo de Gestión de Usuarios

```
1. Admin accede a /gestion-usuarios
   ↓
2. Crea usuario: email, nombre, rol, contraseña
   ↓
3. Sistema hashea contraseña
   ↓
4. Usuario intenta login en /login
   ↓
5. Credenciales se validan contra BD
   ↓
6. Si OK → Se genera JWT token
   ↓
7. Token se almacena en localStorage (opción: recordar sesión)
   ↓
8. Usuario accede a dashboard con permisos según rol
```

### 4. Flujo de Permisos

```
1. Admin accede a /gestion-roles
   ↓
2. Ve matriz: Roles × Módulos × Operaciones (Lectura, Crear, Actualizar, Eliminar)
   ↓
3. Marca/desmarca checkboxes
   ↓
4. Guarda cambios → Actualiza BD
   ↓
5. Cuando usuario intenta acceder a página:
   - Frontend verifica permiso (lectura del módulo) → ProtectedRoute
   - Si NO tiene permiso → Redirige a dashboard o error
   ↓
6. Cuando usuario intenta operación (crear, editar, eliminar):
   - Frontend valida permiso con hook useModulePermission()
   - Si NO tiene permiso → Oculta botón o muestra error
   - Backend valida nuevamente el permiso antes de procesar
```

---

## 🛠️ Stack Tecnológico

### Frontend

| Tecnología | Versión | Propósito |
|---|---|---|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.7.3 | Tipado estático |
| Vite | 6.0.11 | Build tool + dev server |
| Tailwind CSS | 4.1.11 | Estilos utilitarios |
| HeroUI | 2.8.3 | Componentes UI |
| React Router DOM | 5.3.4 | Routing (v5, no v6) |
| Axios | 1.6.7 | Cliente HTTP |
| Framer Motion | 11.18.2 | Animaciones |
| Recharts | 2.12.0 | Gráficos |
| jsPDF + jspdf-autotable | 3.0.3 + 5.0.2 | Generación de PDFs |
| XLSX | 0.18.5 | Exportación a Excel |
| @iconify/react | 6.0.2 | Íconos (lucide:) |
| Vitest | 4.0.3 | Testing |

### Backend

| Tecnología | Propósito |
|---|---|
| Java 11+ | Lenguaje |
| Spring Boot | Framework web |
| Spring Data JPA | ORM + queries |
| Spring Security + JWT | Autenticación y autorización |
| Maven | Gestión de dependencias |
| MariaDB / MySQL | Base de datos |

### Infraestructura

| Tecnología | Propósito |
|---|---|
| Docker | Containerización (opcional) |
| Docker Compose | Orquestación (BD + API) |
| Git | Control de versiones |
| Lightsail (AWS) | Hosting del servidor (pausado) |

---

## 📊 Resumen de Entidades Principales

### Base de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUARIOS Y SEGURIDAD                        │
├─────────────────────────────────────────────────────────────────┤
│ Usuario (id, email, contraseña_hash, nombre, rol_id, activo)   │
│ Rol (id, nombre, descripción)                                  │
│ PermisoRol (id, rol_id, modulo, lectura, crear, upd, del)     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    GESTIÓN ACADÉMICA                           │
├─────────────────────────────────────────────────────────────────┤
│ Asignatura (id, codigo, nombre, descripcion)                   │
│ Seccion (id, asignatura_id, nombre, cantidad_inscritos)        │
│ Sala (id, nombre, piso, capacidad)                             │
│ BloqueHorario (id, nombre, hora_inicio, hora_fin)             │
│ ReservaSala (id, sala_id, bloque_id, seccion_id)               │
│ Semana (id, fecha_inicio, fecha_fin, periodo_id)               │
│ Periodo (id, nombre, año, activo)                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    INVENTARIO                                  │
├─────────────────────────────────────────────────────────────────┤
│ Producto (id, codigo, nombre, categoria_id, unidad_id, activo) │
│ Categoria (id, nombre, descripcion)                            │
│ UnidadMedida (id, nombre, abreviatura)                         │
│ Inventario (id, producto_id, stock_actual, stock_minimo)       │
│ Movimiento (id, producto_id, tipo, cantidad, motivo, fecha)    │
│ BodegaTransito (id, producto_id, cantidad, estado)             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 SOLICITUDES Y PEDIDOS                          │
├─────────────────────────────────────────────────────────────────┤
│ Solicitud (id, docente_id, asig_id, seccion_id, estado, fecha) │
│ DetalleSolicitud (id, solicitud_id, producto_id, cantidad)     │
│ Pedido (id, numero, fecha, estado, total)                      │
│ DetallePedido (id, pedido_id, producto_id, cantidad, precio)   │
│ PedidoSemanaBodega (id, semana_id, estado, fecha)              │
│ DetallePedidoSemanaBodega (id, ped_sem_id, prod_id, cant)      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PROVEEDORES                                 │
├─────────────────────────────────────────────────────────────────┤
│ Proveedor (id, nombre, rut, email, telefono, contacto, activo) │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📞 Puntos de Integración

### URLs Base API

```
Backend API: http://localhost:8080/api/v1
Versión más reciente: /v1/
Versión anterior (deprecada): /v0/
```

### Autenticación

```
POST /v1/auth/login
  Body: { email, password, recordarSesion }
  Response: { token, usuario: { id, email, nombre, rol } }
  
Header para requests autenticadas:
  Authorization: Bearer <token_jwt>
```

### Permisos

```
Estrategia: Role-Based Access Control (RBAC)

Matriz de permisos:
  Rol × Módulo × Operación

Operaciones: LECTURA, CREAR, ACTUALIZAR, ELIMINAR

Módulos:
  DASHBOARD, INVENTARIO, GESTION_PEDIDOS, GESTION_SOLICITUDES,
  GESTION_USUARIOS, GESTION_ROLES, GESTION_ACADEMICA,
  GESTION_PROVEEDOR, ADMIN_SISTEMA, BODEGA_TRANSITO
```

---

## 🎓 Convenciones de Código

### Naming

| Elemento | Patrón | Ejemplo |
|---|---|---|
| Páginas | kebab-case | `gestion-usuarios.tsx` |
| Componentes | PascalCase | `DashboardInventarioView.tsx` |
| Servicios | camelCase + `-service` | `usuario-service.ts` |
| Tipos/Interfaces | PascalCase + `I` prefix | `IUsuario`, `IInventario` |
| Contextos | kebab-case + `-context` | `auth-context.tsx` |

### Rutas Protegidas

```typescript
// App.tsx
<ProtectedRoute path="/inventario" pageId="inventario">
  <MainLayout>
    <InventarioPage />
  </MainLayout>
</ProtectedRoute>
```

Parámetro `pageId` mapea a un módulo de permisos.

### Hooks Comunes

```typescript
const toast = useToast();              // Notificaciones
const confirm = useConfirm();          // Confirmaciones modales
const { user } = useAuth();            // Usuario actual
const { canRead, canCreate, ... } = useModulePermission('MODULO');
usePageTitle('Título', 'Subtítulo', 'lucide:icon');
```

---

## 📝 Próximos Pasos para Desarrollo

Cuando agregues nuevos módulos o funcionalidades:

1. **Backend**: Crear carpeta en `backend/src/main/java/KuHub/modules/mi_modulo/`
2. **Frontend**: Crear página en `frontend/src/pages/mi-nueva-page.tsx`
3. **Registrar en App.tsx**: Lazy load + ruta + página mapping
4. **Agregar al sidebar**: Menú de navegación
5. **Crear servicios**: API client tipado en `services/`
6. **Crear tipos**: Interfaces en `types/`
7. **Registrar permisos**: Agregar módulo en `gestion-roles.tsx`
8. **Actualizar versión**: Modificar tag (ej. K1.0.9) en `CLAUDE.md`

---

**Documento completo generado el 11 de mayo de 2026**
