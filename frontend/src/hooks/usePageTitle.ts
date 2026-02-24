import { useEffect } from 'react';
import { usePageTitleContext } from '../contexts/PageTitleContext';

/**
 * Hook para establecer el título y subtítulo de la página actual en el Header.
 * @param title Título principal de la página
 * @param subtitle Subtítulo o descripción breve (opcional)
 */
export const usePageTitle = (title: string, subtitle: string = '') => {
    const { setPageTitle } = usePageTitleContext();

    useEffect(() => {
        setPageTitle(title, subtitle);

        // Opcional: Limpiar el título al desmontar? 
        // Por lo general no es necesario ya que la siguiente página sobrescribirá el título,
        // pero si queremos que vuelva a un estado "neutro" podríamos hacerlo.
        // return () => setPageTitle(''); 
    }, [title, subtitle, setPageTitle]);
};
