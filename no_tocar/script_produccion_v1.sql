-- =====================================================
-- ELIMINAR FUNCIONES Y TRIGGERS
-- =====================================================
--DROP FUNCTION IF EXISTS validar_asignacion_docente() CASCADE;
--DROP FUNCTION IF EXISTS validar_cambio_rol_docente() CASCADE;
DROP TRIGGER IF EXISTS trg_limpiar_motivo_rechazo ON solicitud;
DROP FUNCTION IF EXISTS fn_limpiar_motivo_al_cambiar_estado() CASCADE;
DROP FUNCTION IF EXISTS rechazar_solicitudes_vencidas() CASCADE;
DROP FUNCTION IF EXISTS marcar_pedidos_entregados_por_fecha() CASCADE;
DROP FUNCTION IF EXISTS fn_solicitud_a_pedido() CASCADE;

-- =====================================================
-- ELIMINAR TIPOS ENUM (Limpieza total)
-- =====================================================
DROP TYPE IF EXISTS estado_pedido_semana_bodega_type CASCADE;
DROP TYPE IF EXISTS estado_pedido_operativo_type CASCADE;
DROP TYPE IF EXISTS estado_solicitud_type CASCADE;
DROP TYPE IF EXISTS estado_pedido_type CASCADE; -- Borramos el nombre conflictivo
DROP TYPE IF EXISTS tipo_movimiento_type CASCADE;
DROP TYPE IF EXISTS dia_semana_type CASCADE;
DROP TYPE IF EXISTS tipo_rol_type CASCADE;
DROP TYPE IF EXISTS estado_seccion_type CASCADE;
DROP TYPE IF EXISTS estado_provedor_type CASCADE;
DROP TYPE IF EXISTS estado_bodega_transito_type CASCADE;
DROP TYPE IF EXISTS estado_orden_pedido_type CASCADE;
DROP TYPE IF EXISTS tipo_abastecimiento CASCADE;
DROP TYPE IF EXISTS tipo_equipo_soporte_type CASCADE;
DROP TYPE IF EXISTS tipo_error_soporte_type CASCADE;
DROP TYPE IF EXISTS estado_soporte_type CASCADE;
-- =====================================================
-- ELIMINAR CASTS (Limpieza)
-- =====================================================
DROP CAST IF EXISTS (varchar AS tipo_rol_type) CASCADE;
DROP CAST IF EXISTS (varchar AS dia_semana_type) CASCADE;
DROP CAST IF EXISTS (varchar AS tipo_movimiento_type) CASCADE;
DROP CAST IF EXISTS (character varying AS tipo_movimiento_type) CASCADE; -- Por si acaso quedó con este alias
DROP CAST IF EXISTS (varchar AS estado_pedido_semana_bodega_type) CASCADE;
DROP CAST IF EXISTS (varchar AS estado_provedor_type) CASCADE;
DROP CAST IF EXISTS (varchar AS estado_bodega_transito_type) CASCADE;
DROP CAST IF EXISTS (varchar AS estado_solicitud_type) CASCADE;
DROP CAST IF EXISTS (varchar AS estado_pedido_type) CASCADE;
DROP CAST  IF EXISTS (varchar AS tipo_abastecimiento)CASCADE;
DROP CAST  IF EXISTS (varchar AS estado_soporte_type)CASCADE;
DROP CAST  IF EXISTS (varchar AS tipo_error_soporte_type) CASCADE;
DROP CAST  IF EXISTS (varchar AS tipo_equipo_soporte_type) CASCADE;

-- =====================================================
-- ELIMINAR TABLAS HISTORICAS PRIMERO (sin FKs entrantes)
-- =====================================================

DROP TABLE IF EXISTS soporte_ticket CASCADE;
DROP TABLE IF EXISTS movimiento_historial CASCADE;
DROP TABLE IF EXISTS pedido_detalle_procesado CASCADE;
DROP TABLE IF EXISTS pedido_procesado CASCADE;
DROP TABLE IF EXISTS detalle_solicitud_procesada CASCADE;
DROP TABLE IF EXISTS solicitud_procesada CASCADE;

-- =====================================================
-- ELIMINAR TABLAS OPERATIVAS (orden inverso a creacion)
-- =====================================================
-- Tablas de orden de pedido (CASCADE baja a detalle_orden_pedido automáticamente)
DROP TABLE IF EXISTS reserva_stock_solicitud CASCADE;
DROP TABLE IF EXISTS detalle_orden_pedido_solicitud CASCADE;
DROP TABLE IF EXISTS orden_pedido CASCADE;
DROP TABLE IF EXISTS detalle_orden_pedido CASCADE;

-- Tablas de pedidos y solicitudes
DROP TABLE IF EXISTS pedido_solicitud CASCADE;
DROP TABLE IF EXISTS motivo_rechazo_solicitud CASCADE;
DROP TABLE IF EXISTS detalle_solicitud CASCADE;
DROP TABLE IF EXISTS solicitud CASCADE;
DROP TABLE IF EXISTS detalle_pedido CASCADE;
DROP TABLE IF EXISTS pedido CASCADE;
DROP TABLE IF EXISTS semanas CASCADE;

-- Tablas de recetas
DROP TABLE IF EXISTS detalle_pedido_semana_bodega CASCADE;
DROP TABLE IF EXISTS pedido_semana_bodega CASCADE;

-- Tablas de bodega y proveedores
DROP TABLE IF EXISTS proveedor_dia_entrega CASCADE;
DROP TABLE IF EXISTS proveedor_producto  CASCADE;
DROP TABLE IF EXISTS proveedor CASCADE;

-- Tablas de inventario
DROP TABLE IF EXISTS bodega_transito CASCADE;
DROP TABLE IF EXISTS movimiento CASCADE;
DROP TABLE IF EXISTS inventario CASCADE;
DROP TABLE IF EXISTS producto CASCADE;
DROP TABLE IF EXISTS categoria CASCADE;
DROP TABLE IF EXISTS unidad_medida CASCADE;
DROP TABLE IF EXISTS categoria_abastecimiento CASCADE;
DROP TABLE IF EXISTS stock_disponible CASCADE;

-- Tablas academicas
DROP TABLE IF EXISTS asignatura_profesor_cargo CASCADE;
DROP TABLE IF EXISTS docente_seccion CASCADE;
DROP TABLE IF EXISTS reserva_sala CASCADE;
DROP TABLE IF EXISTS seccion CASCADE;
DROP TABLE IF EXISTS sala CASCADE;
DROP TABLE IF EXISTS asignatura CASCADE;
DROP TABLE IF EXISTS bloque_horario CASCADE;

-- Tablas de permisos (deben ir antes que rol y modulo)
DROP TABLE IF EXISTS permiso_rol CASCADE;
DROP TABLE IF EXISTS modulo CASCADE;

-- Tablas de usuarios
DROP TABLE IF EXISTS usuario CASCADE;
DROP TABLE IF EXISTS rol CASCADE;

-- Tablas de refresh token
DROP TABLE IF EXISTS refresh_token CASCADE;

-- =====================================================
-- EXTENSIONES DE BASE DE DATOS
-- =====================================================
-- Habilita la extensión UNACCENT en PostgreSQL si aún no existe.
-- Esta extensión permite quitar acentos (á, é, í, ó, ú, ñ, etc.)
-- y facilita comparaciones insensibles a tildes.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- =====================================================
-- TIPOS ENUM
-- =====================================================

CREATE TYPE tipo_rol_type AS ENUM (
    'ADMINISTRADOR',
    'CO_ADMINISTRADOR',
    'GESTOR_PEDIDOS',
    'PROFESOR_A_CARGO',
    'DOCENTE',
    'ENCARGADO_BODEGA',
    'ASISTENTE_BODEGA'
);

CREATE TYPE dia_semana_type AS ENUM (
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO'
);

CREATE TYPE tipo_movimiento_type AS ENUM (
    'ENTRADA_INVENTARIO',
    'ENTRADA_BODEGA',
    'SALIDA_INVENTARIO',
    'SALIDA_BODEGA',
    'DEVOLUCION',
    'MERMA_INVENTARIO',
    'MERMA_BODEGA',
    'AJUSTE_INVENTARIO',
    'AJUSTE_BODEGA',
    'TRASLADO'
);

CREATE TYPE estado_pedido_semana_bodega_type AS ENUM(
    'ACTIVO',
    'INACTIVO'
);

CREATE TYPE estado_provedor_type AS ENUM(
    'DISPONIBLE',
    'NO_DISPONIBLE'
);

CREATE TYPE estado_bodega_transito_type AS ENUM(
    'EN_TRANSITO',
    'RECIBIDO',
    'PROCESADO',
    'CANCELADO'
);

CREATE TYPE estado_solicitud_type AS ENUM (
    'PENDIENTE',
    'ACEPTADA',
    'EN_PEDIDO',
    'PROCESADO',
    'RECHAZADA'
);

CREATE TYPE estado_pedido_type AS ENUM (
    'PENDIENTE',
    'APROBADO',
    'ENTREGADO',
    'RECHAZADO'
);

CREATE TYPE estado_seccion_type AS ENUM (
    'ACTIVA',
    'INACTIVA',
    'SUSPENDIDA'
);

CREATE TYPE estado_orden_pedido_type AS ENUM (
    'PENDIENTE',
    'ENVIADA',
    'CANCELADA',
    'CONFIRMADA',
    'RECIBIDA'
);

CREATE TYPE tipo_abastecimiento AS ENUM (
    'INVENTARIO',
    'BODEGA_TRANSITO'
);

CREATE TYPE tipo_equipo_soporte_type AS ENUM (
	'NOTEBOOK',
	'DESKTOP',
	'TABLET',
	'OTRO'
);

CREATE TYPE tipo_error_soporte_type AS ENUM (
	'VISUAL',
	'RENDERIZADO',
	'FUNCIONALIDAD',
	'DATOS_INCORRECTOS',
	'LENTITUD_SUGERENCIA'
);

CREATE TYPE estado_soporte_type AS ENUM (
	'ABIERTO',
	'EN_REVISION',
	'RESUELTO',
	'DESCARTADO'
);

-- =====================================================
-- CREAR CASTS (DESPUÉS DE CREAR LOS ENUM)
-- =====================================================

CREATE CAST (varchar AS tipo_rol_type) WITH INOUT AS IMPLICIT;
CREATE CAST (varchar AS dia_semana_type) WITH INOUT AS IMPLICIT;
CREATE CAST (varchar AS tipo_movimiento_type) WITH INOUT AS IMPLICIT;
CREATE CAST (varchar AS estado_pedido_semana_bodega_type) WITH INOUT AS IMPLICIT;
CREATE CAST (varchar AS estado_provedor_type) WITH INOUT AS IMPLICIT;
CREATE CAST (varchar AS estado_bodega_transito_type) WITH INOUT AS IMPLICIT;
CREATE CAST (varchar AS estado_solicitud_type) WITH INOUT AS IMPLICIT;
CREATE CAST (varchar AS estado_pedido_type) WITH INOUT AS IMPLICIT;
CREATE CAST (varchar AS estado_seccion_type) WITH INOUT AS IMPLICIT;
CREATE CAST (varchar AS estado_orden_pedido_type) WITH INOUT AS IMPLICIT;
CREATE CAST (varchar AS estado_soporte_type) WITH INOUT AS IMPLICIT;
CREATE CAST (varchar AS tipo_error_soporte_type) WITH INOUT AS IMPLICIT;
CREATE CAST (varchar AS tipo_equipo_soporte_type) WITH INOUT AS IMPLICIT;

-- =====================================================
-- TABLAS PRINCIPALES
-- =====================================================

-- Tabla configuraciones del sistema
CREATE TABLE IF NOT EXISTS gestion_sistema (
    id                      SERIAL PRIMARY KEY,
    solicitudes_en_pedido   BOOLEAN NOT NULL DEFAULT FALSE,
    descripcion             VARCHAR(255)
);

-- Tabla rol
CREATE TABLE rol (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol tipo_rol_type NOT NULL,
    activo BOOLEAN DEFAULT TRUE --soft delete
);

-- Tabla usuario
CREATE TABLE usuario (
    id_usuario INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_rol INTEGER NOT NULL REFERENCES rol(id_rol),
    -- Ajuste de nombres a 50 caracteres
    p_nombre VARCHAR(50),
    s_nombre VARCHAR(50),
    app_paterno VARCHAR(50),
    app_materno VARCHAR(50),
    -- Ajuste de email a 75 (uso interno)
    email VARCHAR(75) NOT NULL,
    username VARCHAR(50) NOT NULL, -- Asumo que el username también baja a 50
    -- Ajuste CRÍTICO para Bcrypt (Mínimo 60)
    contrasena VARCHAR(60) NOT NULL,
    url_foto_perfil BYTEA, -- SE CAMBIARA EN UN FUTURO A URL
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP,
    terminos_version_aceptada VARCHAR(10) NULL,
    terminos_fecha_aceptacion TIMESTAMP NULL
);

CREATE TABLE refresh_token (
    id_refresh_token BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    activo           BOOLEAN DEFAULT TRUE,
    creado_en        TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at       TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    token            VARCHAR(255) NOT NULL,
    id_usuario       INTEGER NOT NULL,

    -- Restricción para que el token no se repita
    CONSTRAINT uk_refresh_token UNIQUE (token),

    -- Llave foránea hacia la tabla usuario
    CONSTRAINT fk_refresh_token_usuario
       FOREIGN KEY (id_usuario)
           REFERENCES usuario(id_usuario)
           ON DELETE CASCADE
);

-- Tabla bloque_horario

CREATE TABLE bloque_horario (
    id_bloque INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero_bloque INTEGER UNIQUE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    CONSTRAINT check_horario_valido CHECK (hora_inicio < hora_fin)
);

-- Tabla asignatura
CREATE TABLE asignatura (
    id_asignatura INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cod_asignatura VARCHAR(50) UNIQUE NOT NULL,
    nombre_asignatura VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,             -- soft delete
    descripcion VARCHAR(250)              	 -- nueva columna
);

-- Tabla sala
CREATE TABLE sala (
    id_sala INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cod_sala VARCHAR(50) UNIQUE,
    nombre_sala VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE -- soft delete
);

-- Tabla seccion
CREATE TABLE seccion (
    id_seccion INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_asignatura INTEGER NOT NULL,
    nombre_seccion VARCHAR(100) NOT NULL,
    capacidad_max SMALLINT NOT NULL,
    cant_inscritos SMALLINT NOT NULL,
    activo BOOLEAN DEFAULT TRUE, -- soft delete
    estado_seccion estado_seccion_type NOT NULL DEFAULT 'ACTIVA',
    CONSTRAINT fk_asignatura
        FOREIGN KEY (id_asignatura)
            REFERENCES asignatura(id_asignatura)
);

-- Tabla reserva_sala
CREATE TABLE reserva_sala (
    id_reserva_sala INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_seccion INTEGER NOT NULL,
    id_sala INTEGER NOT NULL,
    dia_semana dia_semana_type NOT NULL,
    id_bloque INTEGER NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_reserva_sala_seccion
      FOREIGN KEY (id_seccion)
          REFERENCES seccion(id_seccion)
          ON DELETE CASCADE,
    CONSTRAINT fk_reserva_sala_sala
      FOREIGN KEY (id_sala)
          REFERENCES sala(id_sala),
    CONSTRAINT fk_reserva_sala_bloque
      FOREIGN KEY (id_bloque)
          REFERENCES bloque_horario(id_bloque)
);


/* =========================================================================
 * NOTA DE ARQUITECTURA - TABLA INTERMEDIA (docente_seccion):
 *
 * DISEÑO MUCHOS A MUCHOS (M:M) INTENCIONADO POR ESCALABILIDAD:
 * La tabla se modela como una relación M:M entre usuario y seccion para
 * mantener flexibilidad futura (ej. co-docencia, equipos de enseñanza),
 * permitiendo crear usuarios (profesores) y secciones de manera
 * completamente independiente y relacionarlos a través de esta tabla.
 *
 * RESTRICCIÓN ACTUAL DE NEGOCIO (1 docente por sección):
 * Aunque la estructura de base de datos soporta múltiples docentes por
 * sección, la lógica de negocio en el backend (SeccionServiceImp) restringe
 * la asignación a UN SOLO docente por sección. Esta restricción se gestiona
 * a nivel de aplicación —NO a nivel de base de datos— de forma deliberada:
 *   - Se conserva la constraint UNIQUE(id_usuario, id_seccion) para evitar
 *     duplicados exactos, pero NO se agrega UNIQUE(id_seccion) para no
 *     bloquear la posibilidad de co-docencia en el futuro.
 *   - Si el negocio evoluciona hacia la co-docencia, solo se necesita
 *     remover la validación del servicio; no hay migraciones de schema.
 * ========================================================================= */
-- Tabla docente_seccion
CREATE TABLE docente_seccion (
    id_docente_seccion INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario         INTEGER NOT NULL,
    id_seccion         INTEGER NOT NULL,
    fecha_asignacion   DATE DEFAULT CURRENT_DATE,
    -- UNIQUE(id_usuario, id_seccion): evita duplicados exactos.
    -- NO se agrega UNIQUE(id_seccion) para preservar escalabilidad futura (co-docencia).
    -- El límite de 1 docente por sección se controla en SeccionServiceImp (capa de aplicación).
    CONSTRAINT uq_docente_seccion_usuario_seccion
     UNIQUE (id_usuario, id_seccion),
    CONSTRAINT fk_docente_seccion_usuario
      FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario),
    CONSTRAINT fk_docente_seccion_seccion
      FOREIGN KEY (id_seccion)
        REFERENCES seccion(id_seccion)
);


/* =========================================================================
 * NOTA DE ARQUITECTURA - TABLA INTERMEDIA (asignatura_profesor_cargo):
 *
 * DISEÑO MUCHOS A MUCHOS (M:M) INTENCIONADO POR ESCALABILIDAD:
 * Al igual que docente_seccion, esta tabla se modela como una relación
 * M:M entre asignatura y usuario para mantener la flexibilidad de asignar
 * múltiples profesores a una asignatura en el futuro (ej. colaboración).
 *
 * RESTRICCIÓN ACTUAL DE NEGOCIO (1 profesor a cargo por asignatura):
 * Actualmente la lógica de negocio en AsignaturaServiceImp restringe la
 * asignación a UN SOLO profesor a cargo por asignatura. Esta restricción
 * se refuerza con UNIQUE(id_asignatura) a nivel de base de datos (decisión
 * de negocio más estricta que docente_seccion), y también se valida en la
 * capa de aplicación. Si el negocio evoluciona, se puede remover el
 * UNIQUE de id_asignatura y ajustar el servicio sin rediseñar la tabla.
 * ========================================================================= */
-- Tabla asignatura_profesor_cargo
CREATE TABLE asignatura_profesor_cargo (
    id_asignatura_profesor_cargo INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_asignatura INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- UNIQUE(id_asignatura): garantiza 1 solo profesor a cargo por asignatura a nivel de BD.
    -- El control también se replica en AsignaturaServiceImp (capa de aplicación).
    CONSTRAINT uq_asignatura UNIQUE (id_asignatura),
    -- Foreign Keys
    CONSTRAINT fk_asignatura_profesor_asignatura
       FOREIGN KEY (id_asignatura) REFERENCES asignatura(id_asignatura),
    CONSTRAINT fk_asignatura_profesor_usuario
       FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- =====================================================
-- TABLAS DE INVENTARIO Y PRODUCTOS
-- =====================================================
CREATE TABLE unidad_medida (
    id_unidad SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_unidad VARCHAR(30) NOT NULL UNIQUE,
    abreviatura VARCHAR(10) NOT NULL UNIQUE,
    es_fraccionario BOOLEAN NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla categoria (Máxima optimización de espacio)
CREATE TABLE categoria (
    -- SMALLINT ocupa solo 2 bytes (rango hasta 32,767)
    id_categoria SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_categoria VARCHAR(50) NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT TRUE
);


-- Tabla producto
CREATE TABLE producto (
    id_producto INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Opcional (admite NULL) pero no permite repetidos si tiene valor
    cod_producto VARCHAR(25),
    -- Usando TEXT para máxima flexibilidad y eficiencia
    descripcion_producto TEXT,
    nombre_producto VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT TRUE,
    -- Relaciones (SMALLINT para compatibilidad)
    id_categoria SMALLINT NOT NULL,
    id_unidad SMALLINT NOT NULL,
    ---------------------------------------------------------
    -- RESTRICCIONES DE UNICIDAD (UNIQUE CONSTRAINTS)
    ---------------------------------------------------------
    -- El nombre siempre debe ser único
    CONSTRAINT uk_producto_nombre UNIQUE (nombre_producto),

    -- El código es opcional pero único si se ingresa
    CONSTRAINT uk_producto_codigo UNIQUE (cod_producto),
    ---------------------------------------------------------
    -- LLAVES FORÁNEAS (FOREIGN KEYS)
    ---------------------------------------------------------
    CONSTRAINT fk_categoria_producto
      FOREIGN KEY (id_categoria)
          REFERENCES categoria (id_categoria)
          ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_unidad_producto
      FOREIGN KEY (id_unidad)
          REFERENCES unidad_medida (id_unidad)
          ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Tabla inventario
CREATE TABLE inventario (
    id_inventario INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_producto INTEGER NOT NULL,
    stock NUMERIC(10, 3) NOT NULL CHECK (stock >= 0),
    stock_limit NUMERIC(10, 3) CHECK (stock_limit IS NULL OR stock_limit >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_inventario_producto
        FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
            ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (id_producto)
);

-- =====================================================
-- TABLAS DE BODEGA DE TRANSITO (Estructura espejo para movimientos temporales)
-- =====================================================

-- Tabla bodega_transito (Estructura espejo para movimientos temporales)
CREATE TABLE bodega_transito (
    id_bodega_transito INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Relación con el registro de inventario
    id_inventario INTEGER NOT NULL,
    -- Mismo formato para mantener precisión decimal
    stock NUMERIC(10, 3) NOT NULL CHECK (stock >= 0),
    -- Límite opcional para alertas en tránsito
    stock_limit NUMERIC(10, 3) CHECK (stock_limit IS NULL OR stock_limit >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    ---------------------------------------------------------
    -- RESTRICCIONES Y LLAVES FORÁNEAS
    ---------------------------------------------------------
    -- Un inventario principal solo tiene un registro de tránsito
    CONSTRAINT uk_transito_inventario UNIQUE (id_inventario),

    CONSTRAINT fk_bodega_transito_inventario
     FOREIGN KEY (id_inventario) REFERENCES inventario(id_inventario)
         ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Tabla categoria_abastecimiento(determina las categorias que llegan al abastecimiento)
CREATE TABLE categoria_abastecimiento (
    id_categoria        SMALLINT            NOT NULL REFERENCES categoria(id_categoria),
    tipo_abastecimiento tipo_abastecimiento NOT NULL,
    PRIMARY KEY (id_categoria, tipo_abastecimiento)
);

-- =====================================================
-- TABLAS DE PROVEEDORES
-- =====================================================
CREATE TABLE proveedor (
    id_proveedor INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rut_proveedor VARCHAR(13) NOT NULL UNIQUE,  -- Aquí se agregó el NOT NULL
    nombre_distribuidora VARCHAR(100) NOT NULL,
    nombre_proveedor VARCHAR(100) NOT NULL,
    telefono_proveedor VARCHAR(20) NOT NULL,
    email_proveedor VARCHAR(150) NOT NULL,
    direccion_proveedor VARCHAR(255),  -- Opcional: usada en la cabecera del Excel plantilla
    estado_proveedor estado_provedor_type NOT NULL DEFAULT 'DISPONIBLE',
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla puente: vincula proveedor <-> producto con precio y metadata propia
CREATE TABLE proveedor_producto (
    id_proveedor_producto BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_proveedor INTEGER NOT NULL,
    id_producto INTEGER NOT NULL,
    marca_producto VARCHAR(200),
    formato_contenido VARCHAR(100),
    precio_neto NUMERIC(10,3) NOT NULL,
    precio_con_iva NUMERIC(10,3) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),

    -- Versioning: se permite multiples filas por (proveedor, producto).
    -- Solo UNA fila puede estar activa a la vez por par (proveedor, producto);
    -- esta regla se garantiza a nivel de servicio (desactivar anteriores antes de insertar).

    CONSTRAINT fk_proveedor_producto_proveedor
        FOREIGN KEY (id_proveedor)
            REFERENCES proveedor (id_proveedor)
            ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_proveedor_producto_producto
        FOREIGN KEY (id_producto)
            REFERENCES producto (id_producto)
            ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE proveedor_dia_entrega (
    id_dia_entrega INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_proveedor INTEGER NOT NULL,
    dia_semana dia_semana_type NOT NULL,
    -- Nombres específicos para evitar confusión con otras tablas
    hora_inicio_entrega TIME,
    hora_fin_entrega TIME,
    -- 1. Evitamos que se duplique el mismo día para el mismo proveedor
    CONSTRAINT uk_proveedor_dia UNIQUE (id_proveedor, dia_semana),
    -- 2. Validación de coherencia: La hora de inicio debe ser menor a la hora de fin
    CONSTRAINT chk_horas_logicas_entrega CHECK (hora_inicio_entrega < hora_fin_entrega),
    CONSTRAINT fk_proveedor_dia_entrega_proveedor
       FOREIGN KEY (id_proveedor)
           REFERENCES proveedor (id_proveedor)
           ON UPDATE CASCADE ON DELETE CASCADE
);

-- =====================================================
-- TABLAS DE PEDIDOS Y SOLICITUDES
-- =====================================================
CREATE TABLE semanas (
    id_semana INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_semana VARCHAR(50) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    anio SMALLINT GENERATED ALWAYS AS (EXTRACT(YEAR FROM fecha_inicio)) STORED,
    semestre SMALLINT NOT NULL,

    CONSTRAINT uk_semana_periodo UNIQUE (nombre_semana, anio, semestre),
    CONSTRAINT uk_fecha_inicio UNIQUE (fecha_inicio)
);

-- =====================================================
-- TABLA DE PEDIDO SEMANAL A BODEGA
-- =====================================================
-- Tabla pedido_semana_bodega (Antigua 'receta')
CREATE TABLE pedido_semana_bodega (
    id_pedido_semana_bodega INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_semana INTEGER, -- <--- NUEVA COLUMNA OPCIONAL
    id_asignatura INTEGER, -- <--- NUEVA COLUMNA OPCIONAL
    nombre_pedido_semana_bodega VARCHAR(100) NOT NULL,
    descripcion_pedido_semana_bodega TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    estado_pedido estado_pedido_semana_bodega_type NOT NULL,

    -- Llave foránea opcional. Si se borra la semana, el id queda en NULL pero la plantilla no se pierde.
    CONSTRAINT fk_pedido_semana_bodega_semana
      FOREIGN KEY (id_semana)
          REFERENCES semanas(id_semana)
          ON DELETE SET NULL,

    -- Llave foránea opcional hacia asignatura.
    CONSTRAINT fk_pedido_semana_asignatura
      FOREIGN KEY (id_asignatura)
          REFERENCES asignatura(id_asignatura)
          ON DELETE SET NULL
);

-- Tabla detalle (Se mantiene igual, apuntando a la nueva PK)
CREATE TABLE detalle_pedido_semana_bodega (
    id_detalle_pedido_semana INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pedido_semana_bodega  INTEGER NOT NULL,
    id_producto              INTEGER NOT NULL,
    cant_producto            NUMERIC(10, 3) NOT NULL CHECK (cant_producto >= 0),
    observacion              TEXT, -- <--- NUEVA COLUMNA AGREGADA AQUÍ

    CONSTRAINT fk_pedido_cabecera
      FOREIGN KEY (id_pedido_semana_bodega)
          REFERENCES pedido_semana_bodega(id_pedido_semana_bodega)
          ON DELETE CASCADE,

    CONSTRAINT fk_pedido_producto
      FOREIGN KEY (id_producto)
          REFERENCES producto(id_producto),

    UNIQUE(id_pedido_semana_bodega, id_producto)
);

-- Tabla solicitud
CREATE TABLE solicitud (
    id_solicitud INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- <--- PK Simple
    id_usuario_gestor_solicitud INTEGER NOT NULL,
    id_seccion INTEGER NOT NULL,
    id_pedido_semana_bodega INTEGER,
    id_reserva_sala INTEGER,
    fecha_solicitada DATE NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    estado_solicitud estado_solicitud_type DEFAULT 'PENDIENTE',

    CONSTRAINT fk_solicitud_usuario FOREIGN KEY (id_usuario_gestor_solicitud) REFERENCES usuario(id_usuario),
    CONSTRAINT fk_solicitud_seccion FOREIGN KEY (id_seccion) REFERENCES seccion(id_seccion),
    CONSTRAINT fk_solicitud_pedido_semana FOREIGN KEY (id_pedido_semana_bodega) REFERENCES pedido_semana_bodega(id_pedido_semana_bodega) ON DELETE SET NULL,
    CONSTRAINT fk_solicitud_reserva FOREIGN KEY (id_reserva_sala) REFERENCES reserva_sala(id_reserva_sala) ON DELETE SET NULL
);

-- Tabla detalle_solicitud
CREATE TABLE detalle_solicitud (
    id_detalle_solicitud INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitud INTEGER NOT NULL,
    id_producto INTEGER NOT NULL,
    cant_producto_solicitud NUMERIC(10, 3) NOT NULL,
    observacion TEXT, -- <--- Cambiado a TEXT
    enviado_bodega_transito BOOLEAN NOT NULL DEFAULT FALSE,

    -- La FK ahora apunta solo al ID simple de la cabecera
    CONSTRAINT fk_detalle_solicitud_padre
       FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_solicitud_producto
       FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
);

-- Tabla motivo reahazo solicitud
CREATE TABLE motivo_rechazo_solicitud (
    id_motivo INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitud INT NOT NULL,
    motivo TEXT NOT NULL,
    fecha_rechazo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_solicitud_rechazo
      FOREIGN KEY (id_solicitud)
          REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,

    -- Un rechazo por solicitud, llave única simplificada
    CONSTRAINT uk_solicitud_rechazo UNIQUE (id_solicitud)
);

-- Tabla pedido
CREATE TABLE pedido (
    id_pedido INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha_inicio_pedido DATE NOT NULL,
    fecha_fin_pedido DATE NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado_pedido estado_pedido_type NOT NULL
);

-- Tabla pedido_detalle
CREATE TABLE detalle_pedido (
    id_pedido_detalle INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pedido INTEGER NOT NULL,
    id_producto INTEGER NOT NULL,
    cant_producto_pedido NUMERIC(10, 3) NOT NULL,
    CONSTRAINT fk_pd_pedido FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido),
    CONSTRAINT fk_pd_producto FOREIGN KEY (id_producto) REFERENCES producto(id_producto),
    CONSTRAINT uq_detalle_pedido_pedido_producto UNIQUE (id_pedido, id_producto)
);

-- Tabla pedido_solicitud
CREATE TABLE pedido_solicitud (
    id_pedido_solicitud INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pedido INTEGER NOT NULL,
    id_solicitud INTEGER NOT NULL,
    fecha_union_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ps_pedido FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido),
    CONSTRAINT fk_ps_solicitud
      FOREIGN KEY (id_solicitud)
          REFERENCES solicitud(id_solicitud)
);

-- Tabla Stock_disponible sierve para registrar producto que sobraran por x motivo que no esta asociadas a un pedido.
CREATE TABLE stock_disponible (
    id_stock_disponible  SERIAL PRIMARY KEY,
    id_producto          INTEGER NOT NULL REFERENCES producto(id_producto),
    id_pedido            INTEGER REFERENCES pedido(id_pedido),
    id_solicitud         INTEGER REFERENCES solicitud(id_solicitud),
    cantidad             DECIMAL(10,3) NOT NULL CHECK (cantidad >= 0),
    tipo_disponible      VARCHAR(20) NOT NULL DEFAULT 'INVENTARIO'
      CHECK (tipo_disponible IN ('INVENTARIO', 'BODEGA_TRANSITO')),
    fecha_registro       DATE NOT NULL DEFAULT CURRENT_DATE,
    activo               BOOLEAN NOT NULL DEFAULT TRUE
);

-- =====================================================
-- TABLAS DE ORDEN DE COMPRA
-- =====================================================
CREATE TABLE orden_pedido (
    id_orden_pedido     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pedido           INTEGER                   NOT NULL
      REFERENCES pedido(id_pedido) ON DELETE RESTRICT,
    id_proveedor        INTEGER                   NOT NULL
      REFERENCES proveedor(id_proveedor) ON DELETE RESTRICT,
    fecha_creacion      TIMESTAMP                 NOT NULL DEFAULT NOW(),
    estado_orden_pedido estado_orden_pedido_type  NOT NULL DEFAULT 'PENDIENTE',
    observaciones       TEXT,
    activo              BOOLEAN                   NOT NULL DEFAULT TRUE
);

-- Tabla detalle_orden_pedido
CREATE TABLE detalle_orden_pedido (
    id_detalle_orden_pedido INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_orden_pedido         INTEGER         NOT NULL
      REFERENCES orden_pedido(id_orden_pedido) ON DELETE CASCADE,
    id_producto             INTEGER         NOT NULL
      REFERENCES producto(id_producto) ON DELETE RESTRICT,
    cantidad_solicitada     NUMERIC(10,3)   NOT NULL,
    precio_neto_unitario    NUMERIC(10,3),
    precio_con_iva_unitario NUMERIC(10,3),
    fecha_entrega           DATE            NOT NULL,
    activo                  BOOLEAN         NOT NULL DEFAULT TRUE,
    entregado               BOOLEAN         NOT NULL DEFAULT FALSE
);

-- Puente: qué solicitudes (y cuánto) cubre cada línea de entrega de la OP.
-- Permite, por línea (producto + fecha_entrega), saber qué solicitudes abastece y derivar
-- las asignaturas involucradas (solicitud → reserva_sala → asignatura).
CREATE TABLE detalle_orden_pedido_solicitud (
    id_dop_solicitud        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_detalle_orden_pedido INTEGER         NOT NULL
        REFERENCES detalle_orden_pedido(id_detalle_orden_pedido) ON DELETE CASCADE,
    id_solicitud            INTEGER         NOT NULL
        REFERENCES solicitud(id_solicitud) ON DELETE RESTRICT,
    cantidad_atribuida      NUMERIC(10,3)   NOT NULL,
    activo                  BOOLEAN         NOT NULL DEFAULT TRUE,

    CONSTRAINT uk_dop_solicitud UNIQUE (id_detalle_orden_pedido, id_solicitud)
);

-- ============================================================================
-- Tabla puente: detalle_orden_pedido_solicitud
-- ----------------------------------------------------------------------------
-- Vincula cada línea de entrega de una Orden de Pedido (detalle_orden_pedido)
-- con las solicitudes que abastece, guardando cuánto aporta cada una
-- (cantidad_atribuida = demanda real de la solicitud, NO la cantidad recortada
-- al pedir menos por sobrante en inventario).
--
-- Permite:
--   * Saber qué solicitudes cubre cada entrega cuando se marca entregado=true.
--   * Calcular el sobrante real: stock − Σ demanda(solicitudes abastecidas).
--   * Distinguir el ajuste manual sin dueño = cantidad de la línea − Σ atribuida
--     (compra de más a propósito, o recorte por stock ya disponible).
--   * Derivar las asignaturas involucradas vía solicitud → reserva_sala → asignatura.
--
-- Cada solicitud se mueve entera a un día de entrega (no se parte su cantidad a
-- mano), por lo que la relación es determinista: una porción de solicitud apunta
-- a una sola línea de entrega, sin ambigüedad de a quién pertenece cada kilo.
-- ============================================================================
CREATE TABLE reserva_stock_solicitud (
    id_reserva    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitud  INTEGER       NOT NULL REFERENCES solicitud(id_solicitud) ON DELETE RESTRICT,
    id_producto   INTEGER       NOT NULL REFERENCES producto(id_producto)   ON DELETE RESTRICT,
    cantidad      NUMERIC(10,3) NOT NULL,
    fecha_reserva DATE          NOT NULL DEFAULT CURRENT_DATE,
    activo        BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_reserva_sol_prod UNIQUE (id_solicitud, id_producto)
);

-- Tabla movimiento
CREATE TABLE movimiento (
    id_movimiento INTEGER GENERATED ALWAYS AS IDENTITY,
    id_usuario INTEGER NOT NULL,
    id_inventario INTEGER NOT NULL,
    id_bodega_transito INTEGER,
    stock_movimiento NUMERIC(10, 3) NOT NULL,
    tipo_movimiento tipo_movimiento_type NOT NULL,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    -- Usando TEXT para máxima flexibilidad y eficiencia
    observacion TEXT,
    id_solicitud        INTEGER,
    id_pedido           INTEGER,
    id_orden_pedido     INTEGER,
    id_detalle_orden_pedido INTEGER,

    -- La PK debe ser compuesta: ID + FECHA (Obligatorio en particiones)
    PRIMARY KEY (id_movimiento, fecha_movimiento),

    CONSTRAINT fk_usuario_movimiento
        FOREIGN KEY (id_usuario) 		  REFERENCES usuario(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventario_movimiento
        FOREIGN KEY (id_inventario) 	  REFERENCES inventario(id_inventario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_bodega_movimiento
        FOREIGN KEY (id_bodega_transito)  REFERENCES bodega_transito(id_bodega_transito) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_mov_solicitud
        FOREIGN KEY (id_solicitud)        REFERENCES solicitud(id_solicitud),
    CONSTRAINT fk_mov_pedido
        FOREIGN KEY (id_pedido)           REFERENCES pedido(id_pedido),
    CONSTRAINT fk_mov_orden_pedido
        FOREIGN KEY (id_orden_pedido)     REFERENCES orden_pedido(id_orden_pedido),
    CONSTRAINT fk_mov_detalle_orden_pedido
        FOREIGN KEY (id_detalle_orden_pedido) REFERENCES detalle_orden_pedido(id_detalle_orden_pedido)
) PARTITION BY RANGE (fecha_movimiento);

-- Crear Particiones Semestrales (Semestre = 6 meses)
-- 2026 Semestre 1 (Enero - Junio)
CREATE TABLE movimiento_2026_s1 PARTITION OF movimiento
    FOR VALUES FROM ('2026-01-01') TO ('2026-07-01');

-- 2026 Semestre 2 (Julio - Diciembre)
CREATE TABLE movimiento_2026_s2 PARTITION OF movimiento
    FOR VALUES FROM ('2026-07-01') TO ('2027-01-01');

-- 2027 Semestre 1 (Futuro)
CREATE TABLE movimiento_2027_s1 PARTITION OF movimiento
    FOR VALUES FROM ('2027-01-01') TO ('2027-07-01');

-- 2027 Semestre 2 (Futuro)
CREATE TABLE movimiento_2027_s2 PARTITION OF movimiento
    FOR VALUES FROM ('2027-07-01') TO ('2028-01-01');
-- Partición por defecto (Para evitar errores si llega una fecha fuera de rango, ej: 2025 o 2028)
CREATE TABLE movimiento_default PARTITION OF movimiento DEFAULT;

-- Fila 1: configuración default (solo lectura, para restaurar)
INSERT INTO gestion_sistema (id, solicitudes_en_pedido, descripcion)
VALUES (1, FALSE, 'Configuración predeterminada del sistema - NO MODIFICAR')
    ON CONFLICT (id) DO NOTHING;

-- Fila 2: configuración activa (la que el panel modifica)
INSERT INTO gestion_sistema (id, solicitudes_en_pedido, descripcion)
VALUES (2, FALSE, 'Configuración activa del sistema')
    ON CONFLICT (id) DO NOTHING;

CREATE TABLE soporte_ticket (
    id_soporte         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario         INTEGER REFERENCES usuario(id_usuario),
    tipo_equipo        tipo_equipo_soporte_type  NOT NULL,
    equipo_otro        VARCHAR(100),
    sistema_operativo  VARCHAR(50)          NOT NULL,
    tipo_error         tipo_error_soporte_type   NOT NULL,
    descripcion        TEXT                 NOT NULL,
    url_origen         VARCHAR(255),
    estado             estado_soporte_type       NOT NULL DEFAULT 'ABIERTO',
    fecha_creacion     TIMESTAMP            NOT NULL DEFAULT now(),
    fecha_resolucion   TIMESTAMP
);


CREATE TABLE IF NOT EXISTS modulo (
    id_modulo                   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_modulo               VARCHAR(50)  NOT NULL UNIQUE,
    nombre_modulo               VARCHAR(100) NOT NULL,
    descripcion_modulo          TEXT,
    icono_modulo                VARCHAR(100),
    orden_modulo                INTEGER      NOT NULL DEFAULT 0,
    fecha_creacion_modulo       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion_modulo  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enabled                     BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS permiso_rol (
    id_permiso_rol                  BIGINT    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_rol                          INTEGER   NOT NULL REFERENCES rol(id_rol),
    id_modulo                       INTEGER   NOT NULL REFERENCES modulo(id_modulo),
    puede_leer                      BOOLEAN   NOT NULL DEFAULT FALSE,
    puede_crear                     BOOLEAN   NOT NULL DEFAULT FALSE,
    puede_actualizar                BOOLEAN   NOT NULL DEFAULT FALSE,
    puede_eliminar                  BOOLEAN   NOT NULL DEFAULT FALSE,
    fecha_creacion_permiso_rol      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion_permiso_rol TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enabled                         BOOLEAN   NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_permiso_rol_modulo UNIQUE (id_rol, id_modulo)
);

--INSERTS ROLES, MODULOS Y PERMISOS
INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('DASHBOARD',            'Dashboard',                    'Panel principal con estadísticas y métricas',         'lucide:layout-dashboard', 1),
    ('INVENTARIO',           'Inventario',                   'Gestión de productos e inventario del sistema',       'lucide:package',          2),
    ('SOLICITUD',            'Solicitudes',                  'Creación y seguimiento de solicitudes de insumos',    'lucide:file-text',        3),
    ('GESTION_PEDIDOS',      'Gestión de Pedidos',           'Administración y seguimiento de pedidos',             'lucide:shopping-cart',    4),
    ('GESTION_SOLICITUDES',  'Gestión de Solicitudes',       'Administración de solicitudes del sistema',           'lucide:clipboard-list',   5),
    ('CONGLOMERADO_PEDIDOS', 'Conglomerado de Pedidos',      'Agrupación y consolidación de pedidos masivos',       'lucide:layers',           6),
    ('GESTION_PROVEEDORES',  'Gestión de Proveedores',       'Administración de proveedores del sistema',           'lucide:truck',            7),
    ('BODEGA_TRANSITO',      'Bodega de Tránsito',           'Control de productos en tránsito y despacho',        'lucide:warehouse',        8),
    ('PEDIDO_SEMANAL_BODEGA','Pedido Semanal a Bodega',      'Diseño y carga del pedido semanal a bodega (antiguas recetas)','lucide:package-open', 9),
    ('GESTION_ACADEMICA',    'Gestión Académica',            'Administración de asignaturas y secciones',           'lucide:book-open',        10),
    ('GESTION_ROLES',        'Gestión de Roles',             'Administración de roles y permisos del sistema',      'lucide:shield',           11),
    ('GESTION_USUARIOS',     'Gestión de Usuarios',          'Administración de usuarios del sistema',              'lucide:users',            12),
    ('ADMIN_SISTEMA',        'Administración del Sistema',   'Centro de control: horarios, semanas y salas',        'lucide:settings',         13)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ================================================================
-- PASO 3: Insertar permisos iniciales por rol
--
-- Nomenclatura de roles (nombre_rol en la tabla rol):
--   Administrador, Co-Administrador, Gestor de Pedidos,
--   Profesor a Cargo, Docente, Encargado de Bodega, Asistente de Bodega
-- ================================================================

-- =====================================================
-- 1. INSERTAR ROLES
-- =====================================================
INSERT INTO rol (id_rol, nombre_rol) VALUES
    (1, 'ADMINISTRADOR'),
    (2, 'CO_ADMINISTRADOR'),
    (3, 'GESTOR_PEDIDOS'),
    (4, 'PROFESOR_A_CARGO'),
    (5, 'DOCENTE'),
    (6, 'ENCARGADO_BODEGA'),
    (7, 'ASISTENTE_BODEGA');

-- ================================================================
-- PASO 3: Insertar permisos iniciales por rol
-- ================================================================

-- 1. ADMINISTRADOR
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT
    (SELECT id_rol FROM rol WHERE nombre_rol = 'ADMINISTRADOR' LIMIT 1),
    id_modulo, TRUE, TRUE, TRUE, TRUE
FROM modulo WHERE enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE
                                       SET puede_leer = TRUE, puede_crear = TRUE, puede_actualizar = TRUE, puede_eliminar = TRUE;

-- 2. CO_ADMINISTRADOR
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT
    (SELECT id_rol FROM rol WHERE nombre_rol = 'CO_ADMINISTRADOR' LIMIT 1),
    m.id_modulo,
    CASE WHEN m.codigo_modulo IN ('GESTION_ROLES','ADMIN_SISTEMA') THEN FALSE ELSE TRUE END,
    CASE WHEN m.codigo_modulo IN ('GESTION_ROLES','ADMIN_SISTEMA') THEN FALSE ELSE TRUE END,
    CASE WHEN m.codigo_modulo IN ('GESTION_ROLES','ADMIN_SISTEMA') THEN FALSE ELSE TRUE END,
    CASE WHEN m.codigo_modulo IN ('GESTION_ROLES','ADMIN_SISTEMA','GESTION_USUARIOS') THEN FALSE ELSE TRUE END
FROM modulo m WHERE m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer = EXCLUDED.puede_leer, puede_crear = EXCLUDED.puede_crear,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   puede_actualizar = EXCLUDED.puede_actualizar, puede_eliminar = EXCLUDED.puede_eliminar;

-- 3. GESTOR_PEDIDOS
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT
    (SELECT id_rol FROM rol WHERE nombre_rol = 'GESTOR_PEDIDOS' LIMIT 1),
    m.id_modulo,
    CASE WHEN m.codigo_modulo IN ('DASHBOARD','GESTION_PEDIDOS','GESTION_SOLICITUDES','CONGLOMERADO_PEDIDOS') THEN TRUE ELSE FALSE END,
    CASE WHEN m.codigo_modulo IN ('GESTION_PEDIDOS','GESTION_SOLICITUDES','CONGLOMERADO_PEDIDOS') THEN TRUE ELSE FALSE END,
    CASE WHEN m.codigo_modulo IN ('GESTION_PEDIDOS','GESTION_SOLICITUDES','CONGLOMERADO_PEDIDOS') THEN TRUE ELSE FALSE END,
    FALSE
FROM modulo m WHERE m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer = EXCLUDED.puede_leer, puede_crear = EXCLUDED.puede_crear,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               puede_actualizar = EXCLUDED.puede_actualizar, puede_eliminar = EXCLUDED.puede_eliminar;

-- 4. PROFESOR_A_CARGO
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT
    (SELECT id_rol FROM rol WHERE nombre_rol = 'PROFESOR_A_CARGO' LIMIT 1),
    m.id_modulo,
    CASE WHEN m.codigo_modulo IN ('DASHBOARD','SOLICITUD','PEDIDO_SEMANAL_BODEGA') THEN TRUE ELSE FALSE END,
    CASE WHEN m.codigo_modulo IN ('SOLICITUD') THEN TRUE ELSE FALSE END,
    CASE WHEN m.codigo_modulo IN ('SOLICITUD') THEN TRUE ELSE FALSE END,
    FALSE
FROM modulo m WHERE m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer = EXCLUDED.puede_leer, puede_crear = EXCLUDED.puede_crear,
                                                                                                                                                                                                                                                                                                                                                                puede_actualizar = EXCLUDED.puede_actualizar, puede_eliminar = EXCLUDED.puede_eliminar;

-- 5. DOCENTE
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT
    (SELECT id_rol FROM rol WHERE nombre_rol = 'DOCENTE' LIMIT 1),
    m.id_modulo,
    CASE WHEN m.codigo_modulo IN ('DASHBOARD','SOLICITUD','PEDIDO_SEMANAL_BODEGA') THEN TRUE ELSE FALSE END,
    FALSE, FALSE, FALSE
FROM modulo m WHERE m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer = EXCLUDED.puede_leer, puede_crear = FALSE, puede_actualizar = FALSE, puede_eliminar = FALSE;

-- 6. ENCARGADO_BODEGA
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT
    (SELECT id_rol FROM rol WHERE nombre_rol = 'ENCARGADO_BODEGA' LIMIT 1),
    m.id_modulo,
    CASE WHEN m.codigo_modulo IN ('DASHBOARD','INVENTARIO') THEN TRUE ELSE FALSE END,
    CASE WHEN m.codigo_modulo IN ('INVENTARIO') THEN TRUE ELSE FALSE END,
    CASE WHEN m.codigo_modulo IN ('INVENTARIO') THEN TRUE ELSE FALSE END,
    FALSE
FROM modulo m WHERE m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer = EXCLUDED.puede_leer, puede_crear = EXCLUDED.puede_crear,
                                                                                                                                                                                                                                                                                                                                           puede_actualizar = EXCLUDED.puede_actualizar, puede_eliminar = EXCLUDED.puede_eliminar;

-- 7. ASISTENTE_BODEGA
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT
    (SELECT id_rol FROM rol WHERE nombre_rol = 'ASISTENTE_BODEGA' LIMIT 1),
    m.id_modulo,
    CASE WHEN m.codigo_modulo IN ('DASHBOARD','BODEGA_TRANSITO') THEN TRUE ELSE FALSE END,
    CASE WHEN m.codigo_modulo IN ('BODEGA_TRANSITO') THEN TRUE ELSE FALSE END,
    FALSE, FALSE
FROM modulo m WHERE m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer = EXCLUDED.puede_leer, puede_crear = EXCLUDED.puede_crear,
                                                                                                                                                                                                                                                                                puede_actualizar = FALSE, puede_eliminar = FALSE;

-- ================================================================
-- NUEVOS MÓDULOS: GESTION_CATEGORIAS y GESTION_UNIDADES
-- (Ejecutar después del bloque inicial de INSERT INTO modulo)
-- Controla los botones de icono Tags / Scale en la página Inventario
-- ================================================================
-- Paso A: Insertar los dos nuevos módulos
-- orden 2.1 y 2.2 → van después de INVENTARIO (orden 2), antes de SOLICITUD (orden 3)
-- Usamos orden 14 y 15 para no romper los existentes; ajustar si se desea intercalar
INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('GESTION_CATEGORIAS', 'Gestión de Categorías', 'Administración de categorías de productos del inventario', 'lucide:tags',  14),
    ('GESTION_UNIDADES',   'Gestión de Unidades',   'Administración de unidades de medida del inventario',     'lucide:scale', 15)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- Paso B: Permisos de los nuevos módulos por rol
-- (Lógica: solo roles que gestionan inventario tienen acceso a crear/editar categorías y unidades)

-- ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ADMINISTRADOR' LIMIT 1), id_modulo, TRUE, TRUE, TRUE, TRUE
FROM modulo WHERE codigo_modulo IN ('GESTION_CATEGORIAS','GESTION_UNIDADES') AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE
   SET puede_leer = TRUE, puede_crear = TRUE, puede_actualizar = TRUE, puede_eliminar = TRUE;

-- CO-ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'CO_ADMINISTRADOR' LIMIT 1), id_modulo, TRUE, TRUE, TRUE, TRUE
FROM modulo WHERE codigo_modulo IN ('GESTION_CATEGORIAS','GESTION_UNIDADES') AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE
   SET puede_leer = TRUE, puede_crear = TRUE, puede_actualizar = TRUE, puede_eliminar = TRUE;

-- ENCARGADO DE BODEGA → puede crear/editar categorías y unidades (gestiona inventario)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ENCARGADO_BODEGA' LIMIT 1), id_modulo, TRUE, TRUE, TRUE, FALSE
FROM modulo WHERE codigo_modulo IN ('GESTION_CATEGORIAS','GESTION_UNIDADES') AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE
   SET puede_leer = TRUE, puede_crear = TRUE, puede_actualizar = TRUE, puede_eliminar = FALSE;

-- ASISTENTE DE BODEGA → solo lectura (ve las categorías/unidades pero no las modifica)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ASISTENTE_BODEGA' LIMIT 1), id_modulo, TRUE, FALSE, FALSE, FALSE
FROM modulo WHERE codigo_modulo IN ('GESTION_CATEGORIAS','GESTION_UNIDADES') AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE
   SET puede_leer = TRUE, puede_crear = FALSE, puede_actualizar = FALSE, puede_eliminar = FALSE;

-- GESTOR DE PEDIDOS, PROFESOR A CARGO, DOCENTE → sin acceso
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r
         CROSS JOIN modulo m
WHERE r.nombre_rol IN ('GESTOR_PEDIDOS','PROFESOR_A_CARGO','DOCENTE')
  AND m.codigo_modulo IN ('GESTION_CATEGORIAS','GESTION_UNIDADES')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE
   SET puede_leer = FALSE, puede_crear = FALSE, puede_actualizar = FALSE, puede_eliminar = FALSE;


-- ================================================================
-- NUEVO MÓDULO: HISTORIAL_MOVIMIENTOS
-- (Ejecutar después de los bloques anteriores)
-- Controla la página "Historial / Movimientos" del sidebar bajo Inventario
-- ================================================================

-- Paso A: Insertar el módulo
INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES ('HISTORIAL_MOVIMIENTOS', 'Historial / Movimientos', 'Historial de movimientos de inventario y stock', 'lucide:history', 16)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- Paso B: Permisos por rol
-- ADMINISTRADOR → solo lectura (la página no tiene operaciones de escritura)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ADMINISTRADOR' LIMIT 1), id_modulo, TRUE, FALSE, FALSE, FALSE
FROM modulo WHERE codigo_modulo = 'HISTORIAL_MOVIMIENTOS' AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET puede_leer=TRUE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- CO-ADMINISTRADOR → solo lectura
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'CO_ADMINISTRADOR' LIMIT 1), id_modulo, TRUE, FALSE, FALSE, FALSE
FROM modulo WHERE codigo_modulo = 'HISTORIAL_MOVIMIENTOS' AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET puede_leer=TRUE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- ENCARGADO DE BODEGA → solo lectura (consulta historial)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ENCARGADO_BODEGA' LIMIT 1), id_modulo, TRUE, FALSE, FALSE, FALSE
FROM modulo WHERE codigo_modulo = 'HISTORIAL_MOVIMIENTOS' AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET puede_leer=TRUE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- ASISTENTE DE BODEGA → solo lectura (consulta historial)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ASISTENTE_BODEGA' LIMIT 1), id_modulo, TRUE, FALSE, FALSE, FALSE
FROM modulo WHERE codigo_modulo = 'HISTORIAL_MOVIMIENTOS' AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET puede_leer=TRUE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- GESTOR_PEDIDOS, PROFESOR_A_CARGO, DOCENTE → sin acceso
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('GESTOR_PEDIDOS','PROFESOR_A_CARGO','DOCENTE')
  AND m.codigo_modulo = 'HISTORIAL_MOVIMIENTOS' AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;


-- ================================================================
-- ENCARGADO DE BODEGA → acceso a Bodega de Tránsito (vista de inventario de bodega)
-- ================================================================

INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ENCARGADO_BODEGA' LIMIT 1), id_modulo, TRUE, TRUE, TRUE, FALSE
FROM modulo WHERE codigo_modulo = 'BODEGA_TRANSITO' AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=FALSE;


-- ================================================================
-- MÓDULO: GESTION_PEDIDOS_DIARIOS
-- Sub-sección dentro de Bodega de Tránsito (vista 'pedidos' en bodega-transito.tsx)
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES ('GESTION_PEDIDOS_DIARIOS', 'Gestión de Pedidos Diarios',
        'Planificación y seguimiento de armado de carros para clases',
        'lucide:shopping-cart', 10)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ADMINISTRADOR' LIMIT 1), id_modulo, TRUE, TRUE, TRUE, TRUE
FROM modulo WHERE codigo_modulo = 'GESTION_PEDIDOS_DIARIOS' AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- CO_ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'CO_ADMINISTRADOR' LIMIT 1), id_modulo, TRUE, TRUE, TRUE, TRUE
FROM modulo WHERE codigo_modulo = 'GESTION_PEDIDOS_DIARIOS' AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- ENCARGADO DE BODEGA → escritura
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ENCARGADO_BODEGA' LIMIT 1), id_modulo, TRUE, TRUE, TRUE, FALSE
FROM modulo WHERE codigo_modulo = 'GESTION_PEDIDOS_DIARIOS' AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=FALSE;

-- ASISTENTE DE BODEGA → escritura
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ASISTENTE_BODEGA' LIMIT 1), id_modulo, TRUE, TRUE, TRUE, FALSE
FROM modulo WHERE codigo_modulo = 'GESTION_PEDIDOS_DIARIOS' AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=FALSE;


-- ================================================================
-- MÓDULOS DE VISTA: ADMINISTRACIÓN DEL SISTEMA — 3 pestañas (solo Administrador)
-- ================================================================
INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('ADMIN_BLOQUES_HORARIOS', 'Adm. Sistema · Bloques Horarios',   'Pestaña de bloques horarios en Administración del Sistema',     'lucide:clock-4',            18),
    ('ADMIN_SEMANAS',          'Adm. Sistema · Gestión de Semanas', 'Pestaña de semanas académicas en Administración del Sistema',   'lucide:calendar-range',     19),
    ('ADMIN_CONFIG_SISTEMA',   'Adm. Sistema · Configuración',      'Pestaña de configuración global en Administración del Sistema', 'lucide:sliders-horizontal', 21)
    ON CONFLICT (codigo_modulo) DO NOTHING;

INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ADMINISTRADOR' LIMIT 1), id_modulo, TRUE, TRUE, TRUE, TRUE
FROM modulo
WHERE codigo_modulo IN ('ADMIN_BLOQUES_HORARIOS','ADMIN_SEMANAS','ADMIN_CONFIG_SISTEMA') AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;


-- 2) Vistas de GESTIÓN DE PEDIDOS (2) y CONGLOMERADO (4)
--    Admin/Co-Admin: escritura | Gestor de Pedidos: lectura
INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('GP_VISTA_RESUMEN',      'G. Pedidos · Resumen de Productos',  'Pestaña de resumen de productos en Gestión de Pedidos',  'lucide:package-check',   22),
    ('GP_VISTA_ACEPTADAS',    'G. Pedidos · Solicitudes Aceptadas', 'Pestaña de solicitudes aceptadas en Gestión de Pedidos', 'lucide:clipboard-check', 23),
    ('CONG_VISTA_APROBACION', 'Conglom. · Aprobación de Pedidos',   'Pestaña de aprobación en Conglomerado de Pedidos',       'lucide:shield-check',    24),
    ('CONG_VISTA_CRONOGRAMA', 'Conglom. · Cronograma Semanal',      'Pestaña de cronograma en Conglomerado de Pedidos',       'lucide:calendar-range',  25),
    ('CONG_VISTA_TOTALES',    'Conglom. · Totales del Pedido',      'Pestaña de totales en Conglomerado de Pedidos',          'lucide:package-check',   26),
    ('CONG_VISTA_CATEGORIAS', 'Conglom. · Por Categoría',           'Pestaña por categoría en Conglomerado de Pedidos',       'lucide:tag',             27)
    ON CONFLICT (codigo_modulo) DO NOTHING;

INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE,
       CASE WHEN r.nombre_rol IN ('ADMINISTRADOR','CO_ADMINISTRADOR') THEN TRUE ELSE FALSE END,
       CASE WHEN r.nombre_rol IN ('ADMINISTRADOR','CO_ADMINISTRADOR') THEN TRUE ELSE FALSE END,
       CASE WHEN r.nombre_rol IN ('ADMINISTRADOR','CO_ADMINISTRADOR') THEN TRUE ELSE FALSE END
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR','CO_ADMINISTRADOR','GESTOR_PEDIDOS')
  AND m.codigo_modulo IN ('GP_VISTA_RESUMEN','GP_VISTA_ACEPTADAS',
                          'CONG_VISTA_APROBACION','CONG_VISTA_CRONOGRAMA','CONG_VISTA_TOTALES','CONG_VISTA_CATEGORIAS')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=EXCLUDED.puede_leer, puede_crear=EXCLUDED.puede_crear,
    puede_actualizar=EXCLUDED.puede_actualizar, puede_eliminar=EXCLUDED.puede_eliminar;


-- 3) ACCIONES de PEDIDO SEMANAL A BODEGA (4) — granularidad por botón/ícono
--    La PÁGINA (PEDIDO_SEMANAL_BODEGA) da acceso de lectura: filtros de estado,
--    selectores, buscadores y ver el detalle del pedido (modal). Cada acción de
--    escritura (Nuevo / Editar / Inactivar / Eliminar) es un módulo aparte: si el
--    rol lo tiene, el ícono se muestra clickable; si no, aparece apagado.
--    Admin/Co-Admin: todas | Profesor a Cargo: Nuevo + Editar + Inactivar (no Eliminar)
INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('PEDIDO_SEM_CREAR',     'Pedido Sem. · Nuevo Pedido',     'Permite crear un nuevo pedido semanal a bodega',     'lucide:plus-circle', 28),
    ('PEDIDO_SEM_EDITAR',    'Pedido Sem. · Editar Pedido',    'Permite editar un pedido semanal a bodega',          'lucide:pencil',      29),
    ('PEDIDO_SEM_INACTIVAR', 'Pedido Sem. · Inactivar Pedido', 'Permite activar/inactivar un pedido semanal a bodega','lucide:power',       30),
    ('PEDIDO_SEM_ELIMINAR',  'Pedido Sem. · Eliminar Pedido',  'Permite eliminar un pedido semanal a bodega',        'lucide:trash-2',     31)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- Admin y Co-Admin: todas las acciones
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR','CO_ADMINISTRADOR')
  AND m.codigo_modulo IN ('PEDIDO_SEM_CREAR','PEDIDO_SEM_EDITAR','PEDIDO_SEM_INACTIVAR','PEDIDO_SEM_ELIMINAR')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- Profesor a Cargo: Nuevo + Editar + Inactivar (NO Eliminar). El gate es puede_leer.
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'PROFESOR_A_CARGO' LIMIT 1), m.id_modulo, TRUE, TRUE, TRUE, FALSE
FROM modulo m
WHERE m.codigo_modulo IN ('PEDIDO_SEM_CREAR','PEDIDO_SEM_EDITAR','PEDIDO_SEM_INACTIVAR')
  AND m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=FALSE;

-- ================================================================
-- MÓDULOS DE ACCIÓN: GESTIÓN DE SOLICITUDES
-- GEST_SOL_GESTIONAR → aceptar / revertir solicitudes (sin rechazar)
-- GEST_SOL_RECHAZAR  → rechazar solicitudes (acción destructiva separada)
-- La página GESTION_SOLICITUDES da acceso de lectura; cada botón de acción
-- requiere el sub-módulo correspondiente (igual al patrón PEDIDO_SEM_*).
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('GEST_SOL_GESTIONAR', 'G. Solicitudes · Gestionar Estados', 'Permite aceptar y revertir solicitudes sin poder rechazar', 'lucide:check-circle', 32),
    ('GEST_SOL_RECHAZAR',  'G. Solicitudes · Rechazar',          'Permite rechazar solicitudes',                              'lucide:x-circle',     33)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo IN ('GEST_SOL_GESTIONAR', 'GEST_SOL_RECHAZAR')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- GESTOR_PEDIDOS → acceso total a ambas acciones
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'GESTOR_PEDIDOS' LIMIT 1), m.id_modulo, TRUE, TRUE, TRUE, FALSE
FROM modulo m
WHERE m.codigo_modulo IN ('GEST_SOL_GESTIONAR', 'GEST_SOL_RECHAZAR')
  AND m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=FALSE;

-- Resto de roles → sin acceso
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('PROFESOR_A_CARGO', 'DOCENTE', 'ENCARGADO_BODEGA', 'ASISTENTE_BODEGA')
  AND m.codigo_modulo IN ('GEST_SOL_GESTIONAR', 'GEST_SOL_RECHAZAR')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- ================================================================
-- MÓDULOS DE ACCIÓN: CONGLOMERADO DE PEDIDOS
-- CONG_APROBAR_PEDIDO  → aprobar pedido (modal Reservar disponibles del Pedido)
-- CONG_RECHAZAR_PEDIDO → rechazar pedido con motivo
-- La vista CONG_VISTA_APROBACION da acceso de lectura; cada botón de
-- acción requiere el sub-módulo correspondiente (patrón GEST_SOL_*).
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('CONG_APROBAR_PEDIDO',  'Conglom. · Aprobar Pedido',  'Permite aprobar pedidos y reservar disponibles del stock', 'lucide:check-circle-2', 34),
    ('CONG_RECHAZAR_PEDIDO', 'Conglom. · Rechazar Pedido', 'Permite rechazar pedidos con motivo obligatorio',          'lucide:x-circle',       35)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo IN ('CONG_APROBAR_PEDIDO', 'CONG_RECHAZAR_PEDIDO')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- GESTOR_PEDIDOS → acceso completo a ambas acciones
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'GESTOR_PEDIDOS' LIMIT 1), m.id_modulo, TRUE, TRUE, TRUE, FALSE
FROM modulo m
WHERE m.codigo_modulo IN ('CONG_APROBAR_PEDIDO', 'CONG_RECHAZAR_PEDIDO')
  AND m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=FALSE;

-- Resto de roles → sin acceso
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('PROFESOR_A_CARGO', 'DOCENTE', 'ENCARGADO_BODEGA', 'ASISTENTE_BODEGA')
  AND m.codigo_modulo IN ('CONG_APROBAR_PEDIDO', 'CONG_RECHAZAR_PEDIDO')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- ================================================================
-- MÓDULO DE LECTURA: GPRV_DATOS_PROV (Pestaña Proveedores — solo lectura)
-- Permite ver la lista de proveedores sin acceder a la pestaña Órdenes de Pedido.
-- Si el rol solo tiene este módulo, GPRV_ORDENES queda en Sin Acceso → pestaña
-- Órdenes no se muestra. Cuando GESTION_PROVEEDORES tiene Lectura, cascadea a
-- GPRV_DATOS_PROV Y GPRV_ORDENES → ambas pestañas visibles.
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('GPRV_DATOS_PROV', 'G. Proveedores · Datos Proveedores',
     'Lectura individual de la pestaña de Proveedores (sin pestaña Órdenes de Pedido)',
     'lucide:truck', 54)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR → lectura total (cascada desde GESTION_PROVEEDORES)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo = 'GPRV_DATOS_PROV'
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- Resto de roles → sin acceso (el Administrador asigna según necesidad)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('GESTOR_PEDIDOS', 'PROFESOR_A_CARGO', 'DOCENTE', 'ENCARGADO_BODEGA', 'ASISTENTE_BODEGA')
  AND m.codigo_modulo = 'GPRV_DATOS_PROV'
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- ================================================================
-- MÓDULOS DE ACCIÓN: GESTIÓN DE PROVEEDORES
-- GESTION_PROVEEDORES da acceso de lectura (lista, filtros, expandir, detalle).
-- Cada acción de escritura tiene su propio módulo (patrón PEDIDO_SEM_*).
-- GPRV_ORDENES controla la pestaña de Órdenes de Pedido.
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('GPRV_NUEVO_PROV',          'G. Proveedores · Nuevo Proveedor',      'Permite crear un nuevo proveedor',                                                'lucide:plus-circle',      36),
    ('GPRV_SYNC_EXCEL',          'G. Proveedores · Sincronizar Excel',     'Permite sincronizar precios desde archivo Excel',                                 'lucide:upload-cloud',     37),
    ('GPRV_GENERAR_ORDEN',       'G. Proveedores · Generar Orden Pedido',  'Permite generar órdenes de pedido para proveedores',                             'lucide:clipboard-list',   38),
    ('GPRV_COTIZACION',          'G. Proveedores · Proyección Cotización', 'Permite consultar proyección de cotización por rango de fechas',                 'lucide:file-spreadsheet', 39),
    ('GPRV_CAMBIAR_ESTADO_PROV', 'G. Proveedores · Cambiar Estado Prov',  'Permite cambiar el estado (Disponible/No Disponible) de un proveedor',           'lucide:toggle-right',     40),
    ('GPRV_EDITAR_PROV',         'G. Proveedores · Editar Proveedor y Productos', 'Permite editar datos del proveedor y las filas de productos (marca, contenido, precio neto, precio con IVA)', 'lucide:edit', 41),
    ('GPRV_ASIGNAR_PROD',        'G. Proveedores · Asignar Producto',     'Permite asignar y desasignar productos a un proveedor',                          'lucide:package-plus',     42),
    ('GPRV_ELIMINAR_PROV',       'G. Proveedores · Eliminar Proveedor',   'Permite eliminar permanentemente un proveedor',                                  'lucide:trash-2',          43),
    ('GPRV_ORDENES',             'G. Proveedores · Órdenes de Pedido',    'Pestaña de órdenes de pedido: visualización y gestión de estados',               'lucide:shopping-bag',     44),
    ('GPRV_CANCELAR_OP',         'G. Proveedores · Cancelar Orden OP',    'Permite cancelar una orden de pedido activa',                                    'lucide:x-circle',         45),
    ('GPRV_EXPORT_OP',           'G. Proveedores · Exportar Excel OP',    'Permite exportar Excel en la vista unificada agrupada por fecha real de entrega','lucide:download',         46)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo IN (
  'GPRV_NUEVO_PROV', 'GPRV_SYNC_EXCEL', 'GPRV_GENERAR_ORDEN', 'GPRV_COTIZACION',
  'GPRV_CAMBIAR_ESTADO_PROV', 'GPRV_EDITAR_PROV', 'GPRV_ASIGNAR_PROD', 'GPRV_ELIMINAR_PROV',
  'GPRV_ORDENES', 'GPRV_CANCELAR_OP', 'GPRV_EXPORT_OP'
)
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- Resto de roles → sin acceso (el Administrador ajusta según necesidad)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('GESTOR_PEDIDOS', 'PROFESOR_A_CARGO', 'DOCENTE', 'ENCARGADO_BODEGA', 'ASISTENTE_BODEGA')
  AND m.codigo_modulo IN (
  'GPRV_NUEVO_PROV', 'GPRV_SYNC_EXCEL', 'GPRV_GENERAR_ORDEN', 'GPRV_COTIZACION',
  'GPRV_CAMBIAR_ESTADO_PROV', 'GPRV_EDITAR_PROV', 'GPRV_ASIGNAR_PROD', 'GPRV_ELIMINAR_PROV',
  'GPRV_ORDENES', 'GPRV_CANCELAR_OP', 'GPRV_EXPORT_OP'
)
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- ================================================================
-- VISTAS DE ESTADO: G. PROVEEDORES - PENDIENTE/ENVIADA y CONFIRMADA
-- Controlan qué chips de estado son visibles en la pestaña Órdenes de Pedido.
-- BinaryReadCell: Sin permiso / Lectura.
-- Hijos de GPRV_ORDENES (cascada 2° nivel) y de GESTION_PROVEEDORES (cascada directa).
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('GPRV_PENDIENTE_ENVIADA', 'G. Proveedores · Pendiente y Enviada',
     'Permite ver y filtrar órdenes en estado PENDIENTE y ENVIADA en la pestaña Órdenes de Pedido',
     'lucide:clock', 67)
    ON CONFLICT (codigo_modulo) DO NOTHING;

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('GPRV_CONFIRMADA', 'G. Proveedores · Confirmada',
     'Permite ver y filtrar órdenes en estado CONFIRMADA y RECIBIDA en la pestaña Órdenes de Pedido',
     'lucide:check-circle', 68)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo IN ('GPRV_PENDIENTE_ENVIADA', 'GPRV_CONFIRMADA')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- Resto de roles → sin acceso (el Administrador asigna según necesidad)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('GESTOR_PEDIDOS', 'PROFESOR_A_CARGO', 'DOCENTE', 'ENCARGADO_BODEGA', 'ASISTENTE_BODEGA')
  AND m.codigo_modulo IN ('GPRV_PENDIENTE_ENVIADA', 'GPRV_CONFIRMADA')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;


-- ================================================================
-- MÓDULO DE ACCIÓN: G. PROVEEDORES - EXPORTAR DATOS EXCEL
-- Controla el botón "Descargar Excel" dentro de la tabla expandida
-- de productos de un proveedor (pestaña Proveedores / Datos Prov).
-- BinaryWriteCell: Sin permiso / Escritura.
-- Cascada descendente desde GESTION_PROVEEDORES (Escritura).
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('GPRV_EXPORT_DATOS', 'G. Proveedores · Exportar Datos Excel',
     'Permite descargar el Excel de plantilla de precios del proveedor (tabla expandida)',
     'lucide:file-down', 66)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo = 'GPRV_EXPORT_DATOS'
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- Resto de roles → sin acceso (el Administrador ajusta según necesidad)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('GESTOR_PEDIDOS', 'PROFESOR_A_CARGO', 'DOCENTE', 'ENCARGADO_BODEGA', 'ASISTENTE_BODEGA')
  AND m.codigo_modulo = 'GPRV_EXPORT_DATOS'
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;


-- ================================================================
-- MÓDULOS DE ACCIÓN: INVENTARIO / BODEGA DE TRÁNSITO / HISTÓRICO
-- Cubre botones, íconos y vistas particulares que NO se representan
-- con el CRUD básico de la página (patrón GPRV_* / PEDIDO_SEM_*).
--
--   INVENTARIO (CRUD)  da lista/búsqueda/filtros (lectura) y Nuevo/Editar/
--   Eliminar producto (crear/actualizar/eliminar). Los siguientes botones
--   especiales son módulos aparte:
--     INV_CONTROL_MASIVO  → botón "Control Masivo"
--     INV_SYNC_EXCEL      → botón "Sincronizar con Excel"
--     INV_ABASTECIMIENTO  → botón "Gestión Abastecimiento" + acceso a OPs
--
--   BODEGA_TRANSITO (CRUD) igual; botones especiales:
--     BOD_CONTROL_MASIVO  → botón "Control Masivo"
--     BOD_ABASTECIMIENTO  → botón "Gestión Abastecimiento" + acceso a OPs
--
--   HISTÓRICO DE PEDIDOS (página propia, antes compartía GESTION_PEDIDOS):
--     HISTORICO_PEDIDOS   → acceso a la página (lectura: consultar/filtrar)
--     HIST_EXPORT_EXCEL   → botón "Excel" de exportación
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('INV_CONTROL_MASIVO', 'Inventario · Control Masivo',       'Permite abrir el Control Masivo de movimientos de inventario',                   'lucide:arrow-right-left', 47),
    ('INV_SYNC_EXCEL',     'Inventario · Sincronizar Excel',    'Permite sincronizar el inventario desde un archivo Excel',                       'lucide:upload-cloud',     48),
    ('INV_ABASTECIMIENTO', 'Inventario · Gestión Abastecimiento','Permite configurar el abastecimiento y ver las OPs de proveedores',              'lucide:boxes',            49),
    ('BOD_CONTROL_MASIVO', 'Bodega · Control Masivo',           'Permite abrir el Control Masivo de stock de la bodega de tránsito',              'lucide:arrow-right-left', 50),
    ('BOD_ABASTECIMIENTO', 'Bodega · Abastec. Proveedores',     'Permite acceder al icono de Abastecimiento de Proveedores dentro del Control Masivo de bodega', 'lucide:truck', 51),
    ('BOD_NUEVO',          'Bodega · Nuevo Producto',           'Permite usar el botón + Nuevo para crear productos en Bodega de Tránsito',        'lucide:plus-circle',      78),
    ('BOD_EDITAR_PRODUCTO','Bodega · Editar Datos Producto',    'Permite editar los Datos del Producto dentro del modal Control de Bodega',        'lucide:pencil',           79),
    ('HISTORICO_PEDIDOS',  'Histórico de Pedidos',              'Consulta agregada de productos pedidos por rango de fechas y estados',            'lucide:bar-chart-2',      52),
    ('HIST_EXPORT_EXCEL',  'Histórico · Exportar Excel',        'Permite exportar a Excel el resumen del histórico de pedidos',                   'lucide:download',         53)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR → acceso total a todos
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo IN (
  'INV_CONTROL_MASIVO','INV_SYNC_EXCEL','INV_ABASTECIMIENTO',
  'BOD_CONTROL_MASIVO','BOD_ABASTECIMIENTO','BOD_NUEVO','BOD_EDITAR_PRODUCTO',
  'HISTORICO_PEDIDOS','HIST_EXPORT_EXCEL'
)
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- ENCARGADO_BODEGA → escritura en las acciones de Inventario y Bodega
-- (gestiona inventario y bodega; mantiene el comportamiento previo de Control Masivo/Excel)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ENCARGADO_BODEGA' LIMIT 1), m.id_modulo, TRUE, TRUE, TRUE, FALSE
FROM modulo m
WHERE m.codigo_modulo IN (
    'INV_CONTROL_MASIVO','INV_SYNC_EXCEL','INV_ABASTECIMIENTO',
    'BOD_CONTROL_MASIVO','BOD_ABASTECIMIENTO','BOD_NUEVO','BOD_EDITAR_PRODUCTO'
)
  AND m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=FALSE;

-- GESTOR_PEDIDOS → lectura del Histórico + exportar Excel (antes accedía vía GESTION_PEDIDOS)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'GESTOR_PEDIDOS' LIMIT 1), m.id_modulo, TRUE, TRUE, TRUE, FALSE
FROM modulo m
WHERE m.codigo_modulo IN ('HISTORICO_PEDIDOS','HIST_EXPORT_EXCEL')
  AND m.enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=FALSE;

-- Resto de roles → sin acceso (el Administrador ajusta según necesidad)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE m.codigo_modulo IN (
  'INV_CONTROL_MASIVO','INV_SYNC_EXCEL','INV_ABASTECIMIENTO',
  'BOD_CONTROL_MASIVO','BOD_ABASTECIMIENTO','BOD_NUEVO','BOD_EDITAR_PRODUCTO',
  'HISTORICO_PEDIDOS','HIST_EXPORT_EXCEL'
)
  AND m.enabled = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM permiso_rol pr WHERE pr.id_rol = r.id_rol AND pr.id_modulo = m.id_modulo
)
    ON CONFLICT (id_rol, id_modulo) DO NOTHING;


-- ================================================================
-- MÓDULOS DE ACCIÓN: GESTIÓN ACADÉMICA
-- Granularidad por botón/ícono dentro de la pestaña Gestión Académica.
-- GESTION_ACADEMICA (TriStateCell) es la puerta de acceso a la pestaña;
-- Lectura = ver lista/buscador/paginación. Escritura cascadea a los hijos.
-- Cada módulo de acción controla un botón o ícono individual.
--
--   GA_CREAR_ASIGNATURA  → botón "Nueva Asignatura"
--   GA_CREAR_SECCION     → botón "Agregar nueva sección"
--   GA_EDITAR_ASIGNATURA → ícono editar asignatura
--   GA_ELIMINAR_ASIGNATURA → ícono eliminar asignatura
--   GA_EDITAR_SECCION    → ícono editar sección
--   GA_ELIMINAR_SECCION  → ícono eliminar sección
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('GA_CREAR_ASIGNATURA',   'G. Académica · Crear Asignatura',    'Permite crear una nueva asignatura',                   'lucide:plus-circle',  55),
    ('GA_CREAR_SECCION',      'G. Académica · Crear Sección',       'Permite agregar una nueva sección a una asignatura',   'lucide:plus-square',  56),
    ('GA_EDITAR_ASIGNATURA',  'G. Académica · Editar Asignatura',   'Permite editar los datos de una asignatura',           'lucide:pencil',       57),
    ('GA_ELIMINAR_ASIGNATURA','G. Académica · Eliminar Asignatura', 'Permite eliminar o inactivar una asignatura',          'lucide:trash-2',      58),
    ('GA_EDITAR_SECCION',     'G. Académica · Editar Sección',      'Permite editar los datos de una sección',              'lucide:edit',         59),
    ('GA_ELIMINAR_SECCION',   'G. Académica · Eliminar Sección',    'Permite eliminar o inactivar una sección',             'lucide:trash-2',      60)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR → escritura total (GESTION_ACADEMICA es LCAE para ambos)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo IN (
                          'GA_CREAR_ASIGNATURA','GA_CREAR_SECCION',
                          'GA_EDITAR_ASIGNATURA','GA_ELIMINAR_ASIGNATURA',
                          'GA_EDITAR_SECCION','GA_ELIMINAR_SECCION'
    )
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- Resto de roles → sin acceso
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('GESTOR_PEDIDOS', 'PROFESOR_A_CARGO', 'DOCENTE', 'ENCARGADO_BODEGA', 'ASISTENTE_BODEGA')
  AND m.codigo_modulo IN (
  'GA_CREAR_ASIGNATURA','GA_CREAR_SECCION',
  'GA_EDITAR_ASIGNATURA','GA_ELIMINAR_ASIGNATURA',
  'GA_EDITAR_SECCION','GA_ELIMINAR_SECCION'
)
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- ================================================================
-- MÓDULOS DE VISTA Y ACCIÓN: GESTIÓN SALA Y RESERVAS
-- Sub-páginas internas de Gestión Académica. Cada vista es independiente:
-- GA_VER_RESERVAS otorga acceso a la sub-pestaña Reservas Registradas;
-- GA_VER_SALAS otorga acceso a la sub-pestaña Gestión Salas.
--
--   GA_VER_RESERVAS  -> sub-pestana Reservas Registradas  (BinaryRead)
--   GA_VER_SALAS     -> sub-pestana Gestion Salas          (BinaryRead)
--   GA_CREAR_SALA    -> boton Nueva Sala                   (BinaryWrite)
--   GA_EDITAR_SALA   -> icono editar sala                  (BinaryWrite)
--   GA_ELIMINAR_SALA -> icono desactivar/eliminar sala     (BinaryWrite)
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('GA_VER_RESERVAS', 'G. Sala · Ver Reservas Registradas', 'Permite ver la sub-pestaña de reservas registradas en Gestión Sala',     'lucide:calendar-clock', 61),
    ('GA_VER_SALAS',    'G. Sala · Ver Gestión Salas',        'Permite ver la sub-pestaña de gestión de salas',                         'lucide:building-2',     62),
    ('GA_CREAR_SALA',   'G. Sala · Crear Nueva Sala',         'Permite crear una nueva sala',                                           'lucide:plus-circle',    63),
    ('GA_EDITAR_SALA',  'G. Sala · Editar Sala',              'Permite editar los datos de una sala existente',                         'lucide:pencil',         64),
    ('GA_ELIMINAR_SALA','G. Sala · Eliminar Sala',            'Permite desactivar o eliminar una sala',                                 'lucide:trash-2',        65)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR -> escritura total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol = 'ADMINISTRADOR'
  AND m.codigo_modulo IN (
  'GA_VER_RESERVAS','GA_VER_SALAS',
  'GA_CREAR_SALA','GA_EDITAR_SALA','GA_ELIMINAR_SALA'
)
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- Resto de roles (incluido CO_ADMINISTRADOR) → sin acceso
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('CO_ADMINISTRADOR', 'GESTOR_PEDIDOS', 'PROFESOR_A_CARGO', 'DOCENTE', 'ENCARGADO_BODEGA', 'ASISTENTE_BODEGA')
  AND m.codigo_modulo IN (
  'GA_VER_RESERVAS','GA_VER_SALAS',
  'GA_CREAR_SALA','GA_EDITAR_SALA','GA_ELIMINAR_SALA'
)
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- ================================================================
-- MÓDULO DE VISTA: GESTIÓN ACADÉMICA · VER ASIGNATURA Y SECCIÓN
-- Acceso de solo lectura a la pestaña Gestión Académica (lista de
-- asignaturas y secciones) sin necesidad de asignar GESTION_ACADEMICA
-- completo (que es el TriStateCell con cascada a las acciones de escritura).
-- Patrón análogo a GA_VER_RESERVAS / GA_VER_SALAS.
--
--   GA_VER_ASIGNATURA -> pestaña Gestión Académica (BinaryRead)
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('GA_VER_ASIGNATURA', 'G. Académica · Ver Asignatura y Sección',
     'Permite ver la pestaña de asignaturas y secciones en Gestión Académica (solo lectura)',
     'lucide:eye', 69)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR -> acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo = 'GA_VER_ASIGNATURA'
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- Resto de roles -> sin acceso (el Administrador asigna según necesidad)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('GESTOR_PEDIDOS', 'PROFESOR_A_CARGO', 'DOCENTE', 'ENCARGADO_BODEGA', 'ASISTENTE_BODEGA')
  AND m.codigo_modulo = 'GA_VER_ASIGNATURA'
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- ================================================================
-- MÓDULOS DE PERMISOS: INVENTARIO (nuevos sub-módulos granulares)
-- Controladores de botones individuales en la página de Inventario:
--   INV_NUEVO_PRODUCTO  -> botón "Nuevo" (BinaryWrite / ACTION)
--   INV_ABAST_BODEGA    -> icono Bodega en Control Masivo (BinaryWrite / ACTION)
--   INV_ABAST_PROV      -> icono Proveedores en Control Masivo (BinaryWrite / ACTION)
--   INV_STOCK_DISPONIBLE-> icono package-check (BinaryRead)
--   SD_INVENTARIO       -> sección Inventario en modal Stock Disponible (BinaryRead)
--   SD_BODEGA_TRANSITO  -> sección Bodega Tránsito en modal Stock Disponible (BinaryRead)
--   SD_DISPONIBLE_REAL  -> sección Disponible Real en modal Stock Disponible (BinaryRead)
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('INV_NUEVO_PRODUCTO',  'Inventario · Nuevo Producto',
     'Permite usar el botón Nuevo para crear productos en Inventario',
     'lucide:plus-circle', 70),
    ('INV_ABAST_BODEGA',    'Inventario · Abastec. Bodega',
     'Permite acceder al icono de Abastecimiento de Bodega dentro del Control Masivo',
     'lucide:warehouse', 71),
    ('INV_ABAST_PROV',      'Inventario · Abastec. Proveedores',
     'Permite acceder al icono de Abastecimiento de Proveedores dentro del Control Masivo',
     'lucide:truck', 72),
    ('INV_STOCK_DISPONIBLE','Inventario · Stock Disponible',
     'Permite acceder al modal de Stock Disponible desde la barra de Inventario',
     'lucide:package-check', 73),
    ('SD_INVENTARIO',       'Stock Disp. · Inventario',
     'Permite ver la sección Inventario dentro del modal de Stock Disponible',
     'lucide:package', 74),
    ('SD_BODEGA_TRANSITO',  'Stock Disp. · Bodega Tránsito',
     'Permite ver la sección Bodega Tránsito dentro del modal de Stock Disponible',
     'lucide:warehouse', 75),
    ('SD_DISPONIBLE_REAL',  'Stock Disp. · Disponible Real',
     'Permite ver la sección Disponible Real dentro del modal de Stock Disponible',
     'lucide:calculator', 76)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR -> acceso total a todos los nuevos módulos
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo IN ('INV_NUEVO_PRODUCTO', 'INV_ABAST_BODEGA', 'INV_ABAST_PROV',
                          'INV_STOCK_DISPONIBLE', 'SD_INVENTARIO', 'SD_BODEGA_TRANSITO', 'SD_DISPONIBLE_REAL')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- ENCARGADO_BODEGA -> acceso total a todos los nuevos módulos
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol = 'ENCARGADO_BODEGA'
  AND m.codigo_modulo IN ('INV_NUEVO_PRODUCTO', 'INV_ABAST_BODEGA', 'INV_ABAST_PROV',
                          'INV_STOCK_DISPONIBLE', 'SD_INVENTARIO', 'SD_BODEGA_TRANSITO', 'SD_DISPONIBLE_REAL')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- ASISTENTE_BODEGA -> solo lectura en INV_STOCK_DISPONIBLE y SD_* (sin acceso a acciones de escritura)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol = 'ASISTENTE_BODEGA'
  AND m.codigo_modulo IN ('INV_STOCK_DISPONIBLE', 'SD_INVENTARIO', 'SD_BODEGA_TRANSITO', 'SD_DISPONIBLE_REAL')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- ASISTENTE_BODEGA -> sin acceso a acciones de escritura de inventario
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol = 'ASISTENTE_BODEGA'
  AND m.codigo_modulo IN ('INV_NUEVO_PRODUCTO', 'INV_ABAST_BODEGA', 'INV_ABAST_PROV')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- Resto de roles -> sin acceso a los nuevos módulos de inventario
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('GESTOR_PEDIDOS', 'PROFESOR_A_CARGO', 'DOCENTE')
  AND m.codigo_modulo IN ('INV_NUEVO_PRODUCTO', 'INV_ABAST_BODEGA', 'INV_ABAST_PROV',
                          'INV_STOCK_DISPONIBLE', 'SD_INVENTARIO', 'SD_BODEGA_TRANSITO', 'SD_DISPONIBLE_REAL')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- ================================================================
-- MÓDULO: INV_EDITAR_PRODUCTO (orden 77)
-- Controla el acceso al ícono de editar fila en Inventario
-- (abre el modal "Control de Inventario" con los datos del producto)
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('INV_EDITAR_PRODUCTO', 'Inventario · Editar Producto',
     'Permite hacer clic en una fila del inventario para abrir y editar los datos del producto',
     'lucide:pencil', 77)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo = 'INV_EDITAR_PRODUCTO'
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- ENCARGADO_BODEGA → acceso total (gestiona inventario)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol = 'ENCARGADO_BODEGA'
  AND m.codigo_modulo = 'INV_EDITAR_PRODUCTO'
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- Resto de roles → sin acceso
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ASISTENTE_BODEGA', 'GESTOR_PEDIDOS', 'PROFESOR_A_CARGO', 'DOCENTE')
  AND m.codigo_modulo = 'INV_EDITAR_PRODUCTO'
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- ================================================================
-- MÓDULOS DE ACCIÓN: BODEGA DE TRÁNSITO — acciones granulares
--   BOD_NUEVO          → botón "+ Nuevo" en Bodega de Tránsito (BinaryWrite)
--   BOD_EDITAR_PRODUCTO→ ícono editar "Datos del Producto" en modal Control de Bodega (BinaryWrite)
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('BOD_NUEVO',           'Bodega · Nuevo Producto',
     'Permite usar el botón + Nuevo para crear productos en Bodega de Tránsito',
     'lucide:plus-circle', 78),
    ('BOD_EDITAR_PRODUCTO',  'Bodega · Editar Datos Producto',
     'Permite editar los Datos del Producto dentro del modal Control de Bodega',
     'lucide:pencil', 79)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo IN ('BOD_NUEVO', 'BOD_EDITAR_PRODUCTO')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- ENCARGADO_BODEGA → escritura
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol = 'ENCARGADO_BODEGA'
  AND m.codigo_modulo IN ('BOD_NUEVO', 'BOD_EDITAR_PRODUCTO')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=FALSE;

-- Resto de roles → sin acceso
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ASISTENTE_BODEGA', 'GESTOR_PEDIDOS', 'PROFESOR_A_CARGO', 'DOCENTE')
  AND m.codigo_modulo IN ('BOD_NUEVO', 'BOD_EDITAR_PRODUCTO')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

-- ================================================================
-- MÓDULOS DE ACCIÓN: GESTIÓN DE PEDIDOS DIARIOS — sub-acciones granulares
--
--   GPD_RESUMEN_PERIODO  → botón "Resumen período" (BinaryRead: Sin Acceso / Lectura)
--                          Permite ver el resumen agregado de productos del período.
--   GPD_PREPARAR_ENTREGA → botón "Preparar Entrega" en EntregaSalaCard (BinaryWrite: Sin permiso / Escritura)
--                          Permite registrar la entrega de una solicitud.
--
-- GESTION_PEDIDOS_DIARIOS es la puerta de acceso a la vista (TriStateCell).
-- Lectura → accede a la página + ve Resumen período.
-- Escritura → todo lo anterior + puede usar Preparar Entrega.
--
-- NOTA EXCLUSIÓN MUTUA: BODEGA_TRANSITO y GESTION_PEDIDOS_DIARIOS son páginas
-- independientes dentro de bodega-transito.tsx. Un rol NO debe tener ambos al
-- mismo tiempo; el Administrador asigna UNO u otro según el perfil del usuario.
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES
    ('GPD_RESUMEN_PERIODO',  'Ped. Diarios · Resumen de Período',
     'Permite ver el botón Resumen de Período en Gestión de Pedidos Diarios (solo lectura)',
     'lucide:layers', 80),
    ('GPD_PREPARAR_ENTREGA', 'Ped. Diarios · Preparar Entrega',
     'Permite usar el botón Preparar Entrega para registrar la entrega de una solicitud',
     'lucide:package-check', 81)
    ON CONFLICT (codigo_modulo) DO NOTHING;

-- ADMINISTRADOR y CO_ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, TRUE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ADMINISTRADOR', 'CO_ADMINISTRADOR')
  AND m.codigo_modulo IN ('GPD_RESUMEN_PERIODO', 'GPD_PREPARAR_ENTREGA')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- ENCARGADO_BODEGA y ASISTENTE_BODEGA → lectura en Resumen Período + escritura en Preparar Entrega
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ENCARGADO_BODEGA', 'ASISTENTE_BODEGA')
  AND m.codigo_modulo = 'GPD_RESUMEN_PERIODO'
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;

INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, TRUE, TRUE, TRUE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('ENCARGADO_BODEGA', 'ASISTENTE_BODEGA')
  AND m.codigo_modulo = 'GPD_PREPARAR_ENTREGA'
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=FALSE;

-- Resto de roles → sin acceso
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT r.id_rol, m.id_modulo, FALSE, FALSE, FALSE, FALSE
FROM rol r CROSS JOIN modulo m
WHERE r.nombre_rol IN ('GESTOR_PEDIDOS', 'PROFESOR_A_CARGO', 'DOCENTE')
  AND m.codigo_modulo IN ('GPD_RESUMEN_PERIODO', 'GPD_PREPARAR_ENTREGA')
  AND m.enabled = TRUE
    ON CONFLICT (id_rol, id_modulo) DO UPDATE SET
    puede_leer=FALSE, puede_crear=FALSE, puede_actualizar=FALSE, puede_eliminar=FALSE;


-- =====================================================
-- INDICES PARA OPTIMIZACION DE RENDIMIENTO
-- =====================================================
-- ── USUARIO ──────────────────────────────────────────────────────────────────
-- findUsuariosParaFrontend / countUsuariosParaFrontend: filtro por id_rol IN (csv)
CREATE INDEX idx_usuario_rol ON usuario(id_rol);
-- findByIdentifier (LOWER(email) = LOWER(:id)), searchUsuariosParaFrontend (email ILIKE), existsByEmail
CREATE INDEX idx_usuario_email ON usuario(email);
-- findByIdentifier (LOWER(username) = LOWER(:id)), existsByUsername
CREATE INDEX idx_usuario_username ON usuario(username);
-- findUserAuth (WHERE email = :id AND activo = true), findByEmailIgnoreCaseAndActivoTrue — UNIQUE parcial
CREATE UNIQUE INDEX idx_usuario_email_activo ON usuario(email) WHERE (activo = true);
-- findUserAuth (WHERE username = :id AND activo = true), existsUsuarioByUsernameAndActivo — UNIQUE parcial
CREATE UNIQUE INDEX idx_usuario_username_activo ON usuario(username) WHERE (activo = true);

-- ── REFRESH_TOKEN ─────────────────────────────────────────────────────────────
-- findByTokenAndActivoTrue: WHERE token = :t AND activo = true
CREATE INDEX idx_refresh_token_string ON refresh_token(token);
-- revocarTodosPorUsuario: WHERE id_usuario = :id AND activo = true
CREATE INDEX idx_refresh_token_usuario ON refresh_token(id_usuario);

-- ── BLOQUE_HORARIO ────────────────────────────────────────────────────────────
-- Búsquedas JPA por numero_bloque; JOIN desde reserva_sala en queries de SeccionRepository
CREATE INDEX idx_bloque_numero ON bloque_horario(numero_bloque);

-- ── SECCIÓN / ASIGNATURA ──────────────────────────────────────────────────────
-- SeccionRepository.findAllAsignaturasConSeccionesYReservas, SolicitudRepository.findCourseWithSectionsAndBlocksRaw:
-- JOIN seccion ON id_asignatura; filtro s.id_asignatura = a.id_asignatura
CREATE INDEX idx_seccion_asignatura ON seccion(id_asignatura);
-- AsignaturaRepository JPA by cod_asignatura; búsqueda de asignatura por código
CREATE INDEX idx_asignatura_codigo ON asignatura(cod_asignatura);

-- ── SALA ──────────────────────────────────────────────────────────────────────
-- SalaRepository JPA by cod_sala; búsqueda de sala por código
CREATE INDEX idx_sala_codigo ON sala(cod_sala);

-- ── RESERVA_SALA ──────────────────────────────────────────────────────────────
-- SeccionRepository y SolicitudRepository: subqueries WHERE rs.id_seccion = s.id_seccion AND rs.activo = true
CREATE INDEX idx_reserva_seccion ON reserva_sala(id_seccion);
-- Queries de disponibilidad de sala filtradas por id_sala
CREATE INDEX idx_reserva_sala_sala ON reserva_sala(id_sala);
-- JOIN desde bloque_horario en queries de horarios (SeccionRepository, SolicitudRepository)
CREATE INDEX idx_reserva_bloque ON reserva_sala(id_bloque);
-- Búsqueda de reservas por día + bloque en validaciones de solapamiento
CREATE INDEX idx_reserva_dia_bloque ON reserva_sala(dia_semana, id_bloque);
-- SeccionRepository.findAllAsignaturasConSeccionesYReservas: WHERE id_seccion = :s AND activo = true
CREATE INDEX idx_reserva_seccion_activa ON reserva_sala(id_seccion, activo);
-- Garantiza que una sala no tenga dos reservas activas en el mismo día y bloque (unicidad física)
CREATE UNIQUE INDEX uk_reserva_activa
    ON reserva_sala (id_sala, dia_semana, id_bloque)
    WHERE (activo = true);
-- Garantiza que una sección no tenga dos reservas activas para el mismo día y bloque (unicidad lógica)
CREATE UNIQUE INDEX uk_seccion_dia_bloque_activa
    ON reserva_sala (id_seccion, dia_semana, id_bloque)
    WHERE (activo = true);

-- ── DOCENTE_SECCION ───────────────────────────────────────────────────────────
-- SolicitudRepository JOIN docente_seccion ON id_usuario; DocenteSeccionRepository JPA by id_usuario
CREATE INDEX idx_docente_seccion_usuario ON docente_seccion(id_usuario);
-- SeccionRepository.findAllAsignaturasConSeccionesYReservas JOIN ON id_seccion
CREATE INDEX idx_docente_seccion_seccion ON docente_seccion(id_seccion);
-- Ordering/filtrado por fecha de asignación en listados administrativos
CREATE INDEX idx_docente_seccion_fecha ON docente_seccion(fecha_asignacion);

-- ── ASIGNATURA_PROFESOR_CARGO ─────────────────────────────────────────────────
-- AsignaturaProfesorCargoRepository JPA by id_asignatura
CREATE INDEX idx_apc_id_asignatura ON asignatura_profesor_cargo(id_asignatura);
-- AsignaturaProfesorCargoRepository JPA by id_usuario
CREATE INDEX idx_apc_id_usuario ON asignatura_profesor_cargo(id_usuario);
-- Garantiza una única asignación activa por par (asignatura, profesor)
CREATE UNIQUE INDEX idx_apc_unico_asignatura_usuario ON asignatura_profesor_cargo(id_asignatura, id_usuario);

-- ── ASIGNATURA (activo) ───────────────────────────────────────────────────────
-- SolicitudRepository.findCourseWithSectionsAndBlocksRaw: WHERE a.activo = true
-- PedidoSemanaBodegaRepository.findAllAsignaturasActivas: WHERE a.activo = TRUE
CREATE INDEX idx_asignatura_activo ON asignatura(activo);

-- ── SECCION (estado + activo) ─────────────────────────────────────────────────
-- SolicitudRepository.findCourseWithSectionsAndBlocksRaw: WHERE s.activo = true AND s.estado_seccion = 'ACTIVA'
CREATE INDEX idx_seccion_estado_activo ON seccion(estado_seccion, activo);

-- ── INVENTARIO / PRODUCTO / CATEGORÍA / UNIDAD ───────────────────────────────
-- CTEs de disponible real (OrdenPedidoRepository, StockDisponibleRepository): JOIN inventario ON id_producto
-- InventarioRepository.findByIdToInventoryPage, OrdenPedidoRepository.findAbastecimientoConfirmado
CREATE INDEX idx_inventario_producto ON inventario(id_producto);
-- InventarioRepository.searchInventarioByCodProductPage: LOWER(cod_producto) LIKE '%:cod%'
-- (parcialmente efectivo; LOWER() impide uso completo → ver idx_producto_nombre_trgm para ILIKE)
CREATE INDEX idx_producto_codigo ON producto(cod_producto);
-- InventarioRepository.findInventoryPage, BodegaTransitoRepository: WHERE activo = TRUE
-- CTEs de disponible real: WHERE i.activo = TRUE
CREATE INDEX idx_inventario_activo ON inventario(activo);
-- InventarioRepository.findInventoryPage: filtro id_categoria; ProductoRepository.actualizarCategoriaMasivo,
-- existsByCategoria_IdCategoria
CREATE INDEX idx_producto_categoria ON producto(id_categoria);
-- InventarioRepository.findInventoryPage: filtro id_unidad; ProductoRepository.actualizarUnidadMedidaMasivo,
-- existsByUnidadMedida_IdUnidad
CREATE INDEX idx_producto_unidad ON producto(id_unidad);

-- ── MOVIMIENTO (tabla particionada) ───────────────────────────────────────────
-- MovimientoRepository.findDynamicMovements: JOIN usuario ON id_usuario (filtro opcional responsable)
CREATE INDEX idx_movimiento_usuario ON movimiento(id_usuario);
-- MovimientoRepository.findDynamicMovements: WHERE fecha_movimiento BETWEEN :fi AND :ff
-- DashboardRepository.countMovimientosHoy, getTopProductosUsados (fecha >= 30d atrás)
-- La partición por RANGE(fecha_movimiento) ya hace pruning; este índice acelera dentro de cada partición
CREATE INDEX idx_movimiento_fecha ON movimiento(fecha_movimiento);
-- MovimientoRepository.findDynamicMovements: filtro opcional tipo_movimiento = :tipo
-- DashboardRepository.getTopProductosUsados: WHERE tipo_movimiento IN ('SALIDA_INVENTARIO', ...)
CREATE INDEX idx_movimiento_tipo ON movimiento(tipo_movimiento);
-- MovimientoRepository.findDynamicMovements: JOIN inventario ON id_inventario
CREATE INDEX idx_movimiento_inventario ON movimiento(id_inventario);

-- ── PROVEEDOR_PRODUCTO ────────────────────────────────────────────────────────
-- ProveedorRepository.findProveedoresPorProducto: WHERE id_producto AND activo=TRUE ORDER BY precio_neto ASC
-- CTEs mejor_precio en findCotizacionConsolidada / findCotizacionDeCanceladas:
--   DISTINCT ON (id_producto) ORDER BY precio_neto ASC — index-only scan posible
CREATE INDEX idx_pp_producto_precio_optimo
    ON proveedor_producto (id_producto, precio_neto ASC)
    WHERE activo = TRUE;

-- ProveedorRepository.findProductosPorProveedor: DISTINCT ON (id_producto) ORDER BY fecha_actualizacion DESC
-- ProveedorRepository.findProductosPorProveedorHastaFecha: id_proveedor AND fecha_actualizacion <= :fecha
-- ProveedorProductoRepository.desactivarVersionesActivas: WHERE id_proveedor AND id_producto AND activo=true
CREATE INDEX idx_pp_version_reciente
    ON proveedor_producto (id_proveedor, id_producto, fecha_actualizacion DESC);

-- ── ORDEN_PEDIDO ──────────────────────────────────────────────────────────────
-- existsByPedido_IdPedidoAndActivoTrue, existsOrdenActivaConEstadoDistinto,
-- findPedidosSemanaConIndicadorOP (subquery COUNT por id_pedido), findPedidosAprobadosSinOpPorSemana (NOT EXISTS)
CREATE INDEX idx_op_pedido ON orden_pedido(id_pedido) WHERE activo = TRUE;
-- findByProveedor_IdProveedorAndActivoTrue: WHERE id_proveedor AND activo=TRUE
CREATE INDEX idx_op_proveedor ON orden_pedido(id_proveedor) WHERE activo = TRUE;
-- findEntregasPendientesHoyAyer: WHERE estado='CONFIRMADA' AND activo=TRUE
-- findConfirmadasConTodosEntregados, findAbastecimientoConfirmado: filtro por CONFIRMADA
CREATE INDEX idx_op_estado ON orden_pedido(estado_orden_pedido) WHERE activo = TRUE;
-- findListaOrdenesNative subqueries (COUNT/SUM detalles WHERE id_orden_pedido = op.id)
-- findAbastecimientoConfirmado: JOIN detalle_orden_pedido ON id_orden_pedido AND activo=TRUE
CREATE INDEX idx_dop_orden ON detalle_orden_pedido(id_orden_pedido);
-- findEntregasPendientesHoyAyer: WHERE fecha_entrega IN (hoy, ayer)
-- findAbastecimientoConfirmado: WHERE fecha_entrega BETWEEN (hoy-15) AND :hasta
CREATE INDEX idx_dop_fecha_entrega ON detalle_orden_pedido(fecha_entrega) WHERE activo = TRUE;

-- ── BODEGA_TRANSITO ───────────────────────────────────────────────────────────
-- BodegaTransitoRepository.findByInventario_IdInventario, addStockInTransit, findByInventarioIds
-- CTEs de disponible real: LEFT JOIN bodega_transito bt ON bt.id_inventario = i.id_inventario
CREATE INDEX idx_bodega_transito_inventario ON bodega_transito(id_inventario);
-- BodegaTransitoRepository.searchTransitWarehousePage, findTransitWarehousePage: WHERE activo = TRUE
CREATE INDEX idx_bodega_transito_activo ON bodega_transito(activo);

-- ── PEDIDO_SEMANA_BODEGA (recetas) ────────────────────────────────────────────
-- PedidoSemanaBodegaRepository.findAllWithDetailsPaging: filtro estado_pedido = :estado
-- countRecipesAndStatus: GROUP BY estado_pedido WHERE activo=true
CREATE INDEX idx_pedido_semana_bodega_estado ON pedido_semana_bodega(estado_pedido);
-- DetallePedidoSemanaBodegaRepository: findDetailsForUpdate, deleteByRecetaAndProductoIds,
-- updateQuantityByRecipeAndProduct, findProductoIdsByRecetaId, findActiveDetailsByRecipeId
-- (todos filtran WHERE id_pedido_semana_bodega = :id)
CREATE INDEX idx_detalle_pedido_semana_padre ON detalle_pedido_semana_bodega(id_pedido_semana_bodega);
-- DetallePedidoSemanaBodegaRepository.deleteByRecetaAndProductoIds: AND id_producto IN (:ids)
CREATE INDEX idx_detalle_pedido_semana_producto ON detalle_pedido_semana_bodega(id_producto);
-- PedidoSemanaBodegaRepository: queries con filtro id_asignatura (plain, sin activo).
-- Nota: idx_psb_asignatura_activo (parcial WHERE activo=true) es preferido por PG cuando
-- la query incluye activo=true; este índice actúa como fallback para queries sin ese filtro.
CREATE INDEX idx_pedido_semana_asignatura ON pedido_semana_bodega(id_asignatura);

-- ── PEDIDO ────────────────────────────────────────────────────────────────────
-- PedidoRepository: findEntregasDiariasJson (IN 'APROBADO','ENTREGADO'), findPedidosPendientesPorSemana
-- ('PENDIENTE'), marcarPedidosEntregadosPorFecha ('APROBADO'); OrdenPedidoRepository: WHERE estado='APROBADO'
CREATE INDEX idx_pedido_estado ON pedido(estado_pedido);
-- PedidoRepository: findPedidoConDetallesJson, findPedidosPorRangoJson, findPedidoResumenAprobacionJson,
-- findIdPedidoActivoEnRango, obtenerResumenHistoricoJSON (todos filtran por fecha_inicio_pedido BETWEEN/=)
-- OrdenPedidoRepository.findPedidosSemanaConIndicadorOP: fecha_inicio >= :fi AND fecha_fin <= :ff
CREATE INDEX idx_pedido_fecha_inicio ON pedido(fecha_inicio_pedido);
-- Ordering por fecha de creación del pedido en listados administrativos
CREATE INDEX idx_pedido_fecha_registro ON pedido(fecha_registro);
-- DetallePedidoRepository: upsertDetallesFromSolicitud, subtractDetallesFromSolicitud,
-- deleteDetallesVaciosByPedido (todos por WHERE id_pedido = :id)
CREATE INDEX idx_detalle_pedido_fk ON detalle_pedido(id_pedido);
-- DetallePedidoRepository.subtractDetallesFromSolicitud: WHERE id_pedido AND id_producto
CREATE INDEX idx_detalle_pedido_prod ON detalle_pedido(id_producto);

-- ── SOLICITUD ─────────────────────────────────────────────────────────────────
-- JPA derivado by id_usuario_gestor_solicitud; búsqueda de solicitudes por gestor
CREATE INDEX idx_solicitud_gestor ON solicitud(id_usuario_gestor_solicitud);
-- SolicitudRepository subquery: WHERE id_seccion = s.id_seccion (findCourseWithSectionsAndBlocksRaw)
-- JOIN solicitud ON id_seccion en múltiples queries de la pantalla de solicitudes
CREATE INDEX idx_solicitud_seccion ON solicitud(id_seccion);
-- SolicitudRepository: findSolicitationsPerWeekRaw (BETWEEN :fi AND :ff)
-- ProveedorRepository.findCotizacionProveedoresPorRango: solicitudes EN_PEDIDO en rango de fechas
-- DashboardRepository: countSolicitudesToday, countSolicitudesWeek, countSolicitudesMonth
-- Nota: para queries que combinan estado+fecha, los índices parciales (idx_solicitud_pendiente,
-- idx_solicitud_aceptada, idx_solicitud_en_pedido) son más eficientes que este índice plain.
CREATE INDEX idx_solicitud_fecha ON solicitud(fecha_solicitada);

-- ── DETALLE_SOLICITUD ─────────────────────────────────────────────────────────
-- PedidoSolicitudRepository.findSolicitudDetallesByPedido JOIN detalle_solicitud ON id_solicitud
-- CTEs en SolicitudRepository, OrdenPedidoRepository: FROM detalle_solicitud WHERE id_solicitud = :id
CREATE INDEX idx_detalle_solicitud_fk_solicitud ON detalle_solicitud(id_solicitud);
-- JOIN desde producto hacia detalle_solicitud; queries de consolidado y cotización que agrupan por producto
CREATE INDEX idx_detalle_solicitud_producto ON detalle_solicitud(id_producto);

-- ── PEDIDO_SOLICITUD ──────────────────────────────────────────────────────────
-- PedidoSolicitudRepository: deleteVinculo, countSolicitudesNoProcesadas, findSolicitudDetallesByPedido,
-- findIdSolicitudesEnPedidoByPedido (todos por WHERE id_pedido = :id)
CREATE INDEX idx_pedido_solicitud_pedido ON pedido_solicitud(id_pedido);
-- PedidoSolicitudRepository.findIdPedidoByIdSolicitud: WHERE id_solicitud = :id
-- SolicitudRepository subqueries: NOT IN (SELECT id_solicitud FROM pedido_solicitud) — escanea este índice
CREATE INDEX idx_pedido_solicitud_fk_solicitud ON pedido_solicitud(id_solicitud);
-- Ordering/auditoría por fecha de vinculación solicitud-pedido
CREATE INDEX idx_pedido_solicitud_fecha ON pedido_solicitud(fecha_union_registro);

-- ── SOPORTE_TICKET ────────────────────────────────────────────────────────────
-- Preparados para queries futuras de SoporteTicketRepository (actualmente solo JPA básico)
CREATE INDEX idx_soporte_estado ON soporte_ticket(estado);
CREATE INDEX idx_soporte_fecha  ON soporte_ticket(fecha_creacion DESC);

-- =====================================================
-- ÍNDICES DE RENDIMIENTO — ALTA PRIORIDAD
-- Verificados consultando las queries nativas del backend
-- =====================================================

-- [A1] solicitud.estado_solicitud
-- Cubre: contarSolicitudesPendientes, findPendientesPorSemana, findAceptadasPorSemana,
--        rechazarSolicitudesVencidas, findSolicitudesParaDashboard, findConsolidadoGlobalJson,
--        findAbastecimientoBodegaJson, existsByIdSolicitudInAndEstadoInmutable
-- Índice plain: útil para IN ('EN_PEDIDO','PROCESADO') y scans sin rango de fecha
CREATE INDEX idx_solicitud_estado     ON solicitud(estado_solicitud);
-- Parciales: más pequeños y rápidos cuando la query filtra estado + fecha_solicitada
CREATE INDEX idx_solicitud_pendiente  ON solicitud(fecha_solicitada) WHERE estado_solicitud = 'PENDIENTE'::estado_solicitud_type;
CREATE INDEX idx_solicitud_aceptada   ON solicitud(fecha_solicitada) WHERE estado_solicitud = 'ACEPTADA'::estado_solicitud_type;
CREATE INDEX idx_solicitud_en_pedido  ON solicitud(fecha_solicitada) WHERE estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type;

-- [A2] movimiento.id_orden_pedido — tabla particionada por RANGE(fecha_movimiento)
-- Cubre: findEntregasRealesByOrdenPedido → WHERE id_orden_pedido = :id AND tipo_movimiento IN (...)
-- PG propaga el índice a todas las particiones existentes y futuras automáticamente
-- Tipo_movimiento se filtra en heap tras el index scan (cardinalidad de id_orden_pedido ya es muy baja)
CREATE INDEX idx_movimiento_orden_pedido ON movimiento(id_orden_pedido) WHERE id_orden_pedido IS NOT NULL;

-- [A3] pedido_semana_bodega — 10+ queries filtran por id_semana, id_asignatura, o ambos, siempre con activo=true
-- findAllWithDetailsPagingByIdSemana, countByActivoTrueAndIdSemana,
-- findAllWithDetailsPagingByIdAsignatura, countByActivoTrueAndIdAsignatura,
-- findAllWithDetailsPagingByIdSemanaAndIdAsignatura, y sus variantes con búsqueda
CREATE INDEX idx_psb_semana_activo     ON pedido_semana_bodega(id_semana)     WHERE activo = true;
CREATE INDEX idx_psb_asignatura_activo ON pedido_semana_bodega(id_asignatura) WHERE activo = true;

-- =====================================================
-- ÍNDICES DE RENDIMIENTO — MEDIA PRIORIDAD
-- =====================================================

-- [M1] reserva_stock_solicitud(id_producto, activo) — CTEs de disponible real en OrdenPedido y StockDisponible
CREATE INDEX idx_rss_producto_activo ON reserva_stock_solicitud(id_producto, activo) WHERE activo = TRUE;

-- [M2] detalle_orden_pedido_solicitud.id_solicitud — CTEs de cotización y disponible real acceden por id_solicitud
CREATE INDEX idx_dops_solicitud ON detalle_orden_pedido_solicitud(id_solicitud) WHERE activo = TRUE;

-- [M3] stock_disponible — triple filtro en todas las queries del módulo
CREATE INDEX idx_sd_tipo_activo_producto ON stock_disponible(tipo_disponible, activo, id_producto) WHERE activo = TRUE;

-- =====================================================
-- ÍNDICES DE RENDIMIENTO — BAJA PRIORIDAD
-- Verificados contra InventarioRepository, ProveedorRepository y OrdenPedidoRepository
-- =====================================================

-- [B1] producto.nombre_producto — ILIKE desde InventarioRepository (searchInventoryPage,
--      searchInventarioByCodProductPage) y ProveedorRepository (buscarProductosGlobal).
--      Sin pg_trgm PostgreSQL no puede usar índice para patrones %term% → seq scan.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_producto_nombre_trgm ON producto USING gin (nombre_producto gin_trgm_ops);

-- [B2] orden_pedido.fecha_creacion — findListaOrdenesNative y findListaOrdenesNativeSince
--      WHERE op.activo = true [AND fecha_creacion >= :desde] ORDER BY fecha_creacion DESC
--      activo omitido del key porque ya es el predicado parcial (redundante en columna clave).
CREATE INDEX idx_op_fecha_activo ON orden_pedido(fecha_creacion DESC) WHERE activo = TRUE;


-- Asegúrate de que la extensión esté activa
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO usuario (id_rol, p_nombre, s_nombre, app_paterno, app_materno, email, username, contrasena, url_foto_perfil, activo, fecha_creacion, ultimo_acceso)
VALUES
-- 1. Administrador (De la imagen: adminhash@kuhub.cl / admin123)
(1, 'Administrador', 'Sistema', 'KubHub', 'Admin', 'adminhash@kuhub.cl', 'adminhash@kuhub.cl',
 crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),

-- 2. Co-Administrador (De la imagen: coadminhash@kuhub.cl / coadmin1234)
(2, 'Co-Administrador', 'Sistema', 'KubHub', 'CoAdmin', 'coadminhash@kubhub.cl', 'coadminhash@kubhub.cl',
 crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),

-- 3. Gestor de Pedidos (De la imagen: gestorhash@kuhub.cl / gestor1234)
(3, 'Gestor', 'Pedidos', 'KubHub', 'Operaciones', 'gestorhash@kuhub.cl', 'gestorhash@kuhub.cl',
 crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),

-- 4. Profesor a Cargo (De la imagen: profesorcargohash@kuhub.cl / profe1234)
(4, 'Profesor', 'Encargado', 'KubHub', 'Academico', 'profesorcargohash@kuhub.cl', 'profesorcargohash@kuhub.cl',
 crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),

-- 5. Docente General (De la imagen: docentehash@kuhub.cl / docente1234)
(5, 'Docente', 'General', 'KubHub', 'Academico', 'docentehash@kuhub.cl', 'docentehash@kuhub.cl',
 crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),

-- 6. Encargado de Bodega (De la imagen: bodegahash@kuhub.cl / dega1234)
(6, 'Bodeguero', 'Encargado', 'KubHub', 'Inventario', 'bodegahash@kuhub.cl', 'bodegahash@kuhub.cl',
 crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),

-- 7. Asistente de Bodega (De la imagen: asisbodegahash@kuhub.cl / asisbo1234) -- OJO: corregí el dominio a kuhub.cl según patrón
(7, 'Asistente', 'Bodega', 'KubHub', 'Apoyo', 'asisbodegahash@kuhub.cl', 'asisbodegahash@kuhub.cl',
 crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),

(1, 'Fabio', 'Test', 'KubHub', 'FabioUser', 'fabiotest@kuhub.cl', 'fabiotest@kuhub.cl',
 crypt('fbi123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL);


-- =====================================================
-- 2. INSERTAR BLOQUES HORARIOS (Basado en imagen proporcionada)
-- =====================================================
INSERT INTO bloque_horario (numero_bloque, hora_inicio, hora_fin) VALUES
    (1, '08:01:00', '08:40:00'),
    (2, '08:41:00', '09:20:00'),
    (3, '09:31:00', '10:10:00'),
    (4, '10:11:00', '10:50:00'),
    (5, '11:01:00', '11:40:00'),
    (6, '11:41:00', '12:20:00'),
    (7, '12:31:00', '13:10:00'),
    (8, '13:11:00', '13:50:00'),
    (9, '14:01:00', '14:40:00'),
    (10, '14:41:00', '15:20:00'),
    (11, '15:31:00', '16:10:00'),
    (12, '16:11:00', '16:50:00'),
    (13, '17:01:00', '17:40:00'),
    (14, '17:41:00', '18:20:00'),
    (15, '18:21:00', '19:00:00'),
    (16, '19:01:00', '19:40:00'),
    (17, '19:41:00', '20:20:00'),
    (18, '20:21:00', '21:00:00'),
    (19, '21:01:00', '21:40:00'),
    (20, '21:41:00', '22:10:00');

-- INSERTAR CATEGORIAS Y UNIDADES DE MEDIDAS (Desde documento proporcionado)
INSERT INTO categoria (nombre_categoria) VALUES
('Abarrotes'),                      -- ID 1
('Aseo y Descartable'),             -- ID 2
('Vinos y Destilados'),             -- ID 3
('Frutas y Verduras Congeladas'),   -- ID 4
('Carnes'),                         -- ID 5
('Pescados y Mariscos    ');        -- ID 6

INSERT INTO unidad_medida (nombre_unidad, abreviatura, es_fraccionario, activo) VALUES
('Unidad',  'un',  false, true),
('Kilo',    'kg',  true,  true),
('Litro',   'l',   true,  true),
('Paquete', 'paq', false, true),
('Bandeja', 'bdj', false, true),
('Mata',    'mat', false, true),
('Cajas',   'cj',  false, true),
('Rollo',   'rll', false, true),
('Botella', 'bot', false, true);

--------------------------------------------------------------------------------
-- FUNCIONES Y TRIGGERS PARA GESTIÓN DE DISPONIBILIDAD Y RESERVAS DE SALAS
--------------------------------------------------------------------------------
/* * CONTEXTO:
 * Este sistema utiliza un modelo de "Borrado Lógico" (soft delete) basado en
 * la columna 'activo'. Para evitar choques de horarios, existe un Índice Único
 * Parcial (uk_reserva_activa) que solo evalúa los registros donde activo = true.
 * * PROPÓSITO DE ESTOS TRIGGERS:
 * Cuando una entidad padre (Sección o Sala) es "eliminada" lógicamente (pasa a false),
 * necesitamos que sus reservas (hijos) también pasen a false automáticamente.
 * Esto "apaga" el Índice Único para esos registros, liberando inmediatamente
 * la sala y el bloque horario para que puedan ser usados por otras secciones,
 * sin perder el historial de ocupación en la base de datos.
 */

-- ==============================================================================
-- LIMPIEZA PREVIA (DROPS)
-- Ejecutar antes de crear para permitir la re-ejecución limpia del script (F5)
-- ==============================================================================
DROP TRIGGER IF EXISTS tr_seccion_limpieza_horarios ON seccion;
DROP TRIGGER IF EXISTS tr_sala_inactiva ON sala;

DROP FUNCTION IF EXISTS fn_limpiar_horarios_seccion();
DROP FUNCTION IF EXISTS fn_limpiar_por_sala_inactiva();



-- ==============================================================================
-- LÓGICA DE LIBERACIÓN POR SECCIÓN ELIMINADA (INACTIVA)
-- ==============================================================================
/*
 * Función: fn_limpiar_horarios_seccion()
 * Descripción: Monitorea las actualizaciones en la tabla 'seccion'. Si detecta que
 * una sección ha sido eliminada lógicamente (cambio de activo de TRUE a FALSE),
 * busca todas las reservas de sala asociadas a esta sección y las desactiva.
 * Resultado: Los bloques horarios que ocupaba esta sección vuelven a estar
 * disponibles para el resto de la universidad.
 */
CREATE OR REPLACE FUNCTION fn_limpiar_horarios_seccion()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Solo actuamos cuando la sección pase de activa (TRUE) a inactiva (FALSE)
    -- 2. Ignoramos los Enums (estado_seccion) como pediste.
    IF (OLD.activo = TRUE AND NEW.activo = FALSE) THEN

        -- En lugar de DELETE, hacemos un UPDATE (Borrado Lógico)
UPDATE reserva_sala
SET activo = FALSE
WHERE id_seccion = NEW.id_seccion
  AND activo = TRUE; -- Solo desactivamos las que aún estén activas

RAISE NOTICE '[AUDITORÍA] Horarios liberados automáticamente por eliminación de la sección ID: %', NEW.id_seccion;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que adjunta la función fn_limpiar_horarios_seccion a la tabla 'seccion'
CREATE TRIGGER tr_seccion_limpieza_horarios
    AFTER UPDATE ON seccion
    FOR EACH ROW
    EXECUTE FUNCTION fn_limpiar_horarios_seccion();


-- ==============================================================================
-- LÓGICA DE LIBERACIÓN POR SALA INACTIVA (MANTENIMIENTO/ELIMINACIÓN)
-- ==============================================================================

/*
 * Función: fn_limpiar_por_sala_inactiva()
 * Descripción: Monitorea la tabla 'sala'. Si una sala se deshabilita lógicamente
 * (por ejemplo, entra en remodelación, clausura o se borra del sistema), esta
 * función busca todas las reservas futuras activas que la involucraban y las
 * pasa a false.
 * Resultado: Previene que el sistema mantenga "bloqueos fantasma" en horarios
 * de una sala que ya no está operativa.
 */
CREATE OR REPLACE FUNCTION fn_limpiar_por_sala_inactiva()
RETURNS TRIGGER AS $$
BEGIN
    -- Detectamos el cambio de activo: de TRUE a FALSE
    IF (OLD.activo = TRUE AND NEW.activo = FALSE) THEN

        -- Cambiamos el estado de las reservas vinculadas a esta sala
UPDATE reserva_sala
SET activo = FALSE
WHERE id_sala = NEW.id_sala
  AND activo = TRUE; -- Solo las que aún estén vigentes

RAISE NOTICE '[AUDITORÍA] Reservas canceladas lógicamente debido a la inhabilitación de la sala ID: %', NEW.id_sala;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que adjunta la función fn_limpiar_por_sala_inactiva a la tabla 'sala'
CREATE TRIGGER tr_sala_inactiva
    AFTER UPDATE ON sala
    FOR EACH ROW
    EXECUTE FUNCTION fn_limpiar_por_sala_inactiva();




/* ====================================================================================
 * FUNCION: generar_solicitudes_masivas
 * DESCRIPCION:
 * Procesa un payload JSON masivo para crear múltiples solicitudes y sus respectivos
 * detalles de insumos de forma transaccional y optimizada.
 * * LOGICA DE NEGOCIO ("El Súper Cálculo"):
 * 1. Multiplicador: Calcula la proporción basada en (cant_inscritos / 20).
 * 2. Deltas:
 * - Ignora los productos listados en el array 'eliminados'.
 * - Sobreescribe las cantidades base de los productos 'modificados'.
 * - Agrega los productos 'nuevos' definidos por el usuario.
 * 3. Reglas de Fracción y Redondeo:
 * - Si el producto admite fracciones (es_fraccionario = true): Guarda hasta 3 decimales.
 * - Si NO admite fracciones (es_fraccionario = false): Aplica CEIL() para redondear hacia arriba.
 * 4. Seguridad: Filtra y omite automáticamente productos con estado inactivo (activo = false).
 * * ESTRUCTURA ESPERADA DEL JSONB (Array de Objetos):
 * [
 * {
 * "idAsignatura": 1, "idSemana": 2, "idReceta": 5, "observacion": "...",
 * "secciones": [
 * { "idSeccion": 101, "idUsuario": 55, "cantInscritos": 25, "horarios": [{...}] }
 * ],
 * "deltas": {
 * "eliminados": [12, 15],
 * "modificados": [{ "idDetalleReceta": 8, "cantProducto": 3.5 }],
 * "nuevos": [{ "idProducto": 42, "cantProducto": 1.0 }]
 * }
 * }
 * ]
 * * RETORNO:
 * - total_solicitudes (OUT): Cantidad de cabeceras insertadas.
 * - total_detalles (OUT): Cantidad total de productos procesados e insertados.
 * ==================================================================================== */


DROP FUNCTION IF EXISTS generar_solicitudes_masivas(JSONB);

CREATE OR REPLACE FUNCTION generar_solicitudes_masivas(
    p_payload JSONB,
    p_solicitud_id_existente INTEGER DEFAULT NULL,
    OUT total_solicitudes INTEGER,
    OUT total_detalles INTEGER
)
AS $$
DECLARE
    -- Variables para el Loop Externo (Lista de MassiveSolicitationDTO)
v_solicitud_masiva JSONB;
    v_id_receta INTEGER;
    v_observacion_general TEXT; -- <---(solicitud)

    -- Variables para el Loop Interno (Lista de secciones)
    v_seccion JSONB;
    v_id_seccion INTEGER;
    v_id_usuario INTEGER;
    v_cant_inscritos INTEGER;
    v_fecha_solicitada DATE;
    v_id_reserva_sala INTEGER;
    v_multiplicador NUMERIC(10, 4);

    v_id_solicitud INTEGER;
    v_filas_insertadas INTEGER;
BEGIN
    -- Inicializamos los contadores de salida
    total_solicitudes := 0;
    total_detalles := 0;

    -- =========================================================================
    -- LOOP EXTERNO: Recorremos el Array de MassiveSolicitationDTO
    -- =========================================================================
FOR v_solicitud_masiva IN SELECT * FROM jsonb_array_elements(p_payload)
                                            LOOP
                                        -- Extraemos los datos generales de ESTA asignatura/receta específica
    v_id_receta := (v_solicitud_masiva->>'idReceta')::INTEGER;
-- Extraemos la observación general para toda la solicitud
v_observacion_general := v_solicitud_masiva->>'observacionesGenerales';

        -- =========================================================================
        -- LOOP INTERNO: Recorremos las secciones de ESTA solicitud masiva
        -- =========================================================================
FOR v_seccion IN SELECT * FROM jsonb_array_elements(v_solicitud_masiva->'secciones')
                                   LOOP
    v_id_seccion := (v_seccion->>'idSeccion')::INTEGER;
v_id_usuario := (v_seccion->>'idUsuario')::INTEGER;
            v_cant_inscritos := (v_seccion->>'cantInscritos')::INTEGER;

            -- Tomamos la fecha del primer horario de esta sección
            v_fecha_solicitada := (v_seccion->'horarios'->0->>'fechaSolicitadaCalculada')::DATE;

            --  Extraemos el id de la reserva del primer horario enviado en el JSON
            v_id_reserva_sala := (v_seccion->'horarios'->0->>'idReservaSala')::INTEGER;

            -- CÁLCULO #1: El Multiplicador
            v_multiplicador := v_cant_inscritos / 20.0;

            -- Insertamos la Cabecera de la Solicitud
INSERT INTO solicitud (
    id_usuario_gestor_solicitud,
    id_seccion,
    id_pedido_semana_bodega,
    id_reserva_sala,
    fecha_solicitada,
    observaciones,
    estado_solicitud
) VALUES (
             v_id_usuario,
             v_id_seccion,
             v_id_receta,
             v_id_reserva_sala,
             v_fecha_solicitada,
             v_observacion_general,
             'PENDIENTE'
         ) RETURNING id_solicitud INTO v_id_solicitud;

-- Sumamos 1 al contador de solicitudes
total_solicitudes := total_solicitudes + 1;

            -- INSERTAMOS LOS DETALLES (Productos), Filtros, Fracciones y Redondeo
INSERT INTO detalle_solicitud (
    id_solicitud,
    id_producto,
    cant_producto_solicitud,
    observacion
)
SELECT
    v_id_solicitud,
    fp.id_producto,
    -- REDONDEO SEGÚN EL TIPO DE UNIDAD
    CASE
        WHEN u.es_fraccionario = true THEN
            (fp.cant_base * v_multiplicador)::NUMERIC(10,3)
                    ELSE
                        CEIL(fp.cant_base * v_multiplicador)::NUMERIC(10,3)
END,
				fp.observacion --<--- Variable extraída por cada producto
            FROM (
                -- BLOQUE A: Base intacta
                SELECT
					dr.id_producto,
					dr.cant_producto AS cant_base,
					dr.observacion
                FROM detalle_pedido_semana_bodega dr
                WHERE v_id_receta IS NOT NULL
                  AND dr.id_pedido_semana_bodega = v_id_receta
                  AND NOT EXISTS (
                      SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_solicitud_masiva->'deltas'->'eliminados', '[]'::jsonb)) e
                      WHERE CASE
                          WHEN p_solicitud_id_existente IS NOT NULL THEN
                              EXISTS (
                                  SELECT 1 FROM detalle_solicitud ds
                                  WHERE ds.id_solicitud = p_solicitud_id_existente
                                    AND ds.id_detalle_solicitud = e::INTEGER
                              )
                          ELSE
                              e::INTEGER = dr.id_detalle_pedido_semana
                      END
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM jsonb_array_elements(COALESCE(v_solicitud_masiva->'deltas'->'modificados', '[]'::jsonb)) m
                      WHERE (m->>'idDetalleReceta')::INTEGER = dr.id_detalle_pedido_semana
                  )

                UNION ALL

                -- BLOQUE B: Modificados
                SELECT
					 dr.id_producto,
					(m->>'cantProducto')::NUMERIC AS cant_base,
					 CASE
					   WHEN m->>'observacion' IS NOT NULL THEN m->>'observacion'
					   ELSE dr.observacion
					 END AS observacion
                FROM jsonb_array_elements(COALESCE(v_solicitud_masiva->'deltas'->'modificados', '[]'::jsonb)) m
                JOIN detalle_pedido_semana_bodega dr ON dr.id_detalle_pedido_semana = (m->>'idDetalleReceta')::INTEGER
                WHERE v_id_receta IS NOT NULL

                UNION ALL

                -- BLOQUE C: Nuevos
                SELECT
					(n->>'idProducto')::INTEGER,
					(n->>'cantProducto')::NUMERIC AS cant_base,
					 n->>'observacion' AS observacion
                FROM jsonb_array_elements(COALESCE(v_solicitud_masiva->'deltas'->'nuevos', '[]'::jsonb)) n

            ) AS fp
            JOIN producto p ON p.id_producto = fp.id_producto
            JOIN unidad_medida u ON u.id_unidad = p.id_unidad
            WHERE p.activo = true;

            -- Obtenemos cuántos detalles reales se insertaron en este ciclo y sumamos al total
GET DIAGNOSTICS v_filas_insertadas = ROW_COUNT;
total_detalles := total_detalles + v_filas_insertadas;

END LOOP; -- Fin Loop Interno (Secciones)
END LOOP; -- Fin Loop Externo (Asignaturas/Recetas)
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- TRIGGER: Limpieza automática de motivo_rechazo_solicitud
-- al cambiar estado desde RECHAZADA a cualquier otro estado
-- =====================================================

-- Función del trigger
CREATE OR REPLACE FUNCTION fn_limpiar_motivo_al_cambiar_estado()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la solicitud cambia DESDE RECHAZADA hacia cualquier otro estado,
    -- eliminar el motivo de rechazo vinculado
    IF OLD.estado_solicitud = 'RECHAZADA' AND NEW.estado_solicitud != 'RECHAZADA' THEN
DELETE FROM motivo_rechazo_solicitud WHERE id_solicitud = NEW.id_solicitud;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger asociado a la tabla solicitud
CREATE TRIGGER trg_limpiar_motivo_rechazo
    AFTER UPDATE OF estado_solicitud ON solicitud
    FOR EACH ROW
    EXECUTE FUNCTION fn_limpiar_motivo_al_cambiar_estado();


-- =====================================================
-- FUNCIÓN: Rechazo automático de solicitudes con fecha vencida
-- Llamar desde el backend (scheduler diario a las 3 AM) o
-- ejecutar manualmente para forzar el proceso.
-- =====================================================

CREATE OR REPLACE FUNCTION rechazar_solicitudes_vencidas()
RETURNS INTEGER AS $$
DECLARE
filas_rechazadas INTEGER;
BEGIN
WITH rechazadas AS (
UPDATE solicitud
SET estado_solicitud = 'RECHAZADA'::estado_solicitud_type
WHERE estado_solicitud = 'PENDIENTE'::estado_solicitud_type
  AND fecha_solicitada < CURRENT_DATE
    RETURNING id_solicitud
    )
INSERT INTO motivo_rechazo_solicitud (id_solicitud, motivo)
SELECT r.id_solicitud, 'Solicitud rechazada automáticamente: la fecha de la clase ha expirado.'
FROM rechazadas r
    ON CONFLICT (id_solicitud) DO NOTHING;

GET DIAGNOSTICS filas_rechazadas = ROW_COUNT;
RETURN filas_rechazadas;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: marcar_pedidos_entregados_por_fecha
-- Transiciona a ENTREGADO los pedidos APROBADOS cuya
-- fecha_fin_pedido ya pasó (semana finalizada).
-- No toca los estados de las solicitudes vinculadas.
-- Invocada por el backend: lazy al cargar entregas diarias
-- + @Scheduled diario a las 03:00 AM.
-- PENDIENTE: trigger de auto-RECHAZADO del pedido
--   (requiere definición de lógica de negocio).
-- =====================================================

DROP FUNCTION IF EXISTS marcar_pedidos_entregados_por_fecha() CASCADE;

CREATE OR REPLACE FUNCTION marcar_pedidos_entregados_por_fecha()
RETURNS INTEGER AS $$
DECLARE
filas_actualizadas INTEGER;
BEGIN
UPDATE pedido
SET estado_pedido = 'ENTREGADO'::estado_pedido_type
WHERE estado_pedido = 'APROBADO'::estado_pedido_type
  AND fecha_fin_pedido < CURRENT_DATE;

GET DIAGNOSTICS filas_actualizadas = ROW_COUNT;
RETURN filas_actualizadas;
END;
$$ LANGUAGE plpgsql;