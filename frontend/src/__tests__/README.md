# Tests del Frontend KuHub

Esta carpeta contiene los tests unitarios e integración para los componentes del frontend usando **Vitest** y **React Testing Library**.

**Nota**: Cada test se nombra con el formato `test##` (test01, test02, etc.) y utiliza el patrón **AAA** (Arrange-Act-Assert) de forma explícita.

## Estructura

```
__tests__/
├── pages/                 # Tests de páginas (login, dashboard, etc)
├── components/           # Tests de componentes reutilizables (opcional)
├── setup.ts             # Configuración global para tests
└── README.md            # Este archivo
```

## Comandos

```bash
# Ejecutar tests en modo watch (desarrollo)
npm run test

# Ejecutar tests una sola vez (CI/CD)
npm run test:run

# Ejecutar tests con UI gráfica
npm run test:ui

# Cobertura de tests
npm run test:coverage
```

## Convenciones

### Nombre de archivos
- Los archivos de test deben nombrase con el patrón: `[nombre-componente].test.tsx`
- Ejemplo: `login.tsx` → `login.test.tsx`

### Estructura de un test - Patrón AAA

Cada test debe seguir explícitamente el patrón **AAA** (Arrange-Act-Assert):

```typescript
it('test##: [descripción clara de qué prueba]', async () => {
  // ========== ARRANGE ==========
  // Preparar: renderizar, crear mocks, buscar elementos
  renderWithProviders(<LoginPage />);
  const emailInput = screen.getByPlaceholderText(/correo@duoc.cl/i);
  const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

  // ========== ACT ==========
  // Actuar: simular acciones del usuario
  await userEvent.type(emailInput, 'test@duoc.cl');
  fireEvent.click(submitButton);

  // ========== ASSERT ==========
  // Verificar: comprobar resultados esperados
  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalledWith('test@duoc.cl', expect.any(String), false);
  });
});
```

**Reglas importantes:**
- Cada test tiene un nombre único: `test01`, `test02`, `test03`, etc.
- Las secciones ARRANGE, ACT, ASSERT están claramente comentadas
- El test es independiente (no depende de otros tests)
- Un test prueba UNA sola cosa
- El nombre describe claramente qué se prueba

## Utilidades de testing

### Buscar elementos

```typescript
// Por rol (preferido)
screen.getByRole('button', { name: /iniciar sesión/i });
screen.getByRole('textbox', { name: /email/i });
screen.getByRole('checkbox', { name: /recordar/i });

// Por placeholder
screen.getByPlaceholderText(/correo@/i);

// Por texto
screen.getByText(/email o contraseña incorrectos/i);

// Por testid (último recurso)
screen.getByTestId('submit-button');
```

### Interactuar con elementos

```typescript
// Click
fireEvent.click(element);

// Input (userEvent es preferido)
await userEvent.type(input, 'texto');
fireEvent.change(input, { target: { value: 'nuevo valor' } });

// Esperar cambios
await waitFor(() => {
  expect(screen.getByText('texto')).toBeInTheDocument();
});
```

### Assertions comunes

```typescript
// Visibilidad
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).not.toBeVisible();

// Estado
expect(button).toBeDisabled();
expect(input).toHaveValue('valor');
expect(checkbox).toBeChecked();

// Contenido
expect(screen.getByText(/regex/i)).toBeInTheDocument();
expect(element.textContent).toBe('exacto');

// Llamadas a funciones mock
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('param1', 'param2');
expect(mockFn).toHaveBeenCalledTimes(1);
```

## Mocking

### Mock de hooks personalizados

```typescript
const mockFn = vi.fn();
vi.spyOn(authContext, 'useAuth').mockReturnValue({
  login: mockFn,
  user: null,
  // ... otros props
} as any);
```

### Mock de módulos

```typescript
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useHistory: () => ({
      push: vi.fn(),
    }),
  };
});
```

### Mock de valores de retorno

```typescript
// Una sola vez
mockFn.mockResolvedValueOnce(true);

// Múltiples veces
mockFn.mockResolvedValue(true);

// Con error
mockFn.mockRejectedValueOnce(new Error('Error'));

// Implementación personalizada
mockFn.mockImplementationOnce((param) => param * 2);
```

## Ejemplos en el proyecto

### Test de validación (login.test.tsx)

```typescript
it('debe mostrar error cuando email está vacío', async () => {
  renderWithProviders(<LoginPage />);

  const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(screen.getByText(/por favor, complete todos los campos/i)).toBeInTheDocument();
  });
  expect(mockLogin).not.toHaveBeenCalled();
});
```

## Cobertura esperada

Para cada página/componente, cubrir:

✅ **Validaciones de entrada**
- Campos vacíos
- Formatos inválidos
- Valores límite

✅ **Estados de carga**
- Spinner visible durante operación
- Botones deshabilitados
- Inputs deshabilitados

✅ **Errores**
- Mensajes de error visibles
- Comportamiento fallido
- Recuperación de errores

✅ **Éxito**
- Funciones llamadas correctamente
- Datos pasados como parámetros esperados
- Navegación o cambio de estado

✅ **Interacción**
- Clicks en botones
- Escritura en inputs
- Checkboxes
- Dropdowns

## Buenas prácticas

1. **Use `screen`** en lugar de `getByTestId` cuando sea posible
2. **Prefiera `userEvent`** sobre `fireEvent` para simulaciones realistas
3. **Evite `waitFor` innecesarios**: Los queries ya esperan por cambios
4. **Nombre descriptivos**: Los nombres de tests deben explicar qué se prueba
5. **Arrange-Act-Assert**: Separar preparación, acción y verificación
6. **Mock solo lo necesario**: No mockear implementaciones internas
7. **Tests independientes**: Cada test debe poder ejecutarse solo
8. **Limpiar mocks**: Usar `beforeEach` para resetear estado

## Configuración en vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

## Recursos útiles

- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about/)
- [Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
