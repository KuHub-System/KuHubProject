import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getConfiguracionSistema } from '../services/gestionSistemaService';
import { useAuth } from './auth-context';

interface SistemaConfigContextType {
  solicitudesEnPedido: boolean;
  refreshConfig: () => Promise<void>;
}

const SistemaConfigContext = createContext<SistemaConfigContextType>({
  solicitudesEnPedido: false,
  refreshConfig: async () => {},
});

export const SistemaConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [solicitudesEnPedido, setSolicitudesEnPedido] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await getConfiguracionSistema();
      setSolicitudesEnPedido(data.solicitudesEnPedido);
    } catch {
      setSolicitudesEnPedido(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConfig();
    } else {
      setSolicitudesEnPedido(false);
    }
  }, [isAuthenticated, fetchConfig]);

  return (
    <SistemaConfigContext.Provider value={{ solicitudesEnPedido, refreshConfig: fetchConfig }}>
      {children}
    </SistemaConfigContext.Provider>
  );
};

export const useSistemaConfig = () => useContext(SistemaConfigContext);
