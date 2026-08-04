# PENDIENTES POR MÓDULOS

Documento de seguimiento de implementaciones pendientes **por módulo de negocio**. A diferencia
de `PENDIENTES.MD` (bugs y refactros puntuales sin agrupar), acá cada pendiente vive dentro de
su módulo para priorizar y planificar antes de implementar.

---

## Especificación del documento

- **Orden:** los pendientes se agrupan por módulo de negocio (`gestion_inventario`,
  `gestion_solicitud`, `pedido_semana_a_bodega`, etc. — mismos nombres que las carpetas de
  `backend/src/main/java/KuHub/modules/`). Cada módulo es una sección `## 📦 Módulo: <Nombre> (\`codigo_modulo\`)`.
- **Backend / Frontend:** dentro de cada módulo, los pendientes se separan en dos subsecciones
  fijas — `### Backend` y `### Frontend` — aunque una de las dos quede vacía. Si un pendiente
  toca ambos lados, se documenta en las dos subsecciones con referencia cruzada.
- **Ruta y línea:** cada ítem debe indicar el archivo exacto involucrado y, si aplica, la línea
  o rango de líneas al momento de documentarlo (ej. `SolicitudServiceImp.java:237`). Las líneas
  se van a desactualizar con el tiempo — no hace falta mantenerlas exactas, pero deben apuntar
  al método/bloque correcto para ubicarlo rápido.
- **Formato de cada ítem:**
  ```
  #### ⚠️ <Título corto del pendiente>

  **Estado:** Detectado <fecha> · **Dificultad estimada:** Baja/Media/Alta

  **Archivos:** \`ruta/al/archivo.ext:línea\`, \`ruta/al/otro-archivo.ext\`

  Descripción del problema/feature pendiente, contexto necesario para entenderlo sin tener que
  investigar desde cero, y (si aplica) el siguiente paso sugerido.
  ```
- **Al implementarse — remover, no tachar:** cuando un pendiente se resuelve, se **elimina por
  completo** su bloque de este documento (no se marca como ✅ ni se deja tachado). El historial
  de qué se resolvió y cómo vive en los mensajes de commit y, para cambios grandes, en
  `docs/notas/`. Este archivo debe reflejar en todo momento **solo lo que sigue pendiente hoy**
  — si un módulo queda sin pendientes, se elimina la sección completa del módulo.
- **Decisiones cerradas no son pendientes:** si algo se evaluó y se decidió explícitamente NO
  implementarlo (ej. "se evaluó X, se descarta por Y"), no va en este documento — no es un
  pendiente, es una decisión de arquitectura ya tomada. Si vale la pena dejar registro,
  documentarlo en `docs/arquitectura/` o en el `.md` propio del módulo dentro de
  `backend/.../<modulo>/`.

---

## 📦 Módulo: Gestión de Notificaciones (`gestion_notificacion`)

### Backend

#### ⚠️ Notificaciones filtradas por lista de roles hardcodeada, no por accesos reales del rol

**Estado:** Detectado 2026-07-30 · **Dificultad estimada:** Media

**Archivos:** `backend/src/main/java/KuHub/modules/gestion_notificacion/service/NotificacionServiceImpl.java:37-65`, `backend/src/main/java/KuHub/modules/gestion_notificacion/dtos/response/NotificacionResumenDTO.java`

`NotificacionServiceImpl.obtenerResumen()` decide qué categorías de notificación devolver con tres
flags (`canSolicitudes`, `canPedidos`, `canOrdenPedido`) calculados por `hasAnyRole(authorities, "ADMINISTRADOR", "GESTOR_PEDIDOS", ...)`
(líneas 43-48) — listas de **nombres de rol escritas a mano** por categoría. Este diseño quedó
pensado principalmente para que el Administrador viera todo, y no escala con los muchos cambios
implementados desde entonces (fusión de Gestión de Solicitudes + Conglomerado de Pedidos en
pestañas, permisos granulares por vista como `CONG_VISTA_APROBACION`/`GEST_SOL_GESTIONAR`, etc. —
ver módulo Gestión de Usuarios y Roles más abajo). La idea es que lo que cada usuario ve en la
campana de notificaciones corresponda a los **accesos reales** que su rol tiene a esas vistas
(vía la matriz `permiso_rol`), no a una lista de nombres de rol copiada aparte y que hay que
recordar mantener sincronizada a mano cada vez que se agrega un rol o se cambia un permiso.

Para retomar: recorrer el flujo completo (`obtenerResumen()` → `solicitudService.obtenerNotificacionesPorSemana()`,
`solicitudService.obtenerNotificacionesAceptadasPorSemana()`, `pedidoService.obtenerNotificacionesPedidosPendientes()`,
`ordenPedidoService.obtenerNotificacionesPedidosSinOp()`, `ordenPedidoService.obtenerNotificacionesEntregas()`)
para ir localizando qué corresponde notificar a cada tipo de vista, y decidir si el filtro se
resuelve consultando la matriz de permisos del usuario autenticado (vía `PermisoRolService`) en
vez de la lista de roles fija actual.

**Persona asignada:** Matheus.

### Frontend

#### ⚠️ header.tsx consume el resumen de notificaciones sin filtro adicional por permisos

**Estado:** Detectado 2026-07-30 · **Dificultad estimada:** Media

**Archivos:** `frontend/src/components/header.tsx:33-88`, `frontend/src/services/notificacion/notification-service.ts`

`header.tsx` llama a `obtenerResumenNotificaciones()` (línea 83) y vuelca las 5 listas del DTO
directamente a estado (`notificaciones`, `notificacionesAceptadas`, `notificacionesPedidosPendientes`,
`notificacionesSinOp`, `notificacionesEntregas`) sin aplicar ningún filtro propio — hoy confía en
que el backend ya devolvió listas vacías para lo que el rol no debería ver (ver pendiente de
Backend arriba). Si el filtrado por vista/permiso termina resolviéndose del lado del frontend en
vez del backend, hay que replicar la lógica acá contra `usePermission()` / `useModulePermission()`
antes de pintar cada sección del dropdown de notificaciones.

Nota aparte (no es el pendiente, pero puede confundir a quien retome esto): existe también
`frontend/src/services/notificacion/notificacion-service.ts` (con "c", sin "t" en "notification"),
un servicio viejo basado en `localStorage` que ya no se importa desde ningún lado del código
actual — no confundirlo con `notification-service.ts`, que es el que está en uso real.

**Persona asignada:** Matheus.

---

## 📦 Módulo: Gestión de Usuarios y Roles (`gestion_usuario`)

### Backend

#### ⚠️ Faltan inserts de `modulo`/`permiso_rol` para los permisos granulares agregados

**Estado:** Detectado 2026-07-30 · **Dificultad estimada:** Media

**Archivos:** `no_tocar/ConexionXD_v2.sql:992-1007` (bloque `INSERT INTO modulo`), `backend/src/main/java/KuHub/modules/gestion_usuario/service/PermisoRolServiceImpl.java:122-162` (`restaurarPredeterminado`), `frontend/src/types/usuario/permissions.types.ts` (tipo `ModuleKey`), `frontend/src/pages/gestion-roles.tsx`

La tabla `modulo` solo tiene sembrados los 15 códigos de **página** (`DASHBOARD`, `INVENTARIO`,
`SOLICITUD`, `GESTION_PEDIDOS`, `GESTION_SOLICITUDES_CONGLOMERADO`,
`GESTION_PROVEEDORES`, `BODEGA_TRANSITO`, `PEDIDO_SEMANAL_BODEGA`, `GESTION_ACADEMICA`,
`GESTION_ROLES`, `GESTION_USUARIOS`, `ADMIN_SISTEMA`, `GESTION_CATEGORIAS`, `GESTION_UNIDADES`,
`HISTORIAL_MOVIMIENTOS` — ver `ConexionXD_v2.sql:992-1007` y el bloque agregado después en
:1131-1135 y :1187-1189). El tipo `ModuleKey` del frontend, en cambio, define ademas ~50 códigos
de **permiso granular por acción/vista dentro de una página** (ej. `GEST_SOL_GESTIONAR`,
`GEST_SOL_RECHAZAR`, `CONG_APROBAR_PEDIDO`, `CONG_RECHAZAR_PEDIDO`, `CONG_VISTA_APROBACION`,
`CONG_VISTA_CRONOGRAMA`, `CONG_VISTA_TOTALES`, `CONG_VISTA_CATEGORIAS`, la familia `GA_*` de
Gestión Académica, la familia `GPRV_*` de Gestión de Proveedores, `INV_ABAST_BODEGA`,
`INV_ABAST_PROV`, `INV_CONTROL_MASIVO`, `BOD_ABASTECIMIENTO`, `BOD_CONTROL_MASIVO`, etc. — buscar
`useModulePermission('` en `frontend/src` para el listado completo actualizado) que **no tienen
fila correspondiente en `modulo`**.

Esto importa en la práctica porque `PermisoRolServiceImpl.restaurarPredeterminado()` (línea 122)
itera `moduloRepository.findByEnabledTrueOrderByOrdenModuloAsc()` (línea 124) — es decir, "Restaurar
predeterminado" en Gestión de Roles **solo puede restaurar permisos de los módulos que ya existen
en la tabla**. Cualquier código granular sin fila en `modulo` queda fuera de ese restore y de la
matriz que arma `gestion-roles.tsx`, y no hay forma de saber desde la BD qué debería ser el
default de fábrica para esos permisos.

Para retomar: comparar el listado completo de `ModuleKey` (`permissions.types.ts`) contra los
`codigo_modulo` **realmente presentes en la tabla `modulo` de la base de datos real** (no alcanza
con que el `INSERT` exista en `ConexionXD_v2.sql`/`ConexionXD_v3.sql` — hay que confirmar que ese
bloque específico ya se ejecutó contra el entorno; ver conversación 2026-08-04 sobre `kuhub_devs`
donde varios `INSERT INTO modulo ... ON CONFLICT DO NOTHING` quedaron en el script sin correr
todavía). De la familia `GPRV_*` de Gestión de Proveedores, ya se confirmó en la matriz de
Gestión de Roles contra la BD real (`kuhub_devs`) que `GPRV_ORDENES`, `GPRV_PENDIENTE_ENVIADA`,
`GPRV_CONFIRMADA`, `GPRV_CANCELAR_OP` y `GPRV_EXPORT_OP` existen como fila en `modulo` y se pueden
leer/editar por rol (ver bug relacionado resuelto 2026-08-04 en `OrdenesVista.tsx` — visibilidad de
pestañas de estado de Órdenes de Pedido). **Sigue faltando confirmar** el resto de la familia:
`GPRV_DATOS_PROV`, `GPRV_NUEVO_PROV`, `GPRV_SYNC_EXCEL`, `GPRV_GENERAR_ORDEN`, `GPRV_COTIZACION`,
`GPRV_CAMBIAR_ESTADO_PROV`, `GPRV_EDITAR_PROV`, `GPRV_ASIGNAR_PROD`, `GPRV_ELIMINAR_PROV`,
`GPRV_EXPORT_DATOS` — y el resto de familias (`GA_*`, `INV_*`, `BOD_*`, etc.) listadas arriba.
Escribir los `INSERT INTO modulo` + `INSERT INTO permiso_rol` faltantes (o simplemente ejecutar el
bloque ya escrito en el script) siguiendo el mismo patrón ya usado para agregar
`GESTION_CATEGORIAS`/`GESTION_UNIDADES` (`ConexionXD_v2.sql:1128-1183`) y `HISTORIAL_MOVIMIENTOS`
(`ConexionXD_v2.sql:1187-1231`): un `INSERT INTO modulo ... ON CONFLICT (codigo_modulo) DO
NOTHING`, seguido de un `INSERT INTO permiso_rol` por rol con `ON CONFLICT (id_rol, id_modulo) DO
UPDATE` definiendo el CRUD default de cada rol para ese permiso granular.

**✅ Verificado funcionando en BD real:** `GEST_SOL_VISTA` y `CONG_VISTA_PEDIDO` (2026-08-04, ver
`ConexionXD_v3.sql`) — confirmado por consulta directa a `kuhub_devs`. `GPRV_ORDENES`,
`GPRV_PENDIENTE_ENVIADA`, `GPRV_CONFIRMADA`, `GPRV_CANCELAR_OP` y `GPRV_EXPORT_OP` (2026-08-04,
confirmado visualmente en la matriz de Gestión de Roles con datos reales de `kuhub_devs`, rol
Asistente de Bodega). Las vistas **Pedido Semanal a Bodega** (`PEDIDO_SEMANAL_BODEGA`) y
**Solicitud** (`SOLICITUD`) también tienen sus permisos funcionando perfectamente — son módulos de
página simple, ya sembrados en `modulo`, sin permisos granulares adicionales pendientes de
insertar.

**Persona asignada:** Matheus.

---

## 📦 Módulo: Gestión de Inventario (`gestion_inventario`)

### Frontend

#### ⚠️ Listado final de Control de Stock Masivo no agrupa por día ni por solicitud de origen

**Estado:** Detectado 2026-07-30 · **Dificultad estimada:** Media

**Archivos:** `frontend/src/pages/inventario/PedidoMasivoModal.tsx:474-505` (`cargarSolicitudesSeleccionadas`), `frontend/src/pages/inventario/PedidoMasivoModal.tsx:692-702` (`solicitudesPorDia`), `frontend/src/pages/inventario/PedidoMasivoModal.tsx:910-1040` (listado final `itemsPedido.map`), `frontend/src/pages/inventario/constants.ts:3-15` (`ItemPedidoMasivo`)

El botón "Control de Stock Masivo" de Inventario, flujo "Abastecimiento de Bodega", deja elegir
qué cargar de dos formas: agrupado por día (toggle `agruparPorDia`, memo `solicitudesPorDia` que
agrupa por `sol.fechaSolicitada`, líneas 692-702) o solicitud por solicitud (`toggleSolicitudBodega`).
El problema es que **una vez que los productos se cargan al listado final** (`cargarSolicitudesSeleccionadas`,
línea 474, que sí guarda `idSolicitud` por ítem en `ItemPedidoMasivo` — ver `constants.ts:12`),
esa agrupación se pierde: el listado que se muestra antes de confirmar el envío
(`itemsPedido.map(...)`, línea 939) es una **tabla plana sin encabezados de día ni de solicitud**,
mezclando todo. Esto es justo lo contrario de lo que se necesita, porque el flujo está pensado
para poder enviar por ciertas solicitudes o por día específico (por ejemplo, para separar en
distintos envíos lo que ya se entregó de lo que todavía falta entregar).

Además, hoy los detalles ya marcados `enviadoBodegaTransito` se descartan directamente al armar
la selección (`cargarSolicitudesSeleccionadas`, línea 479: `if (det.enviadoBodegaTransito)
continue;`) en vez de mostrarse pero marcados como "ya entregado" — así que tampoco hay manera de
ver de un vistazo, para un día o solicitud dado, qué quedó pendiente vs. qué ya se despachó antes.

Para retomar: `ItemPedidoMasivo` ya trae `idSolicitud`, pero no `fecha`/`día` — habría que
propagar `sol.fechaSolicitada` al armar cada ítem (igual que ya se hace con `idSolicitud`), y
reestructurar el render del listado final (líneas 910-1040) para agrupar por día o por solicitud
con subencabezados (reutilizando la lógica de agrupación que ya existe en `solicitudesPorDia`),
en vez de la lista plana actual. Evaluar también si conviene mostrar los ítems ya entregados en
el listado (deshabilitados/marcados) en lugar de filtrarlos silenciosamente antes de llegar ahí.

---
