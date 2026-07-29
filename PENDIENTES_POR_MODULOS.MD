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

Sin pendientes catalogados actualmente.
