import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Spinner,
  Select,
  SelectItem,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { useToast } from '../../hooks/useToast';
import {
  enviarMensajeIaService,
  IMensajeIa,
  MODELOS_IA,
  MODELO_POR_DEFECTO,
} from '../../services/ia-service';

interface IaChatModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se invoca cuando la IA responde estando el modal cerrado (para el badge de no leídos). */
  onMensajeNoLeido?: () => void;
}

/** Mensaje en pantalla: extiende el del backend con la hora (solo visual, no se envía). */
interface IMensajeChat extends IMensajeIa {
  /** Hora local de creación en formato HH:mm. */
  hora: string;
  /** Marca el saludo inicial para no enviarlo al backend. */
  bienvenida?: boolean;
  /** Aviso del sistema (ej: cambio de modelo); centrado y tampoco se envía al backend. */
  sistema?: boolean;
}

/** Hora local actual en formato HH:mm (24 h). */
const horaActual = (): string =>
  new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

const TEXTO_BIENVENIDA = '¡Hola! Soy el asistente de KüHub. ¿En qué puedo ayudarte hoy?';

/** Construye el mensaje de bienvenida con la hora del momento en que se abre/limpia el chat. */
const crearBienvenida = (): IMensajeChat => ({
  rol: 'assistant',
  contenido: TEXTO_BIENVENIDA,
  hora: horaActual(),
  bienvenida: true,
});

const IaChatModal: React.FC<IaChatModalProps> = ({ isOpen, onOpenChange, onMensajeNoLeido }) => {
  const toast = useToast();
  const [mensajes, setMensajes] = React.useState<IMensajeChat[]>(() => [crearBienvenida()]);
  const [input, setInput] = React.useState('');
  const [cargando, setCargando] = React.useState(false);
  const [modelo, setModelo] = React.useState<string>(MODELO_POR_DEFECTO);
  const finRef = React.useRef<HTMLDivElement>(null);

  // Metadatos del modelo elegido (tiempo promedio, nombre) para informar al usuario.
  const modeloActual =
    MODELOS_IA.find(m => m.id === modelo) ?? MODELOS_IA[0];

  /** Cambia el modelo activo e inserta un aviso centrado en la conversación. */
  const cambiarModelo = (nuevo: string) => {
    if (!nuevo || nuevo === modelo) return;
    const cfg = MODELOS_IA.find(m => m.id === nuevo);
    setModelo(nuevo);
    setMensajes(prev => [
      ...prev,
      {
        rol: 'assistant',
        contenido: `Modelo cambiado a ${cfg?.nombre ?? nuevo}`,
        hora: horaActual(),
        sistema: true,
      },
    ]);
  };

  // Ref que refleja siempre el isOpen actual: evita un closure obsoleto dentro de enviar()
  // cuando el usuario manda el mensaje y cierra el modal antes de que llegue la respuesta.
  const isOpenRef = React.useRef(isOpen);
  React.useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Auto-scroll al último mensaje al llegar mensajes nuevos (suave).
  React.useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  // Al abrir el chat, posicionarse abajo (en lo más reciente) de forma instantánea.
  // El pequeño retardo espera a que HeroUI monte el contenido del modal.
  React.useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => finRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
    return () => clearTimeout(t);
  }, [isOpen]);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || cargando) return;

    const historial: IMensajeChat[] = [...mensajes, { rol: 'user', contenido: texto, hora: horaActual() }];
    setMensajes(historial);
    setInput('');
    setCargando(true);

    try {
      // Al backend solo va { rol, contenido }: se descarta la bienvenida y la hora (campos visuales).
      const paraEnviar: IMensajeIa[] = historial
        .filter(m => !m.bienvenida && !m.sistema)
        .map(({ rol, contenido }) => ({ rol, contenido }));
      const { respuesta } = await enviarMensajeIaService(paraEnviar, modelo);
      setMensajes(prev => [...prev, { rol: 'assistant', contenido: respuesta, hora: horaActual() }]);
      // Si el usuario cerró el modal mientras la IA respondía, avisar para el badge de no leídos.
      if (!isOpenRef.current) onMensajeNoLeido?.();
    } catch {
      toast.error('No se pudo obtener respuesta del asistente. Intenta nuevamente.');
      setMensajes(prev => [
        ...prev,
        {
          rol: 'assistant',
          contenido: 'Lo siento, no pude responder en este momento. Intenta de nuevo.',
          hora: horaActual(),
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  const limpiar = () => {
    setMensajes([crearBienvenida()]);
    setInput('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="lg"
      backdrop="blur"
      radius="lg"
      scrollBehavior="inside"
      classNames={{ base: 'rounded-2xl', body: 'min-h-[400px] max-h-[60vh]' }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2 border-b border-default-100">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 shrink-0">
                <Icon icon="lucide:sparkles" width={18} className="text-primary" />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold text-secondary dark:text-foreground leading-none">
                  Asistente KüHub
                </span>
                <span className="text-[11px] text-default-400">
                  IA local · tiempo promedio {modeloActual.tiempoPromedio}
                </span>
              </div>
              <Select
                size="sm"
                aria-label="Modelo de IA"
                selectedKeys={[modelo]}
                onSelectionChange={(keys) => {
                  const k = Array.from(keys)[0] as string | undefined;
                  if (k) cambiarModelo(k);
                }}
                isDisabled={cargando}
                disallowEmptySelection
                className="ml-auto max-w-[170px]"
                classNames={{ trigger: 'h-9 min-h-9' }}
              >
                {MODELOS_IA.map(m => (
                  <SelectItem
                    key={m.id}
                    textValue={m.nombre}
                    description={`${m.descripcion} · ${m.tiempoPromedio}`}
                  >
                    {m.nombre}
                  </SelectItem>
                ))}
              </Select>
            </ModalHeader>

            <ModalBody className="py-4">
              <div className="flex flex-col gap-3">
                {mensajes.map((m, i) =>
                  m.sistema ? (
                    <div key={i} className="flex justify-center">
                      <span className="text-[11px] italic text-default-400 opacity-50 text-center px-3">
                        {m.contenido} · {m.hora}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={i}
                      className={`flex ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                          m.rol === 'user'
                            ? 'bg-primary text-secondary rounded-br-sm'
                            : 'bg-default-100 dark:bg-default-50 text-secondary dark:text-foreground rounded-bl-sm'
                        }`}
                      >
                        {m.contenido}
                        <span
                          className={`block mt-1 text-[10px] leading-none opacity-60 ${
                            m.rol === 'user' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {m.hora}
                        </span>
                      </div>
                    </div>
                  ),
                )}

                {cargando && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 bg-default-100 dark:bg-default-50 rounded-2xl rounded-bl-sm px-3.5 py-2">
                      <Spinner size="sm" color="warning" />
                      <span className="text-xs text-default-500">
                        Cocinando... <span className="text-default-400">({modeloActual.tiempoPromedio})</span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={finRef} />
              </div>
            </ModalBody>

            <ModalFooter className="flex-col gap-2 border-t border-default-100">
              <div className="flex items-end gap-2 w-full">
                <Input
                  value={input}
                  onValueChange={setInput}
                  onKeyDown={onKeyDown}
                  placeholder="Escribe tu pregunta..."
                  variant="bordered"
                  radius="lg"
                  isDisabled={cargando}
                  autoFocus
                  className="flex-1"
                />
                <Button
                  isIconOnly
                  color="primary"
                  radius="lg"
                  aria-label="Enviar"
                  isDisabled={cargando || !input.trim()}
                  onPress={enviar}
                >
                  <Icon icon="lucide:send" width={18} />
                </Button>
              </div>
              <div className="flex items-center justify-between w-full">
                <Button size="sm" variant="light" onPress={limpiar} className="text-default-400">
                  <Icon icon="lucide:eraser" width={14} />
                  Limpiar
                </Button>
                <Button size="sm" variant="light" onPress={onClose} className="text-default-500">
                  Cerrar
                </Button>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default IaChatModal;
