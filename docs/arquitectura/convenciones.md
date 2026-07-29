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
