import React, { useEffect, useState } from 'react';
import { Card, CardBody, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { obtenerEstadoProceso, calcularDiasRestantesProceso } from '../pages/dashboard';

/**
 * Componente de alerta que muestra el estado del proceso de pedidos
 * Usar en páginas donde se crean/editan solicitudes
 */
export const AlertaProcesoSolicitudes: React.FC = () => {
    const [estadoProceso, setEstadoProceso] = useState(obtenerEstadoProceso());
    const [diasRestantes, setDiasRestantes] = useState(calcularDiasRestantesProceso());

    useEffect(() => {
        // Actualizar cada minuto
        const intervalo = setInterval(() => {
            setEstadoProceso(obtenerEstadoProceso());
            setDiasRestantes(calcularDiasRestantesProceso());
        }, 60000);

        return () => clearInterval(intervalo);
    }, []);

    if (!estadoProceso.activo) {
        return (
            <Card className="bg-warning-50 dark:bg-warning-900/20 border-2 border-warning-200 dark:border-warning-800">
                <CardBody className="flex flex-row items-center gap-3 p-4">
                    <Icon icon="lucide:alert-triangle" className="text-warning text-2xl flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-warning">Proceso de Pedidos Inactivo</p>
                        <p className="text-sm text-default-600">
                            No hay un proceso activo. Las solicitudes no pueden ser creadas o editadas en este momento.
                        </p>
                    </div>
                </CardBody>
            </Card>
        );
    }

    if (estadoProceso.paso !== 2) {
        return (
            <Card className="bg-danger-50 dark:bg-danger-900/20 border-2 border-danger-200 dark:border-danger-800">
                <CardBody className="flex flex-row items-center gap-3 p-4">
                    <Icon icon="lucide:lock" className="text-danger text-2xl flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-danger">Proceso en Etapa de Compra</p>
                        <p className="text-sm text-default-600">
                            El período de recepción de solicitudes ha terminado. El proceso está en etapa de comprobación y cotización.
                        </p>
                    </div>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card className={`border-2 ${
            diasRestantes <= 2 
                ? 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800'
                : diasRestantes <= 5
                ? 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800'
                : 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800'
        }`}>
            <CardBody className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <Icon 
                        icon={diasRestantes <= 2 ? "lucide:alert-circle" : "lucide:check-circle"} 
                        className={`text-2xl flex-shrink-0 ${
                            diasRestantes <= 2 ? 'text-danger' : diasRestantes <= 5 ? 'text-warning' : 'text-success'
                        }`}
                    />
                    <div>
                        <p className={`font-semibold ${
                            diasRestantes <= 2 ? 'text-danger' : diasRestantes <= 5 ? 'text-warning' : 'text-success'
                        }`}>
                            Proceso Activo - Solicitudes Habilitadas
                        </p>
                        <p className="text-sm text-default-600">
                            Puedes crear y editar solicitudes hasta el{' '}
                            {estadoProceso.fechaFin && new Date(estadoProceso.fechaFin).toLocaleDateString('es-CL', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
                <Chip
                    color={diasRestantes <= 2 ? "danger" : diasRestantes <= 5 ? "warning" : "success"}
                    variant="flat"
                    size="lg"
                    startContent={<Icon icon="lucide:clock" />}
                >
                    {diasRestantes === 0 ? 'Último día' : diasRestantes === 1 ? '1 día' : `${diasRestantes} días`}
                </Chip>
            </CardBody>
        </Card>
    );
};

export default AlertaProcesoSolicitudes;