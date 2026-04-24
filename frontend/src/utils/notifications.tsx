/**
 * SISTEMA DE NOTIFICACIONES VISUALES
 * Reemplaza alert() y confirm() con componentes HTML/React
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { motion, AnimatePresence } from 'framer-motion';

// Tipos de notificación
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationOptions {
  title?: string;
  message: string;
  type?: NotificationType;
  duration?: number;
  onClose?: () => void;
  animate?: boolean;
}

interface ConfirmOptions {
  title?: string;
  subtitle?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  headerVariant?: 'danger' | 'warning' | 'default';
  alertTitle?: string;
  alertMessage?: string;
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
    const duration = options.duration !== undefined ? options.duration : 5000;
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

      {/* Modal de Notificación - Renderizado en Portal para asegurar z-index correcto */}
      {createPortal(
        <AnimatePresence>
          {isNotificationOpen && notification && (() => {
            const config = getNotificationConfig(notification.type);
            return (
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, y: -16, transition: { duration: 1.0, ease: 'easeIn' } }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="fixed top-6 right-6"
                style={{
                  minWidth: 320,
                  maxWidth: 420,
                  pointerEvents: 'auto',
                  zIndex: 999999  // ✅ Asegurar que está por encima de todo
                }}
              >
                <div
                  className={`
                    flex items-start gap-4 px-5 py-4 rounded-2xl shadow-xl border
                    ${config.bgColor} ${config.borderColor}
                    w-full
                  `}
                  style={{ minWidth: 320, maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.13)' }}
                >
                  <motion.div
                    className="mt-0.5 shrink-0"
                    animate={notification.animate ? { scale: [1, 1.18, 1], opacity: [1, 0.7, 1] } : {}}
                    transition={notification.animate ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
                  >
                    <Icon icon={config.icon} className={`text-3xl ${config.textColor}`} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-base ${config.textColor}`}>
                      {notification.title || 'Notificación'}
                    </p>
                    <p className="text-default-700 text-sm mt-0.5 text-justify leading-snug">
                      {notification.message}
                    </p>
                  </div>
                  {notification.duration === 0 && (
                    <button
                      onClick={handleNotificationClose}
                      className="shrink-0 mt-0.5 text-default-400 hover:text-default-600 transition-colors"
                    >
                      <Icon icon="lucide:x" width={18} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>,
        document.body  // ✅ Renderizar fuera del Modal, en el body
      )}

      {/* Modal de Confirmación */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={handleCancel}
        size="md"
        placement="center"
        classNames={{
          base: 'overflow-hidden',
        }}
      >
        <ModalContent>
          {() => {
            if (!confirm) return null;
            const requireText = confirm.requireText;
            const confirmDisabled = !!requireText && confirmInputValue.trim() !== requireText;
            const variant = confirm.headerVariant || 'default';

            const headerStyles = {
              danger: {
                bg: 'bg-danger-50',
                border: 'border-b border-danger-200',
                iconColor: 'text-danger',
                titleColor: 'text-danger-700',
                subtitleColor: 'text-danger-500',
                icon: 'lucide:alert-triangle',
              },
              warning: {
                bg: 'bg-warning-50',
                border: 'border-b border-warning-200',
                iconColor: 'text-warning-600',
                titleColor: 'text-warning-700',
                subtitleColor: 'text-warning-500',
                icon: 'lucide:alert-triangle',
              },
              default: {
                bg: '',
                border: '',
                iconColor: 'text-warning',
                titleColor: '',
                subtitleColor: 'text-default-500',
                icon: 'lucide:help-circle',
              },
            }[variant];

            return (
              <>
                <ModalHeader className={`flex flex-col gap-0 pb-3 ${headerStyles.bg} ${headerStyles.border}`}>
                  <div className="flex items-center gap-3">
                    <Icon icon={headerStyles.icon} className={`text-2xl shrink-0 ${headerStyles.iconColor}`} />
                    <div className="flex flex-col">
                      <h3 className={`font-bold text-base leading-tight ${headerStyles.titleColor}`}>
                        {confirm.title || 'Confirmar acción'}
                      </h3>
                      {confirm.subtitle && (
                        <p className={`text-xs font-medium mt-0.5 ${headerStyles.subtitleColor}`}>
                          {confirm.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                </ModalHeader>
                <ModalBody className="pt-4">
                  {confirm.alertTitle || confirm.alertMessage ? (
                    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 mb-2 ${
                      variant === 'danger' ? 'bg-danger-50 border border-danger-100' :
                      variant === 'warning' ? 'bg-warning-50 border border-warning-100' :
                      'bg-default-50 border border-default-200'
                    }`}>
                      <div className={`shrink-0 mt-0.5 rounded-full p-1 ${
                        variant === 'danger' ? 'bg-danger text-white' :
                        variant === 'warning' ? 'bg-warning text-white' :
                        'bg-default-400 text-white'
                      }`}>
                        <Icon icon="lucide:alert-circle" width={14} />
                      </div>
                      <div>
                        {confirm.alertTitle && (
                          <p className={`text-sm font-semibold ${
                            variant === 'danger' ? 'text-danger-700' :
                            variant === 'warning' ? 'text-warning-700' : 'text-default-700'
                          }`}>{confirm.alertTitle}</p>
                        )}
                        {confirm.alertMessage && (
                          <p className={`text-sm mt-0.5 ${
                            variant === 'danger' ? 'text-danger-600' :
                            variant === 'warning' ? 'text-warning-600' : 'text-default-600'
                          }`}>{confirm.alertMessage}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-default-700 text-justify">{confirm.message}</p>
                  )}
                  {requireText && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium text-default-700">
                        {confirm.requireTextLabel || `Escribe `}
                        {!confirm.requireTextLabel && <strong>{requireText}</strong>}
                        {!confirm.requireTextLabel && ` para proceder:`}
                      </p>
                      <Input
                        placeholder={confirm.requireTextPlaceholder || `Escribe ${confirm.requireText}`}
                        value={confirmInputValue}
                        onValueChange={setConfirmInputValue}
                        autoFocus
                        variant="bordered"
                        classNames={{
                          inputWrapper: confirmInputValue.trim() === requireText
                            ? 'border-success-400 focus-within:border-success-500'
                            : undefined,
                        }}
                      />
                      <p className="text-xs text-default-400">
                        {confirm.requireTextHelper ||
                          `Esta acción es irreversible. Escribe ${confirm.requireText} para confirmar.`}
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

