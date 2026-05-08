import React from 'react';
import { ISemana, IPeriodoAcademico } from '../types/semana.types';
import {
  obtenerPeriodosAcademicosService,
  obtenerSemanasPorPeriodoService,
  detectarPeriodoActual,
  encontrarSemanaActual,
} from '../services/semana-service';
import { useAuth } from './auth-context';

interface PeriodoSemanaState {
  periodos: IPeriodoAcademico[];
  semanas: ISemana[];
  periodo: { anio: number; semestre: number } | null;
  semanaId: string;
  defaultSemanaId: string;
  isLoading: boolean;
}

interface PeriodoSemanaContextType extends PeriodoSemanaState {
  seleccionarPeriodo: (anio: number, semestre: number) => Promise<void>;
  seleccionarSemana: (semanaId: string) => void;
  recargarSemanas: () => Promise<void>;
  recargarPeriodos: () => Promise<void>;
}

const PeriodoSemanaContext = React.createContext<PeriodoSemanaContextType | undefined>(undefined);

export const usePeriodoSemana = () => {
  const ctx = React.useContext(PeriodoSemanaContext);
  if (!ctx) throw new Error('usePeriodoSemana debe usarse dentro de PeriodoSemanaProvider');
  return ctx;
};

export const PeriodoSemanaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading: authIsLoading, isAuthenticated } = useAuth();
  const [periodos, setPeriodos] = React.useState<IPeriodoAcademico[]>([]);
  const [semanas, setSemanas] = React.useState<ISemana[]>([]);
  const [periodo, setPeriodo] = React.useState<{ anio: number; semestre: number } | null>(null);
  const [semanaId, setSemanaId] = React.useState<string>('');
  const [defaultSemanaId, setDefaultSemanaId] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);

  const inicializarDatos = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const periodosData = await obtenerPeriodosAcademicosService();
      setPeriodos(periodosData);

      const { anio, semestre } = detectarPeriodoActual();
      setPeriodo({ anio, semestre });

      const intentos = [
        { anio, semestre },
        { anio, semestre: semestre === 1 ? 2 : 1 },
      ];

      let cargadas: ISemana[] = [];
      for (const intento of intentos) {
        if (
          !periodosData.some(
            (p) => p.anio === intento.anio && p.semestres.includes(intento.semestre)
          )
        )
          continue;
        try {
          cargadas = await obtenerSemanasPorPeriodoService(intento.anio, intento.semestre);
          if (cargadas.length > 0) break;
        } catch {
          /* */
        }
      }

      if (cargadas.length === 0 && periodosData.length > 0) {
        const p = periodosData[0];
        cargadas = await obtenerSemanasPorPeriodoService(p.anio, p.semestres[0]).catch(
          () => []
        );
      }

      setSemanas(cargadas);
      const actual = encontrarSemanaActual(cargadas);
      const defaultId = actual ? String(actual.idSemana) : '';
      setDefaultSemanaId(defaultId);

      // Leer del localStorage primero
      const stored = sessionStorage.getItem('kuhub_semana_id');
      setSemanaId(
        stored && cargadas.some((s) => String(s.idSemana) === stored)
          ? stored
          : defaultId || (cargadas.length > 0 ? String(cargadas[0].idSemana) : '')
      );
    } catch (err) {
      console.error('Error inicializando período y semanas:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const seleccionarPeriodo = React.useCallback(
    async (anio: number, semestre: number) => {
      setIsLoading(true);
      try {
        setPeriodo({ anio, semestre });
        const data = await obtenerSemanasPorPeriodoService(anio, semestre);
        setSemanas(data);
        const actual = encontrarSemanaActual(data);
        const defaultId = actual ? String(actual.idSemana) : '';
        setDefaultSemanaId(defaultId);

        if (data.length > 0) {
          const newSemanaId = actual ? String(actual.idSemana) : String(data[0].idSemana);
          setSemanaId(newSemanaId);
          sessionStorage.setItem('kuhub_semana_id', newSemanaId);
        } else {
          setSemanaId('');
        }
      } catch (err) {
        console.error('Error al seleccionar período:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [obtenerSemanasPorPeriodoService, encontrarSemanaActual]
  );

  const seleccionarSemana = React.useCallback((id: string) => {
    setSemanaId(id);
    sessionStorage.setItem('kuhub_semana_id', id);
  }, []);

  const recargarPeriodos = React.useCallback(async () => {
    try {
      const periodosData = await obtenerPeriodosAcademicosService();
      setPeriodos(periodosData);
    } catch (err) {
      console.error('Error recargando períodos:', err);
    }
  }, [obtenerPeriodosAcademicosService]);

  const recargarSemanas = React.useCallback(async () => {
    if (!periodo) return;
    try {
      const data = await obtenerSemanasPorPeriodoService(periodo.anio, periodo.semestre);
      setSemanas(data);
    } catch (err) {
      console.error('Error recargando semanas:', err);
    }
  }, [periodo, obtenerSemanasPorPeriodoService]);

  React.useEffect(() => {
    if (authIsLoading) {
      console.log('[PeriodoSemana] Esperando a que AuthContext termine de cargar...');
      return;
    }

    if (!isAuthenticated) {
      console.log('[PeriodoSemana] Usuario no autenticado, no cargando semanas.');
      setIsLoading(false);
      return;
    }

    console.log('[PeriodoSemana] Auth completada, inicializando datos de períodos y semanas.');
    inicializarDatos();
  }, [authIsLoading, isAuthenticated, inicializarDatos]);

  const value: PeriodoSemanaContextType = {
    periodos,
    semanas,
    periodo,
    semanaId,
    defaultSemanaId,
    isLoading,
    seleccionarPeriodo,
    seleccionarSemana,
    recargarSemanas,
    recargarPeriodos,
  };

  return (
    <PeriodoSemanaContext.Provider value={value}>{children}</PeriodoSemanaContext.Provider>
  );
};

export default PeriodoSemanaProvider;
