/**
 * SISTEMA DE NOTIFICACIONES VISUALES
 * Reemplaza alert() y confirm() con componentes HTML/React
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from '@heroui/react';
import { Icon } from '@iconify/react';

// Tipos de notificación
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationOptions {
  title?: string;
  message: string;
  type?: NotificationType;
  duration?: number;
  onClose?: () => void;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  onConfirm: () => void;
  onCancel?: () => void;
  requireText?: string;
  requireTextLabel?: string;
  requireTextPlaceholder?: string;
  requireTextHelper?: string;
}

interface NotificationContextType {
  showNotification: (options: NotificationOptions) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

/**
 * Proveedor de notificaciones
 */
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationOptions | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [confirmResolve, setConfirmResolve] = useState<((value: boolean) => void) | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmInputValue, setConfirmInputValue] = useState('');

  const showNotification = useCallback((options: NotificationOptions) => {
    setNotification(options);
    setIsNotificationOpen(true);
    
    // Auto-cerrar después de la duración
    const duration = options.duration !== undefined ? options.duration : 3000;
    if (duration > 0) {
      setTimeout(() => {
        setIsNotificationOpen(false);
        if (options.onClose) {
          options.onClose();
        }
      }, duration);
    }
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirm(options);
      setConfirmResolve(() => resolve);
      setIsConfirmOpen(true);
      setConfirmInputValue('');
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirm?.requireText) {
      const matches = confirmInputValue.trim() === confirm.requireText;
      if (!matches) {
        return;
      }
    }

    if (confirm) {
      confirm.onConfirm();
    }
    if (confirmResolve) {
      confirmResolve(true);
    }
    setIsConfirmOpen(false);
    setConfirm(null);
    setConfirmResolve(null);
    setConfirmInputValue('');
  }, [confirm, confirmResolve, confirmInputValue]);

  const handleCancel = useCallback(() => {
    if (confirm?.onCancel) {
      confirm.onCancel();
    }
    if (confirmResolve) {
      confirmResolve(false);
    }
    setIsConfirmOpen(false);
    setConfirm(null);
    setConfirmResolve(null);
    setConfirmInputValue('');
  }, [confirm, confirmResolve]);

  const handleNotificationClose = useCallback(() => {
    if (notification?.onClose) {
      notification.onClose();
    }
    setIsNotificationOpen(false);
    setNotification(null);
  }, [notification]);

  // Iconos y colores por tipo
  const getNotificationConfig = (type: NotificationType = 'info') => {
    switch (type) {
      case 'success':
        return {
          icon: 'lucide:check-circle',
          color: 'success' as const,
          bgColor: 'bg-success-50',
          textColor: 'text-success',
          borderColor: 'border-success-200',
        };
      case 'error':
        return {
          icon: 'lucide:alert-circle',
          color: 'danger' as const,
          bgColor: 'bg-danger-50',
          textColor: 'text-danger',
          borderColor: 'border-danger-200',
        };
      case 'warning':
        return {
          icon: 'lucide:alert-triangle',
          color: 'warning' as const,
          bgColor: 'bg-warning-50',
          textColor: 'text-warning',
          borderColor: 'border-warning-200',
        };
      default:
        return {
          icon: 'lucide:info',
          color: 'primary' as const,
          bgColor: 'bg-primary-50',
          textColor: 'text-primary',
          borderColor: 'border-primary-200',
        };
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, showConfirm }}>
      {children}

      {/* Modal de Notificación */}
      <Modal
        isOpen={isNotificationOpen}
        onClose={handleNotificationClose}
        size="md"
        placement="top-center"
        hideCloseButton={notification?.duration !== 0}
      >
        <ModalContent>
          {(onClose) => {
            if (!notification) return null;
            const config = getNotificationConfig(notification.type);
            
            return (
              <>
                <ModalHeader className={`${config.bgColor} ${config.borderColor} border-b-2`}>
                  <div className="flex items-center gap-3 w-full">
                    <Icon icon={config.icon} className={`text-2xl ${config.textColor}`} />
                    <div>
                      <h3 className={`font-bold ${config.textColor}`}>
                        {notification.title || 'Notificación'}
                      </h3>
                    </div>
                  </div>
                </ModalHeader>
                <ModalBody className="pt-4">
                  <p className="text-default-700">{notification.message}</p>
                </ModalBody>
                {notification.duration === 0 && (
                  <ModalFooter>
                    <Button color={config.color} onPress={onClose}>
                      Cerrar
                    </Button>
                  </ModalFooter>
                )}
              </>
            );
          }}
        </ModalContent>
      </Modal>

      {/* Modal de Confirmación */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={handleCancel}
        size="md"
        placement="center"
      >
        <ModalContent>
          {() => {
            if (!confirm) return null;
            const requireText = confirm.requireText;
            const confirmDisabled = !!requireText && confirmInputValue.trim() !== requireText;
            
            return (
              <>
                <ModalHeader>
                  <div className="flex items-center gap-3">
                    <Icon icon="lucide:help-circle" className="text-2xl text-warning" />
                    <h3 className="font-bold">
                      {confirm.title || 'Confirmar acción'}
                    </h3>
                  </div>
                </ModalHeader>
                <ModalBody>
                  <p className="text-default-700">{confirm.message}</p>
                  {requireText && (
                    <div className="mt-4 space-y-2">
                      <Input
                        label={confirm.requireTextLabel || 'Escribe el texto solicitado para confirmar'}
                        placeholder={confirm.requireTextPlaceholder || confirm.requireText}
                        value={confirmInputValue}
                        onValueChange={setConfirmInputValue}
                        autoFocus
                      />
                      <p className="text-xs text-default-400">
                        {confirm.requireTextHelper ||
                          `Debes ingresar exactamente "${confirm.requireText}" para continuar.`}
                      </p>
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button
                    variant="light"
                    onPress={handleCancel}
                  >
                    {confirm.cancelText || 'Cancelar'}
                  </Button>
                  <Button
                    color={confirm.confirmColor || 'primary'}
                    onPress={handleConfirm}
                    isDisabled={confirmDisabled}
                  >
                    {confirm.confirmText || 'Confirmar'}
                  </Button>
                </ModalFooter>
              </>
            );
          }}
        </ModalContent>
      </Modal>
    </NotificationContext.Provider>
  );
};

/**
 * Hook para usar notificaciones
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de NotificationProvider');
  }
  return context;
};

/**
 * Funciones de conveniencia para mostrar notificaciones
 */
export const createNotificationHelpers = () => {
  // Estas funciones se crearán después de que el provider esté montado
  // Se usarán a través del hook useNotifications
  return null;
};

// Funciones globales para reemplazar alert() y confirm()
declare global {
  interface Window {
    showNotification: (options: NotificationOptions) => void;
    showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  }
}

