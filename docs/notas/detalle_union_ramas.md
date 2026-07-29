# Detalle de unión de ramas — `desarrolo_2026` ← `code-improvements`

**Fecha:** 2026-07-29

Este documento registra qué se hizo, qué problemas aparecieron y cómo se resolvieron durante
el proceso de traer a `desarrolo_2026` el trabajo de la rama `code-improvements`. Sirve como
bitácora para entender el proceso sin tener que reconstruirlo leyendo los commits uno por uno.

---

## 1. Contexto — las dos ramas

| Rama | Origen | Estado al iniciar |
|---|---|---|
| `desarrolo_2026` | Creada desde `Benja-No-Tocar` (commit `0592fcb2`) | Rama de trabajo nueva, sin historial propio |
| `code-improvements` | Rama independiente, divergida de un ancestro común anterior | 10 commits "Avance 1" a "Avance 10", tip en `764feb3f` |

Ambas ramas evolucionaron **en paralelo y de forma independiente** durante un tiempo. Esto es
la causa raíz de casi todos los problemas descritos más abajo: varias funcionalidades
(renombrado de "receta", modales de confirmación reutilizables, extracción de componentes)
se implementaron en **ambas ramas por separado, con nombres y ubicaciones de archivo distintos**.

Se creó además el tag `Desarrollo_2026` apuntando al punto de partida de la rama (`0592fcb2`),
como marcador del inicio del proceso de integración.

---

## 2. Primer intento: `git cherry-pick` directo — abortado

**Qué se intentó:** aplicar el primer commit de `code-improvements` (`cb8d63fd`, "Avance 1")
directamente sobre `desarrolo_2026` con `git cherry-pick`.

**Qué pasó:** conflicto grande — **14 archivos en conflicto**, incluyendo:
- Un caso **rename/rename**: `frontend/src/types/receta.types.ts` había sido renombrado de
  forma distinta en cada rama (`types/pedido/receta.types.ts` en `desarrolo_2026` vs.
  `types/pedido-semana-bodega.types.ts` en `code-improvements`).
- Un caso **modify/delete**: `code-improvements` modificaba `conglomerado-pedidos.tsx`, pero
  ese archivo ya no existía en `desarrolo_2026` porque se había fusionado dentro de
  `gestion-solicitudes.tsx` en un commit posterior de esta rama.
- Conflictos de contenido en `gestion-usuarios.tsx`, `inventario.tsx`, `gestion-academica.tsx`,
  `gestion-proveedores.tsx`, servicios de inventario/pedido, etc.

**Decisión:** se abortó el cherry-pick (`git cherry-pick --abort`, sin pérdida de trabajo) y se
descartó el enfoque de merge automático de git para todo el proceso. En su lugar, se adoptó un
método manual: leer el diff real de cada commit de `code-improvements`, entender la intención
del cambio, y aplicarlo a mano sobre el archivo/ubicación actual de `desarrolo_2026`.

**Por qué funcionó mejor:** permitió detectar y resolver caso por caso las divergencias
estructurales (archivos movidos, funciones renombradas, páginas fusionadas) que un merge
automático no puede razonar — evitando además arrastrar decisiones de diseño viejas que ya
habían sido superadas por refactors posteriores en `desarrolo_2026`.

---

## 3. Problemas reales encontrados (bugs, no solo diffs de texto)

Durante el porteo aparecieron varios problemas que **no eran solo texto a copiar** — requirieron
entender el sistema para no romper nada:

### 3.1 Código de permiso inexistente (`PermisoRolServiceImpl.java`)

Los roles Profesor a Cargo y Docente tenían hardcodeado el código de módulo `GESTION_RECETAS`,
que **no existe** en el catálogo real de módulos (el código real es `PEDIDO_SEMANAL_BODEGA`,
visto en `permissions.types.ts` y en el seed de la base de datos). Esto significaba que
`restaurarPredeterminado()` nunca asignaba permisos correctamente a esos roles para ese módulo.
**Corregido en el Avance 1.**

### 3.2 Mismatch de claves JSON entre DTO y función SQL (`generar_solicitudes_masivas`)

El DTO `MassiveSolicitation.java` tenía los campos `idReceta`/`idDetalleReceta`, que se
serializan a JSON y son leídos **por nombre literal** por la función Postgres
`generar_solicitudes_masivas` (en `no_tocar/ConexionXD_v2.sql`). Al renombrar los campos del
DTO a `idPedidoSemanaBodega`/`idDetallePedidoSemana` sin también actualizar la función, la
generación masiva de solicitudes se rompía silenciosamente: la cabecera de `solicitud` se
creaba bien pero `detalle_solicitud` quedaba vacío (`v_id_receta` quedaba `NULL`).

**Solución:** se creó `no_tocar/ConexionXD_v3.sql`, un script **incremental** (sin tocar ni
reejecutar `ConexionXD_v2.sql`, que recrea todo el esquema desde cero) con un
`CREATE OR REPLACE FUNCTION` que lee las claves JSON correctas. Mismo patrón que usa el
Avance 5 original de `code-improvements` para este bug exacto. **Corregido en el Avance 1.**

### 3.3 Mismatch propio introducido durante el porteo (frontend ↔ backend)

Al renombrar automáticamente `idDetalleReceta`, el frontend terminó con
`idDetallePedidoSemanaBodega` mientras el backend (siguiendo la convención del Avance 5 de
`code-improvements`) usa `idDetallePedidoSemana` (sin "Bodega"). Detectado y corregido en el
mismo Avance 1, antes de que llegara a producción.

### 3.4 Archivos con nombre desincronizado del nombre de clase/import

Un renombrado masivo de identificadores (`receta` → `pedidoSemanaBodega`) cambió el nombre de
una clase Java (`DashboardRecetasDTO` → `DashboardPedidoSemanaBodegasDTO`) y de un import de
TypeScript, pero no el nombre del archivo en disco. Java exige que archivo y clase pública
coincidan — esto rompió la compilación completa del backend con errores en cascada que no
tenían nada que ver con el cambio real (parecían fallos de Lombok en un archivo no tocado).
**Causa raíz identificada comparando contra un compile limpio de la rama sin modificar; fix:
`git mv` de ambos archivos al nombre correcto.**

### 3.5 Divergencia estructural en páginas ya refactorizadas

`inventario.tsx`, `bodega-transito.tsx` y `gestion-solicitudes.tsx` habían sido refactorizados
en `desarrolo_2026` **después** de que `code-improvements` se ramificara: extracción de
`FormularioProducto`, `PedidoMasivoModal`, `ControlMasivoBodegaModal`,
`DetalleSolicitudModal`, `RevertirSolicitudModal` a archivos propios, y fusión de
`gestion-solicitudes.tsx` con `conglomerado-pedidos.tsx` en pestañas. Cada cambio de
`code-improvements` que tocaba esas páginas tuvo que ubicarse en su nueva ubicación real y
adaptarse a la nueva firma de props de los componentes extraídos (Avances 5 y 6).

### 3.6 Tests con mocks incompletos tras agregar hooks nuevos

Cada vez que se agregó un hook nuevo a `hooks/useToast.ts` (`useConfirmDelete`,
`useConfirmDeactivate`, `useConfirmReject`), los archivos de test que renderizan páginas que
usan esos hooks empezaron a fallar con
`No "<hook>" export is defined on the "../../hooks/useToast" mock` — porque el
`vi.mock('../../hooks/useToast', ...)` de cada test es una lista explícita, no un mock
automático. Se corrigió agregando el mock faltante en cada archivo afectado
(`inventario.test.tsx`, `gestion-academica.test.tsx`, `sala-reservas.test.tsx`,
`movimientos-producto.test.tsx`, `pedido-semanal-a-bodega.test.tsx`, `solicitud.test.tsx`,
`conglomerado-pedidos.test.tsx`). Esto es exactamente lo que documentaban los Avances 7, 8 y 9
de `code-improvements` — se habían resuelto de forma proactiva en los Avances 1 y 6 de esta
rama, antes de portar esos commits explícitamente.

### 3.7 Test de backend desactualizado (el único bug que quedó "vivo" hasta el final)

`SolicitudServiceImplTest.test5FindSolicitationsPerWeekRaw` armaba un `Object[]` simulado de
10 columnas, pero el método real `findSolicitationsPerWeekRaw` ya leía 12 columnas
(`row[10]=idPedido`, `row[11]=tieneOrdenPedidoActiva`, agregadas en un cambio posterior no
reflejado en el test) — `ArrayIndexOutOfBoundsException`. Se verificó que el método real y la
query nativa asociada ya estaban alineados entre sí: el desactualizado era solo el test.
**Corregido en el Avance 7** (último commit del porteo), ampliando el mock a 12 columnas.

---

## 4. Mapeo de commits — `code-improvements` → `desarrolo_2026`

| `desarrolo_2026` | Origen en `code-improvements` | Nota |
|---|---|---|
| Avance 1 | Avance 1 (`cb8d63fd`) | Rename receta→pedidoSemanaBodega + fixes 3.1 y 3.2 |
| Avance 2 | Avance 2 (`744f6efd`) | Reactivación de productos inactivos — coincidía exacto, sin conflicto |
| Avance 3 | Avance 3 (`7d6477c8`) | Gate de tests en CI. `PENDIENTES_POR_MODULOS.MD` se adaptó, no se copió tal cual (ver §5) |
| Avance 4 | — (nuevo) | Pedido explícito del usuario: documentar la convención `useConfirmDelete` en `convenciones.md` |
| Avance 5 | Avance 4 (`c18700b4`) | Iconos de Abastecimiento — solo cambió la ruta de los archivos (extraídos en refactor posterior) |
| Avance 6 | Avance 6 (`1fd413dd`) | `motivoField` + `useConfirmReject` — el más laborioso por la divergencia de `gestion-solicitudes.tsx` |
| Avance 7 | Avance 10 (`764feb3f`) | Fix del test backend — Avance 5 ya cubierto en el 1; Avances 7/8/9 ya cubiertos en 1 y 6 |

`code-improvements` no tiene commits más nuevos que `764feb3f` (verificado contra `origin` el
2026-07-29) — el porteo cubre el 100% de esa rama al momento de este documento.

---

## 5. Decisiones deliberadas (no oversights)

- **`no_tocar/ConexionXD_v2.sql` y `script_produccion_v1.sql` no se tocaron.** La función
  `generar_solicitudes_masivas` sigue ahí con las claves JSON viejas a propósito — el fix vive
  exclusivamente en el `v3` incremental, siguiendo la convención ya establecida por
  `code-improvements` de no reescribir los scripts que recrean el esquema completo.
- **`PENDIENTES_POR_MODULOS.MD` no se copió literalmente del Avance 3 original.** Ese archivo
  documentaba como "pendientes" varios problemas (mocks de `useConfirmDelete` faltantes) que en
  esta rama ya estaban resueltos por haberse portado el Avance 1 primero, y otras secciones
  (`proveedor_dia_entrega`, tablas puente de `gestion_academica`) que no se pudieron verificar
  contra el esquema real de `desarrolo_2026`. Se optó por no incluir documentación especulativa.
- **El soft delete de `proveedor_dia_entrega` no se va a implementar** — descartado
  explícitamente por decisión del usuario durante el proceso.

---

## 6. Estado final verificado (2026-07-29)

- **Backend:** `./mvnw -f backend/pom.xml -o test` → **63/63 tests, `BUILD SUCCESS`, sin
  ninguna falla.** Primera vez en todo el proceso que queda 100% verde (antes del Avance 7
  siempre fallaba el test de §3.7).
- **Frontend:** `npx vitest run` → **203/203 tests pasando (17 archivos)**, sin ninguna falla.
- **Frontend — tipos:** `tsc --noEmit` da 8 errores, todos preexistentes y documentados en
  `frontend/CLAUDE.md` (no relacionados a este proceso, no bloquean `npm run build` porque usa
  `tsc --noCheck`).
- **Backend/frontend `receta`/`Receta`/`detalleReceta`:** 0 menciones en código (`backend/src`,
  `frontend/src`). Quedan menciones solo en documentación histórica (`CONTEXTO_*.md`,
  `CLAUDE.md`) y en los scripts `no_tocar/ConexionXD_v2.sql`/`script_produccion_v1.sql` por
  decisión explícita (ver §5).

Todo el trabajo quedó commiteado en `desarrolo_2026` bajo la convención "Avance N", autor
`Matheus`, sin push a `origin` (pendiente de decisión del usuario).
