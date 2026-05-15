import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';

/**
 * Wrapper personalizado para renderizar componentes con todos los contextos necesarios
 */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <HeroUIProvider>
        {children}
      </HeroUIProvider>
    </BrowserRouter>
  );
};

/**
 * Función de render personalizada que incluye todos los providers
 * Uso: renderWithProviders(<MiComponente />)
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

/**
 * Tipos de respuesta esperada para login
 */
export const loginResponses = {
  success: {
    statusCode: 200,
    message: 'Login exitoso',
    data: {
      token: 'jwt_token_aqui',
      usuario: {
        id: 1,
        email: 'usuario@duoc.cl',
        nombre: 'Usuario Test',
        rol: 'ADMIN',
      },
    },
  },
  invalidCredentials: {
    statusCode: 401,
    message: 'Email o contraseña incorrectos',
    error: 'INVALID_CREDENTIALS',
  },
  serverError: {
    statusCode: 500,
    message: 'Error interno del servidor',
    error: 'INTERNAL_SERVER_ERROR',
  },
  networkError: {
    statusCode: 0,
    message: 'Error de conexión',
    error: 'NETWORK_ERROR',
  },
};

/**
 * Datos de prueba para usuarios
 */
export const testUsers = {
  admin: {
    email: 'adminhash@kuhub.cl',
    password: 'admin123',
  },
  coadmin: {
    email: 'coadminhash@kubhub.cl',
    password: 'admin123',
  },
  gestor: {
    email: 'gestorhash@kuhub.cl',
    password: 'admin123',
  },
  profesor: {
    email: 'profesorcargohash@kuhub.cl',
    password: 'admin123',
  },
  docente: {
    email: 'docentehash@kuhub.cl',
    password: 'admin123',
  },
  bodega: {
    email: 'bodegahash@kuhub.cl',
    password: 'admin123',
  },
  asistente: {
    email: 'asisbodegahash@kuhub.cl',
    password: 'admin123',
  },
};

/**
 * Validación de emails para tests
 */
export const emailValidation = {
  valid: [
    'usuario@duoc.cl',
    'admin@kuhub.cl',
    'test.user@example.com',
    'user+tag@domain.co.uk',
  ],
  invalid: [
    'sin-arroba',
    '@dominio.cl',
    'usuario@',
    'usuario dominio.cl',
    'usuario@@dominio.cl',
    'usuario@dominio',
  ],
};

/**
 * Casos de contraseña para testing
 */
export const passwordValidation = {
  valid: [
    'admin123',
    'MySecurePassword123',
    'aB1!@#$',
  ],
  weak: [
    '123',
    'password',
    '111111',
  ],
};
