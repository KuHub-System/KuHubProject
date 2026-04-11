import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { BrowserRouter as Router } from 'react-router-dom';
import { inicializarApp } from './services/init-system';
import App from './App';
import './index.css';

// Inicializar sistema antes de renderizar
inicializarApp();

// Establecer tema claro como predeterminado si el usuario no tiene preferencia guardada.
// Se hace de forma sincrónica antes del primer render para evitar el flash de tema oscuro.
if (!localStorage.getItem('heroui-theme') && !localStorage.getItem('theme')) {
  localStorage.setItem('heroui-theme', 'light');
}

/**
 * Punto de entrada principal de la aplicación.
 * Configura los proveedores necesarios:
 * - HeroUIProvider: Para los componentes de HeroUI
 * - ToastProvider: Para las notificaciones
 * - Router: Para la navegación entre páginas
 */

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HeroUIProvider defaultTheme="light">
      <ToastProvider />
      <Router>
        <App />
      </Router>
    </HeroUIProvider>
  </React.StrictMode>,
);
