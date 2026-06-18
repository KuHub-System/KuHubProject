import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { useToast } from '../../hooks/useToast';
import {
  enviarTicketSoporte,
  TipoEquipo,
  TipoErrorSoporte,
} from '../../services/soporte-service';

interface SoporteModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Opciones del selector de equipo. */
const EQUIPOS: { key: TipoEquipo; label: string; icon: string }[] = [
  { key: 'NOTEBOOK', label: 'Notebook', icon: 'lucide:laptop' },
  { key: 'DESKTOP', label: 'Computador de escritorio', icon: 'lucide:monitor' },
  { key: 'TABLET', label: 'Tablet', icon: 'lucide:tablet' },
  { key: 'OTRO', label: 'Otro (especificar)', icon: 'lucide:help-circle' },
];

/** Opciones del selector de sistema operativo. */
const SISTEMAS_OPERATIVOS = ['Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Otro'];

/** Opciones del selector de tipo de error. */
const TIPOS_ERROR: { key: TipoErrorSoporte; label: string; icon: string; desc: string }[] = [
  { key: 'VISUAL', label: 'Error visual / interfaz', icon: 'lucide:paintbrush', desc: 'Algo se ve mal: colores, desalineado, texto encimado.' },
  { key: 'RENDERIZADO', label: 'No se adapta a la pantalla', icon: 'lucide:scaling', desc: 'El contenido se corta o no se ajusta al tamaño de la pantalla.' },
  { key: 'FUNCIONALIDAD', label: 'Funcionalidad no responde', icon: 'lucide:mouse-pointer-click', desc: 'Un botón o acción no hace nada o da error.' },
  { key: 'DATOS_INCORRECTOS', label: 'Datos incorrectos', icon: 'lucide:database', desc: 'La información mostrada o calculada está equivocada.' },
  { key: 'LENTITUD_SUGERENCIA', label: 'Lentitud / sugerencia', icon: 'lucide:gauge', desc: 'Rendimiento lento o una propuesta de mejora.' },
];

/** Detecta el sistema operativo a partir del userAgent para prellenar el selector. */
const detectarSO = (): string => {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return '';
};

/** Sugiere el tipo de equipo según el userAgent. */
const detectarEquipo = (): TipoEquipo | '' => {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return 'TABLET';
  if (/Android(?!.*Mobile)/i.test(ua)) return 'TABLET';
  if (/Mobile|iPhone|Android/i.test(ua)) return 'OTRO';
  return '';
};

const SoporteModal: React.FC<SoporteModalProps> = ({ isOpen, onOpenChange }) => {
  const toast = useToast();

  const [tipoEquipo, setTipoEquipo] = React.useState<string>('');
  const [equipoOtro, setEquipoOtro] = React.useState('');
  const [sistemaOperativo, setSistemaOperativo] = React.useState<string>('');
  const [soOtro, setSoOtro] = React.useState('');
  const [tipoError, setTipoError] = React.useState<string>('');
  const [descripcion, setDescripcion] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);

  // Prellenar equipo y SO detectados al abrir el modal
  React.useEffect(() => {
    if (isOpen) {
      setSistemaOperativo(prev => prev || detectarSO());
      setTipoEquipo(prev => prev || detectarEquipo());
    }
  }, [isOpen]);

  const resetForm = () => {
    setTipoEquipo('');
    setEquipoOtro('');
    setSistemaOperativo('');
    setSoOtro('');
    setTipoError('');
    setDescripcion('');
  };

  const soFinal = sistemaOperativo === 'Otro' ? soOtro.trim() : sistemaOperativo;

  const formularioValido =
    !!tipoEquipo &&
    (tipoEquipo !== 'OTRO' || equipoOtro.trim().length > 0) &&
    !!soFinal &&
    !!tipoError &&
    descripcion.trim().length >= 10;

  const handleEnviar = async () => {
    if (!formularioValido) {
      toast.warning('Completa todos los campos. La descripción debe tener al menos 10 caracteres.');
      return;
    }

    setIsSending(true);
    try {
      await enviarTicketSoporte({
        tipoEquipo: tipoEquipo as TipoEquipo,
        ...(tipoEquipo === 'OTRO' && { equipoOtro: equipoOtro.trim() }),
        sistemaOperativo: soFinal,
        tipoError: tipoError as TipoErrorSoporte,
        descripcion: descripcion.trim(),
        urlOrigen: window.location.pathname,
      });
      toast.success('¡Gracias! Tu reporte fue enviado correctamente.');
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'No se pudo enviar el reporte. Intenta nuevamente.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="lg"
      scrollBehavior="inside"
      isDismissable={!isSending}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-3 py-4 border-b border-default-100">
              <div className="p-2 bg-primary/10 rounded-full">
                <Icon icon="lucide:life-buoy" className="text-primary text-xl" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-secondary dark:text-foreground">Soporte y mejoras</h2>
                <p className="text-xs text-default-500">
                  Cuéntanos cualquier error que encuentres. Tu reporte nos ayuda a mejorar KüHub.
                </p>
              </div>
            </ModalHeader>

            <ModalBody className="py-6">
              <div className="flex flex-col gap-4">
                {/* Equipo */}
                <Select
                  label="¿Qué equipo estás usando?"
                  placeholder="Selecciona tu equipo"
                  selectedKeys={tipoEquipo ? [tipoEquipo] : []}
                  onSelectionChange={(keys) => setTipoEquipo(Array.from(keys)[0] as string)}
                  variant="bordered"
                  isRequired
                >
                  {EQUIPOS.map((eq) => (
                    <SelectItem key={eq.key} textValue={eq.label} startContent={<Icon icon={eq.icon} width={16} />}>
                      {eq.label}
                    </SelectItem>
                  ))}
                </Select>

                {tipoEquipo === 'OTRO' && (
                  <Input
                    label="Especifica tu equipo"
                    placeholder="Ej: Smart TV, kiosco táctil, etc."
                    value={equipoOtro}
                    onValueChange={setEquipoOtro}
                    variant="bordered"
                    isRequired
                  />
                )}

                {/* Sistema operativo */}
                <Select
                  label="Sistema operativo"
                  placeholder="Selecciona el sistema operativo"
                  selectedKeys={sistemaOperativo ? [sistemaOperativo] : []}
                  onSelectionChange={(keys) => setSistemaOperativo(Array.from(keys)[0] as string)}
                  variant="bordered"
                  isRequired
                >
                  {SISTEMAS_OPERATIVOS.map((so) => (
                    <SelectItem key={so} textValue={so}>{so}</SelectItem>
                  ))}
                </Select>

                {sistemaOperativo === 'Otro' && (
                  <Input
                    label="Especifica el sistema operativo"
                    placeholder="Ej: ChromeOS, etc."
                    value={soOtro}
                    onValueChange={setSoOtro}
                    variant="bordered"
                    isRequired
                  />
                )}

                {/* Tipo de error */}
                <Select
                  label="¿Qué tipo de error surgió?"
                  placeholder="Selecciona el tipo de problema"
                  selectedKeys={tipoError ? [tipoError] : []}
                  onSelectionChange={(keys) => setTipoError(Array.from(keys)[0] as string)}
                  variant="bordered"
                  isRequired
                >
                  {TIPOS_ERROR.map((te) => (
                    <SelectItem
                      key={te.key}
                      textValue={te.label}
                      description={te.desc}
                      startContent={<Icon icon={te.icon} width={16} />}
                    >
                      {te.label}
                    </SelectItem>
                  ))}
                </Select>

                {/* Descripción */}
                <Textarea
                  label="Describe el problema"
                  placeholder="Cuéntanos qué ocurrió, qué esperabas que pasara y en qué pantalla estabas..."
                  value={descripcion}
                  onValueChange={setDescripcion}
                  variant="bordered"
                  minRows={4}
                  maxRows={8}
                  isRequired
                  description={`${descripcion.trim().length}/10 caracteres mínimos`}
                />
              </div>
            </ModalBody>

            <ModalFooter className="border-t border-default-100">
              <Button variant="light" onPress={onClose} isDisabled={isSending}>
                Cancelar
              </Button>
              <Button
                color="primary"
                className="font-bold"
                onPress={handleEnviar}
                isLoading={isSending}
                isDisabled={!formularioValido}
                startContent={!isSending && <Icon icon="lucide:send" width={16} />}
              >
                Enviar reporte
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default SoporteModal;
