import React from 'react';
import { motion } from 'framer-motion';
import HTMLFlipBook from 'react-pageflip';

interface BookPageLoaderProps {
  message?: string;
  subMessage?: string;
}

const BookPageLoader: React.FC<BookPageLoaderProps> = ({
  message = 'Cargando datos',
  subMessage = 'Por favor espera...'
}) => {
  const bookRef = React.useRef<any>(null);
  const [visiblePage, setVisiblePage] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (bookRef.current?.pageFlip?.()) {
        try {
          const controller = bookRef.current.pageFlip();
          // flip() hace el flip a la siguiente página (simula el click del usuario)
          controller.flip();
          setVisiblePage((prev) => (prev + 1) % 4);
        } catch (e) {
          console.log('Error en flip:', e);
        }
      }
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  // Componente de página con contenido animado (lineas punteadas)
  const PageContent: React.FC<{ variant: 'light' | 'medium' | 'dark' }> = ({ variant }) => {
    const colorMap = {
      light: 'bg-primary-100 dark:bg-primary-700/20',
      medium: 'bg-primary-200 dark:bg-primary-700/40',
      dark: 'bg-primary-300 dark:bg-primary-700/60'
    };

    return (
      <div className="space-y-3 w-full">
        <div className={`h-2 ${colorMap['dark']} rounded w-3/4 mx-auto`} />
        <div className={`h-2 ${colorMap['light']} rounded w-full`} />
        <div className={`h-2 ${colorMap['light']} rounded w-5/6 mx-auto`} />
        <div className={`h-2 ${colorMap['medium']} rounded w-4/5 mx-auto mt-4`} />
        <div className={`h-2 ${colorMap['light']} rounded w-full`} />
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      {/* Libro animado con colores del sistema */}
      <div className="w-32 h-40 flex items-center justify-center">
        <HTMLFlipBook
          ref={bookRef}
          className=""
          style={{}}
          width={140}
          height={180}
          size="fixed"
          minWidth={140}
          maxWidth={140}
          minHeight={180}
          maxHeight={180}
          showCover={false}
          maxShadowOpacity={0.6}
          flippingTime={900}
          useMouseEvents={false}
          mobileScrollSupport={false}
          clickEventForward={false}
          startPage={0}
          startZIndex={0}
          autoSize={false}
          showPageCorners={false}
          drawShadow={true}
          usePortrait={false}
          swipeDistance={0}
          disableFlipByClick={true}
        >
          {/* Página 1 */}
          <div className="w-full h-full bg-white dark:bg-gray-800 border border-primary-200 dark:border-primary-700/30 flex items-center justify-center p-3 rounded-sm shadow-sm">
            <PageContent variant="light" />
          </div>

          {/* Página 2 */}
          <div className="w-full h-full bg-white dark:bg-gray-800 border border-primary-200 dark:border-primary-700/30 flex items-center justify-center p-3 rounded-sm shadow-sm">
            <PageContent variant="medium" />
          </div>

          {/* Página 3 */}
          <div className="w-full h-full bg-white dark:bg-gray-800 border border-primary-200 dark:border-primary-700/30 flex items-center justify-center p-3 rounded-sm shadow-sm">
            <PageContent variant="dark" />
          </div>

          {/* Página 4 */}
          <div className="w-full h-full bg-white dark:bg-gray-800 border border-primary-200 dark:border-primary-700/30 flex items-center justify-center p-3 rounded-sm shadow-sm">
            <PageContent variant="light" />
          </div>
        </HTMLFlipBook>
      </div>

      {/* Indicador visual de carga con colores del sistema */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === visiblePage
                ? 'bg-primary w-4'
                : 'bg-default-300 dark:bg-default-600 w-1.5'
            }`}
            animate={{
              scale: i === visiblePage ? 1.1 : 1,
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>

      {/* Texto con estilos del sistema */}
      <div className="text-center max-w-xs">
        <p className="text-sm font-semibold text-secondary dark:text-foreground tracking-wide">
          {message}
        </p>
        <motion.p
          className="text-xs text-default-500 dark:text-default-400 mt-1.5"
          animate={{ opacity: [0.5, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
        >
          {subMessage}
        </motion.p>
      </div>
    </div>
  );
};

export default BookPageLoader;
