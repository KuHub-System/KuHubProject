import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PageTitleContextType {
    title: string;
    subtitle: string;
    setPageTitle: (title: string, subtitle?: string) => void;
}

const PageTitleContext = createContext<PageTitleContextType | undefined>(undefined);

export const PageTitleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');

    const setPageTitle = (newTitle: string, newSubtitle: string = '') => {
        // Solo actualizamos si hay cambios para evitar re-renders innecesarios
        if (newTitle !== title || newSubtitle !== subtitle) {
            setTitle(newTitle);
            setSubtitle(newSubtitle);
        }
    };

    return (
        <PageTitleContext.Provider value={{ title, subtitle, setPageTitle }}>
            {children}
        </PageTitleContext.Provider>
    );
};

export const usePageTitleContext = () => {
    const context = useContext(PageTitleContext);
    if (context === undefined) {
        throw new Error('usePageTitleContext must be used within a PageTitleProvider');
    }
    return context;
};
