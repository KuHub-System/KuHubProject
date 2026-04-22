import { useEffect } from 'react';
import { usePageTitleContext } from '../contexts/PageTitleContext';

/**
 * Hook para establecer el título, subtítulo e ícono de la página actual en el Header.
 * @param title Título principal de la página
 * @param subtitle Subtítulo o descripción breve (opcional)
 * @param icon Ícono de Iconify para mostrar junto al título (opcional)
 */
export const usePageTitle = (title: string, subtitle: string = '', icon: string = '') => {
    const { setPageTitle } = usePageTitleContext();

    useEffect(() => {
        setPageTitle(title, subtitle, icon);
    }, [title, subtitle, icon, setPageTitle]);
};
