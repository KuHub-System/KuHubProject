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
DROP CAST  IF EXISTS (varchar AS tipo_abastecimiento);

-- Matamos los fantasmas viejos por si siguen dando vueltas
DROP CAST IF EXISTS (varchar AS estado_receta_type) CASCADE;
DROP CAST IF EXISTS (varchar AS estado_seccion_type) CASCADE;

-- =====================================================
-- ELIMINAR TABLAS HISTORICAS PRIMERO (sin FKs entrantes)
-- =====================================================

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
DROP TABLE IF EXISTS motivo_rechazo_solicitud CASCADE; -- CAMBIADO: Agregado
DROP TABLE IF EXISTS detalle_solicitud CASCADE;
DROP TABLE IF EXISTS solicitud CASCADE;
DROP TABLE IF EXISTS detalle_pedido CASCADE; -- <--- CORREGIDO (era pedido_detalle)
DROP TABLE IF EXISTS pedido CASCADE;
DROP TABLE IF EXISTS semanas CASCADE; -- CAMBIADO: Agregado

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
    ultimo_acceso TIMESTAMP
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
-- TABLAS DE RECETAS
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
-- TABLAS DE ORDEN DE COMPRA (Tarea #13)
-- Se ubican aquí porque dependen de pedido (línea 706),
-- proveedor (línea 529) y producto (línea 407).
-- =====================================================

-- Tabla orden_pedido
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

-- ================================================================
-- SISTEMA DE PERMISOS GRANULARES (CRUD por Rol × Módulo)
-- Basado en la arquitectura de Clover, adaptado a KuHub.
--
-- ORDEN DE EJECUCIÓN:
--   1. Crear tablas (modulo, permiso_rol)
--   2. Insertar módulos del sistema
--   3. Insertar permisos iniciales por rol
--
-- NOTA: Las tablas modulo y permiso_rol son creadas automáticamente
-- por Hibernate (ddl-auto=update) al iniciar el backend.
-- Este script es necesario SOLO para insertar los datos iniciales.
-- Ejecutar DESPUÉS de haber iniciado el backend al menos una vez
-- para que las tablas ya existan.
-- ================================================================


-- ================================================================
-- PASO 1 (OPCIONAL): Crear las tablas manualmente si Hibernate no
-- las creó aún (se pueden omitir si el backend ya las creó)
-- ================================================================

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


-- ================================================================
-- PASO 2: Insertar los módulos del sistema
-- (Los códigos deben coincidir exactamente con los ModuleKey
--  definidos en frontend/src/types/permissions.types.ts)
-- ================================================================

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
    ('GESTION_RECETAS',      'Gestión de Recetas',           'Administración de recetas y preparaciones culinarias','lucide:chef-hat',         9),
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
    CASE WHEN m.codigo_modulo IN ('DASHBOARD','SOLICITUD','GESTION_RECETAS') THEN TRUE ELSE FALSE END,
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
    CASE WHEN m.codigo_modulo IN ('DASHBOARD','SOLICITUD','GESTION_RECETAS') THEN TRUE ELSE FALSE END,
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
-- VERIFICACIÓN: Consultar la matriz completa de permisos
-- (Útil para confirmar que los datos se insertaron correctamente)
-- ================================================================

/*
SELECT
    r.nombre_rol,
    m.codigo_modulo,
    m.nombre_modulo,
    COALESCE(pr.puede_leer,       FALSE) AS leer,
    COALESCE(pr.puede_crear,      FALSE) AS crear,
    COALESCE(pr.puede_actualizar, FALSE) AS actualizar,
    COALESCE(pr.puede_eliminar,   FALSE) AS eliminar,
    CASE
        WHEN COALESCE(pr.puede_crear,FALSE) OR COALESCE(pr.puede_actualizar,FALSE) OR COALESCE(pr.puede_eliminar,FALSE) THEN 'ESCRITURA'
        WHEN COALESCE(pr.puede_leer,FALSE) THEN 'LECTURA'
        ELSE 'SIN_ACCESO'
    END AS nivel_acceso
FROM rol r
CROSS JOIN modulo m
LEFT JOIN permiso_rol pr
    ON pr.id_rol    = r.id_rol
   AND pr.id_modulo = m.id_modulo
   AND pr.enabled   = TRUE
WHERE r.activo   = TRUE
  AND m.enabled  = TRUE
ORDER BY m.orden_modulo, r.id_rol;
*/


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
-- ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ADMINISTRADOR' LIMIT 1), id_modulo, TRUE, TRUE, TRUE, TRUE
FROM modulo WHERE codigo_modulo = 'HISTORIAL_MOVIMIENTOS' AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- CO-ADMINISTRADOR → acceso total
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'CO_ADMINISTRADOR' LIMIT 1), id_modulo, TRUE, TRUE, TRUE, TRUE
FROM modulo WHERE codigo_modulo = 'HISTORIAL_MOVIMIENTOS' AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=TRUE;

-- ENCARGADO DE BODEGA → escritura (registra y ve movimientos)
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ENCARGADO_BODEGA' LIMIT 1), id_modulo, TRUE, TRUE, TRUE, FALSE
FROM modulo WHERE codigo_modulo = 'HISTORIAL_MOVIMIENTOS' AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=FALSE;

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
-- MÓDULO: GESTION_PEDIDOS_DIARIOS
-- Sub-sección dentro de Bodega de Tránsito (vista 'pedidos' en bodega-transito.tsx)
-- ================================================================

INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)
VALUES ('GESTION_PEDIDOS_DIARIOS', 'Gestión de Pedidos Diarios',
        'Planificación y seguimiento de armado de carros para clases',
        'lucide:shopping-cart', 10)
ON CONFLICT (codigo_modulo) DO NOTHING;

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
-- ENCARGADO DE BODEGA → acceso a Bodega de Tránsito (vista de inventario de bodega)
-- ================================================================

INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)
SELECT (SELECT id_rol FROM rol WHERE nombre_rol = 'ENCARGADO_BODEGA' LIMIT 1), id_modulo, TRUE, TRUE, TRUE, FALSE
FROM modulo WHERE codigo_modulo = 'BODEGA_TRANSITO' AND enabled = TRUE
ON CONFLICT (id_rol, id_modulo) DO UPDATE SET puede_leer=TRUE, puede_crear=TRUE, puede_actualizar=TRUE, puede_eliminar=FALSE;


-- ================================================================
-- ROLLBACK (si necesitas deshacer los inserts de permisos):
-- ================================================================

/*
DELETE FROM permiso_rol;
DELETE FROM modulo;
-- (Las tablas quedan vacías pero intactas para re-insertar)
*/

-- =====================================================
-- INDICES PARA OPTIMIZACION DE RENDIMIENTO
-- =====================================================

-- Indices en usuario
CREATE INDEX idx_usuario_rol ON usuario(id_rol);
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_usuario_username ON usuario(username); 
CREATE UNIQUE INDEX idx_usuario_email_activo ON usuario(email) WHERE (activo = true);
CREATE UNIQUE INDEX idx_usuario_username_activo ON usuario(username) WHERE (activo = true);

-- Indices en usuario refresh token
CREATE INDEX idx_refresh_token_string ON refresh_token(token);
CREATE INDEX idx_refresh_token_usuario ON refresh_token(id_usuario);

-- Indices en bloques horarios
CREATE INDEX idx_bloque_numero ON bloque_horario(numero_bloque);

-- Indices en secciones y asignaturas
CREATE INDEX idx_seccion_asignatura ON seccion(id_asignatura);
CREATE INDEX idx_asignatura_codigo ON asignatura(cod_asignatura);

-- Indices en sala
CREATE INDEX idx_sala_codigo ON sala(cod_sala);

-- Indices en reserva_sala
CREATE INDEX idx_reserva_seccion ON reserva_sala(id_seccion);
CREATE INDEX idx_reserva_sala_sala ON reserva_sala(id_sala);
CREATE INDEX idx_reserva_bloque ON reserva_sala(id_bloque);
CREATE INDEX idx_reserva_dia_bloque ON reserva_sala(dia_semana, id_bloque);
CREATE INDEX idx_reserva_seccion_activa ON reserva_sala(id_seccion, activo);
-- Creamos un índice que solo actúa sobre los activos
CREATE UNIQUE INDEX uk_reserva_activa
ON reserva_sala (id_sala, dia_semana, id_bloque)
WHERE (activo = true);
CREATE UNIQUE INDEX uk_seccion_dia_bloque_activa
ON reserva_sala (id_seccion, dia_semana, id_bloque)
WHERE (activo = true);

-- Indices en docente_seccion
CREATE INDEX idx_docente_seccion_usuario ON docente_seccion(id_usuario);
CREATE INDEX idx_docente_seccion_seccion ON docente_seccion(id_seccion);
CREATE INDEX idx_docente_seccion_fecha ON docente_seccion(fecha_asignacion);

-- Indices en asignatura_profesor_cargo
CREATE INDEX idx_apc_id_asignatura ON asignatura_profesor_cargo(id_asignatura);
CREATE INDEX idx_apc_id_usuario ON asignatura_profesor_cargo(id_usuario);
CREATE UNIQUE INDEX idx_apc_unico_asignatura_usuario ON asignatura_profesor_cargo(id_asignatura, id_usuario);

-- Indices en asignatura
CREATE INDEX idx_asignatura_activo ON asignatura(activo);

-- Indices en seccion
CREATE INDEX idx_seccion_estado_activo ON seccion(estado_seccion, activo);

-- Indices en inventario , productos , categorias y unidad
CREATE INDEX idx_inventario_producto ON inventario(id_producto);
CREATE INDEX idx_producto_codigo ON producto(cod_producto);
CREATE INDEX idx_inventario_activo ON inventario(activo);
CREATE INDEX idx_producto_categoria ON producto(id_categoria);
CREATE INDEX idx_producto_unidad ON producto(id_unidad);

-- Indices en movimientos
CREATE INDEX idx_movimiento_usuario ON movimiento(id_usuario);
CREATE INDEX idx_movimiento_fecha ON movimiento(fecha_movimiento);
CREATE INDEX idx_movimiento_tipo ON movimiento(tipo_movimiento);
CREATE INDEX idx_movimiento_inventario ON movimiento (id_inventario);

-- Indices en proveedores
--CREATE INDEX idx_provedor_producto ON provedor(id_producto);
--CREATE INDEX idx_provedor_estado ON provedor(estado_provedor);
CREATE INDEX idx_pp_producto_precio_optimo
ON proveedor_producto (id_producto, precio_neto ASC)
WHERE activo = TRUE;

-- Versioning de precios: acelera DISTINCT ON por (id_proveedor, id_producto)
-- ordenado por fecha_actualizacion DESC (usado en findProductosPorProveedor y
-- findProductosPorProveedorHastaFecha).
CREATE INDEX idx_pp_version_reciente
ON proveedor_producto (id_proveedor, id_producto, fecha_actualizacion DESC);

-- Indices de Orden Pedido (Tarea #13 + #27)
-- idx_op_pedido + idx_op_proveedor: parciales por activo=TRUE, aceleran el
--   EXISTS de "¿tiene OP?" y los listados por proveedor.
-- idx_dop_orden: acelera el JOIN orden_pedido → detalle_orden_pedido.
-- idx_op_estado: filtra OPs por estado (Tarea #27).
-- idx_eop_fecha_entrega: acelera consultas de entregas por fecha (Tarea #27).
CREATE INDEX idx_op_pedido         ON orden_pedido (id_pedido)             WHERE activo = TRUE;
CREATE INDEX idx_op_proveedor      ON orden_pedido (id_proveedor)          WHERE activo = TRUE;
CREATE INDEX idx_op_estado         ON orden_pedido (estado_orden_pedido)   WHERE activo = TRUE;
CREATE INDEX idx_dop_orden         ON detalle_orden_pedido (id_orden_pedido);
CREATE INDEX idx_dop_fecha_entrega ON detalle_orden_pedido (fecha_entrega) WHERE activo = TRUE;

-- Indices en bodega_transito
--CREATE INDEX idx_bodega_transito_producto ON bodega_transito(id_producto);
--CREATE INDEX idx_bodega_transito_provedor ON bodega_transito(id_provedor);
--CREATE INDEX idx_bodega_transito_estado ON bodega_transito(estado_bodega_transito);
CREATE INDEX idx_bodega_transito_inventario ON bodega_transito(id_inventario);
CREATE INDEX idx_bodega_transito_activo ON bodega_transito(activo);

-- Indices en recetas
CREATE INDEX idx_pedido_semana_bodega_estado ON pedido_semana_bodega(estado_pedido);
CREATE INDEX idx_detalle_pedido_semana_padre ON detalle_pedido_semana_bodega(id_pedido_semana_bodega);
CREATE INDEX idx_detalle_pedido_semana_producto ON detalle_pedido_semana_bodega(id_producto);
CREATE INDEX idx_pedido_semana_asignatura ON pedido_semana_bodega(id_asignatura);

-- Índices en pedidos
CREATE INDEX idx_pedido_estado ON pedido(estado_pedido);
CREATE INDEX idx_pedido_fecha_inicio ON pedido(fecha_inicio_pedido);
CREATE INDEX idx_pedido_fecha_registro ON pedido(fecha_registro);
CREATE INDEX idx_detalle_pedido_fk ON detalle_pedido(id_pedido);
CREATE INDEX idx_detalle_pedido_prod ON detalle_pedido(id_producto);

-- Índices en solicitudes
CREATE INDEX idx_solicitud_gestor ON solicitud(id_usuario_gestor_solicitud);
CREATE INDEX idx_solicitud_seccion ON solicitud(id_seccion);
CREATE INDEX idx_solicitud_fecha ON solicitud(fecha_solicitada);

-- Índices en detalle_solicitud (Simplificado)
CREATE INDEX idx_detalle_solicitud_fk_solicitud ON detalle_solicitud(id_solicitud);
CREATE INDEX idx_detalle_solicitud_producto ON detalle_solicitud(id_producto);

-- Índices en pedido_solicitud (Simplificado)
CREATE INDEX idx_pedido_solicitud_pedido ON pedido_solicitud(id_pedido);
CREATE INDEX idx_pedido_solicitud_fk_solicitud ON pedido_solicitud(id_solicitud);
CREATE INDEX idx_pedido_solicitud_fecha ON pedido_solicitud(fecha_union_registro);

-- =====================================================
-- FIN DEL SCRIPT CREACION TABLAS
-- =====================================================


-- =====================================================
-- SCRIPT DE INSERCIONES INICIALES - KubHub
-- =====================================================
-- Este script debe ejecutarse DESPUÉS de crear la estructura de la base de datos
-- =====================================================

/*
-- =====================================================
-- 2. INSERTAR USUARIOS SE CREA EN SWAGGER LOS DATOS, DEBIDO AL PASS INCRIPTADO
-- =====================================================
*/

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
crypt('fbi123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),

(1, 'Darwin', '', 'Morales', '', 'dmorales@duoc.cl', 'dmorales@duoc.cl',
crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),

(1, 'Milla', '', 'Bernales', '', 'mi@duoc.cl', 'mi@duoc.cl',
crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),


-- 8. Sofia Morales (Usa clave docente1234)
(5, 'Sofia', 'Elena', 'Morales', 'Rojas', 'sofia.moraleshash@kuhub.cl', 's.moraleshash',
crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),

-- 9. Javier Fuentes (Usa clave docente1234)
(5, 'Javier', 'Andres', 'Fuentes', 'Ortega', 'javier.fuenteshash@kuhub.cl', 'j.fuenteshash',
crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),

-- 10. Carmen Jimenez (Usa clave docente1234)
(5, 'Carmen', 'Rosa', 'Jimenez', 'Navarro', 'carmen.jimenezhash@kuhub.cl', 'c.jimenezhash',
crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL);

INSERT INTO usuario (id_rol, p_nombre, s_nombre, app_paterno, app_materno, email, username, contrasena, url_foto_perfil, activo, fecha_creacion, ultimo_acceso)
VALUES
-- 11-20: Docentes Adicionales (Rol 5)
(5, 'Ricardo', 'Antonio', 'Vargas', 'Pinto', 'ricardo.vargas@kuhub.cl', 'r.vargas', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Valentina', 'Paz', 'Castro', 'Soto', 'valentina.castro@kuhub.cl', 'v.castro', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Mauricio', 'Ignacio', 'Tapia', 'Lara', 'mauricio.tapia@kuhub.cl', 'm.tapia', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Beatriz', 'Isabel', 'Sepulveda', 'Duran', 'beatriz.sepulveda@kuhub.cl', 'b.sepulveda', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Gonzalo', 'Andres', 'Reyes', 'Torres', 'gonzalo.reyes@kuhub.cl', 'g.reyes', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Natalia', 'Andrea', 'Munoz', 'Silva', 'natalia.munoz@kuhub.cl', 'n.munoz', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Fernando', 'Jose', 'Perez', 'Herrera', 'fernando.perez@kuhub.cl', 'f.perez', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Camila', 'Fernanda', 'Araya', 'Diaz', 'camila.araya@kuhub.cl', 'c.araya', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Hugo', 'Patricio', 'Contreras', 'Vivanco', 'hugo.contreras@kuhub.cl', 'h.contreras', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Loreto', 'Alejandra', 'Salinas', 'Gomez', 'loreto.salinas@kuhub.cl', 'l.salinas', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),

-- 21-30: Asistentes de Bodega (Rol 7)
(7, 'Esteban', 'Manuel', 'Toledo', 'Riquelme', 'esteban.toledo@kuhub.cl', 'e.toledo', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(7, 'Maria', 'Jose', 'Villalobos', 'Pena', 'maria.villalobos@kuhub.cl', 'm.villalobos', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(7, 'Cristian', 'Eduardo', 'Valenzuela', 'Caceres', 'cristian.valenzuela@kuhub.cl', 'c.valenzuela', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(7, 'Daniela', 'Ignacia', 'Espinoza', 'Bravo', 'daniela.espinoza@kuhub.cl', 'd.espinoza', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(7, 'Jorge', 'Luis', 'Santibanez', 'Alarcon', 'jorge.santibanez@kuhub.cl', 'j.santibanez', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(7, 'Paula', 'Ximena', 'Maturana', 'Ossa', 'paula.maturana@kuhub.cl', 'p.maturana', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(7, 'Rodrigo', 'Alexis', 'Sandoval', 'Bustos', 'rodrigo.sandoval@kuhub.cl', 'r.sandoval', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(7, 'Andrea', 'Carolina', 'Godoy', 'Riveros', 'andrea.godoy@kuhub.cl', 'a.godoy', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(7, 'Marcelo', 'Fabian', 'Gajardo', 'Zuniga', 'marcelo.gajardo@kuhub.cl', 'm.gajardo', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(7, 'Francisca', 'Javiera', 'Correa', 'Figueroa', 'francisca.correa@kuhub.cl', 'f.correa', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),

-- 31-40: Profesores a Cargo (Rol 4) y Docentes (Rol 5)
(4, 'Alvaro', 'Sebastian', 'Leiva', 'Gallegos', 'alvaro.leiva@kuhub.cl', 'a.leiva', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(4, 'Monica', 'Elizabeth', 'Farias', 'Donoso', 'monica.farias@kuhub.cl', 'm.farias', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(4, 'Patricio', 'Ivan', 'Vidal', 'Urrutia', 'patricio.vidal@kuhub.cl', 'p.vidal', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Susana', 'del Carmen', 'Aguilar', 'Poblete', 'susana.aguilar@kuhub.cl', 's.aguilar', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Gabriel', 'Enrique', 'Miranda', 'Escobar', 'gabriel.miranda@kuhub.cl', 'g.miranda', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Rosa', 'Elvira', 'Maldonado', 'Olivares', 'rosa.maldonado@kuhub.cl', 'r.maldonado', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Felipe', 'Andres', 'Soto', 'Meza', 'felipe.soto@kuhub.cl', 'f.soto', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Claudia', 'Patricia', 'Palma', 'Rojas', 'claudia.palma@kuhub.cl', 'c.palma', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Victor', 'Hugo', 'Vergara', 'Nunez', 'victor.vergara@kuhub.cl', 'v.vergara', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Elena', 'Victoria', 'Cid', 'Loyola', 'elena.cid@kuhub.cl', 'e.cid', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),

-- 41-50: Gestores (Rol 3) y Co-Admins (Rol 2)
(3, 'Luis', 'Alberto', 'Guzman', 'Lorca', 'luis.guzman@kuhub.cl', 'l.guzman', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(3, 'Teresa', 'Angélica', 'Orellana', 'Salas', 'teresa.orellana@kuhub.cl', 't.orellana', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(3, 'Raul', 'Segundo', 'Vera', 'Beltran', 'raul.vera@kuhub.cl', 'r.vera', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(2, 'Isabel', 'Margarita', 'Zamora', 'Villarroel', 'isabel.zamora@kuhub.cl', 'i.zamora', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(2, 'Hernan', 'Felipe', 'Uribe', 'Saavedra', 'hernan.uribe@kuhub.cl', 'h.uribe', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Cecilia', 'Lorena', 'Gallardo', 'Acuna', 'cecilia.gallardo@kuhub.cl', 'c.gallardo', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Oscar', 'Andres', 'Parra', 'Mendoza', 'oscar.parra@kuhub.cl', 'o.parra', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(5, 'Silvia', 'Adriana', 'Cortes', 'Flores', 'silvia.cortes@kuhub.cl', 's.cortes', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(7, 'Andres', 'Eduardo', 'Medina', 'Prado', 'andres.medina@kuhub.cl', 'a.medina', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL),
(7, 'Gloria', 'Esther', 'Bernal', 'Cifuentes', 'gloria.bernal@kuhub.cl', 'g.bernal', crypt('admin123', gen_salt('bf', 10)), NULL, true, CURRENT_TIMESTAMP, NULL);


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

-- =====================================================
-- 3. INSERTAR ASIGNATURAS
-- =====================================================

INSERT INTO asignatura (cod_asignatura, nombre_asignatura, activo) VALUES
('BMD-01', 'Bollería y Masas Dulces', true),
('CPC-01', 'Cocina para Casino', true),
('PES-01', 'Panadería Especializada', true),
('TGA-01', 'Tendencias Gastronómicas', true),
('PMA-01', 'Pastelería de Masas de Azúcar', true),
('CCS-01', 'Cocina Chilena y Servicio Comedor Avanzado', true),
('SCA-01', 'Salón Comedor Avanzado y Cocina Chilena', true),
('TAS-01', 'Técnicas Avanzadas de Servicio', true);

-- =====================================================
-- 4. INSERTAR asignatura_profesor_cargo
-- =====================================================
INSERT INTO asignatura_profesor_cargo (id_asignatura, id_usuario)
VALUES
(1, 4),  -- Bollería y Masas Dulces
(2, 4),  -- Cocina para Casino
(3, 4),  -- Panadería Especializada
(4, 5),  -- Tendencias Gastronómicas
(5, 5),  -- Pastelería de Masas de Azúcar
(6, 5);  -- Cocina Chilena y Servicio Comedor Avanzado

-- =====================================================
-- 5. INSERTAR SALAS
-- =====================================================
INSERT INTO sala (cod_sala, nombre_sala, activo) VALUES
('LG1', '402', true),
('LG2', '403', true),
('LG3', '404', true),
('LG4', '405', true),
('406', '406', true),
('LG5', '308', true),
('RST', '401', true),
('SALON GASTRONOMIA', 'GASTRONOMIA', true),
('SALON TURISMO', 'TURISMO', true),
('CATA', 'CATA', true);

-- =====================================================
-- 6. INSERTAR SECCIONES
-- =====================================================
INSERT INTO seccion ( id_asignatura, nombre_seccion, capacidad_max, cant_inscritos)VALUES
( 1, '001', 30, 25),
( 1, '002', 30, 28),
( 1, '003', 30, 22),
( 2, '001', 25, 20),
( 2, '002', 25, 18),
( 3, '001', 35, 30),
( 3, '002', 35, 32),
( 4, '001', 30, 26),
( 4, '002', 30, 24);

-- =====================================================
-- 7. INSERTAR RESERVAS DE SALA
-- =====================================================
INSERT INTO reserva_sala ( id_seccion, id_sala, dia_semana, id_bloque) VALUES
( 1, 1, 'LUNES', 1),
( 1, 1, 'LUNES', 2),
( 1, 1, 'MIERCOLES', 3),
( 2, 2, 'MARTES', 5),
( 2, 2, 'JUEVES', 5),
( 3, 3, 'VIERNES', 10),
( 4, 1, 'LUNES', 7),
( 4, 1, 'MIERCOLES', 7),
( 5, 4, 'MARTES', 12),
( 6, 5, 'LUNES', 15),
( 6, 5, 'MIERCOLES', 15),
( 7, 3, 'JUEVES', 18),
( 8, 2, 'MARTES', 9),
( 9, 4, 'VIERNES', 14);

-- =====================================================
-- 8. INSERTAR ASIGNACIONES DOCENTE-SECCION
-- =====================================================
INSERT INTO docente_seccion ( id_usuario, id_seccion)VALUES
(8, 1),
(8, 4),
(9, 2),
(9, 6),
(10, 3),
(10, 8);

-- =====================================================
-- 9. INSERTAR PRODUCTOS (Desde documento proporcionado)
-- =====================================================

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


--CATEGORIA: Abarrotes segun cliente exactamente igual al del cliente
INSERT INTO producto (nombre_producto, id_categoria, id_unidad, activo) VALUES
('Aceite De Canola', 1, 3, true),
('Aceite De Coco', 1, 2, true),
('Aceite De Maiz', 1, 3, true),
('Aceite De Maní', 1, 3, true),
('Aceite De Maravilla', 1, 3, true),
('Aceite De Oliva', 1, 3, true),
('Aceite De Oliva Huasco (Premium)', 1, 3, true),
('Aceite De Palta', 1, 3, true),
('Aceite De Pepita De Uva', 1, 3, true),
('Aceite De Sesamo', 1, 3, true),
('Aceite De Trufa', 1, 3, true),
('Aceite Vegetal', 1, 3, true),
('Aceituna Amarga Sevillana', 1, 2, true),
('Aceituna Morada Amarga', 1, 2, true),
('Aceituna Negra Azapa', 1, 2, true),
('Aceituna Negra Con Carozo', 1, 2, true),
('Aceituna Negra Sin Carozo', 1, 2, true),
('Aceituna Verde Rellena Pimenton', 1, 2, true),
('Aceituna Verde Sin Carozo', 1, 2, true),
('Aceto Balsamico', 1, 3, true),
('Acido Citrico', 1, 2, true),
('Agar Agar', 1, 2, true),
('Agua De Azahar', 1, 3, true),
('Aji Cacho Cabra Deshidratado', 1, 2, true),
('Aji Chileno Rojo Don Juan', 1, 2, true),
('Ají Color', 1, 2, true),
('Ají Nomoto', 1, 2, true),
('Ají Oro', 1, 2, true),
('Ají Panca Pasta Amarillo 207 Gr', 1, 1, true),
('Ají Panca Pasta Rojo 207 Gr', 1, 1, true),
('Ají Panca Rojo Deshidratado Con Pepas', 1, 2, true),
('Aji Rocoto En Polvo', 1, 2, true),
('Ají Shishimi', 1, 2, true),
('Ajo En Polvo', 1, 2, true),
('Albumina', 1, 2, true),
('Alcachofas Baby Corazon 280 Gr', 1, 1, true),
('Alcaparras (600grs Drenado)', 1, 2, true),
('Alga Kombu 150 Grs', 1, 1, true),
('Alga Luche 30 Grs', 1, 2, true),
('Algarrobo En Polvo', 1, 2, true),
('Alginato', 1, 2, true),
('Aliño Completo', 1, 2, true),
('Almendras Confitadas', 1, 2, true),
('Almendras Efiladas', 1, 2, true),
('Almendras Enteras', 1, 2, true),
('Almidon De Maiz / Maicena Bolsa 1 Kg', 1, 2, true),
('Almidon De Tapioca / Mandioca', 1, 2, true),
('Anchoas 140 Gr', 1, 1, true),
('Anis En Polvo', 1, 2, true),
('Anis Entero', 1, 2, true),
('Anís Estrellado', 1, 2, true),
('Anís Semilla', 1, 2, true),
('Arroz Arboreo / Risotto', 1, 2, true),
('Arroz Grado 1', 1, 2, true),
('Arroz Grado 2', 1, 2, true),
('Arroz Integral', 1, 2, true),
('Arroz Paella', 1, 2, true),
('Arroz Para Sushi', 1, 2, true),
('Arroz Pregraneado', 1, 2, true),
('Arvejas Partidas', 1, 2, true),
('Atún Lomito Tarro 104 Gr', 1, 1, true),
('Avellana Europea', 1, 2, true),
('Avellana Tostada Chilena', 1, 2, true),
('Avena Instantanea Copos', 1, 2, true),
('Avena Hojuelas', 1, 2, true),
('Avena Integral', 1, 2, true),
('Avena Machacada 0,7 Grs', 1, 2, true),
('Azafrán 0,05 Gr', 1, 1, true),
('Azúcar De Caña Orgánica', 1, 2, true),
('Azúcar De Coco', 1, 2, true),
('Azúcar Dorada Orgánica', 1, 2, true),
('Azúcar En Cubos 500 Gr - 100 Cubitos', 1, 1, true),
('Azúcar Flor Iansa 1 Kg', 1, 2, true),
('Azúcar Granulada Blanca Iansa 1 Kg', 1, 2, true),
('Azucar Invertida', 1, 3, true),
('Azúcar Mascavo Orgánica 250 Gr', 1, 2, true),
('Azúcar Morena 1 Kg', 1, 2, true),
('Azúcar Negra 500 Gr', 1, 2, true),
('Azúcar Panela Granulada 400 Gr', 1, 2, true),
('Azúcar Rubia Iansa 1 Kg', 1, 2, true),
('Barquillos De Helado Caja 10 Un', 1, 1, true),
('Base Para Hamburguesas 90 Gr', 1, 1, true),
('Base Para Helados', 1, 2, true),
('Base Para Helados Con Alcohol', 1, 2, true),
('Base Para Helado De Agua', 1, 2, true),
('Base Para Helado De Leche', 1, 2, true),
('Bicarbonato', 1, 2, true),
('Bolsa Infusion De Boldo', 1, 1, true),
('Cacao Alcalino Callebaut', 1, 2, true),
('Cacao Alcalino Normal', 1, 2, true),
('Cacao Amargo Polvo (Bolsa 300 Gr)', 1, 2, true),
('Cacao Dulce En Polvo', 1, 2, true),
('Café En Grano', 1, 2, true),
('Café En Grano Molido', 1, 2, true),
('Café Nescafe Instantaneo', 1, 2, true),
('Caldo De Verduras En Polvo 48 Gr', 1, 1, true),
('Callampas Deshidratadas', 1, 2, true),
('Canela En Polvo', 1, 2, true),
('Canela En Rama', 1, 2, true),
('Canoas De Masa', 1, 1, true),
('Cardamomo En Polvo', 1, 2, true),
('Cardamomo Semilla', 1, 2, true),
('Carne / Proteina De Soya 300 Grs', 1, 2, true),
('Castañas De Caju', 1, 2, true),
('Castañas En Almibar', 1, 1, true),
('Caviar Rojo Lumpfish 100 Gr', 1, 1, true),
('Cebolla En Escabeche', 1, 2, true),
('Cebolla Frita / En Polvo', 1, 2, true),
('Cebolla Perla', 1, 2, true),
('Cereal Hojuelas 480 Grs', 1, 2, true),
('Cereal Natur Arroz 300 Gr', 1, 2, true),
('Cereza Acida S/Carozo', 1, 2, true),
('Cerezas Al Jugo (Conserva)', 1, 1, true),
('Champiñon En Conserva 400 Gr', 1, 1, true),
('Chancaca 400 Gr', 1, 1, true),
('Chips Chocolate Blanco Callebaut', 1, 2, true),
('Chips Chocolate Gold Callebaut', 1, 2, true),
('Chips Chocolate Leche Callebaut', 1, 2, true),
('Chips Chocolate Negro 16% Caravella', 1, 2, true),
('Chips Chocolate Organico 60% 200gr Pacari', 1, 1, true),
('Chips Chocolate Ruby Callebaut', 1, 2, true),
('Chocapic 720 Gr', 1, 2, true),
('Chocolate Belcolade Bitter 55%', 1, 2, true),
('Chocolate Belcolade Blanco', 1, 2, true),
('Chocolate Belcolade Leche', 1, 2, true),
('Chocolate Belcolade Bitter 73%', 1, 2, true),
('Chocolate Bitter 93%', 1, 2, true),
('Chocolate Sticks Valrhona', 1, 2, true),
('Chumbeque', 1, 2, true),
('Chuño', 1, 2, true),
('Ciruela Sin Carozo', 1, 2, true),
('Citrato De Sodio', 1, 2, true),
('Clavo De Olor Entero', 1, 2, true),
('Clavo De Olor Molido', 1, 2, true),
('Cmc', 1, 2, true),
('Cobertura Bitter Ambrosoli', 1, 2, true),
('Cobertura Bitter Carat', 1, 2, true),
('Cobertura Bitter Neucober', 1, 2, true),
('Cobertura Blanca Ambrosoli', 1, 2, true),
('Cobertura Blanca Carat', 1, 2, true),
('Cobertura Blanca Costa', 1, 2, true),
('Cobertura Blanca Neucober', 1, 2, true),
('Cobertura Leche Ambrosoli', 1, 2, true),
('Cobertura Leche Costa', 1, 2, true),
('Cobertura Leche Neucober', 1, 2, true),
('Cobertura Semi Dulce Ambrosoli', 1, 2, true),
('Cochayuyo En Escamas', 1, 2, true),
('Coco En Cubo', 1, 2, true),
('Coco Láminas', 1, 2, true),
('Coco Leche Tarro 400 Ml Deyco', 1, 3, true),
('Coco Rallado', 1, 2, true),
('Colapez Caja 400 Un / 1 Kilo', 1, 1, true),
('Comino En Polvo', 1, 2, true),
('Concentrado De Coco 400 Ml', 1, 1, true),
('Concentrado De Tomate Bolsa 1Kg', 1, 2, true),
('Cono De Helados', 1, 1, true),
('Corazón De Alcachofa 400 Gr', 1, 1, true),
('Corteza De Cacao', 1, 2, true),
('Couscous 500 Gr', 1, 2, true),
('Cranberry Deshidratado', 1, 2, true),
('Crema Acida 200 Gr', 1, 1, true),
('Crema De Choclos 79 Gr', 1, 1, true),
('Crema De Coco (Coco Lopez) Tarro 425gr', 1, 1, true),
('Crema De Coco (Deyco) Tarro 395 Gr', 1, 1, true),
('Crema De Esparragos 68 Gr', 1, 1, true),
('Crema De Leche Colun', 1, 3, true),
('Crema De Tomate', 1, 1, true),
('Crema De Tomates 78 Gr (Parmesano)', 1, 1, true),
('Crema Líquida Bolsa', 1, 3, true),
('Crema Pastelera En Polvo (400 Gr)', 1, 2, true),
('Crema Soprole 35% Grasa', 1, 3, true),
('Crema Vegetal (Collico/Puratos)', 1, 3, true),
('Crema Vegetal Soprole', 1, 3, true),
('Cuajo En Polvo', 1, 2, true),
('Curcuma', 1, 2, true),
('Curry En Polvo', 1, 2, true),
('Curry Salsa Masaman 345 Gr', 1, 1, true),
('Damasco Turco', 1, 2, true),
('Datiles', 1, 2, true),
('Demiglace En Polvo', 1, 2, true),
('Dextrosa', 1, 2, true),
('Discos De Merengue 16 Cms', 1, 1, true),
('Dulce De Membrillo 1 Kg', 1, 2, true),
('Durazno Cubitos 340 Gr', 1, 1, true),
('Durazno Mitades 340 Gr', 1, 1, true),
('Durazno Mitades 820 Gr', 1, 1, true),
('Endulzante Sachet', 1, 1, true),
('Endulzante Stevia Líquido 270 Cc', 1, 1, true),
('Enebro En Bayas', 1, 2, true),
('Eneldo', 1, 2, true),
('Esencia De Anis', 1, 2, true),
('Esencia De Almendra 50 Cc', 1, 1, true),
('Esencia De Azahar 25 Ml', 1, 1, true),
('Esencia De Canela 25 Ml', 1, 1, true),
('Esencia De Coco 25 Ml', 1, 1, true),
('Esencia De Chocolate 25 Ml', 1, 1, true),
('Esencia De Frambuesa 25 Ml', 1, 1, true),
('Esencia De Frutilla 25 Ml', 1, 1, true),
('Esencia De Guinda 25 Ml', 1, 1, true),
('Esencia De Limon 25 Ml', 1, 1, true),
('Esencia De Manzana 25 Ml', 1, 1, true),
('Esencia De Menta 25 Ml', 1, 1, true),
('Esencia De Naranja 25 Ml', 1, 1, true),
('Esencia De Papaya 25 Ml', 1, 1, true),
('Esencia De Platano 25 Ml', 1, 1, true),
('Esencia De Piña 25 Ml', 1, 1, true),
('Esencia De Ron 25 Ml', 1, 1, true),
('Esencia De Rosa 25 Ml', 1, 1, true),
('Esencia De Trufa', 1, 1, true),
('Esencia De Vainilla', 1, 3, true),
('Esparragos En Conserva', 1, 1, true),
('Espirulina 250 Gr', 1, 1, true),
('Estragon Deshidratado', 1, 1, true),
('Fideos Arroz Vermicelli 220 Grs', 1, 1, true),
('Fideos Arroz Fetuccini 250 Gr', 1, 1, true),
('Fideos Cabellos De Angel 400 Gr', 1, 1, true),
('Fideos Corbatitas Carozzi 400gr', 1, 1, true),
('Fideos Espirales 400gr', 1, 1, true),
('Fideos Fetuccini Trigo Carozzi 400 Gr', 1, 1, true),
('Fideos Nido De Fetuccini 400 Gr', 1, 1, true),
('Fideos Spaghetti N°5 400gr', 1, 1, true),
('Fideos Spaghetti N°5 Integral 500 Gr', 1, 1, true),
('Flan Chocolate 110 Gr', 1, 1, true),
('Flan Vainilla 110 Gr', 1, 1, true),
('Flor De Lavanda Deshidratada 100 Gr', 1, 2, true),
('Fondo De Alcachofa 907 Gr', 1, 2, true),
('Fondo De Ave', 1, 2, true),
('Fondo De Pescado Bajo En Sodio', 1, 2, true),
('Fondo De Verduras', 1, 2, true),
('Frambuesa Entera Liofilizada 500 Gr', 1, 2, true),
('Frambuesa Liofilizada En Polvo 500 Gr', 1, 2, true),
('Fruto De La Pasión Liofilizado 500 Gr', 1, 2, true),
('Frutilla En Conserva', 1, 1, true),
('Galletas Criollitas 60 Grs', 1, 1, true),
('Galletas De Agua 180 Grs', 1, 1, true),
('Galletas De Soda 160 Gra', 1, 1, true),
('Galletas De Vino 160 Grs', 1, 1, true),
('Galletas Integrales 173 Grs', 1, 1, true),
('Galletas Kuky Mini', 1, 1, true),
('Galletas Limón 140 Grs', 1, 1, true),
('Galletas Mantequilla 140 Grs', 1, 1, true),
('Galletas Maria 136 Grs', 1, 1, true),
('Galletas Obsesión 85 Grs', 1, 1, true),
('Galletas Oreo (Mini) 40 Grs', 1, 1, true),
('Galletas Oreo Chocolate 108 Grs', 1, 1, true),
('Galletas Oreo Vainilla 108 Grs', 1, 1, true),
('Galletas Salmas 18 Grs', 1, 1, true),
('Galletas Tuareg 120 Grs', 1, 1, true),
('Garam Masala', 1, 2, true),
('Garbanzos Sin Piel', 1, 2, true),
('Garbanzos Tetra 350 Gr', 1, 1, true),
('Gelatina Frutilla 100 Gr', 1, 1, true),
('Gelatina Naranja', 1, 1, true),
('Gelatina Sabor Piña 100 Gr', 1, 1, true),
('Gelatina Sin Sabor', 1, 2, true),
('Ghee Mantequilla Clarificada 350 Gr', 1, 1, true),
('Glicerina Liquida', 1, 3, true),
('Gluconolactato', 1, 2, true),
('Glucosa', 1, 2, true),
('Goma Xantana', 1, 2, true),
('Granola', 1, 2, true),
('Harina Blanca Mont Blanc', 1, 2, true),
('Harina De Almendras', 1, 2, true),
('Harina De Arroz', 1, 2, true),
('Harina De Arvejas', 1, 2, true),
('Harina De Avena', 1, 2, true),
('Harina De Centeno', 1, 2, true),
('Harina De Chia 500 Gr', 1, 2, true),
('Harina De Cochayuyo', 1, 2, true),
('Harina De Coco', 1, 2, true),
('Harina De Fuerza', 1, 2, true),
('Harina De Garbanzos', 1, 2, true),
('Harina De Lentejas', 1, 2, true),
('Harina De Linaza', 1, 2, true),
('Harina De Maíz', 1, 2, true),
('Harina De Quinoa', 1, 2, true),
('Harina Integral', 1, 2, true),
('Harina Integral Espelta', 1, 2, true),
('Harina Sarraceno', 1, 2, true),
('Harina Tostada', 1, 2, true),
('Higos', 1, 2, true),
('Higos Secos', 1, 2, true),
('Hoja Alga Nori', 1, 1, true),
('Hojas De Arroz', 1, 1, true),
('Hojas De Parra Frasco 70 Un', 1, 1, true),
('Huesillo Con Carozo', 1, 2, true),
('Huesillo Sin Carozo', 1, 2, true),
('Huevo Primera (Caja 180 Un)', 1, 1, true),
('Huevos De Codorniz', 1, 1, true),
('Humo Liquido 165 Cc', 1, 1, true),
('Inulina', 1, 2, true),
('Isomalt Balde (4 Kg)', 1, 2, true),
('Jengibre En Polvo', 1, 2, true),
('Jugo Concentrado Chicha Morada', 1, 3, true),
('Jugo En Polvo 7 Grs Livean', 1, 1, true),
('Jugo Limon Bot 500cc', 1, 3, true),
('Jugo Cranberry', 1, 3, true),
('Katsobushi Bolsa 80 Gr', 1, 2, true),
('Ketchup', 1, 2, true),
('Lasagna 360 Gr', 1, 1, true),
('Laurel', 1, 2, true),
('Leche Condensada De Coco 320 Grs', 1, 1, true),
('Leche Condensada Tarro 397 Gr', 1, 1, true),
('Leche De Almendras', 1, 3, true),
('Leche De Coco 1 Lt', 1, 3, true),
('Leche De Coco Sin Azúcar 1 Lt', 1, 3, true),
('Leche De Coco Tarro', 1, 1, true),
('Leche De Soya Sabor Vainilla', 1, 3, true),
('Leche De Soya Sin Sabor', 1, 3, true),
('Leche Descremada', 1, 3, true),
('Leche Descremada En Polvo 800gr', 1, 2, true),
('Leche Descremada Sin Lactosa', 1, 3, true),
('Leche Entera En Polvo Colún 900 Gr', 1, 2, true),
('Leche Entera Liquida', 1, 3, true),
('Leche Entera Cremosa Soprole', 1, 3, true),
('Leche Evaporada 340 Gr', 1, 1, true),
('Leche Semi-descremada Sin Lactosa', 1, 3, true),
('Leche Sin Lactosa', 1, 3, true),
('Lecitina De Soya', 1, 2, true),
('Lentejas 6mm', 1, 2, true),
('Lentejas Rojas', 1, 2, true),
('Levadura Fresca 500 Gr', 1, 2, true),
('Levadura Instantanea 500 Gr', 1, 2, true),
('Levadura Nutricional 100 Gr', 1, 2, true),
('Levadura Para Vinos', 1, 2, true),
('Lychee En Conserva 560 Gr', 1, 1, true),
('Macis Tarro 50 Gr', 1, 1, true),
('Maiz Cancha', 1, 2, true),
('Maiz Curagua', 1, 2, true),
('Maltodextrina', 1, 2, true),
('Maní Con Miel', 1, 2, true),
('Mani Confitado', 1, 2, true),
('Maní Sin Sal', 1, 2, true),
('Manjar Nestle', 1, 2, true),
('Manteca Vegetal Panadera Crucina 1 Kg', 1, 2, true),
('Manteca De Cerdo 1 Kilo', 1, 2, true),
('Manteca De Cacao 500 Grs', 1, 2, true),
('Manteca De Cacao Color 200 Grs', 1, 1, true),
('Manteca Vegetal 200 Gr', 1, 2, true),
('Mantequilla Con Sal 250 Gr', 1, 2, true),
('Mantequilla De Maní 500 Gr', 1, 2, true),
('Mantequilla Profesional Soprole 5 Kg', 1, 2, true),
('Mantequilla Sin Sal 250 Gr', 1, 2, true),
('Maqui En Polvo', 1, 2, true),
('Margarina De Hoja Kilo', 1, 2, true),
('Margarina De Horneo', 1, 2, true),
('Margarina Vegetal', 1, 2, true),
('Marrasquino Rojo 1kg', 1, 1, true),
('Marrasquino Verde 1kg', 1, 1, true),
('Masa Philo 320 Gramos', 1, 1, true),
('Masa Philo 1000 Gramos', 1, 1, true),
('Marshmallow 283 Grs', 1, 2, true),
('Mayonesa Hellmans / Kraft - Deli', 1, 2, true),
('Mayonesa Don Juan / Carozzi', 1, 2, true),
('Mazapán', 1, 2, true),
('Mejorador De Pan Crocante Puratos 500gr', 1, 2, true),
('Mejorador Marraqueta', 1, 2, true),
('Mejorador Para Hallullas Puratos', 1, 2, true),
('Melaza Líquida 500 Gr', 1, 1, true),
('Merkén', 1, 2, true),
('Mermelada De Alcayota 1,1 Kg', 1, 2, true),
('Mermelada De Arandano 340 Gr', 1, 2, true),
('Mermelada De Damasco 250 Gr', 1, 2, true),
('Mermelada De Frambuesa Kilo', 1, 2, true),
('Mermelada De Frutilla Kilo', 1, 2, true),
('Mermelada De Guinda Acida', 1, 2, true),
('Mermelada De Guindas Kilo', 1, 2, true),
('Mermelada De Mora 250 Gr', 1, 2, true),
('Mermelada De Piña Kilo', 1, 2, true),
('Mermelada De Rosa Mosqueta 250 Gr', 1, 1, true),
('Mermelada Naranja 350gr', 1, 1, true),
('Miel De Abeja', 1, 2, true),
('Miel De Maple 375ml', 1, 1, true),
('Miel De Palma Tarro 240gr', 1, 1, true),
('Miel De Papaya 1 Lt', 1, 3, true),
('Miel De Ulmo', 1, 2, true),
('Mijo', 1, 2, true),
('Miroir Balde ( 5 Kilos )', 1, 2, true),
('Mostacilla Chocolate', 1, 2, true),
('Mostacilla Colores', 1, 2, true),
('Mostacilla Colores (Palitos)', 1, 2, true),
('Mostacilla Diseños', 1, 2, true),
('Mostaza Antigua Bornier Frasco 210 G', 1, 1, true),
('Mostaza Dijon Bornier Frasco 210 Gr', 1, 1, true),
('Mostaza Hellmann''s 1 Kg', 1, 2, true),
('Mostaza Don Juan', 1, 2, true),
('Motemei', 1, 2, true),
('Murta En Conserva', 1, 2, true),
('Naranja Confitada', 1, 2, true),
('Naranja En Polvo Liofilizada 500 Gr', 1, 2, true),
('Navajuelas Tarro 100 Gr', 1, 1, true),
('Neutro', 1, 2, true),
('Nueces Mariposa', 1, 2, true), 
('Nueces Pecanas', 1, 2, true),
('Nueces Picadas', 1, 2, true),
('Nuez Moscada', 1, 2, true),
('Nutella Balde 3 Kgs', 1, 2, true),
('Nutella Tarro 350 Grs', 1, 2, true),
('Orégano', 1, 2, true),
('Otentic (Masa Madre)', 1, 2, true),
('Palmitos En Tarro 400 Gr', 1, 1, true), 
('Pan Brioche Hambuerguesa', 1, 1, true),
('Pan Frica', 1, 1, true),
('Pan Molde Integral Paquete', 1, 1, true),
('Pan Molde Paquete 350 Grs (Brioche Allfast)', 1, 1, true),
('Pan Pita Paquete 8 Unidad', 1, 1, true),
('Pan Rallado', 1, 2, true), 
('Panacotta Instantanea 90 Grs', 1, 1, true),
('Panko', 1, 2, true), 
('Papaya Al Jugo En Conserva', 1, 2, true),
('Papaya Confitada', 1, 2, true),
('Paprika', 1, 2, true),
('Pasas Corintio', 1, 2, true),
('Pasas Negras', 1, 2, true),
('Pasas Rubias', 1, 2, true),
('Pasta Curry Amarillo 400 Gr', 1, 1, true),
('Pasta Curry Rojo 400 Gr', 1, 1, true),
('Pasta De Tamarindo 200 Grs', 1, 1, true),
('Pectina Cítrica', 1, 2, true),
('Pepinillos Dill', 1, 2, true),
('Perlas De Tapioca', 1, 2, true),
('Petazetas Sobre', 1, 1, true),
('Pickle', 1, 2, true),
('Pimentón En Conserva 250 Gr', 1, 1, true),
('Pimienta Blanca Molida', 1, 2, true),
('Pimienta De Jamaica', 1, 2, true),
('Pimienta Negra En Grano', 1, 2, true),
('Pimienta Negra Molida', 1, 2, true),
('Pimienta Rosada', 1, 2, true),
('Pimienta Sechuan', 1, 2, true),
('Piña En Trozos 565 Gr (Neto)', 1, 1, true),
('Piña Rodaja 340 Gr', 1, 1, true),
('Piñones', 1, 2, true),
('Pistachos Con Cascara', 1, 2, true),
('Pistachos Sin Sal', 1, 2, true),
('Polenta', 1, 2, true),
('Polvo De Hornear', 1, 2, true),
('Poroto De Soya', 1, 2, true),
('Poroto Tórtola', 1, 2, true),
('Porotos Blancos Wasil Tetra 350', 1, 1, true),
('Porotos Burro', 1, 2, true),
('Porotos Hallados', 1, 2, true),
('Porotos Mantequilla / Alubia', 1, 2, true),
('Porotos Negro En Pasta Tarro 400 Gr', 1, 1, true),
('Porotos Negros', 1, 2, true),
('Porotos Negros Tetra 350 Gr', 1, 1, true),
('Porotos Pallar', 1, 2, true),
('Praliné Almendras 5 Kg', 1, 2, true),
('Praliné Avellanas 5 Kg', 1, 2, true),
('Praliné Almendra / Avellana 2 Kg', 1, 2, true),
('Premezcla Biscocho Vainilla Puratos', 1, 2, true),
('Premezcla Brownie Selecta / Puratos', 1, 2, true),
('Premezcla Brownie Tostadito', 1, 2, true),
('Premezcla Focaccia Collico', 1, 2, true),
('Premezcla Merengue 0,6 Kgs', 1, 2, true),
('Premezcla Mousse Macrofood', 1, 2, true),
('Premezcla Muffins 380 Gr', 1, 2, true),
('Premezcla Pizza', 1, 2, true),
('Premezcla Puratos Tegral Satin Creme Cake Cupcake', 1, 2, true),
('Puravita Multigrano Dark', 1, 2, true),
('Puravita Proteina Pulses', 1, 2, true),
('Puré Instantaneo', 1, 2, true),
('Puré Instantaneo Caja 250 Grs', 1, 1, true),
('Quesillo Colun 320gr', 1, 1, true),
('Queso Azul 100 Gr', 1, 2, true),
('Queso Brie 125 Gr', 1, 1, true),
('Queso Camemberth 125 Gr', 1, 1, true),
('Queso Chanco Laminados 500 Gr', 1, 2, true),
('Queso Chanco Trozo 200 Gr', 1, 2, true),
('Queso Cheedar 8 Laminas', 1, 1, true),
('Queso Crema Caja', 1, 2, true),
('Queso Crema Santa Rosa / Philladelphia', 1, 2, true),
('Queso De Cabra 200 Gr', 1, 2, true),
('Queso De Cabra Ahumado 250 Gr', 1, 1, true),
('Queso De Cabra Ciboulette', 1, 1, true),
('Queso De Cabra Oregano', 1, 1, true),
('Queso De Cabra Pimentón', 1, 1, true),
('Queso De Cabra Untable', 1, 1, true),
('Queso Emmenthal', 1, 2, true),
('Queso Fresco / Chacra 400 Gr', 1, 1, true),
('Queso Fresco Desgrasado (Light)', 1, 2, true),
('Queso Gauda Laminado 500 Gr', 1, 2, true),
('Queso Gauda Trozo', 1, 2, true),
('Queso Granapadano 200 Gr', 1, 1, true),
('Queso Gruyere 200 Gr', 1, 1, true),
('Queso Manchego 150gr', 1, 1, true),
('Queso Mantecoso Laminado 500 Gr', 1, 2, true),
('Queso Mantecoso Trozo 500 Gr', 1, 2, true),
('Queso Mascarpone 500 Gr', 1, 1, true),
('Queso Mozarella Di Buffalla 200 Gramos', 1, 1, true),
('Queso Mozzarella Pieza', 1, 2, true),
('Queso Parmesano Rallado', 1, 2, true),
('Queso Parmesano Torta 7,6 Kg', 1, 2, true),
('Queso Parmesano Trozo 300 Gr', 1, 1, true),
('Queso Ricotta 200 Gr', 1, 1, true),
('Queso Ricotta', 1, 2, true),
('Quinoa Blanca', 1, 2, true),
('Quinoa Inflada', 1, 2, true),
('Quinoa Negra', 1, 2, true),
('Quinoa Roja', 1, 2, true),
('Rolls Crocante', 1, 1, true),
('Rolls Nut', 1, 1, true),
('Romero Entero', 1, 2, true),
('Sal De Cura', 1, 2, true),
('Sal De Mar Fina Cahuil', 1, 2, true),
('Sal De Mar Gruesa Cahuil', 1, 2, true),
('Sal Fina De Mesa', 1, 2, true),
('Salsa Barbeque 280 Gr', 1, 1, true),
('Salsa De Carne 30 Gr En Polvo', 1, 1, true),
('Salsa De Chocolate 1 Litro/Kilo', 1, 1, true),
('Salsa De Chocolate 280 Gr', 1, 1, true),
('Salsa De Ostras 600 Gr', 1, 1, true),
('Salsa De Pescado 250 Ml', 1, 1, true),
('Salsa De Pescado Condimentada 250 Ml', 1, 1, true),
('Salsa De Soya Kikoman', 1, 3, true),
('Salsa De Tamarindo Frasco 500 Cc', 1, 1, true),
('Salsa Española En Polvo', 1, 2, true),
('Salsa Inglesa 165 Cc', 1, 1, true),
('Salsa Tabasco 60 Ml', 1, 1, true),
('Salsa Teriyaki 500 Cc', 1, 3, true),
('Salvado De Trigo Fino', 1, 2, true),
('Semilla De Alfalfa', 1, 2, true),
('Semilla De Amapola', 1, 2, true),
('Semilla De Anis', 1, 2, true),
('Semilla De Betarraga', 1, 2, true),
('Semilla De Chia', 1, 2, true),
('Semilla De Cilantro', 1, 2, true),
('Semilla De Comino', 1, 2, true),
('Semilla De Habas', 1, 2, true),
('Semilla De Linaza', 1, 2, true),
('Semilla De Maravilla', 1, 2, true),
('Semilla De Mostaza Blanca', 1, 2, true),
('Semilla De Mostaza Negra', 1, 2, true),
('Semilla De Perejil', 1, 2, true),
('Semilla De Pimenton', 1, 2, true),
('Semilla De Zapallo', 1, 2, true),
('Semola', 1, 2, true),
('Semolina 500gr', 1, 2, true),
('Sesamo Blanco', 1, 2, true),
('Sesamo Negro', 1, 2, true),
('Sesamo Tostado', 1, 2, true),
('Softgrain Multigranos', 1, 2, true),
('Sopa De Pollo Deshidratada', 1, 1, true),
('Sorbitol', 1, 2, true),
('Syrup De Agave 330 Gr', 1, 1, true),
('Tahina En Polvo 424 Gr', 1, 1, true),
('Takuan Paquete 3 Un', 1, 1, true),
('Tallarin Soba 300 Gr', 1, 1, true),
('Té Dilmah', 1, 1, true),
('Té En Hoja 500 Gr', 1, 2, true),
('Té Earl Grey Bolsita', 1, 1, true),
('Té English Breakfast', 1, 1, true),
('Te Manzanilla', 1, 1, true),
('Té Matcha En Polvo Sobre 150 Gr', 1, 2, true),
('Te Negro', 1, 2, true),
('Té Negro Ahumado Lapsang 85 Gr', 1, 1, true),
('Té Negro Daarjeling', 1, 1, true),
('Té Verde Lipton Bolsita 50 Unidades', 1, 1, true),
('Te Verde China', 1, 1, true),
('Te Verde Twining 50 Unidades', 1, 1, true),
('Tinta De Sepia / Jibia / Calamar Tarro 90 Gr', 1, 1, true),
('Tofu Blando 340 Gr', 1, 1, true),
('Tofu Firme 349 Gr', 1, 1, true),
('Tomate Deshidratado', 1, 2, true),
('Tomate Jugo En Tarro', 1, 1, true),
('Tomate Passata Frasco 700 Gr', 1, 1, true),
('Tomate Pelado En Tarro 400 Gr', 1, 1, true),
('Tomate Pomodoro Salsa En Tarro Italiana 240 G', 1, 1, true),
('Tomate Salsa 200 Gr', 1, 1, true),
('Tomillo Entero', 1, 2, true),
('Tortillas Talla M X 10 Unidades', 1, 1, true),
('Tortillas Talla L', 1, 1, true),
('Trigo Mote', 1, 2, true),
('Trigo Sarraceno', 1, 2, true),
('Vaina De Vainilla', 1, 1, true),
('Vinagre Blanco 500 Ml', 1, 3, true),
('Vinagre De Arroz 620ml', 1, 3, true),
('Vinagre De Jerez 250 Ml', 1, 3, true),
('Vinagre De Manzana 500 Ml', 1, 3, true),
('Vinagre De Vino Tinto 500 Cc', 1, 3, true),
('Vinagre Frambuesa 50 Ml', 1, 3, true),
('Yogurth Natural 155 Gr', 1, 1, true),
('Yogurth Natural Griego 155 Gr', 1, 1, true),
('Yogurth Sabores 155 Gr', 1, 1, true),
('Yogurth Sin Azúcar Bolsa', 1, 1, true),
('Yogurth Bolsa Sabores', 1, 1, true),
('Yogurth Bolsa Sabor Frambuesa', 1, 1, true),
('Yogustar Pro 8 (1gr > 1 Litro)', 1, 1, true);


--CATEGORIA: Aseo y Descartable
INSERT INTO producto (nombre_producto, id_categoria, id_unidad, activo) VALUES
('Abrillanatador Lavavajilla 20 Lt', 2, 1, true),
('Acido Lactico Bidon 5lts', 2, 1, true),
('Adaptador De Enchufe', 2, 1, true),
('Alambre De Floristeria Pqt 10 Un', 2, 1, true),
('Alcohol 70 % Bot 1 Lt', 2, 1, true),
('Alcohol Isopropilico Bot 1 Lt', 2, 1, true),
('Alfiler', 2, 1, true),
('Astillas Para Ahumar (Arbol Frutal Caja 2 Kgs)', 2, 1, true),
('Bandeja Aluminio Rectangular', 2, 1, true),
('Bandeja Alumino Circular', 2, 1, true),
('Bandeja Torta Metalizada 30cm', 2, 1, true),
('Bandeja Redonda Con Blonda 20 Cms', 2, 1, true),
('Bandeja Redonda Con Blonda 30 Cms', 2, 1, true),
('Bandeja Rectangular Con Blonda 23x16 Cms', 2, 1, true),
('Bandeja Rectangular Con Blonda 21,5x15 Cms', 2, 1, true),
('Bandeja Rectangular Con Blonda 20x35 Cms', 2, 1, true),
('Bandeja Rectangular Con Blonda 53x35 Cms', 2, 1, true),
('Barredor De Agua', 2, 1, true),
('Base Giratoria De Torta', 2, 1, true),
('Base Mini Torta', 2, 1, true),
('Bio Active (Bacterias Trampa Grasa) Balde 1.5 Kgs', 2, 2, true),
('Bombillas Not Plastic Bolsa 100un', 2, 1, true),
('Bombillas De Carton Bolsa 100 Un', 2, 1, true),
('Bolsas Celofan 8x15 100 Un', 2, 1, true),
('Bolsas Celofan 10x15 100 Un', 2, 1, true),
('Bolsas Celofan 12x20 100 Un', 2, 1, true),
('Bolsa De Basura Grande 100 X 120 Pqt 10 Un', 2, 1, true),
('Bolsa De Basura Grande 100 X 120 Un A Granel', 2, 1, true),
('Bolsa De Basura Mediana 70 X 90 Pqt 10 Un', 2, 1, true),
('Bolsa Sellado Al Vacio Chica 19.5x30 Un', 2, 1, true),
('Bolsa Sellado Al Vacio Grande 30x40 Un', 2, 1, true),
('Bolsa Papel Palomitas', 2, 1, true),
('Bolsas Prepicadas Chicas 20*30', 2, 1, true),
('Bolsas Prepicadas Medianas 30*40', 2, 1, true),
('Bolsas Prepicadas Grandes 40*60', 2, 1, true),
('Botella Aire Comprimido', 2, 1, true),
('Capsulas Mufin Pkt100un', 2, 1, true),
('Capsulas Cupcake Con Diseños', 2, 1, true),
('Carro De Mopa', 2, 1, true),
('Carton Forrado', 2, 1, true),
('Cartucho Sobre Cuchufli', 2, 1, true),
('Cartulina Española Negra 50x65cm Pliego', 2, 1, true),
('Cateter', 2, 1, true),
('Cinta De Acetato', 2, 1, true),
('Cinta De Acetato 8x10 Cms', 2, 1, true),
('Cinta De Acetato 12cm', 2, 1, true),
('Cinta De Acetato 20cm', 2, 1, true),
('Cinta De Embalaje Transparente', 2, 1, true),
('Cinta Masking', 2, 1, true),
('Cinta De Razo Amarilla', 2, 1, true),
('Cinta De Razo Azul', 2, 1, true),
('Cinta De Razo Blanca', 2, 1, true),
('Cinta De Razo Celeste', 2, 1, true),
('Cinta De Razo Dorada', 2, 1, true),
('Cinta De Razo Naranja', 2, 1, true),
('Cinta De Razo Negra', 2, 1, true),
('Cinta De Razo Roja', 2, 1, true),
('Cinta De Razo Verde', 2, 1, true),
('Cinta De Razo Colores Rollo', 2, 1, true),
('Cinta De Razo Colores Gruesa', 2, 1, true),
('Cinta Doble Contacto', 2, 1, true),
('Cinta Floristeria Verde', 2, 1, true),
('Cinta Floristeria Blanca', 2, 1, true),
('Cofias Pqt 100 Un', 2, 1, true),
('Colorante Chocolateria Sevarome (Liposoluble) Amarillo', 2, 1, true),
('Colorante Chocolateria Sevarome (Liposoluble) Azul', 2, 1, true),
('Colorante Chocolateria Sevarome (Liposoluble) Naranja', 2, 1, true),
('Colorante Chocolateria Sevarome (Liposoluble) Rojo', 2, 1, true),
('Colorante Chocolateria Sevarome (Liposoluble) Verde', 2, 1, true),
('Colorante Chocolateria Pavoni (Liposoluble) Amarillo', 2, 1, true),
('Colorante Chocolateria Pavoni (Liposoluble) Azul', 2, 1, true),
('Colorante Chocolateria Pavoni (Liposoluble) Blue Tiffany', 2, 1, true),
('Colorante Chocolateria Pavoni (Liposoluble) Morado', 2, 1, true),
('Colorante Chocolateria Pavoni (Liposoluble) Naranja', 2, 1, true),
('Colorante Chocolateria Pavoni (Liposoluble) Rosado', 2, 1, true),
('Colorante En Polvo Azul', 2, 1, true),
('Colorante En Polvo Negro', 2, 1, true),
('Colorantes Gel Baker And Chef Amarillo', 2, 1, true),
('Colorantes Gel Baker And Chef Azul', 2, 1, true),
('Colorantes Gel Baker And Chef Blanco', 2, 1, true),
('Colorantes Gel Baker And Chef Café', 2, 1, true),
('Colorantes Gel Baker And Chef Morado', 2, 1, true),
('Colorantes Gel Baker And Chef Naranjo', 2, 1, true),
('Colorantes Gel Baker And Chef Negro', 2, 1, true),
('Colorantes Gel Baker And Chef Rosado', 2, 1, true),
('Colorantes Gel Baker And Chef Rosado (250 Ml)', 2, 1, true),
('Colorantes Gel Baker And Chef Rojo (250 Ml)', 2, 1, true),
('Colorantes Gel Baker And Chef Rojo', 2, 1, true),
('Colorantes Gel Baker And Chef Verde', 2, 1, true),
('Colorante Gel Amarillo', 2, 1, true),
('Colorante Gel Azul', 2, 1, true),
('Colorante Gel Blanco', 2, 1, true),
('Colorante Gel Café', 2, 1, true),
('Colorante Gel Calipso', 2, 1, true),
('Colorante Gel Celeste', 2, 1, true),
('Colorante Gel Fucsia', 2, 1, true),
('Colorante Gel Morado', 2, 1, true),
('Colorante Gel Naranjo', 2, 1, true),
('Colorante Gel Negro', 2, 1, true),
('Colorante Gel Rojo', 2, 1, true),
('Colorante Gel Rosado', 2, 1, true),
('Colorante Gel Verde', 2, 1, true),
('Colorante Gel Violeta', 2, 1, true),
('Colorante Glitter En Polvo Plateado', 2, 1, true),
('Colorante Glitter En Polvo Rojo', 2, 1, true),
('Colorante Laca Amarillo', 2, 1, true),
('Colorante Laca Azul', 2, 1, true),
('Colorante Laca Negro', 2, 1, true),
('Colorante Laca Rojo', 2, 1, true),
('Colorante Laca Verde', 2, 1, true),
('Colorante Liposoluble Amarillo', 2, 1, true),
('Colorante Liposoluble Azul', 2, 1, true),
('Colorante Liposoluble Negro', 2, 1, true),
('Colorante Liposoluble Rojo', 2, 1, true),
('Colorante Liposoluble Rosado', 2, 1, true),
('Colorante Liposoluble Verde', 2, 1, true),
('Colorante Matizador Polvo Amarillo', 2, 1, true),
('Colorante Matizador Polvo Blanco', 2, 1, true),
('Colorante Matizador Polvo Morado', 2, 1, true),
('Colorante Matizador Polvo Naranja', 2, 1, true),
('Colorante Matizador Polvo Rojo', 2, 1, true),
('Colorante Polvo Nacarado Dorado', 2, 1, true),
('Colorante Polvo Nacarado Plateado', 2, 1, true),
('Colorante Royal Velvet', 2, 1, true),
('Cortadores Ovalados 6cm', 2, 1, true),
('Compotera Postre', 2, 1, true),
('Cono Papas Fritas', 2, 1, true),
('Cloro Bidon 5 Lts', 2, 1, true),
('Cucharitas Mini Plasticas Pkt 100un', 2, 1, true),
('Cucharitas Madera Descartables', 2, 1, true),
('Cuchillo Cartonero', 2, 1, true),
('Cuchillo Plastico Descartable', 2, 1, true),
('Descartable Shot Plastico Transparente', 2, 1, true),
('Descartable Pocillos Para Postres 250 Grs C/Tapa', 2, 1, true),
('Descartable Pote Hotdog', 2, 1, true),
('Descartable Pote Plastico Rectangular 11x14 Cms', 2, 1, true),
('Descartable Pote Kraft 250 Grs', 2, 1, true),
('Descartable Pote Tampa 180 Grs C/Tapa', 2, 1, true),
('Detergente Desengrasante Pack 2 Bolsas', 2, 1, true),
('Detergente Lavaloza Pack 2 Bolsas', 2, 1, true),
('Desmoldante Spray Pasteleria', 2, 1, true),
('Dispensador Con Gatillo (Dilotores)', 2, 1, true),
('Dispensador De Bomba', 2, 1, true),
('Dispensadores Para Quimicos', 2, 1, true),
('Dummies Redondos 10x15', 2, 1, true),
('Dummies Redondos 15x15', 2, 1, true),
('Dummies Redondos 20x12', 2, 1, true),
('Dummies Redondos 20x15', 2, 1, true),
('Dummies Redondos 25x15', 2, 1, true),
('Embudos', 2, 1, true),
('Elasticos', 2, 1, true),
('Escobillones Con Mango Madera', 2, 1, true),
('Escobillones Con Mango Metalico', 2, 1, true),
('Esponjas Un', 2, 1, true),
('Esterilla Para Suchi', 2, 1, true),
('Film Adherente (Alusa Plast) Rollo 600 Mts', 2, 1, true),
('Fosforos Pqt 10 Cajas', 2, 1, true),
('Frasco Vidrio 250 Cc', 2, 1, true),
('Frasco Vidrio 1000 Cc', 2, 1, true),
('Gas Cocinilla (Largo 227 Gr)', 2, 1, true),
('Gas Para Sopletes', 2, 1, true),
('Gasa', 2, 1, true),
('Goma Eva Pqt 10 Un', 2, 1, true),
('Gorro Chef', 2, 1, true),
('Guantes Talla L Caja 100 Un', 2, 1, true),
('Guantes Talla M Caja 100 Un', 2, 1, true),
('Guante Nitrilo M Caja 100', 2, 1, true),
('Guante Nitrilo L Caja 100', 2, 1, true),
('Guante Nitrilo S Caja 100 Un', 2, 1, true),
('Hilo De Pescar Rollo 100 Mts', 2, 1, true),
('Hojas Bisturi', 2, 1, true),
('Jabon Para Manos Bidon 5lts', 2, 1, true),
('Jeringa 60 Ml', 2, 1, true),
('Kingrol Tapa', 2, 1, true),
('Lamina Prepicada 40*60', 2, 2, true),
('Lapiz Mina Hb', 2, 1, true),
('Lapices Pastel Seco Caja', 2, 1, true),
('Lija 60 Pliego', 2, 1, true),
('Lija 180 Pliego', 2, 1, true),
('Mascarillas 3 Pliegues Desechables Caja 50 Un', 2, 1, true),
('Mamaderas', 2, 1, true),
('Manga Pastelera Desechable', 2, 1, true),
('Mica', 2, 1, true),
('Mica Para Termolaminar', 2, 1, true),
('Molde Aluminio Pequeño', 2, 1, true),
('Molde Canoa Bambu', 2, 1, true),
('Molde Canoa Caña De Azucar', 2, 1, true),
('Molde Cerecinado Redondo 400 Gr', 2, 1, true),
('Molde Cerecinado Cajon 500 Gr', 2, 1, true),
('Moldes Nervadura', 2, 1, true),
('Molde Paneton 250 Grs', 2, 1, true),
('Molde Tulipa', 2, 1, true),
('Molde Tartaleta Aluminio', 2, 1, true),
('Mondadientes Cajita 100 Un', 2, 1, true),
('Mopa Mango Plastico', 2, 1, true),
('Mopas 16oz', 2, 1, true),
('Muselina / Pañal', 2, 1, true),
('Palas Con Mango Plastico', 2, 1, true),
('Palos Bambu Con Nudo 50un', 2, 4, true),
('Palos Brochetas 10 Cm (50 Un)', 2, 4, true),
('Palos Brochetas 15 Cm (50 Un)', 2, 1, true),
('Palos Brochetas 20 Cm (50 Un)', 2, 1, true),
('Palos Brochetas 30 Cm (50 Un)', 2, 1, true),
('Palos Brochetas 25 Cms (50 Un)', 2, 1, true),
('Palos Brochetas Grandes (50 Un)', 2, 1, true),
('Palos Chupetes 10 Cm (50 Un)', 2, 4, true),
('Palos Chupetes 14 Cm (50 Un)', 2, 4, true),
('Palos Chupetes 17 Cm (50 Un)', 2, 4, true),
('Palos Maquetas 1 X 1', 2, 1, true),
('Palos Maquetas 2 X 2', 2, 1, true),
('Palos Maquetas 5 X 5', 2, 1, true),
('Palos De Sushi Par', 2, 1, true),
('Palos De Helado Pqt 50 Un', 2, 1, true),
('Palitos Coctail Madera Pkt 50un', 2, 1, true),
('Perritos Mini Madera Decoracion', 2, 1, true),
('Papel De Aluminio Rollo', 2, 1, true),
('Papel Diamante Pliego', 2, 1, true),
('Papel Celofan Pliego', 2, 1, true),
('Papel Cerecinado Alfajor (100 Un)', 2, 1, true),
('Papel De Horneo / Mantequilla Pliego', 2, 1, true),
('Papel De Horneo / Mantequilla Rollo 7,5 Mts', 2, 1, true),
('Papel Guitarra', 2, 1, true),
('Papel Kraft', 2, 1, true),
('Papel Seda Pqt 10 Un', 2, 1, true),
('Pastillas De Horno Rational Roja Balde', 2, 1, true),
('Pastillas De Horno Rational Azul Balde', 2, 1, true),
('Pastillas De Horno Rational Verde Balde', 2, 1, true),
('Petalos De Algodon Pqt 80 Un', 2, 1, true),
('Pincel Paleta N°4', 2, 1, true),
('Pincel Paleta N°10', 2, 1, true),
('Pincel Paleta N°14', 2, 1, true),
('Pincel Redondo N°6', 2, 1, true),
('Pincel Redondo N°8', 2, 1, true),
('Pirotin Cerecinado Pequeños Bombon', 2, 1, true),
('Pirotines Pequeños (Bombon)', 2, 1, true),
('Pirotines Medianos', 2, 1, true),
('Pitilla Ovillo', 2, 1, true),
('Pistilos Para Flores', 2, 1, true),
('Piso Goma Antideslizante', 2, 1, true),
('Rafia', 2, 1, true),
('Recarga Sifon', 2, 1, true),
('Regla Metalica 30cm', 2, 1, true),
('Scotch', 2, 1, true),
('Servilletas Gourmet Elite 50un (Salon)', 2, 1, true),
('Servilletas Papel Elite 50un (Eventos)', 2, 1, true),
('Set Cortadores', 2, 1, true),
('Silicona Fria (100ml)', 2, 1, true),
('Sobre Papel Para Cabritas Mediano', 2, 1, true),
('Sobre Papel Para Cabritas Grande', 2, 1, true),
('Sprinkles Dorados Bolsa', 2, 1, true),
('Tapa Tazon Sopero', 2, 1, true),
('Tapa Vaso Plastico (Domo)', 2, 1, true),
('Tazon Sopero Desechable 500cc', 2, 1, true),
('Tela Lona', 2, 4, true),
('Tenedor Plastico Para Postres', 2, 1, true),
('Tenedor Mini Coctail', 2, 1, true),
('Tijeras', 2, 1, true),
('Tiza Blanca Caja', 2, 1, true),
('Toalla Absorvente Elite Plus Evolution 2x250', 2, 1, true),
('Tumper Cafeteria', 2, 1, true),
('Transfers', 2, 1, true),
('Trupan 30 X 30', 2, 1, true),
('Velas Blancas', 2, 1, true),
('Vasos Polipapel', 2, 1, true),
('Vasos Plumavit', 2, 1, true),
('Vinilo Adhesivo Blanco 30cm / 5mts', 2, 1, true),
('Virutilla Gruesa Metalica (Bolsa 25 Un)', 2, 1, true),
('Wypall Jumbo (Rollo 980 Paños)', 2, 1, true),
('Vaso Plastico', 2, 1, true);

--CATEGORIA: Vino y Destilados 
INSERT INTO producto (nombre_producto, id_categoria, id_unidad, activo) VALUES
('Absenta', 3, 9, true),
('Agua De Coco 500 Ml', 3, 9, true),
('Agua De Coco 520 Ml', 3, 9, true),
('Aguardiente', 3, 9, true),
('Agua Mineral Con Gas 1,6 Lt', 3, 9, true),
('Agua Mineral Sin Gas 1,6 Lt', 3, 9, true),
('Agua Mineral Sin Gas Bidón 5 Lt', 3, 9, true),
('Agua Tónica 1,5 Lt', 3, 9, true),
('Amaretto Mitjans 750 Cc', 3, 9, true),
('Amargo Angostura 100 Ml', 3, 9, true),
('Aperol 750 Cc', 3, 9, true),
('Araucano 28° 900 Cc', 3, 9, true),
('Bailey´s 17° 750 Cc', 3, 9, true),
('Bebida Coca Cola 1,5 Lt', 3, 9, true),
('Bebida Ginger Ale 1,5 Lt', 3, 9, true),
('Bebida San Pellegrino Lata', 3, 9, true),
('Bebida Sprite 1,5 Lt', 3, 9, true),
('Borgoña 1.5 Lt Gato', 3, 9, true),
('Brandy Torres 10 700 Cc', 3, 9, true),
('Cachaca 750 Ml', 3, 9, true),
('Campari 28° 750 Ml', 3, 9, true),
('Cassis Mitjans 750 Cc', 3, 9, true),
('Cerveza Austral Calafate 330 Cc', 3, 9, true),
('Cerveza Austral Lager 330cc', 3, 9, true),
('Cerveza Cristal 1,2 Lt', 3, 9, true),
('Cerveza Corona 330 Cc', 3, 9, true),
('Cerveza De Jengibre', 3, 9, true),
('Cerveza Del Puerto Amber Ale 330 Cc', 3, 9, true),
('Cerveza Dolbek Maqui 330 Cc', 3, 9, true),
('Cerveza Kross 5 Ale 330 Cc', 3, 9, true),
('Cerveza Kross Berries 330 Cc', 3, 9, true),
('Cerveza Kross Stout 330 Cc', 3, 9, true),
('Cerveza Kunstman Arandanos 330 Cc', 3, 9, true),
('Cerveza Kunstman Bock 330 Cc', 3, 9, true),
('Cerveza Kunstman Ipa 330 Cc', 3, 9, true),
('Cerveza Kunstman Lager 330 Cc', 3, 9, true),
('Cerveza Kunstman Miel 330 Cc', 3, 9, true),
('Cerveza Kunstman Sin Filtrar 330 Cc', 3, 9, true),
('Cerveza Malta Morenita 1,2 Lt', 3, 9, true),
('Chicha 11,5° 700 Cc', 3, 9, true),
('Cola De Mono 750 Cc', 3, 9, true),
('Coñac 3 Palos 38° 1 Lt', 3, 9, true),
('Coñac Hennessy Vs 700 Cc', 3, 9, true),
('Curacao Mitjans 20° 750 Ml', 3, 9, true),
('Destilado De Uva Grano Chillan 50° 900 Ml', 3, 9, true),
('Destilado De Uva Tabernero Blended 40° 750ml', 3, 9, true),
('Destilado Trakal 750 Cc', 3, 9, true),
('Disaronno 700 Ml 28°', 3, 9, true),
('Drambuie 40° 750 Cc', 3, 9, true),
('Espumante Asti Martini 750 Cc', 3, 9, true),
('Espumante Asti Riccadonna 750 Cc', 3, 9, true),
('Espumante Brut Misiones De Rengo 750 Cc', 3, 9, true),
('Espumante Brut Nature Valdivieso 750 Cc', 3, 9, true),
('Espumante Brut Rose Valdivieso Limited 750 Cc', 3, 9, true),
('Espumante Brut Rose Viñamar 750 Cc', 3, 9, true),
('Espumante Brut Valdivieso 750 Cc', 3, 9, true),
('Espumante Brut Viñamar 750 Cc', 3, 9, true),
('Espumante Demisec Valdivieso 750 Cc', 3, 9, true),
('Espumante Estelado Rose 720 Cc Miguel Torres', 3, 9, true),
('Espumante Extra Brut Viñamar 750 Cc', 3, 9, true),
('Espumante Extra Brut Uva Pais Las Mulas', 3, 9, true),
('Espumante Martini Prosecco 750 Cc', 3, 9, true),
('Espumante Moscato-demisec Valdivieso 750 Cc', 3, 9, true),
('Fernet Branca 39° 1 Lt', 3, 9, true),
('Fernet Martini E Rossi 36° 900 Ml', 3, 9, true),
('Frangelico 700 Ml 20°', 3, 9, true),
('Gin Beefeater 750 Cc 40°', 3, 9, true),
('Gin Bombay 700 Cc', 3, 9, true),
('Gin Boolton 1 Lt 40°', 3, 9, true),
('Gin Carpintero Negro (Trakal)', 3, 9, true),
('Granadina 900 Ml', 3, 9, true),
('Hielo', 3, 2, true),
('Jagermeister 700 Cc 35°', 3, 9, true),
('Jarabe De Goma 750 Cc', 3, 9, true),
('Jarabe De Horchata 750 Cc', 3, 9, true),
('Jerez Tío Pepe 750 Cc', 3, 9, true),
('Jugo De Cranberry 250 Cc', 3, 9, true),
('Jugo De Maqui 500cc', 3, 9, true),
('Jugo De Naranja Andina 1lt', 3, 9, true),
('Jugo De Naranja Watt''s Caja 1lt', 3, 9, true),
('Jugo De Tomate', 3, 9, true),
('Jugo De Tomate Tarro 300 Cc', 3, 9, true),
('Jugo Watt´s Arandanos Caja 1 Lt', 3, 9, true),
('Jugo Watt´s Durazno 1,5 Lt', 3, 9, true),
('Jugo Watt´s Papaya Selección 1, Lt', 3, 9, true),
('Jugo Watt´s Piña 1,5 Lt', 3, 9, true),
('Jugo Watt''s Arandano 1,5 Lt', 3, 9, true),
('Jugo Watt''s Manzana 1,5 Lt', 3, 9, true),
('Jugo Watt''s Naranja 1,5 Lt', 3, 9, true),
('Jugo Watt''s Naranja Light 1,5 Lt', 3, 9, true),
('Jugo Papaya', 3, 9, true),
('Kirsch Luxardo 750 Ml', 3, 9, true),
('Kirsch Lorch 700 Cc', 3, 9, true),
('Licor Apricot 750 Cc', 3, 9, true),
('Licor Dom Benedictine', 3, 9, true),
('Licor Chocolate Negro Tres Plumas 750 Cc', 3, 9, true),
('Licor De Anis 750 Cc De Oro', 3, 9, true),
('Licor De Cacao', 3, 9, true),
('Licor De Café Kahlúa 750 Cc', 3, 9, true),
('Licor De Caña De Uva 900 Ml Doñihue', 3, 9, true),
('Licor De Chocolate Blanco', 3, 9, true),
('Licor De Guinda 26° 750 Cc', 3, 9, true),
('Licor De Manzana Mirror''s 700 Cc', 3, 9, true),
('Licor Grand Marnier', 3, 9, true),
('Licor Malibu 750 Cc', 3, 9, true),
('Limoncello', 3, 9, true),
('Manzanilla Duval 30° 750 Cc', 3, 9, true),
('Manzanilla Tres Torres 26°', 3, 9, true),
('Martini Bianco 16° 750 Cc', 3, 9, true),
('Martini Extra Dry 18 ° 750 Cc', 3, 9, true),
('Martini Extra Dry 18 ° 995 Cc', 3, 9, true),
('Martini Rosso 16° 750 Ml', 3, 9, true),
('Menta 750 Cc Mitjans', 3, 9, true),
('Mirin 500 Cc', 3, 9, true),
('Oporto Diamante', 3, 9, true),
('Pisco 35° Alto Del Carmen 0,750 Lt', 3, 9, true),
('Pisco 35° Alto Del Carmen 1 Lt', 3, 9, true),
('Pisco 35° Capel 1 Lt', 3, 9, true),
('Pisco 35° Fundo Los Nichos Elqui Reserva 750 Cc', 3, 9, true),
('Pisco 35° Mistral Especial 1 Lt', 3, 9, true),
('Pisco 35° Tres Erres Doble Destilado', 3, 9, true),
('Pisco 40 Mistral Añejado', 3, 9, true),
('Pisco 40° Alto Del Carmen', 3, 9, true),
('Pisco 40° Alto Del Carmen Transparente', 3, 9, true),
('Pisco 40° Horcón Quemado 645ml', 3, 9, true),
('Pisco 40° Malpaso 750 Ml', 3, 9, true),
('Pisco 40° Mistral Reservado', 3, 9, true),
('Pisco 43,5° Black Heron 700 Ml', 3, 9, true),
('Pisco 46° Mistral Nobel 750 Ml', 3, 9, true),
('Pisco La Serena 35° 750 Cc', 3, 9, true),
('Pisco Sagrado Corazon 35° 750cc', 3, 9, true),
('Pisco Tabernero 40° 2 Lt', 3, 9, true),
('Ron Añejo Botran', 3, 9, true),
('Ron Añejo Cabo Viejo 40° 750 Cc', 3, 9, true),
('Ron Añejo Havana Club 7 Años 750 Cc', 3, 9, true),
('Ron Añejo Madero', 3, 9, true),
('Ron Blanco Barcelo 1 Lt', 3, 9, true),
('Ron Blanco Bacardi 40° 750 Ml', 3, 9, true),
('Ron Blanco Bacardi 40° 980 Ml', 3, 9, true),
('Ron Dorado Abuelo Añejo 1 Lt', 3, 9, true),
('Ron Dorado Bacardi 40° 750 Cc', 3, 9, true),
('Ron Dorado Reserva Havanna Club Añejo 40° 700 Cc', 3, 9, true),
('Sake Botella 750 Cc', 3, 9, true),
('Sake Botellin 250 Cc', 3, 9, true),
('Sake Soju Botellin 360 Ml', 3, 9, true),
('Sheridan´s 750 Cc 40°', 3, 9, true),
('Tequila 38° Blanco Jose Cuervo 750 Cc', 3, 9, true),
('Tequila 38° Blanco Sombrero Negro 750 Cc', 3, 9, true),
('Tequila 38° Dorado Sombrero Negro 700 Cc', 3, 9, true),
('Triple Sec Mitjans 750 Ml 20°', 3, 9, true),
('Vino Blanco 120 Tres Medallas 750 Cc', 3, 9, true),
('Vino Blanco Caja Gato 1 Lt', 3, 7, true),
('Vino Blanco Chardonnay Casas Del Bosque', 3, 9, true),
('Vino Blanco Chardonnay J. Bouchon 750 Cc', 3, 9, true),
('Vino Blanco Chardonnay Kalfu Kuda 750 Cc', 3, 9, true),
('Vino Blanco Chardonnay Misiones De Rengo 750 Cc', 3, 9, true),
('Vino Blanco Chardonnay Quintay 750 Cc', 3, 9, true),
('Vino Blanco Chardonnay Reserva Misiones De Rengo 750 Cc', 3, 9, true),
('Vino Blanco Gato 750 Cc Botella', 3, 9, true),
('Vino Blanco Gewurztraminer Bicicleta 750 Cc', 3, 9, true),
('Vino Blanco Gewurztraminer Corralillo 750 Cc', 3, 9, true),
('Vino Blanco Moscatel Bisquertt 750 Cc', 3, 9, true),
('Vino Blanco Moscatel Koyle 750 Cc', 3, 9, true),
('Vino Blanco Riesling Corralillo 750cc', 3, 9, true),
('Vino Blanco Riesling Casas Del Bosque Rva', 3, 9, true),
('Vino Blanco Sauvignon Blanc Cartagena Casa Marin 750 Cc', 3, 9, true),
('Vino Blanco Sauvignon Blanc Casa Marin 750 Cc', 3, 9, true),
('Vino Blanco Sauvignon Blanc Casas Del Bosque 750 Cc', 3, 9, true),
('Vino Blanco Sauvignon Blanc Cool Coast Casa Silva 750 Cc', 3, 9, true),
('Vino Blanco Sauvignon Blanc J.bouchon 750 Cc', 3, 9, true),
('Vino Blanco Sauvignon Blanc Leyda 750 Cc', 3, 9, true),
('Vino Blanco Sauvignon Blanc Misiones De Rengo 750 Cc', 3, 9, true),
('Vino Blanco Sauvignon Blanc Reserva Misiones De Rengo 750 Cc', 3, 9, true),
('Vino Blanco Semillón Las Mercedes 750 Cc', 3, 9, true),
('Vino Blanco Semillón J Bouchon', 3, 9, true),
('Vino Blanco Viognier Maucho Casas Patronales 750 Cc', 3, 9, true),
('Vino Cabernet Sauvignon Rva Casas Del Bosque Valle Rapel 750 Cc', 3, 9, true),
('Vino Cabernet Sauvignon Rva Miguel Torres Valle Curico 750 Cc', 3, 9, true),
('Vino Cabernet Sauvignon Rva Queulat Valle Del Maipo 750 Cc', 3, 9, true),
('Vino Dulce / Licoroso Centenario 1lt', 3, 9, true),
('Vino Late Harvest 500 Cc Cabernet Sauvignon Espaldares', 3, 9, true),
('Vino Late Harvest Gewurztraminer/semillon/viognier Casa Silva 750 Cc', 3, 9, true),
('Vino Late Harvest Pajarete Armidita 500 Cc', 3, 9, true),
('Vino Late Harvest Santa Carolina 500cc', 3, 9, true),
('Vino Licoroso Zalamero 16° 750 Cc', 3, 9, true),
('Vino Pipeño Botellon 2 Litros', 3, 9, true),
('Vino Rose Casas Del Bosque 750 Cc', 3, 9, true),
('Vino Rosé Casillero Del Diablo 750 Cc', 3, 9, true),
('Vino Rose Castillo De Molina 750 Cc', 3, 9, true),
('Vino Rose J. Bouchon 750 Cc', 3, 9, true),
('Vino Rosé Santa Ema 750 Cc', 3, 9, true),
('Vino Tinto Cabernet Franc Valdivieso 750 Cc', 3, 9, true),
('Vino Tinto Cabernet Sauvignon Casas Patronales 750 Cc', 3, 9, true),
('Vino Tinto Cabernet Sauvignon Casillero Del Diablo 750 Cc', 3, 9, true),
('Vino Tinto Cabernet Sauvignon Cono Sur Bicicleta 750 Cc', 3, 9, true),
('Vino Tinto Cabernet Sauvignon Gato Botella 750 Cc', 3, 9, true),
('Vino Tinto Cabernet Sauvignon J. Bouchon 750 Cc', 3, 9, true),
('Vino Tinto Cabernet Sauvignon Koyle 750 Cc', 3, 9, true),
('Vino Tinto Cabernet Sauvignon Misiones De Rengo 750 Cc', 3, 9, true),
('Vino Tinto Cabernet Sauvignon Misiones De Rengo Rva 750 Cc', 3, 9, true),
('Vino Tinto Cabernet Sauvignon Morande 750 Cc', 3, 9, true),
('Vino Tinto Cabernet Sauvignon Perez Cruz Gran Rva', 3, 9, true),
('Vino Tinto Cabernet Sauvignon Santa Emiliana 750 Cc', 3, 9, true),
('Vino Tinto Cabernet Sauvignon Sta Rita Medalla Real 750cc', 3, 9, true),
('Vino Tinto Cabernet Sauvignon Viu Manet Gran Rva 750 Cc', 3, 9, true),
('Vino Tinto Caja Gato 1 Lt', 3, 7, true),
('Vino Tinto Carignan Casas Patronales 750 Cc', 3, 9, true),
('Vino Tinto Carignan Miguel Torres 750 Cc', 3, 9, true),
('Vino Tinto Carmenere Calcu 750 Cc', 3, 9, true),
('Vino Tinto Carmenere Casa Silva Gran Reserva 750 Cc', 3, 9, true),
('Vino Tinto Carmenere Casas Patronales 750 Cc', 3, 9, true),
('Vino Tinto Carmenere Gato 750 Cc Botella', 3, 9, true),
('Vino Tinto Carmenere J. Bouchon 750 Cc', 3, 9, true),
('Vino Tinto Carmenere Misiones De Rengo 750 Cc (Varietal)', 3, 9, true),
('Vino Tinto Carmenere Reserva Misiones De Rengo 750 Cc', 3, 9, true),
('Vino Tinto Cinsault Koyle 750 Cc', 3, 9, true),
('Vino Tinto Cinsault Queulat', 3, 9, true),
('Vino Tinto Franc Carmenere Oveja 750 Cc', 3, 9, true),
('Vino Tinto Malbec J. Bouchon 750 Cc', 3, 9, true),
('Vino Tinto Malbec Quintay 750 Cc', 3, 9, true),
('Vino Tinto Malbec Gran Rva Quintay 750cc', 3, 9, true),
('Vino Tinto Malbec San Pedro 1865', 3, 9, true),
('Vino Tinto Merlot De Martino Gran Reserva 750 Cc', 3, 9, true),
('Vino Tinto Merlot J. Bouchon 750 Cc', 3, 9, true),
('Vino Tinto Merlot Medalla Real 750 Cc', 3, 9, true),
('Vino Tinto Merlot Misiones De Rengo 750 Cc (Varietal)', 3, 9, true),
('Vino Tinto Merlot Reserva Misiones De Rengo 750 Cc', 3, 9, true),
('Vino Tinto Merlot Santa Ema 750 Cc', 3, 9, true),
('Vino Tinto Merlot Rva Viu Manent', 3, 9, true),
('Vino Tinto Pais Catalino 750 Cc', 3, 9, true),
('Vino Tinto Pais Salvaje J Bouchon 750 Cc', 3, 9, true),
('Vino Tinto Pinot Noir Casas Del Bosque 750 Cc', 3, 9, true),
('Vino Tinto Pinot Noir Leyda 750 Cc', 3, 9, true),
('Vino Tinto Pinot Noir Quintay 750 Cc', 3, 9, true),
('Vino Tinto Pinot Noir Rosé Casas Del Bosque 750 Cc', 3, 9, true),
('Vino Tinto Pinot Noir Gran Rva Santa Ema', 3, 9, true),
('Vino Tinto Syrah Casa Real Santa Rita 750 Cc', 3, 9, true),
('Vino Tinto Syrah Quintay 750 Cc', 3, 9, true),
('Vino Tinto Syrah Undurraga', 3, 9, true),
('Vino Tinto Syrah Villard Expresion', 3, 9, true),
('Vodka Absolut 750 Ml', 3, 9, true),
('Vodka Sky 750 Ml', 3, 9, true),
('Vodka Stolichnaya 1 Lt', 3, 9, true),
('Whiskey Bourbon 750 Cc', 3, 9, true),
('Whiskey Jack Daniels 750cc', 3, 9, true),
('Whiskey Jim Beam 750cc', 3, 9, true),
('Whiskey Wild Turkey 40,5° 750 Cc', 3, 9, true),
('Whisky Jura 700 Cc', 3, 9, true),
('Whisky Red Label Johnnie Walker 1 Lt', 3, 9, true);

--CATEGORIA: Frutas y Verduras Congeladas
INSERT INTO producto (nombre_producto, id_categoria, id_unidad, activo) VALUES
('Arandanos', 4, 2, true),
('Arvejas Enteras', 4, 2, true),
('Camote Congelado', 4, 2, true),
('Casata Helado Piña', 4, 1, true),
('Casata Helado Vainilla', 4, 1, true),
('Choclo En Grano', 4, 2, true),
('Choclo Patasca / Peruano', 4, 2, true),
('Frambuesa', 4, 2, true),
('Frutilla Congelada', 4, 2, true),
('Habas', 4, 2, true),
('Mix De Berries', 4, 2, true),
('Mix Primavera', 4, 2, true),
('Mora', 4, 2, true),
('Pastelera De Choclo', 4, 2, true),
('Porotos Granados', 4, 2, true),
('Poroto Verde', 4, 2, true),
('Pulpa De Arandanos', 4, 2, true),
('Pulpa Chirimoya', 4, 2, true),
('Pulpa De Durazno', 4, 2, true),
('Pulpa De Frambuesa', 4, 2, true),
('Pulpa De Frutilla', 4, 2, true),
('Pulpa De Guayaba', 4, 2, true),
('Pulpa De Limon', 4, 2, true),
('Pulpa De Lucuma', 4, 2, true),
('Pulpa De Mango', 4, 2, true),
('Pulpa De Maracuya C/pepas', 4, 2, true),
('Pulpa De Maracuya S/pepas', 4, 2, true),
('Pulpa De Melon-tuna', 4, 2, true),
('Pulpa De Papaya (Jugo 1lts)', 4, 3, true),
('Pulpa De Piña', 4, 2, true),
('Yuca/tapioca Congelada', 4, 2, true);

--CATEGORIA: Carnes
INSERT INTO producto (nombre_producto, id_categoria, id_unidad, activo) VALUES
('Cerdo Chuleta', 5, 1, true),
('Cerdo Costillar', 5, 2, true),
('Cerdo Costillar Ahumado', 5, 2, true),
('Cerdo Cuero', 5, 1, true),
('Cerdo Grasa (Tocino Blanco)', 5, 2, true),
('Cerdo Lomo', 5, 2, true),
('Cerdo Pata', 5, 1, true),
('Cerdo Malaya', 5, 2, true),
('Cerdo Pernil Ahumado', 5, 1, true),
('Cerdo Pernil Cocido', 5, 2, true),
('Cerdo Pulpa', 5, 2, true),
('Cerdo Solomillo', 5, 2, true),
('Cerdo Tripas (22/24mm)', 5, 2, true),
('Cerdo Tripas (33/35mm)', 5, 2, true),
('Conejo Entero', 5, 1, true),
('Cordero Carne Molida', 5, 2, true),
('Cordero Costillas (Percha Francesa)', 5, 2, true),
('Cordero Paletilla (Con Hueso)', 5, 2, true),
('Cordero Pulpa (Pata Deshuesada)', 5, 2, true),
('Embutido Arrollado De Huaso Trozo', 5, 2, true),
('Embutido Chorizo Criollo', 5, 2, true),
('Embutido Chorizo Sarta (Español) / Chistorra', 5, 2, true),
('Embutido Chorizo Tradicional San Jorge', 5, 2, true),
('Embutido Gordas', 5, 1, true),
('Embutido Longaniza Ahumada', 5, 2, true),
('Embutido Longaniza Llanquihue', 5, 2, true),
('Embutido Prietas', 5, 1, true),
('Embutido Salame', 5, 2, true),
('Embutido Salame Petit', 5, 1, true),
('Embutido Vienesas', 5, 1, true),
('Equino Charqui', 5, 2, true),
('Equino Lomo', 5, 2, true),
('Guatas Callo', 5, 2, true),
('Hamburguesas Llanquihue', 5, 1, true),
('Jamon Cerdo Acaramelado Laminado', 5, 2, true),
('Jamon Cerdo Acaramelado Trozo', 5, 2, true),
('Jamon Cerdo Ahumado', 5, 2, true),
('Jamon De Pavo Pechuga Cocida Laminada', 5, 2, true),
('Jamon De Pavo Asado', 5, 2, true),
('Jamón De Pavo Acaramelado Laminado', 5, 2, true),
('Jamon De Pavo Trozo', 5, 2, true),
('Jamón Pollo Acaramelado Laminado', 5, 2, true),
('Jamon Sandwich Laminado', 5, 2, true),
('Jamon Sandwich Trozo', 5, 2, true),
('Jamon Serrano', 5, 2, true),
('Pastrami', 5, 2, true),
('Pato Confite', 5, 2, true),
('Pato Entero', 5, 1, true),
('Pato Magret', 5, 1, true),
('Pavo Pechuga Ahumada Laminada', 5, 2, true),
('Pavo Pechuga Deshuesada', 5, 2, true),
('Pepperoni', 5, 2, true),
('Pollo Entero', 5, 1, true),
('Pollo Carcasa (Al Vacio)', 5, 2, true),
('Pollo Pechuga Deshuesada', 5, 2, true),
('Pollo Pechuga Entera', 5, 1, true),
('Pollo Suprema Congelada', 5, 1, true),
('Pollo Suprema (Al Vacio)', 5, 2, true),
('Pollo Tuto Ala', 5, 2, true),
('Pollo Tuto Corto', 5, 1, true),
('Pollo Tuto Entero', 5, 1, true),
('Pollo Tuto Largo', 5, 1, true),
('Prosciutto', 5, 2, true),
('Tocino Ahumado', 5, 2, true),
('Tocino Entero', 5, 2, true),
('Tocino Laminado (Ahumado)', 5, 2, true),
('Vacuno Asado De Tira', 5, 2, true),
('Vacuno Asiento', 5, 2, true),
('Vacuno Carne Molida', 5, 2, true),
('Vacuno Choclillo', 5, 2, true),
('Vacuno Entraña', 5, 2, true),
('Vacuno Filete', 5, 2, true),
('Vacuno Hamburguesa', 5, 1, true),
('Vacuno Huachalomo', 5, 2, true),
('Vacuno Huesos', 5, 2, true),
('Vacuno Lengua', 5, 1, true),
('Vacuno Lomo Liso', 5, 2, true),
('Vacuno Lomo Liso Trozo "250 Grs"', 5, 1, true),
('Vacuno Lomo Vetado', 5, 2, true),
('Vacuno Mollejas', 5, 2, true),
('Vacuno Osobuco', 5, 2, true),
('Vacuno Plateada', 5, 2, true),
('Vacuno Posta Negra', 5, 2, true),
('Vacuno Posta Negra Molida', 5, 2, true),
('Vacuno Posta Rosada', 5, 2, true),
('Vacuno Posta Rosada Molida', 5, 2, true),
('Vacuno Sobrecostilla', 5, 2, true);

--CATEGORIA: Pescados y Mariscos
INSERT INTO producto (nombre_producto, id_categoria, id_unidad, activo) VALUES
('Albacora Medallones', 6, 2, true),
('Almeja Congelada', 6, 2, true),
('Almejas Frescas', 6, 2, true),
('Almejas Limpias S/concha', 6, 2, true),
('Almejas Pequeñas Congeladas', 6, 2, true),
('Almejas Pequeñas Frescas', 6, 2, true),
('Anillos De Calamar', 6, 2, true),
('Atun Medallon Congelado', 6, 2, true),
('Atun Trozo', 6, 2, true),
('Calamar Vaina', 6, 2, true),
('Camaron 100/200 Ecuatoriano', 6, 2, true),
('Camaron 36/40 (Ecuatoriano)', 6, 2, true),
('Camaron Nacional 100/200', 6, 2, true),
('Camaron Nylon', 6, 2, true),
('Carne De Centolla (500grs)', 6, 2, true),
('Choritos Congelados', 6, 2, true),
('Choritos Frescos', 6, 2, true),
('Choritos S/ Concha', 6, 2, true),
('Congrio Entero Fresco', 6, 1, true),
('Congrio Filete Congelado', 6, 2, true),
('Congrio Filete Fresco', 6, 2, true),
('Congro Cabeza / Espinazo', 6, 2, true),
('Corvina Entera Fresca', 6, 1, true),
('Corvina Filete Congelado', 6, 2, true),
('Corvina Filete Fresco', 6, 2, true),
('Jaiba Carne Desmenuzada', 6, 2, true),
('Jaiba Entera Fresca', 6, 1, true),
('Kanikama', 6, 2, true),
('Langostino', 6, 2, true),
('Macha Media Concha Congelada', 6, 1, true),
('Macha Sin Concha Congelada', 6, 2, true),
('Machas Con Concha Fresca', 6, 2, true),
('Merluza Austral Filete Congelado', 6, 2, true),
('Merluza Entera Fresca', 6, 1, true),
('Merluza Filete Congelado', 6, 2, true),
('Merluza Filete Fresca', 6, 2, true),
('Ostiones Con Coral Congelado', 6, 2, true),
('Ostiones Sin Coral Congelado', 6, 2, true),
('Pescado De Roca Entero Fresco', 6, 1, true),
('Picoroco C/Concha', 6, 2, true),
('Piure Sin Peña', 6, 2, true),
('Pulpo Calibre 1,5 Kilos', 6, 2, true),
('Reineta Entera Fresca', 6, 1, true),
('Reineta Filete Congelado', 6, 2, true),
('Reineta Filete Fresca', 6, 2, true),
('Salmon Ahumado Interfoliado', 6, 2, true),
('Salmon Entero Fresco', 6, 1, true),
('Salmon Filete Congelado', 6, 2, true),
('Salmon Filete Fresco (Congelado Al Vacio)', 6, 2, true),
('Slice De Salmon', 6, 2, true),
('Surtido De Mariscos', 6, 2, true),
('Trucha Fresca', 6, 1, true);
 

-- CREACION INVENTARIO POBLADO CON MOVIMIENTO
DO $$
DECLARE
    r_prod RECORD;
    v_stock_min NUMERIC(10,3);
    v_stock_actual NUMERIC(10,3);
    v_id_reciente INTEGER;
BEGIN
    FOR r_prod IN SELECT id_producto FROM producto WHERE id_producto NOT IN (SELECT id_producto FROM inventario) LOOP

        -- 1. Cálculos aleatorios
        -- Stock mínimo (límite de alerta) sigue siendo pequeño (ej: 5 a 15)
        v_stock_min := CAST(FLOOR(RANDOM() * 11 + 5) AS NUMERIC);

        -- Stock actual entre 51 y 100
        -- Fórmula: RANDOM() * (MAX - MIN + 1) + MIN
        v_stock_actual := CAST(FLOOR(RANDOM() * (100 - 51 + 1) + 51) AS NUMERIC);

        -- 2. Insertamos en inventario
        INSERT INTO inventario (id_producto, stock, stock_limit)
        VALUES (r_prod.id_producto, v_stock_actual, v_stock_min)
        RETURNING id_inventario INTO v_id_reciente;

        -- 3. Crear el registro espejo en MOVIMIENTO
        INSERT INTO movimiento (
            id_usuario,
            id_inventario,
            stock_movimiento,
            tipo_movimiento,
            fecha_movimiento,
            observacion
        )
        VALUES (
            1,
            v_id_reciente,
            v_stock_actual,
            'ENTRADA_INVENTARIO',
            NOW(),
            'Carga inicial - Rango 51-100'
        );

    END LOOP;

    RAISE NOTICE 'Carga de inventario (51-100) completada.';
END $$;


-- CREACION DE MOVIMIENTO TRASLADO + BODEGA TRANSITO
DO $$
DECLARE
    r_inv RECORD;
    v_cantidad NUMERIC(10,3);
BEGIN

    FOR r_inv IN
        SELECT id_inventario, stock
        FROM inventario
        WHERE stock >= 50 -- Aseguramos que tenga suficiente para el rango solicitado
        FOR UPDATE
    LOOP

        -- Definir cantidad a trasladar entre 30 y 50
        v_cantidad := CAST(FLOOR(RANDOM() * (50 - 30 + 1) + 30) AS NUMERIC);

        -- 📉 Descontar inventario
        UPDATE inventario
        SET stock = stock - v_cantidad
        WHERE id_inventario = r_inv.id_inventario;

        -- 📝 Crear movimiento
        INSERT INTO movimiento (
            id_usuario,
            id_inventario,
            stock_movimiento,
            tipo_movimiento,
            fecha_movimiento,
            observacion
        )
        VALUES (
            1,
            r_inv.id_inventario,
            v_cantidad,
            'TRASLADO',
            NOW(),
            'Traslado aleatorio (30-50) a bodega tránsito'
        );

        -- 🚚 Insertar en tránsito
        INSERT INTO bodega_transito (
            id_inventario,
            stock,
            stock_limit,
            activo
        )
        VALUES (
            r_inv.id_inventario,
            v_cantidad,
            0,
            TRUE
        );

    END LOOP;

    RAISE NOTICE 'Traslado masivo (30-50) completado.';

END $$;

--BLOQUE CARGA MASIVA 50 PLANTILLAS DE PEDIDO (EX-RECETAS) Y DETALLES
DO $$
DECLARE
    -- Lista de nombres para las plantillas (50 nombres variados)
    v_nombres TEXT[] := ARRAY[
        'Pizza Margarita Clasica', 'Lasaña Boloñesa Tradicional', 'Risotto de Champiñones', 'Ceviche de Reineta',
        'Tacos al Pastor', 'Ensalada Cesar con Pollo', 'Sopa de Cebolla Francesa', 'Pasta Carbonara Original',
        'Hamburguesa Gourmet KuHub', 'Sushi Rolls Variados', 'Paella Valenciana', 'Gnocchi de Papa al Pesto',
        'Pollo al Curry con Coco', 'Salmón a la Plancha', 'Ratatouille de Verduras', 'Quiche de Espinacas',
        'Tarta de Manzana Casera', 'Mousse de Chocolate Amargo', 'Cazuela de Vacuno', 'Empanadas de Pino',
        'Hummus Tradicional', 'Falafel con Salsa Tahini', 'Pad Thai de Camarones', 'Tiramisu Italiano',
        'Brownie de Chocolate y Nueces', 'Crepes Suzette', 'Sopaipillas Pasadas', 'Chupe de Locos',
        'Pastel de Choclo', 'Pescado frito con Ensalada', 'Cordero al Palo', 'Costillar de Cerdo BBQ',
        'Ensalada de Quinoa', 'Burritos de Pollo', 'Gazpacho Andaluz', 'Crema de Zapallo Camote',
        'Aji de Gallina', 'Lomo Saltado Peruano', 'Arepas Reina Pepiada', 'Pabellon Criollo',
        'Feijoada Completa', 'Tortilla Española', 'Baguette Parisina', 'Focaccia con Romero',
        'Muffin de Arandanos', 'Galletas de Avena', 'Cheesecake de Frutos Rojos', 'Couscous Marroqui',
        'Poke Bowl de Atun', 'Ramen de Cerdo Tonkotsu'
    ];

    v_nombre_actual TEXT;
    v_id_pedido_maestro INTEGER;
    v_num_ingredientes INTEGER;
    v_id_producto INTEGER;
    v_cant NUMERIC(10,3);
BEGIN
    -- Limpiamos datos previos si es necesario (Opcional)
    -- DELETE FROM detalle_pedido_semana_bodega; DELETE FROM pedido_semana_bodega;

    -- Iteramos sobre los 50 nombres
    FOR i IN 1..50 LOOP
        v_nombre_actual := v_nombres[i];

        -- 1. Insertar Cabecera de la Plantilla Maestro
        INSERT INTO pedido_semana_bodega (
            nombre_pedido_semana_bodega,       -- <--- ACTUALIZADO
            descripcion_pedido_semana_bodega,  -- <--- ACTUALIZADO
            activo,
            estado_pedido
        )
        VALUES (
            v_nombre_actual,
            'Descripcion automatica para ' || v_nombre_actual || '. Ideal para pruebas de paginacion en KuHub.',
            TRUE,
            'ACTIVO' -- Valor del enum definido en tu DB
        )
        RETURNING id_pedido_semana_bodega INTO v_id_pedido_maestro;

        -- 2. Definir cantidad aleatoria de ingredientes (entre 3 y 7)
        v_num_ingredientes := FLOOR(RANDOM() * 5 + 3);

        -- 3. Insertar Detalles (Ingredientes)
        -- Usamos un bucle interno para evitar productos duplicados en la misma plantilla
        FOR j IN 1..v_num_ingredientes LOOP

            -- Seleccionamos un producto aleatorio que exista en la DB
            SELECT id_producto INTO v_id_producto
            FROM producto
            ORDER BY RANDOM()
            LIMIT 1;

            -- Cantidad aleatoria entre 0.100 y 2.500
            v_cant := ROUND(CAST(RANDOM() * 2.4 + 0.1 AS NUMERIC), 3);

            -- Insertar detalle (usando INSERT IGNORE lógico con ON CONFLICT para no romper el script)
            INSERT INTO detalle_pedido_semana_bodega (id_pedido_semana_bodega, id_producto, cant_producto)
            VALUES (v_id_pedido_maestro, v_id_producto, v_cant)
            ON CONFLICT (id_pedido_semana_bodega, id_producto) DO NOTHING;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Se han creado 50 plantillas maestras de pedido con sus respectivos detalles exitosamente.';
END $$;

-- =====================================================
-- FIN DEL SCRIPT DE INSERCIONES INICIALES
-- =====================================================


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


-- ================================================================
-- INSERCIÓN: 10 Proveedores modelo con todos los productos activos
-- Precios generados aleatoriamente (CLP 500 – 50.000)
-- ================================================================
DO $$
DECLARE
v_proveedor_id INTEGER;
    v_prod         RECORD;
    v_num_dias     INTEGER;
    v_precio_neto  NUMERIC(10,3); -- Variable para asegurar el mismo precio base
    proveedores    TEXT[][] := ARRAY[
        ARRAY['76.123.456-7', 'Distribuidora Del Valle Ltda.',         'Juan Pérez',        '+56 9 7123 4567', 'jperez@delvalle.cl'],
        ARRAY['77.234.567-8', 'Comercial Andina S.A.',                 'María González',    '+56 9 8234 5678', 'mgonzalez@andina.cl'],
        ARRAY['78.345.678-9', 'Insumos Gastronómicos Sur Ltda.',       'Pedro Rodríguez',   '+56 9 9345 6789', 'prodriguez@insumossur.cl'],
        ARRAY['79.456.789-0', 'Proveedora Culinaria Norte S.A.',       'Ana Martínez',      '+56 9 6456 7890', 'amartinez@culinarianorte.cl'],
        ARRAY['76.567.890-K', 'Distribuciones Premium Chile Ltda.',    'Luis Sánchez',      '+56 9 5567 8901', 'lsanchez@premiumchile.cl'],
        ARRAY['77.678.901-1', 'Central de Abastos Santiago S.A.',      'Carmen López',      '+56 9 4678 9012', 'clopez@abastos.cl'],
        ARRAY['78.789.012-2', 'Insumos Profesionales Culinarios Ltda.','Roberto Jiménez',   '+56 9 3789 0123', 'rjimenez@insumospro.cl'],
        ARRAY['79.890.123-3', 'Distribuidora Los Andes S.A.',          'Patricia Ramírez',  '+56 9 2890 1234', 'pramirez@losandes.cl'],
        ARRAY['76.901.234-4', 'Proveedora Gastronómica Pacífico Ltda.','Jorge Morales',     '+56 9 1901 2345', 'jmorales@gastronomicapac.cl'],
        ARRAY['77.012.345-5', 'Comercializadora BioChile S.A.',        'Valentina Torres',  '+56 9 0012 3456', 'vtorres@biochile.cl']
    ];
    i INTEGER;
BEGIN
FOR i IN 1..array_length(proveedores, 1) LOOP

        -- 1. Insertar Proveedor
        INSERT INTO proveedor (
            rut_proveedor,
            nombre_distribuidora,
            nombre_proveedor,
            telefono_proveedor,
            email_proveedor
        )
        VALUES (
            proveedores[i][1],
            proveedores[i][2],
            proveedores[i][3],
            proveedores[i][4],
            proveedores[i][5]
        )
        RETURNING id_proveedor INTO v_proveedor_id;

        -- 2. Asociar todos los productos activos
FOR v_prod IN
SELECT id_producto FROM producto WHERE activo = TRUE
    LOOP
            -- Generamos el precio neto base: random entre 2.000 y 10.000
            v_precio_neto := ROUND((RANDOM() * 8000 + 2000)::NUMERIC, 3);

-- Insertamos usando la variable v_precio_neto para calcular el IVA real (19%)
INSERT INTO proveedor_producto (id_proveedor, id_producto, precio_neto, precio_con_iva)
VALUES (
           v_proveedor_id,
           v_prod.id_producto,
           v_precio_neto,
           ROUND(v_precio_neto * 1.19, 3)
       );
END LOOP;

        -- 3. Generar entre 1 y 3 días de entrega aleatorios para este proveedor
        v_num_dias := floor(random() * 3 + 1)::INT;

INSERT INTO proveedor_dia_entrega (id_proveedor, dia_semana, hora_inicio_entrega, hora_fin_entrega)
SELECT
    v_proveedor_id,
    dia_random,
    '08:00:00'::TIME,
    '17:00:00'::TIME
FROM (
         SELECT unnest(enum_range(NULL::dia_semana_type)) AS dia_random
         ORDER BY random()
             LIMIT v_num_dias
     ) sub;

END LOOP;
END;
$$;
