-- ═══════════════════════════════════════════════════════════════════════════
-- ConexionXD_v3.sql — Bitácora de cambios de esquema para desarrollo
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Vigencia: a partir del 2026-08-05.
--
-- Convención: toda sentencia ALTER TABLE, CREATE TABLE (o cualquier otro DDL)
-- que se implemente durante el desarrollo a partir de esta fecha debe
-- agregarse a este archivo, en el orden en que se va aplicando en el entorno
-- de desarrollo. La idea es mantener acá un registro único y cronológico de
-- todos los cambios de esquema, en vez de dispersarlos en scripts sueltos.
--
-- Este archivo NO se ejecuta directamente sobre producción. Es un borrador
-- de trabajo: más adelante, a partir de lo que quede acumulado acá, se
-- armará un script definitivo para aplicar en el ambiente de producción.
-- Producción ya está en funcionamiento, así que ningún cambio de esquema se
-- aplica ahí directamente — primero se documenta y valida en este archivo.
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-08-05 — Nueva configuración global: "Registro de disponible obligatorio"
-- ─────────────────────────────────────────────────────────────────────────────
-- Contexto de negocio: al hacer una ENTRADA manual (a Inventario o a Bodega de
-- Tránsito, tanto por el modal fila a fila "Control de Inventario" como por el
-- masivo "Control de Stock Masivo") que NO proviene de una orden de
-- Abastecimiento de Proveedores, el sistema pregunta si esa cantidad debe
-- registrarse como stock disponible (excedente no asociado a ningún pedido o
-- solicitud). Hoy esa confirmación siempre tiene 3 opciones: Cancelar (aborta
-- todo), Continuar sin registrar (guarda pero sin trazabilidad del sobrante) y
-- Sí, registrar disponibles.
--
-- Se agrega un flag para que el Administrador pueda, desde Administración del
-- Sistema › Gestión del Sistema, exigir que el registro de disponible sea
-- obligatorio: si se activa, la opción "Continuar sin registrar" deja de
-- ofrecerse en esos diálogos y solo quedan Cancelar o Registrar disponibles
-- (no se puede seguir sin registrar el sobrante).
--
-- Mismo patrón que la columna existente solicitudes_en_pedido: se agrega a la
-- tabla gestion_sistema (fila id=1 = predeterminada/solo lectura para
-- "Restablecer", fila id=2 = activa, la que edita el panel). Default FALSE
-- en ambas filas para preservar el comportamiento actual (opcional).

ALTER TABLE gestion_sistema
    ADD COLUMN IF NOT EXISTS disponible_obligatorio BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE gestion_sistema
   SET disponible_obligatorio = FALSE
 WHERE id IN (1, 2);
