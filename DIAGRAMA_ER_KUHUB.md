# DIAGRAMA ENTIDAD-RELACIÓN (ER) — KuHub v1.0.8

**Fecha:** 2026-05-12  
**Versión del Sistema:** 1.0.8  
**Base de Datos:** PostgreSQL 16.13  
**Archivo SQL Base:** ConexionXD_v2.sql (líneas 200-1215)

---

## 1. ESTRUCTURA GENERAL

KuHub está compuesto por **9 módulos principales** organizados en capas funcionales:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MÓDULO DE SEGURIDAD                          │
│  (Usuario, Rol, Refresh Token, Permisos)                        │
└─────────────────────────────────────────────────────────────────┘
          ↓              ↓              ↓
┌─────────────┐   ┌──────────────┐   ┌──────────────┐
│  MÓDULO      │   │  MÓDULO DE   │   │   MÓDULO DE   │
│ ACADÉMICO    │   │  INVENTARIO  │   │  PROVEEDORES │
└─────────────┘   └──────────────┘   └──────────────┘
          ↓              ↓              ↓
┌────────────────────────────────────────────────────────────────┐
│           MÓDULO DE PEDIDOS Y SOLICITUDES                      │
│    (Conecta Académica + Inventario + Proveedores)              │
└────────────────────────────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────────────────────────────┐
│        MÓDULO DE CONFIGURACIÓN DEL SISTEMA                      │
│   (Semanas, Bloques Horarios, Configuración Global)            │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. DIAGRAMA ENTIDAD-RELACIÓN (TEXTO)

### 2.1 Núcleo de Seguridad

```
┌──────────────────┐
│      rol         │
├──────────────────┤
│ id_rol (PK)      │ ──┐
│ nombre_rol (E)   │   │
│ activo           │   │
└──────────────────┘   │
                       │ 1:N
                       ↓
┌──────────────────────────────────┐
│         usuario                  │
├──────────────────────────────────┤
│ id_usuario (PK)                  │
│ id_rol (FK) ─────────────────────┘
│ p_nombre, s_nombre               │
│ app_paterno, app_materno         │
│ email (UNIQUE)                   │
│ username (UNIQUE)                │
│ contrasena (Bcrypt, 60 chars)    │
│ url_foto_perfil                  │
│ activo                           │
│ fecha_creacion, ultimo_acceso    │
└──────────────────────────────────┘
          ↓ 1:N
          ├────────────────────────────────────────┐
          │                                        │
    ┌─────────────────┐              ┌─────────────────────────┐
    │ refresh_token   │              │   docente_seccion       │
    ├─────────────────┤              ├─────────────────────────┤
    │ id_refresh...(PK)│             │ id_docente_seccion(PK)  │
    │ id_usuario(FK)  │             │ id_usuario(FK)          │
    │ token (UNIQUE)  │             │ id_seccion(FK)          │
    │ creado_en       │             │ fecha_asignacion        │
    │ expires_at      │             │ UNIQUE(usuario,seccion) │
    │ activo          │             └─────────────────────────┘
    └─────────────────┘                      ↑
                                             │ N:1
                                             │
                        ┌────────────────────┘
                        │
    ┌─────────────────────────────────────┐
    │  asignatura_profesor_cargo          │
    ├─────────────────────────────────────┤
    │ id_asignatura_profesor_cargo (PK)   │
    │ id_usuario(FK) ────────────┐        │
    │ id_asignatura(FK) ──┐      │        │
    │ fecha_asignacion    │      │        │
    │ UNIQUE(asignatura)  │      │        │
    └─────────────────────┼──────┼────────┘
                          │      │
```

### 2.2 Módulo Académico

```
┌────────────────────────────┐
│     bloque_horario         │
├────────────────────────────┤
│ id_bloque (PK)             │
│ numero_bloque (UNIQUE)     │
│ hora_inicio (TIME)         │
│ hora_fin (TIME)            │
│ CHECK: inicio < fin        │
└────────────────────────────┘
        ↑ 1:N
        │
    ┌───────────────────────┐
    │  asignatura           │ ──┐
    ├───────────────────────┤   │
    │ id_asignatura (PK)    │   │ 1:N
    │ cod_asignatura (U)    │   │
    │ nombre_asignatura     │   │
    │ descripcion           │   │
    │ activo                │   │
    └───────────────────────┘   │
            ↓ N:1               │
            │                   │
    ┌───────────────────────┐   │
    │   seccion             │   │
    ├───────────────────────┤   │
    │ id_seccion (PK)       │   │
    │ id_asignatura(FK)─────┼───┘
    │ nombre_seccion        │
    │ capacidad_max         │
    │ cant_inscritos        │
    │ estado_seccion (E)    │
    │ activo                │
    └───────────────────────┘
            ↓ 1:N
            ├────────────┬──────────────────┐
            │            │                  │
    ┌─────────────────┐ │  ┌──────────────────────┐
    │ reserva_sala    │ │  │ docente_seccion      │
    ├─────────────────┤ │  ├──────────────────────┤
    │ id_reserva...(PK)│ │  │ id_docente_sec.(PK) │
    │ id_seccion(FK)  │─┘  │ id_seccion(FK) ─────┘
    │ id_sala(FK) ─────┐   │ id_usuario(FK)       │
    │ dia_semana(E)   │   │ fecha_asignacion     │
    │ id_bloque(FK)   │   └──────────────────────┘
    │ activo          │
    └─────────────────┘
            ↑ N:1
            │
    ┌──────────────────┐
    │      sala        │
    ├──────────────────┤
    │ id_sala (PK)     │
    │ cod_sala (U)     │
    │ nombre_sala      │
    │ activo           │
    └──────────────────┘
```

### 2.3 Módulo de Inventario

```
┌──────────────────────────────┐
│   unidad_medida              │
├──────────────────────────────┤
│ id_unidad (PK)               │
│ nombre_unidad (UNIQUE)       │
│ abreviatura (UNIQUE)         │
│ es_fraccionario              │
│ activo                       │
└──────────────────────────────┘
        ↑ 1:N (×2)
        │
    ┌───┴────┬────────────────────────────┐
    │        │                            │
    │   ┌────────────────────┐    ┌──────────────────────┐
    │   │    inventario      │    │  bodega_transito     │
    │   ├────────────────────┤    ├──────────────────────┤
    │   │ id_inventario(PK)  │    │ id_bodega_tr.(PK)    │
    │   │ id_producto(FK) ──┐├───┬┤ id_inventario(FK)──┬─┘
    │   │ id_unidad(FK) ────┼┘   │ stock (NUMERIC)      │
    │   │ stock (NUMERIC)   │    │ stock_limit          │
    │   │ stock_limit       │    │ activo               │
    │   │ activo            │    └──────────────────────┘
    │   │ UNIQUE(producto)  │                │
    │   └────────────────────┘                │ N:1
    │        ↑ N:1                           │
    │        │ (×2)                          │
    │   ┌────────────────────┐               │
    │   │    producto        │               │
    │   ├────────────────────┤               │
    │   │ id_producto(PK)    │               │
    │   │ id_categoria(FK) ──┼──┐ ┌──────────┴──────────────┐
    │   │ id_unidad(FK) ─────┼──┼─┤ movimiento             │
    │   │ nombre_producto(U) │  │ ├───────────────────────┤
    │   │ cod_producto       │  │ │ id_movimiento(PK)     │
    │   │ descripcion        │  │ │ id_usuario(FK) ───────┤ (en usuario)
    │   │ es_fraccionario    │  │ │ id_inventario(FK) ────┘
    │   │ activo             │  │ │ id_bodega_transito    │
    │   └────────────────────┘  │ │ stock_movimiento      │
    │        ↑ N:1              │ │ tipo_movimiento(E)    │
    │        │                  │ │ fecha_movimiento      │
    │   ┌────────────────┐      │ │ observacion           │
    │   │   categoria    │      │ │ PK: (id,fecha)        │
    │   ├────────────────┤      │ │ PARTITION by SEMESTRE │
    │   │ id_categoria(PK)├──────┼─┴───────────────────────┘
    │   │ nombre_cat(U)  │      │
    │   │ activo         │      │
    └───┴────────────────┘      │
                                │
                                └─── Dividido en particiones:
                                    - movimiento_2026_s1
                                    - movimiento_2026_s2
                                    - movimiento_2027_s1
                                    - movimiento_2027_s2
                                    - movimiento_default
```

### 2.4 Módulo de Proveedores

```
┌─────────────────────────────────────┐
│         proveedor                   │
├─────────────────────────────────────┤
│ id_proveedor (PK)                   │
│ rut_proveedor (UNIQUE)              │
│ nombre_distribuidora                │
│ nombre_proveedor                    │
│ telefono_proveedor                  │
│ email_proveedor                     │
│ estado_proveedor (E)                │
│ activo                              │
│ fecha_creacion                      │
└─────────────────────────────────────┘
        ↓ 1:N
        ├──────────────────────────────────┬────────────────┐
        │                                  │                │
┌───────────────────────────────┐   ┌──────────────────┐   │
│   proveedor_producto          │   │ proveedor_dia_.. │   │
├───────────────────────────────┤   ├──────────────────┤   │
│ id_proveedor_producto (PK)    │   │ id_dia_entreg(PK)│   │
│ id_proveedor(FK) ─────────────┼──┬┤ id_proveedor(FK) │   │
│ id_producto(FK) ──────┐       │  │ dia_semana(E)    │   │
│ precio_producto       │       │  │ hora_inicio_..   │   │
│ activo                │       │  │ hora_fin_..      │   │
│ fecha_actualizacion   │       │  │ CHECK: inicio<fin│   │
│ UNIQUE(prov,product)  │       │  │ UNIQUE(prov,dia) │   │
└───────────────────────┼───────┘  └──────────────────┘   │
        ↑ N:1 (referencia producto) │                        │
        │                           │                        │
        └───────────────────────────┴────────────────────────┘
              (en producto del módulo inventario)
```

### 2.5 Módulo de Configuración

```
┌──────────────────────────┐
│   gestion_sistema        │
├──────────────────────────┤
│ id (PK)                  │
│ solicitudes_en_pedido    │ ← Boolean para togglear comportamiento
│ descripcion              │
│                          │
│ Filas iniciales:         │
│  - id=1: default (R/O)   │
│  - id=2: activa (RW)     │
└──────────────────────────┘

┌──────────────────────────┐
│      semanas             │
├──────────────────────────┤
│ id_semana (PK)           │
│ nombre_semana            │
│ fecha_inicio (DATE)      │
│ fecha_fin (DATE)         │
│ anio (STORED GENERATED)  │
│ semestre (1-2, CHECK)    │
│ UNIQUE(nombre,anio,sem)  │
│ UNIQUE(fecha_inicio)     │
└──────────────────────────┘
     ↑ 1:N (×3)
     │
  ┌──┴─────┬──────────────┐
  │        │              │
  
  (usadas en:
   - pedido_semana_bodega
   - solicitud
   - pedido)
```

### 2.6 Módulo de Recetas (Pedido Semanal Bodega)

```
┌─────────────────────────────────────┐
│  pedido_semana_bodega               │
│  (antigua tabla "receta")           │
├─────────────────────────────────────┤
│ id_pedido_semana_bodega (PK)        │
│ id_semana(FK, nullable)  ────┐      │
│ id_asignatura(FK, nullable)──┼─┐    │
│ nombre_pedido_semana_bodega  │ │    │
│ descripcion_pedido_semana... │ │    │
│ estado_pedido(E)             │ │    │
│ activo                       │ │    │
└──────────────────────────────┼─┼────┘
        ↓ 1:N                  │ │
        │                      │ │
┌───────────────────────────┐  │ │
│ detalle_pedido_semana_... │  │ │
├───────────────────────────┤  │ │
│ id_detalle...(PK)         │  │ │
│ id_pedido_semana(FK) ─────┘  │ │
│ id_producto(FK) ───────┐      │ │
│ cant_producto(NUMERIC) │      │ │
│ observacion(TEXT)      │      │ │
│ UNIQUE(pedido,product) │      │ │
└───────────────────────┬┘      │ │
        ↑ N:1           │       │ │
        │ (producto)    └───────┼─┘
        │
     (viene de producto
      en módulo inventario)
```

### 2.7 Módulo de Solicitudes

```
┌──────────────────────────────────────────┐
│          solicitud                       │
├──────────────────────────────────────────┤
│ id_solicitud (PK)                        │
│ id_usuario_gestor_solicitud(FK) ────┐    │
│ id_seccion(FK) ────────────┐        │    │
│ id_pedido_semana_bodega... │        │    │
│ id_reserva_sala(FK)        │        │    │
│ fecha_solicitada(DATE)     │        │    │
│ fecha_registro(TIMESTAMP)  │        │    │
│ observaciones(TEXT)        │        │    │
│ estado_solicitud(E)        │        │    │
└──────────────────────────┬─┴────────┼────┘
        ↓ 1:N              │         │
        │                  ├─────────┤ N:1
        │                  │         │
    ┌───────────────────┐  │    (en usuario)
    │ detalle_solicitud │  │
    ├───────────────────┤  │
    │ id_detalle...(PK) │  │
    │ id_solicitud(FK)──┘  │
    │ id_producto(FK) ──┐  │
    │ cant_solicitud... │  │
    │ observacion       │  │
    └─────────────┬─────┘  │
                  │        │
                  └────────┘ N:1 (en producto)

┌────────────────────────────────────┐
│ motivo_rechazo_solicitud           │
├────────────────────────────────────┤
│ id_motivo (PK)                     │
│ id_solicitud(FK) ───────────┐      │
│ motivo(TEXT)                │      │
│ fecha_rechazo(TIMESTAMP)    │      │
│ UNIQUE(id_solicitud)        │      │
└────────────────────────────┬┘      │
        ↑ 1:N               │        │
        │ (soft DELETE       │        │
        │  cuando estado     │        │
        │  != RECHAZADA)     │        │
        │                   │        │
        └───────────────────┘ N:1    │
              (en solicitud)──────────┘
```

### 2.8 Módulo de Pedidos

```
┌──────────────────────────────────────────┐
│           pedido                         │
├──────────────────────────────────────────┤
│ id_pedido (PK)                           │
│ fecha_inicio_pedido(DATE)                │
│ fecha_fin_pedido(DATE)                   │
│ fecha_registro(TIMESTAMP)                │
│ estado_pedido(E)                         │
│ (nota: antigua FK a semana ahora opcional)
└──────────────────────────────────────────┘
        ↓ 1:N
        │
    ┌───────────────────────────────┐
    │     detalle_pedido            │
    ├───────────────────────────────┤
    │ id_pedido_detalle (PK)        │
    │ id_pedido(FK) ─────────────┐  │
    │ id_producto(FK) ───┐       │  │
    │ cant_producto_... │       │  │
    │ UNIQUE(p,product)│       │  │
    └─────────────┬────┼───────┘  │
                  │    │          │
                  │    └──────────┼─┐ N:1 (en producto)
                  │               │
                  │    ┌──────────┘
                  │    │
    ┌─────────────────────────────┐
    │    pedido_solicitud         │
    ├─────────────────────────────┤
    │ id_pedido_solicitud (PK)    │
    │ id_pedido(FK) ──────────┐   │
    │ id_solicitud(FK) ────┐  │   │
    │ fecha_union...       │  │   │
    │ UNIQUE(p,solicitud)  │  │   │
    └────────────────┬─────┘  │   │
        ↑ N:N       │         │   │
        │           └─────────┼───┘
        │                     │ N:1 (en solicitud)
        │
 (relaciona solicitudes
  con pedidos en relación
  muchos a muchos)
```

---

## 3. LISTA DE TABLAS ORGANIZADAS POR MÓDULO

### 3.1 Módulo de Seguridad (4 tablas)
- `rol` — Roles del sistema
- `usuario` — Usuarios del sistema
- `refresh_token` — Tokens JWT refresh
- `modulo` — Módulos del sistema (creado por Hibernate)
- `permiso_rol` — Matriz CRUD por Rol×Módulo (creado por Hibernate)

### 3.2 Módulo Académico (6 tablas)
- `asignatura` — Cursos/Asignaturas
- `sala` — Salas de clase
- `bloque_horario` — Franjas horarias (20 bloques de 39 minutos)
- `seccion` — Secciones de asignatura
- `reserva_sala` — Reservas de sala por sección
- `docente_seccion` — Asignación docentes a secciones (M:M)
- `asignatura_profesor_cargo` — Profesor a cargo de asignatura (M:M)

### 3.3 Módulo de Inventario (6 tablas)
- `unidad_medida` — Unidades de medida (kg, L, unid, etc.)
- `categoria` — Categorías de productos
- `producto` — Productos del inventario
- `inventario` — Stock por producto (1:1 con producto)
- `bodega_transito` — Stock en tránsito (1:1 con inventario)
- `movimiento` — Historial de movimientos (PARTICIONADO por semestre)

### 3.4 Módulo de Proveedores (3 tablas)
- `proveedor` — Proveedores/Distribuidoras
- `proveedor_producto` — Relación Proveedor↔Producto (M:M)
- `proveedor_dia_entrega` — Horarios de entrega por proveedor

### 3.5 Módulo de Configuración (2 tablas)
- `gestion_sistema` — Configuración global (2 filas: default + activa)
- `semanas` — Períodos semanales por semestre

### 3.6 Módulo de Recetas (2 tablas)
- `pedido_semana_bodega` — Plantillas de recetas por semana
- `detalle_pedido_semana_bodega` — Detalles de receta

### 3.7 Módulo de Solicitudes (3 tablas)
- `solicitud` — Solicitudes de insumos
- `detalle_solicitud` — Detalles de solicitud
- `motivo_rechazo_solicitud` — Motivos de rechazo

### 3.8 Módulo de Pedidos (3 tablas)
- `pedido` — Pedidos operativos
- `detalle_pedido` — Detalles de pedido
- `pedido_solicitud` — Relación Pedido↔Solicitud (M:M)

**TOTAL: 38 tablas (+ vistas e índices)**

---

## 4. RELACIONES CLAVE

### 4.1 Relaciones 1:1
- `producto` ← → `inventario` (1 producto tiene 1 inventario)
- `inventario` ← → `bodega_transito` (1 inventario tiene 1 bodega_transito)

### 4.2 Relaciones 1:N
- `rol` ← → `usuario` (1 rol a muchos usuarios)
- `usuario` ← → `refresh_token` (1 usuario a muchos tokens)
- `usuario` ← → `movimiento` (1 usuario registra muchos movimientos)
- `asignatura` ← → `seccion` (1 asignatura a muchas secciones)
- `seccion` ← → `reserva_sala` (1 sección a muchas reservas)
- `proveedor` ← → `proveedor_producto` (1 proveedor a muchos productos)
- `proveedor` ← → `proveedor_dia_entrega` (1 proveedor a muchos días entrega)
- `producto` ← → `proveedor_producto` (1 producto a muchos proveedores)
- `categoria` ← → `producto` (1 categoría a muchos productos)
- `unidad_medida` ← → `producto` (1 unidad a muchos productos)
- `bloque_horario` ← → `reserva_sala` (1 bloque a muchas reservas)
- `sala` ← → `reserva_sala` (1 sala a muchas reservas)
- `pedido_semana_bodega` ← → `detalle_pedido_semana_bodega` (1 receta a muchos detalles)
- `solicitud` ← → `detalle_solicitud` (1 solicitud a muchos detalles)
- `solicitud` ← → `motivo_rechazo_solicitud` (1 solicitud a máx 1 motivo)
- `pedido` ← → `detalle_pedido` (1 pedido a muchos detalles)
- `inventario` ← → `movimiento` (1 inventario a muchos movimientos)
- `bodega_transito` ← → `movimiento` (1 bodega a muchos movimientos)

### 4.3 Relaciones M:M (Tablas Puente)
- `usuario` ← → `seccion` (a través de `docente_seccion`)
  - Notas: UNIQUE(usuario, seccion) — 1 docente por sección actualmente, diseño preparado para co-docencia
- `usuario` ← → `asignatura` (a través de `asignatura_profesor_cargo`)
  - Notas: UNIQUE(asignatura) — 1 profesor a cargo por asignatura (validado en BD + aplicación)
- `proveedor` ← → `producto` (a través de `proveedor_producto`)
  - Notas: UNIQUE(proveedor, producto) — Cada proveedor cotiza cada producto una sola vez
- `pedido` ← → `solicitud` (a través de `pedido_solicitud`)
  - Notas: UNIQUE(pedido, solicitud) — Cada solicitud en cada pedido una sola vez
- `rol` ← → `modulo` (a través de `permiso_rol`)
  - Notas: UNIQUE(rol, modulo) — Una entrada por rol×módulo con matriz CRUD

---

## 5. RESTRICCIONES Y VALIDACIONES

### 5.1 Restricciones de Unicidad (UNIQUE)
| Tabla | Columna(s) | Propósito |
|---|---|---|
| `usuario` | `email` | Identificación única por email |
| `usuario` | `username` | Username único por usuario |
| `refresh_token` | `token` | Un token no se puede repetir |
| `asignatura` | `cod_asignatura` | Código de asignatura único |
| `sala` | `cod_sala` | Código de sala único |
| `categoria` | `nombre_categoria` | Nombre único de categoría |
| `producto` | `nombre_producto` | Nombre único de producto |
| `producto` | `cod_producto` | Código opcional pero único si existe |
| `unidad_medida` | `nombre_unidad` | Nombre único de unidad |
| `unidad_medida` | `abreviatura` | Abreviatura única (kg, L, etc.) |
| `inventario` | `id_producto` | 1:1 inventario-producto |
| `bodega_transito` | `id_inventario` | 1:1 bodega-inventario |
| `docente_seccion` | `(id_usuario, id_seccion)` | Un docente por sección |
| `asignatura_profesor_cargo` | `id_asignatura` | Un profesor a cargo por asignatura |
| `proveedor_producto` | `(id_proveedor, id_producto)` | Una cotización por proveedor-producto |
| `proveedor_dia_entrega` | `(id_proveedor, dia_semana)` | Un horario por proveedor-día |
| `semanas` | `(nombre_semana, anio, semestre)` | Semana única por período |
| `semanas` | `fecha_inicio` | Una semana por fecha de inicio |
| `detalle_pedido_semana_bodega` | `(id_pedido_semana, id_producto)` | Un producto por receta |
| `detalle_pedido` | `(id_pedido, id_producto)` | Un producto por pedido |
| `pedido_solicitud` | `(id_pedido, id_solicitud)` | Una solicitud por pedido |
| `permiso_rol` | `(id_rol, id_modulo)` | Un permiso por rol-módulo |

### 5.2 Restricciones CHECK
| Tabla | Columna | Condición |
|---|---|---|
| `bloque_horario` | `hora_inicio, hora_fin` | `hora_inicio < hora_fin` |
| `proveedor_dia_entrega` | `hora_inicio_entrega, hora_fin_entrega` | `inicio < fin` |
| `inventario` | `stock` | `stock >= 0` |
| `bodega_transito` | `stock` | `stock >= 0` |
| `detalle_pedido_semana_bodega` | `cant_producto` | `cant >= 0` |
| `semanas` | `semestre` | `semestre IN (1, 2)` |
| `movimiento` | `stock_movimiento` | Implícito (puede ser negativo) |

### 5.3 Soft Delete (activo = BOOLEAN)
Todas las tablas excepto `refresh_token`, `modulo`, `permiso_rol` tienen columna `activo`:
```sql
-- Nunca eliminar, solo marcar como inactivo
UPDATE producto SET activo = FALSE WHERE id_producto = 123;
```

---

## 6. PARTICIONAMIENTO

### 6.1 Tabla `movimiento` (Particionada por Semestre)

**Estrategia:** RANGE PARTITION por `fecha_movimiento`

```
movimiento (tabla padre)
├── movimiento_2026_s1 (2026-01-01 a 2026-06-30)
├── movimiento_2026_s2 (2026-07-01 a 2026-12-31)
├── movimiento_2027_s1 (2027-01-01 a 2027-06-30)
├── movimiento_2027_s2 (2027-07-01 a 2027-12-31)
└── movimiento_default (fuera de rango, ej: 2025 o 2028+)
```

**Beneficios:**
- Mejora velocidad de queries por período
- Facilita archivado de datos viejos
- Paralelización de mantenimiento

**Operaciones:**
```sql
-- Insert automático a la partición correcta
INSERT INTO movimiento (...) VALUES (...);  -- Va a movimiento_2026_s1 si es enero

-- Consulta en período específico (automático)
SELECT * FROM movimiento 
WHERE fecha_movimiento BETWEEN '2026-01-01' AND '2026-06-30';
-- Escanea solo movimiento_2026_s1
```

---

## 7. ÍNDICES PRINCIPALES

### 7.1 Índices de Búsqueda Frecuente

| Tabla | Índice | Columna(s) | Tipo |
|---|---|---|---|
| `usuario` | `idx_usuario_email` | `email` | B-tree |
| `usuario` | `idx_usuario_username` | `username` | B-tree |
| `usuario` | `idx_usuario_rol` | `id_rol` | B-tree |
| `refresh_token` | `idx_refresh_token_usuario` | `id_usuario` | B-tree |
| `asignatura` | `idx_asignatura_codigo` | `cod_asignatura` | B-tree |
| `asignatura` | `idx_asignatura_activo` | `activo` | B-tree |
| `seccion` | `idx_seccion_asignatura` | `id_asignatura` | B-tree |
| `seccion` | `idx_seccion_estado_activo` | `(estado_seccion, activo)` | Composite |
| `reserva_sala` | `idx_reserva_sala_seccion` | `id_seccion` | B-tree |
| `reserva_sala` | `idx_reserva_sala_sala` | `id_sala` | B-tree |
| `reserva_sala` | `idx_reserva_dia_bloque` | `(dia_semana, id_bloque)` | Composite |

### 7.2 Índices Únicos (Partial)

| Tabla | Índice | Condición |
|---|---|---|
| `usuario` | `idx_usuario_email_activo` | `WHERE activo = true` |
| `usuario` | `idx_usuario_username_activo` | `WHERE activo = true` |
| `reserva_sala` | `uk_reserva_activa` | `WHERE activo = true` |
| `reserva_sala` | `uk_seccion_dia_bloque_activa` | `WHERE activo = true` |
| `proveedor_producto` | `idx_pp_producto_precio_optimo` | `WHERE activo = true` |
| `bodega_transito` | `idx_bodega_transito_activo` | `WHERE activo = true` |

### 7.3 Índices de Desempeño

| Tabla | Índice | Columna(s) | Propósito |
|---|---|---|---|
| `movimiento` | `idx_movimiento_fecha` | `fecha_movimiento` | Queries por período |
| `movimiento` | `idx_movimiento_inventario` | `id_inventario` | Stock history |
| `solicitud` | `idx_solicitud_fecha` | `fecha_solicitada` | Reportes por fecha |
| `pedido` | `idx_pedido_fecha_inicio` | `fecha_inicio_pedido` | Rangos de fecha |
| `producto` | `idx_producto_categoria` | `id_categoria` | Productos por categoría |

---

## 8. VISTAS VIRTUALES (VIEWS)

Sistema incluye múltiples VIEWs para simplificar queries frecuentes:

```sql
-- Ejemplo (consultar ConexionXD_v2.sql sección 12)
CREATE VIEW vw_productos_activos AS
SELECT p.*, c.nombre_categoria
FROM producto p
JOIN categoria c ON p.id_categoria = c.id_categoria
WHERE p.activo = TRUE;

CREATE VIEW vw_inventario_stock AS
SELECT p.nombre_producto, i.stock, um.abreviatura, i.stock_limit
FROM inventario i
JOIN producto p ON i.id_producto = p.id_producto
JOIN unidad_medida um ON i.id_unidad = um.id_unidad
WHERE i.activo = TRUE;
```

Consultar línea ~900 del archivo SQL para la lista completa.

---

## 9. FUNCIONES SQL

Sistema incluye funciones para automatización:

### 9.1 Generación de Solicitudes Masivas
**Función:** `generar_solicitudes_masivas(p_payload JSONB)`
- Procesa solicitudes masivas desde UI
- Crea solicitudes individuales por sección
- Multiplica cantidades por ratio de estudiantes
- Redondea según `es_fraccionario` del producto

### 9.2 Rechazo Automático de Solicitudes Vencidas
**Función:** `rechazar_solicitudes_vencidas()`
- Se ejecuta diariamente (scheduler backend)
- Rechaza solicitudes cuya fecha de clase expiró
- Inserta motivo automático

### 9.3 Marcación Automática de Pedidos Entregados
**Función:** `marcar_pedidos_entregados_por_fecha()`
- Marca pedidos como ENTREGADO si fecha_entrega <= CURRENT_DATE
- Reduce carga manual de actualización

Consultar línea ~3000 del archivo SQL para implementaciones.

---

## 10. TIPOS ENUMERADOS (ENUM)

PostgreSQL utiliza tipos ENUM para datos categóricos:

| Tipo | Valores |
|---|---|
| `tipo_rol_type` | ADMINISTRADOR, CO_ADMINISTRADOR, GESTOR_PEDIDOS, PROFESOR_A_CARGO, DOCENTE, ENCARGADO_BODEGA, ASISTENTE_BODEGA |
| `dia_semana_type` | LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO |
| `tipo_movimiento_type` | ENTRADA_INVENTARIO, ENTRADA_BODEGA, SALIDA_INVENTARIO, SALIDA_BODEGA, DEVOLUCION, MERMA_INVENTARIO, MERMA_BODEGA, AJUSTE_INVENTARIO, AJUSTE_BODEGA, TRASLADO |
| `estado_solicitud_type` | PENDIENTE, ACEPTADA, EN_PEDIDO, PROCESADO, RECHAZADA |
| `estado_pedido_type` | PENDIENTE, APROBADO, ENTREGADO, RECHAZADO |
| `estado_pedido_semana_bodega_type` | ACTIVO, INACTIVO |
| `estado_provedor_type` | DISPONIBLE, NO_DISPONIBLE |
| `estado_bodega_transito_type` | EN_TRANSITO, RECIBIDO, PROCESADO, CANCELADO |
| `estado_seccion_type` | ACTIVA, INACTIVA, SUSPENDIDA |

---

## 11. NOTAS ARQUITECTÓNICAS

### 11.1 Diseño de Co-docencia
La tabla `docente_seccion` se modela como **M:M intencionada**:
- Actualmente: UNIQUE(usuario, seccion) en BD + validación en `SeccionServiceImp`
- Futuro: Solo remover validación del servicio, no requiere cambios de schema
- Razón: Preparado para evolución a co-docencia sin migraciones

### 11.2 Profesor a Cargo (1 por asignatura)
La tabla `asignatura_profesor_cargo`:
- UNIQUE(id_asignatura) en BD + validación en `AsignaturaServiceImp`
- Más restrictiva que docente_seccion
- Futuro: Remover UNIQUE para permitir múltiples profesores colaboradores

### 11.3 Provisión de Productos
Tabla `proveedor_producto` **puente M:M inteligente**:
- Cada proveedor puede cotizar cada producto
- Almacena precio y metadatos de cotización
- Facilita comparación de precios (query rápida)

### 11.4 Flujo de Solicitudes → Pedidos
Relación **M:M flexible**:
- Múltiples solicitudes pueden alimentar un pedido (agrupación)
- Un pedido puede cumplir múltiples solicitudes (relación compleja)
- `pedido_solicitud` es tabla de trazabilidad y no de relación binaria

### 11.5 Solicitudes en Pedido (Configuración Global)
Tabla `gestion_sistema`:
- `solicitudes_en_pedido` (BOOLEAN): controla si las solicitudes aparecen en el módulo "Pedidos"
- 2 filas: id=1 (default RO), id=2 (activa RW)
- Backend lee id=2; UI puede restaurar a id=1 si es necesario

---

## 12. ESTADÍSTICAS Y ESCALADO

### 12.1 Tamaño Esperado

| Entidad | Registros/Año | Observaciones |
|---|---|---|
| `usuario` | ~50-100 | Bajo crecimiento |
| `asignatura` | 20-30 | Fijo por plan académico |
| `seccion` | 50-100 | Múltiples secciones por asignatura |
| `producto` | 200-500 | Inventario gastronomía |
| `movimiento` | 10,000-50,000 | Crece rápido, PARTICIONADO |
| `solicitud` | 1,000-5,000 | Múltiples por semana |

### 12.2 Recomendaciones de Performance

1. **Índices:** Todos incluidos en el SQL
2. **Particionamiento:** `movimiento` ya particionado por semestre
3. **Estadísticas:** Ejecutar `ANALYZE` mensualmente
4. **Autovacuum:** Habilitado por defecto en PostgreSQL
5. **Conexiones:** `max_connections = 100` configurado en BD
6. **Caché:** `shared_buffers = 128 MB` en servidor 512 MB RAM

---

## 13. CHECKLIST PARA NUEVA IMPLEMENTACIÓN

- [ ] Diagrama ERD importado en draw.io
- [ ] Validar todas las FKs (ON DELETE CASCADE/RESTRICT)
- [ ] Revisar índices por tabla (especialmente `movimiento`)
- [ ] Confirmar particiones de `movimiento` para el período correcto
- [ ] Verificar ENUMs en tipos_rol_type, estado_solicitud_type, etc.
- [ ] Probar soft deletes (activo = FALSE) en todas las tablas
- [ ] Validar UNIQUE constraints en búsquedas frecuentes
- [ ] Confirmar VIEWs en módulo de reportes
- [ ] Verificar funciones SQL (generar_solicitudes, rechazar_vencidas)
- [ ] Testing en datos de prueba (script de inserts disponible)

---

## 14. REFERENCIAS

| Documento | Ubicación | Contenido |
|---|---|---|
| **Esquema SQL Completo** | `ConexionXD_v2.sql` | Líneas 1-1215 |
| **Índice de Mapeo** | `MAPA_ConexionXD_v2.md` | Localización de tablas/funciones |
| **Configuración Infraestructura** | `CONFIGURATION_HOST_DEVS.md` | BD PostgreSQL 16.13 |
| **Contexto de Solicitudes** | `CONTEXTO_SOLICITUD.md` | Lógica de flujo de solicitudes |
| **Convenciones Globales** | `CLAUDE.md` | Versionado, deploy, estructura |

---

**Diagrama generado:** 2026-05-12  
**Versión ERD:** 1.0  
**Estado:** ✓ Completo y actualizado
