/**
 * HOOK PARA MOSTRAR TOASTS/NOTIFICACIONES
 * Versión simplificada que funciona con el sistema de notificaciones
 */

import React from 'react';
import { useNotifications } from '../utils/notifications';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastParams {
  title?: string;
  animate?: boolean;
  duration?: number;
}

/**
 * Hook para mostrar toasts de forma simple
 */
export const useToast = () => {
  const { showNotification } = useNotifications();

  const toast = React.useMemo(() => ({
    success: (message: string, params?: ToastParams) => {
      showNotification({ message, title: params?.title || 'Éxito', type: 'success', animate: params?.animate });
    },
    error: (message: string, params?: string | ToastParams) => {
      const title = typeof params === 'string' ? params : params?.title;
      const animate = typeof params === 'object' ? params?.animate : false;
      showNotification({ message, title: title || 'Error', type: 'error', duration: 0, animate });
    },
    warning: (message: string, params?: string | ToastParams) => {
      const title = typeof params === 'string' ? params : params?.title;
      const animate = typeof params === 'object' ? params?.animate : false;
      showNotification({ message, title: title || 'Advertencia', type: 'warning', animate });
    },
    info: (message: string, params?: string | ToastParams) => {
      const title = typeof params === 'string' ? params : params?.title;
      const animate = typeof params === 'object' ? params?.animate : false;
      showNotification({ message, title: title || 'Información', type: 'info', animate });
    },
    show: (options: ToastOptions & { animate?: boolean }) => {
      showNotification({
        message: options.message,
        title: options.title,
        type: options.type || 'info',
        duration: options.duration,
        animate: options.animate
      });
    },
  }), [showNotification]);

  return toast;
};

/**
 * Hook para mostrar confirmaciones
 */
export const useConfirm = () => {
  const { showConfirm } = useNotifications();

  const confirm = async (
    message: string,
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
      confirmColor?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
      requireText?: string;
      requireTextLabel?: string;
      requireTextPlaceholder?: string;
      requireTextHelper?: string;
    }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      showConfirm({
        message,
        title: options?.title || 'Confirmar acción',
        confirmText: options?.confirmText || 'Confirmar',
        cancelText: options?.cancelText || 'Cancelar',
        confirmColor: options?.confirmColor || 'primary',
        requireText: options?.requireText,
        requireTextLabel: options?.requireTextLabel,
        requireTextPlaceholder: options?.requireTextPlaceholder,
        requireTextHelper: options?.requireTextHelper,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  };

  return confirm;
};

