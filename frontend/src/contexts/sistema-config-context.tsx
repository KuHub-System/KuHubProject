import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getConfiguracionSistema } from '../services/sistema/gestionSistemaService';
import { useAuth } from './auth-context';

interface SistemaConfigContextType {
  solicitudesEnPedido: boolean;
  disponibleObligatorio: boolean;
  refreshConfig: () => Promise<void>;
}

const SistemaConfigContext = createContext<SistemaConfigContextType>({
  solicitudesEnPedido: false,
  disponibleObligatorio: false,
  refreshConfig: async () => {},
});

export const SistemaConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [solicitudesEnPedido, setSolicitudesEnPedido] = useState(false);
  const [disponibleObligatorio, setDisponibleObligatorio] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await getConfiguracionSistema();
      setSolicitudesEnPedido(data.solicitudesEnPedido);
      setDisponibleObligatorio(data.disponibleObligatorio);
    } catch {
      setSolicitudesEnPedido(false);
      setDisponibleObligatorio(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConfig();
    } else {
      setSolicitudesEnPedido(false);
      setDisponibleObligatorio(false);
    }
  }, [isAuthenticated, fetchConfig]);

  return (
    <SistemaConfigContext.Provider value={{ solicitudesEnPedido, disponibleObligatorio, refreshConfig: fetchConfig }}>
      {children}
    </SistemaConfigContext.Provider>
  );
};

export const useSistemaConfig = () => useContext(SistemaConfigContext);
