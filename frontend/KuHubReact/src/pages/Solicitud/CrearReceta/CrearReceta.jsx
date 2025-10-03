import React, { useState, useEffect } from 'react';
import apiClient from '../../../services/apiClient';
import styles from './CrearReceta.module.css';

function CrearReceta() {
  const [nombreReceta, setNombreReceta] = useState('');
  const [ingredientes, setIngredientes] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(''); // Guardará el ID
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState(0.1);
  const [cargandoInventario, setCargandoInventario] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const cargarProductos = async () => {
      setCargandoInventario(true);
      try {
        const productosData = await apiClient('/api/v1/producto');
        if (Array.isArray(productosData)) {
          setInventario(productosData);
          const categoriasMap = new Map();
          productosData.forEach(p => {
            if (p.categoria && p.categoria.idCategoria) {
              categoriasMap.set(p.categoria.idCategoria, p.categoria);
            }
          });
          setCategorias(Array.from(categoriasMap.values()));
        } else {
          setInventario([]);
          setCategorias([]);
        }
      } catch (error) {
        console.error("Error al cargar el inventario:", error);
      } finally {
        setCargandoInventario(false);
      }
    };
    cargarProductos();
  }, []);

  const productosFiltrados = categoriaSeleccionada
    ? inventario.filter(p => p.categoria?.idCategoria === Number(categoriaSeleccionada))
    : inventario;

  const handleAgregarIngrediente = () => {
    // Convertimos el string de 'cantidad' a un número SOLO al momento de agregar
    const cantidadNum = parseFloat(cantidad);

    if (!productoSeleccionado || isNaN(cantidadNum) || cantidadNum <= 0) {
      alert('Por favor, selecciona un producto y una cantidad numérica válida.');
      return;
    }
    
    const idProductoAAgregar = Number(productoSeleccionado);
    const productoInfo = inventario.find(p => p.idProducto === idProductoAAgregar);
    if (!productoInfo) return; // Seguridad extra

    const ingredienteExistente = ingredientes.find(ing => ing.idProducto === idProductoAAgregar);

    if (ingredienteExistente) {
      const nuevaCantidad = Number(ingredienteExistente.cantidad) + cantidadNum; // Usamos cantidadNum
      setIngredientes(ingredientes.map(ing => 
        ing.idProducto === idProductoAAgregar
          ? { ...ing, cantidad: Number(nuevaCantidad.toFixed(2)) } 
          : ing 
      ));
    } else {
      setIngredientes([...ingredientes, {
        idProducto: productoInfo.idProducto,
        nombreProducto: productoInfo.nombreProducto,
        cantidad: cantidadNum // Guardamos el número
      }]);
    }
    
    setProductoSeleccionado('');
    setCantidad('0.1'); // Reseteamos al string '0.1'
  };
  
  const handleQuitarIngrediente = (idProducto) => {
    setIngredientes(ingredientes.filter(ing => ing.idProducto !== idProducto));
  };

  const handleGuardarReceta = async () => {
    if (!nombreReceta.trim() || ingredientes.length === 0) {
      alert('El nombre y los ingredientes son obligatorios.');
      return;
    }
    const confirmacion = window.confirm(`¿Guardar la receta "${nombreReceta}"?`);
    if (confirmacion) {
      setEnviando(true);
      try {
        // Primera llamada POST: Guardar el nombre de la receta
        const recetaResponse = await apiClient('/api/v1/receta', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombreReceta }) 
        });
        
        // Segunda llamada POST: Guardar los detalles de los ingredientes
        const promesasDetalles = ingredientes.map(ing => {
          return apiClient('/api/v1/detallereceta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombreReceta,
              idProducto: ing.idProducto,
              cantidadProducto: ing.cantidad
            })
          });
        });
        
        await Promise.all(promesasDetalles);
        
        alert('¡Receta guardada con éxito!');
        setNombreReceta('');
        setIngredientes([]);
      } catch (error) {
        alert('Hubo un error al guardar la receta.');
        console.error(error);
      } finally {
        setEnviando(false);
      }
    }
  };

  return (
    <div>
      <div className="section-title">Crear Nueva Receta</div>
      
      <div className={styles.formReceta}>
        <label className="info-label">Nombre de la Receta
          <input 
            type="text" 
            className="info-block" 
            placeholder="Ej: Tarta de Manzana (por alumno)"
            value={nombreReceta}
            onChange={(e) => setNombreReceta(e.target.value)}
          />
        </label>
      </div>

      <div className={styles.agregarIngredienteSection}>
        
        {/* --- INICIO DEL CAMBIO: FILTRO DE CATEGORÍAS CON BOTONES --- */}
        <div className={styles.filterContainer}>
            <button
                className={`${styles.filterButton} ${categoriaSeleccionada === '' ? styles.active : ''}`}
                onClick={() => setCategoriaSeleccionada('')}
            >
                Todos
            </button>
            {categorias.map(cat => (
                <button
                key={cat.idCategoria}
                className={`${styles.filterButton} ${categoriaSeleccionada === cat.idCategoria ? styles.active : ''}`}
                onClick={() => setCategoriaSeleccionada(cat.idCategoria)}
                >
                {cat.nombreCategoria}
                </button>
            ))}
        </div>
        {/* --- FIN DEL CAMBIO --- */}

        <div className={styles.ingredienteActionGroup}>
          <select 
            className="info-block"
            value={productoSeleccionado}
            onChange={(e) => setProductoSeleccionado(e.target.value)}
            disabled={cargandoInventario}
          >
            <option value="">Selecciona un producto...</option>
            {productosFiltrados.map(prod => (
              <option key={prod.idProducto} value={prod.idProducto}>
                {prod.nombreProducto}
              </option>
            ))}
          </select>
          <input 
            type="number" 
            step="0.01" 
            min="0.01"
            className="info-block"
            placeholder="Cantidad"
            value={cantidad}
            onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
          />
          <button className="info-block" onClick={handleAgregarIngrediente}>Agregar</button>
        </div>
      </div>

      <div className={styles.listaIngredientes}>
        <h3>Ingredientes de la Receta</h3>
        {ingredientes.length === 0 ? (
          <p>Aún no has agregado ingredientes.</p>
        ) : (
          <ul>
            {ingredientes.map(ing => (
              <li key={ing.idProducto}>
                <span>{ing.nombreProducto} - Cantidad: {ing.cantidad}</span>
                <button className="eliminar-btn" onClick={() => handleQuitarIngrediente(ing.idProducto)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button 
        className="login-button" 
        onClick={handleGuardarReceta} 
        disabled={!nombreReceta || ingredientes.length === 0 || enviando}
      >
        {enviando ? 'Guardando...' : 'Guardar Receta'}
      </button>
    </div>
  );
}

export default CrearReceta;