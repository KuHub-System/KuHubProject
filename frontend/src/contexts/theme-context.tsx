import React from 'react';
import { useTheme } from '@heroui/use-theme';

/**
 * Interfaz para el contexto del tema.
 * Define los valores y funciones que estarán disponibles en el contexto.
 */
interface IThemeContext {
  theme: string;
  toggleTheme: () => void;
  isDark: boolean;
}

/**
 * Crea el contexto del tema con un valor inicial.
 */
const ThemeContext = React.createContext<IThemeContext>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
});

/**
 * Hook personalizado para acceder al contexto del tema.
 * @returns {IThemeContext} El contexto del tema.
 */
export const useThemeContext = (): IThemeContext => {
  return React.useContext(ThemeContext);
};

/**
 * Proveedor del contexto del tema.
 * Gestiona el estado del tema (claro/oscuro) y proporciona funciones para cambiarlo.
 * 
 * @param {object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Componentes hijos que tendrán acceso al contexto.
 * @returns {JSX.Element} El proveedor del contexto del tema.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Utiliza el hook useTheme de HeroUI para gestionar el tema
  const { theme, setTheme } = useTheme();

  // Si no hay preferencia guardada, forzar tema claro como predeterminado.
  // También se manipula la clase del DOM directamente para neutralizar cualquier
  // sobreescritura que next-themes (usado por HeroUI) haga desde prefers-color-scheme del OS.
  React.useEffect(() => {
    const saved = localStorage.getItem('heroui-theme') ?? localStorage.getItem('theme');
    if (!saved) {
      localStorage.setItem('heroui-theme', 'light');
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  /**
   * Alterna entre los temas claro y oscuro.
   */
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Determina si el tema actual es oscuro
  const isDark = theme === 'dark';

  // Valor del contexto que se proporcionará a los componentes hijos
  const value: IThemeContext = {
    theme,
    toggleTheme,
    isDark,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
