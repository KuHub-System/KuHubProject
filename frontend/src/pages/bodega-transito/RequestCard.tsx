import React from 'react';
import { Card, CardBody, Button, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { ISolicitud } from '../../types/solicitud/solicitud.types';
import { actualizarEstadoBodegaService } from '../../services/solicitud/solicitud-service';
import { getHorarioString } from './constants';

interface RequestCardProps {
  solicitud: ISolicitud;
  onUpdate: () => void;
  onAddExtra: (solicitud: ISolicitud) => void;
  onViewDetail: (solicitud: ISolicitud) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({ solicitud, onUpdate, onAddExtra, onViewDetail }) => {
  const isArmado = solicitud.estadoBodega === 'Armado';

  const handleToggleArmado = async () => {
    const nuevoEstado = isArmado ? 'Pendiente' : 'Armado';
    if (solicitud.id.startsWith('fake-')) {
      solicitud.estadoBodega = nuevoEstado;
      onUpdate();
      return;
    }
    await actualizarEstadoBodegaService(solicitud.id, nuevoEstado);
    onUpdate();
  };

  return (
    <Card className={`w-full mb-3 border-l-4 shadow-sm hover:shadow-md transition-shadow ${isArmado ? 'border-success bg-green-50/30 dark:bg-success-50/10' : 'border-primary bg-white dark:bg-content1'}`}>
      <CardBody className="py-3 px-4">
        <div className="flex justify-between items-start">
          <div className="flex-grow pr-2">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-bold text-md ${isArmado ? 'text-success-700 dark:text-success-400' : 'text-secondary dark:text-foreground'}`}>{solicitud.asignaturaNombre}</h4>
              {isArmado && (
                <Chip size="sm" color="success" variant="flat" className="h-6 px-1">
                  <span className="font-bold text-xs">LISTO</span>
                </Chip>
              )}
            </div>
            <p className="text-sm text-default-600 flex items-center gap-1.5 font-medium">
              <Icon icon="lucide:user" className="text-default-400" width={14} />
              {solicitud.profesorNombre}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-50 dark:bg-orange-50/10 rounded border border-orange-100 dark:border-default-200">
                <Icon icon="lucide:clock" className="text-primary-600" width={14} />
                <span className="text-xs font-bold text-primary-700 dark:text-primary-400">{getHorarioString(solicitud.bloqueInicio, solicitud.bloqueFin)}</span>
              </div>
            </div>
            <p className="text-xs text-default-500 mt-2 font-medium">
              Items: {solicitud.items.length + (solicitud.itemsAdicionalesBodega?.length || 0)}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              isIconOnly
              size="sm"
              variant={isArmado ? "solid" : "bordered"}
              color={isArmado ? "success" : "default"}
              onPress={handleToggleArmado}
              className={`${!isArmado ? 'border-default-300 text-default-500 hover:text-success hover:border-success' : ''}`}
            >
              <Icon icon={isArmado ? "lucide:check-circle-2" : "lucide:circle"} width={20} />
            </Button>
            <div className="flex gap-1">
              <Button isIconOnly size="sm" variant="light" onPress={() => onAddExtra(solicitud)} className="text-warning-600 min-w-8 w-8 h-8">
                <Icon icon="lucide:plus" width={18} />
              </Button>
              <Button isIconOnly size="sm" variant="light" onPress={() => onViewDetail(solicitud)} className="text-gastronomia min-w-8 w-8 h-8">
                <Icon icon="lucide:eye" width={18} />
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default React.memo(RequestCard);
