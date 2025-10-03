import React, { useState, useEffect, useCallback } from 'react';
import kuHubLogo from '../../assets/KüHubLogoWBG.png';
import ThemeButton from '../../components/ThemeButton/ThemeButton.jsx';
import BackButton from '../../components/BackButton/BackButton.jsx';
import styles from './SolicitudPage.module.css';
import apiClient from '../../services/apiClient';

// 1. IMPORTAMOS EL ARCHIVO EXTERNO CORRECTO
import CrearReceta from './CrearReceta/CrearReceta'; 

// 2. HEMOS ELIMINADO LA FUNCIÓN INTERNA 'VistaCrearReceta' QUE ESTABA AQUÍ


// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---
function SolicitudPage() {
    const [vistaActiva, setVistaActiva] = useState('solicitud');

    // --- (Aquí va toda tu lógica de estados y carga de datos que ya tenías) ---
    const [formData, setFormData] = useState({
        docente: 'Daniel Ojeda', asignaturaId: '', seccionId: '',
        numeroSemana: 1, cantidadPersonas: 20, descripcionSemana: '',
        fecha: new Date().toISOString().split('T')[0], hora: '08:00',
    });
    const [asignaturas, setAsignaturas] = useState([]);
    const [seccionesMap, setSeccionesMap] = useState(new Map());
    const [pedidosHechos, setPedidosHechos] = useState([]);
    const [recetas, setRecetas] = useState([]);
    const [selectedRecetaId, setSelectedRecetaId] = useState('');
    const [recetaLoading, setRecetaLoading] = useState(false);
    const [pedidoActual, setPedidoActual] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [enviando, setEnviando] = useState(false);

    // --- (Tus funciones de carga de datos no necesitan cambios) ---
    const cargarDatosParaFormulario = useCallback(async () => {
        try {
            const [asignaturasData, seccionesData, recetasData] = await Promise.all([
                apiClient('/api/v1/asignatura'),
                apiClient('/api/v1/seccion'),
                apiClient('/api/v1/receta'),
            ]);
            const agrupadas = new Map();
            if (Array.isArray(seccionesData)) {
              seccionesData.forEach(seccion => {
                  const asignaturaId = seccion.idAsignatura;
                  if (!agrupadas.has(asignaturaId)) agrupadas.set(asignaturaId, []);
                  agrupadas.get(asignaturaId).push(seccion);
              });
            }
            setAsignaturas(Array.isArray(asignaturasData) ? asignaturasData : []);
            setSeccionesMap(agrupadas);
            setRecetas(Array.isArray(recetasData) ? recetasData : []);
        } catch (err) {
            console.error("Fallo al cargar datos del formulario:", err);
            setError('No se pudieron cargar los datos para crear una solicitud.');
        }
    }, []);

    const cargarHistorial = useCallback(async () => {
        try {
            const pedidosData = await apiClient('/api/v1/solicituddocente/detalles');
            setPedidosHechos(Array.isArray(pedidosData) ? pedidosData : []);
        } catch (err) {
            console.error("Fallo al cargar historial de pedidos:", err);
            setPedidosHechos([]);
        }
    }, []);

    useEffect(() => {
      const cargarTodo = async () => {
        setLoading(true);
        await Promise.all([ cargarDatosParaFormulario(), cargarHistorial() ]);
        setLoading(false);
      };
      cargarTodo();
    }, [cargarDatosParaFormulario, cargarHistorial]);

    // --- (Tus manejadores de eventos no necesitan cambios) ---
    const handleFormChange = (e) => {
        const { id, value } = e.target;
        if (id === 'asignaturaId') {
            setFormData(prev => ({ ...prev, asignaturaId: value, seccionId: '' }));
        } else {
            setFormData(prev => ({ ...prev, [id]: value }));
        }
    };

    const handleRecetaChange = async (e) => {
        const recetaId = e.target.value;
        setSelectedRecetaId(recetaId);
        if (!recetaId) { setPedidoActual([]); return; }
        setRecetaLoading(true);
        try {
            const detallesDeReceta = await apiClient(`/api/v1/receta/detalles/${recetaId}`);
            const productosParaPedido = Array.isArray(detallesDeReceta) ? detallesDeReceta.map(detalle => ({
                idProducto: detalle.idProducto,
                nombreProducto: detalle.nombreProducto,
                cantidadUnidadMedida: detalle.cantidad
            })) : [];
            setPedidoActual(productosParaPedido);
        } catch (err) {
            alert("Error al cargar los productos de la receta.");
            console.error(err);
            setPedidoActual([]);
        } finally {
            setRecetaLoading(false);
        }
    };

    const seccionesDisponibles = formData.asignaturaId ? seccionesMap.get(Number(formData.asignaturaId)) || [] : [];
    const handleQuitarProducto = (idProducto) => setPedidoActual(prev => prev.filter(p => p.idProducto !== idProducto));

    const handleRealizarPedido = async () => {
        if (pedidoActual.length === 0) return alert('El pedido está vacío.');
        const asignaturaSeleccionada = asignaturas.find(a => a.idAsignatura === Number(formData.asignaturaId));
        const seccionSeleccionada = seccionesDisponibles.find(s => s.idSeccion === Number(formData.seccionId));
        const datosSolicitud = {
            numeroSemana: formData.numeroSemana, cantidadPersonas: formData.cantidadPersonas,
            descripcionSemana: formData.descripcionSemana.trim(), sesion: seccionSeleccionada?.nombreSeccion || '',
            nombreAsignatura: asignaturaSeleccionada?.nombreAsignatura || '', fechaProgramada: formData.fecha,
            estado: "Pendiente"
        };
        try {
            setEnviando(true);
            const solicitudGuardada = await apiClient('/api/v1/solicituddocente', { method: 'POST', body: JSON.stringify(datosSolicitud) });
            const idSolicitudDocente = solicitudGuardada.id || solicitudGuardada.idSolicitudDocente;
            const promesasDetalles = pedidoActual.map(item => {
                const detalle = { idSolicitudDocente, idProducto: item.idProducto, cantidadUnidadMedida: item.cantidadUnidadMedida };
                return apiClient('/api/v1/detalleproductosolicitud', { method: 'POST', body: JSON.stringify(detalle) });
            });
            await Promise.all(promesasDetalles);
            alert('¡Pedido realizado con éxito!');
            setPedidoActual([]);
            setSelectedRecetaId('');
            cargarHistorial();
        } catch (err) {
            console.error('Error en el proceso de pedido:', err);
            alert(`No se pudo completar el pedido. Error: ${err.message}`);
        } finally {
            setEnviando(false);
        }
    };
    
    if (loading) return <div>Cargando...</div>;

    return (
        <>
            <div className="header"><h1>Solicitud de Materias Primas</h1><img className="KHlogo" src={kuHubLogo} alt="KüHub logo" /></div>
            <ThemeButton />
            <BackButton />
            <div className={`principal-container ${styles.solicitudContainer}`}>
                {error && <div className={styles.errorMessage}><strong>Atención:</strong> {error}</div>}
                
                <div className={styles.pestanasContainer}>
                    <button className={`${styles.pestañaBtn} ${vistaActiva === 'solicitud' ? styles.active : ''}`} onClick={() => setVistaActiva('solicitud')}>📝 Realizar Solicitud</button>
                    <button className={`${styles.pestañaBtn} ${vistaActiva === 'recetas' ? styles.active : ''}`} onClick={() => setVistaActiva('recetas')}>📚 Crear Receta</button>
                </div>

                {vistaActiva === 'solicitud' ? (
                    // VISTA PARA REALIZAR SOLICITUD
                    <>
                        <div className={styles.datosTotales}>
                            <div className={styles.colIzquierda}>
                                <label className="info-label">Docente<select id="docente" value={formData.docente} onChange={handleFormChange} className="info-block"><option>Daniel Ojeda</option></select></label>
                                <div className="fila-doble">
                                    <label className="info-label">Asignatura
                                        <select id="asignaturaId" value={formData.asignaturaId} onChange={handleFormChange} className="info-block" required>
                                            <option value="">Seleccione una asignatura</option>
                                            {asignaturas.map(a => <option key={a.idAsignatura} value={a.idAsignatura}>{a.nombreAsignatura}</option>)}
                                        </select>
                                    </label>
                                    <label className="info-label">Sección
                                        <select id="seccionId" value={formData.seccionId} onChange={handleFormChange} className="info-block" disabled={!formData.asignaturaId} required>
                                            <option value="">Seleccione una sección</option>
                                            {seccionesDisponibles.map(s => <option key={s.idSeccion} value={s.idSeccion}>{s.nombreSeccion}</option>)}
                                        </select>
                                    </label>
                                </div>
                                <div className="fila-doble">
                                    <label className="info-label">N° Semana<input id="numeroSemana" value={formData.numeroSemana} onChange={handleFormChange} className="info-block" type="number" min="1" /></label>
                                    <label className="info-label">N° Personas<select id="cantidadPersonas" value={formData.cantidadPersonas} onChange={handleFormChange} className="info-block"><option value="20">20</option><option value="40">40</option></select></label>
                                </div>
                                <label className="info-label">Descripción de la Semana<textarea id="descripcionSemana" value={formData.descripcionSemana} onChange={handleFormChange} className="info-block" rows="2" placeholder="Ej: Introducción a masas quebradas"></textarea></label>
                            </div>
                            <div className={styles.colDerecha}>
                                <label className="info-label">Fecha<input id="fecha" value={formData.fecha} onChange={handleFormChange} className="info-block" type="date" /></label>
                                <label className="info-label">Hora<input id="hora" value={formData.hora} onChange={handleFormChange} className="info-block" type="time" /></label>
                            </div>
                        </div>
                        <div className="section-title">Productos Solicitados</div>
                        <div className={styles.pedidoForm}>
                            <label className="info-label">Seleccionar Receta
                                <select value={selectedRecetaId} onChange={handleRecetaChange} className="info-block" disabled={recetaLoading}>
                                    <option value="">-- Selecciona una receta para cargar sus productos --</option>
                                    {recetas.map(r => <option key={r.idReceta} value={r.idReceta}>{r.nombreReceta}</option>)}
                                </select>
                            </label>
                        </div>
                        <h3>Resumen del Pedido</h3>
                        {recetaLoading && <p>Cargando productos de la receta...</p>}
                        <div className={styles.pedidoActual}>
                            {pedidoActual.length === 0 && !recetaLoading ? <p>El pedido está vacío...</p> : (
                                <ul>
                                    {pedidoActual.map(item => (<li key={item.idProducto}>{item.nombreProducto} - Cantidad: {item.cantidadUnidadMedida}<button onClick={() => handleQuitarProducto(item.idProducto)} className={styles.btnQuitar}>Quitar</button></li>))}
                                </ul>
                            )}
                        </div>
                        <button onClick={handleRealizarPedido} disabled={enviando || pedidoActual.length === 0} className="info-block" style={{ backgroundColor: 'var(--color-duoc-gold)' }}>{enviando ? 'Enviando Pedido...' : 'Realizar Pedido'}</button>
                    </>
                ) : ( 
                    // 3. AHORA LLAMA AL COMPONENTE CORRECTO (del archivo externo)
                    <CrearReceta /> 
                )}

                {/* Historial de Pedidos */}
                <div className="section-title">Pedidos Hechos</div>
                <div className="tabla-container">
                    {pedidosHechos.length > 0 ? (
                        <table>
                            <thead><tr><th>Semana</th><th>Asignatura</th><th>Sección</th><th>Fecha</th><th>Estado</th><th>Ítems</th></tr></thead>
                            <tbody>
                                {pedidosHechos.map((pedido, index) => (
                                    <tr key={pedido.id || index}>
                                        <td>{pedido.numeroSemana}</td><td>{pedido.nombreAsignatura}</td><td>{pedido.sesion}</td>
                                        <td>{new Date(pedido.fechaProgramada).toLocaleDateString('es-CL')}</td><td>{pedido.estado}</td>
                                        <td>{pedido.detalles?.length > 0 ? (<ul>{pedido.detalles.map(d => <li key={d.idProducto}>{d.nombreProducto} (x{d.cantidadUnidadMedida})</li>)}</ul>) : (<span>N/A</span>)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : ( <p>No hay pedidos en el historial.</p> )}
                </div>
            </div>
        </>
    );
}

export default SolicitudPage;