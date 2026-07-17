import React from 'react';
import {
  Button,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import {
  IProveedor,
  IProveedorCreateDTO,
  IProveedorUpdateDTO,
  EstadoProveedor,
  IDiaEntregaDTO,
  DiaSemana,
} from '../../types/proveedor/proveedor.types';
import { DIAS_SEMANA_OPTIONS } from './constants';
import { renderEstado } from './ui-helpers';

interface FormularioProveedorProps {
  proveedor: IProveedor | null;
  mode: 'crear' | 'editar' | 'ver';
  onClose: () => void;
  onSave: (dto: IProveedorCreateDTO | IProveedorUpdateDTO) => Promise<void>;
}

const FormularioProveedor: React.FC<FormularioProveedorProps> = ({
  proveedor,
  mode,
  onClose,
  onSave,
}) => {
  const [nombreDistribuidora, setNombreDistribuidora] = React.useState(proveedor?.nombreDistribuidora || '');
  const [nombreProveedor, setNombreProveedor] = React.useState(proveedor?.nombreProveedor || '');
  const [telefonoProveedor, setTelefonoProveedor] = React.useState(proveedor?.telefonoProveedor || '');
  const [emailProveedor, setEmailProveedor] = React.useState(proveedor?.emailProveedor || '');
  const [direccionProveedor, setDireccionProveedor] = React.useState((proveedor as any)?.direccionProveedor || '');
  const [rutProveedor, setRutProveedor] = React.useState(proveedor?.rutProveedor || '');
  const [estadoProveedor, setEstadoProveedor] = React.useState<EstadoProveedor>(
    proveedor?.estadoProveedor || 'DISPONIBLE'
  );
  const [diasEntrega, setDiasEntrega] = React.useState<IDiaEntregaDTO[]>([]);
  const [diaSeleccionado, setDiaSeleccionado] = React.useState<DiaSemana>('LUNES');
  const [horaInicio, setHoraInicio] = React.useState('');
  const [horaFin, setHoraFin] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // ── Modal reemplazar día de entrega ──
  const [isReemplazarModal, setIsReemplazarModal] = React.useState(false);
  const [diaReemplazar, setDiaReemplazar] = React.useState<IDiaEntregaDTO | null>(null);

  const isReadOnly = mode === 'ver';

  React.useEffect(() => {
    if (proveedor && (mode === 'editar' || mode === 'ver')) {
      const prov = proveedor as any;
      if (prov.diasEntrega && Array.isArray(prov.diasEntrega)) {
        const diasConvertidos = prov.diasEntrega.map((dia: any) => ({
          diaSemana: dia.diaSemana,
          horaInicio: dia.horaInicioEntrega ? dia.horaInicioEntrega.slice(0, 5) : undefined,
          horaFin: dia.horaFinEntrega ? dia.horaFinEntrega.slice(0, 5) : undefined,
        }));
        setDiasEntrega(diasConvertidos);
      }
    }
  }, [proveedor, mode]);

  const handleSubmit = async () => {
    setError(null);

    if (!rutProveedor.trim()) {
      setError('El RUT del proveedor es obligatorio');
      return;
    }
    if (!nombreDistribuidora.trim()) {
      setError('El nombre de la distribuidora es obligatorio');
      return;
    }
    if (!nombreProveedor.trim()) {
      setError('El nombre del contacto es obligatorio');
      return;
    }
    if (!telefonoProveedor.trim()) {
      setError('El teléfono es obligatorio');
      return;
    }
    if (!emailProveedor.trim()) {
      setError('El email del proveedor es obligatorio');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailProveedor)) {
      setError('El email no tiene un formato válido');
      return;
    }

    const dto: IProveedorCreateDTO = {
      rutProveedor: rutProveedor.trim(),
      nombreDistribuidora: nombreDistribuidora.trim(),
      nombreProveedor: nombreProveedor.trim(),
      telefonoProveedor: telefonoProveedor.trim(),
      emailProveedor: emailProveedor.trim(),
      direccionProveedor: direccionProveedor.trim() ? direccionProveedor.trim() : undefined,
      estadoProveedor,
      diasEntrega: diasEntrega.length > 0 ? diasEntrega : undefined,
    };

    setSaving(true);
    try {
      await onSave(dto);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  const agregarDiaEntrega = () => {
    if (!diaSeleccionado) {
      setError('Selecciona un día de la semana');
      return;
    }

    // Validar horas si se proporcionan
    if (horaInicio && horaFin) {
      if (horaInicio >= horaFin) {
        setError('La hora de inicio debe ser menor a la hora de fin');
        return;
      }
    }

    const nuevoDia: IDiaEntregaDTO = {
      diaSemana: diaSeleccionado,
      horaInicio: horaInicio || undefined,
      horaFin: horaFin || undefined,
    };

    // Validar que no exista duplicado
    const diaExistente = diasEntrega.find(d => d.diaSemana === diaSeleccionado);
    if (diaExistente) {
      setDiaReemplazar(nuevoDia);
      setIsReemplazarModal(true);
      return;
    }

    setDiasEntrega([...diasEntrega, nuevoDia]);
    setHoraInicio('');
    setHoraFin('');
    setError(null);
  };

  const confirmarReemplazarDia = () => {
    if (!diaReemplazar) return;

    setDiasEntrega(
      diasEntrega.map(d =>
        d.diaSemana === diaReemplazar.diaSemana ? diaReemplazar : d
      )
    );
    setHoraInicio('');
    setHoraFin('');
    setError(null);
    setIsReemplazarModal(false);
    setDiaReemplazar(null);
  };

  const eliminarDiaEntrega = (index: number) => {
    setDiasEntrega(diasEntrega.filter((_, i) => i !== index));
  };

  return (
    <>
      <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-secondary/10 to-secondary/5 dark:from-secondary/20 dark:to-secondary/10 px-6 py-4">
        <div className="flex items-center gap-3 w-full">
          <div className={`p-2 rounded-lg ${mode === 'crear' ? 'bg-success/20' : mode === 'editar' ? 'bg-warning/20' : 'bg-secondary/20'}`}>
            <Icon
              icon={
                mode === 'crear'
                  ? 'lucide:plus-circle'
                  : mode === 'editar'
                  ? 'lucide:edit-3'
                  : 'lucide:building-2'
              }
              className={mode === 'crear' ? 'text-success' : mode === 'editar' ? 'text-warning' : 'text-secondary'}
              width={20}
            />
          </div>
          <span className="font-bold text-lg text-secondary dark:text-foreground">
            {mode === 'crear'
              ? 'Nuevo Proveedor'
              : mode === 'editar'
              ? 'Editar Proveedor'
              : 'Detalle del Proveedor'}
          </span>
        </div>
      </ModalHeader>

      <ModalBody className="gap-3 py-4 overflow-y-scroll custom-scrollbar">
        {error && (
          <div className="flex items-center gap-2 bg-danger-50 dark:bg-danger-50/10 text-danger text-sm p-3 rounded-lg">
            <Icon icon="lucide:alert-circle" width={16} />
            {error}
          </div>
        )}

        <div className="space-y-1">
          <Input
            label="Nombre Distribuidora"
            placeholder="Ej: Distribuidora Central S.A."
            value={nombreDistribuidora}
            onValueChange={(val) => setNombreDistribuidora(val.slice(0, 100))}
            isReadOnly={isReadOnly}
            variant="bordered"
            isRequired={!isReadOnly}
            maxLength={100}
          />
          <p className="text-xs text-default-400 text-right">{nombreDistribuidora.length}/100</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Input
              label="Nombre Contacto"
              placeholder="Ej: Juan Pérez"
              value={nombreProveedor}
              onValueChange={(val) => setNombreProveedor(val.slice(0, 100))}
              isReadOnly={isReadOnly}
              variant="bordered"
              isRequired={!isReadOnly}
              maxLength={100}
            />
            <p className="text-xs text-default-400 text-right">{nombreProveedor.length}/100</p>
          </div>
          <div className="space-y-1">
            <Input
              label="Teléfono"
              placeholder="Ej: +56 9 1234 5678"
              value={telefonoProveedor}
              onValueChange={(val) => setTelefonoProveedor(val.slice(0, 20))}
              isReadOnly={isReadOnly}
              variant="bordered"
              isRequired={!isReadOnly}
              maxLength={20}
            />
            <p className="text-xs text-default-400 text-right">{telefonoProveedor.length}/20</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Input
              label="RUT"
              placeholder="Ej: 12.345.678-9"
              value={rutProveedor}
              onValueChange={(val) => setRutProveedor(val.slice(0, 13))}
              isReadOnly={isReadOnly}
              variant="bordered"
              maxLength={13}
              isRequired={!isReadOnly}
            />
            <p className="text-xs text-default-400 text-right">{rutProveedor.length}/13</p>
          </div>
          <div className="space-y-1">
            <Input
              label="Email"
              placeholder="Ej: contacto@empresa.cl"
              value={emailProveedor}
              onValueChange={(val) => setEmailProveedor(val.slice(0, 150))}
              isReadOnly={isReadOnly}
              isRequired={!isReadOnly}
              variant="bordered"
              type="email"
              maxLength={150}
            />
            <p className="text-xs text-default-400 text-right">{emailProveedor.length}/150</p>
          </div>
        </div>

        <div className="space-y-1">
          <Input
            label="Dirección (opcional)"
            placeholder="Ej: Av. Vicuña Mackenna 4860, Macul"
            value={direccionProveedor}
            onValueChange={(val) => setDireccionProveedor(val.slice(0, 255))}
            isReadOnly={isReadOnly}
            variant="bordered"
            maxLength={255}
            description="Se mostrará en la cabecera del Excel generado para este proveedor."
          />
          <p className="text-xs text-default-400 text-right">{direccionProveedor.length}/255</p>
        </div>

        {!isReadOnly ? (
          <>
            <Select
              label="Estado"
              selectedKeys={new Set([estadoProveedor])}
              onSelectionChange={(keys) => {
                const val = Array.from(keys)[0] as EstadoProveedor;
                if (val) setEstadoProveedor(val);
              }}
              variant="bordered"
              isRequired
            >
              <SelectItem key="DISPONIBLE" textValue="Disponible">Disponible</SelectItem>
              <SelectItem key="NO_DISPONIBLE" textValue="No Disponible">No Disponible</SelectItem>
            </Select>
            {estadoProveedor === 'NO_DISPONIBLE' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning-50 dark:bg-warning-50/20 border border-warning-200 dark:border-warning-300">
                <Icon icon="lucide:alert-triangle" width={16} className="text-warning flex-shrink-0 mt-0.5" />
                <div className="text-xs text-warning-700 dark:text-warning-300">
                  Los proveedores marcados como <strong>No Disponible</strong> no entrarán en las cotizaciones.
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-default-500">Estado</span>
            {renderEstado(estadoProveedor)}
          </div>
        )}

        {/* Selector de Días de Entrega */}
        {!isReadOnly && (
          <div className="border-t border-default-200 dark:border-default-100 pt-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="lucide:calendar" width={16} className="text-primary" />
              <span className="text-sm font-semibold text-secondary dark:text-foreground">
                Días de Entrega
              </span>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-info-50 dark:bg-info-50/20 border border-info-200 dark:border-info-300">
              <Icon icon="lucide:info" width={16} className="text-info flex-shrink-0 mt-0.5" />
              <div className="text-xs text-default-600 dark:text-default-400">
                Los días de entrega se utilizan para dividir los pedidos por día de la semana y preparar la llegada de abastecimiento. Si no especifica horarios, se asumirá disponibilidad de 08:00 a 20:00.
              </div>
            </div>

            {/* Selector de día */}
            <div className="space-y-2">
              <Select
                label="Día de semana"
                selectedKeys={new Set([diaSeleccionado])}
                onSelectionChange={(keys) => {
                  setDiaSeleccionado(Array.from(keys)[0] as DiaSemana);
                }}
                variant="bordered"
                size="sm"
              >
                {DIAS_SEMANA_OPTIONS.map((d) => (
                  <SelectItem key={d.value} textValue={d.label}>
                    {d.label}
                  </SelectItem>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Hora inicio (HH:mm)"
                  placeholder="08:00"
                  value={horaInicio}
                  onValueChange={setHoraInicio}
                  variant="bordered"
                  size="sm"
                  type="time"
                />

                <Input
                  label="Hora fin (HH:mm)"
                  placeholder="17:00"
                  value={horaFin}
                  onValueChange={setHoraFin}
                  variant="bordered"
                  size="sm"
                  type="time"
                />
              </div>
            </div>

            <Button
              size="sm"
              variant="bordered"
              color="primary"
              onPress={agregarDiaEntrega}
              startContent={<Icon icon="lucide:plus" width={14} />}
              className="w-full md:w-auto"
            >
              Agregar Día
            </Button>

            {/* Lista de días agregados */}
            {diasEntrega.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {diasEntrega.map((dia, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-primary-50 dark:bg-primary-50/20 border border-primary-200 dark:border-primary-300"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Chip
                        size="sm"
                        color="primary"
                        variant="flat"
                        className="flex-shrink-0"
                      >
                        {DIAS_SEMANA_OPTIONS.find(d => d.value === dia.diaSemana)?.label}
                      </Chip>
                      {dia.horaInicio && dia.horaFin ? (
                        <span className="text-xs text-default-600 truncate">
                          {dia.horaInicio.slice(0, 5)} – {dia.horaFin.slice(0, 5)}
                        </span>
                      ) : (
                        <span className="text-xs text-default-600">
                          08:00 – 20:00
                        </span>
                      )}
                    </div>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => eliminarDiaEntrega(idx)}
                      className="flex-shrink-0 cursor-pointer"
                    >
                      <Icon icon="lucide:x" width={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Visualizar Días de Entrega (modo ver) */}
        {isReadOnly && proveedor && (
          <div className="border-t border-default-200 dark:border-default-100 pt-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="lucide:calendar" width={16} className="text-primary" />
              <span className="text-sm font-semibold text-secondary dark:text-foreground">
                Días de Entrega
              </span>
            </div>

            {(proveedor as any).diasEntrega && (proveedor as any).diasEntrega.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(proveedor as any).diasEntrega.map((dia: any) => (
                  <div
                    key={dia.idDiaEntrega}
                    className="flex items-center gap-3 p-3 rounded-lg bg-primary-50 dark:bg-primary-50/20 border border-primary-200 dark:border-primary-300"
                  >
                    <Chip
                      size="sm"
                      color="primary"
                      variant="flat"
                    >
                      {DIAS_SEMANA_OPTIONS.find(d => d.value === dia.diaSemana)?.label}
                    </Chip>
                    {dia.horaInicioEntrega && dia.horaFinEntrega ? (
                      <span className="text-sm text-default-600">
                        {dia.horaInicioEntrega.slice(0, 5)} – {dia.horaFinEntrega.slice(0, 5)}
                      </span>
                    ) : (
                      <span className="text-sm text-default-400 italic">
                        Disponibilidad todo el día
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-default-400 italic">
                No hay días de entrega configurados
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
        <Button variant="ghost" onPress={onClose} className="font-medium">
          {isReadOnly ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!isReadOnly && (
          <Button
            color="primary"
            variant="solid"
            onPress={handleSubmit}
            isLoading={saving}
            className="font-bold text-secondary shadow-md cursor-pointer"
            startContent={!saving && <Icon icon={mode === 'crear' ? 'lucide:plus' : 'lucide:save'} width={16} />}
            size="lg"
          >
            {mode === 'crear' ? 'Crear Proveedor' : 'Guardar Cambios'}
          </Button>
        )}
      </ModalFooter>

      {/* Modal confirmar reemplazar día de entrega */}
      <Modal isOpen={isReemplazarModal} onOpenChange={setIsReemplazarModal} size="sm" isDismissable={false} radius="lg" classNames={{ base: 'rounded-2xl' }}>
        <ModalContent className="rounded-2xl overflow-hidden">
          <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-warning/10 to-warning/5 dark:from-warning/20 dark:to-warning/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/20 rounded-lg">
                <Icon icon="lucide:alert-triangle" className="text-warning" width={20} />
              </div>
              <span className="font-bold text-lg text-secondary dark:text-foreground">
                Reemplazar Día de Entrega
              </span>
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              El día <strong>{diaReemplazar && DIAS_SEMANA_OPTIONS.find(d => d.value === diaReemplazar.diaSemana)?.label}</strong> ya tiene configurado un horario de entrega.
              ¿Deseas reemplazarlo con los nuevos horarios?
            </p>
          </ModalBody>
          <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
            <Button variant="ghost" onPress={() => setIsReemplazarModal(false)} className="font-medium">
              Cancelar
            </Button>
            <Button
              color="warning"
              variant="solid"
              onPress={confirmarReemplazarDia}
              className="font-bold shadow-md cursor-pointer"
              startContent={<Icon icon="lucide:replace" width={16} />}
            >
              Reemplazar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default FormularioProveedor;
