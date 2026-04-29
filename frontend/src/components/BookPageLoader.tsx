import React from 'react';
import { motion } from 'framer-motion';

interface BookPageLoaderProps {
  message?: string;
  subMessage?: string;
}

const BookPageLoader: React.FC<BookPageLoaderProps> = ({
  message = 'Cargando datos',
  subMessage = 'Por favor espera...'
}) => {
  const [currentPage, setCurrentPage] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % 4);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const pageStyle = (pageIndex: number): React.CSSProperties => {
    const visible = pageIndex === currentPage;
    const isNext = pageIndex === (currentPage + 1) % 4;

    return {
      position: 'absolute',
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: visible ? '#ffffff' : '#f5f5f5',
      borderLeft: '2px solid #FFB800',
      perspective: '1200px',
      transform: `rotateY(${visible ? 0 : isNext ? 50 : -50}deg)`,
      transformOrigin: 'left center',
      transition: 'transform 0.25s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      opacity: visible ? 1 : 0.6,
      pointerEvents: visible ? 'auto' : 'none',
      zIndex: visible ? 10 : 5,
    };
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      {/* Libro con perspectiva 3D */}
      <div
        className="relative w-36 h-48 rounded-lg shadow-2xl bg-white dark:bg-gray-800 overflow-hidden border-4 border-primary dark:border-primary-600"
        style={{
          perspective: '1200px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Lomo del libro */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary-600 transform -translate-x-1/2 z-50" />

        {/* Página 1 */}
        <div style={pageStyle(0)} className="dark:bg-gray-700">
          <div className="w-full h-full flex flex-col justify-center items-center px-4">
            <div className="space-y-3 w-full">
              <div className="h-2 bg-primary-200 dark:bg-primary-600/40 rounded w-3/4 mx-auto" />
              <div className="h-2 bg-primary-100 dark:bg-primary-600/30 rounded w-full" />
              <div className="h-2 bg-primary-100 dark:bg-primary-600/30 rounded w-5/6 mx-auto" />
              <div className="h-2 bg-primary-200 dark:bg-primary-600/40 rounded w-4/5 mx-auto mt-3" />
              <div className="h-2 bg-primary-100 dark:bg-primary-600/30 rounded w-full" />
            </div>
          </div>
        </div>

        {/* Página 2 */}
        <div style={pageStyle(1)} className="dark:bg-gray-700">
          <div className="w-full h-full flex flex-col justify-center items-center px-4">
            <div className="space-y-3 w-full">
              <div className="h-2 bg-primary-300 dark:bg-primary-600/50 rounded w-2/3 mx-auto" />
              <div className="h-2 bg-primary-200 dark:bg-primary-600/40 rounded w-full" />
              <div className="h-2 bg-primary-200 dark:bg-primary-600/40 rounded w-4/5 mx-auto" />
              <div className="h-2 bg-primary-100 dark:bg-primary-600/30 rounded w-full mt-3" />
              <div className="h-2 bg-primary-200 dark:bg-primary-600/40 rounded w-5/6 mx-auto" />
            </div>
          </div>
        </div>

        {/* Página 3 */}
        <div style={pageStyle(2)} className="dark:bg-gray-700">
          <div className="w-full h-full flex flex-col justify-center items-center px-4">
            <div className="space-y-3 w-full">
              <div className="h-2 bg-primary-300 dark:bg-primary-600/50 rounded w-3/5 mx-auto" />
              <div className="h-2 bg-primary-100 dark:bg-primary-600/30 rounded w-full" />
              <div className="h-2 bg-primary-200 dark:bg-primary-600/40 rounded w-5/6 mx-auto" />
              <div className="h-2 bg-primary-300 dark:bg-primary-600/50 rounded w-3/4 mx-auto mt-3" />
              <div className="h-2 bg-primary-100 dark:bg-primary-600/30 rounded w-full" />
            </div>
          </div>
        </div>

        {/* Página 4 */}
        <div style={pageStyle(3)} className="dark:bg-gray-700">
          <div className="w-full h-full flex flex-col justify-center items-center px-4">
            <div className="space-y-3 w-full">
              <div className="h-2 bg-primary-200 dark:bg-primary-600/40 rounded w-4/5 mx-auto" />
              <div className="h-2 bg-primary-300 dark:bg-primary-600/50 rounded w-full" />
              <div className="h-2 bg-primary-100 dark:bg-primary-600/30 rounded w-3/4 mx-auto" />
              <div className="h-2 bg-primary-200 dark:bg-primary-600/40 rounded w-full mt-3" />
              <div className="h-2 bg-primary-300 dark:bg-primary-600/50 rounded w-5/6 mx-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de página */}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === currentPage ? 'bg-primary w-5' : 'bg-default-300 dark:bg-default-500 w-2'
            }`}
            animate={{
              scale: i === currentPage ? 1.2 : 1,
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>

      {/* Texto */}
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
