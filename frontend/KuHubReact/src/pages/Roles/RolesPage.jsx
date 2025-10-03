import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../../services/apiClient';

// ... (otros imports y componentes)
import styles from './RolesPage.module.css';
import kuHubLogo from '../../assets/KüHubLogoWBG.png';
import AsignaturaModal from '../../components/Modals/AsignaturaModal';
import BackButton from '../../components/BackButton/BackButton';
import ThemeButton from '../../components/ThemeButton/ThemeButton';


const AsignaturasPage = () => {
  const [asignaturas, setAsignaturas] = useState([]);
  const [seccionesMap, setSeccionesMap] = useState(new Map());
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  
  // Estados del modal (sin cambios)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsignatura, setSelectedAsignatura] = useState(null);

  const cargarDatosIniciales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [asignaturasData, seccionesData] = await Promise.all([
        apiClient('/api/v1/asignatura'),
        apiClient('/api/v1/seccion')
      ]);

      console.log("Secciones recibidas del API:", seccionesData);

      // --- PASO 1: VERIFICACIÓN DE DATOS CRUDOS ---
      console.log("1. Asignaturas recibidas del API:", asignaturasData);
      console.log("2. Secciones recibidas del API:", seccionesData);

      const agrupadas = new Map();
      seccionesData.forEach(seccion => {
        // Usamos el nombre de campo confirmado: 'idAsignatura'
        const asignaturaId = seccion.idAsignatura;
        
        if (!agrupadas.has(asignaturaId)) {
          agrupadas.set(asignaturaId, []);
        }
        agrupadas.get(asignaturaId).push(seccion);
      });
      
      // --- PASO 2: VERIFICACIÓN DEL MAPA AGRUPADO ---
      console.log("3. Mapa de secciones ya agrupadas:", agrupadas);

      setAsignaturas(asignaturasData);
      setSeccionesMap(agrupadas);

    } catch (err) {
      setError('Error al cargar los datos iniciales.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatosIniciales();
  }, [cargarDatosIniciales]);
  
  const handleToggleAsignatura = (asignaturaId) => {
    setExpandedId(prevId => (prevId === asignaturaId ? null : asignaturaId));
  };

  const sortedAsignaturas = useMemo(() => {
    if (!searchTerm) {
      return [...asignaturas].sort((a, b) => a.nombreAsignatura.localeCompare(b.nombreAsignatura));
    }
    return [...asignaturas].sort((a, b) => {
      const aMatches = a.nombreAsignatura.toLowerCase().includes(searchTerm.toLowerCase());
      const bMatches = b.nombreAsignatura.toLowerCase().includes(searchTerm.toLowerCase());
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return a.nombreAsignatura.localeCompare(b.nombreAsignatura);
    });
  }, [asignaturas, searchTerm]);

  // ... (otras funciones como handleOpenModal, etc.)

  if (error) return <div>{error}</div>;

  return (
    <>
      {/* ... (Header y botones) ... */}
      <div className="header">
        <h1>Gestión de Roles</h1>
        <img className="KHlogo" src={kuHubLogo} alt="Logo de KüHub" />
      </div>
      <ThemeButton />
      <BackButton />

      <div className={`principal-container`}>
        <div className={styles.contentCard}>
          <div className={styles.actionBar}>
            <input 
              type="text"
              placeholder="Buscar y reordenar por nombre..."
              className="info-block"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>Cargando...</div>
          ) : (
            <div className={styles.accordionContainer}>
              {sortedAsignaturas.map((asignatura) => {
                const seccionesDeEstaAsignatura = seccionesMap.get(asignatura.idAsignatura) || [];
                
                // --- PASO 3: VERIFICACIÓN EN EL MOMENTO DE RENDERIZAR ---
                if (expandedId === asignatura.idAsignatura) {
                    console.log(`4. Renderizando secciones para Asignatura ID ${asignatura.idAsignatura}:`, seccionesDeEstaAsignatura);
                }

                return (
                  <div key={asignatura.idAsignatura} className={styles.accordionItem}>
                    <div 
                      className={styles.accordionHeader} 
                      onClick={() => handleToggleAsignatura(asignatura.idAsignatura)}
                    >
                      <span>{asignatura.codigoAsignatura} - {asignatura.nombreAsignatura}</span>
                      <span className={styles.accordionIcon}>{expandedId === asignatura.idAsignatura ? '▲' : '▼'}</span>
                    </div>
                    {expandedId === asignatura.idAsignatura && (
                      <div className={styles.accordionContent}>
                        {seccionesDeEstaAsignatura.length > 0 ? (
                          <ul>
                            {seccionesDeEstaAsignatura.map((seccion) => (
                              // --- CORRECCIÓN: Usamos 'nombreSeccion' en lugar de 'codigoSeccion' ---
                              <li key={seccion.idSeccion}>{seccion.nombreSeccion}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>Esta asignatura no tiene secciones registradas.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* ... Tu Modal ... */}
    </>
  );
};

export default AsignaturasPage;