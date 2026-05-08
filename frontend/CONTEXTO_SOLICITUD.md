# CONTEXTO_SOLICITUD - Filtrado de Pedidos Semanales por Asignatura

## Objetivo
Implementar un filtro en la página de "Solicitud" que permita a los usuarios alternar entre ver solo los pedidos semanales asignados a una asignatura específica versus todos los pedidos semanales disponibles.

## Estado: ✅ COMPLETADO

Fecha de implementación: 2026-05-08

## Cambios Realizados

### 1. Backend - Adición del campo `id_asignatura`

#### Archivo: `SolicitudRepository.java`
- **Modificación**: Actualizar query SQL en `findActiveRecipesWithDetailsRaw()` para incluir `r.id_asignatura AS idAsignatura`
- **Cambios específicos**:
  - Agregar `r.id_asignatura` al SELECT (posición [4])
  - Agregar `r.id_asignatura` al GROUP BY
  - Agregar parámetro `@Param("idAsignatura") Integer idAsignatura` con filtro opcional: `AND (:idAsignatura IS NULL OR r.id_asignatura = :idAsignatura)`

#### Archivo: `SolicitudService.java` (Interface)
- **Cambio de firma**: `List<RecipeSolicitation> findActiveRecipesWithDetailsRaw(Integer idAsignatura)`

#### Archivo: `SolicitudServiceImp.java`
- **Implementación**: Pasar parámetro `idAsignatura` al repositorio
- **Mapeo**: Incluir `row[4]` en constructor de `RecipeSolicitation` para mapear idAsignatura

#### Archivo: `RecipeSolicitation.java` (DTO)
- **Cambio de estructura**:
  ```java
  // ANTES
  public record RecipeSolicitation(Integer idReceta, String nombreReceta, Integer idSemana, List<RecipeDetailsDTO> detalles)
  
  // DESPUÉS
  public record RecipeSolicitation(Integer idReceta, String nombreReceta, Integer idSemana, Integer idAsignatura, List<RecipeDetailsDTO> detalles)
  ```

#### Archivo: `SolicitudController.java`
- **Parámetro adicional**: `@RequestParam(required = false) Integer idAsignatura`
- **Comportamiento**: Si `idAsignatura` es null, retorna todos los pedidos; si tiene valor, filtra por esa asignatura

### 2. Frontend - Interfaz y filtrado de pedidos

#### Archivo: `solicitud-service.ts`
- **Cambio de interfaz**: Agregar campo `idAsignatura?: number` a `IPedidoSemanaBodegaSolicitud`
- **Nota**: La función de servicio mantiene su firma actual (carga todos los pedidos sin parámetro)

#### Archivo: `solicitud.tsx` - Cambios principales

**a) Estado de filtrado**:
```typescript
const [soloEstaAsignatura, setSoloEstaAsignatura] = React.useState(true)
```
- Controla si el usuario quiere ver solo pedidos de su asignatura (true) o todos (false)

**b) Lógica de filtrado en `recetasFiltradas`**:
```typescript
const porAsignatura = soloEstaAsignatura 
  ? recetas.filter(r => r.idAsignatura === asig.idAsignatura) 
  : recetas;
```
- Si `soloEstaAsignatura` es true: filtra por `idAsignatura` exacto
- Si es false: muestra todos los pedidos

**c) UI de filtrado**:
- Checkbox agregado entre el título y el banner
- Etiqueta dinámica: "Mostrar solo pedidos de esta asignatura" con estado visible

**d) Cambios de Autocomplete**:
- Cambio de `defaultItems={recetasFiltradas}` a `items={recetasFiltradas}`
- Esto hace la lista reactiva a cambios en el estado del filtro

**e) Mensajes contextuales**:
- Empty state ahora muestra mensajes específicos según filtros activos
- Ejemplo: "Sin pedidos semanales bodega disponibles para {asignatura} en esta semana"

### 3. Cambio de Terminología

Se reemplazó toda la terminología "receta" por "pedido semanal bodega" en la interfaz de usuario:

| Antes | Después |
|-------|---------|
| Receta seleccionada | Pedido Semanal Bodega seleccionado |
| Sin recetas disponibles | Sin pedidos semanales bodega disponibles |
| Cargar receta | Cargar Pedido Semanal Bodega |
| Receta Base | Pedido Semanal Bodega Base |
| ... (todas las referencias visibles) | ... |

**Nota**: Los nombres de variables internas (`recetas`, `recetasFiltradas`) se mantienen sin cambios para estabilidad del código.

## Arquitectura de Solución

### Enfoque Híbrido
- **Backend**: Capacidad de filtrado por parámetro (preparado para uso futuro)
- **Frontend**: Filtrado del lado del cliente con estado de checkbox
- **Ventajas**: Mantiene arquitectura actual sin cambios de flujo de datos, permite usuario controlar filtrado en tiempo real

## Testing Realizado

✅ **Frontend compilation**: Build exitoso sin errores TypeScript
- Comando: `npm run build`
- Resultado: Compilación completada en ~1 minuto
- Chunks generados correctamente
- Warnings: Solo de dependencias no críticas

✅ **Funcionalidad de filtrado**:
- Checkbox alterna correctamente entre modos
- Lista reactiva actualiza al cambiar el estado
- Mensajes de empty state mostrados apropiadamente

## Próximos Pasos (Opcionales)

1. **Optimización backend**: Implementar filtrado server-side si la cantidad de pedidos crece significativamente
2. **Persistencia de preferencia**: Guardar la preferencia del usuario (solo asignatura vs todos)
3. **Performance**: Si el conjunto de datos crece, considerar paginación

## Archivos Modificados

- ✅ `backend/.../SolicitudRepository.java`
- ✅ `backend/.../SolicitudService.java`
- ✅ `backend/.../SolicitudServiceImp.java`
- ✅ `backend/.../RecipeSolicitation.java`
- ✅ `backend/.../SolicitudController.java`
- ✅ `frontend/src/services/solicitud-service.ts`
- ✅ `frontend/src/pages/solicitud.tsx`

## Estado Final

La feature de filtrado por asignatura está completamente implementada y funcionando. El usuario puede ahora:

1. Ver todos los pedidos semanales disponibles (checkbox desactivado)
2. Ver solo los pedidos asignados a su asignatura (checkbox activado, opción por defecto)
3. La interfaz responde en tiempo real a cambios en el checkbox
4. La terminología es consistente con "pedido semanal bodega" en toda la UI

---

# ANÁLISIS — Función SQL `generar_solicitudes_masivas()` y Deltas de Eliminados

## Estado: ✅ ANALIZADO Y CORREGIDO

Fecha: 2026-05-08

## Hallazgos del Análisis

### 1. Lógica de Eliminados en BLOQUE A — Estado CORRECTO

**Conclusión**: La lógica del BLOQUE A en la función SQL para procesar los `eliminados` es **correcta** para el caso de CREACIÓN de solicitudes masivas.

El código SQL actual:
```sql
AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_solicitud_masiva->'deltas'->'eliminados', '[]'::jsonb)) e
    WHERE e::INTEGER = dr.id_detalle_pedido_semana
)
```

**Verificación del flujo completo:**
1. Frontend envía `eliminados = [idDetallePedidoSemana, ...]` (IDs del pedido semanal bodega base)
2. Backend serializa a JSON: `"eliminados": [123, 456]`
3. SQL extrae con `jsonb_array_elements_text`: `"123"`, `"456"` como texto
4. Compara `"123"::INTEGER = dr.id_detalle_pedido_semana` → funciona correctamente

### 2. Bug Real Encontrado y Corregido — Campo `observacion`

**Archivo**: `ConexionXD_v2.sql`, línea ~3133

**Bug**: El SQL buscaba `observacionesGenerales` pero el DTO Java tiene el campo `observacion`.

```sql
-- ANTES (bug):
v_observacion_general := v_solicitud_masiva->>'observacionesGenerales';

-- DESPUÉS (corregido):
v_observacion_general := v_solicitud_masiva->>'observacion';
```

**Impacto del bug**: Las observaciones generales de la solicitud masiva **no se guardaban** en la base de datos. Siempre quedaban como null.

### 3. Respuesta al Checklist del CONTEXTO Original (Sección 13.7)

| Pregunta | Respuesta |
|----------|-----------|
| ¿Se usa `generar_solicitudes_masivas` solo para crear? | ✅ SÍ, solo para creación. No hay endpoint de edición. |
| ¿Hay un endpoint separado para editar? | ❌ NO existe en el código actual. |
| ¿El frontend envía `idDetallePedidoSemanaBodega`? | ✅ SÍ, siempre. Items cargados desde receta base. |
| ¿Los `eliminados` tienen IDs del Pedido Semanal Bodega? | ✅ SÍ, son `d.idDetallePedidoSemana`. |

### 4. Escenario de Bug Descrito en CONTEXTO Original — No Aplica Actualmente

El CONTEXTO original describía un bug hipotético: "Al EDITAR una solicitud existente, los IDs de `eliminados` serían de `detalle_solicitud`, no de `detalle_pedido_semana_bodega`".

**Conclusión**: Este escenario NO aplica actualmente porque no existe flujo de edición de solicitudes masivas. El CONTEXTO describía un análisis preventivo para cuando se implemente edición.

## Archivos Modificados

- ✅ `ConexionXD_v2.sql` — Corrección de campo `observacionesGenerales` → `observacion` en la función `generar_solicitudes_masivas()`

## Nota para Futuras Implementaciones de Edición

Si en el futuro se implementa la edición de solicitudes masivas, se requeriría:
1. Agregar `p_solicitud_id_existente INTEGER DEFAULT NULL` a la función SQL
2. En el BLOQUE A, agregar lógica condicional para comparar con `detalle_solicitud.id_detalle_solicitud` cuando `p_solicitud_id_existente IS NOT NULL`
3. Actualizar `SolicitudServiceImp.saveMass()` para pasar el parámetro cuando sea edición
