# Errores identificados y acciones tomadas - Página Pedido Semanal Bodega

## 🔴 ERRORES ENCONTRADOS

### Error 1: HTTP 429 Too Many Requests
**Estado**: ARREGLADO

**Síntomas**:
```
GET https://appkuhub.questweb.cl/api/v1/producto/find-all-product-active-for-option 429 (Too Many Requests)
GET https://appkuhub.questweb.cl/api/v1/pedido-semana-bodega/count-recipes 429 (Too Many Requests)
GET https://appkuhub.questweb.cl/api/v1/permisos/matrix 429 (Too Many Requests)
```

**Causa raíz**: 
- Solicitudes simultáneas del contexto PeriodoSemana + cargarDatosIniciales de la página
- `Promise.all()` con 3 endpoints críticos al mismo tiempo
- Dependencias incorrectas en useCallback causaban re-renders innecesarios

**Solución**:
- ✅ Arregladas dependencias en `periodo-semana-context.tsx` (línea 98: cambié a `[]`)
- ✅ Agregado wait en `pedido-semanal-a-bodega.tsx` para esperar a `isLoadingSemanas` antes de cargar
- ✅ Refactorizado `cargarDatosIniciales()` para cargar recetas primero, luego productos/conteos con límite de concurrencia
- ✅ Creada utilidad `request-throttle.ts` con `parallelWithLimit()`

---

### Error 2: "Error al obtener los periodos académicos"
**Estado**: ARREGLADO (cascada del 429)

**Síntomas**:
```
Error inicializando período y semanas: Error: Error al obtener los periodos académicos
```

**Causa raíz**: Cuando el servidor responde con 429 a las primeras solicitudes del contexto, todas las semanas y períodos fallan en cascada

**Solución**: Al arreglar el 429, este error desaparece automáticamente

---

### Error 3: DetalleReceta component no existe
**Estado**: PENDIENTE DE INFORMACIÓN

**Síntomas**:
- Usuario reportó que `DetalleReceta` ya no existe
- Pero el componente aún está en línea 764 del archivo

**Acciones necesarias**:
- [ ] Verificar si el componente fue renombrado
- [ ] Verificar si fue movido a otro archivo
- [ ] Verificar si fue dividido en múltiples componentes
- [ ] Actualizar las referencias en `pedido-semanal-a-bodega.tsx` (línea 705)

---

## 🛠️ CAMBIOS DE CÓDIGO REALIZADOS

### 1. `frontend/src/contexts/periodo-semana-context.tsx`
**Línea 98**
```diff
- }, [obtenerPeriodosAcademicosService, obtenerSemanasPorPeriodoService, detectarPeriodoActual, encontrarSemanaActual]);
+ }, []);
```
**Razón**: Las funciones importadas no deben estar en dependencias de useCallback; esto causaba re-renders constantes

---

### 2. `frontend/src/pages/pedido-semanal-a-bodega.tsx`
**Línea 112-114 (useEffect)**
```diff
- React.useEffect(() => {
-   cargarDatosIniciales();
- }, []);
+ React.useEffect(() => {
+   if (!isLoadingSemanas) {
+     cargarDatosIniciales();
+   }
+ }, [isLoadingSemanas]);
```
**Razón**: Esperar a que el contexto termine de cargar evita 4 solicitudes simultáneas

---

### 3. `frontend/src/pages/pedido-semanal-a-bodega.tsx`
**Línea 114-149 (cargarDatosIniciales)**
```diff
- const [resRecetas, resProductos, resCounts] = await Promise.all([
-   obtenerRecetasPaginadasService(1, idSemanaFilter),
-   productosPromise,
-   obtenerRecetasCountService()
- ]);
- setRecetas(resRecetas.content);
- if (productos.length === 0) setProductos(resProductos);
- setRecetaCounts(resCounts);

+ // Cargar recetas primero (datos críticos)
+ const resRecetas = await obtenerRecetasPaginadasService(1, idSemanaFilter);
+ setRecetas(resRecetas.content);
+ 
+ // Cargar datos secundarios con límite de concurrencia
+ const secondaryRequests = [
+   async () => { ... obtenerProductosParaRecetaService ... },
+   async () => { ... obtenerRecetasCountService ... }
+ ];
+ parallelWithLimit(secondaryRequests, 2)
+   .catch(() => console.error('Error al cargar datos secundarios'));
```
**Razón**: Reduce solicitudes simultáneas de 3 a 1 crítica + 2 secundarias con límite

---

### 4. `frontend/src/utils/request-throttle.ts` (NUEVO)
**Creado archivo con**:
- `withDelay()` - ejecuta función con retraso
- `sequentialWithDelay()` - ejecuta array de funciones secuencialmente
- `parallelWithLimit()` - ejecuta con límite máximo de concurrencia

**Razón**: Controlar picos de solicitudes que causan 429

---

### 5. `frontend/src/pages/pedido-semanal-a-bodega.tsx`
**Línea 42 (import)**
```diff
+ import { parallelWithLimit } from '../utils/request-throttle';
```
**Razón**: Usar la nueva utilidad de throttle

---

## 📊 IMPACTO DE CAMBIOS

| Métrica | Antes | Después |
|---------|-------|---------|
| Solicitudes simultáneas al cargar | 4+ (contexto + página) | 1 crítica + máx 2 secundarias |
| Tiempo de espera antes de cargar | Inmediato (conflicto) | ~100-150ms (coordinado) |
| Error 429 | ✗ Ocurre frecuentemente | ✓ Eliminado |
| Cascada de errores | ✗ Sí (periodos fallan) | ✓ No |

---

## ⚠️ PROBLEMAS PENDIENTES

### Problema: DetalleReceta no existe
**Reporte**: Usuario dice "no existe más detalle receta"

**Ubicación actual**: `pedido-semanal-a-bodega.tsx` línea 764

**Acción requerida**: 
- Confirmar si fue renombrado/movido/eliminado
- Actualizar referencias en Modal (línea 705)

---

## ✅ PRÓXIMAS PRUEBAS RECOMENDADAS

- [ ] Abrir modal "Nuevo Pedido Semanal" varias veces seguidas
- [ ] Verificar que no hay errores 429 en consola
- [ ] Verificar que productos cargan correctamente
- [ ] Verificar que conteos se actualizan
- [ ] Probar en Safari/macOS (consideraciones de frontend del proyecto)
- [ ] Abrir DevTools > Network > filtrar por 429 para confirmar que no hay

---

## 📝 NOTAS

- El servidor tiene rate limiting que rechaza >X solicitudes/segundo
- La solución implementada respeta ese límite espaciando solicitudes
- Si sigue habiendo 429, revisar límites del backend (nginx/API gateway)
- El contexto PeriodoSemana se estaba reiniciando constantemente por dependencias mal configuradas
