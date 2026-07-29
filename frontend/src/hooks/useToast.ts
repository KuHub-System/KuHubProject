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
      showNotification({ message, title: title || 'Error', type: 'error', duration: 30000, animate });
    },
    warning: (message: string, params?: string | ToastParams) => {
      const title = typeof params === 'string' ? params : params?.title;
      const animate = typeof params === 'object' ? params?.animate : false;
      const duration = typeof params === 'object' ? params?.duration : undefined;
      showNotification({ message, title: title || 'Advertencia', type: 'warning', animate, duration });
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
      subtitle?: string;
      confirmText?: string;
      cancelText?: string;
      confirmColor?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
      headerVariant?: 'danger' | 'warning' | 'default';
      alertTitle?: string;
      alertMessage?: string;
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
        subtitle: options?.subtitle,
        confirmText: options?.confirmText || 'Confirmar',
        cancelText: options?.cancelText || 'Cancelar',
        confirmColor: options?.confirmColor || 'primary',
        headerVariant: options?.headerVariant,
        alertTitle: options?.alertTitle,
        alertMessage: options?.alertMessage,
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

/**
 * Hook para confirmar eliminaciones (soft delete).
 * Preset reutilizable sobre useConfirm(): estilo "danger", mensaje estándar de
 * acción irreversible, y confirmación con un solo click en el botón (sin exigir
 * escribir texto). Usar en cualquier página que necesite un modal de eliminación
 * consistente con el resto del sistema.
 */
export const useConfirmDelete = () => {
  const confirm = useConfirm();

  const confirmDelete = (options: {
    /** Texto del ModalHeader, ej: "Eliminar producto" */
    title: string;
    /** Frase ya armada con género/artículo correctos, ej: `el producto "${nombre}"` */
    itemDescription: string;
    /** Texto del botón de confirmación. Default: "Eliminar" */
    confirmText?: string;
  }): Promise<boolean> => {
    return confirm('', {
      title: options.title,
      subtitle: 'Esta acción es irreversible',
      headerVariant: 'danger',
      alertTitle: 'Atención',
      alertMessage: `Eliminarás definitivamente ${options.itemDescription}. Esta acción no se puede deshacer.`,
      confirmText: options.confirmText || 'Eliminar',
      confirmColor: 'danger',
    });
  };

  return confirmDelete;
};

/**
 * Hook para confirmar desactivaciones (soft-toggle activo=false, reversible).
 * Preset "hermano" de useConfirmDelete(), pero con tono distinto a propósito:
 * estilo "warning" (no "danger") y mensaje que deja claro que se puede reactivar
 * más adelante, para no dar la falsa impresión de que es una acción irreversible.
 */
export const useConfirmDeactivate = () => {
  const confirm = useConfirm();

  const confirmDeactivate = (options: {
    /** Texto del ModalHeader, ej: "Desactivar usuario" */
    title: string;
    /** Frase ya armada con género/artículo correctos, ej: `al usuario "Juan Pérez"` */
    itemDescription: string;
    /** Texto del botón de confirmación. Default: "Desactivar" */
    confirmText?: string;
  }): Promise<boolean> => {
    return confirm('', {
      title: options.title,
      subtitle: 'Podrás reactivarlo más adelante',
      headerVariant: 'warning',
      alertTitle: 'Confirmar desactivación',
      alertMessage: `Desactivarás ${options.itemDescription}. Esta acción se puede revertir reactivándolo(a) más adelante.`,
      confirmText: options.confirmText || 'Desactivar',
      confirmColor: 'warning',
    });
  };

  return confirmDeactivate;
};

/**
 * Hook para confirmar un rechazo capturando el motivo en el mismo modal reutilizable
 * (estilo "danger" de un solo click, igual que useConfirmDelete — sin exigir escribir
 * una palabra de confirmación). Devuelve tanto si el usuario confirmó como el motivo
 * capturado, para no depender de un textarea/estado aparte en la página que lo use.
 */
export const useConfirmReject = () => {
  const { showConfirm } = useNotifications();

  const confirmReject = (options: {
    /** Texto del ModalHeader, ej: "Rechazar solicitud" */
    title: string;
    /** Frase ya armada con género/artículo correctos, ej: `la solicitud de "Juan Pérez"` */
    itemDescription: string;
    /** Texto del botón de confirmación. Default: "Rechazar" */
    confirmText?: string;
    motivoLabel?: string;
    motivoPlaceholder?: string;
  }): Promise<{ confirmado: boolean; motivo: string }> => {
    return new Promise((resolve) => {
      let motivoCapturado = '';
      showConfirm({
        message: '',
        title: options.title,
        subtitle: 'Esta acción es irreversible',
        headerVariant: 'danger',
        alertTitle: 'Atención',
        alertMessage: `Rechazarás ${options.itemDescription}. Esta acción no se puede deshacer.`,
        confirmText: options.confirmText || 'Rechazar',
        confirmColor: 'danger',
        motivoField: {
          label: options.motivoLabel || 'Motivo del rechazo',
          placeholder: options.motivoPlaceholder || 'Indique el motivo para informar al docente...',
        },
        onConfirm: (motivo) => { motivoCapturado = motivo ?? ''; },
        onCancel: () => resolve({ confirmado: false, motivo: '' }),
      }).then((confirmado) => {
        resolve({ confirmado, motivo: motivoCapturado });
      });
    });
  };

  return confirmReject;
};

