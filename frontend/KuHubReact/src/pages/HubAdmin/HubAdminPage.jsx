// src/pages/HubAdmin/HubAdminPage.jsx

import { Link } from 'react-router-dom';

// Importa los componentes y activos necesarios
import kuHubLogo from '../../assets/KüHubLogoWBG.png'; 
import ThemeButton from '../../components/ThemeButton/ThemeButton.jsx';
import styles from './HubAdminPage.module.css'; // Estilos específicos para esta página

function HubAdminPage() {
  return (
    <>
      <div className="header">
        <h1>Panel Principal de Administración</h1>
        <img className="KHlogo" src={kuHubLogo} alt="KüHub logo" />
      </div>
      
      {/* Colocamos los botones de tema y volver en un contenedor propio si es necesario */}
      <div className={styles.actionButtonsContainer}>
        <ThemeButton />
      </div>

      <div className="principal-container">
        <div className={styles.menuContainer}>
          {/* Los enlaces ahora usan el componente <Link> con la ruta correspondiente */}
          <Link to="/docente/solicitud" className={styles.menuButton}>
            Solicitud de Materias Primas
          </Link>
          <Link to="/admin/inventario" className={styles.menuButton}>
            Administrar Inventario
          </Link>
          <Link to="/admin/asignaturas" className={styles.menuButton}>
            Administrar Asignaturas y Secciones
          </Link>
          <Link to="/admin/roles" className={styles.menuButton}>
            Administrar Roles
          </Link>
        </div>
      </div>
    </>
  );
}

export default HubAdminPage;