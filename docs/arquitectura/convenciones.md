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

### Páginas corregidas para cumplir esta norma

Se les quitó `container mx-auto` del wrapper raíz (había sido agregado por error en un cambio previo):

- `frontend/src/pages/pedido-semanal-a-bodega.tsx`
- `frontend/src/pages/inventario.tsx`
- `frontend/src/pages/admin-sistema.tsx`
- `frontend/src/pages/historico-pedidos.tsx`

### Páginas pendientes de corregir (aún usan `container`/`max-w-*` en el wrapper raíz)

- `frontend/src/pages/dashboard.tsx`
- `frontend/src/pages/solicitud.tsx`
- `frontend/src/pages/gestion-usuarios.tsx`
- `frontend/src/pages/gestion-proveedores.tsx`
- `frontend/src/pages/gestion-academica.tsx`
- `frontend/src/pages/perfil-usuario.tsx`
- `frontend/src/pages/not-found.tsx`
- `frontend/src/pages/gestion-solicitudes.tsx` (usa `max-w-7xl mx-auto`)
- `frontend/src/pages/gestion-pedidos.tsx` (usa `max-w-7xl mx-auto`)

Al tocar cualquiera de estas páginas, quitar el `container`/`max-w-*`/`mx-auto` del wrapper raíz para
alinearla con la norma.

### Excepción: layouts full-bleed con paneles fijos

Páginas tipo tablero/kanban (ej. `bodega-transito.tsx`, que usa `flex h-[calc(100vh-76px)] overflow-hidden`)
ya usan el ancho completo por diseño — no requieren cambios.
