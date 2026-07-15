# VERIFICACIÓN DE TABLAS E ÍNDICES — USO EN CONSULTAS BACKEND

> **Propósito:** Registro de auditoría de tablas (líneas 261–985) e índices (líneas 2093–2217) de `ConexionXD_v2.sql`
> frente a las consultas reales del backend.
> **Última revisión:** 2026-06-27
> **Convenio de checkboxes:** `[x]` = verificado en al menos una consulta del backend · `[ ]` = pendiente de verificar
> **Leyenda:** ✅ índice aprovechado · ⚠️ posible mejora · 🔴 índice FALTANTE identificado

---

## 1. TABLAS (líneas 261–985)

### 1.1 Tablas de configuración y seguridad

| # | Tabla | Líneas SQL | Columnas clave | Verificada |
|---|-------|-----------|----------------|-----------|
| 1 | `gestion_sistema` | 261–265 | id, solicitudes_en_pedido | [x] |
| 2 | `rol` | 268–272 | id_rol, nombre_rol (tipo_rol_type) | [x] |
| 3 | `usuario` | 275–294 | id_usuario, id_rol, email, username, contrasena, activo | [x] |
| 4 | `refresh_token` | 296–312 | id_refresh_token, token, id_usuario, activo, expires_at | [x] |
| 5 | `modulo` | 961–971 | id_modulo, codigo_modulo, enabled | [x] |
| 6 | `permiso_rol` | 973–985 | id_permiso_rol, id_rol, id_modulo, puede_leer/crear/actualizar/eliminar | [x] |
| 7 | `soporte_ticket` | 946–958 | id_soporte, id_usuario, estado, fecha_creacion | [x] |

### 1.2 Tablas académicas

| # | Tabla | Líneas SQL | Columnas clave | Verificada |
|---|-------|-----------|----------------|-----------|
| 8 | `bloque_horario` | 316–322 | id_bloque, numero_bloque, hora_inicio, hora_fin | [x] |
| 9 | `asignatura` | 325–331 | id_asignatura, cod_asignatura, nombre_asignatura, activo | [x] |
| 10 | `sala` | 334–339 | id_sala, cod_sala, nombre_sala, activo | [x] |
| 11 | `seccion` | 342–353 | id_seccion, id_asignatura, nombre_seccion, estado_seccion, activo | [x] |
| 12 | `reserva_sala` | 356–373 | id_reserva_sala, id_seccion, id_sala, dia_semana, id_bloque, activo | [x] |
| 13 | `docente_seccion` | 397–413 | id_docente_seccion, id_usuario, id_seccion, fecha_asignacion | [x] |
| 14 | `asignatura_profesor_cargo` | 433–446 | id, id_asignatura, id_usuario, fecha_asignacion | [x] |
| 15 | `semanas` | 619–629 | id_semana, nombre_semana, fecha_inicio, fecha_fin, anio, semestre | [x] |

### 1.3 Tablas de inventario y productos (CRÍTICAS)

| # | Tabla | Líneas SQL | Columnas clave | Verificada |
|---|-------|-----------|----------------|-----------|
| 16 | `unidad_medida` | 451–457 | id_unidad, nombre_unidad, abreviatura, es_fraccionario, activo | [x] |
| 17 | `categoria` | 460–465 | id_categoria, nombre_categoria, activo | [x] |
| 18 | `categoria_abastecimiento` | 544–548 | id_categoria, tipo_abastecimiento (PK compuesta) | [x] |
| 19 | `producto` | 469–502 | id_producto, cod_producto, nombre_producto, id_categoria, id_unidad, activo | [x] |
| 20 | `inventario` | 505–515 | id_inventario, id_producto, stock, stock_limit, activo | [x] |
| 21 | `bodega_transito` | 522–541 | id_bodega_transito, id_inventario, stock, stock_limit, activo | [x] |
| 22 | `stock_disponible` | 763–773 | id_stock_disponible, id_producto, id_pedido, id_solicitud, cantidad, tipo_disponible, activo | [x] |
| 23 | `movimiento` | 856–888 | id_movimiento+fecha_movimiento (PK), id_usuario, id_inventario, tipo_movimiento, id_solicitud, id_pedido, id_orden_pedido, id_detalle_orden_pedido | [x] |
| 23a | *partición* `movimiento_2026_s1` | 892–893 | Ene–Jun 2026 | [x] |
| 23b | *partición* `movimiento_2026_s2` | 895–897 | Jul–Dic 2026 | [x] |
| 23c | *partición* `movimiento_2027_s1` | 899–901 | Ene–Jun 2027 | [x] |
| 23d | *partición* `movimiento_2027_s2` | 903–905 | Jul–Dic 2027 | [x] |
| 23e | *partición* `movimiento_default` | 906–907 | DEFAULT (fuera de rango) | [x] |

### 1.4 Tablas de proveedores (CRÍTICAS)

| # | Tabla | Líneas SQL | Columnas clave | Verificada |
|---|-------|-----------|----------------|-----------|
| 24 | `proveedor` | 553–564 | id_proveedor, rut_proveedor, nombre_distribuidora, estado_proveedor, activo | [x] |
| 25 | `proveedor_producto` | 567–591 | id_proveedor_producto, id_proveedor, id_producto, precio_neto, precio_con_iva, activo, fecha_actualizacion | [x] |
| 26 | `proveedor_dia_entrega` | 593–612 | id_dia_entrega, id_proveedor, dia_semana, hora_inicio_entrega, hora_fin_entrega | [x] |

### 1.5 Tablas de solicitud (CRÍTICAS)

| # | Tabla | Líneas SQL | Columnas clave | Verificada |
|---|-------|-----------|----------------|-----------|
| 27 | `solicitud` | 681–696 | id_solicitud, id_usuario_gestor_solicitud, id_seccion, id_pedido_semana_bodega, id_reserva_sala, fecha_solicitada, estado_solicitud | [x] |
| 28 | `detalle_solicitud` | 699–712 | id_detalle_solicitud, id_solicitud, id_producto, cant_producto_solicitud, enviado_bodega_transito | [x] |
| 29 | `motivo_rechazo_solicitud` | 715–727 | id_motivo, id_solicitud, motivo, fecha_rechazo | [x] |

### 1.6 Tablas de pedido (CRÍTICAS)

| # | Tabla | Líneas SQL | Columnas clave | Verificada |
|---|-------|-----------|----------------|-----------|
| 30 | `pedido_semana_bodega` (receta) | 637–657 | id_pedido_semana_bodega, id_semana, id_asignatura, nombre, estado_pedido, activo | [x] |
| 31 | `detalle_pedido_semana_bodega` | 661–678 | id_detalle_pedido_semana, id_pedido_semana_bodega, id_producto, cant_producto | [x] |
| 32 | `pedido` | 730–736 | id_pedido, fecha_inicio_pedido, fecha_fin_pedido, estado_pedido | [x] |
| 33 | `detalle_pedido` | 739–747 | id_pedido_detalle, id_pedido, id_producto, cant_producto_pedido | [x] |
| 34 | `pedido_solicitud` | 750–760 | id_pedido_solicitud, id_pedido, id_solicitud, fecha_union_registro | [x] |

### 1.7 Tablas de orden de pedido (CRÍTICAS)

| # | Tabla | Líneas SQL | Columnas clave | Verificada |
|---|-------|-----------|----------------|-----------|
| 35 | `orden_pedido` | 784–794 | id_orden_pedido, id_pedido, id_proveedor, estado_orden_pedido, activo | [x] |
| 36 | `detalle_orden_pedido` | 797–809 | id_detalle_orden_pedido, id_orden_pedido, id_producto, cantidad_solicitada, fecha_entrega, entregado, activo | [x] |
| 37 | `detalle_orden_pedido_solicitud` | 814–824 | id_dop_solicitud, id_detalle_orden_pedido, id_solicitud, cantidad_atribuida, activo | [x] |
| 38 | `reserva_stock_solicitud` | 845–853 | id_reserva, id_solicitud, id_producto, cantidad, activo | [x] |

---

## 2. ÍNDICES (líneas 2093–2217)

### 2.1 usuario y refresh_token

| Índice | Columna(s) | Tipo | Consultas backend que lo usan | [x] |
|--------|-----------|------|-------------------------------|-----|
| `idx_usuario_rol` | `usuario(id_rol)` | B-tree | `findUsuariosParaFrontend` / `countUsuariosParaFrontend` (filtro `id_rol IN csv`); `findByRolAndActivoTrue`; `findAllByRol_IdRol` | [x] |
| `idx_usuario_email` | `usuario(email)` | B-tree | `findByIdentifier` (`LOWER(email) = LOWER(:id)`); `searchUsuariosParaFrontend` (email ILIKE); `existsByEmail` | [x] |
| `idx_usuario_username` | `usuario(username)` | B-tree | `findByIdentifier` (`LOWER(username) = LOWER(:id)`); `existsByUsername` | [x] |
| `idx_usuario_email_activo` | `usuario(email) WHERE activo=true` | Parcial UNIQUE | `findUserAuth` (WHERE `email = :id AND activo=true`); `findByEmailIgnoreCaseAndActivoTrue`; `existsUsuarioByEmailAndActivo` | [x] |
| `idx_usuario_username_activo` | `usuario(username) WHERE activo=true` | Parcial UNIQUE | `findUserAuth` (WHERE `username = :id AND activo=true`); `existsUsuarioByUsernameAndActivo` | [x] |
| `idx_refresh_token_string` | `refresh_token(token)` | B-tree | `findByTokenAndActivoTrue` (JPA: WHERE `token = :t AND activo=true`) | [x] |
| `idx_refresh_token_usuario` | `refresh_token(id_usuario)` | B-tree | `revocarTodosPorUsuario` (WHERE `id_usuario = :id AND activo=true`) | [x] |

### 2.2 Académico

| Índice | Columna(s) | Tipo | Consultas backend que lo usan | [x] |
|--------|-----------|------|-------------------------------|-----|
| `idx_bloque_numero` | `bloque_horario(numero_bloque)` | B-tree | JPA by `numero_bloque`; JOIN desde `reserva_sala` en queries de `SeccionRepository` | [x] |
| `idx_seccion_asignatura` | `seccion(id_asignatura)` | B-tree | `SeccionRepository.findAllAsignaturasConSeccionesYReservas`; `SolicitudRepository.findCourseWithSectionsAndBlocksRaw` (JOIN `seccion ON id_asignatura`) | [x] |
| `idx_asignatura_codigo` | `asignatura(cod_asignatura)` | B-tree | `AsignaturaRepository` JPA by `cod_asignatura` | [x] |
| `idx_sala_codigo` | `sala(cod_sala)` | B-tree | `SalaRepository` JPA by `cod_sala` | [x] |
| `idx_reserva_seccion` | `reserva_sala(id_seccion)` | B-tree | `SeccionRepository.findSectionWithReservationsById`, `findAllAsignaturasConSeccionesYReservas`; subqueries `WHERE rs.id_seccion = s.id_seccion AND rs.activo=true` | [x] |
| `idx_reserva_sala_sala` | `reserva_sala(id_sala)` | B-tree | Queries de disponibilidad y validación de sala filtradas por `id_sala` | [x] |
| `idx_reserva_bloque` | `reserva_sala(id_bloque)` | B-tree | JOIN desde `bloque_horario` en queries de horarios (`SeccionRepository`, `SolicitudRepository`) | [x] |
| `idx_reserva_dia_bloque` | `reserva_sala(dia_semana, id_bloque)` | Compuesto | Validaciones de solapamiento; búsqueda de reservas por día + bloque específico | [x] |
| `idx_reserva_seccion_activa` | `reserva_sala(id_seccion, activo)` | Compuesto | `findAllAsignaturasConSeccionesYReservas`: WHERE `id_seccion = :s AND activo=true` | [x] |
| `uk_reserva_activa` | `reserva_sala(id_sala, dia_semana, id_bloque) WHERE activo=true` | Parcial UNIQUE | Garantiza que una sala no tenga dos reservas activas en mismo día y bloque (unicidad física) | [x] |
| `uk_seccion_dia_bloque_activa` | `reserva_sala(id_seccion, dia_semana, id_bloque) WHERE activo=true` | Parcial UNIQUE | Garantiza que una sección no tenga dos reservas activas en mismo día y bloque (unicidad lógica) | [x] |
| `idx_docente_seccion_usuario` | `docente_seccion(id_usuario)` | B-tree | `SolicitudRepository` JOIN `docente_seccion ON id_usuario`; `DocenteSeccionRepository` JPA by `id_usuario` | [x] |
| `idx_docente_seccion_seccion` | `docente_seccion(id_seccion)` | B-tree | `SeccionRepository.findAllAsignaturasConSeccionesYReservas` JOIN ON `id_seccion` | [x] |
| `idx_docente_seccion_fecha` | `docente_seccion(fecha_asignacion)` | B-tree | Ordering/filtrado por fecha de asignación en listados administrativos | [x] |
| `idx_apc_id_asignatura` | `asignatura_profesor_cargo(id_asignatura)` | B-tree | `AsignaturaProfesorCargoRepository` JPA by `id_asignatura` | [x] |
| `idx_apc_id_usuario` | `asignatura_profesor_cargo(id_usuario)` | B-tree | `AsignaturaProfesorCargoRepository` JPA by `id_usuario` | [x] |
| `idx_apc_unico_asignatura_usuario` | `asignatura_profesor_cargo(id_asignatura, id_usuario)` | UNIQUE | Garantiza una única asignación por par (asignatura, profesor) | [x] |
| `idx_asignatura_activo` | `asignatura(activo)` | B-tree | `SolicitudRepository.findCourseWithSectionsAndBlocksRaw` (WHERE `a.activo=true`); `PedidoSemanaBodegaRepository.findAllAsignaturasActivas` (WHERE `a.activo=TRUE`) | [x] |
| `idx_seccion_estado_activo` | `seccion(estado_seccion, activo)` | Compuesto | `SolicitudRepository.findCourseWithSectionsAndBlocksRaw`: WHERE `s.activo=true AND s.estado_seccion='ACTIVA'` | [x] |

### 2.3 Inventario, productos, categorías, unidad

| Índice | Columna(s) | Tipo | Consultas backend que lo usan | [x] |
|--------|-----------|------|-------------------------------|-----|
| `idx_inventario_producto` | `inventario(id_producto)` | B-tree | CTEs de disponible real (`OrdenPedidoRepository`, `StockDisponibleRepository`): JOIN `inventario ON id_producto`; `InventarioRepository.findByIdToInventoryPage`; `findAbastecimientoConfirmado` | [x] |
| `idx_producto_codigo` | `producto(cod_producto)` | B-tree | `InventarioRepository.searchInventarioByCodProductPage`: `LOWER(cod_producto) LIKE '%:cod%'` — parcialmente efectivo (LOWER impide uso completo) | [x] |
| `idx_inventario_activo` | `inventario(activo)` | B-tree | `InventarioRepository.findInventoryPage`, `BodegaTransitoRepository` queries: WHERE `activo=TRUE`; CTEs disponible real: WHERE `i.activo=TRUE` | [x] |
| `idx_producto_categoria` | `producto(id_categoria)` | B-tree | `InventarioRepository.findInventoryPage` (filtro `id_categoria`); `ProductoRepository.actualizarCategoriaMasivo`; `existsByCategoria_IdCategoria` | [x] |
| `idx_producto_unidad` | `producto(id_unidad)` | B-tree | `InventarioRepository.findInventoryPage` (filtro `id_unidad`); `ProductoRepository.actualizarUnidadMedidaMasivo`; `existsByUnidadMedida_IdUnidad` | [x] |

### 2.4 Movimientos (tabla particionada)

| Índice | Columna(s) | Tipo | Consultas backend que lo usan | [x] |
|--------|-----------|------|-------------------------------|-----|
| `idx_movimiento_usuario` | `movimiento(id_usuario)` | B-tree | `MovimientoRepository.findDynamicMovements`: JOIN `usuario ON id_usuario` (filtro opcional responsable) | [x] |
| `idx_movimiento_fecha` | `movimiento(fecha_movimiento)` | B-tree | `findDynamicMovements`: WHERE `fecha_movimiento BETWEEN`; `DashboardRepository.countMovimientosHoy`; `getTopProductosUsados` (>= 30d). La partición ya hace pruning; este índice actúa dentro de cada partición | [x] |
| `idx_movimiento_tipo` | `movimiento(tipo_movimiento)` | B-tree | `findDynamicMovements`: filtro opcional `tipo_movimiento = :tipo`; `DashboardRepository.getTopProductosUsados`: WHERE `tipo_movimiento IN ('SALIDA_INVENTARIO', ...)` | [x] |
| `idx_movimiento_inventario` | `movimiento(id_inventario)` | B-tree | `findDynamicMovements`: JOIN `inventario ON id_inventario` para llegar a `producto` y `categoria` | [x] |

### 2.5 Proveedores

| Índice | Columna(s) | Tipo | Consultas backend que lo usan | [x] |
|--------|-----------|------|-------------------------------|-----|
| `idx_pp_producto_precio_optimo` | `proveedor_producto(id_producto, precio_neto ASC) WHERE activo=TRUE` | Parcial compuesto | `ProveedorRepository.findProveedoresPorProducto`: WHERE `id_producto AND activo=TRUE ORDER BY precio_neto ASC`; CTEs `mejor_precio` en `findCotizacionConsolidada` y `findCotizacionDeCanceladas`: `DISTINCT ON (id_producto) ORDER BY precio_neto ASC` — posible index-only scan | [x] |
| `idx_pp_version_reciente` | `proveedor_producto(id_proveedor, id_producto, fecha_actualizacion DESC)` | Compuesto | `ProveedorRepository.findProductosPorProveedor`: `DISTINCT ON (id_producto) ORDER BY fecha_actualizacion DESC`; `findProductosPorProveedorHastaFecha`: `id_proveedor AND fecha_actualizacion <= :fecha`; `ProveedorProductoRepository.desactivarVersionesActivas` | [x] |

### 2.6 Orden de pedido

| Índice | Columna(s) | Tipo | Consultas backend que lo usan | [x] |
|--------|-----------|------|-------------------------------|-----|
| `idx_op_pedido` | `orden_pedido(id_pedido) WHERE activo=TRUE` | Parcial | `existsByPedido_IdPedidoAndActivoTrue`; `existsOrdenActivaConEstadoDistinto`; subquery COUNT en `findPedidosSemanaConIndicadorOP`; NOT EXISTS en `findPedidosAprobadosSinOpPorSemana` | [x] |
| `idx_op_proveedor` | `orden_pedido(id_proveedor) WHERE activo=TRUE` | Parcial | `findByProveedor_IdProveedorAndActivoTrue`: WHERE `id_proveedor AND activo=TRUE` | [x] |
| `idx_op_estado` | `orden_pedido(estado_orden_pedido) WHERE activo=TRUE` | Parcial | `findEntregasPendientesHoyAyer`: WHERE `estado='CONFIRMADA' AND activo=TRUE`; `findConfirmadasConTodosEntregados`; `findAbastecimientoConfirmado` | [x] |
| `idx_dop_orden` | `detalle_orden_pedido(id_orden_pedido)` | B-tree | `findListaOrdenesNative` subqueries (COUNT/SUM detalles WHERE `id_orden_pedido = op.id`); `findAbastecimientoConfirmado`: JOIN `detalle_orden_pedido ON id_orden_pedido AND activo=TRUE` | [x] |
| `idx_dop_fecha_entrega` | `detalle_orden_pedido(fecha_entrega) WHERE activo=TRUE` | Parcial | `findEntregasPendientesHoyAyer`: WHERE `fecha_entrega IN (hoy, ayer)`; `findAbastecimientoConfirmado`: WHERE `fecha_entrega BETWEEN (hoy-15) AND :hasta` | [x] |

### 2.7 Bodega de tránsito

| Índice | Columna(s) | Tipo | Consultas backend que lo usan | [x] |
|--------|-----------|------|-------------------------------|-----|
| `idx_bodega_transito_inventario` | `bodega_transito(id_inventario)` | B-tree | `BodegaTransitoRepository.findByInventario_IdInventario`, `addStockInTransit`, `findByInventarioIds`; CTEs disponible real: LEFT JOIN `bodega_transito ON id_inventario` | [x] |
| `idx_bodega_transito_activo` | `bodega_transito(activo)` | B-tree | `BodegaTransitoRepository.searchTransitWarehousePage`, `findTransitWarehousePage`: WHERE `activo=TRUE` | [x] |

### 2.8 Recetas (pedido_semana_bodega)

| Índice | Columna(s) | Tipo | Consultas backend que lo usan | [x] |
|--------|-----------|------|-------------------------------|-----|
| `idx_pedido_semana_bodega_estado` | `pedido_semana_bodega(estado_pedido)` | B-tree | `PedidoSemanaBodegaRepository.findAllWithDetailsPaging`: filtro `estado_pedido = :estado`; `countRecipesAndStatus`: GROUP BY `estado_pedido WHERE activo=true` | [x] |
| `idx_detalle_pedido_semana_padre` | `detalle_pedido_semana_bodega(id_pedido_semana_bodega)` | B-tree | `DetallePedidoSemanaBodegaRepository`: `findDetailsForUpdate`, `deleteByRecetaAndProductoIds`, `updateQuantityByRecipeAndProduct`, `findProductoIdsByRecetaId`, `findActiveDetailsByRecipeId` — todos por `id_pedido_semana_bodega = :id` | [x] |
| `idx_detalle_pedido_semana_producto` | `detalle_pedido_semana_bodega(id_producto)` | B-tree | `DetallePedidoSemanaBodegaRepository.deleteByRecetaAndProductoIds`: AND `id_producto IN (:ids)` | [x] |
| `idx_pedido_semana_asignatura` | `pedido_semana_bodega(id_asignatura)` | B-tree | Queries con filtro `id_asignatura` (plain, sin activo). Nota: `idx_psb_asignatura_activo` (parcial WHERE activo=true) es preferido por PG cuando la query incluye `activo=true`; este actúa como fallback | [x] |

### 2.9 Pedidos

| Índice | Columna(s) | Tipo | Consultas backend que lo usan | [x] |
|--------|-----------|------|-------------------------------|-----|
| `idx_pedido_estado` | `pedido(estado_pedido)` | B-tree | `PedidoRepository`: `findEntregasDiariasJson` (IN 'APROBADO','ENTREGADO'), `findPedidosPendientesPorSemana` ('PENDIENTE'), `marcarPedidosEntregadosPorFecha` ('APROBADO'); `OrdenPedidoRepository`: WHERE `estado='APROBADO'` | [x] |
| `idx_pedido_fecha_inicio` | `pedido(fecha_inicio_pedido)` | B-tree | `PedidoRepository`: `findPedidoConDetallesJson`, `findPedidosPorRangoJson`, `findPedidoResumenAprobacionJson`, `findIdPedidoActivoEnRango`, `obtenerResumenHistoricoJSON` (BETWEEN); `OrdenPedidoRepository.findPedidosSemanaConIndicadorOP`: `fecha_inicio >= :fi AND fecha_fin <= :ff` | [x] |
| `idx_pedido_fecha_registro` | `pedido(fecha_registro)` | B-tree | Ordering/auditoría por fecha de creación del pedido en listados administrativos | [x] |
| `idx_detalle_pedido_fk` | `detalle_pedido(id_pedido)` | B-tree | `DetallePedidoRepository`: `upsertDetallesFromSolicitud`, `subtractDetallesFromSolicitud`, `deleteDetallesVaciosByPedido` — todos WHERE `id_pedido = :id` | [x] |
| `idx_detalle_pedido_prod` | `detalle_pedido(id_producto)` | B-tree | `DetallePedidoRepository.subtractDetallesFromSolicitud`: WHERE `id_pedido AND id_producto` | [x] |

### 2.10 Solicitudes

| Índice | Columna(s) | Tipo | Consultas backend que lo usan | [x] |
|--------|-----------|------|-------------------------------|-----|
| `idx_solicitud_gestor` | `solicitud(id_usuario_gestor_solicitud)` | B-tree | JPA derivado by `id_usuario_gestor_solicitud`; búsqueda de solicitudes por gestor asignado | [x] |
| `idx_solicitud_seccion` | `solicitud(id_seccion)` | B-tree | `SolicitudRepository` subquery: WHERE `id_seccion = s.id_seccion`; JOIN `solicitud ON id_seccion` en pantalla de solicitudes | [x] |
| `idx_solicitud_fecha` | `solicitud(fecha_solicitada)` | B-tree | `findSolicitationsPerWeekRaw` (BETWEEN); `ProveedorRepository.findCotizacionProveedoresPorRango`; `DashboardRepository` (today/week/month counts). Nota: para queries con estado+fecha, los índices parciales `idx_solicitud_pendiente/aceptada/en_pedido` son más eficientes | [x] |
| `idx_detalle_solicitud_fk_solicitud` | `detalle_solicitud(id_solicitud)` | B-tree | `PedidoSolicitudRepository.findSolicitudDetallesByPedido` JOIN `detalle_solicitud ON id_solicitud`; CTEs en `SolicitudRepository`, `OrdenPedidoRepository`: FROM `detalle_solicitud WHERE id_solicitud = :id` | [x] |
| `idx_detalle_solicitud_producto` | `detalle_solicitud(id_producto)` | B-tree | JOIN desde producto hacia detalle_solicitud; queries de consolidado y cotización que agrupan por producto | [x] |
| `idx_pedido_solicitud_pedido` | `pedido_solicitud(id_pedido)` | B-tree | `PedidoSolicitudRepository`: `deleteVinculo`, `countSolicitudesNoProcesadas`, `findSolicitudDetallesByPedido`, `findIdSolicitudesEnPedidoByPedido` — todos WHERE `id_pedido = :id` | [x] |
| `idx_pedido_solicitud_fk_solicitud` | `pedido_solicitud(id_solicitud)` | B-tree | `PedidoSolicitudRepository.findIdPedidoByIdSolicitud`; `SolicitudRepository` subqueries: `NOT IN (SELECT id_solicitud FROM pedido_solicitud)` — escanea este índice | [x] |
| `idx_pedido_solicitud_fecha` | `pedido_solicitud(fecha_union_registro)` | B-tree | Ordering/auditoría por fecha de vinculación solicitud-pedido | [x] |

### 2.11 Soporte

| Índice | Columna(s) | Tipo | Consultas backend que lo usan | [x] |
|--------|-----------|------|-------------------------------|-----|
| `idx_soporte_estado` | `soporte_ticket(estado)` | B-tree | Sin queries custom actualmente — preparado para filtros por estado en futuras implementaciones de `SoporteTicketRepository` | [x] |
| `idx_soporte_fecha` | `soporte_ticket(fecha_creacion DESC)` | B-tree | Sin queries custom actualmente — preparado para listados ordenados por fecha descendente | [x] |

---

## 3. VERIFICACIÓN POR MÓDULO (consultas del backend)

### 3.1 PEDIDO (cabecera) — `PedidoRepository`

| Consulta | Método | Tablas/Filtros clave | Índices usados | Estado |
|---------|--------|---------------------|----------------|--------|
| Pedidos completos JSON | `findPedidoConDetallesJson` | `pedido.fecha_inicio_pedido ≤ :fin AND fecha_fin_pedido ≥ :inicio` | `idx_pedido_fecha_inicio` ✅ | [x] |
| Pedidos rango JSON | `findPedidosPorRangoJson` | mismo filtro de fechas | `idx_pedido_fecha_inicio` ✅ | [x] |
| Resumen aprobación stock | `findPedidoResumenAprobacionJson` | mismo filtro + subqueries `reserva_stock_solicitud`, `orden_pedido` | `idx_pedido_fecha_inicio` ✅ · `idx_op_pedido` ✅ | [x] |
| Entregas diarias | `findEntregasDiariasJson` | `estado_pedido IN ('APROBADO','ENTREGADO')` + `fecha_solicitada BETWEEN` | `idx_pedido_estado` ✅ · `idx_solicitud_fecha` ✅ | [x] |
| Pendientes por semana | `findPedidosPendientesPorSemana` | `estado_pedido = 'PENDIENTE'` JOIN semanas | `idx_pedido_estado` ✅ | [x] |
| Pedido activo en rango | `findIdPedidoActivoEnRango` | `fecha_inicio_pedido = :fi AND fecha_fin_pedido = :ff AND estado NOT IN (...)` | `idx_pedido_fecha_inicio` ✅ | [x] |
| Marcar entregados | `marcarPedidosEntregadosPorFecha` | `estado_pedido = 'APROBADO' AND fecha_fin_pedido < CURRENT_DATE` | `idx_pedido_estado` ✅ | [x] |
| Resumen histórico | `obtenerResumenHistoricoJSON` | `fecha_inicio_pedido BETWEEN :fi AND :ff` + `estado IN (csv)` | `idx_pedido_fecha_inicio` ✅ | [x] |

### 3.2 DETALLE_PEDIDO — `DetallePedidoRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Upsert desde solicitud | `upsertDetallesFromSolicitud` | `id_pedido, id_producto` (ON CONFLICT PK UNIQUE) | `idx_detalle_pedido_fk` ✅ · UNIQUE(id_pedido,id_producto) ✅ | [x] |
| Restar solicitud | `subtractDetallesFromSolicitud` | `id_pedido AND id_producto` | `idx_detalle_pedido_fk` ✅ · `idx_detalle_pedido_prod` ✅ | [x] |
| Eliminar ceros | `deleteDetallesVaciosByPedido` | `id_pedido AND cant ≤ 0` | `idx_detalle_pedido_fk` ✅ | [x] |

### 3.3 PEDIDO_SOLICITUD — `PedidoSolicitudRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| ID pedido de solicitud | `findIdPedidoByIdSolicitud` | `id_solicitud` | `idx_pedido_solicitud_fk_solicitud` ✅ | [x] |
| Vincular | `insertIfNotExists` | insert ON CONFLICT | ambos índices ✅ | [x] |
| Eliminar vínculo | `deleteVinculo` | `id_pedido AND id_solicitud` | `idx_pedido_solicitud_pedido` ✅ | [x] |
| Contar no-procesadas | `countSolicitudesNoProcesadas` | `id_pedido JOIN solicitud.estado ≠ PROCESADO` | `idx_pedido_solicitud_pedido` ✅ | [x] |
| Detalles por pedido | `findSolicitudDetallesByPedido` | `id_pedido AND estado = 'EN_PEDIDO'` | `idx_pedido_solicitud_pedido` ✅ · `idx_detalle_solicitud_fk_solicitud` ✅ | [x] |
| IDs solicitudes EN_PEDIDO | `findIdSolicitudesEnPedidoByPedido` | `id_pedido AND estado = 'EN_PEDIDO'` | `idx_pedido_solicitud_pedido` ✅ | [x] |

### 3.4 SOLICITUD (cabecera) — `SolicitudRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Contar pendientes | `contarSolicitudesPendientes` | `estado_solicitud = 'PENDIENTE'` | **NINGUNO** 🔴 | [x] |
| Pendientes por semana | `findPendientesPorSemana` | `estado_solicitud = 'PENDIENTE' JOIN semanas` | **NINGUNO** 🔴 | [x] |
| Aceptadas por semana | `findAceptadasPorSemana` | `estado_solicitud = 'ACEPTADA' NOT IN pedido_solicitud` | **NINGUNO** 🔴 | [x] |
| Cursos con secciones | `findCourseWithSectionsAndBlocksRaw` | `a.activo, s.activo, estado_seccion = 'ACTIVA'` + EXISTS reserva | `idx_seccion_estado_activo` ✅ · `idx_reserva_seccion` ✅ | [x] |
| Recetas activas | `findActiveRecipesWithDetailsRaw` | `r.activo = true AND estado_pedido = 'ACTIVO' AND id_asignatura` | `idx_pedido_semana_bodega_estado` ✅ · `idx_pedido_semana_asignatura` ✅ | [x] |
| Solicitudes por semana | `findSolicitationsPerWeekRaw` | `fecha_solicitada BETWEEN :fi AND :ff` | `idx_solicitud_fecha` ✅ | [x] |
| Rechazar vencidas | `rechazarSolicitudesVencidas` | `estado = 'PENDIENTE' AND fecha_solicitada < TODAY` | `idx_solicitud_fecha` ✅ (estado sin índice ⚠️) | [x] |
| Dashboard aceptadas | `findSolicitudesParaDashboard` | `fecha_solicitada BETWEEN AND estado = 'ACEPTADA'` | `idx_solicitud_fecha` ✅ (estado sin índice ⚠️) | [x] |
| Consolidado global | `findConsolidadoGlobalJson` | `fecha_solicitada BETWEEN AND estado = 'ACEPTADA' NOT IN pedido_sol` | `idx_solicitud_fecha` ✅ | [x] |
| Abastecimiento bodega | `findAbastecimientoBodegaJson` | `estado = 'EN_PEDIDO' AND fecha_solicitada BETWEEN` | `idx_solicitud_fecha` ✅ (estado sin índice ⚠️) | [x] |
| Update masivo estado | `updateMassiveStateSolicitation` | `id_solicitud IN (:ids)` | PK ✅ | [x] |
| Verifica inmutables | `existsByIdSolicitudInAndEstadoInmutable` | `id IN (:ids) AND estado IN (EN_PEDIDO, PROCESADO)` | PK ✅ | [x] |

### 3.5 INVENTARIO — `InventarioRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Detalle por ID | `findByIdToInventoryPage` | `id_inventario AND activo = TRUE AND p.activo = TRUE` | PK ✅ · `idx_inventario_activo` ✅ | [x] |
| Buscar por código | `searchInventarioByCodProductPage` | `LOWER(cod_producto) LIKE '%:cod%'` | `idx_producto_codigo` ⚠️ (no funcional, scan seq en LOWER) | [x] |
| Contar por código | `countSearchInventarioByCodProduct` | ídem | mismo ⚠️ | [x] |
| Buscar por nombre/desc | `searchInventoryPage` | `LOWER(nombre_producto) LIKE` | sin índice funcional ⚠️ | [x] |
| Contar nombre/desc | `countSearchInventory` | ídem | sin índice funcional ⚠️ | [x] |
| Lista filtrada | `findInventoryPage` | `activo, id_categoria, id_unidad, stock` | `idx_inventario_activo` ✅ · `idx_producto_categoria` ✅ · `idx_producto_unidad` ✅ | [x] |
| Contar filtrada | `countInventarioFiltered` | ídem | ídem ✅ | [x] |
| Sumar stock atómico | `addStockToInventory` | `id_inventario AND activo = true` | PK ✅ · `idx_inventario_activo` ✅ | [x] |
| Control masivo | `bulkProductInventoryListingPage` | `activo = true LIKE nombre o código` | `idx_inventario_activo` ✅ | [x] |

### 3.6 BODEGA_TRANSITO — `BodegaTransitoRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Buscar por id_inventario | `findByInventario_IdInventario` (JPA) | `id_inventario` | `idx_bodega_transito_inventario` ✅ | [x] |
| Lista paginada búsqueda | `searchTransitWarehousePage` | `activo = TRUE LIKE nombre/desc` | `idx_bodega_transito_activo` ✅ | [x] |
| Lista paginada filtrada | `findTransitWarehousePage` | `activo, id_categoria, id_unidad, stock` | `idx_bodega_transito_activo` ✅ · `idx_inventario_producto` ✅ | [x] |
| Sumar stock tránsito | `addStockInTransit` | `id_inventario AND activo = true` | `idx_bodega_transito_inventario` ✅ | [x] |
| Por IDs inventario | `findByInventarioIds` | `activo = TRUE AND id_inventario = ANY(array)` | `idx_bodega_transito_inventario` ✅ | [x] |
| Activo por producto | `findActiveByProductoId` | `producto.id_producto AND activo = true` | `idx_inventario_producto` ✅ (vía JOIN) | [x] |

### 3.7 MOVIMIENTO — `MovimientoRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Lista dinámica | `findDynamicMovements` | `fecha_movimiento BETWEEN + tipo + responsable` | `idx_movimiento_fecha` ✅ · `idx_movimiento_tipo` ✅ · `idx_movimiento_usuario` ✅ | [x] |
| Entregas por OP | `findEntregasRealesByOrdenPedido` | `id_orden_pedido AND tipo IN ('ENTRADA_INVENTARIO','ENTRADA_BODEGA')` | **`id_orden_pedido` SIN ÍNDICE** 🔴 | [x] |
| Contar dinámica | `countDynamicMovements` | ídem | `idx_movimiento_fecha` ✅ | [x] |

### 3.8 PROVEEDOR — `ProveedorRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Proveedores con filtros | `findProveedoresConFiltros` | `activo = TRUE AND estado AND busqueda LIKE` | sin índice en estado ⚠️ | [x] |
| Paginado con filtros | `findProveedoresConFiltrosPaginado` | ídem + LIMIT/OFFSET | sin índice en estado ⚠️ | [x] |
| Productos por proveedor | `findProductosPorProveedor` | `DISTINCT ON id_producto` ORDER BY `fecha_actualizacion DESC` | `idx_pp_version_reciente` ✅ | [x] |
| Productos hasta fecha | `findProductosPorProveedorHastaFecha` | `id_proveedor AND fecha_actualizacion ≤ :fecha` | `idx_pp_version_reciente` ✅ | [x] |
| Proveedores por producto | `findProveedoresPorProducto` | `id_producto AND activo = TRUE` ORDER BY `precio_neto ASC` | `idx_pp_producto_precio_optimo` ✅ | [x] |
| Cotización por rango | `findCotizacionProveedoresPorRango` | CTE: `estado = 'EN_PEDIDO' + fecha` + `DISTINCT ON id_producto ORDER BY precio_neto` | `idx_pp_producto_precio_optimo` ✅ · `idx_solicitud_fecha` ✅ | [x] |
| Búsqueda global | `buscarProductosGlobal` | `ILIKE :searchTerm` en nombre/cod/desc | sin índice trigram ⚠️ | [x] |

### 3.9 PROVEEDOR_PRODUCTO — `ProveedorProductoRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Versión activa reciente | `findFirstBy...ActivoTrueOrderByFechaActualizacionDesc` | `id_proveedor AND id_producto AND activo = true` ORDER BY fecha | `idx_pp_version_reciente` ✅ | [x] |
| Desactivar versiones | `desactivarVersionesActivas` | `id_proveedor AND id_producto AND activo = true` | `idx_pp_version_reciente` ✅ | [x] |

### 3.10 ORDEN_PEDIDO — `OrdenPedidoRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Existe OP activa | `existsByPedido_IdPedidoAndActivoTrue` (JPA) | `id_pedido AND activo = true` | `idx_op_pedido` ✅ | [x] |
| OPs por proveedor | `findByProveedor_IdProveedorAndActivoTrue` (JPA) | `id_proveedor AND activo = true` | `idx_op_proveedor` ✅ | [x] |
| Existe estado distinto | `existsOrdenActivaConEstadoDistinto` | `id_pedido AND activo AND estado <> 'CANCELADA'` | `idx_op_pedido` ✅ | [x] |
| Pedidos semana con OP | `findPedidosSemanaConIndicadorOP` | `estado_pedido = 'APROBADO' AND fechas BETWEEN` | `idx_pedido_estado` ✅ · `idx_pedido_fecha_inicio` ✅ | [x] |
| Aprobados sin OP | `findPedidosAprobadosSinOpPorSemana` | `estado_pedido = 'APROBADO' NOT EXISTS OP activa` | `idx_pedido_estado` ✅ · `idx_op_pedido` ✅ | [x] |
| Entregas hoy/ayer | `findEntregasPendientesHoyAyer` | `estado = 'CONFIRMADA' AND activo AND entregado = FALSE AND fecha_entrega IN (today, today-1)` | `idx_op_estado` ✅ · `idx_dop_fecha_entrega` ✅ | [x] |
| Lista OPs activas | `findListaOrdenesNative` | `activo = true` ORDER BY `fecha_creacion DESC` | sin índice en `activo` sola ⚠️ (parciales son por pedido/proveedor) | [x] |
| Cotización consolidada | `findCotizacionConsolidada` | CTE complejo: `pedido_solicitud → solicitud(EN_PEDIDO) → detalle_solicitud → proveedor_producto` | `idx_op_pedido` ✅ · `idx_pp_producto_precio_optimo` ✅ · `idx_pedido_solicitud_pedido` ✅ | [x] |
| Disponible real por producto | `findDisponibleRealByProductos` | CTE: `detalle_orden_pedido_solicitud + reserva_stock_solicitud + inventario + bodega_transito` | `idx_dop_orden` ✅ · `idx_bodega_transito_inventario` ✅ | [x] |
| Confirmada → Recibida | `findConfirmadasConTodosEntregados` | `id IN (:ids) AND estado = 'CONFIRMADA' AND activo AND NOT EXISTS detalle no entregado` | `idx_op_estado` ✅ · `idx_dop_orden` ✅ | [x] |
| Abastecimiento confirmado | `findAbastecimientoConfirmado` | `estado = 'CONFIRMADA' AND activo AND fecha_entrega entre [today-15, :hasta]` | `idx_op_estado` ✅ · `idx_dop_fecha_entrega` ✅ | [x] |

### 3.11 PEDIDO_SEMANA_BODEGA (recetas) — `PedidoSemanaBodegaRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Lista paginada | `findAllWithDetailsPaging` | `activo = true AND estado_pedido = :estado` | `idx_pedido_semana_bodega_estado` ✅ | [x] |
| Filtrado por semana | `findAllWithDetailsPagingByIdSemana` | `activo = true AND id_semana = :idSemana AND estado` | **`id_semana` SIN ÍNDICE** 🔴 | [x] |
| Filtrado por asignatura | `findAllWithDetailsPagingByIdAsignatura` | `activo = true AND id_asignatura = :idAsig AND estado` | `idx_pedido_semana_asignatura` ✅ | [x] |
| Busqueda + semana | `findAllWithDetailsAndSearchByIdSemana` | `activo AND ILIKE :term AND id_semana AND estado` | **`id_semana` SIN ÍNDICE** 🔴 | [x] |
| KPIs recetas | `countRecipesAndStatus` | `activo = true` GROUP BY estado | `idx_pedido_semana_bodega_estado` ✅ | [x] |

### 3.12 STOCK_DISPONIBLE — `StockDisponibleRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Contar por tipo | `countByTipoAndActivo` | `tipo_disponible = :tipo AND activo = TRUE` | sin índice en tipo_disponible ⚠️ | [x] |
| Lista paginada | `findByTipoPaginado` | `tipo_disponible = :tipo AND activo = TRUE` | sin índice en tipo_disponible ⚠️ | [x] |
| Suma disponible | `sumDisponibleByProductosAndTipo` | `tipo_disponible AND activo AND id_producto IN (:ids)` | sin índice compuesto ⚠️ | [x] |
| FIFO disponible | `findActivosByProductoAndTipoFifo` | `id_producto AND tipo AND activo = TRUE` ORDER BY fecha ASC | sin índice funcional ⚠️ | [x] |
| Disponible real | `findDisponibleReal` | CTE complejo: `detalle_orden_pedido_solicitud + reserva_stock_solicitud + inventario + bodega_transito` | `idx_inventario_producto` ✅ · `idx_bodega_transito_inventario` ✅ | [x] |

### 3.13 PRODUCTO — `ProductoRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Activos para receta | `findAllActiveForRecipe` | `p.activo = true` ORDER BY `nombre_producto ASC` | sin índice en `producto.activo` ⚠️ | [x] |
| Activos con categoría | `findAllActiveForRecipeWithCategory` | `p.activo = true` ORDER BY `categoria ASC, nombre ASC` | `idx_producto_categoria` ✅ | [x] |
| Update categoría masivo | `actualizarCategoriaMasivo` | `id_categoria = :origen` | `idx_producto_categoria` ✅ | [x] |
| Update unidad masivo | `actualizarUnidadMedidaMasivo` | `id_unidad = :origen` | `idx_producto_unidad` ✅ | [x] |
| Buscar por nombre (JPA) | `findByNombreProductoIgnoreCaseAndActivoTrue` | nombre ILIKE + activo | sin índice funcional ⚠️ | [x] |
| Existencia por categoría | `existsByCategoria_IdCategoria` | `id_categoria` | `idx_producto_categoria` ✅ | [x] |
| Existencia por unidad | `existsByUnidadMedida_IdUnidad` | `id_unidad` | `idx_producto_unidad` ✅ | [x] |

### 3.14 USUARIO — `UsuarioRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Auth por username/email | `findUserAuth` | `username = :id OR email = :id AND activo = true` | `idx_usuario_email_activo` ✅ · `idx_usuario_username_activo` ✅ | [x] |
| Buscar por identifier | `findByIdentifier` | `LOWER(username) = OR LOWER(email) =` | `idx_usuario_username` ✅ · `idx_usuario_email` ✅ | [x] |
| Lista para frontend | `findUsuariosParaFrontend` | `activo = true AND id_rol IN (csv)` LIMIT/OFFSET | `idx_usuario_rol` ✅ | [x] |
| Buscar por nombre/email | `searchUsuariosParaFrontend` | `activo = true AND (nombre ILIKE OR email ILIKE)` | `idx_usuario_email` ✅ (nombre sin índice ⚠️) | [x] |
| Estado online | `findUsuariosStatus` | `activo = true` | sin índice directo en activo ⚠️ (parciales son en email/username) | [x] |
| Actualizar último acceso | `actualizarUltimoAcceso` | `id_usuario = :id` | PK ✅ | [x] |
| Usuarios por rol | `findByRolAndActivoTrue` (JPA) | `id_rol AND activo = true` | `idx_usuario_rol` ✅ | [x] |

### 3.15 RESERVA_STOCK_SOLICITUD — `ReservaStockSolicitudRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Por solicitud+producto | `findByIdSolicitudAndIdProducto` (JPA) | `id_solicitud AND id_producto` | UNIQUE(id_solicitud, id_producto) ✅ | [x] |
| Lista por solicitudes | `findByIdSolicitudInAndActivoTrue` | `id_solicitud IN (:ids) AND activo = true` | UNIQUE actúa como índice ✅ (parcial activo faltante ⚠️) | [x] |
| Desactivar por solicitud | `desactivarByIdSolicitud` | `id_solicitud = :id AND activo = true` | UNIQUE da cobertura parcial ✅ (índice `(id_solicitud, activo)` faltante ⚠️) | [x] |

### 3.16 DETALLE_ORDEN_PEDIDO_SOLICITUD — `DetalleOrdenPedidoSolicitudRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Por detalle OP + activo | `findByIdDetalleOrdenPedidoAndActivoTrue` (JPA) | `id_detalle_orden_pedido AND activo = true` | UNIQUE(id_detalle_orden_pedido, id_solicitud) da cobertura ✅ | [x] |

> **Nota:** Esta tabla es muy accedida desde CTEs vía `id_solicitud` (e.g. `findDisponibleReal`, `findPedidoResumenAprobacionJson`) pero el repositorio Java solo busca por `id_detalle_orden_pedido`. El acceso por `id_solicitud` ocurre 100% en SQL raw — ver 🔴 en Sección 4.

### 3.17 DETALLE_PEDIDO_SEMANA_BODEGA — `DetallePedidoSemanaBodegaRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Detalles para update | `findDetailsForUpdate` | `id_pedido_semana_bodega = :id` | `idx_detalle_pedido_semana_padre` ✅ | [x] |
| Eliminar por receta+producto | `deleteByRecetaAndProductoIds` | `id_pedido_semana_bodega AND id_producto IN` | `idx_detalle_pedido_semana_padre` ✅ · `idx_detalle_pedido_semana_producto` ✅ | [x] |
| Update cantidad | `updateQuantityByRecipeAndProduct` | `id_pedido_semana_bodega AND id_producto` | `idx_detalle_pedido_semana_padre` ✅ | [x] |
| IDs de productos de receta | `findProductoIdsByRecetaId` | `id_pedido_semana_bodega` | `idx_detalle_pedido_semana_padre` ✅ | [x] |
| Detalles activos de receta | `findActiveDetailsByRecipeId` | `id_pedido_semana_bodega AND p.activo = true` | `idx_detalle_pedido_semana_padre` ✅ | [x] |

### 3.18 SOPORTE_TICKET — `SoporteTicketRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| CRUD básico (JPA) | herencia `JpaRepository` | PK / findById, save, delete | PK ✅ | [x] |
| — | *Sin queries custom* | `idx_soporte_estado` y `idx_soporte_fecha` preparados para queries futuras | ⚠️ no usados aún | [x] |

### 3.19 DASHBOARD — `DashboardRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Solicitudes hoy | `countSolicitudesToday` | `DATE(fecha_solicitada) = CURRENT_DATE` | `idx_solicitud_fecha` ✅ | [x] |
| Solicitudes semana | `countSolicitudesWeek` | `fecha_solicitada >= date_trunc('week')` | `idx_solicitud_fecha` ✅ | [x] |
| Solicitudes mes | `countSolicitudesMonth` | `fecha_solicitada >= date_trunc('month')` | `idx_solicitud_fecha` ✅ | [x] |
| Movimientos hoy | `countMovimientosHoy` | `DATE(fecha_movimiento) = CURRENT_DATE` | `idx_movimiento_fecha` ✅ | [x] |
| Productos críticos | `getProductosCriticos` | `stock < stock_limit AND activo = true` | `idx_inventario_activo` ✅ | [x] |
| Top productos usados | `getTopProductosUsados` | `tipo_movimiento IN ('SALIDA...') AND fecha_movimiento >= 30d` | `idx_movimiento_tipo` ✅ · `idx_movimiento_fecha` ✅ | [x] |
| Solicitudes rechazadas | `getSolicitudesRechazadas` | `estado = 'RECHAZADA'` | sin índice en estado ⚠️ | [x] |

### 3.20 SECCIÓN — `SeccionRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Soft delete | `softDeleteSeccionById` | `id_seccion AND activo = true` | PK ✅ | [x] |
| Existe nombre en asignatura | `existsByAsignaturaTrueAndSeccionTrueAndNombreSeccionIlike` | `id_asignatura AND activo AND unaccent+regexp ILIKE nombre` | `idx_seccion_asignatura` ✅ (regex no usa índice ⚠️) | [x] |
| Sección con reservas por ID | `findSectionWithReservationsById` | `id_seccion AND activo = TRUE` JOIN docente, reserva, bloque, sala | PK ✅ · `idx_reserva_seccion` ✅ | [x] |
| Todas asignaturas+secciones | `findAllAsignaturasConSeccionesYReservas` | `a.activo AND s.activo` LATERAL JOIN reservas | `idx_seccion_asignatura` ✅ · `idx_reserva_seccion` ✅ | [x] |

### 3.21 REFRESH_TOKEN — `RefreshTokenRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Buscar por valor activo | `findByTokenAndActivoTrue` (JPA) | `token = :t AND activo = true` | `idx_refresh_token_string` ✅ (+ UNIQUE(token)) | [x] |
| Revocar por usuario | `revocarTodosPorUsuario` | `id_usuario = :id AND activo = true` | `idx_refresh_token_usuario` ✅ | [x] |
| Eliminar expirados | `eliminarExpirados` | `expires_at < :ahora` | sin índice en `expires_at` ⚠️ | [x] |

### 3.22 SEMANAS — `SemanaRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Años distintos | `findDistinctAniosFromNow` | `anio >= CURRENT_YEAR` | sin índice en `anio` (columna generada) ⚠️ | [x] |
| Por año+semestre | `findByAnioAndSemestreOrderByFechaInicioAsc` (JPA) | `anio AND semestre` ORDER BY `fecha_inicio` | UNIQUE(nombre_semana, anio, semestre) ✅ | [x] |
| Años y semestres raw | `findAniosAndSemestresRaw` | GROUP BY `anio` | sin índice ⚠️ (tabla pequeña, ok) | [x] |
| Validar traslape | `existeTraslapeDeFechas` | `fecha_inicio <= :fin AND fecha_fin >= :inicio` | UNIQUE(fecha_inicio) ✅ parcialmente | [x] |

### 3.23 PERMISO_ROL — `PermisoRolRepository`

| Consulta | Método | Filtros clave | Índices usados | Estado |
|---------|--------|--------------|----------------|--------|
| Por rol+módulo | `findByRol_IdRolAndModulo_IdModulo` (JPA) | `id_rol AND id_modulo` | UNIQUE(id_rol, id_modulo) ✅ | [x] |
| Por rol activos | `findByRol_IdRolAndEnabledTrue` (JPA) | `id_rol AND enabled = true` | UNIQUE da cobertura ✅ | [x] |
| Por rol+código módulo | `findByRolIdAndModuleCode` | `id_rol AND codigo_modulo AND enabled = true` | UNIQUE parcial ✅ (JOIN modulo) | [x] |
| Matriz completa | `findPermissionMatrix` | CROSS JOIN rol×modulo + LEFT JOIN permiso_rol por `enabled = true` | UNIQUE(id_rol, id_modulo) ✅ · tablas pequeñas ok | [x] |

---

### 3.24 REPOSITORIOS SOLO-JPA (sin queries custom críticas)

Repositorios que solo usan métodos derivados de `JpaRepository`; no generan consultas de riesgo y sus índices ya están cubiertos por las tablas relacionadas.

| Repositorio | Tabla principal | Índices aplicables | Estado |
|------------|----------------|-------------------|--------|
| `MotivoRechazoRepository` | `motivo_rechazo_solicitud` | PK + FK `id_solicitud` (UNIQUE uk_solicitud_rechazo) | [x] |
| `ProveedorDiaEntregaRepository` | `proveedor_dia_entrega` | PK + UNIQUE(id_proveedor, dia_semana) | [x] |
| `CategoriaAbastecimientoRepository` | `categoria_abastecimiento` | PK compuesta (id_categoria, tipo_abastecimiento) | [x] |
| `CategoriaRepository` | `categoria` | PK + UNIQUE(nombre_categoria) | [x] |
| `UnidadaMedidaRepository` | `unidad_medida` | PK + UNIQUE(nombre_unidad, abreviatura) | [x] |
| `RolRepository` | `rol` | PK + UNIQUE(nombre_rol) | [x] |
| `GestionSistemaRepository` | `gestion_sistema` | PK | [x] |
| `ModuloRepository` | `modulo` | PK + UNIQUE(codigo_modulo) | [x] |
| `AsignaturaRepository` | `asignatura` | PK + `idx_asignatura_codigo` + `idx_asignatura_activo` | [x] |
| `BloqueHorarioRepository` | `bloque_horario` | PK + UNIQUE(numero_bloque) + `idx_bloque_numero` | [x] |
| `SalaRepository` | `sala` | PK + `idx_sala_codigo` | [x] |
| `DocenteSeccionRepository` | `docente_seccion` | PK + `idx_docente_seccion_usuario` + `idx_docente_seccion_seccion` | [x] |
| `AsignaturaProfesorCargoRepository` | `asignatura_profesor_cargo` | PK + `idx_apc_id_asignatura` + `idx_apc_id_usuario` | [x] |

---

## 4. ÍNDICES FALTANTES IDENTIFICADOS 🔴

> Estado: `[IMPL]` = implementado en SQL · `[PEND]` = pendiente

| Estado | Prioridad | Tabla | Índice | Justificación verificada | Consultas backend cubiertas |
|--------|-----------|-------|--------|--------------------------|----------------------------|
| **[IMPL]** | ALTA | `solicitud` | `idx_solicitud_estado` | Filtro plain para `IN ('EN_PEDIDO','PROCESADO')` | `existsByIdSolicitudInAndEstadoInmutable` |
| **[IMPL]** | ALTA | `solicitud` | `idx_solicitud_pendiente` — parcial `(fecha_solicitada) WHERE estado='PENDIENTE'` | Count + range + UPDATE vencidas | `contarSolicitudesPendientes`, `findPendientesPorSemana`, `rechazarSolicitudesVencidas` |
| **[IMPL]** | ALTA | `solicitud` | `idx_solicitud_aceptada` — parcial `(fecha_solicitada) WHERE estado='ACEPTADA'` | Dashboards + consolidado + semana | `findAceptadasPorSemana`, `findSolicitudesParaDashboard`, `findConsolidadoGlobalJson` |
| **[IMPL]** | ALTA | `solicitud` | `idx_solicitud_en_pedido` — parcial `(fecha_solicitada) WHERE estado='EN_PEDIDO'` | Abastecimiento bodega | `findAbastecimientoBodegaJson` |
| **[IMPL]** | ALTA | `movimiento` | `idx_movimiento_orden_pedido` — parcial `(id_orden_pedido) WHERE IS NOT NULL` | Full scan sobre particionada; PG propaga a particiones | `findEntregasRealesByOrdenPedido` |
| **[IMPL]** | ALTA | `pedido_semana_bodega` | `idx_psb_semana_activo` — parcial `(id_semana) WHERE activo=true` | 7+ queries filtran por semana | `findAllWithDetailsPagingByIdSemana`, `countByActivoTrueAndIdSemana`, y variantes search |
| **[IMPL]** | ALTA | `pedido_semana_bodega` | `idx_psb_asignatura_activo` — parcial `(id_asignatura) WHERE activo=true` | 4+ queries filtran solo por asignatura | `findAllWithDetailsPagingByIdAsignatura`, `countByActivoTrueAndIdAsignatura`, y variantes |
| **[IMPL]** | MEDIA | `reserva_stock_solicitud` | `idx_rss_producto_activo` — `(id_producto, activo) WHERE activo=true` | CTEs de disponible real | `findDisponibleRealByProductos`, `findDisponibleReal` |
| **[IMPL]** | MEDIA | `detalle_orden_pedido_solicitud` | `idx_dops_solicitud` — `(id_solicitud) WHERE activo=true` | CTEs de cotización y disponible | CTEs en `OrdenPedidoRepository`, `StockDisponibleRepository` |
| **[IMPL]** | MEDIA | `stock_disponible` | `idx_sd_tipo_activo_producto` — `(tipo_disponible, activo, id_producto) WHERE activo=true` | Triple filtro en todas las queries | Todas las queries de `StockDisponibleRepository` |
| **[IMPL]** | BAJA | `producto` | `idx_producto_nombre_trgm` — GIN trigram sobre `nombre_producto` | ILIKE %term% sin trigram → seq scan; GIN permite index scan con comodín al inicio | `searchInventoryPage`, `searchInventarioByCodProductPage` (InventarioRepository), `buscarProductosGlobal` (ProveedorRepository) |
| **[IMPL]** | BAJA | `orden_pedido` | `idx_op_fecha_activo` — `(fecha_creacion DESC) WHERE activo=true` | Listado de OPs filtra `activo=true` + ORDER BY `fecha_creacion DESC`; índice evita sort explícito. `activo` omitido del key (ya en predicado parcial) | `findListaOrdenesNative`, `findListaOrdenesNativeSince` |

---

## 5. SQL IMPLEMENTADO (ConexionXD_v2.sql — después de línea 2217)

```sql
-- [A1] solicitud — estado plain + parciales por estado+fecha
CREATE INDEX idx_solicitud_estado     ON solicitud(estado_solicitud);
CREATE INDEX idx_solicitud_pendiente  ON solicitud(fecha_solicitada) WHERE estado_solicitud = 'PENDIENTE'::estado_solicitud_type;
CREATE INDEX idx_solicitud_aceptada   ON solicitud(fecha_solicitada) WHERE estado_solicitud = 'ACEPTADA'::estado_solicitud_type;
CREATE INDEX idx_solicitud_en_pedido  ON solicitud(fecha_solicitada) WHERE estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type;

-- [A2] movimiento — particionada; PG propaga a todas las particiones
CREATE INDEX idx_movimiento_orden_pedido ON movimiento(id_orden_pedido) WHERE id_orden_pedido IS NOT NULL;

-- [A3] pedido_semana_bodega — dos parciales para cubrir semana, asignatura y combinados
CREATE INDEX idx_psb_semana_activo     ON pedido_semana_bodega(id_semana)     WHERE activo = true;
CREATE INDEX idx_psb_asignatura_activo ON pedido_semana_bodega(id_asignatura) WHERE activo = true;

-- [M1] reserva_stock_solicitud
CREATE INDEX idx_rss_producto_activo ON reserva_stock_solicitud(id_producto, activo) WHERE activo = TRUE;

-- [M2] detalle_orden_pedido_solicitud
CREATE INDEX idx_dops_solicitud ON detalle_orden_pedido_solicitud(id_solicitud) WHERE activo = TRUE;

-- [M3] stock_disponible
CREATE INDEX idx_sd_tipo_activo_producto ON stock_disponible(tipo_disponible, activo, id_producto) WHERE activo = TRUE;
```

### BAJA prioridad (implementados tras verificación de queries reales)
```sql
-- [B1] producto — GIN trigram para ILIKE %term% en InventarioRepository y ProveedorRepository
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_producto_nombre_trgm ON producto USING gin (nombre_producto gin_trgm_ops);

-- [B2] orden_pedido — listado activas ordenado por fecha (activo omitido del key: ya en predicado)
CREATE INDEX idx_op_fecha_activo ON orden_pedido(fecha_creacion DESC) WHERE activo = TRUE;
```

---

## 6. HISTORIAL DE CAMBIOS

| Fecha | Acción | Rango afectado | Descripción |
|-------|--------|---------------|-------------|
| 2026-06-27 | Creación inicial | 261–985 + 2093–2217 | Análisis completo de tablas e índices vs consultas backend |
| 2026-06-27 | Implementación ALTA+MEDIA | después línea 2217 | 10 índices implementados: 4×solicitud, 1×movimiento, 2×psb, 3×media |
| 2026-06-27 | Verificación y corrección | después línea 2217 | Re-verificado con queries reales: psb corregido a 2 parciales (semana+asignatura) con `WHERE activo=true` |
| 2026-06-27 | Verificación e impl. MEDIA+BAJA | después línea 2259 | MEDIA confirmados correctos. BAJA verificados: trigram en producto.nombre_producto + orden_pedido(fecha_creacion DESC) WHERE activo=true (sin activo redundante en key). 12 índices totales implementados. |

> **Nota de uso:** Cuando se agregue, modifique o elimine una tabla o índice en el rango 261–985 ó 2093–2217, actualizar este documento marcando la fila correspondiente y registrar el cambio en la sección 6.
