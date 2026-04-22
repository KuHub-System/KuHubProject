import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { BrowserRouter as Router } from 'react-router-dom';
import { inicializarApp } from './services/init-system';
import App from './App';
import './index.css';

// Inicializar sistema antes de renderizar
inicializarApp();

// Guardar tema claro en localStorage si el usuario no tiene preferencia guardada.
// La clase del DOM ya fue manejada por el script inline de index.html (primera línea de defensa).
// Esto es un refuerzo para cuando React monta HeroUIProvider y lee desde localStorage.
if (!localStorage.getItem('heroui-theme') && !localStorage.getItem('theme')) {
  localStorage.setItem('heroui-theme', 'light');
  document.documentElement.classList.remove('dark');
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
