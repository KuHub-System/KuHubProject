import React from 'react';

/**
 * Componente de pie de página (Footer) que muestra información de copyright.
 * 
 * @returns {JSX.Element} El componente Footer.
 */
const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} KuHub · Entorno de Pruebas | v1.0.28</p>
    </footer>
  );
};

export default Footer;
