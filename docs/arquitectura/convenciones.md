# Convenciones de Frontend — KuHub

## Layout raíz de página

**Norma:** todo componente de página (`frontend/src/pages/*.tsx`) debe usar todo el ancho disponible
del viewport, sin importar la resolución del monitor. No aplicar `container`, `max-w-*` ni `mx-auto`
al wrapper raíz — eso topa el ancho y deja franjas vacías a los lados en monitores anchos (2K, ultrawide).

```tsx
return (
  <div className="min-h-screen bg-default-50/50 dark:bg-background pb-20 font-sans">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* secciones con su propio px-4 para el respiro lateral */}
    </motion.div>
  </div>
);
```

- El padding lateral (`px-4`, `p-4 md:p-6`, etc.) va en las secciones internas, no en el wrapper raíz
  — así el fondo y el contenido usan el 100% del ancho, y solo el contenido interno respeta un margen
  mínimo del borde.
- No usar `container` ni `max-w-7xl mx-auto` en el wrapper raíz de páginas nuevas.

**Por qué importa:** en monitores anchos, un contenedor topado en 1280–1536px deja el contenido
apretado en el centro con franjas vacías a los costados — desperdicia espacio de pantalla real en
tablas, grids y dashboards que se benefician de más ancho.

### Estado

Todas las páginas de `frontend/src/pages/*.tsx` cumplen esta norma — se les quitó `container mx-auto`
o `max-w-7xl mx-auto` del wrapper raíz:

`pedido-semanal-a-bodega`, `inventario`, `admin-sistema`, `historico-pedidos`, `dashboard`, `solicitud`,
`gestion-usuarios`, `gestion-proveedores`, `gestion-academica`, `perfil-usuario`, `not-found`,
`gestion-solicitudes`, `gestion-pedidos`.

Al crear una página nueva, no introducir `container`/`max-w-*`/`mx-auto` en su wrapper raíz.

### Excepción: layouts full-bleed con paneles fijos

Páginas tipo tablero/kanban (ej. `bodega-transito.tsx`, que usa `flex h-[calc(100vh-76px)] overflow-hidden`)
ya usan el ancho completo por diseño — no requieren cambios.

## Modales de confirmación (`hooks/useToast.ts`)

**Nunca escribir un modal de confirmación a mano en una página nueva** (ni con `window.confirm`, ni
armando un `<Modal>` custom con estado propio de `isOpen`/texto a escribir). Usar siempre los hooks
reutilizables de `hooks/useToast.ts`, montados sobre el mismo `showConfirm` de `utils/notifications.tsx`
— un solo componente visual reutilizado en todo el sistema.

| Hook | Uso | Estilo | Requiere escribir texto |
|---|---|---|---|
| `useConfirm()` | Confirmación genérica, caso a caso | Configurable (`headerVariant`, `confirmColor`, etc.) | No (salvo que pases `requireText`) |
| `useConfirmDelete()` | Preset para eliminación lógica (soft delete) | `danger`, mensaje de acción irreversible | No — un solo click en "Eliminar" |
| `useConfirmDeactivate()` | Preset "hermano" de `useConfirmDelete` para desactivaciones reversibles (ej. usuarios, salas) | `warning`, aclara que se puede reactivar después | No — un solo click en "Desactivar" |

```typescript
// useConfirmDelete — ej. real: inventario.tsx (handleEliminarProducto),
// pedido-semanal-a-bodega.tsx (handleEliminarPedidoSemanaBodega),
// gestion-academica.tsx (eliminarAsignatura, eliminarSeccion)
const confirmDelete = useConfirmDelete();
const confirmado = await confirmDelete({
  title: 'Eliminar producto',
  itemDescription: `el producto "${producto.nombre}"`,
});
if (!confirmado) return;
await softDeleteService(producto.id);

// useConfirmDeactivate — ej. real: gestion-usuarios.tsx (handleEliminar, que en
// realidad desactiva al usuario, no lo borra)
const confirmDeactivate = useConfirmDeactivate();
const confirmado = await confirmDeactivate({
  title: 'Desactivar usuario',
  itemDescription: `al usuario ${usuario.nombreCompleto}`,
});
if (!confirmado) return;
await eliminarUsuarioService(usuario.correo);

// useConfirm genérico (con requireText, solo para acciones muy sensibles que
// realmente lo ameriten — no usar por defecto)
const confirm = useConfirm();
const confirmado = await confirm('¿Eliminar este producto?', {
  confirmColor: 'danger',
  confirmText: 'Eliminar',
  requireText: 'ELIMINAR', // opcional: obliga a escribir la palabra exacta
});
```

**Regla de elección:** si la acción es un soft delete (`activo = false` sin vuelta atrás desde la UI),
usar `useConfirmDelete`. Si la acción es reversible desde la misma página (reactivar más adelante),
usar `useConfirmDeactivate`. No usar `requireText` "para estar más seguros" — el estándar actual del
sistema es confirmación de un solo click con el preset correspondiente; `requireText` queda reservado
para casos excepcionales ya evaluados con el equipo.

**Tests:** cualquier test que renderice una página que use estos hooks debe incluir el mock
correspondiente en `vi.mock('../../hooks/useToast', ...)` (`useConfirmDelete: () => vi.fn()` o
`useConfirmDeactivate: () => vi.fn()`), o el render falla con
`No "useConfirmDelete" export is defined on the "../../hooks/useToast" mock.`

## Tablas — barra de scroll horizontal y vertical siempre visible

**Norma:** todo contenedor de tabla que pueda desbordar el ancho o el alto disponible (tablas de
datos, matrices, grids con muchas columnas/filas) debe usar la clase `custom-scrollbar` (definida en
`frontend/src/index.css`) junto con `overflow-x-scroll overflow-y-scroll` — **no** `overflow-auto` ni
`overflow-x-auto` a secas. `overflow-auto` solo dibuja la barra cuando el navegador decide que hace
falta y, según el sistema operativo o el modo de scrollbar del usuario, puede quedar prácticamente
invisible; `overflow-scroll` fuerza que la barra (con el estilo delgado del sistema) esté siempre
presente y visible, para que el usuario sepa de entrada que puede desplazarse — esto es crítico en
monitores angostos donde una tabla ancha (ej. matriz de roles con muchas columnas) corta contenido a
la derecha sin dejar pista visual de que hay más.

```tsx
<div className="overflow-x-scroll overflow-y-scroll custom-scrollbar max-h-[calc(100vh-300px)] min-h-[300px] rounded-xl">
  <table className="w-full min-w-max">
    <thead>
      <tr className="bg-default-50 dark:bg-default-100/5 border-b border-divider">
        {/* Columna fija (ej. nombre de fila): sticky en ambos ejes si además hay scroll horizontal */}
        <th className="sticky left-0 top-0 z-30 bg-default-50 dark:bg-content1 px-5 py-3 border-r border-b border-divider shadow-sm">
          Columna
        </th>
        <th className="sticky top-0 z-20 bg-default-50 dark:bg-content1 px-4 py-3 border-b border-divider shadow-sm">
          Otra columna
        </th>
      </tr>
    </thead>
    <tbody>{/* filas */}</tbody>
  </table>
</div>
```

Reglas:
- El contenedor scrolleable acota su alto con `max-h-[...]` (ej. `max-h-[calc(100vh-300px)]`) para que
  el scroll quede contenido dentro de la tarjeta/card, no en la página completa — si no, la cabecera
  de la tabla desaparece de la vista al hacer scroll de la página.
- La fila de cabecera (`<thead><tr>` y sus `<th>`) usa `sticky top-0` con **fondo sólido explícito**
  (`bg-default-50 dark:bg-content1`) y `shadow-sm`, para que el nombre de cada columna se mantenga
  visible mientras se scrollea verticalmente. El `th` sticky necesita su propio color de fondo — el
  fondo del `<tr>` no cubre el contenido que pasa por debajo una vez que el `th` queda "pegado".
- Si además hay una primera columna fija (ej. nombre de fila/módulo), usa `sticky left-0`; la celda
  de la esquina superior-izquierda (fija en ambos ejes) necesita el `z-index` más alto de la tabla
  para quedar por encima tanto de las filas como de las columnas que pasan por debajo.
- Tablas HeroUI (`<Table>`) siguen el mismo criterio con `classNames.th: "sticky top-0 z-20 ..."` en
  vez de `<th>` manual.
- Referencia real: `frontend/src/pages/gestion-usuarios.tsx` (tabla de usuarios y matriz de
  Módulos × Roles en la pestaña "Roles y Permisos").

## Modales — tamaño máximo 75% de pantalla y barra de scroll vertical (aplica a TODOS los modales)

**Norma:** todo `<Modal>` del sistema, sin excepción, debe limitarse al 75% del alto de pantalla
(`max-h-[75vh]`) y su contenido scrolleable debe usar siempre la barra vertical estilizada del
sistema (`custom-scrollbar` + `overflow-y-scroll`, no `overflow-y-auto`) — igual criterio de "barra
siempre visible" que en la sección de tablas de arriba. Nunca dejar que un modal crezca libremente
fuera del viewport en pantallas chicas.

**La barra de scroll tiene que abarcar el modal completo** (header + body + footer juntos), no
solo el `ModalBody`. Poner `overflow-y-scroll` + `custom-scrollbar` únicamente en `<ModalBody>` dejaba
el header fuera del área scrolleable, con una barra corta que no cubría el modal entero (se veía como
si la barra "no llegara" a las esquinas superior e inferior del modal).

**No poner `overflow-y-scroll` y el redondeo de esquinas (`rounded-*`) en el mismo elemento.** El
scroll no va en `classNames.base` del `<Modal>` (que solo debe encargarse de redondear y recortar con
`overflow-hidden`) ni en `<ModalBody>` — va en un `div` interno que envuelve *todo* el contenido
(`ModalHeader` + `ModalBody` + `ModalFooter`). Si el redondeo y el `overflow-y-scroll` quedan en el
mismo elemento, Chromium no clipea correctamente las puntas de la barra nativa contra la esquina
redondeada, dejando un pequeño resto cuadrado visible en la esquina — separar ambas responsabilidades
(el `base` redondea/recorta, el `div` interno scrollea sin su propio `rounded-*`) evita ese artefacto.

```tsx
<Modal
  isOpen={isOpen}
  onOpenChange={onOpenChange}
  isDismissable={false}
  size="3xl"
  scrollBehavior="normal"
  radius="lg"
  backdrop="blur"
  classNames={{
    base: 'rounded-2xl overflow-hidden max-h-[75vh]',
    closeButton: 'hover:bg-default-100 cursor-pointer',
  }}
>
  <ModalContent>
    {(onClose) => (
      // El scroll vive en este div interno (no en `base`, que solo redondea/clipea):
      // el borde redondeado de `base` con overflow-hidden recorta las puntas del
      // scrollbar nativo que Chromium no clipea correctamente cuando el redondeo
      // y el overflow-y-scroll están en el mismo elemento.
      <div className="max-h-[75vh] overflow-y-scroll custom-scrollbar">
        <ModalHeader>Título del modal</ModalHeader>
        <ModalBody>
          {/* contenido */}
        </ModalBody>
        <ModalFooter>...</ModalFooter>
      </div>
    )}
  </ModalContent>
</Modal>
```

Este es el mismo patrón usado en `frontend/src/pages/pedido-semanal-a-bodega.tsx` (modal "Detalle de
Pedido Semanal") y en `frontend/src/components/modals/GestionCategoriasModal.tsx` — son la referencia
real a seguir al escribir un modal nuevo.

Para modales con banner de color como bloque visual propio en vez de `<ModalHeader>` (ej. "¡Órdenes
generadas!"), el banner y el resto del contenido van igual dentro del mismo `div` scrolleable que
envuelve todo el modal — no hace falta el caso especial de `scrollBehavior="inside"` que antes rompía
con banners sin `<ModalHeader>` real, porque ahora el scroll nunca depende de `<ModalBody>`.

El detalle completo (con el código exacto) está documentado en `frontend/CLAUDE.md`, sección
"Modales estándar (circulares)" — esa guía técnica vive en el repo junto al código y es la referencia
a seguir al escribir un modal nuevo.

## Invalidación de caché tras mutaciones (POST/PUT) — evitar que haga falta F5

**Norma:** `inventario.tsx` y `bodega-transito.tsx` mantienen caché local en memoria, independiente de
cualquier librería de fetching: `cacheRef` (caché por página para el listado con scroll infinito) más
un caché de módulo con TTL para categorías/unidades/config de abastecimiento. Ese caché **no se
invalida solo**. Cualquier POST/PUT nuevo que cambie datos ya reflejados ahí tiene que invalidarlo
explícitamente en su success handler — si no, la vista se queda mostrando el valor viejo hasta que el
usuario le da F5.

Dos patrones ya establecidos en el código, a elegir según lo que devuelva el endpoint:

- **Parche directo:** si la respuesta del endpoint ya trae el valor fresco por id (ej. stock
  resultante de cada item), parchear `productos`/`filteredProductos`/`cacheRef` directamente por id,
  sin pedir nada de nuevo al backend. Ejemplo real: `aplicarStocksProcesados` /
  `aplicarStocksProcesadosBodega`, usado por Control de Stock Masivo, Abastecimiento de Bodega y
  Abastecimiento de Proveedores.

- **Evento global + refetch:** si no hay un id claro para parchear (alta, baja, o cualquier mutación
  cuya respuesta no trae el dato fresco), disparar `window.dispatchEvent(new Event('productosActualizados'))`.
  Ambas páginas ya escuchan ese evento y, al recibirlo, limpian el caché y vuelven a pedir la página
  actual. Ejemplo real: crear/editar producto en `FormularioProducto.tsx`.

```tsx
// Tras un POST/PUT que cambia stock/datos ya visibles en el listado:
await miServicioDeGuardado(payload);
window.dispatchEvent(new Event('productosActualizados')); // dispara el refetch en ambas páginas
```

Para modales de configuración/catálogo (`GestionCategoriasModal`, `GestionUnidadesModal`,
`GestionAbastecimientoModal`) que reciben un `onRefresh` desde la página padre, ese `onRefresh` tiene
que limpiar el caché de productos **y** volver a pedir tanto el listado paginado como los filtros —
nunca alcanza con refrescar solo uno de los dos. Un `onRefresh` que solo recarga los filtros deja
cualquier dato de producto derivado de esa config ("horneado" en la caché paginada) desactualizado
hasta el F5 — este bug concreto ya se dio con `GestionAbastecimientoModal` en ambas páginas y quedó
corregido como referencia.

El detalle completo, con los tres patrones, ejemplos reales por archivo/línea y el checklist a seguir
al implementar un POST/PUT nuevo, está documentado en `frontend/CLAUDE.md`, sección 16
("Invalidación de caché tras mutaciones (POST/PUT)").
