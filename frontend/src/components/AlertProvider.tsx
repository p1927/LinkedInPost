/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { Dialog } from './Dialog';

export interface AlertOptions {
  title: string;
  description: string;
}

export interface ConfirmOptions extends AlertOptions {
  confirmLabel?: string;
  cancelLabel?: string;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => Promise<void>;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | null>(null);

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
    isConfirm: boolean;
  } | null>(null);

  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        open: true,
        options: {
          ...options,
          confirmLabel: 'OK',
        },
        resolve: () => resolve(),
        isConfirm: false,
      });
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setAlertState({
        open: true,
        options: {
          confirmLabel: 'Yes',
          cancelLabel: 'Cancel',
          ...options,
        },
        resolve,
        isConfirm: true,
      });
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      showAlert,
      showConfirm,
    }),
    [showAlert, showConfirm],
  );

  const handleConfirm = () => {
    if (alertState) {
      alertState.resolve(true);
      setAlertState(null);
    }
  };

  const handleCancel = () => {
    if (alertState) {
      alertState.resolve(false);
      setAlertState(null);
    }
  };

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      {alertState && (
        <Dialog
          open={alertState.open}
          title={alertState.options.title}
          description={alertState.options.description}
          confirmLabel={alertState.options.confirmLabel || 'OK'}
          cancelLabel={alertState.isConfirm ? alertState.options.cancelLabel || 'Cancel' : undefined}
          onConfirm={handleConfirm}
          onCancel={alertState.isConfirm ? handleCancel : handleConfirm}
        />
      )}
    </AlertContext.Provider>
  );
}
