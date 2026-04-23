import { useContext } from 'react';
import { AlertContext, type AlertOptions, type ConfirmOptions } from './AlertProvider';

export { type AlertOptions, type ConfirmOptions };

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
