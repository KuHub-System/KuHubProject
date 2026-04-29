# CLAUDE.md — Frontend KuHub

Guía técnica de referencia para el frontend. Todo lo documentado aquí está extraído del código fuente real.

---

## 1. TECH STACK

| Tecnología | Versión | Rol |
|---|---|---|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.7.3 | Tipado estático |
| Vite | 6.0.11 | Build tool + dev server |
| Tailwind CSS | 4.1.11 | Estilos utilitarios |
| HeroUI | 2.8.3 | Componentes UI (basado en NextUI) |
| Framer Motion | 11.18.2 | Animaciones |
| React Router DOM | 5.3.4 | Routing (v5, no v6) |
| Axios | 1.6.7 | Cliente HTTP |
| Recharts | 2.12.0 | Gráficos |
| jsPDF | 3.0.3 | Generación de PDFs |
| jspdf-autotable | 5.0.2 | Tablas en PDFs |
| xlsx / xlsx-js-style | 0.18.5 / 1.2.0 | Exportación a Excel |
| @iconify/react | 6.0.2 | Íconos (lucide: prefijo) |
| Vitest | 4.0.3 | Testing |

**Importante**: El proyecto usa **React Router v5** (`<Switch>`, `<Route>`, `<Redirect>`), no v6.

---

## 2. ARQUITECTURA DE CARPETAS

```
frontend/src/
├── App.tsx                   # Enrutador principal con lazy loading
├── main.tsx                  # Entrada con HeroUIProvider + Router
├── index.css                 # Estilos globales + utilidades Tailwind
│
├── components/               # Componentes reutilizables
│   ├── dashboard/            # Dashboards por rol (DashboardGeneral, DashboardGestor, etc.)
│   │   └── shared/           # StatsCard, DashboardHeader, EstadoSolicitudChip
│   ├── modals/               # Modales del sistema (ComprobacionModal, CotizacionModal, etc.)
│   ├── assets/               # Logos e imágenes estáticas
│   ├── ErrorBoundary.tsx     # Captura errores global
│   ├── footer.tsx            # Footer con versión del sistema
│   ├── header.tsx            # Header dinámico con título de página y user menu
│   ├── protected-route.tsx   # Guard de rutas por permiso
│   └── sidebar.tsx           # Navegación lateral
│
├── config/
│   ├── axios.ts              # Cliente HTTP con interceptores auth
│   └── roles-config.ts       # 7 roles centralizados del sistema
│
├── contexts/
│   ├── auth-context.tsx      # Auth + JWT + permisos granulares
│   ├── PageTitleContext.tsx  # Título dinámico en el header
│   ├── permission-context.tsx
│   ├── roles-context.tsx
│   └── theme-context.tsx     # Light/Dark mode
│
├── hooks/
│   ├── useInactivityTimeout.ts  # Logout automático a los 25 min
│   ├── usePageTitle.ts          # Actualiza título en el header
│   └── useToast.ts              # Notificaciones toast + confirm
│
├── layouts/
│   ├── auth-layout.tsx       # Layout para login
│   └── main-layout.tsx       # Layout autenticado (sidebar + header + footer)
│
├── pages/                    # 16 páginas lazy-loaded
│   ├── login.tsx
│   ├── dashboard.tsx
│   ├── inventario.tsx
│   ├── gestion-pedidos.tsx
│   ├── gestion-solicitudes.tsx
│   ├── gestion-usuarios.tsx
│   ├── gestion-roles.tsx
│   ├── gestion-recetas.tsx
│   ├── gestion-proveedores.tsx
│   ├── gestion-academica.tsx
│   ├── solicitud.tsx
│   ├── conglomerado-pedidos.tsx
│   ├── bodega-transito.tsx
│   ├── movimientos-producto.tsx
│   ├── perfil-usuario.tsx
│   ├── admin-sistema.tsx
│   └── not-found.tsx
│
├── services/                 # 25+ servicios API tipados con DTOs
│   ├── auth-service.ts
│   ├── inventario-service.ts
│   ├── pedido-service.ts
│   ├── solicitud-service.ts
│   ├── permission-service.ts
│   ├── pdf-service.ts
│   └── ...
│
├── types/                    # Interfaces y tipos TypeScript
│   ├── auth.types.ts
│   ├── permissions.types.ts
│   ├── usuario.types.ts
│   ├── inventario.types.ts
│   ├── pedido.types.ts
│   ├── solicitud.types.ts
│   └── ...
│
└── utils/
    ├── format-numbers.ts
    ├── logger.ts
    └── notifications.tsx     # Sistema de notificaciones modal (reemplaza alert/confirm)
```

---

## 3. SISTEMA DE DISEÑO

### Paleta de colores (HeroUI theme)

```javascript
// tailwind.config.js — tema light oficial
primary:   "#FFB800"   // Amarillo Duoc
secondary: "#1A1A1A"   // Negro Duoc
background:"#FFFFFF"
content1:  "#f4f4f5"   // Gris claro (paneles)
success:   "#17c964"
warning:   "#f5a524"
danger:    "#f31260"
```

**Colores por escuela** (usar cuando el contexto lo requiera):
```javascript
gastronomia:     { DEFAULT: "#FF585D", secondary: "#FF808B" }  // proyecto actual
administracion:  { DEFAULT: "#D50032", secondary: "#DF4661" }
informatica:     { DEFAULT: "#43B02A", secondary: "#A1D884" }
ingenieria:      { DEFAULT: "#5BC2E7", secondary: "#99D6EA" }
salud:           { DEFAULT: "#00A499", secondary: "#2AD2C9" }
diseno:          { DEFAULT: "#FF585D", secondary: "#FF808B" }
comunicaciones:  { DEFAULT: "#E87722", secondary: "#ECA154" }
construccion:    { DEFAULT: "#C4D600", secondary: "#DBE442" }
turismo:         { DEFAULT: "#AC4FC6", secondary: "#C98BDB" }
```

### Tipografía

Fuente: **Roboto** (300, 400, 500, 700) cargada desde Google Fonts.

| Uso | Clase Tailwind |
|---|---|
| Título de página | `text-xl font-bold text-secondary` |
| Subtítulo header | `text-xs text-default-500` |
| Valor KPI | `text-3xl font-bold text-secondary` |
| Label estadística | `text-sm font-semibold text-default-500 uppercase` |
| Texto auxiliar | `text-xs text-default-400` |
| Texto tabla header | `text-default-600` |

### Espaciados estándar

| Uso | Clase Tailwind |
|---|---|
| Padding header/contenido | `px-6 py-3` / `p-4 md:p-6` |
| Gap grids principales | `gap-4` / `gap-6` |
| Espacio entre secciones | `space-y-6` |
| Padding card body | `p-4` |
| Padding modales | `px-8 pt-8 pb-6` |

### Borders y sombras

| Tipo | Clase |
|---|---|
| Sombra card estándar | `shadow-sm` |
| Sombra login | `shadow-xl` |
| Sombra custom | `shadow-custom` (definida en index.css: `0 2px 10px rgba(0,0,0,0.05)`) |
| Borde acento card | `border-l-4 border-primary` / `border-t-4 border-primary` |
| Borde separador | `border-b border-default-200` |

### Modales estándar (circulares)

**Todos los modales deben usar bordes redondeados (puntas circulares).** Patrón obligatorio:

```tsx
<Modal 
  isOpen={isOpen} 
  onOpenChange={onOpenChange} 
  size="lg"                              // sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl
  backdrop="blur"                         // blur, opaque (con classNames), transparent
  radius="lg"                             // Propiedad de HeroUI para border-radius
  classNames={{ 
    base: 'rounded-2xl'                  // Puntas circulares (obligatorio)
  }}
>
  <ModalContent>
    {/* contenido */}
  </ModalContent>
</Modal>
```

**Variantes avanzadas:**

| Caso | Config |
|---|---|
| Modal estándar | `radius="lg" classNames={{ base: 'rounded-2xl' }}` |
| Modal con scroll | `scrollBehavior="inside" radius="lg" classNames={{ base: 'rounded-2xl', body: 'min-h-[400px]' }}` |
| Modal con backdrop opaco | `backdrop="opaque" classNames={{ backdrop: "bg-background/50 backdrop-blur-sm", base: "bg-background dark:bg-content1 shadow-xl border border-default-200 dark:border-default-100 rounded-2xl" }}` |

**Nota**: El `radius="lg"` es la propiedad de HeroUI, el `rounded-2xl` es Tailwind como fallback visual.

### Clases de utilidad personalizadas (index.css)

```css
@utility scrollbar-hidden    /* Oculta scrollbar en todos los browsers */
@utility transition-all-200  /* transition: all 0.2s ease */
@utility shadow-custom       /* box-shadow: 0 2px 10px rgba(0,0,0,0.05) */
```

---

## 4. PATRONES DE COMPONENTES

### Template estándar de componente funcional

```typescript
import React from 'react';

interface MiComponenteProps {
  titulo: string;
  valor: number;
  onAccion?: () => void;
}

const MiComponente: React.FC<MiComponenteProps> = ({ titulo, valor, onAccion }) => {
  const [estado, setEstado] = React.useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* contenido */}
    </div>
  );
};

export default MiComponente;
```

### Convenciones de naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes | PascalCase | `DashboardHeader.tsx` |
| Hooks | camelCase con `use` | `useToast.ts` |
| Servicios | camelCase con `-service` | `inventario-service.ts` |
| Tipos | PascalCase con `I` prefix | `IUser`, `IAuthContext` |
| Types DTOs | PascalCase con `DTO` suffix | `BackendInventarioDTO` |
| Páginas | kebab-case | `gestion-pedidos.tsx` |
| Contextos | kebab-case con `-context` | `auth-context.tsx` |

### Tipado obligatorio

- **Siempre tipar** props con interfaces explícitas — nunca `any`
- **Tipar retornos** de funciones async: `Promise<IUser | null>`
- **State inicial** con tipo genérico: `useState<IInventario[]>([])`
- **Eventos**: `React.FormEvent`, `React.ChangeEvent<HTMLInputElement>`

### Interfaces clave en src/types/

```typescript
// auth.types.ts
interface IAuthContext {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, recordarSesion?: boolean) => Promise<boolean>;
  logout: () => void;
  canAccessPage: (pageId: string) => boolean;
  userRole: IRole | null;
}

// permissions.types.ts
type ModuleKey = 'DASHBOARD' | 'INVENTARIO' | 'GESTION_PEDIDOS' | 'GESTION_SOLICITUDES' | ...;

interface ModulePermissions {
  puedeLeer: boolean;
  puedeCrear: boolean;
  puedeActualizar: boolean;
  puedeEliminar: boolean;
}

interface PermisoMatrizDTO {
  idRol: number;
  nombreRol: string;
  codigoModulo: string;
  nivelAcceso: 'ESCRITURA' | 'LECTURA' | 'SIN_ACCESO';
  puedeLeer: boolean;
  puedeCrear: boolean;
  puedeActualizar: boolean;
  puedeEliminar: boolean;
}
```

### Tablas — Convención de truncado y alineación

**Todas las tablas en el sistema deben seguir estos patrones:**

#### Estructura base HTML

```tsx
<div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
  <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
    <thead className="bg-default-100 dark:bg-default-50">
      <tr>
        <th className="text-center py-2 px-3 font-medium w-[290px]">Nombre Columna</th>
        {/* Más columnas */}
      </tr>
    </thead>
    <tbody>
      {/* Filas */}
    </tbody>
  </table>
</div>
```

#### Celdas con contenido truncado (nombre, descripción)

Usar `Tooltip` + `truncate` + `whitespace-nowrap` para mostrar ellipsis (...) cuando el contenido es muy largo:

```tsx
<td className="py-2 px-3 text-center">
  <Tooltip content={producto.nombre} color="foreground" className="text-xs">
    <span className="truncate block whitespace-nowrap">
      {producto.nombre}
    </span>
  </Tooltip>
</td>
```

**Comportamiento:**
- El contenido se trunca con ellipsis si es muy largo (`truncate whitespace-nowrap`)
- Al pasar el cursor, aparece un tooltip con el contenido completo
- El texto siempre está centrado (`text-center`)

#### Celdas simples (números, códigos, estados)

Para contenido que siempre cabe (códigos cortos, números):

```tsx
<td className="py-2 px-3 text-center">
  {producto.codigo}
</td>
```

#### Reglas obligatorias

| Aspecto | Regla |
|---|---|
| **Alineación** | Todas las celdas centradas: `text-center` en header y body |
| **Header (th)** | `text-center py-2 px-3 font-medium` |
| **Body (td)** | `py-2 px-3 text-center` |
| **Contenido largo** | Usar `Tooltip` + `truncate` + `whitespace-nowrap` |
| **Contenido corto** | Sin truncado, texto directo |
| **Hover** | Fila completa con `hover:bg-default-100 dark:hover:bg-default-100/30` en `<tr>` |
| **Celdas deshabilitadas** | Aplicar `opacity-60 bg-default-50/30 dark:bg-default-100/10` a la fila |

#### Ejemplo completo de fila con truncado y acciones

```tsx
<tr className="border-t border-default-100 hover:bg-default-50 dark:hover:bg-default-100/20">
  <td className="py-2 px-3 text-center">
    <Tooltip content={producto.nombreProducto} color="foreground" className="text-xs">
      <span className="truncate block whitespace-nowrap">
        {producto.nombreProducto}
      </span>
    </Tooltip>
  </td>
  
  <td className="py-2 px-3 text-center text-xs text-default-500">
    <Tooltip content={producto.codProducto || '—'} color="foreground" className="text-xs">
      <span className="truncate block whitespace-nowrap">
        {producto.codProducto || '—'}
      </span>
    </Tooltip>
  </td>
  
  <td className="py-2 px-3 text-center">
    {/* Contenido editable o simple */}
  </td>
  
  <td className="py-2 px-3 text-center">
    <Tooltip content="Editar">
      <Button isIconOnly size="sm" variant="light">
        <Icon icon="lucide:more-vertical" width={16} />
      </Button>
    </Tooltip>
  </td>
</tr>
```

---

## 5. COMANDOS Y SCRIPTS

```bash
npm run dev       # Inicia servidor de desarrollo (Vite, puerto 5173)
npm run build     # Compila TypeScript + genera dist/ optimizado
npm run preview   # Sirve el build local para verificar antes de deploy
npm run lint      # ESLint sobre src/
npm run test      # Vitest en modo watch
npm run test:ui   # Vitest con interfaz gráfica
```

---

## 6. REGLAS PARA CAMBIOS DE DISEÑO (/design)

### PERMITIDO

- Ajustar espaciados con clases Tailwind existentes (`p-`, `m-`, `gap-`, `space-y-`)
- Mejorar contraste manteniendo la paleta de colores oficial (`primary: #FFB800`, `secondary: #1A1A1A`)
- Agregar micro-animaciones con Framer Motion sutiles (`opacity`, `y`, `scale`) con `duration` ≤ 0.4s
- Optimizar layouts responsive con breakpoints Tailwind (`sm:`, `md:`, `lg:`, `xl:`)
- Usar componentes HeroUI ya instalados (ver sección 9)
- Ajustar tamaños de texto dentro de la escala Tailwind existente

### PROHIBIDO

- Modificar lógica de negocio, validaciones o llamadas a la API en los servicios
- Cambiar la paleta de colores o el tema visual sin aprobación previa
- Usar estilos `style={{ }}` inline — solo clases Tailwind
- Introducir nuevas dependencias npm o librerías de UI externas a HeroUI
- Usar `any` en TypeScript bajo ninguna circunstancia
- Alterar la estructura de carpetas o la organización de `src/`
- Modificar interfaces, tipos de entidades o contratos de datos de la API
- Cambiar la configuración de rutas o la lógica de navegación principal
- Eliminar propiedades requeridas en componentes existentes
- Ignorar errores de tipado o saltarse reglas de linting

---

## 7. BREAKPOINTS RESPONSIVE

Tailwind estándar (sin custom breakpoints):

| Breakpoint | Ancho mínimo | Uso típico en el proyecto |
|---|---|---|
| (base) | 0px | Mobile first |
| `sm:` | 640px | Ajustes menores de texto |
| `md:` | 768px | Cambios layout (sidebar visible, padding mayor) |
| `lg:` | 1024px | Grids de 4 columnas |
| `xl:` | 1280px | Dashboards expandidos |
| `2xl:` | 1536px | Monitores grandes |

Patrón de grid más usado:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
```

---

## 8. ESTADOS VISUALES

### Loading

```tsx
if (loading) {
  return (
    <div className="flex justify-center py-20">
      <Spinner size="lg" color="warning" />
    </div>
  );
}
```

### Error

```tsx
if (error || !data) {
  return (
    <div className="text-center py-20 text-default-400">
      Error al cargar los datos. Intente nuevamente.
    </div>
  );
}
```

### Empty state

```tsx
if (data.length === 0) {
  return (
    <div className="text-center py-10 text-default-400">
      <Icon icon="lucide:inbox" width={40} className="mx-auto mb-2" />
      <p>No hay registros disponibles.</p>
    </div>
  );
}
```

### Patrón completo de carga de datos

```typescript
const [data, setData] = React.useState<MiTipo | null>(null);
const [loading, setLoading] = React.useState(true);
const [error, setError] = React.useState(false);

React.useEffect(() => {
  miServicio()
    .then(setData)
    .catch(() => setError(true))
    .finally(() => setLoading(false));
}, []);

if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" color="warning" /></div>;
if (error || !data) return <div className="text-center py-20 text-default-400">Error al cargar los datos.</div>;

return (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
    {/* contenido */}
  </motion.div>
);
```

### Animación de entrada estándar

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
```

---

## 9. COMPONENTES HEROUI DISPONIBLES

Todos importados desde `@heroui/react`:

| Categoría | Componentes |
|---|---|
| **Layout** | `Card`, `CardBody`, `CardHeader`, `CardFooter`, `Divider` |
| **Botones** | `Button` |
| **Dropdown** | `Dropdown`, `DropdownTrigger`, `DropdownMenu`, `DropdownItem` |
| **Formularios** | `Input`, `Select`, `SelectItem`, `Checkbox` |
| **Tablas** | `Table`, `TableHeader`, `TableColumn`, `TableBody`, `TableRow`, `TableCell` |
| **Feedback** | `Spinner`, `Chip`, `Alert` |
| **Modales** | `Modal`, `ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter`, `useDisclosure` |
| **Navegación** | `Tabs`, `Tab` |
| **Usuario** | `Avatar` |
| **Proveedor** | `HeroUIProvider` (en `main.tsx`) |
| **Hooks** | `useTheme` (de `@heroui/use-theme`) |

---

## 10. HOOKS DISPONIBLES

### useToast

```typescript
const toast = useToast();

toast.success('Producto guardado correctamente');
toast.error('No se pudo conectar con el servidor');
toast.warning('Stock por debajo del mínimo', { duration: 8000 });
toast.info('Sincronizando datos...');

// Confirmación modal (reemplaza window.confirm)
const { useConfirm } = useToast();
const confirmed = await useConfirm()('¿Eliminar este producto?', {
  confirmColor: 'danger',
  confirmText: 'Eliminar'
});
```

### usePageTitle

```typescript
// Al inicio del componente de la página
usePageTitle('Inventario', 'Gestión de productos', 'lucide:package');
// Actualiza automáticamente el header con título, subtítulo e ícono
```

### useInactivityTimeout

```typescript
useInactivityTimeout(
  () => logout(),         // Acción al timeout (25 min)
  isAuthenticated,        // Solo activo si hay sesión
  25 * 60 * 1000,         // Timeout en ms
  () => showWarning(),    // Advertencia previa (20 min)
  20 * 60 * 1000
);
```

---

## 11. SERVICIOS — PATRONES DE USO

### Cliente HTTP (axios.ts)

```typescript
import api from '../config/axios';

// El interceptor agrega automáticamente:
// - Authorization: Bearer <token>
// - Manejo de 401 con refresh automático
// - Evento 'api-request' para resetear inactividad
```

### Patrón de servicio tipado

```typescript
// services/mi-servicio.ts
import api from '../config/axios';
import type { IMiEntidad } from '../types/mi-entidad.types';

export const obtenerTodosService = async (): Promise<IMiEntidad[]> => {
  const response = await api.get<IMiEntidad[]>('/mi-entidad');
  return response.data;
};

export const crearService = async (datos: Partial<IMiEntidad>): Promise<IMiEntidad> => {
  const response = await api.post<IMiEntidad>('/mi-entidad', datos);
  return response.data;
};
```

### URL de API

```typescript
// Detecta entorno automáticamente
const API_URL = import.meta.env.VITE_API_URL ||
  (isLocal ? 'http://localhost:8080/api/v1' : '/api/v1');
```

---

## 12. SISTEMA DE PERMISOS

### Roles del sistema (7 roles)

| ID | Nombre | Módulos principales |
|---|---|---|
| 1 | Administrador | Todos los módulos |
| 2 | Co-Administrador | Todos excepto admin-sistema, gestion-roles, gestion-usuarios |
| 3 | Gestor de Pedidos | dashboard, gestion-pedidos, gestion-solicitudes, conglomerado-pedidos |
| 4 | Profesor a Cargo | dashboard, solicitud, gestion-recetas |
| 5 | Docente | dashboard, solicitud, gestion-recetas |
| 6 | Encargado de Bodega | dashboard, inventario, movimientos, bodega-transito |
| 7 | Asistente de Bodega | dashboard, bodega-transito |

### ProtectedRoute — uso

```tsx
// App.tsx
<ProtectedRoute path="/inventario" pageId="inventario">
  <MainLayout><InventarioPage /></MainLayout>
</ProtectedRoute>

// El pageId mapea a ModuleKey via PAGE_TO_MODULE en permissions.types.ts
```

### Verificar permisos en componente

```typescript
const { canAccessPage, hasSpecificPermission } = useAuth();
const { getModulePermissions } = usePermission();

const permisos = getModulePermissions('INVENTARIO');
if (permisos.puedeCrear) { /* mostrar botón agregar */ }
```

---

## 13. ANTI-PATTERNS A EVITAR

- **No `style={{}}`** inline — usar clases Tailwind siempre
- **No `any`** — crear interfaces TypeScript para todos los datos
- **No duplicar estilos** — crear componentes reutilizables o usar clases Tailwind
- **No hardcodear URLs** de API — usar `import.meta.env.VITE_API_URL`
- **No `window.alert/confirm`** — usar `useToast()` con `useConfirm()`
- **No importar directamente** íconos SVG — usar `@iconify/react` con `lucide:` prefijo
- **No React Router v6** — este proyecto usa v5 (`<Switch>`, `<Route>`, `<Redirect>`)
- **No acceder a `localStorage`** directamente — usar `storage-service.ts`
- **No saltarse el typing** en hooks (`useState`, `useRef`, `useCallback`)

---

## 14. CREACIÓN DE NUEVAS PÁGINAS — CHECKLIST COMPLETO

Cuando se crea una nueva página, **SIEMPRE** completar estos 6 pasos en orden:

### Paso 1: Crear el archivo de la página

```bash
# frontend/src/pages/mi-nueva-page.tsx
import React from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../contexts/auth-context';
import { useModulePermission } from '../contexts/permission-context';

const MiNuevaPage: React.FC = () => {
  usePageTitle('Mi Nueva Página', 'Descripción breve', 'lucide:icon-name');
  const { user } = useAuth();
  const { canCreate, canUpdate, canDelete } = useModulePermission('MI_NUEVO_MODULO');

  return (
    <div className="min-h-screen bg-default-50/50 dark:bg-background pb-20">
      {/* contenido */}
    </div>
  );
};

export default MiNuevaPage;
```

### Paso 2: Agregar import lazy en App.tsx

```typescript
// Después de otros imports de páginas
const MiNuevaPage = lazy(() => import('./pages/mi-nueva-page'));
```

### Paso 3: Agregar ruta protegida en App.tsx

```tsx
<ProtectedRoute path="/mi-nueva-page" pageId="mi-nueva-page">
  <MainLayout>
    <MiNuevaPage />
  </MainLayout>
</ProtectedRoute>
```

### Paso 4: Agregar entrada en SmartRedirect (App.tsx)

```typescript
const rutasPorPermiso: { [key: string]: string } = {
  // ... otras rutas
  'mi-nueva-page': '/mi-nueva-page',
};
```

### Paso 5: Agregar item en sidebar.tsx

```typescript
const menuCategories: MenuCategory[] = [
  {
    title: 'Mi Categoría',
    items: [
      { 
        title: 'Mi Nueva Página', 
        path: '/mi-nueva-page', 
        icon: 'lucide:icon-name', 
        pageId: 'mi-nueva-page' 
      },
    ]
  }
];
```

### Paso 6: Registrar módulo en gestion-roles.tsx

```typescript
const modulosDisponibles = [
  // ... otros módulos
  'MI_NUEVO_MODULO',
];
```

**Nota**: El `pageId` debe coincidir en todos los archivos. Usa kebab-case para la ruta y SCREAMING_SNAKE_CASE para el módulo de permisos.

---

## 15. VITE — CHUNKS DE BUILD

```typescript
// vite.config.ts — chunks manuales para optimizar carga
manualChunks: {
  'react-vendor':  ['react', 'react-dom', 'react-router-dom'],
  'ui-vendor':     ['@heroui/react', '@heroui/use-theme'],
  'chart-vendor':  ['recharts'],
  'utils-vendor':  ['axios', 'framer-motion'],
}
```

Al agregar dependencias grandes, evaluar si corresponde un chunk nuevo.
