// src/App.jsx

import { useLocation } from 'react-router-dom';
import AppRouter from './routes/AppRouter.jsx';
import HamburgerButton from './components/HamburgerButton/HamburgerButton';
import AsideMenu from './components/AsideMenu/AsideMenu';
import Footer from './components/Footer/Footer.jsx';

function App() {
  // useLocation ahora funciona porque <App /> está dentro de <BrowserRouter> en main.jsx
  const location = useLocation();

  // Definimos las rutas donde NO queremos que aparezca el menú
  const noMenuRoutes = ['/', '/login'];

  // La condición para mostrar el menú
  const showMenu = !noMenuRoutes.includes(location.pathname);

  return (
    <>
      {/* El menú solo se renderiza si showMenu es verdadero */}
      {showMenu && (
        <>
          <HamburgerButton />
          <AsideMenu />
        </>
      )}

      {/* El enrutador siempre se renderiza para mostrar la página correcta */}
      <AppRouter />
      <Footer />
    </>
  );
}

export default App;