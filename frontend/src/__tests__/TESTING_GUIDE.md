# Guía de Testing - Frontend KuHub

## 📋 Resumen de lo implementado

Se ha creado una estructura completa de testing para el frontend usando **Vitest** y **React Testing Library**.

### Archivos creados:

```
frontend/src/
├── __tests__/
│   ├── pages/
│   │   └── login.test.tsx          ✅ Tests para login (38 casos de prueba)
│   ├── setup.ts                     ✅ Configuración global de Vitest
│   ├── test-utils.tsx              ✅ Utilidades reutilizables
│   └── README.md                    ✅ Documentación completa
```

### Archivo modificado:

- `frontend/vite.config.ts` → Actualizado para usar `src/__tests__/setup.ts`

---

## 🚀 Cómo ejecutar los tests

### Modo desarrollo (watch)
```bash
cd frontend
npm run test
```
Los tests se ejecutarán nuevamente cada vez que modifiques un archivo.

### Ejecución única
```bash
npm run test:run
```
Ideal para CI/CD o validación rápida.

### Interfaz gráfica
```bash
npm run test:ui
```
Abre un navegador con una interfaz visual donde puedes ver y ejecutar tests interactivamente.

### Cobertura de código
```bash
npm run test:coverage
```
Genera un reporte HTML de cobertura de tests.

---

## 📝 Casos de prueba en login.test.tsx - 20 Tests

### ✅ test01-test03: Validación de campos requeridos
- **test01**: Email vacío → mostrar error
- **test02**: Contraseña vacía → mostrar error
- **test03**: Ambos campos vacíos → mostrar error

### ✅ test04-test07: Validación de formato de email
- **test04**: Email sin símbolo @ → mostrar error
- **test05**: Email sin dominio → mostrar error
- **test06**: Email sin punto en dominio → mostrar error
- **test07**: Email válido → aceptar formato

### ✅ test08-test11: Interacción con el formulario
- **test08**: Escribir en campo de email
- **test09**: Escribir en campo de contraseña
- **test10**: Mostrar/ocultar contraseña
- **test11**: Marcar/desmarcar "Recordar sesión"

### ✅ test12-test14: Respuesta a login exitoso
- **test12**: Llamar a login con credenciales válidas
- **test13**: Pasar estado "recordar sesión" al login
- **test14**: Deshabilitar formulario durante carga

### ✅ test15-test17: Respuesta a login fallido
- **test15**: Error por credenciales inválidas
- **test16**: Error por fallo de conexión
- **test17**: Limpiar errores anteriores

### ✅ test18-test20: Comportamiento adicional
- **test18**: Prevenir envío por defecto del formulario
- **test19**: Renderizar componente correctamente
- **test20**: Mostrar logo de KuHub

---

## 🛠️ Estructura de un test - Patrón AAA

Cada test sigue **explícitamente** el patrón **AAA** (Arrange-Act-Assert):

```typescript
// ============================================
// TEST 01: Email vacío - mostrar error
// ============================================
it('test01: debe mostrar error cuando el email está vacío', async () => {
  // ARRANGE - Preparar
  renderWithProviders(<LoginPage />);
  const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

  // ACT - Actuar
  fireEvent.click(submitButton);

  // ASSERT - Verificar
  await waitFor(() => {
    expect(screen.getByText(/por favor, complete todos los campos/i)).toBeInTheDocument();
  });
  expect(mockLogin).not.toHaveBeenCalled();
});
```

**Estructura obligatoria:**
1. **ARRANGE** - Preparar el estado inicial (render, mocks, búsqueda de elementos)
2. **ACT** - Ejecutar la acción siendo probada (clicks, typing, etc.)
3. **ASSERT** - Verificar los resultados esperados (expect statements)

**Nombre del test:**
- Formato: `test##: [descripción clara]`
- Ejemplo: `test01: debe mostrar error cuando el email está vacío`
- Ejemplo: `test14: debe deshabilitar el formulario mientras se procesa login`

---

## 📚 Archivos de referencia

### `src/__tests__/pages/login.test.tsx`
**Contenido**: 20 casos de prueba numerados (test01-test20)

**Estructura:**
- test01-test03: Validación de campos requeridos
- test04-test07: Validación de formato de email
- test08-test11: Interacción con el formulario
- test12-test14: Login exitoso
- test15-test17: Login fallido
- test18-test20: Comportamiento adicional

**Patrón**: Cada test usa explícitamente ARRANGE → ACT → ASSERT

**Cubre:**
- Validación de campos requeridos
- Validación de formato de email
- Interacción con inputs y botones
- Estados de carga y error
- Flujo de login exitoso y fallido
- Comportamiento del "Recordar sesión"
- Toggle de mostrar/ocultar contraseña
- Renderizado correcto del componente

### `src/__tests__/setup.ts`
**Contenido**: Configuración global para Vitest

**Incluye:**
- Cleanup automático después de cada test
- Mock de `window.matchMedia`
- Mock de `IntersectionObserver`
- Mock de `ResizeObserver`

### `src/__tests__/test-utils.tsx`
**Contenido**: Utilidades y datos de prueba reutilizables

**Proporciona:**
- Función `render()` personalizada con todos los providers
- Datos de prueba (`testUsers`, `emailValidation`, etc.)
- Respuestas esperadas de login
- Validaciones de email y contraseña

### `src/__tests__/README.md`
**Contenido**: Documentación completa de testing

**Incluye:**
- Convenciones de naming
- Guía de uso de Screen queries
- Ejemplos de assertions
- Mejores prácticas
- Links a recursos

---

## 🎯 Próximos pasos

### 1. Agregar tests para otros componentes

```bash
# Crear test para dashboard
touch frontend/src/__tests__/pages/dashboard.test.tsx

# Crear test para componentes reutilizables
touch frontend/src/__tests__/components/header.test.tsx
```

### 2. Estructura recomendada para nuevos tests

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { testUsers, emailValidation } from '../test-utils';

describe('MiComponente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // TEST 01: Descripción clara de qué prueba
  // ============================================
  it('test01: debe comportarse de cierta manera', async () => {
    // ARRANGE
    render(<MiComponente />);
    const elemento = screen.getByRole('button');

    // ACT
    fireEvent.click(elemento);

    // ASSERT
    expect(screen.getByText('resultado')).toBeInTheDocument();
  });

  // ============================================
  // TEST 02: Siguiente caso de prueba
  // ============================================
  it('test02: debe hacer algo más', async () => {
    // ARRANGE

    // ACT

    // ASSERT
  });
});
```

### 3. Ejecutar tests en CI/CD

Agrega esto a tu `.github/workflows/test.yml` (si tienes GitHub Actions):

```yaml
- name: Run tests
  run: |
    cd frontend
    npm install
    npm run test:run
    npm run test:coverage
```

---

## 💡 Consejos útiles

### Debugging de tests

```typescript
// Ver qué HTML se renderizó
screen.debug();

// Ver solo un elemento
screen.debug(elemento);

// Ver el querySelector exacto
screen.logTestingPlaygroundURL();
```

### Esperas comunes

```typescript
// Esperar a que aparezca un elemento
await screen.findByText('Texto');

// Esperar a que cambie el DOM
await waitFor(() => {
  expect(element).toHaveClass('active');
});

// Esperar tiempo específico
await new Promise(resolve => setTimeout(resolve, 1000));
```

### Mockear servicios

```typescript
vi.mock('../services/auth-service', () => ({
  loginService: vi.fn(() => Promise.resolve({ token: 'mock-token' }))
}));
```

---

## 📊 Cobertura esperada

Objetivo de cobertura por tipo:
- **Páginas críticas** (login, dashboard): 80%+
- **Componentes principales**: 70%+
- **Servicios**: 85%+
- **Utilitarios**: 75%+

Ver cobertura actual:
```bash
npm run test:coverage
# Se genera carpeta coverage/ con reporte HTML
```

---

## 🔗 Integración con Vitest

La configuración en `vite.config.ts` ya incluye:

```typescript
test: {
  globals: true,              // expect sin import
  environment: 'jsdom',       // Simula DOM del navegador
  setupFiles: './src/__tests__/setup.ts',  // Configuración inicial
  css: true,                  // Soporta CSS en tests
}
```

---

## ❓ FAQ

### ¿Por qué Vitest en lugar de Jest?

- **Más rápido**: Usa ESM nativo
- **Mejor integración**: Funciona con Vite sin configuración adicional
- **Compatible**: API casi idéntica a Jest
- **TypeScript nativo**: Sin necesidad de ts-jest

### ¿Qué es React Testing Library?

Librería que fomenta **testing desde la perspectiva del usuario**:
- En lugar de buscar IDs internos, busca por rol, texto visible, placeholder
- Evita frágiles tests que rompen con cambios internos
- Tests más realistas que reflejan cómo usa el usuario la UI

### ¿Cuándo usar `fireEvent` vs `userEvent`?

- **`userEvent`**: Preferido siempre que sea posible
  - Simula eventos del usuario de forma más realista
  - Ejemplo: tipo carácter por carácter

- **`fireEvent`**: Casos especiales
  - Eventos que el navegador no dispara naturalmente
  - Cambios manuales de valor
  - Ejemplo: cambiar el value de un input programáticamente

---

## 📞 Soporte

Para más información sobre testing en React:
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Docs](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
