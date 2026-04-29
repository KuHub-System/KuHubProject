import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface LoadingBookAnimationProps {
  pageCount?: number;
  pageChangeInterval?: number;
  message?: string;
  subMessage?: string;
  size?: 'small' | 'medium' | 'large';
  showPageIndicators?: boolean;
}

const SIZE_CONFIG = {
  small:  { width: 280, height: 140 },
  medium: { width: 420, height: 210 },
  large:  { width: 560, height: 280 },
};

// ─── Líneas decorativas dentro de cada página ──────────────────────────────
const PageLines: React.FC<{ seed: number }> = ({ seed }) => {
  const patterns = [
    ['w-3/4', 'w-full', 'w-5/6', 'w-4/5', 'w-2/3'],
    ['w-full', 'w-4/5', 'w-full', 'w-3/4', 'w-5/6'],
    ['w-5/6', 'w-3/4', 'w-full', 'w-full', 'w-4/5'],
    ['w-4/5', 'w-full', 'w-2/3', 'w-5/6', 'w-full'],
  ];
  const widths = patterns[seed % patterns.length];

  return (
    <div className="w-full space-y-3 px-6">
      {/* Título simulado */}
      <div className="h-4 bg-primary-400 dark:bg-primary-500/60 rounded w-2/3 mx-auto mb-6" />
      {widths.map((w, i) => (
        <div key={i} className={`h-3 bg-primary-200 dark:bg-primary-600/40 rounded ${w}`} />
      ))}
      {/* Párrafo 2 */}
      <div className="h-3 bg-primary-300 dark:bg-primary-600/50 rounded w-full mt-6" />
      {widths.slice(0, 3).map((w, i) => (
        <div key={`p2-${i}`} className={`h-3 bg-primary-200 dark:bg-primary-600/40 rounded ${w}`} />
      ))}
    </div>
  );
};

// ─── Una sola página con volteo 3D ─────────────────────────────────────────
const BookPage: React.FC<{
  pageIndex: number;
  isFlipping: boolean;
  bookWidth: number;
  bookHeight: number;
}> = ({ pageIndex, isFlipping, bookWidth, bookHeight }) => {
  const halfW = bookWidth / 2;

  return (
    <div
      style={{
        perspective: '1200px',
        perspectiveOrigin: '0% 50%',
      }}
    >
      <motion.div
        style={{
          width: halfW,
          height: bookHeight,
          transformStyle: 'preserve-3d',
          transformOrigin: '0% 50%',
        }}
        animate={{
          rotateY: isFlipping ? 180 : 0,
        }}
        transition={{
          duration: 0.7,
          ease: 'easeInOut',
        }}
      >
        {/* Cara FRONTAL de la página */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          className="absolute w-full h-full bg-white dark:bg-gray-800 flex items-center justify-center border-r border-primary-200 dark:border-primary-700/30"
        >
          <PageLines seed={pageIndex} />
        </div>

        {/* Cara TRASERA de la página (se ve al voltear) */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          className="absolute w-full h-full bg-white dark:bg-gray-800 flex items-center justify-center border-r border-primary-200 dark:border-primary-700/30"
        >
          <PageLines seed={pageIndex + 10} />
        </div>
      </motion.div>
    </div>
  );
};

// ─── Sombra dinámica mientras voltea ───────────────────────────────────────
const FlipShadow: React.FC<{ isFlipping: boolean; bookWidth: number; bookHeight: number }> = ({
  isFlipping,
  bookWidth,
  bookHeight,
}) => (
  <AnimatePresence>
    {isFlipping && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'absolute',
          width: bookWidth / 2,
          height: bookHeight,
          background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 100%)',
          pointerEvents: 'none',
          zIndex: 30,
        }}
      />
    )}
  </AnimatePresence>
);

// ─── Componente principal ──────────────────────────────────────────────────
const LoadingBookAnimation: React.FC<LoadingBookAnimationProps> = ({
  pageCount = 5,
  pageChangeInterval = 1000,
  message = 'Cargando datos',
  subMessage = 'Por favor espera...',
  size = 'medium',
  showPageIndicators = true,
}) => {
  const [currentPage, setCurrentPage] = React.useState(0);
  const [flippingPage, setFlippingPage] = React.useState<number | null>(null);

  const { width: bookWidth, height: bookHeight } = SIZE_CONFIG[size];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setFlippingPage(currentPage);

      // Después de medio flip, cambia el contenido de la página izquierda
      const contentTimer = setTimeout(() => {
        setCurrentPage((prev) => (prev + 1) % pageCount);
      }, 350);

      // Limpia el estado de "volteando" al terminar
      const endTimer = setTimeout(() => {
        setFlippingPage(null);
      }, 700);

      return () => {
        clearTimeout(contentTimer);
        clearTimeout(endTimer);
      };
    }, pageChangeInterval);

    return () => clearInterval(interval);
  }, [currentPage, pageCount, pageChangeInterval]);

  const nextPage = (currentPage + 1) % pageCount;

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      {/* ── Libro ── */}
      <div
        style={{
          width: bookWidth,
          height: bookHeight,
          perspective: '1200px',
        }}
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden border-2 border-primary dark:border-primary-600"
      >
        {/* Tapa / fondo del libro */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-gray-700 dark:to-gray-800"
          style={{ zIndex: 1 }}
        />

        {/* Página izquierda (estática, ya leída) */}
        <div
          style={{
            width: bookWidth / 2,
            height: bookHeight,
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 5,
          }}
        >
          <PageLines seed={currentPage} />
        </div>

        {/* Página derecha estática (la que está "debajo" de la que voltea) */}
        <div
          style={{
            width: bookWidth / 2,
            height: bookHeight,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 5,
          }}
        >
          <PageLines seed={nextPage} />
        </div>

        {/* Página que voltea */}
        <div style={{ position: 'absolute', left: bookWidth / 2, top: 0, zIndex: 15 }}>
          <BookPage
            pageIndex={nextPage}
            isFlipping={flippingPage === currentPage}
            bookWidth={bookWidth}
            bookHeight={bookHeight}
          />
        </div>

        {/* Sombra de volteo */}
        <FlipShadow isFlipping={flippingPage === currentPage} bookWidth={bookWidth} bookHeight={bookHeight} />

        {/* Lomo central */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: '1px',
            background: 'linear-gradient(180deg, #FFB800 0%, #FF9800 100%)',
            transform: 'translateX(-50%)',
            zIndex: 20,
          }}
        />

        {/* Sombra inferior del libro */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)',
            zIndex: 2,
          }}
        />
      </div>

      {/* ── Indicadores de página ── */}
      {showPageIndicators && (
        <div className="flex gap-2">
          {Array.from({ length: pageCount }).map((_, i) => (
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
      )}

      {/* ── Textos ── */}
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

export default LoadingBookAnimation;
