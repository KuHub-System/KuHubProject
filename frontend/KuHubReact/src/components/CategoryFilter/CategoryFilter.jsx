// src/components/CategoryFilter/CategoryFilter.jsx
import React from 'react';
import styles from './CategoryFilter.module.css';

function CategoryFilter({ categorias, categoriaSeleccionada, onSelectCategoria }) {
  return (
    <div className={styles.filterContainer}>
      {/* Botón para mostrar todas las categorías */}
      <button
        className={`${styles.filterButton} ${categoriaSeleccionada === '' ? styles.active : ''}`}
        onClick={() => onSelectCategoria('')}
      >
        Todos
      </button>

      {/* Mapeo para los botones de cada categoría */}
      {categorias.map(cat => (
        <button
          key={cat.idCategoria}
          className={`${styles.filterButton} ${categoriaSeleccionada === cat.idCategoria ? styles.active : ''}`}
          onClick={() => onSelectCategoria(cat.idCategoria)}
        >
          {cat.nombreCategoria}
        </button>
      ))}
    </div>
  );
}

export default CategoryFilter;