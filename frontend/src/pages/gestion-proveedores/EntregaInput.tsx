import React from 'react';

interface EntregaInputProps {
  value: number;
  esFraccionario: boolean;
  onChange: (v: number) => void;
  /** Si se provee, los botones ± disparan redistribución automática con este handler. */
  onIncrement?: (delta: number) => void;
  className?: string;
}

const EntregaInput: React.FC<EntregaInputProps> = ({ value, esFraccionario, onChange, onIncrement, className }) => {
  const inputClass = className ?? 'w-[74px] px-1 py-1 text-center rounded border border-warning-300 dark:border-warning-600/50 bg-white dark:bg-default-100/50 focus:outline-none focus:border-warning-500 font-semibold text-xs';

  // Formato visual: separador de miles = punto, decimal = coma  (ej: 1.234,567 / 1.234)
  const formatVal = (v: number): string => {
    if (v === 0) return '';
    if (esFraccionario) {
      // Elimina ceros decimales superfluos, usa coma como separador decimal
      const str = v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
      const [intPart, decPart] = str.split('.');
      const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return decPart ? `${intFmt},${decPart}` : intFmt;
    }
    return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Parse: elimina puntos de miles, convierte coma decimal → punto → número JS
  const parseVal = (raw: string): number => {
    const normalized = raw.replace(/\./g, '').replace(',', '.');
    return esFraccionario
      ? Math.round(parseFloat(normalized) * 1000) / 1000
      : parseInt(normalized, 10);
  };

  // Long press: click simple → ±step; mantener >300ms → ±stepHold cada 300ms
  const timeoutRef  = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const longActive  = React.useRef(false);

  const [localText, setLocalText] = React.useState<string>(() => formatVal(value));
  const isEditing = React.useRef(false);

  // Sincroniza el texto cuando el valor cambia desde fuera (botones +/−)
  React.useEffect(() => {
    if (!isEditing.current) setLocalText(formatVal(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearTimers = () => {
    if (timeoutRef.current)  { clearTimeout(timeoutRef.current);   timeoutRef.current  = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const handleBtnDown = (sign: 1 | -1) => {
    longActive.current = false;
    clearTimers();
    timeoutRef.current = setTimeout(() => {
      longActive.current = true;
      intervalRef.current = setInterval(() => {
        if (onIncrement) onIncrement(sign * (esFraccionario ? 0.5 : 5));
      }, 300);
    }, 300);
  };

  const handleBtnUp = () => { clearTimers(); };

  const handleBtnClick = (sign: 1 | -1) => {
    if (!longActive.current && onIncrement) onIncrement(sign * (esFraccionario ? 0.1 : 1));
    longActive.current = false;
  };

  const btnClass = 'w-5 h-6 flex items-center justify-center rounded text-xs font-bold bg-warning-100 dark:bg-warning-900/30 hover:bg-warning-200 dark:hover:bg-warning-800/40 text-warning-700 dark:text-warning-400 transition-colors select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  // type="text" para ambos tipos: permite mostrar separadores de miles y coma decimal
  const inputEl = (
    <input
      type="text"
      inputMode={esFraccionario ? 'decimal' : 'numeric'}
      value={localText}
      onChange={(e) => {
        const raw = e.target.value;
        setLocalText(raw);
        if (raw === '') { onChange(0); return; }
        const v = parseVal(raw);
        if (!isNaN(v) && v >= 0) onChange(v);
      }}
      onFocus={() => { isEditing.current = true; }}
      onBlur={() => {
        isEditing.current = false;
        setLocalText(formatVal(value));
      }}
      placeholder="0"
      className={inputClass}
    />
  );

  if (!onIncrement) return inputEl;

  return (
    <div className="flex items-center gap-0.5 justify-center">
      <button
        type="button"
        aria-label="Decrementar"
        className={btnClass}
        disabled={value === 0}
        onMouseDown={() => handleBtnDown(-1)}
        onMouseUp={handleBtnUp}
        onMouseLeave={handleBtnUp}
        onTouchStart={() => handleBtnDown(-1)}
        onTouchEnd={handleBtnUp}
        onTouchCancel={handleBtnUp}
        onClick={() => handleBtnClick(-1)}
      >
        −
      </button>
      {inputEl}
      <button
        type="button"
        aria-label="Incrementar"
        className={btnClass}
        onMouseDown={() => handleBtnDown(1)}
        onMouseUp={handleBtnUp}
        onMouseLeave={handleBtnUp}
        onTouchStart={() => handleBtnDown(1)}
        onTouchEnd={handleBtnUp}
        onTouchCancel={handleBtnUp}
        onClick={() => handleBtnClick(1)}
      >
        +
      </button>
    </div>
  );
};

export default React.memo(EntregaInput);
