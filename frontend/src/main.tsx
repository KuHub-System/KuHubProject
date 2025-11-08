import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { BrowserRouter as Router } from 'react-router-dom';
import { inicializarApp } from './services/init-system';
import App from './App';
import './index.css';

// Inicializar sistema antes de renderizar
inicializarApp();

/**
 * Punto de entrada principal de la aplicación.
 * Configura los proveedores necesarios:
 * - HeroUIProvider: Para los componentes de HeroUI
 * - ToastProvider: Para las notificaciones
 * - Router: Para la navegación entre páginas
 */

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HeroUIProvider>
      <ToastProvider />
      <Router>
        <App />
      </Router>
    </HeroUIProvider>
  </React.StrictMode>,
);
