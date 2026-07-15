# Convenciones de Frontend — KuHub

## Layout raíz de página

**Norma:** todo componente de página (`frontend/src/pages/*.tsx`) debe envolver su contenido en un
contenedor con ancho máximo centrado. Nunca dejar el contenido "suelto" ocupando el 100% del viewport.

```tsx
return (
  <div className="container mx-auto px-4 py-6 space-y-6 font-sans">
    {/* contenido de la página */}
  </div>
);
```

- **`container`** — clase de Tailwind: aplica un `max-width` por breakpoint (topa en 1536px en `2xl`).
  Es la que ya usan la mayoría de las páginas (`dashboard`, `solicitud`, `gestion-usuarios`,
  `gestion-proveedores`, `gestion-academica`, `perfil-usuario`, `not-found`) — se adopta como estándar
  por ser el patrón dominante en el código existente.
- **`mx-auto`** — centra el bloque horizontalmente. Sin esto, `container` topa el ancho pero se pega al
  borde izquierdo.
- **`px-4`** — padding lateral mínimo para que el contenido no toque el borde en pantallas angostas.

**Por qué importa:** sin este wrapper, en monitores anchos (2K, ultrawide) el contenido se estira
borde a borde — tablas, grids y cards quedan con espaciados absurdos y difíciles de leer. Con
`container mx-auto`, la página se ve consistente sin importar la resolución.

### Variante aceptada

Algunas páginas usan `max-w-7xl mx-auto` en vez de `container mx-auto` (p. ej. `gestion-solicitudes`,
`gestion-pedidos`). Ambas resuelven el mismo problema (tope de ancho + centrado); `max-w-7xl` es
ligeramente más angosto (80rem / 1280px fijo) que `container` en 2xl. No mezclar los dos patrones
dentro de una misma página. Para páginas nuevas, preferir `container mx-auto` por ser el estándar
mayoritario.

### Excepción: layouts full-bleed intencionales

Páginas tipo tablero/kanban con paneles fijos (ej. `bodega-transito.tsx`, que usa
`flex h-[calc(100vh-76px)] overflow-hidden`) pueden ocupar el ancho completo a propósito, porque su
diseño es de columnas fijas, no de contenido en flujo. Esto es una excepción deliberada, no el default.

## Páginas pendientes de corregir (no cumplen la norma)

Detectado al momento de escribir este documento — el wrapper raíz es solo
`min-h-screen bg-default-50/50 dark:bg-background ...` sin `container`/`max-w-*`, por lo que el
contenido se estira sin límite en pantallas anchas:

- `frontend/src/pages/pedido-semanal-a-bodega.tsx` (línea ~433)
- `frontend/src/pages/inventario.tsx` (línea ~1044)
- `frontend/src/pages/admin-sistema.tsx` (línea ~121)
- `frontend/src/pages/historico-pedidos.tsx` (el `motion.div` raíz no tiene `container`/`max-w-*`)

Al tocar cualquiera de estas páginas, aplicar la norma de arriba.
