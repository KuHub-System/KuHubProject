import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import LoginPage from '../../pages/login';
import * as authContext from '../../contexts/auth-context';

// ============================================
// SETUP DE MOCKS
// ============================================

const mockLogin = vi.fn();
const mockUseAuth = vi.spyOn(authContext, 'useAuth');
const mockPush = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useHistory: () => ({
      push: mockPush,
    }),
  };
});

// ============================================
// RENDERIZADOR CON CONTEXTOS
// ============================================

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <HeroUIProvider>
        {component}
      </HeroUIProvider>
    </BrowserRouter>
  );
};

// ============================================
// SUITE DE TESTS: LoginPage
// ============================================

describe('LoginPage', () => {
  // -------- BEFORE EACH --------
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockReset();
    mockPush.mockReset();

    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
      canAccessPage: vi.fn(() => true),
      userRole: null,
    } as any);
  });

  // ============================================
  // TEST 01: Email vacío - mostrar error
  // ============================================
  it('TC-LOGIN-01: debe mostrar error cuando el email está vacío', async () => {
    // ARRANGE
    const { container } = renderWithProviders(<LoginPage />);
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    // ACT — contraseña presente, email vacío
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form);

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText('Por favor, complete todos los campos')).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  // ============================================
  // TEST 02: Contraseña vacía - mostrar error
  // ============================================
  it('TC-LOGIN-02: debe mostrar error cuando la contraseña está vacía', async () => {
    // ARRANGE
    const { container } = renderWithProviders(<LoginPage />);
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    // ACT
    fireEvent.change(emailInput, { target: { value: 'usuario@test.cl' } });
    fireEvent.submit(form);

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText('Por favor, complete todos los campos')).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  // ============================================
  // TEST 03: Ambos campos vacíos - mostrar error
  // ============================================
  it('TC-LOGIN-03: debe mostrar error cuando ambos campos están vacíos', async () => {
    // ARRANGE
    const { container } = renderWithProviders(<LoginPage />);
    const form = container.querySelector('form') as HTMLFormElement;

    // ACT
    fireEvent.submit(form);

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText('Por favor, complete todos los campos')).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  // ============================================
  // TEST 04: Email sin @ - mostrar error
  // ============================================
  it('TC-LOGIN-04: debe mostrar error para email sin símbolo @', async () => {
    // ARRANGE
    const { container } = renderWithProviders(<LoginPage />);
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    // ACT
    fireEvent.change(emailInput, { target: { value: 'usuariosintestcl' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form);

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText('Por favor, ingrese un email válido')).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  // ============================================
  // TEST 05: Email sin dominio - mostrar error
  // ============================================
  it('TC-LOGIN-05: debe mostrar error para email sin dominio', async () => {
    // ARRANGE
    const { container } = renderWithProviders(<LoginPage />);
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    // ACT
    fireEvent.change(emailInput, { target: { value: 'usuario@' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form);

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText('Por favor, ingrese un email válido')).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  // ============================================
  // TEST 06: Email sin punto en dominio - mostrar error
  // ============================================
  it('TC-LOGIN-06: debe mostrar error para email sin punto en dominio', async () => {
    // ARRANGE
    renderWithProviders(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/correo@duoc.cl/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    // ACT
    await userEvent.type(emailInput, 'usuario@testcl');
    await userEvent.type(passwordInput, 'password123');
    fireEvent.click(submitButton);

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText(/por favor, ingrese un email válido/i)).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  // ============================================
  // TEST 07: Email válido - aceptar formato
  // ============================================
  it('TC-LOGIN-07: debe aceptar email válido con formato correcto', async () => {
    // ARRANGE
    mockLogin.mockResolvedValueOnce(false);
    renderWithProviders(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/correo@duoc.cl/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    // ACT
    await userEvent.type(emailInput, 'usuario@duoc.cl');
    await userEvent.type(passwordInput, 'password123');
    fireEvent.click(submitButton);

    // ASSERT
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  // ============================================
  // TEST 08: Escribir en campo email
  // ============================================
  it('TC-LOGIN-08: debe permitir escribir en el campo de email', async () => {
    // ARRANGE
    renderWithProviders(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/correo@duoc.cl/i) as HTMLInputElement;

    // ACT
    await userEvent.type(emailInput, 'test@duoc.cl');

    // ASSERT
    expect(emailInput.value).toBe('test@duoc.cl');
  });

  // ============================================
  // TEST 09: Escribir en campo contraseña
  // ============================================
  it('TC-LOGIN-09: debe permitir escribir en el campo de contraseña', async () => {
    // ARRANGE
    renderWithProviders(<LoginPage />);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement;

    // ACT
    await userEvent.type(passwordInput, 'miPassword123');

    // ASSERT
    expect(passwordInput.value).toBe('miPassword123');
  });

  // ============================================
  // TEST 10: Toggle mostrar/ocultar contraseña
  // ============================================
  it('TC-LOGIN-10: debe mostrar/ocultar la contraseña al hacer click en el ícono', async () => {
    // ARRANGE
    renderWithProviders(<LoginPage />);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement;
    await userEvent.type(passwordInput, 'password123');
    const toggleButton = screen.getByLabelText(/mostrar contraseña/i);

    // ACT & ASSERT - Inicialmente debe estar oculta
    expect(passwordInput.type).toBe('password');

    // ACT - Click para mostrar
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(passwordInput.type).toBe('text');
    });

    // ACT - Click para ocultar
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(passwordInput.type).toBe('password');
    });
  });

  // ============================================
  // TEST 11: Checkbox "Recordar sesión"
  // ============================================
  it('TC-LOGIN-11: debe permitir hacer click en "Recordar sesión"', async () => {
    // ARRANGE
    renderWithProviders(<LoginPage />);
    const recordarCheckbox = screen.getByRole('checkbox', { name: /recordar sesión/i });

    // ACT & ASSERT - Inicialmente debe estar desmarcado
    expect(recordarCheckbox).not.toBeChecked();

    // ACT
    fireEvent.click(recordarCheckbox);

    // ASSERT
    await waitFor(() => {
      expect(recordarCheckbox).toBeChecked();
    });
  });

  // ============================================
  // TEST 12: Login con credenciales válidas
  // ============================================
  it('TC-LOGIN-12: debe llamar a login con credenciales válidas', async () => {
    // ARRANGE
    mockLogin.mockResolvedValueOnce(true);
    renderWithProviders(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/correo@duoc.cl/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    // ACT
    await userEvent.type(emailInput, 'admin@duoc.cl');
    await userEvent.type(passwordInput, 'admin123');
    fireEvent.click(submitButton);

    // ASSERT
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@duoc.cl', 'admin123', false);
    });
  });

  // ============================================
  // TEST 13: Pasar estado "recordar sesión" a login
  // ============================================
  it('TC-LOGIN-13: debe pasar el estado "recordar sesión" al login', async () => {
    // ARRANGE
    mockLogin.mockResolvedValueOnce(true);
    renderWithProviders(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/correo@duoc.cl/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const recordarCheckbox = screen.getByRole('checkbox', { name: /recordar sesión/i });
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    // ACT
    await userEvent.type(emailInput, 'admin@duoc.cl');
    await userEvent.type(passwordInput, 'admin123');
    fireEvent.click(recordarCheckbox);
    fireEvent.click(submitButton);

    // ASSERT
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@duoc.cl', 'admin123', true);
    });
  });

  // ============================================
  // TEST 14: Deshabilitar formulario durante carga
  // ============================================
  it('TC-LOGIN-14: debe deshabilitar el formulario mientras se procesa login', async () => {
    // ARRANGE
    mockLogin.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(true), 1000)));
    renderWithProviders(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/correo@duoc.cl/i) as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i }) as HTMLButtonElement;

    // ACT
    await userEvent.type(emailInput, 'admin@duoc.cl');
    await userEvent.type(passwordInput, 'admin123');
    fireEvent.click(submitButton);

    // ASSERT
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });
  });

  // ============================================
  // TEST 15: Error por credenciales inválidas
  // ============================================
  it('TC-LOGIN-15: debe mostrar error cuando credenciales son inválidas', async () => {
    // ARRANGE
    mockLogin.mockResolvedValueOnce(false);
    renderWithProviders(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/correo@duoc.cl/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    // ACT
    await userEvent.type(emailInput, 'usuario@duoc.cl');
    await userEvent.type(passwordInput, 'passwordIncorrecto');
    fireEvent.click(submitButton);

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText(/email o contraseña incorrectos/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // TEST 16: Error por fallo de conexión
  // ============================================
  it('TC-LOGIN-16: debe mostrar error cuando falla la conexión', async () => {
    // ARRANGE
    mockLogin.mockRejectedValueOnce(new Error('Network error'));
    renderWithProviders(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/correo@duoc.cl/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    // ACT
    await userEvent.type(emailInput, 'usuario@duoc.cl');
    await userEvent.type(passwordInput, 'password123');
    fireEvent.click(submitButton);

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText(/error al iniciar sesión\. intente nuevamente\./i)).toBeInTheDocument();
    });
  });

  // ============================================
  // TEST 17: Limpiar errores previos
  // ============================================
  it('TC-LOGIN-17: debe limpiar el error anterior al intentar un nuevo login', async () => {
    // ARRANGE
    mockLogin.mockResolvedValueOnce(false);
    renderWithProviders(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/correo@duoc.cl/i) as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    // ACT - Primer intento fallido
    await userEvent.type(emailInput, 'usuario@duoc.cl');
    await userEvent.type(passwordInput, 'wrongPassword');
    fireEvent.click(submitButton);

    // ASSERT - Error debe aparecer
    await waitFor(() => {
      expect(screen.getByText(/email o contraseña incorrectos/i)).toBeInTheDocument();
    });

    // ACT - Segundo intento con credenciales correctas
    mockLogin.mockResolvedValueOnce(true);
    fireEvent.change(emailInput, { target: { value: 'admin@duoc.cl' } });
    fireEvent.change(passwordInput, { target: { value: 'admin123' } });
    fireEvent.click(submitButton);

    // ASSERT - Error anterior debe desaparecer
    await waitFor(() => {
      expect(screen.queryByText(/email o contraseña incorrectos/i)).not.toBeInTheDocument();
    });
  });

  // ============================================
  // TEST 18: Prevenir envío por defecto
  // ============================================
  it('TC-LOGIN-18: debe prevenir el envío por defecto del formulario', async () => {
    // ARRANGE
    mockLogin.mockResolvedValueOnce(false);
    renderWithProviders(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/correo@duoc.cl/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const form = screen.getByRole('button', { name: /iniciar sesión/i }).closest('form');

    // ACT
    await userEvent.type(emailInput, 'usuario@duoc.cl');
    await userEvent.type(passwordInput, 'password123');
    fireEvent.submit(form!);

    // ASSERT
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  // ============================================
  // TEST 19: Componente renderizado correctamente
  // ============================================
  it('TC-LOGIN-19: debe renderizar el componente LoginPage correctamente', () => {
    // ARRANGE & ACT (renderizado inicial, no requiere interacción)
    const { container } = renderWithProviders(<LoginPage />);

    // ASSERT
    expect(screen.getByRole('heading', { name: 'Iniciar Sesión' })).toBeInTheDocument();
    expect(container.querySelector('input[type="email"]')).toBeInTheDocument();
    expect(container.querySelector('input[type="password"]')).toBeInTheDocument();
    expect(container.querySelector('button[type="submit"]')).toBeInTheDocument();
    expect(screen.getByText('Recordar sesión')).toBeInTheDocument();
    expect(screen.getByText('KuHub')).toBeInTheDocument();
  });

  // ============================================
  // TEST 20: Logo de KuHub visible
  // ============================================
  it('TC-LOGIN-20: debe mostrar el logo de KuHub en el formulario', () => {
    // ARRANGE
    renderWithProviders(<LoginPage />);

    // ASSERT
    const logos = screen.getAllByAltText('KuHub');
    const logoFormulario = logos[0];
    expect(logoFormulario).toBeInTheDocument();
    expect(logoFormulario).toHaveAttribute('src', '/nrelogoo-Photoroom.png');
  });
});
