# PLAN_TEST_FRONTEND — Implementación de Tests en Frontend KuHub

**Fecha de inicio:** 14/05/2026  
**Estado:** En progreso - Fase 1: LoginPage completada ✅  
**Framework:** Vitest + React Testing Library  

---

## 📋 Objetivo

Implementar cobertura de tests completa para todas las páginas del frontend KuHub, asegurando que:
- Validaciones de formulario funcionen correctamente
- Estados de carga/error se manejen apropiadamente
- Las interacciones del usuario se simulen fielmente
- Se refleje la implementación real en producción

---

## 🏗️ Estructura y Patrones de Tests

### Patrón AAA Explícito

Cada test sigue la estructura **Arrange-Act-Assert** claramente separada:

```typescript
it('test##: [descripción clara]', async () => {
  // ARRANGE - Preparar estado inicial
  const { container } = renderWithProviders(<Componente />);
  const input = container.querySelector('input[type="email"]');

  // ACT - Ejecutar la acción siendo probada
  fireEvent.change(input, { target: { value: 'test@duoc.cl' } });
  fireEvent.submit(form);

  // ASSERT - Verificar resultados esperados
  await waitFor(() => {
    expect(screen.getByText('mensaje esperado')).toBeInTheDocument();
  });
});
```

### Numeración de Tests

- Cada test se nombra: `test##: descripción`
- Formato: `test01`, `test02`, `test03`, etc.
- Numeración secuencial por página
- Facilita tracking y referencia directa

### Herramientas Principales

| Herramienta | Uso |
|---|---|
| `container.querySelector()` | Buscar elementos reales del DOM (más confiable que ARIA con HeroUI) |
| `fireEvent.change(input, { target: { value: '...' } })` | Simular cambios de valor en inputs |
| `fireEvent.submit(form)` | Simular envío de formularios |
| `userEvent.type()` | Simular tipeo de caracteres (cuando sea necesario) |
| `await waitFor(() => {...})` | Esperar cambios asincronos en el DOM |
| `screen.getByText()`, `screen.getByRole()` | Buscar elementos por contenido visible |

### Limitaciones Conocidas

- **HeroUI Input/Button**: No generan asociaciones ARIA estándar (`label[for]` + `input[id]`)
- **Solución**: Usar `container.querySelector('input[type="email"]')` en lugar de `getByLabelText`
- **Multiple elementos**: Cuando hay dos "Iniciar Sesión" (h1 + button), usar `getByRole('heading')` para el titulo

---

## ✅ PÁGINA 1: LOGIN.TSX - COMPLETADA

**Ruta:** `frontend/src/pages/login.tsx`  
**Tests:** `frontend/src/__tests__/pages/login.test.tsx`  
**Estado:** ✅ 20 tests funcionales (100%)  

### Cobertura de Tests

#### test01-test03: Validación de Campos Requeridos (3 tests)
```
test01: debe mostrar error cuando el email está vacío
test02: debe mostrar error cuando la contraseña está vacía  
test03: debe mostrar error cuando ambos campos están vacíos
```
**Validación:** `if (!email || !password)` en handleSubmit  
**Mensaje esperado:** "Por favor, complete todos los campos"

#### test04-test06: Validación de Formato de Email (3 tests)
```
test04: debe mostrar error para email sin símbolo @
test05: debe mostrar error para email sin dominio
test06: debe mostrar error para email sin punto en dominio
```
**Validación:** `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (regex en handleSubmit)  
**Mensaje esperado:** "Por favor, ingrese un email válido"

#### test07: Email Válido Aceptado (1 test)
```
test07: debe aceptar email válido con formato correcto
```
**Validación:** Regex pass → login() es llamado

#### test08-test11: Interacción con Formulario (4 tests)
```
test08: debe permitir escribir en el campo de email
test09: debe permitir escribir en el campo de contraseña
test10: debe mostrar/ocultar la contraseña
test11: debe marcar/desmarcar "Recordar sesión"
```
**Validación:** Estado React y propiedades del DOM

#### test12-test14: Login Exitoso (3 tests)
```
test12: debe llamar a login con credenciales válidas
test13: debe pasar el estado "recordar sesión" al login
test14: debe deshabilitar el formulario mientras se procesa login
```
**Validación:** Parámetros pasados a `useAuth().login(email, password, recordar)`  
**Estados:** isLoading = true → inputs/botón deshabilitados

#### test15-test17: Login Fallido (3 tests)
```
test15: debe mostrar error cuando credenciales son inválidas
test16: debe mostrar error cuando falla la conexión
test17: debe limpiar el error anterior al intentar un nuevo login
```
**Errores manejados:**
- `login() returns false` → "Email o contraseña incorrectos"
- `login() throws error` → "Error al iniciar sesión. Intente nuevamente."

#### test18: Prevención de Envío por Defecto (1 test)
```
test18: debe prevenir el envío por defecto del formulario
```
**Validación:** `e.preventDefault()` en handleSubmit

#### test19-test20: Renderizado Correcto (2 tests)
```
test19: debe renderizar el componente LoginPage correctamente
test20: debe mostrar el logo de KuHub en el formulario
```
**Elementos verificados:** inputs, button, checkbox, heading, logo

### Comandos para Ejecutar

```bash
# Todos los tests
cd frontend
npm run test:run

# Con UI interactiva
npm run test:ui

# Con cobertura
npm run test:coverage

# Watch mode (desarrollo)
npm run test
```

### Resultado

```
✅ Test Files:  1 passed (1)
✅ Tests:      20 passed (20)
⏱️  Duration:   6.72s
```

---

## 📅 PRÓXIMAS PÁGINAS A TESTEAR

### Fase 2 (Próxima)
- [ ] **dashboard.tsx** — Dashboards por rol
- [ ] **inventario.tsx** — Gestión de inventario
- [ ] **gestion-pedidos.tsx** — Gestión de pedidos

### Fase 3
- [ ] **gestion-solicitudes.tsx** — Gestión de solicitudes
- [ ] **gestion-usuarios.tsx** — Gestión de usuarios
- [ ] **gestion-roles.tsx** — Gestión de roles

### Fase 4
- [ ] Componentes reutilizables (header.tsx, sidebar.tsx, etc.)
- [ ] Modales (ComprobacionModal, CotizacionModal, etc.)
- [ ] Hooks personalizados (useToast, usePageTitle, etc.)

---

## 🔧 Configuración de Tests

**Archivo de setup:** `frontend/src/__tests__/setup.ts`
```typescript
- Cleanup automático después de cada test
- Mock de window.matchMedia
- Mock de IntersectionObserver
- Mock de ResizeObserver
```

**Configuración Vitest:** `frontend/vite.config.ts`
```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/__tests__/setup.ts',
  css: true,
}
```

**Utilidades:** `frontend/src/__tests__/test-utils.tsx`
- `render()` con providers (BrowserRouter, HeroUIProvider)
- Datos de prueba (testUsers, emailValidation, etc.)
- Respuestas esperadas (loginResponses)

---

## 📊 Métricas Actuales

| Métrica | Valor |
|---|---|
| **Páginas testeadas** | 1/16 (6%) |
| **Tests implementados** | 20/? |
| **Cobertura de login.tsx** | 100% (validaciones + flujos) |
| **Tiempo de ejecución** | 6.72s |
| **Tasa de aprobación** | 100% ✅ |

---

## 📝 Patrones Utilizados

### 1. Búsqueda de Elementos

**✅ Recomendado (HeroUI compatible):**
```typescript
const form = container.querySelector('form');
const emailInput = container.querySelector('input[type="email"]');
const submitButton = container.querySelector('button[type="submit"]');
```

**✅ Para texto visible:**
```typescript
screen.getByText('Por favor, complete todos los campos')
screen.getByRole('heading', { name: 'Iniciar Sesión' })
```

**❌ Evitar (no funciona con HeroUI):**
```typescript
// Falla con HeroUI
screen.getByPlaceholderText(/correo@duoc.cl/i)
screen.getByLabelText('Correo Electrónico')
screen.getByRole('button', { name: /Iniciar Sesión/i })
```

### 2. Simulación de Interacciones

**Cambiar valor de input:**
```typescript
fireEvent.change(input, { target: { value: 'nuevo valor' } });
```

**Enviar formulario:**
```typescript
const form = container.querySelector('form');
fireEvent.submit(form);
```

**Tipeo carácter por carácter (cuando sea necesario):**
```typescript
await userEvent.type(input, 'texto aquí');
```

### 3. Esperar Cambios Asincronos

```typescript
await waitFor(() => {
  expect(screen.getByText('mensaje')).toBeInTheDocument();
});
```

### 4. Testing de Estados

```typescript
// Estado inicial
expect(input).not.toBeDisabled();

// Después de acción
expect(input).toBeDisabled();
expect(input.value).toBe('test@duoc.cl');
```

---

## ✨ Notas Importantes

1. **AAA Pattern Obligatorio**: Todo test debe tener ARRANGE → ACT → ASSERT claramente separados
2. **Independencia**: Cada test puede ejecutarse aisladamente sin dependencias
3. **Nombres Descriptivos**: test## + descripción clara de qué se prueba
4. **Un Test, Una Cosa**: Cada test valida solo un comportamiento
5. **Mocking Consistente**: useAuth siempre mockeado en beforeEach
6. **Limpiar Estado**: mockReset() y vi.clearAllMocks() en beforeEach

---

## 🎯 Próximos Pasos

1. ✅ **Completado:** Tests para login.tsx (test01-test20)
2. **En espera:** Indicación del usuario para siguiente página
3. **Conforme se indique:** Agregar tests para cada página nueva

**Estado:** Listo para agregar tests para la próxima página cuando sea indicado.
