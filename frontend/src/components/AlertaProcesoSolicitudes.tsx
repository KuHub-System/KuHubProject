import React from 'react';
import { Card, CardBody } from '@heroui/react';
import { Icon } from '@iconify/react';

/**
 * Mensaje informativo sobre el nuevo flujo de solicitudes.
 */
export const AlertaProcesoSolicitudes: React.FC = () => {
  return (
    <Card className="border border-primary-200 bg-primary-50/60 dark:bg-primary-900/10">
      <CardBody className="flex flex-row items-start gap-3 p-4">
        <Icon icon="lucide:info" className="text-primary text-2xl flex-shrink-0" />
        <div>
          <p className="font-semibold text-primary">
            Recuerda seleccionar la semana de tu solicitud
          </p>
          <p className="text-sm text-default-600">
            Las solicitudes pueden enviarse en cualquier momento. El administrador las organizará por semana 
            y podrá ajustarlas antes de aprobarlas. Si tu solicitud es modificada, recibirás el comentario 
            asociado en el historial.
          </p>
        </div>
      </CardBody>
    </Card>
  );
};

export default AlertaProcesoSolicitudes;