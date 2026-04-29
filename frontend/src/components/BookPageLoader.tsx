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

  React.useEffect(() => {
    let currentPage = 0;
    const interval = setInterval(() => {
      if (bookRef.current) {
        try {
          const pageFlip = bookRef.current.pageFlip();
          currentPage = (currentPage + 1) % 4;
          pageFlip.turnToPage(currentPage);
        } catch (e) {
          // Silently handle any errors during page flipping
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      {/* Libro animado - tamaño pequeño */}
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
          maxShadowOpacity={0.5}
          flippingTime={800}
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
          <div className="w-full h-full bg-white dark:bg-gray-800 border border-default-200 dark:border-default-100 flex items-center justify-center p-3 rounded-sm">
            <div className="space-y-2 w-full">
              <div className="h-2 bg-primary-200 dark:bg-primary-700/40 rounded w-3/4 mx-auto" />
              <div className="h-2 bg-primary-100 dark:bg-primary-700/30 rounded w-full" />
              <div className="h-2 bg-primary-100 dark:bg-primary-700/30 rounded w-5/6 mx-auto" />
              <div className="h-2 bg-primary-200 dark:bg-primary-700/40 rounded w-4/5 mx-auto mt-4" />
              <div className="h-2 bg-primary-100 dark:bg-primary-700/30 rounded w-full" />
            </div>
          </div>

          {/* Página 2 */}
          <div className="w-full h-full bg-white dark:bg-gray-800 border border-default-200 dark:border-default-100 flex items-center justify-center p-3 rounded-sm">
            <div className="space-y-2 w-full">
              <div className="h-2 bg-primary-300 dark:bg-primary-700/50 rounded w-2/3 mx-auto" />
              <div className="h-2 bg-primary-200 dark:bg-primary-700/40 rounded w-full" />
              <div className="h-2 bg-primary-200 dark:bg-primary-700/40 rounded w-4/5 mx-auto" />
              <div className="h-2 bg-primary-100 dark:bg-primary-700/30 rounded w-full mt-4" />
              <div className="h-2 bg-primary-200 dark:bg-primary-700/40 rounded w-5/6 mx-auto" />
            </div>
          </div>

          {/* Página 3 */}
          <div className="w-full h-full bg-white dark:bg-gray-800 border border-default-200 dark:border-default-100 flex items-center justify-center p-3 rounded-sm">
            <div className="space-y-2 w-full">
              <div className="h-2 bg-primary-300 dark:bg-primary-700/50 rounded w-3/5 mx-auto" />
              <div className="h-2 bg-primary-100 dark:bg-primary-700/30 rounded w-full" />
              <div className="h-2 bg-primary-200 dark:bg-primary-700/40 rounded w-5/6 mx-auto" />
              <div className="h-2 bg-primary-300 dark:bg-primary-700/50 rounded w-3/4 mx-auto mt-4" />
              <div className="h-2 bg-primary-100 dark:bg-primary-700/30 rounded w-full" />
            </div>
          </div>

          {/* Página 4 */}
          <div className="w-full h-full bg-white dark:bg-gray-800 border border-default-200 dark:border-default-100 flex items-center justify-center p-3 rounded-sm">
            <div className="space-y-2 w-full">
              <div className="h-2 bg-primary-200 dark:bg-primary-700/40 rounded w-4/5 mx-auto" />
              <div className="h-2 bg-primary-300 dark:bg-primary-700/50 rounded w-full" />
              <div className="h-2 bg-primary-100 dark:bg-primary-700/30 rounded w-3/4 mx-auto" />
              <div className="h-2 bg-primary-200 dark:bg-primary-700/40 rounded w-full mt-4" />
              <div className="h-2 bg-primary-300 dark:bg-primary-700/50 rounded w-5/6 mx-auto" />
            </div>
          </div>
        </HTMLFlipBook>
      </div>

      {/* Texto */}
      <div className="text-center">
        <p className="text-base font-bold text-secondary dark:text-foreground">
          {message}
        </p>
        <motion.p
          className="text-xs text-default-500 mt-2"
          animate={{ opacity: [0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
        >
          {subMessage}
        </motion.p>
      </div>
    </div>
  );
};

export default BookPageLoader;
