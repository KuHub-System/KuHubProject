# 📋 Guía para Reemplazar alert() y confirm() con Notificaciones HTML

## ✅ Sistema Implementado

Se ha creado un sistema de notificaciones visuales que reemplaza los `alert()` y `confirm()` de JavaScript con componentes HTML/React modernos.

## 🔧 Componentes Creados

### 1. `NotificationProvider`
- Proveedor de contexto que envuelve la aplicación
- Maneja el estado de notificaciones y confirmaciones
- Ya está integrado en `App.tsx`

### 2. `useToast` Hook
- Hook para mostrar notificaciones simples
- Reemplaza `alert()`

### 3. `useConfirm` Hook
- Hook para mostrar confirmaciones
- Reemplaza `confirm()`

## 📝 Cómo Usar

### Reemplazar `alert()` con Toasts

**Antes:**
```typescript
alert('Mensaje de éxito');
alert('⚠️ Mensaje de advertencia');
alert('❌ Mensaje de error');
```

**Después:**
```typescript
import { useToast } from '../hooks/useToast';

const MyComponent = () => {
  const toast = useToast();

  // Éxito
  toast.success('Mensaje de éxito');
  
  // Advertencia
  toast.warning('Mensaje de advertencia');
  
  // Error
  toast.error('Mensaje de error');
  
  // Información
  toast.info('Mensaje informativo');
  
  // Con título personalizado
  toast.success('Operación completada', 'Éxito');
};
```

### Reemplazar `confirm()` con Confirmaciones

**Antes:**
```typescript
if (confirm('¿Está seguro de eliminar este elemento?')) {
  // Acción
}
```

**Después:**
```typescript
import { useConfirm } from '../hooks/useConfirm';

const MyComponent = () => {
  const confirm = useConfirm();

  const handleDelete = async () => {
    const result = await confirm('¿Está seguro de eliminar este elemento?');
    if (result) {
      // Acción de eliminación
    }
  };
  
  // Con opciones personalizadas
  const handleCustomConfirm = async () => {
    const result = await confirm('¿Está seguro?', {
      title: 'Confirmar eliminación',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      confirmColor: 'danger',
    });
    if (result) {
      // Acción
    }
  };
};
```

## 🔄 Archivos que Necesitan Actualización

### Archivos con `alert()` (84 ocurrencias):
1. `src/pages/solicitud.tsx` ✅ (Ya actualizado)
2. `src/pages/perfil-usuario.tsx` - 2 alertas
3. `src/pages/movimientos-producto.tsx` - 2 alertas
4. `src/pages/inventario.tsx` - 8 alertas
5. `src/pages/gestion-roles.tsx` - 0 alertas (solo confirm)
6. `src/pages/gestion-solicitudes.tsx` - 6 alertas
7. `src/pages/gestion-usuarios.tsx` - 8 alertas
8. `src/pages/gestion-pedidos.tsx` - 3 alertas
9. `src/pages/dashboard.tsx` - 17 alertas
10. `src/pages/gestion-recetas.tsx` - 7 alertas
11. `src/pages/conglomerado-pedidos.tsx` - 3 alertas

### Archivos con `confirm()` (10 ocurrencias):
1. `src/pages/gestion-roles.tsx` - 2 confirms
2. `src/pages/gestion-solicitudes.tsx` - 2 confirms
3. `src/pages/gestion-usuarios.tsx` - 1 confirm
4. `src/pages/dashboard.tsx` - 4 confirms
5. `src/pages/conglomerado-pedidos.tsx` - 1 confirm

## 📋 Checklist de Migración

Para cada archivo:

1. ✅ Importar los hooks necesarios:
   ```typescript
   import { useToast } from '../hooks/useToast';
   import { useConfirm } from '../hooks/useConfirm';
   import { logger } from '../utils/logger';
   ```

2. ✅ Agregar hooks en el componente:
   ```typescript
   const toast = useToast();
   const confirm = useConfirm();
   ```

3. ✅ Reemplazar `alert()`:
   - `alert('mensaje')` → `toast.info('mensaje')`
   - `alert('✅ éxito')` → `toast.success('éxito')`
   - `alert('❌ error')` → `toast.error('error')`
   - `alert('⚠️ advertencia')` → `toast.warning('advertencia')`

4. ✅ Reemplazar `confirm()`:
   ```typescript
   // Antes
   if (confirm('¿Está seguro?')) {
     // acción
   }
   
   // Después
   const result = await confirm('¿Está seguro?');
   if (result) {
     // acción
   }
   ```

5. ✅ Reemplazar `console.log` con `logger.log`:
   - `console.log()` → `logger.log()`
   - `console.error()` → `logger.error()`
   - `console.warn()` → `logger.warn()`

## 🎨 Personalización

### Toasts con Duración Personalizada
```typescript
toast.show({
  message: 'Mensaje personalizado',
  title: 'Título',
  type: 'success',
  duration: 5000, // 5 segundos (0 = no se cierra automáticamente)
});
```

### Confirmaciones Personalizadas
```typescript
const result = await confirm('¿Está seguro?', {
  title: 'Título personalizado',
  confirmText: 'Aceptar',
  cancelText: 'Cancelar',
  confirmColor: 'danger', // 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
});
```

## ⚠️ Notas Importantes

1. **Los toasts de error no se cierran automáticamente** por defecto (duration: 0)
2. **Los confirm deben ser async/await** porque retornan una Promise
3. **El logger solo funciona en desarrollo** - los logs no aparecen en producción
4. **Los modales son accesibles** y tienen buen soporte para teclado

## 🚀 Beneficios

- ✅ Mejor UX - Notificaciones visuales modernas
- ✅ Accesibilidad - Soporte para lectores de pantalla
- ✅ Personalización - Fácil de personalizar colores, textos, etc.
- ✅ Consistencia - Mismo estilo en toda la aplicación
- ✅ No bloqueante - Los toasts no bloquean la interacción
- ✅ Responsive - Funciona bien en móviles

