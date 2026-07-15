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
