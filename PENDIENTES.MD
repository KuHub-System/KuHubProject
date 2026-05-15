# PENDIENTES

---

## ⚠️ Pendiente — Corregir MAPA sección 7.2 (solicitud)

El MAPA documenta columnas que **no existen** en la tabla real:
- Documenta: `nombre_solicitud`, `descripcion_solicitud`, `id_usuario`, `id_semana`, `activo`
- Real (verificado en `ConexionXD_v2.sql` línea 652):
  - `id_solicitud`, `id_usuario_gestor_solicitud`, `id_seccion`, `id_pedido_semana_bodega`, `id_reserva_sala`, `fecha_solicitada`, `fecha_registro`, `observaciones`, `estado_solicitud`

---

## ✅ Completados (2026-05-15)

- Corregir dashboard error 500 por tabla `receta` eliminada
- Actualizar nombre tab "Recetas" → "Pedido Semana Bodega" (frontend)
- Migrar consultas SQL del dashboard a usar `pedido_semana_bodega` en lugar de `receta`
- Corregir `getSolicitudesRechazadas()`: campo [3] usa `psb.nombre_pedido_semana_bodega` via JOIN (no `s.nombre_solicitud` que no existe)
- Corregir MAPA: columna `cantidad` → `cant_producto` en sección 8.2 `detalle_pedido_semana_bodega`
- Corregir líneas exactas del MAPA contra `ConexionXD_v2.sql` (todas las secciones verificadas)
- Agregar rutas de entities Java al MAPA

---

## 📐 Orientación: Mantenimiento del MAPA

El archivo `MAPA_ConexionXD_v2.md` debe reflejar **exactamente** lo que contiene `ConexionXD_v2.sql`.

**Reglas para mantenerlo correcto:**

1. **Línea exacta**: Cada tabla, función, índice y sección debe tener `**Línea**: NNN` con el número real del SQL. No usar aproximaciones (`~NNN`, `NNN+`, `(buscar...)`).
2. **Verificar contra el SQL**: Al agregar o modificar algo en el MAPA, abrir `ConexionXD_v2.sql` y confirmar la línea real con `grep -n "CREATE TABLE nombre"` o buscando el keyword exacto.
3. **Entities Java**: Cada tabla del MAPA debe tener referenciada la ruta del entity correspondiente en `backend/src/main/java/KuHub/modules/`.
4. **Tablas nuevas**: Si se agrega una tabla al SQL, agregarla también al MAPA con su línea, columnas y entity.
5. **Columnas**: Si se renombra o agrega una columna en el SQL, actualizar la sección correspondiente del MAPA inmediatamente.
