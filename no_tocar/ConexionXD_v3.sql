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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-08-05 — stock_disponible: autor del registro (id_usuario)
-- ─────────────────────────────────────────────────────────────────────────────
-- Contexto de negocio: el modal "Stock Disponible" (pestañas Inventario y Bodega
-- de Tránsito) es un control de qué sobrante hay vigente por producto, con la
-- opción de ver el detalle fila por fila de cada evento de registro (igual que
-- el historial de Movimientos). Para eso, cada registro de sobrante necesita
-- guardar qué usuario lo generó — hoy no queda ningún rastro de autoría.
--
-- Se agrega id_usuario como FK opcional (nullable) a usuario: los registros que
-- ya existían antes de esta columna no tienen autor conocido, así que se dejan
-- en NULL en vez de forzar un valor ficticio. De acá en adelante,
-- StockDisponibleServiceImpl.registrar() lo completa siempre, resolviendo el
-- usuario autenticado desde el token (mismo patrón que Movimiento.usuario /
-- UsuarioService.findUserByToken()).

ALTER TABLE stock_disponible
    ADD COLUMN IF NOT EXISTS id_usuario INTEGER REFERENCES usuario(id_usuario);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-08-06 — detalle_solicitud: elimina el boolean enviado_bodega_transito
-- ─────────────────────────────────────────────────────────────────────────────
-- Contexto de negocio: enviado_bodega_transito era un flag booleano que se
-- marcaba en true apenas se despachaba cualquier cantidad de un detalle hacia
-- bodega de tránsito, sin importar si se había enviado todo lo solicitado ni
-- si ese stock seguía físicamente disponible después (ej. se perdía por una
-- merma posterior). Eso generaba falsos positivos de "enviado completo".
--
-- Se reemplazó por cantidadEnviadaBodega, calculado en tiempo real como la
-- suma de movimiento.stock_movimiento (tipo_movimiento = TRASLADO) agrupada
-- por (id_solicitud, id_producto) — ver SolicitudRepository.findAbastecimientoBodegaJson
-- y AbastecimientoBodegaDTO. Ese valor, combinado con el stock vivo de
-- bodega_transito en coberturaBodega (PedidoMasivoModal.tsx), permite
-- distinguir envío parcial, envío completo y el caso "se envió pero ya no
-- está en bodega" (estado 'perdido' en getEstadoEnvio).
--
-- El endpoint marcarEnviadosBodega/marcarEnviadoBodegaService que escribía
-- esta columna ya fue eliminado del backend y del frontend, y el campo
-- DetalleSolicitud.enviadoBodegaTransito ya fue quitado de la entidad — no
-- queda ninguna lectura ni escritura de esta columna en el código. Ver
-- PENDIENTES_POR_MODULOS.MD para el detalle de la migración de lógica.

ALTER TABLE detalle_solicitud
    DROP COLUMN IF EXISTS enviado_bodega_transito;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-08-06 — elimina la tabla stock_disponible
-- ─────────────────────────────────────────────────────────────────────────────
-- Contexto de negocio: stock_disponible guardaba a mano (INSERT al detectar sobrante +
-- UPDATE/descuento al consumirlo) los excedentes de Inventario y de Bodega de Tránsito.
-- Las 3 pestañas del modal "Stock Disponible" (Inventario, Bodega Tránsito, Disponible
-- Real) ya fueron migradas a cálculos en vivo contra el stock actual y la demanda
-- comprometida (inventario / bodega_transito / solicitud / reserva_stock_solicitud) —
-- ver StockDisponibleRepository.findDisponibleInventarioPaginado,
-- findSobranteBodegaTransitoPeriodoPaginado y findDisponibleRealPaginado. Con las 3
-- pestañas migradas, la tabla ya no recibe ningún INSERT ni se lee para ninguna vista.
--
-- Se eliminó del backend: la entity StockDisponible, los endpoints /registrar, /restar
-- y /por-productos de StockDisponibleController (huérfanos desde que se quitaron los
-- diálogos de detección en el frontend), los métodos del repositorio que leían/escribían
-- sobre stock_disponible, y los DTOs RegistrarDisponibleDTO/RestarDisponibleDTO/
-- RestarDisponibleResult/StockDisponiblePage. El DROP se hace después (no antes) de
-- confirmar que ningún código en el backend siga apuntando a la tabla.

DROP TABLE IF EXISTS stock_disponible;
