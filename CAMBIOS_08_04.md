# Cambios KuHub — 08/04/2026

## Resumen de implementaciones

Basado en el documento `Prioridades_08_04` del proyecto, se implementaron 13 mejoras + correcciones post-entrega.

---

## Prioridad 1 — BAJA · Toggle de contraseña en Login

**Archivo:** `src/pages/login.tsx`

- Agregado estado `showPassword: boolean`
- Campo de contraseña cambia entre `type="password"` y `type="text"` según el estado
- Botón con icono `lucide:eye` / `lucide:eye-off` en el `endContent` del Input

---

## Prioridad 2 — MEDIA · Mensajes de período académico en Solicitud

**Archivo:** `src/pages/solicitud.tsx`

- Eliminado el fallback que generaba botones ficticios cuando no había períodos
- `sinPeriodos = periodos.length === 0 && !isLoadingSemanas`
- Si no hay período y el usuario **no es administrador**: muestra mensaje *"Contacte el Administrador para que genere los períodos académicos"*
- Si no hay período y el usuario **es Administrador (rol 1)**: muestra mensaje clickable *"Para realizar una solicitud, genere el período académico"* que navega a `/admin-sistema?tab=semanas`

---

## Prioridad 3 — BAJA · Link a Gestión de Asignatura cuando no hay asignaturas

**Archivo:** `src/pages/solicitud.tsx`

- Cuando no hay asignaturas disponibles y el usuario **es Administrador**: aparece enlace clickable que navega a `/ramos-admin`
- Para usuarios no administradores: solo el mensaje de aviso existente

---

## Prioridad 4 — BAJA · Iconos en títulos de todas las páginas

**Archivos modificados:**
- `src/contexts/PageTitleContext.tsx` — agregado campo `icon: string` al contexto
- `src/hooks/usePageTitle.ts` — agregado parámetro `icon?: string`
- `src/components/header.tsx` — renderiza el ícono antes del título usando `<Icon icon={icon} />`
- Todas las páginas actualizadas con su ícono correspondiente:

| Página | Ícono |
|--------|-------|
| Dashboard | `lucide:layout-dashboard` |
| Inventario | `lucide:package` |
| Historial Movimientos | `lucide:history` |
| Solicitud | `lucide:clipboard-list` |
| Gestión de Pedidos | `lucide:shopping-cart` |
| Gestión de Solicitudes | `lucide:inbox` |
| Conglomerado de Pedidos | `lucide:layers` |
| Bodega de Tránsito | `lucide:warehouse` |
| Gestión Pedidos Diarios | `lucide:calendar-check` |
| Gestión de Recetas | `lucide:chef-hat` |
| Ramos Admin | `lucide:graduation-cap` |
| Gestión de Roles | `lucide:users` |
| Gestión de Usuarios | `lucide:user-cog` |
| Admin Sistema | `lucide:settings` |
| Gestión de Categorías | `lucide:tag` |
| Gestión de Unidades | `lucide:ruler` |

---

## Prioridad 5 — MEDIA · Mensajes cuando no hay docentes en Crear/Editar Sección

**Archivo:** `src/pages/ramos-admin.tsx`

- En `CrearSeccionModal` y `EditarSeccionModal`: si no hay docentes disponibles
  - **No administrador:** mensaje *"Contacte el administrador para agregar un Docente al sistema"*
  - **Administrador:** enlace clickable a `/gestion-usuarios` para crear un docente

---

## Prioridad 6 — BAJA · Mensajes de período en Gestión de Solicitudes, Pedidos y Conglomerado

**Archivos:**
- `src/pages/gestion-solicitudes.tsx`
- `src/pages/gestion-pedidos.tsx`
- `src/pages/conglomerado-pedidos.tsx`

Mismo patrón que Prioridad 2:
- Sin período + no admin → mensaje de contacto al administrador
- Sin período + admin → enlace clickable a `/admin-sistema?tab=semanas`

---

## Prioridad 7 — BAJA · Remover ícono duplicado en Bodega de Tránsito

**Archivo:** `src/pages/bodega-transito.tsx`

- Eliminado el elemento `memoizedTitle` que contenía el ícono antiguo (`lucide:container`) como JSX pasado como string
- Ahora usa únicamente el ícono del `usePageTitle` con `lucide:warehouse`

---

## Prioridad 8 — BAJA · Corrección de ícono en Gestión de Roles

**Archivo:** `src/pages/gestion-roles.tsx`

- Reemplazado ícono `lucide:shield` por `lucide:users` para consistencia con el sidebar
- Agregado `usePageTitle('Gestión de Roles', '...', 'lucide:users')`

---

## Prioridad 9 — BAJA · Mensajes de período en selector de Semana Académica dentro de AsigCard

**Archivo:** `src/pages/solicitud.tsx`

- Agregado `sinPeriodos: boolean` a `AsigCardProps`
- Dentro del componente `AsigCard`, el selector de Semana Académica muestra los mismos mensajes condicionales de la Prioridad 2 cuando `sinPeriodos` es verdadero

---

## Prioridad 10 — BAJA · Mensajes en selector de Receta Base + selector de productos siempre visible

**Archivo:** `src/pages/solicitud.tsx`

- Cuando no hay recetas disponibles:
  - **No administrador:** *"Contacte el administrador para crear Recetas Base"*
  - **Administrador:** enlace clickable a `/gestion-recetas`
- Sección "Agregar producto adicional" movida fuera del bloque condicional → **siempre visible**, independiente de si hay receta seleccionada
- Lógica de validación del formulario: `isValid = selCount > 0 && semanaId !== '' && (recetaId !== '' || tieneItems)`
- Lógica de envío (`enviar()`): cuando no hay receta, incluye los productos manuales como `deltas.nuevos`

---

## Prioridad 11 — BAJA · Remover encabezado duplicado en Gestión de Roles + mover botones

**Archivo:** `src/pages/gestion-roles.tsx`

- Eliminado el bloque duplicado con ícono + h1 + descripción que aparecía dentro del contenido
- Botones "Recargar" y "Guardar Cambios" movidos al mismo contenedor de la leyenda de Niveles, alineados a la derecha con `ml-auto`
- Se preservaron tamaño, color y estilo original de los botones

---

## Prioridad 12 — BAJA · Título de Dashboard + remover redundancias

**Archivo:** `src/pages/dashboard.tsx`

- Agregado `usePageTitle('Dashboard', 'Panel de control del sistema', 'lucide:layout-dashboard')`
- Eliminados todos los encabezados inline redundantes de: `DashboardAdminTabs`, `DashboardProfesorView`, vistas de gestor y de inventario

---

## Prioridad 13 — ALTA · Mejorar formato del Excel en Conglomerado de Pedidos

**Archivo:** `src/pages/conglomerado-pedidos.tsx`  
**Paquete instalado:** `xlsx-js-style` (reemplaza `xlsx` con soporte de estilos de celda)

### Estructura del Excel generado:

| Fila | Descripción | Estilo |
|------|-------------|--------|
| Fila 1 | Título del reporte | Fondo `#FFB800`, negrita 14pt, fusión de toda la fila |
| Fila 2 | Vacía | Separador visual |
| Fila 3 | Encabezados de columna | Fondo `#2D3748`, texto blanco, negrita |
| Fila N | Nombre de categoría | Fondo `#FFF3CD`, fusión de toda la fila |
| Filas productos | Datos alternados | Blanco / `#F7FAFC` |
| Columna Total | Total día/semana | Fondo `#C6F6D5`, texto verde, negrita |
| Filas SUBTOTAL | Subtotal por categoría | Fondo `#4A5568`, texto blanco, negrita |
| Fila separadora | Entre categorías | Fondo `#EDF2F7` |

### Otras características:
- Celdas congeladas en las 3 primeras filas (`!freeze`)
- Ancho de columnas calculado automáticamente según contenido (`autoColWidth`)
- Merges en fila título y filas de categoría
- Disponible tanto para vista **por día** como **vista completa semanal**

---

## Correcciones post-entrega

### Fix: `package-lock.json` desincronizado en Docker build

**Problema:** El pipeline de GitHub Actions fallaba con `npm ci` porque `xlsx-js-style` fue instalado localmente pero el `package-lock.json` no fue commiteado.

**Solución:** Ejecutar `npm install` en `/frontend` para regenerar el lock file y commitear el resultado antes del siguiente push.

---

### Fix: Formato numérico en Excel (decimales y separadores)

**Problema 1:** Los decimales no aparecían en Excel.  
**Causa:** El `numFmt` en el objeto `s` de xlsx-js-style no aplicaba correctamente el formato decimal.  
**Solución:** Agregar `z: '#,##0.###'` directamente en la celda.

**Problema 2:** Los decimales aparecían con punto (`.`) en lugar de coma (`,`).  
**Causa:** Excel usa el separador decimal del sistema operativo del usuario, no el del archivo. Si el Excel está en locale inglés, muestra `.` sin importar el formato del archivo — no es posible forzarlo desde el OOXML.  
**Solución final:** Escribir los valores numéricos como **texto formateado** usando `toLocaleString('es-CL', { maximumFractionDigits: 3 })`:
- Miles con punto: `1.000`
- Decimal con coma: `1.000,123`
- Sin ceros finales: `1,5` (no `1,500`)
- Garantizado independientemente del locale del Excel del usuario

> **Nota:** Al usar texto en lugar de números, las fórmulas de recálculo automático no están activas. Los valores de totales y subtotales muestran el resultado pre-calculado correcto al momento de descarga.

---

## Navegación profunda agregada

**Archivo:** `src/pages/admin-sistema.tsx`

Para que los enlaces desde otras páginas abran directamente la pestaña correcta, se implementó soporte de deep-link por query parameter:

```
/admin-sistema?tab=semanas   → abre la vista "Gestión de Semanas"
/admin-sistema?tab=horarios  → abre la vista "Horarios" (default)
/admin-sistema?tab=reservas  → abre la vista "Reservas"
```

Implementado con `useLocation` + `URLSearchParams` de React Router.
