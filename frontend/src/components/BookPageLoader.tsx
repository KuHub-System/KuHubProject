import React from 'react';
import LoadingBookAnimation from './LoadingBookAnimation';

interface BookPageLoaderProps {
  message?: string;
  subMessage?: string;
}

/**
 * Componente de carga con animación de libro girando páginas.
 * Para mayor control, usa directamente LoadingBookAnimation con props adicionales.
 */
const BookPageLoader: React.FC<BookPageLoaderProps> = ({
  message = 'Cargando datos',
  subMessage = 'Por favor espera...'
}) => {
  return (
    <LoadingBookAnimation
      message={message}
      subMessage={subMessage}
      pageCount={4}
      pageChangeInterval={800}
      transitionDuration={0.5}
      size="small"
      showPageIndicators={true}
    />
  );
};

export default BookPageLoader;
