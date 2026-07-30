import React from 'react';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extiende los matchers de Vitest con los de jest-dom
expect.extend(matchers);

// @iconify/react agenda actualizaciones de estado via setTimeout para el fetch/cache de
// icono (Timeout._onTimeout -> changeState -> dispatchSetState en su propio runtime interno,
// ver node_modules/@iconify/react/dist/iconify.js). Ese timer sigue vivo mas alla del test que
// lo origino y, si dispara despues de que Vitest destruye el entorno jsdom de ese archivo,
// revienta con "ReferenceError: window is not defined" como excepcion no capturada (ver
// GestionUnidadesModal.test.tsx en el run de CI del deploy K1.0.31) -- ningun test en
// src/__tests__ afirma nada sobre el icono renderizado, asi que se reemplaza por un stub
// inerte sin el runtime de iconify.
vi.mock('@iconify/react', () => ({
  Icon: ({ icon, ...rest }: { icon?: string; [key: string]: unknown }) =>
    React.createElement('span', { 'data-icon': icon, ...rest }),
}));

// Limpia después de cada prueba
afterEach(() => {
  cleanup();
});